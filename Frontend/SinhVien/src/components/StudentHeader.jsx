import { useNavigate } from "react-router-dom";
import { clearAuthStorage } from "../services/studentAuth";
import DluHeader from "../../../shared/components/DluHeader";

export default function StudentHeader({ student, onSearch }) {
  const navigate = useNavigate();

  const displayName =
    student?.fullName || localStorage.getItem("studentName") || "Sinh viên";
  const displayCode =
    student?.studentCode ||
    student?.username ||
    localStorage.getItem("studentUsername") ||
    "";

  const handleLogout = () => {
    clearAuthStorage();
    navigate("/dang-nhap", { replace: true });
  };

  return (
    <DluHeader
      role="student"
      user={{
        fullName: displayName,
        code: displayCode,
        cohort: student?.cohort || "Khoa CNTT",
        subText: `MSSV: ${displayCode || "—"} • ${student?.cohort || "Khoa CNTT"}`,
      }}
      searchPlaceholder="Tìm kiếm môn học, phân tích..."
      onSearch={onSearch}
      onLogout={handleLogout}
    />
  );
}
