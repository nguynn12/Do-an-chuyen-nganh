import React, { useState, useEffect, useMemo, useCallback, useRef } from "react";
import { useParams, useSearchParams, useNavigate } from "react-router-dom";
import {
  Award,
  BookOpen,
  CalendarCheck,
  CheckCircle2,
  AlertTriangle,
  Info,
  Plus,
  Trash2,
  RotateCcw,
  Save,
  Users,
  Search,
  ChevronRight,
  ChevronDown,
  ChevronUp,
  Sparkles,
  ExternalLink,
  ShieldAlert,
  FileCheck2,
  Check,
  X,
  SlidersHorizontal,
  Maximize2,
  Minimize2,
  Maximize,
  StretchHorizontal,
  Layers,
  ArrowRight,
  Clock,
  ShieldCheck,
  HelpCircle,
  BarChart3,
  Calculator,
  GraduationCap,
  Eye,
  EyeOff,
  Download,
} from "lucide-react";

import Header from "../components/Header";
import Sidebar from "../components/Sidebar";
import LoadingScreen from "../components/common/LoadingScreen";
import ErrorScreen from "../components/common/ErrorScreen";
import SecurePowerBIReport from "../components/powerbi/SecurePowerBIReport";
import GradeAdjustmentBridge from "../components/powerbi/GradeAdjustmentBridge";
import GradeGroupBridge from "../components/powerbi/GradeGroupBridge";
import GradeSourcesPanel from "../components/GradeSourcesPanel";
import {verifyGroupCard} from "../services/gradeSlicerBridge";

import {
  getTeacher,
  getTeacherCourses,
  getCourseStudents,
  getStudentCourseGrades,
  getSavedGrades, saveGradeGroup, saveFinalGrade, exportClassGradesApi,
} from "../services/teacherApi";
import { POWER_BI_PAGES_CONFIG } from "../config/powerBiConfig";

import "../styles/Grading.css";

// ==============================================================================
// CẤU HÌNH KHÓA SINH VIÊN
// ==============================================================================
const COHORT_OPTIONS = [
  { value: "K47", label: "Khóa K47 (2023 - 2027)" },
  { value: "K46", label: "Khóa K46 (2022 - 2026)" },
  { value: "K45", label: "Khóa K45 (2021 - 2025)" },
  { value: "ALL", label: "Tất cả các khóa" },
];

// ==============================================================================
// CẤU HÌNH 3 NHÓM ĐIỂM CHUẨN CỦA HỌC PHẦN
// Trọng số tổng kết: Wcc (10%) + Wgk (40%) + Wck (50%) = 100%
// Trong mỗi nhóm: Tổng trọng số nội bộ phải chính xác 100%
// ==============================================================================
const DEFAULT_GROUPS_CONFIG = [
  {
    key: "chuyen_can",
    name: "Chuyên cần",
    stepNumber: 1,
    overallWeight: 10, // Wcc = 10%
    description: "Đánh giá mức độ tham gia, điểm danh lớp học và bài tập quá trình",
    items: [
      {
        id: "item_12",
        name: "Điểm danh LMS",
        weight: 60,
        maxScore: 10,
        category: "Điểm danh",
        provenance: "fact_attendance",
      },
      {
        id: "item_14",
        name: "Bài tập tìm kiếm trạng thái",
        weight: 10,
        maxScore: 10,
        category: "Bài tập",
        provenance: "Fact_Course_Grade (LMS #42007)",
      },
      {
        id: "item_15",
        name: "Bài tập Machine Learning cơ bản",
        weight: 10,
        maxScore: 10,
        category: "Bài tập",
        provenance: "Fact_Course_Grade (LMS #42008)",
      },
      {
        id: "item_13",
        name: "Bài kiểm tra 15 phút",
        weight: 20,
        maxScore: 10,
        category: "Kiểm tra",
        provenance: "fact_teacher_grade_score",
      },
    ],
  },
  {
    key: "giua_ky",
    name: "Giữa kỳ",
    stepNumber: 2,
    overallWeight: 40, // Wgk = 40%
    description: "Đánh giá giữa kỳ (bài thi trắc nghiệm, kiểm tra định kỳ hoặc bài tập lớn)",
    items: [
      {
        id: "item_gk_1",
        name: "Bài thi giữa kỳ",
        weight: 100,
        maxScore: 10,
        category: "Thi giữa kỳ",
        provenance: "Phòng Đào tạo / LMS Quiz",
      },
    ],
  },
  {
    key: "cuoi_ky",
    name: "Cuối kỳ",
    stepNumber: 3,
    overallWeight: 50, // Wck = 50%
    description: "Đánh giá kết thúc học phần (thi tự luận tập trung hoặc đồ án môn học)",
    items: [
      {
        id: "item_ck_1",
        name: "Thi kết thúc học phần",
        weight: 100,
        maxScore: 10,
        category: "Thi cuối kỳ",
        provenance: "Phòng Đào tạo tổ chức",
      },
    ],
  },
];

// Hàm kiểm tra hợp lệ điểm số (bước 0.5, từ 0 đến 10, phân biệt null và 0)
function validateScoreInput(raw) {
  if (raw === "" || raw === null || raw === undefined) {
    return { isValid: true, value: null, error: null }; // NULL là chưa chấm
  }
  const num = Number(raw);
  if (isNaN(num)) {
    return { isValid: false, value: raw, error: "Vui lòng nhập số hợp lệ." };
  }
  if (num < 0 || num > 10) {
    return { isValid: false, value: num, error: "Điểm phải từ 0.0 đến 10.0." };
  }
  // Kiểm tra bước nhảy 0.5
  const tenths = Math.round(num * 10);
  if (Math.abs(num * 10 - tenths) > 0.001 || tenths % 5 !== 0) {
    return {
      isValid: false,
      value: num,
      error: "Điểm phải là bội số của 0.5 (ví dụ: 0, 0.5, 1.0, 1.5 ... 9.5, 10.0).",
    };
  }
  return { isValid: true, value: num, error: null };
}

