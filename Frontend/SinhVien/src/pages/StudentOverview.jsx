import React, { useState } from "react";
import {
  BookOpen,
  Award,
  Clock3,
  ClipboardCheck,
  ChevronRight,
  TrendingUp,
  CheckCircle2,
  CalendarDays,
  Bell,
  Sparkles,
  ExternalLink,
  Users,
} from "lucide-react";

export default function StudentOverview({
  summary,
  courses,
  onNavigateToCourse,
  onNavigateToTab,
}) {
  const [currentMonth, setCurrentMonth] = useState(new Date());

  const kpis = summary?.kpis || {};
  const student = summary?.student || {};
  const recentActivities = summary?.recentActivities || [];
  const events = summary?.events || [];

  // Initials
  const initials = student?.fullName
    ? student.fullName
        .split(" ")
        .map((w) => w[0])
        .slice(-2)
        .join("")
        .toUpperCase()
    : "SV";

  // Lịch mini (Tháng)
  const monthNames = [
    "Tháng 1", "Tháng 2", "Tháng 3", "Tháng 4", "Tháng 5", "Tháng 6",
    "Tháng 7", "Tháng 8", "Tháng 9", "Tháng 10", "Tháng 11", "Tháng 12"
  ];
  const year = currentMonth.getFullYear();
  const month = currentMonth.getMonth();

  const prevMonth = () => {
    setCurrentMonth(new Date(year, month - 1, 1));
  };
  const nextMonth = () => {
    setCurrentMonth(new Date(year, month + 1, 1));
  };

  // Calendar days grid
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const firstDayIndex = (new Date(year, month, 1).getDay() + 6) % 7; // Monday first

  const calendarCells = [];
  for (let i = 0; i < firstDayIndex; i++) {
    calendarCells.push({ day: "", empty: true });
  }
  for (let d = 1; d <= daysInMonth; d++) {
    const isToday =
      d === new Date().getDate() &&
      month === new Date().getMonth() &&
      year === new Date().getFullYear();

    const dayEvents = events.filter((ev) => {
      if (!ev?.date) return false;
      const parts = ev.date.split("/");
      if (parts.length < 3) return false;
      const evDay = parseInt(parts[0], 10);
      const evMonth = parseInt(parts[1], 10) - 1;
      const evYear = parseInt(parts[2], 10);
      return evDay === d && evMonth === month && evYear === year;
    });

    const isMarked = dayEvents.length > 0;
    const tooltip = isMarked
      ? dayEvents.map((ev) => `${ev.title} (${ev.course}) - Hạn: ${ev.date}`).join("\n")
      : undefined;

    calendarCells.push({ day: d, isToday, isMarked, tooltip });
  }

  return (
    <main className="page">
      {/* =========================
          CỘT CHÍNH (MAIN CONTENT)
      ========================= */}
      <div className="main-content">
        {/* 1. WELCOME CARD */}
        <section className="welcome-card">
          <div className="welcome-user">
            <div className="big-avatar">{initials}</div>
            <div>
              <h2>Xin chào, {student.fullName || "Nguyễn Văn An"}!</h2>
              <p>
                Khoa Công nghệ Thông tin | Lớp: {student.cohort || "CTK47B"} | MSSV:{" "}
                {student.studentCode || student.username || "2310001"} | Học kỳ:{" "}
                {student.currentSemester || "Học kỳ 1 (2026-2027)"}
              </p>
            </div>
          </div>

          {/* 4 SUMMARY METRIC CARDS (DLU GREEN THEME) */}
          <div className="summary-grid">
            <button
              type="button"
              className="summary-item summary-green"
              onClick={() => onNavigateToTab("grades")}
            >
              <div className="summary-icon">
                <Award size={22} />
              </div>
              <div className="summary-content">
                <span>Điểm TB tích lũy</span>
                <strong>{kpis.averageGrade ? `${kpis.averageGrade}/10` : "7.5/10"}</strong>
                <small>Tỷ lệ đạt chuẩn: {kpis.averagePercentage || 75}%</small>
              </div>
              <ChevronRight size={14} className="summary-arrow" />
            </button>

            <button
              type="button"
              className="summary-item summary-orange"
              onClick={() => onNavigateToTab("submissions")}
            >
              <div className="summary-icon">
                <ClipboardCheck size={22} />
              </div>
              <div className="summary-content">
                <span>Tiến độ nộp bài</span>
                <strong>
                  {kpis.submittedAssignments || 6}/{kpis.totalAssignments || 6} Đã nộp
                </strong>
                <small>
                  {kpis.pendingAssignments > 0
                    ? `Còn ${kpis.pendingAssignments} bài cần nộp`
                    : "Đã hoàn thành 100%"}
                </small>
              </div>
              <ChevronRight size={14} className="summary-arrow" />
            </button>

            <button
              type="button"
              className="summary-item summary-blue"
              onClick={() => onNavigateToTab("courses")}
            >
              <div className="summary-icon">
                <BookOpen size={22} />
              </div>
              <div className="summary-content">
                <span>Khóa học đang học</span>
                <strong>{kpis.totalCourses || courses.length || 3} Môn học</strong>
                <small>Tất cả đang hoạt động</small>
              </div>
              <ChevronRight size={14} className="summary-arrow" />
            </button>

            <button
              type="button"
              className="summary-item summary-light"
              onClick={() => onNavigateToTab("engagement")}
            >
              <div className="summary-icon">
                <Clock3 size={22} />
              </div>
              <div className="summary-content">
                <span>Tổng thời gian học</span>
                <strong>{kpis.totalEngagementHours || 306} Giờ</strong>
                <small>Ghi nhận từ Data Warehouse</small>
              </div>
              <ChevronRight size={14} className="summary-arrow" />
            </button>
          </div>
        </section>

        {/* 2. SECTION: KHÓA HỌC CỦA TÔI */}
        <section className="section">
          <div className="section-title">
            <div>
              <BookOpen size={18} style={{ color: "#37883e" }} />
              <strong>Khóa học đang theo học kỳ này</strong>
            </div>
            <button
              type="button"
              className="btn-dlu-secondary"
              style={{ height: "28px", fontSize: "11px", padding: "0 10px" }}
              onClick={() => onNavigateToTab("courses")}
            >
              Xem tất cả môn
            </button>
          </div>

          <div className="courses-grid">
            {courses.slice(0, 4).map((c) => (
              <div className="course-card" key={c.id}>
                <div className="course-cover">
                  <div>
                    <span>{c.shortName}</span>
                  </div>
                  <span className="course-cover-badge">DLU LMS</span>
                </div>

                <div className="course-body">
                  <h3>{c.name}</h3>

                  <p>
                    <Award size={14} />
                    Điểm trung bình:{" "}
                    <strong>{c.averageGrade ? `${c.averageGrade}/10` : "7.0/10"}</strong>
                  </p>

                  <p>
                    <ClipboardCheck size={14} />
                    Tiến độ hoàn thành: <strong>{c.progress || 100}%</strong>
                  </p>

                  <p>
                    <Clock3 size={14} />
                    Thời gian học: <strong>{c.totalEngagementHours || 0} giờ</strong>
                  </p>

                  <div className="course-actions">
                    <button
                      type="button"
                      onClick={() => onNavigateToTab("grades")}
                    >
                      Bảng điểm
                    </button>
                    <button
                      type="button"
                      onClick={() => onNavigateToCourse(c.id)}
                    >
                      Xem phân tích
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* 3. SECTION: TRỰC QUAN HÓA DỮ LIỆU HỌC TẬP (CHARTS) */}
        <section className="section">
          <div className="section-title">
            <div>
              <TrendingUp size={18} style={{ color: "#37883e" }} />
              <strong>Trực quan hóa kết quả học tập & Tiến độ</strong>
            </div>
          </div>

          <div className="analytics-grid">
            {/* Cột 1: Điểm trung bình theo môn */}
            <div className="analytics-card">
              <div className="analytics-card__header">
                <div className="analytics-card__title">
                  <Award size={16} />
                  <span>Điểm trung bình theo môn học</span>
                </div>
                <button
                  type="button"
                  className="btn-dlu-secondary"
                  style={{ height: "24px", fontSize: "10px", padding: "0 8px" }}
                  onClick={() => onNavigateToTab("grades")}
                >
                  Chi tiết
                </button>
              </div>

              {courses.map((c) => {
                const grade = c.averageGrade || 7.0;
                const percent = (grade / 10) * 100;
                return (
                  <div key={c.id} className="analytics-bar-item">
                    <div className="analytics-bar-meta">
                      <span>{c.name} ({c.shortName})</span>
                      <span style={{ color: "#37883e", fontWeight: "700" }}>
                        {grade}/10
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

            {/* Cột 2: Tiến độ nộp bài theo môn */}
            <div className="analytics-card">
              <div className="analytics-card__header">
                <div className="analytics-card__title">
                  <CheckCircle2 size={16} />
                  <span>Tiến độ hoàn thành bài tập</span>
                </div>
                <button
                  type="button"
                  className="btn-dlu-secondary"
                  style={{ height: "24px", fontSize: "10px", padding: "0 8px" }}
                  onClick={() => onNavigateToTab("submissions")}
                >
                  Lịch sử
                </button>
              </div>

              {courses.map((c) => (
                <div key={c.id} className="analytics-bar-item">
                  <div className="analytics-bar-meta">
                    <span>{c.name}</span>
                    <span style={{ color: "#37883e", fontWeight: "700" }}>
                      {c.progress || 100}%
                    </span>
                  </div>
                  <div className="analytics-track">
                    <div
                      className="analytics-fill"
                      style={{ width: `${c.progress || 100}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>
      </div>

      {/* =========================
          CỘT PHẢI (RIGHT PANEL)
      ========================= */}
      <aside className="right-panel">
        {/* 1. LỊCH HỌC TẬP (CALENDAR) */}
        <div className="right-card">
          <div className="calendar-title">
            <strong>
              {monthNames[month]} - {year}
            </strong>
            <div className="calendar-nav">
              <button type="button" onClick={prevMonth} aria-label="Tháng trước">
                ‹
              </button>
              <button type="button" onClick={nextMonth} aria-label="Tháng sau">
                ›
              </button>
            </div>
          </div>

          <div className="calendar-week">
            <span>T2</span>
            <span>T3</span>
            <span>T4</span>
            <span>T5</span>
            <span>T6</span>
            <span>T7</span>
            <span>CN</span>
          </div>

          <div className="calendar-days">
            {calendarCells.map((cell, idx) => (
              <div
                key={idx}
                className={`calendar-day ${cell.isToday ? "today" : ""} ${
                  cell.isMarked && !cell.isToday ? "marked" : ""
                }`}
                title={cell.tooltip}
              >
                {cell.day}
                {cell.isMarked && !cell.isToday && <span className="calendar-dot" />}
              </div>
            ))}
          </div>
        </div>

        {/* 2. THÔNG BÁO & HẠN NỘP BÀI */}
        <div className="right-card">
          <div className="right-heading">
            <div>
              <Bell size={16} style={{ color: "#37883e" }} />
              <strong>Hạn nộp & Nhắc nhở</strong>
            </div>
            <span className="badge">{events.length || 2}</span>
          </div>

          {events.length > 0 ? (
            events.map((ev) => (
              <div key={ev.id} className="notification-item">
                <div className="notification-dot urgent" />
                <div className="notification-info">
                  <strong>{ev.title}</strong>
                  <span>{ev.course} • Hạn: {ev.date}</span>
                </div>
              </div>
            ))
          ) : (
            <div className="notification-item">
              <div className="notification-dot" />
              <div className="notification-info">
                <strong>Đã hoàn thành toàn bộ bài tập</strong>
                <span>Không có bài tập nào sắp đến hạn</span>
              </div>
            </div>
          )}
        </div>

        {/* 3. LIÊN KẾT NHANH (QUICK LINKS) */}
        <div className="right-card">
          <h3 className="quick-title">Liên kết nhanh</h3>

          <button
            type="button"
            className="quick-link"
            onClick={() => window.open("https://lms.dlu.edu.vn", "_blank")}
          >
            <div>
              <span>🌐</span>
              <span>Hệ thống LMS DLU</span>
            </div>
            <ExternalLink size={14} />
          </button>

          <button
            type="button"
            className="quick-link"
            onClick={() => onNavigateToTab("grades")}
          >
            <div>
              <span>🎯</span>
              <span>Bảng điểm chi tiết</span>
            </div>
            <ChevronRight size={14} />
          </button>

          <button
            type="button"
            className="quick-link"
            onClick={() => onNavigateToTab("engagement")}
          >
            <div>
              <span>⏱️</span>
              <span>Nhật ký thời gian học</span>
            </div>
            <ChevronRight size={14} />
          </button>

          <button
            type="button"
            className="quick-link"
            onClick={() => alert("Hỗ trợ kỹ thuật ITC DLU: itc@dlu.edu.vn")}
          >
            <div>
              <span>🛠️</span>
              <span>Hỗ trợ kỹ thuật ITC</span>
            </div>
            <ChevronRight size={14} />
          </button>
        </div>
      </aside>
    </main>
  );
}
