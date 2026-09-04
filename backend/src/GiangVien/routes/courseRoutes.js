import express from "express";

import {
  getCourseStudents,
  getCourseStudentAnalytics,
} from "../controllers/courseController.js";

const router = express.Router();

router.get(
  "/:courseId/student-analytics",
  getCourseStudentAnalytics
);

router.get(
  "/:courseId/students",
  getCourseStudents
);

export default router;