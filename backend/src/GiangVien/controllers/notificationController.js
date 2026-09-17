import pool from "../../config/database.js";

import {
  generateDeadlineNotifications,
} from "../services/deadlineNotificationService.js";

import {
  generateScheduleNotifications,
} from "../services/scheduleNotificationService.js";


// ======================================================
// HELPER: TÌM GIẢNG VIÊN THEO MOODLE USER ID
// ======================================================

async function findTeacherByMoodleId(teacherId) {
  const [rows] = await pool.query(
    `
      SELECT
        User_Key,
        Moodle_User_ID,
        Username,
        Full_Name,
        Email,
        Primary_Role,
        Is_Active
      FROM Dim_User
      WHERE Moodle_User_ID = ?
        AND Primary_Role = 'Teacher'
        AND Is_Active = 1
      LIMIT 1
    `,
    [teacherId]
  );

  return rows[0] || null;
}


// ======================================================
// HELPER: BỎ MARKER NỘI BỘ KHỎI MESSAGE
// ======================================================

function cleanNotificationMessage(message) {
  if (!message) {
    return message;
  }

  return String(message)
    .replace(/\[SCHEDULE:\d+\]\s*/g, "")
    .trim();
}


// ======================================================
// HELPER: FORMAT DỮ LIỆU TRẢ VỀ FRONTEND
// ======================================================

function normalizeNotification(row) {
  return {
    id: row.notification_id,
    type: row.notification_type,
    title: row.title,

    message: cleanNotificationMessage(
      row.message
    ),

    courseId: row.course_id,
    sourceSystem: row.source_system,

    isRead: Boolean(row.is_read),

    createdAt: row.created_at,
    readAt: row.read_at,

    emailStatus: row.email_status,
    emailSentAt: row.email_sent_at,
  };
}


// ======================================================
// HELPER: VALIDATE HOURS
// ======================================================

function isValidHours(hours) {
  return (
    Number.isFinite(hours) &&
    hours > 0 &&
    hours <= 720
  );
}


// ======================================================
// 1. LẤY DANH SÁCH THÔNG BÁO GIẢNG VIÊN
//
// GET /api/teachers/:teacherId/notifications
//
// ?status=unread
// ?status=read
// ======================================================

export async function getTeacherNotifications(
  req,
  res
) {
  try {
    const { teacherId } = req.params;
    const { status } = req.query;

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

    let statusFilter = "";

    if (status === "unread") {
      statusFilter =
        "AND is_read = 0";
    } else if (status === "read") {
      statusFilter =
        "AND is_read = 1";
    }

    const [rows] = await pool.query(
      `
        SELECT
          notification_id,
          recipient_user_id,
          notification_type,
          title,
          message,
          course_id,
          source_system,
          is_read,
          created_at,
          read_at,
          email_status,
          email_sent_at
        FROM fact_notification
        WHERE recipient_user_id = ?
        ${statusFilter}
        ORDER BY
          created_at DESC,
          notification_id DESC
      `,
      [teacher.User_Key]
    );

    const data =
      rows.map(
        normalizeNotification
      );

    return res.json({
      success: true,

      teacherId:
        Number(teacherId),

      total:
        data.length,

      data,
    });
  } catch (error) {
    console.error(
      "Lỗi getTeacherNotifications:",
      error
    );

    return res.status(500).json({
      success: false,

      message:
        "Không thể lấy danh sách thông báo.",

      error:
        error.message,
    });
  }
}


// ======================================================
// 2. ĐẾM THÔNG BÁO CHƯA ĐỌC
//
// GET
// /api/teachers/:teacherId/notifications/unread-count
// ======================================================

export async function getUnreadNotificationCount(
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

    const [rows] =
      await pool.query(
        `
          SELECT
            COUNT(*) AS unread_count
          FROM fact_notification
          WHERE recipient_user_id = ?
            AND is_read = 0
        `,
        [teacher.User_Key]
      );

    return res.json({
      success: true,

      teacherId:
        Number(teacherId),

      unreadCount:
        Number(
          rows[0]?.unread_count || 0
        ),
    });
  } catch (error) {
    console.error(
      "Lỗi getUnreadNotificationCount:",
      error
    );

    return res.status(500).json({
      success: false,

      message:
        "Không thể đếm thông báo chưa đọc.",

      error:
        error.message,
    });
  }
}


// ======================================================
// 3. ĐÁNH DẤU 1 THÔNG BÁO ĐÃ ĐỌC
//
// PUT
// /api/teachers/:teacherId/notifications/:notificationId/read
// ======================================================

