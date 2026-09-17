import pool from "../../config/database.js";
import transporter from "../../../config/mailer.js";


// ============================================================
// HELPER: ESCAPE HTML
// ============================================================

function escapeHtml(value = "") {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}


// ============================================================
// HELPER: NORMALIZE
// ============================================================

function normalize(value = "") {
  return String(value)
    .trim()
    .toLowerCase();
}


// ============================================================
// HELPER: KIỂM TRA TEST MODE
// ============================================================

function isEmailTestMode() {
  return (
    normalize(
      process.env.EMAIL_TEST_MODE
    ) === "true"
  );
}


// ============================================================
// HELPER: ĐỌC EMAIL ALLOWLIST
//
// Ví dụ:
//
// EMAIL_ALLOWLIST=2312687@dlu.edu.vn,2312719@dlu.edu.vn
//
// Nếu để trống:
// -> Production cho phép tất cả email hợp lệ.
//
// Nếu có:
// -> Chỉ email nằm trong danh sách mới được SMTP gửi.
// ============================================================

function getEmailAllowlist() {
  const raw =
    String(
      process.env.EMAIL_ALLOWLIST || ""
    ).trim();

  if (!raw) {
    return [];
  }

  return raw
    .split(",")
    .map((email) =>
      normalize(email)
    )
    .filter(Boolean);
}


// ============================================================
// HELPER: KIỂM TRA ALLOWLIST
// ============================================================

function validateEmailAllowlist(email) {
  const allowlist =
    getEmailAllowlist();

  // Không cấu hình allowlist
  // => không giới hạn người nhận.

  if (allowlist.length === 0) {
    return {
      allowed: true,
      enabled: false,
    };
  }


  const normalizedEmail =
    normalize(email);


  if (
    allowlist.includes(
      normalizedEmail
    )
  ) {
    return {
      allowed: true,
      enabled: true,
    };
  }


  return {
    allowed: false,
    enabled: true,

    reason:
      "Email không nằm trong EMAIL_ALLOWLIST.",
  };
}


// ============================================================
// HELPER: VALIDATE EMAIL DLU THEO ROLE
//
// STUDENT:
//
// Database demo có thể:
// Username = sv2310001
// Email    = 2312687@dlu.edu.vn
//
// Vì Username là dữ liệu seed nên KHÔNG ép email phải khớp
// Username.
//
// Chỉ yêu cầu email Student:
// - phần trước @ là số
// - domain @dlu.edu.vn
//
// Ví dụ:
// 2312687@dlu.edu.vn
//
//
// TEACHER:
//
// Ví dụ:
// binhnv@dlu.edu.vn
//
// Yêu cầu:
// - phần trước @ bắt đầu bằng chữ
// - domain @dlu.edu.vn
//
// KHÔNG tự sinh email giảng viên từ Full_Name.
// ============================================================

function validateDluEmail({
  email,
  username,
  role,
}) {
  const normalizedEmail =
    normalize(email);

  const normalizedUsername =
    normalize(username);

  const normalizedRole =
    normalize(role);


  // ==========================================================
  // KHÔNG CÓ EMAIL
  // ==========================================================

  if (!normalizedEmail) {
    return {
      valid: false,

      reason:
        "Người nhận chưa có địa chỉ email.",
    };
  }


  // ==========================================================
  // STUDENT
  // ==========================================================

  if (
    normalizedRole === "student"
  ) {
    const studentEmailRegex =
      /^\d+@dlu\.edu\.vn$/;


    if (
      !studentEmailRegex.test(
        normalizedEmail
      )
    ) {
      return {
        valid: false,

        reason:
          "Email sinh viên phải có dạng MSSV@dlu.edu.vn.",
      };
    }


    return {
      valid: true,

      role:
        "student",

      email:
        normalizedEmail,

      username:
        normalizedUsername,
    };
  }


  // ==========================================================
  // TEACHER
  // ==========================================================

  if (
    normalizedRole === "teacher"
  ) {
    const teacherEmailRegex =
      /^[a-z][a-z0-9._-]*@dlu\.edu\.vn$/;


    if (
      !teacherEmailRegex.test(
        normalizedEmail
      )
    ) {
      return {
        valid: false,

        reason:
          "Email giảng viên phải có dạng tài khoản@dlu.edu.vn.",
      };
    }


    return {
      valid: true,

      role:
        "teacher",

      email:
        normalizedEmail,

      username:
        normalizedUsername,
    };
  }


  // ==========================================================
  // ROLE KHÁC
  // ==========================================================

  return {
    valid: false,

    reason:
      `Role "${role}" không được hỗ trợ gửi email notification.`,
  };
}


