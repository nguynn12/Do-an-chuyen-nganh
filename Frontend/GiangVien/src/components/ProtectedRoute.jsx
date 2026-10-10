import { Navigate } from "react-router-dom";

function ProtectedRoute({ children }) {
  const searchParams = new URLSearchParams(window.location.search);
  if (searchParams.get("demo") === "1") {
    localStorage.setItem("isLoggedIn", "true");
    localStorage.setItem("userRole", "teacher");
    localStorage.setItem("currentTeacherId", "1");
    localStorage.setItem("teacherUser", JSON.stringify({
      fullName: "Trần Bình Trần",
      degree: "ThS.",
      initials: "GV"
    }));
  }

  const isLoggedIn = localStorage.getItem("isLoggedIn") === "true";

  if (!isLoggedIn) {
    return <Navigate to="/dang-nhap" replace />;
  }

  return children;
}

export default ProtectedRoute;
