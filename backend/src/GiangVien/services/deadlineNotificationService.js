import pool from "../../config/database.js";

import {
  sendNotificationEmail,
} from "./emailNotificationService.js";


// ============================================================
// HELPER: FORMAT DEADLINE
// ============================================================

function formatDeadline(unixTimestamp) {
  const date = new Date(
    Number(unixTimestamp) * 1000
  );

  return date.toLocaleString("vi-VN", {
    timeZone: "Asia/Ho_Chi_Minh",
    hour: "2-digit",
    minute: "2-digit",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}


// ============================================================
// HELPER: MAP MOODLE USER -> DIM_USER
// ============================================================

async function findWarehouseUser(moodleUserId) {
  const [rows] = await pool.query(
    `
      SELECT
        User_Key,
        Moodle_User_ID,
        Username,
        Full_Name,
        Email,
        Primary_Role

      FROM lms_datawarehouse.dim_user

      WHERE Moodle_User_ID = ?
        AND Is_Active = 1

      LIMIT 1
    `,
    [moodleUserId]
  );

  return rows[0] || null;
}


// ============================================================
// HELPER: MAP MOODLE COURSE -> DIM_COURSE
// ============================================================

async function findWarehouseCourse(moodleCourseId) {
  const [rows] = await pool.query(
    `
      SELECT
        Course_Key,
        Moodle_Course_ID,
        Course_Code,
        Course_Name

      FROM lms_datawarehouse.dim_course

      WHERE Moodle_Course_ID = ?

      LIMIT 1
    `,
    [moodleCourseId]
  );

  return rows[0] || null;
}


// ============================================================
// HELPER: KIỂM TRA NOTIFICATION ĐÃ TỒN TẠI
//
// Dùng:
// recipient + type + title + course
//
// Mục đích:
// Không tạo notification trùng khi scheduler/API chạy lại.
// ============================================================

async function notificationExists({
  recipientUserId,
  notificationType,
  title,
  courseId,
}) {
  const [rows] = await pool.query(
    `
      SELECT
        notification_id

      FROM lms_datawarehouse.fact_notification

      WHERE recipient_user_id = ?
        AND notification_type = ?
        AND title = ?

        AND (
          course_id = ?

          OR (
            course_id IS NULL
            AND ? IS NULL
          )
        )

      LIMIT 1
    `,
    [
      recipientUserId,
      notificationType,
      title,
      courseId,
      courseId,
    ]
  );

  return rows.length > 0;
}


// ============================================================
// HELPER: INSERT NOTIFICATION
//
// Notification web được tạo trước.
//
// email_status = PENDING
//
// Sau đó emailNotificationService sẽ:
// PENDING -> SENT nếu SMTP thành công.
//
// Nếu email lỗi:
// notification web vẫn được giữ.
// ============================================================

async function insertNotification({
  recipientUserId,
  notificationType,
  title,
  message,
  courseId,
}) {
  const [result] = await pool.query(
    `
      INSERT INTO lms_datawarehouse.fact_notification
      (
        recipient_user_id,
        notification_type,
        title,
        message,
        course_id,
        source_system,
        is_read,
        created_at,
        email_status
      )

      VALUES
      (
        ?,
        ?,
        ?,
        ?,
        ?,
        'LMS',
        0,
        NOW(),
        'PENDING'
      )
    `,
    [
      recipientUserId,
      notificationType,
      title,
      message,
      courseId,
    ]
  );

  return result.insertId;
}


// ============================================================
// HELPER: GỬI EMAIL AN TOÀN
//
// Không để lỗi email làm chết toàn bộ quá trình generate.
//
// Nếu SMTP lỗi:
// - notification web vẫn tồn tại
// - email_status vẫn PENDING
// - scheduler tiếp tục xử lý notification khác
// ============================================================

async function sendEmailSafely(notificationId) {
  try {
    return await sendNotificationEmail(
      notificationId
    );
  } catch (error) {
    console.error(
      `❌ Email notification #${notificationId} lỗi:`,
      error.message
    );

    return {
      success: false,
      notificationId,
      error: error.message,
    };
  }
}


// ============================================================
// PHẦN 1
// LẤY SINH VIÊN CHƯA NỘP BÀI + SẮP DEADLINE
//
// Deadline lấy trực tiếp:
// lms_moodle_source.mdl_assign.duedate
//
// Điều kiện:
//
// NOW() < deadline
//
// VÀ
//
// deadline <= NOW() + hoursBeforeDeadline
//
// Đồng thời sinh viên chưa submitted.
//
// Ví dụ hoursBeforeDeadline = 24:
// chỉ lấy bài còn hạn và sẽ hết hạn trong vòng 24 giờ.
// ============================================================

export async function getPendingAssignmentReminders({
  hoursBeforeDeadline = 24,
} = {}) {
  const [rows] = await pool.query(
    `
      SELECT DISTINCT
        a.id AS assignment_id,
        a.name AS assignment_name,
        a.duedate,

        FROM_UNIXTIME(a.duedate)
          AS due_date,

        NOW()
          AS current_datetime,

        c.id
          AS moodle_course_id,

        c.shortname
          AS course_code,

        c.fullname
          AS course_name,

        u.id
          AS moodle_user_id,

        u.username,

        CONCAT(
          u.firstname,
          ' ',
          u.lastname
        ) AS student_name,

        u.email,

        COALESCE(
          s.status,
          'not_submitted'
        ) AS submission_status

      FROM lms_moodle_source.mdl_assign a

      INNER JOIN lms_moodle_source.mdl_course c
        ON c.id = a.course

      INNER JOIN lms_moodle_source.mdl_enrol e
        ON e.courseid = c.id

      INNER JOIN
        lms_moodle_source.mdl_user_enrolments ue
          ON ue.enrolid = e.id

      INNER JOIN lms_moodle_source.mdl_user u
        ON u.id = ue.userid

      LEFT JOIN
        lms_moodle_source.mdl_assign_submission s
          ON s.assignment = a.id
          AND s.userid = u.id
          AND s.latest = 1

      WHERE
        u.username LIKE 'sv%'

        AND (
          s.status IS NULL
          OR s.status <> 'submitted'
        )

        -- Deadline chưa hết
        AND FROM_UNIXTIME(a.duedate) > NOW()

        -- Deadline nằm trong khoảng cảnh báo
        AND FROM_UNIXTIME(a.duedate)
          <= DATE_ADD(
            NOW(),
            INTERVAL ? HOUR
          )

      ORDER BY
        a.duedate ASC,
        c.id ASC,
        u.id ASC
    `,
    [hoursBeforeDeadline]
  );

  return rows;
}


// ============================================================
// SINH NOTIFICATION CHO SINH VIÊN
// ============================================================

export async function generateStudentDeadlineNotifications({
  hoursBeforeDeadline = 24,
} = {}) {

  // ----------------------------------------------------------
  // 1. LẤY SINH VIÊN ĐỦ ĐIỀU KIỆN DEADLINE
  // ----------------------------------------------------------

  const pendingStudents =
    await getPendingAssignmentReminders({
      hoursBeforeDeadline,
    });


  // ----------------------------------------------------------
  // 2. RESULT
  // ----------------------------------------------------------

  const result = {
    checked:
      pendingStudents.length,

    created: 0,

    emailSent: 0,
    emailSkipped: 0,
    emailFailed: 0,

    skippedNoWarehouseUser: 0,
    skippedNoWarehouseCourse: 0,
    skippedDuplicate: 0,

    notifications: [],
  };


  // ----------------------------------------------------------
  // 3. XỬ LÝ TỪNG SINH VIÊN
  // ----------------------------------------------------------

  for (const item of pendingStudents) {

    // ========================================================
    // MAP MOODLE USER -> DIM_USER
    // ========================================================

    const warehouseUser =
      await findWarehouseUser(
        item.moodle_user_id
      );


    if (!warehouseUser) {
      result.skippedNoWarehouseUser += 1;
      continue;
    }


    // Chỉ xử lý Student

    if (
      String(
        warehouseUser.Primary_Role
      ).toLowerCase() !== "student"
    ) {
      continue;
    }


    // ========================================================
    // MAP MOODLE COURSE -> DIM_COURSE
    // ========================================================

    const warehouseCourse =
      await findWarehouseCourse(
        item.moodle_course_id
      );


    if (!warehouseCourse) {
      result.skippedNoWarehouseCourse += 1;
      continue;
    }


    const courseId =
      warehouseCourse.Course_Key;


    // ========================================================
    // TẠO NỘI DUNG
    // ========================================================

    const deadline =
      formatDeadline(
        item.duedate
      );


    const title =
      `Sắp đến hạn: ${item.assignment_name}`;


    const message =
      `Bài tập "${item.assignment_name}" ` +
      `của môn ${item.course_code} - ${item.course_name} ` +
      `sẽ hết hạn lúc ${deadline}. ` +
      `Bạn chưa hoàn tất nộp bài. ` +
      `Vui lòng kiểm tra và nộp bài đúng hạn.`;


    // ========================================================
    // KIỂM TRA DUPLICATE
    // ========================================================

    const exists =
      await notificationExists({
        recipientUserId:
          warehouseUser.User_Key,

        notificationType:
          "ASSIGNMENT",

        title,

        courseId,
      });


    if (exists) {
      result.skippedDuplicate += 1;
      continue;
    }


    // ========================================================
    // TẠO WEB NOTIFICATION
    // ========================================================

    const notificationId =
      await insertNotification({
        recipientUserId:
          warehouseUser.User_Key,

        notificationType:
          "ASSIGNMENT",

        title,
        message,
        courseId,
      });


    result.created += 1;


    // ========================================================
    // GỬI EMAIL
    //
    // Chỉ tới đây khi:
    // - deadline còn hiệu lực
    // - nằm trong khoảng cảnh báo
    // - sinh viên chưa submitted
    // - notification chưa tồn tại
    // ========================================================

    const emailResult =
      await sendEmailSafely(
        notificationId
      );


    // ========================================================
    // THỐNG KÊ EMAIL
    // ========================================================

    if (emailResult?.success) {
      result.emailSent += 1;

    } else if (emailResult?.skipped) {
      result.emailSkipped += 1;

    } else {
      result.emailFailed += 1;
    }


    // ========================================================
    // RESPONSE
    // ========================================================

    result.notifications.push({
      notificationId,

      recipientType:
        "student",

      recipientUserId:
        warehouseUser.User_Key,

      moodleUserId:
        item.moodle_user_id,

      fullName:
        warehouseUser.Full_Name,

      originalEmail:
        warehouseUser.Email,

      assignmentId:
        item.assignment_id,

      assignmentName:
        item.assignment_name,

      courseId,

      courseCode:
        item.course_code,

      courseName:
        item.course_name,

      deadline,

      // Deadline thật lấy từ Moodle
      dueDate:
        item.due_date,

      // Thời điểm DB kiểm tra
      checkedAt:
        item.current_datetime,

      submissionStatus:
        item.submission_status,

      // Kết quả gửi email
      emailResult,
    });
  }


  return result;
}


// ============================================================
// PHẦN 2
// LẤY DEADLINE CỦA CÁC MÔN GIẢNG VIÊN PHỤ TRÁCH
//
// Moodle mapping:
//
// mdl_user
// -> mdl_role_assignments
// -> mdl_role
// -> mdl_context
// -> mdl_course
// -> mdl_assign
//
// Chỉ lấy assignment:
//
// NOW() < deadline
//
// VÀ
//
// deadline <= NOW() + hoursBeforeDeadline
// ============================================================

async function getTeacherUpcomingAssignments({
  hoursBeforeDeadline = 24,
} = {}) {
  const [rows] = await pool.query(
    `
      SELECT DISTINCT
        u.id
          AS moodle_teacher_id,

        u.username
          AS teacher_username,

        CONCAT(
          u.firstname,
          ' ',
          u.lastname
        ) AS teacher_name,

        u.email
          AS teacher_email,

        c.id
          AS moodle_course_id,

        c.shortname
          AS course_code,

        c.fullname
          AS course_name,

        a.id
          AS assignment_id,

        a.name
          AS assignment_name,

        a.duedate,

        FROM_UNIXTIME(a.duedate)
          AS due_date,

        NOW()
          AS current_datetime

      FROM lms_moodle_source.mdl_user u

      INNER JOIN
        lms_moodle_source.mdl_role_assignments ra
          ON ra.userid = u.id

      INNER JOIN
        lms_moodle_source.mdl_role r
          ON r.id = ra.roleid

      INNER JOIN
        lms_moodle_source.mdl_context ctx
          ON ctx.id = ra.contextid
          AND ctx.contextlevel = 50

      INNER JOIN
        lms_moodle_source.mdl_course c
          ON c.id = ctx.instanceid

      INNER JOIN
        lms_moodle_source.mdl_assign a
          ON a.course = c.id

      WHERE
        r.shortname IN (
          'teacher',
          'editingteacher'
        )

        -- Deadline chưa hết
        AND FROM_UNIXTIME(a.duedate) > NOW()

        -- Deadline nằm trong khoảng cảnh báo
        AND FROM_UNIXTIME(a.duedate)
          <= DATE_ADD(
            NOW(),
            INTERVAL ? HOUR
          )

      ORDER BY
        a.duedate ASC,
        u.id ASC,
        c.id ASC
    `,
    [hoursBeforeDeadline]
  );

  return rows;
}


// ============================================================
// SINH NOTIFICATION CHO GIẢNG VIÊN
// ============================================================

export async function generateTeacherDeadlineNotifications({
  hoursBeforeDeadline = 24,
} = {}) {

  // ----------------------------------------------------------
  // 1. LẤY ASSIGNMENT SẮP DEADLINE
  // ----------------------------------------------------------

  const assignments =
    await getTeacherUpcomingAssignments({
      hoursBeforeDeadline,
    });


  // ----------------------------------------------------------
  // 2. RESULT
  // ----------------------------------------------------------

  const result = {
    checked:
      assignments.length,

    created: 0,

    emailSent: 0,
    emailSkipped: 0,
    emailFailed: 0,

    skippedNoWarehouseUser: 0,
    skippedNoWarehouseCourse: 0,
    skippedDuplicate: 0,

    notifications: [],
  };


  // ----------------------------------------------------------
  // 3. XỬ LÝ TỪNG ASSIGNMENT
  // ----------------------------------------------------------

  for (const item of assignments) {

    // ========================================================
    // MAP TEACHER MOODLE -> DIM_USER
    // ========================================================

    const warehouseTeacher =
      await findWarehouseUser(
        item.moodle_teacher_id
      );


    if (!warehouseTeacher) {
      result.skippedNoWarehouseUser += 1;
      continue;
    }


    // Chỉ xử lý Teacher

    if (
      String(
        warehouseTeacher.Primary_Role
      ).toLowerCase() !== "teacher"
    ) {
      continue;
    }


    // ========================================================
    // MAP COURSE
    // ========================================================

    const warehouseCourse =
      await findWarehouseCourse(
        item.moodle_course_id
      );


    if (!warehouseCourse) {
      result.skippedNoWarehouseCourse += 1;
      continue;
    }


    const courseId =
      warehouseCourse.Course_Key;


    // ========================================================
    // TẠO NỘI DUNG
    // ========================================================

    const deadline =
      formatDeadline(
        item.duedate
      );


    const title =
      `Sắp đến hạn: ${item.assignment_name}`;


    const message =
      `Bài tập "${item.assignment_name}" ` +
      `của môn ${item.course_code} - ${item.course_name} ` +
      `sẽ đến hạn lúc ${deadline}. ` +
      `Vui lòng kiểm tra tiến độ nộp bài của sinh viên.`;


    // ========================================================
    // KIỂM TRA DUPLICATE
    // ========================================================

    const exists =
      await notificationExists({
        recipientUserId:
          warehouseTeacher.User_Key,

        notificationType:
          "ASSIGNMENT",

        title,

        courseId,
      });


    if (exists) {
      result.skippedDuplicate += 1;
      continue;
    }


    // ========================================================
    // TẠO WEB NOTIFICATION
    // ========================================================

    const notificationId =
      await insertNotification({
        recipientUserId:
          warehouseTeacher.User_Key,

        notificationType:
          "ASSIGNMENT",

        title,
        message,
        courseId,
      });


    result.created += 1;


    // ========================================================
    // GỬI EMAIL
    //
    // Chỉ gửi sau khi assignment đã vượt qua
    // điều kiện deadline + duplicate.
    // ========================================================

    const emailResult =
      await sendEmailSafely(
        notificationId
      );


    // ========================================================
    // THỐNG KÊ EMAIL
    // ========================================================

    if (emailResult?.success) {
      result.emailSent += 1;

    } else if (emailResult?.skipped) {
      result.emailSkipped += 1;

    } else {
      result.emailFailed += 1;
    }


    // ========================================================
    // RESPONSE
    // ========================================================

    result.notifications.push({
      notificationId,

      recipientType:
        "teacher",

      recipientUserId:
        warehouseTeacher.User_Key,

      moodleUserId:
        item.moodle_teacher_id,

      fullName:
        warehouseTeacher.Full_Name,

      originalEmail:
        warehouseTeacher.Email,

      assignmentId:
        item.assignment_id,

      assignmentName:
        item.assignment_name,

      courseId,

      courseCode:
        item.course_code,

      courseName:
        item.course_name,

      deadline,

      // Deadline thật lấy từ Moodle
      dueDate:
        item.due_date,

      // Thời điểm DB kiểm tra
      checkedAt:
        item.current_datetime,

      // Kết quả gửi email
      emailResult,
    });
  }


  return result;
}


// ============================================================
// PHẦN 3
// CHẠY CẢ SINH VIÊN + GIẢNG VIÊN
//
// Controller vẫn gọi:
// generateDeadlineNotifications(...)
//
// Không cần sửa controller.
// ============================================================

export async function generateDeadlineNotifications({
  hoursBeforeDeadline = 24,
} = {}) {

  // ==========================================================
  // STUDENT
  // ==========================================================

  const studentResult =
    await generateStudentDeadlineNotifications({
      hoursBeforeDeadline,
    });


  // ==========================================================
  // TEACHER
  // ==========================================================

  const teacherResult =
    await generateTeacherDeadlineNotifications({
      hoursBeforeDeadline,
    });


  // ==========================================================
  // TỔNG KẾT
  // ==========================================================

  return {

    // --------------------------------------------------------
    // Tổng số record kiểm tra
    // --------------------------------------------------------

    checked:
      studentResult.checked +
      teacherResult.checked,


    // --------------------------------------------------------
    // Tổng notification web mới
    // --------------------------------------------------------

    created:
      studentResult.created +
      teacherResult.created,


    // --------------------------------------------------------
    // EMAIL
    // --------------------------------------------------------

    emailSent:
      studentResult.emailSent +
      teacherResult.emailSent,

    emailSkipped:
      studentResult.emailSkipped +
      teacherResult.emailSkipped,

    emailFailed:
      studentResult.emailFailed +
      teacherResult.emailFailed,


    // --------------------------------------------------------
    // SKIPPED
    // --------------------------------------------------------

    skippedNoWarehouseUser:
      studentResult.skippedNoWarehouseUser +
      teacherResult.skippedNoWarehouseUser,

    skippedNoWarehouseCourse:
      studentResult.skippedNoWarehouseCourse +
      teacherResult.skippedNoWarehouseCourse,

    skippedDuplicate:
      studentResult.skippedDuplicate +
      teacherResult.skippedDuplicate,


    // --------------------------------------------------------
    // TẤT CẢ NOTIFICATION MỚI
    // --------------------------------------------------------

    notifications: [
      ...studentResult.notifications,
      ...teacherResult.notifications,
    ],


    // --------------------------------------------------------
    // CHI TIẾT STUDENT
    // --------------------------------------------------------

    students:
      studentResult,


    // --------------------------------------------------------
    // CHI TIẾT TEACHER
    // --------------------------------------------------------

    teachers:
      teacherResult,
  };
}