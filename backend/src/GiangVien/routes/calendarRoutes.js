import express from "express";

import {
  getTeacherCalendar,
} from "../controllers/calendarController.js";


const router = express.Router();


// ============================================================
// LẤY CALENDAR CỦA GIẢNG VIÊN
//
// GET /api/teachers/:teacherId/calendar
//
// Ví dụ:
// /api/teachers/2/calendar?year=2026&month=9
// ============================================================

router.get(
  "/:teacherId/calendar",
  getTeacherCalendar
);


export default router;