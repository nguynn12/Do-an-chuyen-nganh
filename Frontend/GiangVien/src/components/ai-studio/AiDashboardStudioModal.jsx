import React, { useState, useEffect, useRef } from "react";
import {
  Sparkles,
  X,
  Upload,
  FileSpreadsheet,
  Database,
  CheckCircle2,
  AlertCircle,
  ShieldCheck,
  Send,
  BarChart3,
  PieChart,
  LineChart,
  ScatterChart,
  Layers,
  ArrowRight,
  ArrowLeft,
  RotateCcw,
  Download,
  Info,
  Lock,
  Save,
  Trash2,
  Copy,
  RefreshCw,
  Eye,
  Edit3,
  FolderHeart,
  Plus,
  Zap,
  CheckSquare,
  FileCode,
  ExternalLink,
} from "lucide-react";
import {
  getStudioCourses,
  uploadStudioFile,
  selectStudioLmsSource,
  chatStudioWithAi,
  updateStudioChart,
  downloadStudioSampleTemplate,
  saveStudioDashboard,
  getMyStudioDashboards,
  getStudioDashboardDetail,
  deleteStudioDashboard,
  duplicateStudioDashboard,
  refreshStudioDashboard,
  getGeminiStatus,
  generatePowerBiProject,
  planPowerBiProject,
  editPowerBiPlan,
  downloadPowerBiProjectZip,
  deployStudioDataset,
  computeReportPlanPreview,
  approveReportPlan,
  verifyWorkspaceAccessApi,
  deployFabricPbipApi,
  updateFabricReportApi,
  verifyExistingPowerBiReport,
} from "../../services/aiStudioApi";
import { getFabricTokenInteractive, getPowerBiTokenSilent, loginMicrosoftPopup, getPowerBiPublishTokenSilent, loginMicrosoftPublishConsentPopup } from "../../services/powerBiAuthService";
import VisualDashboardPreview from "./VisualDashboardPreview";
import SecurePowerBIReport from "../powerbi/SecurePowerBIReport";
import "../../styles/AiDashboardStudio.css";

const STEPS = [
  { id: 1, label: "Chọn dữ liệu" },
  { id: 2, label: "Kiểm tra dữ liệu" },
  { id: 3, label: "Yêu cầu phân tích" },
  { id: 4, label: "Báo cáo" },
];

const PALETTE = [
  "#4f46e5", // Indigo
  "#06b6d4", // Cyan
  "#10b981", // Emerald
  "#f59e0b", // Amber
  "#ef4444", // Red
  "#8b5cf6", // Purple
  "#ec4899", // Pink
  "#3b82f6", // Blue
];

