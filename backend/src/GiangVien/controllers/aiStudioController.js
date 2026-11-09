import fs from "fs";
import path from "path";
import archiver from "archiver";
import pool from "../../config/database.js";
import {
  parseFileBuffer,
  parseMultiSheetFileBuffer,
  generateDemoGradeTemplateBuffer,
  generateMultiSheetDemoWorkbookBuffer,
  MAX_FILE_SIZE_BYTES,
  getCachedSource,
  verifySourceAccess,
} from "../services/excelParserService.js";
import {
  getAuthorizedCourses,
  getCourseAggregatedProfile,
  getCourseMultiTableWarehouseProfile,
} from "../services/lmsDataService.js";
import { chatAndRecommendCharts } from "../services/aiStudioGeminiService.js";
import { computeChartRealData } from "../services/chartAggregationService.js";
import {
  saveDashboard,
  ensureSourcePersisted,
  listTeacherDashboards,
  getDashboardDetail,
  deleteDashboard,
  duplicateDashboard,
} from "../services/aiDashboardStorageService.js";
import {
  getEnvironmentCapabilities,
  generateReportSpecWithGemini,
  modifyReportSpecWithGemini,
  validateReportSpec,
  buildAndPersistPowerBiProject,
  executePublishWorkflow,
  computeReportPlanDataPreview,
  validateAndApproveReportPlan,
  auditPublishAndEmbedConditions,
  generateBenchmarkTestProject,
  evaluateUserOwnsDataDeploymentOptions,
  parseAndVerifyJwtClaimsSafely,
  verifyUserWorkspaceAccessReadOnly,
  buildPushDatasetPayloadFromPlan,
  executeDelegatedPushPublish,
  packagePbipToFabricItemDefinition,
  deployFabricPbipProject,
  updateFabricReportDefinition,
  listFabricWorkspaceItems,
  isValidGuid,
  validateFabricReportDefinition,
} from "../services/powerBiAuthoringService.js";
import { getGeminiCooldownStatus } from "../services/geminiCooldownService.js";
import { getGroqCooldownStatus } from "../services/groqStudioService.js";
import { diagnoseCloudModel, readCloudDefinition, processExistingModel, observeModelProcessing } from "../services/powerBiDataVerificationService.js";
import { verifyExistingReportAccess } from '../services/powerBiEmbedAccessService.js';
import { createStudioDataset, computeGeneralPreview } from '../services/studioDataContract.js';
import { prepareStudioDeployment, executeStudioDeployment } from '../services/studioFabricPipeline.js';

export async function handleGeneralStudioDeployment(req,res) {
  try {
    const {projectName,workspaceId,approval,dryRun=true}=req.body || {};
    const projectDir='B:\\DoAnChuyenNghanh\\powerbi';
    const args={projectName,workspaceId,projectDir,owner:req.teacher};
    if(dryRun!==false) return res.json({success:true,deployment:prepareStudioDeployment(args)});
    const result=await executeStudioDeployment({...args,approval,dryRun,
      fabricToken:req.headers['x-fabric-token'],powerBiToken:req.headers['x-powerbi-token']});
    if(result.success && result.cloudDataVerified && result.reportAccessVerified) {
      const [found]=await pool.query(`SELECT Dashboard_ID,Metadata_Json FROM app_ai_dashboard WHERE User_Key=? AND Teacher_Moodle_ID=? AND JSON_UNQUOTE(JSON_EXTRACT(Metadata_Json,'$.projectName'))=? LIMIT 1`,[req.teacher.userKey,req.teacher.moodleUserId,projectName]);
      if(!found.length) throw new Error('OWN_LIBRARY_PROJECT_NOT_FOUND');
      const previous=typeof found[0].Metadata_Json==='string'?JSON.parse(found[0].Metadata_Json):found[0].Metadata_Json;
      const meta={...previous,isPowerBiLive:true,powerBiReportId:result.reportId,semanticModelId:result.semanticModelId,powerBiWorkspaceId:workspaceId,
        powerBiEmbedUrl:result.embedUrl,datasetId:result.datasetId,cloudDataVerified:true,reportAccessVerified:true,
        reportRendered:false,embedVerified:false,status:'CLOUD_DATA_VERIFIED_RENDER_PENDING'};
      await pool.query('UPDATE app_ai_dashboard SET Metadata_Json=?,Updated_At=NOW() WHERE Dashboard_ID=? AND User_Key=? AND Teacher_Moodle_ID=?',[JSON.stringify(meta),found[0].Dashboard_ID,req.teacher.userKey,req.teacher.moodleUserId]);
      result.dashboardId=found[0].Dashboard_ID;result.metadata=meta;
    }
    return res.json({success:true,deployment:result});
  } catch(error) {return res.status(409).json({success:false,message:error.message});}
}
export async function handleDiagnoseCloudData(req, res) {
  try {
    const { workspaceId, semanticModelId, reportId, tableName, measureNames = [], expected = {}, includeDefinition = false } = req.body || {};
    if (!tableName || !Array.isArray(measureNames) || measureNames.length > 100) return res.status(400).json({ success: false, message: 'Thiếu bảng hoặc danh sách measures không hợp lệ.' });
    const powerBiToken = req.headers['x-powerbi-token'];
    const fabricToken = req.headers['x-fabric-token'];
    const result = await diagnoseCloudModel({ workspaceId, semanticModelId, reportId, tableName, measureNames, expected, powerBiToken, fabricToken });
    if (includeDefinition) result.definition = await readCloudDefinition({ workspaceId, semanticModelId, fabricToken });
    return res.json({ success: true, diagnostic: result });
  } catch (error) { return res.status(400).json({ success: false, message: error.message }); }
}

export async function handleVerifyExistingReport(req, res) {
  try {
    const { workspaceId, semanticModelId, reportId, projectName } = req.body || {};
    if (!/^[a-zA-Z0-9_-]+$/.test(projectName || '')) return res.status(400).json({ success: false, message: 'Tên dự án không hợp lệ.' });
    const access = await verifyExistingReportAccess({ workspaceId, semanticModelId, reportId, powerBiToken: req.headers['x-powerbi-token'] });
    if (!access.ok) return res.status(access.httpStatus === 401 || access.httpStatus === 403 ? access.httpStatus : 409).json({ success: false, message: `Không thể xác minh quyền xem report: ${access.code} (HTTP ${access.httpStatus ?? 'network'}).`, access });
    const meta = { isPowerBiLive: true, projectName, powerBiReportId: reportId, powerBiWorkspaceId: workspaceId,
      semanticModelId, powerBiEmbedUrl: access.embedUrl,
      status: 'REPORT_ACCESS_VERIFIED', reportAccessVerified: true, accessCheckedAt: new Date().toISOString(),
      reportRendered: false, embedVerified: false };
    const [existing] = await pool.query(`SELECT Dashboard_ID, Metadata_Json FROM app_ai_dashboard WHERE User_Key = ? AND Teacher_Moodle_ID = ? AND JSON_UNQUOTE(JSON_EXTRACT(Metadata_Json,'$.powerBiReportId')) = ? LIMIT 1`,[req.teacher.userKey,req.teacher.moodleUserId,reportId]);
    let dashboardId;
    if (existing.length) {
      dashboardId=existing[0].Dashboard_ID;
      const previous=typeof existing[0].Metadata_Json==='string'?JSON.parse(existing[0].Metadata_Json):existing[0].Metadata_Json;
      await pool.query('UPDATE app_ai_dashboard SET Metadata_Json=?,Updated_At=NOW() WHERE Dashboard_ID=? AND User_Key=?',[JSON.stringify({...previous,...meta}),dashboardId,req.teacher.userKey]);
    } else {
      const [created]=await pool.query(`INSERT INTO app_ai_dashboard (User_Key,Teacher_Moodle_ID,Title,Description,Source_Type,Source_ID,Status,Chart_Count,Metadata_Json) VALUES (?,?,?,?,'powerbi_live',?,'active',0,?)`,[req.teacher.userKey,req.teacher.moodleUserId,projectName,'Báo cáo Power BI hiện có đã xác minh quyền xem.',`powerbi_${reportId}`,JSON.stringify(meta)]);
      dashboardId=created.insertId;
    }
    return res.json({ success: true, dashboardId, metadata: meta, access });
  } catch(error) { return res.status(400).json({ success: false, message: error.message }); }
}

