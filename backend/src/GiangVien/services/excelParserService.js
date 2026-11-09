import ExcelJS from "exceljs";
import crypto from "crypto";
import stream from "stream";

// Giới hạn an toàn hệ thống
export const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024; // 10MB
export const MAX_ALLOWED_ROWS = 5000;
export const MAX_PREVIEW_ROWS = 10;

function csvDelimiter(buffer) {
  const header = buffer.toString('utf8').replace(/^\uFEFF/, '').split(/\r?\n/)[0] || '';
  const counts = new Map([[',',0],[';',0],['\t',0],['|',0]]);
  let quoted=false;
  for(let i=0;i<header.length;i++) {
    if(header[i]==='"') { if(quoted && header[i+1]==='"') i++; else quoted=!quoted; }
    else if(!quoted && counts.has(header[i])) counts.set(header[i],counts.get(header[i])+1);
  }
  return [...counts].sort((a,b)=>b[1]-a[1])[0][0];
}
function normalizeHeaderNames(headers) {
  const used=new Set();
  return headers.map((header,i)=>{
    const base=(header || `Cot_${i+1}`).replace(/[^\w\s\u00C0-\u1EF9_]/gi,'').trim() || `Cot_${i+1}`;
    let name=base;let suffix=2;
    while(used.has(name.toLowerCase())) name=`${base}_${suffix++}`;
    used.add(name.toLowerCase());return name;
  });
}
const CACHE_TTL_MS = 60 * 60 * 1000; // 1 giờ

// Bộ nhớ đệm lưu trữ tạm thời trong RAM (không lưu file trên đĩa cứng)
const ephemeralSourceCache = new Map();

/**
 * Tự động dọn dẹp các cache nguồn đã hết hạn TTL
 */
function cleanExpiredCache() {
  const now = Date.now();
  for (const [key, value] of ephemeralSourceCache.entries()) {
    if (now - value.cachedAt > CACHE_TTL_MS) {
      ephemeralSourceCache.delete(key);
    }
  }
}

/**
 * Kiểm tra và che giấu thông tin định danh cá nhân (PII Masking)
 */
export function maskPiiValue(value, columnName = "") {
  if (value === null || value === undefined || value === "") return "";
  const str = String(value).trim();
  const lowerCol = columnName.toLowerCase();

  // 1. Cột Email
  if (lowerCol.includes("email") || lowerCol.includes("mail") || str.includes("@")) {
    const parts = str.split("@");
    if (parts.length === 2) {
      const namePart = parts[0];
      const domainPart = parts[1];
      const maskedName = namePart.length > 2 ? `${namePart.slice(0, 1)}***${namePart.slice(-1)}` : `${namePart.slice(0, 1)}***`;
      return `${maskedName}@${domainPart}`;
    }
    return "***@***";
  }

  // 2. Cột Mã số sinh viên / ID / CCCD / SĐT
  if (
    lowerCol.includes("mssv") ||
    lowerCol.includes("student_id") ||
    lowerCol.includes("mã") ||
    lowerCol.includes("masv") ||
    lowerCol.includes("sđt") ||
    lowerCol.includes("phone") ||
    lowerCol.includes("cccd")
  ) {
    if (str.length > 4) {
      return `${str.slice(0, 2)}***${str.slice(-2)}`;
    }
    return `${str.slice(0, 1)}***`;
  }

  // 3. Cột Họ và tên sinh viên
  if (
    lowerCol.includes("tên") ||
    lowerCol.includes("name") ||
    lowerCol.includes("họ") ||
    lowerCol.includes("sinh viên")
  ) {
    const words = str.split(/\s+/);
    if (words.length > 1) {
      return words
        .map((w, idx) => {
          if (idx === 0) return w; // Giữ họ đầu tiên
          return `${w.charAt(0)}***`;
        })
        .join(" ");
    }
    return str.length > 2 ? `${str.slice(0, 1)}***` : str;
  }

  return str;
}

/**
 * Khử mã độc công thức (Anti-Formula / CSV Injection)
 * Không cho phép ký tự =, +, -, @ ở đầu chuỗi thực thi lệnh
 */
export function sanitizeCellValue(val) {
  // Source values are literals. M/JSON writers escape them; never execute CSV text.
  return typeof val==='string' ? val.trim() : val;
}

/**
 * Chuyển đổi tên cột sang Canonical ID chuẩn hóa không dấu, snake_case
 */
export function toCanonicalId(str) {
  if (!str) return "col";
  return String(str)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9_]/g, "_")
    .replace(/_+/g, "_")
    .replace(/^_|_$/g, "") || "col";
}

/**
 * Phán đoán kiểu dữ liệu và chuẩn hóa số
 */
function inferDataType(values) {
  let numberCount = 0;
  let dateCount = 0;
  let booleanCount = 0;
  let stringCount = 0;
  let leadingZeroCount = 0;
  const nonNullValues = values.filter((v) => v !== null && v !== undefined && v !== "");

  if (nonNullValues.length === 0) return "string";

  for (const v of nonNullValues) {
    if (typeof v === "boolean" || v === "true" || v === "false") {
      booleanCount++;
    } else if (typeof v === "number" && !isNaN(v)) {
      numberCount++;
    } else if (typeof v === "string") {
      const trimmed = v.trim();
      // Phát hiện chuỗi có số 0 ở đầu (e.g. 00123, 0912345678) -> Phải giữ là string để không mất số 0
      if (/^0[0-9]{2,}$/.test(trimmed)) {
        leadingZeroCount++;
        stringCount++;
        continue;
      }

      const clean = trimmed.replace(",", ".");
      if (!isNaN(Number(clean)) && clean !== "") {
        numberCount++;
      } else if (!isNaN(Date.parse(trimmed)) && (trimmed.includes("-") || trimmed.includes("/"))) {
        dateCount++;
      } else {
        stringCount++;
      }
    } else if (v instanceof Date) {
      dateCount++;
    } else {
      stringCount++;
    }
  }

  // Nếu hầu hết chuỗi có số 0 đầu, ép kiểu string
  if (leadingZeroCount > 0 && (leadingZeroCount + stringCount) >= nonNullValues.length * 0.5) {
    return "string";
  }

  const threshold = nonNullValues.length * 0.7;
  if (numberCount >= threshold) return "number";
  if (dateCount >= threshold) return "date";
  if (booleanCount >= threshold) return "boolean";
  return "string";
}

/**
 * Phán đoán ngữ nghĩa chi tiết (Semantic Type, Domain Role, Aggregation Policy)
 */
