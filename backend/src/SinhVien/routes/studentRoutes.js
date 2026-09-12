import express from "express";
import {
  getStudentDashboardSummary,
  getStudentCourses,
  getStudentCourseDetail,
  getStudentGrades,
  getStudentSubmissions,
  getStudentEngagement,
  getStudentBenchmark,
} from "../controllers/studentController.js";

const router = express.Router();

// 1. Dashboard summary
router.get("/dashboard-summary", getStudentDashboardSummary);

// 2. Courses list
router.get("/courses", getStudentCourses);

// 3. Course detail
router.get("/courses/:courseId", getStudentCourseDetail);

// 4. Grades
router.get("/grades", getStudentGrades);

// 5. Submissions
router.get("/submissions", getStudentSubmissions);

// 6. Engagement
router.get("/engagement", getStudentEngagement);

// 7. Peer Benchmark & Percentile (So sánh ẩn danh với lớp)
router.get("/benchmark", getStudentBenchmark);

export default router;
