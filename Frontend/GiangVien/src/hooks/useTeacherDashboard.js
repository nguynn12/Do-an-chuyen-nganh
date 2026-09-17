import {
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  getTeacherTasks,
  getTeacherAnalytics,
} from "../services/dashboardService";

import {
  getNotifications,
} from "../services/notificationApi";

import {
  getTeacher,
  getTeacherDashboard,
  getTeacherCourses,
  getCourseStudents,
  getCourseStudentAnalytics,

  // LỊCH THẬT TỪ BACKEND
  getTeacherScheduleApi,
} from "../services/teacherApi";


// ============================================================
// FORMAT MONTH
// ============================================================

function formatMonth(date) {
  const year =
    date.getFullYear();

  const month =
    String(
      date.getMonth() + 1
    ).padStart(
      2,
      "0"
    );

  return `${year}-${month}`;
}


// ============================================================
// NORMALIZE TEACHER
// ============================================================

function normalizeTeacher(data) {
  return {
    id:
      data.Moodle_User_ID,

    userKey:
      data.User_Key,

    username:
      data.Username,

    name:
      data.Full_Name,

    fullName:
      data.Full_Name,

    email:
      data.Email,

    role:
      data.Primary_Role,

    initials:
      "GV",
  };
}


// ============================================================
// NORMALIZE STATS
// ============================================================

function normalizeStats(data) {
  return {
    totalCourses:
      data.totalCourses ??
      0,

    totalStudents:
      data.totalStudents ??
      0,

    pendingGrading:
      data.pendingGrading ??
      0,

    atRiskStudents:
      data.atRiskStudents ??
      0,

    averageGradePercentage:
      data.averageGradePercentage ??
      0,

    unreadSupportRequests:
      0,

    unreadMessages:
      0,
  };
}


// ============================================================
// HOOK
// ============================================================

