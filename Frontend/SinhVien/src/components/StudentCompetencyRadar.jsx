import React, { useMemo } from "react";
import {
  TrendingUp,
  BarChart3,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import "../styles/StudentCompetencyRadar.css";

export default function StudentCompetencyRadar({ summary, onNavigateToAnalytics }) {
  const metrics = useMemo(() => {
    const kpis = summary?.kpis || {};
    const percent = value => value == null ? null : Math.max(0, Math.min(100, Number(value)));
    const submitted = Number(kpis.submittedAssignments || 0);
    const total = Number(kpis.totalAssignments || 0);
    const attendance = percent(kpis.attendanceRate);
    const grade = kpis.averageGrade == null ? null : Number(kpis.averageGrade);
    const punctuality = percent(kpis.punctualityScore);
    const progress = total ? percent(Math.round(submitted / total * 100)) : null;
    const overall = percent(kpis.averagePercentage);
    return [
      {label:'Chuyên cần', value:attendance, raw:attendance == null ? 'Chưa có điểm danh' : `${attendance}%`},
      {label:'Điểm trung bình', value:grade == null ? null : percent(grade*10), raw:grade == null ? 'Chưa có điểm' : `${grade}/10`},
      {label:'Kỷ luật nộp bài', value:punctuality, raw:punctuality == null ? 'Chưa có dữ liệu' : `${punctuality}%`},
      {label:'Tiến độ học tập', value:progress, raw:`${submitted}/${total} bài`},
      {label:'Kết quả tích lũy', value:overall, raw:overall == null ? 'Chưa có điểm' : `${overall}%`},
    ];
  }, [summary?.kpis]);

  // Tính tọa độ SVG cho biểu đồ Radar 5 cạnh (rộng rãi, an toàn lề)
  const centerX = 220;
  const centerY = 150;
  const radius = 82;

  const getCoordinates = (angleInDegrees, dist) => {
    const angleInRadians = ((angleInDegrees - 90) * Math.PI) / 180;
    return {
      x: centerX + dist * Math.cos(angleInRadians),
      y: centerY + dist * Math.sin(angleInRadians),
    };
  };

  // 5 góc đối xứng (mỗi góc 72 độ)
  const angles = [0, 72, 144, 216, 288];

  // Lưới đa giác nền (25%, 50%, 75%, 100%)
  const gridLevels = [0.25, 0.5, 0.75, 1.0];
  const gridPolygons = gridLevels.map((level) => {
    return angles
      .map((angle) => {
        const pt = getCoordinates(angle, radius * level);
        return `${pt.x},${pt.y}`;
      })
      .join(" ");
  });

  // Đa giác dữ liệu thực tế
  const dataPolygon = angles
    .map((angle, idx) => {
      const val = metrics[idx].value / 100;
      const pt = getCoordinates(angle, radius * Math.max(0, val));
      return `${pt.x},${pt.y}`;
    })
    .join(" ");

  // Điểm số trung bình tổng hợp
  const availableMetrics = metrics.filter(metric => metric.value != null);
  const averageCompetency = availableMetrics.length ? Math.round(availableMetrics.reduce((sum,metric) => sum+metric.value,0) / availableMetrics.length) : null;

  return (
    <section className="section competency-section">
      <div className="section-title">
        <div>
          <TrendingUp size={18} style={{ color: "#37883e" }} />
          <strong>Đánh giá Năng lực Toàn diện &amp; Cảnh báo Sớm</strong>
        </div>
        <button
          type="button"
          className="btn-dlu-secondary"
          style={{ height: "28px", fontSize: "11px", padding: "0 10px" }}
          onClick={onNavigateToAnalytics}
        >
          <BarChart3 size={13} /> Mở Power BI chi tiết
        </button>
      </div>

      <div className="competency-card">
        {/* ========================================================
            TẦNG 1: TRÁI = ĐIỂM TỔNG TO, PHẢI = SƠ ĐỒ RADAR HÌNH SAO
            ======================================================== */}
        <div className="competency-top-split">
          {/* CỘT TRÁI: ĐIỂM TỔNG NĂNG LỰC TO, NỔI BẬT */}
          <div className="competency-hero">
            <span className="competency-hero-tag">Chỉ số học tập tham khảo</span>
            
            <div className="competency-score-row">
              <span className="competency-score-number">{averageCompetency ?? "—"}</span>
              <span className="competency-score-scale">/100 Điểm</span>
              <span className="competency-badge-rank">
                {averageCompetency == null ? "Chưa đủ dữ liệu" : averageCompetency >= 80
                  ? "Xuất sắc"
                  : averageCompetency >= 70
                  ? "Khá Tốt"
                  : "Cần cố gắng"}
              </span>
            </div>

            <div className="competency-status-row">
              <ShieldCheck size={16} /> Tổng hợp từ dữ liệu được ghi nhận
            </div>

            <p className="competency-hero-desc">
              Các chỉ số lấy từ Data Warehouse. Giá trị chưa có dữ liệu được ghi rõ; chỉ số tổng hợp là trung bình các trục có dữ liệu.
            </p>

            <div className="competency-bar-track">
              <div
                className="competency-bar-fill"
                style={{ width: `${Math.min(100, averageCompetency)}%` }}
              />
            </div>
          </div>

          {/* CỘT PHẢI: SƠ ĐỒ RADAR DẠNG SAO RỘNG RÃI, KHÔNG BỊ TRÀN CHỮ */}
          <div className="competency-radar-box">
            <svg
              viewBox="0 0 440 300"
              className="competency-radar-svg"
            >
              {/* Lưới đa giác nền */}
              {gridPolygons.map((poly, i) => (
                <polygon
                  key={i}
                  points={poly}
                  fill={i % 2 === 0 ? "#f9fbf9" : "#ffffff"}
                  stroke="#e2ebe3"
                  strokeWidth="1"
                />
              ))}

              {/* Các trục nan hoa nối từ tâm */}
              {angles.map((angle, i) => {
                const pt = getCoordinates(angle, radius);
                return (
                  <line
                    key={i}
                    x1={centerX}
                    y1={centerY}
                    x2={pt.x}
                    y2={pt.y}
                    stroke="#e2ebe3"
                    strokeWidth="1"
                    strokeDasharray="3 3"
                  />
                );
              })}

              {/* Vùng diện tích năng lực */}
              <polygon
                points={dataPolygon}
                fill="rgba(8, 117, 75, 0.22)"
                stroke="#08754b"
                strokeWidth="2.5"
              />

              {/* Các điểm mốc tròn trên 5 đỉnh */}
              {angles.map((angle, i) => {
                const val = metrics[i].value / 100;
                const pt = getCoordinates(angle, radius * Math.max(0, val));
                return (
                  <circle
                    key={i}
                    cx={pt.x}
                    cy={pt.y}
                    r="4.5"
                    fill="#ffffff"
                    stroke="#08754b"
                    strokeWidth="2.5"
                  />
                );
              })}

              {/* 5 Nhãn chữ có lề rộng rãi, không đè lấn */}
              {angles.map((angle, i) => {
                const pt = getCoordinates(angle, radius + 28);
                let textAnchor = "middle";
                if (angle === 72 || angle === 144) textAnchor = "start";
                if (angle === 216 || angle === 288) textAnchor = "end";

                return (
                  <text
                    key={i}
                    x={pt.x}
                    y={pt.y}
                    textAnchor={textAnchor}
                    fontSize="11"
                    fontWeight="600"
                    fill="#243d34"
                    dominantBaseline="middle"
                  >
                    {metrics[i].label}
                  </text>
                );
              })}
            </svg>

            <span className="competency-radar-caption">
              Mô hình Radar phân tích 5 khía cạnh học tập cá nhân
            </span>
          </div>
        </div>

        {/* ========================================================
            TẦNG 2: MỤC CỦA HÌNH 2 (5 THẺ CHI TIẾT & KHUYẾN NGHỊ)
            ======================================================== */}
        <div className="competency-metrics-grid">
          {metrics.map((m, idx) => (
            <div key={idx} className="competency-metric-card">
              <span className="competency-metric-label">{m.label}</span>
              <div className="competency-metric-value-row">
                <span className="competency-metric-raw">{m.raw}</span>
                <span className="competency-metric-pct">{m.value == null ? "(—)" : `(${m.value}%)`}</span>
              </div>
            </div>
          ))}
        </div>

        {/* Khối khuyến nghị từ Learning Analytics */}
        <div className="competency-recommendation">
          <Sparkles size={18} className="competency-recommendation-icon" />
          <p className="competency-recommendation-text">
            <strong>Gợi ý học tập:</strong> {metrics[3].value != null && metrics[3].value < 100 ? 'Bạn còn bài tập chưa ghi nhận nộp. Hãy kiểm tra danh sách bài tập và hạn nộp trên LMS.' : 'Theo dõi lịch học và bảng điểm trên LMS để cập nhật tiến độ của bạn.'}
          </p>
        </div>
      </div>
    </section>
  );
}
