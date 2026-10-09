/**
 * CẤU HÌNH LIÊN KẾT BÁO CÁO POWER BI (MONHOC) & BỘ LỌC ODATA
 * Hệ thống Learning Management System (LMS) - Phân hệ Sinh viên
 */

// 1. Base URL nhúng báo cáo Power BI Service
export const BASE_POWERBI_URL =
  "https://app.powerbi.com/reportEmbed?reportId=11ad3d5c-7a02-47a6-b433-76aea6a6cb8a&autoAuth=true&ctid=8450369b-11fa-4413-8dc7-060ab9f34f41";

// 2. Tham số kiểm soát giao diện (ẩn thanh chuyển trang và thanh lọc mặc định của Power BI)
export const POWERBI_UI_FLAGS = "&navContentPaneEnabled=false&filterPaneEnabled=false";

// 3. Cấu hình mã định danh trang (pageName) - có thể ghi đè khi cần
export const POWERBI_PAGES = {
  // Trang 1: Dự báo điểm môn học (tab "Dự báo điểm", fallback an toàn là ReportSection)
  GRADE_PREDICTION: "ReportSection",
  // Trang 2: Kế hoạch học tập & Dự báo nỗ lực toàn kỳ (tab "Dự báo nỗ lực", fallback an toàn là ReportSection1)
  EFFORT_PREDICTION: "ReportSection1",
};

// 4. Ánh xạ trường dữ liệu theo mô hình Star Schema Data Warehouse
export const POWERBI_MODEL_MAPPING = {
  USER_COLUMN: "Dim_User/Username",
  COURSE_COLUMN: "dim_course/Course_Name",
  COURSE_COLUMN_ALT: "'lms_datawarehouse dim_course'/Course_Name",
};

/**
 * Thoát chuỗi ký tự theo chuẩn OData và URL Encode an toàn cho tiếng Việt
 * @param {string} str Chuỗi ký tự cần xử lý
 * @returns {string} Chuỗi an toàn
 */
function escapeODataString(str) {
  if (!str) return "";
  // Trong OData, ký tự nháy đơn được escape bằng 2 nháy đơn liên tiếp: ' -> ''
  const escaped = String(str).trim().replace(/'/g, "''");
  // Mã hóa URL để đảm bảo dấu tiếng Việt và khoảng trắng truyền qua query string an toàn
  return encodeURIComponent(escaped);
}

/**
 * Xây dựng URL nhúng Power BI cho Trang 1: Dự báo điểm theo môn học
 * Tự động gắn cờ ẩn giao diện thừa và bộ lọc 2 điều kiện (Username & Course_Name)
 *
 * @param {string} username - Mã/Username sinh viên (VD: "sv2310002")
 * @param {string} courseTitle - Tên môn học (VD: "Cơ sở dữ liệu")
 * @param {string} [pageName] - Mã định danh trang (mặc định Trang 1)
 * @returns {string} URL nhúng hoàn chỉnh, hoặc chuỗi rỗng nếu thiếu dữ liệu đầu vào
 */
export function buildGradePredictionUrl(
  username,
  courseTitle,
  pageName = POWERBI_PAGES.GRADE_PREDICTION
) {
  const user = (username || "").trim();
  const course = (courseTitle || "").trim();

  // Kiểm tra điều kiện đầu vào: Nếu thiếu username hoặc courseTitle, không sinh URL lỗi để tránh làm iframe tải rác
  if (!user || !course) {
    return "";
  }

  let url = `${BASE_POWERBI_URL}${POWERBI_UI_FLAGS}`;

  if (pageName) {
    url += `&pageName=${pageName}`;
  }

  const userFilter = escapeODataString(user);
  const courseFilter = escapeODataString(course);

  url += `&$filter=${POWERBI_MODEL_MAPPING.USER_COLUMN} eq '${userFilter}' and ${POWERBI_MODEL_MAPPING.COURSE_COLUMN} eq '${courseFilter}'`;

  return url;
}

/**
 * Xây dựng URL nhúng Power BI cho Trang 2: Kế hoạch học tập & Dự báo nỗ lực toàn kỳ
 * Tự động gắn cờ ẩn giao diện thừa và chỉ lọc theo sinh viên hiện tại (không lọc theo môn học)
 *
 * @param {string} username - Mã/Username sinh viên (VD: "sv2310002")
 * @param {string} [pageName] - Mã định danh trang (mặc định Trang 2)
 * @returns {string} URL nhúng hoàn chỉnh, hoặc chuỗi rỗng nếu thiếu username
 */
export function buildEffortPredictionUrl(
  username,
  pageName = POWERBI_PAGES.EFFORT_PREDICTION
) {
  const user = (username || "").trim();

  // Kiểm tra điều kiện đầu vào
  if (!user) {
    return "";
  }

  let url = `${BASE_POWERBI_URL}${POWERBI_UI_FLAGS}`;

  if (pageName) {
    url += `&pageName=${pageName}`;
  }

  const userFilter = escapeODataString(user);
  url += `&$filter=${POWERBI_MODEL_MAPPING.USER_COLUMN} eq '${userFilter}'`;

  return url;
}
