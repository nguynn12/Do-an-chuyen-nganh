import React, { useState, useEffect } from "react";
import { useParams, useSearchParams, useNavigate } from "react-router-dom";
import {
  BookOpen,
  Shuffle,
  Layers,
  ClipboardCheck,
  BarChart3,
  GraduationCap,
  Sparkles,
  ChevronDown,
} from "lucide-react";
import Header from "../components/Header";
import Sidebar from "../components/Sidebar";
import AssignmentBankTab from "../components/assignment/AssignmentBankTab";
import RandomCampaignTab from "../components/assignment/RandomCampaignTab";
import CampaignListTab from "../components/assignment/CampaignListTab";
import GradingTab from "../components/assignment/GradingTab";
import AssignmentPowerBITab from "../components/assignment/AssignmentPowerBITab";
import { getTeacher, getTeacherCourses } from "../services/teacherApi";
import "../styles/AssignmentManagement.css";

export default function AssignmentManagement() {
  const { courseId: paramCourseId } = useParams();
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();

  // Active Tab: bank | campaign | history | grading | analytics
  const tabFromUrl = searchParams.get("tab") || "grading";
  const [activeTab, setActiveTab] = useState(tabFromUrl);

  const [teacher, setTeacher] = useState(null);
  const [courses, setCourses] = useState([]);
  const [selectedCourse, setSelectedCourse] = useState(null);
  const [selectedCohort, setSelectedCohort] = useState("K47");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const teacherId = Number(localStorage.getItem("currentTeacherId")) || 1;

  // Sync tab with URL
  const handleTabChange = (tabKey) => {
    setActiveTab(tabKey);
    setSearchParams({ tab: tabKey });
  };

  // 1. TẢI THÔNG TIN GIẢNG VIÊN VÀ DANH SÁCH MÔN HỌC
  useEffect(() => {
    let cancelled = false;

    async function loadInitialData() {
      try {
        setLoading(true);
        setError("");

        const [teacherData, coursesData] = await Promise.all([
          getTeacher(teacherId),
          getTeacherCourses(teacherId),
        ]);

        if (cancelled) return;

        setTeacher({
          id: teacherData.Moodle_User_ID,
          userKey: teacherData.User_Key,
          username: teacherData.Username,
          name: teacherData.Full_Name,
          fullName: teacherData.Full_Name,
          email: teacherData.Email,
          role: teacherData.Primary_Role,
          initials: "GV",
        });

        const courseList = coursesData || [];
        setCourses(courseList);

        // Chọn môn học mặc định từ URL hoặc môn đầu tiên
        if (paramCourseId) {
          const matched = courseList.find(
            (c) => String(c.Moodle_Course_ID) === String(paramCourseId)
          );
          setSelectedCourse(matched || courseList[0] || null);
        } else if (courseList.length > 0) {
          setSelectedCourse(courseList[0]);
        }
      } catch (err) {
        console.error("Lỗi khởi tạo AssignmentManagement:", err);
        if (!cancelled) {
          setError(err.message || "Không thể tải thông tin khóa học của giảng viên.");
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    loadInitialData();

    return () => {
      cancelled = true;
    };
  }, [teacherId, paramCourseId]);

  // Xử lý đổi môn từ dropdown
  const handleSelectCourse = (e) => {
    const cid = e.target.value;
    const found = courses.find((c) => String(c.Moodle_Course_ID) === String(cid));
    if (found) {
      setSelectedCourse(found);
      // Giữ tab hiện tại khi đổi môn
      navigate(`/quan-ly-bai-tap/${found.Moodle_Course_ID}?tab=${activeTab}`);
    }
  };

  if (loading) {
    return (
      <div className="assign-page-loading">
        <div className="assign-spinner-large" />
        <strong>Đang tải Quản lý bài tập & Chấm điểm...</strong>
        <p>Đồng bộ dữ liệu giảng viên và khóa học DLU</p>
      </div>
    );
  }

  if (error || !selectedCourse) {
    return (
      <div className="assign-page-error">
        <h2>Không thể tải module Quản lý bài tập</h2>
        <p>{error || "Không tìm thấy thông tin môn học phù hợp."}</p>
        <button
          type="button"
          className="assign-btn assign-btn-primary"
          onClick={() => navigate("/")}
        >
          Quay lại Bảng điều khiển
        </button>
      </div>
    );
  }

  return (
    <div className="app">
      {/* HEADER */}
      <Header teacher={teacher} />

      {/* SIDEBAR */}
      <Sidebar />

      {/* MAIN CONTENT */}
      <main className="assignment-management-layout">
        <div className="assignment-page-container">
          {/* 1. HERO BANNER */}
          <section className="assignment-hero-card">
            <div className="hero-content-group">
              <div className="hero-badge-icon">
                <ClipboardCheck size={28} />
              </div>
              <div className="hero-titles">
                <div className="hero-breadcrumbs">
                  <span>Hệ thống LMS</span>
                  <span>/</span>
                  <strong>Quản lý bài tập & Chấm điểm</strong>
                </div>
                <h1>Quản lý bài tập, Phân bổ ngẫu nhiên & Chấm điểm</h1>
                <p>
                  Thiết lập ngân hàng bài tập, cấu hình đợt giao bài ngẫu nhiên theo phân bố độ khó
                  và thực hiện chấm điểm trực tiếp đồng bộ với hệ thống LMS Đại học Đà Lạt.
                </p>
              </div>
            </div>

            {/* SELECTOR BAR: COURSE & COHORT */}
            <div className="hero-selectors-card">
              <div className="selector-item">
                <label>Môn học đang chọn:</label>
                <div className="selector-select-wrap">
                  <BookOpen size={16} />
                  <select
                    value={selectedCourse.Moodle_Course_ID}
                    onChange={handleSelectCourse}
                  >
                    {courses.map((c) => (
                      <option key={c.Moodle_Course_ID} value={c.Moodle_Course_ID}>
                        {c.Course_Code} - {c.Course_Name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="selector-item">
                <label>Khóa tuyển sinh:</label>
                <div className="selector-select-wrap">
                  <GraduationCap size={16} />
                  <select
                    value={selectedCohort}
                    onChange={(e) => setSelectedCohort(e.target.value)}
                  >
                    <option value="K47">Khóa K47 (2023 - 2027)</option>
                    <option value="K46">Khóa K46 (2022 - 2026)</option>
                    <option value="K45">Khóa K45 (2021 - 2025)</option>
                  </select>
                </div>
              </div>
            </div>
          </section>

          {/* 2. UNIFIED TABS BAR (5 TABS) */}
          <nav className="assign-tabs-nav">
            <button
              type="button"
              className={`assign-tab-btn ${activeTab === "bank" ? "active" : ""}`}
              onClick={() => handleTabChange("bank")}
            >
              <BookOpen size={18} />
              <span>Ngân hàng bài tập</span>
            </button>

            <button
              type="button"
              className={`assign-tab-btn ${activeTab === "campaign" ? "active" : ""}`}
              onClick={() => handleTabChange("campaign")}
            >
              <Shuffle size={18} />
              <span>Tạo đợt giao & Random</span>
            </button>

            <button
              type="button"
              className={`assign-tab-btn ${activeTab === "history" ? "active" : ""}`}
              onClick={() => handleTabChange("history")}
            >
              <Layers size={18} />
              <span>Đợt bài đã giao</span>
            </button>

            <button
              type="button"
              className={`assign-tab-btn tab-highlight ${activeTab === "grading" ? "active" : ""}`}
              onClick={() => handleTabChange("grading")}
            >
              <ClipboardCheck size={18} />
              <span>Bài nộp & Chấm điểm</span>
              <span className="tab-pill-accent">Ưu tiên</span>
            </button>

            <button
              type="button"
              className={`assign-tab-btn ${activeTab === "analytics" ? "active" : ""}`}
              onClick={() => handleTabChange("analytics")}
            >
              <BarChart3 size={18} />
              <span>Phân tích Power BI</span>
            </button>
          </nav>

          {/* 3. ACTIVE TAB PANEL */}
          <div className="assign-panel-wrapper">
            {activeTab === "bank" && (
              <AssignmentBankTab
                teacherId={teacherId}
                selectedCourse={selectedCourse}
                courses={courses}
              />
            )}

            {activeTab === "campaign" && (
              <RandomCampaignTab
                teacherId={teacherId}
                selectedCourse={selectedCourse}
                onCampaignCreated={() => handleTabChange("history")}
              />
            )}

            {activeTab === "history" && (
              <CampaignListTab
                teacherId={teacherId}
                selectedCourse={selectedCourse}
              />
            )}

            {activeTab === "grading" && (
              <GradingTab
                teacherId={teacherId}
                selectedCourse={selectedCourse}
                courses={courses}
                onCourseChange={(c) => setSelectedCourse(c)}
              />
            )}

            {activeTab === "analytics" && (
              <AssignmentPowerBITab
                selectedCourse={selectedCourse}
                cohort={selectedCohort}
              />
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
