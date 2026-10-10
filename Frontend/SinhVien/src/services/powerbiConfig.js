/**
 * CẤU HÌNH LIÊN KẾT BÁO CÁO POWER BI (MONHOC) & BỘ LỌC URL FILTER
 * Hệ thống Learning Management System (LMS) - Phân hệ Sinh viên
 */

// 1. Base URL nhúng báo cáo Power BI Service
export const BASE_POWERBI_URL =
  "https://app.powerbi.com/reportEmbed?reportId=11ad3d5c-7a02-47a6-b433-76aea6a6cb8a&autoAuth=true&ctid=8450369b-11fa-4413-8dc7-060ab9f34f41";

/**
 * 2. Tham số kiểm soát giao diện:
 * - filterPaneEnabled=false: Ẩn thanh lọc bên phải (giữ giao diện sạch sẽ, không lộ lỗi filter)
 * - navContentPaneEnabled=false: Ẩn thanh điều hướng chuyển trang ở đáy iframe
 */
export const POWERBI_UI_FLAGS = "&filterPaneEnabled=false&navContentPaneEnabled=false";

/**
 * 3. Cấu hình mã định danh trang (pageName / Section ID thật từ Power BI Service)
 */
export const POWERBI_PAGES = {
  // Trang 1: Dự đoán điểm cuối kỳ theo từng môn học
  GRADE_PREDICTION: "fd3a98cce47b2e1b21cd",
  // Trang 2: Kế hoạch học tập & Dự đoán nỗ lực toàn kỳ
  EFFORT_PREDICTION: "9dda3d715cd8c7ed59c4",
};

/**
 * 4. Ánh xạ trường dữ liệu theo mô hình Power BI Semantic Model
 * LƯU Ý: Tên bảng và tên cột phân biệt CHỮ HOA / CHỮ THƯỜNG (Case-Sensitive).
 * Cần kiểm tra chính xác trong Data pane của Power BI để cấu hình đúng.
 */
export const POWERBI_MODEL_MAPPING = {
  // Bảng & Cột chứa mã đăng nhập của Sinh viên (khớp 100% với tên bảng lms_datawarehouse dim_user trong Data pane của Power BI)
  USER_COLUMN: "lms_datawarehouse_x0020_dim_user/Username",
  // Bảng & Cột chứa tên môn học (khớp 100% với tên bảng lms_datawarehouse dim_course trong Data pane của Power BI)
  COURSE_COLUMN: "lms_datawarehouse_x0020_dim_course/Course_Name",

  // Các biến thể dự phòng nếu người dùng đổi tên bảng trong Power BI Desktop:
  USER_COLUMN_SHORT: "Dim_User/Username",
  COURSE_COLUMN_SHORT: "Dim_Course/Course_Name",
};

/**
 * Danh sách Preset kiểm thử ánh xạ Tên Bảng / Cột
 * Hỗ trợ chẩn đoán và chuyển đổi nhanh khi kiểm tra lọc Power BI
 */
export const TABLE_PRESETS = [
  {
    id: "pascal",
    name: "Mặc định (PascalCase): Dim_User & Dim_Course",
    userCol: "Dim_User/Username",
    courseCol: "Dim_Course/Course_Name",
    desc: "Tên bảng viết hoa chữ cái đầu: Dim_User/Username và Dim_Course/Course_Name",
  },
  {
    id: "lower",
    name: "Thường (snake/lower): dim_user & dim_course",
    userCol: "dim_user/Username",
    courseCol: "dim_course/Course_Name",
    desc: "Tên bảng viết thường: dim_user/Username và dim_course/Course_Name",
  },
  {
    id: "all_lower",
    name: "Toàn bộ thường: dim_user/username & dim_course/course_name",
    userCol: "dim_user/username",
    courseCol: "dim_course/course_name",
    desc: "Tên bảng và cột đều viết thường không dấu",
  },
  {
    id: "dw_prefix",
    name: "Prefix kho dữ liệu: lms_datawarehouse_x0020_dim_course",
    userCol: "dim_user/Username",
    courseCol: "lms_datawarehouse_x0020_dim_course/Course_Name",
    desc: "Bảng môn học giữ nguyên schema prefix có khoảng trắng (_x0020_)",
  },
  {
    id: "user_only",
    name: "Chỉ lọc Sinh viên (Bỏ qua lọc môn học)",
    userCol: "Dim_User/Username",
    courseCol: null,
    desc: "Cách ly kiểm tra: chỉ lọc theo sinh viên Dim_User/Username",
  },
];

/**
 * Tiền tố tham số bộ lọc trên URL:
 * Mặc định chuẩn Power BI URL Embed là "&$filter="
 */
export const FILTER_PREFIX = "&$filter=";

/**
 * Xử lý thoát ký tự OData và mã hóa URL cho giá trị chuỗi (hỗ trợ tiếng Việt có dấu và khoảng trắng)
 * @param {string} str Chuỗi giá trị cần xử lý
 * @returns {string} Chuỗi an toàn đã mã hóa
 */
