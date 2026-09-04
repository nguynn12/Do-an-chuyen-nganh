import {
  Home,
  Grid3X3,
  Layers3,
  CalendarDays,
  Mail,
  CircleHelp,
  LogOut,
} from "lucide-react";

import { useLocation, useNavigate } from "react-router-dom";

const menuItems = [
  { path: "/", label: "Tổng quan", icon: Home },
  { path: "/khoa-hoc", label: "Khóa học", icon: Grid3X3 },
  { path: "/phan-tich", label: "Phân tích", icon: Layers3 },
  { path: "/lich", label: "Lịch", icon: CalendarDays },
  { path: "/tin-nhan", label: "Tin nhắn", icon: Mail },
  { path: "/ho-tro", label: "Hỗ trợ", icon: CircleHelp },
];

function Sidebar() {
  const navigate = useNavigate();
  const location = useLocation();

  const isActive = (path) => {
    if (path === "/") return location.pathname === "/";
    return location.pathname.startsWith(path);
  };

  const handleLogout = () => {
    localStorage.removeItem("isLoggedIn");
    localStorage.removeItem("currentTeacherId");
    navigate("/dang-nhap", { replace: true });
  };

  return (
    <aside className="sidebar">
      <div className="sidebar-menu">
        {menuItems.map((item) => {
          const Icon = item.icon;

          return (
            <button
              key={item.path}
              type="button"
              className={`sidebar-button ${isActive(item.path) ? "side-active" : ""}`}
              onClick={() => navigate(item.path)}
              title={item.label}
              aria-label={item.label}
            >
              <Icon size={19} />
            </button>
          );
        })}
      </div>

      <div className="side-bottom">
        <button
          type="button"
          className="sidebar-button logout-button"
          onClick={handleLogout}
          title="Đăng xuất"
          aria-label="Đăng xuất"
        >
          <LogOut size={19} />
        </button>
      </div>
    </aside>
  );
}

export default Sidebar;
