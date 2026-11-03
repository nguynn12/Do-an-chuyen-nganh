import { Navigate } from "react-router-dom";
import { clearTeacherSession } from "../services/teacherAuth.js";

function ProtectedRoute({ children }) {
  const isDemoAllowed =
    import.meta.env.DEV === true ||
    import.meta.env.VITE_ALLOW_DEMO === "true";

  const searchParams = new URLSearchParams(window.location.search);
  if (isDemoAllowed && searchParams.get("demo") === "1") {
    localStorage.setItem("isLoggedIn", "true");
    localStorage.setItem("userRole", "teacher");
    localStorage.setItem("currentTeacherId", "1");
    localStorage.setItem(
      "teacherUser",
      JSON.stringify({
        fullName: "Trần Bình Trần",
        degree: "ThS.",
        initials: "GV",
      })
    );
  }

  const isLoggedIn = localStorage.getItem("isLoggedIn") === "true";
  const userRole = localStorage.getItem("userRole");

  if (!isLoggedIn || userRole !== "teacher") {
    const isStudent = userRole === "student";
    clearTeacherSession();

    return (
      <Navigate
        to="/dang-nhap"
        replace
        state={
          isStudent
            ? {
                error:
                  "Tài khoản này là Sinh viên, vui lòng đăng nhập tại Cổng Sinh viên",
                targetPortal: "/sinhvien/dang-nhap",
              }
            : undefined
        }
      />
    );
  }

  return children;
}

export default ProtectedRoute;
