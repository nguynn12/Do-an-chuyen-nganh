import { useState, useEffect } from "react";
import { BarChart3, Maximize2, Minimize2 } from "lucide-react";
import "../styles/PowerBIEmbed.css";

export default function PowerBIEmbed({
  reportUrl,
  title = "Báo cáo phân tích Power BI",
  height = "720px",
}) {
  const [loading, setLoading] = useState(true);
  const [isExpanded, setIsExpanded] = useState(false);

  // Chiều cao linh hoạt: mở rộng lên 880px khi người dùng cần xem rộng hơn
  const activeHeight = isExpanded ? "880px" : height || "720px";

  // Đồng bộ lại trạng thái loading khi URL thay đổi
  useEffect(() => {
    setLoading(true);
  }, [reportUrl]);

  return (
    <section className="pbi-embed-container">
      {/* 1. HEADER KHUNG BÁO CÁO */}
      <header className="pbi-embed-header">
        <div className="pbi-embed-title-group">
          <BarChart3 size={18} className="pbi-embed-icon" />
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
            {isExpanded ? <Minimize2 size={13} /> : <Maximize2 size={13} />}
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
          <div className="pbi-embed-loading">
            Đang tải dữ liệu trực quan Power BI...
          </div>
        )}

        {reportUrl ? (
          <iframe
            key={reportUrl}
            title={title}
            src={reportUrl}
            className="pbi-embed-iframe"
            style={{
              width: "100%",
              height: "100%",
              border: "none",
              display: "block",
            }}
            allowFullScreen={true}
            onLoad={() => setLoading(false)}
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