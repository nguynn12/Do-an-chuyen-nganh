import { useState, useEffect } from "react";
import { BarChart3 } from "lucide-react";
import "../styles/PowerBIEmbed.css";

export default function PowerBIEmbed({
  reportUrl,
  title = "Báo cáo phân tích Power BI",
  height = "520px",
}) {
  const [loading, setLoading] = useState(true);

  // Reset lại trạng thái loading mỗi khi đường link reportUrl thay đổi
  useEffect(() => {
    setLoading(true);
  }, [reportUrl]);

  return (
    <section className="pbi-embed-container">
      <header className="pbi-embed-header">
        <div className="pbi-embed-title-group">
          <BarChart3 size={18} className="pbi-embed-icon" />
          <h3 className="pbi-embed-title">{title}</h3>
        </div>
        <span className="pbi-embed-badge">
          Dữ liệu đồng bộ từ LMS Data Warehouse
        </span>
      </header>

      <div
        className="pbi-embed-frame-wrapper"
        style={{
          height,
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

        <iframe
          key={reportUrl}
          title={title}
          src={reportUrl}
          className="pbi-embed-iframe"
          style={{
            width: "100%",
            height: "calc(100% + 42px)",
            border: "none",
            display: "block",
          }}
          allowFullScreen={true}
          onLoad={() => setLoading(false)}
        />
      </div>
    </section>
  );
}