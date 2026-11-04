import { ChevronRight } from "lucide-react";
import { useNavigate } from "react-router-dom";

function QuickLink({ icon, title, onClick }) {
  return (
    <button type="button" className="quick-link" onClick={onClick} aria-label={title}>
      <span aria-hidden="true">{icon}</span>
      <strong>{title}</strong>
      <ChevronRight size={15} aria-hidden="true" />
    </button>
  );
}

function QuickLinks() {
  const navigate = useNavigate();

  return (
    <div className="right-card">
      <h3 className="quick-title">Liên kết nhanh</h3>

      <QuickLink
        icon="M"
        title="Moodle DLU"
        onClick={() => window.open("https://lms.dlu.edu.vn", "_blank")}
      />

      <QuickLink
        icon="📋"
        title="Cổng nhập điểm"
        onClick={() => navigate("/phan-tich")}
      />

      <QuickLink
        icon="📘"
        title="Khóa học"
        onClick={() => navigate("/khoa-hoc")}
      />

      <QuickLink
        icon="🛠"
        title="Hỗ trợ ITC DLU"
        onClick={() => navigate("/ho-tro")}
      />
    </div>
  );
}

export default QuickLinks;
