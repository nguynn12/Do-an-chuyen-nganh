import express from "express";

import {
  getTeacherNotifications,
  getUnreadNotificationCount,
  markNotificationAsRead,
  markAllNotificationsAsRead,

  // Tạo notification tự động
  generateDeadlineNotificationsController,
  generateScheduleNotificationsController,
  generateAllNotificationsController,
} from "../controllers/notificationController.js";


const router = express.Router();


// ======================================================
// 1. TẠO THÔNG BÁO DEADLINE CHO SINH VIÊN
//
// POST /api/teachers/notifications/generate-deadlines
//
// Body:
// {
//   "hours": 24
// }
// ======================================================

router.post(
  "/notifications/generate-deadlines",
  generateDeadlineNotificationsController
);


// ======================================================
// 2. TẠO THÔNG BÁO LỊCH CHO GIẢNG VIÊN
//
// POST /api/teachers/notifications/generate-schedules
//
// Body:
// {
//   "hours": 24
// }
// ======================================================

router.post(
  "/notifications/generate-schedules",
  generateScheduleNotificationsController
);


// ======================================================
// 3. QUÉT TOÀN BỘ HỆ THỐNG THÔNG BÁO
//
// - Deadline sinh viên
// - Lịch giảng viên
//
// POST /api/teachers/notifications/generate-all
//
// Body:
// {
//   "hours": 24
// }
// ======================================================

router.post(
  "/notifications/generate-all",
  generateAllNotificationsController
);


// ======================================================
// 4. ĐẾM THÔNG BÁO CHƯA ĐỌC
//
// GET /api/teachers/:teacherId/notifications/unread-count
// ======================================================

router.get(
  "/:teacherId/notifications/unread-count",
  getUnreadNotificationCount
);


// ======================================================
// 5. LẤY DANH SÁCH THÔNG BÁO
//
// GET /api/teachers/:teacherId/notifications
//
// Có thể:
// ?status=unread
// ?status=read
// ======================================================

router.get(
  "/:teacherId/notifications",
  getTeacherNotifications
);


// ======================================================
// 6. ĐÁNH DẤU TẤT CẢ ĐÃ ĐỌC
//
// PUT /api/teachers/:teacherId/notifications/read-all
// ======================================================

router.put(
  "/:teacherId/notifications/read-all",
  markAllNotificationsAsRead
);


// ======================================================
// 7. ĐÁNH DẤU 1 THÔNG BÁO ĐÃ ĐỌC
//
// PUT
// /api/teachers/:teacherId/notifications/:notificationId/read
// ======================================================

router.put(
  "/:teacherId/notifications/:notificationId/read",
  markNotificationAsRead
);


export default router;