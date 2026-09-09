import pool from "../../config/database.js";

/**
 * Helper tìm sinh viên mục tiêu:
 * - Ưu tiên userId từ query / params
 * - Nếu không có, tự động lấy sinh viên active đầu tiên trong Dim_User
 */
async function resolveStudent(req) {
  const identifier = req.query.userId || req.query.studentId || req.params.userId;
  if (identifier) {
    const [rows] = await pool.query(
      `SELECT * FROM Dim_User 
       WHERE Primary_Role = 'Student' 
         AND (Moodle_User_ID = ? OR User_Key = ? OR Username = ?) 
       LIMIT 1`,
      [identifier, identifier, identifier]
    );
    if (rows.length > 0) return rows[0];
  }

  const [defaultRows] = await pool.query(
    `SELECT * FROM Dim_User 
     WHERE Primary_Role = 'Student' AND Is_Active = 1 
     ORDER BY User_Key ASC LIMIT 1`
  );
  return defaultRows[0] || null;
}

// ======================================================
// 1. TỔNG QUAN DASHBOARD SINH VIÊN
// GET /api/v1/student/dashboard-summary
// ======================================================
export async function getStudentDashboardSummary(req, res) {
  try {
    const student = await resolveStudent(req);
    if (!student) {
      return res.status(404).json({
        success: false,
        message: "Không tìm thấy dữ liệu sinh viên trong hệ thống.",
      });
    }

    const userKey = student.User_Key;

    // 1. Tổng số môn đang học
    const [[{ totalCourses }]] = await pool.query(
      `SELECT COUNT(DISTINCT Course_Key) AS totalCourses 
       FROM Fact_Enrolment 
       WHERE User_Key = ? AND Status = 'Active'`,
      [userKey]
    );

    // 2. Tổng assignment trong các môn đang học
    const [[{ totalAssignments }]] = await pool.query(
      `SELECT COUNT(da.Activity_Key) AS totalAssignments
       FROM Dim_Activity da
       INNER JOIN Fact_Enrolment fe ON fe.Course_Key = da.Course_Key
       WHERE fe.User_Key = ? AND fe.Status = 'Active' 
         AND da.Activity_Type = 'assign' AND da.Is_Visible = 1`,
      [userKey]
    );

    // 3. Số assignment đã nộp
    const [[{ submittedAssignments }]] = await pool.query(
      `SELECT COUNT(DISTINCT Activity_Key) AS submittedAssignments
       FROM Fact_Assignment_Submission
       WHERE User_Key = ? AND Submission_Status IS NOT NULL`,
      [userKey]
    );

    const pendingAssignments = Math.max(0, (totalAssignments || 0) - (submittedAssignments || 0));

    // 4. Điểm trung bình & Tương tác
    const [[gradeStats]] = await pool.query(
      `SELECT 
         ROUND(AVG(Grade_Percentage), 1) AS avgPercentage,
         ROUND(AVG(Grade), 1) AS avgGrade
       FROM Fact_Course_Grade
       WHERE User_Key = ?`,
      [userKey]
    );

    const [[{ totalEngagementHours }]] = await pool.query(
      `SELECT ROUND(COALESCE(SUM(Time_Spent_Seconds), 0) / 3600, 1) AS totalEngagementHours
       FROM Fact_Daily_Engagement
       WHERE User_Key = ?`,
      [userKey]
    );

    // 5. Hoạt động gần đây (Recent activities)
    const [recentRows] = await pool.query(
      `SELECT 
         da.Activity_Key AS id,
         da.Activity_Name AS title,
         dc.Course_Name AS course,
         da.Activity_Type AS type,
         DATE_FORMAT(dd.Full_Date, '%Y-%m-%d') AS date,
         CONCAT('#course-', dc.Moodle_Course_ID) AS href
       FROM Fact_Module_Engagement fme
       INNER JOIN Dim_Activity da ON da.Activity_Key = fme.Activity_Key
       INNER JOIN Dim_Course dc ON dc.Course_Key = fme.Course_Key
       INNER JOIN Dim_Date dd ON dd.Date_Key = fme.Date_Key
       WHERE fme.User_Key = ?
       ORDER BY fme.Date_Key DESC
       LIMIT 4`,
      [userKey]
    );

    // 6. Sự kiện / Deadline sắp tới (Events)
    const [eventRows] = await pool.query(
      `SELECT 
         da.Activity_Key AS id,
         da.Activity_Name AS title,
         dc.Course_Name AS course,
         DATE_FORMAT(dd.Full_Date, '%d/%m/%Y') AS date,
         CASE 
           WHEN DATEDIFF(dd.Full_Date, CURDATE()) <= 3 THEN 'urgent' 
           ELSE 'default' 
         END AS tone
       FROM Dim_Activity da
       INNER JOIN Dim_Course dc ON dc.Course_Key = da.Course_Key
       INNER JOIN Fact_Enrolment fe ON fe.Course_Key = dc.Course_Key AND fe.User_Key = ?
       INNER JOIN Dim_Date dd ON dd.Date_Key = da.Due_Date_Key
       WHERE da.Is_Visible = 1
       ORDER BY dd.Full_Date ASC
       LIMIT 4`,
      [userKey]
    );

    // Chuẩn hóa định dạng stats cho GreetingCard
    const stats = [
      {
        value: `${totalCourses || 0} Môn học`,
        label: "Môn đang học",
        tone: "green",
      },
      {
        value: `${pendingAssignments} Bài tập`,
        label: "Bài tập chưa nộp",
        tone: pendingAssignments > 0 ? "amber" : "green",
      },
      {
        value: gradeStats?.avgGrade ? `${gradeStats.avgGrade}/10 Điểm` : `${totalCourses || 0} Khóa`,
        label: gradeStats?.avgGrade ? "Điểm trung bình tích lũy" : "Khóa học hoàn thành",
        tone: "green",
      },
    ];

    return res.json({
      success: true,
      student: {
        userKey: student.User_Key,
        moodleUserId: student.Moodle_User_ID,
        username: student.Username,
        fullName: student.Full_Name,
        email: student.Email,
        cohort: "CTK47B",
        academicYear: "2023-2027",
        currentSemester: "Học kỳ 1 (2026-2027)",
      },
      stats,
      kpis: {
        totalCourses: Number(totalCourses || 0),
        totalAssignments: Number(totalAssignments || 0),
        submittedAssignments: Number(submittedAssignments || 0),
        pendingAssignments: Number(pendingAssignments),
        averageGrade: Number(gradeStats?.avgGrade || 0),
        averagePercentage: Number(gradeStats?.avgPercentage || 0),
        totalEngagementHours: Number(totalEngagementHours || 0),
      },
      recentActivities: recentRows,
      events: eventRows,
      notifications: [
        ["Hệ thống phân tích học tập LMS đã sẵn sàng đồng bộ", "Vừa xong"],
        ["Đã cập nhật tiến độ tương tác học liệu học kỳ mới", "1 giờ trước"],
      ],
    });
  } catch (error) {
    console.error("Lỗi getStudentDashboardSummary:", error);
    return res.status(500).json({
      success: false,
      message: "Không thể tải tổng quan dashboard sinh viên.",
      error: error.message,
    });
  }
}

