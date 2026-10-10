import React, { useState, useEffect, useMemo } from "react";
import { useSearchParams } from "react-router-dom";
import {
  BarChart3,
  BookOpen,
  GraduationCap,
  Users,
  CheckCircle2,
  AlertTriangle,
  HelpCircle,
  BrainCircuit,
  Sliders,
  UserCheck,
  ShieldCheck,
  CalendarCheck,
  FileSpreadsheet,
  Info,
} from "lucide-react";

import Header from "../components/Header";
import Sidebar from "../components/Sidebar";
import LoadingScreen from "../components/common/LoadingScreen";
import ErrorScreen from "../components/common/ErrorScreen";
import SecurePowerBIReport from "../components/powerbi/SecurePowerBIReport";

import {
  getTeacher,
  getTeacherCourses,
  getCourseStudents,
} from "../services/teacherApi";
import {
  POWER_BI_PAGES_CONFIG,
  DW_COURSE_MAPPING,
} from "../config/powerBiConfig";

import "../styles/Analytics.css";

// 7 Phân hệ báo cáo tương ứng chính xác với 7 trang Power BI
const ANALYTICS_TABS = [
  {
    key: "COURSE_OVERVIEW",
    page: POWER_BI_PAGES_CONFIG.COURSE_OVERVIEW,
    icon: BarChart3,
    badge: "Tổng thể",
  },
  {
    key: "ATTENDANCE",
    page: POWER_BI_PAGES_CONFIG.ATTENDANCE,
    icon: CalendarCheck,
    badge: "Chuyên cần",
  },
  {
    key: "ASSIGNMENT",
    page: POWER_BI_PAGES_CONFIG.ASSIGNMENT,
    icon: FileSpreadsheet,
    badge: "Nộp bài",
  },
  {
    key: "QUIZ",
    page: POWER_BI_PAGES_CONFIG.QUIZ,
    icon: HelpCircle,
    badge: "Phổ điểm & Đề",
  },
  {
    key: "KNOWLEDGE_GAP",
    page: POWER_BI_PAGES_CONFIG.KNOWLEDGE_GAP,
    icon: BrainCircuit,
    badge: "Chủ đề yếu",
  },
  {
    key: "GRADE_SIMULATOR",
    page: POWER_BI_PAGES_CONFIG.GRADE_SIMULATOR,
    icon: Sliders,
    badge: "What-If",
  },
  {
    key: "STUDENT_360",
    page: POWER_BI_PAGES_CONFIG.STUDENT_360,
    icon: UserCheck,
    badge: "Cá nhân",
  },
];

const COHORT_OPTIONS = ["K47", "K46", "K45"];