export async function markNotificationAsRead(
  req,
  res
) {
  try {
    const {
      teacherId,
      notificationId,
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
          UPDATE fact_notification
          SET
            is_read = 1,

            read_at = CASE
              WHEN read_at IS NULL
                THEN NOW()
              ELSE read_at
            END

          WHERE notification_id = ?
            AND recipient_user_id = ?
        `,
        [
          notificationId,
          teacher.User_Key,
        ]
      );

    if (
      result.affectedRows === 0
    ) {
      return res.status(404).json({
        success: false,

        message:
          "Không tìm thấy thông báo.",
      });
    }

    return res.json({
      success: true,

      message:
        "Đã đánh dấu thông báo là đã đọc.",

      notificationId:
        Number(notificationId),
    });
  } catch (error) {
    console.error(
      "Lỗi markNotificationAsRead:",
      error
    );

    return res.status(500).json({
      success: false,

      message:
        "Không thể cập nhật thông báo.",

      error:
        error.message,
    });
  }
}


// ======================================================
// 4. ĐÁNH DẤU TẤT CẢ THÔNG BÁO ĐÃ ĐỌC
//
// PUT
// /api/teachers/:teacherId/notifications/read-all
// ======================================================

export async function markAllNotificationsAsRead(
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

    const [result] =
      await pool.query(
        `
          UPDATE fact_notification
          SET
            is_read = 1,
            read_at = NOW()
          WHERE recipient_user_id = ?
            AND is_read = 0
        `,
        [teacher.User_Key]
      );

    return res.json({
      success: true,

      message:
        "Đã đánh dấu tất cả thông báo là đã đọc.",

      updated:
        result.affectedRows,
    });
  } catch (error) {
    console.error(
      "Lỗi markAllNotificationsAsRead:",
      error
    );

    return res.status(500).json({
      success: false,

      message:
        "Không thể cập nhật tất cả thông báo.",

      error:
        error.message,
    });
  }
}


// ======================================================
// 5. TẠO THÔNG BÁO DEADLINE TỪ MOODLE
//
// TẠO CHO CẢ:
// - Sinh viên chưa nộp bài
// - Giảng viên phụ trách môn
//
// POST
// /api/teachers/notifications/generate-deadlines
//
// Body:
// {
//   "hours": 24
// }
// ======================================================

export async function generateDeadlineNotificationsController(
  req,
  res
) {
  try {
    const hours =
      Number(
        req.body?.hours ?? 24
      );

    if (!isValidHours(hours)) {
      return res.status(400).json({
        success: false,

        message:
          "hours phải nằm trong khoảng từ 1 đến 720.",
      });
    }

    const result =
      await generateDeadlineNotifications({
        hoursBeforeDeadline:
          hours,
      });

    const studentResult =
      result.students || {};

    const teacherResult =
      result.teachers || {};

    return res.json({
      success: true,

      message:
        "Đã kiểm tra deadline Moodle và tạo thông báo cho sinh viên và giảng viên.",

      hoursBeforeDeadline:
        hours,

      summary: {
        checked:
          Number(
            result.checked || 0
          ),

        totalCreated:
          Number(
            result.created || 0
          ),

        studentCreated:
          Number(
            studentResult.created || 0
          ),

        teacherCreated:
          Number(
            teacherResult.created || 0
          ),

        skippedNoWarehouseUser:
          Number(
            result.skippedNoWarehouseUser ||
              0
          ),

        skippedNoWarehouseCourse:
          Number(
            result.skippedNoWarehouseCourse ||
              0
          ),

        skippedDuplicate:
          Number(
            result.skippedDuplicate || 0
          ),
      },


      // ================================================
      // SINH VIÊN
      // ================================================

      students: {
        checked:
          Number(
            studentResult.checked || 0
          ),

        created:
          Number(
            studentResult.created || 0
          ),

        skippedNoWarehouseUser:
          Number(
            studentResult
              .skippedNoWarehouseUser || 0
          ),

        skippedNoWarehouseCourse:
          Number(
            studentResult
              .skippedNoWarehouseCourse || 0
          ),

        skippedDuplicate:
          Number(
            studentResult
              .skippedDuplicate || 0
          ),

        notifications:
          studentResult.notifications ||
          [],
      },


      // ================================================
      // GIẢNG VIÊN
      // ================================================

      teachers: {
        checked:
          Number(
            teacherResult.checked || 0
          ),

        created:
          Number(
            teacherResult.created || 0
          ),

        skippedNoWarehouseUser:
          Number(
            teacherResult
              .skippedNoWarehouseUser || 0
          ),

        skippedNoWarehouseCourse:
          Number(
            teacherResult
              .skippedNoWarehouseCourse || 0
          ),

        skippedDuplicate:
          Number(
            teacherResult
              .skippedDuplicate || 0
          ),

        notifications:
          teacherResult.notifications ||
          [],
      },


      // ================================================
      // TẤT CẢ NOTIFICATION DEADLINE VỪA TẠO
      // ================================================

      notifications:
        result.notifications || [],
    });
  } catch (error) {
    console.error(
      "Lỗi generateDeadlineNotificationsController:",
      error
    );

    return res.status(500).json({
      success: false,

      message:
        "Không thể tạo thông báo deadline.",

      error:
        error.message,
    });
  }
}


// ======================================================
// 6. TẠO THÔNG BÁO LỊCH CHO GIẢNG VIÊN
//
// Nguồn:
// teacher_schedule
//
// POST
// /api/teachers/notifications/generate-schedules
//
// Body:
// {
//   "hours": 24
// }
// ======================================================

export async function generateScheduleNotificationsController(
  req,
  res
) {
  try {
    const hours =
      Number(
        req.body?.hours ?? 24
      );

    if (!isValidHours(hours)) {
      return res.status(400).json({
        success: false,

        message:
          "hours phải nằm trong khoảng từ 1 đến 720.",
      });
    }

    const result =
      await generateScheduleNotifications({
        hoursBeforeEvent:
          hours,
      });

    return res.json({
      success: true,

      message:
        "Đã kiểm tra lịch sắp tới và tạo thông báo cho giảng viên.",

      hoursBeforeEvent:
        hours,

      checked:
        Number(
          result.checked || 0
        ),

      created:
        Number(
          result.created || 0
        ),

      skippedDuplicate:
        Number(
          result.skippedDuplicate || 0
        ),

      notifications:
        result.notifications || [],
    });
  } catch (error) {
    console.error(
      "Lỗi generateScheduleNotificationsController:",
      error
    );

    return res.status(500).json({
      success: false,

      message:
        "Không thể tạo thông báo lịch giảng viên.",

      error:
        error.message,
    });
  }
}


// ======================================================
// 7. QUÉT TOÀN BỘ HỆ THỐNG THÔNG BÁO
//
// Bao gồm:
//
// 1. Deadline Moodle -> Sinh viên
// 2. Deadline Moodle -> Giảng viên
// 3. teacher_schedule -> Giảng viên
//
// POST
// /api/teachers/notifications/generate-all
//
// Body:
// {
//   "hours": 24
// }
// ======================================================

export async function generateAllNotificationsController(
  req,
  res
) {
  try {
    const hours =
      Number(
        req.body?.hours ?? 24
      );

    if (!isValidHours(hours)) {
      return res.status(400).json({
        success: false,

        message:
          "hours phải nằm trong khoảng từ 1 đến 720.",
      });
    }


    // ==================================================
    // CHẠY SONG SONG 2 SERVICE
    //
    // deadline service:
    // - student deadline
    // - teacher deadline
    //
    // schedule service:
    // - teacher schedule
    // ==================================================

    const [
      deadlineResult,
      scheduleResult,
    ] = await Promise.all([
      generateDeadlineNotifications({
        hoursBeforeDeadline:
          hours,
      }),

      generateScheduleNotifications({
        hoursBeforeEvent:
          hours,
      }),
    ]);


    const studentDeadline =
      deadlineResult.students || {};

    const teacherDeadline =
      deadlineResult.teachers || {};


    // ==================================================
    // RESPONSE
    // ==================================================

    return res.json({
      success: true,

      message:
        "Đã quét toàn bộ hệ thống thông báo.",

      hours,


      // ================================================
      // TỔNG HỢP
      // ================================================

      summary: {
        totalCreated:
          Number(
            studentDeadline.created || 0
          ) +
          Number(
            teacherDeadline.created || 0
          ) +
          Number(
            scheduleResult.created || 0
          ),

        studentDeadlineCreated:
          Number(
            studentDeadline.created || 0
          ),

        teacherDeadlineCreated:
          Number(
            teacherDeadline.created || 0
          ),

        teacherScheduleCreated:
          Number(
            scheduleResult.created || 0
          ),
      },


      // ================================================
      // DEADLINE SINH VIÊN
      // ================================================

      studentDeadlines: {
        checked:
          Number(
            studentDeadline.checked || 0
          ),

        created:
          Number(
            studentDeadline.created || 0
          ),

        skippedNoWarehouseUser:
          Number(
            studentDeadline
              .skippedNoWarehouseUser || 0
          ),

        skippedNoWarehouseCourse:
          Number(
            studentDeadline
              .skippedNoWarehouseCourse || 0
          ),

        skippedDuplicate:
          Number(
            studentDeadline
              .skippedDuplicate || 0
          ),

        notifications:
          studentDeadline.notifications ||
          [],
      },


      // ================================================
      // DEADLINE GIẢNG VIÊN
      // ================================================

      teacherDeadlines: {
        checked:
          Number(
            teacherDeadline.checked || 0
          ),

        created:
          Number(
            teacherDeadline.created || 0
          ),

        skippedNoWarehouseUser:
          Number(
            teacherDeadline
              .skippedNoWarehouseUser || 0
          ),

        skippedNoWarehouseCourse:
          Number(
            teacherDeadline
              .skippedNoWarehouseCourse || 0
          ),

        skippedDuplicate:
          Number(
            teacherDeadline
              .skippedDuplicate || 0
          ),

        notifications:
          teacherDeadline.notifications ||
          [],
      },


      // ================================================
      // LỊCH GIẢNG VIÊN
      // ================================================

      teacherSchedules: {
        checked:
          Number(
            scheduleResult.checked || 0
          ),

        created:
          Number(
            scheduleResult.created || 0
          ),

        skippedDuplicate:
          Number(
            scheduleResult
              .skippedDuplicate || 0
          ),

        notifications:
          scheduleResult.notifications ||
          [],
      },
    });
  } catch (error) {
    console.error(
      "Lỗi generateAllNotificationsController:",
      error
    );

    return res.status(500).json({
      success: false,

      message:
        "Không thể quét toàn bộ hệ thống thông báo.",

      error:
        error.message,
    });
  }
}