import { applyAlertState } from '../services/learningAlertStateService.js';
import { savePlannedSchedule } from '../services/schedulePlanningService.js';
import pool from "../../config/database.js";


// ======================================================
// HELPER
// TÌM GIẢNG VIÊN THEO MOODLE_USER_ID
// ======================================================

async function findTeacherByMoodleId(
  teacherId
) {
  const [rows] =
    await pool.query(
      `
      SELECT
        User_Key,
        Moodle_User_ID,
        Username,
        First_Name,
        Last_Name,
        Full_Name,
        Email,
        Primary_Role,
        Is_Active

      FROM Dim_User

      WHERE Moodle_User_ID = ?
        AND Primary_Role = 'Teacher'

      LIMIT 1
      `,
      [teacherId]
    );

  return rows[0] || null;
}


// ======================================================
// HELPER
// FORMAT TIME TỪ MYSQL
// ======================================================

function normalizeTime(value) {
  if (!value) {
    return "";
  }

  return String(value).slice(
    0,
    5
  );
}


// ======================================================
// HELPER
// FORMAT SCHEDULE RESPONSE CHO FRONTEND
// ======================================================

function normalizeScheduleRow(row) {
  return {
    id: row.Schedule_ID,

    date: row.Event_Date,

    time: normalizeTime(
      row.Event_Time
    ),

    title: row.Title,

    type:
      row.Event_Type ||
      "class",

    description:
      row.Description || "",
    endTime: normalizeTime(row.End_Time),
    location: row.Location || "",
    meetingUrl: row.Meeting_Url || "",
    seriesId: row.Series_ID || null,

    createdAt:
      row.Created_At,

    updatedAt:
      row.Updated_At,
  };
}


// ======================================================
// 1. LẤY THÔNG TIN GIẢNG VIÊN
// ======================================================

export async function getTeacherById(
  req,
  res
) {
  try {
    const { teacherId } =
      req.params;

    const teacher =
      await findTeacherByMoodleId(
        teacherId
      );

    if (!teacher) {
      return res.status(404).json({
        success: false,
        message:
          "Không tìm thấy giảng viên.",
      });
    }

    return res.json({
      success: true,
      data: teacher,
    });
  } catch (error) {
    console.error(
      "Lỗi getTeacherById:",
      error
    );

    return res.status(500).json({
      success: false,

      message:
        "Không thể lấy thông tin giảng viên.",

      error:
        error.message,
    });
  }
}


// ======================================================
// 2. LẤY CÁC MÔN GIẢNG VIÊN ĐANG DẠY
// + TỰ ĐỘNG XÁC ĐỊNH HỌC KỲ TỪ START_DATE
//
// QUY ƯỚC:
// Tháng 8 -> 12:
// Học kỳ 1 của năm học bắt đầu trong năm đó
//
// Tháng 1 -> 6:
// Học kỳ 2 của năm học bắt đầu từ năm trước
//
// Ví dụ:
// 2026-08-03 -> Học kỳ 1 (2026–2027)
// 2026-01-05 -> Học kỳ 2 (2025–2026)
// ======================================================

