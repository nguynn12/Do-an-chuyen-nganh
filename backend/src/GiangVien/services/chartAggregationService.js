/**
 * Dịch vụ tổng hợp số liệu biểu đồ thật (Real Data Chart Aggregation Engine)
 * Phục vụ AI Dashboard Studio (LMS Đại học Đà Lạt)
 * Đồng bộ hóa số liệu, measures và bộ lọc với Report Plan IR & Visual Dashboard Preview
 */

import { detectDatasetDomain } from "./excelParserService.js";

export const ALLOWED_CHART_TYPES = [
  "bar",
  "donut",
  "pie",
  "line",
  "scatter",
  "kpi_card",
  "table",
  "tableEx",
];
export const ALLOWED_AGGREGATIONS = [
  "AVG",
  "SUM",
  "COUNT",
  "DISTINCTCOUNT",
  "DISTRIBUTION",
  "NONE",
];

const COLOR_PALETTE = [
  "#4f46e5", // Indigo
  "#06b6d4", // Cyan
  "#10b981", // Emerald
  "#f59e0b", // Amber
  "#ef4444", // Red
  "#8b5cf6", // Purple
  "#ec4899", // Pink
  "#3b82f6", // Blue
];

/**
 * Trích xuất giá trị trường từ dòng dữ liệu với khả năng so khớp mờ (Fuzzy Column Match)
 * Xử lý linh hoạt dấu gạch dưới (_), khoảng trắng, chữ hoa/thường và dấu tiếng Việt
 */
export function getRowVal(row, colName) {
  if (!row || !colName) return undefined;
  if (row[colName] !== undefined) return row[colName];

  const strip = (s) =>
    String(s)
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9]/g, "");

  const targetStrip = strip(colName);
  for (const [k, v] of Object.entries(row)) {
    if (strip(k) === targetStrip) return v;
  }
  return undefined;
}

/**
 * Chuẩn hóa số thực từ chuỗi hoặc số
 */
export function parseNumericValue(val) {
  if (val === null || val === undefined || val === "") return null;
  if (typeof val === "number") return isNaN(val) ? null : val;
  const str = String(val).trim().replace(",", ".");
  const num = Number(str);
  return isNaN(num) ? null : num;
}

/**
 * Sắp xếp thứ tự phân loại chuẩn sư phạm
 */
function getCategoryOrderRank(cat) {
  const lower = String(cat).toLowerCase();
  if (lower.includes("yếu") || lower.includes("< 5") || lower.includes("kem")) return 1;
  if (lower.includes("trung bình") || lower.includes("5.0 - 6.4")) return 2;
  if (lower.includes("khá") || lower.includes("6.5 - 7.9")) return 3;
  if (lower.includes("giỏi") || lower.includes("8.0 - 8.9")) return 4;
  if (lower.includes("xuất sắc") || lower.includes("9.0")) return 5;
  return 100;
}

/**
 * Tự động suy luận đơn vị đo lường linh hoạt theo tên chỉ số và miền nghiệp vụ
 */
export function inferMetricUnit(metricName, aggregation = "AVG", isEducational = false) {
  const norm = String(metricName || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[đĐ]/g, "d");
  if (norm.includes("ty le") || norm.includes("phan tram") || norm.includes("%") || norm.includes("rate")) return "%";
  if (norm.includes("hai long") || norm.includes("rating") || norm.includes("danh gia") || norm.includes("khao sat")) return "/5 điểm";
  if (
    norm.includes("doanh thu") ||
    norm.includes("chi phi") ||
    norm.includes("loi nhuan") ||
    norm.includes("ngan sach") ||
    norm.includes("budget") ||
    norm.includes("dong tien") ||
    norm.includes("luong") ||
    norm.includes("vnd") ||
    norm.includes("dong") ||
    (/(?:gia[ _]?ban|gia[ _]?tien|don[ _]?gia|bang[ _]?gia)/i.test(norm) && !norm.includes("danh gia"))
  ) return "VNĐ";
  if (norm.includes("bai tap") || norm.includes("nop bai") || norm.includes("assignment") || norm.includes("homework")) return "bài";
  if (norm.includes("buoi") || norm.includes("session")) return "buổi";
  if (norm.includes("gio") || norm.includes("hour")) return "giờ";
  if (norm.includes("phut") || norm.includes("minute")) return "phút";
  if (norm.includes("sinh vien") || norm.includes("hoc vien") || norm.includes("sv")) return "sinh viên";
  if (norm.includes("khach hang")) return "khách hàng";
  if (norm.includes("nhan vien")) return "nhân viên";
  if (norm.includes("don hang")) return "đơn hàng";
  if (norm.includes("diem") || norm.includes("grade") || norm.includes("score")) return "điểm";
  if (aggregation === "COUNT" || aggregation === "DISTINCTCOUNT") {
    return isEducational ? "sinh viên" : "bản ghi";
  }
  return isEducational ? "điểm" : "";
}

/**
 * Tìm trường định danh tiềm năng trong dòng dữ liệu
 */
function findIdentifierKey(row) {
  if (!row) return null;
  const keys = Object.keys(row);
  return (
    keys.find((k) => /^(mã|mssv|id|stt|code|key|student_id|masv)\b/i.test(k)) ||
    keys.find((k) => /id|mssv|code/i.test(k)) ||
    keys[0] ||
    null
  );
}

/**
 * Kiểm tra xem tập dữ liệu có thuộc phân hệ Điểm số Sư phạm không
 */
