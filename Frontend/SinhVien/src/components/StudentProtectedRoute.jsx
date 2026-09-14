import { Navigate } from "react-router-dom";

/**
 * Route Guard cho phân hệ Sinh viên:
 * Kiểm tra trạng thái đăng nhập và quyền 'student'.
 * Nếu không hợp lệ, xóa sạch phiên và chuyển hướng về /dang-nhap.
 */
function StudentProtectedRoute({ children }) {
  const isLoggedIn = localStorage.getItem("isLoggedIn") === "true";
  const userRole = localStorage.getItem("userRole");

  if (!isLoggedIn || userRole !== "student") {
    localStorage.removeItem("isLoggedIn");
    localStorage.removeItem("studentUserKey");
    localStorage.removeItem("studentMoodleId");
    localStorage.removeItem("userRole");
    return <Navigate to="/dang-nhap" replace />;
  }

  return children;
}

export default StudentProtectedRoute;