export function inferColumnSemantic(colName, values, totalRows, inferredType) {
  const canonicalId = toCanonicalId(colName);
  const lowerCol = colName.toLowerCase().replace(/_/g, " ").trim();
  const nonNullValues = values.filter((v) => v !== null && v !== undefined && v !== "");

  // 1. Kiểm tra số 0 ở đầu (Leading Zeros)
  const hasLeadingZeros = nonNullValues.some((v) => typeof v === "string" && /^0[0-9]{2,}$/.test(v.trim()));

  // 2. Kiểm tra trường định danh (Identifier)
  const isIdentifier =
    hasLeadingZeros ||
    /^(mã|mssv|id|stt|code|key|student_id|masv|employee_id|order_id|survey_id)\b/i.test(lowerCol) ||
    lowerCol.includes("mã sinh viên") ||
    lowerCol.includes("mã sv") ||
    lowerCol.includes("mssv") ||
    lowerCol.includes("mã nhân viên") ||
    lowerCol.includes("mã đơn") ||
    lowerCol.includes("mã khảo sát") ||
    lowerCol.endsWith(" id") ||
    lowerCol.endsWith("_id");

  // 3. Kiểm tra kiểu tiền tệ (Currency)
  const isCurrency =
    /doanh[ _]?thu|chi[ _]?phi|loi[ _]?nhuan|gia[ _]?ban|gia[ _]?tien|luong|salary|revenue|cost|profit|budget|vnd|usd/i.test(canonicalId) ||
    nonNullValues.some((v) => typeof v === "string" && /(?:đ|₫|vnd|usd|\$)/i.test(v));

  // 4. Kiểm tra kiểu phần trăm (Percentage)
  const isPercentage =
    /ty[ _]?le|phan[ _]?tram|rate|percentage|pct/i.test(canonicalId) ||
    nonNullValues.some((v) => typeof v === "string" && v.includes("%"));

  // 5. Xác định Semantic Type
  let semanticType = "text";
  if (isIdentifier) {
    semanticType = "identifier";
  } else if (isCurrency) {
    semanticType = "currency";
  } else if (isPercentage) {
    semanticType = "percentage";
  } else if (inferredType === "number") {
    semanticType = "numeric";
  } else if (inferredType === "date") {
    semanticType = "date";
  } else if (inferredType === "boolean") {
    semanticType = "boolean";
  } else {
    const uniqueCount = new Set(nonNullValues).size;
    const cardinalityRatio = totalRows > 0 ? uniqueCount / totalRows : 1;
    if (cardinalityRatio < 0.6) {
      semanticType = "category";
    } else {
      semanticType = "text";
    }
  }

  // 6. Xác định Domain Role
  let domainRole = "attribute";
  if (isIdentifier) {
    domainRole = "identifier";
  } else if (inferredType === "date") {
    domainRole = "temporal";
  } else if (["numeric", "currency", "percentage"].includes(semanticType)) {
    domainRole = "metric";
  } else if (["category", "boolean"].includes(semanticType)) {
    domainRole = "dimension";
  }

  // 7. Xác định Chính sách Tổng hợp (Aggregation Policy) và Valid Aggregations
  let aggregationPolicy = "NONE";
  let unitHint = "";
  let validAggregations = ["COUNT", "NONE"];

  if (isIdentifier) {
    aggregationPolicy = "DISTINCTCOUNT";
    unitHint = lowerCol.includes("sinh viên") || lowerCol.includes("sv") || lowerCol.includes("mssv") ? "sinh viên" : "bản ghi";
    validAggregations = ["DISTINCTCOUNT", "COUNT"];
  } else if (semanticType === "currency") {
    aggregationPolicy = "SUM";
    unitHint = canonicalId.includes("usd") ? "USD" : "VNĐ";
    validAggregations = ["SUM", "AVG", "MIN", "MAX"];
  } else if (semanticType === "percentage") {
    aggregationPolicy = "AVG";
    unitHint = "%";
    validAggregations = ["AVG", "MIN", "MAX"];
  } else if (semanticType === "numeric") {
    // Nếu là điểm số, chuyên cần, đánh giá, tỷ lệ -> AVG
    if (/diem|score|grade|chuyen[ _]?can|attendance|danh[ _]?gia|hai[ _]?long|rating/i.test(canonicalId)) {
      aggregationPolicy = "AVG";
      unitHint = /rating|hai[ _]?long/i.test(canonicalId) ? "/5 điểm" : "điểm";
      validAggregations = ["AVG", "MIN", "MAX", "DISTRIBUTION"];
    } else if (/so[ _]?luong|tong|count|qty|quantity|amount|gio|session/i.test(canonicalId)) {
      aggregationPolicy = "SUM";
      unitHint = "đơn vị";
      validAggregations = ["SUM", "AVG", "MIN", "MAX"];
    } else {
      aggregationPolicy = "AVG";
      unitHint = "";
      validAggregations = ["AVG", "SUM", "MIN", "MAX"];
    }
  } else if (domainRole === "dimension") {
    aggregationPolicy = "COUNT";
    validAggregations = ["GROUP_BY", "COUNT", "DISTINCTCOUNT"];
  } else if (domainRole === "temporal") {
    validAggregations = ["TREND", "COUNT"];
  }

  return {
    canonicalId,
    semanticType,
    domainRole,
    aggregationPolicy,
    validAggregations,
    isIdentifier,
    hasLeadingZeros,
    unitHint,
  };
}

/**
 * Tự động nhận diện Phân hệ Nghiệp vụ của Bộ dữ liệu (Dataset Domain Detection Engine)
 */