function isEducationDataset(rows = []) {
  if (!rows || rows.length === 0) return false;
  const sample = rows[0];
  const keys = Object.keys(sample);
  const normKeys = keys.map((k) => k.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, ""));
  return (
    normKeys.some((k) => k.includes("chuyen can") || k.includes("cuoi ky") || k.includes("giua ky") || k.includes("xep loai")) &&
    normKeys.some((k) => k.includes("mssv") || k.includes("ma sv") || k.includes("sinh vien") || k.includes("lop"))
  );
}

/**
 * Phân bổ phần dư làm tròn theo phương pháp Largest Remainder (Hare-Niemeyer / Hamilton)
 * Đảm bảo tổng phần trăm của một phân hoạch đầy đủ luôn đạt chính xác 100.0%,
 * không làm thay đổi giá trị số lượng thực tế (counts).
 */
export function distributePercentages(counts = [], precision = 1) {
  if (!Array.isArray(counts) || counts.length === 0) return [];

  const total = counts.reduce((acc, c) => {
    const val = typeof c === "number" && !isNaN(c) && c > 0 ? c : 0;
    return acc + val;
  }, 0);

  if (total <= 0) {
    return counts.map(() => 0);
  }

  const factor = Math.pow(10, precision);
  const targetScaledSum = 100 * factor; // precision = 1 -> targetScaledSum = 1000

  // 1. Tính toán giá trị scaled chính xác, phần nguyên (floor), và phần dư
  const items = counts.map((c, index) => {
    const val = typeof c === "number" && !isNaN(c) && c > 0 ? c : 0;
    const exact = (val / total) * targetScaledSum;
    const base = Math.floor(exact);
    const remainder = exact - base;
    return {
      index,
      count: val,
      base,
      remainder,
    };
  });

  // 2. Tính tổng phần nguyên hiện có và phần bù cần phân bổ
  const currentBaseSum = items.reduce((sum, item) => sum + item.base, 0);
  let remainderToDistribute = Math.round(targetScaledSum - currentBaseSum);

  // 3. Sắp xếp các nhóm theo thứ tự ưu tiên
  const sortedIndices = items
    .filter((it) => it.count > 0)
    .sort((a, b) => {
      if (Math.abs(b.remainder - a.remainder) > 1e-9) {
        return b.remainder - a.remainder;
      }
      if (b.count !== a.count) {
        return b.count - a.count;
      }
      return a.index - b.index;
    })
    .map((it) => it.index);

  // 4. Phân bổ phần dư (+1 đơn vị scaled)
  const resultScaled = items.map((it) => it.base);
  for (let i = 0; i < remainderToDistribute && i < sortedIndices.length; i++) {
    resultScaled[sortedIndices[i]] += 1;
  }

  // 5. Chuyển đổi về phần trăm thập phân
  return resultScaled.map((scaled) => Number((scaled / factor).toFixed(precision)));
}

/**
 * Cơ chế Resolve Data Binding chuẩn hóa giữa Report Plan, Measures và các cột thực tế của Data Source
 * Giải quyết dứt điểm các trường hợp:
 * - visual tham chiếu measureId hoặc measureName thay vì tên cột (vd: AvgAttendance, AvgFinal)
 * - visual bị nhầm lẫn aggregation "AVG", "SUM" vào tên trường cột
 * - visual loại Donut/Pie/Count với yAxis là "Số lượng" hoặc "DISTRIBUTION"
 * @param {object} chartSuggestion
 * @param {Array<object>} rows
 * @param {object} options
 * @returns {object} Cấu trúc visual đã resolve chuẩn xác
 */
