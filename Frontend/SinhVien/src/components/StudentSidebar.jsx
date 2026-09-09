import React from "react";
import {
  Home,
  Grid3X3,
  CheckCircle2,
  Award,
  Clock,
  LogOut,
} from "lucide-react";

const menuItems = [
  { id: "overview", label: "Tổng quan phân tích", icon: Home },
  { id: "courses", label: "Khóa học của tôi", icon: Grid3X3 },
  { id: "submissions", label: "Tình trạng nộp bài", icon: CheckCircle2 },
  { id: "grades", label: "Bảng điểm & Kết quả", icon: Award },
  { id: "engagement", label: "Thời gian học tập", icon: Clock },
];

export default function StudentSidebar({ activeTab, onSelectTab }) {
  const handleLogout = () => {
    alert("Đã đăng xuất khỏi Cổng Sinh Viên.");
    window.location.hash = "";
  };

  return (
    <aside className="sidebar">
      <div className="sidebar-menu">
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
