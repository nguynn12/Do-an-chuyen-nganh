import { useNavigate } from "react-router-dom";
import DluHeader from "../../../shared/components/DluHeader";
import { clearTeacherSession } from "../services/authService";
import dluLogo from "../assets/logo_dlu_official.png";

function Header({ teacher = {} }) {
  const navigate = useNavigate();

  const goToProfile = () => {
    navigate("/ho-so");
  };

  const handleLogout = () => {
    clearTeacherSession();
    navigate("/dang-nhap", { replace: true });
  };

  return (
    <DluHeader
      role="teacher"
      logoSrc={dluLogo}
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