export function escapeFilterValue(str) {
  if (!str) return "";
  // Trong OData, ký tự nháy đơn được escape bằng 2 nháy đơn: ' -> ''
  const escaped = String(str).trim().replace(/'/g, "''");
  // Mã hóa URL để bảo toàn tiếng Việt có dấu, khoảng trắng (%20), ký tự đặc biệt
  return encodeURIComponent(escaped);
}

/**
 * Tạo URL mở Power BI ở chế độ Debug (bật thanh Filter Pane và Page Navigation)
 * Giúp người phát triển mở trực tiếp trên tab mới để thấy Power BI báo lỗi gì.
 * @param {string} url - URL nhúng thông thường
 * @returns {string} URL chế độ debug
 */
export function makeDebugUrl(url) {
  if (!url) return "";
  return url
    .replace("filterPaneEnabled=false", "filterPaneEnabled=true")
    .replace("navContentPaneEnabled=false", "navContentPaneEnabled=true");
}

/**
 * Xây dựng URL nhúng Power BI cho Trang 1: Dự đoán điểm môn học
 * - Trỏ chính xác đến pageName: fd3a98cce47b2e1b21cd
 * - Hỗ trợ cả pageName dạng string hoặc options object { pageName, userCol, courseCol, showFilterPane, showNavPane }
 *
 * @param {string} username - Mã/Username sinh viên (VD: "sv2310002")
 * @param {string} courseName - Tên môn học (VD: "Cơ sở dữ liệu")
 * @param {string|object} [optionsOrPage] - Mã trang hoặc đối tượng cấu hình mở rộng
 * @returns {string} URL nhúng hoàn chỉnh
 */
export function buildGradePredictionUrl(
  username,
  courseName,
  optionsOrPage = POWERBI_PAGES.GRADE_PREDICTION
) {
  let pageName = POWERBI_PAGES.GRADE_PREDICTION;
  let userCol = POWERBI_MODEL_MAPPING.USER_COLUMN;
  let courseCol = POWERBI_MODEL_MAPPING.COURSE_COLUMN;
  let showFilterPane = false;
  let showNavPane = false;

  if (typeof optionsOrPage === "string") {
    pageName = optionsOrPage;
  } else if (typeof optionsOrPage === "object" && optionsOrPage !== null) {
    if (optionsOrPage.pageName) pageName = optionsOrPage.pageName;
    if (optionsOrPage.userCol) userCol = optionsOrPage.userCol;
    if (optionsOrPage.courseCol !== undefined) courseCol = optionsOrPage.courseCol;
    if (optionsOrPage.showFilterPane) showFilterPane = true;
    if (optionsOrPage.showNavPane) showNavPane = true;
  }

  const user = (username || "").trim();
  const course = (courseName || "").trim();

  // Kiểm tra điều kiện đầu vào
  if (!user) {
    return "";
  }

  const uiFlags = `&filterPaneEnabled=${showFilterPane}&navContentPaneEnabled=${showNavPane}`;
  const encodedUser = escapeFilterValue(user);

  let filterPart = "";
  if (course && courseCol) {
    const encodedCourse = escapeFilterValue(course);
    filterPart = `${FILTER_PREFIX}${userCol} eq '${encodedUser}' and ${courseCol} eq '${encodedCourse}'`;
  } else {
    filterPart = `${FILTER_PREFIX}${userCol} eq '${encodedUser}'`;
  }

  return `${BASE_POWERBI_URL}&pageName=${pageName}${uiFlags}${filterPart}`;
}

/**
 * Xây dựng URL nhúng Power BI cho Trang 2: Dự đoán nỗ lực toàn kỳ
 * - Trỏ chính xác đến pageName: 9dda3d715cd8c7ed59c4
 * - Chỉ lọc theo sinh viên hiện tại Dim_User/Username (không lọc môn học)
 *
 * @param {string} username - Mã/Username sinh viên (VD: "sv2310002")
 * @param {string|object} [optionsOrPage] - Mã trang hoặc đối tượng cấu hình mở rộng
 * @returns {string} URL nhúng hoàn chỉnh
 */
export function buildEffortPredictionUrl(
  username,
  optionsOrPage = POWERBI_PAGES.EFFORT_PREDICTION
) {
  let pageName = POWERBI_PAGES.EFFORT_PREDICTION;
  let userCol = POWERBI_MODEL_MAPPING.USER_COLUMN;
  let showFilterPane = false;
  let showNavPane = false;

  if (typeof optionsOrPage === "string") {
    pageName = optionsOrPage;
  } else if (typeof optionsOrPage === "object" && optionsOrPage !== null) {
    if (optionsOrPage.pageName) pageName = optionsOrPage.pageName;
    if (optionsOrPage.userCol) userCol = optionsOrPage.userCol;
    if (optionsOrPage.showFilterPane) showFilterPane = true;
    if (optionsOrPage.showNavPane) showNavPane = true;
  }

  const user = (username || "").trim();

  if (!user) {
    return "";
  }

  const uiFlags = `&filterPaneEnabled=${showFilterPane}&navContentPaneEnabled=${showNavPane}`;
  const encodedUser = escapeFilterValue(user);

  return `${BASE_POWERBI_URL}&pageName=${pageName}${uiFlags}${FILTER_PREFIX}${userCol} eq '${encodedUser}'`;
}
