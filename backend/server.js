import dotenv from "dotenv";

dotenv.config();

import app from "./src/app.js";

import {
  testDatabaseConnection,
} from "./src/config/database.js";

import {
  generateDeadlineNotifications,
} from "./src/GiangVien/services/deadlineNotificationService.js";

import {
  generateScheduleNotifications,
} from "./src/GiangVien/services/scheduleNotificationService.js";


// ============================================================
// CONFIG
// ============================================================

const PORT =
  process.env.PORT || 3000;


// Khoảng thời gian trước deadline để cảnh báo.
// Ví dụ 24 = chỉ cảnh báo các bài còn <= 24 giờ.

const DEADLINE_WARNING_HOURS =
  Number(
    process.env.DEADLINE_WARNING_HOURS || 24
  );


// Bao lâu quét deadline một lần.
// Hiện tại mặc định: 1 phút để test.

const DEADLINE_CHECK_INTERVAL_MINUTES =
  Number(
    process.env.DEADLINE_CHECK_INTERVAL_MINUTES || 1
  );


const DEADLINE_CHECK_INTERVAL_MS =
  DEADLINE_CHECK_INTERVAL_MINUTES *
  60 *
  1000;


// ============================================================
// SCHEDULE CONFIG
// ============================================================

// Scheduler lịch giảng viên cũng chạy mỗi 1 phút.
// Dùng khoảng quét riêng để sau này dễ thay đổi.

const SCHEDULE_CHECK_INTERVAL_MINUTES =
  Number(
    process.env.SCHEDULE_CHECK_INTERVAL_MINUTES || 1
  );


const SCHEDULE_CHECK_INTERVAL_MS =
  SCHEDULE_CHECK_INTERVAL_MINUTES *
  60 *
  1000;


// Khi scheduler chạy, lấy những lịch vừa tới giờ
// trong khoảng 1 phút gần nhất.

const SCHEDULE_EVENT_WINDOW_MINUTES =
  Number(
    process.env.SCHEDULE_EVENT_WINDOW_MINUTES || 1
  );


// ============================================================
// TRẠNG THÁI SCHEDULER
//
// Ngăn trường hợp lần quét trước chưa xong
// mà interval tiếp theo đã chạy.
// ============================================================

let deadlineCheckRunning = false;
let scheduleCheckRunning = false;


// ============================================================
// KIỂM TRA DEADLINE
// ============================================================

async function runDeadlineCheck() {

  if (deadlineCheckRunning) {

    console.log(
      "⏭️ Deadline scheduler đang chạy, bỏ qua lượt này."
    );

    return;
  }


  deadlineCheckRunning = true;


  try {

    console.log("");
    console.log(
      "================================="
    );

    console.log(
      "⏰ Bắt đầu kiểm tra deadline..."
    );

    console.log(
      `⏳ Khoảng cảnh báo: ${DEADLINE_WARNING_HOURS} giờ`
    );


    const result =
      await generateDeadlineNotifications({
        hoursBeforeDeadline:
          DEADLINE_WARNING_HOURS,
      });


    console.log(
      `🔎 Đã kiểm tra: ${result.checked}`
    );

    console.log(
      `🔔 Notification mới: ${result.created}`
    );

    console.log(
      `📧 Email gửi thành công: ${result.emailSent || 0}`
    );

    console.log(
      `⏭️ Email bỏ qua: ${result.emailSkipped || 0}`
    );

    console.log(
      `❌ Email thất bại: ${result.emailFailed || 0}`
    );

    console.log(
      `♻️ Notification trùng: ${result.skippedDuplicate || 0}`
    );

    console.log(
      "✅ Kiểm tra deadline hoàn tất."
    );

    console.log(
      "================================="
    );

    console.log("");


  } catch (error) {

    console.error("");
    console.error(
      "❌ Deadline scheduler gặp lỗi:"
    );

    console.error(
      error
    );

    console.error("");


  } finally {

    deadlineCheckRunning = false;

  }
}


// ============================================================
// KIỂM TRA LỊCH GIẢNG VIÊN
// ============================================================