export default function AiDashboardStudioModal({ isOpen, onClose }) {
  const [currentStep, setCurrentStep] = useState(1);
  const [sourceType, setSourceType] = useState("file"); // "file" | "lms"
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Nguồn dữ liệu & Schema
  const [sourceDescriptor, setSourceDescriptor] = useState(null);
  const [datasetProfile, setDatasetProfile] = useState(null);

  // LMS Courses
  const [lmsCourses, setLmsCourses] = useState([]);
  const [selectedCourseId, setSelectedCourseId] = useState("");
  const [loadingCourses, setLoadingCourses] = useState(false);
  const [downloadingTemplate, setDownloadingTemplate] = useState(false);

  // Chat AI
  const [chatMessages, setChatMessages] = useState([]);
  const [inputMessage, setInputMessage] = useState("");
  const [step4Input, setStep4Input] = useState("");
  const [isAiReplying, setIsAiReplying] = useState(false);
  const [_geminiMode, setGeminiMode] = useState("gemini_api");
  const [_modelUsed, setModelUsed] = useState("");

  // Dashboard Draft & Charts
  const [dashboardDraft, setDashboardDraft] = useState(null);
  const [selectedChartIds, setSelectedChartIds] = useState(new Set());
  const [updatingChartId, setUpdatingChartId] = useState(null);
  const chatBottomRef = useRef(null);

  // TASK 03C.2: State cho Quản lý & Lưu Dashboard
  const [activeView, setActiveView] = useState("studio"); // "studio" | "my_dashboards"
  const [savedDashboards, setSavedDashboards] = useState([]);
  const [loadingDashboards, setLoadingDashboards] = useState(false);
  const [dashboardsError, setDashboardsError] = useState(null);

  const [currentDashboardId, setCurrentDashboardId] = useState(null);
  const [currentDashboardTitle, setCurrentDashboardTitle] = useState("");
  const [currentDashboardDesc, setCurrentDashboardDesc] = useState("");

  const [saveModalOpen, setSaveModalOpen] = useState(false);
  const [saveForm, setSaveForm] = useState({ title: "", description: "", saveMode: "create" });
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccessMsg, setSaveSuccessMsg] = useState(null);

  const [deleteConfirmDashboard, setDeleteConfirmDashboard] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [actionInProgressId, setActionInProgressId] = useState(null);

  // TASK 04A: State cho Power BI Real Engine & Phê duyệt
  const [isGeneratingPbi, setIsGeneratingPbi] = useState(false);
  const [pbiProjectResult, setPbiProjectResult] = useState(null);
  const [pbiError, setPbiError] = useState(null);
  const [pbiApprovalModalOpen, setPbiApprovalModalOpen] = useState(false);
  const [teacherApprovalChecked, setTeacherApprovalChecked] = useState(false);
  const [isPublishingPbi, setIsPublishingPbi] = useState(false);
  const [pbiPublishResult, setPbiPublishResult] = useState(null);
  const [isVerifyingFabric, setIsVerifyingFabric] = useState(false);
  const [fabricVerificationResult, setFabricVerificationResult] = useState(null);
  const [cachedFabricToken, setCachedFabricToken] = useState(null);
  const [liveDashboard, setLiveDashboard] = useState(null);
  const [deploymentOpen,setDeploymentOpen]=useState(false);
  const [deploymentWorkspace,setDeploymentWorkspace]=useState('');
  const [deploymentIntent,setDeploymentIntent]=useState(null);
  const [cloudConsent,setCloudConsent]=useState(false);

  async function handleLinkExistingDemo() {
    setIsVerifyingFabric(true);
    setError(null);
    try {
      let token = await getPowerBiTokenSilent();
      if (!token) token = (await loginMicrosoftPopup())?.accessToken;
      const result = await verifyExistingPowerBiReport({
        projectName: 'PBI_Benchmark_Demo_Task08',
        workspaceId: '9a2c772e-ef06-43e4-a887-fe510d52b54c',
        semanticModelId: '62419274-8d63-432a-a9e0-9313d340be22',
        reportId: 'a4125dcf-093d-4234-bf9f-359732ca2beb',
      }, token);
      setLiveDashboard(result.metadata);
      setCurrentDashboardTitle('PBI_Benchmark_Demo_Task08');
      setCurrentDashboardId(result.dashboardId);
      setDashboardDraft({ recommendedCharts: [] });
      setReportPlan(null);
      setWorkflowStatus('REPORT_ACCESS_VERIFIED');
      setActiveView('studio');
      setCurrentStep(4);
      loadSavedDashboards();
    } catch (err) {
      setError(err.message);
    } finally { setIsVerifyingFabric(false); }
  }

  // TASK 04C & 05: State cho Power BI Report Plan IR & Interactive Studio
  const [reportPlan, setReportPlan] = useState(null);
  const [_isPlanning, setIsPlanning] = useState(false);
  const [planEditInput, setPlanEditInput] = useState("");
  const [isEditingPlan, setIsEditingPlan] = useState(false);
  const [isDownloadingZip, setIsDownloadingZip] = useState(false);

  // TASK 05.6: State Quy trình 9 bước Visual Designer -> Approval -> Generate -> Publish -> Embed
  const [workflowStatus, setWorkflowStatus] = useState("DESIGN_DRAFT");
  const [activeFilters, setActiveFilters] = useState({});
  const [isApproving, setIsApproving] = useState(false);

  // Đồng bộ workflowStatus khi reportPlan cập nhật
  useEffect(() => {
    if (reportPlan?.workflowStatus) {
      setWorkflowStatus(reportPlan.workflowStatus);
    }
  }, [reportPlan]);

  // TASK 05.1: State Quota & Cooldown của Gemini
  const [geminiStatusInfo, setGeminiStatusInfo] = useState(null);

  // Tải danh sách môn học, danh sách dashboard và trạng thái Gemini khi mở modal
  useEffect(() => {
    if (isOpen) {
      loadCourses();
      loadSavedDashboards();
      loadGeminiStatus();
    }
  }, [isOpen]);

  async function loadGeminiStatus() {
    try {
      const res = await getGeminiStatus();
      if (res && res.success) {
        setGeminiStatusInfo(res.data || res);
      }
    } catch (e) {
      console.warn("[AiDashboardStudio] Không thể lấy trạng thái Gemini:", e.message);
    }
  }

  // Cuộn xuống tin nhắn mới nhất trong chat
  useEffect(() => {
    if (chatBottomRef.current) {
      chatBottomRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [chatMessages, isAiReplying]);

  async function loadCourses() {
    setLoadingCourses(true);
    setError(null);
    try {
      const res = await getStudioCourses();
      if (res.success && Array.isArray(res.courses)) {
        setLmsCourses(res.courses);
        if (res.courses.length > 0) {
          setSelectedCourseId(res.courses[0].Course_Key || res.courses[0].Moodle_Course_ID);
        }
      }
    } catch (err) {
      console.warn("[AiDashboardStudio] Không thể tải danh sách môn học:", err.message);
      setError(err.message || "Không thể tải danh sách môn học được phân quyền.");
    } finally {
      setLoadingCourses(false);
    }
  }

  // Tải danh sách Dashboard đã lưu của giảng viên
  async function loadSavedDashboards() {
    setLoadingDashboards(true);
    setDashboardsError(null);
    try {
      const res = await getMyStudioDashboards();
      if (res.success && Array.isArray(res.dashboards)) {
        setSavedDashboards(res.dashboards);
      }
    } catch (err) {
      console.warn("[AiDashboardStudio] Lỗi tải danh sách dashboard:", err.message);
      setDashboardsError(err.message || "Không thể tải danh sách dashboard của bạn.");
    } finally {
      setLoadingDashboards(false);
    }
  }

  // Mở modal lưu dashboard
  function handleOpenSaveModal() {
    if (datasetProfile?.contractVersion!==1 && (!dashboardDraft || !dashboardDraft.recommendedCharts || selectedChartIds.size === 0)) {
      setError("Vui lòng chọn ít nhất 1 biểu đồ để lưu vào Dashboard.");
      return;
    }
    setError(null);
    setSaveForm({
      title: currentDashboardTitle || reportPlan?.reportTitle || dashboardDraft?.draftTitle || "Dashboard phân tích",
      description: currentDashboardDesc || dashboardDraft?.draftDescription || "",
      saveMode: currentDashboardId ? "update" : "create",
    });
    setSaveModalOpen(true);
  }

  // Thực hiện lưu Dashboard vĩnh viễn (gọi backend)
  async function handleConfirmSaveDashboard(e) {
    if (e) e.preventDefault();
    if (!saveForm.title.trim()) {
      setError("Tên dashboard không được để trống.");
      return;
    }

    const selectedCharts = datasetProfile?.contractVersion===1 ? (reportPlan?.visuals || []).filter(v=>!['slicer','textbox'].includes(v.visualType)).map(v=>({...v,chartId:v.id,chartType:v.visualType,xAxis:v.categoryField || null,yAxis:v.measureField || null})) : (dashboardDraft?.recommendedCharts || []).filter(c=>selectedChartIds.has(c.chartId));

    if (selectedCharts.length === 0) {
      setError("Bạn chưa chọn biểu đồ nào. Vui lòng chọn ít nhất 1 biểu đồ.");
      return;
    }

    setIsSaving(true);
    setError(null);
    try {
      const payload = {
        dashboardId: saveForm.saveMode === "update" ? currentDashboardId : null,
        title: saveForm.title.trim(),
        description: saveForm.description.trim(),
        sourceType: sourceDescriptor?.sourceType || "file",
        sourceId: sourceDescriptor?.sourceId,
        courseKey: sourceDescriptor?.courseKey,
        selectedCharts,
        ...(datasetProfile?.contractVersion===1 ? {metadata:{datasetId:datasetProfile.datasetId,sourceId:sourceDescriptor?.sourceId,reportPlan,
          ...(pbiProjectResult ? {projectName:pbiProjectResult.projectName,pbipFilePath:pbiProjectResult.pbipFilePath,downloadZipUrl:pbiProjectResult.downloadZipUrl}:{}),
          ...(liveDashboard || {})}} : {}),
      };

      const res = await saveStudioDashboard(payload);
      if (res.success && res.dashboard) {
        setCurrentDashboardId(res.dashboard.dashboardId);
        setCurrentDashboardTitle(res.dashboard.title);
        setCurrentDashboardDesc(res.dashboard.description || "");
        setSaveSuccessMsg(`Đã lưu dashboard "${res.dashboard.title}" (${selectedCharts.length} biểu đồ) thành công.`);
        setSaveModalOpen(false);
        await loadSavedDashboards();
        setTimeout(() => setSaveSuccessMsg(null), 6000);
      }
    } catch (err) {
      setError(err.message || "Lỗi khi lưu Dashboard.");
    } finally {
      setIsSaving(false);
    }
  }

  // Mở dashboard đã lưu lên Step 4
  async function handleOpenSavedDashboard(item) {
    setActionInProgressId(item.dashboardId);
    setError(null);
    try {
      const res = await getStudioDashboardDetail(item.dashboardId);
      if (res.success && res.dashboard) {
        const d = res.dashboard;
        setSourceDescriptor({ sourceId: d.sourceId, sourceType: d.sourceType });
        setDatasetProfile(d.datasetProfile);
        setCurrentDashboardId(d.dashboardId);
        setCurrentDashboardTitle(d.title);
        setCurrentDashboardDesc(d.description || "");
        setDashboardDraft({
          draftTitle: d.title,
          draftDescription: d.description,
          recommendedCharts: d.charts || [],
        });
        setSelectedChartIds(new Set((d.charts || []).map((c) => c.chartId)));

        let meta = null;
        try {
          meta = d.metadata || (typeof d.Metadata_Json === "string" ? JSON.parse(d.Metadata_Json) : d.Metadata_Json);
        } catch (_e) { /* Optional browser capability or cached state is unavailable; retain the fallback. */ }
        setReportPlan(meta?.reportPlan || null);
        setLiveDashboard(meta?.isPowerBiLive && meta?.powerBiReportId ? meta : null);
        setPbiProjectResult(null);
        if (meta?.projectName) {
          setPbiProjectResult({
            projectName: meta.projectName,
            pbipFilePath: meta.pbipFilePath,
            reportTitle: meta.reportPlan?.reportTitle || d.title,
            downloadZipUrl: meta.downloadZipUrl || `/api/ai/studio/powerbi/download/${meta.projectName}`,
            measures: meta.reportPlan?.measures || [],
            visuals: meta.reportPlan?.visuals || [],
            totalFilesCount: 19,
          });
        }

        setActiveView("studio");
        setCurrentStep(4);
      }
    } catch (err) {
      setError(err.message || "Không thể tải chi tiết dashboard đã lưu.");
    } finally {
      setActionInProgressId(null);
    }
  }

  // Chỉnh sửa dashboard đã lưu qua Chat AI (chuyển sang Step 3)
  async function handleEditSavedDashboardInChat(item) {
    setActionInProgressId(item.dashboardId);
    setError(null);
    try {
      const res = await getStudioDashboardDetail(item.dashboardId);
      if (res.success && res.dashboard) {
        const d = res.dashboard;
        setSourceDescriptor({sourceId:d.sourceId,sourceType:d.sourceType});
        setDatasetProfile(d.datasetProfile);
        setCurrentDashboardId(d.dashboardId);
        setCurrentDashboardTitle(d.title);
        setCurrentDashboardDesc(d.description || "");
        setDashboardDraft({
          draftTitle: d.title,
          draftDescription: d.description,
          recommendedCharts: res.charts || [],
        });
        setSelectedChartIds(new Set((res.charts || []).map((c) => c.chartId)));

        let meta = null;
        try {
          meta = d.metadata || (typeof d.Metadata_Json === "string" ? JSON.parse(d.Metadata_Json) : d.Metadata_Json);
        } catch (_e) { /* Optional browser capability or cached state is unavailable; retain the fallback. */ }
        if (meta?.reportPlan) {
          setReportPlan(meta.reportPlan);
        }

        setActiveView("studio");
        setCurrentStep(3);
      }
    } catch (err) {
      setError(err.message || "Không thể tải chi tiết dashboard để chỉnh sửa.");
    } finally {
      setActionInProgressId(null);
    }
  }

  // Nhân bản dashboard
  async function handleDuplicateDashboard(item) {
    setActionInProgressId(item.dashboardId);
    setError(null);
    try {
      const res = await duplicateStudioDashboard(item.dashboardId);
      if (res.success) {
        await loadSavedDashboards();
        setSaveSuccessMsg(`Đã nhân bản thành công dashboard "${res.dashboard?.title || item.title}".`);
        setTimeout(() => setSaveSuccessMsg(null), 5000);
      }
    } catch (err) {
      setError(err.message || "Không thể nhân bản dashboard.");
    } finally {
      setActionInProgressId(null);
    }
  }

  // Làm mới số liệu dashboard sống
  async function handleRefreshDashboard(item) {
    setActionInProgressId(item.dashboardId);
    setError(null);
    try {
      const res = await refreshStudioDashboard(item.dashboardId);
      if (res.success) {
        await loadSavedDashboards();
        if (currentDashboardId === item.dashboardId && res.charts) {
          setDashboardDraft((prev) => ({
            ...prev,
            recommendedCharts: res.charts,
          }));
        }
        setSaveSuccessMsg(`Đã làm mới dữ liệu cho dashboard "${item.title}".`);
        setTimeout(() => setSaveSuccessMsg(null), 4000);
      }
    } catch (err) {
      setError(err.message || "Không thể làm mới dữ liệu dashboard.");
    } finally {
      setActionInProgressId(null);
    }
  }

  // Xóa dashboard
  async function handleConfirmDelete() {
    if (!deleteConfirmDashboard) return;
    setIsDeleting(true);
    setError(null);
    try {
      const res = await deleteStudioDashboard(deleteConfirmDashboard.dashboardId);
      if (res.success) {
        if (currentDashboardId === deleteConfirmDashboard.dashboardId) {
          setCurrentDashboardId(null);
          setCurrentDashboardTitle("");
          setCurrentDashboardDesc("");
        }
        setDeleteConfirmDashboard(null);
        await loadSavedDashboards();
        setSaveSuccessMsg("Đã xóa dashboard thành công.");
        setTimeout(() => setSaveSuccessMsg(null), 4000);
      }
    } catch (err) {
      setError(err.message || "Lỗi khi xóa dashboard.");
    } finally {
      setIsDeleting(false);
    }
  }

  // Tải tệp mẫu giả lập với xác thực Bearer token an toàn
  async function handleDownloadTemplate() {
    setError(null);
    setDownloadingTemplate(true);
    try {
      await downloadStudioSampleTemplate();
    } catch (err) {
      setError(err.message || "Không thể tải tệp mẫu giả lập.");
    } finally {
      setDownloadingTemplate(false);
    }
  }

  // 1. Xử lý Tải File Excel / CSV
  async function handleFileUpload(e) {
    const file = e.target.files?.[0];
    if (!file) return;

    setError(null);
    setLoading(true);
    // Xóa sạch trạng thái cũ để tránh nhiễm dữ liệu cũ (State & Cache Integrity)
    setReportPlan(null);
    setLiveDashboard(null);
    setDashboardDraft(null);
    setActiveFilters({});
    setPbiProjectResult(null);
    setPbiPublishResult(null);
    setWorkflowStatus("IDLE");
    try {
      const res = await uploadStudioFile(file);
      setSourceDescriptor(res.descriptor);
      setDatasetProfile(res.profile);
      initChatSession(res.profile);
      setCurrentStep(2);
    } catch (err) {
      setError(err.message || "Lỗi khi xử lý tệp tin.");
    } finally {
      setLoading(false);
      e.target.value = "";
    }
  }

  // 2. Xử lý Chọn Nguồn LMS Course
  async function handleSelectLms() {
    if (!selectedCourseId) return;
    setError(null);
    setLoading(true);
    // Xóa sạch trạng thái cũ để tránh nhiễm dữ liệu cũ (State & Cache Integrity)
    setReportPlan(null);
    setLiveDashboard(null);
    setDashboardDraft(null);
    setActiveFilters({});
    setPbiProjectResult(null);
    setPbiPublishResult(null);
    setWorkflowStatus("IDLE");
    try {
      const res = await selectStudioLmsSource(selectedCourseId);
      setSourceDescriptor(res.descriptor);
      setDatasetProfile(res.profile);
      initChatSession(res.profile);
      setCurrentStep(2);
    } catch (err) {
      setError(err.message || "Lỗi khi nạp nguồn LMS.");
    } finally {
      setLoading(false);
    }
  }

  // Khởi tạo phiên chat với thông điệp chào mừng
  function initChatSession(profile) {
    const welcome = {
      role: "assistant",
      text: `Xin chào Thầy/Cô! Em đã nạp cấu trúc bộ dữ liệu "${profile.name}" thành công (${profile.totalRows} dòng, ${profile.totalColumns} cột). Thầy/Cô hãy đưa ra bất kỳ yêu cầu thống kê, phân tích hoặc tổng hợp dữ liệu nào bằng ngôn ngữ tự nhiên. AI sẽ phân tích và lập Kế hoạch Báo cáo Power BI hoàn chỉnh (bao gồm Semantic Model, DAX Measures, PBIR Visuals) phù hợp nhất!`,
    };
    setChatMessages([welcome]);
  }

  // 3. Gửi tin nhắn Chat cho AI & Lập Kế hoạch Power BI (Report Plan IR)
  async function handleSendMessage(customText) {
    const textToSend = customText || inputMessage;
    if (!textToSend.trim() || (!datasetProfile && !sourceDescriptor)) return;

    const sourceId = sourceDescriptor?.sourceId || datasetProfile?.sourceId;
    const userMsg = { role: "user", text: textToSend.trim() };
    const updatedHistory = [...chatMessages, userMsg];
    setChatMessages(updatedHistory);
    setInputMessage("");
    setIsAiReplying(true);
    setIsPlanning(true);
    setError(null);

    try {
      // 1. Gọi AI Studio Chat để lấy khuyến nghị và bản nháp
      const chatPromise = datasetProfile?.contractVersion===1 ? Promise.resolve(null) : chatStudioWithAi(sourceId, textToSend.trim(), updatedHistory).catch((e) => {
        console.warn("[AiStudio] chatStudioWithAi fallback:", e.message);
        return null;
      });

      // 2. Đồng thời gọi Lập kế hoạch Báo cáo Power BI (Report Plan IR)
      const planPromise = planPowerBiProject(sourceId, textToSend.trim()).catch((e) => {
        throw e;
      });

      const [res, planRes] = await Promise.all([chatPromise, planPromise]);

      // Kiểm tra mục tiêu vượt quá khả năng quy tắc Heuristic khi Gemini hết quota
      if (res && res.unsupportedGoal) {
        setChatMessages((prev) => [
          ...prev,
          {
            role: "assistant",
            text: res.replyMessage || "⚠️ Yêu cầu phân tích này vượt quá khả năng của thuật toán quy tắc khi Gemini API đang tạm khóa quota.",
          },
        ]);
        return;
      }

      if (planRes && planRes.success && (planRes.plan || planRes.spec)) {
        const plan = planRes.plan || planRes.spec;
        setReportPlan(plan);
        if(datasetProfile?.contractVersion===1) {setDashboardDraft({recommendedCharts:[]});setWorkflowStatus('DESIGN_DRAFT');}
        if (plan.plannerStatus) {
          const mode = plan.plannerStatus.mode;
          setGeminiMode(mode === "GROQ_SUCCESS" ? "groq_api" : mode === "GEMINI_SUCCESS" ? "gemini_api" : "heuristic");
          setModelUsed(plan.plannerStatus.model || "openai/gpt-oss-120b");
        }
      }

      if (res) {
        if (res.mode) setGeminiMode(res.mode);
        if (res.modelUsed) setModelUsed(res.modelUsed);

        const aiMsg = {
          role: "assistant",
          text: res.replyMessage,
        };
        setChatMessages((prev) => [...prev, aiMsg]);

        // Cập nhật bản nháp Dashboard
        if (res.recommendedCharts && res.recommendedCharts.length > 0) {
          setDashboardDraft(res);
          const allIds = new Set(res.recommendedCharts.map((c) => c.chartId));
          setSelectedChartIds(allIds);
        }
      } else if (planRes && (planRes.plan || planRes.spec)) {
        const plan = planRes.plan || planRes.spec;
        const aiMsg = {
          role: "assistant",
          text: `✨ AI đã lập Kế hoạch Báo cáo Power BI: "${plan.reportTitle}" (${plan.visuals?.length || 0} biểu đồ, ${plan.measures?.length || 0} chỉ số DAX). Thầy/Cô có thể chuyển sang Bước 4 để xem, chỉnh sửa hoặc tạo Power BI Project!`,
        };
        setChatMessages((prev) => [...prev, aiMsg]);
      }
    } catch (err) {
      const errorMsg = {
        role: "assistant",
        text: `Đã xảy ra sự cố khi kết nối AI Studio: ${err.message}. Thầy/Cô vui lòng thử lại hoặc chọn một mục tiêu phân tích khác.`,
      };
      setChatMessages((prev) => [...prev, errorMsg]);
    } finally {
      setIsAiReplying(false);
      setIsPlanning(false);
      loadGeminiStatus();
    }
  }

  // Toggle chọn biểu đồ trong draft
  function toggleChartSelection(chartId) {
    setSelectedChartIds((prev) => {
      const next = new Set(prev);
      if (next.has(chartId)) {
        next.delete(chartId);
      } else {
        next.add(chartId);
      }
      return next;
    });
  }

  // Chọn tất cả biểu đồ
  function selectAllCharts() {
    if (!dashboardDraft?.recommendedCharts) return;
    const allIds = new Set(dashboardDraft.recommendedCharts.map((c) => c.chartId));
    setSelectedChartIds(allIds);
  }

  // Bỏ chọn tất cả biểu đồ
  function deselectAllCharts() {
    setSelectedChartIds(new Set());
  }

  // Đổi loại biểu đồ (Bar <-> Donut <-> Line <-> KPI <-> Table) với dữ liệu thực từ backend
  async function handleSwitchChartType(chart, targetType) {
    if (chart.chartType === targetType) return;
    const sourceId = datasetProfile?.sourceId || sourceDescriptor?.sourceId;
    if (!sourceId) return;

    setUpdatingChartId(chart.chartId);
    setError(null);
    try {
      const updatedSpec = {
        ...chart,
        chartType: targetType,
      };
      const res = await updateStudioChart(sourceId, updatedSpec, activeFilters);
      if (res.success && res.chart) {
        setDashboardDraft((prev) => {
          if (!prev) return prev;
          const nextCharts = prev.recommendedCharts.map((c) =>
            c.chartId === chart.chartId ? res.chart : c
          );
          return { ...prev, recommendedCharts: nextCharts };
        });
      }
    } catch (err) {
      console.error("[AiStudio] Lỗi khi đổi loại biểu đồ:", err);
      setError(`Không thể chuyển đổi loại biểu đồ: ${err.message}`);
    } finally {
      setUpdatingChartId(null);
    }
  }

  // Chỉnh sửa kế hoạch Power BI qua hội thoại tự nhiên (Multi-turn Plan Refinement)
  async function handleConversationalEditPlan(customQuery) {
    const query = customQuery || planEditInput;
    const sourceId = sourceDescriptor?.sourceId || datasetProfile?.sourceId;
    if (!query || !query.trim() || !reportPlan || !sourceId) return;

    setIsEditingPlan(true);
    setError(null);
    const promptText = query.trim();
    setPlanEditInput("");

    setChatMessages((prev) => [
      ...prev,
      { role: "user", text: `[Yêu cầu chỉnh sửa Power BI]: ${promptText}` }
    ]);

    try {
      const res = await editPowerBiPlan(sourceId, reportPlan, promptText);
      if (res.success && (res.plan || res.spec)) {
        const updatedPlan = res.plan || res.spec;
        setReportPlan(updatedPlan);
        setChatMessages((prev) => [
          ...prev,
          {
            role: "assistant",
            text: `✅ Đã cập nhật Kế hoạch Báo cáo Power BI: "${updatedPlan.reportTitle}". Cấu trúc đã được điều chỉnh theo yêu cầu: "${promptText}". Thầy/Cô có thể xem kế hoạch mới hoặc tạo Power BI Project!`,
          }
        ]);
      } else {
        throw new Error(res.message || "Không thể cập nhật kế hoạch");
      }
    } catch (err) {
      console.error("[AiStudio] Lỗi chỉnh sửa kế hoạch:", err);
      const msg = err.message || "Lỗi chỉnh sửa kế hoạch.";
      setChatMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          text: `⚠️ ${msg}`,
        }
      ]);
      setError(`Lỗi chỉnh sửa kế hoạch: ${msg}`);
    } finally {
      setIsEditingPlan(false);
      loadGeminiStatus();
    }
  }

  // Xử lý chat tinh chỉnh bản nháp ngay tại Bước 4
  async function handleRefineInStep4(e) {
    if (e) e.preventDefault();
    if (!step4Input.trim()) return;
    const query = step4Input.trim();
    setStep4Input("");
    if (reportPlan) {
      await handleConversationalEditPlan(query);
    } else {
      await handleSendMessage(query);
    }
  }

  // ==========================================================================
  // TASK 05.6: XỬ LÝ VISUAL DESIGNER PREVIEW, CHỈNH SỬA & PHÊ DUYỆT
  // ==========================================================================

  // Bộ lọc tương tác (Slicers) trên Dashboard Preview
  async function handlePreviewFilterChange(filterObj) {
    const sourceId = sourceDescriptor?.sourceId || datasetProfile?.sourceId;
    setActiveFilters(filterObj);
    if (!sourceId || !reportPlan) return;
    try {
      const res = await computeReportPlanPreview(sourceId, reportPlan, filterObj, dashboardDraft);
      if (res.success) {
        if (res.reportPlan) {
          setReportPlan(res.reportPlan);
        }
        if (res.dashboardDraft) {
          setDashboardDraft(res.dashboardDraft);
        }
      }
    } catch (err) {
      setPbiError(err.message);
    }
  }

  // Cập nhật cấu hình biểu đồ trực quan (trục X, trục Y, loại biểu đồ, tiêu đề...)
  async function handlePreviewUpdateVisual(visualId, patch) {
    const sourceId = sourceDescriptor?.sourceId || datasetProfile?.sourceId;
    if (!reportPlan) return;

    const matchesId = (v) => v.id === visualId || v.name === visualId || v.title === visualId;

    const updatedVisuals = (reportPlan.visuals || []).map((v) =>
      matchesId(v) ? { ...v, ...patch } : v
    );

    const updatedPages = (reportPlan.pages || []).map((p) => ({
      ...p,
      visuals: (p.visuals || []).map((v) => (matchesId(v) ? { ...v, ...patch } : v)),
    }));

    const updatedPlan = {
      ...reportPlan,
      visuals: updatedVisuals,
      pages: updatedPages.length > 0 ? updatedPages : reportPlan.pages,
      workflowStatus: "DESIGN_DRAFT",
    };

    setReportPlan(updatedPlan);
    setWorkflowStatus("DESIGN_DRAFT");
    setPbiProjectResult(null);setLiveDashboard(null);setDeploymentIntent(null);

    if (sourceId) {
      try {
        const res = await computeReportPlanPreview(sourceId, updatedPlan, activeFilters);
        if (res.success && res.reportPlan) {
          setReportPlan(res.reportPlan);
        }
      } catch (e) {
        setPbiError(e.message);
      }
    }
  }

  // Xóa biểu đồ khỏi Report Plan
  async function handlePreviewDeleteVisual(visualId) {
    const sourceId = sourceDescriptor?.sourceId || datasetProfile?.sourceId;
    if (!reportPlan) return;

    const matchesId = (v) => v.id === visualId || v.name === visualId || v.title === visualId;

    const updatedVisuals = (reportPlan.visuals || []).filter((v) => !matchesId(v));
    const updatedPages = (reportPlan.pages || []).map((p) => ({
      ...p,
      visuals: (p.visuals || []).filter((v) => !matchesId(v)),
    }));

    const updatedPlan = {
      ...reportPlan,
      visuals: updatedVisuals,
      pages: updatedPages,
      workflowStatus: "DESIGN_DRAFT",
    };

    setReportPlan(updatedPlan);
    setWorkflowStatus("DESIGN_DRAFT");
    setPbiProjectResult(null);setLiveDashboard(null);setDeploymentIntent(null);

    if (sourceId) {
      try {
        const res = await computeReportPlanPreview(sourceId, updatedPlan, activeFilters);
        if (res.success && res.reportPlan) {
          setReportPlan(res.reportPlan);
        }
      } catch (e) {
        console.warn("[AiDashboardStudio] Lỗi tính lại preview sau khi xóa visual:", e);
      }
    }
  }

  // Thêm biểu đồ mới
  async function handlePreviewAddVisual(newVisual, pageId) {
    const sourceId = sourceDescriptor?.sourceId || datasetProfile?.sourceId;
    if (!reportPlan) return;

    const visualItem = {
      id: `visual_${Date.now()}`,
      ...newVisual,
      position: { x: 0, y: 0, width: 600, height: 350 },
    };

    const updatedVisuals = [...(reportPlan.visuals || []), visualItem];
    const pages = reportPlan.pages && reportPlan.pages.length > 0
      ? reportPlan.pages.map((p, idx) => (pageId ? p.id===pageId : idx===0) ? { ...p, visuals: [...(p.visuals || []), visualItem] } : p)
      : [{ id: "page_1", displayName: "Trang Tổng quan", visuals: updatedVisuals }];

    const updatedPlan = {
      ...reportPlan,
      visuals: updatedVisuals,
      pages,
      workflowStatus: "DESIGN_DRAFT",
    };

    setReportPlan(updatedPlan);
    setWorkflowStatus("DESIGN_DRAFT");
    setPbiProjectResult(null);setLiveDashboard(null);setDeploymentIntent(null);

    if (sourceId) {
      try {
        const res = await computeReportPlanPreview(sourceId, updatedPlan, activeFilters);
        if (res.success && res.reportPlan) {
          setReportPlan(res.reportPlan);
        }
      } catch (e) {
        console.warn("[AiDashboardStudio] Lỗi tính lại preview sau khi thêm visual:", e);
      }
    }
  }

  // Thêm KPI Card
  async function handlePreviewAddKpi(newKpi, pageId) {
    const sourceId = sourceDescriptor?.sourceId || datasetProfile?.sourceId;
    if (!reportPlan) return;

    const kpiItem = {
      id: `kpi_${Date.now()}`,
      title: newKpi.title,
      visualType: "cardVisual",
      measureField: newKpi.measureField,
      position: { width: 280, height: 160 },
    };

    const updatedVisuals = [...(reportPlan.visuals || []), kpiItem];
    const pages = reportPlan.pages && reportPlan.pages.length > 0
      ? reportPlan.pages.map((p, idx) => (pageId ? p.id===pageId : idx===0) ? { ...p, visuals: [...(p.visuals || []), kpiItem] } : p)
      : [{ id: "page_1", displayName: "Trang Tổng quan", visuals: updatedVisuals }];

    const updatedPlan = {
      ...reportPlan,
      visuals: updatedVisuals,
      pages,
      workflowStatus: "DESIGN_DRAFT",
    };

    setReportPlan(updatedPlan);
    setWorkflowStatus("DESIGN_DRAFT");
    setPbiProjectResult(null);setLiveDashboard(null);setDeploymentIntent(null);

    if (sourceId) {
      try {
        const res = await computeReportPlanPreview(sourceId, updatedPlan, activeFilters);
        if (res.success && res.reportPlan) {
          setReportPlan(res.reportPlan);
        }
      } catch (e) {
        console.warn("[AiDashboardStudio] Lỗi tính lại preview sau khi thêm KPI:", e);
      }
    }
  }

  // Thêm bộ lọc Slicer
  async function handlePreviewAddSlicer(newSlicer, pageId) {
    const sourceId = sourceDescriptor?.sourceId || datasetProfile?.sourceId;
    if (!reportPlan) return;

    const slicerItem = {
      id: `slicer_${Date.now()}`,
      title: newSlicer.title || `Bộ lọc: ${newSlicer.categoryField}`,
      visualType: "slicer",
      categoryField: newSlicer.categoryField,
      position: { width: 260, height: 200 },
    };

    const updatedVisuals = [...(reportPlan.visuals || []), slicerItem];
    const pages = reportPlan.pages && reportPlan.pages.length > 0
      ? reportPlan.pages.map((p, idx) => (pageId ? p.id===pageId : idx===0) ? { ...p, visuals: [...(p.visuals || []), slicerItem] } : p)
      : [{ id: "page_1", displayName: "Trang Tổng quan", visuals: updatedVisuals }];

    const updatedPlan = {
      ...reportPlan,
      visuals: updatedVisuals,
      pages,
      workflowStatus: "DESIGN_DRAFT",
    };

    setReportPlan(updatedPlan);
    setWorkflowStatus("DESIGN_DRAFT");
    setPbiProjectResult(null);setLiveDashboard(null);setDeploymentIntent(null);

    if (sourceId) {
      try {
        const res = await computeReportPlanPreview(sourceId, updatedPlan, activeFilters);
        if (res.success && res.reportPlan) {
          setReportPlan(res.reportPlan);
        }
      } catch (e) {
        console.warn("[AiDashboardStudio] Lỗi tính lại preview sau khi thêm Slicer:", e);
      }
    }
  }

  // Thêm trang mới
  function handlePreviewAddPage(title) {
    if (!reportPlan) return;
    const newPageId = `page_${Date.now()}`;
    const newPage = {
      id: newPageId,
      displayName: title || `Trang ${(reportPlan.pages?.length || 1) + 1}`,
      visuals: [],
    };
    const updatedPages = [...(reportPlan.pages || []), newPage];
    setReportPlan({
      ...reportPlan,
      pages: updatedPages,
      workflowStatus: "DESIGN_DRAFT",
    });
  }

  // Xóa trang
  function handlePreviewDeletePage(pageId) {
    if (!reportPlan || !reportPlan.pages || reportPlan.pages.length <= 1) return;
    const updatedPages = reportPlan.pages.filter((p) => p.id !== pageId);
    setReportPlan({
      ...reportPlan,
      pages: updatedPages,
      workflowStatus: "DESIGN_DRAFT",
    });
  }

  // PHÊ DUYỆT THIẾT KẾ & TẠO POWER BI THẬT (.PBIP / TMDL / PBIR)
  async function handleApproveAndGenerate() {
    const sourceId = sourceDescriptor?.sourceId || datasetProfile?.sourceId;
    if (!sourceId || !reportPlan) {
      setError("Không tìm thấy nguồn dữ liệu hoặc kế hoạch báo cáo.");
      return;
    }

    setIsApproving(true);
    setError(null);
    setPbiError(null);

    try {
      // Bước 1: Gửi lệnh phê duyệt thiết kế
      const approvalRes = await approveReportPlan(sourceId, reportPlan);
      if (!approvalRes.success) {
        throw new Error(approvalRes.message || "Xác thực và phê duyệt thiết kế thất bại.");
      }

      const approvedPlan = approvalRes.reportPlan;
      setReportPlan(approvedPlan);
      setWorkflowStatus("DESIGN_APPROVED");

      // Bước 2: Tự động sinh Power BI Project thật từ bản thiết kế đã duyệt
      setIsGeneratingPbi(true);
      setWorkflowStatus("POWERBI_GENERATING");

      const baseName = (approvedPlan.reportTitle || "PowerBI_Report")
        .replace(/\.[^/.]+$/, "")
        .normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-zA-Z0-9_]/g, "_")
        .slice(0, 30);
      const projectName = `PBI_${baseName}_${Date.now()}`;

      const genRes = await generatePowerBiProject(sourceId, approvedPlan.reportTitle, projectName, {
        reportSpec: approvedPlan,
        approved: true,
      });

      if (genRes.success && genRes.project) {
        setPbiProjectResult(genRes.project);
        setWorkflowStatus(genRes.project.workflowStatus || "LOCAL_ARTIFACTS_GENERATED");
        loadSavedDashboards();
      } else {
        throw new Error(genRes.message || "Không thể tạo Power BI Project từ thiết kế đã duyệt.");
      }
    } catch (err) {
      console.error("[AiDashboardStudio] Lỗi phê duyệt và tạo Power BI:", err);
      setPbiError(err.message || "Lỗi phê duyệt và tạo Power BI.");
      setWorkflowStatus("DESIGN_DRAFT");
    setPbiProjectResult(null);setLiveDashboard(null);setDeploymentIntent(null);
    } finally {
      setIsApproving(false);
      setIsGeneratingPbi(false);
    }
  }

  // Publish lên Power BI Service
  async function handlePreviewPublish() {
    setPbiError(pbiProjectResult?.projectName ? null : 'Hãy bấm Phê duyệt thiết kế & Tạo Power BI trước khi triển khai.');
    setDeploymentIntent(null);setCloudConsent(false);setDeploymentOpen(true);
  }
  async function prepareGeneralDeployment() {
    setIsPublishingPbi(true);setPbiError(null);
    try {
      const res=await deployStudioDataset({projectName:pbiProjectResult.projectName,workspaceId:deploymentWorkspace.trim(),dryRun:true});
      setDeploymentIntent(res.deployment);setCloudConsent(false);
    } catch(err) {setPbiError(err.message);} finally {setIsPublishingPbi(false);}
  }
  async function confirmGeneralDeployment() {
    if(!cloudConsent || !deploymentIntent) return;
    setIsPublishingPbi(true);setPbiError(null);setWorkflowStatus('PUBLISH_PENDING');
    try {
      const fabricToken=(await getFabricTokenInteractive())?.accessToken;
      let powerBiToken=await getPowerBiPublishTokenSilent();
      if(!powerBiToken) powerBiToken=(await loginMicrosoftPublishConsentPopup())?.accessToken;
      const res=await deployStudioDataset({projectName:deploymentIntent.projectName,workspaceId:deploymentIntent.workspaceId,dryRun:false,
        approval:{action:'CREATE_PROCESS_VERIFY_REPORT',intentHash:deploymentIntent.intentHash}},fabricToken,powerBiToken);
      const result=res.deployment;setPbiPublishResult(result);
      setWorkflowStatus(result.phase || result.status);
      if(result.success && result.metadata) {
        setLiveDashboard(result.metadata);setCurrentDashboardId(result.dashboardId);
        setCurrentDashboardTitle(reportPlan?.reportTitle || result.projectName);setDeploymentOpen(false);loadSavedDashboards();
        requestAnimationFrame(()=>document.getElementById("studio-live-powerbi-report")?.scrollIntoView({behavior:"smooth",block:"start"}));
      } else setPbiError('Cloud chưa được xác minh. Giữ nguyên dự án và chạy tiếp để kiểm tra trạng thái; không tạo lại tài nguyên.');
    } catch(err) {setPbiError(err.message);setWorkflowStatus('PUBLISH_BLOCKED');} finally {setIsPublishingPbi(false);}
  }

  // TASK 04A & 05: Tạo Báo cáo Power BI thật (PBIP / PBIR / TMDL)
  async function handleCreateRealPowerBiProject() {
    const sourceId = sourceDescriptor?.sourceId || datasetProfile?.sourceId;
    if (!sourceId) {
      setError("Vui lòng chọn nguồn dữ liệu hợp lệ trước khi tạo Power BI Project.");
      return;
    }
    setIsGeneratingPbi(true);
    setPbiError(null);
    setPbiPublishResult(null);

    try {
      const userGoal = inputMessage || reportPlan?.reportTitle || "Phân tích và trực quan hóa dữ liệu đa năng";
      const baseName = (reportPlan?.reportTitle || datasetProfile?.name || "PowerBI_Report")
        .replace(/\.[^/.]+$/, "")
        .normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-zA-Z0-9_]/g, "_")
        .slice(0, 30);
      const projectName = `PBI_${baseName}_${Date.now()}`;
      const extraOptions = reportPlan ? { reportSpec: reportPlan } : {};
      const res = await generatePowerBiProject(sourceId, userGoal, projectName, extraOptions);
      if (res.success && res.project) {
        setPbiProjectResult(res.project);
        loadSavedDashboards();
      } else {
        throw new Error(res.message || "Không thể tạo Power BI Project.");
      }
    } catch (err) {
      console.error("[AiDashboardStudio] Lỗi tạo Power BI Project:", err);
      setPbiError(err.message || "Lỗi khi tạo Power BI Project thật.");
    } finally {
      setIsGeneratingPbi(false);
    }
  }

  // Tải gói dự án Power BI (.pbip + TMDL + PBIR) dưới dạng ZIP
  async function handleDownloadPbiZip(projectName) {
    const target = projectName || pbiProjectResult?.projectName;
    if (!target) return;
    setIsDownloadingZip(true);
    try {
      await downloadPowerBiProjectZip(target);
    } catch (err) {
      console.error("[AiDashboardStudio] Lỗi tải gói ZIP:", err);
      alert(`Không thể tải gói ZIP dự án: ${err.message}`);
    } finally {
      setIsDownloadingZip(false);
    }
  }

  // TASK 04A: Giảng viên Phê duyệt & Xuất bản Power BI
  async function handleConfirmPublishPowerBi() {
    setPbiApprovalModalOpen(false);await handlePreviewPublish();
  }

  // TASK 05.9 / TASK 09: Xác minh quyền Fabric Read-Only an toàn qua MSAL PKCE
  async function handleVerifyFabricAccessLive() {
    setIsVerifyingFabric(true);
    setFabricVerificationResult(null);
    try {
      let auth = null;
      try {
        auth = await getFabricTokenInteractive();
      } catch (authErr) {
        console.warn("[AiDashboardStudio] MSAL login popup warning:", authErr.message);
        setFabricVerificationResult({
          success: false,
          statusCode: 401,
          requiresLogin: true,
          message: `Chưa hoàn tất phiên Microsoft Entra ID: ${authErr.message}. Vui lòng đăng nhập tài khoản trường @dlu.edu.vn để xác thực.`,
        });
        return;
      }

      const msToken = auth?.accessToken;
      if (!msToken) {
        setFabricVerificationResult({
          success: false,
          statusCode: 401,
          requiresLogin: true,
          message: "Không lấy được Microsoft Access Token (Scope Fabric). Vui lòng đăng nhập lại qua MSAL.",
        });
        return;
      }

      setCachedFabricToken(msToken);
      const targetWs = deploymentWorkspace.trim();
      if(!targetWs) throw new Error("Hãy nhập Workspace ID trong màn hình triển khai trước khi kiểm tra quyền.");
      const res = await verifyWorkspaceAccessApi(msToken, targetWs);
      setFabricVerificationResult(res);
    } catch (err) {
      console.error("[AiDashboardStudio] Lỗi kiểm tra Fabric:", err);
      setFabricVerificationResult({
        success: false,
        statusCode: err.statusCode || 401,
        message: err.message || "Lỗi khi gửi yêu cầu kiểm tra tới Microsoft Fabric API.",
      });
    } finally {
      setIsVerifyingFabric(false);
    }
  }

  // TASK 09: Kích hoạt xuất bản / cập nhật Benchmark thật sau khi xem xét và xác nhận riêng trên UI
  async function handleExecuteBenchmarkPublish() {
    setIsPublishingPbi(true);
    try {
      let token = cachedFabricToken;
      if (!token) {
        const auth = await getFabricTokenInteractive();
        token = auth?.accessToken;
        if (token) setCachedFabricToken(token);
      }
      if (!token) {
        throw new Error("Chưa có phiên xác thực Microsoft Fabric hợp lệ. Vui lòng bấm 'Kiểm tra Microsoft Fabric' trước.");
      }

      const targetWorkspaceId = "9a2c772e-ef06-43e4-a887-fe510d52b54c";
      const targetProject = "PBI_Benchmark_Demo_Task08";
      const targetReportId = "a4125dcf-093d-4234-bf9f-359732ca2beb";
      const targetSemanticModelId = "62419274-8d63-432a-a9e0-9313d340be22";

      // An toàn: Tái sử dụng Report ID và Semantic Model ID hiện có, cập nhật definition PBIR trực tiếp
      const res = await updateFabricReportApi(
        token,
        targetWorkspaceId,
        targetReportId,
        targetSemanticModelId,
        targetProject,
        { dryRun: false, teacherApproved: true }
      );

      if (res.success) {
        setPbiPublishResult({
          ...res,
          reportId: targetReportId,
          semanticModelId: targetSemanticModelId,
          embedUrl: `https://app.powerbi.com/reportEmbed?reportId=${targetReportId}&groupId=${targetWorkspaceId}`,
          status: "UPDATED_LIVE",
        });
        setWorkflowStatus("CLOUD_VERIFICATION_REQUIRED");
        alert(`✔ Đã cập nhật định nghĩa Visual Bindings cho Report ${targetReportId} thành công trên Microsoft Fabric!`);
      } else {
        throw new Error(res.message || res.error || "Lỗi khi cập nhật PBIR lên Microsoft Fabric.");
      }
    } catch (err) {
      console.error("[AiDashboardStudio] Lỗi xuất bản/cập nhật Benchmark Fabric:", err);
      alert(err.message || "Lỗi trong quy trình cập nhật Benchmark.");
    } finally {
      setIsPublishingPbi(false);
    }
  }

  // TASK 05.9 / TASK 08: Triển khai PBIP hoàn chỉnh lên Microsoft Fabric (Dry-run hoặc Live sau khi duyệt)
  async function _handleDeployFabricPbipLive(options = { dryRun: true, teacherApproved: false }) {
    if(datasetProfile?.contractVersion===1) {await handlePreviewPublish();return;}
    const targetProject = pbiProjectResult?.projectName;
    if (!targetProject) {
      alert("Vui lòng tạo Power BI Project trước khi thực hiện triển khai Fabric.");
      return;
    }
    setIsPublishingPbi(true);
    try {
      let token = cachedFabricToken;
      if (!token) {
        const auth = await getFabricTokenInteractive();
        token = auth?.accessToken;
        if (token) setCachedFabricToken(token);
      }
      if (!token) {
        throw new Error("Không lấy được token xác thực Microsoft Fabric.");
      }
      const res = await deployFabricPbipApi(token, null, targetProject, options);
      if (res.success) {
        setPbiPublishResult(res);
        setWorkflowStatus(res.status || "PUBLISHED");
      } else {
        throw new Error(res.message || "Lỗi khi triển khai PBIP lên Microsoft Fabric.");
      }
    } catch (err) {
      console.error("[AiDashboardStudio] Lỗi triển khai Fabric:", err);
      alert(err.message || "Lỗi trong quy trình triển khai Fabric PBIP.");
    } finally {
      setIsPublishingPbi(false);
    }
  }

  // Hàm render trực quan hóa số liệu thực tế (Real Data Renderers)
  function renderRealChartContent(chart) {
    const real = chart.realData;

    // Trường hợp nguồn rỗng hoặc bộ lọc trả về 0 kết quả
    if (!real || real.isEmpty) {
      return (
        <div className="ai-real-chart-empty">
          <AlertCircle size={20} color="#f59e0b" style={{ marginBottom: "0.25rem" }} />
          <span>{real?.emptyMessage || "Chưa có dữ liệu phù hợp với bộ lọc."}</span>
        </div>
      );
    }

    // 1. BIỂU ĐỒ CỘT (BAR CHART THẬT)
    if (chart.chartType === "bar") {
      const seriesData = real.series?.[0]?.data || [];
      const categories = real.categories || [];
      const maxVal = Math.max(...seriesData, 1);
      const total = seriesData.reduce((a, b) => a + b, 0);

      return (
        <div className="ai-real-chart-container">
          <svg width="100%" height="150" viewBox="0 0 320 150">
            {/* Đường đáy tọa độ */}
            <line x1="10" y1="118" x2="310" y2="118" stroke="#cbd5e1" strokeWidth="1.5" />
            {categories.map((cat, idx) => {
              const val = seriesData[idx] ?? 0;
              const barH = Math.max(4, Math.round((val / maxVal) * 88));
              const stepX = 290 / Math.max(categories.length, 1);
              const barW = Math.min(36, Math.max(16, stepX - 10));
              const x = 15 + idx * stepX + (stepX - barW) / 2;
              const y = 118 - barH;
              const color = PALETTE[idx % PALETTE.length];
              const pct = total > 0 ? ((val / total) * 100).toFixed(1) : "0.0";
              const shortCat = cat.length > 11 ? cat.slice(0, 9) + "…" : cat;

              return (
                <g key={idx}>
                  <title>{`${cat}: ${val} (${pct}%)`}</title>
                  <rect
                    x={x}
                    y={y}
                    width={barW}
                    height={barH}
                    rx="4"
                    fill={color}
                    className="ai-chart-bar-rect"
                  />
                  <text
                    x={x + barW / 2}
                    y={y - 4}
                    textAnchor="middle"
                    fontSize="10"
                    fontWeight="700"
                    fill="#1e293b"
                  >
                    {val}
                  </text>
                  <text
                    x={x + barW / 2}
                    y="135"
                    textAnchor="middle"
                    fontSize="8.5"
                    fill="#64748b"
                  >
                    {shortCat}
                  </text>
                </g>
              );
            })}
          </svg>
        </div>
      );
    }

    // 2. BIỂU ĐỒ DONUT / PIE (THẬT KÈM BẢNG PHẦN TRĂM CỘNG DỒN ~100%)
    if (chart.chartType === "donut" || chart.chartType === "pie") {
      const percentages = real.percentages || [];
      const circumference = 264; // 2 * PI * 42
      let accumulatedPct = 0;

      return (
        <div className="ai-real-donut-layout">
          <div style={{ flex: "0 0 130px", height: "140px", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <svg width="120" height="120" viewBox="0 0 120 120">
              <circle cx="60" cy="60" r="42" fill="none" stroke="#f1f5f9" strokeWidth="18" />
              {percentages.map((p, idx) => {
                const dashLength = (p.percentage / 100) * circumference;
                const offset = -(accumulatedPct / 100) * circumference;
                accumulatedPct += p.percentage;
                const color = PALETTE[idx % PALETTE.length];

                return (
                  <circle
                    key={idx}
                    cx="60"
                    cy="60"
                    r="42"
                    fill="none"
                    stroke={color}
                    strokeWidth="18"
                    strokeDasharray={`${dashLength} ${circumference}`}
                    strokeDashoffset={offset}
                    transform="rotate(-90 60 60)"
                  >
                    <title>{`${p.label}: ${p.value} (${p.percentage}%)`}</title>
                  </circle>
                );
              })}
              <text x="60" y="58" textAnchor="middle" fontSize="12" fontWeight="800" fill="#1e293b">
                {real.sampleSize}
              </text>
              <text x="60" y="70" textAnchor="middle" fontSize="8" fill="#64748b">
                {real.unit || "mẫu"}
              </text>
            </svg>
          </div>

          <div className="ai-donut-legend-list">
            {percentages.slice(0, 5).map((p, idx) => (
              <div key={idx} className="ai-donut-legend-item">
                <span
                  className="ai-donut-legend-dot"
                  style={{ background: PALETTE[idx % PALETTE.length] }}
                />
                <span className="ai-donut-legend-label" title={p.label}>
                  {p.label}
                </span>
                <span className="ai-donut-legend-val">
                  {p.value} ({p.percentage}%)
                </span>
              </div>
            ))}
          </div>
        </div>
      );
    }

    // 3. THẺ KPI (KPI CARD THẬT)
    if (chart.chartType === "kpi_card") {
      const kpi = real.kpi || {};
      const unitStr = kpi.unit || real.unit || "";
      const rawValStr = String(kpi.formattedValue ?? real.metricValue ?? "—");
      const isPercent = unitStr === "%" || rawValStr.endsWith("%");
      const displayVal = isPercent ? (rawValStr.endsWith("%") ? rawValStr : `${rawValStr}%`) : rawValStr;

      return (
        <div className="ai-real-kpi-layout">
          <div className="ai-kpi-main-val">
            {displayVal}
            {!isPercent && unitStr && <span className="ai-kpi-unit-label"> {unitStr}</span>}
          </div>
          <div className="ai-kpi-subtext">
            {kpi.label || chart.title}
          </div>
          <div className="ai-kpi-meta-badge">
            {real.subLabel ? (
              <span>{real.subLabel}</span>
            ) : (
              <span>Cỡ mẫu: <strong>N = {real.sampleSize ?? 0}</strong> {real.unit || "mẫu"}</span>
            )}
          </div>
        </div>
      );
    }

    // 4. BIỂU ĐỒ ĐƯỜNG (LINE CHART THẬT)
    if (chart.chartType === "line") {
      const seriesData = real.series?.[0]?.data || [];
      const categories = real.categories || [];
      const maxVal = Math.max(...seriesData, 1);
      const minVal = Math.min(...seriesData, 0);
      const range = maxVal - minVal || 1;
      const stepX = 270 / Math.max(categories.length - 1, 1);
      const points = seriesData
        .map((val, idx) => {
          const x = 25 + idx * stepX;
          const y = 118 - ((val - minVal) / range) * 88;
          return `${x},${y}`;
        })
        .join(" ");

      return (
        <div className="ai-real-chart-container">
          <svg width="100%" height="150" viewBox="0 0 320 150">
            <line x1="15" y1="120" x2="305" y2="120" stroke="#cbd5e1" strokeWidth="1.5" />
            <polyline
              fill="none"
              stroke="#4f46e5"
              strokeWidth="2.5"
              points={points}
            />
            {seriesData.map((val, idx) => {
              const x = 25 + idx * stepX;
              const y = 118 - ((val - minVal) / range) * 88;
              const shortCat = categories[idx]?.length > 8 ? categories[idx].slice(0, 7) + "…" : categories[idx];
              return (
                <g key={idx}>
                  <title>{`${categories[idx]}: ${val}`}</title>
                  <circle cx={x} cy={y} r="4" fill="#4f46e5" stroke="#ffffff" strokeWidth="2" />
                  <text x={x} y={y - 8} textAnchor="middle" fontSize="9" fontWeight="700" fill="#1e293b">
                    {val}
                  </text>
                  <text x={x} y="135" textAnchor="middle" fontSize="8" fill="#64748b">
                    {shortCat}
                  </text>
                </g>
              );
            })}
          </svg>
        </div>
      );
    }

    // 5. BIỂU ĐỒ PHÂN TÁN (SCATTER PLOT THẬT)
    if (chart.chartType === "scatter") {
      const points = real.series?.[0]?.data || [];
      return (
        <div className="ai-real-chart-container">
          <svg width="100%" height="150" viewBox="0 0 320 150">
            <line x1="20" y1="120" x2="300" y2="120" stroke="#cbd5e1" strokeWidth="1.5" />
            <line x1="20" y1="20" x2="20" y2="120" stroke="#cbd5e1" strokeWidth="1.5" />
            {points.slice(0, 40).map((pt, idx) => {
              const xVal = typeof pt === "object" ? (pt.x ?? idx) : idx;
              const yVal = typeof pt === "object" ? (pt.y ?? 5) : pt;
              const x = 25 + Math.min(270, Math.max(0, (Number(xVal) / 10) * 270));
              const y = 118 - Math.min(90, Math.max(0, (Number(yVal) / 10) * 88));
              return (
                <circle key={idx} cx={x} cy={y} r="3.5" fill="#6366f1" opacity="0.8">
                  <title>{`X: ${xVal}, Y: ${yVal}`}</title>
                </circle>
              );
            })}
          </svg>
        </div>
      );
    }

    // 6. BẢNG CHI TIẾT (TABLE / TABLEEX)
    if (chart.chartType === "table" || chart.chartType === "tableEx") {
      const cols = real.columns || [];
      const tRows = real.rows || [];
      return (
        <div className="ai-preview-table-wrap" style={{ maxHeight: "220px", overflowY: "auto", border: "1px solid #e2e8f0", borderRadius: "6px" }}>
          <table className="ai-preview-table" style={{ width: "100%", fontSize: "0.8rem", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ background: "#f8fafc", borderBottom: "1px solid #cbd5e1" }}>
                {cols.map((c, idx) => (
                  <th key={idx} style={{ padding: "6px 8px", textAlign: "left", fontWeight: 600, color: "#334155", whiteSpace: "nowrap" }}>
                    {c.replace(/_/g, " ")}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {tRows.map((row, rIdx) => (
                <tr key={rIdx} style={{ borderBottom: "1px solid #f1f5f9" }}>
                  {cols.map((c, cIdx) => (
                    <td key={cIdx} style={{ padding: "5px 8px", color: "#1e293b", whiteSpace: "nowrap" }}>
                      {row[c] ?? "—"}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
          <div style={{ fontSize: "0.75rem", color: "#64748b", padding: "0.35rem 0.6rem", textAlign: "right", background: "#f8fafc", borderTop: "1px solid #e2e8f0" }}>
            Hiển thị {tRows.length} / {real.totalRows || tRows.length} sinh viên thực tế
          </div>
        </div>
      );
    }

    return null;
  }

  // Reset toàn bộ phiên làm việc
  function handleReset() {
    setLiveDashboard(null);
    setReportPlan(null);
    setPbiProjectResult(null);
    setPbiPublishResult(null);
    setActiveFilters({});
    setCurrentStep(1);
    setSourceDescriptor(null);
    setDatasetProfile(null);
    setChatMessages([]);
    setDashboardDraft(null);
    setError(null);
  }

  if (!isOpen) return null;

  return (
    <div className="ai-studio-overlay" onClick={onClose}>
      <div className="ai-studio-modal" onClick={(e) => e.stopPropagation()}>
        {/* 1. HEADER */}
        <header className="ai-studio-header">
          <div className="ai-studio-header-title">
            <div className="ai-studio-sparkle-box">
              <Sparkles size={22} />
            </div>
            <div>
              <h2>AI Dashboard Studio</h2>
              <p>Từ dữ liệu của bạn đến báo cáo trực quan, cùng trợ lý AI</p>
            </div>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
            {/* Chuyển đổi giữa Chế độ Thiết kế và Thư viện Dashboard */}
            <div className="ai-header-nav-group">
              <button
                type="button"
                className={`ai-header-nav-btn ${activeView === "studio" ? "active" : ""}`}
                onClick={() => setActiveView("studio")}
                title="Quy trình thiết kế Dashboard bằng AI"
              >
                <Sparkles size={14} />
                <span>Tạo báo cáo</span>
              </button>
              <button
                type="button"
                className={`ai-header-nav-btn ${activeView === "my_dashboards" ? "active" : ""}`}
                onClick={() => {
                  setActiveView("my_dashboards");
                  loadSavedDashboards();
                }}
                title="Xem các Dashboard đã lưu của bạn"
              >
                <FolderHeart size={14} />
                <span>Báo cáo của tôi</span>
                <span className="ai-dash-count-badge">{savedDashboards.length}</span>
              </button>
            </div>

            <button
              type="button"
              className="ai-studio-close-btn"
              onClick={onClose}
              aria-label="Đóng AI Studio"
            >
              <X size={20} />
            </button>
            <details className="ai-studio-help-menu"><summary>Trợ giúp & công cụ</summary><div>
              <p>Báo cáo mẫu để tham khảo cách sử dụng.</p>
              <button type="button" className="ai-btn-outline" disabled={isVerifyingFabric} onClick={handleLinkExistingDemo}>
                {isVerifyingFabric ? 'Đang đối chiếu dữ liệu...' : 'Liên kết báo cáo demo đã có'}
              </button>
            </div></details>
          </div>
        </header>

        {/* 2. STEPPER PROGRESS BAR (Chỉ hiển thị khi đang ở chế độ Studio) */}
        {activeView === "studio" && (
          <div className="ai-studio-stepper">
            {STEPS.map((step) => {
              const isActive = currentStep === step.id;
              const isCompleted = currentStep > step.id;
              const isSelectable = isCompleted || isActive;
              return (
                <button type="button" aria-current={isActive ? "step" : undefined} disabled={!isSelectable}
                  key={step.id}
                  className={`ai-step-item ${isActive ? "active" : ""} ${isCompleted ? "completed" : ""} ${!isSelectable ? "disabled" : ""}`}
                  onClick={() => {
                    if (isSelectable) setCurrentStep(step.id);
                  }}
                >
                  <span className="ai-step-num">
                    {isCompleted ? "✓" : step.id}
                  </span>
                  <span>{step.label}</span>
                </button>
              );
            })}
          </div>
        )}

        <details className="ai-provider-details"><summary><span className="ai-connection-dot" />Trạng thái trợ lý AI <span>Xem chi tiết</span></summary>
        {/* TASK 05.2: BỘ ĐIỀU PHỐI AI PROVIDER ROUTER (GEMINI / GROQ / HEURISTIC) */}
        {geminiStatusInfo?.activeProvider === "groq" ? (
          <div style={{
            margin: "0.75rem 1.75rem 0",
            padding: "0.65rem 1rem",
            background: "#eff6ff",
            border: "1px solid #bfdbfe",
            borderRadius: "10px",
            color: "#1e40af",
            fontSize: "0.825rem",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: "0.75rem"
          }}>
            <div style={{ display: "flex", alignItems: "center", gap: "0.6rem" }}>
              <Zap size={18} color="#2563eb" style={{ flexShrink: 0 }} />
              <div>
                <strong>Bộ điều phối AI đa tầng (AI Provider Router):</strong> Đang sử dụng <strong>Groq AI ({geminiStatusInfo.groq?.model || "openai/gpt-oss-120b"})</strong>
                <div style={{ fontSize: "0.775rem", color: "#3b82f6", marginTop: "2px" }}>
                  Groq là AI chính. Khi nhà cung cấp không khả dụng, hệ thống sẽ thông báo lý do và dùng bản nháp theo quy tắc.
                </div>
              </div>
            </div>
            <span style={{ fontSize: "0.75rem", background: "#dbeafe", border: "1px solid #93c5fd", color: "#1d4ed8", padding: "3px 8px", borderRadius: "6px", fontWeight: 600, whiteSpace: "nowrap" }}>
              ⚡ Groq AI Active
            </span>
          </div>
        ) : geminiStatusInfo?.inCooldown ? (
          <div style={{
            margin: "0.75rem 1.75rem 0",
            padding: "0.65rem 1rem",
            background: "#fffbeb",
            border: "1px solid #fde68a",
            borderRadius: "10px",
            color: "#92400e",
            fontSize: "0.825rem",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: "0.75rem"
          }}>
            <div style={{ display: "flex", alignItems: "center", gap: "0.6rem" }}>
              <AlertCircle size={18} color="#d97706" style={{ flexShrink: 0 }} />
              <div>
                <strong>Trạng thái Gemini AI:</strong> {geminiStatusInfo.status === "QUOTA_EXHAUSTED" ? "Hết hạn ngạch Free Tier (429 Quota Exceeded)" : "Máy chủ quá tải (503 High Demand)"}
                <div style={{ fontSize: "0.775rem", color: "#b45309", marginTop: "2px" }}>
                  Google yêu cầu giãn cách. Dự kiến mở lại sau: <strong>{geminiStatusInfo.formattedRemaining}</strong>. AI Studio đang phục vụ bằng <strong>Thuật toán Quy tắc BI Dự phòng (Heuristic Fallback)</strong>.
                </div>
              </div>
            </div>
            <span style={{ fontSize: "0.75rem", background: "#fef3c7", border: "1px solid #fcd34d", padding: "3px 8px", borderRadius: "6px", fontWeight: 600, whiteSpace: "nowrap" }}>
              ⚙️ Heuristic Fallback Active
            </span>
          </div>
        ) : null}

        </details>
        {/* THÔNG BÁO THÀNH CÔNG */}
        {saveSuccessMsg && (
          <div style={{ margin: "1rem 1.75rem 0", padding: "0.75rem 1rem", background: "#ecfdf5", border: "1px solid #a7f3d0", borderRadius: "10px", color: "#065f46", fontSize: "0.85rem", display: "flex", alignItems: "center", justifyContent: "space-between", gap: "0.5rem" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
              <CheckCircle2 size={16} color="#059669" />
              <span>{saveSuccessMsg}</span>
            </div>
            {activeView === "studio" && (
              <button
                type="button"
                className="ai-btn-small"
                onClick={() => {
                  setActiveView("my_dashboards");
                  loadSavedDashboards();
                }}
              >
                Xem Dashboard của tôi →
              </button>
            )}
          </div>
        )}

        {/* 3. ERROR BANNER */}
        {error && (
          <div style={{ margin: "1rem 1.75rem 0", padding: "0.75rem 1rem", background: "#fef2f2", border: "1px solid #fecaca", borderRadius: "10px", color: "#991b1b", fontSize: "0.85rem", display: "flex", alignItems: "center", gap: "0.5rem" }}>
            <AlertCircle size={16} />
            <span>{error}</span>
          </div>
        )}

        {/* 4. MAIN BODY ACCORDING TO CURRENT STEP */}
        <div className="ai-studio-body">
          {activeView==="studio" && <section className="ai-stage-intro">
            <div><span className="ai-stage-eyebrow">BƯỚC {currentStep} / 4</span>
              <h3>{({1:'Bạn muốn phân tích dữ liệu nào?',2:'Kiểm tra nhanh trước khi bắt đầu',3:'Bạn muốn biết điều gì từ dữ liệu?',4:liveDashboard?'Báo cáo của bạn đã sẵn sàng':'Hoàn thiện báo cáo của bạn'})[currentStep]}</h3>
              <p>{({1:'Chọn tệp Excel, CSV hoặc dữ liệu môn học trên LMS.',2:'Xem tên cột và một vài dòng mẫu. Dữ liệu đúng rồi? Tiếp tục để trao đổi với AI.',3:'Mô tả bằng lời thông thường. AI sẽ đề xuất chỉ số và biểu đồ phù hợp.',4:liveDashboard?'Xem và tương tác ngay bên dưới. Mở phần thiết kế khi cần chỉnh sửa.':'Chỉnh biểu đồ, lưu bản nháp hoặc chuẩn bị xuất bản lên Power BI.'})[currentStep]}</p>
              {datasetProfile && currentStep>2 && <span className="ai-source-context"><FileSpreadsheet size={13}/>{datasetProfile.name} · {datasetProfile.totalRows?.toLocaleString('vi-VN')} dòng</span>}
            </div>
            {currentStep===4 && reportPlan && <button type="button" className="ai-btn-secondary" onClick={handleOpenSaveModal}><Save size={15}/>{currentDashboardId?'Lưu thay đổi':'Lưu bản nháp'}</button>}
          </section>}
          {pbiError && activeView==="studio" && <div className="ai-error-banner" role="alert"><AlertCircle size={16}/>{pbiError}</div>}

          {/* ================================================================
              BƯỚC 1: CHỌN NGUỒN DỮ LIỆU (EXCEL/CSV HOẶC LMS DATA WAREHOUSE)
          ================================================================ */}
          {activeView === "studio" && currentStep === 1 && (
            <div>
              <div className="ai-source-tabs">
                <button
                  type="button"
                  className={`ai-source-tab-btn ${sourceType === "file" ? "active" : ""}`}
                  onClick={() => setSourceType("file")}
                >
                  <div className="ai-source-tab-icon">
                    <FileSpreadsheet size={22} />
                  </div>
                  <div className="ai-source-tab-info">
                    <strong>Tải tệp Excel / CSV</strong>
                    <span>Tải bảng điểm, danh sách sinh viên hoặc tệp xuất từ Moodle</span>
                  </div>
                </button>

                <button
                  type="button"
                  className={`ai-source-tab-btn ${sourceType === "lms" ? "active" : ""}`}
                  onClick={() => setSourceType("lms")}
                >
                  <div className="ai-source-tab-icon">
                    <Database size={22} />
                  </div>
                  <div className="ai-source-tab-info">
                    <strong>Dữ liệu môn học trên LMS</strong>
                    <span>Sử dụng dữ liệu các môn học bạn đang giảng dạy</span>
                  </div>
                </button>
              </div>

              {/* TAB FILE UPLOAD */}
              {sourceType === "file" && (
                <div>
                  <label className="ai-dropzone-box" htmlFor="ai-studio-file-input">
                    <input
                      id="ai-studio-file-input"
                      type="file"
                      accept=".xlsx,.csv"
                      style={{ display: "none" }}
                      onChange={handleFileUpload}
                      disabled={loading}
                    />
                    <div className="ai-dropzone-icon">
                      <Upload size={26} />
                    </div>
                    <h3>{loading ? "Đang xử lý tệp..." : "Bấm để chọn tệp Excel hoặc CSV"}</h3>
                    <p>Dữ liệu sẽ được đọc và hiển thị để bạn kiểm tra trước khi phân tích.</p>

                    <div className="ai-dropzone-badges">
                      <span className="ai-safe-badge">
                        <ShieldCheck size={13} />
                        Không thực thi công thức
                      </span>
                      <span className="ai-safe-badge">
                        <ShieldCheck size={13} />
                        Che thông tin cá nhân trong bản xem trước
                      </span>
                      <span className="ai-safe-badge">
                        <ShieldCheck size={13} />
                        Tối đa 10MB • 5.000 dòng
                      </span>
                    </div>
                  </label>

                  <div className="ai-demo-template-row">
                    <div>
                      <strong>Bạn chưa có sẵn tệp bảng điểm?</strong>
                      <span style={{ color: "#64748b", marginLeft: "0.5rem" }}>
                        Tải bảng điểm mẫu giả lập 10 sinh viên để trải nghiệm ngay.
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={handleDownloadTemplate}
                      disabled={downloadingTemplate}
                      className="ai-download-btn"
                      title="Tải bảng điểm mẫu chuẩn quy chế học vụ (.xlsx)"
                    >
                      <Download size={14} />
                      {downloadingTemplate ? "Đang tải tệp mẫu..." : "Tải tệp mẫu (.xlsx)"}
                    </button>
                  </div>
                </div>
              )}

              {/* TAB LMS DATA WAREHOUSE */}
              {sourceType === "lms" && (
                <div className="ai-lms-selector-card">
                  <label htmlFor="ai-studio-lms-select">
                    Chọn môn học được phân quyền giảng dạy:
                  </label>
                  {loadingCourses ? (
                    <p style={{ color: "#64748b", fontSize: "0.85rem" }}>Đang tải danh sách môn học...</p>
                  ) : lmsCourses.length === 0 ? (
                    <p style={{ color: "#ef4444", fontSize: "0.85rem" }}>Không tìm thấy môn học nào được phân quyền cho tài khoản giảng viên hiện tại.</p>
                  ) : (
                    <select
                      id="ai-studio-lms-select"
                      className="ai-lms-select"
                      value={selectedCourseId}
                      onChange={(e) => setSelectedCourseId(e.target.value)}
                    >
                      {lmsCourses.map((c) => (
                        <option
                          key={c.Course_Key || c.Moodle_Course_ID}
                          value={c.Course_Key || c.Moodle_Course_ID}
                        >
                          {c.Course_Code} — {c.Course_Name} (Mã Moodle: {c.Moodle_Course_ID})
                        </option>
                      ))}
                    </select>
                  )}

                  <div style={{ marginTop: "1rem", display: "flex", gap: "0.5rem" }}>
                    <span className="ai-safe-badge">
                      <ShieldCheck size={13} />
                      Phân quyền xác thực Server-side (Token identity)
                    </span>
                    <span className="ai-safe-badge">
                      <ShieldCheck size={13} />
                      Dữ liệu tổng hợp DW (Không chứa PII)
                    </span>
                  </div>

                  <button
                    type="button"
                    className="ai-btn-confirm-lms"
                    onClick={handleSelectLms}
                    disabled={loading || lmsCourses.length === 0}
                  >
                    <Database size={16} />
                    <span>{loading ? "Đang kết nối kho dữ liệu..." : "Nạp nguồn dữ liệu LMS"}</span>
                  </button>
                </div>
              )}
            </div>
          )}

          {/* ================================================================
              BƯỚC 2: XEM TRƯỚC SCHEMA & BẢNG DỮ LIỆU ĐÃ CHE PII
          ================================================================ */}
          {activeView === "studio" && currentStep === 2 && datasetProfile && (
            <div>
              <div className="ai-schema-container">
                <div className="ai-schema-summary-bar">
                  <div className="ai-schema-metrics">
                    <span>Nguồn: <strong>{datasetProfile.name}</strong></span>
                    <span>Quy mô: <strong>{datasetProfile.totalRows} dòng</strong></span>
                    <span>Số cột: <strong>{datasetProfile.totalColumns} cột</strong></span>
                  </div>
                  <span className="ai-pii-alert-badge">
                    <ShieldCheck size={13} />
                    Thông tin cá nhân đã được che
                  </span>
                </div>

                <div className="ai-table-scroll">
                  <table className="ai-preview-table">
                    <thead>
                      <tr>
                        {datasetProfile.columns.map((c) => (
                          <th key={c.name}>
                            <div>{c.originalName || c.name}</div>
                            <span style={{ fontSize: "0.65rem", fontWeight: "normal", color: "#64748b" }}>
                              {({number:"Số",string:"Văn bản",date:"Ngày",boolean:"Đúng / sai"})[c.inferredType] || c.inferredType}{c.missingPercentage!==undefined ? ` · ${c.missingPercentage}% trống` : ""}
                            </span>
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {datasetProfile.previewRows.map((row, idx) => (
                        <tr key={idx}>
                          {datasetProfile.columns.map((col) => (
                            <td key={col.name}>
                              {String(row[col.name] ?? "—")}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <button
                  type="button"
                  className="ai-btn-secondary"
                  onClick={() => setCurrentStep(1)}
                >
                  <ArrowLeft size={14} style={{ marginRight: "0.3rem" }} />
                  Đổi nguồn dữ liệu
                </button>

                <button
                  type="button"
                  className="ai-btn-primary"
                  onClick={() => setCurrentStep(3)}
                >
                  Tiếp tục: Yêu cầu phân tích
                  <ArrowRight size={14} style={{ marginLeft: "0.3rem" }} />
                </button>
              </div>
            </div>
          )}

          {/* ================================================================
              BƯỚC 3: MỤC TIÊU PHÂN TÍCH & KHUNG CHAT TRAO ĐỔI VỚI AI
          ================================================================ */}
          {activeView === "studio" && currentStep === 3 && datasetProfile && (
            <div>
              <div className="ai-chat-box">
                <div className="ai-chat-header">
                  <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                    <Sparkles size={16} color="#6366f1" />
                    <strong style={{ fontSize: "0.9rem", color: "#1e293b" }}>
                      Trò chuyện với trợ lý AI
                    </strong>
                  </div>
                  <span className="ai-chat-header-mode">{isAiReplying?'Đang tạo đề xuất…':'Trợ lý AI'}</span>
                </div>

                <div className="ai-chat-messages">
                  {chatMessages.map((msg, idx) => (
                    <div key={idx} className={`ai-msg ${msg.role}`}>
                      <div className="ai-msg-avatar">
                        {msg.role === "user" ? "GV" : <Sparkles size={16} />}
                      </div>
                      <div className="ai-msg-content">
                        {msg.text}
                      </div>
                    </div>
                  ))}

                  {isAiReplying && (
                    <div className="ai-msg assistant">
                      <div className="ai-msg-avatar">
                        <Sparkles size={16} />
                      </div>
                      <div className="ai-msg-content" style={{ display: "flex", alignItems: "center", gap: "0.5rem", color: "#6366f1" }}>
                        <span>AI Studio đang suy luận và thiết kế cấu trúc biểu đồ...</span>
                      </div>
                    </div>
                  )}
                  <div ref={chatBottomRef} />
                </div>

                {/* GỢI Ý NHANH (PROMPT CHIPS) */}
                <div className="ai-chips-row">
                  <button
                    type="button"
                    className="ai-chip"
                    onClick={() => handleSendMessage("Xem phân bố điểm số và tỷ lệ sinh viên đạt/trượt")}
                  >
                    📊 Phân bố điểm & Tỷ lệ đạt
                  </button>
                  <button
                    type="button"
                    className="ai-chip"
                    onClick={() => handleSendMessage("Phát hiện sinh viên có nguy cơ học vụ hoặc điểm dưới trung bình")}
                  >
                    ⚠️ Cảnh báo sinh viên nguy cơ
                  </button>
                  <button
                    type="button"
                    className="ai-chip"
                    onClick={() => handleSendMessage("So sánh tỷ lệ chuyên cần và điểm thi")}
                  >
                    📈 Chuyên cần vs Điểm thi
                  </button>
                  <button
                    type="button"
                    className="ai-chip"
                    onClick={() => handleSendMessage("Tổng hợp các chỉ số KPI quan trọng nhất của môn")}
                  >
                    🎯 Bảng KPI tổng quan môn học
                  </button>
                </div>

                <form
                  className="ai-chat-input-bar"
                  onSubmit={(e) => {
                    e.preventDefault();
                    handleSendMessage();
                  }}
                >
                  <input
                    type="text"
                    className="ai-chat-input"
                    placeholder="Mô tả mục tiêu phân tích (ví dụ: 'Hãy đề xuất biểu đồ phân bố điểm và các thẻ KPI')..."
                    value={inputMessage}
                    onChange={(e) => setInputMessage(e.target.value)}
                    disabled={isAiReplying}
                  />
                  <button
                    type="submit"
                    className="ai-chat-send-btn"
                    disabled={isAiReplying || !inputMessage.trim()}
                  >
                    <Send size={15} />
                    <span>Gửi</span>
                  </button>
                </form>
              </div>

              <div style={{ marginTop: "1rem", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <button
                  type="button"
                  className="ai-btn-secondary"
                  onClick={() => setCurrentStep(2)}
                >
                  <ArrowLeft size={14} style={{ marginRight: "0.3rem" }} />
                  Quay lại dữ liệu
                </button>

                {(dashboardDraft || reportPlan) && (
                  <button
                    type="button"
                    className="ai-btn-primary"
                    onClick={() => setCurrentStep(4)}
                  >
                    Xem báo cáo đề xuất
                    <ArrowRight size={14} style={{ marginLeft: "0.3rem" }} />
                  </button>
                )}
              </div>
            </div>
          )}

          {/* ================================================================
              BƯỚC 4: KẾ HOẠCH BÁO CÁO & BẢN NHÁP DASHBOARD POWER BI
          ================================================================ */}
          {activeView === "studio" && currentStep === 4 && (dashboardDraft || reportPlan) && (
            <div>
              {deploymentOpen && <div className="ai-modal-overlay" style={{zIndex:10020}}><section role="dialog" aria-modal="true" aria-label="Phê duyệt triển khai dataset" className="ai-edit-visual-modal" style={{width:"min(760px,94vw)",maxHeight:"88vh",overflowY:"auto",overflowWrap:"anywhere"}}>
                <h3>Xuất bản báo cáo lên Power BI</h3><p>{reportPlan?.reportTitle} — {pbiProjectResult?.projectName}</p>
                <label>Workspace Power BI <input autoFocus placeholder="Nhập Workspace ID được cấp quyền" aria-label="Workspace ID triển khai" value={deploymentWorkspace} onChange={e=>{setDeploymentWorkspace(e.target.value);setDeploymentIntent(null);setCloudConsent(false);}} /></label>
                <button type="button" disabled={isPublishingPbi || !pbiProjectResult?.projectName} onClick={prepareGeneralDeployment}>Xem thông tin xuất bản</button>
                {deploymentIntent && <>
                  <p className="ai-publish-dataset-id">Mã dữ liệu: {deploymentIntent.datasetId}</p>
                  <p>Model mới: {deploymentIntent.semanticModelName}</p><p>Report mới: {deploymentIntent.reportName}</p>
                  <p>Dữ liệu: {Object.values(deploymentIntent.sourceRowCounts).reduce((total,n)=>total+n,0).toLocaleString("vi-VN")} dòng · {Object.keys(deploymentIntent.sourceRowCounts).length} bảng</p>
                  <p>Hệ thống sẽ kiểm tra quyền, tạo mô hình và báo cáo riêng, nạp và đối chiếu dữ liệu, sau đó lưu báo cáo để bạn xem ngay trong LMS.</p>
                  <label><input type="checkbox" checked={cloudConsent} onChange={e=>setCloudConsent(e.target.checked)} /> Tôi phê duyệt tạo và process đúng hai tài nguyên trên trong workspace đã chọn.</label>
                  <button type="button" className="ai-publish-confirm" disabled={!cloudConsent || isPublishingPbi} onClick={confirmGeneralDeployment}>{isPublishingPbi?'Đang xử lý / xác minh…':'Xác nhận xuất bản'}</button>
                </>}
                <button disabled={isPublishingPbi} onClick={()=>setDeploymentOpen(false)}>Đóng</button>
                {pbiError && <p role="alert">{pbiError}</p>}
              </section></div>}
              {liveDashboard && (
                <section id="studio-live-powerbi-report" aria-label="Báo cáo Power BI đã lưu">
                  <h3>{currentDashboardTitle}</h3>
                  <p>Báo cáo đã lưu trong Dashboard của tôi. Cần tài khoản Microsoft có quyền xem.</p>
                  <SecurePowerBIReport
                    key={liveDashboard.powerBiReportId}
                    reportId={liveDashboard.powerBiReportId}
                    embedUrl={liveDashboard.powerBiEmbedUrl || liveDashboard.embedUrl}
                    filterMode="report"
                    height="720px"
                    hidePageNavigation={false}
                  />
                </section>
              )}
              {/* TASK 05.6: BẢN THIẾT KẾ XEM TRƯỚC TƯƠNG TÁC (INTERACTIVE VISUAL DASHBOARD PREVIEW) */}
              {reportPlan && (
                <details className="ai-design-disclosure" open={!liveDashboard}>
                <summary><Edit3 size={16}/>{liveDashboard?'Chỉnh sửa thiết kế báo cáo':'Thiết kế & xem trước báo cáo'}<span>Biểu đồ · Bộ lọc · Trợ lý AI</span></summary>
                <VisualDashboardPreview
                  reportPlan={reportPlan}
                  datasetProfile={datasetProfile}
                  workflowStatus={workflowStatus}
                  activeFilters={activeFilters}
                  onFilterChange={handlePreviewFilterChange}
                  onUpdateVisual={handlePreviewUpdateVisual}
                  onDeleteVisual={handlePreviewDeleteVisual}
                  onAddVisual={handlePreviewAddVisual}
                  onAddKpi={handlePreviewAddKpi}
                  onAddSlicer={handlePreviewAddSlicer}
                  onAddPage={handlePreviewAddPage}
                  onDeletePage={handlePreviewDeletePage}
                  onApproveAndGenerate={handleApproveAndGenerate}
                  onPublish={handlePreviewPublish}
                  onVerifyFabric={handleVerifyFabricAccessLive}
                  isVerifyingFabric={isVerifyingFabric}
                  fabricVerificationResult={fabricVerificationResult}
                  onDownloadZip={handleDownloadPbiZip}
                  isApproving={isApproving}
                  isGenerating={isGeneratingPbi}
                  isPublishing={isPublishingPbi}
                  isDownloadingZip={isDownloadingZip}
                  pbiProjectResult={pbiProjectResult}
                  pbiPublishResult={pbiPublishResult}
                  planEditInput={planEditInput}
                  setPlanEditInput={setPlanEditInput}
                  onConversationalEdit={handleConversationalEditPlan}
                  isEditingPlan={isEditingPlan}
                  onExecuteBenchmarkPublish={handleExecuteBenchmarkPublish}
                />
                </details>
              )}

              <details className="ai-advanced-disclosure"><summary><FileCode size={16}/>Chi tiết báo cáo & công cụ nâng cao<span>Kế hoạch AI, DAX, tệp dự án và kết nối Power BI</span></summary><div className="ai-advanced-content">
              {/* KHỐI 1: KẾ HOẠCH BÁO CÁO POWER BI (REPORT PLAN IR) */}
              {reportPlan && (
                <div className="ai-report-plan-card">
                  <div className="ai-report-plan-header">
                    <div>
                      <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                        <Sparkles size={18} color="#4f46e5" />
                        <h4 style={{ margin: 0, fontSize: "1.05rem", fontWeight: 700, color: "#1e293b" }}>
                          Kế Hoạch Báo Cáo Power BI (Report Plan IR)
                        </h4>
                      </div>
                      <p style={{ margin: "0.25rem 0 0 0", fontSize: "0.825rem", color: "#64748b" }}>
                        {reportPlan.reportTitle} • Lĩnh vực: <strong>{reportPlan.domain || "Tổng hợp"}</strong>
                      </p>
                    </div>

                    <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                      {reportPlan.plannerStatus?.mode === "GROQ_SUCCESS" ? (
                        <span className="ai-badge-gemini-success" style={{ background: "#eff6ff", color: "#1d4ed8", border: "1px solid #bfdbfe" }}>
                          <Zap size={13} color="#2563eb" />
                          ⚡ Groq AI — GPT-OSS 120B ({reportPlan.plannerStatus?.model || "openai/gpt-oss-120b"})
                        </span>
                      ) : reportPlan.plannerStatus?.mode === "GEMINI_SUCCESS" ? (
                        <span className="ai-badge-gemini-success">
                          <Sparkles size={13} />
                          ✨ Gemini AI ({reportPlan.plannerStatus?.model || "gemini-3.8-flash"})
                        </span>
                      ) : (
                        <span className="ai-badge-heuristic">
                          ⚙️ Quy tắc Heuristic Đa năng (AI Fallback)
                        </span>
                      )}
                    </div>
                  </div>

                  {/* THÔNG BÁO RÕ NGUỒN GỐC THUẬT TOÁN KHI CHẠY HEURISTIC FALLBACK */}
                  {reportPlan.plannerStatus?.mode === "HEURISTIC_FALLBACK" && (
                    <div style={{
                      marginTop: "0.75rem",
                      padding: "0.6rem 0.85rem",
                      background: "#fffbeb",
                      border: "1px solid #fde68a",
                      borderRadius: "8px",
                      color: "#92400e",
                      fontSize: "0.825rem",
                      display: "flex",
                      alignItems: "center",
                      gap: "0.5rem"
                    }}>
                      <AlertCircle size={17} color="#d97706" style={{ flexShrink: 0 }} />
                      <div>
                        <strong>Nguồn gốc kế hoạch:</strong> Báo cáo này được tạo bởi <strong>Bộ quy tắc Phân tích Đa năng Heuristic (Rule-based BI Engine)</strong>, KHÔNG PHẢI bởi Gemini AI do hạn ngạch API hiện đang chạm trần hoặc tạm hoãn ({reportPlan.plannerStatus?.reason || "Gemini Cooldown"}).
                      </div>
                    </div>
                  )}

                  <div className="ai-plan-content" style={{ marginTop: "1rem" }}>
                    {/* DAX MEASURES */}
                    <div style={{ marginBottom: "1rem" }}>
                      <div style={{ marginBottom: "0.4rem", fontSize: "0.85rem", fontWeight: 600, color: "#334155" }}>
                        📐 Chỉ số Đo lường & Công thức DAX ({reportPlan.measures?.length || 0}):
                      </div>
                      <div style={{ display: "flex", flexWrap: "wrap", gap: "0.4rem" }}>
                        {(reportPlan.measures || []).map((m, idx) => (
                          <div key={idx} className="ai-pbi-measure-chip" title={m.description || m.dax}>
                            <strong>{m.name}: </strong>
                            <code>{m.dax}</code>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* VISUALS & PAGES LAYOUT */}
                    <div style={{ marginBottom: "1rem" }}>
                      {Array.isArray(reportPlan.pages) && reportPlan.pages.length > 1 ? (
                        <div>
                          <div style={{ marginBottom: "0.5rem", fontSize: "0.85rem", fontWeight: 700, color: "#1e293b", display: "flex", alignItems: "center", gap: "0.5rem" }}>
                            <span>📑 Báo cáo Đa trang ({reportPlan.pages.length} trang Power BI)</span>
                            <span style={{ fontSize: "0.75rem", background: "#e0e7ff", color: "#3730a3", padding: "0.15rem 0.5rem", borderRadius: "12px", fontWeight: 600 }}>
                              Tổng cộng {reportPlan.visuals?.length || 0} visual
                            </span>
                          </div>

                          <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
                            {reportPlan.pages.map((p, pIdx) => (
                              <div key={p.id || pIdx} style={{ background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: "8px", padding: "0.75rem" }}>
                                <div style={{ fontSize: "0.8rem", fontWeight: 600, color: "#0f766e", marginBottom: "0.5rem" }}>
                                  Trang {pIdx + 1}: <strong>{p.displayName || p.id}</strong> ({p.visuals?.length || 0} thành phần)
                                </div>
                                <div style={{
                                  display: "grid",
                                  gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))",
                                  gap: "0.6rem"
                                }}>
                                  {(p.visuals || []).map((v, idx) => (
                                    <div key={idx} style={{
                                      background: "#ffffff",
                                      border: "1px solid #cbd5e1",
                                      borderRadius: "6px",
                                      padding: "0.6rem",
                                      boxShadow: "0 1px 2px rgba(0,0,0,0.03)"
                                    }}>
                                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.3rem" }}>
                                        <span style={{
                                          fontSize: "0.7rem",
                                          fontWeight: 700,
                                          textTransform: "uppercase",
                                          color: "#4f46e5",
                                          background: "#eef2ff",
                                          padding: "0.1rem 0.35rem",
                                          borderRadius: "4px"
                                        }}>
                                          {v.visualType}
                                        </span>
                                        <span style={{ fontSize: "0.65rem", color: "#64748b" }}>
                                          {v.position?.width || v.width}x{v.position?.height || v.height}
                                        </span>
                                      </div>
                                      <h6 style={{ margin: "0 0 0.25rem 0", fontSize: "0.8rem", fontWeight: 600, color: "#1e293b" }}>
                                        {v.title}
                                      </h6>
                                      {(v.categoryField || v.measureField) && (
                                        <div style={{ fontSize: "0.7rem", color: "#475569" }}>
                                          {v.categoryField && <div>Trục/Nhóm: <strong>{v.categoryField}</strong></div>}
                                          {v.measureField && <div>Chỉ số: <strong>{v.measureField}</strong></div>}
                                          {v.secondaryMeasureField && <div>Đường/Phụ: <strong>{v.secondaryMeasureField}</strong></div>}
                                        </div>
                                      )}
                                    </div>
                                  ))}
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      ) : (
                        <div>
                          <div style={{ marginBottom: "0.4rem", fontSize: "0.85rem", fontWeight: 600, color: "#334155" }}>
                            📊 Danh sách Biểu đồ PBIR ({reportPlan.visuals?.length || 0}):
                          </div>
                          <div style={{
                            display: "grid",
                            gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))",
                            gap: "0.75rem"
                          }}>
                            {(reportPlan.visuals || []).map((v, idx) => (
                              <div key={idx} style={{
                                background: "#ffffff",
                                border: "1px solid #e2e8f0",
                                borderRadius: "8px",
                                padding: "0.75rem",
                                boxShadow: "0 1px 3px rgba(0,0,0,0.05)"
                              }}>
                                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.4rem" }}>
                                  <span style={{
                                    fontSize: "0.7rem",
                                    fontWeight: 700,
                                    textTransform: "uppercase",
                                    color: "#4f46e5",
                                    background: "#eef2ff",
                                    padding: "0.15rem 0.4rem",
                                    borderRadius: "4px"
                                  }}>
                                    {v.visualType}
                                  </span>
                                  <span style={{ fontSize: "0.7rem", color: "#64748b" }}>
                                    {v.position?.width || v.width}x{v.position?.height || v.height}
                                  </span>
                                </div>
                                <h6 style={{ margin: "0 0 0.35rem 0", fontSize: "0.85rem", fontWeight: 600, color: "#1e293b" }}>
                                  {v.title}
                                </h6>
                                {(v.categoryField || v.measureField || v.fields) && (
                                  <div style={{ fontSize: "0.75rem", color: "#475569" }}>
                                    <div>Trục/Nhóm: <strong>{v.categoryField || v.fields?.category || v.fields?.xAxis || "—"}</strong></div>
                                    <div>Giá trị/Measure: <strong>{v.measureField || v.fields?.values?.join(", ") || v.fields?.yAxis || "—"}</strong></div>
                                    {v.secondaryMeasureField && <div>Đường/Phụ: <strong>{v.secondaryMeasureField}</strong></div>}
                                  </div>
                                )}
                                {v.reasoning && (
                                  <p style={{ margin: "0.4rem 0 0 0", fontSize: "0.7rem", color: "#64748b", fontStyle: "italic" }}>
                                    {v.reasoning}
                                  </p>
                                )}
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>

                    {/* CONVERSATIONAL PLAN REFINEMENT BAR */}
                    <div style={{
                      marginTop: "1rem",
                      padding: "0.75rem 1rem",
                      background: "#f8fafc",
                      borderRadius: "8px",
                      border: "1px solid #e2e8f0"
                    }}>
                      <div style={{ display: "flex", alignItems: "center", gap: "0.4rem", marginBottom: "0.4rem", fontSize: "0.8rem", fontWeight: 600, color: "#334155" }}>
                        <Edit3 size={14} color="#4f46e5" />
                        <span>Hội thoại Chỉnh sửa Kế hoạch Báo cáo (Multi-turn Plan Refinement)</span>
                      </div>
                      <form
                        onSubmit={(e) => {
                          e.preventDefault();
                          handleConversationalEditPlan();
                        }}
                        style={{ display: "flex", gap: "0.5rem" }}
                      >
                        <input
                          type="text"
                          className="ai-step4-input"
                          style={{ flex: 1, padding: "0.45rem 0.75rem", fontSize: "0.825rem", borderRadius: "6px", border: "1px solid #cbd5e1" }}
                          placeholder="Yêu cầu thay đổi (ví dụ: 'Đổi biểu đồ cột sang tròn', 'Thêm KPI Tỷ lệ tăng trưởng', 'Đổi tên báo cáo')..."
                          value={planEditInput}
                          onChange={(e) => setPlanEditInput(e.target.value)}
                          disabled={isEditingPlan}
                        />
                        <button
                          type="submit"
                          className="ai-chat-send-btn"
                          style={{ padding: "0.45rem 0.9rem", fontSize: "0.825rem", whiteSpace: "nowrap" }}
                          disabled={isEditingPlan || !planEditInput.trim()}
                        >
                          {isEditingPlan ? (
                            <>
                              <Sparkles size={14} className="ai-spin" />
                              <span>Đang cập nhật...</span>
                            </>
                          ) : (
                            <>
                              <Zap size={14} />
                              <span>Cập nhật Kế hoạch</span>
                            </>
                          )}
                        </button>
                      </form>
                    </div>
                  </div>
                </div>
              )}

              {dashboardDraft && (
                <div className="ai-draft-header-box" style={{ marginTop: "1rem" }}>
                  <div className="ai-draft-title-row">
                    <h3>{dashboardDraft.draftTitle}</h3>
                    <p>{dashboardDraft.draftDescription}</p>
                  </div>
                  <div className="ai-draft-actions-row">
                    <span className="ai-safe-badge" style={{ fontWeight: "700" }}>
                      {selectedChartIds.size} / {dashboardDraft.recommendedCharts.length} biểu đồ đã chọn
                    </span>
                    <button
                      type="button"
                      className="ai-btn-small"
                      onClick={selectAllCharts}
                      title="Chọn toàn bộ biểu đồ vào bản nháp"
                    >
                      Chọn tất cả
                    </button>
                    <button
                      type="button"
                      className="ai-btn-small"
                      onClick={deselectAllCharts}
                      title="Bỏ chọn tất cả"
                    >
                      Bỏ chọn
                    </button>

                    {/* NÚT LƯU DASHBOARD NỔI BẬT THEO TASK 03C.2 */}
                    <button
                      type="button"
                      className="ai-btn-save-dashboard"
                      onClick={handleOpenSaveModal}
                      title="Lưu các biểu đồ đã chọn vào cơ sở dữ liệu vĩnh viễn"
                    >
                      <Save size={15} />
                      <span>{currentDashboardId ? "💾 Lưu thay đổi" : "💾 Lưu Dashboard"}</span>
                    </button>
                  </div>
                </div>
              )}

              {/* THANH CHAT ĐIỀU CHỈNH BẢN NHÁP TRỰC TIẾP TẠI BƯỚC 4 */}
              <div className="ai-step4-refine-box">
                <form className="ai-step4-chat-bar" onSubmit={handleRefineInStep4}>
                  <Sparkles size={16} color="#6366f1" />
                  <input
                    type="text"
                    className="ai-step4-input"
                    placeholder="Yêu cầu tinh chỉnh (ví dụ: 'Đổi biểu đồ cột sang tròn', 'Chỉ xem sinh viên đạt')..."
                    value={step4Input}
                    onChange={(e) => setStep4Input(e.target.value)}
                    disabled={isAiReplying}
                  />
                  <button
                    type="submit"
                    className="ai-chat-send-btn"
                    disabled={isAiReplying || !step4Input.trim()}
                    style={{ padding: "0.5rem 1rem", fontSize: "0.85rem" }}
                  >
                    <Send size={13} />
                    <span>Điều chỉnh</span>
                  </button>
                </form>
              </div>

              {/* LƯỚI BIỂU ĐỒ SỐ LIỆU THẬT TỪ BACKEND AGGREGATION */}
              <div className="ai-chart-grid">
                {dashboardDraft.recommendedCharts.map((chart) => {
                  const isSelected = selectedChartIds.has(chart.chartId);
                  const isUpdating = updatingChartId === chart.chartId;

                  return (
                    <div
                      key={chart.chartId}
                      className={`ai-chart-card ${isSelected ? "selected" : ""}`}
                    >
                      <div className="ai-chart-card-top">
                        <div style={{ flex: 1 }}>
                          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.35rem" }}>
                            <span className="ai-chart-type-tag">
                              {chart.chartType === "bar" && <BarChart3 size={12} />}
                              {chart.chartType === "donut" && <PieChart size={12} />}
                              {chart.chartType === "line" && <LineChart size={12} />}
                              {chart.chartType === "scatter" && <ScatterChart size={12} />}
                              {chart.chartType === "kpi_card" && <Layers size={12} />}
                              {chart.chartType}
                            </span>
                            {chart.filter && chart.filter !== "none" && (
                              <span className="ai-chart-filter-tag">
                                Lọc: {chart.filter === "passed_only" ? "Đạt" : chart.filter}
                              </span>
                            )}
                          </div>
                          <h4>{chart.title}</h4>
                        </div>

                        {/* NÚT CHUYỂN ĐỔI LOẠI BIỂU ĐỒ TƯƠNG THÍCH */}
                        <div className="ai-chart-type-switcher">
                          <button
                            type="button"
                            className={`ai-type-pill ${chart.chartType === "bar" ? "active" : ""}`}
                            onClick={() => handleSwitchChartType(chart, "bar")}
                            title="Đổi sang biểu đồ Cột"
                            disabled={isUpdating}
                          >
                            Cột
                          </button>
                          <button
                            type="button"
                            className={`ai-type-pill ${chart.chartType === "donut" ? "active" : ""}`}
                            onClick={() => handleSwitchChartType(chart, "donut")}
                            title="Đổi sang biểu đồ Donut/Tròn"
                            disabled={isUpdating}
                          >
                            Tròn
                          </button>
                          <button
                            type="button"
                            className={`ai-type-pill ${chart.chartType === "kpi_card" ? "active" : ""}`}
                            onClick={() => handleSwitchChartType(chart, "kpi_card")}
                            title="Đổi sang Thẻ KPI"
                            disabled={isUpdating}
                          >
                            KPI
                          </button>
                          <button
                            type="button"
                            className={`ai-type-pill ${chart.chartType === "tableEx" || chart.chartType === "table" ? "active" : ""}`}
                            onClick={() => handleSwitchChartType(chart, "tableEx")}
                            title="Đổi sang Bảng chi tiết"
                            disabled={isUpdating}
                          >
                            Bảng
                          </button>
                        </div>
                      </div>

                      <p className="ai-chart-reasoning">
                        <strong>Lý do chọn:</strong> {chart.reasoning}
                      </p>

                      {/* NÚT CHỌN BIỂU ĐỒ HOẠT ĐỘNG THẬT */}
                      <button
                        type="button"
                        className={`ai-select-chart-btn ${isSelected ? "selected" : ""}`}
                        onClick={() => toggleChartSelection(chart.chartId)}
                      >
                        {isSelected ? (
                          <>
                            <CheckCircle2 size={16} color="#ffffff" />
                            <span>Đã chọn vào Dashboard</span>
                          </>
                        ) : (
                          <>
                            <span style={{ fontSize: "1.1rem", lineHeight: 1 }}>+</span>
                            <span>Chọn biểu đồ này</span>
                          </>
                        )}
                      </button>

                      {/* KHUNG HIỂN THỊ SỐ LIỆU THẬT */}
                      <div className="ai-real-chart-visual-box">
                        {isUpdating ? (
                          <div className="ai-chart-updating-loader">
                            <Sparkles size={18} className="ai-spin" />
                            <span>Đang tính toán lại số liệu...</span>
                          </div>
                        ) : (
                          renderRealChartContent(chart)
                        )}
                      </div>

                      {/* CHÚ THÍCH NGHIỆP VỤ & CỠ MẪU THẬT */}
                      <div className="ai-chart-meta-footer">
                        <div className="ai-chart-meta-row">
                          <span className="ai-sample-badge">
                            N = {chart.realData?.sampleSize ?? 0} {chart.realData?.unit || "mẫu"}
                          </span>
                          {chart.realData?.nullCount > 0 && (
                            <span className="ai-null-badge">
                              Loại {chart.realData.nullCount} null
                            </span>
                          )}
                          <span className="ai-source-name-badge">
                            {sourceDescriptor?.sourceName || datasetProfile?.name || "LMS DW"}
                          </span>
                        </div>

                        {chart.realData?.semanticsNote && (
                          <div className="ai-semantics-note">
                            <Info size={12} style={{ flexShrink: 0, marginTop: "2px" }} />
                            <span>{chart.realData.semanticsNote}</span>
                          </div>
                        )}

                        <div className="ai-axis-legend">
                          <span>Trục X: <strong>{chart.xAxis}</strong></span>
                          <span>Trục Y: <strong>{chart.yAxis} ({chart.aggregation})</strong></span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* 7. TASK 04A: POWER BI REAL REPORT ENGINE (TẠO BÁO CÁO POWER BI THẬT) */}
              <div className="ai-pbi-section ai-pbi-real-engine">
                <div className="ai-pbi-info">
                  <div className="ai-pbi-icon-box real-pbi">
                    <Zap size={22} color="#f59e0b" />
                  </div>
                  <div>
                    <h4 style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                      <span>Động Cơ Tạo Báo Cáo Power BI Thật</span>
                      <span className="ai-pbi-tag-active">TASK 04A Engine</span>
                    </h4>
                    <p>
                      Sản phẩm cuối cùng là Power BI Project thật (PBIP / PBIR / TMDL) hoạt động độc lập. AI thiết kế Semantic Model tự động với các chỉ số DAX Measures, bảng quan hệ Star-Schema và cấu trúc Visual PBIR theo chuẩn Microsoft Fabric / Power BI Desktop.
                    </p>
                  </div>
                </div>

                <div className="ai-pbi-actions-group">
                  <button
                    type="button"
                    className="ai-pbi-generate-btn"
                    onClick={handleCreateRealPowerBiProject}
                    disabled={isGeneratingPbi}
                  >
                    {isGeneratingPbi ? (
                      <>
                        <Sparkles size={16} className="ai-spin" />
                        <span>Đang thiết kế & sinh PBIP/TMDL...</span>
                      </>
                    ) : (
                      <>
                        <Zap size={16} />
                        <span>⚡ Tạo Power BI Project Thật (.pbip)</span>
                      </>
                    )}
                  </button>

                  <button
                    type="button"
                    className="ai-btn-secondary"
                    id="btn-verify-fabric-engine"
                    disabled={isVerifyingFabric}
                    onClick={handleVerifyFabricAccessLive}
                    title="Xác minh quyền Fabric và kiểm tra Fabric Trial Capacity ở chế độ Read-Only"
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: "0.4rem",
                      background: "#f0fdf4",
                      color: "#166534",
                      border: "1px solid #bbf7d0",
                      borderRadius: "6px",
                      padding: "0.55rem 1rem",
                      fontSize: "0.875rem",
                      fontWeight: 600,
                      cursor: isVerifyingFabric ? "not-allowed" : "pointer",
                    }}
                  >
                    {isVerifyingFabric ? (
                      <>
                        <Sparkles size={16} className="ai-spin" />
                        <span>Đang kiểm tra Fabric API...</span>
                      </>
                    ) : (
                      <>
                        <ShieldCheck size={16} color="#16a34a" />
                        <span>🔍 Kiểm tra Microsoft Fabric (Read-Only)</span>
                      </>
                    )}
                  </button>
                </div>
              </div>

              {/* BÁO LỖI NẾU CÓ */}
              {pbiError && (
                <div className="ai-pbi-error-box">
                  <AlertCircle size={18} color="#ef4444" style={{ flexShrink: 0 }} />
                  <span>{pbiError}</span>
                </div>
              )}

              {/* KẾT QUẢ TẠO DỰ ÁN POWER BI THẬT */}
              {pbiProjectResult && (
                <div className="ai-pbi-result-card">
                  <div className="ai-pbi-result-header">
                    <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                      <CheckCircle2 size={20} color="#10b981" />
                      <h4 style={{ margin: 0, color: "#1e293b", fontSize: "0.95rem" }}>
                        Báo Cáo Power BI Thật Đã Khởi Tạo Hoàn Chỉnh
                      </h4>
                    </div>
                    <span className="ai-pbi-badge-success">
                      {pbiProjectResult.totalFilesCount || 19} files hợp lệ (PBIP + PBIR + TMDL)
                    </span>
                  </div>

                  <div className="ai-pbi-result-body">
                    <div className="ai-pbi-meta-grid">
                      <div className="ai-pbi-meta-item">
                        <span className="ai-label">Tên dự án:</span>
                        <span className="ai-val font-mono">{pbiProjectResult.projectName}.pbip</span>
                      </div>
                      <div className="ai-pbi-meta-item">
                        <span className="ai-label">Đường dẫn tệp cục bộ:</span>
                        <span className="ai-val font-mono" style={{ fontSize: "0.75rem", wordBreak: "break-all" }}>
                          {pbiProjectResult.pbipFilePath}
                        </span>
                      </div>
                      <div className="ai-pbi-meta-item">
                        <span className="ai-label">Tiêu đề báo cáo:</span>
                        <span className="ai-val">{pbiProjectResult.reportTitle}</span>
                      </div>
                      <div className="ai-pbi-meta-item">
                        <span className="ai-label">Cấu trúc dữ liệu:</span>
                        <span className="ai-val">TMDL (Tabular Model Definition Language)</span>
                      </div>
                    </div>

                    <div className="ai-pbi-measures-list">
                      <div className="ai-label" style={{ marginBottom: "0.4rem", fontWeight: 600, color: "#334155" }}>
                        DAX Measures đã được backend chuẩn hóa & xác thực:
                      </div>
                      <div style={{ display: "flex", flexWrap: "wrap", gap: "0.4rem" }}>
                        {(pbiProjectResult.measures || []).map((m, idx) => (
                          <div key={idx} className="ai-pbi-measure-chip" title={m.description || m.dax}>
                            <strong>{m.name}:</strong> <code>{m.dax}</code>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* HƯỚNG DẪN MỞ BẰNG POWER BI DESKTOP */}
                    <div style={{
                      marginTop: "1rem",
                      padding: "0.75rem 1rem",
                      background: "#eff6ff",
                      borderRadius: "8px",
                      border: "1px solid #bfdbfe",
                      fontSize: "0.825rem",
                      color: "#1e40af",
                      lineHeight: 1.5
                    }}>
                      <div style={{ fontWeight: 700, marginBottom: "0.25rem", display: "flex", alignItems: "center", gap: "0.35rem" }}>
                        <Info size={15} />
                        <span>Hướng dẫn mở trong Power BI Desktop:</span>
                      </div>
                      <ol style={{ margin: "0.25rem 0 0 1.25rem", padding: 0 }}>
                        <li>Nhấp vào nút <strong>"Tải Gói Dự Án ZIP"</strong> bên dưới để tải toàn bộ tệp dự án về máy.</li>
                        <li>Giải nén thư mục ZIP (chứa tệp <code>.pbip</code>, thư mục <code>.SemanticModel</code> và <code>.Report</code>).</li>
                        <li>Nhấp đúp chuột vào tệp <strong><code>{pbiProjectResult.projectName}.pbip</code></strong> để mở trực tiếp trong Power BI Desktop.</li>
                        <li>Toàn bộ dữ liệu được kết xuất tự thân qua Power Query M Partition, báo cáo tự render đầy đủ không lỗi.</li>
                      </ol>
                    </div>

                    <div style={{ marginTop: "1.25rem", display: "flex", justifyContent: "flex-end", gap: "0.75rem", flexWrap: "wrap", alignItems: "center" }}>
                      {/* NÚT TẢI GÓI ZIP DỰ ÁN */}
                      <button
                        type="button"
                        className="ai-btn-download-zip"
                        disabled={isDownloadingZip}
                        onClick={() => handleDownloadPbiZip(pbiProjectResult.projectName)}
                        title="Tải về gói nén ZIP chứa đầy đủ file .pbip và thư mục SemanticModel, Report"
                      >
                        {isDownloadingZip ? (
                          <>
                            <Sparkles size={16} className="ai-spin" />
                            <span>Đang đóng gói ZIP...</span>
                          </>
                        ) : (
                          <>
                            <Download size={16} />
                            <span>📥 Tải Gói Dự Án ZIP (Đầy đủ PBIP, SemanticModel, Report)</span>
                          </>
                        )}
                      </button>

                      {/* TASK 05.9: NÚT KIỂM TRA QUYỀN FABRIC QUA MSAL POPUP (PKCE - AN TOÀN VỚI SECURITY DEFAULTS) */}
                      <button
                        type="button"
                        className="ai-btn-secondary"
                        disabled={isVerifyingFabric}
                        onClick={handleVerifyFabricAccessLive}
                        title="Xác minh quyền Fabric và kiểm tra Fabric Trial Capacity ở chế độ Read-Only"
                      >
                        {isVerifyingFabric ? (
                          <>
                            <Sparkles size={16} className="ai-spin" />
                            <span>Đang kiểm tra Fabric API...</span>
                          </>
                        ) : (
                          <>
                            <ShieldCheck size={16} />
                            <span>🔍 Kiểm tra Microsoft Fabric (Read-Only)</span>
                          </>
                        )}
                      </button>

                      <button
                        type="button"
                        className="ai-btn-publish-pbi"
                        onClick={handlePreviewPublish}
                      >
                        <ShieldCheck size={16} />
                        <span>Giảng viên Duyệt & Xuất bản Power BI</span>
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* TASK 05.9: THÔNG BÁO KẾT QUẢ XÁC MINH FABRIC READ-ONLY */}
              {fabricVerificationResult && (
                <div
                  className="ai-pbi-publish-result-banner"
                  style={{
                    backgroundColor: fabricVerificationResult.success ? "#f0fdf4" : "#fef2f2",
                    borderColor: fabricVerificationResult.success ? "#bbf7d0" : "#fecaca",
                    marginBottom: "1rem",
                  }}
                >
                  <div style={{ display: "flex", alignItems: "flex-start", gap: "0.75rem" }}>
                    <Info
                      size={20}
                      color={fabricVerificationResult.success ? "#16a34a" : "#dc2626"}
                      style={{ flexShrink: 0, marginTop: "2px" }}
                    />
                    <div style={{ flex: 1 }}>
                      <h5
                        style={{
                          margin: "0 0 0.25rem 0",
                          color: fabricVerificationResult.success ? "#14532d" : "#7f1d1d",
                          fontSize: "0.95rem",
                        }}
                      >
                        {fabricVerificationResult.success
                          ? `Trạng thái Fabric: ${fabricVerificationResult.deploymentReadiness?.isReadyForAutoPublish ? "READY_FOR_LIVE_PUBLISH" : "VERIFIED"}`
                          : "Lỗi kiểm tra Microsoft Fabric"}
                      </h5>
                      <p style={{ margin: 0, fontSize: "0.825rem", color: "#334155", lineHeight: 1.5 }}>
                        {fabricVerificationResult.capacityDiagnosis?.fabricCapacityStatus ||
                          fabricVerificationResult.message ||
                          "Đã hoàn tất kiểm tra quyền."}
                      </p>
                      {fabricVerificationResult.workspaceDiagnosis && (
                        <div
                          style={{
                            marginTop: "0.5rem",
                            fontSize: "0.8rem",
                            display: "grid",
                            gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
                            gap: "0.4rem",
                            background: "rgba(255,255,255,0.6)",
                            padding: "0.5rem",
                            borderRadius: "6px",
                          }}
                        >
                          <div><strong>Workspace:</strong> {fabricVerificationResult.workspaceName}</div>
                          <div><strong>Capacity ID:</strong> {fabricVerificationResult.workspaceDiagnosis?.capacityId || "Trial Active"}</div>
                          <div><strong>Vai trò:</strong> {fabricVerificationResult.workspaceDiagnosis?.userRole || "Admin"}</div>
                          <div><strong>Số Items:</strong> {fabricVerificationResult.workspaceDiagnosis?.existingFabricItemsCount || fabricVerificationResult.workspaceDiagnosis?.existingReportsCount || 0}</div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* THÔNG BÁO KẾT QUẢ XUẤT BẢN */}
              {pbiPublishResult && (
                <div className="ai-pbi-publish-result-banner">
                  <div style={{ display: "flex", alignItems: "flex-start", gap: "0.75rem" }}>
                    <Info size={20} color="#3b82f6" style={{ flexShrink: 0, marginTop: "2px" }} />
                    <div>
                      <h5 style={{ margin: "0 0 0.25rem 0", color: "#1e3a8a", fontSize: "0.95rem" }}>
                        Trạng thái Xuất bản: {pbiPublishResult.status}
                      </h5>
                      <p style={{ margin: 0, fontSize: "0.825rem", color: "#475569", lineHeight: 1.5 }}>
                        {pbiPublishResult.message}
                      </p>
                      {pbiPublishResult.nextAction && (
                        <p style={{ margin: "0.5rem 0 0 0", fontSize: "0.8rem", color: "#64748b", fontStyle: "italic" }}>
                          💡 <strong>Hành động kế tiếp:</strong> {pbiPublishResult.nextAction}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              )}

              </div></details>
              <div className={reportPlan ? "ai-legacy-footer" : "ai-studio-footer"} style={{ marginTop: "1.5rem", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <button
                  type="button"
                  className="ai-btn-secondary"
                  onClick={() => setCurrentStep(3)}
                >
                  <ArrowLeft size={14} style={{ marginRight: "0.3rem" }} />
                  Quay lại Chat
                </button>

                <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
                  <div className="ai-draft-notice-badge">
                    <CheckCircle2 size={15} color="#059669" />
                    <span>
                      {currentDashboardId
                        ? `Đang mở Dashboard: "${currentDashboardTitle}" (${selectedChartIds.size} biểu đồ).`
                        : `Đã chọn ${selectedChartIds.size} biểu đồ. Sẵn sàng lưu vào CSDL vĩnh viễn.`}
                    </span>
                  </div>

                  <button
                    type="button"
                    className="ai-btn-save-dashboard"
                    onClick={handleOpenSaveModal}
                  >
                    <Save size={15} />
                    <span>{currentDashboardId ? "Lưu thay đổi" : "Lưu Dashboard"}</span>
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* ================================================================
              CHẾ ĐỘ 2: THƯ VIỆN DASHBOARD CỦA TÔI (MY DASHBOARDS LIBRARY)
          ================================================================ */}
          {activeView === "my_dashboards" && (
            <div className="ai-my-dashboards-view">
              <div className="ai-my-dashboards-topbar">
                <div>
                  <h3>
                    <FolderHeart size={20} color="#4f46e5" />
                    <span>Báo cáo của tôi</span>
                  </h3>
                  <p>Quản lý các bảng phân tích dữ liệu đã được lưu trữ vĩnh viễn trên máy chủ LMS</p>
                </div>

                <button
                  type="button"
                  className="ai-btn-primary"
                  onClick={() => {
                    setActiveView("studio");
                    setCurrentStep(1);
                  }}
                >
                  <Plus size={15} style={{ marginRight: "0.3rem" }} />
                  Tạo báo cáo mới
                </button>
              </div>

              {dashboardsError && (
                <div style={{ padding: "0.75rem 1rem", background: "#fef2f2", border: "1px solid #fecaca", borderRadius: "10px", color: "#991b1b", fontSize: "0.85rem", display: "flex", alignItems: "center", gap: "0.5rem" }}>
                  <AlertCircle size={16} />
                  <span>{dashboardsError}</span>
                  <button
                    type="button"
                    className="ai-btn-small"
                    style={{ marginLeft: "auto" }}
                    onClick={loadSavedDashboards}
                  >
                    Thử lại
                  </button>
                </div>
              )}

              {loadingDashboards ? (
                <div className="ai-empty-state-card">
                  <Sparkles size={32} className="ai-spin" color="#4f46e5" />
                  <h4>Đang tải danh sách dashboard...</h4>
                  <p>Vui lòng đợi trong giây lát</p>
                </div>
              ) : savedDashboards.length === 0 ? (
                <div className="ai-empty-state-card">
                  <div className="ai-empty-state-icon">
                    <Layers size={28} />
                  </div>
                  <h4>Bạn chưa có Dashboard nào được lưu</h4>
                  <p>
                    Hãy sử dụng AI Studio để phân tích tệp Excel/CSV hoặc dữ liệu LMS Data Warehouse và lưu lại bảng phân tích đầu tiên của bạn.
                  </p>
                  <button
                    type="button"
                    className="ai-btn-primary"
                    style={{ marginTop: "0.5rem" }}
                    onClick={() => {
                      setActiveView("studio");
                      setCurrentStep(1);
                    }}
                  >
                    <Sparkles size={15} style={{ marginRight: "0.3rem" }} />
                    Bắt đầu thiết kế với AI
                  </button>
                </div>
              ) : (
                <div className="ai-dashboards-grid">
                  {savedDashboards.map((dash) => {
                    const isBusy = actionInProgressId === dash.dashboardId;
                    const isExcel = /file|excel|csv/i.test(dash.sourceType || "");
                    let meta = null;
                    try {
                      meta = typeof dash.metadataJson === "string" ? JSON.parse(dash.metadataJson) : dash.metadataJson;
                    } catch (_e) { /* Optional browser capability or cached state is unavailable; retain the fallback. */ }
                    const pbiName = meta?.projectName;

                    const createdDate = dash.createdAt
                      ? new Date(dash.createdAt).toLocaleDateString("vi-VN", {
                          day: "2-digit",
                          month: "2-digit",
                          year: "numeric",
                          hour: "2-digit",
                          minute: "2-digit",
                        })
                      : "—";

                    return (
                      <div key={dash.dashboardId} className="ai-dashboard-card">
                        <div className="ai-dash-card-header">
                          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                            <div style={{ display: "flex", alignItems: "center", gap: "0.4rem" }}>
                              <span className={`ai-dash-source-badge ${isExcel ? "excel" : "lms"}`}>
                                {isExcel ? (
                                  <>
                                    <FileSpreadsheet size={12} />
                                    <span>Excel / CSV</span>
                                  </>
                                ) : (
                                  <>
                                    <Database size={12} />
                                    <span>LMS DW</span>
                                  </>
                                )}
                              </span>
                              {pbiName && (
                                <span style={{
                                  fontSize: "0.7rem",
                                  fontWeight: 700,
                                  background: "#fef3c7",
                                  color: "#b45309",
                                  border: "1px solid #fde68a",
                                  padding: "0.15rem 0.45rem",
                                  borderRadius: "4px",
                                  display: "flex",
                                  alignItems: "center",
                                  gap: "0.25rem"
                                }}>
                                  <Zap size={10} color="#f59e0b" />
                                  {meta?.isPowerBiLive ? "Đã xuất bản" : "Đã chuẩn bị"}
                                </span>
                              )}
                            </div>
                            <span style={{ fontSize: "0.75rem", color: "#64748b", fontWeight: "600" }}>
                              {dash.chartCount || 0} biểu đồ
                            </span>
                          </div>

                          <h4 className="ai-dash-card-title">{dash.title}</h4>
                          <p className="ai-dash-card-desc">
                            {dash.description || "Không có mô tả bổ sung."}
                          </p>
                        </div>

                        <div className="ai-dash-card-meta">
                          <div className="ai-dash-card-meta-row">
                            <span>Mã nguồn:</span>
                            <strong style={{ color: "#334155" }}>
                              {dash.courseKey ? `Môn học #${dash.courseKey}` : dash.sourceId || "Tệp dữ liệu"}
                            </strong>
                          </div>
                          {pbiName && (
                            <div className="ai-dash-card-meta-row">
                              <span>Dự án Power BI:</span>
                              <strong className="font-mono" style={{ color: "#b45309", fontSize: "0.75rem" }}>
                                {pbiName}.pbip
                              </strong>
                            </div>
                          )}
                          <div className="ai-dash-card-meta-row">
                            <span>Lưu lúc:</span>
                            <span>{createdDate}</span>
                          </div>
                        </div>

                        <div className="ai-dash-card-actions">
                          <button
                            type="button"
                            className="ai-dash-action-btn primary"
                            disabled={isBusy}
                            onClick={() => handleOpenSavedDashboard(dash)}
                            title="Mở Dashboard và xem số liệu sống"
                          >
                            <Eye size={13} />
                            <span>Mở</span>
                          </button>

                          <button
                            type="button"
                            className="ai-dash-action-btn"
                            disabled={isBusy}
                            onClick={() => handleEditSavedDashboardInChat(dash)}
                            title="Tiếp tục chỉnh sửa với trợ lý AI"
                          >
                            <Edit3 size={13} />
                            <span>Sửa</span>
                          </button>

                          {/* TẢI ZIP TRỰC TIẾP TỪ THƯ VIỆN NẾU ĐÃ CÓ POWER BI PROJECT */}
                          {pbiName && (
                            <button
                              type="button"
                              className="ai-dash-action-btn"
                              style={{ background: "#fef3c7", color: "#b45309", borderColor: "#fde68a", fontWeight: 700 }}
                              disabled={isBusy}
                              onClick={() => handleDownloadPbiZip(pbiName)}
                              title={`Tải gói ZIP dự án Power BI: ${pbiName}`}
                            >
                              <Download size={13} />
                              <span>Tải ZIP</span>
                            </button>
                          )}

                          <button
                            type="button"
                            className="ai-dash-action-btn"
                            disabled={isBusy}
                            onClick={() => handleRefreshDashboard(dash)}
                            title="Làm mới số liệu từ kho dữ liệu"
                          >
                            <RefreshCw size={13} className={isBusy ? "ai-spin" : ""} />
                            <span>Làm mới</span>
                          </button>

                          <button
                            type="button"
                            className="ai-dash-action-btn"
                            disabled={isBusy}
                            onClick={() => handleDuplicateDashboard(dash)}
                            title="Tạo bản sao của dashboard này"
                          >
                            <Copy size={13} />
                            <span>Nhân bản</span>
                          </button>

                          <button
                            type="button"
                            className="ai-dash-action-btn danger"
                            disabled={isBusy}
                            onClick={() => setDeleteConfirmDashboard(dash)}
                            title="Xóa dashboard vĩnh viễn"
                            style={{ marginLeft: "auto" }}
                          >
                            <Trash2 size={13} />
                            <span>Xóa</span>
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>

        {/* 5. FOOTER */}
        <footer className="ai-studio-footer">
          <div style={{ fontSize: "0.8rem", color: "#64748b", display: "flex", alignItems: "center", gap: "0.4rem" }}>
            <ShieldCheck size={14} color="#059669" />
            <span>AI Dashboard Studio LMS • Dữ liệu sinh viên được bảo vệ tuyệt đối</span>
          </div>

          <div style={{ display: "flex", gap: "0.5rem" }}>
            {activeView === "studio" && (
              <button type="button" className="ai-btn-secondary" onClick={handleReset}>
                <RotateCcw size={13} style={{ marginRight: "0.3rem" }} />
                Làm mới phiên
              </button>
            )}
            <button type="button" className="ai-btn-secondary" onClick={onClose}>
              Đóng
            </button>
          </div>
        </footer>

        {/* ================================================================
            MODAL 1: HỘP THOẠI ĐẶT TÊN & LƯU DASHBOARD
        ================================================================ */}
        {saveModalOpen && (
          <div className="ai-save-modal-overlay" onClick={() => !isSaving && setSaveModalOpen(false)}>
            <div className="ai-save-modal-card" onClick={(e) => e.stopPropagation()}>
              <div className="ai-save-modal-header">
                <h3>
                  <Save size={18} />
                  <span>{saveForm.saveMode === "update" ? "Cập nhật Dashboard" : "Lưu Dashboard Mới"}</span>
                </h3>
                <button
                  type="button"
                  className="ai-studio-close-btn"
                  onClick={() => !isSaving && setSaveModalOpen(false)}
                  disabled={isSaving}
                >
                  <X size={18} />
                </button>
              </div>

              <form onSubmit={handleConfirmSaveDashboard}>
                <div className="ai-save-modal-body">
                  <div className="ai-form-field">
                    <label>
                      Tên Dashboard <span className="required">*</span>
                    </label>
                    <input
                      type="text"
                      className="ai-form-input"
                      placeholder="Ví dụ: Phân tích Điểm Quá trình & Xếp loại Học kỳ 1"
                      value={saveForm.title}
                      onChange={(e) => setSaveForm({ ...saveForm, title: e.target.value })}
                      required
                      autoFocus
                      disabled={isSaving}
                    />
                  </div>

                  <div className="ai-form-field">
                    <label>Mô tả Dashboard (tùy chọn)</label>
                    <textarea
                      className="ai-form-textarea"
                      rows={3}
                      placeholder="Mô tả mục tiêu phân tích hoặc lưu ý học vụ..."
                      value={saveForm.description}
                      onChange={(e) => setSaveForm({ ...saveForm, description: e.target.value })}
                      disabled={isSaving}
                    />
                  </div>

                  {/* CHỌN CHẾ ĐỘ LƯU NẾU ĐANG CÓ DASHBOARD HIỆN TẠI */}
                  {currentDashboardId && (
                    <div className="ai-form-field">
                      <label>Chế độ lưu</label>
                      <div className="ai-save-mode-selector">
                        <div
                          className={`ai-save-mode-option ${saveForm.saveMode === "update" ? "selected" : ""}`}
                          onClick={() => setSaveForm({ ...saveForm, saveMode: "update" })}
                        >
                          <CheckCircle2 size={15} color={saveForm.saveMode === "update" ? "#4f46e5" : "#94a3b8"} />
                          <div>
                            <div>Cập nhật hiện tại</div>
                            <div style={{ fontSize: "0.72rem", color: "#64748b", fontWeight: "400" }}>Ghi đè cấu hình cũ</div>
                          </div>
                        </div>

                        <div
                          className={`ai-save-mode-option ${saveForm.saveMode === "create" ? "selected" : ""}`}
                          onClick={() => setSaveForm({ ...saveForm, saveMode: "create" })}
                        >
                          <Plus size={15} color={saveForm.saveMode === "create" ? "#4f46e5" : "#94a3b8"} />
                          <div>
                            <div>Tạo bản mới</div>
                            <div style={{ fontSize: "0.72rem", color: "#64748b", fontWeight: "400" }}>Lưu thành dashboard riêng</div>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* TÓM TẮT THÔNG TIN LƯU */}
                  <div className="ai-save-summary-box">
                    <div className="ai-save-summary-row">
                      <span>Nguồn dữ liệu:</span>
                      <strong>
                        {sourceDescriptor?.sourceType === "lms" ? "LMS Data Warehouse" : "Tệp Excel / CSV"}
                      </strong>
                    </div>
                    <div className="ai-save-summary-row">
                      <span>Số biểu đồ đã chọn:</span>
                      <strong style={{ color: "#059669" }}>
                        {selectedChartIds.size} biểu đồ (chỉ lưu các biểu đồ được tick chọn)
                      </strong>
                    </div>
                    <div className="ai-save-summary-row">
                      <span>Bảo vệ quyền riêng tư:</span>
                      <span style={{ color: "#059669" }}>✓ Đã loại bỏ PII sinh viên</span>
                    </div>
                  </div>
                </div>

                <div className="ai-save-modal-footer">
                  <button
                    type="button"
                    className="ai-btn-secondary"
                    onClick={() => setSaveModalOpen(false)}
                    disabled={isSaving}
                  >
                    Hủy
                  </button>
                  <button
                    type="submit"
                    className="ai-btn-primary"
                    disabled={isSaving || !saveForm.title.trim() || selectedChartIds.size === 0}
                  >
                    {isSaving ? (
                      <>
                        <Sparkles size={14} className="ai-spin" />
                        <span>Đang lưu vào MySQL...</span>
                      </>
                    ) : (
                      <>
                        <Save size={14} />
                        <span>{saveForm.saveMode === "update" ? "Lưu thay đổi" : "Xác nhận Lưu"}</span>
                      </>
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* ================================================================
            MODAL 2: HỘP THOẠI XÁC NHẬN XÓA DASHBOARD AN TOÀN
        ================================================================ */}
        {deleteConfirmDashboard && (
          <div className="ai-save-modal-overlay" onClick={() => !isDeleting && setDeleteConfirmDashboard(null)}>
            <div className="ai-save-modal-card" style={{ maxWidth: "460px" }} onClick={(e) => e.stopPropagation()}>
              <div className="ai-save-modal-header" style={{ background: "linear-gradient(135deg, #b91c1c 0%, #dc2626 100%)" }}>
                <h3>
                  <Trash2 size={18} />
                  <span>Xác nhận Xóa Dashboard</span>
                </h3>
                <button
                  type="button"
                  className="ai-studio-close-btn"
                  onClick={() => !isDeleting && setDeleteConfirmDashboard(null)}
                  disabled={isDeleting}
                >
                  <X size={18} />
                </button>
              </div>

              <div className="ai-save-modal-body">
                <p style={{ margin: 0, fontSize: "0.9rem", color: "#1e293b", lineHeight: 1.5 }}>
                  Bạn có chắc chắn muốn xóa dashboard <strong>"{deleteConfirmDashboard.title}"</strong> không?
                </p>
                <div style={{ padding: "0.75rem", background: "#fef2f2", border: "1px solid #fecaca", borderRadius: "8px", fontSize: "0.8rem", color: "#991b1b" }}>
                  ⚠️ Toàn bộ cấu hình của {deleteConfirmDashboard.chartCount || 0} biểu đồ thuộc dashboard này sẽ bị xóa khỏi cơ sở dữ liệu và không thể hoàn tác.
                </div>
              </div>

              <div className="ai-save-modal-footer">
                <button
                  type="button"
                  className="ai-btn-secondary"
                  onClick={() => setDeleteConfirmDashboard(null)}
                  disabled={isDeleting}
                >
                  Hủy bỏ
                </button>
                <button
                  type="button"
                  className="ai-btn-primary"
                  style={{ background: "#dc2626", borderColor: "#dc2626" }}
                  onClick={handleConfirmDelete}
                  disabled={isDeleting}
                >
                  {isDeleting ? (
                    <>
                      <Sparkles size={14} className="ai-spin" />
                      <span>Đang xóa...</span>
                    </>
                  ) : (
                    <>
                      <Trash2 size={14} />
                      <span>Xóa vĩnh viễn</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* MODAL PHÊ DUYỆT CỦA GIẢNG VIÊN (TEACHER APPROVAL MODAL) */}
        {pbiApprovalModalOpen && (
          <div className="ai-modal-overlay">
            <div className="ai-confirm-dialog" style={{ maxWidth: "560px" }}>
              <div className="ai-confirm-header" style={{ borderBottom: "1px solid #e2e8f0", paddingBottom: "0.75rem", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                  <ShieldCheck size={22} color="#1e3a8a" />
                  <h4 style={{ margin: 0, color: "#1e293b", fontSize: "1.05rem" }}>
                    Phê duyệt Báo cáo Power BI của Giảng viên
                  </h4>
                </div>
                <button
                  type="button"
                  className="ai-modal-close-btn"
                  onClick={() => setPbiApprovalModalOpen(false)}
                >
                  <X size={18} />
                </button>
              </div>

              <div className="ai-confirm-body" style={{ padding: "1.25rem 0" }}>
                <p style={{ margin: "0 0 1rem 0", fontSize: "0.875rem", color: "#475569", lineHeight: 1.5 }}>
                  Báo cáo Power BI thật đã được tạo thành công với định dạng PBIP / PBIR / TMDL. Để xuất bản và cập nhật nhúng LMS, giảng viên vui lòng xác nhận nội dung:
                </p>

                <div style={{ background: "#f8fafc", padding: "0.85rem", borderRadius: "8px", border: "1px solid #e2e8f0", marginBottom: "1rem" }}>
                  <div style={{ fontSize: "0.825rem", color: "#1e293b", marginBottom: "0.35rem" }}>
                    <strong>Dự án:</strong> {pbiProjectResult?.projectName || "BangDiemLopHoc_AI_Generated"}
                  </div>
                  <div style={{ fontSize: "0.825rem", color: "#1e293b", marginBottom: "0.35rem" }}>
                    <strong>Quyền riêng tư:</strong> Phân quyền cấp giảng viên (0 PII, Không Public ra ngoài)
                  </div>
                  <div style={{ fontSize: "0.825rem", color: "#1e293b" }}>
                    <strong>Cơ chế xuất bản:</strong> Kiểm tra quyền Microsoft Entra & Power BI Service API
                  </div>
                </div>

                <label style={{ display: "flex", alignItems: "flex-start", gap: "0.6rem", cursor: "pointer", fontSize: "0.85rem", color: "#1e293b", fontWeight: 500 }}>
                  <input
                    type="checkbox"
                    style={{ marginTop: "3px" }}
                    checked={teacherApprovalChecked}
                    onChange={(e) => setTeacherApprovalChecked(e.target.checked)}
                  />
                  <span>
                    Tôi đã kiểm tra cấu trúc báo cáo, xác nhận tính chính xác của các chỉ số và đồng ý phê duyệt xuất bản lên Power BI Service.
                  </span>
                </label>
              </div>

              <div className="ai-confirm-footer" style={{ borderTop: "1px solid #e2e8f0", paddingTop: "0.75rem", display: "flex", justifyContent: "flex-end", gap: "0.5rem" }}>
                <button
                  type="button"
                  className="ai-btn-secondary"
                  onClick={() => setPbiApprovalModalOpen(false)}
                >
                  Hủy bỏ
                </button>
                <button
                  type="button"
                  className="ai-btn-primary"
                  disabled={!teacherApprovalChecked || isPublishingPbi}
                  onClick={handleConfirmPublishPowerBi}
                >
                  {isPublishingPbi ? (
                    <>
                      <Sparkles size={16} className="ai-spin" />
                      <span>Đang kiểm tra quyền & xuất bản...</span>
                    </>
                  ) : (
                    <>
                      <ShieldCheck size={16} />
                      <span>Xác nhận & Xuất bản</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
