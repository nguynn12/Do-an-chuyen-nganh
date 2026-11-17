/**
 * geminiCooldownService.js
 * Quản lý trạng thái Quota, Cooldown và Retry-Delay của Google Gemini API
 * Ngăn chặn gọi API lặp lại khi đang chạm trần 429 hoặc quá tải 503
 */

// Thời điểm ban đầu thiết lập cooldown dựa trên phản hồi 429 lúc 08:18:30 (khoảng 20400 giây ~ 5.6 giờ)
const INITIAL_COOLDOWN_UNTIL = Date.now() + 20400 * 1000;

let cooldownUntil = INITIAL_COOLDOWN_UNTIL;
let cooldownReason = "Đã dùng hết hạn mức Gemini Free Tier (20 requests/ngày). Google yêu cầu đợi khoảng 5 giờ 30 phút trước khi gọi lại.";
let lastErrorType = "QUOTA_EXCEEDED_429";
let retryAfterSeconds = 20400;

/**
 * Phân tích và trích xuất retryDelay từ lỗi của Google Gemini API
 * @param {Error|object} err
 */
export function parseGeminiErrorAndSetCooldown(err) {
  const errMsg = err?.message || String(err || "");
  let delaySec = 300; // Mặc định 5 phút
  let errorType = "ERROR";
  let reason = errMsg;

  // 1. Phân tích lỗi 429 RESOURCE_EXHAUSTED
  if (errMsg.includes("429") || errMsg.includes("RESOURCE_EXHAUSTED") || errMsg.includes("quota") || errMsg.includes("Free Tier")) {
    errorType = "QUOTA_EXCEEDED_429";

    // Tìm retryDelay dạng số giây: "retryDelay": "20488s"
    const secMatch = errMsg.match(/retryDelay["']?\s*:\s*["']?(\d+)s/i);
    if (secMatch) {
      delaySec = parseInt(secMatch[1], 10);
    } else {
      // Tìm dạng "Please retry in 5h41m28s"
      const hoursMatch = errMsg.match(/(\d+)\s*h/i);
      const minsMatch = errMsg.match(/(\d+)\s*m/i);
      const secsMatch = errMsg.match(/(\d+)\s*s/i);
      let total = 0;
      if (hoursMatch) total += parseInt(hoursMatch[1], 10) * 3600;
      if (minsMatch) total += parseInt(minsMatch[1], 10) * 60;
      if (secsMatch) total += parseInt(secsMatch[1], 10);
      if (total > 0) delaySec = total;
    }

    const waitMins = Math.ceil(delaySec / 60);
    const waitHours = (delaySec / 3600).toFixed(1);
    reason = `Đã dùng hết hạn ngạch Gemini Free Tier (20 requests/ngày). Google yêu cầu giãn cách khoảng ${waitHours} giờ (${waitMins} phút).`;
  } else if (errMsg.includes("503") || errMsg.includes("UNAVAILABLE") || errMsg.includes("high demand")) {
    errorType = "HIGH_DEMAND_503";
    delaySec = 120; // 2 phút cho lỗi quá tải tạm thời
    reason = "Máy chủ Gemini đang chịu tải cao tạm thời (503 Service Unavailable). Tạm hoãn gọi lại trong 2 phút.";
  }

  retryAfterSeconds = delaySec;
  cooldownUntil = Date.now() + delaySec * 1000;
  cooldownReason = reason;
  lastErrorType = errorType;

  console.warn(`[geminiCooldownService] Kích hoạt Cooldown: ${errorType}, thời gian chờ: ${delaySec}s.`);

  return {
    errorType,
    delaySec,
    cooldownUntil,
    reason,
  };
}

/**
 * Kiểm tra xem Gemini có đang trong thời gian giãn cách Cooldown hay không
 */
export function getGeminiCooldownStatus() {
  const now = Date.now();
  if (now < cooldownUntil) {
    const remainingSec = Math.ceil((cooldownUntil - now) / 1000);
    const hours = Math.floor(remainingSec / 3600);
    const minutes = Math.floor((remainingSec % 3600) / 60);
    const seconds = remainingSec % 60;
    let formattedRemaining = `${minutes} phút ${seconds} giây`;
    if (hours > 0) formattedRemaining = `${hours} giờ ${minutes} phút`;

    return {
      inCooldown: true,
      status: lastErrorType === "QUOTA_EXCEEDED_429" ? "QUOTA_EXHAUSTED" : "HIGH_DEMAND",
      errorType: lastErrorType,
      remainingSeconds: remainingSec,
      formattedRemaining,
      cooldownUntil,
      reason: cooldownReason,
      message: `Gemini API hiện đang tạm khóa (${lastErrorType === "QUOTA_EXCEEDED_429" ? "Hết quota ngày" : "Máy chủ quá tải"}). Dự kiến hồi phục sau: ${formattedRemaining}.`,
    };
  }

  return {
    inCooldown: false,
    status: "AVAILABLE",
    errorType: null,
    remainingSeconds: 0,
    formattedRemaining: "0 giây",
    cooldownUntil: 0,
    reason: null,
    message: "Gemini API đang sẵn sàng.",
  };
}

/**
 * Đặt lại trạng thái cooldown (chỉ dùng cho kiểm thử kiểm soát)
 */
export function resetGeminiCooldownForTesting(delaySec = 0) {
  if (delaySec === 0) {
    cooldownUntil = 0;
    cooldownReason = null;
    lastErrorType = null;
    retryAfterSeconds = 0;
  } else {
    cooldownUntil = Date.now() + delaySec * 1000;
  }
}

