import React, { useEffect, useState } from "react";
import "./styles/StudentDashboard.css";

import StudentSidebar from "./components/StudentSidebar";
import StudentHeader from "./components/StudentHeader";

import StudentOverview from "./pages/StudentOverview";
import StudentCourses from "./pages/StudentCourses";
import StudentCourseDetail from "./pages/StudentCourseDetail";
import StudentSubmissions from "./pages/StudentSubmissions";
import StudentGrades from "./pages/StudentGrades";
import StudentEngagement from "./pages/StudentEngagement";

export default function App() {
  const [activeTab, setActiveTab] = useState("overview");
  const [selectedCourseId, setSelectedCourseId] = useState(null);
  const [summary, setSummary] = useState(null);
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(true);

  // Parse route từ window.location.hash
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
    if (["courses", "submissions", "grades", "engagement"].includes(cleanHash)) {
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

  // Fetch initial summary & courses
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const [sumRes, crsRes] = await Promise.all([
          fetch("/api/v1/student/dashboard-summary"),
          fetch("/api/v1/student/courses"),
        ]);

        if (sumRes.ok) {
          const sumData = await sumRes.json();
          setSummary(sumData);
        }

        if (crsRes.ok) {
          const crsData = await crsRes.json();
          setCourses(Array.isArray(crsData) ? crsData : []);
        }
      } catch (err) {
        console.error("Lỗi nạp dữ liệu dashboard sinh viên:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  // Chuyển tab
  const handleSelectTab = (tabId) => {
    window.location.hash = tabId === "overview" ? "" : tabId;
  };

  // Xem chi tiết môn học
  const handleNavigateToCourse = (courseId) => {
    window.location.hash = `course-${courseId}`;
  };

  return (
    <div className="app">
      {/* 1. Header cố định đỉnh màn hình (62px, #17221d, viền #41954c) */}
      <StudentHeader student={summary?.student} />

      {/* 2. Sidebar cố định bên trái (45px, #19201c, icon active #3e8f46) */}
      <StudentSidebar
        activeTab={activeTab === "course-detail" ? "courses" : activeTab}
        onSelectTab={handleSelectTab}
      />

      {/* 3. Nội dung trang */}
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

          {activeTab === "submissions" && <StudentSubmissions />}

          {activeTab === "grades" && <StudentGrades />}

          {activeTab === "engagement" && <StudentEngagement />}
        </>
      )}
    </div>
  );
}