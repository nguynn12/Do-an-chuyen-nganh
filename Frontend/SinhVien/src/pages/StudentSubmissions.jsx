import React, { useEffect, useState } from "react";
import {
  CheckCircle2,
  Clock3,
  AlertTriangle,
  Search,
  BookOpen,
  ClipboardCheck,
  Award,
  PieChart,
  FileQuestion,
} from "lucide-react";

export default function StudentSubmissions() {
  const [submissions, setSubmissions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [hoveredSlice, setHoveredSlice] = useState(null);

  useEffect(() => {
    fetch("/api/v1/student/submissions")
      .then((res) => res.json())
      .then((data) => {
        if (data.data) {
          setSubmissions(data.data);
        }
      })
      .catch((err) => console.error("Lỗi getStudentSubmissions:", err))
      .finally(() => setLoading(false));
  }, []);

  const total = submissions.length;
  const onTimeList = submissions.filter(
    (s) => s.Submission_Status === "submitted" && s.Is_Submitted_On_Time === 1
  );
  const lateList = submissions.filter(
    (s) => s.Submission_Status === "submitted" && s.Is_Submitted_On_Time === 0
  );
  const unsubmittedList = submissions.filter(
    (s) =>
      s.Submission_Status !== "submitted" ||
      (!s.Submit_Date && s.Is_Submitted_On_Time === null)
  );

  const onTime = onTimeList.length;
  const late = lateList.length;
  const unsubmitted = unsubmittedList.length;
  const graded = submissions.filter((s) => s.Is_Graded === 1).length;

  const onTimePct = total > 0 ? Math.round((onTime / total) * 100) : 0;
  const latePct = total > 0 ? Math.round((late / total) * 100) : 0;
  const unsubmittedPct =
    total > 0 ? Math.max(0, 100 - onTimePct - latePct) : 0;

  // Lọc danh sách theo filterStatus và tìm kiếm
  const filtered = submissions.filter((s) => {
    const matchesSearch =
      s.Course_Name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.Activity_Name?.toLowerCase().includes(searchQuery.toLowerCase());

    if (!matchesSearch) return false;

    if (filterStatus === "ontime")
      return s.Submission_Status === "submitted" && s.Is_Submitted_On_Time === 1;
    if (filterStatus === "late")
      return s.Submission_Status === "submitted" && s.Is_Submitted_On_Time === 0;
    if (filterStatus === "unsubmitted")
      return (
        s.Submission_Status !== "submitted" ||
        (!s.Submit_Date && s.Is_Submitted_On_Time === null)
      );
    if (filterStatus === "graded") return s.Is_Graded === 1;
    return true;
  });

  // Cấu hình Donut Chart SVG
  const radius = 70;
  const circumference = 2 * Math.PI * radius; // ~439.82

  const slices = [
    {
      key: "ontime",
      label: "Đúng hạn",
      count: onTime,
      pct: onTimePct,
      color: "#37883e",
      desc: "Bài nộp trước hoặc đúng hạn deadline",
    },
    {
      key: "late",
      label: "Trễ hạn",
      count: late,
      pct: latePct,
      color: "#e66d1e",
      desc: "Bài nộp sau thời gian quy định",
    },
    {
      key: "unsubmitted",
      label: "Chưa nộp",
      count: unsubmitted,
      pct: unsubmittedPct,
      color: "#dc2626",
      desc: "Chưa ghi nhận bài nộp trên hệ thống",
    },
  ];

  // Tính offset xoay cho từng slice
  let accumulatedCount = 0;
  const sliceRenderData = slices.map((slice) => {
    const sliceLength = total > 0 ? (slice.count / total) * circumference : 0;
    const strokeDashoffset =
      total > 0 ? -((accumulatedCount / total) * circumference) : 0;
    accumulatedCount += slice.count;

    return {
      ...slice,
      sliceLength,
      strokeDashoffset,
    };
  });

  // Thông tin hiển thị ở tâm Donut Chart
  const activeSliceInfo = hoveredSlice
    ? slices.find((s) => s.key === hoveredSlice)
    : null;

  return (
    <main className="page-full">
      {/* 1. HERO BANNER */}
      <section className="courses-hero">
        <div className="courses-hero-main">
          <div className="courses-hero-icon">
            <ClipboardCheck size={26} />
          </div>
          <div>
            <div className="courses-breadcrumb">
              <BookOpen size={14} />
              <span>Phân tích học tập</span>
              <span>/</span>
              <strong>Tình trạng nộp bài</strong>
            </div>
            <span className="courses-hero-kicker">DLU LMS ANALYTICS</span>
            <h1>Theo dõi & Đánh giá nộp bài</h1>
            <p>
              Kiểm tra chi tiết thời gian nộp bài, phân loại đúng hạn hay trễ hạn và nhận xét từ giảng viên.
            </p>
          </div>
        </div>

        <div className="courses-semester">
          <div>
            <span>Tổng số bài nộp</span>
            <strong>{total} bài tập</strong>
          </div>
        </div>
      </section>

      {/* 2. SUMMARY GRID */}
      <div className="summary-grid" style={{ marginBottom: "20px" }}>
        <div className="summary-item summary-green">
          <div className="summary-icon">
            <CheckCircle2 size={22} />
          </div>
          <div className="summary-content">
            <span>Nộp đúng hạn</span>
            <strong>{onTime} bài</strong>
            <small>Tỷ lệ: {onTimePct}%</small>
          </div>
        </div>

        <div className="summary-item summary-orange">
          <div className="summary-icon">
            <Clock3 size={22} />
          </div>
          <div className="summary-content">
            <span>Nộp trễ hạn</span>
            <strong>{late} bài</strong>
            <small>Tỷ lệ: {latePct}%</small>
          </div>
        </div>

        <div className="summary-item summary-blue">
          <div className="summary-icon">
            <Award size={22} />
          </div>
          <div className="summary-content">
            <span>Đã chấm điểm</span>
            <strong>
              {graded}/{total} bài
            </strong>
            <small>{total - graded} bài đang chờ chấm</small>
          </div>
        </div>

        <div className="summary-item summary-light">
          <div className="summary-icon">
            <ClipboardCheck size={22} />
          </div>
          <div className="summary-content">
            <span>Chưa nộp / Cần nộp</span>
            <strong>{unsubmitted} bài</strong>
            <small>Tỷ lệ: {unsubmittedPct}%</small>
          </div>
        </div>
      </div>

      {/* 3. DONUT CHART SECTION: TỶ LỆ NỘP BÀI */}
      <section className="chart-card">
        <div className="chart-header">
          <div className="chart-title-wrap">
            <PieChart size={18} style={{ color: "#37883e" }} />
            <strong>Tỷ lệ nộp bài đúng hạn / trễ hạn / chưa nộp</strong>
          </div>
          <span style={{ fontSize: "12px", color: "#66736b" }}>
            Tổng số: <strong>{total}</strong> bài tập được giao
          </span>
        </div>

        {loading ? (
          <div style={{ padding: "30px", textAlign: "center", color: "#66736b" }}>
            Đang tải dữ liệu biểu đồ...
          </div>
        ) : total === 0 ? (
          <div style={{ padding: "30px", textAlign: "center", color: "#66736b" }}>
            Chưa có dữ liệu bài tập nào.
          </div>
        ) : (
          <div className="donut-chart-layout">
            {/* SVG Donut Chart */}
            <div className="donut-svg-wrap">
              <svg viewBox="0 0 200 200" width="100%" height="100%">
                {/* Background Ring */}
                <circle
                  cx="100"
                  cy="100"
                  r={radius}
                  fill="none"
                  stroke="#eef2ef"
                  strokeWidth="22"
                />

                {/* Slices */}
                {sliceRenderData.map((slice) => {
                  if (slice.count === 0) return null;
                  const isHovered = hoveredSlice === slice.key;
                  const isFiltered = filterStatus === slice.key;

                  return (
                    <circle
                      key={slice.key}
                      cx="100"
                      cy="100"
                      r={radius}
                      fill="none"
                      stroke={slice.color}
                      strokeWidth={isHovered || isFiltered ? 25 : 21}
                      strokeDasharray={`${slice.sliceLength} ${circumference}`}
                      strokeDashoffset={slice.strokeDashoffset}
                      transform="rotate(-90 100 100)"
                      style={{
                        transition:
                          "stroke-width 0.2s ease, opacity 0.2s ease, stroke 0.2s ease",
                        cursor: "pointer",
                        opacity:
                          hoveredSlice && !isHovered ? 0.45 : 1,
                      }}
                      onMouseEnter={() => setHoveredSlice(slice.key)}
                      onMouseLeave={() => setHoveredSlice(null)}
                      onClick={() =>
                        setFilterStatus(
                          filterStatus === slice.key ? "all" : slice.key
                        )
                      }
                    />
                  );
                })}

                {/* Center Content */}
                {activeSliceInfo ? (
                  <g textAnchor="middle">
                    <text
                      x="100"
                      y="94"
                      fontSize="19"
                      fontWeight="800"
                      fill={activeSliceInfo.color}
                    >
                      {activeSliceInfo.count} bài
                    </text>
                    <text
                      x="100"
                      y="112"
                      fontSize="11"
                      fontWeight="600"
                      fill="#374151"
                    >
                      {activeSliceInfo.label}
                    </text>
                    <text x="100" y="126" fontSize="10" fill="#6b7280">
                      ({activeSliceInfo.pct}%)
                    </text>
                  </g>
                ) : (
                  <g textAnchor="middle">
                    <text
                      x="100"
                      y="96"
                      fontSize="22"
                      fontWeight="800"
                      fill="#17221d"
                    >
                      {onTimePct}%
                    </text>
                    <text
                      x="100"
                      y="114"
                      fontSize="11"
                      fontWeight="600"
                      fill="#37883e"
                    >
                      Đúng hạn
                    </text>
                    <text x="100" y="128" fontSize="9.5" fill="#66736b">
                      {onTime}/{total} bài
                    </text>
                  </g>
                )}
              </svg>
            </div>

            {/* Breakdown List */}
            <div className="donut-breakdown-list">
              {slices.map((slice) => {
                const isActive = filterStatus === slice.key;
                return (
                  <div
                    key={slice.key}
                    className={`donut-breakdown-item ${
                      isActive ? "active" : ""
                    }`}
                    onMouseEnter={() => setHoveredSlice(slice.key)}
                    onMouseLeave={() => setHoveredSlice(null)}
                    onClick={() =>
                      setFilterStatus(isActive ? "all" : slice.key)
                    }
                  >
                    <div className="donut-breakdown-header">
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: "8px",
                        }}
                      >
                        <span
                          style={{
                            width: "10px",
                            height: "10px",
                            borderRadius: "50%",
                            background: slice.color,
                            display: "inline-block",
                          }}
                        />
                        <span>{slice.label}</span>
                      </div>
                      <div>
                        <strong style={{ color: slice.color }}>
                          {slice.count} bài
                        </strong>{" "}
                        <span style={{ color: "#66736b", fontSize: "12px" }}>
                          ({slice.pct}%)
                        </span>
                      </div>
                    </div>

                    <div className="donut-progress-bar">
                      <div
                        className="donut-progress-fill"
                        style={{
                          width: `${slice.pct}%`,
                          background: slice.color,
                        }}
                      />
                    </div>

                    <div className="donut-breakdown-meta">
                      <span>{slice.desc}</span>
                      <span style={{ fontSize: "10.5px", color: "#37883e" }}>
                        {isActive ? "Đang lọc • Bấm để bỏ" : "Bấm để lọc"}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </section>

      {/* 4. FILTER & TABLE */}
      <div className="student-table-card">
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: "16px",
            flexWrap: "wrap",
            gap: "12px",
          }}
        >
          <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
            <button
              type="button"
              className={
                filterStatus === "all" ? "btn-dlu-primary" : "btn-dlu-secondary"
              }
              onClick={() => setFilterStatus("all")}
            >
              Tất cả ({total})
            </button>
            <button
              type="button"
              className={
                filterStatus === "ontime"
                  ? "btn-dlu-primary"
                  : "btn-dlu-secondary"
              }
              onClick={() => setFilterStatus("ontime")}
            >
              Đúng hạn ({onTime})
            </button>
            <button
              type="button"
              className={
                filterStatus === "late" ? "btn-dlu-primary" : "btn-dlu-secondary"
              }
              onClick={() => setFilterStatus("late")}
            >
              Trễ hạn ({late})
            </button>
            <button
              type="button"
              className={
                filterStatus === "unsubmitted"
                  ? "btn-dlu-primary"
                  : "btn-dlu-secondary"
              }
              onClick={() => setFilterStatus("unsubmitted")}
            >
              Chưa nộp ({unsubmitted})
            </button>
            <button
              type="button"
              className={
                filterStatus === "graded"
                  ? "btn-dlu-primary"
                  : "btn-dlu-secondary"
              }
              onClick={() => setFilterStatus("graded")}
            >
              Đã có điểm ({graded})
            </button>
          </div>

          <div
            className="search-box"
            style={{
              width: "240px",
              background: "white",
              border: "1px solid #dfe4e1",
            }}
          >
            <Search size={14} style={{ color: "#68766f" }} />
            <input
              type="text"
              placeholder="Tìm bài tập hoặc môn..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{ color: "#17221d" }}
            />
          </div>
        </div>

        {loading ? (
          <div style={{ padding: "30px", textAlign: "center", color: "#66736b" }}>
            Đang tải dữ liệu lịch sử nộp bài...
          </div>
        ) : (
          <table className="student-table">
            <thead>
              <tr>
                <th>Khóa học</th>
                <th>Tên bài tập</th>
                <th>Hạn nộp (Deadline)</th>
                <th>Ngày nộp thực tế</th>
                <th>Trạng thái</th>
                <th>Điểm số</th>
                <th>Nhận xét của GV</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr>
                  <td
                    colSpan="7"
                    style={{
                      textAlign: "center",
                      color: "#66736b",
                      padding: "24px",
                    }}
                  >
                    Không tìm thấy bài nộp nào phù hợp với bộ lọc.
                  </td>
                </tr>
              ) : (
                filtered.map((item) => {
                  const isSubmitted = item.Submission_Status === "submitted";
                  const isOnTime = item.Is_Submitted_On_Time === 1;
                  const isLate = item.Is_Submitted_On_Time === 0;

                  return (
                    <tr key={item.Submission_Key}>
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
                          {item.Activity_Name}
                        </div>
                      </td>
                      <td>
                        <span style={{ color: "#66736b", fontSize: "11px" }}>
                          {item.Due_Date || "—"}
                        </span>
                      </td>
                      <td>
                        <span style={{ color: "#66736b", fontSize: "11px" }}>
                          {item.Submit_Date || "Chưa nộp"}
                        </span>
                      </td>
                      <td>
                        {isSubmitted && isOnTime ? (
                          <span className="dlu-badge dlu-badge--green">
                            ✓ Đúng hạn
                          </span>
                        ) : isSubmitted && isLate ? (
                          <span className="dlu-badge dlu-badge--orange">
                            ⚠️ Nộp trễ
                          </span>
                        ) : (
                          <span
                            className="dlu-badge"
                            style={{
                              background: "#fee2e2",
                              color: "#dc2626",
                              border: "1px solid #fca5a5",
                            }}
                          >
                            ⏳ Chưa nộp
                          </span>
                        )}
                      </td>
                      <td>
                        <strong
                          style={{
                            color:
                              item.Grade !== null && Number(item.Grade) >= 7
                                ? "#37883e"
                                : item.Grade !== null && Number(item.Grade) >= 5
                                ? "#e66d1e"
                                : item.Grade !== null
                                ? "#dc2626"
                                : "#66736b",
                          }}
                        >
                          {item.Grade !== null
                            ? `${Number(item.Grade)} đ`
                            : isSubmitted
                            ? "Chờ chấm"
                            : "—"}
                        </strong>
                      </td>
                      <td>
                        <span
                          style={{
                            color: "#66736b",
                            fontStyle: item.Feedback_Comment
                              ? "normal"
                              : "italic",
                          }}
                        >
                          {item.Feedback_Comment || "Chưa có nhận xét"}
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
