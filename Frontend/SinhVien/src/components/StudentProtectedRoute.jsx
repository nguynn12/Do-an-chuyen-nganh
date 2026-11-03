import { Navigate } from "react-router-dom";
import { clearAuthStorage } from "../services/studentAuth";

/**
 * Route Guard cho phân hệ Sinh viên:
 * Kiểm tra trạng thái đăng nhập và quyền 'student'.
 * Nếu không hợp lệ, xóa sạch phiên Sinh viên và chuyển hướng về /dang-nhap.
 */
function StudentProtectedRoute({ children }) {
  const isDemoAllowed =
    import.meta.env.DEV === true ||
    import.meta.env.VITE_ALLOW_DEMO === "true";

  const searchParams = new URLSearchParams(window.location.search);
  if (isDemoAllowed && searchParams.get("demo") === "1") {
    localStorage.setItem("isLoggedIn", "true");
    localStorage.setItem("userRole", "student");
    localStorage.setItem("studentUserKey", "2");
    localStorage.setItem("studentMoodleId", "3");
    localStorage.setItem("studentName", "Trần Thị Bình");
    localStorage.setItem("studentUsername", "sv2310002");
  }

  const isLoggedIn = localStorage.getItem("isLoggedIn") === "true";
  const userRole = localStorage.getItem("userRole");

  if (!isLoggedIn || userRole !== "student") {
    const isTeacher = userRole === "teacher";
    clearAuthStorage();

    return (
      <Navigate
        to="/dang-nhap"
        replace
        state={
          isTeacher
            ? {
                error:
                  "Tài khoản này là Giảng viên, vui lòng đăng nhập tại Cổng Giảng viên",
                targetPortal: "/giangvien/dang-nhap",
              }
            : undefined
        }
      />
    );
  }

  return children;
}

export default StudentProtectedRoute;
