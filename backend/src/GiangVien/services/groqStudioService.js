/**
 * groqStudioService.js
 * Quản lý kết nối, tỷ lệ giới hạn (Rate Limits), Cooldown và Tác quyền Báo cáo qua GroqCloud AI
 * Sử dụng mô hình openai/gpt-oss-120b làm AI dự phòng cao cấp khi Gemini API gặp sự cố Quota 429
 */

const GROQ_API_URL = "https://api.groq.com/openai/v1/chat/completions";
const DEFAULT_GROQ_MODEL = "openai/gpt-oss-120b";
const GROQ_TIMEOUT_MS = Number(process.env.GROQ_TIMEOUT_MS || 30000);

let groqCooldownUntil = 0;
let groqCooldownReason = null;
let groqLastErrorType = null;

/**
 * Lấy cấu hình Groq an toàn từ biến môi trường (không log ra ngoài)
 */
export function getGroqConfig() {
  const envKey = process.env.GROQ_API_KEY;
  const envModel = process.env.GROQ_MODEL;

  let apiKey = envKey ? String(envKey).trim() : null;
  let model = envModel ? String(envModel).trim() : DEFAULT_GROQ_MODEL;

  // Xử lý linh hoạt trường hợp người dùng dán nhầm API key vào biến GROQ_MODEL
  if (!apiKey && model && model.startsWith("gsk_")) {
    apiKey = model;
    model = DEFAULT_GROQ_MODEL;
  }

  return {
    apiKey,
    model: model && !model.startsWith("gsk_") ? model : DEFAULT_GROQ_MODEL,
    hasKey: Boolean(apiKey && apiKey.startsWith("gsk_")),
  };
}

/**
 * Phân tích lỗi và thiết lập thời gian giãn cách Cooldown cho Groq API
 */