export async function getTeacherCourses(
  req,
  res
) {
  try {
    const { teacherId } =
      req.params;

    const [rows] =
      await pool.query(
        `
        SELECT DISTINCT

          dc.Course_Key,
          dc.Moodle_Course_ID,
          dc.Course_Code,
          dc.Course_Name,
          dc.Category_ID,
          dc.Category_Name,
          dc.Start_Date,
          dc.End_Date,


          -- =============================================
          -- TÊN HỌC KỲ
          -- =============================================

          CASE

            WHEN MONTH(dc.Start_Date)
              BETWEEN 8 AND 12

            THEN CONCAT(
              'Học kỳ 1 (',
              YEAR(dc.Start_Date),
              '–',
              YEAR(dc.Start_Date) + 1,
              ')'
            )


            WHEN MONTH(dc.Start_Date)
              BETWEEN 1 AND 6

            THEN CONCAT(
              'Học kỳ 2 (',
              YEAR(dc.Start_Date) - 1,
              '–',
              YEAR(dc.Start_Date),
              ')'
            )


            ELSE
              'Chưa xác định'

          END AS Semester_Name,


          -- =============================================
          -- KEY HỌC KỲ
          --
          -- Ví dụ:
          -- 2026-1 = Học kỳ 1 (2026–2027)
          -- 2025-2 = Học kỳ 2 (2025–2026)
          -- =============================================

          CASE

            WHEN MONTH(dc.Start_Date)
              BETWEEN 8 AND 12

            THEN CONCAT(
              YEAR(dc.Start_Date),
              '-1'
            )


            WHEN MONTH(dc.Start_Date)
              BETWEEN 1 AND 6

            THEN CONCAT(
              YEAR(dc.Start_Date) - 1,
              '-2'
            )


            ELSE
              'unknown'

          END AS Semester_Key,


          dc.Is_Visible


        FROM
          lms_moodle_source.mdl_role_assignments ra


        INNER JOIN
          lms_moodle_source.mdl_role r

          ON r.id =
            ra.roleid


        INNER JOIN
          lms_moodle_source.mdl_context ctx

          ON ctx.id =
            ra.contextid

          AND ctx.contextlevel =
            50


        INNER JOIN
          Dim_Course dc

          ON dc.Moodle_Course_ID =
            ctx.instanceid


        WHERE
          ra.userid = ?


          AND r.shortname IN (
            'teacher',
            'editingteacher'
          )


        ORDER BY
          dc.Start_Date DESC,
          dc.Course_Name ASC
        `,
        [
          teacherId,
        ]
      );


    return res.json({
      success: true,

      teacherId:
        Number(
          teacherId
        ),

      total:
        rows.length,

      data:
        rows,
    });

  } catch (error) {

    console.error(
      "Lỗi getTeacherCourses:",
      error
    );


    return res.status(500).json({
      success: false,

      message:
        "Không thể lấy danh sách môn của giảng viên.",

      error:
        error.message,
    });
  }
}

// ======================================================
// 3. DASHBOARD TỔNG QUAN GIẢNG VIÊN
// ======================================================