async function runScheduleCheck() {

  if (scheduleCheckRunning) {

    console.log(
      "⏭️ Schedule scheduler đang chạy, bỏ qua lượt này."
    );

    return;
  }


  scheduleCheckRunning = true;


  try {

    console.log("");
    console.log(
      "================================="
    );

    console.log(
      "📅 Bắt đầu kiểm tra lịch giảng viên..."
    );

    console.log(
      `⏳ Khoảng bắt lịch: ${SCHEDULE_EVENT_WINDOW_MINUTES} phút gần nhất`
    );


    const result =
      await generateScheduleNotifications({
        minutesAfterEvent:
          SCHEDULE_EVENT_WINDOW_MINUTES,
      });


    console.log(
      `🔎 Lịch tới giờ: ${result.checked}`
    );

    console.log(
      `🔔 Notification mới: ${result.created}`
    );

    console.log(
      `📧 Email gửi thành công: ${result.emailSent || 0}`
    );

    console.log(
      `⏭️ Email bỏ qua: ${result.emailSkipped || 0}`
    );

    console.log(
      `❌ Email thất bại: ${result.emailFailed || 0}`
    );

    console.log(
      `♻️ Notification trùng: ${result.skippedDuplicate || 0}`
    );

    console.log(
      "✅ Kiểm tra lịch giảng viên hoàn tất."
    );

    console.log(
      "================================="
    );

    console.log("");


  } catch (error) {

    console.error("");
    console.error(
      "❌ Schedule scheduler gặp lỗi:"
    );

    console.error(
      error
    );

    console.error("");


  } finally {

    scheduleCheckRunning = false;

  }
}


// ============================================================
// KHỞI ĐỘNG DEADLINE SCHEDULER
// ============================================================

function startDeadlineScheduler() {

  console.log(
    `⏰ Deadline scheduler: mỗi ${DEADLINE_CHECK_INTERVAL_MINUTES} phút`
  );

  console.log(
    `⚠️ Cảnh báo trước deadline: ${DEADLINE_WARNING_HOURS} giờ`
  );


  // ----------------------------------------------------------
  // QUÉT NGAY KHI BACKEND KHỞI ĐỘNG
  //
  // Không await để app.listen không bị block bởi gửi email.
  // ----------------------------------------------------------

  runDeadlineCheck();


  // ----------------------------------------------------------
  // SAU ĐÓ QUÉT ĐỊNH KỲ
  // ----------------------------------------------------------

  setInterval(
    runDeadlineCheck,
    DEADLINE_CHECK_INTERVAL_MS
  );
}


// ============================================================
// KHỞI ĐỘNG SCHEDULE SCHEDULER
// ============================================================

function startScheduleScheduler() {

  console.log(
    `📅 Schedule scheduler: mỗi ${SCHEDULE_CHECK_INTERVAL_MINUTES} phút`
  );

  console.log(
    `⏳ Bắt lịch vừa tới giờ trong ${SCHEDULE_EVENT_WINDOW_MINUTES} phút gần nhất`
  );


  // ----------------------------------------------------------
  // QUÉT NGAY KHI BACKEND KHỞI ĐỘNG
  // ----------------------------------------------------------

  runScheduleCheck();


  // ----------------------------------------------------------
  // SAU ĐÓ QUÉT ĐỊNH KỲ
  // ----------------------------------------------------------

  setInterval(
    runScheduleCheck,
    SCHEDULE_CHECK_INTERVAL_MS
  );
}


// ============================================================
// START SERVER
// ============================================================

async function startServer() {

  try {

    // --------------------------------------------------------
    // 1. KIỂM TRA DATABASE
    // --------------------------------------------------------

    await testDatabaseConnection();


    // --------------------------------------------------------
    // 2. KHỞI ĐỘNG EXPRESS
    // --------------------------------------------------------

    app.listen(
      PORT,
      () => {

        console.log("");
        console.log(
          "================================="
        );

        console.log(
          "🚀 LMS Backend đang chạy"
        );

        console.log(
          `🌐 http://localhost:${PORT}`
        );

        console.log(
          `🧪 http://localhost:${PORT}/api/test`
        );

        console.log(
          `🗄️ http://localhost:${PORT}/api/test/database`
        );

        console.log(
          `👤 http://localhost:${PORT}/api/test/users`
        );

        console.log(
          "================================="
        );

        console.log("");


        // ----------------------------------------------------
        // 3. START DEADLINE SCHEDULER
        // ----------------------------------------------------

        startDeadlineScheduler();


        // ----------------------------------------------------
        // 4. START TEACHER SCHEDULE SCHEDULER
        // ----------------------------------------------------

        startScheduleScheduler();

      }
    );


  } catch (error) {

    console.error(
      "❌ Không thể khởi động server."
    );

    console.error(
      error
    );

    process.exit(1);

  }
}


// ============================================================
// RUN
// ============================================================

startServer();