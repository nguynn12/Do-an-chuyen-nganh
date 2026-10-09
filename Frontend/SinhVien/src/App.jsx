import { useEffect, useState } from "react";
import { Route, Routes } from "react-router-dom";
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

function StudentShell() {
  const [activeTab, setActiveTab] = useState("overview");
  const [selectedCourseId, setSelectedCourseId] = useState(null);
  const [summary, setSummary] = useState(null);
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(true);
  const studentUserKey = getStudentUserId();

  const parseRoute = (hash) => {
    if (!hash || hash === "#" || hash === "#overview") {
      setActiveTab("overview");
      setSelectedCourseId(null);
      return;
    }

    const courseMatch = hash.match(/^#course-(.+)$/);
    if (courseMatch) {
      setSelectedCourseId(courseMatch[1]);
      setActiveTab("course-detail");
      return;
    }

    const cleanHash = hash.replace("#", "");
    if (cleanHash === "hanh-vi" || cleanHash === "behavior") {
      setActiveTab("behavior");
      setSelectedCourseId(null);
      return;
    }

    if (["courses", "behavior", "submissions", "grades", "engagement", "analytics"].includes(cleanHash)) {
      setActiveTab(cleanHash);
      setSelectedCourseId(null);
      return;
    }

    setActiveTab("overview");
    setSelectedCourseId(null);
  };

  useEffect(() => {
    parseRoute(window.location.hash);

    const handleHashChange = () => parseRoute(window.location.hash);
    window.addEventListener("hashchange", handleHashChange);
    return () => window.removeEventListener("hashchange", handleHashChange);
  }, []);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
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
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [studentUserKey]);

  const handleSelectTab = (tabId) => {
    window.location.hash = tabId === "overview" ? "" : tabId;
  };

  const handleNavigateToCourse = (courseId) => {
    window.location.hash = `course-${courseId}`;
  };

  return (
    <div className="app">
      <StudentHeader student={summary?.student} />

      <StudentSidebar
        activeTab={activeTab === "course-detail" ? "courses" : activeTab}
        onSelectTab={handleSelectTab}
      />

      {loading ? (
        <main className="page-full">
          <div
            className="welcome-card"
            style={{
              padding: "60px",
              textAlign: "center",
              color: "#66736b",
              marginTop: "20px",
            }}
          >
            <div
              style={{
                fontSize: "16px",
                fontWeight: "700",
                marginBottom: "8px",
                color: "#17221d",
              }}
            >
              Đang đồng bộ dữ liệu từ Data Warehouse...
            </div>
            <div style={{ fontSize: "12px" }}>Vui lòng đợi trong giây lát.</div>
          </div>
        </main>
      ) : (
        <>
          {activeTab === "overview" && (
            <StudentOverview
              summary={summary}
              courses={courses}
              onNavigateToCourse={handleNavigateToCourse}
              onNavigateToTab={handleSelectTab}
            />
          )}

          {activeTab === "courses" && (
            <StudentCourses
              courses={courses}
              onNavigateToCourse={handleNavigateToCourse}
            />
          )}

          {activeTab === "course-detail" && (
            <StudentCourseDetail
              courseId={selectedCourseId}
              onBack={() => handleSelectTab("courses")}
            />
          )}

          {activeTab === "behavior" && <StudentBehavior />}

          {activeTab === "submissions" && <StudentSubmissions />}

          {activeTab === "grades" && <StudentGrades />}

          {activeTab === "engagement" && <StudentEngagement />}

          {activeTab === "analytics" && <StudentAnalytics />}
        </>
      )}
    </div>
  );
}

export default function App() {
  return (
    <Routes>
      <Route path="/dang-nhap" element={<StudentLogin />} />
      <Route
        path="/*"
        element={
          <StudentProtectedRoute>
            <StudentShell />
          </StudentProtectedRoute>
        }
      />
    </Routes>
  );
}