export function parseGroqErrorAndSetCooldown(err) {
  const errMsg = err?.message || String(err || "");
  let delaySec = 120; // Mặc định 2 phút
  let errorType = "ERROR";
  let reason = errMsg;

  if (errMsg.includes("429") || errMsg.includes("rate_limit_exceeded") || errMsg.includes("quota")) {
    errorType = "RATE_LIMIT_429";
    const tryAgainMatch = errMsg.match(/try again in (\d+\.?\d*)s/i);
    const secMatch = errMsg.match(/retry(?:-after)?["']?\s*:\s*["']?(\d+)s?/i);
    if (tryAgainMatch) {
      delaySec = Math.ceil(parseFloat(tryAgainMatch[1])) + 2;
    } else if (secMatch) {
      delaySec = parseInt(secMatch[1], 10);
    } else {
      delaySec = 35;
    }
    reason = `GroqCloud API chạm hạn mức tốc độ (Rate Limit 429). Tạm giãn cách ${delaySec} giây trước khi gửi tiếp.`;
  } else if (errMsg.includes("503") || errMsg.includes("UNAVAILABLE") || errMsg.includes("overloaded")) {
    errorType = "HIGH_DEMAND_503";
    delaySec = 60;
    reason = "Máy chủ GroqCloud đang chịu tải cao tạm thời (503 Service Unavailable).";
  }

  groqCooldownUntil = Date.now() + delaySec * 1000;
  groqCooldownReason = reason;
  groqLastErrorType = errorType;

  console.warn(`[groqStudioService] Kích hoạt Cooldown Groq: ${errorType}, chờ ${delaySec}s.`);
  return {
    errorType,
    delaySec,
    cooldownUntil: groqCooldownUntil,
    reason,
  };
}

/**
 * Lấy trạng thái Cooldown của Groq API
 */
export function getGroqCooldownStatus() {
  const config = getGroqConfig();
  if (!config.hasKey) {
    return {
      hasKey: false,
      inCooldown: false,
      status: "NO_KEY",
      model: config.model,
      message: "Chưa cấu hình GROQ_API_KEY trong biến môi trường backend/.env.",
    };
  }

  const now = Date.now();
  if (now < groqCooldownUntil) {
    const remainingSec = Math.ceil((groqCooldownUntil - now) / 1000);
    return {
      hasKey: true,
      inCooldown: true,
      status: groqLastErrorType === "RATE_LIMIT_429" ? "RATE_LIMITED" : "COOLDOWN",
      remainingSeconds: remainingSec,
      formattedRemaining: `${remainingSec} giây`,
      cooldownUntil: groqCooldownUntil,
      model: config.model,
      reason: groqCooldownReason,
      message: `Groq AI đang tạm giãn cách (${remainingSec}s): ${groqCooldownReason}`,
    };
  }

  return {
    hasKey: true,
    inCooldown: false,
    status: "AVAILABLE",
    remainingSeconds: 0,
    formattedRemaining: "0 giây",
    cooldownUntil: 0,
    model: config.model,
    reason: null,
    message: `Groq AI (${config.model}) đang sẵn sàng phục vụ.`,
  };
}

/**
 * Gọi API Chat Completions của Groq với xử lý timeout và JSON object output
 */
async function callGroqChatCompletion(messages, options = {}) {
  const config = getGroqConfig();
  if (!config.hasKey) {
    throw new Error("Chưa cấu hình GROQ_API_KEY hợp lệ (bắt đầu bằng gsk_).");
  }

  const model = options.model || config.model;
  const temperature = options.temperature ?? 0.2;
  const timeoutMs = options.timeoutMs || GROQ_TIMEOUT_MS;

  const controller = new AbortController();
  const timeoutTimer = setTimeout(() => {
    controller.abort(new Error(`Groq API request timed out sau ${timeoutMs}ms`));
  }, timeoutMs);

  try {
    const payload = {
      model,
      messages,
      temperature,
      response_format: { type: "json_object" },
      ...(options.maxCompletionTokens ? {max_completion_tokens:options.maxCompletionTokens} : {}),
      ...(options.reasoningEffort && /^openai\/gpt-oss-/.test(model) ? {reasoning_effort:options.reasoningEffort} : {}),
    };

    const res = await fetch(GROQ_API_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${config.apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
      signal: controller.signal,
    });

    clearTimeout(timeoutTimer);

    if (!res.ok) {
      let errBody = null;
      try {
        errBody = await res.json();
      } catch {
        errBody = { message: `HTTP ${res.status} ${res.statusText}` };
      }
      const errMsg = errBody?.error?.message || errBody?.message || `Groq API returned HTTP ${res.status}`;

      // Tự động thử lại 1 lần nếu chạm hạn ngạch tốc độ tạm thời (short burst <= 35s)
      if (res.status === 429 && !options._isRetry) {
        const tryAgainMatch = errMsg.match(/try again in (\d+\.?\d*)s/i);
        const waitSec = tryAgainMatch ? Math.ceil(parseFloat(tryAgainMatch[1])) + 2 : null;
        if (waitSec && waitSec <= 35) {
          console.log(`[groqStudioService] Hạn ngạch TPM tạm thời bận. Tự động chờ ${waitSec}s rồi gửi lại...`);
          await new Promise((r) => setTimeout(r, waitSec * 1000));
          return await callGroqChatCompletion(messages, { ...options, _isRetry: true });
        }
      }

      if(/request too large/i.test(errMsg)) throw new Error('Yêu cầu chỉnh sửa vượt dung lượng Groq cho phép. Hãy chỉnh từng phần nhỏ của báo cáo; không cần đăng nhập lại.');
      const err = new Error(errMsg);
      err.statusCode = res.status;
      err.data = errBody;
      parseGroqErrorAndSetCooldown(err);
      throw err;
    }

    const data = await res.json();
    if(data?.choices?.[0]?.finish_reason==='length') throw new Error('Phản hồi AI chưa hoàn chỉnh vì báo cáo dài. Hãy yêu cầu chỉnh từng phần nhỏ hơn.');
    const content = data?.choices?.[0]?.message?.content;
    if (!content) {
      throw new Error("Groq API phản hồi rỗng (không có message content).");
    }

    return {
      content: content.trim(),
      model: data.model || model,
      usage: data.usage,
    };
  } catch (err) {
    clearTimeout(timeoutTimer);
    if (err.name === "AbortError" || err.message?.includes("timed out")) {
      const timeoutErr = new Error(`Groq API timed out sau ${timeoutMs}ms.`);
      timeoutErr.statusCode = 504;
      parseGroqErrorAndSetCooldown(timeoutErr);
      throw timeoutErr;
    }
    throw err;
  }
}

// Classroom assistant shares the configured provider and cooldown with Power BI.
// Only backend-computed, anonymous numeric aggregates leave the server.
export async function explainClassroomWithGroq(topic, aggregates) {
  if (getGroqCooldownStatus().inCooldown) throw new Error('AI đang chờ hạn mức.');
  const result = await callGroqChatCompletion([
    { role: 'system', content: 'Bạn là trợ lý giảng dạy tiếng Việt. Chỉ diễn giải các chỉ số JSON đã tính. Không suy đoán nguyên nhân, không gán nhãn sinh viên, không khẳng định xu hướng khi không có dữ liệu so sánh. Không viết số, phần trăm, URL, tên người hoặc Markdown; giao diện sẽ hiện số liệu chính xác riêng. Trả JSON {"insights":["nhận xét ngắn"],"suggestions":["hành động để giảng viên xem xét"]}, tối đa hai câu mỗi mảng. Dữ liệu thiếu hoặc mẫu bằng không phải nói chưa đủ dữ liệu. Các trường grades là ảnh chụp tích lũy, không phải điểm phát sinh trong tuần. Các trường assignmentStatus là trạng thái hiện tại của bài có hạn trong kỳ, không phải ảnh chụp lịch sử.' },
    { role: 'user', content: JSON.stringify({ topic, aggregates }) },
  ], { maxCompletionTokens: 1000, reasoningEffort: 'low', temperature: 0.1, timeoutMs: 20000 });
  const parsed = JSON.parse(result.content);
  const clean = values => Array.isArray(values) ? values.filter(value => typeof value === 'string' && !/[\d]|https?:|www\./i.test(value)).map(value => value.trim().slice(0, 400)).filter(Boolean).slice(0, 2) : [];
  const insights = clean(parsed.insights), suggestions = clean(parsed.suggestions);
  if (!insights.length) throw new Error('Phản hồi AI không đúng định dạng.');
  return { insights, suggestions, model: result.model, totalTokens: result.usage?.total_tokens || 0 };
}

/**
 * LẬP KẾ HOẠCH BÁO CÁO POWER BI (REPORT PLAN IR) QUA GROQ AI
 * @param {string} userGoal Mục tiêu phân tích tự nhiên
 * @param {object} datasetProfile Schema bộ dữ liệu
 * @param {string} catalogSummary Tóm tắt Data Catalog
 * @returns {Promise<object>} Report Plan IR
 */
const generalContractPrompt = `Bạn là chuyên gia thiết kế Power BI. Trả JSON thuần với reportTitle, tableName, measures [{name,dax,formatString}], pages [{id,displayName,visuals}], filters. Mỗi pages[].visuals[] là object đầy đủ với visualType, không chỉ ID. Ví dụ {"id":"chart_1","visualType":"columnChart","tableName":"ten_bang","categoryField":"ten_cot","measureField":"TenMeasure"}. Không dùng type/chartType thay visualType. Nếu dùng visuals gốc thì không lặp lại definitions trong pages. Chỉ dùng canonical tên bảng/cột trong catalog. DAX chỉ COUNTROWS('table') hoặc SUM/AVERAGE/MIN/MAX/COUNT/COUNTA/DISTINCTCOUNT('table'[column]). Không suy diễn ngưỡng nghiệp vụ, không SUM/AVERAGE identifier, không DAX phức tạp hoặc join nhiều bảng. Mỗi visual có tableName, id ASCII duy nhất, title, visualType và các trường hợp lệ. Hỗ trợ cardVisual (measureField), columnChart/barChart/lineChart/areaChart/donutChart/pieChart (categoryField,measureField,aggregation SUM/AVG/MIN/MAX/COUNT/COUNTA/DISTINCTCOUNT), stackedColumnChart (thêm seriesField), scatterChart (categoryField,xAxis,yAxis,xAggregation,yAggregation), histogram (field số,binSize tùy chọn), tableEx (columns), pivotTable (categoryField,columnField tùy chọn,measureField), slicer (categoryField). Tất cả field/measure cùng bảng của visual. filters là object tên cột: scalar hoặc array scalar; nhiều bảng chỉ dùng filters trên từng visual. Không tạo trang trống. Nếu yêu cầu ngoài phạm vi, giải thích giới hạn trong description; không bịa số liệu. Chọn biểu đồ từ cấu trúc và yêu cầu thực tế. Bảo toàn datasetId và toàn bộ thuộc tính thiết kế khi chỉnh sửa.`;

export async function generateReportPlanWithGroq(userGoal, datasetProfile, catalogSummary) {
  const config = getGroqConfig();

  let activeCatalogSummary = catalogSummary;
  if (!activeCatalogSummary && datasetProfile) {
    const rawTables = datasetProfile.tables || (datasetProfile.columns ? [{ tableName: datasetProfile.tableName || "Data", columns: datasetProfile.columns }] : []);
    activeCatalogSummary = rawTables.map((t) => {
      const colList = (t.columns || []).map((c) => `${c.name} (${c.inferredType}${c.isIdentifier ? ", Identifier - Cấm SUM/AVG" : c.isNumeric ? ", số" : ""})`).join(", ");
      return `Bảng: ${t.tableName || "Data"}\nCác cột: ${colList}`;
    }).join("\n\n");
  }

  const systemPrompt = `
Bạn là Kiến trúc sư Báo cáo Microsoft Power BI Cao cấp (Senior Power BI Solution Architect) thuộc Studio Phân tích Dữ liệu Đa năng Đại học Đà Lạt.
Nhiệm vụ của bạn là phân tích Data Catalog và mục tiêu của người dùng để lập một Kế hoạch Báo cáo Power BI hoàn chỉnh (Report Specification / Report Plan IR).

NGUYÊN TẮC BẮT BUỘC:
1. KHÔNG được áp đặt dashboard mẫu định sẵn. Mọi KPI, DAX Measure, trục biểu đồ, bộ lọc phải bám sát schema thực tế và mục tiêu của người dùng.
2. TẠO BIỂU ĐỒ ĐỘNG THEO YÊU CẦU THỰC TẾ CỦA NGƯỜI DÙNG:
   - Nếu người dùng yêu cầu số lượng biểu đồ cụ thể (ví dụ: "2 biểu đồ", "5 biểu đồ", "8 biểu đồ"): BẠN PHẢI TẠO CHÍNH XÁC số lượng biểu đồ (charts) được yêu cầu. Tuyệt đối không tự ý thêm hoặc bớt biểu đồ.
   - Nếu người dùng chỉ yêu cầu bảng và KPI (hoặc không muốn biểu đồ): TUYỆT ĐỐI KHÔNG tự tiện thêm biểu đồ không cần thiết.
   - Nếu người dùng không nêu rõ số lượng: Hãy tự chọn số lượng biểu đồ tối ưu (từ 2 đến 5 biểu đồ) phù hợp nhất với dữ liệu.
3. HỖ TRỢ BÁO CÁO NHIỀU TRANG (MULTI-PAGE REPORT):
   - Nếu người dùng yêu cầu số trang cụ thể (ví dụ: "2 trang", "3 trang Power BI") hoặc khi số lượng biểu đồ từ 5 biểu đồ trở lên không thể bố cục vừa vặn trên 1 trang canvas 1920x1080 mà không gây chật chội: BẠN PHẢI TỔ CHỨC thành mảng "pages" với các trang độc lập, tiêu đề trang phản ánh đúng phân hệ nghiệp vụ (ví dụ: "Tổng quan học tập", "Kết quả & Điểm số", "Chuyên cần & Quiz", "Phân tích nguy cơ").
   - Mỗi trang trong "pages" phải chứa mảng "visuals" của riêng trang đó.
   - Nếu là báo cáo 1 trang thông thường, bạn có thể trả về mảng "visuals" trực tiếp hoặc 1 trang trong "pages".
4. Dữ liệu là ĐA NĂNG (có thể là Dữ liệu Học tập, Điểm số, Chuyên cần, Sinh viên, Nhân sự, Bán hàng, Kho vận, v.v.).
5. CHỈ sử dụng tên cột và tên bảng THỰC SỰ TỒN TẠI trong Data Catalog. TUYỆT ĐỐI KHÔNG tự bịa tên cột.
6. Mọi công thức DAX chỉ dùng các hàm chuẩn Power BI Tabular: COUNTROWS, DISTINCTCOUNT, SUM, AVERAGE, MIN, MAX, DIVIDE, CALCULATE, FILTER, ROUND.
7. QUY TẮC BẢO VỆ ĐỊNH DANH (IDENTIFIER PROTECTION):
   - Tuyệt đối CẤM SUM hoặc AVERAGE trên các trường định danh học viên (Mã sinh viên, MSSV, ID, STT, Mã).
   - Nếu cần đếm số lượng sinh viên, BẮT BUỘC dùng DISTINCTCOUNT('Table'[Mã_Sinh_Viên]) hoặc COUNTROWS('Table').
8. NGUYÊN TẮC THIẾT KẾ DAX CHUẨN THEO TỪNG PHÂN HỆ NGHIỆP VỤ:
   - Nếu là Dữ liệu Điểm số / Học tập: Tỷ lệ đạt (>= 5.0) dùng DIVIDE(CALCULATE(COUNTROWS('Table'), 'Table'[Cột_Điểm] >= 5), COUNTROWS('Table'), 0) ("0.0%"). Sinh viên nguy cơ (< 5 điểm) dùng CALCULATE(COUNTROWS('Table'), 'Table'[Cột_Điểm] < 5) ("#,0"). Điểm trung bình dùng AVERAGE('Table'[Cột_Điểm]) ("0.00").
   - Nếu là Dữ liệu Kinh doanh / Tài chính: Tổng doanh thu / chi phí / lợi nhuận dùng SUM('Table'[Cột_Số_Tiền]) ("#,0 VNĐ"). Doanh thu trung bình đơn hàng dùng AVERAGE('Table'[Cột_Số_Tiền]). Tổng số đơn dùng DISTINCTCOUNT('Table'[Mã_Đơn]).
   - Nếu là Dữ liệu Khảo sát / Đánh giá: Điểm đánh giá TB dùng AVERAGE('Table'[Cột_Điểm_Đánh_Giá]) ("0.00"). Tỷ lệ hài lòng cao (>= 4) dùng DIVIDE(CALCULATE(COUNTROWS('Table'), 'Table'[Cột_Điểm_Đánh_Giá] >= 4), COUNTROWS('Table'), 0) ("0.0%").
   - Nếu là Dữ liệu Điểm danh / Chuyên cần: Tỷ lệ có mặt trung bình dùng AVERAGE('Table'[Cột_Tỷ_Lệ]) ("0.0%"). Tổng số buổi học dùng COUNTROWS('Table').
   - TUYỆT ĐỐI CHỈ DÙNG TÊN CỘT THẬT CÓ TRONG DATA CATALOG CỦA BẢNG ĐƯỢC CUNG CẤP.
9. visuals.visualType PHẢI thuộc danh mục được hỗ trợ thực tế sau:
   - Thẻ chỉ số: "cardVisual"
   - Cột / Thanh: "columnChart", "clusteredColumnChart", "barChart", "clusteredBarChart", "stackedColumnChart"
   - Đường / Miền: "lineChart", "areaChart"
   - Tròn / Vòng: "donutChart", "pieChart"
   - Phân tán: "scatterChart"
   - Kết hợp Cột & Đường: "lineClusteredColumnComboChart"
   - Bảng / Ma trận: "tableEx", "pivotTable"
   - Bộ lọc: "slicer"
10. visuals.categoryField và measureField PHẢI khớp chính xác với cột hoặc Measure tương ứng. Đối với biểu đồ kết hợp (combo chart), cung cấp measureField (cho cột) và secondaryMeasureField (cho đường). Đối với biểu đồ phân tán (scatter), cung cấp xAxis và yAxis.
11. ĐẦU RA PHẢI LÀ MỘT ĐỐI TƯỢNG JSON THUẦN TÚY (JSON OBJECT) theo cấu trúc:
{
  "reportTitle": "Tiêu đề báo cáo tiếng Việt chuyên nghiệp",
  "domain": "Lĩnh vực phân tích nhận diện được (ví dụ: Học tập LMS, Nhân sự, Bán hàng)",
  "tableName": "Tên bảng dữ liệu chính (khớp với Catalog)",
  "measures": [
    {
      "name": "Tên Measure (VD: Điểm Trung Bình, Tỷ Lệ Đạt)",
      "dax": "Công thức DAX chuẩn",
      "formatString": "#,0 hoặc 0.00 hoặc 0.0% hoặc $#,0",
      "description": "Giải thích ý nghĩa chỉ số"
    }
  ],
  "pages": [
    {
      "id": "page_1",
      "displayName": "Tên trang báo cáo (VD: Tổng quan Học tập)",
      "visuals": [
        {
          "id": "visual_1",
          "title": "Tiêu đề biểu đồ",
          "visualType": "columnChart/donutChart/cardVisual/lineChart/scatterChart/tableEx/slicer",
          "categoryField": "Tên cột trục X hoặc phân nhóm",
          "measureField": "Tên Measure hoặc cột số liệu",
          "secondaryMeasureField": "Tên Measure đường (nếu là combo chart)",
          "columns": ["Cột 1", "Cột 2"],
          "reasoning": "Lý do chọn trực quan hóa này"
        }
      ]
    }
  ],
  "visuals": [
    // Toàn bộ visuals hoặc visuals của trang chính
  ]
}
`.trim();

  const userPrompt = `
MỤC TIÊU PHÂN TÍCH CỦA NGƯỜI DÙNG:
"${userGoal || "Phân tích toàn diện bộ dữ liệu và đề xuất các chỉ số quan trọng"}"

DATA CATALOG CỦA TẬP DỮ LIỆU:
${activeCatalogSummary}
`.trim();

  const messages = [
    { role: "system", content: datasetProfile?.contractVersion===1 ? generalContractPrompt : systemPrompt },
    { role: "user", content: userPrompt },
  ];

  const result = await callGroqChatCompletion(messages, { model: config.model, temperature: 0.2 });
  const parsed = JSON.parse(result.content);
  return {
    rawPlan: parsed,
    modelUsed: result.model,
  };
}

/**
 * CHỈNH SỬA KẾ HOẠCH BÁO CÁO QUA HỘI THOẠI NHIỀU VÒNG (MULTI-TURN EDITING) BẰNG GROQ AI
 * @param {object} currentSpec Bản thiết kế Report Spec hiện tại
 * @param {string} userEditPrompt Câu lệnh chỉnh sửa tự nhiên
 * @param {object} datasetProfile Schema dữ liệu
 * @param {string} catalogSummary Data Catalog
 * @returns {Promise<object>} Report Plan IR sau chỉnh sửa
 */
// Only design and schema belong in an edit request, never source/preview rows.
export function buildCompactReportEditContext(spec,profile={}) {
  const pick=(value,keys)=>Object.fromEntries(keys.filter(k=>value?.[k]!==undefined).map(k=>[k,value[k]]));
  const visualKeys=['id','name','title','visualType','tableName','categoryField','measureField','secondaryMeasureField','aggregation','secondaryAggregation','seriesField','columnField','columns','xAxis','yAxis','xAggregation','yAggregation','field','binSize','histogram','filters','text','position'];
  const visual=v=>pick(v,visualKeys);
  const compactSpec={...pick(spec,['contractVersion','datasetId','reportTitle','domain','tableName','description']),
    measures:(spec.measures || []).map(m=>pick(m,['name','dax','formatString','tableName'])),
    filters:{...(spec.filters || {}),...(spec.activeFilters || {})}};
  if(spec.pages?.length) compactSpec.pages=spec.pages.map(p=>({...pick(p,['id','displayName']),visuals:(p.visuals || []).map(v=>visual({...v,...spec.visuals?.find(master=>master.id===v.id)}))}));
  else compactSpec.visuals=(spec.visuals || []).map(visual);
  const tables=profile.tables?.length?profile.tables:[{tableName:profile.tableName || spec.tableName,columns:profile.columns || []}];
  const catalog={tables:tables.map(t=>({tableName:t.tableName,columns:(t.columns || []).map(c=>pick(c,['name','originalName','dataType','inferredType','role','isIdentifier','isNumeric']))})),
    relationships:(profile.relationships || []).map(r=>pick(r,['fromTable','fromColumn','toTable','toColumn']))};
  return {compactSpec,catalog};
}
export function assertReportEditBudget(messages) {
  // Conservative UTF-8 estimate, with output reserve and headroom below 8k TPM.
  const estimatedInputTokens=Math.ceil(Buffer.byteLength(JSON.stringify(messages),'utf8')/2);
  if(estimatedInputTokens>4000) throw new Error('Thiết kế hoặc yêu cầu chỉnh sửa quá dài. Hãy chia báo cáo thành ít biểu đồ hơn hoặc rút gọn yêu cầu; dữ liệu nguồn vẫn được giữ nguyên.');
  return estimatedInputTokens;
}

export async function modifyReportPlanWithGroq(currentSpec, userEditPrompt, datasetProfile, catalogSummary) {
  const config = getGroqConfig();
  const systemPrompt = `
Bạn là Chuyên gia Tinh chỉnh Báo cáo Microsoft Power BI thuộc Hệ thống Phân tích Đa năng.
Người dùng hiện đang có một Bản thiết kế Báo cáo Power BI hiện tại (CURRENT REPORT SPEC) và muốn điều chỉnh nó qua câu lệnh tự nhiên.

NHIỆM VỤ CỦA BẠN:
1. Tiếp nhận câu lệnh chỉnh sửa của người dùng:
   - Thêm hoặc xóa biểu đồ theo đúng số lượng yêu cầu.
   - Đổi loại biểu đồ (ví dụ: sang lineChart, donutChart, scatterChart, stackedColumnChart, lineClusteredColumnComboChart).
   - Thêm/sửa/xóa DAX Measure, thêm bộ lọc slicer, đổi tiêu đề.
   - Thêm hoặc tách các trang (pages) nếu người dùng yêu cầu chia trang.
2. Áp dụng chính xác những thay đổi được yêu cầu.
3. GIỮ NGUYÊN các phần khác của báo cáo, các trang và biểu đồ hiện có mà người dùng không yêu cầu thay đổi.
4. Đảm bảo mọi tên cột, DAX Measure và Visuals đều hợp lệ với Data Catalog.
5. ĐẦU RA PHẢI LÀ MỘT ĐỐI TƯỢNG JSON ĐẦY ĐỦ theo đúng cấu trúc Report Plan:
{
  "reportTitle": "Tiêu đề báo cáo",
  "domain": "Lĩnh vực phân tích",
  "tableName": "Tên bảng chính",
  "measures": [...],
  "pages": [
    {
      "id": "page_id",
      "displayName": "Tên trang",
      "visuals": [...]
    }
  ],
  "visuals": [...]
}
`.trim();

  const {compactSpec,catalog}=buildCompactReportEditContext(currentSpec,datasetProfile);

  const userPrompt = `
YÊU CẦU CHỈNH SỬA CỦA NGƯỜI DÙNG:
"${userEditPrompt}"

CURRENT REPORT SPEC:
${JSON.stringify(compactSpec)}

DATA CATALOG TẬP DỮ LIỆU:
${JSON.stringify(catalog)}
`.trim();

  const messages = [
    { role: "system", content: (datasetProfile?.contractVersion===1 ? generalContractPrompt : systemPrompt)+' Trả kế hoạch đầy đủ, giữ nguyên phần không yêu cầu sửa. Visual chỉ định nghĩa một lần trong pages; không lặp ở visuals gốc. Không trả dữ liệu mẫu, previewData, realData, tables hoặc giải thích dài.' },
    { role: "user", content: userPrompt },
  ];
  assertReportEditBudget(messages);
  const result = await callGroqChatCompletion(messages, { model: config.model, temperature: 0.1,maxCompletionTokens:3000,reasoningEffort:'low' });
  const parsed = JSON.parse(result.content);
  return {
    rawPlan: parsed,
    modelUsed: result.model,
  };
}

/**
 * TRÒ CHUYỆN & GỢI Ý BIỂU ĐỒ (AI STUDIO CHAT) QUA GROQ AI
 * @param {object} safeSchema Schema an toàn không chứa PII
 * @param {string} userMessage Câu hỏi của giảng viên
 * @param {Array} conversationHistory Lịch sử trao đổi
 * @returns {Promise<object>} DashboardDraft
 */
export async function chatAndRecommendChartsWithGroq(safeSchema, userMessage, conversationHistory = []) {
  const config = getGroqConfig();
  const systemPrompt = `
Bạn là AI Dashboard Studio Assistant — Chuyên gia tư vấn phân tích dữ liệu đa năng cho Hệ thống LMS Đại học Đà Lạt, được vận hành bởi GroqCloud AI (${config.model}).
Nhiệm vụ của bạn:
1. Đọc Schema tóm tắt (DatasetProfile) của bất kỳ bộ dữ liệu nào (bán hàng, nhân sự, năng lượng, giáo dục, v.v.).
2. Đề xuất cấu trúc Dashboard trực quan hóa (DashboardDraft) bám sát schema thực tế bao gồm các biểu đồ phù hợp nhất:
   - "kpi_card": Thẻ hiển thị chỉ số then chốt (Tổng sinh viên/bản ghi, Điểm trung bình, Tỷ lệ đạt, v.v.).
   - "bar": So sánh các danh mục, lớp khóa, quy mô hoặc điểm số giữa các nhóm.
   - "pie" hoặc "donut": Phân bổ tỷ lệ phần trăm (nhóm xếp loại học tập, danh mục <= 6 nhóm).
   - "line": Xu hướng theo thời gian, tiến độ hoặc tương quan liên tục (chỉ dùng khi có cột thời gian/ngày tháng hợp lệ).
   - "scatter": Tương quan giữa 2 chỉ số định lượng.
   - "tableEx": Bảng chi tiết danh sách sinh viên hoặc bản ghi dữ liệu gốc.
3. QUY TẮC NGHIỆP VỤ & TÊN CỘT:
   - Khớp CHÍNH XÁC tên cột trong schema (ví dụ: 'Mã Sinh Viên', 'Điểm Chuyên Cần', 'Điểm Thi Cuối Kỳ', 'Lớp Khóa', 'Xếp Loại').
   - TUYỆT ĐỐI KHÔNG áp dụng SUM hoặc AVERAGE trên các trường định danh (như 'Mã Sinh Viên', 'MSSV', 'ID'). Đếm số sinh viên PHẢI dùng aggregation: "COUNT" hoặc "DISTINCTCOUNT".
   - Thẻ điểm trung bình dùng aggregation: "AVG" với yAxis là cột điểm số tương ứng.
   - Thẻ tỷ lệ đạt dùng yAxis: "Tỷ lệ đạt" và aggregation: "AVG".
4. Đưa ra giải thích rõ ràng, súc tích bằng tiếng Việt vì sao chọn từng biểu đồ và các trục x/y tương ứng.
5. TUYỆT ĐỐI KHÔNG sinh câu lệnh SQL, HTML, script độc hại.
6. ĐẦU RA PHẢI LÀ MỘT ĐỐI TƯỢNG JSON THEO CẤU TRÚC:
{
  "replyMessage": "Câu trả lời tương tác tự nhiên với giảng viên bằng tiếng Việt.",
  "draftTitle": "Tiêu đề phù hợp cho Dashboard được đề xuất",
  "draftDescription": "Tóm tắt mục đích phân tích của Dashboard",
  "recommendedCharts": [
    {
      "chartId": "kpi_1",
      "chartType": "kpi_card hoặc bar hoặc donut hoặc line hoặc scatter hoặc tableEx",
      "title": "Tiêu đề biểu đồ",
      "description": "Mô tả ngắn",
      "xAxis": "Tên cột trục X hoặc danh mục",
      "yAxis": "Tên cột số liệu",
      "aggregation": "AVG hoặc SUM hoặc COUNT hoặc DISTINCTCOUNT hoặc DISTRIBUTION hoặc NONE",
      "reasoning": "Lý do lựa chọn"
    }
  ],
  "suggestedLayout": "grid",
  "nextStepsPrompt": "Gợi ý câu hỏi tiếp theo cho giảng viên"
}
`.trim();

  const userPrompt = `
THÔNG TIN SCHEMA BỘ DỮ LIỆU (ĐÃ LOẠI BỎ PII):
${JSON.stringify(safeSchema, null, 2)}

LỊCH SỬ TRAO ĐỔI TRONG PHIÊN:
${conversationHistory
  .slice(-4)
  .map((m) => `${m.role === "user" ? "Giảng viên" : "AI Studio"}: ${m.text}`)
  .join("\n")}

YÊU CẦU MỚI TỪ GIẢNG VIÊN:
"${userMessage || "Đề xuất các biểu đồ tổng quan phù hợp nhất cho bộ dữ liệu này."}"
`.trim();

  const messages = [
    { role: "system", content: datasetProfile?.contractVersion===1 ? generalContractPrompt : systemPrompt },
    { role: "user", content: userPrompt },
  ];

  const result = await callGroqChatCompletion(messages, { model: config.model, temperature: 0.2 });
  const parsed = JSON.parse(result.content);
  return {
    rawDraft: parsed,
    modelUsed: result.model,
  };
}