export function detectDatasetDomain(columns = [], rows = []) {
  if (!Array.isArray(columns) || columns.length === 0) {
    return {
      domain: "generic",
      domainLabel: "Dữ liệu Tổng hợp",
      isEducationalGrade: false,
      primaryMetric: null,
      primaryDimension: null,
      primaryTemporal: null,
      primaryIdentifier: null,
      defaultUnit: "bản ghi",
    };
  }

  const colNorms = columns.map((c) => ({
    name: c.name,
    canonicalId: c.canonicalId || toCanonicalId(c.name),
    norm: String(c.name || "").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, ""),
    meta: c,
  }));

  const hasPattern = (regex) => colNorms.some((c) => regex.test(c.norm) || regex.test(c.canonicalId));
  const findCol = (regex) => colNorms.find((c) => regex.test(c.norm) || regex.test(c.canonicalId))?.meta || null;

  // 1. Phân hệ Điểm số / Học tập (Education Grades)
  const isEducationGrade =
    !hasPattern(/quiz|trac[ _]?nghiem|cau[ _]?hoi|question/i) &&
    (hasPattern(/mssv|ma[ _]?sv|student[ _]?id|sinh[ _]?vien/i) || hasPattern(/lop|cohort|khoa/i)) &&
    (hasPattern(/diem|score|grade/i) ||
      hasPattern(/chuyen[ _]?can|attendance|diem[ _]?cc|diemcc/i) ||
      hasPattern(/cuoi[ _]?ky|final|diem[ _]?ck|diemck/i) ||
      hasPattern(/giua[ _]?ky|midterm|diem[ _]?gk|diemgk/i) ||
      hasPattern(/xep[ _]?loai|academic[ _]?rank|ket[ _]?qua/i));

  if (isEducationGrade) {
    const finalCol = findCol(/cuoi[ _]?ky|final|tong[ _]?ket|diem[ _]?ck|diemck/i) || findCol(/diem|grade|score/i);
    const cohortCol = findCol(/lop|cohort|khoa/i);
    const idCol = findCol(/mssv|ma[ _]?sv|student[ _]?id/i);
    return {
      domain: "education_grade",
      domainLabel: "Kết quả Học tập LMS (Bảng điểm)",
      isEducationalGrade: true,
      primaryMetric: finalCol,
      primaryDimension: cohortCol,
      primaryTemporal: findCol(/ngay|date|hoc[ _]?ky/i),
      primaryIdentifier: idCol,
      defaultUnit: "điểm",
    };
  }

  // 2. Phân hệ Điểm danh & Chuyên cần (Attendance)
  const isAttendance =
    hasPattern(/diem[ _]?danh|chuyen[ _]?can|co[ _]?mat|vang[ _]?mat|attendance|present|absent/i) &&
    !hasPattern(/cuoi[ _]?ky|giua[ _]?ky|thi[ _]?lai/i);

  if (isAttendance) {
    const presenceCol = findCol(/co[ _]?mat|present|ty[ _]?le[ _]?co[ _]?mat/i) || findCol(/tong[ _]?so|total/i);
    const classCol = findCol(/lop|class|cohort/i);
    const dateCol = findCol(/ngay|date|buoi|session/i);
    const idCol = findCol(/mssv|ma[ _]?sv|id/i);
    return {
      domain: "education_attendance",
      domainLabel: "Theo dõi Chuyên cần & Điểm danh",
      isEducationalGrade: false,
      primaryMetric: presenceCol,
      primaryDimension: classCol,
      primaryTemporal: dateCol,
      primaryIdentifier: idCol,
      defaultUnit: "buổi",
    };
  }

  // 3. Phân hệ Đánh giá trắc nghiệm / Quiz
  const isQuiz =
    hasPattern(/quiz|trac[ _]?nghiem|cau[ _]?hoi|question|bai[ _]?kiem[ _]?tra|attempt/i);

  if (isQuiz) {
    const quizScoreCol = findCol(/diem|score|points/i);
    const questionCol = findCol(/cau[ _]?hoi|question|ma[ _]?cau/i);
    const idCol = findCol(/mssv|ma[ _]?sv|user|id/i);
    return {
      domain: "education_quiz",
      domainLabel: "Đánh giá Bài kiểm tra & Quiz",
      isEducationalGrade: false,
      primaryMetric: quizScoreCol,
      primaryDimension: questionCol,
      primaryTemporal: findCol(/thoi[ _]?gian|date|time/i),
      primaryIdentifier: idCol,
      defaultUnit: "điểm",
    };
  }

  // 4. Phân hệ Khảo sát & Đánh giá (Survey / Feedback)
  const isSurvey =
    hasPattern(/khao[ _]?sat|survey|feedback|hai[ _]?long|satisfaction|tieu[ _]?chi|y[ _]?kien|rating/i);

  if (isSurvey) {
    const ratingCol = findCol(/hai[ _]?long|rating|score|diem/i);
    const criteriaCol = findCol(/tieu[ _]?chi|criteria|cau[ _]?hoi|category/i);
    const idCol = findCol(/ma[ _]?khao[ _]?sat|respondent|id/i);
    return {
      domain: "survey_feedback",
      domainLabel: "Khảo sát Ý kiến & Đánh giá Dịch vụ",
      isEducationalGrade: false,
      primaryMetric: ratingCol,
      primaryDimension: criteriaCol,
      primaryTemporal: findCol(/ngay|date/i),
      primaryIdentifier: idCol,
      defaultUnit: "/5 điểm",
    };
  }

  // 5. Phân hệ Tài chính, Ngân sách & Dòng tiền (Finance / Accounting / Budget)
  const isFinance =
    hasPattern(/ngan[ _]?sach|budget|khoan[ _]?muc|tai[ _]?chinh|finance|dong[ _]?tien|cash[ _]?flow|quy[ _]?dau[ _]?tu/i);

  if (isFinance) {
    const finCol = findCol(/ngan[ _]?sach|budget|chi[ _]?phi|expense|dong[ _]?tien|cash[ _]?flow/i);
    const costCatCol = findCol(/khoan[ _]?muc|danh[ _]?muc|category|phong[ _]?ban|du[ _]?an/i);
    const dateCol = findCol(/ky|quy|quarter|thang|month|nam|year|date/i);
    const idCol = findCol(/ma[ _]?khoan[ _]?muc|ma[ _]?ct|cost[ _]?code|id/i);
    return {
      domain: "finance_accounting",
      domainLabel: "Tài chính & Quản trị Ngân sách",
      isEducationalGrade: false,
      primaryMetric: finCol,
      primaryDimension: costCatCol,
      primaryTemporal: dateCol,
      primaryIdentifier: idCol,
      defaultUnit: "VNĐ",
    };
  }

  // 6. Phân hệ Kinh doanh & Bán hàng (Sales / Revenue)
  const isSales =
    hasPattern(/doanh[ _]?thu|revenue|sales|loi[ _]?nhuan|profit|gia[ _]?ban|don[ _]?hang|order|san[ _]?pham/i);

  if (isSales) {
    const revCol = findCol(/doanh[ _]?thu|revenue|sales|loi[ _]?nhuan|profit/i);
    const catCol = findCol(/nganh[ _]?hang|san[ _]?pham|category|product|khach[ _]?hang/i);
    const dateCol = findCol(/thang|month|ngay|date|nam|year/i);
    const idCol = findCol(/ma[ _]?don|order[ _]?id|ma[ _]?kh|id/i);
    return {
      domain: "sales_revenue",
      domainLabel: "Doanh thu & Tài chính Kinh doanh",
      isEducationalGrade: false,
      primaryMetric: revCol,
      primaryDimension: catCol,
      primaryTemporal: dateCol,
      primaryIdentifier: idCol,
      defaultUnit: "VNĐ",
    };
  }

  // 7. Phân hệ Nhân sự & Tiền lương (HR / Workforce)
  const isHR =
    hasPattern(/nhan[ _]?vien|employee|phong[ _]?ban|department|chuc[ _]?vu|salary|luong/i);

  if (isHR) {
    const salCol = findCol(/luong|salary|thu[ _]?nhap/i);
    const deptCol = findCol(/phong[ _]?ban|department|chuc[ _]?vu/i);
    const idCol = findCol(/ma[ _]?nv|employee[ _]?id|id/i);
    return {
      domain: "hr_workforce",
      domainLabel: "Nhân sự & Tổ chức Doanh nghiệp",
      isEducationalGrade: false,
      primaryMetric: salCol,
      primaryDimension: deptCol,
      primaryTemporal: findCol(/ngay|hire[ _]?date/i),
      primaryIdentifier: idCol,
      defaultUnit: "người",
    };
  }

  // 8. Phân hệ Bài tập & Tiến độ Nộp bài (Assignments / Homework)
  const isAssignment =
    hasPattern(/bai[ _]?tap|assignment|homework|nop[ _]?bai|submission|submission[ _]?rate|deadline/i);

  if (isAssignment) {
    const subCol = findCol(/ty[ _]?le[ _]?nop|nop[ _]?bai|submission|so[ _]?bai|score/i);
    const assCol = findCol(/ten[ _]?bai|ma[ _]?bai|assignment|homework|tieu[ _]?de/i);
    const dateCol = findCol(/deadline|han[ _]?nop|ngay|date/i);
    const idCol = findCol(/mssv|ma[ _]?sv|user|id/i);
    return {
      domain: "education_assignment",
      domainLabel: "Quản lý Bài tập & Nộp bài LMS",
      isEducationalGrade: false,
      primaryMetric: subCol,
      primaryDimension: assCol,
      primaryTemporal: dateCol,
      primaryIdentifier: idCol,
      defaultUnit: "bài",
    };
  }

  // 9. Mặc định: Phân tích Đa ngành (Generic)
  const firstNumeric = columns.find((c) => c.isNumeric && !c.isIdentifier) || null;
  const firstCategory = columns.find((c) => !c.isNumeric && !c.isIdentifier && !c.isPii) || null;
  const firstDate = columns.find((c) => c.inferredType === "date") || null;
  const firstId = columns.find((c) => c.isIdentifier) || null;

  return {
    domain: "generic",
    domainLabel: "Phân tích Dữ liệu Đa ngành",
    isEducationalGrade: false,
    primaryMetric: firstNumeric,
    primaryDimension: firstCategory,
    primaryTemporal: firstDate,
    primaryIdentifier: firstId,
    defaultUnit: firstNumeric ? "đơn vị" : "bản ghi",
  };
}

/**
 * Phân tích tệp Excel (.xlsx) hoặc CSV từ bộ nhớ đệm Buffer
 * @param {Buffer} fileBuffer
 * @param {string} originalName
 * @param {string} mimeType
 * @returns {Promise<object>} DataSourceDescriptor & DatasetProfile
 */
