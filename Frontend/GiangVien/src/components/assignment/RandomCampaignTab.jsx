import React, { useState } from "react";
import {
  Shuffle,
  Users,
  User,
  Calendar,
  Clock,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
  RefreshCw,
  Sparkles,
  ArrowRight,
  ShieldCheck,
  Check,
  ChevronDown,
  Layers,
} from "lucide-react";
import {
  previewRandomDistributionApi,
  confirmAssignmentCampaignApi,
} from "../../services/teacherApi";

export default function RandomCampaignTab({ teacherId, selectedCourse, onCampaignCreated }) {
  const courseId = selectedCourse?.Moodle_Course_ID;

  // Form State
  const [title, setTitle] = useState("Bài tập thực hành Tuần 4");
  const [cohort, setCohort] = useState("K47");
  const [distributionType, setDistributionType] = useState("INDIVIDUAL"); // Mặc định: Random riêng từng sinh viên
  const [easyCount, setEasyCount] = useState(2);
  const [mediumCount, setMediumCount] = useState(2);
  const [hardCount, setHardCount] = useState(1);

  // Time & Policy
  const [openTime, setOpenTime] = useState(() => {
    const d = new Date();
    return new Date(d.getTime() - d.getTimezoneOffset() * 60000)
      .toISOString()
      .slice(0, 16);
  });
  const [dueDate, setDueDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() + 7);
    return new Date(d.getTime() - d.getTimezoneOffset() * 60000)
      .toISOString()
      .slice(0, 16);
  });
  const [allowLate, setAllowLate] = useState(true);
  const [latePenaltyPercent, setLatePenaltyPercent] = useState(10);

  // Preview & Confirm State
  const [previewLoading, setPreviewLoading] = useState(false);
  const [previewData, setPreviewData] = useState(null);
  const [confirming, setConfirming] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [successResult, setSuccessResult] = useState(null);
  const [previewSearchTerm, setPreviewSearchTerm] = useState("");
  const [previewQuestionDetail, setPreviewQuestionDetail] = useState(null);

  const totalQuestions = Number(easyCount) + Number(mediumCount) + Number(hardCount);

  // 1. GỌI API PREVIEW RANDOM
  const handleGeneratePreview = async () => {
    if (!title.trim()) {
      setErrorMessage("Vui lòng nhập tên đợt giao bài.");
      return;
    }
    if (totalQuestions <= 0) {
      setErrorMessage("Vui lòng chọn ít nhất 1 bài tập trong phân bố độ khó.");
      return;
    }
    if (new Date(dueDate) <= new Date(openTime)) {
      setErrorMessage("Hạn nộp bài phải sau thời gian mở bài.");
      return;
    }

    try {
      setPreviewLoading(true);
      setErrorMessage("");
      setSuccessResult(null);

      const res = await previewRandomDistributionApi(teacherId, {
        courseId,
        cohort,
        distributionType,
        easyCount: Number(easyCount),
        mediumCount: Number(mediumCount),
        hardCount: Number(hardCount),
      });

      setPreviewData(res);
    } catch (err) {
      console.error("Lỗi phát sinh preview random:", err);
      setErrorMessage(err.message || "Lỗi khi phát sinh ngẫu nhiên bộ bài tập.");
    } finally {
      setPreviewLoading(false);
    }
  };

  // 2. XÁC NHẬN GIAO BÀI
  const handleConfirmCampaign = async () => {
    if (!previewData || !previewData.previewDistributions) return;

    if (
      !window.confirm(
        `Xác nhận giao ${totalQuestions} bài tập cho ${previewData.totalStudents} sinh viên khóa ${cohort}?\nKết quả random sẽ được lưu cố định và không thể thay đổi sau khi phát hành.`
      )
    ) {
      return;
    }

    try {
      setConfirming(true);
      setErrorMessage("");

      const res = await confirmAssignmentCampaignApi(teacherId, {
        title: title.trim(),
        courseId,
        cohort,
        distributionType,
        easyCount: Number(easyCount),
        mediumCount: Number(mediumCount),
        hardCount: Number(hardCount),
        openTime,
        dueDate,
        allowLate,
        latePenaltyPercent: Number(latePenaltyPercent),
        distributions: previewData.previewDistributions,
      });

      setSuccessResult(res);
      setPreviewData(null);
      if (onCampaignCreated) onCampaignCreated();
    } catch (err) {
      console.error("Lỗi xác nhận đợt giao bài:", err);
      setErrorMessage(err.message || "Không thể xác nhận đợt giao bài.");
    } finally {
      setConfirming(false);
    }
  };

  const getDifficultyBadge = (diff) => {
    switch (diff) {
      case "EASY":
        return <span className="assign-badge badge-green">Dễ</span>;
      case "MEDIUM":
        return <span className="assign-badge badge-amber">Trung bình</span>;
      case "HARD":
        return <span className="assign-badge badge-red">Khó</span>;
      default:
        return <span className="assign-badge badge-gray">{diff}</span>;
    }
  };

  return (
    <div className="assign-tab-content">
      {/* ERROR MESSAGE */}
      {errorMessage && (
        <div className="assign-error-box">
          <AlertCircle size={20} />
          <div>
            <strong>Đã xảy ra lỗi</strong>
            <p>{errorMessage}</p>
          </div>
        </div>
      )}

      {/* SUCCESS RESULT */}
      {successResult && (
        <div className="assign-success-banner">
          <CheckCircle2 size={24} className="banner-success-icon" />
          <div>
            <strong>Giao bài tập thành công!</strong>
            <p>
              {successResult.message ||
                "Đợt giao bài đã được lưu vào hệ thống và phân phối cố định cho sinh viên."}
            </p>
            {successResult.waitingMigration && (
              <small className="notice-migration">
                * Lưu ý: Cơ sở dữ liệu đang ở trạng thái chờ migration. Bản ghi đã được xử lý và kiểm
                thử toàn vẹn.
              </small>
            )}
          </div>
        </div>
      )}

      <div className="campaign-two-columns">
        {/* LEFT COLUMN: CẤU HÌNH ĐỢT GIAO BÀI */}
        <div className="campaign-form-card">
          <div className="card-header-styled">
            <Shuffle size={20} />
            <div>
              <h3>Thiết lập đợt giao bài & Random</h3>
              <p>Môn học: <strong>{selectedCourse?.Course_Name}</strong></p>
            </div>
          </div>

          <div className="campaign-form-body">
            <div className="form-group">
              <label>
                Tên đợt giao bài <span className="text-req">*</span>
              </label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Ví dụ: Bài tập thực hành Tuần 4..."
              />
            </div>

            <div className="form-row-2">
              <div className="form-group">
                <label>Khóa tuyển sinh (Cohort)</label>
                <select value={cohort} onChange={(e) => setCohort(e.target.value)}>
                  <option value="K47">Khóa K47 (sv23...)</option>
                  <option value="K46">Khóa K46 (sv22...)</option>
                  <option value="K45">Khóa K45 (sv21...)</option>
                </select>
              </div>

              <div className="form-group">
                <label>Hình thức phân phối ngẫu nhiên</label>
                <div className="distribution-type-selector">
                  <button
                    type="button"
                    className={`type-btn ${distributionType === "INDIVIDUAL" ? "active" : ""}`}
                    onClick={() => setDistributionType("INDIVIDUAL")}
                    title="Mỗi sinh viên nhận bộ đề ngẫu nhiên riêng rẽ, cùng cơ cấu độ khó"
                  >
                    <User size={15} />
                    <span>Riêng từng SV (Khuyên dùng)</span>
                  </button>
                  <button
                    type="button"
                    className={`type-btn ${distributionType === "CLASS" ? "active" : ""}`}
                    onClick={() => setDistributionType("CLASS")}
                    title="Tất cả sinh viên nhận cùng một bộ câu hỏi"
                  >
                    <Users size={15} />
                    <span>Chung cả lớp</span>
                  </button>
                </div>
              </div>
            </div>

            {/* PHÂN BỐ ĐỘ KHÓ */}
            <div className="difficulty-dist-box">
              <div className="box-title">
                <Layers size={16} />
                <span>Quy tắc phân bố độ khó (Tổng: {totalQuestions} bài)</span>
              </div>

              <div className="diff-inputs-grid">
                <div className="diff-input-item">
                  <span className="assign-badge badge-green">Bài Dễ</span>
                  <input
                    type="number"
                    min="0"
                    max="10"
                    value={easyCount}
                    onChange={(e) => setEasyCount(Math.max(0, parseInt(e.target.value) || 0))}
                  />
                </div>

                <div className="diff-input-item">
                  <span className="assign-badge badge-amber">Bài Trung bình</span>
                  <input
                    type="number"
                    min="0"
                    max="10"
                    value={mediumCount}
                    onChange={(e) => setMediumCount(Math.max(0, parseInt(e.target.value) || 0))}
                  />
                </div>

                <div className="diff-input-item">
                  <span className="assign-badge badge-red">Bài Khó</span>
                  <input
                    type="number"
                    min="0"
                    max="10"
                    value={hardCount}
                    onChange={(e) => setHardCount(Math.max(0, parseInt(e.target.value) || 0))}
                  />
                </div>
              </div>

              <small className="diff-help-text">
                {distributionType === "CLASS"
                  ? "Hệ thống chọn ngẫu nhiên bộ bài chung; tất cả sinh viên trong lớp sẽ nhận cùng một đề này."
                  : "Mỗi sinh viên sẽ nhận một bộ bài riêng rẽ, cùng cấu trúc độ khó và không lặp bài trong bộ."}
              </small>
            </div>

            {/* THỜI GIAN & HẠN NỘP */}
            <div className="form-row-2">
              <div className="form-group">
                <label>Thời gian mở bài</label>
                <input
                  type="datetime-local"
                  value={openTime}
                  onChange={(e) => setOpenTime(e.target.value)}
                />
              </div>

              <div className="form-group">
                <label>Hạn nộp bài (Deadline)</label>
                <input
                  type="datetime-local"
                  value={dueDate}
                  onChange={(e) => setDueDate(e.target.value)}
                />
              </div>
            </div>

            {/* CHÍNH SÁCH NỘP TRỄ */}
            <div className="late-policy-box">
              <label className="checkbox-label">
                <input
                  type="checkbox"
                  checked={allowLate}
                  onChange={(e) => setAllowLate(e.target.checked)}
                />
                <span>Cho phép nộp trễ sau hạn chót</span>
              </label>

              {allowLate && (
                <div className="late-penalty-row">
                  <small>Trừ điểm nộp trễ:</small>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    value={latePenaltyPercent}
                    onChange={(e) => setLatePenaltyPercent(e.target.value)}
                    style={{ width: "70px", padding: "4px 8px" }}
                  />
                  <span>% số điểm đạt được</span>
                </div>
              )}
            </div>

            <button
              type="button"
              className="assign-btn assign-btn-primary btn-generate"
              onClick={handleGeneratePreview}
              disabled={previewLoading}
            >
              <Sparkles size={17} />
              <span>{previewLoading ? "Đang phát sinh ngẫu nhiên..." : "Phát sinh ngẫu nhiên & Xem trước"}</span>
            </button>
          </div>
        </div>

        {/* RIGHT COLUMN: PREVIEW PANEL */}
        <div className="campaign-preview-card">
          <div className="card-header-styled">
            <CheckCircle2 size={20} />
            <div>
              <h3>Kết quả xem trước phân bổ bài tập</h3>
              <p>Kiểm tra kỹ danh sách bài được giao trước khi xác nhận lưu vào hệ thống</p>
            </div>
          </div>

          {!previewData ? (
            <div className="preview-placeholder">
              <Shuffle size={48} className="placeholder-icon" />
              <h4>Chưa có kết quả ngẫu nhiên</h4>
              <p>
                Chọn cấu hình bên trái và bấm <strong>"Phát sinh ngẫu nhiên & Xem trước"</strong> để
                Backend phân bổ câu hỏi cho sinh viên.
              </p>
            </div>
          ) : (
            <div className="preview-results-container">
              {/* SUMMARY STRIP */}
              <div className="preview-summary-bar">
                <div>
                  <span>Đối tượng:</span>
                  <strong>{previewData.totalStudents} sinh viên ({previewData.cohort})</strong>
                </div>
                <div>
                  <span>Hình thức:</span>
                  <strong>
                    {previewData.distributionType === "CLASS" ? "Chung cả lớp" : "Riêng từng sinh viên"}
                  </strong>
                </div>
                <div>
                  <span>Quy tắc:</span>
                  <strong>
                    {previewData.rules.easy} Dễ, {previewData.rules.medium} TB, {previewData.rules.hard} Khó
                  </strong>
                </div>
              </div>

              {/* ACTION BAR */}
              <div className="preview-actions-bar">
                <button
                  type="button"
                  className="assign-btn assign-btn-outline"
                  onClick={handleGeneratePreview}
                  disabled={previewLoading}
                >
                  <RefreshCw size={15} /> Random lại bộ khác
                </button>

                <button
                  type="button"
                  className="assign-btn assign-btn-primary"
                  onClick={handleConfirmCampaign}
                  disabled={confirming}
                >
                  <Check size={16} />
                  <span>{confirming ? "Đang lưu..." : "Xác nhận & Giao bài"}</span>
                </button>
              </div>

              {/* SEARCH & FILTER FOR STUDENTS */}
              <div className="preview-search-row" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', margin: '12px 0 8px 0', padding: '0 4px', flexWrap: 'wrap', gap: '8px' }}>
                <span style={{ fontSize: '13px', color: '#374151', fontWeight: 600 }}>
                  Danh sách phân bổ sinh viên (
                  {previewData.previewDistributions.filter((item) => {
                    if (!previewSearchTerm.trim()) return true;
                    const term = previewSearchTerm.toLowerCase();
                    return (
                      (item.studentName && item.studentName.toLowerCase().includes(term)) ||
                      (item.studentUsername && item.studentUsername.toLowerCase().includes(term))
                    );
                  }).length} / {previewData.previewDistributions.length})
                </span>
                <input
                  type="text"
                  placeholder="🔍 Tìm kiếm sinh viên theo tên, mã SV..."
                  value={previewSearchTerm}
                  onChange={(e) => setPreviewSearchTerm(e.target.value)}
                  style={{
                    padding: '6px 12px',
                    borderRadius: '6px',
                    border: '1px solid #d1d5db',
                    fontSize: '13px',
                    width: '260px',
                    outline: 'none'
                  }}
                />
              </div>

              {/* STUDENT ASSIGNMENTS LIST */}
              <div className="preview-students-list">
                {previewData.previewDistributions
                  .filter((item) => {
                    if (!previewSearchTerm.trim()) return true;
                    const term = previewSearchTerm.toLowerCase();
                    return (
                      (item.studentName && item.studentName.toLowerCase().includes(term)) ||
                      (item.studentUsername && item.studentUsername.toLowerCase().includes(term))
                    );
                  })
                  .map((item, index) => (
                    <div key={item.studentId} className="preview-student-row">
                      <div className="student-badge-info">
                        <div className="student-index-badge">{index + 1}</div>
                        <div>
                          <strong>{item.studentName}</strong>
                          <small>{item.studentUsername} • {item.studentEmail}</small>
                        </div>
                      </div>

                      <div className="student-assigned-tasks">
                        {item.assignedQuestions.map((q) => (
                          <div
                            key={q.id}
                            className="assigned-task-chip"
                            onClick={() => setPreviewQuestionDetail(q)}
                            style={{ cursor: "pointer" }}
                            title="Bấm để xem chi tiết đề bài và tiêu chí chấm"
                          >
                            <span className="task-chip-title">{q.title}</span>
                            <span className="task-chip-meta">
                              {getDifficultyBadge(q.difficulty)}
                              <small>{q.maxScore || 10}đ</small>
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* MODAL XEM CHI TIẾT CÂU HỎI TRONG PREVIEW */}
      {previewQuestionDetail && (
        <div className="assign-modal-backdrop" onClick={() => setPreviewQuestionDetail(null)}>
          <div className="assign-modal-card" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '600px' }}>
            <div className="modal-header">
              <h3>{previewQuestionDetail.title}</h3>
              <button
                type="button"
                className="modal-close-btn"
                onClick={() => setPreviewQuestionDetail(null)}
              >
                ✕
              </button>
            </div>
            <div className="modal-body">
              <div style={{ display: 'flex', gap: '8px', marginBottom: '12px', alignItems: 'center' }}>
                {getDifficultyBadge(previewQuestionDetail.difficulty)}
                <span className="assign-badge badge-gray">{previewQuestionDetail.topic || 'Chủ đề chung'}</span>
                <span className="assign-badge badge-green">Thang điểm: {previewQuestionDetail.maxScore || 10}đ</span>
              </div>
              <div style={{ marginBottom: '16px' }}>
                <label style={{ fontWeight: 600, fontSize: '13px', color: '#374151' }}>Nội dung đề bài:</label>
                <p style={{ marginTop: '4px', fontSize: '14px', lineHeight: '1.6', background: '#f9fafb', padding: '12px', borderRadius: '6px', border: '1px solid #e5e7eb' }}>
                  {previewQuestionDetail.content || 'Đề bài thực hành theo yêu cầu của môn học.'}
                </p>
              </div>
              {previewQuestionDetail.gradingGuide && (
                <div>
                  <label style={{ fontWeight: 600, fontSize: '13px', color: '#374151' }}>Tiêu chí chấm điểm (Rubric):</label>
                  <p style={{ marginTop: '4px', fontSize: '13px', color: '#4b5563', background: '#f0fdf4', padding: '10px', borderRadius: '6px', border: '1px solid #bbf7d0' }}>
                    {previewQuestionDetail.gradingGuide}
                  </p>
                </div>
              )}
            </div>
            <div className="modal-footer">
              <button
                type="button"
                className="assign-btn assign-btn-primary"
                onClick={() => setPreviewQuestionDetail(null)}
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
