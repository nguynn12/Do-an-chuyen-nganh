import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  BarChart3,
  Maximize2,
  Minimize2,
  RotateCw,
  ExternalLink,
  AlertCircle,
} from "lucide-react";
import { getStudentUsername } from "../services/studentAuth";
import "../styles/PowerBIEmbed.css";

export default function PowerBIEmbed({
  reportUrl,
  title = "Báo cáo phân tích Power BI",
  height = "720px",
}) {
  const navigate = useNavigate();
  const username = getStudentUsername();
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);
  const [isExpanded, setIsExpanded] = useState(false);

  useEffect(() => {
    if (!username) {
      navigate("/dang-nhap", { replace: true });
    }
  }, [username, navigate]);

  // Chiều cao linh hoạt: mở rộng lên 880px khi người dùng cần xem rộng hơn
  const activeHeight = isExpanded ? "880px" : height || "720px";

  // Quản lý trạng thái loading và timeout 12 giây
  useEffect(() => {
    setLoading(true);
    setLoadError(false);

    const timer = setTimeout(() => {
      setLoading((curr) => {
        if (curr) {
          setLoadError(true);
          return false;
        }
        return false;
      });
    }, 12000);

    return () => clearTimeout(timer);
  }, [reportUrl, reloadKey]);

  const handleRetry = () => {
    setReloadKey((prev) => prev + 1);
  };

  const handleOpenDirect = () => {
    if (reportUrl) {
      window.open(reportUrl, "_blank", "noopener,noreferrer");
    }
  };

  // Không nhúng Power BI khi chưa đăng nhập (username rỗng)
  if (!username) {
    return null;
  }

  return (
    <section className="pbi-embed-container">
      {/* 1. HEADER KHUNG BÁO CÁO */}
      <header className="pbi-embed-header">
        <div className="pbi-embed-title-group">
          <BarChart3 size={18} className="pbi-embed-icon" aria-hidden="true" />
          <h3 className="pbi-embed-title">{title}</h3>
        </div>

        <div className="pbi-embed-actions">
          {/* Nút tùy chỉnh mở rộng / thu gọn kích thước khung nhìn */}
          <button
            type="button"
            className={`pbi-size-toggle-btn ${isExpanded ? "active" : ""}`}
            onClick={() => setIsExpanded(!isExpanded)}
            title={isExpanded ? "Thu nhỏ về chiều cao chuẩn" : "Mở rộng chiều cao (880px) để xem trọn vẹn"}
          >
            {isExpanded ? (
              <Minimize2 size={13} aria-hidden="true" />
            ) : (
              <Maximize2 size={13} aria-hidden="true" />
            )}
            <span>{isExpanded ? "Thu nhỏ" : "Mở rộng (880px)"}</span>
          </button>

          <span className="pbi-embed-badge">
            Dữ liệu đồng bộ từ LMS Data Warehouse
          </span>
        </div>
      </header>

      {/* 2. KHUNG CHỨA IFRAME POWER BI */}
      <div
        className="pbi-embed-frame-wrapper"
        style={{
          height: activeHeight,
          minHeight: activeHeight,
          position: "relative",
          overflow: "hidden",
          borderRadius: "0 0 12px 12px",
          background: "#ffffff",
        }}
      >
        {loading && (
          <div className="pbi-embed-loading" role="status" aria-live="polite">
            <RotateCw
              size={26}
              className="spin-animation"
              style={{
                marginBottom: "10px",
                color: "var(--dlu-green-brand, #37883e)",
              }}
              aria-hidden="true"
            />
            <span>Đang tải dữ liệu trực quan Power BI...</span>
          </div>
        )}

        {loadError && (
          <div
            role="alert"
            style={{
              position: "absolute",
              inset: 0,
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              background: "#ffffff",
              zIndex: 10,
              padding: "24px",
              textAlign: "center",
            }}
          >
            <AlertCircle
              size={40}
              style={{ color: "var(--dlu-red, #c53030)", marginBottom: "12px" }}
              aria-hidden="true"
            />
            <div
              style={{
                fontSize: "15px",
                fontWeight: "700",
                color: "#14251e",
                marginBottom: "6px",
              }}
            >
              Không thể tải báo cáo Power BI
            </div>
            <div
              style={{
                fontSize: "12.5px",
                color: "#667970",
                maxWidth: "420px",
                marginBottom: "18px",
                lineHeight: "1.5",
              }}
            >
              Kết nối tới Microsoft Power BI Service quá thời gian chờ (12 giây) hoặc bị trình duyệt chặn nhúng iframe.
            </div>
            <div
              style={{
                display: "flex",
                gap: "10px",
                flexWrap: "wrap",
                justifyContent: "center",
              }}
            >
              <button
                type="button"
                className="dlu-retry-btn"
                style={{ display: "inline-flex", alignItems: "center", gap: "6px" }}
                onClick={handleRetry}
              >
                <RotateCw size={13} aria-hidden="true" /> Thử lại
              </button>
              <button
                type="button"
                className="btn-dlu-secondary"
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "6px",
                  height: "36px",
                  padding: "0 16px",
                  fontSize: "12px",
                  borderRadius: "8px",
                  cursor: "pointer",
                }}
                onClick={handleOpenDirect}
              >
                <ExternalLink size={13} aria-hidden="true" /> Mở liên kết trực tiếp
              </button>
            </div>
          </div>
        )}

        {reportUrl ? (
          <iframe
            key={`${reportUrl}-${reloadKey}`}
            title={title}
            src={reportUrl}
            className="pbi-embed-iframe"
            style={{
              width: "100%",
              height: "100%",
              border: "none",
              display: loadError ? "none" : "block",
            }}
            allowFullScreen={true}
            onLoad={() => {
              setLoading(false);
              setLoadError(false);
            }}
          />
        ) : (
          <div className="pbi-embed-loading" style={{ color: "#ef4444" }}>
            Không tìm thấy thông tin hợp lệ để tải báo cáo.
          </div>
        )}
      </div>
    </section>
  );
}
