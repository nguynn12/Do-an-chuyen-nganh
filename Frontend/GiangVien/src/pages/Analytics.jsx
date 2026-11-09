import React, { useState, useEffect, useMemo, useCallback } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
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
  RotateCcw,
  Layers,
  ChevronRight,
  Sparkles,
  Filter,
  Clock,
  LayoutGrid,
  TrendingUp,
} from "lucide-react";

import Header from "../components/Header";
import Sidebar from "../components/Sidebar";
import LoadingScreen from "../components/common/LoadingScreen";
import ErrorScreen from "../components/common/ErrorScreen";
import SecurePowerBIReport from "../components/powerbi/SecurePowerBIReport";
import AiDashboardStudioModal from "../components/ai-studio/AiDashboardStudioModal";

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

// ==============================================================================
// CẤU HÌNH ÁNH XẠ MÔN HỌC (MOODLE COURSE ID -> DW COURSE_KEY)
// AI401 104 -> 11, WEB401 105 -> 12, TEST401 106 -> 13, GAME401 103 -> 10
// ==============================================================================
const MOODLE_TO_DW_COURSE_KEY = {
  103: 10, // GAME401
  104: 11, // AI401
  105: 12, // WEB401
  106: 13, // TEST401
};

// ==============================================================================
// DANH MỤC KHÓA SINH VIÊN
// ==============================================================================
const COHORT_OPTIONS = [
  { value: "K47", label: "Khóa K47 (2023 - 2027)" },
  { value: "K46", label: "Khóa K46 (2022 - 2026)" },
  { value: "K45", label: "Khóa K45 (2021 - 2025)" },
  { value: "ALL", label: "Tất cả các khóa" },
];

// ==============================================================================
// CẤU TRÚC 5 NHÓM TAB ĐIỀU HƯỚNG NỘI BỘ VÀ CÁC SUBTAB CHI TIẾT
// ==============================================================================
const ANALYTICS_NAV_TABS = [
  {
    key: "overview",
    legacyKeys: ["COURSE_OVERVIEW", "overview"],
    label: "Tổng quan phân tích",
    icon: BarChart3,
    badge: "KPI & Cảnh báo",
    page: POWER_BI_PAGES_CONFIG.COURSE_OVERVIEW,
    title: "Tổng quan phân tích học tập môn học",
    description:
      "Bảng điều khiển tổng hợp các chỉ số KPI then chốt (Sĩ số, Tỷ lệ chuyên cần, Điểm trung bình, Tỷ lệ nộp bài), biểu đồ xu hướng tương tác học tập và cảnh báo học vụ môn học.",
  },
  {
    key: "attendance",
    legacyKeys: ["ATTENDANCE", "attendance"],
    label: "Điểm danh & Chuyên cần",
    icon: CalendarCheck,
    badge: "Chuyên cần",
    page: POWER_BI_PAGES_CONFIG.ATTENDANCE,
    title: "Phân tích điểm danh & chuyên cần",
    description:
      "Trực quan hóa chi tiết tỷ lệ có mặt, đi trễ, vắng học có phép / không phép theo từng buổi giảng dạy; hỗ trợ phát hiện sớm sinh viên có nguy cơ cấm thi do vắng quá số tiết quy định.",
  },
  {
    key: "assessment",
    legacyKeys: ["assessment"],
    label: "Bài tập – Quiz – Kiến thức",
    icon: Layers,
    badge: "3 phân hệ",
    isGroup: true,
    subtabs: [
      {
        key: "assignment",
        legacyKeys: ["ASSIGNMENT", "assignment"],
        label: "Bài tập & Nộp bài",
        icon: FileSpreadsheet,
        badge: "Nộp bài",
        page: POWER_BI_PAGES_CONFIG.ASSIGNMENT,
        title: "Theo dõi tiến độ bài tập & nộp bài",
        description:
          "Theo dõi tiến độ hoàn thành các đợt giao bài tập, phân loại nộp đúng hạn / nộp trễ / chưa nộp và phổ điểm bài tập của từng nhóm sinh viên.",
      },
      {
        key: "quiz",
        legacyKeys: ["QUIZ", "quiz"],
        label: "Quiz & Câu hỏi",
        icon: HelpCircle,
        badge: "Phổ điểm & Đề",
        page: POWER_BI_PAGES_CONFIG.QUIZ,
        title: "Phân tích kết quả bài kiểm tra Quiz & câu hỏi",
        description:
          "Phân tích số liệu trắc nghiệm: số lượt làm bài, tỷ lệ đúng/sai theo từng câu hỏi và phân bố phổ điểm để kịp thời phụ đạo trên lớp.",
      },
      {
        key: "knowledge_gap",
        legacyKeys: ["KNOWLEDGE_GAP", "knowledge_gap"],
        label: "Lỗ hổng kiến thức",
        icon: BrainCircuit,
        badge: "Chủ đề yếu",
        page: POWER_BI_PAGES_CONFIG.KNOWLEDGE_GAP,
        title: "Bản đồ phân rã lỗ hổng kiến thức",
        description:
          "Bản đồ nhiệt (Heatmap) và sơ đồ phân rã các chủ đề kiến thức (Knowledge Topics) có tỷ lệ sai cao nhất, phát hiện chính xác lỗ hổng kiến thức của sinh viên.",
      },
    ],
  },
  {
    key: "grade_simulator",
    legacyKeys: ["GRADE_SIMULATOR", "grade_simulator"],
    label: "Phân tích điểm số",
    icon: Sliders,
    badge: "What-If",
    page: POWER_BI_PAGES_CONFIG.GRADE_SIMULATOR,
    title: "Mô phỏng điểm số What-If",
    description:
      "Mô phỏng điểm số What-If tích hợp trực tiếp từ Power BI: thử nghiệm thay đổi trọng số điểm thành phần (chuyên cần, giữa kỳ, bài tập lớn, thi cuối kỳ) để dự báo tỷ lệ đạt và điểm trung bình tích lũy.",
  },
  {
    key: "student_360",
    legacyKeys: ["STUDENT_360", "student_360"],
    label: "Sinh viên 360°",
    icon: UserCheck,
    badge: "Hồ sơ cá nhân",
    page: POWER_BI_PAGES_CONFIG.STUDENT_360,
    title: "Báo cáo đa chiều Sinh viên 360°",
    description:
      "Hồ sơ phân tích 360 độ cá nhân hóa từng sinh viên: lịch sử tham gia lớp, tiến độ bài tập, kết quả quiz, chuyên cần và mức độ rủi ro học vụ.",
  },
];

