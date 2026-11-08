/**
 * Client gọi API AI cho Cổng Sinh viên (BYOK Model)
 * Tự động đọc 'user_gemini_key' từ sessionStorage và gắn vào header 'x-user-gemini-key'.
 */

const STORAGE_KEY = "user_gemini_key";

function getStoredKey() {
  try {
    return sessionStorage.getItem(STORAGE_KEY) || "";
  } catch (e) {
    return "";
  }
}

/**
 * Hàm gọi API chung cho phân hệ AI
 */
export async function aiFetch(endpoint, options = {}) {
  const storedKey = getStoredKey();
  const headers = {
    "Content-Type": "application/json",
    Accept: "application/json",
    ...(storedKey ? { "x-user-gemini-key": storedKey } : {}),
    ...(options.headers || {}),
  };

  const url = endpoint.startsWith("/") ? endpoint : `/api/ai/${endpoint}`;

  const response = await fetch(url, {
    ...options,
    headers,
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    const error = new Error(
      data.message || `Lỗi yêu cầu AI (Mã HTTP ${response.status})`
    );
    error.status = response.status;
    error.data = data;
    throw error;
  }

  return data;
}

/**
 * 1. Ping xác thực API Key
 */
export async function verifyAiKey(customKey) {
  const headers = customKey ? { "x-user-gemini-key": customKey.trim() } : {};
  return aiFetch("/api/ai/verify-key", {
    method: "POST",
    headers,
  });
}

/**
 * 2. Lấy nhận xét Cố vấn học tập AI Study Coach
 */
export async function fetchStudentStudyCoach(userKey, courseKey) {
  const params = new URLSearchParams();
  if (userKey) params.append("userKey", userKey);
  if (courseKey) params.append("courseKey", courseKey);

  const queryStr = params.toString() ? `?${params.toString()}` : "";
  return aiFetch(`/api/ai/student/coach${queryStr}`, {
    method: "GET",
  });
}

