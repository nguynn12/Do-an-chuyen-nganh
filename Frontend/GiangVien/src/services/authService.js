// ==============================================================================
// DỊCH VỤ XÁC THỰC GIẢNG VIÊN LMS - SINGLE SOURCE OF TRUTH
// ==============================================================================

export const TEACHER_AUTH_KEYS = [
  "isLoggedIn",
  "currentTeacherId",
  "currentUserKey",
  "currentUsername",
  "currentUserName",
  "currentUserEmail",
  "userRole",
  "teacherToken",
  "teacherUser",
  "rememberLogin",
];

/**
 * Lấy phiên đăng nhập giảng viên hiện tại từ localStorage.
 * Trả về session object nếu hợp lệ, ngược lại trả về null.
 */
export function getTeacherSession() {
  if (typeof window === "undefined") return null;

  try {
    const isLoggedIn = localStorage.getItem("isLoggedIn") === "true";
    const userRole = localStorage.getItem("userRole");
    const rawTeacherId = localStorage.getItem("currentTeacherId");
    const teacherId = Number(rawTeacherId);

    // Bắt buộc phải là role teacher và teacherId hợp lệ (> 0)
    if (!isLoggedIn || userRole !== "teacher" || !teacherId || Number.isNaN(teacherId)) {
      return null;
    }

    return {
      teacherId,
      userKey: Number(localStorage.getItem("currentUserKey")) || null,
      username: localStorage.getItem("currentUsername") || "",
      fullName: localStorage.getItem("currentUserName") || "",
      email: localStorage.getItem("currentUserEmail") || "",
      role: "teacher",
    };
  } catch (error) {
    console.error("[Auth] Lỗi đọc phiên đăng nhập:", error);
    return null;
  }
}

/**
 * Kiểm tra xem giảng viên đã xác thực hợp lệ hay chưa
 */
export function isTeacherAuthenticated() {
  return Boolean(getTeacherSession());
}

/**
 * Lưu phiên đăng nhập giảng viên vào localStorage
 */
export function saveTeacherSession(user, remember = false, token = null) {
  if (!user) return;

  const teacherId = String(user.moodleUserId || user.teacherId || "");
  const userKey = String(user.userKey || "");
  const username = user.username || "";
  const fullName = user.fullName || "";
  const email = user.email || "";
  const role = user.role || "teacher";
  const authToken = token || user.token || "";

  localStorage.setItem("isLoggedIn", "true");
  localStorage.setItem("userRole", role);
  localStorage.setItem("currentTeacherId", teacherId);
  localStorage.setItem("currentUserKey", userKey);
  localStorage.setItem("currentUsername", username);
  localStorage.setItem("currentUserName", fullName);
  localStorage.setItem("currentUserEmail", email);

  if (authToken) {
    localStorage.setItem("teacherToken", authToken);
  }

  // Lưu thông tin người dùng cho Header & Profile
  localStorage.setItem(
    "teacherUser",
    JSON.stringify({
      fullName,
      degree: "ThS.",
      initials:
        fullName
          .split(" ")
          .filter(Boolean)
          .map((w) => w[0])
          .slice(-2)
          .join("")
          .toUpperCase() || "GV",
      email,
      username,
    })
  );

  if (remember) {
    localStorage.setItem("rememberLogin", "true");
  } else {
    localStorage.removeItem("rememberLogin");
  }
}

/**
 * Lấy Bearer token của giảng viên từ localStorage
 */
export function getTeacherToken() {
  if (typeof window === "undefined") return "";
  return localStorage.getItem("teacherToken") || "";
}

/**
 * Lấy Bearer token của giảng viên từ phiên đăng nhập hợp lệ
 */
export async function ensureTeacherToken() {
  return getTeacherToken();
}

/**
 * Xóa sạch toàn bộ phiên đăng nhập giảng viên
 */
export function clearTeacherSession() {
  if (typeof window === "undefined") return;

  TEACHER_AUTH_KEYS.forEach((key) => {
    localStorage.removeItem(key);
  });
}

