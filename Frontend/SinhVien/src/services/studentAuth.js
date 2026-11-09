const STUDENT_KEYS = [
  "isLoggedIn",
  "userRole",
  "studentUserKey",
  "studentMoodleId",
  "studentName",
  "studentUsername",
  "studentEmail",
  "studentToken",
  "studentUser",
  "rememberStudentLogin",
  "user",
];

export function getStudentUserId() {
  return localStorage.getItem("studentUserKey") || "";
}

export function getStudentToken() {
  if (typeof window === "undefined") return "";
  return localStorage.getItem("studentToken") || "";
}

export function getStudentUsername() {
  try {
    const rawUser = localStorage.getItem("studentUser") || localStorage.getItem("user");
    if (rawUser) {
      let parsedUser;
      try {
        parsedUser = JSON.parse(rawUser);
      } catch {
        parsedUser = rawUser;
      }

      if (typeof parsedUser === "object" && parsedUser !== null) {
        const uname =
          parsedUser.username ||
          parsedUser.Username ||
          parsedUser.studentUsername ||
          parsedUser.user?.username;
        if (uname && typeof uname === "string" && uname.trim()) {
          return uname.trim();
        }
      } else if (typeof parsedUser === "string" && parsedUser.trim()) {
        return parsedUser.trim();
      }
    }

    const savedUsername =
      localStorage.getItem("studentUsername") ||
      localStorage.getItem("username");
    if (savedUsername && savedUsername.trim()) {
      return savedUsername.trim();
    }
  } catch (e) {
    console.warn("Lỗi khi đọc username từ localStorage:", e);
  }
  return "";
}

export function isStudentAuthenticated() {
  return (
    localStorage.getItem("isLoggedIn") === "true" &&
    localStorage.getItem("userRole") === "student" &&
    Boolean(getStudentUserId())
  );
}

export function saveStudentSession(user, remember = false, token = null) {
  if (!user) return;

  const userKey = String(user.userKey || "");
  const moodleUserId = String(user.moodleUserId || "");
  const username = user.username || "";
  const fullName = user.fullName || "";
  const email = user.email || "";
  const role = user.role || "student";
  const authToken = token || user.token || "";

  localStorage.setItem("isLoggedIn", "true");
  localStorage.setItem("userRole", role);
  localStorage.setItem("studentUserKey", userKey);
  localStorage.setItem("studentMoodleId", moodleUserId);
  localStorage.setItem("studentName", fullName);
  localStorage.setItem("studentUsername", username);
  localStorage.setItem("studentEmail", email);

  if (authToken) {
    localStorage.setItem("studentToken", authToken);
  }

  localStorage.setItem(
    "studentUser",
    JSON.stringify({
      userKey,
      moodleUserId,
      username,
      fullName,
      email,
      role,
    })
  );

  if (remember) {
    localStorage.setItem("rememberStudentLogin", "true");
  } else {
    localStorage.removeItem("rememberStudentLogin");
  }
}

export function clearAuthStorage() {
  if (typeof window === "undefined") return;
  STUDENT_KEYS.forEach((key) => localStorage.removeItem(key));
  // Không gọi localStorage.clear() bừa bãi để tránh mất cấu hình giao diện UI như collapsed sidebar
  localStorage.removeItem("isLoggedIn");
  localStorage.removeItem("userRole");
  localStorage.removeItem("studentUserKey");
  localStorage.removeItem("studentMoodleId");
  localStorage.removeItem("studentName");
  localStorage.removeItem("studentUsername");
  localStorage.removeItem("studentEmail");
  localStorage.removeItem("studentToken");
  localStorage.removeItem("studentUser");
  localStorage.removeItem("rememberStudentLogin");
}

