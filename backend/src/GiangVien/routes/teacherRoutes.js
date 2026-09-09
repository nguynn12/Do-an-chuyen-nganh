import express from "express";

import {
  getTeacherById,
  getTeacherCourses,
  getTeacherDashboard,
  getTeacherGrading,

  getTeacherSchedule,
  createTeacherSchedule,
  updateTeacherSchedule,
  deleteTeacherSchedule,
} from "../controllers/teacherController.js";


const router =
  express.Router();


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