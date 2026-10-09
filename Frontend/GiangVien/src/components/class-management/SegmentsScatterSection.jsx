import { useEffect, useMemo, useState } from "react";
import {
  Compass,
  Users,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
  ArrowUpRight,
  Search,
  Filter,
  Eye,
  Sliders,
} from "lucide-react";
import { getCourseSegments } from "../../services/teacherApi";

// Định nghĩa màu sắc và thuộc tính cho 4 nhóm phân khúc
const SEGMENT_THEMES = {
  "Chăm & giỏi": {
    color: "#37883e",
    bg: "#dcfce7",
    border: "#86efac",
    cardBg: "linear-gradient(135deg, #f0fdf4 0%, #dcfce7 100%)",
    label: "Chăm & giỏi",
    quadrant: "Góc Trên - Phải",
    desc: "Tham gia tích cực và điểm số cao (≥ ngưỡng lớp)",
  },
  "Chăm nhưng điểm thấp": {
    color: "#e0a030",
    bg: "#fef3c7",
    border: "#fcd34d",
    cardBg: "linear-gradient(135deg, #fffbeb 0%, #fef3c7 100%)",
    label: "Chăm nhưng điểm thấp",
    quadrant: "Góc Dưới - Phải",
    desc: "Tích cực học tập nhưng kết quả bài tập/thi chưa cao",
  },
  "Ít tham gia nhưng điểm cao": {
    color: "#4a90b8",
    bg: "#e0f2fe",
    border: "#7dd3fc",
    cardBg: "linear-gradient(135deg, #f0f9ff 0%, #e0f2fe 100%)",
    label: "Ít tham gia nhưng điểm cao",
    quadrant: "Góc Trên - Trái",
    desc: "Học lực tốt nhưng ít tương tác, cần duy trì động lực",
  },
  "Nguy cơ cao": {
    color: "#c0504d",
    bg: "#fee2e2",
    border: "#fca5a5",
    cardBg: "linear-gradient(135deg, #fef2f2 0%, #fee2e2 100%)",
    label: "Nguy cơ cao",
    quadrant: "Góc Dưới - Trái",
    desc: "Ít tham gia và điểm thấp, cần can thiệp sớm",
  },
};

