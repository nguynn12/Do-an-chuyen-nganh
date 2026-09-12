import {
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  Search,
  Users,
  AlertTriangle,
  UserCheck,
  Download,
  SlidersHorizontal,
  X,
  GraduationCap,
  ClipboardCheck,
  Clock3,
  CalendarClock,
  CheckCircle2,
  BarChart3,
  Activity,
  TrendingUp,
} from "lucide-react";

import {
  useNavigate,
  useParams,
} from "react-router-dom";

import Header from "../components/Header";
import Sidebar from "../components/Sidebar";

import ClassStats from "../components/class-management/ClassStats";
import StudentTable from "../components/class-management/StudentTable";

import {
  getTeacher,
  getTeacherCourses,
  getCourseStudents,
  getCourseStudentAnalytics,
  getCourseGradeDistribution,
  getCourseEngagementTrend,
} from "../services/teacherApi";

import "../styles/TeacherOverview.css";
import "../styles/ClassManagement.css";


// ======================================================
// NORMALIZE TEACHER
// ======================================================

function normalizeTeacher(data) {
  return {
    id: data.Moodle_User_ID,
    userKey: data.User_Key,
    username: data.Username,
    name: data.Full_Name,
    fullName: data.Full_Name,
    email: data.Email,
    role: data.Primary_Role,
    initials: "GV",
  };
}



// ======================================================
// STUDENT ANALYTICS PANEL HELPERS
// ======================================================

function formatLearningTime(minutes) {
  const value =
    Number(minutes || 0);

  if (value <= 0) {
    return "Chưa có dữ liệu";
  }

  const hours =
    Math.floor(value / 60);

  const remainMinutes =
    Math.round(value % 60);

  if (hours <= 0) {
    return `${remainMinutes} phút`;
  }

  if (remainMinutes === 0) {
    return `${hours} giờ`;
  }

  return `${hours} giờ ${remainMinutes} phút`;
}


function formatDateTime(value) {
  if (!value) {
    return "Chưa có dữ liệu";
  }

  const date =
    new Date(value);

  if (
    Number.isNaN(
      date.getTime()
    )
  ) {
    return "Chưa có dữ liệu";
  }

  return date.toLocaleString(
    "vi-VN"
  );
}


function getStudentAssessment(
  student
) {
  const attendance =
    student.attendance;

  const score =
    student.averageScore;

  const submissionRate =
    Number(
      student.submissionRate ??
        0
    );

  const lateSubmissions =
    Number(
      student.lateSubmissions ??
        0
    );


  const riskReasons = [];

  const warningReasons = [];

  const noteReasons = [];


  // ======================================
  // CẦN CHÚ Ý
  // ======================================

  if (
    attendance !== null &&
    attendance !== undefined &&
    Number(attendance) < 70
  ) {
    riskReasons.push(
      "Chuyên cần dưới 70%"
    );
  }


  if (
    score !== null &&
    score !== undefined &&
    Number(score) < 5
  ) {
    riskReasons.push(
      "Điểm trung bình dưới 5.0"
    );
  }


  if (
    submissionRate < 60
  ) {
    riskReasons.push(
      "Tỷ lệ nộp bài dưới 60%"
    );
  }


  if (
    riskReasons.length > 0
  ) {
    return {
      key: "risk",
      label: "Cần chú ý",
      reasons:
        riskReasons,
    };
  }


  // ======================================
  // THEO DÕI
  // ======================================

  if (
    attendance !== null &&
    attendance !== undefined &&
    Number(attendance) < 80
  ) {
    warningReasons.push(
      "Chuyên cần dưới 80%"
    );
  }


  if (
    score !== null &&
    score !== undefined &&
    Number(score) < 7
  ) {
    warningReasons.push(
      "Điểm trung bình dưới 7.0"
    );
  }


  if (
    submissionRate < 75
  ) {
    warningReasons.push(
      "Tỷ lệ nộp bài dưới 75%"
    );
  }


  if (
    lateSubmissions >= 2
  ) {
    warningReasons.push(
      `Có ${lateSubmissions} bài nộp trễ`
    );
  }


  if (
    warningReasons.length > 0
  ) {
    return {
      key: "warning",
      label: "Theo dõi",
      reasons:
        warningReasons,
    };
  }


  // ======================================
  // ỔN ĐỊNH
  //
  // 1 bài trễ chỉ là ghi chú,
  // chưa đủ để đổi trạng thái.
  // ======================================

  if (
    lateSubmissions === 1
  ) {
    noteReasons.push(
      "Có 1 bài nộp trễ, cần lưu ý ở các bài tiếp theo"
    );
  }


  if (
    noteReasons.length === 0
  ) {
    noteReasons.push(
      "Tiến độ học tập hiện tại ổn định"
    );
  }


  return {
    key: "good",
    label: "Ổn định",
    reasons:
      noteReasons,
  };
}

function getStudentRiskFlags(student) {
  const flags = [];

  // 1. Điểm trung bình thấp (< 50% hoặc < 5.0 hoặc Is_Passed === 0)
  const score = student.averageScore;
  const pct = student.averageGradePercentage;
  if (
    (score !== null && score < 5.0) ||
    (pct !== null && pct < 50) ||
    student.isPassed === 0
  ) {
    flags.push({
      type: "grade",
      label: "Điểm thấp",
      badgeClass: "risk-flag-red",
      detail:
        score !== null
          ? `ĐTB: ${score.toFixed(1)}/10`
          : pct !== null
          ? `ĐTB: ${pct}%`
          : "Chưa đạt chuẩn",
      severity: 3,
    });
  }

  // 2. Tỷ lệ nộp bài đúng hạn thấp (< 50% hoặc trễ >= 2 bài hoặc chưa nộp nhiều)
  const onTimeRate = Number(student.onTimeRate || 0);
  const lateCount = Number(student.lateSubmissions || 0);
  const subRate = Number(student.submissionRate || 0);
  if (onTimeRate < 50 || lateCount >= 2 || subRate < 50) {
    flags.push({
      type: "submission",
      label: "Nộp trễ nhiều",
      badgeClass: "risk-flag-orange",
      detail: `Đúng hạn: ${onTimeRate}% (${lateCount} bài trễ)`,
      severity: 2,
    });
  }

  // 3. Thời gian học ít (< 60 phút)
  const minutes = Number(student.totalTimeSpentMinutes || 0);
  if (minutes < 60) {
    flags.push({
      type: "engagement",
      label: "Ít tương tác",
      badgeClass: "risk-flag-amber",
      detail: `Thời gian học: ${Math.round(minutes)} phút`,
      severity: 1,
    });
  }

  return flags;
}

