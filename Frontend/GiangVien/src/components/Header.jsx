import { Search, ChevronDown } from "lucide-react";
import { useNavigate } from "react-router-dom";

function Header({ teacher = {} }) {
  const navigate = useNavigate();

  const goToProfile = () => {
    navigate("/ho-so");
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
          LMS
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
          NAVIGATION
      ========================== */}
      <nav className="top-nav dlu-top-nav">
        <button
          className="active-nav"
          onClick={() => navigate("/")}
        >
          LMS DLU
          <ChevronDown size={13} />
        </button>

        <button>
          Đơn vị
          <ChevronDown size={13} />
        </button>

        <button>
          ITC
          <ChevronDown size={13} />
        </button>

        <button>
          Ngôn ngữ (vi)
          <ChevronDown size={13} />
        </button>
      </nav>

      {/* =========================
          PHẢI HEADER
      ========================== */}
      <div className="header-right">

        {/* Search */}
        <div className="search-box">
          <Search size={16} />

          <input
            type="text"
            placeholder="Tìm kiếm khóa học, giảng viên, ..."
          />
        </div>

        {/* Profile */}
        <div
          className="header-profile"
          onClick={goToProfile}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              goToProfile();
            }
          }}
        >
          <div className="avatar">
            {teacher?.initials || "GV"}
          </div>

          <div className="teacher-mini">
            <strong>
              {teacher?.degree
                ? `${teacher.degree} `
                : ""}
              {teacher?.fullName || "Trần Bình Trần"}
            </strong>

            <span>Giảng viên</span>
          </div>

          <ChevronDown
            className="profile-chevron"
            size={14}
          />
        </div>

        {/* Motto */}
        <div
          className="dlu-motto"
          aria-hidden="true"
        >
          <span>Một Đà Lạt</span>
          <strong>Một Tương Lai</strong>
        </div>

      </div>
    </header>
  );
}

export default Header;