// ============================================================
// HELPER: XÁC ĐỊNH EMAIL SMTP THỰC TẾ
//
// TEST MODE:
// tất cả mail chuyển về EMAIL_TEST_RECEIVER.
//
// PRODUCTION:
// gửi đúng email trong dim_user.
// ============================================================

function getActualReceiver(originalEmail) {

  if (isEmailTestMode()) {

    const testReceiver =
      normalize(
        process.env.EMAIL_TEST_RECEIVER
      );


    if (!testReceiver) {
      throw new Error(
        "EMAIL_TEST_MODE=true nhưng chưa cấu hình EMAIL_TEST_RECEIVER."
      );
    }


    return testReceiver;
  }


  return normalize(
    originalEmail
  );
}


// ============================================================
// ĐÁNH DẤU EMAIL ĐÃ GỬI
// ============================================================

async function markEmailAsSent(
  notificationId
) {
  await pool.query(
    `
      UPDATE lms_datawarehouse.fact_notification

      SET
        email_status = 'SENT',
        email_sent_at = NOW()

      WHERE notification_id = ?
    `,
    [notificationId]
  );
}


// ============================================================
// GỬI EMAIL CHO NOTIFICATION
//
// Service này KHÔNG quyết định deadline.
//
// deadlineNotificationService.js chịu trách nhiệm:
// - deadline chưa hết
// - deadline nằm trong khoảng cảnh báo
// - student chưa nộp
// - notification chưa bị trùng
//
// Service này chỉ:
// - lấy người nhận
// - validate email
// - kiểm tra allowlist
// - gửi SMTP
// ============================================================

