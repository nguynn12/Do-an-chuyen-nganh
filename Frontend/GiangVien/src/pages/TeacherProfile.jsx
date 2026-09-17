import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";

import {
  BookOpen,
  Building2,
  ChevronRight,
  GraduationCap,
  LockKeyhole,
  Mail,
  Pencil,
  Plus,
  ShieldCheck,
  UserRound,
  UsersRound,
  Bell,
  Link2,
  LogOut,
  Phone,
  BarChart3,
} from "lucide-react";

import Header from "../components/Header";
import Sidebar from "../components/Sidebar";
import LoadingScreen from "../components/common/LoadingScreen";
import ErrorScreen from "../components/common/ErrorScreen";

import {
  getTeacher,
  getTeacherCourses,
  getTeacherDashboard,
  getCourseStudents,
} from "../services/teacherApi";

import "../styles/TeacherOverview.css";
import "../styles/TeacherProfile.css";


// ======================================================
// CHUẨN HÓA THÔNG TIN GIẢNG VIÊN
// ======================================================

function normalizeTeacher(data) {
  return {
    id: data.Moodle_User_ID,
    userKey: data.User_Key,
    username: data.Username,

    fullName:
      data.Full_Name ||
      "Giảng viên",

    email:
      data.Email ||
      "Chưa cập nhật",

    role:
      data.Primary_Role === "Teacher"
        ? "Giảng viên"
        : data.Primary_Role || "Giảng viên",

    teacherCode:
      data.Teacher_Code ||
      data.User_Key ||
      data.Username ||
      "—",

    department:
      data.Department_Name ||
      data.Department ||
      "Chưa cập nhật",

    phone:
      data.Phone ||
      data.Phone_Number ||
      "Chưa cập nhật",

    degree:
      data.Degree || "",

    initials: "GV",
  };
}


// ======================================================
// LẤY ID SINH VIÊN DÙNG ĐỂ KHỬ TRÙNG
// ======================================================

function getStudentUniqueKey(student) {
  return (
    student?.Student_ID ??
    student?.Student_Code ??
    student?.User_Key ??
    student?.Moodle_User_ID ??
    student?.Username ??
    student?.Email ??
    null
  );
}


// ======================================================
// TRANG HỒ SƠ GIẢNG VIÊN
// ======================================================

