import { ArrowLeft } from "lucide-react";
import { useNavigate } from "react-router-dom";
import "../styles/TeacherOverview.css";

function SimplePage({ title }) {
  const navigate = useNavigate();

  return (
    <div className="simple-page">
      <button className="back-button" onClick={() => navigate("/")}>
        <ArrowLeft size={17} />
        Quay lại Tổng quan
      </button>

      <div className="simple-page-card">
        <h1>{title}</h1>
        <p>Trang này đã có route và sẽ nối dữ liệu thật ở bước tiếp theo.</p>
      </div>
    </div>
  );
}

export default SimplePage;
