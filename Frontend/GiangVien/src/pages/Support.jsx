import { ArrowLeft } from "lucide-react";
import { useNavigate } from "react-router-dom";
import "../styles/TeacherOverview.css";

function Support() {
  const navigate = useNavigate();

  return (
    <div className="simple-page">
      <button className="back-button" onClick={() => navigate("/")}>
        <ArrowLeft size={17} />
        Quay lại Tổng quan
      </button>

      <div className="simple-page-card">
        <h1>Yêu cầu hỗ trợ</h1>
        <p>
          Trang này đã tách riêng và sẵn sàng nối endpoint hỗ trợ từ backend.
        </p>
      </div>
    </div>
  );
}

export default Support;
