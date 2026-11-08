/**
 * API Key Middleware cho mô hình Bring Your Own Key (BYOK)
 * Đọc API Key từ header 'x-user-gemini-key' do Client gửi lên.
 * Nếu không có, fallback về biến môi trường process.env.GEMINI_API_KEY.
 */

export function apiKeyMiddleware(req, res, next) {
  // Lấy key từ header (hỗ trợ cả chữ hoa/thường)
  const clientKey =
    req.headers["x-user-gemini-key"] ||
    req.headers["X-User-Gemini-Key"] ||
    req.headers["x-gemini-api-key"];

  const rawKey =
    clientKey && typeof clientKey === "string" && clientKey.trim().length > 0
      ? clientKey
      : process.env.GEMINI_API_KEY;

  const keyToUse = rawKey && typeof rawKey === "string" ? rawKey.trim() : "";

  if (!keyToUse) {
    return res.status(401).json({
      success: false,
      message:
        "Chưa cấu hình Gemini API Key. Vui lòng nhập API Key cá nhân trên giao diện (BYOK) hoặc liên hệ quản trị viên.",
      code: "MISSING_API_KEY",
    });
  }

  // Điều kiện kiểm tra duy nhất: Key tồn tại và có độ dài tối thiểu từ 10 ký tự trở lên
  if (keyToUse.length < 10) {
    return res.status(400).json({
      success: false,
      message: "Gemini API Key không hợp lệ (độ dài tối thiểu 10 ký tự).",
      code: "INVALID_KEY_FORMAT",
    });
  }

  // Gắn key hợp lệ vào request để các controller tiếp theo sử dụng
  req.aiKey = keyToUse;
  next();
}

