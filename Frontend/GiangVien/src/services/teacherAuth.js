export const TEACHER_STORAGE_KEYS = [
  "isLoggedIn",
  "userRole",
  "currentTeacherId",
  "currentUserKey",
  "currentUsername",
  "currentUserName",
  "currentUserEmail",
  "teacherUser",
  "teacherToken",
  "rememberLogin",
];

export const STUDENT_STORAGE_KEYS = [
  "studentUserKey",
  "studentMoodleId",
  "studentUsername",
  "studentName",
  "studentEmail",
  "rememberStudentLogin",
];

/**
 * Xóa sạch toàn bộ khóa phiên của Giảng viên khỏi localStorage
 */
export function clearTeacherSession() {
  TEACHER_STORAGE_KEYS.forEach((key) => localStorage.removeItem(key));
}

/**
 * Xóa các khóa phiên Sinh viên để tránh xung đột origin
 */
export function clearStudentSession() {
  STUDENT_STORAGE_KEYS.forEach((key) => localStorage.removeItem(key));
}

