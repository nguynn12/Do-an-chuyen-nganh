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
    semester:
      "Học kỳ 1 (2026–2027)",
  };
}


function Courses() {
  const navigate = useNavigate();

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


  useEffect(() => {
    let cancelled = false;

    async function loadCourses() {
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

        const [
          teacherData,
          teacherCourses,
        ] = await Promise.all([
          getTeacher(teacherId),
          getTeacherCourses(
            teacherId
          ),
        ]);

        if (cancelled) return;

        setTeacher(
          normalizeTeacher(
            teacherData
          )
        );


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


                  // ==============================
                  // ĐIỂM TRUNG BÌNH
                  // ==============================

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


                  // ==============================
                  // TỶ LỆ NỘP BÀI THẬT
                  //
                  // submitted / total assignments
                  // ==============================

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


                  const submissionRate =
                    totalAssignments > 0
                      ? Math.round(
                          (
                            submittedAssignments /
                            totalAssignments
                          ) *
                            100
                        )
                      : 0;


                  // ==============================
                  // TRẠNG THÁI MÔN
                  // ==============================

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


                  return {
                    id: String(
                      courseId
                    ),

                    courseId,

                    courseKey:
                      course.Course_Key,

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
                      students.length,

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

                    attendance: null,

                    color:
                      "#6f9638",

                    raw: course,
                  };
                } catch (
                  courseError
                ) {
                  console.error(
                    "Không thể tải dữ liệu môn:",
                    course.Moodle_Course_ID,
                    courseError
                  );

                  return {
                    id: String(
                      course.Moodle_Course_ID
                    ),

                    courseId:
                      course.Moodle_Course_ID,

                    courseKey:
                      course.Course_Key,

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

                    status:
                      "active",

                    studentCount: 0,

                    averageScore:
                      null,

                    submissionRate:
                      0,

                    attendance:
                      null,

                    color:
                      "#6f9638",
                  };
                }
              }
            )
          );


        if (cancelled) return;

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


  const filteredCourses =
    useMemo(() => {
      const keyword =
        searchTerm
          .trim()
          .toLowerCase();

      return courses.filter(
        (course) => {
          const title =
            String(
              course.title || ""
            ).toLowerCase();

          const code =
            String(
              course.code || ""
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
            filter === "all" ||
            course.status ===
              filter;

          return (
            matchesSearch &&
            matchesFilter
          );
        }
      );
    }, [
      courses,
      searchTerm,
      filter,
    ]);


  const activeCount =
    courses.filter(
      (course) =>
        course.status ===
        "active"
    ).length;

  const endedCount =
    courses.filter(
      (course) =>
        course.status ===
        "ended"
    ).length;


  const handleManage = (
    course
  ) => {
    navigate(
      `/quan-ly-lop/${course.courseId}`
    );
  };


  const handleGrade = (
    course
  ) => {
    navigate(
      `/cham-diem/${course.courseId}`
    );
  };


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


  if (error || !teacher) {
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


  return (
    <div className="courses-page">

      <div className="courses-bg-grid" />
      <div className="courses-bg-orb one" />
      <div className="courses-bg-orb two" />

      <Header teacher={teacher} />

      <Sidebar />


      <main className="courses-content">

        {/* HERO */}

        <section className="courses-hero">

          <div className="courses-hero-main">

            <div className="courses-hero-icon">
              <GraduationCap
                size={26}
              />
            </div>

            <div>
              <div className="courses-breadcrumb">
                <BookOpen size={14} />

                <span>
                  Quản lý giảng dạy
                </span>

                <span>/</span>

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
                trong học kỳ hiện tại.
              </p>
            </div>

          </div>


          <div className="courses-semester">

            <div className="semester-icon">
              <Sparkles
                size={17}
              />
            </div>

            <div>
              <span>
                Học kỳ hiện tại
              </span>

              <strong>
                {teacher.semester}
              </strong>
            </div>

          </div>

        </section>


        <CourseStats
          courses={courses}
        />


        <section className="courses-panel">

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
                khóa học phù hợp.
              </p>
            </div>

            <div className="courses-result-number">
              {filteredCourses.length}
            </div>

          </div>


          <div className="courses-toolbar">

            <div className="courses-tabs">

              <button
                className={
                  filter === "all"
                    ? "course-tab active"
                    : "course-tab"
                }
                onClick={() =>
                  setFilter("all")
                }
              >
                Tất cả

                <span>
                  {courses.length}
                </span>
              </button>


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


            <div className="courses-tools">

              <div className="courses-search">
                <Search size={17} />

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
                  Thử thay đổi từ khóa
                  hoặc bộ lọc.
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