export async function handleProcessExistingModel(req, res) {
  try {
    const { workspaceId, semanticModelId, dryRun = true, approval, action, requestId } = req.body || {};
    const result = action === 'status'
      ? await observeModelProcessing({ workspaceId, semanticModelId, requestId, powerBiToken: req.headers['x-powerbi-token'] })
      : await processExistingModel({ workspaceId, semanticModelId, dryRun, approval, powerBiToken: req.headers['x-powerbi-token'] });
    return res.json({ success: result.ok ?? result.dryRun, result });
  } catch (error) { return res.status(400).json({ success: false, message: error.message }); }
}

/**
 * Lấy danh sách các môn học mà giảng viên hiện tại được phân công
 * Endpoint: GET /api/ai/studio/courses
 */
export async function handleGetStudioCourses(req, res) {
  try {
    const moodleTeacherId = req.teacher?.moodleUserId;
    if (!moodleTeacherId) {
      return res.status(401).json({
        success: false,
        message: "Không xác định được danh tính giảng viên từ phiên đăng nhập.",
      });
    }

    const courses = await getAuthorizedCourses(moodleTeacherId);
    return res.json({
      success: true,
      teacher: {
        username: req.teacher.username,
        moodleUserId: moodleTeacherId,
      },
      courses,
    });
  } catch (error) {
    console.error("[AI Studio Controller] Lỗi lấy danh sách môn học:", error);
    return res.status(500).json({
      success: false,
      message: "Lỗi hệ thống khi tải danh sách môn học.",
      error: error.message,
    });
  }
}

/**
 * Xử lý tải lên tệp Excel/CSV an toàn và trích xuất DatasetProfile
 * Endpoint: POST /api/ai/studio/upload
 */
export async function handleUploadFile(req, res) {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: "Vui lòng chọn tệp .xlsx hoặc .csv để tải lên.",
      });
    }

    const file = req.file;

    // Kiểm tra kích thước
    if (file.size > MAX_FILE_SIZE_BYTES) {
      return res.status(400).json({
        success: false,
        message: `Kích thước tệp vượt quá giới hạn 10MB (${Math.round(file.size / 1024)} KB).`,
      });
    }

    // Kiểm tra phần mở rộng
    const originalName = file.originalname || "dataset.xlsx";
    const ext = (originalName.split(".").pop() || "").toLowerCase();
    if (!["xlsx", "csv"].includes(ext)) {
      return res.status(400).json({
        success: false,
        message: `Định dạng tệp .${ext} không được hỗ trợ. Vui lòng chọn tệp .xlsx hoặc .csv.`,
      });
    }

    const ownerTeacher = {
      moodleUserId: req.teacher?.moodleUserId,
      username: req.teacher?.username,
    };

    const result = await parseFileBuffer(file.buffer, originalName, file.mimetype, ownerTeacher);
    result.profile=createStudioDataset(getCachedSource(result.descriptor.sourceId));

    return res.json({
      success: true,
      message: `Đã phân tích tệp "${originalName}" thành công (${result.profile.totalRows} dòng, ${result.profile.totalColumns} cột).`,
      descriptor: result.descriptor,
      profile: result.profile,
    });
  } catch (error) {
    console.error("[AI Studio Controller] Lỗi upload tệp:", error);
    return res.status(400).json({
      success: false,
      message: error.message || "Lỗi khi xử lý tệp bảng tính.",
    });
  }
}

/**
 * Chọn nguồn dữ liệu môn học LMS Data Warehouse
 * Endpoint: POST /api/ai/studio/lms-source
 */
export async function handleSelectLmsSource(req, res) {
  try {
    const courseIdRaw = req.body?.courseId;
    if (!courseIdRaw) {
      return res.status(400).json({
        success: false,
        message: "Vui lòng cung cấp mã môn học (courseId).",
      });
    }

    const courseId = Number(courseIdRaw);
    if (isNaN(courseId) || courseId <= 0) {
      return res.status(400).json({
        success: false,
        message: "Mã môn học không hợp lệ.",
      });
    }

    const moodleTeacherId = req.teacher?.moodleUserId;
    const result = await getCourseAggregatedProfile(courseId, moodleTeacherId);

    return res.json({
      success: true,
      message: `Đã kết nối nguồn dữ liệu LMS Data Warehouse cho môn "${result.descriptor.courseCode} — ${result.descriptor.courseName}".`,
      descriptor: result.descriptor,
      profile: result.profile,
    });
  } catch (error) {
    console.error("[AI Studio Controller] Lỗi nạp nguồn LMS:", error);
    return res.status(403).json({
      success: false,
      message: error.message || "Từ chối truy cập dữ liệu môn học.",
    });
  }
}

/**
 * Chat trao đổi với AI Studio để gợi ý biểu đồ trực quan hóa
 * Endpoint: POST /api/ai/studio/chat
 */
export async function handleStudioChat(req, res) {
  try {
    const { sourceId, message, userMessage, conversationHistory } = req.body;

    if (!sourceId || typeof sourceId !== "string") {
      return res.status(400).json({
        success: false,
        message: "Thiếu mã nguồn dữ liệu (sourceId). Vui lòng chọn nguồn dữ liệu trước khi trao đổi cùng AI.",
      });
    }

    const teacherContext = {
      moodleUserId: req.teacher?.moodleUserId,
      username: req.teacher?.username,
    };

    const draft = await chatAndRecommendCharts(
      sourceId,
      message || userMessage || "Gợi ý các biểu đồ tối ưu nhất cho bộ dữ liệu này",
      Array.isArray(conversationHistory) ? conversationHistory : [],
      teacherContext
    );

    const isSuccess = draft.success !== false;
    return res.status(isSuccess ? 200 : 400).json({
      success: isSuccess,
      ...draft,
      powerBiPublishStatus: "coming_soon",
      powerBiNotice:
        "Tính năng Xuất bản Power BI Service đang được phát triển theo quy trình: Bản nháp -> Giảng viên duyệt -> Publish Service.",
    });
  } catch (error) {
    console.error("[AI Studio Controller] Lỗi chat AI:", error);
    const status = error.statusCode || (error.message?.includes("từ chối") ? 403 : 500);
    return res.status(status).json({
      success: false,
      message: error.message || "Lỗi khi xử lý yêu cầu với AI Studio.",
    });
  }
}

/**
 * Đổi loại biểu đồ hoặc cập nhật cấu hình biểu đồ theo yêu cầu người dùng
 * Endpoint: POST /api/ai/studio/update-chart
 */
export async function handleUpdateChart(req, res) {
  try {
    const { sourceId, chart, activeFilters } = req.body;
    if (!sourceId || !chart) {
      return res.status(400).json({
        success: false,
        message: "Thiếu thông tin sourceId hoặc chart.",
      });
    }

    const moodleTeacherId = req.teacher?.moodleUserId;
    if (!verifySourceAccess(sourceId, moodleTeacherId)) {
      return res.status(403).json({
        success: false,
        message: "Bị từ chối truy cập: Nguồn dữ liệu không thuộc quyền quản lý của bạn.",
      });
    }

    const cachedSource = getCachedSource(sourceId);
    if (!cachedSource) {
      return res.status(404).json({
        success: false,
        message: "Nguồn dữ liệu không tồn tại hoặc đã hết hạn trong bộ nhớ đệm.",
      });
    }

    const options = {
      sourceType: cachedSource.descriptor?.sourceType || cachedSource.profile?.sourceType,
      sourceName: cachedSource.descriptor?.sourceName || cachedSource.profile?.name,
      summary: cachedSource.profile?.summary,
      activeFilters: activeFilters || chart.activeFilters || {},
    };

    const realData = computeChartRealData(chart, cachedSource.rows, options);

    return res.json({
      success: true,
      chart: {
        ...chart,
        realData,
      },
    });
  } catch (error) {
    console.error("[AI Studio Controller] Lỗi cập nhật biểu đồ:", error);
    return res.status(500).json({
      success: false,
      message: error.message || "Lỗi khi cập nhật biểu đồ.",
    });
  }
}

