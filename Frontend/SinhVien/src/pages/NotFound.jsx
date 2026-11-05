import { useNavigate } from "react-router-dom";
import { FileQuestion, Home, ArrowLeft } from "lucide-react";

/**
 * Trang 404 cho Cổng Sinh viên.
 * Hiển thị thông báo khi sinh viên truy cập đường dẫn không tồn tại
 * kèm tùy chọn quay về trang Tổng quan hoặc quay lại trang trước.
 */
export default function NotFound() {
  const navigate = useNavigate();

  return (
    <main
      className="page-full notfound-container"
      role="main"
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        minHeight: "65vh",
        padding: "32px 16px",
      }}
    >
      <div
        className="welcome-card dlu-state-card"
        style={{
          maxWidth: "520px",
          width: "100%",
          padding: "48px 32px",
          textAlign: "center",
          backgroundColor: "#ffffff",
          borderRadius: "16px",
          boxShadow: "0 4px 20px rgba(11, 85, 63, 0.08)",
          border: "1px solid var(--dlu-border, #d1ddd6)",
        }}
      >
        <div
          style={{
            width: "68px",
            height: "68px",
            borderRadius: "50%",
            backgroundColor: "rgba(55, 136, 62, 0.1)",
            color: "var(--dlu-green-brand, #37883e)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            margin: "0 auto 20px",
          }}
          aria-hidden="true"
        >
          <FileQuestion size={36} />
        </div>

        <div
          style={{
            fontSize: "12px",
            fontWeight: "700",
            textTransform: "uppercase",
            letterSpacing: "1px",
            color: "var(--dlu-green-brand, #37883e)",
            marginBottom: "8px",
          }}
        >
          Mã lỗi: 404
        </div>

        <h1
          className="dlu-state-title"
          style={{
            fontSize: "20px",
            fontWeight: "700",
            color: "var(--dlu-text-dark, #14251e)",
            marginBottom: "10px",
            lineHeight: 1.3,
          }}
        >
          Trang bạn tìm không tồn tại
        </h1>

        <p
          className="dlu-state-desc"
          style={{
            fontSize: "13.5px",
            color: "var(--dlu-text-muted, #667970)",
            lineHeight: 1.6,
            marginBottom: "28px",
            maxWidth: "400px",
            marginLeft: "auto",
            marginRight: "auto",
          }}
        >
          Đường dẫn bạn truy cập có thể đã bị đổi tên, xóa bỏ hoặc không thuộc hệ thống Cổng Sinh viên Trường Đại học Đà Lạt.
        </p>

        <div
          style={{
            display: "flex",
            gap: "12px",
            justifyContent: "center",
            flexWrap: "wrap",
          }}
        >
          <button
            type="button"
            className="dlu-retry-btn"
            onClick={() => navigate("/")}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "8px",
              padding: "10px 22px",
              fontSize: "13px",
              fontWeight: "600",
              cursor: "pointer",
            }}
          >
            <Home size={15} aria-hidden="true" />
            Quay về Tổng quan
          </button>

          <button
            type="button"
            onClick={() => navigate(-1)}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "8px",
              padding: "10px 18px",
              backgroundColor: "#ffffff",
              color: "var(--dlu-text-dark, #14251e)",
              border: "1px solid var(--dlu-border, #d1ddd6)",
              borderRadius: "var(--dlu-radius-btn, 8px)",
              fontSize: "13px",
              fontWeight: "600",
              cursor: "pointer",
              transition: "all 0.2s ease",
            }}
          >
            <ArrowLeft size={15} aria-hidden="true" />
            Quay lại trang trước
          </button>
        </div>
      </div>
    </main>
  );
}
