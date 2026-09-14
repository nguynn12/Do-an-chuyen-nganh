import { useState } from "react";
import { BarChart3 } from "lucide-react";
import "../styles/PowerBIEmbed.css";

export default function PowerBIEmbed({
  reportUrl,
  title = "Báo cáo phân tích Power BI",
  height = "460px",
}) {
  const [loading, setLoading] = useState(true);

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

      <div className="pbi-embed-frame-wrapper" style={{ height }}>
        {loading && (
          <div className="pbi-embed-loading">
            Đang tải dữ liệu trực quan Power BI...
          </div>
        )}

        <iframe
          title={title}
          src={reportUrl}
          className="pbi-embed-iframe"
          allowFullScreen={true}
          onLoad={() => setLoading(false)}
        />
      </div>
    </section>
  );
}