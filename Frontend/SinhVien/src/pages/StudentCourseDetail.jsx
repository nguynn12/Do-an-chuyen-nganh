import React, { useEffect, useState } from "react";
import {
  ArrowLeft,
  Award,
  BookOpen,
  Calendar,
  CheckCircle2,
  Clock3,
  AlertCircle,
  FileText,
  HelpCircle,
  User,
  GraduationCap,
} from "lucide-react";

export default function StudentCourseDetail({ courseId, onBack }) {
  const [courseData, setCourseData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!courseId) return;
    setLoading(true);
    setError(null);

    fetch(`/api/v1/student/courses/${courseId}`)
      .then((res) => {
        if (!res.ok) throw new Error(`Lỗi tải dữ liệu (${res.status})`);
        return res.json();
      })
      .then((data) => {
        if (data.course) {
          setCourseData(data.course);
        } else {
          setError("Không tìm thấy thông tin khóa học.");
        }
      })
      .catch((err) => {
        console.error("Lỗi getStudentCourseDetail:", err);
        setError("Không thể kết nối đến máy chủ.");
      })
      .finally(() => setLoading(false));
  }, [courseId]);

  if (loading) {
    return (
      <main className="page-full">
        <div className="welcome-card" style={{ padding: "40px", textAlign: "center", color: "#66736b" }}>
          Đang tải dữ liệu phân tích chi tiết môn học từ Data Warehouse...
        </div>
      </main>
    );
  }

  if (error || !courseData) {
    return (
      <main className="page-full">
        <div className="welcome-card" style={{ padding: "40px", textAlign: "center" }}>
          <AlertCircle size={36} style={{ color: "#dc2626", margin: "0 auto 12px" }} />
          <div style={{ fontWeight: "700", marginBottom: "12px", color: "#17221d" }}>
            {error || "Lỗi tải môn học"}
          </div>
          <button className="btn-dlu-secondary" onClick={onBack}>
            <ArrowLeft size={16} /> Quay lại danh sách môn học
          </button>
        </div>
      </main>
    );
  }

  // Lọc bài tập & học liệu
  const assignmentTopics =
    courseData.topics?.find((t) => t.id === "assignments")?.items || [];
  const resourceTopics =
    courseData.topics?.find((t) => t.id === "resources")?.items || [];

  const totalTasks = assignmentTopics.length;
  const submittedTasks = assignmentTopics.filter(
    (a) => a.submissionStatus === "submitted"
  ).length;
  const onTimeTasks = assignmentTopics.filter((a) => a.isSubmittedOnTime).length;
  const gradesList = assignmentTopics
    .filter((a) => a.grade !== null)
    .map((a) => a.grade);
  const avgGrade =
    gradesList.length > 0
      ? (gradesList.reduce((a, b) => a + b, 0) / gradesList.length).toFixed(1)
      : null;

  return (
    <main className="page-full">
      {/* 1. BACK BUTTON & HERO BANNER */}
      <div style={{ marginBottom: "14px" }}>
        <button
          type="button"
          className="btn-dlu-secondary"
          onClick={onBack}
          style={{ marginBottom: "12px" }}
        >
          <ArrowLeft size={15} /> Quay lại danh sách môn
        </button>

        <section className="courses-hero">
          <div className="courses-hero-main">
            <div className="courses-hero-icon">
              <GraduationCap size={26} />
            </div>
            <div>
              <div className="courses-breadcrumb">
                <BookOpen size={14} />
                <span>Khóa học</span>
                <span>/</span>
                <strong>{courseData.code}</strong>
              </div>
              <span className="courses-hero-kicker">CHI TIẾT PHÂN TÍCH HỌC PHẦN</span>
              <h1>{courseData.title}</h1>
              <p>
                Giảng viên: <strong>{courseData.instructor || "Giảng viên phụ trách"}</strong> | Học kỳ: {courseData.semester || "Học kỳ 1 (2026-2027)"}
              </p>
            </div>
          </div>

          <div className="courses-semester">
            <div>
              <span>Mã học phần</span>
              <strong>{courseData.code}</strong>
            </div>
          </div>
        </section>
      </div>

      {/* 2. SUMMARY METRICS */}
      <div className="summary-grid" style={{ marginBottom: "20px" }}>
        <div className="summary-item summary-green">
          <div className="summary-icon">
            <Award size={22} />
          </div>
          <div className="summary-content">
            <span>Điểm TB môn</span>
            <strong>{avgGrade ? `${avgGrade}/10` : "Chưa có"}</strong>
            <small>Đánh giá quá trình</small>
          </div>
        </div>

        <div className="summary-item summary-orange">
          <div className="summary-icon">
            <CheckCircle2 size={22} />
          </div>
          <div className="summary-content">
            <span>Tiến độ nộp bài</span>
            <strong>{submittedTasks}/{totalTasks} bài</strong>
            <small>{submittedTasks === totalTasks ? "Đã nộp đầy đủ" : "Còn bài tập"}</small>
          </div>
        </div>

        <div className="summary-item summary-blue">
          <div className="summary-icon">
            <Clock3 size={22} />
          </div>
          <div className="summary-content">
            <span>Nộp đúng hạn</span>
            <strong>{onTimeTasks}/{submittedTasks} bài</strong>
            <small>Tỷ lệ: {submittedTasks > 0 ? Math.round((onTimeTasks / submittedTasks) * 100) : 100}%</small>
          </div>
        </div>

        <div className="summary-item summary-light">
          <div className="summary-icon">
            <FileText size={22} />
          </div>
          <div className="summary-content">
            <span>Tài liệu môn học</span>
            <strong>{resourceTopics.length} học liệu</strong>
            <small>Slide, bài đọc & video</small>
          </div>
        </div>
      </div>

      {/* 3. ASSIGNMENTS TABLE */}
      <div className="student-table-card">
        <div className="section-title">
          <div className="left">
            <Award size={18} style={{ color: "#37883e" }} />
            <strong>Chi tiết bài tập & Điểm số quá trình</strong>
          </div>
        </div>

        <table className="student-table">
          <thead>
            <tr>
              <th>Tên bài tập / Hoạt động</th>
              <th>Loại</th>
              <th>Hạn nộp</th>
              <th>Ngày nộp</th>
              <th>Trạng thái</th>
              <th>Điểm số</th>
              <th>Nhận xét của Giảng viên</th>
            </tr>
          </thead>
          <tbody>
            {assignmentTopics.length === 0 ? (
              <tr>
                <td colSpan="7" style={{ textAlign: "center", color: "#66736b", padding: "24px" }}>
                  Môn học này hiện chưa có bài tập nào.
                </td>
              </tr>
            ) : (
              assignmentTopics.map((item) => (
                <tr key={item.id}>
                  <td>
                    <div style={{ fontWeight: "700", color: "#17221d" }}>{item.title}</div>
                  </td>
                  <td>
                    <span className="dlu-badge dlu-badge--green">
                      {item.type === "quiz" ? "Trắc nghiệm" : "Tự luận"}
                    </span>
                  </td>
                  <td>
                    <span style={{ color: "#66736b", fontSize: "11px" }}>{item.dueDate || "—"}</span>
                  </td>
                  <td>
                    <span style={{ color: "#66736b", fontSize: "11px" }}>{item.submittedAt || "—"}</span>
                  </td>
                  <td>
                    {item.submissionStatus === "submitted" ? (
                      <span className={`dlu-badge ${item.isSubmittedOnTime ? "dlu-badge--green" : "dlu-badge--orange"}`}>
                        {item.isSubmittedOnTime ? "✓ Đúng hạn" : "⚠️ Nộp trễ"}
                      </span>
                    ) : (
                      <span className="dlu-badge dlu-badge--red">Chưa nộp</span>
                    )}
                  </td>
                  <td>
                    <strong style={{ color: item.grade >= 7 ? "#37883e" : "#e66d1e" }}>
                      {item.grade !== null ? `${item.grade}/${item.maxGrade || 10}` : "Chờ chấm"}
                    </strong>
                  </td>
                  <td>
                    <span style={{ color: "#66736b", fontStyle: item.feedback ? "normal" : "italic" }}>
                      {item.feedback || "Chưa có nhận xét"}
                    </span>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* 4. LEARNING RESOURCES TABLE */}
      {resourceTopics.length > 0 && (
        <div className="student-table-card" style={{ marginTop: "20px" }}>
          <div className="section-title">
            <div className="left">
              <FileText size={18} style={{ color: "#37883e" }} />
              <strong>Học liệu & Tài nguyên học tập môn học</strong>
            </div>
          </div>

          <table className="student-table">
            <thead>
              <tr>
                <th>Tên học liệu</th>
                <th>Phân loại</th>
                <th>Mô tả tóm tắt</th>
                <th>Trạng thái</th>
              </tr>
            </thead>
            <tbody>
              {resourceTopics.map((res) => (
                <tr key={res.id}>
                  <td style={{ fontWeight: "700", color: "#17221d" }}>{res.title}</td>
                  <td>
                    <span className="dlu-badge dlu-badge--green">
                      {res.type === "resource" ? "Slide / PDF" : res.type === "page" ? "Trang hướng dẫn" : "Liên kết ngoài"}
                    </span>
                  </td>
                  <td style={{ color: "#66736b" }}>{res.description || "Tài liệu học tập chính thức của học phần."}</td>
                  <td>
                    <span className="dlu-badge dlu-badge--green">Đã đồng bộ DW</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </main>
  );
}
