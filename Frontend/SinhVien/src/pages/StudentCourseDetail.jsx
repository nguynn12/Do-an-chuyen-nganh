import React, { useEffect, useState, useMemo } from "react";
import { studentGet } from "../services/apiClient";
import PowerBIEmbed from "../components/PowerBIEmbed";
import "../styles/course-detail.css";
import {
  ArrowLeft,
  Award,
  BookOpen,
  Calendar,
  CheckCircle2,
  Clock3,
  AlertCircle,
  FileText,
  GraduationCap,
  FlaskConical,
} from "lucide-react";

// Ánh xạ chính xác 4 mã pageName thật từ Power BI Service
const POWERBI_PAGE_MAP = {
  CS301: {
    compare: "448f23014055298dc25a",   // Trang 1: CSDL - So sánh điểm
    simulator: "fd3a98cce47b2e1b21cd", // Trang 2: CSDL - Dự báo điểm
  },
  WEB302: {
    compare: "5cf015f0b26bd95b09a1",   // Trang 3: Web - So sánh điểm
    simulator: "c7c6f6b5d0b2617070c1", // Trang 4: Web - Dự báo điểm
  },
};

export default function StudentCourseDetail({ courseId, onBack }) {
  const [courseData, setCourseData] = useState(null);
  const [allSubmissions, setAllSubmissions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const BASE_POWERBI_URL =
    "https://app.powerbi.com/view?r=eyJrIjoiNjRmYTA4ZDgtYmZlNS00MDNjLTliNGUtNjJkMTJmZWE1MDZkIiwidCI6Ijg0NTAzNjliLTExZmEtNDQxMy04ZGM3LTA2MGFiOWYzNGY0MSIsImMiOjEwfQ%3D%3D";

  useEffect(() => {
    if (!courseId) return;
    setLoading(true);
    setError(null);

    Promise.all([
      studentGet(`/courses/${courseId}`).catch((err) => {
        console.error("Lỗi getCourseDetail:", err);
        return null;
      }),
      studentGet("/submissions").catch((err) => {
        console.error("Lỗi getSubmissions:", err);
        return { data: [] };
      }),
    ])
      .then(([courseRes, subRes]) => {
        if (courseRes?.course) {
          setCourseData(courseRes.course);
        } else {
          setError("Không tìm thấy thông tin khóa học.");
        }

        if (subRes?.data) {
          setAllSubmissions(subRes.data);
        }
      })
      .catch((err) => {
        console.error("Lỗi nạp dữ liệu môn học:", err);
        setError("Không thể kết nối đến máy chủ.");
      })
      .finally(() => setLoading(false));
  }, [courseId]);

  // Link nhúng 1: Trang Dự báo điểm theo từng môn (Trang 2 cho CSDL, Trang 4 cho Web)
  const simulatorReportUrl = useMemo(() => {
    const code = (courseData?.code || "CS301").toUpperCase();
    const pages = POWERBI_PAGE_MAP[code] || POWERBI_PAGE_MAP.CS301;
    return `${BASE_POWERBI_URL}&pageName=${pages.simulator}`;
  }, [courseData?.code]);

  // Link nhúng 2: Trang So sánh điểm theo từng môn (Trang 1 cho CSDL, Trang 3 cho Web)
  const compareReportUrl = useMemo(() => {
    const code = (courseData?.code || "CS301").toUpperCase();
    const pages = POWERBI_PAGE_MAP[code] || POWERBI_PAGE_MAP.CS301;
    return `${BASE_POWERBI_URL}&pageName=${pages.compare}`;
  }, [courseData?.code]);

  // Lọc danh sách bài Lab
  const labTasks = useMemo(() => {
    if (!courseData) return [];

    const matched = allSubmissions.filter((s) => {
      const matchCode =
        courseData.code &&
        s.Course_Code?.trim().toLowerCase() === courseData.code?.trim().toLowerCase();
      const matchName =
        courseData.title &&
        s.Course_Name?.trim().toLowerCase() === courseData.title?.trim().toLowerCase();
      const matchKey =
        s.Course_Key && String(s.Course_Key) === String(courseId);

      return matchCode || matchName || matchKey;
    });

    if (matched.length > 0) {
      return matched.map((s, idx) => ({
        id: s.Submission_Key || s.Activity_Key || `sub-${idx}`,
        title: s.Activity_Name || "Bài thực hành Lab",
        dueDate: s.Due_Date || "—",
        submittedAt: s.Submit_Date || "—",
        submissionStatus: s.Submission_Status || (s.Submit_Date ? "submitted" : "unsubmitted"),
        isSubmittedOnTime: s.Is_Submitted_On_Time === 1,
        isLate: s.Is_Submitted_On_Time === 0,
        grade: s.Grade !== null && s.Grade !== undefined && s.Grade !== "" ? Number(s.Grade) : null,
        feedback: s.Feedback_Comment,
      }));
    }

    const fallbackAssignments =
      courseData.assignments ||
      courseData.topics?.flatMap((t) => t.items || t.modules || []) ||
      [];

    return fallbackAssignments
      .filter((item) => {
        const title = (item.title || item.name || "").toLowerCase();
        return (
          title.includes("lab") ||
          title.includes("bài tập") ||
          title.includes("thực hành") ||
          item.type === "assign" ||
          item.dueDate ||
          item.grade !== undefined
        );
      })
      .map((item, idx) => ({
        id: item.id || `fb-${idx}`,
        title: item.title || item.name,
        dueDate: item.dueDate || item.Due_Date || "—",
        submittedAt: item.submittedAt || item.Submit_Date || "—",
        submissionStatus: item.submissionStatus || item.Submission_Status || "unsubmitted",
        isSubmittedOnTime: item.isSubmittedOnTime ?? (item.Is_Submitted_On_Time === 1),
        isLate: item.isLate ?? (item.Is_Submitted_On_Time === 0),
        grade: item.grade !== null && item.grade !== undefined ? Number(item.grade) : null,
        feedback: item.feedback || item.Feedback_Comment,
      }));
  }, [allSubmissions, courseData, courseId]);

  const totalLabs = labTasks.length;
  const submittedLabs = labTasks.filter(
    (a) => a.submissionStatus === "submitted" || (a.submittedAt && a.submittedAt !== "—")
  ).length;
  const gradedLabs = labTasks.filter((a) => a.grade !== null && !isNaN(a.grade));
  const avgLabGrade = useMemo(() => {
    if (gradedLabs.length === 0) return null;
    const total = gradedLabs.reduce((sum, item) => sum + item.grade, 0);
    return (total / gradedLabs.length).toFixed(1);
  }, [gradedLabs]);

  const hasLateSubmissions = labTasks.some(
    (a) => a.submissionStatus === "submitted" && a.isLate
  );

  const resourceTopics =
    courseData?.topics?.find((t) => t.id === "resources")?.items || [];

  if (loading) {
    return (
      <main className="page-full">
        <div className="welcome-card welcome-card--center">
          Đang tải dữ liệu phân tích chi tiết môn học từ Data Warehouse...
        </div>
      </main>
    );
  }

  if (error || !courseData) {
    return (
      <main className="page-full">
        <div className="welcome-card welcome-card--error">
          <AlertCircle size={36} className="welcome-card__error-icon" />
          <div className="welcome-card__error-title">
            {error || "Lỗi tải môn học"}
          </div>
          <button className="btn-dlu-secondary" onClick={onBack}>
            <ArrowLeft size={16} /> Quay lại danh sách môn học
          </button>
        </div>
      </main>
    );
  }

  return (
    <main className="page-full">
      {/* 1. THANH TIÊU ĐỀ MÔN HỌC */}
      <div className="course-detail-header">
        <button
          type="button"
          className="btn-dlu-secondary course-detail-back-btn"
          onClick={onBack}
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
              <span className="courses-hero-kicker">CHI TIẾT TIẾN ĐỘ &amp; DỰ BÁO ĐIỂM</span>
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

      {/* 2. CHỈ SỐ TỔNG QUAN HỌC PHẦN */}
      <div className="summary-grid course-detail-metrics">
        <div className="summary-item summary-green">
          <div className="summary-icon">
            <Award size={22} />
          </div>
          <div className="summary-content">
            <span>Điểm TB Lab (Thực tế)</span>
            <strong>{avgLabGrade ? `${avgLabGrade}/10` : "Chưa có"}</strong>
            <small>{gradedLabs.length}/{totalLabs} bài đã có điểm</small>
          </div>
        </div>

        <div className="summary-item summary-orange">
          <div className="summary-icon">
            <FlaskConical size={22} />
          </div>
          <div className="summary-content">
            <span>Tiến độ bài Lab</span>
            <strong>{submittedLabs}/{totalLabs} bài</strong>
            <small>
              {totalLabs === 0
                ? "Môn không có Lab"
                : submittedLabs === totalLabs
                ? "Đã nộp đầy đủ"
                : "Còn bài chưa nộp"}
            </small>
          </div>
        </div>

        <div className="summary-item summary-blue">
          <div className="summary-icon">
            <Clock3 size={22} />
          </div>
          <div className="summary-content">
            <span>Tình trạng nộp</span>
            <strong>{hasLateSubmissions ? "Có bài trễ hạn" : "Đúng tiến độ"}</strong>
            <small>Căn cứ thời gian nộp LMS</small>
          </div>
        </div>

        <div className="summary-item summary-light">
          <div className="summary-icon">
            <FileText size={22} />
          </div>
          <div className="summary-content">
            <span>Tài liệu môn học</span>
            <strong>{resourceTopics.length} học liệu</strong>
            <small>Slide &amp; Hướng dẫn thực hành</small>
          </div>
        </div>
      </div>

      {/* 3. PHẦN 1 POWER BI: DỰ BÁO KẾT QUẢ & MỤC TIÊU QUA MÔN */}
      <div className="course-detail-pbi-wrapper" style={{ marginTop: "24px" }}>
        <PowerBIEmbed
          title={`LMS Analytics - Dự báo kết quả & Mục tiêu môn học (${courseData.code})`}
          reportUrl={simulatorReportUrl}
          height="540px"
        />
      </div>

      {/* 4. PHẦN 2 POWER BI: SO SÁNH ĐIỂM VỚI LỚP */}
      <div className="course-detail-pbi-wrapper" style={{ marginTop: "24px" }}>
        <PowerBIEmbed
          title={`Phổ điểm & So sánh bài thực hành với trung bình lớp (${courseData.code})`}
          reportUrl={compareReportUrl}
          height="500px"
        />
      </div>

      {/* 5. BẢNG CHI TIẾT BÀI LAB */}
      <div className="student-table-card" style={{ marginTop: "24px" }}>
        <div className="section-title">
          <div className="left">
            <FlaskConical size={18} className="grade-high" />
            <strong>Danh sách bài thực hành Lab theo học phần</strong>
          </div>
        </div>

        <table className="student-table">
          <thead>
            <tr>
              <th>Tên bài thực hành / Lab</th>
              <th>Hạn chót</th>
              <th>Thời gian nộp</th>
              <th>Trạng thái nộp</th>
              <th>Điểm số</th>
              <th>Ghi chú / Nhận xét</th>
            </tr>
          </thead>
          <tbody>
            {totalLabs === 0 ? (
              <tr>
                <td colSpan="6" className="table-empty-cell">
                  <AlertCircle size={28} className="table-empty-icon" />
                  <div>Môn học này hiện không có bài thực hành (Lab) hoặc chưa phân bổ trên hệ thống LMS.</div>
                </td>
              </tr>
            ) : (
              labTasks.map((item) => {
                const isNotSubmitted =
                  item.submissionStatus !== "submitted" && (!item.submittedAt || item.submittedAt === "—");
                const isLate = !isNotSubmitted && item.isLate;
                const isGraded = item.grade !== null && !isNaN(item.grade);

                return (
                  <tr key={item.id}>
                    <td>
                      <div className="table-item-title">{item.title}</div>
                    </td>
                    <td>
                      <span className="table-item-subtext">{item.dueDate}</span>
                    </td>
                    <td>
                      <span className="table-item-subtext">{item.submittedAt}</span>
                    </td>
                    <td>
                      {isNotSubmitted ? (
                        <span className="dlu-badge dlu-badge--red">Chưa nộp</span>
                      ) : isLate ? (
                        <span className="dlu-badge dlu-badge--orange">⚠️ Nộp muộn</span>
                      ) : (
                        <span className="dlu-badge dlu-badge--green">✓ Đúng hạn</span>
                      )}
                    </td>
                    <td>
                      {isGraded ? (
                        <strong className={item.grade >= 7 ? "grade-high" : "grade-warning"}>
                          {item.grade}/10
                        </strong>
                      ) : isLate ? (
                        <span className="grade-pending-late">Chờ xét điểm (Nộp trễ)</span>
                      ) : isNotSubmitted ? (
                        <span className="grade-none">Chưa có điểm</span>
                      ) : (
                        <span className="grade-pending">Chờ chấm</span>
                      )}
                    </td>
                    <td>
                      <span className="table-item-feedback">
                        {item.feedback || (isLate ? "Cần liên hệ giảng viên kiểm tra bài nộp muộn" : "Chưa có nhận xét")}
                      </span>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </main>
  );
}