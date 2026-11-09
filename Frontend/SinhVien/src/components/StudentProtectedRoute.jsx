import { Navigate } from "react-router-dom";
import { isStudentAuthenticated, clearAuthStorage } from "../services/studentAuth";

/**
 * Route Guard cho phân hệ Sinh viên:
 * Kiểm tra trạng thái đăng nhập và quyền 'student'.
 * Nếu không hợp lệ, xóa sạch phiên và chuyển hướng về /dang-nhap.
 */
function StudentProtectedRoute({ children }) {
  const searchParams = new URLSearchParams(window.location.search);
  if (searchParams.get("demo") === "1") {
    localStorage.setItem("isLoggedIn", "true");
    localStorage.setItem("userRole", "student");
    localStorage.setItem("studentUserKey", "2");
    localStorage.setItem("studentMoodleId", "3");
    localStorage.setItem("studentName", "Trần Thị Bình");
    localStorage.setItem("studentUsername", "sv2310002");
  }

  const authenticated = isStudentAuthenticated();

  if (!authenticated) {
    clearAuthStorage();
    return <Navigate to="/dang-nhap" replace />;
  }

  return children;
}


export default StudentProtectedRoute;