// ======================================================
// 2. DANH SÁCH MÔN HỌC CỦA SINH VIÊN
// GET /api/v1/student/courses
// ======================================================
export async function getStudentCourses(req, res) {
  try {
    const student = await resolveStudent(req);
    if (!student) {
      return res.status(404).json({
        success: false,
        message: "Không tìm thấy dữ liệu sinh viên.",
      });
    }

    const userKey = student.User_Key;

    const [rows] = await pool.query(
      `SELECT 
         dc.Course_Key AS courseKey,
         dc.Moodle_Course_ID AS id,
         dc.Course_Name AS name,
         dc.Course_Code AS shortName,
         COALESCE(dd_start.Academic_Semester, 'Học kỳ 1') AS semester,
         
         COALESCE(act.totalActivities, 0) AS totalActivities,
         COALESCE(act.totalAssignments, 0) AS totalAssignments,
         COALESCE(sub.submittedCount, 0) AS submittedCount,
         
         CASE 
           WHEN COALESCE(act.totalAssignments, 0) = 0 THEN 100
           ELSE LEAST(100, ROUND((COALESCE(sub.submittedCount, 0) / act.totalAssignments) * 100))
         END AS progress,
         
         grd.avgGrade,
         grd.avgPercentage,
         
         ROUND(COALESCE(eng.totalTime, 0) / 3600, 1) AS totalEngagementHours,
         
         CASE 
           WHEN dc.End_Date < CURDATE() THEN 'completed'
           WHEN dc.Start_Date > CURDATE() THEN 'future'
           ELSE 'in_progress'
         END AS status,
         
         CASE 
           WHEN dc.Course_Code LIKE '%CS%' OR dc.Course_Name LIKE '%Cơ sở dữ liệu%' THEN 'database'
           WHEN dc.Course_Code LIKE '%WEB%' OR dc.Course_Name LIKE '%Web%' THEN 'web'
           WHEN dc.Course_Code LIKE '%GAME%' OR dc.Course_Name LIKE '%Game%' THEN 'game'
           WHEN dc.Course_Code LIKE '%AI%' OR dc.Course_Name LIKE '%Trí tuệ nhân tạo%' THEN 'ai'
           ELSE 'network'
         END AS thumbnailType,
         
         CONCAT('#course-', dc.Moodle_Course_ID) AS href,
         false AS isStarred

       FROM Fact_Enrolment fe
       INNER JOIN Dim_Course dc ON dc.Course_Key = fe.Course_Key
       LEFT JOIN Dim_Date dd_start ON dd_start.Full_Date = dc.Start_Date

       LEFT JOIN (
         SELECT 
           Course_Key,
           COUNT(*) AS totalActivities,
           SUM(CASE WHEN Activity_Type = 'assign' THEN 1 ELSE 0 END) AS totalAssignments
         FROM Dim_Activity
         WHERE Is_Visible = 1
         GROUP BY Course_Key
       ) act ON act.Course_Key = dc.Course_Key

       LEFT JOIN (
         SELECT 
           Course_Key,
           COUNT(DISTINCT Activity_Key) AS submittedCount
         FROM Fact_Assignment_Submission
         WHERE User_Key = ? AND Submission_Status IS NOT NULL
         GROUP BY Course_Key
       ) sub ON sub.Course_Key = dc.Course_Key

       LEFT JOIN (
         SELECT 
           Course_Key,
           ROUND(AVG(Grade), 2) AS avgGrade,
           ROUND(AVG(Grade_Percentage), 2) AS avgPercentage
         FROM Fact_Course_Grade
         WHERE User_Key = ?
         GROUP BY Course_Key
       ) grd ON grd.Course_Key = dc.Course_Key

       LEFT JOIN (
         SELECT 
           Course_Key,
           SUM(Time_Spent_Seconds) AS totalTime
         FROM Fact_Daily_Engagement
         WHERE User_Key = ?
         GROUP BY Course_Key
       ) eng ON eng.Course_Key = dc.Course_Key

       WHERE fe.User_Key = ? AND fe.Status = 'Active'
       ORDER BY dc.Course_Name`,
      [userKey, userKey, userKey, userKey]
    );

    // Chuyển đổi dữ liệu chuẩn cho Course Card
    const courses = rows.map((c) => ({
      id: Number(c.id),
      courseKey: c.courseKey,
      name: c.name,
      shortName: c.shortName,
      semester: c.semester,
      progress: Number(c.progress || 0),
      status: c.status,
      thumbnailType: c.thumbnailType,
      isStarred: c.isStarred,
      href: c.href,
      totalActivities: Number(c.totalActivities || 0),
      totalAssignments: Number(c.totalAssignments || 0),
      submittedCount: Number(c.submittedCount || 0),
      averageGrade: c.avgGrade ? Number(c.avgGrade) : null,
      averagePercentage: c.avgPercentage ? Number(c.avgPercentage) : null,
      totalEngagementHours: Number(c.totalEngagementHours || 0),
    }));

    return res.json(courses);
  } catch (error) {
    console.error("Lỗi getStudentCourses:", error);
    return res.status(500).json({
      success: false,
      message: "Không thể lấy danh sách khóa học của sinh viên.",
      error: error.message,
    });
  }
}

