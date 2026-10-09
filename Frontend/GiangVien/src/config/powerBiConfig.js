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

// Scope truy cập Power BI REST API cho báo cáo
export const POWERBI_SCOPES = [
  "https://analysis.windows.net/powerbi/api/Report.Read.All",
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
    label: "Mô phỏng điểm số",
    description: "Điều chỉnh trọng số What-If và dự báo điểm tổng kết",
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

/**
 * Trả về Redirect URI cho MSAL.
 * Ưu tiên:
 * 1. Biến môi trường VITE_POWERBI_REDIRECT_URI (nếu có)
 * 2. Trang callback riêng biệt /auth.html để chạy MSAL Redirect Bridge
 */
export function getMsalRedirectUri() {
  if (powerBiEnv.redirectUri) {
    return powerBiEnv.redirectUri;
  }
  if (typeof window !== "undefined") {
    return `${window.location.origin}/auth.html`;
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
    let url = powerBiEnv.embedUrl;
    if (!url.includes("reportId=") && targetReportId) {
      const sep = url.includes("?") ? "&" : "?";
      url = `${url}${sep}reportId=${targetReportId}`;
    }
    if (!url.includes("groupId=") && targetWorkspaceId) {
      const sep = url.includes("?") ? "&" : "?";
      url = `${url}${sep}groupId=${targetWorkspaceId}`;
    }
    return url;
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
