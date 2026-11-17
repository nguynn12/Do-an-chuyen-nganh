import { Navigate, useLocation } from "react-router-dom";
import {
  isTeacherAuthenticated,
  clearTeacherSession,
} from "../services/authService";

function ProtectedRoute({ children }) {
  const location = useLocation();

  // Cho phép chế độ demo chỉ trong môi trường phát triển (DEV)
  const isDemoAllowed = import.meta.env.DEV === true;
  const searchParams = new URLSearchParams(window.location.search);
  if (isDemoAllowed && searchParams.get("demo") === "1") {
    localStorage.setItem("isLoggedIn", "true");
    localStorage.setItem("userRole", "teacher");
    localStorage.setItem("currentTeacherId", "1");
    localStorage.setItem(
      "teacherUser",
      JSON.stringify({
        fullName: "Trần Bình Trọng",
        degree: "ThS.",
        initials: "GV",
      })
    );
  }

  const authenticated = isTeacherAuthenticated();

  if (!authenticated) {
    const userRole = localStorage.getItem("userRole");
    const isStudent = userRole === "student";
    // Dọn dẹp session rác/sai vai trò để tránh loop và lỗi dashboard
    clearTeacherSession();
    return (
      <Navigate
        to="/dang-nhap"
        state={{
          from: location,
          ...(isStudent
            ? {
                error:
                  "Tài khoản này là Sinh viên, vui lòng đăng nhập tại Cổng Sinh viên",
                targetPortal: "/sinhvien/dang-nhap",
              }
            : {}),
        }}
        replace
      />
    );
  }

  return children;
}

export default ProtectedRoute;
