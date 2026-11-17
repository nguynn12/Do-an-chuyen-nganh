import { getStudentUserId } from "./studentAuth";

const BASE_URL = import.meta.env.VITE_API_URL
  ? `${import.meta.env.VITE_API_URL}/v1/student`
  : "/api/v1/student";

/**
 * Helper gọi API GET cho Cổng Sinh viên sử dụng Native Fetch chuẩn Web.
 * - Tự động gắn userId từ phiên đăng nhập vào query parameters.
 * - Hỗ trợ đầy đủ các query parameters truyền vào qua config.params.
 * - Chủ động kiểm tra response.ok: ném Error khi HTTP trả về 4xx/5xx để các trang bắt được qua khối catch.
 * - Xử lý an toàn lỗi phân tích cú pháp JSON (empty body hoặc HTML response).
 */
export async function studentGet(path, config = {}) {
  const userId = getStudentUserId();

  // Khởi tạo URL an toàn thông qua Web URL API
  const urlObj = new URL(`${BASE_URL}${path}`, window.location.origin);

  // 1. Gắn tự động tham số userId nếu đã đăng nhập và URL chưa có
  if (userId && !urlObj.searchParams.has("userId")) {
    urlObj.searchParams.set("userId", userId);
  }

  // 2. Gắn các tham số query params từ config.params
  if (config.params && typeof config.params === "object") {
    Object.entries(config.params).forEach(([key, val]) => {
      if (val !== undefined && val !== null) {
        urlObj.searchParams.set(key, String(val));
      }
    });
  }

  const finalUrl = `${urlObj.pathname}${urlObj.search}`;

  const token = localStorage.getItem("studentToken") || localStorage.getItem("token");

  const response = await fetch(finalUrl, {
    method: "GET",
    credentials: "include",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(config.headers || {}),
    },
  });

  // 3. Xử lý khi HTTP trả về mã lỗi 4xx hoặc 5xx (fetch không tự ném lỗi)
  if (!response.ok) {
    const errorText = await response.text();
    let errorMessage = `Yêu cầu máy chủ thất bại (HTTP ${response.status})`;
    try {
      if (errorText) {
        const parsed = JSON.parse(errorText);
        errorMessage = parsed.message || parsed.error || errorMessage;
      }
    } catch {
      if (errorText && errorText.length < 200) {
        errorMessage = errorText;
      }
    }
    const error = new Error(errorMessage);
    error.status = response.status;
    error.response = { status: response.status, data: errorText };
    throw error;
  }

  // 4. Xử lý phân tích cú pháp JSON an toàn
  const text = await response.text();
  if (!text || !text.trim()) {
    return null;
  }

  try {
    return JSON.parse(text);
  } catch (parseErr) {
    throw new Error(`Lỗi định dạng dữ liệu phản hồi từ máy chủ: ${parseErr.message}`);
  }
}

/**
 * Yêu cầu đăng nhập xác thực
 */
export async function loginRequest(username, password) {
  const response = await fetch("/api/auth/login", {
    method: "POST",
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify({ username, password }),
  });

  const text = await response.text();
  let result = {};
  try {
    result = text ? JSON.parse(text) : {};
  } catch {
    result = { message: text };
  }

  if (!response.ok || !result.success) {
    throw new Error(result.message || `Đăng nhập thất bại (HTTP ${response.status}).`);
  }
  return result;
}

export default {
  get: studentGet,
};
