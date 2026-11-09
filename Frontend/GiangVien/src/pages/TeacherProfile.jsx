import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

import {
  BookOpen, Building2, ChevronRight, GraduationCap, Mail, ShieldCheck,
  UserRound, UsersRound, Bell, LogOut, Phone, BarChart3, ArrowUpRight,
  CalendarDays, LifeBuoy, ArrowRight, Layers3,
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
import {
  getTeacherSession,
  clearTeacherSession,
} from "../services/authService";

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

        const session = getTeacherSession();
        const teacherId = session?.teacherId ? Number(session.teacherId) : null;

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
    clearTeacherSession();

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

  const initials = teacher.fullName.trim().split(/\s+/).slice(-2).map(part => part[0]).join('').toUpperCase();
  const shortcuts = [
    {icon:CalendarDays, title:'Lịch giảng dạy', description:'Sắp xếp lịch và công việc', path:'/lich'},
    {icon:Bell, title:'Thông báo học tập', description:'Theo dõi nhắc nhở và cảnh báo', path:'/tin-nhan'},
    {icon:BarChart3, title:'Phân tích học tập', description:'Khám phá dữ liệu các lớp', path:'/phan-tich'},
    {icon:LifeBuoy, title:'Trung tâm hỗ trợ', description:'Hỗ trợ tài khoản và thông tin', path:'/ho-tro'},
  ];

  return (
    <div className="app profile-app">
      <Header teacher={teacher} />
      <Sidebar />
      <main className="faculty-page">
        <nav className="faculty-breadcrumb" aria-label="Đường dẫn trang">
          <button type="button" onClick={() => navigate('/')}>Trang chủ</button>
          <ChevronRight size={13} /><span>Hồ sơ giảng viên</span>
        </nav>

        <div className="faculty-page-heading">
          <div><span className="faculty-eyebrow">KHÔNG GIAN GIẢNG VIÊN</span>
            <h1>Hồ sơ của bạn</h1>
            <p>Thông tin cá nhân và hành trình giảng dạy, trong một không gian.</p>
          </div>
          <button type="button" className="faculty-outline-button" onClick={() => navigate('/ho-tro')}>
            <LifeBuoy size={16} /> Hỗ trợ cập nhật hồ sơ <ArrowUpRight size={15} />
          </button>
        </div>

        <section className="faculty-identity-card" aria-labelledby="faculty-name">
          <div className="faculty-cover">
            <div className="faculty-cover-grid" aria-hidden="true" />
            <span className="faculty-cover-label"><GraduationCap size={17} /> DALAT UNIVERSITY</span>
            <div className="faculty-cover-wordmark" aria-hidden="true">Tri thức mở lối.<br/><span>Giảng dạy kết nối.</span></div>
            <div className="faculty-cover-orbit" aria-hidden="true" />
          </div>
          <div className="faculty-identity-body">
            <div className="faculty-avatar" aria-hidden="true">{initials}<span><GraduationCap size={15}/></span></div>
            <div className="faculty-name-block">
              <div className="faculty-name-line"><h2 id="faculty-name">{teacher.fullName}</h2><span className="faculty-role-badge">{teacher.role}</span></div>
              <p><Building2 size={15}/> Trường Đại học Đà Lạt <span className="faculty-identity-dot">·</span><span>@{teacher.username}</span></p>
            </div>
            <span className="faculty-source-label"><ShieldCheck size={15}/> Hồ sơ hệ thống LMS</span>
          </div>
          <div className="faculty-details">
            {[
              {icon:GraduationCap,label:'Mã giảng viên',value:teacher.teacherCode},
              {icon:Building2,label:'Đơn vị công tác',value:teacher.department},
              {icon:Mail,label:'Email liên hệ',value:teacher.email,email:true},
              {icon:Phone,label:'Số điện thoại',value:teacher.phone},
            ].map(({icon:Icon,label,value,email}) => <div className="faculty-detail" key={label}>
              <span className="faculty-detail-label"><Icon size={15}/>{label}</span>
              {email && value !== 'Chưa cập nhật' ? <a href={`mailto:${value}`}>{value}</a> : <strong className={value==='Chưa cập nhật' ? 'faculty-missing-value' : ''}>{value}</strong>}
            </div>)}
          </div>
        </section>

        <section className="faculty-stats" aria-label="Tổng quan giảng dạy">
          {[
            {icon:BookOpen,value:courses.length,label:'Môn học phụ trách',detail:'Các môn được phân công',tone:'green',path:'/khoa-hoc'},
            {icon:UsersRound,value:totalStudents,label:'Sinh viên đồng hành',detail:'Đã loại trùng giữa các môn',tone:'blue',path:'/khoa-hoc'},
            {icon:BarChart3,value:pendingGrading,label:'Bài đang chờ chấm',detail:'Theo dõi tiến độ bài nộp',tone:'orange',path:'/quan-ly-bai-tap'},
            {icon:Layers3,value:cohortStats.filter(item=>item.count>0).length,label:'Khóa sinh viên',detail:cohortStats.filter(item=>item.count>0).map(item=>item.cohort).join(' · ') || 'Chưa có dữ liệu',tone:'violet',path:'/khoa-hoc'},
          ].map(({icon:Icon,value,label,detail,tone,path}) => <button type="button" className={`faculty-stat faculty-stat-${tone}`} key={label} onClick={()=>navigate(path)}>
            <span className="faculty-stat-icon"><Icon size={21}/></span><ArrowUpRight size={16} className="faculty-stat-arrow"/>
            <strong>{value}</strong><span className="faculty-stat-label">{label}</span><small>{detail}</small>
          </button>)}
        </section>

        <div className="faculty-bottom-grid">
          <section className="faculty-panel faculty-courses">
            <div className="faculty-panel-heading"><div><span className="faculty-eyebrow">GIẢNG DẠY</span><h2>Các môn học của bạn <span>{courses.length}</span></h2></div>
              <button type="button" className="faculty-text-button" onClick={()=>navigate('/khoa-hoc')}>Xem tất cả <ArrowRight size={16}/></button>
            </div>
            {courses.length ? <div className="faculty-course-list">{courses.map((course,index)=><button type="button" className="faculty-course" key={course.Moodle_Course_ID} onClick={()=>navigate(`/quan-ly-lop/${course.Moodle_Course_ID}`)}>
              <span className={`faculty-course-icon faculty-course-icon-${index%4}`}><BookOpen size={22}/></span>
              <span className="faculty-course-content"><span className="faculty-course-code">{course.Course_Code || 'MÔN HỌC'}</span><strong>{course.Course_Name}</strong><small>{course.Category_Name || 'Khóa học DLU'}</small></span>
              <span className="faculty-course-action">Quản lý lớp <ArrowUpRight size={15}/></span>
            </button>)}</div> : <div className="faculty-empty"><BookOpen size={28}/><p>Bạn chưa được phân công môn học.</p></div>}
            <div className="faculty-course-footer"><UsersRound size={16}/><span>Đồng hành cùng sinh viên</span><div>{cohortStats.map(item=><span key={item.cohort}>{item.cohort}<b>{item.count}</b></span>)}</div></div>
          </section>

          <aside className="faculty-side-column">
            <section className="faculty-panel faculty-shortcuts">
              <div className="faculty-panel-heading"><div><span className="faculty-eyebrow">DÀNH CHO BẠN</span><h2>Truy cập nhanh</h2></div><UserRound size={19}/></div>
              {shortcuts.map(({icon:Icon,title,description,path})=><button type="button" className="faculty-shortcut" key={title} onClick={()=>navigate(path)}><span className="faculty-shortcut-icon"><Icon size={18}/></span><span><strong>{title}</strong><small>{description}</small></span><ChevronRight size={16}/></button>)}
              <button type="button" className="faculty-logout" onClick={logout}><LogOut size={16}/> Đăng xuất tài khoản <ArrowUpRight size={15}/></button>
            </section>
            <div className="faculty-support-note"><span><LifeBuoy size={20}/></span><div><strong>Thông tin cần cập nhật?</strong><p>Liên hệ bộ phận hỗ trợ để điều chỉnh hồ sơ trên hệ thống.</p><button type="button" onClick={()=>navigate('/ho-tro')}>Đến trung tâm hỗ trợ <ArrowRight size={14}/></button></div></div>
          </aside>
        </div>
        <footer className="faculty-page-footer"><GraduationCap size={15}/> DLU LMS <span>·</span> Kết nối giảng dạy, lan tỏa tri thức.</footer>
      </main>
    </div>
  );
}

export default TeacherProfile;