export default function SegmentsScatterSection({ courseId, onSelectStudent }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Trạng thái hover & bộ lọc
  const [hoveredStudent, setHoveredStudent] = useState(null);
  const [selectedSegmentFilter, setSelectedSegmentFilter] = useState("all");
  const [searchTerm, setSearchTerm] = useState("");

  useEffect(() => {
    let isCancelled = false;

    async function loadSegments() {
      if (!courseId) return;
      try {
        setLoading(true);
        setError(null);
        const res = await getCourseSegments(courseId);
        if (!isCancelled) {
          setData(res);
        }
      } catch (err) {
        if (!isCancelled) {
          console.error("Lỗi nạp phân khúc 2x2:", err);
          setError(err.message || "Không thể tải dữ liệu phân khúc 2x2.");
        }
      } finally {
        if (!isCancelled) setLoading(false);
      }
    }

    loadSegments();
    return () => {
      isCancelled = true;
    };
  }, [courseId]);

  // Sinh viên sau lọc
  const filteredStudents = useMemo(() => {
    if (!data?.students) return [];
    return data.students.filter((s) => {
      const matchSegment =
        selectedSegmentFilter === "all" || s.segment === selectedSegmentFilter;
      const matchSearch =
        !searchTerm.trim() ||
        s.name?.toLowerCase().includes(searchTerm.toLowerCase().trim()) ||
        s.username?.toLowerCase().includes(searchTerm.toLowerCase().trim()) ||
        s.email?.toLowerCase().includes(searchTerm.toLowerCase().trim());
      return matchSegment && matchSearch;
    });
  }, [data, selectedSegmentFilter, searchTerm]);

  // Cấu hình kích thước Scatter SVG
  const svgWidth = 720;
  const svgHeight = 440;
  const padding = { top: 40, right: 40, bottom: 60, left: 65 };
  const plotWidth = svgWidth - padding.left - padding.right;
  const plotHeight = svgHeight - padding.top - padding.bottom;

  // Tính tọa độ SVG từ giá trị (X: Participation 0-100, Y: Grade 0-100)
  const getX = (val) => padding.left + (Math.max(0, Math.min(100, val || 0)) / 100) * plotWidth;
  const getY = (val) => padding.top + (1 - Math.max(0, Math.min(100, val || 0)) / 100) * plotHeight;

  // Xử lý khi click vào sinh viên
  const handleStudentClick = (student) => {
    if (onSelectStudent) {
      onSelectStudent(student);
    }
    // Tìm phần tử trong DOM và cuộn tới
    const element = document.getElementById(`student-row-${student.userKey}`);
    if (element) {
      element.scrollIntoView({ behavior: "smooth", block: "center" });
      element.style.outline = "2px solid #37883e";
      setTimeout(() => {
        element.style.outline = "none";
      }, 2500);
    }
  };

  if (loading) {
    return (
      <div className="segments-scatter-card" style={{ padding: "32px", textAlign: "center", background: "#ffffff", borderRadius: "20px", border: "1px solid rgba(55, 136, 62, 0.15)", marginBottom: "28px" }}>
        <div style={{ color: "#37883e", fontWeight: "600", marginBottom: "8px" }}>
          Đang tính toán phân khúc sinh viên 2×2...
        </div>
        <div style={{ fontSize: "13px", color: "#6b7280" }}>
          Đang xác định ngưỡng trung vị lớp và phân loại nhóm từ Data Warehouse
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div
        className="segments-scatter-card"
        style={{
          padding: "24px",
          background: "#fef2f2",
          border: "1px solid #fecaca",
          borderRadius: "16px",
          color: "#991b1b",
          marginBottom: "28px",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "10px", fontWeight: "600" }}>
          <AlertCircle size={20} /> Không thể hiển thị phân khúc sinh viên 2×2
        </div>
        <div style={{ fontSize: "13px", marginTop: "6px" }}>{error}</div>
      </div>
    );
  }

  const { thresholds, counts, totalStudents, students } = data;
  const pThreshold = thresholds?.participation ?? 50;
  const gThreshold = thresholds?.grade ?? 50;

  // Tọa độ 2 đường phân chia trung vị
  const thresholdLineX = getX(pThreshold);
  const thresholdLineY = getY(gThreshold);

  return (
    <section className="segments-scatter-section" style={{ marginBottom: "28px", display: "block", width: "100%", clear: "both" }}>
      <div
        className="segments-scatter-card"
        style={{
          background: "linear-gradient(135deg, #ffffff 0%, #f9fbf8 100%)",
          border: "1px solid rgba(55, 136, 62, 0.15)",
          borderRadius: "20px",
          padding: "26px",
          boxShadow: "0 10px 30px rgba(32, 53, 34, 0.05)",
          display: "block",
          width: "100%",
          boxSizing: "border-box",
        }}
      >
        {/* Header */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            flexWrap: "wrap",
            gap: "14px",
            borderBottom: "1px solid rgba(67, 91, 70, 0.1)",
            paddingBottom: "18px",
            marginBottom: "22px",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
            <div
              style={{
                width: "42px",
                height: "42px",
                borderRadius: "12px",
                background: "rgba(55, 136, 62, 0.12)",
                color: "#37883e",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Compass size={24} />
            </div>
            <div>
              <h3
                style={{
                  margin: 0,
                  fontSize: "18px",
                  fontWeight: "700",
                  color: "#203026",
                }}
              >
                Phân khúc Sinh viên 2×2 (Ma trận Tham gia & Học lực)
              </h3>
              <p style={{ margin: "3px 0 0", fontSize: "13px", color: "#66736b" }}>
                Phân loại 4 nhóm tự động theo ngưỡng trung vị của lớp (Thích ứng linh hoạt theo từng môn)
              </p>
            </div>
          </div>

          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "8px",
              background: "#f0fdf4",
              border: "1px solid #bbf7d0",
              padding: "6px 14px",
              borderRadius: "20px",
              fontSize: "12px",
              color: "#166534",
              fontWeight: "600",
            }}
          >
            Ngưỡng trung vị: Tham gia ≥ {pThreshold} đ • Điểm TB ≥ {gThreshold}%
          </div>
        </div>

        {/* 4 Thẻ Phân khúc Tổng hợp */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
            gap: "14px",
            marginBottom: "24px",
          }}
        >
          {Object.keys(SEGMENT_THEMES).map((segKey) => {
            const theme = SEGMENT_THEMES[segKey];
            const count = counts?.[segKey] || 0;
            const pct = totalStudents > 0 ? Math.round((count / totalStudents) * 100) : 0;
            const isSelected = selectedSegmentFilter === segKey;

            return (
              <div
                key={segKey}
                onClick={() =>
                  setSelectedSegmentFilter(isSelected ? "all" : segKey)
                }
                style={{
                  background: isSelected ? theme.bg : "#ffffff",
                  border: `1.5px solid ${isSelected ? theme.color : "rgba(67, 91, 70, 0.12)"}`,
                  borderRadius: "16px",
                  padding: "16px",
                  cursor: "pointer",
                  transition: "all 0.2s ease",
                  boxShadow: isSelected
                    ? `0 6px 16px ${theme.color}25`
                    : "0 2px 6px rgba(0,0,0,0.02)",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                  }}
                >
                  <span
                    style={{
                      fontSize: "12px",
                      fontWeight: "700",
                      color: theme.color,
                      display: "flex",
                      alignItems: "center",
                      gap: "6px",
                    }}
                  >
                    <span
                      style={{
                        width: "8px",
                        height: "8px",
                        borderRadius: "50%",
                        background: theme.color,
                      }}
                    />
                    {theme.label}
                  </span>
                  <span
                    style={{
                      fontSize: "10px",
                      color: "#6b7280",
                      background: "rgba(0,0,0,0.04)",
                      padding: "2px 6px",
                      borderRadius: "6px",
                    }}
                  >
                    {theme.quadrant}
                  </span>
                </div>

                <div
                  style={{
                    fontSize: "26px",
                    fontWeight: "800",
                    color: "#1f2937",
                    marginTop: "8px",
                  }}
                >
                  {count}{" "}
                  <span style={{ fontSize: "14px", fontWeight: "600", color: "#6b7280" }}>
                    SV ({pct}%)
                  </span>
                </div>

                <div
                  style={{
                    fontSize: "11px",
                    color: "#66736b",
                    marginTop: "4px",
                    lineHeight: "1.4",
                  }}
                >
                  {theme.desc}
                </div>
              </div>
            );
          })}
        </div>

        {/* Biểu đồ Scatter Chart SVG */}
        <div
          style={{
            background: "#ffffff",
            border: "1px solid rgba(67, 91, 70, 0.12)",
            borderRadius: "16px",
            padding: "20px",
            marginBottom: "24px",
            position: "relative",
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              marginBottom: "10px",
            }}
          >
            <span style={{ fontSize: "14px", fontWeight: "700", color: "#203026" }}>
              Biểu đồ Phân tán (Scatter Chart) — Tương quan Tham gia & Điểm số
            </span>
            <span style={{ fontSize: "11px", color: "#79867d" }}>
              * Rê chuột để xem thông tin • Click vào điểm để xem chi tiết sinh viên
            </span>
          </div>

          <div style={{ width: "100%", overflowX: "auto" }}>
            <svg
              viewBox={`0 0 ${svgWidth} ${svgHeight}`}
              style={{
                width: "100%",
                maxWidth: "720px",
                height: "auto",
                display: "block",
                margin: "0 auto",
                overflow: "visible",
              }}
            >
              <defs>
                {/* Glow filter cho hover */}
                <filter id="pointGlow" x="-50%" y="-50%" width="200%" height="200%">
                  <feDropShadow dx="0" dy="2" stdDeviation="3" floodOpacity="0.3" />
                </filter>
              </defs>

              {/* 4 Quadrant Background Fills */}
              {/* Q2: Top-Left (Ít tham gia, điểm cao) */}
              <rect
                x={padding.left}
                y={padding.top}
                width={thresholdLineX - padding.left}
                height={thresholdLineY - padding.top}
                fill="rgba(74, 144, 184, 0.06)"
              />
              {/* Q1: Top-Right (Chăm & Giỏi) */}
              <rect
                x={thresholdLineX}
                y={padding.top}
                width={padding.left + plotWidth - thresholdLineX}
                height={thresholdLineY - padding.top}
                fill="rgba(55, 136, 62, 0.07)"
              />
              {/* Q3: Bottom-Left (Nguy cơ cao) */}
              <rect
                x={padding.left}
                y={thresholdLineY}
                width={thresholdLineX - padding.left}
                height={padding.top + plotHeight - thresholdLineY}
                fill="rgba(192, 80, 77, 0.07)"
              />
              {/* Q4: Bottom-Right (Chăm nhưng điểm thấp) */}
              <rect
                x={thresholdLineX}
                y={thresholdLineY}
                width={padding.left + plotWidth - thresholdLineX}
                height={padding.top + plotHeight - thresholdLineY}
                fill="rgba(224, 160, 48, 0.07)"
              />

              {/* Nhãn nền 4 góc phần tư */}
              <text
                x={padding.left + 12}
                y={padding.top + 20}
                fill="#4a90b8"
                fontSize="11"
                fontWeight="700"
                opacity="0.85"
              >
                ÍT THAM GIA, ĐIỂM CAO
              </text>
              <text
                x={padding.left + plotWidth - 12}
                y={padding.top + 20}
                fill="#37883e"
                fontSize="11"
                fontWeight="700"
                textAnchor="end"
                opacity="0.85"
              >
                CHĂM & GIỎI
              </text>
              <text
                x={padding.left + 12}
                y={padding.top + plotHeight - 12}
                fill="#c0504d"
                fontSize="11"
                fontWeight="700"
                opacity="0.85"
              >
                NGUY CƠ CAO
              </text>
              <text
                x={padding.left + plotWidth - 12}
                y={padding.top + plotHeight - 12}
                fill="#e0a030"
                fontSize="11"
                fontWeight="700"
                textAnchor="end"
                opacity="0.85"
              >
                CHĂM, ĐIỂM THẤP
              </text>

              {/* Gridlines */}
              {[0, 25, 50, 75, 100].map((val) => (
                <g key={`grid-x-${val}`}>
                  <line
                    x1={getX(val)}
                    y1={padding.top}
                    x2={getX(val)}
                    y2={padding.top + plotHeight}
                    stroke="#f0f3f1"
                    strokeWidth="1"
                  />
                  <text
                    x={getX(val)}
                    y={padding.top + plotHeight + 18}
                    textAnchor="middle"
                    fontSize="11"
                    fill="#79867d"
                  >
                    {val}
                  </text>
                </g>
              ))}

              {[0, 25, 50, 75, 100].map((val) => (
                <g key={`grid-y-${val}`}>
                  <line
                    x1={padding.left}
                    y1={getY(val)}
                    x2={padding.left + plotWidth}
                    y2={getY(val)}
                    stroke="#f0f3f1"
                    strokeWidth="1"
                  />
                  <text
                    x={padding.left - 10}
                    y={getY(val) + 4}
                    textAnchor="end"
                    fontSize="11"
                    fill="#79867d"
                  >
                    {val}%
                  </text>
                </g>
              ))}

              {/* Trục chính X và Y */}
              <line
                x1={padding.left}
                y1={padding.top + plotHeight}
                x2={padding.left + plotWidth}
                y2={padding.top + plotHeight}
                stroke="#9ca3af"
                strokeWidth="1.5"
              />
              <line
                x1={padding.left}
                y1={padding.top}
                x2={padding.left}
                y2={padding.top + plotHeight}
                stroke="#9ca3af"
                strokeWidth="1.5"
              />

              {/* Tên trục */}
              <text
                x={padding.left + plotWidth / 2}
                y={padding.top + plotHeight + 42}
                textAnchor="middle"
                fontSize="12"
                fontWeight="700"
                fill="#203026"
              >
                Điểm Tham gia Tổng hợp (Participation Score: 0 → 100)
              </text>
              <text
                x={-(padding.top + plotHeight / 2)}
                y={18}
                transform="rotate(-90)"
                textAnchor="middle"
                fontSize="12"
                fontWeight="700"
                fill="#203026"
              >
                Điểm Trung bình Khóa học (Avg Grade: 0% → 100%)
              </text>

              {/* 2 Đường phân chia trung vị (Threshold Lines) */}
              {/* Đường dọc chia theo Participation Threshold */}
              <line
                x1={thresholdLineX}
                y1={padding.top}
                x2={thresholdLineX}
                y2={padding.top + plotHeight}
                stroke="#203026"
                strokeDasharray="5 4"
                strokeWidth="1.5"
              />
              <rect
                x={thresholdLineX - 28}
                y={padding.top - 18}
                width="56"
                height="16"
                rx="4"
                fill="#203026"
              />
              <text
                x={thresholdLineX}
                y={padding.top - 6}
                textAnchor="middle"
                fontSize="10"
                fontWeight="700"
                fill="#ffffff"
              >
                Trung vị {pThreshold}
              </text>

              {/* Đường ngang chia theo Grade Threshold */}
              <line
                x1={padding.left}
                y1={thresholdLineY}
                x2={padding.left + plotWidth}
                y2={thresholdLineY}
                stroke="#203026"
                strokeDasharray="5 4"
                strokeWidth="1.5"
              />
              <rect
                x={padding.left + plotWidth + 4}
                y={thresholdLineY - 8}
                width="48"
                height="16"
                rx="4"
                fill="#203026"
              />
              <text
                x={padding.left + plotWidth + 28}
                y={thresholdLineY + 4}
                textAnchor="middle"
                fontSize="10"
                fontWeight="700"
                fill="#ffffff"
              >
                {gThreshold}%
              </text>

              {/* Scatter Points cho từng sinh viên */}
              {students.map((s) => {
                const cx = getX(s.participationScore);
                const cy = getY(s.avgGradePct);
                const theme = SEGMENT_THEMES[s.segment] || SEGMENT_THEMES["Nguy cơ cao"];
                const isHovered = hoveredStudent?.userKey === s.userKey;
                const isMatchFilter =
                  selectedSegmentFilter === "all" || s.segment === selectedSegmentFilter;

                return (
                  <g
                    key={s.userKey}
                    style={{ cursor: "pointer" }}
                    onClick={() => handleStudentClick(s)}
                    onMouseEnter={() => setHoveredStudent(s)}
                    onMouseLeave={() => setHoveredStudent(null)}
                  >
                    {/* Hào quang khi hover */}
                    {isHovered && (
                      <circle
                        cx={cx}
                        cy={cy}
                        r={16}
                        fill={theme.color}
                        opacity="0.25"
                      />
                    )}

                    {/* Điểm tròn chính */}
                    <circle
                      cx={cx}
                      cy={cy}
                      r={isHovered ? 9 : 7}
                      fill={theme.color}
                      stroke="#ffffff"
                      strokeWidth={isHovered ? 2.5 : 1.5}
                      opacity={isMatchFilter ? 1 : 0.2}
                      filter={isHovered ? "url(#pointGlow)" : "none"}
                      style={{ transition: "all 0.2s" }}
                    />

                    {/* Nhãn tên sinh viên nhỏ kế bên */}
                    <text
                      x={cx + 10}
                      y={cy + 4}
                      fontSize="10"
                      fontWeight={isHovered ? "700" : "500"}
                      fill={isHovered ? "#111827" : "#4b5563"}
                      opacity={isMatchFilter ? (isHovered ? 1 : 0.85) : 0.2}
                    >
                      {s.name?.split(" ").slice(-1)[0]}
                    </text>
                  </g>
                );
              })}
            </svg>
          </div>

          {/* Tooltip Hover Chi tiết */}
          {hoveredStudent && (
            <div
              style={{
                position: "absolute",
                top: "24px",
                right: "24px",
                background: "#1f2937",
                color: "#ffffff",
                padding: "12px 16px",
                borderRadius: "12px",
                fontSize: "12px",
                boxShadow: "0 10px 25px rgba(0,0,0,0.2)",
                pointerEvents: "none",
                maxWidth: "280px",
                zIndex: 10,
              }}
            >
              <div style={{ fontWeight: "700", fontSize: "13px", color: "#f9fafb" }}>
                {hoveredStudent.name}
              </div>
              <div style={{ fontSize: "11px", color: "#9ca3af", marginBottom: "6px" }}>
                {hoveredStudent.username} • {hoveredStudent.email}
              </div>

              <div
                style={{
                  display: "inline-block",
                  padding: "2px 8px",
                  borderRadius: "10px",
                  fontSize: "10px",
                  fontWeight: "700",
                  background:
                    SEGMENT_THEMES[hoveredStudent.segment]?.color || "#37883e",
                  color: "#ffffff",
                  marginBottom: "8px",
                }}
              >
                Nhóm: {hoveredStudent.segment}
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "6px" }}>
                <div>
                  <span style={{ color: "#9ca3af" }}>Tham gia:</span>{" "}
                  <strong>{hoveredStudent.participationScore}/100</strong>
                </div>
                <div>
                  <span style={{ color: "#9ca3af" }}>Điểm TB:</span>{" "}
                  <strong>{hoveredStudent.avgGradePct}%</strong>
                </div>
                <div>
                  <span style={{ color: "#9ca3af" }}>Đúng hạn:</span>{" "}
                  <strong>{hoveredStudent.onTimeRate}%</strong>
                </div>
                <div>
                  <span style={{ color: "#9ca3af" }}>Thời gian:</span>{" "}
                  <strong>{hoveredStudent.engagementHours}h</strong>
                </div>
              </div>
              <div style={{ fontSize: "10px", color: "#a7f3d0", marginTop: "8px" }}>
                👉 Bấm vào chấm để xem dòng sinh viên trong bảng
              </div>
            </div>
          )}
        </div>

        {/* Bảng Danh sách Sinh viên theo Phân khúc */}
        <div
          style={{
            background: "#ffffff",
            border: "1px solid rgba(67, 91, 70, 0.12)",
            borderRadius: "16px",
            overflow: "hidden",
          }}
        >
          {/* Controls Bar */}
          <div
            style={{
              padding: "14px 20px",
              borderBottom: "1px solid #f3f4f6",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              flexWrap: "wrap",
              gap: "12px",
              background: "#fafbf9",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap" }}>
              <span style={{ fontSize: "13px", fontWeight: "700", color: "#203026" }}>
                Lọc nhóm:
              </span>
              {[
                { key: "all", label: "Tất cả" },
                { key: "Chăm & giỏi", label: "Chăm & giỏi" },
                { key: "Chăm nhưng điểm thấp", label: "Chăm, điểm thấp" },
                { key: "Ít tham gia nhưng điểm cao", label: "Ít tham gia, điểm cao" },
                { key: "Nguy cơ cao", label: "Nguy cơ cao" },
              ].map((tab) => (
                <button
                  key={tab.key}
                  type="button"
                  onClick={() => setSelectedSegmentFilter(tab.key)}
                  style={{
                    padding: "5px 12px",
                    borderRadius: "20px",
                    fontSize: "12px",
                    fontWeight: "600",
                    border: "none",
                    cursor: "pointer",
                    background:
                      selectedSegmentFilter === tab.key
                        ? "#37883e"
                        : "rgba(67, 91, 70, 0.08)",
                    color: selectedSegmentFilter === tab.key ? "#ffffff" : "#4b5563",
                  }}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            <div style={{ position: "relative", minWidth: "220px" }}>
              <Search
                size={16}
                color="#9ca3af"
                style={{ position: "absolute", left: "12px", top: "8px" }}
              />
              <input
                type="text"
                placeholder="Tìm sinh viên..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                style={{
                  width: "100%",
                  padding: "6px 12px 6px 34px",
                  borderRadius: "20px",
                  border: "1px solid #d1d5db",
                  fontSize: "12px",
                  outline: "none",
                }}
              />
            </div>
          </div>

          {/* Table */}
          <div style={{ overflowX: "auto" }}>
            <table
              style={{
                width: "100%",
                borderCollapse: "collapse",
                fontSize: "13px",
                textAlign: "left",
              }}
            >
              <thead>
                <tr
                  style={{
                    background: "#f9fafb",
                    borderBottom: "1px solid #e5e7eb",
                    color: "#4b5563",
                    fontSize: "12px",
                    textTransform: "uppercase",
                  }}
                >
                  <th style={{ padding: "12px 18px" }}>Sinh viên</th>
                  <th style={{ padding: "12px 16px" }}>Phân khúc 2×2</th>
                  <th style={{ padding: "12px 16px" }}>Điểm tham gia</th>
                  <th style={{ padding: "12px 16px" }}>Điểm TB %</th>
                  <th style={{ padding: "12px 16px" }}>Phong cách nộp</th>
                  <th style={{ padding: "12px 16px", textAlign: "right" }}>Thao tác</th>
                </tr>
              </thead>
              <tbody>
                {filteredStudents.length === 0 ? (
                  <tr>
                    <td
                      colSpan={6}
                      style={{ padding: "32px", textAlign: "center", color: "#9ca3af" }}
                    >
                      Không có sinh viên nào thuộc nhóm phân khúc này.
                    </td>
                  </tr>
                ) : (
                  filteredStudents.map((s) => {
                    const theme = SEGMENT_THEMES[s.segment] || SEGMENT_THEMES["Nguy cơ cao"];
                    return (
                      <tr
                        key={s.userKey}
                        id={`segment-row-${s.userKey}`}
                        style={{
                          borderBottom: "1px solid #f3f4f6",
                          transition: "background 0.2s",
                        }}
                      >
                        <td style={{ padding: "12px 18px" }}>
                          <div style={{ fontWeight: "700", color: "#1f2937" }}>
                            {s.name}
                          </div>
                          <div style={{ fontSize: "11px", color: "#6b7280" }}>
                            {s.username} • {s.email}
                          </div>
                        </td>

                        <td style={{ padding: "12px 16px" }}>
                          <span
                            style={{
                              display: "inline-block",
                              padding: "4px 10px",
                              borderRadius: "12px",
                              fontSize: "11px",
                              fontWeight: "700",
                              background: theme.bg,
                              color: theme.color,
                              border: `1px solid ${theme.border}`,
                            }}
                          >
                            {s.segment}
                          </span>
                        </td>

                        <td style={{ padding: "12px 16px" }}>
                          <strong style={{ color: "#37883e" }}>
                            {s.participationScore}
                          </strong>
                          <span style={{ fontSize: "11px", color: "#9ca3af" }}> / 100</span>
                        </td>

                        <td style={{ padding: "12px 16px" }}>
                          <strong
                            style={{
                              color:
                                s.avgGradePct !== null && s.avgGradePct < 50
                                  ? "#dc2626"
                                  : "#1f2937",
                            }}
                          >
                            {s.avgGradePct}%
                          </strong>
                          <span style={{ fontSize: "11px", color: "#9ca3af" }}>
                            {" "}
                            ({s.avgGrade10}/10)
                          </span>
                        </td>

                        <td style={{ padding: "12px 16px" }}>
                          <span style={{ fontSize: "12px", color: "#4b5563" }}>
                            {s.submitStyle}
                          </span>
                        </td>

                        <td style={{ padding: "12px 16px", textAlign: "right" }}>
                          <button
                            type="button"
                            onClick={() => handleStudentClick(s)}
                            style={{
                              padding: "5px 10px",
                              borderRadius: "8px",
                              border: "1px solid #e5e7eb",
                              background: "#ffffff",
                              color: "#374151",
                              fontSize: "11px",
                              fontWeight: "600",
                              cursor: "pointer",
                              display: "inline-flex",
                              alignItems: "center",
                              gap: "4px",
                            }}
                          >
                            <Eye size={13} /> Xem hồ sơ
                          </button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </section>
  );
}
