import express from "express";

import {
  getCourseStudents,
  getCourseStudentAnalytics,
  getCourseGradeDistribution,
  getCourseEngagementTrend,
} from "../controllers/courseController.js";

const router = express.Router();

router.get(
  "/:courseId/student-analytics",
  getCourseStudentAnalytics
);

router.get(
  "/:courseId/grade-distribution",
  getCourseGradeDistribution
);

router.get(
  "/:courseId/engagement-trend",
  getCourseEngagementTrend
);

router.get(
  "/:courseId/students",
  getCourseStudents
);

export default router;