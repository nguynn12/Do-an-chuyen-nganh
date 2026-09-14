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
