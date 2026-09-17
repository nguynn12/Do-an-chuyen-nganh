import {
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  Search,
  SlidersHorizontal,
  BookOpen,
  GraduationCap,
  Sparkles,
  BarChart3,
} from "lucide-react";

import { useNavigate } from "react-router-dom";

import Header from "../components/Header";
import Sidebar from "../components/Sidebar";

import CourseStats from "../components/courses/CourseStats";
import CourseRow from "../components/courses/CourseRow";

import {
  getTeacher,
  getTeacherCourses,
  getCourseStudents,
  getCourseStudentAnalytics,
} from "../services/teacherApi";

import "../styles/TeacherOverview.css";
import "../styles/Courses.css";


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

    degree: data.Degree || "",
    teacherCode:
      data.Teacher_Code ||
      data.Username ||
      "",

    department:
      data.Department ||
      "",

    initials: "GV",
  };
}


// ======================================================
// COURSES PAGE
// ======================================================

function Courses() {
  const navigate = useNavigate();


  // ====================================================
  // STATE
  // ====================================================

  const [teacher, setTeacher] =
    useState(null);

  const [courses, setCourses] =
    useState([]);

  const [loading, setLoading] =
    useState(true);

  const [error, setError] =
    useState("");

  const [searchTerm, setSearchTerm] =
    useState("");

  const [filter, setFilter] =
    useState("all");


  // ====================================================
  // HỌC KỲ ĐANG ĐƯỢC CHỌN
  // ====================================================

  const [
    selectedSemester,
    setSelectedSemester,
  ] = useState("");


  // ====================================================
  // LOAD COURSES
  // ====================================================

  useEffect(() => {
    let cancelled = false;


    async function loadCourses() {
      try {
        setLoading(true);
        setError("");


        // ================================================
        // LẤY GIẢNG VIÊN ĐANG ĐĂNG NHẬP
        // ================================================

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


        // ================================================
        // LOAD TEACHER + COURSES
        // ================================================

        const [
          teacherData,
          teacherCourses,
        ] =
          await Promise.all([
            getTeacher(
              teacherId
            ),

            getTeacherCourses(
              teacherId
            ),
          ]);


        if (cancelled) {
          return;
        }


        setTeacher(
          normalizeTeacher(
            teacherData
          )
        );


        // ================================================
        // LOAD ANALYTICS CHO TỪNG COURSE
        // ================================================

        const normalizedCourses =
          await Promise.all(

            teacherCourses.map(
              async (course) => {

                try {

                  const courseId =
                    course.Moodle_Course_ID;


                  const [
                    students,
                    analytics,
                  ] =
                    await Promise.all([

                      getCourseStudents(
                        courseId
                      ),

                      getCourseStudentAnalytics(
                        courseId
                      ),

                    ]);


                  // ======================================
                  // ĐIỂM TRUNG BÌNH
                  // ======================================

                  const validGrades =
                    analytics

                      .map(
                        (student) =>
                          student
                            .Average_Grade
                      )

                      .filter(
                        (grade) =>
                          grade !==
                            null &&
                          grade !==
                            undefined &&
                          Number.isFinite(
                            Number(
                              grade
                            )
                          )
                      )

                      .map(Number);


                  const averageScore =
                    validGrades.length >
                    0

                      ? validGrades.reduce(
                          (
                            total,
                            grade
                          ) =>
                            total +
                            grade,
                          0
                        ) /
                        validGrades.length

                      : null;


                  // ======================================
                  // TỔNG SỐ BÀI
                  // ======================================

                  const totalAssignments =
                    analytics.reduce(
                      (
                        total,
                        student
                      ) =>
                        total +
                        Number(
                          student
                            .Total_Assignments ||
                            0
                        ),
                      0
                    );


                  // ======================================
                  // TỔNG BÀI ĐÃ NỘP
                  // ======================================

                  const submittedAssignments =
                    analytics.reduce(
                      (
                        total,
                        student
                      ) =>
                        total +
                        Number(
                          student
                            .Submitted_Assignments ||
                            0
                        ),
                      0
                    );


                  // ======================================
                  // TỶ LỆ NỘP BÀI
                  // ======================================

                  const submissionRate =
                    totalAssignments >
                    0

                      ? Math.round(
                          (
                            submittedAssignments /
                            totalAssignments
                          ) *
                            100
                        )

                      : 0;


                  // ======================================
                  // TRẠNG THÁI COURSE
                  // ======================================

                  let status =
                    "active";


                  if (
                    course.End_Date
                  ) {

                    const endDate =
                      new Date(
                        course.End_Date
                      );


                    if (
                      endDate <
                      new Date()
                    ) {
                      status =
                        "ended";
                    }
                  }


                  // ======================================
                  // TỔNG SINH VIÊN
                  // ======================================

                  const totalStudents =
                    students.length ||
                    analytics.length;


                  // ======================================
                  // SINH VIÊN ĐẠT
                  // ======================================

                  const passedStudents =
                    analytics.filter(
                      (student) =>

                        student.Is_Passed ===
                          1 ||

                        (
                          student.Average_Grade !==
                            null &&

                          Number(
                            student.Average_Grade
                          ) >= 5
                        )
                    ).length;


                  // ======================================
                  // TỶ LỆ ĐẠT
                  // ======================================

                  const passRate =
                    totalStudents >
                    0

                      ? Math.round(
                          (
                            passedStudents /
                            totalStudents
                          ) *
                            100
                        )

                      : 0;


                  // ======================================
                  // NỘP ĐÚNG HẠN
                  // ======================================

                  const totalOnTime =
                    analytics.reduce(
                      (
                        total,
                        student
                      ) =>
                        total +
                        Number(
                          student
                            .On_Time_Submissions ||
                            0
                        ),
                      0
                    );


                  const onTimeRate =
                    submittedAssignments >
                    0

                      ? Math.round(
                          (
                            totalOnTime /
                            submittedAssignments
                          ) *
                            100
                        )

                      : 0;


                  // ======================================
                  // THỜI GIAN HỌC
                  // ======================================

                  const totalMinutes =
                    analytics.reduce(
                      (
                        total,
                        student
                      ) =>
                        total +
                        Number(
                          student
                            .Total_Time_Spent_Minutes ||
                            0
                        ),
                      0
                    );


                  const avgHoursPerStudent =
                    totalStudents >
                    0

                      ? Number(
                          (
                            totalMinutes /
                            60 /
                            totalStudents
                          ).toFixed(
                            1
                          )
                        )

                      : 0;


                  // ======================================
                  // RETURN COURSE
                  // ======================================

                  return {

                    id:
                      String(
                        courseId
                      ),

                    courseId,

                    courseKey:
                      course.Course_Key,


                    // ====================================
                    // HỌC KỲ
                    // ====================================

                    semesterKey:
                      course.Semester_Key ||
                      "unknown",

                    semesterName:
                      course.Semester_Name ||
                      "Chưa xác định",


                    code:
                      course.Course_Code ||
                      "",

                    title:
                      course.Course_Name ||
                      "Chưa có tên môn",

                    name:
                      course.Course_Name ||
                      "Chưa có tên môn",

                    category:
                      course.Category_Name ||
                      "",

                    startDate:
                      course.Start_Date,

                    endDate:
                      course.End_Date,

                    status,

                    studentCount:
                      totalStudents,

                    averageScore:
                      averageScore ===
                      null

                        ? null

                        : Number(
                            averageScore.toFixed(
                              2
                            )
                          ),

                    submissionRate,

                    passRate,

                    onTimeRate,

                    avgHoursPerStudent,

                    attendance:
                      null,

                    color:
                      "#6f9638",

                    raw:
                      course,
                  };

                } catch (
                  courseError
                ) {

                  console.error(
                    "Không thể tải dữ liệu môn:",
                    course.Moodle_Course_ID,
                    courseError
                  );


                  // ======================================
                  // FALLBACK COURSE
                  // ======================================

                  return {

                    id:
                      String(
                        course
                          .Moodle_Course_ID
                      ),

                    courseId:
                      course
                        .Moodle_Course_ID,

                    courseKey:
                      course
                        .Course_Key,


                    semesterKey:
                      course
                        .Semester_Key ||
                      "unknown",

                    semesterName:
                      course
                        .Semester_Name ||
                      "Chưa xác định",


                    code:
                      course
                        .Course_Code ||
                      "",

                    title:
                      course
                        .Course_Name ||
                      "Chưa có tên môn",

                    name:
                      course
                        .Course_Name ||
                      "Chưa có tên môn",

                    category:
                      course
                        .Category_Name ||
                      "",

                    startDate:
                      course
                        .Start_Date,

                    endDate:
                      course
                        .End_Date,

                    status:
                      "active",

                    studentCount:
                      0,

                    averageScore:
                      null,

                    submissionRate:
                      0,

                    passRate:
                      0,

                    onTimeRate:
                      0,

                    avgHoursPerStudent:
                      0,

                    attendance:
                      null,

                    color:
                      "#6f9638",

                    raw:
                      course,
                  };
                }
              }
            )
          );


        if (cancelled) {
          return;
        }


        setCourses(
          normalizedCourses
        );

      } catch (err) {

        console.error(
          "Lỗi tải Courses:",
          err
        );


        if (!cancelled) {
          setError(
            err.message ||
              "Không thể tải khóa học."
          );
        }

      } finally {

        if (!cancelled) {
          setLoading(false);
        }
      }
    }


    loadCourses();


    return () => {
      cancelled = true;
    };

  }, []);


  // ====================================================
  // DANH SÁCH HỌC KỲ
  //
  // Tự động lấy từ dữ liệu course backend trả về.
  // Không hard-code HK1 / HK2.
  // ====================================================

  const semesters =
    useMemo(() => {

      const semesterMap =
        new Map();


      courses.forEach(
        (course) => {

          if (
            course.semesterKey &&
            course.semesterKey !==
              "unknown"
          ) {

            semesterMap.set(
              course.semesterKey,
              course.semesterName
            );
          }
        }
      );


      return Array.from(
        semesterMap,
        ([key, name]) => ({
          key,
          name,
        })
      ).sort(
        (a, b) =>
          b.key.localeCompare(
            a.key
          )
      );

    }, [courses]);


  // ====================================================
  // TỰ CHỌN HỌC KỲ MỚI NHẤT
  // ====================================================

  useEffect(() => {

    if (
      !selectedSemester &&
      semesters.length > 0
    ) {

      setSelectedSemester(
        semesters[0].key
      );
    }

  }, [
    semesters,
    selectedSemester,
  ]);


  // ====================================================
  // COURSE THEO HỌC KỲ
  // ====================================================

  const semesterCourses =
    useMemo(() => {

      if (
        !selectedSemester
      ) {
        return courses;
      }


      return courses.filter(
        (course) =>
          course.semesterKey ===
          selectedSemester
      );

    }, [
      courses,
      selectedSemester,
    ]);


  // ====================================================
  // TÊN HỌC KỲ ĐANG CHỌN
  // ====================================================

  const selectedSemesterName =
    semesters.find(
      (semester) =>
        semester.key ===
        selectedSemester
    )?.name ||
    "Chọn học kỳ";


  // ====================================================
  // SEARCH + STATUS FILTER
  // ====================================================

  const filteredCourses =
    useMemo(() => {

      const keyword =
        searchTerm
          .trim()
          .toLowerCase();


      return semesterCourses.filter(
        (course) => {

          const title =
            String(
              course.title ||
              ""
            ).toLowerCase();


          const code =
            String(
              course.code ||
              ""
            ).toLowerCase();


          const matchesSearch =
            !keyword ||

            title.includes(
              keyword
            ) ||

            code.includes(
              keyword
            );


          const matchesFilter =
            filter ===
              "all" ||

            course.status ===
              filter;


          return (
            matchesSearch &&
            matchesFilter
          );
        }
      );

    }, [
      semesterCourses,
      searchTerm,
      filter,
    ]);


  // ====================================================
  // SỐ COURSE ĐANG DẠY
  // ====================================================

  const activeCount =
    semesterCourses.filter(
      (course) =>
        course.status ===
        "active"
    ).length;


  // ====================================================
  // SỐ COURSE ĐÃ KẾT THÚC
  // ====================================================

  const endedCount =
    semesterCourses.filter(
      (course) =>
        course.status ===
        "ended"
    ).length;


  // ====================================================
  // QUẢN LÝ LỚP
  // ====================================================

  const handleManage = (
    course
  ) => {

    navigate(
      `/quan-ly-lop/${course.courseId}`
    );
  };


  // ====================================================
  // CHẤM ĐIỂM
  // ====================================================

  const handleGrade = (
    course
  ) => {

    navigate(
      `/cham-diem/${course.courseId}`
    );
  };


  // ====================================================
  // ĐỔI HỌC KỲ
  // ====================================================

  const handleSemesterChange =
    (event) => {

      const semesterKey =
        event.target.value;


      setSelectedSemester(
        semesterKey
      );


      // Reset search + trạng thái
      // để tránh trường hợp đổi kỳ xong
      // nhưng filter cũ làm mất course.

      setFilter(
        "all"
      );

      setSearchTerm(
        ""
      );
    };


  // ====================================================
  // LOADING
  // ====================================================

  if (loading) {
    return (
      <div className="courses-loading">

        <div className="courses-spinner" />

        <strong>
          Đang tải khóa học
        </strong>

        <p>
          Đang đồng bộ dữ liệu từ LMS...
        </p>

      </div>
    );
  }


  // ====================================================
  // ERROR
  // ====================================================

  if (
    error ||
    !teacher
  ) {

    return (
      <div className="courses-loading">

        <h2>
          Không thể tải khóa học
        </h2>

        <p>
          {error ||
            "Không tìm thấy dữ liệu giảng viên."}
        </p>

        <button
          onClick={() =>
            window.location.reload()
          }
        >
          Tải lại
        </button>

      </div>
    );
  }


  // ====================================================
  // RENDER
  // ====================================================

  return (
    <div className="courses-page">


      {/* ============================================= */}
      {/* BACKGROUND */}
      {/* ============================================= */}

      <div className="courses-bg-grid" />

      <div className="courses-bg-orb one" />

      <div className="courses-bg-orb two" />


      {/* ============================================= */}
      {/* HEADER */}
      {/* ============================================= */}

      <Header
        teacher={teacher}
      />


      {/* ============================================= */}
      {/* SIDEBAR */}
      {/* ============================================= */}

      <Sidebar />


      {/* ============================================= */}
      {/* CONTENT */}
      {/* ============================================= */}

      <main className="courses-content">


        {/* =========================================== */}
        {/* HERO */}
        {/* =========================================== */}

        <section className="courses-hero">


          <div className="courses-hero-main">


            <div className="courses-hero-icon">

              <GraduationCap
                size={26}
              />

            </div>


            <div>


              <div className="courses-breadcrumb">

                <BookOpen
                  size={14}
                />

                <span>
                  Quản lý giảng dạy
                </span>

                <span>
                  /
                </span>

                <strong>
                  Khóa học
                </strong>

              </div>


              <span className="courses-hero-kicker">
                DLU LMS ANALYTICS
              </span>


              <h1>
                Khóa học của tôi
              </h1>


              <p>
                Theo dõi các lớp đang
                phụ trách, tiến độ nộp
                bài và kết quả học tập
                trong học kỳ đang chọn.
              </p>


            </div>


          </div>


          {/* ========================================= */}
          {/* CHỌN HỌC KỲ */}
          {/* ========================================= */}

          <div className="courses-semester">


            <div className="semester-icon">

              <Sparkles
                size={17}
              />

            </div>


            <div className="semester-select-wrap">


              <span>
                Học kỳ đang xem
              </span>


              {semesters.length > 0 ? (

                <select
                  className="semester-select"

                  value={
                    selectedSemester
                  }

                  onChange={
                    handleSemesterChange
                  }
                >

                  {semesters.map(
                    (semester) => (

                      <option
                        key={
                          semester.key
                        }

                        value={
                          semester.key
                        }
                      >
                        {semester.name}
                      </option>

                    )
                  )}

                </select>

              ) : (

                <strong>
                  Chưa có học kỳ
                </strong>

              )}


            </div>


          </div>


        </section>


        {/* =========================================== */}
        {/* THỐNG KÊ */}
        {/* =========================================== */}

        <CourseStats
          courses={
            semesterCourses
          }
        />


        {/* =========================================== */}
        {/* BẢNG SO SÁNH */}
        {/* =========================================== */}

        {semesterCourses.length >=
          2 && (

          <section className="course-comparison-section">


            <div className="comparison-header">


              <div className="comparison-title-wrap">


                <div className="comparison-title-icon">

                  <BarChart3
                    size={18}
                  />

                </div>


                <div>

                  <strong>
                    Bảng so sánh các lớp
                    đang phụ trách
                  </strong>

                  <p>
                    So sánh tổng quan sĩ
                    số, tỷ lệ hoàn thành,
                    điểm trung bình và
                    thời gian học giữa
                    các lớp trong{" "}
                    {selectedSemesterName}
                  </p>

                </div>


              </div>


            </div>


            <div className="comparison-table-wrap">


              <table className="comparison-table">


                <thead>

                  <tr>

                    <th>
                      Khóa học
                    </th>

                    <th
                      style={{
                        textAlign:
                          "center",
                      }}
                    >
                      Sĩ số
                    </th>

                    <th
                      style={{
                        textAlign:
                          "center",
                      }}
                    >
                      Điểm TB
                    </th>

                    <th>
                      Tỷ lệ Đạt (≥5.0)
                    </th>

                    <th>
                      Nộp đúng hạn
                    </th>

                    <th
                      style={{
                        textAlign:
                          "center",
                      }}
                    >
                      TG học TB/SV
                    </th>

                    <th
                      style={{
                        textAlign:
                          "center",
                      }}
                    >
                      Trạng thái
                    </th>

                    <th
                      style={{
                        textAlign:
                          "right",
                      }}
                    >
                      Thao tác
                    </th>

                  </tr>

                </thead>


                <tbody>


                  {semesterCourses.map(
                    (course) => (

                      <tr
                        key={
                          course.courseId
                        }
                      >


                        {/* COURSE */}

                        <td>

                          <div className="comparison-course-info">

                            <span className="comparison-course-title">
                              {course.title}
                            </span>

                            <span className="comparison-course-code">

                              {course.code ||
                                `ID: ${course.courseId}`}

                            </span>

                          </div>

                        </td>


                        {/* SĨ SỐ */}

                        <td
                          style={{
                            textAlign:
                              "center",

                            fontWeight:
                              600,
                          }}
                        >
                          {course.studentCount ||
                            0}
                        </td>


                        {/* ĐIỂM TB */}

                        <td
                          style={{
                            textAlign:
                              "center",

                            fontWeight:
                              700,

                            color:
                              course.averageScore >=
                              5

                                ? "#2e7d32"

                                : "#c62828",
                          }}
                        >

                          {course.averageScore !==
                          null

                            ? course.averageScore

                            : "—"}

                        </td>


                        {/* TỶ LỆ ĐẠT */}

                        <td>

                          <div className="comparison-mini-bar-wrap">


                            <div
                              style={{
                                display:
                                  "flex",

                                justifyContent:
                                  "space-between",

                                fontSize:
                                  "11px",

                                fontWeight:
                                  600,
                              }}
                            >

                              <span>
                                {course.passRate}%
                              </span>

                            </div>


                            <div className="comparison-mini-track">

                              <div
                                className="comparison-mini-fill"

                                style={{

                                  width:
                                    `${course.passRate}%`,

                                  background:
                                    course.passRate >=
                                    80

                                      ? "#37883e"

                                      : course.passRate >=
                                        50

                                      ? "#e66d1e"

                                      : "#dc2626",
                                }}
                              />

                            </div>


                          </div>

                        </td>


                        {/* NỘP ĐÚNG HẠN */}

                        <td>

                          <div className="comparison-mini-bar-wrap">


                            <div
                              style={{
                                display:
                                  "flex",

                                justifyContent:
                                  "space-between",

                                fontSize:
                                  "11px",

                                fontWeight:
                                  600,
                              }}
                            >

                              <span>
                                {course.onTimeRate}%
                              </span>

                            </div>


                            <div className="comparison-mini-track">

                              <div
                                className="comparison-mini-fill"

                                style={{

                                  width:
                                    `${course.onTimeRate}%`,

                                  background:
                                    course.onTimeRate >=
                                    80

                                      ? "#37883e"

                                      : course.onTimeRate >=
                                        50

                                      ? "#2563eb"

                                      : "#e66d1e",
                                }}
                              />

                            </div>


                          </div>

                        </td>


                        {/* THỜI GIAN */}

                        <td
                          style={{
                            textAlign:
                              "center",

                            fontWeight:
                              600,
                          }}
                        >

                          {course.avgHoursPerStudent >
                          0

                            ? `${course.avgHoursPerStudent}h`

                            : "—"}

                        </td>


                        {/* TRẠNG THÁI */}

                        <td
                          style={{
                            textAlign:
                              "center",
                          }}
                        >

                          <span
                            className={
                              `course-status ${
                                course.status ===
                                "active"

                                  ? "course-active"

                                  : "course-ended"
                              }`
                            }

                            style={{
                              display:
                                "inline-block",

                              fontSize:
                                "10.5px",

                              padding:
                                "3px 8px",
                            }}
                          >

                            {course.status ===
                            "active"

                              ? "Đang dạy"

                              : "Đã kết thúc"}

                          </span>

                        </td>


                        {/* QUẢN LÝ */}

                        <td
                          style={{
                            textAlign:
                              "right",
                          }}
                        >

                          <button
                            className="comparison-btn"

                            onClick={() =>
                              handleManage(
                                course
                              )
                            }
                          >
                            Quản lý lớp
                          </button>

                        </td>


                      </tr>

                    )
                  )}


                </tbody>


              </table>


            </div>


          </section>

        )}


        {/* =========================================== */}
        {/* DANH SÁCH KHÓA HỌC */}
        {/* =========================================== */}

        <section className="courses-panel">


          {/* ========================================= */}
          {/* PANEL HEADING */}
          {/* ========================================= */}

          <div className="courses-panel-heading">


            <div>


              <span>
                QUẢN LÝ KHÓA HỌC
              </span>


              <h2>
                Danh sách lớp phụ trách
              </h2>


              <p>

                {
                  filteredCourses.length
                }{" "}

                khóa học phù hợp trong{" "}

                {selectedSemesterName}.

              </p>


            </div>


            <div className="courses-result-number">

              {
                filteredCourses.length
              }

            </div>


          </div>


          {/* ========================================= */}
          {/* TOOLBAR */}
          {/* ========================================= */}

          <div className="courses-toolbar">


            {/* ======================================= */}
            {/* TABS */}
            {/* ======================================= */}

            <div className="courses-tabs">


              {/* TẤT CẢ */}

              <button
                className={
                  filter ===
                  "all"

                    ? "course-tab active"

                    : "course-tab"
                }

                onClick={() =>
                  setFilter(
                    "all"
                  )
                }
              >

                Tất cả

                <span>
                  {
                    semesterCourses.length
                  }
                </span>

              </button>


              {/* ĐANG DẠY */}

              <button
                className={
                  filter ===
                  "active"

                    ? "course-tab active"

                    : "course-tab"
                }

                onClick={() =>
                  setFilter(
                    "active"
                  )
                }
              >

                Đang giảng dạy

                <span>
                  {activeCount}
                </span>

              </button>


              {/* ĐÃ KẾT THÚC */}

              <button
                className={
                  filter ===
                  "ended"

                    ? "course-tab active"

                    : "course-tab"
                }

                onClick={() =>
                  setFilter(
                    "ended"
                  )
                }
              >

                Đã kết thúc

                <span>
                  {endedCount}
                </span>

              </button>


            </div>


            {/* ======================================= */}
            {/* SEARCH */}
            {/* ======================================= */}

            <div className="courses-tools">


              <div className="courses-search">


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

                  placeholder="Tìm tên hoặc mã môn..."
                />


              </div>


              <button
                className="courses-filter-button"

                title="Bộ lọc nâng cao"
              >

                <SlidersHorizontal
                  size={17}
                />

              </button>


            </div>


          </div>


          {/* ========================================= */}
          {/* COURSE LIST */}
          {/* ========================================= */}

          <div className="courses-management-list">


            {filteredCourses.length >
            0 ? (


              filteredCourses.map(
                (course) => (

                  <CourseRow
                    key={
                      course.courseId
                    }

                    course={
                      course
                    }

                    onManage={
                      handleManage
                    }

                    onGrade={
                      handleGrade
                    }
                  />

                )
              )


            ) : (


              <div className="courses-empty">


                <BookOpen
                  size={35}
                />


                <strong>
                  Không tìm thấy khóa học
                </strong>


                <p>

                  Không có khóa học phù
                  hợp trong{" "}

                  {selectedSemesterName}.

                </p>


              </div>


            )}


          </div>


        </section>


      </main>


    </div>
  );
}


export default Courses;