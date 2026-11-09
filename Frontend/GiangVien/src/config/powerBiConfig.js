// ==============================================================================
// CẤU HÌNH POWER BI SECURE EMBED & MICROSOFT ENTRA ID (AZURE AD)
// ==============================================================================
// Mô hình: User owns data (Xác thực bằng tài khoản Microsoft có quyền xem báo cáo)
// Ưu tiên đọc từ biến môi trường Vite (import.meta.env).
// Nếu chưa cấu hình .env, sử dụng thông tin báo cáo đã xuất bản của đồ án.
// ==============================================================================

const env = import.meta.env;

// Thông tin Power BI Service thực tế của đồ án LMS Analytics
const DEFAULT_CLIENT_ID = "a8b09661-e072-43e9-945e-41512d641ccb";
const DEFAULT_TENANT_ID = "8450369b-11fa-4413-8dc7-060ab9f34f41";
const DEFAULT_WORKSPACE_ID = "9a2c772e-ef06-43e4-a887-fe510d52b54c";
const DEFAULT_REPORT_ID = "38b8fe7d-0cd3-49a2-8f5b-50947ae9350a";
const DEFAULT_EMBED_URL =
  "https://app.powerbi.com/reportEmbed?reportId=38b8fe7d-0cd3-49a2-8f5b-50947ae9350a&groupId=9a2c772e-ef06-43e4-a887-fe510d52b54c";

export const powerBiEnv = {
  clientId: env.VITE_POWERBI_CLIENT_ID || DEFAULT_CLIENT_ID,
  tenantId: env.VITE_POWERBI_TENANT_ID || DEFAULT_TENANT_ID,
  workspaceId: env.VITE_POWERBI_WORKSPACE_ID || DEFAULT_WORKSPACE_ID,
  reportId: env.VITE_POWERBI_REPORT_ID || DEFAULT_REPORT_ID,
  embedUrl: env.VITE_POWERBI_EMBED_URL || DEFAULT_EMBED_URL,
  redirectUri: env.VITE_POWERBI_REDIRECT_URI || "",
  coursePageName: env.VITE_POWERBI_COURSE_PAGE_NAME || "",
};

// Scope truy cập Power BI REST API cho báo cáo (Read-Only dùng để xem và nhúng)
export const POWERBI_SCOPES = [
  "https://analysis.windows.net/powerbi/api/Report.Read.All",
];

// Scopes mở rộng cho Auto Publish & Quản trị Workspace (Task 05.9)
// Tận dụng các quyền Delegated User đã được cấp consent trong Microsoft Entra ID:
// - User.Read, Report.Read.All, Report.ReadWrite.All, Dataset.ReadWrite.All, SemanticModel.ReadWrite.All
export const POWERBI_PUBLISH_SCOPES = [
  "https://analysis.windows.net/powerbi/api/Report.ReadWrite.All",
  "https://analysis.windows.net/powerbi/api/Dataset.ReadWrite.All",
  "https://analysis.windows.net/powerbi/api/Workspace.Read.All",
  "https://analysis.windows.net/powerbi/api/Report.Read.All",
];

// Scopes cho Fabric REST API (khi workspace được gán Fabric Capacity F SKU)
export const FABRIC_SCOPES = [
  "https://api.fabric.microsoft.com/Item.ReadWrite.All",
  "https://api.fabric.microsoft.com/Workspace.Read.All",
];

// Định danh Bảng và Cột trong Semantic Model Power BI để lọc môn học
export const COURSE_FILTER_CONFIG = {
  table: "lms_datawarehouse dim_course",
  column: "Course_Key",
};

// Định danh Bảng và Cột để lọc khóa (Cohort)
export const COHORT_FILTER_CONFIG = {
  // Bảng thực tế trong Semantic Model có cột Cohort
  primaryTable: "StudentAssignmentStatus",
  primaryColumn: "Cohort",
  // Bảng dim_user nếu model được mở rộng calculated column
  userTable: "lms_datawarehouse dim_user",
  userColumn: "Cohort",
};

// Định danh Bảng và Cột để lọc sinh viên (Student)
export const STUDENT_FILTER_CONFIG = {
  table: "lms_datawarehouse dim_user",
  column: "User_Key",
  usernameColumn: "Username",
};