export async function getTeacherDashboard(
  req,
  res
) {
  try {
    const { teacherId } =
      req.params;


    // --------------------------------------------------
    // KIỂM TRA GIẢNG VIÊN
    // --------------------------------------------------

    const teacher =
      await findTeacherByMoodleId(
        teacherId
      );


    if (!teacher) {
      return res.status(404).json({
        success: false,

        message:
          "Không tìm thấy giảng viên.",
      });
    }


    // --------------------------------------------------
    // LẤY CÁC MÔN GIẢNG VIÊN PHỤ TRÁCH
    // --------------------------------------------------

    const [courseRows] =
      await pool.query(
        `
        SELECT DISTINCT
          dc.Course_Key,
          dc.Moodle_Course_ID,
          dc.Course_Code,
          dc.Course_Name

        FROM lms_moodle_source.mdl_role_assignments ra

        INNER JOIN lms_moodle_source.mdl_role r
          ON r.id = ra.roleid

        INNER JOIN lms_moodle_source.mdl_context ctx
          ON ctx.id = ra.contextid
          AND ctx.contextlevel = 50

        INNER JOIN Dim_Course dc
          ON dc.Moodle_Course_ID =
            ctx.instanceid

        WHERE ra.userid = ?

          AND r.shortname IN (
            'teacher',
            'editingteacher'
          )
        `,
        [teacherId]
      );


    // --------------------------------------------------
    // KHÔNG CÓ MÔN
    // --------------------------------------------------

    if (
      courseRows.length === 0
    ) {
      return res.json({
        success: true,

        teacher,

        dashboard: {
          totalCourses: 0,
          totalStudents: 0,
          pendingGrading: 0,
          atRiskStudents: 0,
          averageGradePercentage:
            null,
        },

        courses: [],
      });
    }


    const courseKeys =
      courseRows.map(
        (course) =>
          course.Course_Key
      );


    const placeholders =
      courseKeys
        .map(() => "?")
        .join(",");


    // --------------------------------------------------
    // TỔNG SINH VIÊN
    // --------------------------------------------------

    const [studentRows] =
      await pool.query(
        `
        SELECT
          COUNT(
            DISTINCT fe.User_Key
          ) AS Total_Students

        FROM Fact_Enrolment fe

        INNER JOIN Dim_User du
          ON du.User_Key =
            fe.User_Key

        WHERE fe.Course_Key IN (
          ${placeholders}
        )

          AND du.Primary_Role =
            'Student'

          AND fe.Status =
            'Active'
        `,
        courseKeys
      );


    // --------------------------------------------------
    // BÀI CHỜ CHẤM
    // --------------------------------------------------

    const [pendingRows] =
      await pool.query(
        `
        SELECT
          COUNT(*) AS Pending_Grading

        FROM Fact_Assignment_Submission

        WHERE Course_Key IN (
          ${placeholders}
        )

          AND Is_Graded = 0

          AND Submission_Status =
            'submitted'
        `,
        courseKeys
      );


    // --------------------------------------------------
    // ĐIỂM TRUNG BÌNH
    // --------------------------------------------------

    const [gradeRows] =
      await pool.query(
        `
        SELECT
          ROUND(
            AVG(
              Grade_Percentage
            ),
            2
          ) AS Average_Grade_Percentage

        FROM Fact_Course_Grade

        WHERE Course_Key IN (
          ${placeholders}
        )

          AND Grade_Percentage
            IS NOT NULL
        `,
        courseKeys
      );


    // --------------------------------------------------
    // SINH VIÊN CÓ NGUY CƠ
    // --------------------------------------------------

    const [riskRows] =
      await pool.query(
        `
        SELECT
          COUNT(*) AS At_Risk_Students

        FROM (
          SELECT
            User_Key,
            Course_Key,

            AVG(
              Grade_Percentage
            ) AS Avg_Grade_Percentage

          FROM Fact_Course_Grade

          WHERE Course_Key IN (
            ${placeholders}
          )

            AND Grade_Percentage
              IS NOT NULL

          GROUP BY
            User_Key,
            Course_Key

          HAVING AVG(
            Grade_Percentage
          ) < 50

        ) AS risk_students
        `,
        courseKeys
      );


    // --------------------------------------------------
    // RESPONSE
    // --------------------------------------------------

    return res.json({
      success: true,

      teacher: {
        User_Key:
          teacher.User_Key,

        Moodle_User_ID:
          teacher.Moodle_User_ID,

        Username:
          teacher.Username,

        Full_Name:
          teacher.Full_Name,

        Email:
          teacher.Email,
      },

      dashboard: {
        totalCourses:
          courseRows.length,

        totalStudents:
          Number(
            studentRows[0]
              ?.Total_Students || 0
          ),

        pendingGrading:
          Number(
            pendingRows[0]
              ?.Pending_Grading || 0
          ),

        atRiskStudents:
          Number(
            riskRows[0]
              ?.At_Risk_Students || 0
          ),

        averageGradePercentage:
          gradeRows[0]
            ?.Average_Grade_Percentage ===
          null
            ? null
            : Number(
                gradeRows[0]
                  ?.Average_Grade_Percentage
              ),
      },

      courses:
        courseRows,
    });

  } catch (error) {
    console.error(
      "Lỗi getTeacherDashboard:",
      error
    );

    return res.status(500).json({
      success: false,

      message:
        "Không thể lấy dữ liệu dashboard giảng viên.",

      error:
        error.message,
    });
  }
}


// ======================================================
// 4. DANH SÁCH BÀI CHỜ CHẤM
//
// GET /api/teachers/:teacherId/grading
//
// Theo môn:
// GET /api/teachers/:teacherId/grading?courseId=101
// ======================================================