/**
 * Tải tệp Excel mẫu giả lập để thử nghiệm
 * Endpoint: GET /api/ai/studio/sample-template
 */
export async function handleDownloadSampleTemplate(req, res) {
  try {
    const buffer = await generateDemoGradeTemplateBuffer();
    res.setHeader(
      "Content-Type",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    );
    res.setHeader(
      "Content-Disposition",
      'attachment; filename="Mau_Bang_Diem_LMS_DLU.xlsx"'
    );
    return res.send(buffer);
  } catch (error) {
    console.error("[AI Studio Controller] Lỗi tạo file mẫu:", error);
    return res.status(500).json({
      success: false,
      message: "Không thể tạo tệp mẫu thử nghiệm.",
    });
  }
}

/**
 * 7. Lưu Dashboard mới
 * Endpoint: POST /api/ai/studio/dashboards
 */
export async function handleSaveDashboard(req, res) {
  try {
    const result = await saveDashboard(req.body, req.teacher);
    return res.status(201).json({
      success: true,
      message: `Đã lưu Dashboard "${result.title}" thành công.`,
      dashboardId: result.id,
      dashboard: result,
    });
  } catch (error) {
    console.error("[AI Studio Controller] Lỗi lưu Dashboard:", error);
    return res.status(error.statusCode || 400).json({
      success: false,
      message: error.message || "Không thể lưu Dashboard.",
    });
  }
}

/**
 * 8. Lấy danh sách Dashboard của Giảng viên hiện tại
 * Endpoint: GET /api/ai/studio/dashboards
 */
export async function handleListDashboards(req, res) {
  try {
    const dashboards = await listTeacherDashboards(req.teacher);
    return res.json({
      success: true,
      dashboards,
    });
  } catch (error) {
    console.error("[AI Studio Controller] Lỗi tải danh sách Dashboard:", error);
    return res.status(error.statusCode || 500).json({
      success: false,
      message: error.message || "Lỗi khi lấy danh sách Dashboard.",
    });
  }
}

/**
 * 9. Lấy chi tiết Dashboard và biểu đồ kèm số liệu tái dựng
 * Endpoint: GET /api/ai/studio/dashboards/:id
 */
export async function handleGetDashboardDetail(req, res) {
  try {
    const dashboardId = Number(req.params.id);
    if (!dashboardId || isNaN(dashboardId)) {
      return res.status(400).json({
        success: false,
        message: "Mã Dashboard không hợp lệ.",
      });
    }

    const detail = await getDashboardDetail(dashboardId, req.teacher);
    return res.json({
      success: true,
      dashboard: detail,
    });
  } catch (error) {
    console.error("[AI Studio Controller] Lỗi lấy chi tiết Dashboard:", error);
    return res.status(error.statusCode || 400).json({
      success: false,
      message: error.message || "Lỗi khi tải chi tiết Dashboard.",
    });
  }
}

/**
 * 10. Cập nhật Dashboard hiện có
 * Endpoint: PUT /api/ai/studio/dashboards/:id
 */
export async function handleUpdateDashboard(req, res) {
  try {
    const dashboardId = Number(req.params.id);
    if (!dashboardId || isNaN(dashboardId)) {
      return res.status(400).json({
        success: false,
        message: "Mã Dashboard không hợp lệ.",
      });
    }

    const result = await saveDashboard(
      { ...req.body, dashboardId },
      req.teacher
    );

    return res.json({
      success: true,
      message: `Đã cập nhật Dashboard "${result.title}" thành công.`,
      dashboard: result,
    });
  } catch (error) {
    console.error("[AI Studio Controller] Lỗi cập nhật Dashboard:", error);
    return res.status(error.statusCode || 400).json({
      success: false,
      message: error.message || "Lỗi khi cập nhật Dashboard.",
    });
  }
}

/**
 * 11. Xóa Dashboard
 * Endpoint: DELETE /api/ai/studio/dashboards/:id
 */
export async function handleDeleteDashboard(req, res) {
  try {
    const dashboardId = Number(req.params.id);
    if (!dashboardId || isNaN(dashboardId)) {
      return res.status(400).json({
        success: false,
        message: "Mã Dashboard không hợp lệ.",
      });
    }

    const result = await deleteDashboard(dashboardId, req.teacher);
    return res.json(result);
  } catch (error) {
    console.error("[AI Studio Controller] Lỗi xóa Dashboard:", error);
    return res.status(error.statusCode || 400).json({
      success: false,
      message: error.message || "Lỗi khi xóa Dashboard.",
    });
  }
}

/**
 * 12. Nhân bản Dashboard
 * Endpoint: POST /api/ai/studio/dashboards/:id/duplicate
 */
export async function handleDuplicateDashboard(req, res) {
  try {
    const dashboardId = Number(req.params.id);
    if (!dashboardId || isNaN(dashboardId)) {
      return res.status(400).json({
        success: false,
        message: "Mã Dashboard không hợp lệ.",
      });
    }

    const result = await duplicateDashboard(dashboardId, req.teacher);
    return res.status(201).json({
      success: true,
      message: `Đã nhân bản Dashboard thành công: "${result.title}".`,
      dashboard: result,
    });
  } catch (error) {
    console.error("[AI Studio Controller] Lỗi nhân bản Dashboard:", error);
    return res.status(error.statusCode || 400).json({
      success: false,
      message: error.message || "Lỗi khi nhân bản Dashboard.",
    });
  }
}

/**
 * 13. Làm mới dữ liệu Dashboard sống
 * Endpoint: POST /api/ai/studio/dashboards/:id/refresh
 */
export async function handleRefreshDashboard(req, res) {
  try {
    const dashboardId = Number(req.params.id);
    if (!dashboardId || isNaN(dashboardId)) {
      return res.status(400).json({
        success: false,
        message: "Mã Dashboard không hợp lệ.",
      });
    }

    const detail = await getDashboardDetail(dashboardId, req.teacher, true);
    return res.json({
      success: true,
      message: "Đã làm mới dữ liệu biểu đồ sống thành công.",
      dashboard: detail,
    });
  } catch (error) {
    console.error("[AI Studio Controller] Lỗi làm mới Dashboard:", error);
    return res.status(error.statusCode || 400).json({
      success: false,
      message: error.message || "Lỗi khi làm mới Dashboard.",
    });
  }
}

// ==============================================================================
// TASK 04A: POWER BI REAL REPORT AUTHORING & PUBLISHING CONTROLLERS
// ==============================================================================

/**
 * 14. Kiểm tra môi trường hệ thống và quyền Microsoft Entra / Power BI
 * Endpoint: GET /api/ai/studio/powerbi/capabilities
 */
export async function handleGetPowerBiCapabilities(req, res) {
  try {
    const caps = getEnvironmentCapabilities();
    return res.json({
      success: true,
      capabilities: caps,
    });
  } catch (error) {
    console.error("[AI Studio Controller] Lỗi kiểm tra khả năng Power BI:", error);
    return res.status(500).json({
      success: false,
      message: "Lỗi kiểm tra môi trường Power BI.",
      error: error.message,
    });
  }
}

/**
 * 14b. Lấy trạng thái AI Provider Router (Gemini, Groq, Heuristic)
 * Endpoint: GET /api/ai/studio/gemini-status & GET /api/ai/studio/ai-status
 */
export async function handleGetGeminiStatus(req, res) {
  try {
    const gemini = getGeminiCooldownStatus();
    const groq = getGroqCooldownStatus();

    let activeProvider = "heuristic";
    if (groq.hasKey && !groq.inCooldown) {
      activeProvider = "groq";
    } else if (process.env.AI_STUDIO_ENABLE_GEMINI_FALLBACK === 'true' && !gemini.inCooldown && process.env.GEMINI_API_KEY?.trim()) {
      activeProvider = "gemini";
    }

    return res.json({
      success: true,
      activeProvider,
      gemini,
      groq,
      summary:
        activeProvider === "groq"
          ? `Groq AI (${groq.model}) là AI chính và đang sẵn sàng.`
          : activeProvider === "gemini"
          ? `Gemini AI (${process.env.GEMINI_MODEL || "gemini-3.8-flash"}) đang sẵn sàng.`
          : "Cả Gemini và Groq đều không khả dụng. Đang dùng bộ quy tắc Heuristic dự phòng.",
      ...gemini,
    });
  } catch (error) {
    console.error("[AI Studio Controller] Lỗi kiểm tra trạng thái AI:", error);
    return res.status(500).json({
      success: false,
      message: "Lỗi kiểm tra trạng thái AI.",
      error: error.message,
    });
  }
}

