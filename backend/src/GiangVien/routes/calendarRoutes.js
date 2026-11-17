import { requireTeacherAuth } from '../../shared/middleware/authMiddleware.js';
import { requireOwnTeacherPath } from '../../shared/middleware/teacherPathIdentity.js';
import express from "express";

import {
  getTeacherCalendar,
} from "../controllers/calendarController.js";


const router = express.Router();
router.use(requireTeacherAuth);
router.param('teacherId', (req, res, next) => requireOwnTeacherPath(req, res, next));


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