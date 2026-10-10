import express from "express";
import {
  getAssignmentBank,
  createAssignmentBankItem,
  updateAssignmentBankItem,
  previewRandomDistribution,
  confirmAssignmentCampaign,
  getAssignmentCampaigns,
  getGradingSubmissions,
  submitGrading,
} from "../controllers/assignmentController.js";

const router = express.Router();

// 1. Ngân hàng bài tập
router.get("/:teacherId/assignments/bank", getAssignmentBank);
router.post("/:teacherId/assignments/bank", createAssignmentBankItem);
router.put("/:teacherId/assignments/bank/:itemId", updateAssignmentBankItem);

// 2. Random giao bài & đợt giao bài
router.post("/:teacherId/assignments/campaigns/preview-random", previewRandomDistribution);
router.post("/:teacherId/assignments/campaigns", confirmAssignmentCampaign);
router.get("/:teacherId/assignments/campaigns", getAssignmentCampaigns);

// 3. Chấm điểm bài nộp
router.get("/:teacherId/grading/submissions", getGradingSubmissions);
router.post("/:teacherId/grading/submissions/:submissionId/grade", submitGrading);

export default router;