export const handleGetAiStatus = handleGetGeminiStatus;

/**
 * 15. Tạo Báo cáo Power BI Project thật (PBIP/PBIR/TMDL) từ nguồn dữ liệu
 * Endpoint: POST /api/ai/studio/powerbi/generate
 */
export async function handleGeneratePowerBiProject(req, res) {
  try {
    const { sourceId, userGoal, projectName, reportSpec, editPrompt, baseSpec } = req.body;
    if (!sourceId) {
      return res.status(400).json({
        success: false,
        message: "Thiếu mã nguồn dữ liệu (sourceId).",
      });
    }

    const moodleTeacherId = req.teacher?.moodleUserId;
    if (!verifySourceAccess(sourceId, moodleTeacherId)) {
      return res.status(403).json({
        success: false,
        message: "Bạn không có quyền truy cập nguồn dữ liệu này.",
      });
    }

    const cached = getCachedSource(sourceId);
    if (!cached || (!cached.profile && !cached.tables)) {
      return res.status(404).json({
        success: false,
        message: "Nguồn dữ liệu không tồn tại hoặc đã hết hạn trong bộ nhớ đệm.",
      });
    }

    const isMultiTable = Boolean(cached.isMultiTable || (cached.tables && cached.tables.length > 1));
    const datasetProfile = cached.profile?.contractVersion===1 ? cached.profile : isMultiTable
      ? { isMultiTable: true, tables: cached.tables, relationships: cached.relationships || [] }
      : cached.profile;

    const rows = isMultiTable ? [] : (cached.rows || []);
    const targetProjectName = projectName || `LMS_Report_${Date.now()}`;
    const targetDir = "B:\\DoAnChuyenNghanh\\powerbi";

    // Pipeline: Xử lý Report Spec từ các kịch bản: trực tiếp, chỉnh sửa hội thoại hoặc sinh mới
    let spec;
    if (reportSpec && typeof reportSpec === "object") {
      spec = validateReportSpec(reportSpec, datasetProfile);
    } else if (editPrompt && baseSpec) {
      spec = await modifyReportSpecWithGemini(baseSpec, editPrompt, datasetProfile);
    } else {
      spec = await generateReportSpecWithGemini(userGoal, datasetProfile);
    }
    if(datasetProfile.contractVersion===1) {
      const checked=validateAndApproveReportPlan(spec,datasetProfile,req.teacher);
      if(!checked.success || !cached.approvedPlan || checked.approvedPlan.approvalHash!==cached.approvedPlan.approvalHash) return res.status(409).json({success:false,message:'DESIGN_APPROVAL_REQUIRED: Thiết kế đã đổi hoặc chưa được phê duyệt; hãy duyệt lại.'});
      spec=checked.approvedPlan;
    }

    const result = await buildAndPersistPowerBiProject(
      targetProjectName,
      spec,
      datasetProfile,
      targetDir,
      rows,
      req.teacher
    );

    // Tự động lưu Báo cáo Power BI vào Thư viện Dashboard của Giảng viên (MySQL Persistence)
    let savedDashboardId = null;
    try {
      await ensureSourcePersisted(sourceId,req.teacher);
      const userKey = req.teacher.userKey;
      const moodleTeacherId = req.teacher.moodleUserId;
      const metadata = {
        datasetId: datasetProfile.datasetId,
        sourceId,
        approvalHash: cached.approvedPlan?.approvalHash,
        projectName: result.projectName,
        pbipFilePath: result.pbipFilePath,
        downloadZipUrl: `/api/ai/studio/powerbi/download/${result.projectName}`,
        reportPlan: spec,
        plannerStatus: spec.plannerStatus || { mode: "HEURISTIC_FALLBACK" },
      };

      const [ins] = await pool.query(
        `INSERT INTO app_ai_dashboard (
          User_Key, Teacher_Moodle_ID, Title, Description, Source_Type, Source_ID, Status, Chart_Count, Metadata_Json
        ) VALUES (?, ?, ?, ?, ?, ?, 'active', ?, ?)`,
        [
          userKey,
          moodleTeacherId,
          spec.reportTitle || result.projectName,
          `Báo cáo Power BI thật sinh tự động từ ${result.projectName}`,
          isMultiTable ? "file_multisheet" : "file_excel",
          sourceId,
          spec.visuals?.length || 0,
          JSON.stringify(metadata),
        ]
      );
      savedDashboardId = ins.insertId;
    } catch (saveDbErr) {
      console.warn("[AI Studio Controller] Không thể lưu tự động vào app_ai_dashboard:", saveDbErr.message);
    }

    return res.status(201).json({
      success: true,
      message: `Đã khởi tạo thành công Power BI Project thật: "${result.projectName}".`,
      project: {
        dashboardId: savedDashboardId,
        projectName: result.projectName,
        pbipFilePath: result.pbipFilePath,
        semanticModelDir: result.semanticModelDir,
        reportDir: result.reportDir,
        downloadZipUrl: `/api/ai/studio/powerbi/download/${result.projectName}`,
        totalFilesCount: result.totalFilesCount,
        reportTitle: spec.reportTitle,
        domain: spec.domain,
        measures: spec.measures,
        visuals: spec.visuals,
        validationStatus: result.validationStatus,
        workflowStatus: "LOCAL_ARTIFACTS_GENERATED",
        datasetId: datasetProfile.datasetId,
        verificationManifest: result.verificationManifest,
        publishStatus: "PUBLISH_PENDING",
        plannerStatus: spec.plannerStatus || { mode: "HEURISTIC_FALLBACK" },
      },
    });
  } catch (error) {
    console.error("[AI Studio Controller] Lỗi tạo Power BI Project:", error);
    const statusCode = error.isUnsupportedGoal ? 400 : 500;
    return res.status(statusCode).json({
      success: false,
      unsupportedGoal: Boolean(error.isUnsupportedGoal),
      message: error.message || "Lỗi trong quy trình tạo Power BI Project.",
      error: error.message,
    });
  }
}

/**
 * 15b. Lập kế hoạch Báo cáo Power BI (Report Plan IR) bằng Gemini AI không ghi đĩa
 * Endpoint: POST /api/ai/studio/powerbi/plan
 */
export async function handlePlanPowerBiProject(req, res) {
  try {
    const { sourceId, userGoal } = req.body;
    if (!sourceId) {
      return res.status(400).json({
        success: false,
        message: "Thiếu mã nguồn dữ liệu (sourceId).",
      });
    }

    const moodleTeacherId = req.teacher?.moodleUserId;
    if (!verifySourceAccess(sourceId, moodleTeacherId)) {
      return res.status(403).json({
        success: false,
        message: "Bạn không có quyền truy cập nguồn dữ liệu này.",
      });
    }

    const cached = getCachedSource(sourceId);
    if (!cached || (!cached.profile && !cached.tables)) {
      return res.status(404).json({
        success: false,
        message: "Nguồn dữ liệu không tồn tại hoặc đã hết hạn trong bộ nhớ đệm.",
      });
    }

    const isMultiTable = Boolean(cached.isMultiTable || (cached.tables && cached.tables.length > 1));
    const datasetProfile = cached.profile?.contractVersion===1 ? cached.profile : isMultiTable
      ? { isMultiTable: true, tables: cached.tables, relationships: cached.relationships || [] }
      : cached.profile;

    const plan = await generateReportSpecWithGemini(userGoal, datasetProfile);
    const enrichedPlan = computeReportPlanDataPreview(plan, cached.rows || [], req.body.activeFilters || {}, cached.profile);

    return res.json({
      success: true,
      message: "Đã lập kế hoạch thiết kế Báo cáo Power BI thành công.",
      plan: enrichedPlan,
      workflowStatus: "DESIGN_DRAFT",
    });
  } catch (error) {
    console.error("[AI Studio Controller] Lỗi lập kế hoạch Power BI:", error);
    const statusCode = error.isUnsupportedGoal ? 400 : 500;
    return res.status(statusCode).json({
      success: false,
      unsupportedGoal: Boolean(error.isUnsupportedGoal),
      message: error.message || "Lỗi trong quy trình lập kế hoạch Power BI.",
      error: error.message,
    });
  }
}