export async function parseFileBuffer(fileBuffer, originalName, mimeType, ownerTeacher = null) {
  cleanExpiredCache();

  if (!fileBuffer || !Buffer.isBuffer(fileBuffer)) {
    throw new Error("Dữ liệu tệp không hợp lệ hoặc rỗng.");
  }

  if (fileBuffer.byteLength > MAX_FILE_SIZE_BYTES) {
    throw new Error(`Dung lượng tệp vượt quá giới hạn tối đa (${MAX_FILE_SIZE_BYTES / (1024 * 1024)}MB).`);
  }

  const ext = (originalName.split(".").pop() || "").toLowerCase();
  if (!["xlsx", "csv"].includes(ext)) {
    throw new Error(`Định dạng tệp .${ext} không được hỗ trợ. Vui lòng sử dụng tệp .xlsx hoặc .csv.`);
  }

  const workbook = new ExcelJS.Workbook();

  try {
    if (ext === "csv") {
      const readable = stream.Readable.from([fileBuffer]);
      const customCsvMap = (datum) => {
        if (datum === "" || datum === undefined || datum === null) return null;
        const trimmed = String(datum).trim();
        // Xử lý chuỗi rỗng sau khi trim hoặc từ khóa null/undefined trong CSV
        if (trimmed === "" || trimmed.toLowerCase() === "null" || trimmed.toLowerCase() === "undefined") {
          return null;
        }
        // Bảo toàn mã định danh có số 0 ở đầu (e.g. "001", "0891")
        if (/^0\d+$/.test(trimmed)) {
          return trimmed;
        }
        const num = Number(trimmed);
        if (!Number.isNaN(num) && num !== Infinity) {
          return num;
        }
        return datum;
      };
      await workbook.csv.read(readable, { map: customCsvMap, parserOptions: { delimiter: csvDelimiter(fileBuffer), ignoreEmpty: false } });
    } else {
      await workbook.xlsx.load(fileBuffer);

      // TỰ ĐỘNG PHÁT HIỆN TỆP EXCEL ĐA TRANG TÍNH (MULTI-SHEET STAR SCHEMA)
      const validSheets = workbook.worksheets.filter((w) => w && w.rowCount > 1);
      if (validSheets.length > 1) {
        return await parseMultiSheetFileBuffer(fileBuffer, originalName, mimeType, ownerTeacher);
      }
    }
  } catch (parseErr) {
    throw new Error(`Không thể đọc cấu trúc tệp ${originalName}: ${parseErr.message}`);
  }

  const worksheet = workbook.worksheets.find(sheet=>sheet.rowCount > 1) || workbook.worksheets[0];
  if (!worksheet || worksheet.rowCount === 0) {
    throw new Error("Tệp bảng tính không có dữ liệu hoặc trang tính đầu tiên rỗng.");
  }

  // 1. Đọc và chuẩn hóa tiêu đề cột (Headers)
  const headerRow = worksheet.getRow(1);
    headerRow.eachCell(cell=>{if(cell.isMerged) throw new Error("MERGED_CELLS_UNSUPPORTED: Header cần một dòng phẳng.");});
  const rawHeaders = [];
  const headerCount = headerRow.cellCount;

  if (headerCount === 0) {
    throw new Error("Không tìm thấy dòng tiêu đề cột trong bảng tính.");
  }

  for (let c = 1; c <= headerCount; c++) {
    const cellVal = headerRow.getCell(c).value;
    let headerText = "";
    if (cellVal && typeof cellVal === "object" && cellVal.richText) {
      headerText = cellVal.richText.map((t) => t.text).join("").trim();
    } else {
      headerText = cellVal !== null && cellVal !== undefined ? String(cellVal).trim() : "";
    }
    rawHeaders.push(headerText);
  }

  // Xử lý cột trùng tiêu đề và cột rỗng
  const normalizedHeaders = normalizeHeaderNames(rawHeaders);

  // 2. Đọc các dòng dữ liệu (Rows)
  const totalRowsInSheet = worksheet.rowCount - 1;
  if (totalRowsInSheet > MAX_ALLOWED_ROWS) throw new Error(`ROW_LIMIT_EXCEEDED: ${totalRowsInSheet} dòng vượt giới hạn ${MAX_ALLOWED_ROWS}; không cắt hoặc nhập một phần dữ liệu.`);
  const rowsToRead = totalRowsInSheet;
  const rows = [];
  const columnData = Array.from({ length: normalizedHeaders.length }, () => []);

  for (let r = 2; r <= rowsToRead + 1; r++) {
    const row = worksheet.getRow(r);
    for(let extra=normalizedHeaders.length+1;extra<=row.cellCount;extra++) if(row.getCell(extra).value!==null) throw new Error('HEADER_WIDTH_MISMATCH: Có dữ liệu ngoài các cột tiêu đề.');
    if(row.hasValues) row.eachCell(cell=>{if(cell.isMerged) throw new Error('MERGED_CELLS_UNSUPPORTED: Hãy chuyển thành bảng phẳng.');});
    const rowObj = {};
    let hasData = false;

    for (let c = 1; c <= normalizedHeaders.length; c++) {
      const colName = normalizedHeaders[c - 1];
      const cell = row.getCell(c);
      let val = cell.value;

      // Xử lý object công thức hoặc rich text
      if (val && typeof val === "object") {
        if (val.formula && val.result === undefined) throw new Error("FORMULA_RESULT_REQUIRED: Cần lưu lại Excel với kết quả công thức đã tính.");
        if (val.result !== undefined) {
          val = val.result; // Lấy kết quả đã tính sẵn, không thực thi công thức mới
        } else if (val.richText) {
          val = val.richText.map((t) => t.text).join("");
        } else if (val.text) {
          val = val.text;
        }
      }

      if(val && typeof val==='object' && !(val instanceof Date)) throw new Error("UNSUPPORTED_CELL_VALUE: Ô lỗi Excel hoặc kiểu phức tạp cần làm sạch.");
      val = sanitizeCellValue(val);

      if (val !== null && val !== undefined && val !== "") {
        hasData = true;
      }

      rowObj[colName] = val;
      columnData[c - 1].push(val);
    }

    if (hasData) {
      rows.push(rowObj);
    }
  }

  if (rows.length === 0) {
    throw new Error("Tệp không chứa bản ghi dữ liệu hợp lệ nào dưới dòng tiêu đề.");
  }

  // 3. Xây dựng DatasetProfile Schema
  const columnsMeta = [];
  const piiFieldsDetected = [];

  normalizedHeaders.forEach((colName, idx) => {
    const values = columnData[idx];
    const inferredType = inferDataType(values);
    let missingCount = 0;
    const numericValues = [];

    const uniqueSet = new Set();
    values.forEach((v) => {
      if (v === null || v === undefined || v === "") {
        missingCount++;
      } else {
        uniqueSet.add(v);
        if (inferredType === "number") {
          const num = typeof v === "number" ? v : Number(String(v).replace(",", "."));
          if (!isNaN(num)) numericValues.push(num);
        }
      }
    });

    const semanticInfo = inferColumnSemantic(colName, values, rows.length, inferredType);
    const finalType = semanticInfo.isIdentifier ? "string" : inferredType;
    const isNumeric = finalType === "number" && !semanticInfo.isIdentifier;

    const lowerCol = colName.toLowerCase();
    const isPii =
      semanticInfo.isIdentifier ||
      lowerCol.includes("tên") ||
      lowerCol.includes("name") ||
      lowerCol.includes("email") ||
      lowerCol.includes("mssv") ||
      lowerCol.includes("phone") ||
      lowerCol.includes("sđt");

    if (isPii) {
      piiFieldsDetected.push(colName);
    }

    const colMeta = {
      name: colName,
      originalName: rawHeaders[idx] || colName,
      canonicalId: semanticInfo.canonicalId,
      originalName: colName,
      inferredType: finalType,
      semanticType: semanticInfo.semanticType,
      domainRole: semanticInfo.domainRole,
      aggregationPolicy: semanticInfo.aggregationPolicy,
      validAggregations: semanticInfo.validAggregations || ["COUNT", "NONE"],
      unitHint: semanticInfo.unitHint,
      hasLeadingZeros: semanticInfo.hasLeadingZeros,
      isNumeric,
      isIdentifier: semanticInfo.isIdentifier,
      missingCount,
      missingPercentage: Math.round((missingCount / rows.length) * 1000) / 10,
      uniqueCount: uniqueSet.size,
      isPii,
      sampleValues: values
        .filter((v) => v !== null && v !== undefined && v !== "")
        .slice(0, 3)
        .map((v) => (isPii ? maskPiiValue(v, colName) : v)),
    };

    if (numericValues.length > 0 && isNumeric) {
      colMeta.min = Math.min(...numericValues);
      colMeta.max = Math.max(...numericValues);
      const sum = numericValues.reduce((a, b) => a + b, 0);
      colMeta.mean = Math.round((sum / numericValues.length) * 100) / 100;
    }

    columnsMeta.push(colMeta);
  });

  // 4. Nhóm chỉ số khả dụng (Metric Groups)
  const numericCols = columnsMeta.filter((c) => c.isNumeric && !c.isIdentifier).map((c) => c.name);
  const categoryCols = columnsMeta.filter((c) => (c.inferredType === "string" || c.isIdentifier) && !c.isPii).map((c) => c.name);
  const identifierCols = columnsMeta.filter((c) => c.isIdentifier).map((c) => c.name);
  const dateCols = columnsMeta.filter((c) => c.inferredType === "date").map((c) => c.name);

  const metricGroups = [
    {
      groupName: "Chỉ số định lượng (Điểm số / Tỷ lệ)",
      columns: numericCols,
      suggestedAggregations: ["AVG", "MAX", "MIN", "DISTRIBUTION"],
    },
    {
      groupName: "Trục phân loại / Danh mục",
      columns: categoryCols,
      suggestedAggregations: ["COUNT", "GROUP_BY"],
    },
  ];

  if (identifierCols.length > 0) {
    metricGroups.push({
      groupName: "Trường định danh học viên / Mã số (Chỉ ĐẾM - Cấm SUM/AVG)",
      columns: identifierCols,
      suggestedAggregations: ["DISTINCTCOUNT", "COUNTROWS"],
    });
  }

  if (dateCols.length > 0) {
    metricGroups.push({
      groupName: "Thời gian / Tiến độ",
      columns: dateCols,
      suggestedAggregations: ["TREND_OVER_TIME"],
    });
  }

  // 5. Chuẩn bị 10 dòng xem trước đã che PII (Masked Preview Rows)
  const previewRows = rows.slice(0, MAX_PREVIEW_ROWS).map((row) => {
    const maskedRow = {};
    for (const [key, val] of Object.entries(row)) {
      maskedRow[key] = maskPiiValue(val, key);
    }
    return maskedRow;
  });

  // 6. Nhận diện Phân hệ nghiệp vụ (Domain Detection)
  const domainInfo = detectDatasetDomain(columnsMeta, rows.slice(0, 5));

  // 7. Lưu vào bộ nhớ đệm tạm thời (TTL 1 giờ)
  const sourceId = `file_${crypto.randomUUID()}`;
  const descriptor = {
    sourceId,
    sourceType: "file_upload",
    fileName: originalName,
    fileType: ext,
    fileSizeBytes: fileBuffer.byteLength,
    uploadedAt: new Date().toISOString(),
  };

  const datasetProfile = {
    sourceId,
    sourceType: "file_upload",
    name: originalName,
    totalRows: rows.length,
    totalColumns: normalizedHeaders.length,
    columns: columnsMeta,
    metricGroups,
    previewRows,
    piiFieldsDetected,
    domain: domainInfo.domain,
    domainLabel: domainInfo.domainLabel,
    domainSummary: domainInfo,
  };

  ephemeralSourceCache.set(sourceId, {
    descriptor,
    profile: datasetProfile,
    rows, // Lưu trữ toàn bộ các dòng sạch phục vụ tính toán biểu đồ thật
    ownerTeacherId: ownerTeacher?.moodleUserId || ownerTeacher?.teacherId || null,
    ownerUsername: ownerTeacher?.username || null,
    cachedAt: Date.now(),
  });

  return {
    descriptor,
    profile: datasetProfile,
  };
}