export async function getTeacherGrading(
  req,
  res
) {
  try {
    const { teacherId } =
      req.params;

    const { courseId } =
      req.query;


    // --------------------------------------------------
    // KIỂM TRA GIẢNG VIÊN
    // --------------------------------------------------

    const teacher =
      await findTeacherByMoodleId(
        teacherId
      );


    if (!teacher) {
      return res.status(404).json({
        success: false,

        message:
          "Không tìm thấy giảng viên.",
      });
    }


    // --------------------------------------------------
    // PARAMS
    // --------------------------------------------------

    const params = [
      teacherId,
    ];


    let courseFilter = "";


    if (courseId) {
      courseFilter = `
        AND dc.Moodle_Course_ID = ?
      `;

      params.push(
        courseId
      );
    }


    // --------------------------------------------------
    // QUERY
    // --------------------------------------------------

    const [rows] =
      await pool.query(
        `
        SELECT
          fas.Submission_Key,
          fas.User_Key,
          fas.Course_Key,
          fas.Activity_Key,
          fas.Submit_Date_Key,
          fas.Due_Date_Key,
          fas.Attempt_Number,
          fas.Submission_Status,
          fas.Is_Submitted_On_Time,
          fas.Grade,
          fas.Is_Graded,
          fas.Feedback_Comment,


          du.Moodle_User_ID
            AS Student_Moodle_ID,

          du.Username
            AS Student_Username,

          du.Full_Name
            AS Student_Name,

          du.Email
            AS Student_Email,


          dc.Moodle_Course_ID,
          dc.Course_Code,
          dc.Course_Name,


          da.Moodle_Module_ID,
          da.Activity_Type,
          da.Activity_Name,
          da.Max_Grade


        FROM Fact_Assignment_Submission fas


        INNER JOIN Dim_User du
          ON du.User_Key =
            fas.User_Key


        INNER JOIN Dim_Course dc
          ON dc.Course_Key =
            fas.Course_Key


        INNER JOIN Dim_Activity da
          ON da.Activity_Key =
            fas.Activity_Key


        INNER JOIN lms_moodle_source.mdl_context ctx
          ON ctx.instanceid =
            dc.Moodle_Course_ID

          AND ctx.contextlevel =
            50


        INNER JOIN lms_moodle_source.mdl_role_assignments ra
          ON ra.contextid =
            ctx.id


        INNER JOIN lms_moodle_source.mdl_role r
          ON r.id =
            ra.roleid


        WHERE ra.userid = ?

          AND r.shortname IN (
            'teacher',
            'editingteacher'
          )

          AND fas.Submission_Status =
            'submitted'

          AND fas.Is_Graded = 0

          ${courseFilter}


        ORDER BY
          dc.Course_Name,
          da.Activity_Name,
          du.Full_Name
        `,
        params
      );


    return res.json({
      success: true,

      teacherId:
        Number(
          teacherId
        ),

      courseId:
        courseId
          ? Number(
              courseId
            )
          : null,

      total:
        rows.length,

      data:
        rows,
    });

  } catch (error) {
    console.error(
      "Lỗi getTeacherGrading:",
      error
    );

    return res.status(500).json({
      success: false,

      message:
        "Không thể lấy danh sách bài chờ chấm.",

      error:
        error.message,
    });
  }
}


// ======================================================
// 5. LẤY LỊCH GIẢNG VIÊN
//
// GET /api/teachers/:teacherId/schedule
//
// Có thể lọc tháng:
// GET /api/teachers/1/schedule?month=2026-08
// ======================================================