/**
 * 15c. Chỉnh sửa Kế hoạch Báo cáo Power BI qua Hội thoại tự nhiên (Multi-turn Plan Editing)
 * Endpoint: POST /api/ai/studio/powerbi/edit-plan
 */
export async function handleEditPowerBiPlan(req, res) {
  try {
    const { sourceId, baseSpec, editPrompt } = req.body;
    if (!sourceId || !editPrompt || !baseSpec) {
      return res.status(400).json({
        success: false,
        message: "Cần cung cấp sourceId, baseSpec và câu lệnh chỉnh sửa (editPrompt).",
      });
    }

    const moodleTeacherId = req.teacher?.moodleUserId;
    if (!verifySourceAccess(sourceId, moodleTeacherId)) {
      return res.status(403).json({
        success: false,
        message: "Bạn không có quyền truy cập nguồn dữ liệu này.",
      });
    }

    const cached = getCachedSource(sourceId);
    if (!cached || (!cached.profile && !cached.tables)) {
      return res.status(404).json({
        success: false,
        message: "Nguồn dữ liệu không tồn tại hoặc đã hết hạn trong bộ nhớ đệm.",
      });
    }

    const isMultiTable = Boolean(cached.isMultiTable || (cached.tables && cached.tables.length > 1));
    const datasetProfile = cached.profile?.contractVersion===1 ? cached.profile : isMultiTable
      ? { isMultiTable: true, tables: cached.tables, relationships: cached.relationships || [] }
      : cached.profile;

    const updatedPlan = await modifyReportSpecWithGemini(baseSpec, editPrompt, datasetProfile);
    const enrichedPlan = computeReportPlanDataPreview(updatedPlan, cached.rows || [], req.body.activeFilters || {}, cached.profile);

    return res.json({
      success: true,
      message: "Đã cập nhật kế hoạch Báo cáo Power BI theo yêu cầu chỉnh sửa.",
      plan: enrichedPlan,
      workflowStatus: "DESIGN_DRAFT",
    });
  } catch (error) {
    console.error("[AI Studio Controller] Lỗi chỉnh sửa kế hoạch Power BI:", error);
    const statusCode = error.isUnsupportedGoal ? 400 : 500;
    return res.status(statusCode).json({
      success: false,
      unsupportedGoal: Boolean(error.isUnsupportedGoal),
      message: error.message || "Lỗi trong quy trình chỉnh sửa kế hoạch Power BI.",
      error: error.message,
    });
  }
}

/**
 * 15d. Tính toán Dữ liệu Thực tế cho Bản xem trước (Live Preview Data Calculation)
 * Endpoint: POST /api/ai/studio/powerbi/compute-preview
 */
export async function handleComputePowerBiPreview(req, res) {
  try {
    const { sourceId, reportPlan, activeFilters, dashboardDraft } = req.body;
    if (!sourceId || !reportPlan) {
      return res.status(400).json({
        success: false,
        message: "Cần cung cấp sourceId và reportPlan.",
      });
    }

    const moodleTeacherId = req.teacher?.moodleUserId;
    if (!verifySourceAccess(sourceId, moodleTeacherId)) {
      return res.status(403).json({
        success: false,
        message: "Bạn không có quyền truy cập nguồn dữ liệu này.",
      });
    }

    const cached = getCachedSource(sourceId);
    if (!cached) {
      return res.status(404).json({
        success: false,
        message: "Nguồn dữ liệu không tồn tại hoặc đã hết hạn trong bộ nhớ đệm.",
      });
    }

    const enrichedPlan = computeReportPlanDataPreview(reportPlan, cached.rows || [], activeFilters || {}, cached.profile);

    // Đồng bộ hóa tính toán số liệu sống cho các thẻ gợi ý dashboardDraft phía dưới (nếu có)
    let enrichedDraft = null;
    if (dashboardDraft && Array.isArray(dashboardDraft.recommendedCharts)) {
      const draftOptions = {
        sourceType: cached.descriptor?.sourceType || cached.profile?.sourceType,
        sourceName: cached.descriptor?.sourceName || cached.profile?.name,
        summary: cached.profile?.summary,
        activeFilters: activeFilters || {},
        measures: reportPlan?.measures || cached.profile?.measures || [],
      };
      const enrichedCharts = cached.profile?.contractVersion===1
        ? enrichedPlan.visuals.filter(v=>!['slicer','textbox'].includes(v.visualType)).map(v=>({...v,chartId:v.id,chartType:v.realData.chartType,realData:v.realData}))
        : dashboardDraft.recommendedCharts.map((chart) => ({...chart,realData:computeChartRealData(chart,cached.rows || [],draftOptions)}));
      enrichedDraft = {
        ...dashboardDraft,
        recommendedCharts: enrichedCharts,
      };
    }

    return res.json({
      success: true,
      plan: enrichedPlan,
      reportPlan: enrichedPlan,
      dashboardDraft: enrichedDraft,
    });
  } catch (error) {
    console.error("[AI Studio Controller] Lỗi tính toán preview:", error);
    return res.status(500).json({
      success: false,
      message: error.message || "Lỗi khi tính toán dữ liệu xem trước.",
    });
  }
}

/**
 * 15e. Phê duyệt Bản Thiết kế Báo cáo Power BI (Approval Gateway)
 * Endpoint: POST /api/ai/studio/powerbi/approve
 */
export async function handleApprovePowerBiPlan(req, res) {
  try {
    const { sourceId, reportPlan } = req.body;
    if (!sourceId || !reportPlan) {
      return res.status(400).json({
        success: false,
        message: "Cần cung cấp sourceId và reportPlan để phê duyệt.",
      });
    }

    const moodleTeacherId = req.teacher?.moodleUserId;
    if (!verifySourceAccess(sourceId, moodleTeacherId)) {
      return res.status(403).json({
        success: false,
        message: "Bạn không có quyền truy cập nguồn dữ liệu này.",
      });
    }

    const cached = getCachedSource(sourceId);
    if (!cached) {
      return res.status(404).json({
        success: false,
        message: "Nguồn dữ liệu không tồn tại trong bộ nhớ đệm.",
      });
    }

    const datasetProfile = cached.profile || (cached.tables ? { tables: cached.tables } : { columns: [] });
    const approvalRes = validateAndApproveReportPlan(reportPlan, datasetProfile, req.teacher);

    if (!approvalRes.success) {
      return res.status(400).json({
        success: false,
        workflowStatus: "DESIGN_DRAFT",
        errors: approvalRes.errors,
        warnings: approvalRes.warnings,
        message: "Không thể phê duyệt: Tồn tại lỗi trong đặc tả báo cáo cần chỉnh sửa.",
      });
    }

    // Lưu bản kế hoạch đã duyệt vào cache nguồn
    cached.approvedPlan = approvalRes.approvedPlan;

    return res.json({
      success: true,
      workflowStatus: "DESIGN_APPROVED",
      approvedPlan: approvalRes.approvedPlan,
      reportPlan: approvalRes.approvedPlan,
      warnings: approvalRes.warnings,
      message: "Thiết kế Báo cáo Power BI đã được phê duyệt thành công! Sẵn sàng khởi tạo PBIP thật.",
    });
  } catch (error) {
    console.error("[AI Studio Controller] Lỗi phê duyệt kế hoạch Power BI:", error);
    return res.status(500).json({
      success: false,
      message: error.message || "Lỗi trong quy trình phê duyệt thiết kế.",
    });
  }
}

/**
 * 17. Tải lên tệp Excel nhiều trang tính (Multi-sheet Workbook)
 * Endpoint: POST /api/ai/studio/upload-multisheet
 */