// ======================================================
// 3. CHI TIẾT MÔN HỌC & HỌC LIỆU
// GET /api/v1/student/courses/:courseId
// ======================================================
export async function getStudentCourseDetail(req, res) {
  try {
    const { courseId } = req.params;
    const student = await resolveStudent(req);
    const userKey = student?.User_Key;

    // Tìm khóa học theo Moodle_Course_ID hoặc Course_Key
    const [courseRows] = await pool.query(
      `SELECT 
         Course_Key,
         Moodle_Course_ID,
         Course_Code,
         Course_Name,
         Category_Name,
         DATE_FORMAT(Start_Date, '%Y-%m-%d') AS Start_Date,
         DATE_FORMAT(End_Date, '%Y-%m-%d') AS End_Date
       FROM Dim_Course
       WHERE Moodle_Course_ID = ? OR Course_Key = ?
       LIMIT 1`,
      [courseId, courseId]
    );

    if (courseRows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Không tìm thấy khóa học yêu cầu.",
      });
    }

    const course = courseRows[0];

    // Lấy danh sách hoạt động kèm trạng thái nộp bài và điểm của sinh viên
    const [activities] = await pool.query(
      `SELECT 
         da.Activity_Key,
         da.Moodle_Module_ID,
         da.Activity_Type,
         da.Activity_Name,
         da.Max_Grade,
         DATE_FORMAT(dd_due.Full_Date, '%d/%m/%Y') AS Due_Date,
         dd_due.Full_Date AS Due_Date_Raw,
         
         fas.Submission_Status,
         fas.Is_Submitted_On_Time,
         fas.Grade AS Submission_Grade,
         fas.Is_Graded,
         fas.Feedback_Comment,
         DATE_FORMAT(dd_sub.Full_Date, '%d/%m/%Y') AS Submit_Date,
         
         fcg.Grade AS Course_Grade,
         fcg.Grade_Percentage

       FROM Dim_Activity da
       LEFT JOIN Dim_Date dd_due ON dd_due.Date_Key = da.Due_Date_Key
       
       LEFT JOIN Fact_Assignment_Submission fas 
         ON fas.Activity_Key = da.Activity_Key 
        AND fas.User_Key = ?
        
       LEFT JOIN Dim_Date dd_sub ON dd_sub.Date_Key = fas.Submit_Date_Key
       
       LEFT JOIN Fact_Course_Grade fcg
         ON fcg.Activity_Key = da.Activity_Key
        AND fcg.User_Key = ?

       WHERE da.Course_Key = ? AND da.Is_Visible = 1
       ORDER BY da.Activity_Type, da.Activity_Name`,
      [userKey || 0, userKey || 0, course.Course_Key]
    );

    // Phân loại hoạt động thành topics cho CourseDetail UI
    const announcementItems = [
      {
        id: "notice-1",
        name: `Thông báo bắt đầu môn học: ${course.Course_Name}`,
        type: "forum",
        openDate: `Bắt đầu: ${course.Start_Date}`,
        dueDate: "",
        href: "#notice-start",
      },
      {
        id: "outline-1",
        name: `Đề cương chi tiết học phần ${course.Course_Code}`,
        type: "pdf",
        openDate: `Học kỳ 1`,
        dueDate: "",
        fileUrl: "#course-outline.pdf",
      },
    ];

    const learningResourceItems = [];
    const assignmentItems = [];

    activities.forEach((act) => {
      const isAssign = act.Activity_Type === "assign";
      const isQuiz = act.Activity_Type === "quiz";

      if (isAssign || isQuiz) {
        assignmentItems.push({
          id: `act-${act.Activity_Key}`,
          name: act.Activity_Name,
          type: "assignment",
          openDate: `Thang điểm: ${act.Max_Grade || 10}`,
          dueDate: act.Due_Date ? `Hạn chót: ${act.Due_Date}` : "",
          maxGrade: Number(act.Max_Grade || 10),
          grade: act.Submission_Grade !== null ? Number(act.Submission_Grade) : act.Course_Grade !== null ? Number(act.Course_Grade) : null,
          submissionStatus: act.Submission_Status || "unsubmitted",
          isSubmittedOnTime: act.Is_Submitted_On_Time === 1,
          isGraded: act.Is_Graded === 1,
          feedback: act.Feedback_Comment || "",
          submitDate: act.Submit_Date || "",
        });
      } else {
        learningResourceItems.push({
          id: `act-${act.Activity_Key}`,
          name: act.Activity_Name,
          type: act.Activity_Type === "url" ? "url" : "pdf",
          openDate: `Học liệu số`,
          dueDate: "",
          fileUrl: `#resource-${act.Activity_Key}`,
        });
      }
    });

    const topics = [
      {
        id: "announcements",
        title: "Trao đổi - Thông báo chung",
        isOpen: true,
        items: announcementItems,
      },
      {
        id: "resources",
        title: "Tài liệu & Học liệu môn học",
        isOpen: true,
        items: learningResourceItems.length > 0 ? learningResourceItems : [
          {
            id: "res-default",
            name: `Tài liệu bài giảng môn ${course.Course_Name}`,
            type: "pdf",
            openDate: "Cập nhật liên tục",
            dueDate: "",
            fileUrl: "#lecture-notes.pdf",
          }
        ],
      },
      {
        id: "assignments",
        title: "Bài tập & Đánh giá quá trình",
        isOpen: true,
        items: assignmentItems,
      },
    ];

    return res.json({
      success: true,
      course: {
        id: course.Moodle_Course_ID,
        courseKey: course.Course_Key,
        title: course.Course_Name.toUpperCase(),
        code: course.Course_Code,
        category: course.Category_Name,
        startDate: course.Start_Date,
        endDate: course.End_Date,
        instructors: [
          { name: "ThS. Nguyễn An", email: "gv_nguyenan@lms.edu.vn" },
          { name: "TS. Trần Bình", email: "gv_tranminhb@lms.edu.vn" },
        ],
        breadcrumbs: [
          "Bảng Điều khiển",
          "Các khoá học của tôi",
          course.Category_Name || "Khoa CNTT",
          course.Course_Name,
        ],
        topics,
      },
    });
  } catch (error) {
    console.error("Lỗi getStudentCourseDetail:", error);
    return res.status(500).json({
      success: false,
      message: "Không thể lấy chi tiết khóa học của sinh viên.",
      error: error.message,
    });
  }
}

