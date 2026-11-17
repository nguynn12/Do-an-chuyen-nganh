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
  Sparkles,
  LogOut,
} from "lucide-react";
import { NavLink, useLocation, useNavigate } from "react-router-dom";
import { clearAuthStorage } from "../services/studentAuth";
import { useAIKey } from "../context/AIKeyContext";

const menuItems = [
  { path: "/", label: "Tổng quan", icon: Home, end: true },
  { path: "/khoa-hoc", label: "Khóa học", icon: Grid3X3 },
  { path: "/ho-so-hanh-vi", label: "Hồ sơ hành vi", icon: Compass },
  { path: "/bai-nop", label: "Bài nộp", icon: CheckCircle2 },
  { path: "/bang-diem", label: "Bảng điểm", icon: Award },
  { path: "/thoi-gian-hoc", label: "Thời gian học", icon: Clock },
  { path: "/phan-tich", label: "Phân tích Power BI", icon: BarChart3 },
  { path: "/co-van-ai", label: "Cố vấn AI", icon: Sparkles, isAI: true },
];

export default function StudentSidebar() {
  const { isConfigured, setIsModalOpen } = useAIKey();

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

  const navigate = useNavigate();
  const location = useLocation();

  const handleLogout = () => {
    clearAuthStorage();
    navigate("/dang-nhap", { replace: true });
  };

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

          return (
            <NavLink
              key={item.path}
              to={item.path}
              end={item.end}
              onClick={() => {
                if (item.isAI && !isConfigured) {
                  setIsModalOpen(true);
                }
              }}
              className={({ isActive }) => {
                const isCourseActive =
                  item.path === "/khoa-hoc" &&
                  location.pathname.startsWith("/khoa-hoc");
                const active = isActive || isCourseActive;
                return `sidebar-button ${active ? "side-active" : ""}`;
              }}
              style={{ textDecoration: "none", position: item.isAI ? "relative" : undefined }}
              aria-label={item.label}
              title={
                item.isAI
                  ? isConfigured
                    ? "Cố vấn học tập AI (Đã kết nối)"
                    : "Cố vấn học tập AI (Chưa cài đặt Key)"
                  : collapsed
                  ? item.label
                  : undefined
              }
            >
              {({ isActive }) => {
                const isCourseActive =
                  item.path === "/khoa-hoc" &&
                  location.pathname.startsWith("/khoa-hoc");
                const active = isActive || isCourseActive;
                return (
                  <>
                    <span className="sidebar-icon-wrap" style={{ position: "relative" }}>
                      <Icon
                        size={19}
                        strokeWidth={active ? 2.25 : 1.85}
                        color={
                          item.isAI && isConfigured && !active
                            ? "#22c55e"
                            : undefined
                        }
                      />
                      {item.isAI && isConfigured && (
                        <span
                          style={{
                            position: "absolute",
                            top: "-2px",
                            right: "-2px",
                            width: "6px",
                            height: "6px",
                            borderRadius: "50%",
                            backgroundColor: "#22c55e",
                          }}
                        />
                      )}
                    </span>
                    {!collapsed && <span className="sidebar-label">{item.label}</span>}
                  </>
                );
              }}
            </NavLink>
          );
        })}
      </nav>

      {/* Nút Đăng xuất theo bản của Phước */}
      <div className="sidebar-logout-wrap" style={{ padding: "6px 8px", marginTop: "auto" }}>
        <button
          type="button"
          className="sidebar-button logout-button"
          onClick={handleLogout}
          aria-label="Đăng xuất"
          title={collapsed ? "Đăng xuất" : undefined}
          style={{ width: "100%", color: "#dc2626" }}
        >
          <span className="sidebar-icon-wrap">
            <LogOut size={19} />
          </span>
          {!collapsed && <span className="sidebar-label" style={{ fontWeight: 600 }}>Đăng xuất</span>}
        </button>
      </div>

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