export async function handleUploadMultiSheetFile(req, res) {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: "Vui lòng chọn tệp .xlsx để tải lên.",
      });
    }

    const file = req.file;
    if (file.size > MAX_FILE_SIZE_BYTES) {
      return res.status(400).json({
        success: false,
        message: `Kích thước tệp vượt quá giới hạn 10MB (${Math.round(file.size / 1024)} KB).`,
      });
    }

    const originalName = file.originalname || "multisheet_dataset.xlsx";
    const ownerTeacher = {
      moodleUserId: req.teacher?.moodleUserId,
      username: req.teacher?.username,
    };

    const result = await parseMultiSheetFileBuffer(file.buffer, originalName, file.mimetype, ownerTeacher);
    result.profile=createStudioDataset(getCachedSource(result.descriptor.sourceId));

    return res.json({
      success: true,
      message: `Đã phân tích tệp nhiều sheet "${originalName}" thành công (${result.tables.length} bảng, ${result.relationships.length} mối quan hệ).`,
      descriptor: result.descriptor,
      tables: result.tables.map((t) => ({
        tableName: t.tableName,
        sheetName: t.sheetName,
        totalRows: t.totalRows,
        totalColumns: t.totalColumns,
        columns: t.columns,
        pkCandidates: t.pkCandidates,
      })),
      relationships: result.relationships,
    });
  } catch (error) {
    console.error("[AI Studio Controller] Lỗi upload tệp nhiều sheet:", error);
    return res.status(400).json({
      success: false,
      message: error.message || "Lỗi khi xử lý tệp bảng tính nhiều sheet.",
    });
  }
}

/**
 * 18. Chọn nguồn dữ liệu LMS Data Warehouse dạng Đa bảng Star-Schema
 * Endpoint: POST /api/ai/studio/lms-multitable-source
 */
export async function handleSelectLmsMultiTableSource(req, res) {
  try {
    const courseIdRaw = req.body?.courseId;
    if (!courseIdRaw) {
      return res.status(400).json({
        success: false,
        message: "Vui lòng cung cấp mã môn học (courseId).",
      });
    }

    const courseId = Number(courseIdRaw);
    const moodleTeacherId = req.teacher?.moodleUserId;
    const result = await getCourseMultiTableWarehouseProfile(courseId, moodleTeacherId);

    return res.json({
      success: true,
      message: `Đã nạp thành công mô hình Star-Schema Data Warehouse môn "${result.descriptor.courseCode} — ${result.descriptor.courseName}".`,
      descriptor: result.descriptor,
      tables: result.tables.map((t) => ({
        tableName: t.tableName,
        totalRows: t.totalRows,
        totalColumns: t.totalColumns,
        columns: t.columns,
        pkCandidates: t.pkCandidates,
      })),
      relationships: result.relationships,
    });
  } catch (error) {
    console.error("[AI Studio Controller] Lỗi nạp nguồn LMS đa bảng:", error);
    return res.status(403).json({
      success: false,
      message: error.message || "Từ chối truy cập dữ liệu LMS đa bảng.",
    });
  }
}

/**
 * 19. Tải file Excel mẫu đa bảng (Multi-sheet) cho Giảng viên thử nghiệm
 * Endpoint: GET /api/ai/studio/sample-multisheet-template
 */
export async function handleDownloadMultiSheetSampleTemplate(req, res) {
  try {
    const buffer = await generateMultiSheetDemoWorkbookBuffer();
    res.setHeader(
      "Content-Type",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    );
    res.setHeader(
      "Content-Disposition",
      'attachment; filename="Mau_BangDiem_DaBang_DLU.xlsx"'
    );
    return res.send(buffer);
  } catch (error) {
    console.error("[AI Studio Controller] Lỗi tải file mẫu đa bảng:", error);
    return res.status(500).json({
      success: false,
      message: "Lỗi tạo tệp mẫu Excel đa bảng.",
      error: error.message,
    });
  }
}

/**
 * 16. Phê duyệt & Xuất bản Báo cáo Power BI lên Service / Cập nhật nhúng LMS
 * Endpoint: POST /api/ai/studio/powerbi/publish
 */
export async function handlePublishPowerBiReport(req, res) {
  try {
    const result = await executePublishWorkflow(req.body, req.teacher);
    return res.json({
      success: true,
      result,
    });
  } catch (error) {
    console.error("[AI Studio Controller] Lỗi xuất bản Power BI:", error);
    return res.status(400).json({
      success: false,
      message: error.message || "Lỗi trong quy trình xuất bản Power BI.",
    });
  }
}

/**
 * 19b. Khảo sát toàn diện 8 điều kiện Publish & Embed Power BI Service (Pre-flight Audit)
 * Endpoint: GET /api/ai/studio/powerbi/publish-audit
 */
export async function handleAuditPublishConditions(req, res) {
  try {
    const { workspaceId } = req.query;
    const audit = auditPublishAndEmbedConditions(workspaceId, req.teacher);
    return res.json({
      success: true,
      audit,
    });
  } catch (error) {
    console.error("[AI Studio Controller] Lỗi kiểm tra điều kiện xuất bản Power BI:", error);
    return res.status(500).json({
      success: false,
      message: error.message || "Lỗi kiểm tra điều kiện xuất bản Power BI.",
    });
  }
}

/**
 * 19c. Đánh giá các phương án xuất bản khả thi với tài khoản trường (User owns data — Task 05.8)
 * Endpoint: GET /api/ai/studio/powerbi/deployment-options
 */
export async function handleGetDeploymentOptions(req, res) {
  try {
    const { workspaceId } = req.query;
    const deploymentData = evaluateUserOwnsDataDeploymentOptions(workspaceId, req.teacher);
    return res.json({
      success: true,
      deploymentData,
    });
  } catch (error) {
    console.error("[AI Studio Controller] Lỗi đánh giá phương án xuất bản:", error);
    return res.status(500).json({
      success: false,
      message: error.message || "Lỗi đánh giá phương án xuất bản Power BI.",
    });
  }
}

/**
 * 19d. Tạo Báo cáo Thử nghiệm An toàn (Benchmark Demo — 0% PII — Task 05.8)
 * Endpoint: POST /api/ai/studio/powerbi/generate-benchmark-test
 */
export async function handleGenerateBenchmarkTest(req, res) {
  try {
    const { customName } = req.body || {};
    const benchmarkProject = await generateBenchmarkTestProject(customName);
    return res.status(201).json({
      success: true,
      message: "Đã khởi tạo thành công Báo cáo Thử nghiệm An toàn (Benchmark Demo — 0% PII nhạy cảm).",
      project: {
        projectName: benchmarkProject.projectName,
        pbipFilePath: benchmarkProject.pbipFilePath,
        semanticModelDir: benchmarkProject.semanticModelDir,
        reportDir: benchmarkProject.reportDir,
        downloadZipUrl: `/api/ai/studio/powerbi/download/${benchmarkProject.projectName}`,
        totalFilesCount: benchmarkProject.totalFilesCount,
        reportTitle: benchmarkProject.spec.reportTitle,
        measures: benchmarkProject.spec.measures,
        visuals: benchmarkProject.spec.visuals,
        workflowStatus: "LOCAL_ARTIFACTS_GENERATED",
        isBenchmarkDemo: true,
        hasSensitiveData: false,
      },
    });
  } catch (error) {
    console.error("[AI Studio Controller] Lỗi tạo báo cáo thử nghiệm benchmark:", error);
    return res.status(500).json({
      success: false,
      message: error.message || "Lỗi tạo báo cáo thử nghiệm benchmark.",
    });
  }
}

/**
 * 20. Tải trọn bộ dự án Power BI (.pbip + .SemanticModel + .Report) dưới dạng tệp ZIP
 * Endpoint: GET /api/ai/studio/powerbi/download/:projectName
 */
