import { useState } from "react";
import { Search, ChevronDown, LogOut, User } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { clearAuthStorage } from "../services/studentAuth";

export default function StudentHeader({ student, onSearch }) {
  const navigate = useNavigate();
  const [profileMenuOpen, setProfileMenuOpen] = useState(false);

  const displayName =
    student?.fullName || localStorage.getItem("studentName") || "Sinh viên";
  const displayCode =
    student?.studentCode ||
    student?.username ||
    localStorage.getItem("studentUsername") ||
    "";

  const initials = displayName
    .split(" ")
    .map((w) => w[0])
    .slice(-2)
    .join("")
    .toUpperCase();

  const handleLogout = () => {
    clearAuthStorage();
    navigate("/dang-nhap", { replace: true });
  };

  return (
    <header className="header dlu-header">
      {/* =========================
          THƯƠNG HIỆU DLU
      ========================== */}
      <div className="school dlu-brand">
        <div className="school-logo dlu-seal" aria-hidden="true">
          <span className="dlu-seal-mark">DLU</span>
        </div>

        <div className="dlu-school-copy">
          <div className="school-name">
            TRƯỜNG ĐẠI HỌC ĐÀ LẠT
          </div>
          <div className="school-name-en">
            DALAT UNIVERSITY
          </div>
          <div className="school-sub">
            Thụ Nhân, Khai Phóng, Bản Sắc
          </div>
        </div>
      </div>

      {/* Vạch ngăn cách */}
      <div className="dlu-header-divider" />

      {/* =========================
          LMS CỔNG SINH VIÊN
      ========================== */}
      <div className="dlu-lms-title">
        <strong>
          HỆ THỐNG HỌC TẬP TRỰC TUYẾN (LMS)
        </strong>
        <span>
          Learning today for a better tomorrow
        </span>
      </div>

      {/* =========================
          PHẢI HEADER: SEARCH, PROFILE & MOTTO
      ========================== */}
      <div className="header-right">
        {/* Search */}
        <div className="search-box">
          <Search size={15} />
          <input
            type="text"
            placeholder="Tìm kiếm môn học, phân tích..."
            onChange={(e) => onSearch && onSearch(e.target.value)}
          />
        </div>

        {/* Profile Sinh viên với Dropdown Menu */}
        <div
          className="header-profile"
          role="button"
          tabIndex={0}
          onClick={() => setProfileMenuOpen(!profileMenuOpen)}
          style={{ position: "relative" }}
        >
          <div className="avatar">{initials}</div>
          <div className="teacher-mini">
            <div className="dlu-profile-row">
              <strong>{displayName}</strong>
              <ChevronDown size={13} />
            </div>
            <span>
              MSSV: {displayCode || "—"} • {student?.cohort || "Khoa CNTT"}
            </span>
          </div>

          {/* Menu Dropdown Đăng xuất */}
          {profileMenuOpen && (
            <div
              style={{
                position: "absolute",
                top: "100%",
                right: 0,
                marginTop: "8px",
                background: "#ffffff",
                border: "1px solid rgba(67, 91, 70, 0.15)",
                borderRadius: "12px",
                boxShadow: "0 10px 25px rgba(0,0,0,0.12)",
                padding: "8px",
                minWidth: "180px",
                zIndex: 100,
              }}
              onClick={(e) => e.stopPropagation()}
            >
              <div
                style={{
                  padding: "8px 12px",
                  fontSize: "12px",
                  color: "#66736b",
                  borderBottom: "1px solid #f3f4f6",
                  marginBottom: "4px",
                }}
              >
                Tài khoản: <strong>{displayCode}</strong>
              </div>
              <button
                type="button"
                onClick={handleLogout}
                style={{
                  width: "100%",
                  display: "flex",
                  alignItems: "center",
                  gap: "8px",
                  padding: "8px 12px",
                  border: "none",
                  borderRadius: "8px",
                  background: "transparent",
                  color: "#dc2626",
                  fontSize: "12px",
                  fontWeight: "600",
                  cursor: "pointer",
                  textAlign: "left",
                }}
                onMouseEnter={(e) => (e.currentTarget.style.background = "#fee2e2")}
                onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
              >
                <LogOut size={14} />
                Đăng xuất
              </button>
            </div>
          )}
        </div>

        {/* Motto thương hiệu chuẩn như bên Giảng viên */}
        <div className="dlu-motto" aria-hidden="true">
          <span>Một Đà Lạt</span>
          <strong>Một Tương Lai</strong>
        </div>
      </div>
    </header>
  );
}