export async function getTeacherSchedule(
  req,
  res
) {
  try {
    const { teacherId } =
      req.params;

    const { month } =
      req.query;


    const teacher =
      await findTeacherByMoodleId(
        teacherId
      );


    if (!teacher) {
      return res.status(404).json({
        success: false,

        message:
          "Không tìm thấy giảng viên.",
      });
    }


    const params = [
      teacher.User_Key,
    ];


    let monthFilter = "";


    if (month) {

      // YYYY-MM
      if (
        !/^\d{4}-\d{2}$/.test(
          month
        )
      ) {
        return res.status(400).json({
          success: false,

          message:
            "Tháng không hợp lệ. Định dạng phải là YYYY-MM.",
        });
      }


      const [
        year,
        monthNumber,
      ] =
        month.split("-");


      const nextMonthDate =
        new Date(
          Number(year),
          Number(monthNumber),
          1
        );


      const nextYear =
        nextMonthDate.getFullYear();


      const nextMonth =
        String(
          nextMonthDate.getMonth() +
            1
        ).padStart(
          2,
          "0"
        );


      const startDate =
        `${month}-01`;


      const endDate =
        `${nextYear}-${nextMonth}-01`;


      monthFilter = `
        AND Event_Date >= ?
        AND Event_Date < ?
      `;


      params.push(
        startDate,
        endDate
      );
    }


    const [rows] =
      await pool.query(
        `
        SELECT
          Schedule_ID,

          DATE_FORMAT(
            Event_Date,
            '%Y-%m-%d'
          ) AS Event_Date,

          TIME_FORMAT(
            Event_Time,
            '%H:%i'
          ) AS Event_Time,

          Title,
          Event_Type,
          Description,
          End_Time, Location, Meeting_Url, Series_ID,
          Created_At,
          Updated_At

        FROM Teacher_Schedule

        WHERE Teacher_User_Key = ?

        ${monthFilter}

        ORDER BY
          Event_Date,
          Event_Time,
          Schedule_ID
        `,
        params
      );


    const data =
      rows.map(
        normalizeScheduleRow
      );


    return res.json({
      success: true,

      teacherId:
        Number(
          teacherId
        ),

      month:
        month || null,

      total:
        data.length,

      data,
    });

  } catch (error) {
    console.error(
      "Lỗi getTeacherSchedule:",
      error
    );

    return res.status(500).json({
      success: false,

      message:
        "Không thể lấy lịch giảng viên.",

      error:
        error.message,
    });
  }
}


// ======================================================
// 6. TẠO LỊCH
//
// POST /api/teachers/:teacherId/schedule
//
// BODY:
// {
//   "date": "2026-08-25",
//   "time": "08:00",
//   "title": "Học bù",
//   "type": "class",
//   "description": ""
// }
// ======================================================

export async function createTeacherSchedule(req, res) {
  try {
    const events = await savePlannedSchedule(req.params.teacherId, req.body);
    return res.status(201).json({ success: true, data: events[0], events, message: `Đã tạo ${events.length} buổi.` });
  } catch (error) {
    return res.status(error.status || 500).json({ success: false, message: error.status ? error.message : 'Không thể tạo lịch.' });
  }
}

export async function updateTeacherSchedule(req, res) {
  try {
    const events = await savePlannedSchedule(req.params.teacherId, req.body, req.params.scheduleId);
    return res.json({ success: true, data: events[0], message: 'Đã cập nhật buổi được chọn.' });
  } catch (error) {
    return res.status(error.status || 500).json({ success: false, message: error.status ? error.message : 'Không thể cập nhật lịch.' });
  }
}

export async function deleteTeacherSchedule(
  req,
  res
) {
  try {
    const {
      teacherId,
      scheduleId,
    } = req.params;


    const teacher =
      await findTeacherByMoodleId(
        teacherId
      );


    if (!teacher) {
      return res.status(404).json({
        success: false,

        message:
          "Không tìm thấy giảng viên.",
      });
    }


    const [result] =
      await pool.query(
        `
        DELETE FROM Teacher_Schedule

        WHERE Schedule_ID = ?

          AND Teacher_User_Key = ?
        `,
        [
          scheduleId,
          teacher.User_Key,
        ]
      );


    if (
      result.affectedRows === 0
    ) {
      return res.status(404).json({
        success: false,

        message:
          "Không tìm thấy lịch cần xóa.",
      });
    }


    return res.json({
      success: true,

      message:
        "Xóa lịch thành công.",

      scheduleId:
        Number(
          scheduleId
        ),
    });

  } catch (error) {
    console.error(
      "Lỗi deleteTeacherSchedule:",
      error
    );

    return res.status(500).json({
      success: false,

      message:
        "Không thể xóa lịch.",

      error:
        error.message,
    });
  }
}


