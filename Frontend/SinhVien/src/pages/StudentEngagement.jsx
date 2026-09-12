import React, { useEffect, useState, useMemo } from "react";
import {
  Clock3,
  TrendingUp,
  BookOpen,
  Calendar,
  Sparkles,
  Flame,
  Grid,
} from "lucide-react";

function normalizeDateStr(dateStr) {
  if (!dateStr) return "";
  if (dateStr.includes("/")) {
    const parts = dateStr.split("/");
    if (parts.length === 3) {
      return `${parts[2]}-${parts[1].padStart(2, "0")}-${parts[0].padStart(2, "0")}`;
    }
  }
  return dateStr;
}

function formatDateDisplay(d) {
  const dayNames = [
    "Chủ nhật",
    "Thứ Hai",
    "Thứ Ba",
    "Thứ Tư",
    "Thứ Năm",
    "Thứ Sáu",
    "Thứ Bảy",
  ];
  const dayName = dayNames[d.getDay()];
  const dd = String(d.getDate()).padStart(2, "0");
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const yyyy = d.getFullYear();
  return `${dayName}, ${dd}/${mm}/${yyyy}`;
}

function getCellColor(hours) {
  if (!hours || hours <= 0) return "#ebedf0";
  if (hours <= 1) return "#cce6cd";
  if (hours <= 2.5) return "#91d497";
  if (hours <= 4) return "#4cae56";
  return "#236d2b";
}