// Ánh xạ 7 trang Power BI chuẩn theo GUID và DisplayName từ file PBIX thực tế
export const POWER_BI_PAGES_CONFIG = {
  COURSE_OVERVIEW: {
    id: "2415a6ec0ed4a4706635",
    displayName: "01 - Course Overview NEW",
    label: "Tổng quan môn học",
    description: "Chỉ số tổng thể, mức độ tương tác và phân bố cảnh báo môn học",
  },
  ATTENDANCE: {
    id: "d61d112f149d60cac331",
    displayName: "Diem danh",
    label: "Điểm danh & Chuyên cần",
    description: "Tỷ lệ có mặt, đi trễ, vắng và lịch sử chuyên cần theo buổi học",
  },
  ASSIGNMENT: {
    id: "15f55ac2af8192e1074f",
    displayName: "01 - Bài tập",
    label: "Bài tập & Nộp bài",
    description: "Tỷ lệ hoàn thành, điểm trung bình bài tập và danh sách cần nộp",
  },
  QUIZ: {
    id: "3fbccf6af2b14e5257da",
    displayName: "02 - Quiz & Câu hỏi",
    label: "Quiz & Câu hỏi",
    description: "Tổng quan lượt làm Quiz, tỷ lệ đúng/sai và phân bố phổ điểm",
  },
  KNOWLEDGE_GAP: {
    id: "8794d62d45131ced2836",
    displayName: "03 - Knowledge Gap",
    label: "Lỗ hổng kiến thức",
    description: "Chủ đề kiến thức yếu, sơ đồ phân rã câu hỏi và heatmap sinh viên",
  },
  GRADE_SIMULATOR: {
    id: "698597e05a5f41367411",
    displayName: "08 - Grade Simulator",
    aliasDisplayNames: [
      "08 - Grade Simulator",
      "Grade Simulator",
      "Chi tiết chuyên cần",
      "Chi tiết chuyên cần & Điểm điều chỉnh",
      "Mô phỏng điểm số",
    ],
    label: "Chi tiết chuyên cần & Mô phỏng điểm số",
    description:
      "Thanh trượt What-If cho điểm chuyên cần dự kiến, giữa kỳ, cuối kỳ, tỷ lệ trọng số và bảng đầu điểm LMS",
  },
  STUDENT_360: {
    id: "d5de91d225dd166bb75a",
    displayName: "04 - Student 360",
    label: "Hồ sơ Student 360",
    description: "Báo cáo chi tiết 360 độ của từng cá nhân sinh viên",
  },
};

// Mapping danh mục môn học DW
export const DW_COURSE_MAPPING = {
  10: { code: "GAME401", name: "Phát triển ứng dụng Game nâng cao" },
  11: { code: "AI", name: "Trí tuệ nhân tạo" },
  12: { code: "WEB401", name: "Phát triển Web nâng cao" },
  13: { code: "TEST401", name: "Kiểm thử phần mềm" },
};

// Danh sách các Origin cục bộ được phép chạy callback để chống lệch cổng giữa 5173 và 5174
const ALLOWED_LOCAL_ORIGINS = [
  "http://localhost:5173",
  "http://localhost:5174",
  "http://127.0.0.1:5173",
  "http://127.0.0.1:5174",
];

/**
 * Trả về Redirect URI cho MSAL.
 * Khớp đúng origin khởi tạo của cửa sổ hiện tại (nếu thuộc allowlist) để đảm bảo
 * BroadcastChannel giữa Main Frame và Popup callback hoạt động trên cùng Origin.
 */
export function getMsalRedirectUri() {
  if (typeof window !== "undefined") {
    const origin = window.location.origin;
    if (ALLOWED_LOCAL_ORIGINS.includes(origin)) {
      return `${origin}/auth.html`;
    }
  }
  if (powerBiEnv.redirectUri) {
    return powerBiEnv.redirectUri;
  }
  return "http://localhost:5173/auth.html";
}

/**
 * Tạo URL Secure Embed chuẩn của Power BI Service dạng reportEmbed
 */
export function buildSecureEmbedUrl(reportId, workspaceId) {
  const targetReportId = reportId || powerBiEnv.reportId;
  const targetWorkspaceId = workspaceId || powerBiEnv.workspaceId;

  if (powerBiEnv.embedUrl && powerBiEnv.embedUrl.includes("reportEmbed")) {
    const url = new URL(powerBiEnv.embedUrl);
    if (targetReportId) url.searchParams.set('reportId', targetReportId);
    if (targetWorkspaceId) url.searchParams.set('groupId', targetWorkspaceId);
    return url.toString();
  }

  if (targetReportId) {
    let url = `https://app.powerbi.com/reportEmbed?reportId=${encodeURIComponent(targetReportId)}`;
    if (targetWorkspaceId) {
      url += `&groupId=${encodeURIComponent(targetWorkspaceId)}`;
    }
    return url;
  }

  return DEFAULT_EMBED_URL;
}

export function validateSecureEmbedTarget(reportId, embedUrl) {
  const url = new URL(embedUrl);
  if (url.protocol !== 'https:' || url.hostname !== 'app.powerbi.com' || url.pathname.toLowerCase() !== '/reportembed') {
    throw new Error('URL phải là Power BI reportEmbed có xác thực.');
  }
  if (url.searchParams.get('reportId')?.toLowerCase() !== String(reportId).toLowerCase()) {
    throw new Error('Report ID không khớp embedUrl.');
  }
  return url.toString();
}

/**
 * Kiểm tra xem cấu hình biến môi trường đã đầy đủ để thực hiện nhúng bảo mật chưa
 */
export function checkPowerBiConfig() {
  const missing = [];

  if (!powerBiEnv.clientId) {
    missing.push("VITE_POWERBI_CLIENT_ID");
  }
  if (!powerBiEnv.tenantId) {
    missing.push("VITE_POWERBI_TENANT_ID");
  }
  if (!powerBiEnv.reportId) {
    missing.push("VITE_POWERBI_REPORT_ID");
  }

  return {
    isConfigured: missing.length === 0,
    missingFields: missing,
    hasReportId: Boolean(powerBiEnv.reportId),
  };
}