export async function handleDownloadPowerBiProjectZip(req, res) {
  try {
    const rawProjectName = req.params.projectName || req.query.projectName;
    if (!rawProjectName) {
      return res.status(400).json({
        success: false,
        message: "Thiếu tên dự án Power BI (projectName).",
      });
    }

    const safeName = rawProjectName.replace(/[^a-zA-Z0-9_-]/g, "_");
    const targetDir = "B:\\DoAnChuyenNghanh\\powerbi";
    const pbipPath = path.join(targetDir, `${safeName}.pbip`);
    const smDir = path.join(targetDir, `${safeName}.SemanticModel`);
    const reportDir = path.join(targetDir, `${safeName}.Report`);

    if (!fs.existsSync(pbipPath) || !fs.existsSync(smDir) || !fs.existsSync(reportDir)) {
      return res.status(404).json({
        success: false,
        message: `Dự án Power BI "${safeName}" không tồn tại hoặc thiếu tệp cấu trúc trên máy chủ.`,
      });
    }

    res.setHeader("Content-Type", "application/zip");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="${safeName}_PowerBI_Project.zip"`
    );

    const archive = archiver("zip", { zlib: { level: 9 } });

    archive.on("error", (err) => {
      console.error("[AI Studio Controller] Lỗi tạo file zip Power BI:", err);
      if (!res.headersSent) {
        res.status(500).json({ success: false, message: "Lỗi nén tệp dự án Power BI." });
      }
    });

    archive.pipe(res);
    archive.file(pbipPath, { name: `${safeName}.pbip` });
    archive.directory(smDir, `${safeName}.SemanticModel`);
    archive.directory(reportDir, `${safeName}.Report`);

    await archive.finalize();
  } catch (error) {
    console.error("[AI Studio Controller] Lỗi download zip Power BI:", error);
    if (!res.headersSent) {
      return res.status(500).json({
        success: false,
        message: "Lỗi hệ thống khi tải tệp nén dự án Power BI.",
        error: error.message,
      });
    }
  }
}

// Bộ lưu trữ in-memory cho token Microsoft Fabric của giảng viên trong phiên làm việc
let activeFabricToken = null;

export function getActiveFabricToken() {
  return activeFabricToken;
}

export function setActiveFabricToken(token) {
  activeFabricToken = token;
}

/**
 * 21. Xác minh Token và Quyền Workspace Power BI ở chế độ Read-Only (Task 05.9)
 * Endpoint: POST /api/ai/studio/powerbi/verify-workspace-access
 */
export async function handleVerifyUserWorkspaceAccess(req, res) {
  try {
    const authHeader = req.headers.authorization || "";
    const msHeaderToken = req.headers["x-microsoft-token"] || req.headers["x-fabric-token"] || req.headers["x-ms-token"];
    const bodyToken = req.body?.userAccessToken || req.body?.accessToken || req.body?.fabricAccessToken;
    const headerToken = authHeader.startsWith("Bearer ") ? authHeader.slice(7).trim() : null;
    // Ưu tiên token Microsoft từ body hoặc custom header, sau đó đến activeFabricToken đã lưu, cuối cùng mới tới Authorization header
    const userAccessToken = bodyToken || msHeaderToken || activeFabricToken || headerToken;

    if (!userAccessToken) {
      return res.status(400).json({
        success: false,
        message: "Thiếu Access Token xác thực Microsoft của Giảng viên. Vui lòng đăng nhập qua MSAL.",
        requiresLogin: true,
      });
    }

    const { workspaceId } = req.body || {};
    const verification = await verifyUserWorkspaceAccessReadOnly(userAccessToken, workspaceId);

    // Lưu token nếu hợp lệ để phục vụ các bước xuất bản tiếp theo
    if (verification.tokenDiagnosis?.isFabricAudience && !verification.tokenDiagnosis?.isExpired) {
      activeFabricToken = userAccessToken;
      console.log("[AI Studio Controller] Đã lưu activeFabricToken từ phiên xác thực hợp lệ.");
    }

    const httpCode = verification.success ? 200 : verification.statusCode || 400;
    return res.status(httpCode).json(verification);
  } catch (error) {
    console.error("[AI Studio Controller] Lỗi xác minh quyền workspace:", error.message);
    return res.status(500).json({
      success: false,
      message: error.message || "Lỗi hệ thống khi xác minh quyền workspace Power BI.",
    });
  }
}

/**
 * 22. Triển khai Push Dataset REST API với cơ chế Dry-Run an toàn (Task 05.9)
 * Endpoint: POST /api/ai/studio/powerbi/deploy-push-dataset
 *
 * Mặc định dryRun = true: Chỉ thẩm định và chuẩn bị schema, tuyệt đối chưa ghi cloud.
 */
export async function handleDeployDelegatedPushDataset(req, res) {
  try {
    const authHeader = req.headers.authorization || "";
    const msHeaderToken = req.headers["x-microsoft-token"] || req.headers["x-fabric-token"] || req.headers["x-ms-token"];
    const bodyToken = req.body?.userAccessToken || req.body?.accessToken || req.body?.fabricAccessToken;
    const headerToken = authHeader.startsWith("Bearer ") ? authHeader.slice(7).trim() : null;
    // Ưu tiên token Microsoft từ body hoặc custom header, tránh nhầm với token LMS trong Authorization
    const userAccessToken = bodyToken || msHeaderToken || headerToken;

    if (!userAccessToken) {
      return res.status(400).json({
        success: false,
        message: "Thiếu Access Token xác thực Microsoft của Giảng viên.",
        requiresLogin: true,
      });
    }

    const {
      workspaceId,
      reportPlan,
      sampleRows = [],
      dryRun = true,
      teacherApproved = false,
    } = req.body || {};

    if (!reportPlan) {
      return res.status(400).json({
        success: false,
        message: "Thiếu thông số kế hoạch báo cáo (reportPlan) để triển khai Semantic Model.",
      });
    }

    const deployResult = await executeDelegatedPushPublish(
      userAccessToken,
      workspaceId,
      reportPlan,
      sampleRows,
      { dryRun, teacherApproved }
    );

    return res.json(deployResult);
  } catch (error) {
    console.error("[AI Studio Controller] Lỗi triển khai push dataset:", error.message);
    return res.status(500).json({
      success: false,
      message: error.message || "Lỗi trong quy trình triển khai Semantic Model lên Power BI.",
    });
  }
}

/**
 * 23. Triển khai PBIP hoàn chỉnh (TMDL + PBIR đa trang) qua Microsoft Fabric Core Items API (Task 05.9 nâng cao)
 * Endpoint: POST /api/ai/studio/powerbi/deploy-fabric-pbip
 *
 * Mặc định dryRun = true: Đóng gói kiểm tra tính toàn vẹn của TMDL và PBIR, tuyệt đối chưa ghi cloud.
 */
export async function handleDeployFabricPbipProject(req, res) {
  try {
    const authHeader = req.headers.authorization || "";
    const msHeaderToken = req.headers["x-fabric-token"] || req.headers["x-microsoft-token"] || req.headers["x-ms-token"];
    const bodyToken = req.body?.fabricAccessToken || req.body?.userAccessToken || req.body?.accessToken;
    const headerToken = authHeader.startsWith("Bearer ") ? authHeader.slice(7).trim() : null;
    const token = bodyToken || msHeaderToken || headerToken || activeFabricToken;

    if (!token) {
      return res.status(400).json({
        success: false,
        message: "Thiếu Access Token xác thực Microsoft của Giảng viên.",
        requiresLogin: true,
      });
    }

    if (bodyToken || msHeaderToken) {
      activeFabricToken = bodyToken || msHeaderToken;
    }

    const {
      workspaceId,
      projectName,
      dryRun = true,
      teacherApproved = false,
      existingSemanticModelId,
      existingReportId,
    } = req.body || {};

    if (!projectName) {
      return res.status(400).json({
        success: false,
        message: "Thiếu tên dự án PBIP (projectName) cần xuất bản.",
      });
    }

    const result = await deployFabricPbipProject(token, workspaceId, projectName, {
      dryRun,
      teacherApproved,
      existingSemanticModelId,
      existingReportId,
    });

    if (result.success && result.cloudDataVerified === true && !dryRun && result.reportId) {
      try {
        const meta = {
          isPowerBiLive: true,
          powerBiReportId: result.reportId,
          powerBiWorkspaceId: result.workspaceId,
          powerBiEmbedUrl: result.embedUrl,
          semanticModelId: result.semanticModelId,
          projectName,
          publishedAt: new Date().toISOString(),
          status: "PUBLISHED_LIVE",
        };

        const teacherId = req.teacher?.moodleUserId || 1;
        const [existing] = await pool.query(
          "SELECT Dashboard_ID FROM app_ai_dashboard WHERE Title LIKE ? LIMIT 1",
          [`%${projectName}%`]
        );

        let dashboardId = null;
        if (existing && existing.length > 0) {
          dashboardId = existing[0].Dashboard_ID;
          await pool.query(
            "UPDATE app_ai_dashboard SET Metadata_Json = ?, Updated_At = NOW() WHERE Dashboard_ID = ?",
            [JSON.stringify(meta), dashboardId]
          );
        } else {
          const [ins] = await pool.query(
            "INSERT INTO app_ai_dashboard (Title, Description, Created_By, Metadata_Json, Created_At) VALUES (?, ?, ?, ?, NOW())",
            [
              `Báo Cáo Benchmark Power BI (${projectName})`,
              "Xuất bản tự động qua Microsoft Fabric Core Items API (0% PII)",
              teacherId,
              JSON.stringify(meta),
            ]
          );
          dashboardId = ins.insertId;
        }
        result.dashboardId = dashboardId;
        console.log(`[AI Studio Controller] Đã đồng bộ Dashboard #${dashboardId} vào Dashboard Library với Live Report ID: ${result.reportId}`);
      } catch (dbErr) {
        console.warn("[AI Studio Controller] Cảnh báo đồng bộ CSDL:", dbErr.message);
      }
    }

    return res.json(result);
  } catch (error) {
    console.error("[AI Studio Controller] Lỗi triển khai Fabric PBIP:", error.message);
    return res.status(500).json({
      success: false,
      message: error.message || "Lỗi trong quy trình triển khai Fabric PBIP.",
    });
  }
}

