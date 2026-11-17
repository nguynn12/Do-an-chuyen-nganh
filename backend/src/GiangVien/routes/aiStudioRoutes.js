import express from "express";
import multer from "multer";
import { requireTeacherAuth } from "../../shared/middleware/authMiddleware.js";
import {
  handleGetStudioCourses,
  handleUploadFile,
  handleSelectLmsSource,
  handleStudioChat,
  handleUpdateChart,
  handleDownloadSampleTemplate,
  handleSaveDashboard,
  handleListDashboards,
  handleGetDashboardDetail,
  handleUpdateDashboard,
  handleDeleteDashboard,
  handleDuplicateDashboard,
  handleRefreshDashboard,
  handleGetPowerBiCapabilities,
  handleGetGeminiStatus,
  handleGeneratePowerBiProject,
  handlePlanPowerBiProject,
  handleEditPowerBiPlan,
  handleComputePowerBiPreview,
  handleApprovePowerBiPlan,
  handlePublishPowerBiReport,
  handleAuditPublishConditions,
  handleGetDeploymentOptions,
  handleGenerateBenchmarkTest,
  handleDownloadPowerBiProjectZip,
  handleVerifyUserWorkspaceAccess,
  handleDeployDelegatedPushDataset,
  handleDeployFabricPbipProject,
  handleUpdateFabricReportDefinition,
  handleGetFabricWorkspaceItems,
  handleUploadMultiSheetFile,
  handleSelectLmsMultiTableSource,
  handleDownloadMultiSheetSampleTemplate,
  handleDiagnoseCloudData,
  handleProcessExistingModel,
  handleVerifyExistingReport,
  handleGeneralStudioDeployment,
} from "../controllers/aiStudioController.js";

const router = express.Router();
router.post('/powerbi/diagnose-data', requireTeacherAuth, handleDiagnoseCloudData);
router.post('/powerbi/process-existing-model', requireTeacherAuth, handleProcessExistingModel);
router.post('/powerbi/verify-existing-report', requireTeacherAuth, handleVerifyExistingReport);
router.post('/powerbi/deploy-dataset', requireTeacherAuth, handleGeneralStudioDeployment);

// Cấu hình Multer lưu tạm trong bộ nhớ RAM, giới hạn 10MB
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB
    files: 1,
  },
});

// 1. Lấy danh sách các môn học mà giảng viên được phân quyền
router.get("/courses", requireTeacherAuth, handleGetStudioCourses);

// 2. Tải lên tệp Excel/CSV an toàn
router.post("/upload", requireTeacherAuth, upload.single("file"), handleUploadFile);

// 3. Chọn nguồn dữ liệu môn học LMS Data Warehouse
router.post("/lms-source", requireTeacherAuth, handleSelectLmsSource);

// 4. Trao đổi với AI Studio để phân tích nhu cầu và gợi ý biểu đồ
router.post("/chat", requireTeacherAuth, handleStudioChat);

// 5. Cập nhật biểu đồ (chuyển loại biểu đồ, áp bộ lọc, v.v.)
router.post("/update-chart", requireTeacherAuth, handleUpdateChart);

// 6. Tải file mẫu giả lập điểm số để thử nghiệm (bắt buộc xác thực Giảng viên)
router.get("/sample-template", requireTeacherAuth, handleDownloadSampleTemplate);
router.get("/sample-multisheet-template", requireTeacherAuth, handleDownloadMultiSheetSampleTemplate);

// 6b. Tải lên tệp Excel nhiều trang tính (Multi-sheet)
router.post("/upload-multisheet", requireTeacherAuth, upload.single("file"), handleUploadMultiSheetFile);

// 6c. Chọn nguồn dữ liệu LMS Data Warehouse dạng Đa bảng Star-Schema
router.post("/lms-multitable-source", requireTeacherAuth, handleSelectLmsMultiTableSource);

// -----------------------------------------------------------------------------
// TASK 03C.2: REST APIS QUẢN LÝ & LƯU DASHBOARD BỀN VỮNG
// -----------------------------------------------------------------------------

// 7. Tạo mới Dashboard
router.post("/dashboards", requireTeacherAuth, handleSaveDashboard);

// 8. Lấy danh sách Dashboard của Giảng viên (Thư viện Dashboard của tôi)
router.get("/dashboards", requireTeacherAuth, handleListDashboards);

// 9. Lấy chi tiết Dashboard và biểu đồ kèm số liệu sống
router.get("/dashboards/:id", requireTeacherAuth, handleGetDashboardDetail);