// ======================================================
// 12. CẢNH BÁO HỌC TẬP TỰ ĐỘNG TỪ CƠ SỞ DỮ LIỆU THẬT
//
// GET /api/teachers/:teacherId/learning-alerts
// ======================================================

export async function loadTeacherLearningAlerts(teacherId) {
    const teacher = await findTeacherByMoodleId(teacherId);

    if (!teacher) {
      throw Object.assign(new Error("Không tìm thấy giảng viên."), { status: 404 });
    }

    // Lấy danh sách các môn học thật do giảng viên phụ trách
    const [courses] = await pool.query(
      `
      SELECT DISTINCT
        dc.Course_Key,
        dc.Moodle_Course_ID,
        dc.Course_Code,
        dc.Course_Name
      FROM lms_moodle_source.mdl_role_assignments ra
      INNER JOIN lms_moodle_source.mdl_role r
        ON r.id = ra.roleid
      INNER JOIN lms_moodle_source.mdl_context ctx
        ON ctx.id = ra.contextid
        AND ctx.contextlevel = 50
      INNER JOIN Dim_Course dc
        ON dc.Moodle_Course_ID = ctx.instanceid
      WHERE ra.userid = ?
        AND r.shortname IN ('teacher', 'editingteacher')
      `,
      [teacher.Moodle_User_ID]
    );

    if (!courses || courses.length === 0) {
      return [];
    }

    const courseKeys = courses.map((c) => c.Course_Key);

    // 1. CẢNH BÁO RỦI RO THẬT: Sinh viên có điểm thấp hoặc nộp trễ trong các môn của GV
    const [riskRows] = await pool.query(
      `
      SELECT 
        u.User_Key,
        u.Full_Name,
        u.Username,
        c.Course_Name,
        c.Moodle_Course_ID,
        c.Course_Code,
        ROUND(AVG(s.Grade), 1) as avg_grade,
        SUM(CASE WHEN s.Submission_Status = 'submitted' AND s.Is_Submitted_On_Time = 0 THEN 1 ELSE 0 END) as late_count,
        COUNT(s.Submission_Key) as total_submissions
      FROM fact_assignment_submission s
      JOIN dim_user u ON s.User_Key = u.User_Key
      JOIN dim_course c ON s.Course_Key = c.Course_Key
      WHERE s.Course_Key IN (?)
      GROUP BY u.User_Key, c.Course_Key
      HAVING avg_grade < 7.0 OR late_count > 0
      ORDER BY avg_grade ASC, late_count DESC
      LIMIT 6
      `,
      [courseKeys]
    );

    // 2. BÀI NỘP CHỜ CHẤM THẬT: Từ fact_assignment_submission
    const [pendingRows] = await pool.query(
      `
      SELECT 
        c.Course_Name,
        c.Moodle_Course_ID,
        c.Course_Code,
        a.Activity_Key,
        a.Activity_Name,
        COUNT(s.Submission_Key) as pending_count
      FROM fact_assignment_submission s
      JOIN dim_activity a ON s.Activity_Key = a.Activity_Key
      JOIN dim_course c ON s.Course_Key = c.Course_Key
      WHERE s.Course_Key IN (?)
        AND s.Submission_Status = 'submitted'
        AND (s.Is_Graded = 0 OR s.Grade IS NULL)
      GROUP BY c.Course_Key, a.Activity_Key
      ORDER BY pending_count DESC
      LIMIT 5
      `,
      [courseKeys]
    );

    // Tổng hợp thành danh sách thông báo và cảnh báo
    const alerts = [];

    // Cảnh báo rủi ro sinh viên thật từ CSDL
    riskRows.forEach((row) => {
      const isLate = Number(row.late_count) > 0;
      const hasGrade = row.avg_grade != null && Number.isFinite(Number(row.avg_grade));
      const lowGrade = hasGrade && Number(row.avg_grade) < 6.5;

      alerts.push({
        id: `risk:${row.Moodle_Course_ID}:${row.User_Key}`,
        type: "risk",
        title: `Cảnh báo học tập: Sinh viên ${row.Full_Name} (${row.Username})`,
        desc: `Sinh viên ${hasGrade ? `có điểm thực hành trung bình ${row.avg_grade}/10` : "chưa có điểm thực hành"}${
          isLate ? ` và có ${row.late_count} bài nộp trễ hạn` : ""
        } trong môn ${row.Course_Name} (${row.Course_Code}), thuộc nhóm có nguy cơ cần chú ý.`,
        courseName: row.Course_Name,
        courseId: row.Moodle_Course_ID,
        time: "Theo dữ liệu hiện có",
        unread: true,
        priority: lowGrade ? "high" : "medium",
        actionPath: `/quan-ly-lop/${row.Moodle_Course_ID}`,
        actionLabel: "Xem phân tích lớp",
      });
    });

    // Nhắc nhở bài chờ chấm thật từ CSDL
    pendingRows.forEach((row) => {
      alerts.push({
        id: `pending:${row.Moodle_Course_ID}:${row.Activity_Key}`,
        type: "deadline",
        title: `Nhắc nhở chấm bài: ${row.Activity_Name}`,
        desc: `Môn ${row.Course_Name} (${row.Course_Code}) hiện có ${row.pending_count} bài nộp chưa có điểm đang chờ giảng viên chấm bài.`,
        courseName: row.Course_Name,
        courseId: row.Moodle_Course_ID,
        time: "Đang chờ chấm",
        unread: true,
        priority: "medium",
        actionPath: `/cham-diem/${row.Moodle_Course_ID}`,
        actionLabel: "Chấm điểm ngay",
      });
    });

    const [notifications] = await pool.query(`SELECT n.*, c.Course_Name, c.Moodle_Course_ID
      FROM fact_notification n LEFT JOIN Dim_Course c ON c.Course_Key = n.course_id
      WHERE n.recipient_user_id = ? ORDER BY n.created_at DESC, n.notification_id DESC`, [teacher.User_Key]);
    for (const row of notifications) {
      alerts.push({ id: `notification:${row.notification_id}`, type: ['RISK','DEADLINE','SUPPORT','COURSE'].includes(row.notification_type) ? row.notification_type.toLowerCase() : 'system',
        title: row.title, desc: String(row.message || '').replace(/\[SCHEDULE:\d+\]\s*/g, ''),
        courseName: row.Course_Name || 'Hệ thống DLU LMS', courseId: row.Moodle_Course_ID,
        time: new Date(row.created_at).toLocaleString('vi-VN'), createdAt: row.created_at,
        unread: !row.is_read, priority: 'normal',
        actionPath: row.Moodle_Course_ID ? `/quan-ly-lop/${row.Moodle_Course_ID}` : null,
        actionLabel: row.Moodle_Course_ID ? 'Xem lớp học' : null });
    }
    return applyAlertState(teacher.User_Key, alerts);
}

export async function getTeacherLearningAlerts(req, res) {
  try {
    const data = await loadTeacherLearningAlerts(req.params.teacherId);
    return res.json({ success: true, total: data.length, data });
  } catch (error) {
    console.error('Lỗi getTeacherLearningAlerts:', error);
    return res.status(error.status || 500).json({ success: false, message: error.status ? error.message : 'Không thể tải cảnh báo học tập.' });
  }
}
