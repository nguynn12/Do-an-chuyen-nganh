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
        ]);


        if (cancelled) {
          return;
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
            ALERT
        ============================== */}

        {riskCount > 0 && (
          <section className="class-alert">

            <div className="class-alert-icon">
              <AlertTriangle
                size={19}
              />
            </div>


            <div>
              <strong>
                Có {riskCount} sinh viên
                cần chú ý
              </strong>

              <p>
                Phát hiện từ tiến độ
                nộp bài hoặc kết quả
                học tập hiện tại.
              </p>
            </div>


            <button
              type="button"
              onClick={() =>
                setFilter(
                  "risk"
                )
              }
            >
              Xem danh sách
            </button>

          </section>
        )}


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