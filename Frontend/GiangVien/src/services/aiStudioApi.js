/**
 * Service API cho AI Dashboard Studio (Frontend Giảng Viên)
 */

import { getTeacherToken } from "./authService";

/**
 * Lấy Header xác thực chuẩn cho các API của AI Studio
 * Đồng bộ với authService và teacherApi (Single Source of Truth)
 */
export function getAuthHeaders(isMultipart = false) {
  const token =
    getTeacherToken() ||
    (typeof localStorage !== "undefined"
      ? localStorage.getItem("teacherToken") ||
        localStorage.getItem("token") ||
        localStorage.getItem("dlu_auth_token") ||
        ""
      : "");

  const headers = {};
  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }
  if (!isMultipart) {
    headers["Content-Type"] = "application/json";
  }
  return headers;
}

/**
 * Helper xử lý phản hồi API AI Studio và chuyển đổi thông báo lỗi chuẩn xác
 */
async function handleApiResponse(response, defaultErrorMsg) {
  let data;
  try {
    data = await response.json();
  } catch {
    data = null;
  }

  if (!response.ok) {
    if (response.status === 401) {
      throw new Error(
        data?.message || "Yêu cầu xác thực. Phiên đăng nhập đã hết hạn, vui lòng đăng nhập lại."
      );
    }
    if (response.status === 403) {
      throw new Error(
        data?.message || "Từ chối truy cập: Bạn không có quyền thao tác trên tài nguyên này."
      );
    }
    throw new Error(data?.message || `${defaultErrorMsg} (HTTP ${response.status})`);
  }

  return data;
}

/**
 * Lấy danh sách các môn học được phân quyền của giảng viên
 */
export async function getStudioCourses() {
  const response = await fetch("/api/ai/studio/courses", {
    headers: getAuthHeaders(),
  });
  return handleApiResponse(response, "Lỗi tải danh sách môn học");
}

/**
 * Tải lên tệp Excel/CSV để trích xuất schema và xem trước
 */
export async function uploadStudioFile(file) {
  const formData = new FormData();
  formData.append("file", file);

  const response = await fetch("/api/ai/studio/upload", {
    method: "POST",
    headers: getAuthHeaders(true),
    body: formData,
  });

  return handleApiResponse(response, "Lỗi tải tệp lên");
}

/**
 * Chọn nguồn dữ liệu môn học từ LMS Data Warehouse
 */
export async function selectStudioLmsSource(courseId) {
  const response = await fetch("/api/ai/studio/lms-source", {
    method: "POST",
    headers: getAuthHeaders(),
    body: JSON.stringify({ courseId }),
  });

  return handleApiResponse(response, "Lỗi chọn nguồn môn học LMS");
}

/**
 * Trao đổi với AI Studio để phân tích nhu cầu và gợi ý biểu đồ
 */
export async function chatStudioWithAi(sourceId, message, conversationHistory = []) {
  const response = await fetch("/api/ai/studio/chat", {
    method: "POST",
    headers: getAuthHeaders(),
    body: JSON.stringify({ sourceId, message, conversationHistory }),
  });

  return handleApiResponse(response, "Lỗi trao đổi cùng AI Studio");
}

/**
 * Cập nhật cấu hình hoặc chuyển đổi loại biểu đồ với dữ liệu thực từ backend
 */
export async function updateStudioChart(sourceId, chart, activeFilters = {}) {
  const response = await fetch("/api/ai/studio/update-chart", {
    method: "POST",
    headers: getAuthHeaders(),
    body: JSON.stringify({ sourceId, chart, activeFilters }),
  });

  return handleApiResponse(response, "Lỗi cập nhật biểu đồ");
}

/**
 * Tải tệp Excel mẫu giả lập có xác thực Bearer token an toàn trong Header
 * (Không đưa token vào URL hoặc query params)
 */
