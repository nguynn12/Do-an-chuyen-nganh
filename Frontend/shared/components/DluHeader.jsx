import React, { useState, useEffect, useRef } from "react";
import { Search, ChevronDown, LogOut, User as UserIcon } from "lucide-react";
import "../styles/dlu-header.css";

/**
 * Component Header chung (Single Source of Truth)
 * Dùng cho cả Cổng Giảng viên và Cổng Sinh viên
 */
export default function DluHeader({
  role = "student", // "teacher" | "student"
  user = {},
  onSearch,
  searchPlaceholder,
  onProfileClick,
  onLogout,
}) {
  const [menuOpen, setMenuOpen] = useState(false);
  const profileRef = useRef(null);

  // Xử lý họ tên và thông tin hiển thị
  const fullName =
    user?.fullName ||
    (role === "teacher" ? "Trần Bình Trần" : "Sinh viên");

  const degree = user?.degree ? `${user.degree} ` : "";
  const displayTitle = `${degree}${fullName}`;

  const subText =
    user?.subText ||
    (role === "teacher"
      ? "Giảng viên"
      : `MSSV: ${user?.code || "—"} • ${user?.cohort || "Khoa CNTT"}`);

  const initials =
    user?.initials ||
    fullName
      .split(" ")
      .filter(Boolean)
      .map((w) => w[0])
      .slice(-2)
      .join("")
      .toUpperCase() ||
    (role === "teacher" ? "GV" : "SV");

  const placeholder =
    searchPlaceholder ||
    (role === "teacher"
      ? "Tìm kiếm khóa học, giảng viên, ..."
      : "Tìm kiếm môn học, phân tích...");

  // Đóng dropdown khi click ra ngoài
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (profileRef.current && !profileRef.current.contains(e.target)) {
        setMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleProfileClick = () => {
    if (onProfileClick) {
      onProfileClick();
      setMenuOpen(false);
    }
  };

  const handleLogoutClick = () => {
    if (onLogout) {
      onLogout();
      setMenuOpen(false);
    }
  };

  return (
    <header className="dlu-unified-header">
      {/* 1. KHỐI THƯƠNG HIỆU ĐẠI HỌC ĐÀ LẠT */}
      <div className="dlu-uh-brand" aria-label="Đại học Đà Lạt">
        <div className="dlu-uh-seal" aria-hidden="true">
          <span className="dlu-uh-seal-mark">DLU</span>
        </div>

        <div className="dlu-uh-school-text">
          <span className="dlu-uh-school-name">TRƯỜNG ĐẠI HỌC ĐÀ LẠT</span>
          <span className="dlu-uh-school-en">DALAT UNIVERSITY</span>
          <span className="dlu-uh-school-motto">Thụ Nhân, Khai Phóng, Bản Sắc</span>
        </div>
      </div>

      {/* Vạch ngăn cách */}
      <div className="dlu-uh-divider" aria-hidden="true" />

      {/* 2. TIÊU ĐỀ LMS */}
      <div className="dlu-uh-lms">
        <strong className="dlu-uh-lms-title">HỆ THỐNG HỌC TẬP TRỰC TUYẾN (LMS)</strong>
        <span className="dlu-uh-lms-tagline">Learning today for a better tomorrow</span>
      </div>

      {/* 3. KHỐI TƯƠNG TÁC PHẢI */}
      <div className="dlu-uh-right">
        {/* Ô tìm kiếm */}
        <div className="dlu-uh-search" role="search">
          <Search size={15} className="dlu-uh-search-icon" aria-hidden="true" />
          <input
            type="text"
            className="dlu-uh-search-input"
            placeholder={placeholder}
            aria-label="Ô tìm kiếm"
            onChange={(e) => onSearch && onSearch(e.target.value)}
          />
        </div>

        {/* Khối Profile và Dropdown */}
        <div
          ref={profileRef}
          className={`dlu-uh-profile ${menuOpen ? "is-open" : ""}`}
          onClick={() => setMenuOpen((prev) => !prev)}
          role="button"
          tabIndex={0}
          aria-expanded={menuOpen}
          aria-haspopup="true"
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault();
              setMenuOpen((prev) => !prev);
            }
          }}
        >
          <div className="dlu-uh-avatar" aria-hidden="true">
            {initials}
          </div>

          <div className="dlu-uh-user-info">
            <div className="dlu-uh-user-name-row">
              <strong className="dlu-uh-user-name" title={displayTitle}>
                {displayTitle}
              </strong>
              <ChevronDown size={13} className="dlu-uh-user-chevron" aria-hidden="true" />
            </div>
            <span className="dlu-uh-user-sub" title={subText}>
              {subText}
            </span>
          </div>

          {/* Menu Dropdown Tài khoản */}
          {menuOpen && (
            <div
              className="dlu-uh-dropdown"
              role="menu"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="dlu-uh-dropdown-header">
                <strong>{displayTitle}</strong>
                <span>{subText}</span>
              </div>

              {onProfileClick && (
                <button
                  type="button"
                  className="dlu-uh-dropdown-item"
                  role="menuitem"
                  onClick={handleProfileClick}
                >
                  <UserIcon size={14} />
                  Hồ sơ cá nhân
                </button>
              )}

              {onLogout && (
                <button
                  type="button"
                  className="dlu-uh-dropdown-item is-logout"
                  role="menuitem"
                  onClick={handleLogoutClick}
                >
                  <LogOut size={14} />
                  Đăng xuất
                </button>
              )}
            </div>
          )}
        </div>

        {/* Slogan thương hiệu nghệ thuật */}
        <div className="dlu-uh-motto" aria-hidden="true">
          <span>Một Đà Lạt</span>
          <strong>Một Tương Lai</strong>
        </div>
      </div>
    </header>
  );
}
