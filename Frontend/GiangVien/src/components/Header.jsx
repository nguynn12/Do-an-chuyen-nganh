import { useNavigate } from "react-router-dom";
import DluHeader from "../../../shared/components/DluHeader";

function Header({ teacher = {} }) {
  const navigate = useNavigate();

  const goToProfile = () => {
    navigate("/ho-so");
  };

  const handleLogout = () => {
    localStorage.removeItem("teacherToken");
    localStorage.removeItem("teacherUser");
    navigate("/dang-nhap");
  };

  return (
    <DluHeader
      role="teacher"
      user={{
        fullName: teacher?.fullName,
        degree: teacher?.degree,
        initials: teacher?.initials,
        subText: "Giảng viên",
      }}
      searchPlaceholder="Tìm kiếm khóa học, giảng viên, ..."
      onProfileClick={goToProfile}
      onLogout={handleLogout}
    />
  );
}

export default Header;