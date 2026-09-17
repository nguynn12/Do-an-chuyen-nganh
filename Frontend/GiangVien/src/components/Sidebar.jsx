import { useEffect, useState } from "react";
import {
  Home,
  BookOpen,
  ChartNoAxesCombined,
  CalendarDays,
  Bell,
  CircleHelp,
  PanelLeftClose,
  PanelLeftOpen,
} from "lucide-react";
import { useLocation, useNavigate } from "react-router-dom";

const menuItems = [
  { path: "/", label: "Tổng quan", icon: Home },
  { path: "/khoa-hoc", label: "Khóa học", icon: BookOpen },
  { path: "/phan-tich", label: "Phân tích học tập", icon: ChartNoAxesCombined },
  { path: "/lich", label: "Lịch giảng dạy", icon: CalendarDays },
  // Không hard-code badge thông báo. Khi có API thật thì truyền số thật vào đây sau.
  { path: "/tin-nhan", label: "Thông báo", icon: Bell },
  { path: "/ho-tro", label: "Trợ giúp", icon: CircleHelp },
];

function Sidebar() {
  const navigate = useNavigate();
  const location = useLocation();
  const [collapsed, setCollapsed] = useState(() => {
    return localStorage.getItem("dluSidebarCollapsed") === "true";
  });

  useEffect(() => {
    const width = collapsed ? "56px" : "136px";
    document.documentElement.style.setProperty("--dlu-sidebar-width", width);
    localStorage.setItem("dluSidebarCollapsed", String(collapsed));

    return () => {
      document.documentElement.style.removeProperty("--dlu-sidebar-width");
    };
  }, [collapsed]);

  const isActive = (path) => {
    if (path === "/") return location.pathname === "/";
    return location.pathname.startsWith(path);
  };

  return (
    <aside className={`sidebar dlu-sidebar ${collapsed ? "is-collapsed" : ""}`}>
      <button
        type="button"
        className="sidebar-collapse-button"
        onClick={() => setCollapsed((value) => !value)}
        aria-label={collapsed ? "Mở rộng thanh điều hướng" : "Thu gọn thanh điều hướng"}
        title={collapsed ? "Mở rộng" : "Thu gọn"}
      >
        {collapsed ? <PanelLeftOpen size={18} /> : <PanelLeftClose size={18} />}
        {!collapsed && <span>Thu gọn</span>}
      </button>

      <nav className="sidebar-menu">
        {menuItems.map((item) => {
          const Icon = item.icon;
          const active = isActive(item.path);

          return (
            <button
              key={item.path}
              type="button"
              className={`sidebar-button ${active ? "side-active" : ""}`}
              onClick={() => navigate(item.path)}
              aria-label={item.label}
              title={collapsed ? item.label : undefined}
            >
              <span className="sidebar-icon-wrap">
                <Icon size={19} strokeWidth={active ? 2.25 : 1.85} />
              </span>
              <span className="sidebar-label">{item.label}</span>
            </button>
          );
        })}
      </nav>

      <div className="dlu-sidebar-art" aria-hidden="true">
        <div className="dlu-tower">
          <span className="tower-spire" />
          <span className="tower-clock">DLU</span>
        </div>
        <strong>ĐẠI HỌC ĐÀ LẠT</strong>
        <small>Tri thức kiến tạo tương lai</small>
      </div>
    </aside>
  );
}

export default Sidebar;
