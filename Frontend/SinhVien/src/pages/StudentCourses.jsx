import React, { useState } from "react";
import {
  BookOpen,
  Award,
  Clock3,
  ClipboardCheck,
  Search,
  GraduationCap,
  Sparkles,
  ChevronRight,
} from "lucide-react";

export default function StudentCourses({ courses, onNavigateToCourse }) {
  const [searchTerm, setSearchTerm] = useState("");

  const filteredCourses = courses.filter(
    (c) =>
      c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.shortName.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <main className="page-full">
      {/* 1. HERO BANNER */}
      <section className="courses-hero">
        <div className="courses-hero-main">
          <div className="courses-hero-icon">
            <GraduationCap size={26} />
          </div>
          <div>
            <div className="courses-breadcrumb">
              <BookOpen size={14} />
              <span>Phân tích học tập</span>
              <span>/</span>
              <strong>Khóa học</strong>
            </div>
            <span className="courses-hero-kicker">DLU LMS ANALYTICS</span>
            <h1>Khóa học của tôi</h1>
            <p>
              Theo dõi chi tiết kết quả học tập, điểm số và tiến độ hoàn thành bài tập của các học phần đang học.
            </p>
          </div>
        </div>

        <div className="courses-semester">
          <Sparkles size={18} style={{ color: "#65c777" }} />
          <div>
            <span>Học kỳ hiện tại</span>
            <strong>Học kỳ 1 (2026–2027)</strong>
          </div>
        </div>
      </section>

      {/* 2. SEARCH & FILTER BAR */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: "18px",
          flexWrap: "wrap",
          gap: "12px",
        }}
      >
        <div style={{ fontSize: "14px", fontWeight: "700", color: "#17221d" }}>
          Danh sách khóa học ({filteredCourses.length})
        </div>

        <div className="search-box" style={{ width: "280px", background: "white", border: "1px solid #dfe4e1" }}>
          <Search size={15} style={{ color: "#68766f" }} />
          <input
            type="text"
            placeholder="Tìm theo tên hoặc mã môn..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={{ color: "#17221d" }}
          />
        </div>
      </div>

      {/* 3. COURSES GRID (MATCHING GIANG VIEN STYLE) */}
      <div className="courses-grid" style={{ gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))" }}>
        {filteredCourses.map((c) => (
          <div className="course-card" key={c.id}>
            <div className="course-cover">
              <div>
                <span>{c.shortName}</span>
              </div>
              <span className="course-cover-badge">Đang học</span>
            </div>

            <div className="course-body">
              <h3>{c.name}</h3>

              <p>
                <Award size={14} />
                Điểm TB học phần:{" "}
                <strong style={{ color: "#37883e" }}>
                  {c.averageGrade ? `${c.averageGrade}/10` : "7.0/10"}
                </strong>
              </p>

              <p>
                <ClipboardCheck size={14} />
                Tiến độ nộp bài: <strong>{c.progress || 100}%</strong>
              </p>

              <p>
                <Clock3 size={14} />
                Tổng giờ tương tác: <strong>{c.totalEngagementHours || 0} giờ</strong>
              </p>

              <div style={{ marginTop: "10px", marginBottom: "12px" }}>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: "10px", marginBottom: "4px", color: "#66736b" }}>
                  <span>Tiến độ hoàn thành</span>
                  <strong>{c.progress || 100}%</strong>
                </div>
                <div className="analytics-track">
                  <div className="analytics-fill" style={{ width: `${c.progress || 100}%` }} />
                </div>
              </div>

              <div className="course-actions">
                <button
                  type="button"
                  onClick={() => (window.location.hash = "grades")}
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
    </main>
  );
}
