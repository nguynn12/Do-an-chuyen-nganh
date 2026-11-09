import express from "express";
import { requireCourseTeacher } from "../../shared/middleware/authMiddleware.js";
import { handleAiAssistantQuery } from "../controllers/aiAssistantController.js";
import { handleClassroomChat } from '../controllers/classroomAssistantController.js';

const router = express.Router();

/**
 * Endpoint AI Assistant LMS: Phân tích yêu cầu và trả về dữ liệu biểu đồ
 * POST /api/ai/assistant/query
 * Header: Authorization: Bearer <teacherToken>
 * Body: { courseId, promptText }
 */
router.post("/query", requireCourseTeacher, handleAiAssistantQuery);
router.post('/chat', requireCourseTeacher, handleClassroomChat);

export default router;