export async function downloadStudioSampleTemplate() {
  const headers = getAuthHeaders();
  delete headers["Content-Type"];

  const response = await fetch("/api/ai/studio/sample-template", {
    method: "GET",
    headers,
  });

  if (!response.ok) {
    let errorMsg = `Lỗi tải tệp mẫu (HTTP ${response.status})`;
    try {
      const data = await response.json();
      if (data?.message) errorMsg = data.message;
    } catch { /* Optional browser capability or cached state is unavailable; retain the fallback. */ }
    throw new Error(errorMsg);
  }

  const blob = await response.blob();
  const blobUrl = window.URL.createObjectURL(blob);
  const downloadLink = document.createElement("a");
  downloadLink.href = blobUrl;
  downloadLink.download = "Mau_Bang_Diem_LMS_DLU.xlsx";
  document.body.appendChild(downloadLink);
  downloadLink.click();
  document.body.removeChild(downloadLink);
  window.URL.revokeObjectURL(blobUrl);
}

/**
 * Tải tệp Excel nhiều trang tính (Multi-sheet Star-Schema) mẫu chuẩn ĐH Đà Lạt
 */
export async function downloadMultiSheetSampleTemplate() {
  const headers = getAuthHeaders();
  delete headers["Content-Type"];

  const response = await fetch("/api/ai/studio/sample-multisheet-template", {
    method: "GET",
    headers,
  });

  if (!response.ok) {
    let errorMsg = `Lỗi tải tệp mẫu đa trang tính (HTTP ${response.status})`;
    try {
      const data = await response.json();
      if (data?.message) errorMsg = data.message;
    } catch { /* Optional browser capability or cached state is unavailable; retain the fallback. */ }
    throw new Error(errorMsg);
  }

  const blob = await response.blob();
  const blobUrl = window.URL.createObjectURL(blob);
  const downloadLink = document.createElement("a");
  downloadLink.href = blobUrl;
  downloadLink.download = "LMS_StarSchema_Khoa_HocPhan_Mau.xlsx";
  document.body.appendChild(downloadLink);
  downloadLink.click();
  document.body.removeChild(downloadLink);
  window.URL.revokeObjectURL(blobUrl);
}

/**
 * Tải lên tệp Excel nhiều trang tính (Multi-sheet)
 */
export async function uploadMultiSheetStudioFile(file) {
  const formData = new FormData();
  formData.append("file", file);

  const response = await fetch("/api/ai/studio/upload-multisheet", {
    method: "POST",
    headers: getAuthHeaders(true),
    body: formData,
  });

  const data = await response.json();
  if (!response.ok || !data.success) {
    throw new Error(data.message || "Tải lên tệp đa trang tính thất bại.");
  }
  return data;
}

/**
 * Chọn nguồn dữ liệu LMS Data Warehouse dạng Đa bảng Star-Schema
 */
export async function selectLmsMultiTableSource(courseId) {
  const response = await fetch("/api/ai/studio/lms-multitable-source", {
    method: "POST",
    headers: getAuthHeaders(),
    body: JSON.stringify({ courseId }),
  });

  const data = await response.json();
  if (!response.ok || !data.success) {
    throw new Error(data.message || "Không thể kết nối nguồn LMS đa bảng.");
  }
  return data;
}

/**
 * URL tải tệp mẫu giả lập (dự phòng)
 */
export function getSampleTemplateDownloadUrl() {
  return "/api/ai/studio/sample-template";
}

/**
 * TASK 03C.2: Lưu dashboard mới hoặc cập nhật dashboard đã có
 */
export async function saveStudioDashboard(dashboardData) {
  const response = await fetch("/api/ai/studio/dashboards", {
    method: "POST",
    headers: getAuthHeaders(),
    body: JSON.stringify(dashboardData),
  });

  return handleApiResponse(response, "Không thể lưu dashboard");
}

/**
 * TASK 03C.2: Lấy danh sách dashboard của giảng viên đang đăng nhập
 */
export async function getMyStudioDashboards() {
  const response = await fetch("/api/ai/studio/dashboards", {
    method: "GET",
    headers: getAuthHeaders(),
  });

  return handleApiResponse(response, "Không thể tải danh sách dashboard");
}

/**
 * TASK 03C.2: Lấy chi tiết dashboard đã lưu cùng số liệu biểu đồ sống
 */
export async function getStudioDashboardDetail(id) {
  const response = await fetch(`/api/ai/studio/dashboards/${id}`, {
    method: "GET",
    headers: getAuthHeaders(),
  });

  return handleApiResponse(response, "Không thể tải chi tiết dashboard");
}