function Grading() {
  const { courseId: paramCourseId } = useParams();
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();

  const teacherId = Number(localStorage.getItem("currentTeacherId")) || null;

  // State nạp chung
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [teacher, setTeacher] = useState(null);
  const [courses, setCourses] = useState([]);
  const [selectedCourse, setSelectedCourse] = useState(null);
  const [selectedCohort, setSelectedCohort] = useState("K47");

  // Chế độ hiển thị canvas Power BI
  const [reportViewMode, setReportViewMode] = useState("fitToPage");
  const [isReportExpanded, setIsReportExpanded] = useState(false);
  const [showPowerBIEmbed, setShowPowerBIEmbed] = useState(false); // Thu gọn mặc định để ưu tiên diện tích chấm điểm

  // Chi tiết kỹ thuật dành cho dev (thu gọn mặc định theo yêu cầu mục 6)
  const [showTechDetails, setShowTechDetails] = useState(false);

  // State sinh viên
  const [students, setStudents] = useState([]);
  const [loadingStudents, setLoadingStudents] = useState(false);
  const [studentsError,setStudentsError]=useState("");
  const [studentsReload,setStudentsReload]=useState(0);
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [studentSearch, setStudentSearch] = useState("");
  const [exportingGrades, setExportingGrades] = useState(false);
  const [exportError, setExportError] = useState('');

  // Nhóm đang mở tab làm việc (chuyen_can | giua_ky | cuoi_ky)
  const [activeGroupKey, setActiveGroupKey] = useState("chuyen_can");

  // Cấu hình 3 nhóm điểm áp dụng chung cho cả lớp (Client-side Demo)
  const [groupsConfig, setGroupsConfig] = useState(DEFAULT_GROUPS_CONFIG);

  // Điểm số demo lưu theo sinh viên: { [studentKey]: { [itemId]: number | null } }
  const [scoresByStudent, setScoresByStudent] = useState({});

  // Lỗi validation điểm số: { [studentKey]: { [itemId]: string } }
  const [scoreErrors, setScoreErrors] = useState({});

  // Trạng thái xác nhận theo từng nhóm & sinh viên:
  // { [studentKey]: { chuyen_can: { confirmed: bool, snapshotScore: number, confirmedAt: string }, giua_ky: ..., cuoi_ky: ..., final: ... } }
  const [confirmations, setConfirmations] = useState({});

  // Dữ liệu đọc trực tiếp từ MySQL (READ-ONLY)
  const [studentGradeData, setStudentGradeData] = useState(null);
  const [loadingStudentGrades, setLoadingStudentGrades] = useState(false);
  const [studentGradeError, setStudentGradeError] = useState("");
  const [savingGrades, setSavingGrades] = useState(false);
  const [gradeReport,setGradeReport] = useState(null);
  const groupReader = useRef(null);
  const registerGroupReader = useCallback(reader => {groupReader.current=reader;},[]);
  const [saveError, setSaveError] = useState("");
  const [sourceReload,setSourceReload]=useState(0);
  const [scoreOrigins,setScoreOrigins]=useState({});
  const dirtyItems=useRef(new Map());
  const dirtyConfig=useRef(new Set());
  const configDrafts=useRef(new Map());
  const loadedConfigCourse=useRef(null);
  useEffect(()=>{
    if(loadedConfigCourse.current!==selectedCourse?.Course_Key)return;
    for(const group of groupsConfig) {
      const key=`${selectedCourse.Course_Key}:${group.key}`;
      if(dirtyConfig.current.has(key))configDrafts.current.set(key,group);
    }
  },[groupsConfig,selectedCourse?.Course_Key]);

  // Toast thông báo
  const [toastMessage, setToastMessage] = useState("");

  const showToast = (msg) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage("");
    }, 4500);
  };

  // Student key hiện tại
  const currentStudentKey = selectedStudent
    ? `${selectedCourse?.Course_Key}:${selectedStudent.User_Key || selectedStudent.Username}`
    : "";

  // ==============================================================================
  // 1. TẢI THÔNG TIN GIẢNG VIÊN VÀ DANH SÁCH MÔN HỌC
  // ==============================================================================
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

        const activeId = paramCourseId || searchParams.get("courseId");
        if (activeId) {
          const found = list.find(
            (c) =>
              String(c.Moodle_Course_ID) === String(activeId) ||
              String(c.Course_Key) === String(activeId)
          );
          setSelectedCourse(found || list[0] || null);
        } else if (list.length > 0) {
          // Mặc định chọn AI401 (Moodle 104 / DW 11) nếu có
          const aiCourse = list.find((c) => Number(c.Moodle_Course_ID) === 104);
          setSelectedCourse(aiCourse || list[0]);
        }
      } catch (err) {
        console.error("Lỗi nạp dữ liệu trang Chấm điểm:", err);
        if (!cancelled) {
          setError(err.message || "Không thể tải dữ liệu môn học giảng viên.");
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
  }, [teacherId, paramCourseId, searchParams]);

  // ==============================================================================
  // 2. TẢI DANH SÁCH SINH VIÊN TRONG LỚP
  // ==============================================================================
  useEffect(() => {
    if (!selectedCourse?.Moodle_Course_ID) return;
    let cancelled = false;

    async function loadStudents() {
      try {
        setLoadingStudents(true);
        setStudentsError("");
        setStudents([]);setSelectedStudent(null);
        const cohortForApi = selectedCohort;
        const data = await getCourseStudents(selectedCourse.Moodle_Course_ID, cohortForApi);

        if (cancelled) return;
        const studentList = Array.isArray(data) ? data : [];
        setStudents(studentList);

        if (studentList.length > 0) {
          setSelectedStudent((prev) => {
            const exists = studentList.find(
              (s) => String(s.User_Key) === String(prev?.User_Key)
            );
            return exists || studentList[0];
          });
        }
      } catch (_err) {
        console.warn("Không tải được danh sách sinh viên.");
        if (!cancelled) {
          setStudents([]);setSelectedStudent(null);setStudentsError("Không tải được danh sách sinh viên từ LMS. Vui lòng thử lại.");
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
  }, [selectedCourse, selectedCohort, studentsReload]);

  // ==============================================================================
  // 3. ĐỌC ĐIỂM READ-ONLY TỪ MYSQL KHI CHỌN SINH VIÊN
  // ==============================================================================
  useEffect(() => {
    if (!selectedCourse?.Moodle_Course_ID || !selectedStudent) {
      setStudentGradeData(null);
      setLoadingStudentGrades(false);
      return;
    }

    let cancelled = false;
    const studentId = selectedStudent.User_Key || selectedStudent.Username;
    const stKey = `${selectedCourse.Course_Key}:${studentId}`;

    async function fetchRealStudentGrades() {
      setLoadingStudentGrades(true);
      setStudentGradeError("");

      try {
        const [res, saved] = await Promise.all([
          getStudentCourseGrades(selectedCourse.Moodle_Course_ID, studentId),
          getSavedGrades(selectedCourse.Moodle_Course_ID, studentId),
        ]);
        if (cancelled) return;
        if (res?.success && saved?.success) {
          setStudentGradeData(res);
          setSaveError("");
          const initialScores = {};
          (res.criteria || []).forEach(crit => {
            initialScores[crit.id] = crit.score == null ? null : Math.round(Number(crit.score) * 10 / (Number(crit.maxScore) || 10) * 100) / 100;
          });
          Object.assign(initialScores, saved.scores);
          setScoresByStudent(prev => {
            for(const id of dirtyItems.current.get(stKey) || []) if(Object.hasOwn(prev[stKey] || {},id)) initialScores[id]=prev[stKey][id];
            return {...prev,[stKey]:initialScores};
          });
          setScoreOrigins(prev=>({...prev,[stKey]:saved.origins || {}}));
          setScoreErrors(prev => ({...prev,[stKey]:Object.fromEntries([...(dirtyItems.current.get(stKey)||[])].map(id=>[id,prev[stKey]?.[id]]))}));
          setConfirmations(prev => {
            const next = {...prev};
            Object.keys(next).filter(key=>key.startsWith(`${selectedCourse.Course_Key}:`)).forEach(key=>delete next[key]);
            Object.entries(saved.classConfirmations || {}).forEach(([user, value])=> {next[`${selectedCourse.Course_Key}:${user}`]=value;});
            next[stKey] = saved.confirmations;
            for(const [student,ids] of dirtyItems.current) {
              if(!student.startsWith(`${selectedCourse.Course_Key}:`))continue;
              for(const g of saved.groups) if(g.items.some(i=>ids.has(i.id))) next[student]={...next[student],[g.key]:{...next[student]?.[g.key],confirmed:false},final:{confirmed:false}};
            }
            for(const g of saved.groups) if(dirtyConfig.current.has(`${selectedCourse.Course_Key}:${g.key}`)) for(const student of Object.keys(next).filter(k=>k.startsWith(`${selectedCourse.Course_Key}:`))) next[student]={...next[student],[g.key]:{...next[student]?.[g.key],confirmed:false},final:{confirmed:false}};
            return next;
          });
          loadedConfigCourse.current=selectedCourse.Course_Key;
          setGroupsConfig(()=>DEFAULT_GROUPS_CONFIG.map(template => {
            if(dirtyConfig.current.has(`${selectedCourse.Course_Key}:${template.key}`)) return configDrafts.current.get(`${selectedCourse.Course_Key}:${template.key}`) || template;
            const group = saved.groups.find(g => g.key === template.key);
            return {...template, ...group, items: group?.items.length ? group.items : template.items.map((it,index) => ({...it,id:`new_${template.key}_${index}`}))};
          }));
        } else {
          setStudentGradeError(res?.message || "Không thể tải điểm sinh viên từ máy chủ.");
        }
      } catch (err) {
        if (!cancelled) {
          console.error("Lỗi khi đọc điểm thật của sinh viên:", err);
          setStudentGradeError(err.message || "Không thể kết nối API đọc điểm sinh viên.");
        }
      } finally {
        if (!cancelled) {
          setLoadingStudentGrades(false);
        }
      }
    }

    fetchRealStudentGrades();

    return () => {
      cancelled = true;
    };
  }, [selectedStudent?.User_Key, selectedCourse?.Moodle_Course_ID, sourceReload]);

  // Handler khi nhận sự kiện chọn sinh viên từ visual Power BI
  const handlePowerBIStudentSelect = useCallback(
    ({ userKey, username }) => {
      const found = students.find(
        (s) =>
          (userKey && String(s.User_Key) === String(userKey)) ||
          (username &&
            String(s.Username || "").toLowerCase() ===
              String(username).toLowerCase())
      );

      if (found) {
        setSelectedStudent(found);
        showToast(
          `✓ Đã chọn sinh viên: ${found.Full_Name} (${found.Username})`
        );
      }
    },
    [students]
  );

  // ==============================================================================
  // 4. KIỂM SOÁT TRỌNG SỐ & TÍNH TOÁN BẢN NHÁP CHO TỪNG NHÓM
  // ==============================================================================
  const getGroupTotalWeight = useCallback((group) => {
    return group.items.reduce((sum, item) => sum + (Number(item.weight) || 0), 0);
  }, []);

  const totalOverallWeight = useMemo(() => {
    return groupsConfig.reduce((sum, g) => sum + (Number(g.overallWeight) || 0), 0);
  }, [groupsConfig]);

  const isOverallWeightValid = totalOverallWeight === 100;

  const groupDraftStates = useMemo(() => {
    const states = {};
    const stScores = scoresByStudent[currentStudentKey] || {};
    const stErrors = scoreErrors[currentStudentKey] || {};

    groupsConfig.forEach((group) => {
      const sumWeight = getGroupTotalWeight(group);
      const isWeightValid = sumWeight === 100;

      let hasNull = false;
      let hasError = false;
      let unenteredCount = 0;
      let weightedSum = 0;

      group.items.forEach((item) => {
        if (stErrors[item.id]) {
          hasError = true;
        }
        const val = stScores[item.id];
        if (val === null || val === undefined || val === "") {
          hasNull = true;
          unenteredCount++;
        } else {
          const num = Number(val);
          if (isNaN(num) || num < 0 || num > 10) {
            hasError = true;
          } else {
            weightedSum += num * ((Number(item.weight) || 0) / 100);
          }
        }
      });

      const draftScore =
        isWeightValid && !hasNull && !hasError
          ? Math.round(weightedSum * 100) / 100
          : null;

      states[group.key] = {
        totalWeight: sumWeight,
        isWeightValid,
        hasNull,
        hasError,
        unenteredCount,
        canConfirm: isWeightValid && !hasNull && !hasError,
        draftScore,
      };
    });

    return states;
  }, [groupsConfig, scoresByStudent, scoreErrors, currentStudentKey, getGroupTotalWeight]);

  const currentConfirmations = useMemo(() => {
    return (
      confirmations[currentStudentKey] || {
        chuyen_can: { confirmed: false, snapshotScore: null, confirmedAt: null },
        giua_ky: { confirmed: false, snapshotScore: null, confirmedAt: null },
        cuoi_ky: { confirmed: false, snapshotScore: null, confirmedAt: null },
        final: { confirmed: false, snapshotScore: null, confirmedAt: null },
      }
    );
  }, [confirmations, currentStudentKey]);

  const isChuyenCanConfirmed = currentConfirmations.chuyen_can?.confirmed === true;
  const isGiuaKyConfirmed = currentConfirmations.giua_ky?.confirmed === true;
  const isCuoiKyConfirmed = currentConfirmations.cuoi_ky?.confirmed === true;
  const areAllThreeGroupsConfirmed =
    isChuyenCanConfirmed && isGiuaKyConfirmed && isCuoiKyConfirmed && isOverallWeightValid;

  const calculatedFinalScore = useMemo(() => {
    if (!areAllThreeGroupsConfirmed) return null;

    const ccScore = currentConfirmations.chuyen_can.snapshotScore;
    const gkScore = currentConfirmations.giua_ky.snapshotScore;
    const ckScore = currentConfirmations.cuoi_ky.snapshotScore;

    if (ccScore === null || gkScore === null || ckScore === null) return null;

    const wCC = groupsConfig.find((g) => g.key === "chuyen_can")?.overallWeight ?? 10;
    const wGK = groupsConfig.find((g) => g.key === "giua_ky")?.overallWeight ?? 40;
    const wCK = groupsConfig.find((g) => g.key === "cuoi_ky")?.overallWeight ?? 50;

    const finalVal =
      Number(ccScore) * (wCC / 100) +
      Number(gkScore) * (wGK / 100) +
      Number(ckScore) * (wCK / 100);

    return Math.round(finalVal * 100) / 100;
  }, [areAllThreeGroupsConfirmed, currentConfirmations, groupsConfig]);

  const isFinalConfirmed = currentConfirmations.final?.confirmed === true;

  // ==============================================================================
  // 5. CÁC HÀM XỬ LÝ NHẬP ĐIỂM & HỦY XÁC NHẬN KHI SỬA
  // ==============================================================================
  const handleScoreChange = (groupKey, itemId, rawVal) => {
    if (!currentStudentKey) return;

    if(!dirtyItems.current.has(currentStudentKey))dirtyItems.current.set(currentStudentKey,new Set());
    dirtyItems.current.get(currentStudentKey).add(itemId);
    const validated = validateScoreInput(rawVal);

    setScoreErrors((prev) => ({
      ...prev,
      [currentStudentKey]: {
        ...(prev[currentStudentKey] || {}),
        [itemId]: validated.error,
      },
    }));

    setScoresByStudent((prev) => ({
      ...prev,
      [currentStudentKey]: {
        ...(prev[currentStudentKey] || {}),
        [itemId]: validated.isValid ? validated.value : rawVal,
      },
    }));

    // Hủy xác nhận của đúng nhóm này và điểm tổng kết liên quan
    setConfirmations((prev) => {
      const studentConf = prev[currentStudentKey] || {};
      return {
        ...prev,
        [currentStudentKey]: {
          ...studentConf,
          [groupKey]: { confirmed: false, snapshotScore: null, confirmedAt: null },
          final: { confirmed: false, snapshotScore: null, confirmedAt: null },
        },
      };
    });
  };

  // ==============================================================================
  // 6. CÁC HÀM XỬ LÝ ĐẦU ĐIỂM CHUNG CỦA LỚP
  // ==============================================================================
  const invalidateGroupForAllStudents = (groupKey) => {
    setConfirmations((prev) => {
      const next = { ...prev };
      Object.keys(next).forEach((stKey) => {
        if (next[stKey]) {
          next[stKey] = {
            ...next[stKey],
            [groupKey]: { confirmed: false, snapshotScore: null, confirmedAt: null },
            final: { confirmed: false, snapshotScore: null, confirmedAt: null },
          };
        }
      });
      return next;
    });
  };

  const handleUpdateItem = (groupKey, itemId, field, value) => {
    dirtyConfig.current.add(`${selectedCourse?.Course_Key}:${groupKey}`);
    setGroupsConfig((prev) =>
      prev.map((g) => {
        if (g.key !== groupKey) return g;
        return {
          ...g,
          items: g.items.map((it) =>
            it.id === itemId ? { ...it, [field]: value } : it
          ),
        };
      })
    );
    invalidateGroupForAllStudents(groupKey);
  };

  const handleAddItem = (groupKey) => {
    dirtyConfig.current.add(`${selectedCourse?.Course_Key}:${groupKey}`);
    const newId = `item_${groupKey}_${Date.now()}`;
    const defaultName = groupKey === "giua_ky" ? "Bài thực hành" : "Đầu điểm mới";
    const defaultWeight = 20;

    setGroupsConfig((prev) =>
      prev.map((g) => {
        if (g.key !== groupKey) return g;
        return {
          ...g,
          items: [
            ...g.items,
            {
              id: newId,
              name: defaultName,
              weight: defaultWeight,
              maxScore: 10,
              category: "Bổ sung",
              provenance: "Giảng viên thêm cho cả lớp",
            },
          ],
        };
      })
    );
    invalidateGroupForAllStudents(groupKey);
    showToast(
      `✓ Đã thêm đầu điểm "${defaultName}". Vui lòng điều chỉnh lại trọng số nhóm cho đủ 100%.`
    );
  };

  const handleRemoveItem = (groupKey, itemId) => {
    dirtyConfig.current.add(`${selectedCourse?.Course_Key}:${groupKey}`);
    const group = groupsConfig.find((g) => g.key === groupKey);
    if (group && group.items.length <= 1) {
      alert(`Nhóm "${group.name}" phải có tối thiểu 1 đầu điểm.`);
      return;
    }

    setGroupsConfig((prev) =>
      prev.map((g) => {
        if (g.key !== groupKey) return g;
        return {
          ...g,
          items: g.items.filter((it) => it.id !== itemId),
        };
      })
    );
    invalidateGroupForAllStudents(groupKey);
  };

  const handleUpdateOverallWeight = (groupKey, weightVal) => {
    dirtyConfig.current.add(`${selectedCourse?.Course_Key}:${groupKey}`);
    const num = Math.max(0, Math.min(100, Number(weightVal) || 0));
    setGroupsConfig((prev) =>
      prev.map((g) => (g.key === groupKey ? { ...g, overallWeight: num } : g))
    );
    // Trọng số mới chỉ vào Database khi xác nhận lại nhóm tương ứng.
    invalidateGroupForAllStudents(groupKey);
    // Hủy xác nhận tổng kết của cả lớp
    setConfirmations((prev) => {
      const next = { ...prev };
      Object.keys(next).forEach((stKey) => {
        if (next[stKey]) {
          next[stKey] = {
            ...next[stKey],
            final: { confirmed: false, snapshotScore: null, confirmedAt: null },
          };
        }
      });
      return next;
    });
  };

  // ==============================================================================
  // 7. HÀM XÁC NHẬN ĐIỂM TỪNG NHÓM & XÁC NHẬN ĐIỂM TỔNG KẾT
  // ==============================================================================
  const handleConfirmGroup = async (groupKey) => {
    if (savingGrades || loadingStudentGrades || studentGradeError) return;
    if (!selectedStudent || !currentStudentKey) return;

    let group = groupsConfig.find((g) => g.key === groupKey);
    const draftState = groupDraftStates[groupKey];

    if (!draftState.canConfirm) {
      if (!draftState.isWeightValid) {
        alert(
          `Chưa thể xác nhận nhóm ${group.name}: Tổng trọng số đang là ${draftState.totalWeight}%, cần đúng 100%.`
        );
      } else if (draftState.hasError) {
        alert(
          `Chưa thể xác nhận: Điểm nhập phải nằm trong khoảng 0 đến 10 và là bội số của 0.5.`
        );
      } else if (draftState.hasNull) {
        alert(
          `Chưa thể xác nhận: Còn ${draftState.unenteredCount} đầu điểm chưa chấm. Vui lòng nhập đủ điểm trước khi xác nhận.`
        );
      }
      return;
    }

    setSavingGrades(true);
    setSaveError("");
    try {
      let scores={...(scoresByStudent[currentStudentKey] || {})};
      if (showPowerBIEmbed && gradeReport) {
        if (!groupReader.current) throw new Error("Đang chờ đồng bộ thanh kéo Power BI. Vui lòng thử lại sau khi báo cáo tải xong.");
        const snapshot=await groupReader.current();
        if (!snapshot || Number(snapshot.courseId)!==Number(selectedCourse.Moodle_Course_ID) || Number(snapshot.userKey)!==Number(selectedStudent.User_Key)) throw new Error("Bộ lọc Power BI đang thay đổi; vui lòng thử lại.");
        group={...group,overallWeight:snapshot[groupKey]};
        if (['giua_ky','cuoi_ky'].includes(groupKey)) {
          const single=group.items.length===1 && Number(group.items[0].weight)===100 && group.items[0].sourceType!=='LMS_GRADE' && scoreOrigins[currentStudentKey]?.[group.items[0].id]!=='EXCEL';
          const expected=single ? snapshot[groupKey==='giua_ky'?'midterm':'final'] : draftState.draftScore;
          await verifyGroupCard(gradeReport,groupKey,expected);
          if(single) scores[group.items[0].id]=expected;
        }
      }
      const result = await saveGradeGroup(selectedCourse.Moodle_Course_ID, selectedStudent.User_Key, group, scores);
      dirtyConfig.current.delete(`${selectedCourse.Course_Key}:${groupKey}`);
      configDrafts.current.delete(`${selectedCourse.Course_Key}:${groupKey}`);
      for(const item of group.items) dirtyItems.current.get(currentStudentKey)?.delete(item.id);
      const nowStr = new Date().toLocaleTimeString("vi-VN", {hour:"2-digit",minute:"2-digit"});
      setGroupsConfig(prev => prev.map(g => g.key === groupKey ? result.group : g));
      setScoresByStudent(prev => ({...prev,[currentStudentKey]:{...prev[currentStudentKey],...result.scores}}));
      setConfirmations(prev => {
        const next = {...prev};
        if (result.configChanged) Object.keys(next).forEach(key => {
          next[key] = {...next[key],[groupKey]:{confirmed:false},final:{confirmed:false}};
        });
        next[currentStudentKey] = {...next[currentStudentKey],
          [groupKey]:{confirmed:true,snapshotScore:result.score,confirmedAt:nowStr},final:{confirmed:false}};
        return next;
      });
      showToast(`Đã lưu điểm nhóm ${group.name} vào Database: ${result.score} / 10.`);
    } catch (error) { setSaveError(error.message); }
    finally { setSavingGrades(false); }
  };

  const handleConfirmFinalScore = async () => {
    if (!selectedStudent || savingGrades || !areAllThreeGroupsConfirmed || calculatedFinalScore === null) return;
    setSavingGrades(true);
    setSaveError("");
    try {
      if(showPowerBIEmbed && gradeReport) {
        if(!groupReader.current) throw new Error("Chưa đọc được điểm Power BI; vui lòng chờ báo cáo tải xong.");
        const snapshot=await groupReader.current();
        if(!snapshot || Number(snapshot.courseId)!==Number(selectedCourse.Moodle_Course_ID) || Number(snapshot.userKey)!==Number(selectedStudent.User_Key)) throw new Error("Ngữ cảnh báo cáo đã thay đổi. Vui lòng kiểm tra lại sinh viên.");
        const weightsChanged=groupsConfig.some(g=>Number(g.overallWeight)!==snapshot[g.key]);
        const pointsChanged=[['giua_ky','midterm'],['cuoi_ky','final']].some(([key,field])=>{
          const group=groupsConfig.find(g=>g.key===key);
          return group?.items.length===1 && Number(group.items[0].weight)===100 && group.items[0].sourceType!=='LMS_GRADE' && scoreOrigins[currentStudentKey]?.[group.items[0].id]!=='EXCEL' && Number(scoresByStudent[currentStudentKey]?.[group.items[0].id])!==snapshot[field];
        });
        if(weightsChanged || pointsChanged) throw new Error("Thanh kéo vừa thay đổi. Điểm Web đã cập nhật; hãy xác nhận lại các nhóm trước khi chốt tổng kết.");
      }
      const result = await saveFinalGrade(selectedCourse.Moodle_Course_ID, selectedStudent.User_Key);
      setConfirmations(prev => ({...prev,[currentStudentKey]:{...prev[currentStudentKey],
        final:{confirmed:true,snapshotScore:result.score,confirmedAt:new Date().toLocaleTimeString("vi-VN",{hour:"2-digit",minute:"2-digit"})}}}));
      showToast(`Đã lưu điểm tổng kết vào Database: ${result.score} / 10.`);
    } catch (error) { setSaveError(error.message); }
    finally { setSavingGrades(false); }
  };

  const handlePowerBIGroupChange = (snapshot) => {
    if (Number(snapshot.courseId)!==Number(selectedCourse?.Moodle_Course_ID) || Number(snapshot.userKey)!==Number(selectedStudent?.User_Key)) return;
    const changed = groupsConfig.filter(g=>Number(g.overallWeight)!==snapshot[g.key]).map(g=>g.key);
    changed.forEach(key=>dirtyConfig.current.add(`${selectedCourse.Course_Key}:${key}`));
    const nextScores = {};
    for (const [key,field] of [['giua_ky','midterm'],['cuoi_ky','final']]) {
      const group=groupsConfig.find(g=>g.key===key);
      if(group?.items.length===1 && Number(group.items[0].weight)===100 && group.items[0].sourceType!=='LMS_GRADE' && scoreOrigins[currentStudentKey]?.[group.items[0].id]!=='EXCEL') {
        const id=group.items[0].id;
        if(scoresByStudent[currentStudentKey]?.[id]!==snapshot[field]) {nextScores[id]=snapshot[field];changed.push(key);}
      }
    }
    setGroupsConfig(prev=>prev.map(g=>Number(g.overallWeight)===snapshot[g.key]?g:{...g,overallWeight:snapshot[g.key]}));
    if(Object.keys(nextScores).length) {
      if(!dirtyItems.current.has(currentStudentKey))dirtyItems.current.set(currentStudentKey,new Set());
      Object.keys(nextScores).forEach(id=>dirtyItems.current.get(currentStudentKey).add(id));
      setScoresByStudent(prev=>({...prev,[currentStudentKey]:{...prev[currentStudentKey],...nextScores}}));
      setScoreErrors(prev=>({...prev,[currentStudentKey]:{...prev[currentStudentKey],...Object.fromEntries(Object.keys(nextScores).map(k=>[k,null]))}}));
    }
    if(changed.length) setConfirmations(prev=>{
      const next={...prev};
      for(const key of changed) {
        const weightChanged=groupsConfig.find(g=>g.key===key)?.overallWeight!==snapshot[key];
        for(const student of weightChanged?Object.keys(next).filter(k=>k.startsWith(`${selectedCourse.Course_Key}:`)):[currentStudentKey]) next[student]={...next[student],[key]:{...next[student]?.[key],confirmed:false},final:{confirmed:false}};
      }
      return next;
    });
  };

  const handleGradeSourceRefresh = ({courseId,force,itemKey}) => {
    if(Number(courseId)!==Number(selectedCourse?.Moodle_Course_ID))return;
    if(force && itemKey) for(const [student,ids] of dirtyItems.current) if(student.startsWith(`${selectedCourse.Course_Key}:`)) ids.delete(`item_${itemKey}`);
    setSourceReload(n=>n+1);
  };

  const handlePowerBIAdjustmentSaved = (result) => {
    const studentKey = `${selectedCourse?.Course_Key}:${result.userKey}`;
    // The request contains a captured identity; never apply an old response to a new course.
    if (Number(result.courseId) !== Number(selectedCourse?.Moodle_Course_ID)) return;
    dirtyItems.current.get(studentKey)?.delete(`item_${result.itemKey}`);
    setScoreOrigins(prev=>({...prev,[studentKey]:{...prev[studentKey],[`item_${result.itemKey}`]:'MANUAL'}}));
    setScoresByStudent(prev => ({...prev,[studentKey]:{...prev[studentKey],[`item_${result.itemKey}`]:result.score}}));
    setScoreErrors(prev => ({...prev,[studentKey]:{...prev[studentKey],[`item_${result.itemKey}`]:null}}));
    setGroupsConfig(prev => prev.map(g=>g.key===result.groupKey ? {...g,version:result.groupVersion,items:g.items.map(i=>i.itemKey===result.itemKey ? {...i,weight:result.weight}:i)}:g));
    setConfirmations(prev => {
      const next={...prev};
      const keys=result.configChanged ? Object.keys(next).filter(k=>k.startsWith(`${selectedCourse.Course_Key}:`)) : [studentKey];
      keys.forEach(key=>{next[key]={...next[key],[result.groupKey]:{...next[key]?.[result.groupKey],confirmed:false},final:{confirmed:false}};});
      return next;
    });
  };

  // ==============================================================================
  // 8. TÌM KIẾM VÀ TỔNG HỢP TOÀN BỘ LỚP
  // ==============================================================================
  const filteredStudents = useMemo(() => {
    const q = studentSearch.trim().toLowerCase();
    if (!q) return students;
    return students.filter(
      (s) =>
        String(s.Full_Name || "").toLowerCase().includes(q) ||
        String(s.Username || "").toLowerCase().includes(q) ||
        String(s.Email || "").toLowerCase().includes(q)
    );
  }, [students, studentSearch]);

  const classSummary = useMemo(() => {
    const total = students.length;
    let fullConfirmedCount = 0;
    let totalScoreSum = 0;

    students.forEach((s) => {
      const k = `${selectedCourse?.Course_Key}:${s.User_Key || s.Username}`;
      const conf = confirmations[k];
      if (conf?.final?.confirmed && conf.final.snapshotScore !== null) {
        fullConfirmedCount++;
        totalScoreSum += Number(conf.final.snapshotScore);
      }
    });

    const avgScore =
      fullConfirmedCount > 0 ? (totalScoreSum / fullConfirmedCount).toFixed(2) : "—";

    return {
      total,
      fullConfirmedCount,
      pendingCount: total - fullConfirmedCount,
      avgScore,
    };
  }, [students, confirmations, selectedCourse?.Course_Key]);

  const handleExportGrades = async () => {
    if (!selectedCourse || exportingGrades || savingGrades) return;
    setExportingGrades(true); setExportError('');
    try {
      const blob = await exportClassGradesApi(selectedCourse.Moodle_Course_ID, selectedCohort);
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      const code = String(selectedCourse.Course_Code || selectedCourse.Moodle_Course_ID).replace(/[^a-zA-Z0-9_-]/g, '_');
      link.download = `Bang_diem_${code}_${selectedCohort}.xlsx`;
      document.body.appendChild(link); link.click(); link.remove();
      setTimeout(() => URL.revokeObjectURL(url), 10000);
    } catch (err) { setExportError(err.message || 'Không xuất được bảng điểm.'); }
    finally { setExportingGrades(false); }
  };

  if (loading) {
    return <LoadingScreen message="Đang nạp dữ liệu Chấm điểm học tập..." />;
  }

  if (error) {
    return (
      <ErrorScreen
        message={error}
        onRetry={() => window.location.reload()}
        onBack={() => navigate("/")}
      />
    );
  }

  const activeGroup =
    groupsConfig.find((g) => g.key === activeGroupKey) || groupsConfig[0];
  const activeDraftState = groupDraftStates[activeGroup.key] || {};
  const activeConfirmation = currentConfirmations[activeGroup.key] || {};
  const studentScores = scoresByStudent[currentStudentKey] || {};
  const studentErrors = scoreErrors[currentStudentKey] || {};

  return (
    <div className="grading-page dlu-theme">
      {/* Sidebar giảng viên */}
      <Sidebar />

      <div className="grading-main-layout">
        {/* Header hệ thống */}
        <Header teacher={teacher} />

        <main className="grading-content-container" inert={savingGrades || undefined} aria-busy={savingGrades}>
          {savingGrades && <div role="status">Đang lưu điểm vào Database…</div>}
          {studentGradeError && <div role="alert" style={{padding:16,color:"#9f1239",background:"#fff1f2"}}>{studentGradeError} Chọn lại sinh viên hoặc tải lại trang để thử lại.</div>}
          {saveError && <div role="alert" style={{padding:16,color:"#9f1239",background:"#fff1f2"}}>{saveError}</div>}
          {studentsError && <div role="alert" style={{padding:16,background:'#fff1f2',color:'#9f1239',borderRadius:10,marginBottom:16}}>{studentsError} <button onClick={()=>setStudentsReload(n=>n+1)}>Thử tải lại</button></div>}
          {!loadingStudents && !studentsError && selectedCourse && !students.length && <div role="status" style={{padding:16,background:'#f8fafc',color:'#475569'}}>Không có sinh viên trong nguồn dữ liệu của môn và khóa đang chọn.</div>}

          {/* TOAST THÔNG BÁO NHANH */}
          {toastMessage && (
            <div className="grading-toast-banner" role="alert">
              <CheckCircle2 size={18} />
              <span>{toastMessage}</span>
            </div>
          )}

          {/* ==================================================================
              1. HEADER TRANG: TIÊU ĐỀ & BỘ CHỌN MÔN - KHÓA - SINH VIÊN
          ================================================================== */}
          <section className="dlu-card grading-top-header-card">
            <div className="top-header-row">
              <div className="page-title-wrap">
                <div className="page-icon-box">
                  <Award size={24} />
                </div>
                <div>
                  <h1 className="page-main-title">Mô phỏng điểm học phần</h1>
                  <p className="page-main-subtitle">
                    Chọn đầu điểm rồi kéo điểm và trọng số trong Power BI để tự lưu. Với bảng nhập bên dưới, bấm xác nhận nhóm để lưu và kiểm tra đủ điểm, đủ 100% trọng số.
                  </p>
                </div>
              </div>

              {/* THỐNG KÊ NHANH LỚP */}
              <div className="quick-class-stats">
                <div className="stat-pill">
                  <span className="stat-pill-label">Sĩ số:</span>
                  <strong className="stat-pill-val">{classSummary.total}</strong>
                </div>
                <div className="stat-pill success">
                  <span className="stat-pill-label">Đã chốt tổng kết:</span>
                  <strong className="stat-pill-val">{classSummary.fullConfirmedCount}</strong>
                </div>
                <div className="stat-pill warning">
                  <span className="stat-pill-label">Chờ hoàn tất:</span>
                  <strong className="stat-pill-val">{classSummary.pendingCount}</strong>
                </div>
                <div className="stat-pill info">
                  <span className="stat-pill-label">ĐTB đã chốt:</span>
                  <strong className="stat-pill-val">{classSummary.avgScore}</strong>
                </div>
              </div>
            </div>

            {/* BỘ CHỌN 3 TRƯỜNG: MÔN HỌC - KHÓA - SINH VIÊN */}
            <div className="top-selectors-bar">
              <div className="selector-item">
                <label htmlFor="course-select" className="selector-label">
                  <BookOpen size={14} /> Môn học / Lớp:
                </label>
                <select
                  id="course-select"
                  value={selectedCourse?.Moodle_Course_ID || ""}
                  onChange={(e) => {
                    const id = e.target.value;
                    const found = courses.find(
                      (c) => String(c.Moodle_Course_ID) === String(id)
                    );
                    setSelectedCourse(found || null);
                    setSearchParams({ courseId: id });
                  }}
                  className="dlu-select"
                >
                  {courses.map((c) => (
                    <option key={c.Moodle_Course_ID} value={c.Moodle_Course_ID}>
                      {c.Course_Code || "MÔN"} — {c.Course_Name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="selector-item">
                <label htmlFor="cohort-select" className="selector-label">
                  <Users size={14} /> Khóa học:
                </label>
                <select
                  id="cohort-select"
                  value={selectedCohort}
                  onChange={(e) => setSelectedCohort(e.target.value)}
                  className="dlu-select"
                >
                  {COHORT_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </div>

              <div className="selector-item selector-student-item">
                <label htmlFor="student-picker-select" className="selector-label">
                  <GraduationCap size={14} /> Sinh viên cần chấm:
                </label>
                <select
                  id="student-picker-select"
                  value={selectedStudent?.User_Key || ""}
                  onChange={(e) => {
                    const key = e.target.value;
                    const found = students.find((s) => String(s.User_Key) === String(key));
                    if (found) setSelectedStudent(found);
                  }}
                  className="dlu-select select-student-highlight"
                >
                  {students.map((s) => (
                    <option key={s.User_Key || s.Username} value={s.User_Key}>
                      {s.Full_Name} — {s.Username}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* THÔNG TIN SINH VIÊN ĐANG CHỌN (RÕ RÀNG, DỄ ĐỌC) */}
            {selectedStudent && (
              <div className="active-student-banner">
                <div className="student-profile-lead">
                  <div className="student-avatar-circle">
                    {(selectedStudent.Full_Name || "SV")
                      .split(" ")
                      .pop()
                      .charAt(0)
                      .toUpperCase()}
                  </div>
                  <div>
                    <h2 className="student-full-name">{selectedStudent.Full_Name}</h2>
                    <div className="student-meta-row">
                      <span className="student-meta-item">
                        MSSV: <strong>{selectedStudent.Username}</strong>
                      </span>
                      <span className="meta-dot">•</span>
                      <span className="student-meta-item">
                        Email: <strong>{selectedStudent.Email}</strong>
                      </span>
                      <span className="meta-dot">•</span>
                      <span className="student-meta-item">
                        Khóa: <strong>{selectedCohort}</strong>
                      </span>
                      <span className="meta-dot">•</span>
                      <span className="student-meta-item">
                        Trạng thái:{" "}
                        <strong className="text-emerald">
                          {studentGradeData?.enrolmentStatus || "Đang học"}
                        </strong>
                      </span>
                    </div>
                  </div>
                </div>

                {loadingStudentGrades && (
                  <div className="student-sync-notice">
                    <RotateCcw size={13} className="spin-icon" /> Đang đồng bộ điểm từ máy chủ...
                  </div>
                )}
              </div>
            )}
          </section>

          {/* ==================================================================
              KHUNG BÁO CÁO POWER BI SERVICE THẬT (GRADE SIMULATOR)
              Được thu gọn mặc định để ưu tiên không gian cho giáo viên chấm điểm
          ================================================================== */}
          <section className="dlu-card powerbi-embed-foldable-card">
            <div className="foldable-header" onClick={() => setShowPowerBIEmbed((v) => !v)}>
              <div className="foldable-title-group">
                <SlidersHorizontal size={17} className="text-emerald" />
                <span className="foldable-title">
                  Không gian mô phỏng Power BI
                </span>
                <span className="foldable-tag">
                  {POWER_BI_PAGES_CONFIG.GRADE_SIMULATOR.displayName}
                </span>
              </div>
              <button
                type="button"
                className="btn-toggle-foldable"
                aria-expanded={showPowerBIEmbed}
              >
                {showPowerBIEmbed ? (
                  <>
                    <EyeOff size={14} /> <span>Thu gọn báo cáo</span> <ChevronUp size={14} />
                  </>
                ) : (
                  <>
                    <Eye size={14} /> <span>Xem báo cáo Power BI nhúng</span> <ChevronDown size={14} />
                  </>
                )}
              </button>
            </div>

            {showPowerBIEmbed && (
              <div className="foldable-body">
                <div className="report-header-controls">
                  <div className="view-mode-buttons">
                    <button
                      type="button"
                      onClick={() => setReportViewMode("fitToPage")}
                      className={`btn-sub-toggle ${reportViewMode === "fitToPage" ? "active" : ""}`}
                    >
                      <Maximize2 size={13} /> Vừa toàn trang
                    </button>
                    <button
                      type="button"
                      onClick={() => setReportViewMode("fitToWidth")}
                      className={`btn-sub-toggle ${reportViewMode === "fitToWidth" ? "active" : ""}`}
                    >
                      <StretchHorizontal size={13} /> Vừa chiều rộng
                    </button>
                  </div>

                  <button
                    type="button"
                    onClick={() => setIsReportExpanded((prev) => !prev)}
                    className="btn-sub-toggle"
                  >
                    {isReportExpanded ? <Minimize2 size={13} /> : <Maximize size={13} />}
                    {isReportExpanded ? "Thu gọn chiều cao" : "Mở rộng chiều cao"}
                  </button>

                  <span className="secure-tag-mini">
                    <span className="dot-green" /> Microsoft Entra Verified
                  </span>
                </div>

                <div className="grade-report-workbench">
                <GradeGroupBridge report={gradeReport} courseId={selectedCourse?.Moodle_Course_ID} courseKey={selectedCourse?.Course_Key}
                  userKey={selectedStudent?.User_Key} onChange={handlePowerBIGroupChange} onReader={registerGroupReader}
                  disabled={loadingStudentGrades || !!studentGradeError || !selectedStudent} />
                <GradeAdjustmentBridge
                  report={gradeReport} courseId={selectedCourse?.Moodle_Course_ID} courseKey={selectedCourse?.Course_Key}
                  userKey={selectedStudent?.User_Key} groups={groupsConfig} scores={studentScores}
                  groupKey={activeGroupKey} onGroupChange={setActiveGroupKey}
                  onSaved={handlePowerBIAdjustmentSaved}
                  disabled={loadingStudentGrades || savingGrades || !!studentGradeError || !selectedStudent}
                />
                </div>
                <div className="embed-wrapper">
                  <SecurePowerBIReport
                    onLoaded={setGradeReport}
                    courseKey={selectedCourse?.Course_Key || 11}
                    cohort={selectedCohort}
                    userKey={selectedStudent?.User_Key}
                    username={selectedStudent?.Username}
                    targetPage={POWER_BI_PAGES_CONFIG.GRADE_SIMULATOR.id}
                    targetPageDisplayName={POWER_BI_PAGES_CONFIG.GRADE_SIMULATOR.displayName}
                    displayOption={reportViewMode}
                    displayMode={reportViewMode}
                    isExpanded={isReportExpanded}
                    height={isReportExpanded ? "900px" : reportViewMode === "fitToPage" ? "auto" : "720px"}
                    onStudentSelect={handlePowerBIStudentSelect}
                  />
                </div>
              </div>
            )}
          </section>

          {/* ==================================================================
              2 & 5. KHU VỰC CHẤM ĐIỂM (TRÁI) & BỘ TÍNH ĐIỂM 4 THẺ (PHẢI)
          ================================================================== */}
          <div className="grading-main-grid" inert={loadingStudentGrades || !!studentGradeError || !selectedStudent || undefined}>
            {/* CỘT TRÁI (ƯU TIÊN DIỆN TÍCH LỚN ĐỂ NHẬP LIỆU: ~62%) */}
            <div className="dlu-card grading-input-card">
              {/* THANH 3 TABS: CHUYÊN CẦN | GIỮA KỲ | CUỐI KỲ */}
              <div className="grading-group-tabs" role="tablist">
                {groupsConfig.map((grp) => {
                  const isActive = grp.key === activeGroupKey;
                  const grpConf = currentConfirmations[grp.key] || {};
                  const isConfirmed = grpConf.confirmed === true;
                  const draft = groupDraftStates[grp.key] || {};

                  return (
                    <button
                      key={grp.key}
                      type="button"
                      role="tab"
                      aria-selected={isActive}
                      onClick={() => setActiveGroupKey(grp.key)}
                      className={`group-tab-btn ${isActive ? "active" : ""} ${
                        isConfirmed ? "confirmed" : ""
                      }`}
                    >
                      <div className="tab-left-indicator">
                        <span className="tab-number">
                          {isConfirmed ? <Check size={14} /> : grp.stepNumber}
                        </span>
                        <div className="tab-label-wrap">
                          <span className="tab-name">{grp.name}</span>
                          <span className="tab-weight-sub">
                            Hệ số: <strong>{grp.overallWeight}%</strong>
                          </span>
                        </div>
                      </div>

                      <div className="tab-right-badge">
                        {isConfirmed ? (
                          <span className="badge-pill badge-green">
                            Đã xác nhận ({Number(grpConf.snapshotScore).toFixed(1)}đ)
                          </span>
                        ) : !draft.isWeightValid ? (
                          <span className="badge-pill badge-red">Trọng số ≠ 100%</span>
                        ) : (
                          <span className="badge-pill badge-gray">Chưa xác nhận</span>
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>

              {/* TIÊU ĐỀ NHÓM & MÔ TẢ GỌN GÀNG */}
              <div className="group-content-header">
                <div>
                  <h3 className="group-title">
                    Nhóm {activeGroup.stepNumber}: Điểm {activeGroup.name}
                  </h3>
                  <p className="group-desc">{activeGroup.description}</p>
                </div>

                <div className="group-header-controls">
                  <div className="overall-weight-box">
                    <label htmlFor={`weight-${activeGroup.key}`}>Trọng số tổng kết:</label>
                    <div className="weight-input-flex">
                      <input
                        id={`weight-${activeGroup.key}`}
                        type="number"
                        min="0"
                        max="100"
                        step="0.5"
                        value={activeGroup.overallWeight}
                        onChange={(e) =>
                          handleUpdateOverallWeight(activeGroup.key, e.target.value)
                        }
                        className="weight-mini-input"
                      />
                      <span>%</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* BẢNG ĐẦU ĐIỂM CỦA NHÓM ĐANG CHỌN (GỌN, CHỮ TO, DỄ NHẬP) */}
              <GradeSourcesPanel courseId={selectedCourse?.Moodle_Course_ID} group={activeGroup}
                onRefresh={handleGradeSourceRefresh} disabled={savingGrades || loadingStudentGrades || !!studentGradeError}
                hasUnsavedConfig={dirtyConfig.current.has(`${selectedCourse?.Course_Key}:${activeGroup.key}`)} />
              <div className="criteria-table-wrap">
                <table className="dlu-table criteria-table">
                  <thead>
                    <tr>
                      <th style={{ width: "45px", textAlign: "center" }}>STT</th>
                      <th>Tên đầu điểm đánh giá</th>
                      <th style={{ width: "120px", textAlign: "center" }}>Trọng số</th>
                      <th style={{ width: "160px", textAlign: "center" }}>Điểm số (0 – 10)</th>
                      <th style={{ width: "120px", textAlign: "center" }}>Tình trạng</th>
                      <th style={{ width: "60px", textAlign: "center" }}>Xóa</th>
                    </tr>
                  </thead>
                  <tbody>
                    {activeGroup.items.map((item, idx) => {
                      const scoreVal = studentScores[item.id];
                      const errorMsg = studentErrors[item.id];
                      const isNull = scoreVal === null || scoreVal === undefined;

                      return (
                        <tr
                          key={item.id}
                          className={`criteria-row ${errorMsg ? "row-error" : ""}`}
                        >
                          <td style={{ textAlign: "center", color: "#64748b", fontWeight: 600 }}>
                            {idx + 1}
                          </td>

                          {/* TÊN ĐẦU ĐIỂM (KHÔNG CẮT CỤT) */}
                          <td>
                            <div className="item-title-field">
                              <input
                                type="text"
                                value={item.name}
                                onChange={(e) =>
                                  handleUpdateItem(
                                    activeGroup.key,
                                    item.id,
                                    "name",
                                    e.target.value
                                  )
                                }
                                placeholder="Nhập tên đầu điểm..."
                                className="item-name-textbox"
                              />
                              {item.category && (
                                <span className="item-category-tag">{scoreOrigins[currentStudentKey]?.[item.id]==='EXCEL'?'Excel':item.sourceType==='LMS_GRADE'?(scoreOrigins[currentStudentKey]?.[item.id]==='MANUAL'?'LMS · đã chỉnh tay':'LMS tự động'):item.category}</span>
                              )}
                            </div>
                          </td>

                          {/* TRỌNG SỐ NỘI BỘ */}
                          <td style={{ textAlign: "center" }}>
                            <div className="weight-cell-flex">
                              <input
                                type="number"
                                min="0"
                                max="100"
                                step="1"
                                value={item.weight}
                                onChange={(e) =>
                                  handleUpdateItem(
                                    activeGroup.key,
                                    item.id,
                                    "weight",
                                    Math.max(0, Math.min(100, Number(e.target.value) || 0))
                                  )
                                }
                                className="item-weight-textbox"
                              />
                              <span className="percent-sign">%</span>
                            </div>
                          </td>

                          {/* Ô NHẬP ĐIỂM (RÕ RÀNG, DỄ NHẬP) */}
                          <td style={{ textAlign: "center" }}>
                            <div className="score-input-container">
                              <input
                                type="number"
                                step="0.5"
                                min="0"
                                max="10"
                                value={isNull ? "" : scoreVal}
                                onChange={(e) =>
                                  handleScoreChange(activeGroup.key, item.id, e.target.value)
                                }
                                placeholder="Chưa chấm"
                                className={`item-score-textbox ${
                                  isNull ? "is-empty" : "has-value"
                                } ${errorMsg ? "has-error" : ""}`}
                              />
                              <span className="score-max-hint">/ 10</span>
                            </div>
                            {errorMsg && (
                              <div className="cell-error-message">
                                <span>{errorMsg}</span>
                              </div>
                            )}
                          </td>

                          {/* TÌNH TRẠNG */}
                          <td style={{ textAlign: "center" }}>
                            {isNull ? (
                              <span className="status-badge-text unentered">Chưa chấm</span>
                            ) : (
                              <span className="status-badge-text entered">
                                <Check size={12} /> Đã có điểm
                              </span>
                            )}
                          </td>

                          {/* NÚT XÓA */}
                          <td style={{ textAlign: "center" }}>
                            <button
                              type="button"
                              onClick={() => handleRemoveItem(activeGroup.key, item.id)}
                              disabled={activeGroup.items.length <= 1}
                              title={
                                activeGroup.items.length <= 1
                                  ? "Mỗi nhóm cần ít nhất 1 đầu điểm"
                                  : "Xóa đầu điểm này"
                              }
                              className="btn-trash-action"
                            >
                              <Trash2 size={15} />
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>

                {/* NÚT THÊM ĐẦU ĐIỂM */}
                <div className="add-criteria-footer">
                  <button
                    type="button"
                    onClick={() => handleAddItem(activeGroup.key)}
                    className="btn-dlu-outline"
                  >
                    <Plus size={15} /> Thêm đầu điểm cho {activeGroup.name}
                  </button>
                  <span className="add-criteria-hint">
                    Thêm đầu điểm áp dụng chung cho cả lớp; điểm số chấm độc lập theo từng sinh viên.
                  </span>
                </div>
              </div>

              {/* 4. CHÂN KHU VỰC NHÓM: TRỌNG SỐ 100%, KẾT QUẢ VÀ NÚT XÁC NHẬN */}
              <div className="group-bottom-summary">
                {/* TRẠNG THÁI TRỌNG SỐ & ĐIỂM DỰ KIẾN */}
                <div className="summary-info-col">
                  {/* Trạng thái trọng số */}
                  <div
                    className={`weight-status-banner ${
                      activeDraftState.isWeightValid ? "valid" : "invalid"
                    }`}
                  >
                    {activeDraftState.isWeightValid ? (
                      <CheckCircle2 size={16} className="text-emerald" />
                    ) : (
                      <AlertTriangle size={16} className="text-danger" />
                    )}
                    <span>
                      {activeDraftState.isWeightValid ? (
                        <>
                          Tổng trọng số: <strong>100% (Hợp lệ)</strong>
                        </>
                      ) : activeDraftState.totalWeight < 100 ? (
                        <>
                          Tổng trọng số hiện tại: <strong>{activeDraftState.totalWeight}%</strong>{" "}
                          (Còn thiếu {100 - activeDraftState.totalWeight}%, cần đúng 100%)
                        </>
                      ) : (
                        <>
                          Tổng trọng số hiện tại: <strong>{activeDraftState.totalWeight}%</strong>{" "}
                          (Vượt quá {activeDraftState.totalWeight - 100}%, cần giảm về 100%)
                        </>
                      )}
                    </span>
                  </div>

                  {/* Điểm nhóm tạm tính */}
                  <div className="draft-score-row">
                    <span className="draft-score-label">Điểm nhóm {activeGroup.name} tạm tính:</span>
                    {activeDraftState.draftScore !== null ? (
                      <span className="draft-score-number">
                        <strong>{activeDraftState.draftScore.toFixed(2)}</strong> / 10
                      </span>
                    ) : (
                      <span className="draft-score-pending">
                        {activeDraftState.hasNull
                          ? `(Còn ${activeDraftState.unenteredCount} đầu điểm chưa chấm)`
                          : !activeDraftState.isWeightValid
                          ? "(Chưa đủ 100% trọng số)"
                          : "(Có điểm chưa hợp lệ)"}
                      </span>
                    )}
                  </div>
                </div>

                {/* NÚT XÁC NHẬN ĐIỂM NHÓM */}
                <div className="summary-action-col">
                  {activeConfirmation.confirmed ? (
                    <div className="confirmed-badge-box">
                      <CheckCircle2 size={16} />
                      <div>
                        <strong>ĐÃ XÁC NHẬN ĐIỂM {activeGroup.name.toUpperCase()}</strong>
                        <span className="confirmed-time-text">
                          Lúc {activeConfirmation.confirmedAt} • Điểm chốt:{" "}
                          <strong>{activeConfirmation.snapshotScore}</strong>
                        </span>
                      </div>
                    </div>
                  ) : null}

                  <button
                    type="button"
                    onClick={() => handleConfirmGroup(activeGroup.key)}
                    disabled={!activeDraftState.canConfirm || savingGrades || loadingStudentGrades || !!studentGradeError}
                    className={`btn-confirm-group-primary ${
                      activeDraftState.canConfirm ? "ready" : "locked"
                    }`}
                  >
                    <CheckCircle2 size={17} />
                    <span>Lưu và xác nhận điểm nhóm {activeGroup.name}</span>
                  </button>
                </div>
              </div>
            </div>

            {/* CỘT PHẢI: BỘ TÍNH ĐIỂM DẠNG 4 THẺ (38%) */}
            <aside className="dlu-card grading-calculator-card">
              <div className="calc-card-header">
                <div className="calc-title-wrap">
                  <div className="calc-icon-badge">
                    <BarChart3 size={18} />
                  </div>
                  <div>
                    <h3 className="calc-title">Bộ tính điểm học phần</h3>
                    <span className="calc-subtitle">
                      Mô phỏng bộ tính điểm What-if (Chỉ sử dụng điểm đã xác nhận)
                    </span>
                  </div>
                </div>
              </div>

              {/* 4 THẺ KẾT QUẢ ĐIỂM: CHUYÊN CẦN - GIỮA KỲ - CUỐI KỲ - TỔNG KẾT */}
              <div className="four-cards-grid">
                {/* THẺ 1: CHUYÊN CẦN */}
                <div
                  className={`score-kpi-card ${
                    isChuyenCanConfirmed ? "is-confirmed" : "is-pending"
                  }`}
                >
                  <div className="kpi-card-header">
                    <span className="kpi-name">1. Chuyên cần</span>
                    <span className="kpi-weight-badge">
                      {groupsConfig.find((g) => g.key === "chuyen_can")?.overallWeight}%
                    </span>
                  </div>
                  <div className="kpi-value-row">
                    {isChuyenCanConfirmed ? (
                      <>
                        <span className="kpi-number text-emerald">
                          {Number(currentConfirmations.chuyen_can.snapshotScore).toFixed(2)}
                        </span>
                        <span className="kpi-max">/ 10</span>
                      </>
                    ) : (
                      <span className="kpi-placeholder">—</span>
                    )}
                  </div>
                  <div className="kpi-card-footer">
                    {isChuyenCanConfirmed ? (
                      <span className="kpi-status-tag confirmed">
                        <Check size={11} /> Đã xác nhận
                      </span>
                    ) : (
                      <span className="kpi-status-tag pending">Chưa xác nhận</span>
                    )}
                  </div>
                </div>

                {/* THẺ 2: GIỮA KỲ */}
                <div
                  className={`score-kpi-card ${
                    isGiuaKyConfirmed ? "is-confirmed" : "is-pending"
                  }`}
                >
                  <div className="kpi-card-header">
                    <span className="kpi-name">2. Giữa kỳ</span>
                    <span className="kpi-weight-badge">
                      {groupsConfig.find((g) => g.key === "giua_ky")?.overallWeight}%
                    </span>
                  </div>
                  <div className="kpi-value-row">
                    {isGiuaKyConfirmed ? (
                      <>
                        <span className="kpi-number text-blue">
                          {Number(currentConfirmations.giua_ky.snapshotScore).toFixed(2)}
                        </span>
                        <span className="kpi-max">/ 10</span>
                      </>
                    ) : (
                      <span className="kpi-placeholder">—</span>
                    )}
                  </div>
                  <div className="kpi-card-footer">
                    {isGiuaKyConfirmed ? (
                      <span className="kpi-status-tag confirmed">
                        <Check size={11} /> Đã xác nhận
                      </span>
                    ) : (
                      <span className="kpi-status-tag pending">Chưa xác nhận</span>
                    )}
                  </div>
                </div>

                {/* THẺ 3: CUỐI KỲ */}
                <div
                  className={`score-kpi-card ${
                    isCuoiKyConfirmed ? "is-confirmed" : "is-pending"
                  }`}
                >
                  <div className="kpi-card-header">
                    <span className="kpi-name">3. Cuối kỳ</span>
                    <span className="kpi-weight-badge">
                      {groupsConfig.find((g) => g.key === "cuoi_ky")?.overallWeight}%
                    </span>
                  </div>
                  <div className="kpi-value-row">
                    {isCuoiKyConfirmed ? (
                      <>
                        <span className="kpi-number text-purple">
                          {Number(currentConfirmations.cuoi_ky.snapshotScore).toFixed(2)}
                        </span>
                        <span className="kpi-max">/ 10</span>
                      </>
                    ) : (
                      <span className="kpi-placeholder">—</span>
                    )}
                  </div>
                  <div className="kpi-card-footer">
                    {isCuoiKyConfirmed ? (
                      <span className="kpi-status-tag confirmed">
                        <Check size={11} /> Đã xác nhận
                      </span>
                    ) : (
                      <span className="kpi-status-tag pending">Chưa xác nhận</span>
                    )}
                  </div>
                </div>

                {/* THẺ 4: TỔNG KẾT HỌC PHẦN */}
                <div
                  className={`score-kpi-card final-kpi-card ${
                    areAllThreeGroupsConfirmed ? "is-ready" : "is-incomplete"
                  }`}
                >
                  <div className="kpi-card-header">
                    <span className="kpi-name final-name">
                      <Award size={14} /> Điểm tổng kết
                    </span>
                    <span className="kpi-weight-badge final-badge">100%</span>
                  </div>
                  <div className="kpi-value-row">
                    {areAllThreeGroupsConfirmed && calculatedFinalScore !== null ? (
                      <>
                        <span className="kpi-number final-number">
                          {calculatedFinalScore.toFixed(2)}
                        </span>
                        <span className="kpi-max">/ 10</span>
                      </>
                    ) : (
                      <span className="kpi-placeholder">—</span>
                    )}
                  </div>
                  <div className="kpi-card-footer">
                    {isFinalConfirmed ? (
                      <span className="kpi-status-tag final-confirmed">
                        <CheckCircle2 size={11} /> Đã chốt tổng kết
                      </span>
                    ) : areAllThreeGroupsConfirmed ? (
                      <span className="kpi-status-tag ready-to-confirm">
                        Đủ điều kiện chốt
                      </span>
                    ) : (
                      <span className="kpi-status-tag incomplete">
                        Chờ đủ 3 nhóm
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* CÔNG THỨC & KIỂM TRA TRỌNG SỐ TỔNG KẾT */}
              <div className="final-formula-container">
                <div className="formula-caption">
                  <Calculator size={13} /> Công thức tính điểm tổng kết:
                </div>
                <div className="formula-equation">
                  Tổng kết = Chuyên cần × {groupsConfig.find((g) => g.key === "chuyen_can")?.overallWeight}% + Giữa kỳ × {groupsConfig.find((g) => g.key === "giua_ky")?.overallWeight}% + Cuối kỳ × {groupsConfig.find((g) => g.key === "cuoi_ky")?.overallWeight}%
                </div>

                <div className="formula-weight-summary">
                  <span>
                    Tổng trọng số 3 nhóm: <strong>{totalOverallWeight}%</strong>
                  </span>
                  {isOverallWeightValid ? (
                    <span className="text-emerald font-semibold">✓ Đủ 100%</span>
                  ) : (
                    <span className="text-danger font-semibold">
                      ⚠ Chưa đạt 100% (Không thể chốt)
                    </span>
                  )}
                </div>
              </div>

              {/* NÚT XÁC NHẬN ĐIỂM TỔNG KẾT */}
              <div className="final-action-wrap">
                <button
                  type="button"
                  onClick={handleConfirmFinalScore}
                  disabled={!areAllThreeGroupsConfirmed || calculatedFinalScore === null || savingGrades || loadingStudentGrades || !!studentGradeError}
                  className={`btn-confirm-final-grade ${
                    areAllThreeGroupsConfirmed && calculatedFinalScore !== null
                      ? "active"
                      : "disabled"
                  }`}
                >
                  <Award size={18} />
                  <span>Lưu và xác nhận điểm tổng kết</span>
                </button>
                <span className="final-action-hint">
                  {areAllThreeGroupsConfirmed
                    ? "Cả 3 nhóm đã được xác nhận. Bấm để chốt điểm tổng kết cho sinh viên này."
                    : "Cần xác nhận điểm đủ cả 3 nhóm (Chuyên cần, Giữa kỳ, Cuối kỳ) để mở khóa nút chốt."}
                </span>
              </div>

              {/* THÔNG TIN MINH BẠCH VỀ DEMO */}
              <div className="demo-integrity-note">
                <Info size={14} className="text-blue" />
                <span>
                  <strong>Lưu ý:</strong> Điểm trong khung này được lưu vào MySQL khi xác nhận. Điểm danh và điểm bài tập LMS gốc được giữ nguyên; thay đổi các điểm này được lưu riêng trong bản mô phỏng. Power BI cần làm mới dữ liệu để nhận các điểm ngoài LMS và đầu điểm mới, không tự đồng bộ các thanh What-if.
                </span>
              </div>
            </aside>
          </div>

          {/* ==================================================================
              6. CHI TIẾT KỸ THUẬT & TRẠNG THÁI TÍCH HỢP (THU GỌN MẶC ĐỊNH CHO DEV)
          ================================================================== */}
          <section className="dlu-card technical-details-card">
            <div
              className="tech-details-header"
              onClick={() => setShowTechDetails((v) => !v)}
            >
              <div className="tech-title-group">
                <Layers size={16} className="text-emerald" />
                <span className="tech-title">
                  Chi tiết kỹ thuật & Lộ trình tích hợp Power BI / MySQL (Dành cho nhà phát triển)
                </span>
              </div>
              <button
                type="button"
                className="btn-toggle-tech"
                aria-expanded={showTechDetails}
              >
                {showTechDetails ? (
                  <>
                    <span>Thu gọn</span> <ChevronUp size={14} />
                  </>
                ) : (
                  <>
                    <span>Mở rộng</span> <ChevronDown size={14} />
                  </>
                )}
              </button>
            </div>

            {showTechDetails && (
              <div className="tech-details-body">
                <div className="tech-grid">
                  <div className="tech-column">
                    <h4 className="tech-col-title">Nguồn dữ liệu thực tế (MySQL Data Warehouse):</h4>
                    <ul className="tech-list">
                      <li>
                        <strong>Chuyên cần:</strong> Tích hợp tự động từ bảng <code>fact_attendance</code> (ghi nhận buổi có mặt / muộn / vắng).
                      </li>
                      <li>
                        <strong>Bài tập LMS:</strong> Đọc trực tiếp từ <code>Fact_Course_Grade</code> với mã Moodle LMS tương ứng.
                      </li>
                      <li>
                        <strong>Điểm ngoài LMS:</strong> Đọc từ <code>fact_teacher_grade_score</code>.
                      </li>
                      <li>
                        <strong>Nguyên tắc an toàn:</strong> Xác nhận nhóm lưu cấu hình, điểm ngoài LMS và bản mô phỏng bằng giao dịch MySQL, có kiểm tra quyền giảng viên.
                      </li>
                    </ul>
                  </div>

                  <div className="tech-column">
                    <h4 className="tech-col-title">Lộ trình triển khai PBIX / DAX thực tế:</h4>
                    <ul className="tech-list">
                      <li>
                        <strong>Bước 1 (DAX):</strong> Tạo Measure trong Power BI:
                        <br />
                        <code>[Final_Grade] = [Attendance_Score]*[W_CC] + [Midterm_Score]*[W_GK] + [Final_Score]*[W_CK]</code>
                      </li>
                      <li>
                        <strong>Bước 2 (What-if):</strong> Tạo 3 What-if Parameters trong file PBIX để giảng viên kéo thanh trượt điều chỉnh trọng số trực tiếp trên canvas.
                      </li>
                      <li>
                        <strong>Bước 3 (Power Apps Visual):</strong> Nhúng visual Power Apps vào canvas Power BI kết nối REST API để chốt điểm chính thức vào hệ thống khi nhà trường nghiệm thu.
                      </li>
                    </ul>
                  </div>
                </div>
              </div>
            )}
          </section>

          {/* ==================================================================
              7. BẢNG TỔNG HỢP TOÀN BỘ ĐIỂM CỦA LỚP HỌC
          ================================================================== */}
          <section className="dlu-card class-table-section">
            <div className="class-table-toolbar">
              <div className="class-table-title-wrap">
                <Users size={18} className="text-emerald" />
                <h3 className="class-table-title">
                  Bảng tổng hợp điểm lớp {selectedCourse?.Course_Code} ({selectedCohort})
                </h3>
                <span className="badge-pill badge-gray">
                  {filteredStudents.length} / {students.length} Sinh viên
                </span>
              </div>

              <div className="grade-table-actions">
                <button type="button" className="btn-export-grades"
                  disabled={!selectedCourse || exportingGrades || savingGrades || loadingStudents || loadingStudentGrades}
                  onClick={handleExportGrades}>
                  <Download size={16} /> {exportingGrades ? 'Đang xuất...' : 'Xuất Excel'}
                </button>

              {/* TÌM KIẾM SINH VIÊN */}
              <div className="table-search-input-wrap">
                <Search size={15} />
                <input
                  type="text"
                  placeholder="Tìm sinh viên theo tên hoặc MSSV..."
                  value={studentSearch}
                  onChange={(e) => setStudentSearch(e.target.value)}
                  className="table-search-textbox"
                />
              </div>
            </div>

            </div>
            <p className="grade-export-note">Xuất toàn bộ lớp trong khóa đang chọn, chỉ gồm điểm đã xác nhận lưu. Điểm chưa chốt để trống; chưa gửi lên LMS.</p>
            {exportError && <p className="grade-export-error" role="alert">{exportError}</p>}

            <div className="table-responsive-box">
              <table className="dlu-table class-summary-table">
                <thead>
                  <tr>
                    <th style={{ width: "45px", textAlign: "center" }}>STT</th>
                    <th style={{ width: "110px" }}>MSSV</th>
                    <th>Họ và tên</th>
                    <th style={{ textAlign: "center", width: "130px" }}>
                      Chuyên cần ({groupsConfig.find((g) => g.key === "chuyen_can")?.overallWeight}%)
                    </th>
                    <th style={{ textAlign: "center", width: "130px" }}>
                      Giữa kỳ ({groupsConfig.find((g) => g.key === "giua_ky")?.overallWeight}%)
                    </th>
                    <th style={{ textAlign: "center", width: "130px" }}>
                      Cuối kỳ ({groupsConfig.find((g) => g.key === "cuoi_ky")?.overallWeight}%)
                    </th>
                    <th style={{ textAlign: "center", width: "140px" }}>Điểm tổng kết</th>
                    <th style={{ textAlign: "center", width: "120px" }}>Thao tác</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredStudents.map((st, idx) => {
                    const stKey = `${selectedCourse?.Course_Key}:${st.User_Key || st.Username}`;
                    const isSelected = String(selectedStudent?.User_Key) === String(st.User_Key);
                    const conf = confirmations[stKey] || {};

                    return (
                      <tr
                        key={st.User_Key || st.Username}
                        className={`student-row ${isSelected ? "is-selected-row" : ""}`}
                        onClick={() => setSelectedStudent(st)}
                      >
                        <td style={{ textAlign: "center", color: "#64748b" }}>{idx + 1}</td>
                        <td>
                          <code className="student-code">{st.Username}</code>
                        </td>
                        <td>
                          <strong className="student-name">{st.Full_Name}</strong>
                        </td>
                        <td style={{ textAlign: "center" }}>
                          {conf.chuyen_can?.confirmed ? (
                            <span className="table-score-tag confirmed">
                              {Number(conf.chuyen_can.snapshotScore).toFixed(1)}
                            </span>
                          ) : (
                            <span className="table-score-tag pending">—</span>
                          )}
                        </td>
                        <td style={{ textAlign: "center" }}>
                          {conf.giua_ky?.confirmed ? (
                            <span className="table-score-tag confirmed">
                              {Number(conf.giua_ky.snapshotScore).toFixed(1)}
                            </span>
                          ) : (
                            <span className="table-score-tag pending">—</span>
                          )}
                        </td>
                        <td style={{ textAlign: "center" }}>
                          {conf.cuoi_ky?.confirmed ? (
                            <span className="table-score-tag confirmed">
                              {Number(conf.cuoi_ky.snapshotScore).toFixed(1)}
                            </span>
                          ) : (
                            <span className="table-score-tag pending">—</span>
                          )}
                        </td>
                        <td style={{ textAlign: "center" }}>
                          {conf.final?.confirmed ? (
                            <span className="table-score-tag final">
                              {Number(conf.final.snapshotScore).toFixed(2)}
                            </span>
                          ) : (
                            <span className="table-score-tag pending">—</span>
                          )}
                        </td>
                        <td style={{ textAlign: "center" }}>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedStudent(st);
                              window.scrollTo({ top: 120, behavior: "smooth" });
                            }}
                            className={`btn-table-action ${isSelected ? "active" : ""}`}
                          >
                            {isSelected ? "Đang chọn" : "Chấm điểm"}
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </section>
        </main>
      </div>
    </div>
  );
}

export default Grading;
