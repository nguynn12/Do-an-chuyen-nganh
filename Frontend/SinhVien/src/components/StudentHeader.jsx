import React from "react";
import { Search } from "lucide-react";

export default function StudentHeader({ student, onSearch }) {
  const initials = student?.fullName
    ? student.fullName
        .split(" ")
        .map((w) => w[0])
        .slice(-2)
        .join("")
        .toUpperCase()
    : "SV";

  return (
    <header className="header">
      <div className="school">
        <div className="school-logo">DLU</div>

        <div>
          <div className="school-name">
            TRƯỜNG ĐẠI HỌC ĐÀ LẠT - DALAT UNIVERSITY
          </div>
          <div className="school-sub">
            HỆ THỐNG HỌC TẬP TRỰC TUYẾN - LMS (CỔNG SINH VIÊN)
          </div>
        </div>
      </div>

      <nav className="top-nav">
        <button
          className="active-nav"
          type="button"
          onClick={() => (window.location.hash = "")}
        >
          LMS DLU⌄
        </button>
        <button type="button">Đơn vị⌄</button>
        <button type="button">ITC⌄</button>
        <button type="button">Ngôn ngữ (vi)⌄</button>
      </nav>

      <div className="header-right">
        <div className="search-box">
          <Search size={16} />
          <input
            placeholder="Tìm kiếm môn học, phân tích..."
            onChange={(e) => onSearch && onSearch(e.target.value)}
          />
        </div>

        <div className="avatar">{initials}</div>

        <div className="teacher-mini">
          <strong>{student?.fullName || "Nguyễn Văn An"}⌄</strong>
          <span>
            MSSV: {student?.studentCode || student?.username || "2310001"} - {student?.cohort || "Khoa CNTT"}
          </span>
        </div>
      </div>
    </header>
  );
}