export function resolveVisualBinding(chartSuggestion = {}, rows = [], options = {}) {
  const sampleRow = rows[0] || {};
  const availableCols = Object.keys(sampleRow);
  const measures = options.measures || chartSuggestion.measures || [];

  let xAxis = chartSuggestion.xAxis || chartSuggestion.categoryField || chartSuggestion.fieldId;
  let yAxis = chartSuggestion.yAxis || chartSuggestion.measureField || chartSuggestion.fieldId || chartSuggestion.measureId;
  let rawAgg = String(chartSuggestion.aggregation || "").toUpperCase();
  let aggregation = ALLOWED_AGGREGATIONS.includes(rawAgg) ? rawAgg : "AVG";
  const title = String(chartSuggestion.title || "").trim();
  const lowerTitle = title.toLowerCase();

  const strip = (s) =>
    String(s || "")
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9]/g, "");

  // 1. Nếu yAxis hoặc measureField bị nhầm thành tên hàm AGG (AVG, SUM, COUNT, DISTINCTCOUNT)
  if (yAxis && ALLOWED_AGGREGATIONS.includes(String(yAxis).toUpperCase())) {
    aggregation = String(yAxis).toUpperCase();
    yAxis = null;
  }

  // 2. Tra cứu trong danh sách Measures (Report Plan Measures)
  let matchedMeasure = null;
  if (yAxis) {
    matchedMeasure = measures.find(
      (m) =>
        m.name === yAxis ||
        m.id === yAxis ||
        strip(m.name) === strip(yAxis) ||
        (m.lineageTag && m.lineageTag === yAxis)
    );
  }

  // Nếu không tìm thấy bằng yAxis, thử tra cứu Measure bằng title của visual
  if (!matchedMeasure && title) {
    matchedMeasure = measures.find(
      (m) => m.name === title || strip(m.name) === strip(title)
    );
  }

  if (matchedMeasure) {
    const dax = String(matchedMeasure.dax || "");
    const bracketMatch = dax.match(/\[([^\]]+)\]/);
    const colInDax = bracketMatch ? bracketMatch[1] : null;

    if (dax.includes("DIVIDE") || lowerTitle.includes("tỷ lệ") || lowerTitle.includes("pass")) {
      yAxis = "Tỷ lệ đạt";
    } else if (dax.includes("DISTINCTCOUNT") || dax.includes("COUNTROWS") || lowerTitle.includes("tổng sinh viên") || lowerTitle.includes("tổng số")) {
      yAxis = colInDax || findIdentifierKey(sampleRow) || "Toàn bộ sinh viên";
      aggregation = dax.includes("DISTINCTCOUNT") ? "DISTINCTCOUNT" : "COUNT";
    } else if (colInDax) {
      yAxis = colInDax;
      if (dax.includes("SUM")) aggregation = "SUM";
      else if (dax.includes("MIN")) aggregation = "MIN";
      else if (dax.includes("MAX")) aggregation = "MAX";
      else aggregation = "AVG";
    }
  }

  // 3. Phân rã các tên Measure phổ biến sinh bởi AI (CamelCase / Heuristics)
  if (yAxis && !availableCols.some((k) => strip(k) === strip(yAxis))) {
    const stripY = strip(yAxis);

    if (stripY === "avgattendance" || stripY === "attendanceavg" || stripY === "diemchuyencantb") {
      const attCol = availableCols.find((k) => /cc|chuyen[ _]?can|attendance/i.test(strip(k)));
      if (attCol) {
        yAxis = attCol;
        aggregation = "AVG";
      }
    } else if (stripY === "avgfinal" || stripY === "finalavg" || stripY === "diemcuoikytb" || stripY === "diemcktb") {
      const finalCol = availableCols.find((k) => /ck|cuoi[ _]?ky|final|tong[ _]?ket|diem/i.test(strip(k)));
      if (finalCol) {
        yAxis = finalCol;
        aggregation = "AVG";
      }
    } else if (stripY === "totalrevenue" || stripY === "sumrevenue" || stripY === "tongdoanhthu") {
      const revCol = availableCols.find((k) => /doanh[ _]?thu|revenue|sales/i.test(strip(k)));
      if (revCol) {
        yAxis = revCol;
        aggregation = "SUM";
      }
    } else if (stripY === "totalcost" || stripY === "sumcost" || stripY === "tongchiphi") {
      const costCol = availableCols.find((k) => /chi[ _]?phi|cost|expense/i.test(strip(k)));
      if (costCol) {
        yAxis = costCol;
        aggregation = "SUM";
      }
    } else if (stripY === "totalstudents" || stripY === "studentcount" || stripY === "tongsinhvien") {
      const idCol = findIdentifierKey(sampleRow);
      if (idCol) {
        yAxis = idCol;
        aggregation = "COUNT";
      }
    } else if (stripY === "passrate" || stripY === "tyledat") {
      yAxis = "Tỷ lệ đạt";
    }
  }

  // 4. Nếu yAxis vẫn null hoặc chưa khớp, thử suy luận từ Tiêu đề (Visual Title)
  if (!yAxis || !availableCols.some((k) => strip(k) === strip(yAxis))) {
    if (lowerTitle.includes("chuyên cần") || lowerTitle.includes("attendance")) {
      const attCol = availableCols.find((k) => /cc|chuyen[ _]?can|attendance/i.test(strip(k)));
      if (attCol) {
        yAxis = attCol;
        aggregation = "AVG";
      }
    } else if (lowerTitle.includes("cuối kỳ") || lowerTitle.includes("final") || lowerTitle.includes("thi")) {
      const finalCol = availableCols.find((k) => /ck|cuoi[ _]?ky|final|thi/i.test(strip(k)));
      if (finalCol) {
        yAxis = finalCol;
        aggregation = "AVG";
      }
    } else if (lowerTitle.includes("tỷ lệ đạt") || lowerTitle.includes("pass rate") || lowerTitle.includes("qua môn")) {
      yAxis = "Tỷ lệ đạt";
    } else if (lowerTitle.includes("tổng sinh viên") || lowerTitle.includes("tổng số sinh viên") || lowerTitle.includes("sĩ số")) {
      yAxis = findIdentifierKey(sampleRow) || "Toàn bộ sinh viên";
      aggregation = "COUNT";
    } else if (lowerTitle.includes("doanh thu") || lowerTitle.includes("revenue")) {
      const revCol = availableCols.find((k) => /doanh[ _]?thu|revenue|sales/i.test(strip(k)));
      if (revCol) {
        yAxis = revCol;
        aggregation = "SUM";
      }
    } else if (lowerTitle.includes("chi phí") || lowerTitle.includes("cost")) {
      const costCol = availableCols.find((k) => /chi[ _]?phi|cost|expense/i.test(strip(k)));
      if (costCol) {
        yAxis = costCol;
        aggregation = "SUM";
      }
    }
  }

  // 5. Chuẩn hóa tên cột chính xác theo casing thực tế trong rows[0]
  if (yAxis && yAxis !== "Tỷ lệ đạt" && yAxis !== "Số lượng" && yAxis !== "Chi tiết" && yAxis !== "Toàn bộ sinh viên") {
    const matchedCol = availableCols.find((k) => strip(k) === strip(yAxis));
    if (matchedCol) {
      yAxis = matchedCol;
    }
  }

  if (xAxis && xAxis !== "Toàn bộ sinh viên" && xAxis !== "Toàn bộ" && xAxis !== "Danh sách") {
    const matchedX = availableCols.find((k) => strip(k) === strip(xAxis));
    if (matchedX) {
      xAxis = matchedX;
    }
  }

  return {
    ...chartSuggestion,
    xAxis,
    yAxis,
    categoryField: xAxis,
    measureField: yAxis,
    resolvedMeasureDax: matchedMeasure?.dax || null,
    aggregation,
  };
}

