/**
 * Bộ phân tích ý định ngôn ngữ tự nhiên cục bộ (Local Rule-based Intent Parser)
 * Không tốn phí, xử lý tức thì, bảo mật 100% không gửi dữ liệu ra bên ngoài.
 */

// Danh sách các từ khóa / regex biểu thức chính quy đại diện cho từng Intent
const INTENT_RULES = [
  {
    intent: "grade_distribution",
    label: "Phân bố điểm môn học",
    description: "Phân tích phổ điểm, các mức xếp loại (Xuất sắc, Giỏi, Khá, Trung bình, Yếu) và điểm trung bình của môn học.",
    patterns: [
      /ph[âa]n\s*b[ốo]\s*điểm/i,
      /phổ\s*điểm/i,
      /th[ốo]ng\s*k[êe]\s*điểm/i,
      /ph[âa]n\s*phối\s*điểm/i,
      /tình\s*hình\s*điểm/i,
      /xem\s*điểm/i,
      /bảng\s*điểm/i,
      /kết\s*quả\s*học\s*tập/i,
      /grade\s*distribution/i,
      /score\s*distribution/i,
      /điểm\s*số/i,
    ],
  },
];

/**
 * Phân tích câu hỏi tiếng Việt của giảng viên sang Intent có cấu trúc
 * @param {string} promptText Câu yêu cầu từ giảng viên
 * @returns {object} { intent, matched, confidence, message, availableIntents }
 */
export function parseLocalIntent(promptText) {
  if (!promptText || typeof promptText !== "string") {
    return {
      matched: false,
      intent: "empty",
      confidence: 0,
      message: "Vui lòng nhập câu hỏi hoặc yêu cầu phân tích.",
      availableIntents: INTENT_RULES.map((r) => ({ intent: r.intent, label: r.label, description: r.description })),
    };
  }

  const cleanPrompt = promptText.trim();

  if (cleanPrompt.length < 2) {
    return {
      matched: false,
      intent: "too_short",
      confidence: 0,
      message: "Câu hỏi quá ngắn. Vui lòng nhập chi tiết hơn (Ví dụ: 'Xem phân bố điểm môn học').",
      availableIntents: INTENT_RULES.map((r) => ({ intent: r.intent, label: r.label, description: r.description })),
    };
  }

  if (cleanPrompt.length > 300) {
    return {
      matched: false,
      intent: "too_long",
      confidence: 0,
      message: "Câu hỏi vượt quá giới hạn cho phép (tối đa 300 ký tự).",
      availableIntents: INTENT_RULES.map((r) => ({ intent: r.intent, label: r.label, description: r.description })),
    };
  }

  // Khớp với các quy tắc intent đã khai báo
  for (const rule of INTENT_RULES) {
    for (const pattern of rule.patterns) {
      if (pattern.test(cleanPrompt)) {
        return {
          matched: true,
          intent: rule.intent,
          confidence: 1.0,
          label: rule.label,
          cleanPrompt,
        };
      }
    }
  }

  // Nếu không khớp intent nào trong whitelist
  return {
    matched: false,
    intent: "unsupported",
    confidence: 0,
    cleanPrompt,
    message:
      "Hiện tại trợ lý AI LMS hỗ trợ phân tích: 'Xem phân bố điểm môn học' (grade_distribution). Bạn có thể thử các câu lệnh mẫu như: 'Xem phân bố điểm môn học', 'Phổ điểm cả lớp', hoặc 'Thống kê điểm số'.",
    availableIntents: INTENT_RULES.map((r) => ({ intent: r.intent, label: r.label, description: r.description })),
  };
}
