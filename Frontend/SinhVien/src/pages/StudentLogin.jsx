import DluUnifiedLogin from "../../../shared/components/DluUnifiedLogin";
import { saveStudentSession } from "../services/studentAuth";

/**
 * Trang Đăng nhập Cổng Sinh viên LMS Trường Đại học Đà Lạt
 * Đồng bộ 100% giao diện với Cổng Giảng viên, tái sử dụng DluUnifiedLogin
 */
function StudentLogin() {
  return (
    <DluUnifiedLogin
      portal="student"
      onSaveSession={(user, remember, token) => {
        saveStudentSession(user, remember, token);
      }}
    />
  );
}

export default StudentLogin;