export default function useTeacherDashboard() {

  // ==========================================================
  // MAIN DATA
  // ==========================================================

  const [
    teacher,
    setTeacher,
  ] =
    useState(null);


  const [
    stats,
    setStats,
  ] =
    useState(null);


  const [
    courses,
    setCourses,
  ] =
    useState([]);


  const [
    tasks,
    setTasks,
  ] =
    useState([]);


  const [
    notifications,
    setNotifications,
  ] =
    useState([]);


  /*
    Schedule dùng chung cho:
    - Calendar nhỏ ngoài dashboard
    - SchedulePanel
  */

  const [
    schedule,
    setSchedule,
  ] =
    useState([]);


  const [
    analytics,
    setAnalytics,
  ] =
    useState({
      topCourses: [],
      attendanceTrend: [],
    });


  // ==========================================================
  // CALENDAR
  // ==========================================================

  const [
    calendarDate,
    setCalendarDate,
  ] =
    useState(
      new Date(
        2026,
        7,
        1
      )
    );


  const [
    loading,
    setLoading,
  ] =
    useState(true);


  const [
    calendarLoading,
    setCalendarLoading,
  ] =
    useState(false);


  const [
    error,
    setError,
  ] =
    useState("");


  const monthKey =
    useMemo(
      () =>
        formatMonth(
          calendarDate
        ),
      [calendarDate]
    );


  // ==========================================================
  // GIẢNG VIÊN ĐANG LOGIN
  // ==========================================================

  const teacherId =
    Number(
      localStorage.getItem(
        "currentTeacherId"
      )
    );


  // ==========================================================
  // LOAD DASHBOARD
  // ==========================================================

  useEffect(() => {

    let cancelled =
      false;


    async function load() {

      try {

        setLoading(
          true
        );

        setError("");


        // ====================================================
        // KIỂM TRA PHIÊN ĐĂNG NHẬP
        // ====================================================

        if (!teacherId) {
          throw new Error(
            "Không tìm thấy phiên đăng nhập."
          );
        }


        // ====================================================
        // BACKEND THẬT
        // ====================================================

        const [
          teacherData,
          dashboardResponse,
          courseData,
          scheduleData,
        ] =
          await Promise.all([

            getTeacher(
              teacherId
            ),

            getTeacherDashboard(
              teacherId
            ),

            getTeacherCourses(
              teacherId
            ),

            // LỊCH THẬT MYSQL
            getTeacherScheduleApi(
              teacherId,
              monthKey
            ),

          ]);


        if (cancelled) {
          return;
        }


        // ====================================================
        // TEACHER
        // ====================================================

        const normalizedTeacher =
          normalizeTeacher(
            teacherData
          );


        setTeacher(
          normalizedTeacher
        );


        // ====================================================
        // DASHBOARD STATS
        // ====================================================

        setStats(
          normalizeStats(
            dashboardResponse.dashboard
          )
        );


        // ====================================================
        // LỊCH THẬT
        // ====================================================

        setSchedule(
          scheduleData ||
          []
        );


        // ====================================================
        // CHI TIẾT TỪNG MÔN
        // ====================================================

        const courseDetails =
          await Promise.all(

            courseData.map(

              async (
                course
              ) => {

                try {

                  const [
                    students,
                    studentAnalytics,
                  ] =
                    await Promise.all([

                      getCourseStudents(
                        course.Moodle_Course_ID
                      ),

                      getCourseStudentAnalytics(
                        course.Moodle_Course_ID
                      ),

                    ]);


                  // ==========================================
                  // ĐIỂM TRUNG BÌNH
                  // ==========================================

                  const validGrades =
                    studentAnalytics
                      .map(
                        (
                          student
                        ) =>
                          Number(
                            student.Average_Grade
                          )
                      )
                      .filter(
                        (
                          grade
                        ) =>
                          !Number.isNaN(
                            grade
                          )
                      );


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
                      : 0;


                  // ==========================================
                  // NỘP BÀI
                  // ==========================================

                  const totalAssignments =
                    studentAnalytics.reduce(
                      (
                        total,
                        student
                      ) =>
                        total +
                        Number(
                          student.Total_Assignments ||
                          student.Total_Submissions ||
                          0
                        ),
                      0
                    );


                  const submittedAssignments =
                    studentAnalytics.reduce(
                      (
                        total,
                        student
                      ) =>
                        total +
                        Number(
                          student.Submitted_Assignments ||
                          student.Total_Submissions ||
                          0
                        ),
                      0
                    );


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


                  // ==========================================
                  // COURSE NORMALIZED
                  // ==========================================

                  return {

                    id:
                      course.Moodle_Course_ID,

                    courseId:
                      course.Moodle_Course_ID,

                    courseKey:
                      course.Course_Key,

                    code:
                      course.Course_Code,

                    name:
                      course.Course_Name,

                    title:
                      course.Course_Name,

                    category:
                      course.Category_Name,

                    startDate:
                      course.Start_Date,

                    endDate:
                      course.End_Date,

                    studentCount:
                      students.length,

                    averageScore:
                      Number(
                        averageScore.toFixed(
                          2
                        )
                      ),

                    submissionRate,

                    attendance:
                      null,

                    color:
                      "#3d7f3d",

                  };

                } catch (
                  courseError
                ) {

                  console.error(
                    "Lỗi course:",
                    course.Moodle_Course_ID,
                    courseError
                  );


                  return {

                    id:
                      course.Moodle_Course_ID,

                    courseId:
                      course.Moodle_Course_ID,

                    courseKey:
                      course.Course_Key,

                    code:
                      course.Course_Code,

                    name:
                      course.Course_Name,

                    title:
                      course.Course_Name,

                    studentCount:
                      0,

                    averageScore:
                      0,

                    submissionRate:
                      0,

                    attendance:
                      null,

                    color:
                      "#3d7f3d",

                  };
                }
              }
            )
          );


        if (cancelled) {
          return;
        }


        setCourses(
          courseDetails
        );


        // ====================================================
        // DỮ LIỆU PHỤ
        //
        // TASK       : hiện giữ nguồn cũ
        // NOTIFICATION: BACKEND + MYSQL THẬT
        // ANALYTICS  : hiện giữ nguồn cũ
        // ====================================================

        try {

          /*
            Task và Analytics hiện vẫn đang sử dụng
            service cũ nên tạm giữ mockTeacherId.

            Notification KHÔNG dùng mockTeacherId nữa.
            Notification dùng teacherId của tài khoản
            đang đăng nhập.
          */

          const mockTeacherId =
            localStorage.getItem(
              "currentUsername"
            ) ===
            "gv_tranminhb"
              ? "GV002"
              : "GV001";


          const [
            taskData,
            notificationResponse,
            analyticsData,
          ] =
            await Promise.all([

              // ==============================================
              // TASK - GIỮ NGUYÊN NGUỒN HIỆN TẠI
              // ==============================================

              getTeacherTasks(
                mockTeacherId
              ),


              // ==============================================
              // NOTIFICATION - DỮ LIỆU THẬT MYSQL
              // ==============================================

              getNotifications(
                teacherId
              ),


              // ==============================================
              // ANALYTICS - GIỮ NGUYÊN NGUỒN HIỆN TẠI
              // ==============================================

              getTeacherAnalytics(
                mockTeacherId
              ),

            ]);


          if (cancelled) {
            return;
          }


          // ================================================
          // TASK
          // ================================================

          setTasks(
            taskData ||
            []
          );


          // ================================================
          // NOTIFICATION THẬT
          //
          // API:
          // {
          //   success: true,
          //   teacherId: 2,
          //   total: 5,
          //   data: [...]
          // }
          // ================================================

          const realNotifications =
            Array.isArray(
              notificationResponse?.data
            )
              ? notificationResponse.data
              : [];


          setNotifications(
            realNotifications
          );


          // ================================================
          // ANALYTICS
          // ================================================

          setAnalytics(
            analyticsData || {
              topCourses: [],
              attendanceTrend: [],
            }
          );


        } catch (
          secondaryError
        ) {

          console.warn(
            "Dữ liệu phụ chưa tải được:",
            secondaryError
          );


          setTasks([]);

          setNotifications([]);


          setAnalytics({
            topCourses: [],
            attendanceTrend: [],
          });
        }


      } catch (err) {

        console.error(
          "Lỗi dashboard:",
          err
        );


        if (!cancelled) {

          setError(
            err.message ||
            "Không thể tải dữ liệu dashboard."
          );

        }


      } finally {

        if (!cancelled) {

          setLoading(
            false
          );

        }

      }
    }


    load();


    return () => {

      cancelled =
        true;

    };

  }, [
    teacherId,
  ]);


  // ==========================================================
  // RELOAD CALENDAR KHI ĐỔI THÁNG
  // ==========================================================

  useEffect(() => {

    if (
      !teacher ||
      !teacherId
    ) {
      return;
    }


    let cancelled =
      false;


    async function reloadCalendar() {

      try {

        setCalendarLoading(
          true
        );


        /*
          Không còn gọi mock schedule.
          Đọc thẳng Teacher_Schedule trong MySQL.
        */

        const data =
          await getTeacherScheduleApi(
            teacherId,
            monthKey
          );


        if (!cancelled) {

          setSchedule(
            data ||
            []
          );

        }


      } catch (err) {

        console.error(
          "Lỗi calendar:",
          err
        );


        if (!cancelled) {

          setError(
            err.message ||
            "Không thể tải lịch."
          );

        }


      } finally {

        if (!cancelled) {

          setCalendarLoading(
            false
          );

        }

      }
    }


    reloadCalendar();


    return () => {

      cancelled =
        true;

    };

  }, [
    teacher,
    teacherId,
    monthKey,
  ]);


  // ==========================================================
  // PREVIOUS MONTH
  // ==========================================================

  const previousMonth =
    () => {

      setCalendarDate(
        (current) =>
          new Date(
            current.getFullYear(),
            current.getMonth() -
              1,
            1
          )
      );

    };


  // ==========================================================
  // NEXT MONTH
  // ==========================================================

  const nextMonth =
    () => {

      setCalendarDate(
        (current) =>
          new Date(
            current.getFullYear(),
            current.getMonth() +
              1,
            1
          )
      );

    };


  // ==========================================================
  // RELOAD SCHEDULE THỦ CÔNG
  //
  // SchedulePanel có thể gọi sau khi:
  // POST / PUT / DELETE
  // ==========================================================

  const reloadSchedule =
    async () => {

      if (!teacherId) {
        return;
      }


      try {

        setCalendarLoading(
          true
        );


        const data =
          await getTeacherScheduleApi(
            teacherId,
            monthKey
          );


        setSchedule(
          data ||
          []
        );


      } catch (err) {

        console.error(
          "Lỗi reload schedule:",
          err
        );


        throw err;


      } finally {

        setCalendarLoading(
          false
        );

      }

    };


  // ==========================================================
  // RETURN
  // ==========================================================

  return {

  teacher,

  stats,

  courses,

  tasks,


  // ========================================================
  // THÔNG BÁO
  // ========================================================

  notifications,

  setNotifications,


  // ========================================================
  // LỊCH
  // ========================================================

  schedule,

  setSchedule,

  reloadSchedule,


  // ========================================================
  // ANALYTICS
  // ========================================================

  analytics,


  // ========================================================
  // CALENDAR
  // ========================================================

  calendarDate,

  previousMonth,

  nextMonth,


  // ========================================================
  // TRẠNG THÁI
  // ========================================================

  loading,

  calendarLoading,

  error,

};
}