// ======================================================
// 4. BẢNG ĐIỂM CHI TIẾT CỦA SINH VIÊN
// GET /api/v1/student/grades
// ======================================================
export async function getStudentGrades(req, res) {
  try {
    const student = await resolveStudent(req);
    if (!student) {
      return res.status(404).json({ success: false, message: "Không tìm thấy sinh viên." });
    }

    const [rows] = await pool.query(
      `SELECT 
         fcg.Grade_Key,
         dc.Course_Name,
         dc.Course_Code,
         da.Activity_Name,
         da.Activity_Type,
         fcg.Grade,
         fcg.Max_Grade,
         fcg.Grade_Percentage,
         fcg.Is_Passed,
         DATE_FORMAT(dd.Full_Date, '%d/%m/%Y') AS Grade_Date
       FROM Fact_Course_Grade fcg
       INNER JOIN Dim_Course dc ON dc.Course_Key = fcg.Course_Key
       INNER JOIN Dim_Activity da ON da.Activity_Key = fcg.Activity_Key
       LEFT JOIN Dim_Date dd ON dd.Date_Key = fcg.Date_Key
       WHERE fcg.User_Key = ?
       ORDER BY dc.Course_Name, da.Activity_Name`,
      [student.User_Key]
    );

    return res.json({
      success: true,
      total: rows.length,
      data: rows,
    });
  } catch (error) {
    console.error("Lỗi getStudentGrades:", error);
    return res.status(500).json({
      success: false,
      message: "Không thể lấy bảng điểm sinh viên.",
      error: error.message,
    });
  }
}