export default function StudentEngagement() {
  const [engagementData, setEngagementData] = useState({
    dailyTrend: [],
    courseEngagement: [],
  });
  const [loading, setLoading] = useState(true);
  const [showAllWeeks, setShowAllWeeks] = useState(false);
  const [hoveredCell, setHoveredCell] = useState(null);

  useEffect(() => {
    fetch("/api/v1/student/engagement")
      .then((res) => res.json())
      .then((data) => {
        if (data.success) {
          setEngagementData(data);
        }
      })
      .catch((err) => console.error("Lỗi getStudentEngagement:", err))
      .finally(() => setLoading(false));
  }, []);

  const totalHours = Number(
    engagementData.courseEngagement
      .reduce((acc, c) => acc + Number(c.totalHours || 0), 0)
      .toFixed(1)
  );

  const activeDays = engagementData.dailyTrend.filter(
    (d) => Number(d.totalHours || d.Hours || 0) > 0
  ).length;

  const totalDays = engagementData.dailyTrend.length || 1;
  const avgHoursPerDay =
    activeDays > 0 ? (totalHours / activeDays).toFixed(1) : 0;

  const topCourse =
    engagementData.courseEngagement[0]?.Course_Name || "Cơ sở dữ liệu";

  // Chuẩn bị ma trận Heatmap theo tuần và ngày trong tuần (T2 - CN)
  const { weeks, totalWeeksCount, maxDayRecord } = useMemo(() => {
    const trend = engagementData.dailyTrend || [];
    const dateMap = {};
    let maxRecord = { date: "", hours: 0 };

    trend.forEach((item) => {
      const rawDate = item.date || item.Date;
      if (rawDate) {
        const norm = normalizeDateStr(rawDate);
        const hrs = Number(
          item.totalHours !== undefined ? item.totalHours : item.Hours || 0
        );
        dateMap[norm] = hrs;
        if (hrs > maxRecord.hours) {
          maxRecord = { date: norm, hours: hrs };
        }
      }
    });

    // Xác định mốc ngày bắt đầu và kết thúc
    const dates = Object.keys(dateMap).sort();
    let startDate;
    let endDate;

    if (dates.length > 0) {
      const firstD = new Date(dates[0]);
      const lastD = new Date(dates[dates.length - 1]);
      startDate = new Date(firstD.getFullYear(), firstD.getMonth(), firstD.getDate());
      endDate = new Date(lastD.getFullYear(), lastD.getMonth(), lastD.getDate());
    } else {
      const now = new Date();
      endDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      startDate = new Date(endDate);
      startDate.setDate(endDate.getDate() - 28);
    }

    // Lùi startDate về Thứ Hai của tuần đầu tiên (0: T2, ..., 6: CN)
    const startDayOfWeek = (startDate.getDay() + 6) % 7; // Monday = 0
    startDate.setDate(startDate.getDate() - startDayOfWeek);

    // Tiến endDate đến Chủ Nhật của tuần cuối cùng
    const endDayOfWeek = (endDate.getDay() + 6) % 7;
    endDate.setDate(endDate.getDate() + (6 - endDayOfWeek));

    // Tạo các tuần liên tục
    const allWeeks = [];
    const curr = new Date(startDate);
    let lastMonth = -1;

    while (curr <= endDate) {
      const days = [];
      let weekMonthLabel = "";

      for (let i = 0; i < 7; i++) {
        const dObj = new Date(curr);
        const yyyy = dObj.getFullYear();
        const mm = String(dObj.getMonth() + 1).padStart(2, "0");
        const dd = String(dObj.getDate()).padStart(2, "0");
        const dateKey = `${yyyy}-${mm}-${dd}`;
        const hours = dateMap[dateKey] || 0;

        if (dObj.getMonth() !== lastMonth && i === 0) {
          weekMonthLabel = `Thg ${dObj.getMonth() + 1}`;
          lastMonth = dObj.getMonth();
        }

        days.push({
          dateKey,
          dateObj: dObj,
          displayDate: formatDateDisplay(dObj),
          hours,
          color: getCellColor(hours),
        });

        curr.setDate(curr.getDate() + 1);
      }

      allWeeks.push({
        monthLabel: weekMonthLabel,
        days,
      });
    }

    const totalCount = allWeeks.length;
    const displayedWeeks =
      !showAllWeeks && totalCount > 12 ? allWeeks.slice(-12) : allWeeks;

    return {
      weeks: displayedWeeks,
      totalWeeksCount: totalCount,
      maxDayRecord: maxRecord,
    };
  }, [engagementData.dailyTrend, showAllWeeks]);

  return (
    <main className="page-full">
      {/* 1. HERO BANNER */}
      <section className="courses-hero">
        <div className="courses-hero-main">
          <div className="courses-hero-icon">
            <Clock3 size={26} />
          </div>
          <div>
            <div className="courses-breadcrumb">
              <BookOpen size={14} />
              <span>Phân tích học tập</span>
              <span>/</span>
              <strong>Thời gian học</strong>
            </div>
            <span className="courses-hero-kicker">DLU LMS ANALYTICS</span>
            <h1>Nhật ký & Thời gian tương tác</h1>
            <p>
              Thống kê chi tiết thời lượng học tập trên LMS Data Warehouse theo từng ngày và theo từng học phần.
            </p>
          </div>
        </div>

        <div className="courses-semester">
          <Sparkles size={18} style={{ color: "#65c777" }} />
          <div>
            <span>Tổng giờ học</span>
            <strong>{totalHours} giờ</strong>
          </div>
        </div>
      </section>

      {/* 2. SUMMARY METRICS */}
      <div className="summary-grid" style={{ marginBottom: "20px" }}>
        <div className="summary-item summary-green">
          <div className="summary-icon">
            <Clock3 size={22} />
          </div>
          <div className="summary-content">
            <span>Tổng thời gian học</span>
            <strong>{totalHours} giờ</strong>
            <small>Ghi nhận toàn học kỳ</small>
          </div>
        </div>

        <div className="summary-item summary-blue">
          <div className="summary-icon">
            <TrendingUp size={22} />
          </div>
          <div className="summary-content">
            <span>Trung bình / ngày học</span>
            <strong>{avgHoursPerDay} giờ/ngày</strong>
            <small>Tính trên {activeDays} ngày có hoạt động</small>
          </div>
        </div>

        <div className="summary-item summary-orange">
          <div className="summary-icon">
            <BookOpen size={22} />
          </div>
          <div className="summary-content">
            <span>Môn học nhiều nhất</span>
            <strong>{topCourse}</strong>
            <small>Dành nhiều thời gian nhất</small>
          </div>
        </div>

        <div className="summary-item summary-light">
          <div className="summary-icon">
            <Flame size={22} />
          </div>
          <div className="summary-content">
            <span>Số ngày hoạt động</span>
            <strong>{activeDays} ngày</strong>
            <small>
              Kỷ lục: {maxDayRecord.hours}h ({maxDayRecord.date || "—"})
            </small>
          </div>
        </div>
      </div>

      {/* 3. ACTIVITY HEATMAP SECTION */}
      <section className="chart-card">
        <div className="chart-header">
          <div className="chart-title-wrap">
            <Grid size={18} style={{ color: "#37883e" }} />
            <strong>Ma trận thời gian học theo ngày trong tuần (Activity Heatmap)</strong>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            {totalWeeksCount > 12 && (
              <button
                type="button"
                className="btn-dlu-secondary"
                style={{ height: "28px", fontSize: "11px", padding: "0 10px" }}
                onClick={() => setShowAllWeeks(!showAllWeeks)}
              >
                {showAllWeeks
                  ? "Thu gọn 12 tuần gần nhất"
                  : `Xem toàn bộ (${totalWeeksCount} tuần)`}
              </button>
            )}
          </div>
        </div>

        {loading ? (
          <div style={{ padding: "30px", textAlign: "center", color: "#66736b" }}>
            Đang tải dữ liệu ma trận thời gian học...
          </div>
        ) : (
          <div>
            <div className="heatmap-container">
              <div className="heatmap-grid-wrap">
                {/* Weekday Labels (T2 to CN) */}
                <div style={{ paddingTop: "16px" }}>
                  <div className="heatmap-weekdays">
                    <span>T2</span>
                    <span>T3</span>
                    <span>T4</span>
                    <span>T5</span>
                    <span>T6</span>
                    <span>T7</span>
                    <span>CN</span>
                  </div>
                </div>

                {/* Week Columns */}
                <div className="heatmap-weeks-track">
                  {weeks.map((w, wIdx) => (
                    <div key={wIdx} className="heatmap-week-col">
                      <div className="heatmap-month-label">
                        {w.monthLabel || ""}
                      </div>

                      {w.days.map((d) => (
                        <div
                          key={d.dateKey}
                          className="heatmap-cell"
                          style={{ background: d.color }}
                          title={`${d.displayDate}: ${
                            d.hours > 0 ? `${d.hours} giờ học` : "Không có hoạt động"
                          }`}
                          onMouseEnter={() => setHoveredCell(d)}
                          onMouseLeave={() => setHoveredCell(null)}
                        />
                      ))}
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Heatmap Footer: Active Tooltip Info & Legend */}
            <div className="heatmap-footer">
              <div>
                {hoveredCell ? (
                  <span>
                    <strong style={{ color: "#17221d" }}>
                      {hoveredCell.displayDate}:
                    </strong>{" "}
                    <span style={{ color: "#37883e", fontWeight: "700" }}>
                      {hoveredCell.hours > 0
                        ? `${hoveredCell.hours} giờ (${Math.round(
                            hoveredCell.hours * 60
                          )} phút)`
                        : "Chưa ghi nhận thời gian học"}
                    </span>
                  </span>
                ) : (
                  <span>
                    Rê chuột vào từng ô vuông để xem chi tiết thời gian học mỗi ngày.
                  </span>
                )}
              </div>

              <div className="heatmap-legend">
                <span>Ít</span>
                <span
                  className="heatmap-legend-box"
                  style={{ background: "#ebedf0" }}
                  title="0 giờ"
                />
                <span
                  className="heatmap-legend-box"
                  style={{ background: "#cce6cd" }}
                  title="0 - 1 giờ"
                />
                <span
                  className="heatmap-legend-box"
                  style={{ background: "#91d497" }}
                  title="1 - 2.5 giờ"
                />
                <span
                  className="heatmap-legend-box"
                  style={{ background: "#4cae56" }}
                  title="2.5 - 4 giờ"
                />
                <span
                  className="heatmap-legend-box"
                  style={{ background: "#236d2b" }}
                  title="> 4 giờ"
                />
                <span>Nhiều</span>
              </div>
            </div>
          </div>
        )}
      </section>

      {/* 4. CHARTS GRID */}
      <div className="analytics-grid">
        {/* Course Engagement */}
        <div className="analytics-card">
          <div className="analytics-card__header">
            <div className="analytics-card__title">
              <BookOpen size={16} />
              <span>Thời gian học tập theo môn học</span>
            </div>
          </div>

          <div>
            {engagementData.courseEngagement.map((c) => {
              const hours = Number(c.totalHours || 0);
              const percent =
                totalHours > 0 ? Math.round((hours / totalHours) * 100) : 0;
              return (
                <div key={c.Course_Code} className="analytics-bar-item">
                  <div className="analytics-bar-meta">
                    <span>
                      {c.Course_Name} ({c.Course_Code})
                    </span>
                    <span style={{ color: "#37883e", fontWeight: "700" }}>
                      {hours} giờ ({percent}%)
                    </span>
                  </div>
                  <div className="analytics-track">
                    <div
                      className="analytics-fill"
                      style={{ width: `${percent}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Daily Trend (Nhật ký tương tác gần đây) */}
        <div className="analytics-card">
          <div className="analytics-card__header">
            <div className="analytics-card__title">
              <TrendingUp size={16} />
              <span>Nhật ký tương tác gần đây</span>
            </div>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
            {engagementData.dailyTrend.slice(-6).reverse().map((d, idx) => {
              const dateVal = d.date || d.Date || "—";
              const hrs = Number(
                d.totalHours !== undefined ? d.totalHours : d.Hours || 0
              );

              return (
                <div
                  key={idx}
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    padding: "10px 12px",
                    background: "#f8faf8",
                    borderRadius: "8px",
                    border: "1px solid #dfe5e1",
                  }}
                >
                  <div>
                    <div
                      style={{
                        fontWeight: "700",
                        fontSize: "12px",
                        color: "#17221d",
                      }}
                    >
                      Ngày: {dateVal}
                    </div>
                    <div style={{ fontSize: "10px", color: "#66736b" }}>
                      {hrs > 0
                        ? `${hrs} giờ (${Math.round(hrs * 60)} phút)`
                        : "Không có hoạt động"}
                    </div>
                  </div>
                  <div
                    style={{
                      fontWeight: "700",
                      fontSize: "12px",
                      color: hrs > 0 ? "#37883e" : "#9ca3af",
                    }}
                  >
                    {hrs.toFixed(1)} giờ
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </main>
  );
}