// 10. Cập nhật cấu hình Dashboard hiện có
router.put("/dashboards/:id", requireTeacherAuth, handleUpdateDashboard);

// 11. Xóa Dashboard
router.delete("/dashboards/:id", requireTeacherAuth, handleDeleteDashboard);

// 12. Nhân bản Dashboard
router.post("/dashboards/:id/duplicate", requireTeacherAuth, handleDuplicateDashboard);

// 13. Làm mới số liệu trực tiếp của Dashboard
router.post("/dashboards/:id/refresh", requireTeacherAuth, handleRefreshDashboard);

// -----------------------------------------------------------------------------
// TASK 04A: POWER BI REAL REPORT AUTHORING & PUBLISHING REST APIS
// -----------------------------------------------------------------------------

// 14. Kiểm tra khả năng môi trường và quyền Microsoft Entra
router.get("/powerbi/capabilities", requireTeacherAuth, handleGetPowerBiCapabilities);

// 14b. Kiểm tra trạng thái Gemini API & Groq AI Router
router.get("/gemini-status", requireTeacherAuth, handleGetGeminiStatus);
router.get("/ai-status", requireTeacherAuth, handleGetGeminiStatus);

// 15. Tạo Power BI Project thật (PBIP/PBIR/TMDL) từ nguồn dữ liệu
router.post("/powerbi/generate", requireTeacherAuth, handleGeneratePowerBiProject);

// 15b. Lập kế hoạch thiết kế Báo cáo Power BI (Report Plan IR)
router.post("/powerbi/plan", requireTeacherAuth, handlePlanPowerBiProject);

// 15c. Chỉnh sửa kế hoạch Báo cáo Power BI qua hội thoại tự nhiên (Multi-turn Plan Editing)
router.post("/powerbi/edit-plan", requireTeacherAuth, handleEditPowerBiPlan);

// 15d. Tính toán Dữ liệu Thực tế cho Bản xem trước (Live Preview Data Calculation)
router.post("/powerbi/compute-preview", requireTeacherAuth, handleComputePowerBiPreview);

// 15e. Phê duyệt Bản Thiết kế Báo cáo Power BI (Approval Gateway)
router.post("/powerbi/approve", requireTeacherAuth, handleApprovePowerBiPlan);

// 16. Phê duyệt và Xuất bản Báo cáo Power BI
router.post("/powerbi/publish", requireTeacherAuth, handlePublishPowerBiReport);

// 16b. Khảo sát 8 điều kiện tiên quyết Publish & Embed
router.get("/powerbi/publish-audit", requireTeacherAuth, handleAuditPublishConditions);

// 16c. Đánh giá các phương án xuất bản khả thi với tài khoản trường (User owns data — Task 05.8)
router.get("/powerbi/deployment-options", requireTeacherAuth, handleGetDeploymentOptions);

// 16d. Tạo Báo cáo Thử nghiệm An toàn (Benchmark Demo — 0% PII)
router.post("/powerbi/generate-benchmark-test", requireTeacherAuth, handleGenerateBenchmarkTest);

// 17. Tải trọn bộ dự án Power BI (.pbip + .SemanticModel + .Report) dưới dạng tệp ZIP
router.get("/powerbi/download/:projectName", requireTeacherAuth, handleDownloadPowerBiProjectZip);

// 18. Xác minh Token và Quyền Workspace Power BI ở chế độ Read-Only (Task 05.9)
router.post("/powerbi/verify-workspace-access", requireTeacherAuth, handleVerifyUserWorkspaceAccess);

// 19. Triển khai Push Dataset REST API với cơ chế Dry-Run an toàn (Task 05.9)
router.post("/powerbi/deploy-push-dataset", requireTeacherAuth, handleDeployDelegatedPushDataset);

// 20. Triển khai PBIP hoàn chỉnh (TMDL + PBIR đa trang) qua Microsoft Fabric Core Items API (Task 05.9 nâng cao)
router.post("/powerbi/deploy-fabric-pbip", requireTeacherAuth, handleDeployFabricPbipProject);

// 20b. Cập nhật định nghĩa PBIR của Report đã có trên Microsoft Fabric Workspace (An toàn, tái sử dụng tài nguyên)
router.post("/powerbi/update-fabric-report", requireTeacherAuth, handleUpdateFabricReportDefinition);

// 21. Lấy danh sách toàn bộ items trong Fabric Workspace (Read-Only)
router.get("/powerbi/workspace-items", requireTeacherAuth, handleGetFabricWorkspaceItems);

export default router;
