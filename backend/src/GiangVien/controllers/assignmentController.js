import * as assignmentService from "../services/assignmentService.js";

// ============================================================
// 1. NGÂN HÀNG BÀI TẬP
// ============================================================

export async function getAssignmentBank(req, res) {
  try {
    const { teacherId } = req.params;
    const { courseId, difficulty, topic, status, search } = req.query;

    if (!courseId) {
      return res.status(400).json({
        success: false,
        message: "Vui lòng cung cấp courseId để tải ngân hàng bài tập.",
      });
    }

    const result = await assignmentService.getAssignmentBank(teacherId, courseId, {
      difficulty,
      topic,
      status,
      search,
    });

    return res.json({
      success: true,
      ...result,
    });
  } catch (error) {
    console.error("Lỗi getAssignmentBank:", error);
    return res.status(400).json({
      success: false,
      message: error.message || "Lỗi khi lấy ngân hàng bài tập.",
    });
  }
}

export async function createAssignmentBankItem(req, res) {
  try {
    const { teacherId } = req.params;
    const itemData = req.body;

    const result = await assignmentService.createAssignmentBankItem(teacherId, itemData);

    return res.status(201).json({
      success: true,
      ...result,
    });
  } catch (error) {
    console.error("Lỗi createAssignmentBankItem:", error);
    return res.status(400).json({
      success: false,
      message: error.message || "Không thể tạo bài tập vào ngân hàng.",
    });
  }
}

export async function updateAssignmentBankItem(req, res) {
  try {
    const { teacherId, itemId } = req.params;
    const itemData = req.body;

    const result = await assignmentService.updateAssignmentBankItem(teacherId, itemId, itemData);

    return res.json({
      success: true,
      ...result,
    });
  } catch (error) {
    console.error("Lỗi updateAssignmentBankItem:", error);
    return res.status(400).json({
      success: false,
      message: error.message || "Không thể cập nhật bài tập.",
    });
  }
}

// ============================================================
// 2. RANDOM GIAO BÀI & ĐỢT GIAO BÀI
// ============================================================

export async function previewRandomDistribution(req, res) {
  try {
    const { teacherId } = req.params;
    const { courseId, cohort, distributionType, easyCount, mediumCount, hardCount } = req.body;

    if (!courseId) {
      return res.status(400).json({
        success: false,
        message: "Vui lòng chọn môn học để thực hiện phân phối bài tập.",
      });
    }

    const result = await assignmentService.previewRandomDistribution({
      teacherId,
      courseId,
      cohort,
      distributionType,
      easyCount,
      mediumCount,
      hardCount,
    });

    return res.json({
      success: true,
      ...result,
    });
  } catch (error) {
    console.error("Lỗi previewRandomDistribution:", error);
    return res.status(400).json({
      success: false,
      message: error.message || "Lỗi khi phát sinh ngẫu nhiên bộ bài tập.",
    });
  }
}

export async function confirmAssignmentCampaign(req, res) {
  try {
    const { teacherId } = req.params;
    const campaignPayload = req.body;

    const result = await assignmentService.confirmAssignmentCampaign(teacherId, campaignPayload);

    return res.status(201).json({
      success: true,
      ...result,
    });
  } catch (error) {
    console.error("Lỗi confirmAssignmentCampaign:", error);
    return res.status(400).json({
      success: false,
      message: error.message || "Không thể xác nhận đợt giao bài tập.",
    });
  }
}

export async function getAssignmentCampaigns(req, res) {
  try {
    const { teacherId } = req.params;
    const { courseId } = req.query;

    if (!courseId) {
      return res.status(400).json({
        success: false,
        message: "Vui lòng cung cấp courseId để tải danh sách đợt giao bài.",
      });
    }

    const result = await assignmentService.getAssignmentCampaigns(teacherId, courseId);

    return res.json({
      success: true,
      ...result,
    });
  } catch (error) {
    console.error("Lỗi getAssignmentCampaigns:", error);
    return res.status(400).json({
      success: false,
      message: error.message || "Lỗi khi tải danh sách đợt giao bài.",
    });
  }
}

// ============================================================
// 3. CHẤM ĐIỂM BÀI NỘP
// ============================================================

export async function getGradingSubmissions(req, res) {
  try {
    const { teacherId } = req.params;
    const { courseId, cohort, submissionStatus, gradingStatus, search } = req.query;

    const result = await assignmentService.getGradingSubmissions(teacherId, {
      courseId,
      cohort,
      submissionStatus,
      gradingStatus,
      search,
    });

    return res.json({
      success: true,
      ...result,
    });
  } catch (error) {
    console.error("Lỗi getGradingSubmissions:", error);
    return res.status(500).json({
      success: false,
      message: error.message || "Không thể tải danh sách bài nộp cần chấm.",
    });
  }
}

export async function submitGrading(req, res) {
  try {
    const { teacherId, submissionId } = req.params;
    const { score, feedback, isPublish, reason } = req.body;

    const result = await assignmentService.submitGrading({
      teacherId,
      submissionId,
      score,
      feedback,
      isPublish,
      reason,
    });

    return res.json({
      success: true,
      ...result,
    });
  } catch (error) {
    console.error("Lỗi submitGrading:", error);
    return res.status(400).json({
      success: false,
      message: error.message || "Không thể lưu điểm chấm.",
    });
  }
}
