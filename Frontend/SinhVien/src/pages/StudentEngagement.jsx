import React, { useEffect, useState } from "react";
import {
  Clock3,
  TrendingUp,
  BookOpen,
  Calendar,
  Sparkles,
  Award,
} from "lucide-react";

export default function StudentEngagement() {
  const [engagementData, setEngagementData] = useState({
    dailyTrend: [],
    courseEngagement: [],
  });
  const [loading, setLoading] = useState(true);

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

  const totalHours = engagementData.courseEngagement
    .reduce((acc, c) => acc + Number(c.totalHours || 0), 0)
    .toFixed(1);
  const totalDays = engagementData.dailyTrend.length;
  const avgHoursPerDay =
    totalDays > 0 ? (totalHours / totalDays).toFixed(1) : 0;
  const topCourse =
    engagementData.courseEngagement[0]?.Course_Name || "Cơ sở dữ liệu";

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
            <span>Trung bình mỗi ngày</span>
            <strong>{avgHoursPerDay} giờ/ngày</strong>
            <small>Tính trên {totalDays} ngày truy cập</small>
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
            <Calendar size={22} />
          </div>
          <div className="summary-content">
            <span>Số ngày hoạt động</span>
            <strong>{totalDays} ngày</strong>
            <small>Duy trì học đều đặn</small>
          </div>
        </div>
      </div>

      {/* 3. CHARTS GRID */}
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
                    <span>{c.Course_Name} ({c.Course_Code})</span>
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

        {/* Daily Trend */}
        <div className="analytics-card">
          <div className="analytics-card__header">
            <div className="analytics-card__title">
              <TrendingUp size={16} />
              <span>Nhật ký tương tác gần đây</span>
            </div>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
            {engagementData.dailyTrend.slice(0, 5).map((d) => (
              <div
                key={d.Date}
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
                  <div style={{ fontWeight: "700", fontSize: "12px", color: "#17221d" }}>
                    Ngày: {d.Date}
                  </div>
                  <div style={{ fontSize: "10px", color: "#66736b" }}>
                    {d.Course_Name || "Toàn bộ môn học"}
                  </div>
                </div>
                <div style={{ fontWeight: "700", fontSize: "12px", color: "#37883e" }}>
                  {Number(d.Hours || 0).toFixed(1)} giờ
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </main>
  );
}