/**
 * Lưu thủ công profile nguồn vào bộ nhớ đệm (cho nguồn LMS DW)
 */
export function cacheSource(sourceId, descriptor, profile, rows = [], ownerTeacher = null) {
  cleanExpiredCache();
  ephemeralSourceCache.set(sourceId, {
    descriptor,
    profile,
    rows: rows && rows.length > 0 ? rows : (profile.previewRows || []),
    ownerTeacherId: ownerTeacher?.moodleUserId || ownerTeacher?.teacherId || null,
    ownerUsername: ownerTeacher?.username || null,
    cachedAt: Date.now(),
  });
}

/**
 * Lưu thủ công profile đa bảng (Multi-Table) vào bộ nhớ đệm (cho nguồn LMS Star-Schema DW)
 */
export function cacheMultiTableSource(sourceId, descriptor, tables = [], relationships = [], ownerTeacher = null) {
  cleanExpiredCache();
  ephemeralSourceCache.set(sourceId, {
    descriptor,
    isMultiTable: true,
    tables,
    relationships,
    ownerTeacherId: ownerTeacher?.moodleUserId || ownerTeacher?.teacherId || null,
    ownerUsername: ownerTeacher?.username || null,
    cachedAt: Date.now(),
  });
}

/**
 * Lấy profile nguồn từ bộ nhớ đệm
 */
export function getCachedSource(sourceId) {
  cleanExpiredCache();
  const item = ephemeralSourceCache.get(sourceId);
  return item || null;
}

/**
 * Xóa sạch bộ nhớ đệm RAM (chỉ dùng cho kiểm thử tự động mô phỏng khởi động lại máy chủ)
 */
export function clearRamCacheForTesting() {
  ephemeralSourceCache.clear();
}

/**
 * Kiểm tra phân quyền truy cập nguồn dữ liệu (chống truy cập chéo giữa các giảng viên)
 */
export function verifySourceAccess(sourceId, moodleTeacherId) {
  cleanExpiredCache();
  const item = ephemeralSourceCache.get(sourceId);
  if (!item) {
    return false;
  }
  if (
    item.ownerTeacherId &&
    moodleTeacherId &&
    Number(item.ownerTeacherId) !== Number(moodleTeacherId)
  ) {
    return false;
  }
  return true;
}

/**
 * Quy chuẩn thang xếp loại học lực theo Quy chế đào tạo của Bộ GD&ĐT và Đại học Đà Lạt (Thang điểm 10):
 * - [9.0 - 10.0]: Xuất sắc
 * - [8.0 - 9.0): Giỏi (8.0 đến cận 9.0)
 * - [6.5 - 8.0): Khá (6.5 đến cận 8.0)
 * - [5.0 - 6.5): Trung bình (5.0 đến cận 6.5)
 * - Dưới 5.0: Yếu
 */
export function classifyAcademicRank(score) {
  if (score === null || score === undefined || score === "") return "Chưa xếp loại";
  const num = typeof score === "number" ? score : Number(String(score).replace(",", "."));
  if (isNaN(num)) return "Chưa xếp loại";
  if (num >= 9.0) return "Xuất sắc";
  if (num >= 8.0) return "Giỏi";
  if (num >= 6.5) return "Khá";
  if (num >= 5.0) return "Trung bình";
  return "Yếu";
}

/**
 * Tạo tệp Excel mẫu giả lập điểm số sinh viên cho mục đích thử nghiệm và demo
 */
