import pool from "../../config/database.js";
import { sendNotificationEmail } from "./emailNotificationService.js";


// ============================================================
// HELPER: FORMAT NGÀY GIỜ
// ============================================================

function formatEventDateTime(eventDate, eventTime) {
  const date = new Date(eventDate);

  const dateText = date.toLocaleDateString("vi-VN", {
    timeZone: "Asia/Ho_Chi_Minh",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });

  const timeText = eventTime
    ? String(eventTime).slice(0, 5)
    : null;

  return timeText
    ? `${timeText} ngày ${dateText}`
    : `ngày ${dateText}`;
}


// ============================================================
// HELPER: TÊN LOẠI SỰ KIỆN
// ============================================================

function getEventTypeLabel(eventType) {
  switch (String(eventType || "").toLowerCase()) {
    case "class":
      return "Lịch giảng dạy";

    case "exam":
      return "Lịch chấm bài";

    case "meeting":
      return "Lịch họp";

    default:
      return "Lịch công việc";
  }
}


// ============================================================
// 1. LẤY LỊCH SẮP DIỄN RA
//
// Scheduler chạy mỗi 1 phút.
//
// Ví dụ:
// Hiện tại: 20:30
// Event_Time: 20:45
// minutesBeforeEvent = 15
//
// => lịch còn 15 phút
// => được xử lý.
//
// Chỉ lấy:
// NOW() < thời gian sự kiện <= NOW() + 15 phút
//
// KHÔNG đợi tới khi sự kiện đã bắt đầu.
// ============================================================

export async function getUpcomingTeacherSchedules({
  minutesBeforeEvent = 15,
} = {}) {

  const sql = `
    SELECT
      ts.Schedule_ID,
      ts.Teacher_User_Key,
      ts.Event_Date,
      ts.Event_Time,
      ts.Title,
      ts.Event_Type,
      ts.Description,

      du.Moodle_User_ID,
      du.Username,
      du.Full_Name,
      du.Email,
      du.Primary_Role

    FROM lms_datawarehouse.teacher_schedule ts

    JOIN lms_datawarehouse.dim_user du
      ON du.User_Key = ts.Teacher_User_Key

    WHERE
      LOWER(du.Primary_Role) = 'teacher'
      AND du.Is_Active = 1

      AND ts.Event_Time IS NOT NULL

      AND TIMESTAMP(
        ts.Event_Date,
        ts.Event_Time
      ) > NOW()

      AND TIMESTAMP(
        ts.Event_Date,
        ts.Event_Time
      ) <= DATE_ADD(
        NOW(),
        INTERVAL ? MINUTE
      )

    ORDER BY
      ts.Event_Date ASC,
      ts.Event_Time ASC,
      ts.Schedule_ID ASC
  `;


  const [rows] =
    await pool.query(
      sql,
      [minutesBeforeEvent]
    );


  return rows;
}


// ============================================================
// 2. KIỂM TRA NOTIFICATION ĐÃ TỒN TẠI
//
// Marker:
// [SCHEDULE:5]
//
// Mỗi Schedule_ID chỉ được tạo notification một lần.
//
// Ví dụ:
// 20:30 -> gửi notification
// 20:31 -> thấy marker đã tồn tại -> bỏ qua
// 20:32 -> thấy marker đã tồn tại -> bỏ qua
//
// => KHÔNG gửi email lặp lại mỗi phút.
// ============================================================

async function notificationAlreadyExists({
  recipientUserId,
  scheduleId,
}) {

  const marker =
    `[SCHEDULE:${scheduleId}]`;


  const [rows] =
    await pool.query(
      `
        SELECT notification_id

        FROM lms_datawarehouse.fact_notification

        WHERE recipient_user_id = ?
          AND notification_type = 'SCHEDULE'
          AND message LIKE ?

        LIMIT 1
      `,
      [
        recipientUserId,
        `%${marker}%`,
      ]
    );


  return rows.length > 0;
}


// ============================================================
// 3. TẠO NOTIFICATION + GỬI EMAIL
//
// LUỒNG:
//
// teacher_schedule
//       ↓
// sự kiện còn <= 15 phút
//       ↓
// kiểm tra notification trùng
//       ↓
// INSERT fact_notification PENDING
//       ↓
// sendNotificationEmail()
//       ↓
// SMTP thành công
//       ↓
// email_status = SENT
//
// Notification được tạo TRƯỚC giờ sự kiện.
// ============================================================

