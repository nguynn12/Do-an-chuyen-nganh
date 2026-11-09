import { Navigate, useLocation } from "react-router-dom";
import {
  isTeacherAuthenticated,
  clearTeacherSession,
} from "../services/authService";

function ProtectedRoute({ children }) {
  const location = useLocation();
  const authenticated = isTeacherAuthenticated();

  if (!authenticated) {
    // Dọn dẹp session rác/sai vai trò để tránh loop và lỗi dashboard
    clearTeacherSession();
    return <Navigate to="/dang-nhap" state={{ from: location }} replace />;
  }

  return children;
}

export default ProtectedRoute;
