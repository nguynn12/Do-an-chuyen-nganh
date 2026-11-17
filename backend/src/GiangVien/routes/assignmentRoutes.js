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

import {requireTeacherAuth} from '../../shared/middleware/authMiddleware.js';
import {getAssignmentMonitoring} from '../services/assignmentMonitoringService.js';
import {requireOwnTeacherPath} from '../../shared/middleware/teacherPathIdentity.js';
const router = express.Router();
router.param('teacherId',(req,res,next)=>requireTeacherAuth(req,res,()=>requireOwnTeacherPath(req,res,next)));
router.get('/:teacherId/assignments/monitor',async(req,res)=>{
  try {
    if(Number(req.params.teacherId)!==Number(req.teacher.moodleUserId)) return res.status(403).json({success:false,message:'Danh tính giảng viên không khớp phiên đăng nhập.'});
    const result=await getAssignmentMonitoring(Number(req.teacher.moodleUserId),Number(req.query.courseId));
    return res.json({success:true,...result});
  } catch(error) {return res.status(error.status || 500).json({success:false,message:error.status?error.message:'Không tải được dữ liệu theo dõi bài tập. Vui lòng thử lại.'});}
});

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