function TeacherProfile() {
  const navigate = useNavigate();

  const [teacher, setTeacher] =
    useState(null);

  const [courses, setCourses] =
    useState([]);

  const [stats, setStats] =
    useState(null);

  // Thống kê sinh viên theo K45 / K46 / K47
  const [cohortStats, setCohortStats] =
    useState([]);

  const [loading, setLoading] =
    useState(true);

  const [error, setError] =
    useState("");


  // ====================================================
  // LOAD DỮ LIỆU
  // ====================================================

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        setLoading(true);
        setError("");

        const teacherId = Number(
          localStorage.getItem(
            "currentTeacherId"
          )
        );

        if (!teacherId) {
          throw new Error(
            "Không tìm thấy phiên đăng nhập."
          );
        }


        // ----------------------------------------------
        // 1. Lấy GV + môn học + dashboard
        // ----------------------------------------------

        const [
          teacherData,
          courseData,
          dashboardData,
        ] = await Promise.all([
          getTeacher(teacherId),
          getTeacherCourses(teacherId),
          getTeacherDashboard(teacherId),
        ]);

        if (cancelled) return;

        const normalizedCourses =
          Array.isArray(courseData)
            ? courseData
            : [];

        setTeacher(
          normalizeTeacher(teacherData)
        );

        setCourses(
          normalizedCourses
        );

        setStats(
          dashboardData?.dashboard || {}
        );


        // ----------------------------------------------
        // 2. Thống kê SV theo khóa
        //
        // Hiện database đang dùng:
        // K45 / K46 / K47
        //
        // Sau này có K48 chỉ cần thêm API/dữ liệu
        // tương ứng hoặc chuyển danh sách cohort
        // thành API động.
        // ----------------------------------------------

        const cohorts = [
          "K45",
          "K46",
          "K47",
        ];

        const cohortResult =
          await Promise.all(
            cohorts.map(
              async (cohort) => {

                // Lấy SV của cohort này
                // trong TẤT CẢ môn GV phụ trách
                const studentsByCourse =
                  await Promise.all(
                    normalizedCourses.map(
                      async (course) => {
                        try {
                          const result =
                            await getCourseStudents(
                              course.Moodle_Course_ID,
                              cohort
                            );

                          return Array.isArray(
                            result
                          )
                            ? result
                            : [];
                        } catch (err) {
                          console.warn(
                            `Không lấy được sinh viên ${cohort} của môn ${course.Moodle_Course_ID}`,
                            err
                          );

                          return [];
                        }
                      }
                    )
                  );


                // Gộp sinh viên từ nhiều môn
                const mergedStudents =
                  studentsByCourse.flat();


                // --------------------------------------
                // KHỬ TRÙNG SINH VIÊN
                //
                // Ví dụ:
                // Nguyễn A học GAME401 + AI401
                // vẫn chỉ tính là 1 sinh viên.
                // --------------------------------------

                const uniqueStudents =
                  new Map();

                mergedStudents.forEach(
                  (student, index) => {
                    const key =
                      getStudentUniqueKey(
                        student
                      );

                    // Nếu API có ID
                    if (key !== null) {
                      uniqueStudents.set(
                        String(key),
                        student
                      );
                    } else {
                      // fallback để không làm mất record
                      uniqueStudents.set(
                        `${cohort}-${index}`,
                        student
                      );
                    }
                  }
                );


                return {
                  cohort,
                  count:
                    uniqueStudents.size,
                };
              }
            )
          );


        if (!cancelled) {
          setCohortStats(
            cohortResult
          );
        }

      } catch (e) {
        if (!cancelled) {
          setError(
            e.message ||
              "Không thể tải hồ sơ giảng viên."
          );
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    load();

    return () => {
      cancelled = true;
    };
  }, []);


  // ====================================================
  // THỐNG KÊ
  // ====================================================

  const totalStudents =
    cohortStats.reduce(
      (sum, item) =>
        sum + Number(item.count || 0),
      0
    );

  const pendingGrading =
    Number(
      stats?.pendingGrading || 0
    );

  const submissionRate =
    Number(
      stats?.submissionRate ??
        stats?.averageSubmissionRate ??
        0
    );


  // Chỉ preview tối đa 3 môn
  const courseRows =
    useMemo(
      () => courses.slice(0, 3),
      [courses]
    );


  // ====================================================
  // LOADING / ERROR
  // ====================================================

  if (loading) {
    return <LoadingScreen />;
  }

  if (error || !teacher) {
    return (
      <ErrorScreen
        message={
          error ||
          "Thiếu dữ liệu giảng viên."
        }
      />
    );
  }


  // ====================================================
  // ĐĂNG XUẤT
  // ====================================================

  const logout = () => {
    localStorage.removeItem(
      "isLoggedIn"
    );

    localStorage.removeItem(
      "currentTeacherId"
    );

    navigate(
      "/dang-nhap",
      {
        replace: true,
      }
    );
  };


  // ====================================================
  // RENDER
  // ====================================================

  return (
    <div className="app profile-app">

      {/* HEADER */}
      <Header teacher={teacher} />


      {/* SIDEBAR */}
      <Sidebar />


      {/* =================================================
          NỘI DUNG
      ================================================= */}

      <main className="profile-page">

        {/* Breadcrumb */}
        <div className="profile-breadcrumb">
          Trang chủ
          <span>›</span>
          Hồ sơ giảng viên
        </div>


        {/* Heading */}
        <div className="profile-heading">

          <div>
            <h1>
              Hồ sơ giảng viên
            </h1>

            <p>
              Quản lý thông tin cá nhân,
              tài khoản và các khóa học
              đang giảng dạy.
            </p>
          </div>


          <button
            className="profile-edit"
            type="button"
          >
            <Pencil size={16} />

            Chỉnh sửa thông tin
          </button>

        </div>


        {/* =================================================
            THÔNG TIN GIẢNG VIÊN
        ================================================= */}

        <section className="profile-hero-card">

          <div className="profile-avatar">
            GV
          </div>


          <div className="profile-identity">

            <h2>
              {teacher.fullName}
            </h2>


            <div className="profile-role">
              {teacher.role}
            </div>


            <div className="profile-info-grid">

              {/* Mã GV */}
              <div>
                <GraduationCap />

                <span>
                  Mã giảng viên
                </span>

                <strong>
                  {teacher.teacherCode}
                </strong>
              </div>


              {/* Đơn vị */}
              <div>
                <Building2 />

                <span>
                  Đơn vị
                </span>

                <strong>
                  {teacher.department}
                </strong>
              </div>


              {/* Email */}
              <div>
                <Mail />

                <span>
                  Email
                </span>

                <strong>
                  {teacher.email}
                </strong>
              </div>


              {/* Điện thoại */}
              <div>
                <Phone />

                <span>
                  Số điện thoại
                </span>

                <strong>
                  {teacher.phone}
                </strong>
              </div>

            </div>
          </div>


          {/* Branding */}
          <div className="profile-brand-mark">

            <strong>
              TRƯỜNG ĐẠI HỌC
              <br />
              ĐÀ LẠT
            </strong>

            <span>
              Tri thức tạo giá trị
            </span>

          </div>

        </section>


        {/* =================================================
            THỐNG KÊ
        ================================================= */}

        <section className="profile-stats">

          {/* KHÓA HỌC */}
          <div className="profile-stat green">

            <BookOpen />

            <div>
              <strong>
                {courses.length}
              </strong>

              <span>
                Khóa học
              </span>

              <small>
                Đang phụ trách
              </small>
            </div>

          </div>


          {/* SINH VIÊN */}
          <div className="profile-stat orange student-stat">

            <UsersRound />

            <div className="student-stat-content">

              <strong>
                {totalStudents}
              </strong>

              <span>
                Sinh viên phụ trách
              </span>


              {/* K45 / K46 / K47 */}
              <div className="cohort-list">

                {cohortStats.map(
                  (item) => (
                    <small
                      key={
                        item.cohort
                      }
                    >
                      {item.cohort}

                      <b>
                        {item.count}
                      </b>
                    </small>
                  )
                )}

              </div>

            </div>

          </div>


          {/* BÀI CHỜ CHẤM */}
          <div className="profile-stat amber">

            <BarChart3 />

            <div>
              <strong>
                {pendingGrading}
              </strong>

              <span>
                Bài chờ chấm
              </span>

              <small>
                Cần xử lý
              </small>
            </div>

          </div>


          {/* TỶ LỆ NỘP */}
          <div className="profile-stat green">

            <ShieldCheck />

            <div>

              <strong>
                {submissionRate
                  ? `${Math.round(
                      submissionRate
                    )}%`
                  : "—"}
              </strong>

              <span>
                Tỷ lệ nộp bài
              </span>

              <small>
                Dữ liệu tổng quan
              </small>

            </div>

          </div>

        </section>


        {/* =================================================
            PHẦN DƯỚI
        ================================================= */}

        <div className="profile-grid">


          {/* ===============================================
              KHÓA HỌC
          =============================================== */}

          <section className="profile-card courses-profile-card">

            <div className="profile-card-title">

              <div>
                <BookOpen size={20} />

                <strong>
                  Khóa học đang giảng dạy
                </strong>
              </div>


              <button
                className="add-course"
                type="button"
              >
                <Plus size={17} />

                Thêm khóa học
              </button>

            </div>


            {/* Không có môn */}
            {courseRows.length === 0 ? (

              <div className="profile-empty">
                Chưa có khóa học trong hệ thống.
              </div>

            ) : (

              courseRows.map(
                (course) => (

                  <div
                    className="profile-course-row"
                    key={
                      course.Moodle_Course_ID
                    }
                  >

                    {/* Icon môn */}
                    <div className="course-monogram">

                      {(
                        course.Course_Code ||
                        "MH"
                      ).slice(0, 2)}

                    </div>


                    {/* Thông tin môn */}
                    <div className="profile-course-main">

                      <strong>

                        {course.Course_Code
                          ? `${course.Course_Code} - `
                          : ""}

                        {course.Course_Name}

                      </strong>


                      <span>
                        {course.Category_Name ||
                          "Khóa học DLU"}
                      </span>

                    </div>


                    {/* Quản lý lớp */}
                    <button
                      type="button"
                      onClick={() =>
                        navigate(
                          `/quan-ly-lop/${course.Moodle_Course_ID}`
                        )
                      }
                    >
                      Xem chi tiết
                    </button>

                  </div>
                )
              )
            )}


            {/* Xem tất cả */}
            <button
              className="all-courses-link"
              type="button"
              onClick={() =>
                navigate("/khoa-hoc")
              }
            >

              Xem tất cả khóa học

              <ChevronRight
                size={15}
              />

            </button>

          </section>


          {/* ===============================================
              TÀI KHOẢN
          =============================================== */}

          <section className="profile-card account-card">

            <div className="profile-card-title">

              <div>
                <UserRound size={20} />

                <strong>
                  Tài khoản & Hệ thống
                </strong>
              </div>

            </div>


            {/* Thông tin cá nhân */}
            <button type="button">

              <UserRound />

              <span>
                <strong>
                  Thông tin cá nhân
                </strong>

                <small>
                  Cập nhật thông tin hồ sơ
                </small>
              </span>

              <ChevronRight />

            </button>


            {/* Password */}
            <button type="button">

              <LockKeyhole />

              <span>
                <strong>
                  Đổi mật khẩu
                </strong>

                <small>
                  Bảo mật tài khoản
                </small>
              </span>

              <ChevronRight />

            </button>


            {/* LMS */}
            <button type="button">

              <Link2 />

              <span>
                <strong>
                  Kết nối LMS DLU
                </strong>

                <small>
                  Đồng bộ khóa học ở chế độ
                  chỉ đọc
                </small>
              </span>

              <ChevronRight />

            </button>


            {/* Notification */}
            <button type="button">

              <Bell />

              <span>
                <strong>
                  Cài đặt thông báo
                </strong>

                <small>
                  Quản lý thông báo của tài khoản
                </small>
              </span>

              <ChevronRight />

            </button>


            {/* Logout */}
            <button
              type="button"
              className="profile-logout"
              onClick={logout}
            >

              <LogOut />

              <span>
                <strong>
                  Đăng xuất
                </strong>
              </span>

            </button>

          </section>

        </div>

      </main>

    </div>
  );
}

export default TeacherProfile;