// ======================================================
// 5. LỊCH SỬ NỘP BÀI CỦA SINH VIÊN
// GET /api/v1/student/submissions
// ======================================================
export async function getStudentSubmissions(req, res) {
  try {
    const student = await resolveStudent(req);
    if (!student) {
      return res.status(404).json({ success: false, message: "Không tìm thấy sinh viên." });
    }

    const [rows] = await pool.query(
      `SELECT 
         fas.Submission_Key,
         dc.Course_Name,
         dc.Course_Code,
         da.Activity_Name,
         DATE_FORMAT(dd_due.Full_Date, '%d/%m/%Y') AS Due_Date,
         DATE_FORMAT(dd_sub.Full_Date, '%d/%m/%Y') AS Submit_Date,
         fas.Submission_Status,
         fas.Is_Submitted_On_Time,
         fas.Grade,
         fas.Is_Graded,
         fas.Feedback_Comment
       FROM Fact_Assignment_Submission fas
       INNER JOIN Dim_Course dc ON dc.Course_Key = fas.Course_Key
       INNER JOIN Dim_Activity da ON da.Activity_Key = fas.Activity_Key
       LEFT JOIN Dim_Date dd_due ON dd_due.Date_Key = fas.Due_Date_Key
       LEFT JOIN Dim_Date dd_sub ON dd_sub.Date_Key = fas.Submit_Date_Key
       WHERE fas.User_Key = ?
       ORDER BY fas.Submission_Key DESC`,
      [student.User_Key]
    );

    return res.json({
      success: true,
      total: rows.length,
      data: rows,
    });
  } catch (error) {
    console.error("Lỗi getStudentSubmissions:", error);
    return res.status(500).json({
      success: false,
      message: "Không thể lấy lịch sử nộp bài.",
      error: error.message,
    });
  }
}