/**
 * Tính toán số liệu thực tế cho một biểu đồ từ danh sách các dòng dữ liệu nguồn
 * Đồng bộ hóa triệt để với logic tính toán của Report Plan IR & Power BI Authoring Service
 * @param {object} chartSuggestion Đề xuất cấu trúc biểu đồ { chartType, xAxis, yAxis, aggregation, title, filter }
 * @param {Array<object>} rows Danh sách các dòng dữ liệu sạch từ bộ nhớ đệm
 * @param {object} options Các tùy chọn nguồn { sourceType, sourceName, summary, activeFilters, measures, columns }
 * @returns {object} Cấu trúc realData hoàn chỉnh
 */
export function computeChartRealData(chartSuggestion, rows = [], options = {}) {
  // Giải quyết ràng buộc dữ liệu (Resolve Measure/Field Binding) trước khi tổng hợp
  const resolved = resolveVisualBinding(chartSuggestion, rows, options);

  let rawType = resolved.chartType || resolved.visualType || "bar";
  if (rawType === "cardVisual") rawType = "kpi_card";
  if (rawType === "columnChart" || rawType === "clusteredColumnChart" || rawType === "barChart" || rawType === "clusteredBarChart") rawType = "bar";
  if (rawType === "donutChart") rawType = "donut";
  if (rawType === "pieChart") rawType = "pie";
  if (rawType === "lineChart") rawType = "line";
  if (rawType === "scatterChart") rawType = "scatter";
  if (rawType === "table") rawType = "tableEx";

  let chartType = rawType;
  if (!ALLOWED_CHART_TYPES.includes(chartType)) {
    chartType = "bar";
  }

  const aggregation = resolved.aggregation || "AVG";
  const xAxis = resolved.xAxis;
  const yAxis = resolved.yAxis;
  const title = resolved.title || "";
  const isLmsSource = options.sourceType === "lms_datawarehouse";

  // Kiểm tra dữ liệu rỗng
  if (!rows || rows.length === 0) {
    return {
      isEmpty: true,
      emptyMessage: "Nguồn dữ liệu không chứa bản ghi nào.",
      sampleSize: 0,
      nullCount: 0,
      categories: [],
      series: [],
      unit: "—",
      semanticsNote: "Không có dữ liệu.",
    };
  }

  // 1. ÁP DỤNG BỘ LỌC ĐỒNG BỘ (ACTIVE FILTERS & CHART FILTER)
  const rawDirectFilters = { ...(options || {}) };
  delete rawDirectFilters.sourceType;
  delete rawDirectFilters.sourceName;
  delete rawDirectFilters.summary;
  delete rawDirectFilters.activeFilters;
  delete rawDirectFilters.measures;
  delete rawDirectFilters.columns;
  delete rawDirectFilters.tables;
  delete rawDirectFilters.relationships;
  delete rawDirectFilters.isMultiTable;

  const activeFilters = {
    ...rawDirectFilters,
    ...(options.activeFilters || {}),
    ...(chartSuggestion.activeFilters || {}),
  };

  let filteredRows = [...rows];
  const sampleRow = rows[0] || {};
  const availableCols = Object.keys(sampleRow);
  const strip = (s) => String(s || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]/g, "");

  // 1b. Nhận diện miền nghiệp vụ ngữ nghĩa của bộ dữ liệu
  const sampleCols = Object.keys(rows[0] || {}).map((k) => ({ name: k }));
  const domainInfo = detectDatasetDomain(sampleCols, rows.slice(0, 5));

  // Lọc theo activeFilters (ví dụ Lớp_Khóa: K47 hoặc K48) - Chỉ lọc nếu trường thực sự tồn tại trong dữ liệu
  for (const [fCol, fVal] of Object.entries(activeFilters)) {
    if (fVal && fVal !== "All" && fVal !== "Tất cả") {
      const colExistsInRow = availableCols.some((k) => strip(k) === strip(fCol));
      if (colExistsInRow) {
        filteredRows = filteredRows.filter((r) => {
          const val = getRowVal(r, fCol);
          return String(val ?? "").trim() === String(fVal).trim();
        });
      }
    }
  }

  // Lọc bổ sung theo thuộc tính filter của riêng biểu đồ (nếu có)
  if (chartSuggestion.filter === "passed_only" || chartSuggestion.filter === "dat") {
    filteredRows = filteredRows.filter((r) => {
      // Bỏ qua dòng tổng cộng
      for (const v of Object.values(r)) {
        if (typeof v === "string" && (v.includes("Toàn khóa học") || v.includes("Tổng hợp"))) {
          return false;
        }
      }
      if (domainInfo.isEducationalGrade) {
        // Kiểm tra điểm thi cuối kỳ hoặc điểm học phần >= 5.0
        const finalScore =
          parseNumericValue(getRowVal(r, "Điểm_Thi_Cuối_Kỳ")) ??
          parseNumericValue(getRowVal(r, "Điểm_Tổng_Kết")) ??
          parseNumericValue(getRowVal(r, "DiemCK")) ??
          parseNumericValue(getRowVal(r, "Điểm"));
        if (finalScore !== null) {
          return finalScore >= 5.0;
        }
        const rank = String(getRowVal(r, "Xếp_Loại") || getRowVal(r, "XepLoai") || "").toLowerCase();
        if (rank.includes("yếu") || rank.includes("kém") || rank.includes("chưa")) return false;
        return true;
      }
      // Miền phi giáo dục: Kiểm tra trạng thái hoàn thành / đạt / thành công
      const statusVal = String(
        getRowVal(r, "TrangThai") ??
        getRowVal(r, "Trạng Thái") ??
        getRowVal(r, "KetQua") ??
        getRowVal(r, "Kết Quả") ??
        getRowVal(r, "Status") ??
        ""
      ).toLowerCase();
      if (statusVal) {
        return statusVal.includes("đạt") || statusVal.includes("pass") || statusVal.includes("hoàn thành") || statusVal.includes("completed") || statusVal.includes("thành công");
      }
      return true;
    });
  }

  if (filteredRows.length === 0) {
    return {
      isEmpty: true,
      emptyMessage: "Không tìm thấy bản ghi nào thỏa mãn bộ lọc hiện tại.",
      sampleSize: 0,
      nullCount: 0,
      categories: [],
      series: [],
      unit: "—",
      semanticsNote: "Bộ lọc không có kết quả phù hợp.",
    };
  }

  const isEdu = isEducationDataset(rows);

  // Ghi chú ngữ nghĩa
  const semanticsNote = isLmsSource
    ? `Dữ liệu tổng hợp từ LMS Data Warehouse. Thống kê trên ${filteredRows.length} đối tượng (COUNT DISTINCT).`
    : isEdu
    ? `Dữ liệu tính toán từ ${filteredRows.length} bản ghi học tập thực tế. Loại trừ giá trị trống. Thang điểm chuẩn học vụ 0–10.`
    : `Dữ liệu tính toán từ ${filteredRows.length} bản ghi thực tế. Loại trừ giá trị trống.`;

  // ===========================================================================
  // XỬ LÝ THEO LOẠI BIỂU ĐỒ
  // ===========================================================================

  // 1. KPI CARD
  if (chartType === "kpi_card") {
    const lowerTitle = String(title).toLowerCase();
    const lowerY = String(yAxis || "").toLowerCase();
    const lowerX = String(xAxis || "").toLowerCase();

    // A. KPI: ĐẾM SỐ LƯỢNG ĐỐI TƯỢNG / BẢN GHI / IDENTIFIER KPI
    const isExplicitCountAgg = aggregation === "COUNT" || aggregation === "DISTINCTCOUNT";
    const isEntityCountTitle =
      lowerTitle.includes("tổng sinh viên") ||
      lowerTitle.includes("tổng số sinh viên") ||
      lowerTitle.includes("số lượng sinh viên") ||
      lowerTitle.includes("tổng nhân sự") ||
      lowerTitle.includes("tổng học viên") ||
      lowerTitle.includes("quy mô") ||
      lowerTitle.includes("số sinh viên") ||
      lowerTitle.includes("tổng số bản ghi") ||
      lowerTitle.includes("tổng số đối tượng");

    const isCountKpi =
      isExplicitCountAgg ||
      (isEntityCountTitle && chartSuggestion.aggregation !== "SUM");

    if (isCountKpi && !lowerTitle.includes("điểm") && !lowerTitle.includes("tỷ lệ") && !lowerTitle.includes("doanh thu") && !lowerTitle.includes("chi phí") && !lowerTitle.includes("lương")) {
      // Đếm số lượng thực thể duy nhất (Distinct count of IDs) hoặc tổng số bản ghi
      const sampleRow = filteredRows[0] || {};
      const idKey = yAxis && sampleRow[yAxis] !== undefined
        ? yAxis
        : (xAxis && sampleRow[xAxis] !== undefined ? xAxis : findIdentifierKey(sampleRow));

      const distinctIds = new Set();
      filteredRows.forEach((r) => {
        const idVal = idKey ? getRowVal(r, idKey) : getRowVal(r, "Mã Sinh Viên") ?? getRowVal(r, "MSSV") ?? getRowVal(r, "ID");
        if (idVal !== null && idVal !== undefined && idVal !== "") {
          distinctIds.add(String(idVal).trim());
        }
      });

      const totalCount = aggregation === "COUNT"
        ? filteredRows.length
        : (distinctIds.size > 0 ? distinctIds.size : filteredRows.length);
      const unit = inferMetricUnit(title || idKey, aggregation === "COUNT" ? "COUNT" : "DISTINCTCOUNT", isEdu);
      const metricLabel = title || (isEdu ? "Tổng sinh viên" : "Tổng số bản ghi");

      return {
        chartType: "kpi_card",
        kpi: {
          value: totalCount,
          formattedValue: String(totalCount),
          label: metricLabel,
          unit,
        },
        metricValue: totalCount,
        formattedValue: String(totalCount),
        kpiValue: String(totalCount),
        metricLabel,
        subLabel: `Quy mô tổng thể (${aggregation === "DISTINCTCOUNT" || distinctIds.size > 0 ? "DISTINCTCOUNT" : "COUNT"})`,
        unit,
        sampleSize: totalCount,
        nullCount: 0,
        summary: { min: totalCount, max: totalCount, avg: totalCount },
        semanticsNote,
        dataSource: options.sourceName || "Bộ dữ liệu",
      };
    }

    // B. KPI: TỶ LỆ ĐẠT / THÀNH CÔNG / TÍCH CỰC (PASS RATE / SUCCESS RATE)
    const isPassRateKpi =
      lowerTitle.includes("tỷ lệ đạt") ||
      lowerTitle.includes("pass rate") ||
      lowerTitle.includes("qua môn") ||
      lowerY.includes("tỷ lệ đạt") ||
      lowerY.includes("pass");

    if (isPassRateKpi) {
      let passedCount = 0;
      filteredRows.forEach((r) => {
        // 1. Nếu là miền bảng điểm giáo dục: Kiểm tra điểm số học phần >= 5.0
        if (domainInfo.isEducationalGrade) {
          const finalScore =
            (yAxis ? parseNumericValue(getRowVal(r, yAxis)) : null) ??
            parseNumericValue(getRowVal(r, "Điểm_Thi_Cuối_Kỳ")) ??
            parseNumericValue(getRowVal(r, "Điểm_Tổng_Kết")) ??
            parseNumericValue(getRowVal(r, "DiemCK")) ??
            parseNumericValue(getRowVal(r, "Điểm"));
          if (finalScore !== null) {
            if (finalScore >= 5.0) passedCount++;
            return;
          }

          // Kiểm tra xếp loại học lực
          const rank = String(getRowVal(r, "Xếp_Loại") || getRowVal(r, "XepLoai") || "").toLowerCase();
          if (rank && !rank.includes("yếu") && !rank.includes("kém") && !rank.includes("chưa")) {
            passedCount++;
            return;
          }
        }

        // 2. Kiểm tra cột kết quả / trạng thái (Pass / Fail / Đạt / Chưa đạt / Thành công)
        const statusVal = String(
          getRowVal(r, "Kết Quả") ??
          getRowVal(r, "KetQua") ??
          getRowVal(r, "Trạng Thái") ??
          getRowVal(r, "TrangThai") ??
          getRowVal(r, "Status") ??
          ""
        ).toLowerCase();
        if (statusVal) {
          if (statusVal.includes("đạt") || statusVal.includes("pass") || statusVal.includes("hoàn thành") || statusVal.includes("completed") || statusVal.includes("thành công")) {
            passedCount++;
            return;
          }
        }

        // 3. Kiểm tra giá trị định lượng chung nếu có yAxis
        const numericVal = parseNumericValue(getRowVal(r, yAxis));
        if (numericVal !== null) {
          if (domainInfo.isEducationalGrade && numericVal >= 5.0) passedCount++;
          else if (!domainInfo.isEducationalGrade && numericVal > 0) passedCount++;
        }
      });

      const passRate =
        filteredRows.length > 0
          ? Math.round((passedCount / filteredRows.length) * 1000) / 10
          : 0;

      const unit = "%";
      // DAX DIVIDE returns a ratio; the display remains a percentage. Direct
      // chart suggestions retain their documented 0..100 metric contract.
      const metricValue = /^\s*DIVIDE\s*\(/i.test(resolved.resolvedMeasureDax || '') && !/\*\s*100\b/.test(resolved.resolvedMeasureDax) ? passRate / 100 : passRate;
      const subjectLabel = isEdu ? "sinh viên" : "bản ghi";

      return {
        chartType: "kpi_card",
        kpi: {
          value: metricValue,
          formattedValue: `${passRate}%`,
          label: title || "Tỷ lệ đạt",
          unit,
        },
        metricValue,
        formattedValue: `${passRate}%`,
        kpiValue: `${passRate}%`,
        metricLabel: title || "Tỷ lệ đạt",
        subLabel: `${passedCount}/${filteredRows.length} ${subjectLabel} đạt yêu cầu`,
        unit,
        sampleSize: filteredRows.length,
        nullCount: 0,
        summary: { min: passRate, max: passRate, avg: passRate },
        semanticsNote,
        dataSource: options.sourceName || "Bộ dữ liệu",
      };
    }

    // C. KPI: NGUY CƠ / CẦN LƯU Ý (AT RISK < 5.0 HOẶC KHÔNG ĐẠT)
    const isAtRiskKpi =
      lowerTitle.includes("nguy cơ") ||
      lowerTitle.includes("cần lưu ý") ||
      lowerTitle.includes("at risk") ||
      lowerTitle.includes("dưới 5") ||
      lowerTitle.includes("chưa đạt");

    if (isAtRiskKpi) {
      let atRiskCount = 0;
      filteredRows.forEach((r) => {
        if (domainInfo.isEducationalGrade) {
          const finalScore =
            parseNumericValue(getRowVal(r, "Điểm_Thi_Cuối_Kỳ")) ??
            parseNumericValue(getRowVal(r, "Điểm_Tổng_Kết")) ??
            parseNumericValue(getRowVal(r, "DiemCK")) ??
            parseNumericValue(getRowVal(r, "Điểm"));
          if (finalScore !== null) {
            if (finalScore < 5.0) atRiskCount++;
            return;
          }

          const rank = String(getRowVal(r, "Xếp_Loại") || getRowVal(r, "XepLoai") || "").toLowerCase();
          if (rank && (rank.includes("yếu") || rank.includes("kém") || rank.includes("chưa"))) {
            atRiskCount++;
            return;
          }

          const numericVal = parseNumericValue(getRowVal(r, yAxis));
          if (numericVal !== null && numericVal < 5.0) {
            atRiskCount++;
            return;
          }
        } else {
          // Miền phi giáo dục: Kiểm tra trạng thái lỗi, trễ hạn, rủi ro hoặc lỗ tài chính (< 0)
          const statusVal = String(
            getRowVal(r, "TrangThai") ??
            getRowVal(r, "Trạng Thái") ??
            getRowVal(r, "KetQua") ??
            getRowVal(r, "Status") ??
            ""
          ).toLowerCase();
          if (statusVal && (statusVal.includes("lỗi") || statusVal.includes("trễ") || statusVal.includes("late") || statusVal.includes("chưa") || statusVal.includes("fail") || statusVal.includes("nguy cơ"))) {
            atRiskCount++;
            return;
          }

          const numericVal = parseNumericValue(getRowVal(r, yAxis));
          if (numericVal !== null && numericVal < 0) {
            atRiskCount++;
          }
        }
      });

      const unit = isEdu ? "sinh viên" : "bản ghi";
      return {
        chartType: "kpi_card",
        kpi: {
          value: atRiskCount,
          formattedValue: String(atRiskCount),
          label: title || "Đối tượng nguy cơ",
          unit,
        },
        metricValue: atRiskCount,
        formattedValue: String(atRiskCount),
        kpiValue: String(atRiskCount),
        metricLabel: title || "Đối tượng nguy cơ",
        subLabel: `Bản ghi có chỉ số dưới ngưỡng cảnh báo`,
        unit,
        sampleSize: filteredRows.length,
        nullCount: 0,
        summary: { min: atRiskCount, max: atRiskCount, avg: atRiskCount },
        semanticsNote,
        dataSource: options.sourceName || "Bộ dữ liệu",
      };
    }

    // D. KPI ĐỊNH LƯỢNG TRUNG BÌNH HOẶC TỔNG CỘNG (DOANH THU, CHI PHÍ, ĐIỂM SỐ, ĐÁNH GIÁ,...)
    const sampleRow = filteredRows[0] || {};
    const strip = (s) => String(s || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]/g, "");
    const targetCol = yAxis || xAxis;
    const colExists = targetCol ? Object.keys(sampleRow).some((k) => strip(k) === strip(targetCol)) : false;

    if (targetCol && !colExists) {
      return {
        chartType: "kpi_card",
        isError: true,
        errorMessage: `Trường "${targetCol}" không tồn tại trong dữ liệu.`,
        metricValue: null,
        formattedValue: "Lỗi liên kết",
        kpiValue: "Lỗi liên kết",
        metricLabel: title || targetCol,
        unit: "—",
        sampleSize: 0,
        nullCount: filteredRows.length,
        summary: { min: 0, max: 0, avg: 0 },
        semanticsNote: `Không thể tổng hợp vì trường "${targetCol}" không tồn tại.`,
        dataSource: options.sourceName || "Bộ dữ liệu",
      };
    }

    const validValues = [];
    let nullCount = 0;

    filteredRows.forEach((r) => {
      const rawVal = getRowVal(r, targetCol);
      const val = parseNumericValue(rawVal);
      if (val !== null) {
        validValues.push(val);
      } else {
        nullCount++;
      }
    });

    const unit = inferMetricUnit(title || targetCol, aggregation, isEdu);

    if (validValues.length === 0) {
      return {
        chartType: "kpi_card",
        isEmpty: true,
        emptyMessage: `Không có giá trị hợp lệ trong trường "${targetCol}".`,
        metricValue: null,
        formattedValue: "—",
        kpiValue: "—",
        metricLabel: title || targetCol,
        unit,
        sampleSize: filteredRows.length,
        nullCount,
        summary: { min: 0, max: 0, avg: 0 },
        semanticsNote: "Dữ liệu trống.",
        dataSource: options.sourceName || "Bộ dữ liệu",
      };
    }

    let metricValue = 0;
    if (aggregation === "SUM") {
      metricValue = Math.round(validValues.reduce((a, b) => a + b, 0) * 100) / 100;
    } else if (aggregation === "MIN") {
      metricValue = Math.min(...validValues);
    } else if (aggregation === "MAX") {
      metricValue = Math.max(...validValues);
    } else {
      // Mặc định AVG
      metricValue =
        Math.round((validValues.reduce((a, b) => a + b, 0) / validValues.length) * 100) / 100;
    }

    let formattedValue = String(metricValue);
    if (unit === "%") {
      formattedValue = `${metricValue}%`;
    } else if (unit === "VNĐ" || unit === "USD") {
      formattedValue = `${metricValue.toLocaleString("vi-VN")} ${unit}`;
    } else if (Number.isInteger(metricValue)) {
      formattedValue = metricValue.toLocaleString("vi-VN");
    }

    return {
      chartType: "kpi_card",
      kpi: {
        value: metricValue,
        formattedValue,
        label: title || targetCol,
        unit,
      },
      metricValue,
      formattedValue,
      kpiValue: formattedValue,
      metricLabel: title || targetCol,
      subLabel: `${targetCol} (${aggregation})`,
      unit,
      sampleSize: validValues.length,
      nullCount,
      summary: {
        min: validValues.length > 0 ? Math.min(...validValues) : 0,
        max: validValues.length > 0 ? Math.max(...validValues) : 0,
        avg: metricValue,
      },
      semanticsNote,
      dataSource: options.sourceName || "Bộ dữ liệu",
    };
  }

  // 2. BẢNG CHI TIẾT (TABLE / TABLEEX)
  if (chartType === "table" || chartType === "tableEx") {
    const availableCols = rows[0] ? Object.keys(rows[0]) : [];
    const requestedCols =
      Array.isArray(chartSuggestion.columns) && chartSuggestion.columns.length > 0
        ? chartSuggestion.columns
        : availableCols.slice(0, 8);

    const finalCols = requestedCols.length > 0 ? requestedCols : availableCols.slice(0, 8);

    const tableRows = filteredRows.map((r) => {
      const item = {};
      finalCols.forEach((col) => {
        item[col] = getRowVal(r, col) ?? "—";
      });
      return item;
    });

    const unit = isEdu ? "sinh viên" : "bản ghi";

    return {
      chartType: "tableEx",
      columns: finalCols,
      rows: tableRows,
      sampleSize: filteredRows.length,
      totalRows: filteredRows.length,
      unit,
      semanticsNote,
      dataSource: options.sourceName || "Bộ dữ liệu",
    };
  }

  // 3. LINE CHART (YÊU CẦU CỘT THỜI GIAN/TIẾN TRÌNH)
  if (chartType === "line") {
    const groups = new Map();
    let nullCount = 0;

    filteredRows.forEach((r) => {
      const xValRaw = getRowVal(r, xAxis);
      const xVal = xValRaw !== null && xValRaw !== undefined ? String(xValRaw).trim() : "";
      const yVal = parseNumericValue(getRowVal(r, yAxis));

      if (!xVal || yVal === null) {
        nullCount++;
        return;
      }

      if (!groups.has(xVal)) {
        groups.set(xVal, []);
      }
      groups.get(xVal).push(yVal);
    });

    const categories = Array.from(groups.keys());
    const seriesData = categories.map((cat) => {
      const vals = groups.get(cat);
      if (aggregation === "SUM") {
        return Math.round(vals.reduce((a, b) => a + b, 0) * 100) / 100;
      } else if (aggregation === "COUNT") {
        return vals.length;
      }
      return Math.round((vals.reduce((a, b) => a + b, 0) / vals.length) * 100) / 100;
    });

    const lineUnit = inferMetricUnit(yAxis, aggregation, isEdu);

    return {
      chartType: "line",
      categories,
      series: [{ name: yAxis, data: seriesData }],
      unit: lineUnit,
      sampleSize: filteredRows.length - nullCount,
      nullCount,
      semanticsNote,
      dataSource: options.sourceName || "Bộ dữ liệu",
      colorPalette: COLOR_PALETTE,
    };
  }

  // 4. BAR CHART & DONUT / PIE CHART
  // Phân nhóm theo xAxis (Category)
  const categoryMap = new Map();
  let nullCount = 0;

  filteredRows.forEach((r) => {
    let cat = getRowVal(r, xAxis);
    if (cat === null || cat === undefined || cat === "") {
      cat = "Chưa phân loại";
    } else {
      cat = String(cat).trim();
    }

    // Bỏ qua dòng tổng cộng nếu có trong bảng tổng hợp
    if (cat.toLowerCase().includes("toàn khóa học") || cat.toLowerCase().includes("tổng hợp")) {
      return;
    }

    // Không yêu cầu yVal nếu là biểu đồ phân bố danh mục (Donut, Pie, hoặc Count / Distribution)
    const isCategoryCount =
      chartType === "donut" ||
      chartType === "pie" ||
      aggregation === "COUNT" ||
      aggregation === "DISTINCTCOUNT" ||
      aggregation === "DISTRIBUTION" ||
      yAxis === "Số lượng" ||
      yAxis === "Count" ||
      !yAxis;

    let yVal = null;
    if (!isCategoryCount) {
      yVal = parseNumericValue(getRowVal(r, yAxis));
      if (yVal === null) {
        nullCount++;
        return;
      }
    }

    if (!categoryMap.has(cat)) {
      categoryMap.set(cat, []);
    }
    categoryMap.get(cat).push(yVal !== null ? yVal : 1);
  });

  // Sắp xếp Category: Nếu có chứa xếp loại sư phạm thì xếp theo trật tự sư phạm, nếu không thì sắp xếp theo bảng chữ cái
  const rawCatKeys = Array.from(categoryMap.keys());
  const hasAcademicRanks = rawCatKeys.some((c) => /xuất sắc|giỏi|khá|trung bình|yếu/i.test(c));

  let categories = rawCatKeys.sort((a, b) => {
    if (hasAcademicRanks) {
      const rankA = getCategoryOrderRank(a);
      const rankB = getCategoryOrderRank(b);
      if (rankA !== rankB) return rankA - rankB;
    }
    return a.localeCompare(b, "vi");
  });

  const counts = [];
  const seriesValues = [];

  categories.forEach((cat) => {
    const vals = categoryMap.get(cat) || [];

    if (aggregation === "COUNT" || aggregation === "DISTINCTCOUNT" || aggregation === "DISTRIBUTION") {
      counts.push(vals.length);
      seriesValues.push(vals.length);
    } else if (aggregation === "SUM") {
      const sum = vals.reduce((a, b) => a + b, 0);
      counts.push(vals.length);
      seriesValues.push(Math.round(sum * 100) / 100);
    } else {
      // AVG
      const avg = vals.length > 0 ? vals.reduce((a, b) => a + b, 0) / vals.length : 0;
      counts.push(vals.length);
      seriesValues.push(Math.round(avg * 100) / 100);
    }
  });

  const totalValidSample = counts.reduce((a, b) => a + b, 0);

  // Áp dụng thuật toán phân bổ phần dư Largest Remainder Method
  const distributedPcts = distributePercentages(counts, 1);

  // Tính tỷ lệ % chuẩn hóa (bổ sung đồng thời count và value để tương thích với mọi component UI)
  const percentages = categories.map((cat, idx) => {
    const cnt = counts[idx] || 0;
    const pct = distributedPcts[idx] ?? 0;
    return {
      label: cat,
      value: cnt,
      count: cnt,
      percentage: pct,
    };
  });

  const unit = inferMetricUnit(yAxis, aggregation, isEdu);

  return {
    chartType: chartType === "pie" ? "donut" : chartType,
    categories,
    series: [{ name: yAxis || "Giá trị", data: seriesValues }],
    values: seriesValues,
    data: seriesValues,
    counts,
    percentages,
    sampleSize: totalValidSample,
    nullCount,
    unit,
    summary: {
      avg:
        seriesValues.length > 0
          ? Math.round((seriesValues.reduce((a, b) => a + b, 0) / seriesValues.length) * 100) / 100
          : 0,
      min: seriesValues.length > 0 ? Math.min(...seriesValues) : 0,
      max: seriesValues.length > 0 ? Math.max(...seriesValues) : 0,
      totalCount: totalValidSample,
    },
    semanticsNote,
    dataSource: options.sourceName || "Bộ dữ liệu",
    colorPalette: COLOR_PALETTE.slice(0, Math.max(categories.length, 1)),
  };
}
