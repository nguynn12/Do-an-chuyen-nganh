import { ArrowLeft, Phone, Mail, Globe, HelpCircle, ShieldCheck } from "lucide-react";
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

      <div className="simple-page-card" style={{ maxWidth: "800px", margin: "0 auto", textAlign: "left" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "16px" }}>
          <div
            style={{
              width: "42px",
              height: "42px",
              borderRadius: "12px",
              background: "#eef6ee",
              color: "#37883e",
              display: "grid",
              placeItems: "center",
              flexShrink: 0,
            }}
          >
            <HelpCircle size={22} />
          </div>
          <div>
            <h1 style={{ fontSize: "20px", margin: 0, color: "#17221d" }}>
              Trung tâm Hỗ trợ & Hướng dẫn Giảng viên
            </h1>
            <p style={{ margin: "3px 0 0", fontSize: "12px", color: "#66736b" }}>
              Hệ thống Phân tích Dữ liệu Học tập DLU LMS Analytics
            </p>
          </div>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "14px", marginTop: "20px" }}>
          <div
            style={{
              padding: "16px",
              borderRadius: "12px",
              background: "#f8faf8",
              border: "1px solid #e2ece3",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "8px", color: "#37883e", fontWeight: 700, fontSize: "13px", marginBottom: "8px" }}>
              <Phone size={16} />
              <span>Hỗ trợ kỹ thuật & Hệ thống</span>
            </div>
            <div style={{ fontSize: "12px", color: "#374151", lineHeight: "1.6" }}>
              <div><strong>Đơn vị:</strong> Trung tâm CNTT & Thư viện DLU</div>
              <div><strong>Hotline:</strong> (0263) 3822 246</div>
              <div><strong>Email:</strong> itc@dlu.edu.vn</div>
            </div>
          </div>

          <div
            style={{
              padding: "16px",
              borderRadius: "12px",
              background: "#f8faf8",
              border: "1px solid #e2ece3",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "8px", color: "#2563eb", fontWeight: 700, fontSize: "13px", marginBottom: "8px" }}>
              <Mail size={16} />
              <span>Hỗ trợ Học vụ & Đào tạo</span>
            </div>
            <div style={{ fontSize: "12px", color: "#374151", lineHeight: "1.6" }}>
              <div><strong>Đơn vị:</strong> Phòng Quản lý Đào tạo</div>
              <div><strong>Email:</strong> phongdaotao@dlu.edu.vn</div>
              <div><strong>Website:</strong> https://dlu.edu.vn</div>
            </div>
          </div>
        </div>

        <div
          style={{
            marginTop: "18px",
            padding: "14px 16px",
            borderRadius: "12px",
            background: "#fffbeb",
            border: "1px solid #fef3c7",
            display: "flex",
            alignItems: "flex-start",
            gap: "10px",
          }}
        >
          <ShieldCheck size={18} style={{ color: "#d97706", flexShrink: 0, marginTop: "2px" }} />
          <div style={{ fontSize: "11.5px", color: "#92400e", lineHeight: "1.5" }}>
            <strong>Phạm vi hệ thống:</strong> Đây là Cổng phân tích dữ liệu học tập (LMS Data Warehouse Analytics). Các thao tác vận hành nghiệp vụ trực tiếp (biên soạn đề thi, nộp bài kiểm tra, chấm bài chi tiết) được thực hiện trên hệ thống Moodle LMS gốc tại{" "}
            <a
              href="https://lms.dlu.edu.vn"
              target="_blank"
              rel="noreferrer"
              style={{ color: "#b45309", fontWeight: 700, textDecoration: "underline" }}
            >
              lms.dlu.edu.vn
            </a>.
          </div>
        </div>
      </div>
    </div>
  );
}

export default Support;
