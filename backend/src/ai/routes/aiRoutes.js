import express from "express";
import { apiKeyMiddleware } from "../middlewares/apiKeyMiddleware.js";
import {
  verifyKey,
  getStudentStudyCoach,
} from "../controllers/studentAIController.js";

const router = express.Router();

/**
 * 1. Ping xác thực API Key
 * POST /api/ai/verify-key
 */
router.post("/verify-key", apiKeyMiddleware, verifyKey);

/**
 * 2. Cố vấn học tập cá nhân hóa cho sinh viên
 * GET /api/ai/student/coach
 */
router.get("/student/coach", apiKeyMiddleware, getStudentStudyCoach);

export default router;