// ======================================================
// 6. THỜI GIAN TƯƠNG TÁC CỦA SINH VIÊN
// GET /api/v1/student/engagement
// ======================================================
export async function getStudentEngagement(req, res) {
  try {
    const student = await resolveStudent(req);
    if (!student) {
      return res.status(404).json({ success: false, message: "Không tìm thấy sinh viên." });
    }

    // Thời gian học theo ngày
    const [dailyRows] = await pool.query(
      `SELECT 
         DATE_FORMAT(dd.Full_Date, '%Y-%m-%d') AS date,
         SUM(fde.Time_Spent_Seconds) AS totalSeconds,
         ROUND(SUM(fde.Time_Spent_Seconds) / 60, 1) AS totalMinutes,
         ROUND(SUM(fde.Time_Spent_Seconds) / 3600, 2) AS totalHours
       FROM Fact_Daily_Engagement fde
       INNER JOIN Dim_Date dd ON dd.Date_Key = fde.Date_Key
       WHERE fde.User_Key = ?
       GROUP BY dd.Full_Date
       ORDER BY dd.Full_Date ASC`,
      [student.User_Key]
    );

    // Thời gian học theo môn
    const [courseRows] = await pool.query(
      `SELECT 
         dc.Course_Name,
         dc.Course_Code,
         ROUND(SUM(fde.Time_Spent_Seconds) / 3600, 2) AS totalHours
       FROM Fact_Daily_Engagement fde
       INNER JOIN Dim_Course dc ON dc.Course_Key = fde.Course_Key
       WHERE fde.User_Key = ?
       GROUP BY dc.Course_Key, dc.Course_Name, dc.Course_Code
       ORDER BY totalHours DESC`,
      [student.User_Key]
    );

    return res.json({
      success: true,
      dailyTrend: dailyRows,
      courseEngagement: courseRows,
    });
  } catch (error) {
    console.error("Lỗi getStudentEngagement:", error);
    return res.status(500).json({
      success: false,
      message: "Không thể lấy dữ liệu tương tác học tập.",
      error: error.message,
    });
  }
}