export default function Analytics() {
  const [searchParams, setSearchParams] = useSearchParams();

  // Tab đang chọn (mặc định lấy từ URL params hoặc COURSE_OVERVIEW)
  const tabFromUrl = searchParams.get("tab") || "COURSE_OVERVIEW";
  const [activeTabKey, setActiveTabKey] = useState(tabFromUrl);

  const [teacher, setTeacher] = useState(null);
  const [courses, setCourses] = useState([]);
  const [selectedCourse, setSelectedCourse] = useState(null);
  const [selectedCohort, setSelectedCohort] = useState("K47");

  // Dành riêng cho tab Student 360
  const [students, setStudents] = useState([]);
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [loadingStudents, setLoadingStudents] = useState(false);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const teacherId = Number(localStorage.getItem("currentTeacherId")) || 1;

  // 1. TẢI THÔNG TIN GIẢNG VIÊN VÀ DANH SÁCH MÔN HỌC THẬT TỪ API
  useEffect(() => {
    let cancelled = false;

    async function loadInitial() {
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

        const list = coursesData || [];
        setCourses(list);

        // Chọn môn học mặc định từ URL hoặc môn đầu tiên
        const courseIdFromUrl = searchParams.get("courseId");
        if (courseIdFromUrl) {
          const found = list.find(
            (c) =>
              String(c.Moodle_Course_ID) === String(courseIdFromUrl) ||
              String(c.Course_Key) === String(courseIdFromUrl)
          );
          setSelectedCourse(found || list[0] || null);
        } else if (list.length > 0) {
          setSelectedCourse(list[0]);
        }
      } catch (err) {
        console.error("Lỗi nạp dữ liệu trang Analytics:", err);
        if (!cancelled) {
          setError(err.message || "Không thể tải dữ liệu phân tích học tập.");
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    loadInitial();

    return () => {
      cancelled = true;
    };
  }, [teacherId, searchParams]);

  // 2. TẢI DANH SÁCH SINH VIÊN KHI Ở TAB STUDENT 360 HOẶC KHI ĐỔI MÔN/KHÓA
  useEffect(() => {
    let cancelled = false;

    async function loadStudents() {
      if (!selectedCourse?.Moodle_Course_ID) return;

      try {
        setLoadingStudents(true);
        const data = await getCourseStudents(
          selectedCourse.Moodle_Course_ID,
          selectedCohort
        );
        if (cancelled) return;

        const studentList = data || [];
        setStudents(studentList);

        // Tự động chọn sinh viên đầu tiên nếu chưa chọn hoặc sinh viên cũ không thuộc khóa mới
        if (studentList.length > 0) {
          setSelectedStudent(studentList[0]);
        } else {
          setSelectedStudent(null);
        }
      } catch (err) {
        console.warn("Không thể tải danh sách sinh viên cho Student 360:", err);
        if (!cancelled) {
          setStudents([]);
          setSelectedStudent(null);
        }
      } finally {
        if (!cancelled) {
          setLoadingStudents(false);
        }
      }
    }

    loadStudents();

    return () => {
      cancelled = true;
    };
  }, [selectedCourse, selectedCohort]);

  // Xử lý chuyển tab
  const handleTabChange = (key) => {
    setActiveTabKey(key);
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      next.set("tab", key);
      return next;
    });
  };

  // Lấy cấu hình tab hiện tại
  const currentTab = useMemo(() => {
    return (
      ANALYTICS_TABS.find((t) => t.key === activeTabKey) || ANALYTICS_TABS[0]
    );
  }, [activeTabKey]);

  // Xác định Course_Key thực tế trong Data Warehouse
  const effectiveCourseKey = useMemo(() => {
    if (!selectedCourse) return 10;
    return (
      selectedCourse.Course_Key ||
      selectedCourse.courseKey ||
      (DW_COURSE_MAPPING[selectedCourse.Moodle_Course_ID] ? selectedCourse.Moodle_Course_ID : 10)
    );
  }, [selectedCourse]);

  if (loading) {
    return <LoadingScreen message="Đang nạp Trung tâm Phân tích Học tập Power BI..." />;
  }

  if (error || !selectedCourse) {
    return (
      <ErrorScreen
        message={error || "Không tìm thấy dữ liệu khóa học để phân tích."}
      />
    );
  }

  return (
    <div className="app">
      {/* HEADER */}
      <Header teacher={teacher} />

      {/* SIDEBAR */}
      <Sidebar />

      {/* MAIN CONTENT */}
      <main className="analytics-layout">
        <div className="analytics-page">
          {/* 1. TOP HEADER & FILTER BAR */}
          <section className="analytics-header-card">
            <div className="analytics-title-group">
              <div className="analytics-icon-badge">
                <BarChart3 size={26} />
              </div>
              <div>
                <h1>Trung tâm Phân tích Học tập Toàn diện (Power BI)</h1>
                <p>
                  Theo dõi tương tác, tiến độ bài tập, kết quả Quiz, lỗ hổng kiến thức và hồ sơ 360 độ sinh viên
                  trên mô hình Data Warehouse <code>lms_datawarehouse</code>.
                </p>
              </div>
            </div>

            {/* BỘ LỌC ĐỒNG BỘ: MÔN HỌC & KHÓA & SINH VIÊN */}
            <div className="analytics-selectors-panel">
              {/* Chọn Môn học */}
              <div className="analytics-selector-box">
                <label>Môn học phân tích:</label>
                <div className="selector-inner">
                  <BookOpen size={15} />
                  <select
                    value={selectedCourse.Moodle_Course_ID}
                    onChange={(e) => {
                      const found = courses.find(
                        (c) => String(c.Moodle_Course_ID) === String(e.target.value)
                      );
                      if (found) setSelectedCourse(found);
                    }}
                  >
                    {courses.map((c) => (
                      <option key={c.Moodle_Course_ID} value={c.Moodle_Course_ID}>
                        {c.Course_Code} — {c.Course_Name} (Key: {c.Course_Key || c.Moodle_Course_ID})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Chọn Khóa học */}
              <div className="analytics-selector-box">
                <label>Khóa tuyển sinh:</label>
                <div className="selector-inner">
                  <GraduationCap size={15} />
                  <select
                    value={selectedCohort}
                    onChange={(e) => setSelectedCohort(e.target.value)}
                  >
                    {COHORT_OPTIONS.map((coh) => (
                      <option key={coh} value={coh}>
                        Khóa {coh}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Chọn Sinh viên (hiển thị khi ở tab Student 360) */}
              {activeTabKey === "STUDENT_360" && (
                <div className="analytics-selector-box student-selector-box">
                  <label>Chọn sinh viên (360):</label>
                  <div className="selector-inner">
                    <Users size={15} />
                    <select
                      value={selectedStudent?.User_Key || selectedStudent?.Username || ""}
                      onChange={(e) => {
                        const val = e.target.value;
                        const found = students.find(
                          (s) =>
                            String(s.User_Key) === String(val) ||
                            String(s.Username) === String(val)
                        );
                        setSelectedStudent(found || null);
                      }}
                      disabled={loadingStudents || students.length === 0}
                    >
                      {students.length === 0 ? (
                        <option value="">Không có sinh viên trong khóa này</option>
                      ) : (
                        students.map((s) => (
                          <option
                            key={s.User_Key || s.Moodle_User_ID || s.Username}
                            value={s.User_Key || s.Username}
                          >
                            {s.Username} — {s.Full_Name || s.fullName} (User_Key: {s.User_Key || s.id})
                          </option>
                        ))
                      )}
                    </select>
                  </div>
                </div>
              )}
            </div>
          </section>

          {/* 2. THANH ĐIỀU HƯỚNG 7 PHÂN HỆ PHÂN TÍCH (TƯƠNG ỨNG 7 TRANG PBIX) */}
          <nav className="analytics-tabs-bar">
            {ANALYTICS_TABS.map((tab) => {
              const Icon = tab.icon;
              const isActive = tab.key === activeTabKey;
              return (
                <button
                  key={tab.key}
                  type="button"
                  className={`analytics-tab-btn ${isActive ? "active" : ""}`}
                  onClick={() => handleTabChange(tab.key)}
                  title={tab.page.description}
                >
                  <Icon size={16} />
                  <span className="tab-label">{tab.page.label}</span>
                  <span className="tab-badge">{tab.badge}</span>
                </button>
              );
            })}
          </nav>

          {/* 3. CONTEXT NOTICE GIẢI THÍCH MỤC ĐÍCH TỪNG PHÂN HỆ */}
          <div className="analytics-context-banner">
            <div className="context-banner-icon">
              <Info size={17} />
            </div>
            <div className="context-banner-text">
              <strong>Trang báo cáo Power BI: <code>{currentTab.page.displayName}</code></strong>
              <p>
                {activeTabKey === "QUIZ" && (
                  <span>
                    <strong>Phân tích Quiz & Câu hỏi:</strong> Theo dõi tổng số bài Quiz, lượt trả lời, tỷ lệ đúng/sai, phổ điểm trung bình và phát hiện các câu hỏi sinh viên sai nhiều nhất để kịp thời giải đáp trên lớp.
                  </span>
                )}
                {activeTabKey === "KNOWLEDGE_GAP" && (
                  <span>
                    <strong>Phân tích Lỗ hổng kiến thức:</strong> Xác định các chủ đề kiến thức (<code>Knowledge_Topic</code>) có tỷ lệ sai cao nhất, trực quan hóa sơ đồ cây phân rã nguyên nhân và bảng nhiệt (Heatmap) từng sinh viên gặp khó khăn.
                  </span>
                )}
                {activeTabKey === "COURSE_OVERVIEW" && (
                  <span>
                    <strong>Tổng quan môn học:</strong> Các chỉ số KPI tổng thể, điểm sức khỏe môn học (Course Health Score), biểu đồ tương tác thời gian thực và phân loại nhóm sinh viên cần hỗ trợ.
                  </span>
                )}
                {activeTabKey === "ATTENDANCE" && (
                  <span>
                    <strong>Điểm danh & Chuyên cần:</strong> Tỷ lệ có mặt, đi trễ, vắng học có phép/không phép theo từng buổi giảng dạy và cảnh báo sinh viên nguy cơ thiếu điều kiện dự thi.
                  </span>
                )}
                {activeTabKey === "ASSIGNMENT" && (
                  <span>
                    <strong>Bài tập & Nộp bài:</strong> Tỷ lệ nộp bài đúng hạn, trễ hạn, điểm trung bình bài tập và danh sách chi tiết tình trạng nộp bài của sinh viên theo từng đợt giao.
                  </span>
                )}
                {activeTabKey === "GRADE_SIMULATOR" && (
                  <span>
                    <strong>Mô phỏng điểm (Grade Simulator):</strong> Bảng điều khiển What-If cho phép giảng viên thử nghiệm điều chỉnh trọng số giữa kỳ, cuối kỳ, chuyên cần và dự báo tác động lên điểm tổng kết.
                  </span>
                )}
                {activeTabKey === "STUDENT_360" && (
                  <span>
                    <strong>Hồ sơ Student 360:</strong> Báo cáo toàn diện 360 độ của cá nhân sinh viên <strong>{selectedStudent?.Full_Name || selectedStudent?.Username || "đang chọn"}</strong>, bao gồm điểm số, chuyên cần, tiến độ bài tập và cảnh báo cá nhân.
                  </span>
                )}
              </p>
            </div>
          </div>

          {/* 4. KHUNG NHÚNG BẢO MẬT POWER BI SECURE EMBED */}
          <div className="analytics-report-wrapper">
            <SecurePowerBIReport
              key={`${effectiveCourseKey}-${selectedCohort}`}
              courseKey={effectiveCourseKey}
              cohort={selectedCohort}
              userKey={activeTabKey === "STUDENT_360" ? selectedStudent?.User_Key : null}
              username={activeTabKey === "STUDENT_360" ? selectedStudent?.Username : null}
              targetPage={currentTab.page.displayName}
              height="auto"
              hidePageNavigation={true}
            />
          </div>
        </div>
      </main>
    </div>
  );
}