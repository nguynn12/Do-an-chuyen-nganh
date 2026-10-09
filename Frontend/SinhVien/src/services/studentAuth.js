const STUDENT_KEYS = [
  "isLoggedIn",
  "userRole",
  "studentUserKey",
  "studentMoodleId",
  "studentName",
  "studentUsername",
];

export function getStudentUserId() {
  return localStorage.getItem("studentUserKey") || "";
}

export function getStudentUsername() {
  try {
    const rawUser = localStorage.getItem("user");
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
  return "sv2310002";
}

export function isStudentAuthenticated() {
  return (
    localStorage.getItem("isLoggedIn") === "true" &&
    localStorage.getItem("userRole") === "student" &&
    Boolean(getStudentUserId())
  );
}

export function saveStudentSession(user) {
  localStorage.setItem("isLoggedIn", "true");
  localStorage.setItem("userRole", user.role);
  localStorage.setItem("studentUserKey", String(user.userKey));
  localStorage.setItem("studentMoodleId", String(user.moodleUserId));
  localStorage.setItem("studentName", user.fullName || "");
  localStorage.setItem("studentUsername", user.username || "");
}

export function clearAuthStorage() {
  STUDENT_KEYS.forEach((key) => localStorage.removeItem(key));
  localStorage.clear();
}