/**
 * 23b. Cập nhật định nghĩa PBIR của Report đã có trên Microsoft Fabric Workspace (POST /powerbi/update-fabric-report)
 * Tái sử dụng Semantic Model và Report ID hiện có, an toàn tuyệt đối.
 */
export async function handleUpdateFabricReportDefinition(req, res) {
  try {
    const authHeader = req.headers.authorization || "";
    const msHeaderToken = req.headers["x-fabric-token"] || req.headers["x-microsoft-token"] || req.headers["x-ms-token"];
    const bodyToken = req.body?.fabricAccessToken || req.body?.userAccessToken || req.body?.accessToken;
    const headerToken = authHeader.startsWith("Bearer ") ? authHeader.slice(7).trim() : null;
    const token = bodyToken || msHeaderToken || headerToken || activeFabricToken;

    if (!token) {
      return res.status(400).json({
        success: false,
        message: "Thiếu Access Token xác thực Microsoft của Giảng viên.",
        requiresLogin: true,
      });
    }

    const {
      workspaceId = "9a2c772e-ef06-43e4-a887-fe510d52b54c",
      reportId = "a4125dcf-093d-4234-bf9f-359732ca2beb",
      semanticModelId = "62419274-8d63-432a-a9e0-9313d340be22",
      projectName = "PBI_Benchmark_Demo_Task08",
      dryRun = true,
      teacherApproved = false,
    } = req.body || {};

    // 1. Đóng gói Report Parts từ PBIP hiện có
    const pkg = packagePbipToFabricItemDefinition(projectName);

    // 2. Cập nhật definition.pbir trỏ tới Semantic Model ID trên Cloud
    const cloudParts = pkg.reportItem.definition.parts.map((p) => {
      if (p.path === "definition.pbir") {
        const pbirJson = {
          $schema: "https://developer.microsoft.com/json-schemas/fabric/item/report/definitionProperties/2.0.0/schema.json",
          version: "4.0",
          datasetReference: {
            byConnection: {
              connectionString: `semanticmodelid=${semanticModelId}`,
            },
          },
        };
        return {
          path: p.path,
          payload: Buffer.from(JSON.stringify(pbirJson, null, 2)).toString("base64"),
          payloadType: "InlineBase64",
        };
      }
      return p;
    });

    const cloudReportItem = {
      ...pkg.reportItem,
      definition: {
        ...pkg.reportItem.definition,
        parts: cloudParts,
      },
    };

    // 3. Thẩm định chặt chẽ trước khi gửi
    const validation = validateFabricReportDefinition(cloudReportItem, semanticModelId, pkg.modelSchema);

    if (dryRun !== false || teacherApproved !== true) {
      return res.json({
        success: true,
        status: "DRY_RUN_PASSED",
        workspaceId,
        reportId,
        semanticModelId,
        validation,
        message: "Định nghĩa Report đã được thẩm định đạt 100% chuẩn PBIR Enhanced và Schema Binding.",
      });
    }

    // 4. Gửi yêu cầu cập nhật định nghĩa lên Microsoft Fabric
    const updateRes = await updateFabricReportDefinition(workspaceId, reportId, cloudParts, token);

    // Metadata update is not evidence of processing/rendering. Keep the library pending.
    try {
      const meta = {
        isPowerBiLive: true,
        powerBiReportId: reportId,
        powerBiWorkspaceId: workspaceId,
        powerBiEmbedUrl: `https://app.powerbi.com/reportEmbed?reportId=${reportId}&groupId=${workspaceId}`,
        semanticModelId,
        projectName,
        publishedAt: new Date().toISOString(),
        status: "CLOUD_VERIFICATION_REQUIRED",
        cloudDataVerified: false,
        reportRendered: false,
        embedVerified: false,
      };
      const [existing] = await pool.query(
        "SELECT Dashboard_ID FROM app_ai_dashboard WHERE Title LIKE ? LIMIT 1",
        [`%${projectName}%`]
      );
      if (existing && existing.length > 0) {
        await pool.query(
          "UPDATE app_ai_dashboard SET Metadata_Json = ?, Updated_At = NOW() WHERE Dashboard_ID = ?",
          [JSON.stringify(meta), existing[0].Dashboard_ID]
        );
      }
    } catch (dbErr) {
      console.warn("[AI Studio Controller] Cảnh báo đồng bộ CSDL sau khi update definition:", dbErr.message);
    }

    return res.json({
      success: true,
      workspaceId,
      reportId,
      semanticModelId,
      updateResult: updateRes,
      embedUrl: `https://app.powerbi.com/reportEmbed?reportId=${reportId}&groupId=${workspaceId}`,
      message: "Cập nhật định nghĩa visual bindings cho Fabric Report thành công!",
    });
  } catch (error) {
    console.error("[AI Studio Controller] Lỗi cập nhật định nghĩa Fabric Report:", error.message);
    return res.status(500).json({
      success: false,
      message: error.message || "Lỗi cập nhật định nghĩa Fabric Report.",
    });
  }
}

/**
 * 24. Lấy danh sách toàn bộ items trong Fabric Workspace (Read-Only)
 * Endpoint: GET /api/ai/studio/powerbi/workspace-items
 */
export async function handleGetFabricWorkspaceItems(req, res) {
  try {
    const authHeader = req.headers.authorization || "";
    const msHeaderToken = req.headers["x-fabric-token"] || req.headers["x-microsoft-token"] || req.headers["x-ms-token"];
    const bodyToken = req.body?.fabricAccessToken || req.body?.userAccessToken || req.body?.accessToken;
    const queryToken = req.query?.token || req.query?.fabricAccessToken;
    const headerToken = authHeader.startsWith("Bearer ") ? authHeader.slice(7).trim() : null;
    const token = bodyToken || msHeaderToken || queryToken || activeFabricToken || headerToken;

    if (!token) {
      return res.status(400).json({
        success: false,
        message: "Thiếu Access Token xác thực Microsoft của Giảng viên.",
        requiresLogin: true,
      });
    }

    const caps = getEnvironmentCapabilities();
    const workspaceId = req.query?.workspaceId || req.body?.workspaceId || caps.microsoftEntra.workspaceId || "9a2c772e-ef06-43e4-a887-fe510d52b54c";

    const items = await listFabricWorkspaceItems(workspaceId, token);
    return res.json({
      success: true,
      workspaceId,
      totalItems: items.length,
      items,
    });
  } catch (error) {
    console.error("[AI Studio Controller] Lỗi lấy danh sách Fabric Workspace Items:", error.message);
    return res.status(500).json({
      success: false,
      message: error.message || "Lỗi khi lấy danh sách Fabric items.",
    });
  }
}