// Toàn bộ 7 dashboard để phục vụ Trung tâm Báo cáo Nhanh
const ALL_DASHBOARD_CARDS = [
  {
    tabKey: "overview",
    subtabKey: null,
    title: "Tổng quan phân tích",
    subTitle: "KPI & Cảnh báo học vụ",
    page: POWER_BI_PAGES_CONFIG.COURSE_OVERVIEW,
    icon: BarChart3,
    badge: "Tổng thể",
  },
  {
    tabKey: "attendance",
    subtabKey: null,
    title: "Điểm danh & Chuyên cần",
    subTitle: "Lịch sử tham gia theo buổi",
    page: POWER_BI_PAGES_CONFIG.ATTENDANCE,
    icon: CalendarCheck,
    badge: "Chuyên cần",
  },
  {
    tabKey: "assessment",
    subtabKey: "assignment",
    title: "Bài tập & Nộp bài",
    subTitle: "Tiến độ nộp & điểm bài tập",
    page: POWER_BI_PAGES_CONFIG.ASSIGNMENT,
    icon: FileSpreadsheet,
    badge: "Bài tập",
  },
  {
    tabKey: "assessment",
    subtabKey: "quiz",
    title: "Quiz & Câu hỏi",
    subTitle: "Phổ điểm & câu hỏi sai nhiều",
    page: POWER_BI_PAGES_CONFIG.QUIZ,
    icon: HelpCircle,
    badge: "Trắc nghiệm",
  },
  {
    tabKey: "assessment",
    subtabKey: "knowledge_gap",
    title: "Lỗ hổng kiến thức",
    subTitle: "Chủ đề yếu & heatmap cá nhân",
    page: POWER_BI_PAGES_CONFIG.KNOWLEDGE_GAP,
    icon: BrainCircuit,
    badge: "Kiến thức",
  },
  {
    tabKey: "grade_simulator",
    subtabKey: null,
    title: "Mô phỏng điểm số",
    subTitle: "Bảng điều khiển What-If",
    page: POWER_BI_PAGES_CONFIG.GRADE_SIMULATOR,
    icon: Sliders,
    badge: "What-If",
  },
  {
    tabKey: "student_360",
    subtabKey: null,
    title: "Hồ sơ Sinh viên 360°",
    subTitle: "Báo cáo chi tiết từng cá nhân",
    page: POWER_BI_PAGES_CONFIG.STUDENT_360,
    icon: UserCheck,
    badge: "Cá nhân",
  },
];