/**
 * TASK 03C.2: Cập nhật thông tin và cấu hình biểu đồ của dashboard
 */
export async function updateStudioDashboard(id, dashboardData) {
  const response = await fetch(`/api/ai/studio/dashboards/${id}`, {
    method: "PUT",
    headers: getAuthHeaders(),
    body: JSON.stringify(dashboardData),
  });

  return handleApiResponse(response, "Không thể cập nhật dashboard");
}

/**
 * TASK 03C.2: Xóa dashboard đã lưu
 */
export async function deleteStudioDashboard(id) {
  const response = await fetch(`/api/ai/studio/dashboards/${id}`, {
    method: "DELETE",
    headers: getAuthHeaders(),
  });

  return handleApiResponse(response, "Không thể xóa dashboard");
}

/**
 * TASK 03C.2: Nhân bản dashboard
 */
export async function duplicateStudioDashboard(id) {
  const response = await fetch(`/api/ai/studio/dashboards/${id}/duplicate`, {
    method: "POST",
    headers: getAuthHeaders(),
  });

  return handleApiResponse(response, "Không thể nhân bản dashboard");
}

/**
 * TASK 03C.2: Làm mới số liệu dữ liệu sống của dashboard
 */
export async function refreshStudioDashboard(id) {
  const response = await fetch(`/api/ai/studio/dashboards/${id}/refresh`, {
    method: "POST",
    headers: getAuthHeaders(),
  });

  return handleApiResponse(response, "Không thể làm mới số liệu dashboard");
}

// -----------------------------------------------------------------------------
// TASK 04A: POWER BI REAL REPORT AUTHORING & PUBLISHING API CLIENT
// -----------------------------------------------------------------------------

/**
 * TASK 04A: Lấy thông tin khả năng môi trường và quyền Microsoft Entra
 */
export async function getPowerBiCapabilities() {
  const response = await fetch(`/api/ai/studio/powerbi/capabilities`, {
    method: "GET",
    headers: getAuthHeaders(),
  });

  return handleApiResponse(response, "Không thể kiểm tra môi trường Power BI");
}

/**
 * TASK 05.1 & 05.2: Kiểm tra trạng thái Gemini API & Groq AI Router
 */
export async function getGeminiStatus() {
  const response = await fetch(`/api/ai/studio/gemini-status`, {
    method: "GET",
    headers: getAuthHeaders(),
  });

  return handleApiResponse(response, "Không thể kiểm tra trạng thái Gemini");
}

export const getAiStatus = getGeminiStatus;

/**
 * TASK 04A: Yêu cầu AI & Pipeline tạo Báo cáo Power BI Project thật (PBIP/PBIR/TMDL)
 */
export async function generatePowerBiProject(sourceId, userGoal = "", projectName = "", extraOptions = {}) {
  const response = await fetch(`/api/ai/studio/powerbi/generate`, {
    method: "POST",
    headers: getAuthHeaders(),
    body: JSON.stringify({ sourceId, userGoal, projectName, ...extraOptions }),
  });

  return handleApiResponse(response, "Không thể tạo dự án Power BI thật");
}

/**
 * TASK 04C: Lập kế hoạch Báo cáo Power BI (Report Plan IR) bằng AI
 */
export async function planPowerBiProject(sourceId, userGoal = "") {
  const response = await fetch(`/api/ai/studio/powerbi/plan`, {
    method: "POST",
    headers: getAuthHeaders(),
    body: JSON.stringify({ sourceId, userGoal }),
  });

  return handleApiResponse(response, "Không thể lập kế hoạch Power BI");
}

/**
 * TASK 04C: Chỉnh sửa kế hoạch Báo cáo Power BI qua hội thoại tự nhiên (Multi-turn Plan Editing)
 */
export async function editPowerBiPlan(sourceId, baseSpec, editPrompt) {
  const response = await fetch(`/api/ai/studio/powerbi/edit-plan`, {
    method: "POST",
    headers: getAuthHeaders(),
    body: JSON.stringify({ sourceId, baseSpec, editPrompt }),
  });

  return handleApiResponse(response, "Không thể chỉnh sửa kế hoạch Power BI");
}

