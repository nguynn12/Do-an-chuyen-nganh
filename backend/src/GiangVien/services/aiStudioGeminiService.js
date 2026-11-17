import { GoogleGenAI, Type } from "@google/genai";
import { getCachedSource, verifySourceAccess, detectDatasetDomain } from "./excelParserService.js";
import { computeChartRealData } from "./chartAggregationService.js";
import { getGeminiCooldownStatus, parseGeminiErrorAndSetCooldown } from "./geminiCooldownService.js";
import { assessHeuristicFeasibility } from "./powerBiAuthoringService.js";
import {
  getGroqConfig,
  getGroqCooldownStatus,
  chatAndRecommendChartsWithGroq,
} from "./groqStudioService.js";

const DEFAULT_GEMINI_MODEL = process.env.GEMINI_MODEL || "gemini-3.1-flash-lite";
const API_TIMEOUT_MS = Number(process.env.GEMINI_TIMEOUT_MS || 10000);
const MAX_PROMPT_LENGTH = 500;

const STUDIO_SYSTEM_INSTRUCTION = `
Bạn là AI Dashboard Studio Assistant — Chuyên gia tư vấn phân tích dữ liệu đa năng (General-Purpose Data & Visual Analytics Specialist) cho Hệ thống LMS Đại học Đà Lạt.
Nhiệm vụ của bạn là:
1. Tiếp nhận câu hỏi hoặc mô tả nhu cầu phân tích của người dùng cùng với Schema tóm tắt (DatasetProfile) của bất kỳ bộ dữ liệu nào (bảng điểm, khảo sát sinh viên, hoặc dữ liệu bán hàng, nhân sự, y tế, logistics, tài chính, v.v.).
2. Đề xuất cấu trúc Dashboard trực quan hóa (DashboardDraft) bám sát schema thực tế bao gồm các biểu đồ phù hợp nhất:
   - "bar": So sánh các danh mục, quy mô, tần suất hoặc giá trị giữa các nhóm.
   - "line": Xu hướng theo thời gian, tiến độ hoặc tương quan liên tục (CHỈ DÙNG KHI CÓ CỘT THỜI GIAN/NGÀY THÁNG HỢP LỆ).
   - "pie" hoặc "donut": Phân bổ tỷ lệ phần trăm (danh mục <= 6 nhóm).
   - "scatter": Tương quan giữa 2 chỉ số định lượng.
   - "kpi_card": Thẻ hiển thị chỉ số then chốt (Tổng số bản ghi, Tổng số tiền, Điểm trung bình, Tỷ lệ, v.v.).
3. Hỗ trợ điều chỉnh linh hoạt khi người dùng yêu cầu (ví dụ: đổi biểu đồ cột sang tròn/donut, áp bộ lọc, thay đổi trục so sánh).
4. Đưa ra giải thích rõ ràng, súc tích bằng tiếng Việt vì sao chọn từng biểu đồ và các trục x/y tương ứng.

QUY TẮC BẢO MẬT & ĐẠO ĐỨC DỮ LIỆU BẮT BUỘC:
- TUYỆT ĐỐI KHÔNG sinh câu lệnh SQL, HTML, Javascript hay mã độc nguy hiểm.
- TUYỆT ĐỐI KHÔNG tự tạo ra thông tin cá nhân, tên hoặc dữ liệu giả mạo.
- Bạn CHỈ nhận được schema và các chỉ số tóm tắt, không chứa dữ liệu cá nhân nhạy cảm (PII).
- Trả về JSON theo đúng JSON Schema đã định nghĩa.
`.trim();

function getGeminiClient() {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || typeof apiKey !== "string" || !apiKey.trim()) {
    return null;
  }
  return new GoogleGenAI({ apiKey: apiKey.trim() });
}

/**
 * Tạo bản nháp gợi ý biểu đồ quy tắc dự phòng (Heuristic Rule-Based Fallback)
 * Sử dụng khi Gemini API không có key, timeout hoặc gặp sự cố quota
 */
