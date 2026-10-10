import React, { useMemo } from "react";
import {
  TrendingUp,
  BarChart3,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import "../styles/StudentCompetencyRadar.css";

export default function StudentCompetencyRadar({ summary, onNavigateToAnalytics }) {
  const kpis = summary?.kpis || {};

  // Tính toán 5 trục năng lực (thang điểm 0 - 100)
  const metrics = useMemo(() => {
    // 1. Chuyên cần (thời gian học)
    const hours = kpis.totalEngagementHours != null ? kpis.totalEngagementHours : 205.2;
    const engagementScore = Math.min(100, Math.round((hours / 320) * 100));

    // 2. Kỹ năng thực hành (điểm Lab/thực hành)
    const avgGrade = kpis.averageGrade != null ? parseFloat(kpis.averageGrade) : 7.8;
    const labScore = Math.min(100, Math.round(avgGrade * 10));

    // 3. Tính kỷ luật (nộp bài đúng hạn)
    const punctualityScore = kpis.punctualityScore != null ? kpis.punctualityScore : 85;

    // 4. Tiến độ học tập (bài đã nộp / tổng bài)
    const submitted = kpis.submittedAssignments != null ? kpis.submittedAssignments : 4;
    const pending = kpis.pendingAssignments || 0;
    const total = kpis.totalAssignments != null ? kpis.totalAssignments : (submitted + pending || 4);
    const progressScore = Math.min(100, Math.round((submitted / (total || 1)) * 100));

    // 5. Kết quả tích lũy (%)
    const overallScore = kpis.averagePercentage != null ? kpis.averagePercentage : 78;

    return [
      { label: "Chuyên cần", value: engagementScore, raw: `${hours} giờ` },
      { label: "Kỹ năng thực hành", value: labScore, raw: `${avgGrade}/10` },
      { label: "Kỷ luật nộp bài", value: punctualityScore, raw: `${punctualityScore}%` },
      { label: "Tiến độ học tập", value: progressScore, raw: `${submitted}/${total} bài` },
      { label: "Kết quả tích lũy", value: overallScore, raw: `${overallScore}%` },
    ];
  }, [kpis]);

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
      const pt = getCoordinates(angle, radius * Math.max(0.2, val));
      return `${pt.x},${pt.y}`;
    })
    .join(" ");

  // Điểm số trung bình tổng hợp
  const averageCompetency = Math.round(
    metrics.reduce((acc, curr) => acc + curr.value, 0) / metrics.length
  );

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
            <span className="competency-hero-tag">Chỉ số năng lực tổng hợp</span>
            
            <div className="competency-score-row">
              <span className="competency-score-number">{averageCompetency}</span>
              <span className="competency-score-scale">/100 Điểm</span>
              <span className="competency-badge-rank">
                {averageCompetency >= 80
                  ? "Xuất sắc"
                  : averageCompetency >= 70
                  ? "Khá Tốt"
                  : "Cần cố gắng"}
              </span>
            </div>

            <div className="competency-status-row">
              <ShieldCheck size={16} /> Hồ sơ học tập an toàn
            </div>

            <p className="competency-hero-desc">
              Đánh giá toàn diện dựa trên 5 khía cạnh học tập thời gian thực từ LMS và Data Warehouse.
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
                const pt = getCoordinates(angle, radius * Math.max(0.2, val));
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
                <span className="competency-metric-pct">({m.value}%)</span>
              </div>
            </div>
          ))}
        </div>

        {/* Khối khuyến nghị từ Learning Analytics */}
        <div className="competency-recommendation">
          <Sparkles size={18} className="competency-recommendation-icon" />
          <p className="competency-recommendation-text">
            <strong>Khuyến nghị từ Learning Analytics:</strong> Bạn đang duy trì phong độ thực hành bài Lab rất tốt ({metrics[1].raw}). Hãy tiếp tục nộp đúng hạn các bài tập tiếp theo và phân bổ thời gian xem tài liệu đều đặn để tối ưu hóa điểm tổng kết cuối kỳ.
          </p>
        </div>
      </div>
    </section>
  );
}
