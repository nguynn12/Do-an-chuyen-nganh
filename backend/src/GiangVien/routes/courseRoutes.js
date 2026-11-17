import { exportClassGrades } from '../controllers/gradeExportController.js';
import express from "express";
import multer from 'multer';
import {getLmsGradeItems,syncCourseLmsGrades,linkLmsGradeItem,createIngestItem,downloadGradeTemplate,importGradeFile} from '../controllers/gradeIngestionController.js';
import { getSavedGrades, saveGradeGroup, saveFinalGrade, saveGradeAdjustment } from "../controllers/gradePersistenceController.js";
import { requireCourseTeacher } from "../../shared/middleware/authMiddleware.js";

import {
  getCourseStudents,
  getCourseStudentAnalytics,
  getCourseGradeDistribution,
  getCourseEngagementTrend,
  getCourseSubmissionBehavior,
  getCourseSegments,
  getCourseRisk,
  getCourseCohorts,
  getCourseDetails,
  getStudentCourseGrades,
} from "../controllers/courseController.js";

const router = express.Router();

// BẢO MẬT P1: Kiểm tra danh tính Giảng viên và quyền phân công giảng dạy thực tế trong Moodle
// cho tất cả các endpoint liên quan đến dữ liệu môn học, điểm số, danh sách sinh viên
router.use("/:courseId", requireCourseTeacher);
router.get('/:courseId/grades/export', exportClassGrades);
const gradeUpload=multer({storage:multer.memoryStorage(),limits:{fileSize:2*1024*1024,files:1,fields:3}}).single('file');
router.get('/:courseId/grade-sources/lms-items',getLmsGradeItems);
router.post('/:courseId/grade-sources/sync',syncCourseLmsGrades);
router.post('/:courseId/grade-sources/items',createIngestItem);
router.put('/:courseId/grade-items/:itemKey/lms-source',linkLmsGradeItem);
router.get('/:courseId/grade-items/:itemKey/import-template',downloadGradeTemplate);
router.post('/:courseId/grade-items/:itemKey/import',(req,res,next)=>gradeUpload(req,res,error=>error?res.status(error.code==='LIMIT_FILE_SIZE'?413:400).json({success:false,message:'Không nhận được file; giới hạn 1 file .xlsx/.csv, tối đa 2MB.'}):next()),importGradeFile);
router.get('/:courseId/students/:studentId/saved-grades', getSavedGrades);
router.put('/:courseId/students/:studentId/grade-groups/:groupKey', saveGradeGroup);
router.put('/:courseId/students/:studentId/final-grade', saveFinalGrade);
router.patch('/:courseId/students/:studentId/grade-items/:itemKey/adjustment', saveGradeAdjustment);

router.get(
  "/:courseId/students/:studentId/grades",
  getStudentCourseGrades
);

router.get(
  "/:courseId/cohorts",
  getCourseCohorts
);

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

router.get(
  "/:courseId",
  getCourseDetails
);

export default router;