export async function generateScheduleNotifications({
  minutesBeforeEvent = 15,
} = {}) {

  const schedules =
    await getUpcomingTeacherSchedules({
      minutesBeforeEvent,
    });


  const result = {
    checked: schedules.length,
    created: 0,
    skippedDuplicate: 0,

    emailSent: 0,
    emailSkipped: 0,
    emailFailed: 0,

    notifications: [],
  };


  for (const schedule of schedules) {

    // ========================================================
    // KIỂM TRA NOTIFICATION TRÙNG
    // ========================================================

    const exists =
      await notificationAlreadyExists({
        recipientUserId:
          schedule.Teacher_User_Key,

        scheduleId:
          schedule.Schedule_ID,
      });


    if (exists) {

      result.skippedDuplicate += 1;

      continue;
    }


    // ========================================================
    // FORMAT THỜI GIAN
    // ========================================================

    const eventDateTime =
      formatEventDateTime(
        schedule.Event_Date,
        schedule.Event_Time
      );


    // ========================================================
    // TITLE
    // ========================================================

    const typeLabel =
      getEventTypeLabel(
        schedule.Event_Type
      );


    const title =
      `${typeLabel}: ${schedule.Title}`;


    // ========================================================
    // MESSAGE
    // ========================================================

    const marker =
      `[SCHEDULE:${schedule.Schedule_ID}]`;


    let message =
      `${marker} ` +
      `${schedule.Title} sắp diễn ra vào ${eventDateTime}. ` +
      `Vui lòng chuẩn bị trước khi sự kiện bắt đầu.`;


    if (schedule.Description) {

      message +=
        ` ${schedule.Description}`;

    }


    // ========================================================
    // INSERT NOTIFICATION
    // ========================================================

    const [insertResult] =
      await pool.query(
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
            'SCHEDULE',
            ?,
            ?,
            NULL,
            'LMS',
            FALSE,
            NOW(),
            'PENDING'
          )
        `,
        [
          schedule.Teacher_User_Key,
          title,
          message,
        ]
      );


    const notificationId =
      insertResult.insertId;


    result.created += 1;


    // ========================================================
    // GỬI EMAIL
    // ========================================================

    let emailResult;


    try {

      emailResult =
        await sendNotificationEmail(
          notificationId
        );


      if (emailResult.success) {

        result.emailSent += 1;

      } else if (emailResult.skipped) {

        result.emailSkipped += 1;

      } else {

        result.emailFailed += 1;

      }


    } catch (error) {

      result.emailFailed += 1;


      emailResult = {
        success: false,
        error: error.message,
      };


      console.error(
        `❌ Schedule #${schedule.Schedule_ID} gửi email thất bại:`,
        error.message
      );
    }


    // ========================================================
    // LOG
    // ========================================================

    console.log(
      `📅 Schedule #${schedule.Schedule_ID}: ${schedule.Title}`
    );

    console.log(
      `   Giảng viên: ${schedule.Full_Name}`
    );

    console.log(
      `   User_Key: ${schedule.Teacher_User_Key}`
    );

    console.log(
      `   Thời gian sự kiện: ${eventDateTime}`
    );

    console.log(
      `   Nhắc trước: ${minutesBeforeEvent} phút`
    );

    console.log(
      `   Email gốc: ${schedule.Email || "(không có)"}`
    );


    // ========================================================
    // RESULT
    // ========================================================

    result.notifications.push({

      notificationId,

      scheduleId:
        schedule.Schedule_ID,

      teacherUserKey:
        schedule.Teacher_User_Key,

      moodleUserId:
        schedule.Moodle_User_ID,

      teacherName:
        schedule.Full_Name,

      email:
        schedule.Email,

      eventType:
        schedule.Event_Type,

      title:
        schedule.Title,

      eventDate:
        schedule.Event_Date,

      eventTime:
        schedule.Event_Time,

      eventDateTime,

      minutesBeforeEvent,

      emailResult,
    });
  }


  return result;
}