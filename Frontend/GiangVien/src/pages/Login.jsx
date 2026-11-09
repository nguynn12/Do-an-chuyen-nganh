import DluUnifiedLogin from "../../../shared/components/DluUnifiedLogin";
import { saveTeacherSession } from "../services/authService";

/**
 * Trang Đăng nhập Cổng Giảng viên LMS Trường Đại học Đà Lạt
 * Tái sử dụng giao diện đăng nhập chung DluUnifiedLogin
 */
function Login() {
  return (
    <DluUnifiedLogin
      portal="teacher"
      onSaveSession={(user, remember, token) => {
        saveTeacherSession(user, remember, token);
      }}
    />
  );
}

export default Login;