/**
 * TASK 05.6: Tính toán lại dữ liệu thực tế cho bản xem trước khi lọc hoặc cập nhật visual
 */
export async function computeReportPlanPreview(sourceId, reportPlan, activeFilters = {}, dashboardDraft = null) {
  const response = await fetch(`/api/ai/studio/powerbi/compute-preview`, {
    method: "POST",
    headers: getAuthHeaders(),
    body: JSON.stringify({ sourceId, reportPlan, activeFilters, dashboardDraft }),
  });

  return handleApiResponse(response, "Không thể tính toán dữ liệu xem trước");
}

/**
 * TASK 05.6: Phê duyệt Bản thiết kế Báo cáo Power BI
 */
export async function approveReportPlan(sourceId, reportPlan) {
  const response = await fetch(`/api/ai/studio/powerbi/approve`, {
    method: "POST",
    headers: getAuthHeaders(),
    body: JSON.stringify({ sourceId, reportPlan }),
  });

  return handleApiResponse(response, "Không thể phê duyệt bản thiết kế Power BI");
}

/**
 * TASK 04A: Phê duyệt & Xuất bản Báo cáo Power BI lên Service / Cập nhật LMS
 */
export async function publishPowerBiReport(payload) {
  const response = await fetch(`/api/ai/studio/powerbi/publish`, {
    method: "POST",
    headers: getAuthHeaders(),
    body: JSON.stringify(payload),
  });

  return handleApiResponse(response, "Không thể thực hiện quy trình xuất bản Power BI");
}

/**
 * TASK 05.7: Khảo sát 8 điều kiện tiên quyết Publish & Embed Power BI Service
 */
export async function auditPublishConditions(workspaceId) {
  const query = workspaceId ? `?workspaceId=${encodeURIComponent(workspaceId)}` : "";
  const response = await fetch(`/api/ai/studio/powerbi/publish-audit${query}`, {
    method: "GET",
    headers: getAuthHeaders(),
  });

  return handleApiResponse(response, "Không thể khảo sát điều kiện xuất bản Power BI");
}

/**
 * TASK 05.8: Lấy danh sách các phương án xuất bản khả thi (User owns data)
 */
export async function getDeploymentOptions(workspaceId) {
  const query = workspaceId ? `?workspaceId=${encodeURIComponent(workspaceId)}` : "";
  const response = await fetch(`/api/ai/studio/powerbi/deployment-options${query}`, {
    method: "GET",
    headers: getAuthHeaders(),
  });

  return handleApiResponse(response, "Không thể tải phương án xuất bản Power BI");
}

/**
 * TASK 05.8: Tạo Báo cáo Thử nghiệm An toàn (Benchmark Demo — 0% PII)
 */
export async function generateBenchmarkTest(customName) {
  const response = await fetch(`/api/ai/studio/powerbi/generate-benchmark-test`, {
    method: "POST",
    headers: getAuthHeaders(),
    body: JSON.stringify({ customName }),
  });

  return handleApiResponse(response, "Không thể tạo báo cáo thử nghiệm benchmark");
}

/**
 * TASK 05: Tải trọn bộ dự án Power BI (.pbip + .SemanticModel + .Report) dưới dạng ZIP
 */
export async function downloadPowerBiProjectZip(projectName) {
  const safeName = (projectName || "PowerBI_Project").replace(/[^a-zA-Z0-9_-]/g, "_");
  const response = await fetch(`/api/ai/studio/powerbi/download/${encodeURIComponent(safeName)}`, {
    method: "GET",
    headers: getAuthHeaders(),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => null);
    throw new Error(errorData?.message || `Không thể tải tệp ZIP dự án (${response.status})`);
  }

  const blob = await response.blob();
  const blobUrl = window.URL.createObjectURL(blob);
  const downloadLink = document.createElement("a");
  downloadLink.href = blobUrl;
  downloadLink.download = `${safeName}_PowerBI_Project.zip`;
  document.body.appendChild(downloadLink);
  downloadLink.click();
  document.body.removeChild(downloadLink);
  window.URL.revokeObjectURL(blobUrl);
  return true;
}

/**
 * TASK 05.9: Xác minh Token và Quyền Workspace Fabric/Power BI ở chế độ Read-Only
 */
