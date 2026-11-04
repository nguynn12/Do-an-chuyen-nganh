import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import {
  BookOpen,
  Award,
  Clock3,
  ClipboardCheck,
  Search,
  GraduationCap,
  Sparkles,
  TrendingUp,
} from "lucide-react";
import PowerBIEmbed from "../components/PowerBIEmbed";
import { getStudentUsername } from "../services/studentAuth";
import { buildEffortPredictionUrl } from "../services/powerbiConfig";
import "../styles/course-detail.css";

export default function StudentCourses({ courses = [], onNavigateToCourse }) {
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState("");
  // Tab chuyển đổi: "courses" (Danh sách môn học) | "effort" (Dự báo nỗ lực toàn kỳ)
  const [activeTab, setActiveTab] = useState("courses");

  // Lấy username sinh viên đang đăng nhập (mặc định an toàn là "sv2310002")
  const currentUser = useMemo(() => {
    return getStudentUsername();
  }, []);

  // Cấu hình URL nhúng Power BI mới: Tab Dự báo nỗ lực toàn kỳ (chỉ lọc theo sinh viên)
  const effortReportUrl = useMemo(() => {
    return buildEffortPredictionUrl(currentUser);
  }, [currentUser]);

  const filteredCourses = (courses || []).filter(
    (c) =>
      c.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.shortName?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <main className="page-full">
      {/* 1. HERO BANNER */}
      <section className="courses-hero">
        <div className="courses-hero-main">
          <div className="courses-hero-icon">
            <GraduationCap size={26} aria-hidden="true" />
          </div>
          <div>
            <div className="courses-breadcrumb">
              <BookOpen size={14} aria-hidden="true" />
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

      {/* 2. TAB SWITCHER (DANH SÁCH MÔN HỌC / DỰ BÁO NỖ LỰC TOÀN KỲ) */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: "18px",
          flexWrap: "wrap",
          gap: "12px",
          borderBottom: "1px solid #dfe4e1",
          paddingBottom: "14px",
        }}
      >
        <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
          <button
            type="button"
            className={activeTab === "courses" ? "btn-dlu-primary" : "btn-dlu-secondary"}
            onClick={() => setActiveTab("courses")}
            style={{ cursor: "pointer" }}
          >
            <BookOpen size={15} aria-hidden="true" />
            <span>Danh sách môn học ({(courses || []).length})</span>
          </button>

          <button
            type="button"
            className={activeTab === "effort" ? "btn-dlu-primary" : "btn-dlu-secondary"}
            onClick={() => setActiveTab("effort")}
            style={{ cursor: "pointer" }}
          >
            <TrendingUp size={15} aria-hidden="true" />
            <span>Dự báo nỗ lực toàn kỳ</span>
          </button>
        </div>

        {activeTab === "courses" && (
          <div className="search-box" style={{ width: "280px", background: "white", border: "1px solid #dfe4e1" }}>
            <Search size={15} style={{ color: "#4a5750" }} aria-hidden="true" />
            <input
              type="text"
              aria-label="Tìm kiếm theo tên hoặc mã môn học"
              placeholder="Tìm theo tên hoặc mã môn..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              style={{ color: "#17221d" }}
            />
          </div>
        )}
      </div>

      {/* 3. NỘI DUNG THEO TAB ĐƯỢC CHỌN */}
      {activeTab === "courses" && (
        filteredCourses.length === 0 ? (
          <div
            className="empty-card"
            style={{
              padding: "36px 20px",
              textAlign: "center",
              background: "#ffffff",
              borderRadius: "12px",
              border: "1px solid #dfe4e1",
              color: "#4a5750",
              fontSize: "13px",
            }}
          >
            {(courses || []).length === 0
              ? "Hiện tại bạn chưa đăng ký khóa học nào trong học kỳ này."
              : "Không tìm thấy khóa học phù hợp với từ khóa tìm kiếm."}
          </div>
        ) : (
          <div className="courses-grid" style={{ gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))" }}>
            {filteredCourses.map((c) => {
            // Tính tiến độ an toàn: ưu tiên trường progress, nếu không có thì mặc định 0%
            const progressPercent = c.progress !== undefined && c.progress !== null ? c.progress : 0;

            return (
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
                    <Award size={14} aria-hidden="true" />
                    Điểm TB học phần:{" "}
                    <strong style={{ color: c.averageGrade ? "#37883e" : "#64748b" }}>
                      {c.averageGrade ? `${c.averageGrade}/10` : "Chưa có"}
                    </strong>
                  </p>

                  <p>
                    <ClipboardCheck size={14} aria-hidden="true" />
                    Tiến độ nộp bài: <strong>{progressPercent}%</strong>
                  </p>

                  <p>
                    <Clock3 size={14} aria-hidden="true" />
                    Tổng giờ tương tác: <strong>{c.totalEngagementHours || 0} giờ</strong>
                  </p>

                  <div style={{ marginTop: "10px", marginBottom: "12px" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", fontSize: "11px", marginBottom: "4px", color: "#4a5750" }}>
                      <span>Tiến độ hoàn thành</span>
                      <strong>{progressPercent}%</strong>
                    </div>
                    <div className="analytics-track">
                      <div className="analytics-fill" style={{ width: `${progressPercent}%` }} />
                    </div>
                  </div>

                  <div className="course-actions">
                    <button
                      type="button"
                      onClick={() => navigate("/bang-diem")}
                    >
                      Bảng điểm
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        onNavigateToCourse
                          ? onNavigateToCourse(c.id)
                          : navigate(`/khoa-hoc/${c.id}`)
                      }
                    >
                      Xem phân tích
                    </button>
                  </div>
                </div>
              </div>
            );
            })}
          </div>
        )
      )}

      {/* 4. KHU VỰC THỐNG KÊ & DỰ BÁO NỖ LỰC TOÀN KỲ (POWER BI EMBED) */}
      {activeTab === "effort" && (
        <section className="course-detail-pbi-wrapper" style={{ marginTop: "6px" }}>
          {effortReportUrl ? (
            <PowerBIEmbed
              title="LMS Analytics - Kế hoạch học tập & Dự báo nỗ lực ôn thi toàn kỳ"
              reportUrl={effortReportUrl}
              height="740px"
            />
          ) : (
            <div
              style={{
                padding: "36px 20px",
                textAlign: "center",
                background: "#ffffff",
                borderRadius: "12px",
                border: "1px solid #e2e8f0",
                color: "#64748b",
                fontSize: "13px",
              }}
            >
              Đang chuẩn bị dữ liệu báo cáo dự báo nỗ lực toàn kỳ...
            </div>
          )}
        </section>
      )}
    </main>
  );
}