function StudentMetric({
  icon,
  label,
  value,
}) {
  return (
    <div className="student-analysis-metric">

      <div className="student-analysis-metric-icon">
        {icon}
      </div>

      <div>
        <span>
          {label}
        </span>

        <strong>
          {value}
        </strong>
      </div>

    </div>
  );
}


function StudentAnalyticsPanel({
  student,
  onClose,
}) {
  if (!student) {
    return null;
  }


  const assessment =
    getStudentAssessment(
      student
    );


  const avatarLetter =
    student.fullName
      ?.trim()
      .split(" ")
      .slice(-1)[0]
      ?.charAt(0)
      ?.toUpperCase() ||
    "S";


  return (
    <div
      className="student-analysis-overlay"
      onMouseDown={
        onClose
      }
    >

      <aside
        className="student-analysis-panel"
        onMouseDown={(
          event
        ) =>
          event.stopPropagation()
        }
      >

        <div className="student-analysis-header">

          <div>
            <span>
              Hồ sơ phân tích
            </span>

            <h2>
              Sinh viên
            </h2>
          </div>


          <button
            type="button"
            onClick={
              onClose
            }
            title="Đóng"
          >
            <X size={18} />
          </button>

        </div>


        <section className="student-analysis-profile">

          <div className="student-analysis-avatar">
            {avatarLetter}
          </div>


          <div>
            <h3>
              {student.fullName}
            </h3>

            <span>
              {student.studentCode}
            </span>

            <p>
              {student.email}
            </p>
          </div>

        </section>


        <section
          className={`student-analysis-status ${assessment.key}`}
        >

          <div className="student-analysis-status-icon">
            {assessment.key ===
            "good" ? (
              <CheckCircle2
                size={19}
              />
            ) : (
              <AlertTriangle
                size={19}
              />
            )}
          </div>


          <div>
            <span>
              Đánh giá hiện tại
            </span>

            <strong>
              {assessment.label}
            </strong>
          </div>

        </section>


        <section className="student-analysis-section">

          <div className="student-analysis-section-title">
            Chỉ số học tập
          </div>


          <div className="student-analysis-grid">

            <StudentMetric
              icon={
                <GraduationCap
                  size={18}
                />
              }
              label="Điểm trung bình"
              value={
                student.averageScore ===
                  null ||
                student.averageScore ===
                  undefined
                  ? "—"
                  : Number(
                      student.averageScore
                    ).toFixed(1)
              }
            />


            <StudentMetric
              icon={
                <ClipboardCheck
                  size={18}
                />
              }
              label="Tỷ lệ nộp bài"
              value={`${Number(
                student.submissionRate ||
                  0
              )}%`}
            />


            <StudentMetric
              icon={
                <AlertTriangle
                  size={18}
                />
              }
              label="Bài nộp trễ"
              value={
                student.lateSubmissions ||
                0
              }
            />


            <StudentMetric
              icon={
                <Clock3
                  size={18}
                />
              }
              label="Thời gian học"
              value={formatLearningTime(
                student.totalTimeSpentMinutes
              )}
            />

          </div>

        </section>


        <section className="student-analysis-section">

          <div className="student-analysis-section-title">
            Hoạt động gần đây
          </div>


          <div className="student-analysis-info-row">

            <CalendarClock
              size={17}
            />

            <div>
              <span>
                Truy cập gần nhất
              </span>

              <strong>
                {formatDateTime(
                  student.lastAccessTime
                )}
              </strong>
            </div>

          </div>


          <div className="student-analysis-info-row">

            <ClipboardCheck
              size={17}
            />

            <div>
              <span>
                Bài đã nộp
              </span>

              <strong>
                {student.submittedAssignments ||
                  0}
                {" / "}
                {student.totalAssignments ||
                  0}
              </strong>
            </div>

          </div>


          <div className="student-analysis-info-row">

            <CheckCircle2
              size={17}
            />

            <div>
              <span>
                Bài đã chấm
              </span>

              <strong>
                {student.gradedSubmissions ||
                  0}
              </strong>
            </div>

          </div>

        </section>


        <section className="student-analysis-section">

          <div className="student-analysis-section-title">
            Nhận định
          </div>


          <div className="student-analysis-reasons">

            {assessment.reasons.map(
              (
                reason,
                index
              ) => (
                <div
                  key={`${reason}-${index}`}
                >
                  <span />

                  <p>
                    {reason}
                  </p>
                </div>
              )
            )}

          </div>

        </section>

      </aside>

    </div>
  );
}


// ======================================================
// CLASS MANAGEMENT
// ======================================================