export function generateFallbackDashboardDraft(profile, userMessage = "", rows = [], options = {}) {
  const columns = profile.columns || [];
  const numericCols = columns.filter((c) => c.isNumeric && !c.isIdentifier).map((c) => c.name);
  const identifierCols = columns.filter((c) => c.isIdentifier).map((c) => c.name);
  const categoryCols = columns.filter((c) => c.inferredType === "string" && !c.isPii && !c.isIdentifier).map((c) => c.name);
  const dateCols = columns.filter((c) => c.inferredType === "date").map((c) => c.name);

  const lowerMsg = String(userMessage || "").toLowerCase();
  const filterPassedOnly = lowerMsg.includes("đạt") || lowerMsg.includes("passed");

  const recommendedCharts = [];

  const domainInfo = profile.domainSummary || detectDatasetDomain(columns, rows);
  const isEducationalGrade = domainInfo.domain === "education_grade";

  if (isEducationalGrade) {
    // Phân hệ 1: Bảng điểm sinh viên LMS
    const idCol = identifierCols[0] || columns.find((c) => c.isIdentifier || /mã|mssv|id/i.test(c.name))?.name || "Mã Sinh Viên";
    const attendanceCol = numericCols.find((c) => /chuyên cần|attendance|cc/i.test(c)) || numericCols[0];
    const finalCol = numericCols.find((c) => /cuối kỳ|final|tổng kết/i.test(c)) || numericCols[1] || numericCols[0];
    const cohortCol = categoryCols.find((c) => /lớp|khoá|khóa|cohort|class/i.test(c)) || categoryCols[0];
    const rankCol = categoryCols.find((c) => /xếp loại|loại|rank|grade/i.test(c)) || categoryCols[1];

    recommendedCharts.push({
      chartId: "kpi_total_students",
      chartType: "kpi_card",
      title: "Tổng sinh viên",
      description: "Quy mô sĩ số sinh viên tham gia học phần.",
      xAxis: "Toàn bộ sinh viên",
      yAxis: idCol,
      aggregation: "COUNT",
      reasoning: "Theo dõi sĩ số sinh viên thực tế (DISTINCTCOUNT).",
      filter: filterPassedOnly ? "passed_only" : "none",
    });

    if (attendanceCol) {
      recommendedCharts.push({
        chartId: "kpi_attendance_avg",
        chartType: "kpi_card",
        title: "Điểm chuyên cần TB",
        description: `Giá trị trung bình mức độ chuyên cần của sinh viên.`,
        xAxis: "Toàn bộ sinh viên",
        yAxis: attendanceCol,
        aggregation: "AVG",
        reasoning: "Thước đo mức độ tích cực tham gia lớp học.",
        filter: filterPassedOnly ? "passed_only" : "none",
      });
    }

    if (finalCol) {
      recommendedCharts.push({
        chartId: "kpi_final_avg",
        chartType: "kpi_card",
        title: "Điểm cuối kỳ TB",
        description: `Điểm thi kết thúc học phần trung bình.`,
        xAxis: "Toàn bộ sinh viên",
        yAxis: finalCol,
        aggregation: "AVG",
        reasoning: "Chỉ số then chốt đánh giá kết quả học tập.",
        filter: filterPassedOnly ? "passed_only" : "none",
      });
    }

    recommendedCharts.push({
      chartId: "kpi_pass_rate",
      chartType: "kpi_card",
      title: "Tỷ lệ đạt",
      description: "Tỷ lệ sinh viên có kết quả học phần từ 5.0 trở lên.",
      xAxis: "Toàn bộ sinh viên",
      yAxis: "Tỷ lệ đạt",
      aggregation: "AVG",
      reasoning: "Tỷ lệ hoàn thành chuẩn đầu ra của môn học.",
      filter: filterPassedOnly ? "passed_only" : "none",
    });

    if (cohortCol && finalCol) {
      recommendedCharts.push({
        chartId: "bar_cohort_comparison",
        chartType: "bar",
        title: `Điểm trung bình theo ${cohortCol}`,
        description: `So sánh ${finalCol} giữa các lớp khóa.`,
        xAxis: cohortCol,
        yAxis: finalCol,
        aggregation: "AVG",
        reasoning: "Phát hiện sự chênh lệch kết quả học tập giữa các nhóm lớp.",
        filter: filterPassedOnly ? "passed_only" : "none",
      });
    }

    if (rankCol) {
      recommendedCharts.push({
        chartId: "donut_rank_distribution",
        chartType: "donut",
        title: `Phân bố ${rankCol}`,
        description: `Cơ cấu phần trăm sinh viên theo từng mức ${rankCol}.`,
        xAxis: rankCol,
        yAxis: "Số lượng",
        aggregation: "COUNT",
        reasoning: "Trực quan hóa tỷ lệ giỏi, khá, trung bình, yếu.",
        filter: filterPassedOnly ? "passed_only" : "none",
      });
    }

    recommendedCharts.push({
      chartId: "table_student_detail",
      chartType: "tableEx",
      title: "Bảng Danh Sách Sinh Viên Chi Tiết",
      description: "Tra cứu kết quả chi tiết từng sinh viên.",
      xAxis: "Danh sách",
      yAxis: "Chi tiết",
      aggregation: "NONE",
      columns: columns.map((c) => c.name),
      reasoning: "Hỗ trợ giảng viên tra cứu hồ sơ và điểm số cá nhân.",
      filter: filterPassedOnly ? "passed_only" : "none",
    });
  } else if (domainInfo.domain === "sales_revenue") {
    // Phân hệ 2: Doanh thu & Kinh doanh
    const revCol = numericCols.find((c) => /doanh[ _]?thu|revenue|sales/i.test(c)) || numericCols[0];
    const catCol = categoryCols[0] || (dateCols[0] ? dateCols[0] : "Danh Mục");
    const idCol = identifierCols[0] || "Mã Đơn";

    if (revCol) {
      recommendedCharts.push({
        chartId: "kpi_total_revenue",
        chartType: "kpi_card",
        title: `Tổng ${revCol}`,
        description: "Tổng doanh thu tích lũy toàn bộ giao dịch.",
        xAxis: "Toàn bộ",
        yAxis: revCol,
        aggregation: "SUM",
        reasoning: "Quy mô tài chính chủ đạo của bộ dữ liệu.",
      });

      recommendedCharts.push({
        chartId: "kpi_avg_revenue",
        chartType: "kpi_card",
        title: `Trung bình ${revCol}`,
        description: "Giá trị doanh thu bình quân trên mỗi giao dịch.",
        xAxis: "Toàn bộ",
        yAxis: revCol,
        aggregation: "AVG",
        reasoning: "Đo lường quy mô trung bình của từng đơn hàng.",
      });
    }

    recommendedCharts.push({
      chartId: "kpi_total_orders",
      chartType: "kpi_card",
      title: "Tổng số giao dịch",
      description: "Tổng số lượng bản ghi đơn hàng phát sinh.",
      xAxis: "Toàn bộ",
      yAxis: idCol,
      aggregation: "COUNT",
      reasoning: "Đếm tổng số giao dịch ghi nhận trong kỳ.",
    });

    if (catCol && revCol) {
      recommendedCharts.push({
        chartId: "bar_rev_by_cat",
        chartType: "bar",
        title: `${revCol} theo ${catCol}`,
        description: `So sánh ${revCol} phân bổ trên từng ${catCol}.`,
        xAxis: catCol,
        yAxis: revCol,
        aggregation: "SUM",
        reasoning: "Xác định nhóm đóng góp doanh số cao nhất.",
      });

      recommendedCharts.push({
        chartId: "donut_rev_share",
        chartType: "donut",
        title: `Cơ cấu ${catCol}`,
        description: `Tỷ lệ phần trăm đóng góp theo từng ${catCol}.`,
        xAxis: catCol,
        yAxis: revCol,
        aggregation: "COUNT",
        reasoning: "Trực quan hóa tỷ trọng các phân khúc.",
      });
    }

    recommendedCharts.push({
      chartId: "table_sales_detail",
      chartType: "tableEx",
      title: "Bảng Chi Tiết Giao Dịch",
      description: "Xem chi tiết dữ liệu kinh doanh.",
      xAxis: "Danh sách",
      yAxis: "Chi tiết",
      aggregation: "NONE",
      columns: columns.map((c) => c.name),
      reasoning: "Tra cứu toàn diện từng đơn hàng và dòng số liệu.",
    });
  } else if (domainInfo.domain === "survey_feedback") {
    // Phân hệ 3: Khảo sát & Ý kiến
    const ratingCol = numericCols.find((c) => /hai[ _]?long|rating|score|diem/i.test(c)) || numericCols[0];
    const criteriaCol = categoryCols[0] || "Tiêu Chí";

    recommendedCharts.push({
      chartId: "kpi_total_responses",
      chartType: "kpi_card",
      title: "Tổng số lượt phản hồi",
      description: "Số phiếu khảo sát đã ghi nhận.",
      xAxis: "Toàn bộ",
      yAxis: identifierCols[0] || "Số lượng",
      aggregation: "COUNT",
      reasoning: "Quy mô mẫu khảo sát thu thập được.",
    });

    if (ratingCol) {
      recommendedCharts.push({
        chartId: "kpi_avg_rating",
        chartType: "kpi_card",
        title: "Điểm đánh giá TB",
        description: "Mức độ hài lòng bình quân của người tham gia.",
        xAxis: "Toàn bộ",
        yAxis: ratingCol,
        aggregation: "AVG",
        reasoning: "Chỉ số hài lòng trọng tâm.",
      });

      recommendedCharts.push({
        chartId: "kpi_positive_rate",
        chartType: "kpi_card",
        title: "Tỷ lệ tích cực (>= 4)",
        description: "Tỷ lệ câu trả lời đạt mức hài lòng cao.",
        xAxis: "Toàn bộ",
        yAxis: ratingCol,
        aggregation: "AVG",
        reasoning: "Tỷ lệ đánh giá đạt ngưỡng chất lượng cao.",
      });
    }

    if (criteriaCol && ratingCol) {
      recommendedCharts.push({
        chartId: "bar_rating_by_criteria",
        chartType: "bar",
        title: `Điểm đánh giá theo ${criteriaCol}`,
        description: `So sánh mức độ hài lòng giữa các ${criteriaCol}.`,
        xAxis: criteriaCol,
        yAxis: ratingCol,
        aggregation: "AVG",
        reasoning: "Phát hiện tiêu chí cần cải thiện.",
      });
    }

    recommendedCharts.push({
      chartId: "table_survey_detail",
      chartType: "tableEx",
      title: "Bảng Chi Tiết Khảo Sát",
      description: "Tra cứu từng phiếu ý kiến phản hồi.",
      xAxis: "Danh sách",
      yAxis: "Chi tiết",
      aggregation: "NONE",
      columns: columns.map((c) => c.name),
      reasoning: "Hỗ trợ đọc chi tiết ý kiến đóng góp của người phản hồi.",
    });
  } else {
    // Phân hệ Tổng quát (Generic Fallback)
    const primaryId = identifierCols[0] || (columns.find((c) => c.isIdentifier)?.name) || "Mã";
    const primaryNum = numericCols[0] || null;
    const primaryCat = categoryCols[0] || null;
    const primaryDate = dateCols[0] || null;

    recommendedCharts.push({
      chartId: "kpi_1",
      chartType: "kpi_card",
      title: "Tổng số bản ghi",
      description: "Quy mô tập dữ liệu.",
      xAxis: "Toàn bộ",
      yAxis: primaryId,
      aggregation: "COUNT",
      reasoning: "Nắm bắt quy mô tổng thể của nguồn dữ liệu.",
      filter: filterPassedOnly ? "passed_only" : "none",
    });

    if (primaryNum) {
      const isSumMetric = /doanh[ _]?thu|chi[ _]?phi|loi[ _]?nhuan|luong|so[ _]?luong|tong|count|qty|amount/i.test(primaryNum);
      recommendedCharts.push({
        chartId: "kpi_2",
        chartType: "kpi_card",
        title: `${isSumMetric ? "Tổng" : "Trung bình"} ${primaryNum}`,
        description: `Giá trị ${isSumMetric ? "tổng cộng" : "trung bình"} của ${primaryNum}.`,
        xAxis: "Toàn bộ",
        yAxis: primaryNum,
        aggregation: isSumMetric ? "SUM" : "AVG",
        reasoning: "Chỉ số định lượng cốt lõi.",
        filter: filterPassedOnly ? "passed_only" : "none",
      });
    }

    if (numericCols.length > 1) {
      recommendedCharts.push({
        chartId: "kpi_3",
        chartType: "kpi_card",
        title: `Trung bình ${numericCols[1]}`,
        description: `Giá trị trung bình của chỉ số ${numericCols[1]}.`,
        xAxis: "Toàn bộ",
        yAxis: numericCols[1],
        aggregation: "AVG",
        reasoning: "Chỉ số định lượng phụ trợ quan trọng.",
      });
    }

    if (primaryCat && primaryNum) {
      recommendedCharts.push({
        chartId: "bar_1",
        chartType: "bar",
        title: `So sánh ${primaryNum} theo ${primaryCat}`,
        description: `Phân bổ ${primaryNum} trên từng nhóm ${primaryCat}.`,
        xAxis: primaryCat,
        yAxis: primaryNum,
        aggregation: "AVG",
        reasoning: "So sánh trực diện giữa các nhóm dữ liệu.",
        filter: filterPassedOnly ? "passed_only" : "none",
      });
    }

    if (primaryCat) {
      recommendedCharts.push({
        chartId: "donut_1",
        chartType: "donut",
        title: `Cơ cấu phân bổ theo ${primaryCat}`,
        description: `Tỷ lệ phần trăm từng nhóm ${primaryCat}.`,
        xAxis: primaryCat,
        yAxis: "Số lượng",
        aggregation: "COUNT",
        reasoning: "Trực quan hóa cơ cấu tỷ lệ.",
        filter: filterPassedOnly ? "passed_only" : "none",
      });
    }

    if (primaryDate && primaryNum) {
      recommendedCharts.push({
        chartId: "line_1",
        chartType: "line",
        title: `Xu hướng ${primaryNum} theo ${primaryDate}`,
        description: `Diễn biến ${primaryNum} qua các mốc ${primaryDate}.`,
        xAxis: primaryDate,
        yAxis: primaryNum,
        aggregation: "AVG",
        reasoning: "Phân tích xu hướng biến động theo trục thời gian.",
      });
    }

    recommendedCharts.push({
      chartId: "table_1",
      chartType: "tableEx",
      title: `Bảng Dữ Liệu Chi Tiết ${profile.name || ""}`.trim(),
      description: "Xem toàn bộ bản ghi nguồn.",
      xAxis: "Danh sách",
      yAxis: "Chi tiết",
      aggregation: "NONE",
      columns: columns.map((c) => c.name),
      reasoning: "Bảng tra cứu dữ liệu gốc.",
      filter: filterPassedOnly ? "passed_only" : "none",
    });
  }

  // Gắn số liệu thực tế cho từng biểu đồ
  const chartsWithRealData = recommendedCharts.map((chart) => ({
    ...chart,
    realData: computeChartRealData(chart, rows, options),
  }));

  return {
    replyMessage: `Đã phân tích cấu trúc nguồn dữ liệu "${profile.name}" (${profile.totalRows} dòng, ${profile.totalColumns} cột). Hệ thống đề xuất ${chartsWithRealData.length} biểu đồ trực quan hóa số liệu thực tế phù hợp nhất cho mục tiêu phân tích của bạn.`,
    draftTitle: `Báo cáo Phân tích Trực quan — ${profile.name}`,
    draftDescription: `Bản nháp dashboard tổng hợp các chỉ số ${numericCols.slice(0, 3).join(", ")} được tính toán từ dữ liệu thực tế.`,
    recommendedCharts: chartsWithRealData,
    suggestedLayout: "grid",
    nextStepsPrompt: "Bạn có thể bấm 'Chọn biểu đồ' để lưu vào bản nháp, đổi loại hiển thị hoặc yêu cầu AI lọc thêm dữ liệu.",
    mode: "fallback_rule_based",
    modelUsed: "none",
  };
}