export async function generateDemoGradeTemplateBuffer() {
  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet("BangDiemLopHoc");

  worksheet.columns = [
    { header: "Mã Sinh Viên", key: "mssv", width: 14 },
    { header: "Họ và Tên", key: "fullname", width: 22 },
    { header: "Lớp Khóa", key: "cohort", width: 10 },
    { header: "Điểm Chuyên Cần", key: "attendance", width: 16 },
    { header: "Điểm Bài Tập", key: "assignment", width: 14 },
    { header: "Điểm Thi Giữa Kỳ", key: "midterm", width: 16 },
    { header: "Điểm Thi Cuối Kỳ", key: "final", width: 16 },
    { header: "Xếp Loại", key: "rank", width: 14 },
  ];

  const rawRows = [
    { mssv: "2312687", fullname: "Nguyễn Văn An", cohort: "K47", attendance: 9.5, assignment: 8.5, midterm: 8.0, final: 8.5 },
    { mssv: "2312688", fullname: "Trần Thị Bình", cohort: "K47", attendance: 9.0, assignment: 7.5, midterm: 7.0, final: 7.5 },
    { mssv: "2312689", fullname: "Lê Hoàng Cường", cohort: "K47", attendance: 10.0, assignment: 9.0, midterm: 9.0, final: 9.5 },
    { mssv: "2312690", fullname: "Phạm Minh Đức", cohort: "K47", attendance: 6.0, assignment: 5.5, midterm: 4.5, final: 5.0 },
    { mssv: "2312691", fullname: "Vũ Hải Đăng", cohort: "K47", attendance: 4.0, assignment: 3.5, midterm: 3.0, final: 4.0 },
    { mssv: "2312692", fullname: "Đặng Thu Giang", cohort: "K47", attendance: 8.5, assignment: 8.0, midterm: 7.5, final: 8.0 },
    { mssv: "2312693", fullname: "Bùi Tuấn Hưng", cohort: "K47", attendance: 9.0, assignment: 8.5, midterm: 8.5, final: 8.0 },
    { mssv: "2312694", fullname: "Ngô Khánh Linh", cohort: "K47", attendance: 9.5, assignment: 9.5, midterm: 9.0, final: 9.0 },
    { mssv: "2312695", fullname: "Hồ Quốc Nam", cohort: "K47", attendance: 7.5, assignment: 6.5, midterm: 6.0, final: 6.5 },
    { mssv: "2312696", fullname: "Đỗ Mai Phương", cohort: "K47", attendance: 8.0, assignment: 7.5, midterm: 7.0, final: 7.5 },
    { mssv: "2312697", fullname: "Hoàng Gia Bảo", cohort: "K48", attendance: 8.5, assignment: 8.0, midterm: 8.5, final: 8.5 },
    { mssv: "2312698", fullname: "Lý Mỹ Duyên", cohort: "K48", attendance: 9.0, assignment: 8.5, midterm: 7.5, final: 8.0 },
    { mssv: "2312699", fullname: "Trịnh Bá Hào", cohort: "K48", attendance: 5.0, assignment: 4.5, midterm: 4.0, final: 4.5 },
    { mssv: "2312700", fullname: "Dương Thùy Trang", cohort: "K48", attendance: 9.5, assignment: 9.0, midterm: 8.5, final: 9.0 },
    { mssv: "2312701", fullname: "Mai Văn Kiên", cohort: "K48", attendance: 7.0, assignment: 6.0, midterm: 5.5, final: 6.0 },
    { mssv: "2312702", fullname: "Võ Thị Bích Ngọc", cohort: "K48", attendance: 8.5, assignment: 7.5, midterm: 8.0, final: 8.0 },
    { mssv: "2312703", fullname: "Phan Đình Trọng", cohort: "K48", attendance: 9.0, assignment: 8.5, midterm: 8.0, final: 8.5 },
    { mssv: "2312704", fullname: "Tạ Tuyết Nhung", cohort: "K48", attendance: 7.5, assignment: 7.0, midterm: 6.5, final: 7.0 },
  ];

  const sampleData = rawRows.map((r) => ({
    ...r,
    rank: classifyAcademicRank(r.final),
  }));

  sampleData.forEach((row) => worksheet.addRow(row));

  // Style header row chuẩn nhận diện DLU
  worksheet.getRow(1).font = { bold: true, color: { argb: "FFFFFF" } };
  worksheet.getRow(1).fill = {
    type: "pattern",
    pattern: "solid",
    fgColor: { argb: "006B47" }, // Xanh lá thương hiệu DLU
  };

  return await workbook.xlsx.writeBuffer();
}

/**
 * Thuật toán suy luận Khóa chính (PK), Khóa ngoại (FK) và Mối quan hệ giữa nhiều bảng
 */
export function detectCandidateKeysAndRelationships(tables) {
  // 1. Xác định Primary Key candidates cho từng bảng
  tables.forEach((table) => {
    table.pkCandidates = [];
    table.columns.forEach((col) => {
      const isUnique = col.missingCount === 0 && col.uniqueCount === table.totalRows && table.totalRows > 0;
      const colLower = col.name.toLowerCase();
      const hasKeyNaming =
        colLower.includes("id") ||
        colLower.includes("mssv") ||
        colLower.includes("mã") ||
        colLower.includes("key") ||
        colLower.includes("code");

      col.isPrimaryKeyCandidate = isUnique;
      if (isUnique && hasKeyNaming) {
        table.pkCandidates.unshift(col.name);
      } else if (isUnique) {
        table.pkCandidates.push(col.name);
      }
    });
  });

  // 2. Tìm kiếm cặp quan hệ (Relationships) giữa các bảng
  const relationships = [];
  for (let i = 0; i < tables.length; i++) {
    for (let j = 0; j < tables.length; j++) {
      if (i === j) continue;
      const dimTable = tables[i];
      const factTable = tables[j];

      // Thử từng khóa chính tiềm năng của dimTable
      for (const pkColName of dimTable.pkCandidates) {
        const pkCol = dimTable.columns.find((c) => c.name === pkColName);
        if (!pkCol) continue;

        const pkValues = new Set(
          dimTable.rows.map((r) => String(r[pkColName] ?? "").trim()).filter(Boolean)
        );

        for (const fkCol of factTable.columns) {
          const fkColName = fkCol.name;
          const pkLower = pkColName.toLowerCase();
          const fkLower = fkColName.toLowerCase();
          const pkNorm = pkLower.replace(/[^a-z0-9]/g, "");
          const fkNorm = fkLower.replace(/[^a-z0-9]/g, "");

          const isStudentIdMatch =
            (pkNorm.includes("mssv") || pkLower.includes("sinh viên") || pkLower.includes("sv")) &&
            (fkNorm.includes("mssv") || fkLower.includes("sinh viên") || fkLower.includes("sv"));

          const isCourseIdMatch =
            (pkNorm.includes("monhoc") || pkLower.includes("môn") || pkNorm.includes("course")) &&
            (fkNorm.includes("monhoc") || fkLower.includes("môn") || fkNorm.includes("course"));

          const nameMatches =
            pkNorm === fkNorm ||
            pkNorm.includes(fkNorm) ||
            fkNorm.includes(pkNorm) ||
            isStudentIdMatch ||
            isCourseIdMatch;

          if (nameMatches) {
            const fkValues = factTable.rows
              .map((r) => String(r[fkColName] ?? "").trim())
              .filter(Boolean);

            if (fkValues.length > 0) {
              const matchedCount = fkValues.filter((v) => pkValues.has(v)).length;
              const matchRatio = matchedCount / fkValues.length;

              // Nếu độ bao phủ tham chiếu >= 80% (Referential Integrity threshold)
              if (matchRatio >= 0.8) {
                // Kiểm tra xem quan hệ này đã tồn tại chưa
                const exists = relationships.some(
                  (rel) =>
                    rel.fromTable === factTable.tableName &&
                    rel.fromColumn === fkColName &&
                    rel.toTable === dimTable.tableName &&
                    rel.toColumn === pkColName
                );

                if (!exists) {
                  relationships.push({
                    id: crypto.randomUUID(),
                    fromTable: factTable.tableName,
                    fromColumn: fkColName,
                    toTable: dimTable.tableName,
                    toColumn: pkColName,
                    cardinality: "manyToOne",
                    crossFilteringBehavior: "bothDirections",
                    isActive: true,
                    matchRatio: Math.round(matchRatio * 100) / 100,
                  });
                }
              }
            }
          }
        }
      }
    }
  }

  return relationships;
}

/**
 * Phân tích tệp Excel nhiều trang tính (Multi-sheet Workbook)
 */
