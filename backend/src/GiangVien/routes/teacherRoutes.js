import { requireOwnTeacherPath } from '../../shared/middleware/teacherPathIdentity.js';
import { updateLearningAlert, broadcastClassNotification, getTeacherActivity } from '../controllers/learningAlertController.js';
import express from "express";
import { requireTeacherAuth } from "../../shared/middleware/authMiddleware.js";

import {
  getTeacherById,
  getTeacherCourses,
  getTeacherDashboard,
  getTeacherGrading,
  getTeacherLearningAlerts,

  getTeacherSchedule,
  createTeacherSchedule,
  updateTeacherSchedule,
  deleteTeacherSchedule,
} from "../controllers/teacherController.js";


const router =
  express.Router();

// BẢO MẬT: Bắt buộc xác thực danh tính Giảng viên
router.use(requireTeacherAuth);
router.use('/:teacherId', requireOwnTeacherPath);
router.get('/:teacherId/activity', getTeacherActivity);
router.put('/:teacherId/learning-alerts/read-all', updateLearningAlert);
router.patch('/:teacherId/learning-alerts/:alertId', updateLearningAlert);
router.delete('/:teacherId/learning-alerts/:alertId', updateLearningAlert);
router.post('/:teacherId/learning-alerts/broadcast', broadcastClassNotification);



// ======================================================
// CẢNH BÁO HỌC TẬP TỰ ĐỘNG TỪ CƠ SỞ DỮ LIỆU THẬT
//
// GET /api/teachers/:teacherId/learning-alerts
// ======================================================

router.get(
  "/:teacherId/learning-alerts",
  getTeacherLearningAlerts
);


// ======================================================
// DASHBOARD TỔNG QUAN
//
// GET /api/teachers/:teacherId/dashboard
// ======================================================

router.get(
  "/:teacherId/dashboard",
  getTeacherDashboard
);


// ======================================================
// DANH SÁCH MÔN ĐANG DẠY
//
// GET /api/teachers/:teacherId/courses
// ======================================================

router.get(
  "/:teacherId/courses",
  getTeacherCourses
);


// ======================================================
// DANH SÁCH BÀI CHỜ CHẤM
//
// GET /api/teachers/:teacherId/grading
//
// Có thể lọc:
// GET /api/teachers/:teacherId/grading?courseId=101
// ======================================================

router.get(
  "/:teacherId/grading",
  getTeacherGrading
);


// ======================================================
// LỊCH GIẢNG VIÊN
//
// GET
// /api/teachers/:teacherId/schedule
//
// GET THEO THÁNG
// /api/teachers/:teacherId/schedule?month=2026-08
// ======================================================

router.get(
  "/:teacherId/schedule",
  getTeacherSchedule
);


// ======================================================
// TẠO LỊCH
//
// POST
// /api/teachers/:teacherId/schedule
// ======================================================

router.post(
  "/:teacherId/schedule",
  createTeacherSchedule
);


// ======================================================
// CẬP NHẬT LỊCH
//
// PUT
// /api/teachers/:teacherId/schedule/:scheduleId
// ======================================================

router.put(
  "/:teacherId/schedule/:scheduleId",
  updateTeacherSchedule
);


// ======================================================
// XÓA LỊCH
//
// DELETE
// /api/teachers/:teacherId/schedule/:scheduleId
// ======================================================

router.delete(
  "/:teacherId/schedule/:scheduleId",
  deleteTeacherSchedule
);


// ======================================================
// THÔNG TIN GIẢNG VIÊN
//
// GET /api/teachers/:teacherId
// ======================================================

router.get(
  "/:teacherId",
  getTeacherById
);


export default router;