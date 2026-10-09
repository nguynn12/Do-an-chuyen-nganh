import { useEffect, useState } from "react";
import {
  Home,
  Grid3X3,
  CheckCircle2,
  Award,
  Clock,
  BarChart3,
  Compass,
  PanelLeftClose,
  PanelLeftOpen,
} from "lucide-react";

const menuItems = [
  { id: "overview", label: "Tổng quan", icon: Home },
  { id: "courses", label: "Khóa học", icon: Grid3X3 },
  { id: "behavior", label: "Hồ sơ hành vi", icon: Compass },
  { id: "submissions", label: "Bài nộp", icon: CheckCircle2 },
  { id: "grades", label: "Bảng điểm", icon: Award },
  { id: "engagement", label: "Thời gian học", icon: Clock },
  { id: "analytics", label: "Phân tích Power BI", icon: BarChart3 },
];

export default function StudentSidebar({ activeTab, onSelectTab }) {
  // Mặc định là THU GỌN (56px) giống hệt bên Giảng viên
  const [collapsed, setCollapsed] = useState(() => {
    const saved = localStorage.getItem("dluStudentSidebarCollapsed");
    return saved === null ? true : saved === "true";
  });

  useEffect(() => {
    const width = collapsed ? "56px" : "175px";
    document.documentElement.style.setProperty("--dlu-sidebar-width", width);
    localStorage.setItem("dluStudentSidebarCollapsed", String(collapsed));

    return () => {
      document.documentElement.style.removeProperty("--dlu-sidebar-width");
    };
  }, [collapsed]);

  return (
    <aside className={`sidebar dlu-sidebar ${collapsed ? "is-collapsed" : ""}`}>
      {/* Nút Thu gọn / Mở rộng Sidebar */}
      <button
        type="button"
        className="sidebar-collapse-button"
        onClick={() => setCollapsed((value) => !value)}
        aria-label={collapsed ? "Mở rộng thanh điều hướng" : "Thu gọn thanh điều hướng"}
        title={collapsed ? "Mở rộng thanh điều hướng" : "Thu gọn"}
      >
        {collapsed ? <PanelLeftOpen size={18} /> : <PanelLeftClose size={18} />}
        {!collapsed && <span>Thu gọn</span>}
      </button>

      {/* Danh sách Menu Items */}
      <nav className="sidebar-menu">
        {menuItems.map((item) => {
          const Icon = item.icon;
          const isActive =
            activeTab === item.id ||
            (item.id === "courses" && activeTab === "course-detail");

          return (
            <button
              key={item.id}
              type="button"
              className={`sidebar-button ${isActive ? "side-active" : ""}`}
              onClick={() => onSelectTab(item.id)}
              aria-label={item.label}
              title={item.label}
            >
              <span className="sidebar-icon-wrap">
                <Icon size={19} strokeWidth={isActive ? 2.25 : 1.85} />
              </span>
              {!collapsed && <span className="sidebar-label">{item.label}</span>}
            </button>
          );
        })}
      </nav>

      {/* Chân Sidebar: Tháp DLU thanh lịch chuẩn Giảng viên */}
      <div className="dlu-sidebar-art" aria-hidden="true">
        <div className="dlu-tower">
          <span className="tower-spire" />
          <span className="tower-clock">DLU</span>
        </div>
        {!collapsed && (
          <>
            <strong>ĐẠI HỌC ĐÀ LẠT</strong>
            <small>Thụ Nhân, Khai Phóng, Bản Sắc</small>
          </>
        )}
      </div>
    </aside>
  );
}