export async function verifyWorkspaceAccessApi(accessToken, workspaceId) {
  const headers = getAuthHeaders();
  if (accessToken) {
    headers["X-Microsoft-Token"] = accessToken;
  }

  const response = await fetch(`/api/ai/studio/powerbi/verify-workspace-access`, {
    method: "POST",
    headers,
    body: JSON.stringify({ workspaceId, userAccessToken: accessToken }),
  });

  return handleApiResponse(response, "Không thể xác minh quyền Fabric/Power BI");
}

/**
 * TASK 05.9: Triển khai PBIP (TMDL + PBIR đa trang) qua Microsoft Fabric Core Items API
 * Mặc định dryRun = true: Chỉ kiểm tra tính hợp lệ và đóng gói, tuyệt đối chưa ghi cloud.
 */
export async function deployFabricPbipApi(fabricAccessToken, workspaceId, projectName, options = {}) {
  const headers = getAuthHeaders();
  if (fabricAccessToken) {
    headers["X-Fabric-Token"] = fabricAccessToken;
  }

  const response = await fetch(`/api/ai/studio/powerbi/deploy-fabric-pbip`, {
    method: "POST",
    headers,
    body: JSON.stringify({
      fabricAccessToken,
      workspaceId,
      projectName,
      dryRun: options.dryRun !== false,
      teacherApproved: options.teacherApproved === true,
    }),
  });

  return handleApiResponse(response, "Không thể thực thi quy trình triển khai Fabric PBIP");
}

/**
 * TASK 09: Lấy danh sách toàn bộ items trong Fabric Workspace (Read-Only)
 */
export async function getFabricWorkspaceItemsApi(fabricAccessToken, workspaceId) {
  const headers = getAuthHeaders();
  if (fabricAccessToken) {
    headers["X-Fabric-Token"] = fabricAccessToken;
  }
  const params = new URLSearchParams();
  if (workspaceId) params.append("workspaceId", workspaceId);
  const response = await fetch(`/api/ai/studio/powerbi/workspace-items?${params.toString()}`, {
    method: "GET",
    headers,
  });
  return handleApiResponse(response, "Không thể lấy danh sách items từ Fabric Workspace");
}

/**
 * Cập nhật định nghĩa PBIR của một Report đã có trên Microsoft Fabric Workspace.
 * An toàn, không sinh trùng Semantic Model hay Report.
 */
export async function updateFabricReportApi(fabricAccessToken, workspaceId, reportId, semanticModelId, projectName, options = {}) {
  const headers = getAuthHeaders();
  if (fabricAccessToken) {
    headers["X-Fabric-Token"] = fabricAccessToken;
  }

  const response = await fetch(`/api/ai/studio/powerbi/update-fabric-report`, {
    method: "POST",
    headers,
    body: JSON.stringify({
      fabricAccessToken,
      workspaceId,
      reportId,
      semanticModelId,
      projectName,
      dryRun: options.dryRun !== false,
      teacherApproved: options.teacherApproved === true,
    }),
  });

  return handleApiResponse(response, "Không thể cập nhật định nghĩa Fabric Report");
}

export async function verifyExistingPowerBiReport(payload, powerBiToken) {
  const headers = getAuthHeaders();
  if (powerBiToken) headers['X-PowerBI-Token'] = powerBiToken;
  const response = await fetch('/api/ai/studio/powerbi/verify-existing-report', {
    method: 'POST', headers, body: JSON.stringify(payload),
  });
  const data = await response.json();
  if (!response.ok) {
    const error = new Error(data.message || 'Không thể xác minh report hiện có.');
    error.diagnostics = data.diagnostics;
    throw error;
  }
  return data;
}


// LMS JWT authenticates the owner; resource tokens have separate audiences.
export async function deployStudioDataset(payload, fabricToken, powerBiToken) {
  const headers=getAuthHeaders();
  if(fabricToken) headers['X-Fabric-Token']=fabricToken;
  if(powerBiToken) headers['X-PowerBI-Token']=powerBiToken;
  return handleApiResponse(await fetch('/api/ai/studio/powerbi/deploy-dataset',{method:'POST',headers,body:JSON.stringify(payload)}),'Không thể triển khai dataset.');
}