export async function sendNotificationEmail(
  notificationId
) {

  // ==========================================================
  // 1. LẤY NOTIFICATION + USER + COURSE
  // ==========================================================

  const [rows] =
    await pool.query(
      `
        SELECT
          n.notification_id,
          n.notification_type,
          n.title,
          n.message,
          n.email_status,

          u.User_Key,
          u.Username,
          u.Full_Name,
          u.Email,
          u.Primary_Role,

          c.Course_Code,
          c.Course_Name

        FROM lms_datawarehouse.fact_notification n

        INNER JOIN lms_datawarehouse.dim_user u
          ON u.User_Key = n.recipient_user_id

        LEFT JOIN lms_datawarehouse.dim_course c
          ON c.Course_Key = n.course_id

        WHERE n.notification_id = ?
          AND n.email_status = 'PENDING'

        LIMIT 1
      `,
      [notificationId]
    );


  const notification =
    rows[0];


  // ==========================================================
  // 2. KHÔNG TỒN TẠI / KHÔNG CÒN PENDING
  // ==========================================================

  if (!notification) {
    return {
      success: false,
      skipped: true,

      reason:
        "Notification không tồn tại hoặc email đã được xử lý.",
    };
  }


  // ==========================================================
  // 3. THÔNG TIN NGƯỜI NHẬN
  // ==========================================================

  const originalEmail =
    normalize(
      notification.Email
    );


  const username =
    normalize(
      notification.Username
    );


  const role =
    normalize(
      notification.Primary_Role
    );


  const recipientName =
    notification.Full_Name ||
    "Người dùng";


  // ==========================================================
  // 4. VALIDATE EMAIL DLU
  // ==========================================================

  const emailValidation =
    validateDluEmail({
      email:
        originalEmail,

      username,

      role,
    });


  // ==========================================================
  // PRODUCTION:
  // Email không hợp lệ => KHÔNG gửi.
  //
  // TEST MODE:
  // Dữ liệu seed có thể chưa hợp lệ.
  // Vẫn cho phép redirect tới EMAIL_TEST_RECEIVER.
  // ==========================================================

  if (
    !emailValidation.valid &&
    !isEmailTestMode()
  ) {

    console.warn(
      `⚠️ Skip notification #${notification.notification_id}: ${emailValidation.reason}`
    );


    return {
      success: false,
      skipped: true,

      notificationId:
        notification.notification_id,

      originalEmail,

      username,

      role,

      emailValidation,

      reason:
        emailValidation.reason,
    };
  }


  // ==========================================================
  // 5. ALLOWLIST
  //
  // Chỉ áp dụng khi EMAIL_TEST_MODE=false.
  //
  // Nếu EMAIL_ALLOWLIST có 2 email:
  // chỉ đúng 2 email đó được gửi thật.
  //
  // Notification web của người khác vẫn giữ nguyên.
  // ==========================================================

  let allowlistResult = {
    allowed: true,
    enabled: false,
  };


  if (!isEmailTestMode()) {

    allowlistResult =
      validateEmailAllowlist(
        originalEmail
      );


    if (!allowlistResult.allowed) {

      console.log(
        `⏭️ Skip email notification #${notification.notification_id}: ${originalEmail} không nằm trong allowlist.`
      );


      return {
        success: false,
        skipped: true,

        notificationId:
          notification.notification_id,

        originalEmail,

        username,

        role,

        emailValidation,

        allowlist:
          allowlistResult,

        reason:
          allowlistResult.reason,
      };
    }
  }


  // ==========================================================
  // 6. XÁC ĐỊNH EMAIL SMTP THỰC TẾ
  // ==========================================================

  let actualReceiver;


  try {

    actualReceiver =
      getActualReceiver(
        originalEmail
      );


  } catch (error) {

    console.error(
      "❌ Lỗi cấu hình email:",
      error.message
    );


    return {
      success: false,
      skipped: true,

      notificationId:
        notification.notification_id,

      originalEmail,

      username,

      role,

      emailValidation,

      reason:
        error.message,
    };
  }


  // ==========================================================
  // 7. CHUẨN BỊ HTML AN TOÀN
  // ==========================================================

  const safeName =
    escapeHtml(
      recipientName
    );


  const safeTitle =
    escapeHtml(
      notification.title || ""
    );


  const safeMessage =
    escapeHtml(
      notification.message || ""
    );


  const safeCourseCode =
    escapeHtml(
      notification.Course_Code ||
      ""
    );


  const safeCourseName =
    escapeHtml(
      notification.Course_Name ||
      ""
    );


  const safeOriginalEmail =
    escapeHtml(
      originalEmail ||
      "Không có email"
    );


  const safeRole =
    escapeHtml(
      role || ""
    );


  const hasCourse =
    Boolean(
      notification.Course_Code ||
      notification.Course_Name
    );


  // ==========================================================
  // 8. COURSE
  // ==========================================================

  const courseHtml =
    hasCourse
      ? `
        <div
          style="
            margin-top: 18px;
            padding: 14px 16px;
            background: #f5f7f6;
            border-radius: 8px;
          "
        >
          <strong>Môn học:</strong>

          ${safeCourseCode}

          ${
            safeCourseName
              ? ` - ${safeCourseName}`
              : ""
          }
        </div>
      `
      : "";


  const courseText =
    hasCourse
      ? `Môn học: ${
          notification.Course_Code || ""
        }${
          notification.Course_Name
            ? ` - ${notification.Course_Name}`
            : ""
        }`
      : "";


  // ==========================================================
  // 9. TEST MODE INFO
  // ==========================================================

  const testModeHtml =
    isEmailTestMode()
      ? `
        <div
          style="
            margin-bottom: 20px;
            padding: 12px 14px;
            background: #fff7e8;
            border: 1px solid #f0d7a4;
            border-radius: 8px;
            font-size: 13px;
            line-height: 1.6;
          "
        >

          <strong>
            Chế độ kiểm thử email
          </strong>

          <br />

          Người nhận theo dữ liệu hệ thống:
          ${safeName}

          <br />

          Vai trò:
          ${safeRole || "Không xác định"}

          <br />

          Email gốc:
          ${safeOriginalEmail}

          <br />

          Email này được chuyển tới
          EMAIL_TEST_RECEIVER để kiểm thử.

        </div>
      `
      : "";


  const testModeText =
    isEmailTestMode()
      ? [
          "[CHẾ ĐỘ KIỂM THỬ EMAIL]",

          `Người nhận gốc: ${recipientName}`,

          `Vai trò: ${role}`,

          `Email gốc: ${originalEmail || "Không có"}`,

          "",
        ]
      : [];


  // ==========================================================
  // 10. GỬI EMAIL
  // ==========================================================

  try {

    const info =
      await transporter.sendMail({

        from: {
          name:
            process.env.MAIL_FROM_NAME ||
            "LMS DLU",

          address:
            process.env.MAIL_USER,
        },


        to:
          actualReceiver,


        subject:
          isEmailTestMode()
            ? `[TEST LMS DLU] ${notification.title}`
            : `[LMS DLU] ${notification.title}`,


        text: [
          ...testModeText,

          `Xin chào ${recipientName},`,

          "",

          notification.title,

          "",

          notification.message,

          "",

          courseText,

          "",

          "Đây là email được gửi tự động từ hệ thống LMS DLU.",
        ]
          .filter(
            (line) =>
              line !== ""
          )
          .join("\n"),


        html: `
          <div
            style="
              margin: 0;
              padding: 30px 15px;
              background: #f4f6f5;
              font-family: Arial, sans-serif;
              color: #27332d;
            "
          >

            <div
              style="
                max-width: 600px;
                margin: 0 auto;
                padding: 28px;
                background: #ffffff;
                border-radius: 12px;
              "
            >

              <div
                style="
                  margin-bottom: 24px;
                  font-size: 20px;
                  font-weight: 700;
                "
              >
                LMS DLU
              </div>


              ${testModeHtml}


              <p
                style="
                  margin: 0 0 18px;
                  line-height: 1.6;
                "
              >
                Xin chào
                <strong>${safeName}</strong>,
              </p>


              <h2
                style="
                  margin: 0 0 14px;
                  font-size: 18px;
                  line-height: 1.4;
                "
              >
                ${safeTitle}
              </h2>


              <p
                style="
                  margin: 0;
                  line-height: 1.7;
                "
              >
                ${safeMessage}
              </p>


              ${courseHtml}


              <hr
                style="
                  margin: 26px 0 18px;
                  border: 0;
                  border-top: 1px solid #e5e8e6;
                "
              />


              <p
                style="
                  margin: 0;
                  color: #7a837e;
                  font-size: 12px;
                  line-height: 1.6;
                "
              >
                Đây là email được gửi tự động
                từ hệ thống LMS DLU.
                Vui lòng không trả lời email này.
              </p>

            </div>

          </div>
        `,
      });


    // ========================================================
    // 11. SMTP THÀNH CÔNG
    // ========================================================

    await markEmailAsSent(
      notification.notification_id
    );


    console.log(
      `📧 Notification #${notification.notification_id}`
    );

    console.log(
      `   Người nhận: ${recipientName}`
    );

    console.log(
      `   Role: ${role}`
    );

    console.log(
      `   Email gốc: ${originalEmail || "(không có)"}`
    );

    console.log(
      `   SMTP gửi tới: ${actualReceiver}`
    );

    console.log(
      `   Email hợp lệ: ${emailValidation.valid}`
    );

    console.log(
      `   Test mode: ${isEmailTestMode()}`
    );


    return {
      success: true,

      notificationId:
        notification.notification_id,

      recipientName,

      username,

      role,

      originalEmail,

      sentTo:
        actualReceiver,

      emailValidation,

      allowlist:
        allowlistResult,

      testMode:
        isEmailTestMode(),

      messageId:
        info.messageId,
    };


  } catch (error) {

    // ========================================================
    // 12. SMTP LỖI
    //
    // KHÔNG THROW.
    //
    // Notification web vẫn tồn tại.
    // email_status vẫn PENDING để có thể thử lại.
    // ========================================================

    console.error(
      `❌ Gửi email notification #${notification.notification_id} thất bại:`,
      error.message
    );


    return {
      success: false,

      notificationId:
        notification.notification_id,

      recipientName,

      username,

      role,

      originalEmail,

      sentTo:
        actualReceiver,

      emailValidation,

      allowlist:
        allowlistResult,

      testMode:
        isEmailTestMode(),

      error:
        error.message,
    };
  }
}