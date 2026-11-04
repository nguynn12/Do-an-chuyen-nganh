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

  // Tính toán các trục năng lực chỉ từ dữ liệu THẬT (không fallback số ảo)
  const validMetrics = useMemo(() => {
    const list = [];

    // 1. Chuyên cần (thời gian học)
    if (kpis.totalEngagementHours != null && !isNaN(Number(kpis.totalEngagementHours))) {
      const hours = Number(kpis.totalEngagementHours);
      const engagementScore = Math.min(100, Math.round((hours / 320) * 100));
      list.push({
        key: "engagement",
        label: "Chuyên cần",
        value: engagementScore,
        raw: `${hours} giờ`,
      });
    }

    // 2. Kỹ năng thực hành (điểm Lab/thực hành)
    if (kpis.averageGrade != null && !isNaN(parseFloat(kpis.averageGrade))) {
      const avgGrade = parseFloat(kpis.averageGrade);
      const labScore = Math.min(100, Math.round(avgGrade * 10));
      list.push({
        key: "lab",
        label: "Kỹ năng thực hành",
        value: labScore,
        raw: `${avgGrade}/10`,
      });
    }

    // 3. Tính kỷ luật (nộp bài đúng hạn)
    if (kpis.punctualityScore != null && !isNaN(Number(kpis.punctualityScore))) {
      const punctualityScore = Number(kpis.punctualityScore);
      list.push({
        key: "punctuality",
        label: "Kỷ luật nộp bài",
        value: punctualityScore,
        raw: `${punctualityScore}%`,
      });
    }

    // 4. Tiến độ học tập (bài đã nộp / tổng bài)
    if (kpis.submittedAssignments != null || kpis.totalAssignments != null) {
      const submitted = Number(kpis.submittedAssignments || 0);
      const total = Number(
        kpis.totalAssignments != null
          ? kpis.totalAssignments
          : submitted + Number(kpis.pendingAssignments || 0)
      );
      const progressScore = total > 0 ? Math.min(100, Math.round((submitted / total) * 100)) : 0;
      list.push({
        key: "progress",
        label: "Tiến độ học tập",
        value: progressScore,
        raw: `${submitted}/${total} bài`,
      });
    }

    // 5. Kết quả tích lũy (%)
    if (kpis.averagePercentage != null && !isNaN(Number(kpis.averagePercentage))) {
      const overallScore = Number(kpis.averagePercentage);
      list.push({
        key: "overall",
        label: "Kết quả tích lũy",
        value: overallScore,
        raw: `${overallScore}%`,
      });
    }

    return list;
  }, [kpis]);

  // Nếu thiếu dữ liệu hoặc không đủ số trục để vẽ radar (cần tối thiểu 3 trục)
  if (!validMetrics || validMetrics.length < 3) {
    return (
      <section className="section competency-section">
        <div className="section-title">
          <div>
            <TrendingUp size={18} style={{ color: "var(--dlu-green-brand, #37883e)" }} aria-hidden="true" />
            <strong>Đánh giá Năng lực Toàn diện &amp; Cảnh báo Sớm</strong>
          </div>
          {onNavigateToAnalytics && (
            <button
              type="button"
              className="btn-dlu-secondary"
              style={{ height: "28px", fontSize: "11px", padding: "0 10px" }}
              onClick={onNavigateToAnalytics}
            >
              <BarChart3 size={13} aria-hidden="true" /> Mở Power BI chi tiết
            </button>
          )}
        </div>

        <div
          className="competency-card dlu-state-card"
          style={{ padding: "48px 24px", textAlign: "center" }}
          role="status"
        >
          <div
            className="dlu-state-title"
            style={{ fontSize: "15px", color: "var(--dlu-text-dark, #14251e)", marginBottom: "8px" }}
          >
            Chưa có đủ dữ liệu học tập để lập biểu đồ năng lực
          </div>
          <div
            className="dlu-state-desc"
            style={{ fontSize: "12.5px", color: "var(--dlu-text-muted, #667970)" }}
          >
            Biểu đồ radar yêu cầu tối thiểu 3 chỉ số năng lực. Dữ liệu sẽ tự động xuất hiện khi bạn có thêm hoạt động học tập trên hệ thống.
          </div>
        </div>
      </section>
    );
  }

  // Tính tọa độ SVG cho biểu đồ Radar động (theo số lượng chỉ số có thật)
  const count = validMetrics.length;
  const angles = Array.from({ length: count }, (_, i) => i * (360 / count));

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

  // Lưới đa giác nền (25%, 50%, 75%, 100%)
  const gridLevels = [0.25, 0.5, 0.75, 1.0];
  const gridPolygons = gridLevels.map((level) => {
    return angles
      .map((angle) => {
        const pt = getCoordinates(angle, radius * level);
        return `${pt.x.toFixed(1)},${pt.y.toFixed(1)}`;
      })
      .join(" ");
  });

  // Đa giác dữ liệu thực tế
  const dataPolygon = angles
    .map((angle, idx) => {
      const val = validMetrics[idx].value / 100;
      const pt = getCoordinates(angle, radius * Math.max(0.15, Math.min(1.0, val)));
      return `${pt.x.toFixed(1)},${pt.y.toFixed(1)}`;
    })
    .join(" ");

  // Điểm số trung bình tổng hợp từ các chỉ số có thật
  const averageCompetency = Math.round(
    validMetrics.reduce((acc, curr) => acc + curr.value, 0) / validMetrics.length
  );

  const labMetric = validMetrics.find((m) => m.key === "lab");

  return (
    <section className="section competency-section">
      <div className="section-title">
        <div>
          <TrendingUp size={18} style={{ color: "var(--dlu-green-brand, #37883e)" }} aria-hidden="true" />
          <strong>Đánh giá Năng lực Toàn diện &amp; Cảnh báo Sớm</strong>
        </div>
        <button
          type="button"
          className="btn-dlu-secondary"
          style={{ height: "28px", fontSize: "11px", padding: "0 10px" }}
          onClick={onNavigateToAnalytics}
        >
          <BarChart3 size={13} aria-hidden="true" /> Mở Power BI chi tiết
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
                  : averageCompetency >= 50
                  ? "Trung Bình"
                  : "Cần cố gắng"}
              </span>
            </div>

            <div className="competency-status-row">
              <ShieldCheck size={16} aria-hidden="true" />{" "}
              {averageCompetency >= 50 ? "Hồ sơ học tập an toàn" : "Cần tăng cường nỗ lực học tập"}
            </div>

            <p className="competency-hero-desc">
              Đánh giá toàn diện dựa trên {count} khía cạnh học tập có dữ liệu từ LMS và Data Warehouse.
            </p>

            <div className="competency-bar-track">
              <div
                className="competency-bar-fill"
                style={{ width: `${Math.min(100, averageCompetency)}%` }}
              />
            </div>
          </div>

          {/* CỘT PHẢI: SƠ ĐỒ RADAR DẠNG SAO RỘNG RÃI */}
          <div className="competency-radar-box">
            <svg
              viewBox="0 0 440 300"
              className="competency-radar-svg"
              role="img"
              aria-label={`Biểu đồ radar đánh giá ${count} khía cạnh năng lực học tập sinh viên`}
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

              {/* Các điểm mốc tròn trên các đỉnh */}
              {angles.map((angle, i) => {
                const val = validMetrics[i].value / 100;
                const pt = getCoordinates(angle, radius * Math.max(0.15, Math.min(1.0, val)));
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

              {/* Nhãn chữ có lề rộng rãi */}
              {angles.map((angle, i) => {
                const pt = getCoordinates(angle, radius + 28);
                let textAnchor = "middle";
                const normAngle = ((angle % 360) + 360) % 360;
                if (normAngle > 20 && normAngle < 160) textAnchor = "start";
                else if (normAngle > 200 && normAngle < 340) textAnchor = "end";

                return (
                  <text
                    key={i}
                    x={pt.x.toFixed(1)}
                    y={pt.y.toFixed(1)}
                    textAnchor={textAnchor}
                    fontSize="11"
                    fontWeight="600"
                    fill="#243d34"
                    dominantBaseline="middle"
                  >
                    {validMetrics[i].label}
                  </text>
                );
              })}
            </svg>

            <span className="competency-radar-caption">
              Mô hình Radar phân tích {count} khía cạnh học tập cá nhân
            </span>
          </div>
        </div>

        {/* ========================================================
            TẦNG 2: CÁC THẺ CHI TIẾT (CHỈ HIỂN THỊ CÁC CHỈ SỐ CÓ THẬT)
            ======================================================== */}
        <div className="competency-metrics-grid">
          {validMetrics.map((m, idx) => (
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
          <Sparkles size={18} className="competency-recommendation-icon" aria-hidden="true" />
          <p className="competency-recommendation-text">
            <strong>Khuyến nghị từ Learning Analytics:</strong>{" "}
            {labMetric
              ? `Bạn đang duy trì phong độ thực hành bài Lab (${labMetric.raw}). Hãy tiếp tục nộp đúng hạn các bài tập tiếp theo và phân bổ thời gian xem tài liệu đều đặn để tối ưu hóa điểm tổng kết cuối kỳ.`
              : "Hãy tiếp tục nộp đúng hạn các bài tập và phân bổ thời gian xem tài liệu đều đặn để nâng cao các chỉ số năng lực học tập."}
          </p>
        </div>
      </div>
    </section>
  );
}