export default function Analytics({ defaultStudioOpen = false }) {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  const [isStudioOpen, setIsStudioOpen] = useState(() => {
    return Boolean(defaultStudioOpen || searchParams.get("studio") === "open");
  });

  useEffect(() => {
    setIsStudioOpen(Boolean(defaultStudioOpen || searchParams.get('studio') === 'open'));
  }, [defaultStudioOpen, searchParams]);

  // Đọc tab & subtab từ URL (hỗ trợ tương thích ngược với các key cũ)
  const initialTabParam = searchParams.get("tab") || "overview";
  const initialSubtabParam = searchParams.get("subtab") || "assignment";

  // Khởi tạo tab chính và subtab từ URL
  const { initialTab, initialSubtab } = useMemo(() => {
    // Kiểm tra xem param có tương ứng với subtab của nhóm assessment không
    if (["ASSIGNMENT", "QUIZ", "KNOWLEDGE_GAP", "assignment", "quiz", "knowledge_gap"].includes(initialTabParam)) {
      const subKey =
        initialTabParam === "ASSIGNMENT" || initialTabParam === "assignment"
          ? "assignment"
          : initialTabParam === "QUIZ" || initialTabParam === "quiz"
          ? "quiz"
          : "knowledge_gap";
      return { initialTab: "assessment", initialSubtab: subKey };
    }

    // Khớp các tab đơn lẻ
    for (const tab of ANALYTICS_NAV_TABS) {
      if (tab.key === initialTabParam || (tab.legacyKeys && tab.legacyKeys.includes(initialTabParam))) {
        return { initialTab: tab.key, initialSubtab: initialSubtabParam };
      }
    }

    return { initialTab: "overview", initialSubtab: "assignment" };
  }, [initialTabParam, initialSubtabParam]);

  const [activeTabKey, setActiveTabKey] = useState(initialTab);
  const [activeSubtabKey, setActiveSubtabKey] = useState(initialSubtab);

  // Mở rộng / thu gọn Trung tâm Báo cáo Nhanh
  const [showCenterCards, setShowCenterCards] = useState(false);

  // Thông tin Giảng viên & Môn học
  const [teacher, setTeacher] = useState(null);
  const [courses, setCourses] = useState([]);
  const [selectedCourse, setSelectedCourse] = useState(null);
  const [selectedCohort, setSelectedCohort] = useState(() => ['ALL','K45','K46','K47'].includes(searchParams.get('cohort')) ? searchParams.get('cohort') : 'K47');
  useEffect(() => {
    const requestedCohort = searchParams.get('cohort');
    if (['ALL','K45','K46','K47'].includes(requestedCohort)) setSelectedCohort(requestedCohort);
  }, [searchParams]);

  // Dành riêng cho phân hệ Student 360
  const [students, setStudents] = useState([]);
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [loadingStudents, setLoadingStudents] = useState(false);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const teacherId = Number(localStorage.getItem("currentTeacherId")) || 1;

  // 1. TẢI DỮ LIỆU GIẢNG VIÊN VÀ DANH SÁCH MÔN HỌC THẬT TỪ API
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
          // Ưu tiên chọn môn AI401 (Moodle 104 / DW 11) nếu có, hoặc môn đầu tiên
          const aiCourse = list.find((c) => Number(c.Moodle_Course_ID) === 104);
          setSelectedCourse(aiCourse || list[0]);
        }
      } catch (err) {
        console.error("Lỗi nạp dữ liệu trang Phân tích học tập:", err);
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
        // Nếu chọn "ALL", fallback sang "K47" khi gọi API sinh viên để luôn có danh sách sinh viên cụ thể
        const cohortForApi = selectedCohort === "ALL" ? "K47" : selectedCohort;
        const data = await getCourseStudents(
          selectedCourse.Moodle_Course_ID,
          cohortForApi
        );
        if (cancelled) return;

        const studentList = data || [];
        setStudents(studentList);

        if (studentList.length > 0) {
          // Kiểm tra xem sinh viên hiện tại có còn trong danh sách không
          const stillExists = studentList.some(
            (s) =>
              String(s.User_Key) === String(selectedStudent?.User_Key) ||
              String(s.Username) === String(selectedStudent?.Username)
          );
          if (!stillExists) {
            setSelectedStudent(studentList[0]);
          }
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

  // 3. XỬ LÝ CHUYỂN TAB CHÍNH
  const handleTabChange = useCallback(
    (key) => {
      setActiveTabKey(key);
      setSearchParams((prev) => {
        const next = new URLSearchParams(prev);
        next.set("tab", key);
        if (key !== "assessment") {
          next.delete("subtab");
        } else {
          next.set("subtab", activeSubtabKey);
        }
        return next;
      });
    },
    [activeSubtabKey, setSearchParams]
  );

  // 4. XỬ LÝ CHUYỂN SUBTAB TRONG NHÓM ASSESSMENT
  const handleSubtabChange = useCallback(
    (subKey) => {
      setActiveSubtabKey(subKey);
      setSearchParams((prev) => {
        const next = new URLSearchParams(prev);
        next.set("tab", "assessment");
        next.set("subtab", subKey);
        return next;
      });
    },
    [setSearchParams]
  );

  // 5. ĐẶT LẠI BỘ LỌC VỀ MẶC ĐỊNH
  const handleResetFilters = useCallback(() => {
    // Đặt lại môn về môn đầu tiên (hoặc AI401 nếu có)
    if (courses.length > 0) {
      const defaultCourse = courses.find((c) => Number(c.Moodle_Course_ID) === 104) || courses[0];
      setSelectedCourse(defaultCourse);
    }
    // Đặt lại khóa về K47
    setSelectedCohort("K47");
    // Đặt lại subtab về assignment
    setActiveSubtabKey("assignment");
  }, [courses]);

  // 6. XÁC ĐỊNH CẤU HÌNH TAB HIỆN TẠI
  const currentTabConfig = useMemo(() => {
    return ANALYTICS_NAV_TABS.find((t) => t.key === activeTabKey) || ANALYTICS_NAV_TABS[0];
  }, [activeTabKey]);

  // 7. XÁC ĐỊNH TRANG POWER BI ĐÍCH (TARGET PAGE DISPLAY NAME)
  const currentTargetPage = useMemo(() => {
    if (activeTabKey === "assessment") {
      const sub = currentTabConfig.subtabs?.find((s) => s.key === activeSubtabKey) || currentTabConfig.subtabs?.[0];
      return sub?.page?.displayName || POWER_BI_PAGES_CONFIG.ASSIGNMENT.displayName;
    }
    return currentTabConfig?.page?.displayName || POWER_BI_PAGES_CONFIG.COURSE_OVERVIEW.displayName;
  }, [activeTabKey, activeSubtabKey, currentTabConfig]);

  // 8. XÁC ĐỊNH THÔNG TIN TIÊU ĐỀ VÀ MÔ TẢ PHÂN HỆ ĐANG XEM
  const activeSectionInfo = useMemo(() => {
    if (activeTabKey === "assessment") {
      const sub = currentTabConfig.subtabs?.find((s) => s.key === activeSubtabKey) || currentTabConfig.subtabs?.[0];
      return {
        title: sub?.title || currentTabConfig.title,
        description: sub?.description || currentTabConfig.description,
        pageName: sub?.page?.displayName,
      };
    }
    return {
      title: currentTabConfig.title,
      description: currentTabConfig.description,
      pageName: currentTabConfig.page?.displayName,
    };
  }, [activeTabKey, activeSubtabKey, currentTabConfig]);

  // 9. XÁC ĐỊNH COURSE_KEY THỰC TẾ TRONG DATA WAREHOUSE (ÁNH XẠ CHUẨN XÁC)
  const effectiveCourseKey = useMemo(() => {
    if (!selectedCourse) return 11;
    const directKey = Number(selectedCourse.Course_Key || selectedCourse.courseKey);
    if (Number.isFinite(directKey) && directKey > 0) {
      return directKey;
    }
    const moodleId = Number(selectedCourse.Moodle_Course_ID);
    if (MOODLE_TO_DW_COURSE_KEY[moodleId]) {
      return MOODLE_TO_DW_COURSE_KEY[moodleId];
    }
    return 11;
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
      {/* HEADER GIẢNG VIÊN - BẢO TOÀN NGUYÊN BẢN */}
      <Header teacher={teacher} />

      {/* SIDEBAR - BẢO TOÀN NGUYÊN BẢN KHÔNG THAY ĐỔI */}
      <Sidebar />

      {/* MAIN CONTENT - KHU VỰC PHÂN TÍCH HỌC TẬP CHUYÊN SÂU */}
      <main className="analytics-layout">
        <div className="analytics-page learning-analytics-root">
          {/* ================================================================
              A. BỘ LỌC CHUNG CỐ ĐỊNH Ở ĐẦU VÙNG PHÂN TÍCH
              ================================================================ */}
          <section className="learning-analytics-header-card">
            <div className="learning-analytics-top-bar">
              <div className="learning-analytics-title-group">
                <div className="learning-analytics-icon-badge">
                  <BarChart3 size={26} />
                </div>
                <div>
                  <div className="learning-analytics-tag">
                    <Sparkles size={13} />
                    <span>LMS Learning Analytics • Data Warehouse</span>
                  </div>
                  <h1>Phân tích dữ liệu học tập</h1>
                  <p>
                    Hệ thống trực quan hóa toàn diện trên mô hình Data Warehouse <code>lms_datawarehouse</code>, 
                    phân tích tương tác, chuyên cần, tiến độ bài tập, kết quả kiểm tra và hồ sơ sinh viên 360°.
                  </p>
                </div>
              </div>

              {/* Action buttons: AI Tạo Dashboard & Trung tâm báo cáo nhanh */}
              <div style={{ display: "flex", gap: "0.75rem", alignItems: "center" }}>
                <button
                  type="button"
                  className="ai-create-dashboard-btn"
                  onClick={() => setIsStudioOpen(true)}
                  title="Mở AI Dashboard Studio — Tự động tạo dashboard từ Excel hoặc LMS"
                >
                  <Sparkles size={16} />
                  <span>✨ AI Tạo Dashboard</span>
                  <span className="ai-btn-badge">Studio</span>
                </button>

                <button
                  type="button"
                  className={`learning-analytics-center-toggle-btn ${showCenterCards ? "active" : ""}`}
                  onClick={() => setShowCenterCards((prev) => !prev)}
                  title="Xem danh mục 7 bảng phân tích chi tiết"
                >
                  <LayoutGrid size={15} />
                  <span>{showCenterCards ? "Đóng danh mục" : "7 Dashboards"}</span>
                </button>
              </div>
            </div>

            {/* BỘ LỌC ĐIỀU HƯỚNG: MÔN HỌC, KHÓA, THỜI GIAN, SINH VIÊN & ĐẶT LẠI */}
            <div className="learning-analytics-filter-toolbar">
              <div className="learning-analytics-filter-inputs">
                {/* 1. Chọn Môn học */}
                <div className="learning-analytics-control-group">
                  <label htmlFor="course-select">
                    <BookOpen size={13} />
                    <span>Môn học:</span>
                  </label>
                  <div className="learning-analytics-select-wrapper">
                    <select
                      id="course-select"
                      value={selectedCourse.Moodle_Course_ID}
                      onChange={(e) => {
                        const found = courses.find(
                          (c) => String(c.Moodle_Course_ID) === String(e.target.value)
                        );
                        if (found) setSelectedCourse(found);
                      }}
                    >
                      {courses.map((c) => {
                        const cKey =
                          c.Course_Key ||
                          MOODLE_TO_DW_COURSE_KEY[c.Moodle_Course_ID] ||
                          c.Moodle_Course_ID;
                        return (
                          <option key={c.Moodle_Course_ID} value={c.Moodle_Course_ID}>
                            {c.Course_Code} — {c.Course_Name} (Key: {cKey})
                          </option>
                        );
                      })}
                    </select>
                  </div>
                </div>

                {/* 2. Chọn Khóa tuyển sinh */}
                <div className="learning-analytics-control-group">
                  <label htmlFor="cohort-select">
                    <GraduationCap size={13} />
                    <span>Khóa sinh viên:</span>
                  </label>
                  <div className="learning-analytics-select-wrapper">
                    <select
                      id="cohort-select"
                      value={selectedCohort}
                      onChange={(e) => { setSelectedCohort(e.target.value); setSearchParams(previous => { const next = new URLSearchParams(previous); next.set('cohort', e.target.value); return next; }); }}
                    >
                      {COHORT_OPTIONS.map((coh) => (
                        <option key={coh.value} value={coh.value}>
                          {coh.label}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* 3. Khoảng thời gian (chính sách minh bạch theo prompt) */}
                <div className="learning-analytics-control-group">
                  <label htmlFor="timeframe-select">
                    <Clock size={13} />
                    <span>Khoảng thời gian:</span>
                  </label>
                  <div className="learning-analytics-select-wrapper">
                    <select id="timeframe-select" defaultValue="ALL_TERM">
                      <option value="ALL_TERM">Toàn bộ học kỳ (Mặc định)</option>
                      <option value="WEEK" disabled>
                        Lọc theo tuần học (Sắp hỗ trợ)
                      </option>
                      <option value="MONTH" disabled>
                        Lọc theo tháng (Sắp hỗ trợ)
                      </option>
                    </select>
                  </div>
                </div>

                {/* 4. Chọn Sinh viên (hiển thị khi ở tab Sinh viên 360°) */}
                {activeTabKey === "student_360" && (
                  <div className="learning-analytics-control-group student-control-group">
                    <label htmlFor="student-select">
                      <Users size={13} />
                      <span>Chọn sinh viên (360°):</span>
                    </label>
                    <div className="learning-analytics-select-wrapper">
                      <select
                        id="student-select"
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
                        {loadingStudents ? (
                          <option value="">Đang tải danh sách sinh viên...</option>
                        ) : students.length === 0 ? (
                          <option value="">Không có sinh viên trong khóa này</option>
                        ) : (
                          students.map((s) => (
                            <option
                              key={s.User_Key || s.Moodle_User_ID || s.Username}
                              value={s.User_Key || s.Username}
                            >
                              {s.Username} — {s.Full_Name || s.fullName} (Key: {s.User_Key || s.id})
                            </option>
                          ))
                        )}
                      </select>
                    </div>
                  </div>
                )}
              </div>

              {/* Nút Đặt lại bộ lọc */}
              <div className="learning-analytics-filter-actions">
                <button
                  type="button"
                  className="learning-analytics-reset-btn"
                  onClick={handleResetFilters}
                  title="Khôi phục môn và khóa về mặc định"
                >
                  <RotateCcw size={14} />
                  <span>Đặt lại bộ lọc</span>
                </button>
              </div>
            </div>

            {/* THANH TRẠNG THÁI HIỂN THỊ RÕ BỘ LỌC ĐANG ÁP DỤNG */}
            <div className="learning-analytics-active-filters-summary">
              <span className="summary-label">Đang lọc theo:</span>
              <div className="summary-pill course-pill">
                <strong>Môn:</strong> {selectedCourse.Course_Code} — {selectedCourse.Course_Name}
                <span className="key-tag">DW Key: {effectiveCourseKey}</span>
              </div>
              <div className="summary-pill cohort-pill">
                <strong>Khóa:</strong> {selectedCohort === "ALL" ? "Tất cả sinh viên" : `Khóa ${selectedCohort}`}
              </div>
              {activeTabKey === "student_360" && (
                <div className="summary-pill student-pill">
                  <strong>Sinh viên 360°:</strong>{" "}
                  {selectedStudent ? `${selectedStudent.Username} — ${selectedStudent.Full_Name || selectedStudent.fullName}` : "Chưa chọn"}
                </div>
              )}
            </div>
          </section>

          {/* ================================================================
              TRUNG TÂM BÁO CÁO (7 DASHBOARD CARDS - MỞ RỘNG / THU GỌN)
              Phục vụ mở nhanh mà không tải trùng lặp iframe
              ================================================================ */}
          {showCenterCards && (
            <section className="learning-analytics-center-container">
              <div className="center-header">
                <h3>
                  <LayoutGrid size={18} />
                  <span>Danh mục 7 Báo cáo Phân tích Chuyên sâu</span>
                </h3>
                <small>Nhấp vào thẻ bất kỳ để chuyển thẳng đến màn hình phân tích tương ứng</small>
              </div>
              <div className="learning-analytics-cards-grid">
                {ALL_DASHBOARD_CARDS.map((card) => {
                  const Icon = card.icon;
                  const isCurrent =
                    card.tabKey === activeTabKey &&
                    (card.subtabKey ? card.subtabKey === activeSubtabKey : true);

                  return (
                    <div
                      key={`${card.tabKey}-${card.subtabKey || "default"}`}
                      className={`learning-analytics-card-item ${isCurrent ? "is-selected" : ""}`}
                      onClick={() => {
                        handleTabChange(card.tabKey);
                        if (card.subtabKey) {
                          handleSubtabChange(card.subtabKey);
                        }
                      }}
                      role="button"
                      tabIndex={0}
                    >
                      <div className="card-top">
                        <div className="card-icon-wrap">
                          <Icon size={18} />
                        </div>
                        <span className="card-badge">{card.badge}</span>
                      </div>
                      <h4>{card.title}</h4>
                      <p>{card.subTitle}</p>
                      <div className="card-footer">
                        <code>{card.page.displayName}</code>
                        {isCurrent ? (
                          <span className="status-active">Đang xem</span>
                        ) : (
                          <ChevronRight size={14} />
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>
          )}

          {/* ================================================================
              B. ĐIỀU HƯỚNG NỘI BỘ BẰNG TAB / SUBTAB (KHÔNG PHẢI SIDEBAR MỚI)
              ================================================================ */}
          <section className="learning-analytics-nav-container">
            {/* 5 Tab chính */}
            <nav className="learning-analytics-main-tabs" aria-label="Điều hướng phân tích học tập">
              {ANALYTICS_NAV_TABS.map((tab) => {
                const Icon = tab.icon;
                const isActive = tab.key === activeTabKey;
                return (
                  <button
                    key={tab.key}
                    type="button"
                    className={`learning-analytics-tab-btn ${isActive ? "active" : ""}`}
                    onClick={() => handleTabChange(tab.key)}
                  >
                    <Icon size={17} />
                    <span className="tab-label">{tab.label}</span>
                    <span className="tab-badge">{tab.badge}</span>
                  </button>
                );
              })}
            </nav>

            {/* Subtabs dành riêng cho Nhóm 3: Bài tập – Quiz – Kiến thức */}
            {activeTabKey === "assessment" && (
              <div className="learning-analytics-subtabs-bar">
                <span className="subtabs-prefix">
                  <Layers size={14} />
                  <span>Phân hệ:</span>
                </span>
                <div className="subtabs-list">
                  {currentTabConfig.subtabs?.map((sub) => {
                    const SubIcon = sub.icon;
                    const isSubActive = sub.key === activeSubtabKey;
                    return (
                      <button
                        key={sub.key}
                        type="button"
                        className={`learning-analytics-subtab-btn ${isSubActive ? "active" : ""}`}
                        onClick={() => handleSubtabChange(sub.key)}
                      >
                        <SubIcon size={15} />
                        <span>{sub.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </section>

          {/* ================================================================
              C. KHUNG CONTEXT GIẢI THÍCH MỤC ĐÍCH NGHIỆP VỤ CỦA TỪNG PHÂN HỆ
              ================================================================ */}
          <div className="learning-analytics-context-banner">
            <div className="context-banner-icon">
              <Info size={18} />
            </div>
            <div className="context-banner-text">
              <div className="context-banner-heading">
                <strong>{activeSectionInfo.title}</strong>
                <span className="page-guid-tag">
                  Báo cáo Power BI: <code>{activeSectionInfo.pageName}</code>
                </span>
              </div>
              <p>{activeSectionInfo.description}</p>
            </div>
          </div>

          {/* ================================================================
              D. KHUNG NHÚNG BẢO MẬT POWER BI SECURE EMBED DUY NHẤT
              Chỉ tải 1 instance embed; chuyển tab qua SDK report.setPage()
              ================================================================ */}
          <section className="learning-analytics-report-wrapper">
            <SecurePowerBIReport
              courseKey={effectiveCourseKey}
              cohort={selectedCohort === "ALL" ? "" : selectedCohort}
              userKey={activeTabKey === "student_360" ? selectedStudent?.User_Key : null}
              username={activeTabKey === "student_360" ? selectedStudent?.Username : null}
              targetPage={currentTargetPage}
              height="auto"
              hidePageNavigation={true}
            />
          </section>
        </div>
      </main>

      {/* AI Dashboard Studio Modal */}
      <AiDashboardStudioModal
        isOpen={isStudioOpen}
        onClose={() => {
          setIsStudioOpen(false);
          if (defaultStudioOpen) navigate('/phan-tich');
          else if (searchParams.get('studio') === 'open') {
            const next = new URLSearchParams(searchParams); next.delete('studio'); setSearchParams(next, {replace:true});
          }
        }}
      />
    </div>
  );
}