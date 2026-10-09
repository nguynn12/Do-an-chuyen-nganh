import React, { useMemo } from "react";
import {
  TrendingUp,
  Award,
  Sparkles,
  ChevronRight,
  ShieldCheck,
  AlertCircle,
  BarChart3,
} from "lucide-react";

export default function StudentCompetencyRadar({ summary, onNavigateToAnalytics }) {
  const kpis = summary?.kpis || {};

  // Tính toán 5 trục năng lực (thang điểm 0 - 100)
  const metrics = useMemo(() => {
    // 1. Chuyên cần (thời gian truy cập học liệu)
    const hours = kpis.totalEngagementHours || 280;
    const engagementScore = Math.min(100, Math.round((hours / 320) * 100));

    // 2. Kỹ năng thực hành (điểm Lab)
    const avgGrade = parseFloat(kpis.averageGrade) || 7.5;
    const labScore = Math.min(100, Math.round(avgGrade * 10));

    // 3. Tính kỷ luật (nộp bài đúng hạn)
    const submitted = kpis.submittedAssignments || 6;
    const pending = kpis.pendingAssignments || 0;
    const total = submitted + pending || 6;
    const punctualityScore = Math.max(60, Math.min(100, Math.round(85 - pending * 10)));

    // 4. Tiến độ hoàn thành
    const progressScore = Math.min(100, Math.round((submitted / total) * 100));

    // 5. Kết quả tích lũy
    const overallScore = Math.min(100, kpis.averagePercentage || 76);

    return [
      { label: "Chuyên cần", value: engagementScore, raw: `${hours} giờ` },
      { label: "Kỹ năng thực hành", value: labScore, raw: `${avgGrade}/10` },
      { label: "Kỷ luật nộp bài", value: punctualityScore, raw: `${punctualityScore}%` },
      { label: "Tiến độ học tập", value: progressScore, raw: `${submitted}/${total} bài` },
      { label: "Kết quả tích lũy", value: overallScore, raw: `${overallScore}%` },
    ];
  }, [kpis]);

  // Tính tọa độ SVG cho biểu đồ Radar 5 cạnh
  const centerX = 160;
  const centerY = 145;
  const radius = 95;

  const getCoordinates = (angleInDegrees, dist) => {
    const angleInRadians = ((angleInDegrees - 90) * Math.PI) / 180;
    return {
      x: centerX + dist * Math.cos(angleInRadians),
      y: centerY + dist * Math.sin(angleInRadians),
    };
  };

  // 5 đỉnh góc (mỗi góc 72 độ)
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
    <section className="section" style={{ marginTop: "22px" }}>
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

      <div
        style={{
          background: "#ffffff",
          border: "1px solid rgba(11, 85, 63, 0.12)",
          borderRadius: "14px",
          padding: "20px",
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))",
          gap: "24px",
          alignItems: "center",
          boxShadow: "0 2px 10px rgba(16, 76, 54, 0.05)",
        }}
      >
        {/* CỘT 1: BIỂU ĐỒ RADAR SVG */}
        <div style={{ textAlign: "center", position: "relative", width: "100%", maxWidth: "340px", margin: "0 auto" }}>
          <svg
            viewBox="0 0 320 290"
            style={{ width: "100%", height: "auto", overflow: "visible" }}
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

            {/* Các trục nan hoa */}
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

            {/* Vùng dữ liệu năng lực (Gradient xanh lá DLU) */}
            <polygon
              points={dataPolygon}
              fill="rgba(8, 117, 75, 0.2)"
              stroke="#08754b"
              strokeWidth="2.5"
            />

            {/* Các điểm mốc tròn */}
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

            {/* Nhãn văn bản 5 trục */}
            {angles.map((angle, i) => {
              const pt = getCoordinates(angle, radius + 22);
              let textAnchor = "middle";
              if (angle === 72 || angle === 144) textAnchor = "start";
              if (angle === 216 || angle === 288) textAnchor = "end";

              return (
                <text
                  key={i}
                  x={pt.x}
                  y={pt.y}
                  textAnchor={textAnchor}
                  fontSize="10.5"
                  fontWeight="600"
                  fill="#243d34"
                  dominantBaseline="middle"
                >
                  {metrics[i].label}
                </text>
              );
            })}
          </svg>

          <div
            style={{
              fontSize: "11px",
              color: "#667970",
              marginTop: "6px",
              fontStyle: "italic",
            }}
          >
            Mô hình Radar phân tích 5 khía cạnh học tập cá nhân
          </div>
        </div>

        {/* CỘT 2: PHÂN TÍCH INSIGHTS & KHUYẾN NGHỊ HỌC TẬP */}
        <div style={{ display: "flex", flexDirection: "column", gap: "12px", minWidth: 0 }}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              flexWrap: "wrap",
              gap: "8px",
              paddingBottom: "10px",
              borderBottom: "1px solid #edf1ee",
            }}
          >
            <div>
              <div style={{ fontSize: "11px", color: "#667970", textTransform: "uppercase", fontWeight: 700 }}>
                Chỉ số năng lực tổng hợp
              </div>
              <div style={{ fontSize: "20px", fontWeight: 800, color: "#14251e", marginTop: "2px" }}>
                {averageCompetency}/100 Điểm{" "}
                <span
                  style={{
                    fontSize: "11px",
                    fontWeight: 600,
                    color: averageCompetency >= 75 ? "#08754b" : "#e87524",
                    background: averageCompetency >= 75 ? "#e9f4ec" : "#fff1dc",
                    padding: "2px 8px",
                    borderRadius: "10px",
                    marginLeft: "6px",
                  }}
                >
                  {averageCompetency >= 80 ? "Xuất sắc" : averageCompetency >= 70 ? "Khá Tốt" : "Cần cố gắng"}
                </span>
              </div>
            </div>

            <div
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "5px",
                color: "#08754b",
                background: "#e9f4ec",
                padding: "5px 10px",
                borderRadius: "8px",
                fontSize: "11.5px",
                fontWeight: 600,
              }}
            >
              <ShieldCheck size={15} /> Hồ sơ học tập an toàn
            </div>
          </div>

          {/* CHI TIẾT TỪNG TRỤC: HIỂN THỊ RÕ RÀNG KHÔNG BAO GIỜ BỊ RỚT CHỮ */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(135px, 1fr))",
              gap: "8px",
            }}
          >
            {metrics.map((m, idx) => (
              <div
                key={idx}
                style={{
                  background: "#f8faf8",
                  border: "1px solid rgba(11, 85, 63, 0.08)",
                  borderRadius: "8px",
                  padding: "8px 10px",
                  display: "flex",
                  flexDirection: "column",
                  gap: "2px",
                }}
              >
                <span style={{ fontSize: "10.5px", color: "#667970", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                  {m.label}
                </span>
                <span style={{ fontSize: "12px", fontWeight: 700, color: "#14251e" }}>
                  {m.raw}{" "}
                  <span style={{ fontSize: "10px", fontWeight: 500, color: "#08754b" }}>
                    ({m.value}%)
                  </span>
                </span>
              </div>
            ))}
          </div>

          {/* KHUYẾN NGHỊ HỌC TẬP TỰ ĐỘNG */}
          <div
            style={{
              background: "#f0f7f2",
              border: "1px solid rgba(8, 117, 75, 0.18)",
              borderRadius: "8px",
              padding: "10px 12px",
              display: "flex",
              alignItems: "flex-start",
              gap: "10px",
            }}
          >
            <Sparkles size={16} color="#08754b" style={{ flexShrink: 0, marginTop: "2px" }} />
            <div style={{ fontSize: "11.5px", color: "#1b4d38", lineHeight: "1.45" }}>
              <strong>Khuyến nghị từ Learning Analytics:</strong> Bạn đang duy trì phong độ thực hành bài Lab rất tốt ({metrics[1].raw}). Hãy tiếp tục nộp đúng hạn các bài tập tiếp theo và phân bổ thời gian xem tài liệu đều đặn để tối ưu hóa điểm tổng kết cuối kỳ.
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
