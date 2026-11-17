import crypto from "crypto";

// Secret khóa ký token HMAC-SHA256
// Ưu tiên đọc từ biến môi trường SESSION_SECRET hoặc JWT_SECRET.
// Fallback khóa cố định phát triển để bảo toàn phiên đăng nhập của Giảng viên qua các lần nodemon reload.
const DEFAULT_DEV_SECRET = "dlu_lms_powerbi_studio_secret_2026_secure_key_8450369b";

function getTokenSecret() {
  return process.env.SESSION_SECRET || process.env.JWT_SECRET || DEFAULT_DEV_SECRET;
}

// Thời hạn mặc định: 7 ngày (tính bằng ms)
const DEFAULT_TTL_MS = 7 * 24 * 60 * 60 * 1000;

function base64UrlEncode(str) {
  return Buffer.from(str)
    .toString("base64")
    .replace(/=/g, "")
    .replace(/\+/g, "-")
    .replace(/\//g, "_");
}

function base64UrlDecode(str) {
  let base64 = str.replace(/-/g, "+").replace(/_/g, "/");
  while (base64.length % 4) {
    base64 += "=";
  }
  return Buffer.from(base64, "base64").toString("utf8");
}

/**
 * Sinh token HMAC-SHA256 an toàn cho giảng viên
 * Payload gồm: { moodleUserId, userKey, username, role, exp }
 */
export function generateAuthToken(payload, ttlMs = DEFAULT_TTL_MS) {
  const header = {
    alg: "HS256",
    typ: "JWT",
  };

  const now = Date.now();
  const tokenPayload = {
    ...payload,
    iat: now,
    exp: now + ttlMs,
  };

  const encodedHeader = base64UrlEncode(JSON.stringify(header));
  const encodedPayload = base64UrlEncode(JSON.stringify(tokenPayload));
  const dataToSign = `${encodedHeader}.${encodedPayload}`;

  const signature = crypto
    .createHmac("sha256", getTokenSecret())
    .update(dataToSign)
    .digest("base64")
    .replace(/=/g, "")
    .replace(/\+/g, "-")
    .replace(/\//g, "_");

  return `${dataToSign}.${signature}`;
}

/**
 * Xác thực và giải mã token
 * Trả về payload nếu hợp lệ, ngược lại trả về null
 */
export function verifyAuthToken(token) {
  try {
    if (!token || typeof token !== "string") return null;

    const parts = token.trim().split(".");
    if (parts.length !== 3) return null;

    const [encodedHeader, encodedPayload, signature] = parts;
    const dataToSign = `${encodedHeader}.${encodedPayload}`;

    // Kiểm tra chữ ký bằng so sánh an toàn thời gian (timing-safe compare)
    const expectedSig = crypto
      .createHmac("sha256", getTokenSecret())
      .update(dataToSign)
      .digest("base64")
      .replace(/=/g, "")
      .replace(/\+/g, "-")
      .replace(/\//g, "_");

    const sigBuf = Buffer.from(signature);
    const expectedBuf = Buffer.from(expectedSig);

    if (
      sigBuf.length !== expectedBuf.length ||
      !crypto.timingSafeEqual(sigBuf, expectedBuf)
    ) {
      return null;
    }

    const payload = JSON.parse(base64UrlDecode(encodedPayload));

    // Kiểm tra hết hạn
    if (payload.exp && Date.now() > payload.exp) {
      return null;
    }

    return payload;
  } catch {
    return null;
  }
}
