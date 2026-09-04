import { Search } from "lucide-react";
import { useNavigate } from "react-router-dom";

function Header({ teacher }) {
  const navigate = useNavigate();

  return (
    <header className="header">
      <div className="school">
        <div className="school-logo">DLU</div>

        <div>
          <div className="school-name">
            TRƯỜNG ĐẠI HỌC ĐÀ LẠT - DALAT UNIVERSITY
          </div>
          <div className="school-sub">
            HỆ THỐNG HỌC TẬP TRỰC TUYẾN - LMS
          </div>
        </div>
      </div>

      <nav className="top-nav">
        <button className="active-nav" onClick={() => navigate("/")}>
          LMS DLU⌄
        </button>
        <button>Đơn vị⌄</button>
        <button>ITC⌄</button>
        <button>Ngôn ngữ (vi)⌄</button>
      </nav>

      <div className="header-right">
        <div className="search-box">
          <Search size={16} />
          <input placeholder="Tìm kiếm bài học, giảng viên..." />
        </div>

        <div className="avatar">{teacher.initials || "GV"}</div>

        <div className="teacher-mini">
          <strong>
            {teacher.degree} {teacher.fullName}⌄
          </strong>
          <span>
            Mã GV: {teacher.teacherCode} - {teacher.department}
          </span>
        </div>
      </div>
    </header>
  );
}

export default Header;
