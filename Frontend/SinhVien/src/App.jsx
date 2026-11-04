import { useEffect, useState } from "react";
import {
  Navigate,
  Outlet,
  Route,
  Routes,
  useLocation,
  useNavigate,
  useOutletContext,
} from "react-router-dom";
import "./styles/StudentDashboard.css";

import StudentSidebar from "./components/StudentSidebar";
import StudentHeader from "./components/StudentHeader";
import StudentProtectedRoute from "./components/StudentProtectedRoute";

import StudentLogin from "./pages/StudentLogin";
import StudentOverview from "./pages/StudentOverview";
import StudentCourses from "./pages/StudentCourses";
import StudentCourseDetail from "./pages/StudentCourseDetail";
import StudentSubmissions from "./pages/StudentSubmissions";
import StudentGrades from "./pages/StudentGrades";
import StudentEngagement from "./pages/StudentEngagement";
import StudentAnalytics from "./pages/StudentAnalytics";
import StudentBehavior from "./pages/StudentBehavior";

import { studentGet } from "./services/apiClient";
import { getStudentUserId } from "./services/studentAuth";

/**
 * Layout cha dùng chung cho toàn bộ Cổng Sinh viên.
 * Duy trì StudentHeader và StudentSidebar liên tục (không unmount khi đổi trang).
 * Tải dữ liệu chung và chia sẻ qua Outlet Context.
 */
function StudentLayout() {
  const navigate = useNavigate();
  const location = useLocation();

  const isDemo =
    (import.meta.env.DEV === true || import.meta.env.VITE_ALLOW_DEMO === "true") &&
    new URLSearchParams(window.location.search).get("demo") === "1";

  const [summary, setSummary] = useState(
    isDemo
      ? {
          student: {
            fullName: "Trần Thị Bình",
            cohort: "CTK47B",
            studentCode: "sv2310002",
            currentSemester: "Học kỳ 1 (2026-2027)",
          },
          kpis: {
            totalCourses: 2,
            totalAssignments: 4,
            submittedAssignments: 4,
            pendingAssignments: 0,
            averageGrade: 7.8,
            averagePercentage: 78,
            totalEngagementHours: 205.2,
            punctualityScore: 85,
          },
        }
      : null
  );
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(!isDemo);
  const [error, setError] = useState(null);
  const studentUserKey = getStudentUserId();

  // Chuyển hướng tương thích nếu URL còn hash cũ từ phiên bản trước
  useEffect(() => {
    const hash = window.location.hash;
    if (!hash) return;

    const courseMatch = hash.match(/^#course-(.+)$/);
    if (courseMatch) {
      window.history.replaceState(null, "", window.location.pathname);
      navigate(`/khoa-hoc/${courseMatch[1]}`, { replace: true });
      return;
    }

    const cleanHash = hash.replace("#", "");
    const HASH_MAP = {
      overview: "/",
      courses: "/khoa-hoc",
      behavior: "/ho-so-hanh-vi",
      "hanh-vi": "/ho-so-hanh-vi",
      submissions: "/bai-nop",
      grades: "/bang-diem",
      engagement: "/thoi-gian-hoc",
      analytics: "/phan-tich",
    };

    if (HASH_MAP[cleanHash]) {
      window.history.replaceState(null, "", window.location.pathname);
      navigate(HASH_MAP[cleanHash], { replace: true });
    }
  }, [navigate, location]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        setError(null);
        const [sumData, crsData] = await Promise.all([
          studentGet("/dashboard-summary"),
          studentGet("/courses"),
        ]);

        if (sumData) {
          setSummary(sumData);
        }

        setCourses(Array.isArray(crsData) ? crsData : []);
      } catch (err) {
        console.error("Lỗi nạp dữ liệu dashboard sinh viên:", err);
        setError(err.message || "Không thể nạp dữ liệu học tập từ hệ thống.");
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [studentUserKey]);

  return (
    <div className="app">
      <StudentHeader student={summary?.student} />

      <StudentSidebar />

      {loading ? (
        <main className="page-full" role="status" aria-live="polite">
          <div className="welcome-card dlu-state-card">
            <div className="dlu-state-spinner" aria-hidden="true" />
            <div className="dlu-state-title">
              Đang đồng bộ dữ liệu từ Data Warehouse...
            </div>
            <div className="dlu-state-desc">Vui lòng đợi trong giây lát.</div>
          </div>
        </main>
      ) : error ? (
        <main className="page-full" role="alert">
          <div className="welcome-card dlu-state-card">
            <div
              className="dlu-state-title"
              style={{ color: "var(--dlu-red, #c53030)" }}
            >
              Không thể tải dữ liệu học tập
            </div>
            <div className="dlu-state-desc">{error}</div>
            <button
              type="button"
              className="dlu-retry-btn"
              onClick={() => window.location.reload()}
            >
              Tải lại trang
            </button>
          </div>
        </main>
      ) : (
        <Outlet context={{ summary, courses, loading, error }} />
      )}
    </div>
  );
}

// Wrapper component cho trang Tổng quan
function StudentOverviewWrapper() {
  const { summary, courses } = useOutletContext();
  const navigate = useNavigate();

  return (
    <StudentOverview
      summary={summary}
      courses={courses}
      onNavigateToCourse={(courseId) => navigate(`/khoa-hoc/${courseId}`)}
      onNavigateToTab={(tabId) => {
        const PATH_MAP = {
          overview: "/",
          courses: "/khoa-hoc",
          behavior: "/ho-so-hanh-vi",
          submissions: "/bai-nop",
          grades: "/bang-diem",
          engagement: "/thoi-gian-hoc",
          analytics: "/phan-tich",
        };
        navigate(PATH_MAP[tabId] || "/");
      }}
    />
  );
}

// Wrapper component cho trang Khóa học
function StudentCoursesWrapper() {
  const { courses } = useOutletContext();
  const navigate = useNavigate();

  return (
    <StudentCourses
      courses={courses}
      onNavigateToCourse={(courseId) => navigate(`/khoa-hoc/${courseId}`)}
    />
  );
}

export default function App() {
  return (
    <Routes>
      {/* Route Đăng nhập độc lập */}
      <Route path="/dang-nhap" element={<StudentLogin />} />

      {/* Route cha StudentLayout bọc bởi StudentProtectedRoute */}
      <Route
        element={
          <StudentProtectedRoute>
            <StudentLayout />
          </StudentProtectedRoute>
        }
      >
        <Route index element={<StudentOverviewWrapper />} />
        <Route path="khoa-hoc" element={<StudentCoursesWrapper />} />
        <Route path="khoa-hoc/:courseId" element={<StudentCourseDetail />} />
        <Route path="ho-so-hanh-vi" element={<StudentBehavior />} />
        <Route path="bai-nop" element={<StudentSubmissions />} />
        <Route path="bang-diem" element={<StudentGrades />} />
        <Route path="thoi-gian-hoc" element={<StudentEngagement />} />
        <Route path="phan-tich" element={<StudentAnalytics />} />
      </Route>

      {/* Điều hướng 404 về trang chủ */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