function ClassManagement() {
  const navigate = useNavigate();

  const { courseId } =
    useParams();


  const [teacher, setTeacher] =
    useState(null);

  const [course, setCourse] =
    useState(null);

  const [students, setStudents] =
    useState([]);

  const [loading, setLoading] =
    useState(true);

  const [error, setError] =
    useState("");

  const [searchTerm, setSearchTerm] =
    useState("");

  const [filter, setFilter] =
    useState("all");

  const [
    selectedStudent,
    setSelectedStudent,
  ] = useState(null);

  const [gradeDistributions, setGradeDistributions] = useState([]);
  const [selectedActivityKey, setSelectedActivityKey] = useState("OVERALL");
  const [engagementTrend, setEngagementTrend] = useState([]);
  const [hoveredWeek, setHoveredWeek] = useState(null);


  // ====================================================
  // LOAD DATA
  // ====================================================

  useEffect(() => {
    let cancelled = false;

    async function loadClass() {
      try {
        setLoading(true);
        setError("");

        const teacherId =
          Number(
            localStorage.getItem(
              "currentTeacherId"
            )
          );

        if (!teacherId) {
          throw new Error(
            "Không tìm thấy giảng viên đang đăng nhập."
          );
        }


        const numericCourseId =
          Number(courseId);

        if (!numericCourseId) {
          throw new Error(
            "Mã khóa học không hợp lệ."
          );
        }


        const [
          teacherData,
          teacherCourses,
          studentData,
          analyticsData,
          distributionData,
          trendData,
        ] = await Promise.all([
          getTeacher(
            teacherId
          ),

          getTeacherCourses(
            teacherId
          ),

          getCourseStudents(
            numericCourseId
          ),

          getCourseStudentAnalytics(
            numericCourseId
          ),

          getCourseGradeDistribution(
            numericCourseId
          ).catch((err) => {
            console.error("Lỗi tải phân bố điểm:", err);
            return [];
          }),

          getCourseEngagementTrend(
            numericCourseId
          ).catch((err) => {
            console.error("Lỗi tải xu hướng tương tác:", err);
            return [];
          }),
        ]);


        if (cancelled) {
          return;
        }

        if (distributionData && distributionData.length > 0) {
          setGradeDistributions(distributionData);
        }

        if (trendData && trendData.length > 0) {
          setEngagementTrend(trendData);
        }


        // ==============================================
        // TÌM MÔN GIẢNG VIÊN PHỤ TRÁCH
        // ==============================================

        const currentCourse =
          teacherCourses.find(
            (item) =>
              Number(
                item.Moodle_Course_ID
              ) ===
              numericCourseId
          );


        if (!currentCourse) {
          throw new Error(
            "Không tìm thấy môn học hoặc giảng viên không phụ trách môn này."
          );
        }


        setTeacher(
          normalizeTeacher(
            teacherData
          )
        );


        // ==============================================
        // MAP ANALYTICS
        // ==============================================

        const analyticsMap =
          new Map(
            analyticsData.map(
              (item) => [
                Number(
                  item.User_Key
                ),
                item,
              ]
            )
          );


        // ==============================================
        // NORMALIZE STUDENTS
        // ==============================================

        const normalizedStudents =
          studentData.map(
            (student) => {
              const analytics =
                analyticsMap.get(
                  Number(
                    student.User_Key
                  )
                );


              const totalAssignments =
                Number(
                  analytics
                    ?.Total_Assignments ||
                    0
                );


              const submittedAssignments =
                Number(
                  analytics
                    ?.Submitted_Assignments ||
                    0
                );


              const submissionRate =
                Number(
                  analytics
                    ?.Submission_Rate ||
                    0
                );


              const onTimeSubmissions =
                Number(
                  analytics
                    ?.On_Time_Submissions ||
                    0
                );


              const lateSubmissions =
                Number(
                  analytics
                    ?.Late_Submissions ||
                    0
                );


              const onTimeRate =
                Number(
                  analytics
                    ?.On_Time_Rate ||
                    0
                );


              const gradedSubmissions =
                Number(
                  analytics
                    ?.Graded_Submissions ||
                    0
                );


              return {
                id:
                  student.Moodle_User_ID,

                userKey:
                  student.User_Key,

                moodleUserId:
                  student.Moodle_User_ID,

                studentCode:
                  student.Username ||
                  String(
                    student.Moodle_User_ID
                  ),

                fullName:
                  student.Full_Name ||
                  "",

                email:
                  student.Email ||
                  "",

                enrolmentStatus:
                  student.Enrolment_Status ||
                  "Active",

                // Chưa có attendance thật
                attendance:
                  null,

                totalAssignments,

                submittedAssignments,

                submissionRate,

                onTimeSubmissions,

                lateSubmissions,

                onTimeRate,

                gradedSubmissions,

                averageScore:
                  analytics
                    ?.Average_Grade ===
                    null ||
                  analytics
                    ?.Average_Grade ===
                    undefined
                    ? null
                    : Number(
                        analytics
                          .Average_Grade
                      ),

                averageGradePercentage:
                  analytics
                    ?.Average_Grade_Percentage ===
                    null ||
                  analytics
                    ?.Average_Grade_Percentage ===
                    undefined
                    ? null
                    : Number(
                        analytics
                          .Average_Grade_Percentage
                      ),

                totalTimeSpentMinutes:
                  Number(
                    analytics
                      ?.Total_Time_Spent_Minutes ||
                      0
                  ),

                lastAccessTime:
                  analytics
                    ?.Last_Access_Time ||
                  null,

                isPassed:
                  analytics
                    ?.Is_Passed ??
                  null,
              };
            }
          );


        // ==============================================
        // ĐIỂM TB CẢ LỚP
        // ==============================================

        const validScores =
          normalizedStudents
            .map(
              (student) =>
                student.averageScore
            )
            .filter(
              (score) =>
                score !== null &&
                Number.isFinite(
                  score
                )
            );


        const averageScore =
          validScores.length > 0
            ? validScores.reduce(
                (
                  total,
                  score
                ) =>
                  total +
                  score,
                0
              ) /
              validScores.length
            : null;


        // ==============================================
        // TỶ LỆ NỘP BÀI CẢ LỚP
        // ==============================================

        const totalAssignmentsExpected =
          normalizedStudents.reduce(
            (
              total,
              student
            ) =>
              total +
              student.totalAssignments,
            0
          );


        const totalSubmittedAssignments =
          normalizedStudents.reduce(
            (
              total,
              student
            ) =>
              total +
              student.submittedAssignments,
            0
          );


        const submissionRate =
          totalAssignmentsExpected > 0
            ? Math.round(
                (
                  totalSubmittedAssignments /
                  totalAssignmentsExpected
                ) *
                  100
              )
            : 0;


        // ==============================================
        // TỶ LỆ ĐÚNG HẠN
        // ==============================================

        const totalOnTime =
          normalizedStudents.reduce(
            (
              total,
              student
            ) =>
              total +
              student.onTimeSubmissions,
            0
          );


        const onTimeRate =
          totalSubmittedAssignments > 0
            ? Math.round(
                (
                  totalOnTime /
                  totalSubmittedAssignments
                ) *
                  100
              )
            : 0;


        // ==============================================
        // COURSE
        // ==============================================

        setCourse({
          id:
            currentCourse.Moodle_Course_ID,

          courseId:
            currentCourse.Moodle_Course_ID,

          courseKey:
            currentCourse.Course_Key,

          code:
            currentCourse.Course_Code ||
            "",

          title:
            currentCourse.Course_Name ||
            "Chưa có tên môn",

          name:
            currentCourse.Course_Name ||
            "Chưa có tên môn",

          category:
            currentCourse.Category_Name ||
            "",

          startDate:
            currentCourse.Start_Date,

          endDate:
            currentCourse.End_Date,

          studentCount:
            normalizedStudents.length,

          submissionRate,

          onTimeRate,

          averageScore:
            averageScore === null
              ? null
              : Number(
                  averageScore.toFixed(
                    2
                  )
                ),

          attendance:
            null,

          color:
            "#6f9638",
        });


        setStudents(
          normalizedStudents
        );

      } catch (err) {
        console.error(
          "Lỗi tải lớp:",
          err
        );

        if (!cancelled) {
          setError(
            err.message ||
              "Không thể tải dữ liệu lớp học."
          );
        }

      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }


    loadClass();


    return () => {
      cancelled = true;
    };

  }, [courseId]);


  // ====================================================
  // STUDENT STATUS
  // ====================================================

  const getStatus = (
    student
  ) => {
    return getStudentAssessment(
      student
    ).key;
  };


  // ====================================================
  // FILTER
  // ====================================================

  const filteredStudents =
    useMemo(() => {
      const keyword =
        searchTerm
          .trim()
          .toLowerCase();


      return students.filter(
        (student) => {
          const fullName =
            String(
              student.fullName ||
                ""
            ).toLowerCase();

          const studentCode =
            String(
              student.studentCode ||
                ""
            ).toLowerCase();

          const email =
            String(
              student.email ||
                ""
            ).toLowerCase();


          const matchesSearch =
            !keyword ||
            fullName.includes(
              keyword
            ) ||
            studentCode.includes(
              keyword
            ) ||
            email.includes(
              keyword
            );


          const status =
            getStatus(
              student
            );


          const matchesFilter =
            filter === "all" ||
            filter === status;


          return (
            matchesSearch &&
            matchesFilter
          );
        }
      );

    }, [
      students,
      searchTerm,
      filter,
    ]);


  // ====================================================
  // RISK STUDENTS (DANH SÁCH CẦN CHÚ Ý)
  // ====================================================

  const riskStudents = useMemo(() => {
    return students
      .map((s) => ({
        student: s,
        flags: getStudentRiskFlags(s),
      }))
      .filter((item) => item.flags.length > 0)
      .sort((a, b) => {
        const maxSevA = Math.max(...a.flags.map((f) => f.severity));
        const maxSevB = Math.max(...b.flags.map((f) => f.severity));
        if (maxSevB !== maxSevA) return maxSevB - maxSevA;
        if (b.flags.length !== a.flags.length) return b.flags.length - a.flags.length;
        return (a.student.averageScore ?? 10) - (b.student.averageScore ?? 10);
      });
  }, [students]);

  const currentDistribution = useMemo(() => {
    if (!gradeDistributions || gradeDistributions.length === 0) return null;
    return (
      gradeDistributions.find(
        (a) => String(a.Activity_Key) === String(selectedActivityKey)
      ) || gradeDistributions[0]
    );
  }, [gradeDistributions, selectedActivityKey]);

  const trendStats = useMemo(() => {
    if (!engagementTrend || engagementTrend.length === 0) {
      return {
        maxWeek: null,
        overallAvgHours: 0,
        overallActiveRate: 0,
        totalClassHours: 0,
      };
    }

    const totalHours = engagementTrend.reduce((sum, w) => sum + (w.totalHours || 0), 0);
    const avgHoursList = engagementTrend.map((w) => w.avgHoursPerStudent || 0);
    const maxAvgHour = Math.max(...avgHoursList);
    const maxWeek = engagementTrend.find((w) => w.avgHoursPerStudent === maxAvgHour) || engagementTrend[0];

    const activeRateSum = engagementTrend.reduce((sum, w) => sum + (w.activeRate || 0), 0);
    const overallActiveRate = Math.round(activeRateSum / engagementTrend.length);

    const totalAvgSum = avgHoursList.reduce((sum, h) => sum + h, 0);
    const overallAvgHours = Number((totalAvgSum / engagementTrend.length).toFixed(2));

    return {
      maxWeek,
      overallAvgHours,
      overallActiveRate,
      totalClassHours: Number(totalHours.toFixed(1)),
    };
  }, [engagementTrend]);

  const chartConfig = useMemo(() => {
    if (!engagementTrend || engagementTrend.length === 0) return null;

    const width = 800;
    const height = 220;
    const padding = { top: 30, right: 35, bottom: 45, left: 55 };
    const chartWidth = width - padding.left - padding.right;
    const chartHeight = height - padding.top - padding.bottom;

    const maxVal = Math.max(...engagementTrend.map((d) => d.avgHoursPerStudent || 0), 0.5);
    const maxY = Math.ceil(maxVal * 1.25 * 10) / 10;

    const points = engagementTrend.map((d, index) => {
      const x =
        engagementTrend.length === 1
          ? padding.left + chartWidth / 2
          : padding.left + (index / (engagementTrend.length - 1)) * chartWidth;
      const y = padding.top + chartHeight - ((d.avgHoursPerStudent || 0) / maxY) * chartHeight;
      return {
        ...d,
        x,
        y,
      };
    });

    const linePath =
      points.length === 1
        ? `M ${points[0].x - 20} ${points[0].y} L ${points[0].x + 20} ${points[0].y}`
        : `M ${points[0].x} ${points[0].y} ` +
          points.slice(1).map((p) => `L ${p.x} ${p.y}`).join(" ");

    const areaPath =
      points.length === 1
        ? ""
        : `M ${points[0].x} ${padding.top + chartHeight} L ${points[0].x} ${points[0].y} ` +
          points.slice(1).map((p) => `L ${p.x} ${p.y}`).join(" ") +
          ` L ${points[points.length - 1].x} ${padding.top + chartHeight} Z`;

    const gridLines = [0, 0.25, 0.5, 0.75, 1].map((ratio) => {
      const y = padding.top + chartHeight - ratio * chartHeight;
      const val = Number((ratio * maxY).toFixed(1));
      return { y, val };
    });

    return {
      width,
      height,
      padding,
      chartWidth,
      chartHeight,
      maxY,
      points,
      linePath,
      areaPath,
      gridLines,
    };
  }, [engagementTrend]);

  // ====================================================
  // COUNTERS
  // ====================================================

  const riskCount =
    students.filter(
      (student) =>
        getStatus(student) ===
        "risk"
    ).length;


  const warningCount =
    students.filter(
      (student) =>
        getStatus(student) ===
        "warning"
    ).length;


  const goodCount =
    students.filter(
      (student) =>
        getStatus(student) ===
        "good"
    ).length;


  // ====================================================
  // VIEW STUDENT
  // ====================================================

  const handleViewStudent = (
    student
  ) => {
    setSelectedStudent(
      student
    );
  };


  // ====================================================
  // LOADING
  // ====================================================

  if (loading) {
    return (
      <div className="class-loading">

        <div className="class-spinner" />

        <strong>
          Đang tải dữ liệu lớp
        </strong>

        <p>
          Đang đồng bộ thông tin sinh viên...
        </p>

      </div>
    );
  }


  // ====================================================
  // ERROR
  // ====================================================

  if (
    error ||
    !teacher ||
    !course
  ) {
    return (
      <div className="class-loading">

        <h2>
          Không thể tải lớp học
        </h2>

        <p>
          {error ||
            "Không tìm thấy dữ liệu lớp học."}
        </p>

        <button
          type="button"
          onClick={() =>
            navigate(
              "/khoa-hoc"
            )
          }
        >
          Quay lại khóa học
        </button>

      </div>
    );
  }


  // ====================================================
  // PAGE
  // ====================================================

  return (
    <div className="class-page">

      <div className="class-bg-grid" />

      <div className="class-bg-orb one" />

      <div className="class-bg-orb two" />


      <Header
        teacher={teacher}
      />

      <Sidebar />


      <main className="class-content">

        {/* ==============================
            HERO
        ============================== */}

        <section className="class-hero">

          <div className="class-hero-main">

            <div className="class-hero-code">
              {course.code || "DLU"}
            </div>


            <div>

              <div className="class-breadcrumb">

                <button
                  type="button"
                  onClick={() =>
                    navigate(
                      "/khoa-hoc"
                    )
                  }
                >
                  Khóa học
                </button>

                <span>
                  /
                </span>

                <strong>
                  {course.title}
                </strong>

              </div>


              <span className="class-hero-kicker">
                PHÂN TÍCH LỚP HỌC
              </span>


              <h1>
                {course.title}
              </h1>


              <p>
                Theo dõi sinh viên,
                tiến độ nộp bài và
                kết quả học tập của lớp.
              </p>

            </div>

          </div>


          <button
            type="button"
            className="class-export-button"
          >
            <Download
              size={16}
            />

            Xuất danh sách
          </button>

        </section>


        {/* ==============================
            KPI
        ============================== */}

        <ClassStats
          studentCount={
            students.length
          }

          attendance={
            course.attendance
          }

          submissionRate={
            course.submissionRate
          }

          averageScore={
            course.averageScore
          }
        />


        {/* ==============================
            DANH SÁCH SINH VIÊN CẦN CHÚ Ý (RISK LIST)
        ============================== */}
        <section className="risk-section">
          <div className="risk-section-header">
            <div className="risk-section-title">
              <div className="risk-title-icon">
                <AlertTriangle size={18} />
              </div>
              <div>
                <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                  <strong>Danh sách sinh viên cần chú ý</strong>
                  <span className="risk-badge-count">
                    {riskStudents.length} sinh viên gắn cờ
                  </span>
                </div>
                <p>
                  Hệ thống tự động phát hiện sinh viên có dấu hiệu rủi ro (điểm thấp dưới chuẩn, nộp trễ nhiều bài hoặc ít tương tác học liệu).
                </p>
              </div>
            </div>
          </div>

          {riskStudents.length === 0 ? (
            <div className="risk-empty-box">
              <CheckCircle2 size={22} style={{ color: "#37883e" }} />
              <div>
                <strong>Không phát hiện sinh viên nào có nguy cơ</strong>
                <p>
                  Toàn bộ sinh viên trong lớp đều đang duy trì kết quả và tiến độ học tập đạt chuẩn.
                </p>
              </div>
            </div>
          ) : (
            <div className="risk-table-wrap">
              <table className="risk-table">
                <thead>
                  <tr>
                    <th>Sinh viên</th>
                    <th>Cờ cảnh báo (Lý do gắn cờ)</th>
                    <th>Điểm TB</th>
                    <th>Tiến độ nộp bài</th>
                    <th>Thời gian học</th>
                    <th style={{ textAlign: "right" }}>Thao tác</th>
                  </tr>
                </thead>
                <tbody>
                  {riskStudents.map(({ student: s, flags }) => {
                    const avatarLetter =
                      s.fullName
                        ?.trim()
                        .split(" ")
                        .slice(-1)[0]
                        ?.charAt(0)
                        ?.toUpperCase() || "S";

                    return (
                      <tr key={s.userKey || s.id}>
                        <td>
                          <div className="risk-student-info">
                            <div className="risk-avatar">{avatarLetter}</div>
                            <div>
                              <strong className="risk-student-name">
                                {s.fullName}
                              </strong>
                              <span className="risk-student-code">
                                {s.studentCode} • {s.email}
                              </span>
                            </div>
                          </div>
                        </td>
                        <td>
                          <div className="risk-flags-wrap">
                            {flags.map((f, fIdx) => (
                              <span
                                key={fIdx}
                                className={`risk-flag-badge ${f.badgeClass}`}
                                title={f.detail}
                              >
                                <i>●</i> {f.label}: <strong>{f.detail}</strong>
                              </span>
                            ))}
                          </div>
                        </td>
                        <td>
                          <strong
                            style={{
                              color:
                                s.averageScore !== null && s.averageScore < 5
                                  ? "#dc2626"
                                  : "#203026",
                            }}
                          >
                            {s.averageScore !== null
                              ? `${s.averageScore.toFixed(1)}/10`
                              : "—"}
                          </strong>
                        </td>
                        <td>
                          <div>
                            <span>
                              {s.submittedAssignments}/{s.totalAssignments} bài
                            </span>
                            <span
                              style={{
                                fontSize: "11px",
                                color:
                                  s.onTimeRate < 50 ? "#dc2626" : "#79867d",
                                marginLeft: "4px",
                              }}
                            >
                              ({s.onTimeRate}% đúng hạn)
                            </span>
                          </div>
                        </td>
                        <td>
                          <span>
                            {formatLearningTime(s.totalTimeSpentMinutes)}
                          </span>
                        </td>
                        <td style={{ textAlign: "right" }}>
                          <button
                            type="button"
                            className="risk-action-btn"
                            onClick={() => handleViewStudent(s)}
                          >
                            Xem chi tiết
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </section>


        {/* ==============================
            HISTOGRAM PHÂN BỐ ĐIỂM SỐ
        ============================== */}
        <section className="histogram-section">
          <div className="histogram-header">
            <div className="histogram-title-wrap">
              <div className="histogram-title-icon">
                <BarChart3 size={18} />
              </div>
              <div>
                <strong>Phân bố điểm số sinh viên (Histogram)</strong>
                <p>
                  Theo dõi số lượng sinh viên đạt từng khoảng điểm theo toàn khóa hoặc từng bài kiểm tra.
                </p>
              </div>
            </div>

            {gradeDistributions.length > 0 && (
              <select
                className="histogram-select"
                value={selectedActivityKey}
                onChange={(e) => setSelectedActivityKey(e.target.value)}
              >
                {gradeDistributions.map((act) => (
                  <option key={act.Activity_Key} value={act.Activity_Key}>
                    {act.Activity_Name}
                  </option>
                ))}
              </select>
            )}
          </div>

          {currentDistribution ? (
            <div className="histogram-body">
              {/* Bars */}
              <div className="histogram-bars">
                {[
                  {
                    key: "Under_5",
                    label: "0 - 4.9 điểm (Yếu / Chưa đạt)",
                    count: Number(currentDistribution.Under_5 || 0),
                    color: "#dc2626",
                  },
                  {
                    key: "Range_5_To_7",
                    label: "5.0 - 6.9 điểm (Trung bình)",
                    count: Number(currentDistribution.Range_5_To_7 || 0),
                    color: "#e66d1e",
                  },
                  {
                    key: "Range_7_To_85",
                    label: "7.0 - 8.4 điểm (Khá)",
                    count: Number(currentDistribution.Range_7_To_85 || 0),
                    color: "#65c777",
                  },
                  {
                    key: "Range_85_To_10",
                    label: "8.5 - 10.0 điểm (Giỏi / Xuất sắc)",
                    count: Number(currentDistribution.Range_85_To_10 || 0),
                    color: "#37883e",
                  },
                ].map((range) => {
                  const totalGraded =
                    Number(currentDistribution.Total_Graded || 0) || 1;
                  const pct = Math.round((range.count / totalGraded) * 100);

                  return (
                    <div key={range.key} className="analytics-bar-item">
                      <div className="analytics-bar-meta">
                        <span
                          style={{
                            fontWeight: 600,
                            fontSize: "12px",
                            color: "#1f2937",
                          }}
                        >
                          {range.label}
                        </span>
                        <span
                          style={{
                            color: range.color,
                            fontWeight: 700,
                            fontSize: "12px",
                          }}
                        >
                          {range.count} sinh viên ({pct}%)
                        </span>
                      </div>
                      <div className="analytics-track">
                        <div
                          className="analytics-fill"
                          style={{
                            width: `${pct}%`,
                            background: range.color,
                          }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Stats Card */}
              <div className="histogram-stat-cards">
                <div className="histogram-stat-card">
                  <span>Điểm trung bình</span>
                  <strong style={{ color: "#37883e" }}>
                    {currentDistribution.Average_Grade !== null &&
                    currentDistribution.Average_Grade !== undefined
                      ? `${Number(currentDistribution.Average_Grade).toFixed(1)}/10`
                      : "—"}
                  </strong>
                </div>

                <div className="histogram-stat-card">
                  <span>Tổng bài đã chấm</span>
                  <strong>{currentDistribution.Total_Graded || 0} bài</strong>
                </div>

                <div className="histogram-stat-card">
                  <span>Điểm cao nhất</span>
                  <strong style={{ color: "#2563eb" }}>
                    {currentDistribution.Max_Grade !== null &&
                    currentDistribution.Max_Grade !== undefined
                      ? `${Number(currentDistribution.Max_Grade).toFixed(1)}/10`
                      : "—"}
                  </strong>
                </div>

                <div className="histogram-stat-card">
                  <span>Điểm thấp nhất</span>
                  <strong
                    style={{
                      color:
                        Number(currentDistribution.Min_Grade) < 5
                          ? "#dc2626"
                          : "#66736b",
                    }}
                  >
                    {currentDistribution.Min_Grade !== null &&
                    currentDistribution.Min_Grade !== undefined
                      ? `${Number(currentDistribution.Min_Grade).toFixed(1)}/10`
                      : "—"}
                  </strong>
                </div>
              </div>
            </div>
          ) : (
            <div
              style={{
                padding: "24px",
                textAlign: "center",
                color: "#66736b",
                fontSize: "12px",
              }}
            >
              Chưa có dữ liệu phân bố điểm cho bài kiểm tra này.
            </div>
          )}
        </section>


        {/* ==============================
            XU HƯỚNG ENGAGEMENT LỚP THEO TUẦN (WEEKLY ENGAGEMENT TREND)
        ============================== */}
        <section className="trend-section">
          <div className="trend-header">
            <div className="trend-title-wrap">
              <div className="trend-title-icon">
                <TrendingUp size={18} />
              </div>
              <div>
                <strong>Xu hướng tương tác học tập của lớp theo tuần</strong>
                <p>
                  Theo dõi thời lượng học tập trung bình và số sinh viên hoạt động qua từng tuần để kịp thời nắm bắt mức độ tích cực của lớp.
                </p>
              </div>
            </div>
          </div>

          {engagementTrend && engagementTrend.length > 0 ? (
            <>
              {/* Summary Cards */}
              <div className="trend-summary-cards">
                <div className="trend-summary-card">
                  <span>Tuần cao điểm nhất</span>
                  <strong style={{ color: "#37883e" }}>
                    {trendStats.maxWeek ? `${trendStats.maxWeek.weekLabel} (${trendStats.maxWeek.avgHoursPerStudent}h/SV)` : "—"}
                  </strong>
                </div>

                <div className="trend-summary-card">
                  <span>Thời lượng TB / SV / tuần</span>
                  <strong>{trendStats.overallAvgHours} giờ</strong>
                </div>

                <div className="trend-summary-card">
                  <span>Tỷ lệ SV hoạt động TB</span>
                  <strong style={{ color: "#2563eb" }}>{trendStats.overallActiveRate}%</strong>
                </div>

                <div className="trend-summary-card">
                  <span>Tổng thời lượng cả lớp</span>
                  <strong>{trendStats.totalClassHours} giờ</strong>
                </div>
              </div>

              {/* Chart */}
              <div className="trend-chart-container">
                <div className="trend-svg-wrap">
                  {chartConfig && (
                    <svg
                      viewBox={`0 0 ${chartConfig.width} ${chartConfig.height}`}
                      className="trend-svg"
                      style={{ overflow: "visible" }}
                    >
                      <defs>
                        <linearGradient id="trendGradient" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="#37883e" stopOpacity="0.32" />
                          <stop offset="100%" stopColor="#37883e" stopOpacity="0.0" />
                        </linearGradient>
                      </defs>

                      {/* Horizontal Gridlines & Y-labels */}
                      {chartConfig.gridLines.map((g, idx) => (
                        <g key={idx}>
                          <line
                            x1={chartConfig.padding.left}
                            y1={g.y}
                            x2={chartConfig.width - chartConfig.padding.right}
                            y2={g.y}
                            stroke="#e2ece3"
                            strokeDasharray={idx === 0 ? "none" : "4 4"}
                            strokeWidth="1"
                          />
                          <text
                            x={chartConfig.padding.left - 10}
                            y={g.y + 4}
                            textAnchor="end"
                            fontSize="11"
                            fill="#79867d"
                            fontWeight="500"
                          >
                            {g.val}h
                          </text>
                        </g>
                      ))}

                      {/* Area fill */}
                      {chartConfig.areaPath && (
                        <path
                          d={chartConfig.areaPath}
                          fill="url(#trendGradient)"
                        />
                      )}

                      {/* Line */}
                      <path
                        d={chartConfig.linePath}
                        fill="none"
                        stroke="#37883e"
                        strokeWidth="3"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />

                      {/* Data Points */}
                      {chartConfig.points.map((p, idx) => {
                        const isHovered = hoveredWeek?.weekIndex === p.weekIndex;
                        return (
                          <g key={idx}>
                            <circle
                              cx={p.x}
                              cy={p.y}
                              r={isHovered ? 6 : 4}
                              fill={isHovered ? "#37883e" : "#ffffff"}
                              stroke="#37883e"
                              strokeWidth={isHovered ? 3 : 2}
                              style={{ cursor: "pointer", transition: "all 0.15s ease" }}
                              onMouseEnter={() => setHoveredWeek(p)}
                              onMouseLeave={() => setHoveredWeek(null)}
                            />

                            {/* X-axis Label */}
                            <text
                              x={p.x}
                              y={chartConfig.height - chartConfig.padding.bottom + 20}
                              textAnchor="middle"
                              fontSize="11"
                              fill={isHovered ? "#37883e" : "#4a574f"}
                              fontWeight={isHovered ? "700" : "500"}
                            >
                              {p.weekLabel}
                            </text>
                          </g>
                        );
                      })}
                    </svg>
                  )}
                </div>

                {/* Hover Tooltip Box */}
                {hoveredWeek && (
                  <div
                    style={{
                      marginTop: "10px",
                      padding: "8px 14px",
                      borderRadius: "8px",
                      background: "#17221d",
                      color: "white",
                      fontSize: "12px",
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      flexWrap: "wrap",
                      gap: "10px",
                    }}
                  >
                    <div>
                      <strong>{hoveredWeek.weekLabel}</strong>
                      <span style={{ color: "#a0b5a6", marginLeft: "8px" }}>
                        ({hoveredWeek.dateRange})
                      </span>
                    </div>
                    <div style={{ display: "flex", gap: "16px" }}>
                      <span>
                        Thời lượng TB: <strong style={{ color: "#65c777" }}>{hoveredWeek.avgHoursPerStudent} giờ/SV</strong>
                      </span>
                      <span>
                        SV hoạt động: <strong>{hoveredWeek.activeStudents}/{hoveredWeek.totalStudents} SV ({hoveredWeek.activeRate}%)</strong>
                      </span>
                      <span>
                        Tổng giờ lớp: <strong>{hoveredWeek.totalHours} giờ</strong>
                      </span>
                    </div>
                  </div>
                )}

                {/* Legend */}
                <div className="trend-legend">
                  <div className="trend-legend-item">
                    <span className="trend-legend-color" style={{ background: "#37883e" }} />
                    <span>Thời lượng học trung bình mỗi sinh viên (Giờ / SV)</span>
                  </div>
                  <div className="trend-legend-item">
                    <span style={{ color: "#79867d", fontSize: "11px" }}>
                      * Dữ liệu ghi nhận tự động từ nhật ký tương tác học tập hàng ngày
                    </span>
                  </div>
                </div>
              </div>
            </>
          ) : (
            <div
              style={{
                padding: "24px",
                textAlign: "center",
                color: "#66736b",
                fontSize: "12px",
              }}
            >
              Chưa có dữ liệu tương tác học tập hàng tuần cho lớp học này.
            </div>
          )}
        </section>


        {/* ==============================
            STUDENT PANEL
        ============================== */}

        <section className="student-panel">

          <div className="student-panel-heading">

            <div>
              <span>
                DANH SÁCH LỚP
              </span>

              <h2>
                Sinh viên
              </h2>

              <p>
                Hiển thị{" "}
                <strong>
                  {filteredStudents.length}
                </strong>{" "}
                / {students.length} sinh viên
              </p>
            </div>


            <div className="student-count-box">
              {filteredStudents.length}
            </div>

          </div>


          <div className="student-toolbar">

            <div className="student-tabs">

              <button
                type="button"
                className={
                  filter === "all"
                    ? "student-tab active"
                    : "student-tab"
                }
                onClick={() =>
                  setFilter("all")
                }
              >
                <Users size={14} />

                Tất cả

                <span>
                  {students.length}
                </span>
              </button>


              <button
                type="button"
                className={
                  filter === "good"
                    ? "student-tab active"
                    : "student-tab"
                }
                onClick={() =>
                  setFilter("good")
                }
              >
                <UserCheck
                  size={14}
                />

                Ổn định

                <span>
                  {goodCount}
                </span>
              </button>


              <button
                type="button"
                className={
                  filter === "warning"
                    ? "student-tab active warning"
                    : "student-tab"
                }
                onClick={() =>
                  setFilter(
                    "warning"
                  )
                }
              >
                Theo dõi

                <span>
                  {warningCount}
                </span>
              </button>


              <button
                type="button"
                className={
                  filter === "risk"
                    ? "student-tab active risk"
                    : "student-tab"
                }
                onClick={() =>
                  setFilter("risk")
                }
              >
                <AlertTriangle
                  size={14}
                />

                Cần chú ý

                <span>
                  {riskCount}
                </span>
              </button>

            </div>


            <div className="student-tools">

              <div className="student-search">

                <Search
                  size={17}
                />

                <input
                  value={
                    searchTerm
                  }
                  onChange={(
                    event
                  ) =>
                    setSearchTerm(
                      event.target
                        .value
                    )
                  }
                  placeholder="Tìm MSSV hoặc tên sinh viên..."
                />

              </div>


              <button
                type="button"
                className="student-filter-icon"
                title="Bộ lọc"
              >
                <SlidersHorizontal
                  size={17}
                />
              </button>

            </div>

          </div>


          {filteredStudents.length >
          0 ? (
            <StudentTable
              students={
                filteredStudents
              }
              onViewStudent={
                handleViewStudent
              }
            />
          ) : (
            <div className="students-empty">

              <Users
                size={35}
              />

              <strong>
                Không tìm thấy sinh viên
              </strong>

              <p>
                Thử thay đổi từ khóa
                hoặc bộ lọc.
              </p>

            </div>
          )}

        </section>

      </main>


      <StudentAnalyticsPanel
        student={
          selectedStudent
        }
        onClose={() =>
          setSelectedStudent(
            null
          )
        }
      />

    </div>
  );
}


export default ClassManagement;