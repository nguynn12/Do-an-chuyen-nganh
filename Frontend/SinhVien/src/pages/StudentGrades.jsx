import React, { useState, useEffect } from "react";
import {
  Award,
  CheckCircle2,
  TrendingUp,
  BookOpen,
  GraduationCap,
  Sparkles,
  Filter,
  Users,
  Target,
  Clock,
  Info,
} from "lucide-react";

const COURSE_COLORS = [
  "#37883e", // DLU Green
  "#2563eb", // Blue
  "#e66d1e", // Orange
  "#8b5cf6", // Purple
  "#ec4899", // Pink
  "#06b6d4", // Cyan
];

function parseDate(dateStr) {
  if (!dateStr) return 0;
  const parts = dateStr.split("/");
  if (parts.length < 3) return 0;
  return new Date(
    parseInt(parts[2], 10),
    parseInt(parts[1], 10) - 1,
    parseInt(parts[0], 10)
  ).getTime();
}

export default function StudentGrades() {
  const [grades, setGrades] = useState([]);
  const [benchmarks, setBenchmarks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedCourse, setSelectedCourse] = useState("ALL");
  const [hoveredPoint, setHoveredPoint] = useState(null);

  useEffect(() => {
    Promise.all([
      fetch("/api/v1/student/grades").then((res) => res.json()),
      fetch("/api/v1/student/benchmark")
        .then((res) => res.json())
        .catch(() => ({ data: [] })),
    ])
      .then(([gradesData, benchmarkData]) => {
        if (gradesData?.data) {
          setGrades(gradesData.data);
        }
        if (benchmarkData?.data) {
          setBenchmarks(benchmarkData.data);
        }
      })
      .catch((err) => console.error("Lỗi getStudentGrades & benchmark:", err))
      .finally(() => setLoading(false));
  }, []);

  const total = grades.length;
  const gradeValues = grades.map((g) => Number(g.Grade || 0));
  const avgGrade =
    total > 0 ? (gradeValues.reduce((a, b) => a + b, 0) / total).toFixed(1) : 0;
  const maxGrade = total > 0 ? Math.max(...gradeValues) : 0;
  const passedCount = grades.filter(
    (g) => g.Is_Passed === 1 || Number(g.Grade) >= 5
  ).length;
  const passRate = total > 0 ? Math.round((passedCount / total) * 100) : 100;

  // Danh sách các môn học duy nhất
  const uniqueCourses = Array.from(
    new Map(
      grades
        .filter((g) => g.Course_Name)
        .map((g) => [g.Course_Name, { name: g.Course_Name, code: g.Course_Code }])
    ).values()
  );

  // Lọc dữ liệu theo môn học
  const filteredGrades =
    selectedCourse === "ALL"
      ? grades
      : grades.filter((g) => g.Course_Name === selectedCourse);

  // Sắp xếp tăng dần theo ngày
  const sortedGrades = [...filteredGrades].sort(
    (a, b) => parseDate(a.Grade_Date) - parseDate(b.Grade_Date)
  );

  // Chuẩn bị dữ liệu vẽ SVG Line Chart
  const svgWidth = 780;
  const svgHeight = 240;
  const padding = { top: 30, right: 35, bottom: 45, left: 50 };
  const plotWidth = svgWidth - padding.left - padding.right;
  const plotHeight = svgHeight - padding.top - padding.bottom;

  // Lấy danh sách ngày duy nhất đã sort
  const distinctDates = Array.from(
    new Set(sortedGrades.map((g) => g.Grade_Date).filter(Boolean))
  ).sort((a, b) => parseDate(a) - parseDate(b));

  const dateIndexMap = {};
  distinctDates.forEach((d, idx) => {
    dateIndexMap[d] = idx;
  });

  const getY = (percentage) => {
    const val = Math.max(0, Math.min(100, Number(percentage || 0)));
    return padding.top + plotHeight - (val / 100) * plotHeight;
  };

  const getX = (dateStr, fallbackIdx, totalItems) => {
    if (distinctDates.length > 1 && dateStr && dateIndexMap[dateStr] !== undefined) {
      return (
        padding.left +
        (dateIndexMap[dateStr] / (distinctDates.length - 1)) * plotWidth
      );
    }
    if (totalItems > 1) {
      return padding.left + (fallbackIdx / (totalItems - 1)) * plotWidth;
    }
    return padding.left + plotWidth / 2;
  };

  // Tạo các đường line theo từng môn hoặc môn được chọn
  const coursesToRender =
    selectedCourse === "ALL"
      ? uniqueCourses
      : uniqueCourses.filter((c) => c.name === selectedCourse);

  const linesData = coursesToRender.map((c, cIdx) => {
    const color = COURSE_COLORS[cIdx % COURSE_COLORS.length];
    const items = sortedGrades.filter((g) => g.Course_Name === c.name);

    const points = items.map((item, idx) => {
      const x = getX(item.Grade_Date, idx, items.length);
      const pct = Number(
        item.Grade_Percentage !== undefined && item.Grade_Percentage !== null
          ? item.Grade_Percentage
          : (Number(item.Grade || 0) / 10) * 100
      );
      const y = getY(pct);
      return { x, y, item, pct, color };
    });

    const pathString =
      points.length > 1
        ? points.reduce(
            (acc, p, i) => `${acc} ${i === 0 ? "M" : "L"} ${p.x} ${p.y}`,
            ""
          )
        : "";

    const areaString =
      points.length > 1
        ? `${pathString} L ${points[points.length - 1].x} ${
            padding.top + plotHeight
          } L ${points[0].x} ${padding.top + plotHeight} Z`
        : "";

    return {
      course: c,
      color,
      points,
      pathString,
      areaString,
    };
  });

  return (
    <main className="page-full">
      {/* 1. HERO BANNER */}
      <section className="courses-hero">
        <div className="courses-hero-main">
          <div className="courses-hero-icon">
            <Award size={26} />
          </div>
          <div>
            <div className="courses-breadcrumb">
              <BookOpen size={14} />
              <span>Phân tích học tập</span>
              <span>/</span>
              <strong>Bảng điểm</strong>
            </div>
            <span className="courses-hero-kicker">DLU LMS ANALYTICS</span>
            <h1>Bảng điểm & Kết quả học tập</h1>
            <p>
              Theo dõi chi tiết điểm số quá trình, đánh giá từng bài kiểm tra và tỷ lệ hoàn thành các học phần.
            </p>
          </div>
        </div>

        <div className="courses-semester">
          <Sparkles size={18} style={{ color: "#65c777" }} />
          <div>
            <span>Điểm trung bình chung</span>
            <strong>{avgGrade}/10</strong>
          </div>
        </div>
      </section>

      {/* 2. SUMMARY GRID */}
      <div className="summary-grid" style={{ marginBottom: "20px" }}>
        <div className="summary-item summary-green">
          <div className="summary-icon">
            <Award size={22} />
          </div>
          <div className="summary-content">
            <span>Điểm TB tích lũy</span>
            <strong>{avgGrade}/10</strong>
            <small>Tính trên {total} cột điểm</small>
          </div>
        </div>

        <div className="summary-item summary-blue">
          <div className="summary-icon">
            <CheckCircle2 size={22} />
          </div>
          <div className="summary-content">
            <span>Tỷ lệ đạt chuẩn (Pass)</span>
            <strong>{passRate}%</strong>
            <small>
              {passedCount}/{total} bài đạt yêu cầu
            </small>
          </div>
        </div>

        <div className="summary-item summary-orange">
          <div className="summary-icon">
            <TrendingUp size={22} />
          </div>
          <div className="summary-content">
            <span>Điểm cao nhất</span>
            <strong>{maxGrade}/10</strong>
            <small>Thành tích xuất sắc nhất</small>
          </div>
        </div>

        <div className="summary-item summary-light">
          <div className="summary-icon">
            <GraduationCap size={22} />
          </div>
          <div className="summary-content">
            <span>Tổng số bài đánh giá</span>
            <strong>{total} bài</strong>
            <small>Bao gồm Assign & Quiz</small>
          </div>
        </div>
      </div>

      {/* 3. BIỂU ĐỒ XU HƯỚNG ĐIỂM THEO THỜI GIAN (LINE CHART) */}
      <section className="chart-card">
        <div className="chart-header">
          <div className="chart-title-wrap">
            <TrendingUp size={18} style={{ color: "#37883e" }} />
            <strong>Xu hướng kết quả điểm số theo thời gian</strong>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <Filter size={15} style={{ color: "#66736b" }} />
            <select
              className="chart-filter-select"
              value={selectedCourse}
              onChange={(e) => {
                setSelectedCourse(e.target.value);
                setHoveredPoint(null);
              }}
            >
              <option value="ALL">Tất cả môn học ({uniqueCourses.length})</option>
              {uniqueCourses.map((c) => (
                <option key={c.name} value={c.name}>
                  {c.code ? `[${c.code}] ` : ""}
                  {c.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Legend */}
        {uniqueCourses.length > 0 && (
          <div className="chart-legend">
            <span style={{ fontWeight: 600, color: "#17221d" }}>Môn học:</span>
            <div
              className="chart-legend-item"
              onClick={() => setSelectedCourse("ALL")}
              style={{
                cursor: "pointer",
                fontWeight: selectedCourse === "ALL" ? "700" : "normal",
                color: selectedCourse === "ALL" ? "#37883e" : "#4b5563",
              }}
            >
              <span
                className="chart-legend-dot"
                style={{
                  background: selectedCourse === "ALL" ? "#37883e" : "#9ca3af",
                }}
              />
              Tất cả môn
            </div>
            {uniqueCourses.map((c, idx) => {
              const color = COURSE_COLORS[idx % COURSE_COLORS.length];
              const isSelected = selectedCourse === c.name;
              return (
                <div
                  key={c.name}
                  className="chart-legend-item"
                  onClick={() =>
                    setSelectedCourse(isSelected ? "ALL" : c.name)
                  }
                  style={{
                    fontWeight: isSelected ? "700" : "normal",
                    opacity:
                      selectedCourse === "ALL" || isSelected ? 1 : 0.45,
                  }}
                >
                  <span
                    className="chart-legend-dot"
                    style={{ background: color }}
                  />
                  <span>
                    {c.code ? `${c.code} - ` : ""}
                    {c.name}
                  </span>
                </div>
              );
            })}
          </div>
        )}

        {/* SVG Chart Container */}
        {loading ? (
          <div style={{ padding: "40px", textAlign: "center", color: "#66736b" }}>
            Đang tải dữ liệu biểu đồ...
          </div>
        ) : sortedGrades.length === 0 ? (
          <div style={{ padding: "40px", textAlign: "center", color: "#66736b" }}>
            Không có dữ liệu điểm nào để hiển thị biểu đồ xu hướng.
          </div>
        ) : (
          <div className="svg-chart-container">
            <svg
              viewBox={`0 0 ${svgWidth} ${svgHeight}`}
              className="svg-chart"
              onMouseLeave={() => setHoveredPoint(null)}
            >
              <defs>
                {linesData.map((line, idx) => (
                  <linearGradient
                    key={idx}
                    id={`area-grad-${idx}`}
                    x1="0"
                    y1="0"
                    x2="0"
                    y2="1"
                  >
                    <stop offset="0%" stopColor={line.color} stopOpacity="0.25" />
                    <stop offset="100%" stopColor={line.color} stopOpacity="0.02" />
                  </linearGradient>
                ))}
              </defs>

              {/* Grid lines & Y-Axis Labels */}
              {[0, 25, 50, 75, 100].map((val) => {
                const yPos = getY(val);
                const isBenchmark = val === 50;
                return (
                  <g key={val}>
                    <line
                      x1={padding.left}
                      y1={yPos}
                      x2={padding.left + plotWidth}
                      y2={yPos}
                      stroke={isBenchmark ? "#f59e0b" : "#eef2ef"}
                      strokeDasharray={isBenchmark ? "4 4" : "3 3"}
                      strokeWidth={isBenchmark ? 1.2 : 1}
                    />
                    <text
                      x={padding.left - 8}
                      y={yPos + 4}
                      textAnchor="end"
                      fontSize="10"
                      fill={isBenchmark ? "#d97706" : "#66736b"}
                      fontWeight={isBenchmark ? "600" : "400"}
                    >
                      {val}%
                    </text>
                  </g>
                );
              })}

              {/* Benchmark Note (50%) */}
              <text
                x={padding.left + plotWidth}
                y={getY(50) - 5}
                textAnchor="end"
                fontSize="9"
                fill="#d97706"
                fontWeight="600"
              >
                Chuẩn đạt (50%)
              </text>

              {/* Area paths (chỉ vẽ khi lọc 1 môn hoặc ít đường để tránh đè) */}
              {selectedCourse !== "ALL" &&
                linesData.map((line, idx) =>
                  line.areaString ? (
                    <path
                      key={`area-${idx}`}
                      d={line.areaString}
                      fill={`url(#area-grad-${idx})`}
                    />
                  ) : null
                )}

              {/* Line paths */}
              {linesData.map((line, idx) =>
                line.pathString ? (
                  <path
                    key={`line-${idx}`}
                    d={line.pathString}
                    fill="none"
                    stroke={line.color}
                    strokeWidth="2.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                ) : null
              )}

              {/* X-Axis dates */}
              {distinctDates.map((dateStr, idx) => {
                const xPos = getX(dateStr, idx, distinctDates.length);
                return (
                  <g key={dateStr}>
                    <line
                      x1={xPos}
                      y1={padding.top + plotHeight}
                      x2={xPos}
                      y2={padding.top + plotHeight + 4}
                      stroke="#cbd5e1"
                      strokeWidth="1"
                    />
                    <text
                      x={xPos}
                      y={padding.top + plotHeight + 16}
                      textAnchor="middle"
                      fontSize="9.5"
                      fill="#475569"
                    >
                      {dateStr}
                    </text>
                  </g>
                );
              })}

              {/* Data Points (Circles) */}
              {linesData.map((line) =>
                line.points.map((pt, pIdx) => {
                  const isHovered =
                    hoveredPoint?.item?.Grade_Key === pt.item.Grade_Key;
                  return (
                    <g key={pIdx}>
                      {isHovered && (
                        <line
                          x1={pt.x}
                          y1={padding.top}
                          x2={pt.x}
                          y2={padding.top + plotHeight}
                          stroke={pt.color}
                          strokeDasharray="2 2"
                          strokeWidth="1"
                          opacity="0.7"
                        />
                      )}
                      <circle
                        cx={pt.x}
                        cy={pt.y}
                        r={isHovered ? 6 : 4}
                        fill="white"
                        stroke={pt.color}
                        strokeWidth={isHovered ? 3 : 2}
                        style={{ cursor: "pointer", transition: "r 0.15s ease" }}
                        onMouseEnter={() => setHoveredPoint(pt)}
                      />
                    </g>
                  );
                })
              )}

              {/* Hover Tooltip Overlay */}
              {hoveredPoint && (
                <g>
                  {(() => {
                    const tooltipWidth = 210;
                    const tooltipHeight = 72;
                    let tooltipX = hoveredPoint.x + 12;
                    if (tooltipX + tooltipWidth > svgWidth - 10) {
                      tooltipX = hoveredPoint.x - tooltipWidth - 12;
                    }
                    let tooltipY = hoveredPoint.y - tooltipHeight / 2;
                    if (tooltipY < 10) tooltipY = 10;
                    if (tooltipY + tooltipHeight > svgHeight - 10) {
                      tooltipY = svgHeight - tooltipHeight - 10;
                    }

                    const item = hoveredPoint.item;
                    const score = Number(item.Grade || 0);
                    const isPassed = item.Is_Passed === 1 || score >= 5;

                    return (
                      <g
                        transform={`translate(${tooltipX}, ${tooltipY})`}
                        style={{ pointerEvents: "none" }}
                      >
                        <rect
                          width={tooltipWidth}
                          height={tooltipHeight}
                          rx="6"
                          fill="#17221d"
                          fillOpacity="0.92"
                          stroke="#37883e"
                          strokeWidth="1"
                        />
                        <text
                          x="10"
                          y="18"
                          fill="#ffffff"
                          fontSize="11"
                          fontWeight="700"
                        >
                          {item.Course_Name?.length > 25
                            ? `${item.Course_Name.slice(0, 24)}...`
                            : item.Course_Name}
                        </text>
                        <text x="10" y="34" fill="#a7f3d0" fontSize="10">
                          {item.Activity_Name || item.Grade_Item_Name}
                        </text>
                        <text
                          x="10"
                          y="50"
                          fill="#ffffff"
                          fontSize="10"
                          fontWeight="600"
                        >
                          Điểm: {score}/10 ({Math.round(hoveredPoint.pct)}%) •{" "}
                          <tspan fill={isPassed ? "#4ade80" : "#f87171"}>
                            {isPassed ? "Đạt" : "Chưa đạt"}
                          </tspan>
                        </text>
                        <text x="10" y="64" fill="#94a3b8" fontSize="9">
                          Ngày ghi nhận: {item.Grade_Date || "—"}
                        </text>
                      </g>
                    );
                  })()}
                </g>
              )}
            </svg>
          </div>
        )}
      </section>

      {/* 4. SO SÁNH VỚI TRUNG BÌNH LỚP (ẨN DANH) */}
      <section className="benchmark-card">
        <div className="benchmark-header">
          <div className="benchmark-title-wrap">
            <Users size={20} style={{ color: "#37883e" }} />
            <div>
              <strong>So sánh kết quả học tập với trung bình lớp (Ẩn danh)</strong>
              <p>
                Đối sánh vị thế điểm số, thời lượng tương tác và tỷ lệ hoàn thành so với mặt bằng chung của lớp học phần.
              </p>
            </div>
          </div>
          <span
            className="dlu-badge dlu-badge--green"
            style={{ display: "inline-flex", alignItems: "center", gap: "5px" }}
          >
            <Info size={13} />
            Dữ liệu ẩn danh 100%
          </span>
        </div>

        {loading ? (
          <div style={{ padding: "30px", textAlign: "center", color: "#66736b" }}>
            Đang phân tích dữ liệu đối sánh lớp học...
          </div>
        ) : benchmarks.length === 0 ? (
          <div style={{ padding: "24px", textAlign: "center", color: "#66736b" }}>
            Chưa có đủ dữ liệu lớp học để tạo biểu đồ đối sánh.
          </div>
        ) : (
          <div className="benchmark-grid">
            {(selectedCourse === "ALL"
              ? benchmarks
              : benchmarks.filter((b) => b.name === selectedCourse)
            ).map((b) => {
              const isGradeHigher = b.comparison?.isGradeHigher;
              const isHoursHigher = b.comparison?.isHoursHigher;
              const gradePct = Math.min(
                100,
                Math.max(0, (b.myStats.grade / 10) * 100)
              );
              const classAvgGradePct = Math.min(
                100,
                Math.max(0, (b.classStats.avgGrade / 10) * 100)
              );
              const classMaxGradePct = Math.min(
                100,
                Math.max(0, (b.classStats.maxGrade / 10) * 100)
              );

              return (
                <div key={b.courseKey} className="benchmark-item-card">
                  {/* Card Header */}
                  <div className="benchmark-item-header">
                    <div>
                      <div className="benchmark-course-name">{b.name}</div>
                      <div className="benchmark-course-code">
                        {b.code ? `Mã: ${b.code} • ` : ""}Sĩ số lớp:{" "}
                        {b.totalStudents} SV
                      </div>
                    </div>
                    <span className="benchmark-badge-top">
                      🏆 Top {b.myStats.topGradePct}% lớp
                    </span>
                  </div>

                  {/* 2 Metric Summary Boxes */}
                  <div className="benchmark-metrics-row">
                    <div className="benchmark-metric-box">
                      <span>Điểm TB của bạn</span>
                      <strong
                        style={{
                          color: isGradeHigher ? "#37883e" : "#e66d1e",
                        }}
                      >
                        {b.myStats.grade} / 10
                      </strong>
                      <span
                        style={{
                          fontSize: "10px",
                          color: isGradeHigher ? "#37883e" : "#dc2626",
                        }}
                      >
                        {b.comparison.gradeDiff >= 0
                          ? `+${b.comparison.gradeDiff}`
                          : b.comparison.gradeDiff}{" "}
                        so với TB lớp ({b.classStats.avgGrade})
                      </span>
                    </div>

                    <div className="benchmark-metric-box">
                      <span>Thời lượng học</span>
                      <strong
                        style={{
                          color: isHoursHigher ? "#2563eb" : "#4b5563",
                        }}
                      >
                        {b.myStats.hours} giờ
                      </strong>
                      <span
                        style={{
                          fontSize: "10px",
                          color: isHoursHigher ? "#2563eb" : "#6b7280",
                        }}
                      >
                        TB lớp: {b.classStats.avgHours}h (Top{" "}
                        {b.myStats.topHoursPct}%)
                      </span>
                    </div>
                  </div>

                  {/* Visual Comparison Progress Bars */}
                  <div className="benchmark-bars-group">
                    <div className="benchmark-bar-row">
                      <span
                        className="benchmark-bar-label"
                        style={{ color: "#37883e" }}
                      >
                        Bạn
                      </span>
                      <div className="benchmark-bar-track">
                        <div
                          className="benchmark-bar-fill benchmark-bar-fill--green"
                          style={{ width: `${gradePct}%` }}
                        />
                      </div>
                      <span
                        className="benchmark-bar-val"
                        style={{ color: "#37883e" }}
                      >
                        {b.myStats.grade} đ
                      </span>
                    </div>

                    <div className="benchmark-bar-row">
                      <span
                        className="benchmark-bar-label"
                        style={{ color: "#2563eb" }}
                      >
                        TB Lớp
                      </span>
                      <div className="benchmark-bar-track">
                        <div
                          className="benchmark-bar-fill benchmark-bar-fill--blue"
                          style={{ width: `${classAvgGradePct}%` }}
                        />
                      </div>
                      <span
                        className="benchmark-bar-val"
                        style={{ color: "#2563eb" }}
                      >
                        {b.classStats.avgGrade} đ
                      </span>
                    </div>

                    <div className="benchmark-bar-row">
                      <span
                        className="benchmark-bar-label"
                        style={{ color: "#e66d1e" }}
                      >
                        Cao nhất
                      </span>
                      <div className="benchmark-bar-track">
                        <div
                          className="benchmark-bar-fill benchmark-bar-fill--orange"
                          style={{ width: `${classMaxGradePct}%` }}
                        />
                      </div>
                      <span
                        className="benchmark-bar-val"
                        style={{ color: "#e66d1e" }}
                      >
                        {b.classStats.maxGrade} đ
                      </span>
                    </div>
                  </div>

                  {/* Insight message */}
                  <div
                    className={`benchmark-insight ${
                      isGradeHigher
                        ? "benchmark-insight--green"
                        : "benchmark-insight--amber"
                    }`}
                  >
                    <span>💡</span>
                    <span>{b.comparison.gradeInsight}</span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* 5. TABLE OF GRADES */}
      <div className="student-table-card">
        <div className="section-title">
          <div className="left">
            <Award size={18} style={{ color: "#37883e" }} />
            <strong>Chi tiết kết quả đánh giá học tập</strong>
          </div>
        </div>

        {loading ? (
          <div style={{ padding: "30px", textAlign: "center", color: "#66736b" }}>
            Đang tải dữ liệu bảng điểm từ Data Warehouse...
          </div>
        ) : (
          <table className="student-table">
            <thead>
              <tr>
                <th>Môn học</th>
                <th>Tên bài đánh giá</th>
                <th>Hình thức</th>
                <th>Điểm số</th>
                <th>Thang điểm</th>
                <th>Tỷ lệ %</th>
                <th>Kết quả</th>
                <th>Ngày ghi nhận</th>
              </tr>
            </thead>
            <tbody>
              {filteredGrades.length === 0 ? (
                <tr>
                  <td
                    colSpan="8"
                    style={{
                      textAlign: "center",
                      color: "#66736b",
                      padding: "24px",
                    }}
                  >
                    Hiện chưa có dữ liệu điểm nào.
                  </td>
                </tr>
              ) : (
                filteredGrades.map((item) => {
                  const score = Number(item.Grade || 0);
                  const isPassed = item.Is_Passed === 1 || score >= 5;
                  const pct =
                    item.Grade_Percentage !== undefined &&
                    item.Grade_Percentage !== null
                      ? Math.round(item.Grade_Percentage)
                      : Math.round((score / 10) * 100);

                  return (
                    <tr key={item.Grade_Key}>
                      <td>
                        <div style={{ fontWeight: "700", color: "#17221d" }}>
                          {item.Course_Code}
                        </div>
                        <div style={{ fontSize: "11px", color: "#66736b" }}>
                          {item.Course_Name}
                        </div>
                      </td>
                      <td>
                        <div style={{ fontWeight: "600", color: "#17221d" }}>
                          {item.Activity_Name || item.Grade_Item_Name}
                        </div>
                      </td>
                      <td>
                        <span className="dlu-badge dlu-badge--green">
                          {item.Activity_Type === "mod" ||
                          item.Grade_Item_Type === "mod"
                            ? "Bài quá trình"
                            : item.Activity_Type || "Đánh giá"}
                        </span>
                      </td>
                      <td>
                        <strong
                          style={{
                            fontSize: "13px",
                            color:
                              score >= 7
                                ? "#37883e"
                                : score >= 5
                                ? "#e66d1e"
                                : "#dc2626",
                          }}
                        >
                          {score} đ
                        </strong>
                      </td>
                      <td>{item.Max_Grade || 10}</td>
                      <td>
                        <strong style={{ color: "#37883e" }}>{pct}%</strong>
                      </td>
                      <td>
                        <span
                          className={`dlu-badge ${
                            isPassed ? "dlu-badge--green" : "dlu-badge--red"
                          }`}
                        >
                          {isPassed ? "✓ Đạt" : "✗ Chưa đạt"}
                        </span>
                      </td>
                      <td>
                        <span style={{ color: "#66736b", fontSize: "11px" }}>
                          {item.Grade_Date || "—"}
                        </span>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        )}
      </div>
    </main>
  );
}
