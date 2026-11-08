import React from "react";
import {
  Home,
  Grid3X3,
  CheckCircle2,
  Award,
  Clock,
  Sparkles,
  LogOut,
} from "lucide-react";
import { useAIKey } from "../context/AIKeyContext";

const menuItems = [
  { id: "overview", label: "Tổng quan phân tích", icon: Home },
  { id: "courses", label: "Khóa học của tôi", icon: Grid3X3 },
  { id: "submissions", label: "Tình trạng nộp bài", icon: CheckCircle2 },
  { id: "grades", label: "Bảng điểm & Kết quả", icon: Award },
  { id: "engagement", label: "Thời gian học tập", icon: Clock },
  { id: "ai", label: "Cố vấn học tập AI (AI Coach)", icon: Sparkles },
];

export default function StudentSidebar({ activeTab, onSelectTab }) {
  const { isConfigured, setIsModalOpen } = useAIKey();

  const handleLogout = () => {
    alert("Đã đăng xuất khỏi Cổng Sinh Viên.");
    window.location.hash = "";
  };

  const handleItemClick = (id) => {
    onSelectTab(id);
    // Nếu bấm vào tab AI mà chưa cấu hình key, tự động mở modal nhập key
    if (id === "ai" && !isConfigured) {
      setIsModalOpen(true);
    }
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
              onClick={() => handleItemClick(item.id)}
              title={
                item.id === "ai"
                  ? isConfigured
                    ? "Cố vấn học tập AI (Đã kết nối)"
                    : "Cố vấn học tập AI (Chưa cài đặt Key)"
                  : item.label
              }
              aria-label={item.label}
              style={item.id === "ai" ? { position: "relative" } : undefined}
            >
              <Icon
                size={19}
                color={
                  item.id === "ai" && isConfigured && !isActive
                    ? "#4ade80"
                    : undefined
                }
              />
              {item.id === "ai" && isConfigured && (
                <span
                  style={{
                    position: "absolute",
                    top: "5px",
                    right: "5px",
                    width: "6px",
                    height: "6px",
                    borderRadius: "50%",
                    backgroundColor: "#22c55e",
                  }}
                />
              )}
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