/**
 * Trò chuyện với Gemini để phân tích yêu cầu và gợi ý cấu trúc biểu đồ DashboardDraft
 * @param {string} sourceId
 * @param {string} userMessage
 * @param {Array} conversationHistory
 * @param {object|null} teacherContext Thông tin giảng viên { moodleUserId, username }
 * @returns {Promise<object>} DashboardDraft
 */
export async function chatAndRecommendCharts(sourceId, userMessage, conversationHistory = [], teacherContext = null) {
  // Phân quyền server-side cho sourceId: không tin cậy client
  if (teacherContext?.moodleUserId) {
    const isOwner = verifySourceAccess(sourceId, teacherContext.moodleUserId);
    if (!isOwner) {
      const err = new Error("Bị từ chối truy cập: Nguồn dữ liệu không thuộc quyền quản lý của giảng viên.");
      err.statusCode = 403;
      throw err;
    }
  }

  const cachedSource = getCachedSource(sourceId);
  if (!cachedSource) {
    const err = new Error(`Nguồn dữ liệu với mã "${sourceId}" không tồn tại hoặc phiên làm việc đã hết hạn.`);
    err.statusCode = 404;
    throw err;
  }

  const profile = cachedSource.profile;
  const options = {
    sourceType: cachedSource.descriptor?.sourceType || cachedSource.profile?.sourceType,
    sourceName: cachedSource.descriptor?.sourceName || cachedSource.profile?.name,
    summary: cachedSource.profile?.summary,
  };

  // Lọc schema an toàn: TUYỆT ĐỐI KHÔNG GỬI DỮ LIỆU BẢN GHI HAY PII SANG GEMINI
  const safeSchema = {
    datasetName: profile.name,
    totalRows: profile.totalRows,
    totalColumns: profile.totalColumns,
    columns: profile.columns.map((c) => ({
      name: c.name,
      type: c.inferredType,
      isNumeric: c.isNumeric,
      missingPercentage: c.missingPercentage,
      sampleValues: c.sampleValues, // đã được che PII từ bước parse
      min: c.min,
      max: c.max,
      mean: c.mean,
    })),
    metricGroups: profile.metricGroups,
    piiFieldsDetected: profile.piiFieldsDetected,
  };

  const cleanMessage = String(userMessage || "").trim().slice(0, MAX_PROMPT_LENGTH);
  const promptForGemini = `
THÔNG TIN SCHEMA BỘ DỮ LIỆU (ĐÃ LOẠI BỎ THÔNG TIN NHẬN DẠNG CÁ NHÂN PII):
${JSON.stringify(safeSchema, null, 2)}

LỊCH SỬ TRAO ĐỔI TRONG PHIÊN:
${conversationHistory
  .slice(-4)
  .map((m) => `${m.role === "user" ? "Giảng viên" : "AI Studio"}: ${m.text}`)
  .join("\n")}

YÊU CẦU MỚI TỪ GIẢNG VIÊN:
"${cleanMessage || "Đề xuất các biểu đồ tổng quan phù hợp nhất cho bộ dữ liệu này."}"

Hãy trả lời giảng viên bằng tiếng Việt và đề xuất các biểu đồ tối ưu nhất theo định dạng JSON Schema có cấu trúc.
`.trim();

  const cooldown = getGeminiCooldownStatus();
  const feasibility = assessHeuristicFeasibility(cleanMessage, profile);
  const canUseGemini = process.env.AI_STUDIO_ENABLE_GEMINI_FALLBACK === "true" && !cooldown.inCooldown && Boolean(ai);

  const groqConfig = getGroqConfig();
  const groqCooldown = getGroqCooldownStatus();
  const canUseGroq = groqConfig.hasKey && !groqCooldown.inCooldown;

  if (canUseGroq) {
    try {
      console.log(`[aiStudioGeminiService] Đang điều phối Chat & Gợi ý biểu đồ qua Groq AI (${groqConfig.model})...`);
      const groqRes = await chatAndRecommendChartsWithGroq(safeSchema, cleanMessage, conversationHistory);
      const parsed = groqRes.rawDraft;

      const chartsWithRealData = (parsed.recommendedCharts || []).map((chart) => ({
        ...chart,
        realData: computeChartRealData(chart, cachedSource.rows, options),
      }));

      return {
        success: true,
        mode: "groq_api",
        provider: "Groq AI",
        modelUsed: groqRes.modelUsed || groqConfig.model,
        geminiStatus: "FALLBACK_GROQ",
        replyMessage: parsed.replyMessage || "Đã phân tích yêu cầu qua Groq AI và gợi ý các biểu đồ tối ưu.",
        draftTitle: parsed.draftTitle || `Báo cáo Trực quan — ${profile.name}`,
        draftDescription: parsed.draftDescription || "Bản nháp dashboard do Groq AI đề xuất.",
        recommendedCharts: chartsWithRealData,
        suggestedLayout: parsed.suggestedLayout || "grid",
        nextStepsPrompt: parsed.nextStepsPrompt || "",
        sourceDescriptor: cachedSource.descriptor,
      };
    } catch (groqErr) {
      console.warn("[aiStudioGeminiService] Groq AI chat failed, chuyển tiếp sang Heuristic Fallback:", groqErr.message);
    }
  }


  // =========================================================================
  // BƯỚC 1: THỬ NGHIỆM VỚI GEMINI AI NẾU KHẢ DỤNG (ƯU TIÊN 1)
  // =========================================================================
  if (canUseGemini) {
    try {
      const apiCallPromise = ai.models.generateContent({
        model: DEFAULT_GEMINI_MODEL,
        contents: promptForGemini,
        config: {
          systemInstruction: STUDIO_SYSTEM_INSTRUCTION,
          responseMimeType: "application/json",
          responseJsonSchema: {
            type: Type.OBJECT,
            properties: {
              replyMessage: {
                type: Type.STRING,
                description: "Câu trả lời tương tác tự nhiên với giảng viên bằng tiếng Việt.",
              },
              draftTitle: {
                type: Type.STRING,
                description: "Tiêu đề phù hợp cho Dashboard được đề xuất.",
              },
              draftDescription: {
                type: Type.STRING,
                description: "Tóm tắt mục đích phân tích của Dashboard.",
              },
              recommendedCharts: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    chartId: { type: Type.STRING },
                    chartType: {
                      type: Type.STRING,
                      enum: ["bar", "line", "pie", "donut", "scatter", "kpi_card"],
                    },
                    title: { type: Type.STRING },
                    description: { type: Type.STRING },
                    xAxis: { type: Type.STRING },
                    yAxis: { type: Type.STRING },
                    aggregation: {
                      type: Type.STRING,
                      enum: ["AVG", "SUM", "COUNT", "DISTRIBUTION", "NONE"],
                    },
                    reasoning: { type: Type.STRING },
                    filter: { type: Type.STRING },
                  },
                  required: ["chartId", "chartType", "title", "description", "xAxis", "yAxis", "aggregation", "reasoning"],
                },
              },
              suggestedLayout: {
                type: Type.STRING,
                enum: ["grid", "two_column", "highlight_top"],
              },
              nextStepsPrompt: {
                type: Type.STRING,
                description: "Gợi ý câu hỏi tiếp theo cho giảng viên.",
              },
            },
            required: ["replyMessage", "draftTitle", "draftDescription", "recommendedCharts", "suggestedLayout"],
          },
          temperature: 0.2,
          maxOutputTokens: 1200,
        },
      });

      const timeoutPromise = new Promise((_, reject) =>
        setTimeout(
          () => reject(new Error(`Quá thời gian phản hồi từ Gemini API (${API_TIMEOUT_MS}ms).`)),
          API_TIMEOUT_MS
        )
      );

      const response = await Promise.race([apiCallPromise, timeoutPromise]);
      const rawText = response.text;

      if (!rawText) {
        throw new Error("Gemini API trả về nội dung rỗng.");
      }

      const parsed = JSON.parse(rawText);

      // Tính toán số liệu thực tế từ dữ liệu gốc trên backend cho từng biểu đồ
      const chartsWithRealData = (parsed.recommendedCharts || []).map((chart) => ({
        ...chart,
        realData: computeChartRealData(chart, cachedSource.rows, options),
      }));

      return {
        success: true,
        mode: "gemini_api",
        provider: "Gemini AI",
        modelUsed: DEFAULT_GEMINI_MODEL,
        geminiStatus: "OK",
        replyMessage: parsed.replyMessage || "Đã phân tích yêu cầu và hoàn thiện bản nháp Dashboard.",
        draftTitle: parsed.draftTitle || `Báo cáo Trực quan — ${profile.name}`,
        draftDescription: parsed.draftDescription || "Bản nháp dashboard do AI đề xuất.",
        recommendedCharts: chartsWithRealData,
        suggestedLayout: parsed.suggestedLayout || "grid",
        nextStepsPrompt: parsed.nextStepsPrompt || "",
        sourceDescriptor: cachedSource.descriptor,
      };
    } catch (err) {
      if (err.statusCode === 403) throw err;
      parseGeminiErrorAndSetCooldown(err);
      console.warn("[aiStudioGeminiService] Gemini call failed, chuyển tiếp sang Groq AI:", err.message);
    }
  }

  // =========================================================================
  // BƯỚC 2: ĐIỀU PHỐI SANG GROQ AI (ƯU TIÊN 2 KHI GEMINI HẾT QUOTA / COOLDOWN)
  // =========================================================================
  // =========================================================================
  // BƯỚC 3: CẢ HAI AI ĐỀU KHÔNG KHẢ DỤNG -> XÉT TÍNH KHẢ THI & HEURISTIC FALLBACK
  // =========================================================================
  if (!feasibility.feasible) {
    return {
      success: false,
      unsupportedGoal: true,
      geminiStatus: "AI_UNAVAILABLE",
      mode: "AI_UNAVAILABLE",
      replyMessage: `⚠️ Cả Gemini và Groq AI hiện đang tạm khóa hoặc không khả dụng. Yêu cầu phân tích "${cleanMessage}" vượt quá khả năng của thuật toán quy tắc:\n${feasibility.reason}`,
      draftTitle: "Yêu cầu vượt quá khả năng thuật toán quy tắc",
      draftDescription: feasibility.reason,
      recommendedCharts: [],
      suggestedLayout: "grid",
      modelUsed: "none",
      cooldown,
    };
  }

  const fallbackDraft = generateFallbackDashboardDraft(profile, cleanMessage, cachedSource.rows, options);
  const cooldownNotice = cooldown.inCooldown
    ? `\n\n📌 **Lưu ý:** Báo cáo được đề xuất bởi **Thuật toán Quy tắc Dự phòng (Heuristic Fallback)**, do cả Gemini (${cooldown.formattedRemaining}) và Groq AI hiện không phản hồi.`
    : `\n\n📌 **Lưu ý:** Báo cáo được đề xuất bởi **Thuật toán Quy tắc Dự phòng** do chưa cấu hình API Key.`;

  return {
    success: true,
    ...fallbackDraft,
    replyMessage: (fallbackDraft.replyMessage || "") + cooldownNotice,
    geminiStatus: cooldown.inCooldown ? cooldown.status : "BLOCKED_NO_KEY",
    mode: "fallback_rule_based",
    isAiGenerated: false,
    cooldown,
  };
}