export async function parseMultiSheetFileBuffer(fileBuffer, originalName, mimeType, ownerTeacher = null) {
  cleanExpiredCache();

  if (!fileBuffer || !Buffer.isBuffer(fileBuffer)) {
    throw new Error("Dữ liệu tệp không hợp lệ hoặc rỗng.");
  }

  if (fileBuffer.byteLength > MAX_FILE_SIZE_BYTES) {
    throw new Error(`Dung lượng tệp vượt quá giới hạn tối đa (${MAX_FILE_SIZE_BYTES / (1024 * 1024)}MB).`);
  }

  const workbook = new ExcelJS.Workbook();
  try {
    await workbook.xlsx.load(fileBuffer);
  } catch (parseErr) {
    throw new Error(`Không thể đọc cấu trúc tệp ${originalName}: ${parseErr.message}`);
  }

  const parsedTables = [];

  for (const worksheet of workbook.worksheets) {
    if (!worksheet || worksheet.rowCount < 2) continue; // Bỏ qua sheet rỗng hoặc chỉ có 1 dòng

    const rawSheetName = worksheet.name || `Sheet_${parsedTables.length + 1}`;
    const cleanTableName = rawSheetName.replace(/[^a-zA-Z0-9_\u00C0-\u024F\u1EA0-\u1EF9]/g, "_");

    // 1. Đọc dòng tiêu đề
    const headerRow = worksheet.getRow(1);
    headerRow.eachCell(cell=>{if(cell.isMerged) throw new Error("MERGED_CELLS_UNSUPPORTED: Header cần một dòng phẳng.");});
    const rawHeaders = [];
    const headerCount = headerRow.cellCount;
    if (headerCount === 0) continue;

    for (let c = 1; c <= headerCount; c++) {
      const cellVal = headerRow.getCell(c).value;
      let headerText = "";
      if (cellVal && typeof cellVal === "object" && cellVal.richText) {
        headerText = cellVal.richText.map((t) => t.text).join("").trim();
      } else {
        headerText = cellVal !== null && cellVal !== undefined ? String(cellVal).trim() : "";
      }
      rawHeaders.push(headerText);
    }

    const normalizedHeaders = normalizeHeaderNames(rawHeaders);

    // 2. Đọc dữ liệu
    const totalRowsInSheet = worksheet.rowCount - 1;
    if (totalRowsInSheet > MAX_ALLOWED_ROWS) throw new Error(`ROW_LIMIT_EXCEEDED: Sheet ${rawSheetName} có ${totalRowsInSheet} dòng, vượt giới hạn ${MAX_ALLOWED_ROWS}; không cắt dữ liệu.`);
    const rowsToRead = totalRowsInSheet;
    const rows = [];
    const columnData = Array.from({ length: normalizedHeaders.length }, () => []);

    for (let r = 2; r <= rowsToRead + 1; r++) {
      const row = worksheet.getRow(r);
    for(let extra=normalizedHeaders.length+1;extra<=row.cellCount;extra++) if(row.getCell(extra).value!==null) throw new Error('HEADER_WIDTH_MISMATCH: Có dữ liệu ngoài các cột tiêu đề.');
    if(row.hasValues) row.eachCell(cell=>{if(cell.isMerged) throw new Error('MERGED_CELLS_UNSUPPORTED: Hãy chuyển thành bảng phẳng.');});
      const rowObj = {};
      let hasData = false;

      for (let c = 1; c <= normalizedHeaders.length; c++) {
        const colName = normalizedHeaders[c - 1];
        const cell = row.getCell(c);
        let val = cell.value;
        if (val && typeof val === "object") {
          if (val.formula && val.result === undefined) throw new Error("FORMULA_RESULT_REQUIRED: Cần kết quả công thức đã tính.");
          if (val.result !== undefined) val = val.result;
          else if (val.richText) val = val.richText.map((t) => t.text).join("");
          else if (val.text) val = val.text;
        }
        if(val && typeof val==='object' && !(val instanceof Date)) throw new Error("UNSUPPORTED_CELL_VALUE: Ô lỗi Excel hoặc kiểu phức tạp cần làm sạch.");
      val = sanitizeCellValue(val);
        if (val !== null && val !== undefined && val !== "") hasData = true;

        rowObj[colName] = val;
        columnData[c - 1].push(val);
      }
      if (hasData) rows.push(rowObj);
    }

    if (rows.length === 0) continue;

    // 3. Phân tích kiểu dữ liệu các cột
    const columnsMeta = [];
    normalizedHeaders.forEach((colName, idx) => {
      const values = columnData[idx];
      const inferredType = inferDataType(values);
      let missingCount = 0;
      const uniqueSet = new Set();
      const numericValues = [];

      values.forEach((v) => {
        if (v === null || v === undefined || v === "") {
          missingCount++;
        } else {
          uniqueSet.add(v);
          if (inferredType === "number") {
            const num = typeof v === "number" ? v : Number(String(v).replace(",", "."));
            if (!isNaN(num)) numericValues.push(num);
          }
        }
      });

      const semanticInfo = inferColumnSemantic(colName, values, rows.length, inferredType);
      const finalType = semanticInfo.isIdentifier ? "string" : inferredType;
      const isNumeric = finalType === "number" && !semanticInfo.isIdentifier;

      const isPii =
        semanticInfo.isIdentifier ||
        colName.toLowerCase().includes("tên") ||
        colName.toLowerCase().includes("name") ||
        colName.toLowerCase().includes("email") ||
        colName.toLowerCase().includes("mssv") ||
        colName.toLowerCase().includes("phone");

      const colMeta = {
        name: colName,
        originalName: rawHeaders[idx] || colName,
      canonicalId: semanticInfo.canonicalId,
        originalName: colName,
        inferredType: finalType,
        semanticType: semanticInfo.semanticType,
        domainRole: semanticInfo.domainRole,
        aggregationPolicy: semanticInfo.aggregationPolicy,
        unitHint: semanticInfo.unitHint,
        hasLeadingZeros: semanticInfo.hasLeadingZeros,
        isNumeric,
        isIdentifier: semanticInfo.isIdentifier,
        missingCount,
        uniqueCount: uniqueSet.size,
        isPii,
        sampleValues: values
          .filter((v) => v !== null && v !== undefined && v !== "")
          .slice(0, 3)
          .map((v) => (isPii ? maskPiiValue(v, colName) : v)),
      };

      if (numericValues.length > 0 && isNumeric) {
        colMeta.min = Math.min(...numericValues);
        colMeta.max = Math.max(...numericValues);
        const sum = numericValues.reduce((a, b) => a + b, 0);
        colMeta.mean = Math.round((sum / numericValues.length) * 100) / 100;
      }

      columnsMeta.push(colMeta);
    });

    const tableDomainInfo = detectDatasetDomain(columnsMeta, rows.slice(0, 5));

    parsedTables.push({
      tableName: cleanTableName,
      sheetName: rawSheetName,
      totalRows: rows.length,
      totalColumns: columnsMeta.length,
      columns: columnsMeta,
      domain: tableDomainInfo.domain,
      domainLabel: tableDomainInfo.domainLabel,
      rows,
    });
  }

  if (parsedTables.length === 0) {
    throw new Error("Không tìm thấy trang tính nào chứa dữ liệu hợp lệ trong tệp.");
  }

  // 4. Phát hiện Primary Key candidates và Relationships
  const relationships = detectCandidateKeysAndRelationships(parsedTables);

  const sourceId = `src_multi_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
  const descriptor = {
    sourceId,
    type: "EXCEL_MULTI_SHEET",
    originalName,
    tablesCount: parsedTables.length,
    totalRows: parsedTables.reduce((sum, t) => sum + t.totalRows, 0),
    relationshipsCount: relationships.length,
    ownerTeacher,
    cachedAt: Date.now(),
  };

  const multiProfile = {
    sourceId,
    sourceType: "file_upload_multisheet",
    isMultiTable: true,
    name: originalName,
    totalRows: parsedTables.reduce((sum, t) => sum + t.totalRows, 0),
    totalColumns: parsedTables.reduce((sum, t) => sum + t.totalColumns, 0),
    tables: parsedTables,
    relationships,
    columns: parsedTables.flatMap((t) => t.columns.map((c) => ({ ...c, name: `${t.tableName}[${c.name}]` }))),
    previewRows: parsedTables[0]?.rows?.slice(0, 5) || [],
    domain: parsedTables[0]?.domain || "generic",
    domainLabel: `Mô hình Star-Schema (${parsedTables.length} bảng: ${parsedTables.map((t) => t.tableName).join(", ")})`,
  };

  ephemeralSourceCache.set(sourceId, {
    descriptor,
    isMultiTable: true,
    tables: parsedTables,
    relationships,
    profile: multiProfile,
    rows: parsedTables[0]?.rows || [],
    ownerTeacherId: ownerTeacher?.moodleUserId || ownerTeacher?.teacherId || null,
    ownerUsername: ownerTeacher?.username || null,
    cachedAt: Date.now(),
  });

  return {
    descriptor,
    profile: multiProfile,
    tables: parsedTables,
    relationships,
  };
}

/**
 * Tạo tệp Excel nhiều trang tính (Multi-sheet) mẫu chuẩn mô hình thực tế Đại học Đà Lạt:
 * - Sheet 1: Dim_SinhVien (18 sinh viên)
 * - Sheet 2: Dim_MonHoc (Danh mục môn học)
 * - Sheet 3: Fact_BangDiem (Bảng điểm liên kết khóa ngoại với Dim_SinhVien và Dim_MonHoc)
 */
export async function generateMultiSheetDemoWorkbookBuffer() {
  const workbook = new ExcelJS.Workbook();

  // 1. Sheet 1: Dim_SinhVien
  const wsSV = workbook.addWorksheet("Dim_SinhVien");
  wsSV.columns = [
    { header: "MSSV", key: "mssv", width: 14 },
    { header: "Họ và Tên", key: "fullname", width: 22 },
    { header: "Lớp Khóa", key: "cohort", width: 12 },
    { header: "Email", key: "email", width: 26 },
    { header: "Giới Tính", key: "gender", width: 10 },
  ];

  const svRows = [
    { mssv: "2312687", fullname: "Nguyễn Văn An", cohort: "K47", email: "2312687@dlu.edu.vn", gender: "Nam" },
    { mssv: "2312688", fullname: "Trần Thị Bình", cohort: "K47", email: "2312688@dlu.edu.vn", gender: "Nữ" },
    { mssv: "2312689", fullname: "Lê Hoàng Cường", cohort: "K47", email: "2312689@dlu.edu.vn", gender: "Nam" },
    { mssv: "2312690", fullname: "Phạm Minh Đức", cohort: "K47", email: "2312690@dlu.edu.vn", gender: "Nam" },
    { mssv: "2312691", fullname: "Vũ Hải Đăng", cohort: "K47", email: "2312691@dlu.edu.vn", gender: "Nam" },
    { mssv: "2312692", fullname: "Đặng Thu Giang", cohort: "K47", email: "2312692@dlu.edu.vn", gender: "Nữ" },
    { mssv: "2312693", fullname: "Bùi Tuấn Hưng", cohort: "K47", email: "2312693@dlu.edu.vn", gender: "Nam" },
    { mssv: "2312694", fullname: "Ngô Khánh Linh", cohort: "K47", email: "2312694@dlu.edu.vn", gender: "Nữ" },
    { mssv: "2312695", fullname: "Hồ Quốc Nam", cohort: "K47", email: "2312695@dlu.edu.vn", gender: "Nam" },
    { mssv: "2312696", fullname: "Đỗ Mai Phương", cohort: "K47", email: "2312696@dlu.edu.vn", gender: "Nữ" },
    { mssv: "2312697", fullname: "Hoàng Gia Bảo", cohort: "K48", email: "2312697@dlu.edu.vn", gender: "Nam" },
    { mssv: "2312698", fullname: "Lý Mỹ Duyên", cohort: "K48", email: "2312698@dlu.edu.vn", gender: "Nữ" },
    { mssv: "2312699", fullname: "Trịnh Bá Hào", cohort: "K48", email: "2312699@dlu.edu.vn", gender: "Nam" },
    { mssv: "2312700", fullname: "Dương Thùy Trang", cohort: "K48", email: "2312700@dlu.edu.vn", gender: "Nữ" },
    { mssv: "2312701", fullname: "Mai Văn Kiên", cohort: "K48", email: "2312701@dlu.edu.vn", gender: "Nam" },
    { mssv: "2312702", fullname: "Võ Thị Bích Ngọc", cohort: "K48", email: "2312702@dlu.edu.vn", gender: "Nữ" },
    { mssv: "2312703", fullname: "Phan Đình Trọng", cohort: "K48", email: "2312703@dlu.edu.vn", gender: "Nam" },
    { mssv: "2312704", fullname: "Tạ Tuyết Nhung", cohort: "K48", email: "2312704@dlu.edu.vn", gender: "Nữ" },
  ];
  svRows.forEach((r) => wsSV.addRow(r));
  wsSV.getRow(1).font = { bold: true, color: { argb: "FFFFFF" } };
  wsSV.getRow(1).fill = { type: "pattern", pattern: "solid", fgColor: { argb: "006B47" } };

  // 2. Sheet 2: Dim_MonHoc
  const wsMH = workbook.addWorksheet("Dim_MonHoc");
  wsMH.columns = [
    { header: "Mã Môn Học", key: "courseCode", width: 14 },
    { header: "Tên Môn Học", key: "courseName", width: 30 },
    { header: "Số Tín Chỉ", key: "credits", width: 12 },
    { header: "Học Kỳ", key: "semester", width: 14 },
  ];
  const mhRows = [
    { courseCode: "CT241", courseName: "Lập trình Web & Ứng dụng AI", credits: 3, semester: "HK1-2026" },
    { courseCode: "CT242", courseName: "Cơ sở dữ liệu nâng cao", credits: 4, semester: "HK1-2026" },
  ];
  mhRows.forEach((r) => wsMH.addRow(r));
  wsMH.getRow(1).font = { bold: true, color: { argb: "FFFFFF" } };
  wsMH.getRow(1).fill = { type: "pattern", pattern: "solid", fgColor: { argb: "006B47" } };

  // 3. Sheet 3: Fact_BangDiem
  const wsBD = workbook.addWorksheet("Fact_BangDiem");
  wsBD.columns = [
    { header: "Mã Sinh Viên", key: "mssv", width: 14 },
    { header: "Mã Môn Học", key: "courseCode", width: 14 },
    { header: "Điểm Chuyên Cần", key: "attendance", width: 16 },
    { header: "Điểm Bài Tập", key: "assignment", width: 14 },
    { header: "Điểm Thi Giữa Kỳ", key: "midterm", width: 16 },
    { header: "Điểm Thi Cuối Kỳ", key: "final", width: 16 },
    { header: "Xếp Loại", key: "rank", width: 14 },
  ];

  const bdRows = [
    { mssv: "2312687", courseCode: "CT241", attendance: 9.5, assignment: 8.5, midterm: 8.0, final: 8.5 },
    { mssv: "2312688", courseCode: "CT241", attendance: 9.0, assignment: 7.5, midterm: 7.0, final: 7.5 },
    { mssv: "2312689", courseCode: "CT241", attendance: 10.0, assignment: 9.0, midterm: 9.0, final: 9.5 },
    { mssv: "2312690", courseCode: "CT241", attendance: 6.0, assignment: 5.5, midterm: 4.5, final: 5.0 },
    { mssv: "2312691", courseCode: "CT241", attendance: 4.0, assignment: 3.5, midterm: 3.0, final: 4.0 },
    { mssv: "2312692", courseCode: "CT241", attendance: 8.5, assignment: 8.0, midterm: 7.5, final: 8.0 },
    { mssv: "2312693", courseCode: "CT241", attendance: 9.0, assignment: 8.5, midterm: 8.5, final: 8.0 },
    { mssv: "2312694", courseCode: "CT241", attendance: 9.5, assignment: 9.5, midterm: 9.0, final: 9.0 },
    { mssv: "2312695", courseCode: "CT241", attendance: 7.5, assignment: 6.5, midterm: 6.0, final: 6.5 },
    { mssv: "2312696", courseCode: "CT241", attendance: 8.0, assignment: 7.5, midterm: 7.0, final: 7.5 },
    { mssv: "2312697", courseCode: "CT241", attendance: 8.5, assignment: 8.0, midterm: 8.5, final: 8.5 },
    { mssv: "2312698", courseCode: "CT241", attendance: 9.0, assignment: 8.5, midterm: 7.5, final: 8.0 },
    { mssv: "2312699", courseCode: "CT241", attendance: 5.0, assignment: 4.5, midterm: 4.0, final: 4.5 },
    { mssv: "2312700", courseCode: "CT241", attendance: 9.5, assignment: 9.0, midterm: 8.5, final: 9.0 },
    { mssv: "2312701", courseCode: "CT241", attendance: 7.0, assignment: 6.0, midterm: 5.5, final: 6.0 },
    { mssv: "2312702", courseCode: "CT241", attendance: 8.5, assignment: 7.5, midterm: 8.0, final: 8.0 },
    { mssv: "2312703", courseCode: "CT241", attendance: 9.0, assignment: 8.5, midterm: 8.0, final: 8.5 },
    { mssv: "2312704", courseCode: "CT241", attendance: 7.5, assignment: 7.0, midterm: 6.5, final: 7.0 },
  ].map((r) => ({
    ...r,
    rank: classifyAcademicRank(r.final),
  }));

  bdRows.forEach((r) => wsBD.addRow(r));
  wsBD.getRow(1).font = { bold: true, color: { argb: "FFFFFF" } };
  wsBD.getRow(1).fill = { type: "pattern", pattern: "solid", fgColor: { argb: "006B47" } };

  return await workbook.xlsx.writeBuffer();
}
