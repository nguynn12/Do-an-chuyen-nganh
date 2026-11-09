import { requireTeacherAuth } from '../../shared/middleware/authMiddleware.js';
import { getAssignedCourses } from '../services/learningAlertStateService.js';
import express from "express";
import { compareClasses } from "../controllers/comparisonController.js";

const router = express.Router();

// GET /api/comparison
router.get('/', requireTeacherAuth, async (req, res, next) => {
  const ids = [Number(req.query.courseA), Number(req.query.courseB)];
  if (ids.some(id => !Number.isSafeInteger(id) || id <= 0)) return res.status(400).json({success:false,message:'Mã môn so sánh không hợp lệ.'});
  try {
    const assigned = await getAssignedCourses(req.teacher.moodleUserId);
    if (!ids.every(id => assigned.some(course => Number(course.Course_Key) === id || Number(course.Moodle_Course_ID) === id))) {
      return res.status(403).json({success:false,message:'Chỉ được so sánh các lớp bạn phụ trách.'});
    }
    next();
  } catch (error) { next(error); }
}, compareClasses);

export default router;