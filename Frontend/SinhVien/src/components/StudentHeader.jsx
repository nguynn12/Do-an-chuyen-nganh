import { Search } from "lucide-react";

export default function StudentHeader({ student, onSearch }) {
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
          <strong>{displayName}⌄</strong>
          <span>
            MSSV: {displayCode || "—"} - {student?.cohort || "Khoa CNTT"}
          </span>
        </div>
      </div>
    </header>
  );
}
