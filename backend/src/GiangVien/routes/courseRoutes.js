import express from "express";

import {
  getCourseStudents,
  getCourseStudentAnalytics,
  getCourseGradeDistribution,
  getCourseEngagementTrend,
  getCourseSubmissionBehavior,
  getCourseSegments,
  getCourseRisk,
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
  "/:courseId/submission-behavior",
  getCourseSubmissionBehavior
);

router.get(
  "/:courseId/segments",
  getCourseSegments
);

router.get(
  "/:courseId/risk",
  getCourseRisk
);

router.get(
  "/:courseId/students",
  getCourseStudents
);

export default router;

