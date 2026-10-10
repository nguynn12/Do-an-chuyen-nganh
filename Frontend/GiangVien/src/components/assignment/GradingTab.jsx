import React, { useState, useEffect, useMemo } from "react";
import {
  ClipboardCheck,
  CheckCircle2,
  AlertTriangle,
  Clock3,
  Search,
  Filter,
  ArrowRight,
  ArrowLeft,
  X,
  ExternalLink,
  BookOpen,
  User,
  Save,
  Check,
  History,
  AlertCircle,
  FileText,
  ChevronRight,
  ChevronLeft,
} from "lucide-react";
import {
  getGradingSubmissionsApi,
  submitGradingApi,
} from "../../services/teacherApi";

export default function GradingTab({
  teacherId,
  selectedCourse,
  courses,
  onCourseChange,
}) {
  const [submissions, setSubmissions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [stats, setStats] = useState({
    total: 0,
    ungradedCount: 0,
    gradedCount: 0,
    lateCount: 0,
  });

  // Filters
  const [cohortFilter, setCohortFilter] = useState("ALL");
  const [gradingFilter, setGradingFilter] = useState("ALL"); // ALL, UNGRADED, GRADED
  const [timingFilter, setTimingFilter] = useState("ALL"); // ALL, ONTIME, LATE
  const [searchTerm, setSearchTerm] = useState("");

  // Grading Modal / Drawer State
  const [activeSubmission, setActiveSubmission] = useState(null);
  const [scoreInput, setScoreInput] = useState("");
  const [feedbackInput, setFeedbackInput] = useState("");
  const [reasonInput, setReasonInput] = useState("");
  const [gradingError, setGradingError] = useState("");
  const [gradingSubmitting, setGradingSubmitting] = useState(false);
  const [successToast, setSuccessToast] = useState("");

  const courseId = selectedCourse?.Moodle_Course_ID;

  // 1. TẢI DANH SÁCH BÀI NỘP
  const loadSubmissions = async () => {
    if (!teacherId) return;
    try {
      setLoading(true);
      setError("");
      const res = await getGradingSubmissionsApi(teacherId, {
        courseId: courseId || undefined,
        cohort: cohortFilter !== "ALL" ? cohortFilter : undefined,
        gradingStatus: gradingFilter !== "ALL" ? gradingFilter : undefined,
        submissionStatus: timingFilter !== "ALL" ? timingFilter : undefined,
        search: searchTerm || undefined,
      });

      setSubmissions(res.data || []);
      setStats({
        total: res.total || 0,
        ungradedCount: res.ungradedCount || 0,
        gradedCount: res.gradedCount || 0,
        lateCount: res.lateCount || 0,
      });
    } catch (err) {
      console.error("Lỗi getGradingSubmissions:", err);
      setError(err.message || "Không thể tải danh sách bài nộp.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSubmissions();
  }, [teacherId, courseId, cohortFilter, gradingFilter, timingFilter, searchTerm]);

  // 2. MỞ MÀN HÌNH CHẤM BÀI CHI TIẾT
  const handleOpenGradingModal = (sub) => {
    setActiveSubmission(sub);
    setScoreInput(sub.grade !== null && sub.grade !== undefined ? String(sub.grade) : "");
    setFeedbackInput(sub.feedback || "");
    setReasonInput("");
    setGradingError("");
  };

  // 3. ĐIỀU HƯỚNG BÀI TRƯỚC / SAU LIÊN TIẾP
  const currentSubIndex = useMemo(() => {
    if (!activeSubmission) return -1;
    return submissions.findIndex(
      (s) => s.submissionId === activeSubmission.submissionId
    );
  }, [activeSubmission, submissions]);

  const handleNavigateNext = () => {
    if (currentSubIndex >= 0 && currentSubIndex < submissions.length - 1) {
      handleOpenGradingModal(submissions[currentSubIndex + 1]);
    }
  };

  const handleNavigatePrev = () => {
    if (currentSubIndex > 0) {
      handleOpenGradingModal(submissions[currentSubIndex - 1]);
    }
  };

  // 4. LƯU CHẤM ĐIỂM (LƯU NHÁP HOẶC CÔNG BỐ)
  const handleSubmitGrade = async (isPublish) => {
    if (!activeSubmission) return;
    setGradingError("");

    const scoreNum = parseFloat(scoreInput);
    if (isNaN(scoreNum)) {
      setGradingError("Vui lòng nhập điểm số là số hợp lệ.");
      return;
    }
    if (scoreNum < 0) {
      setGradingError("Điểm số không được là số âm.");
      return;
    }
    const maxScore = Number(activeSubmission.maxGrade || 10.0);
    if (scoreNum > maxScore) {
      setGradingError(`Điểm số không được vượt quá thang điểm tối đa (${maxScore}).`);
      return;
    }

    const isUpdate = Number(activeSubmission.isGraded) === 1;
    if (isUpdate && isPublish && !reasonInput.trim()) {
      setGradingError("Bài tập này đã có điểm trước đó. Vui lòng nhập lý do điều chỉnh điểm.");
      return;
    }

    try {
      setGradingSubmitting(true);
      const res = await submitGradingApi(teacherId, activeSubmission.submissionId, {
        score: scoreNum,
        feedback: feedbackInput.trim(),
        isPublish,
        reason: reasonInput.trim(),
      });

      setSuccessToast(res.message || "Lưu điểm thành công!");
      setTimeout(() => setSuccessToast(""), 4000);

      // Cập nhật lại danh sách ngầm
      await loadSubmissions();

      // Cập nhật trạng thái của bài đang mở
      setActiveSubmission((prev) => ({
        ...prev,
        grade: scoreNum,
        isGraded: isPublish ? 1 : 0,
        feedback: feedbackInput.trim(),
      }));
    } catch (err) {
      console.error("Lỗi chấm bài:", err);
      setGradingError(err.message || "Không thể lưu điểm chấm.");
    } finally {
      setGradingSubmitting(false);
    }
  };

  // Avatar helper
  const getAvatarLetter = (name) => {
    if (!name) return "?";
    const parts = String(name).trim().split(/\s+/);
    return parts[parts.length - 1]?.charAt(0)?.toUpperCase() || "?";
  };

  return (
    <div className="assign-tab-content">
      {/* TOAST SUCCESS */}
      {successToast && (
        <div className="assign-toast-success">
          <CheckCircle2 size={18} />
          <span>{successToast}</span>
        </div>
      )}

      {/* KPI METRIC STRIP */}
      <div className="grading-metrics-grid">
        <div className="grading-metric-card">
          <div className="metric-icon-wrap icon-amber">
            <ClipboardCheck size={22} />
          </div>
          <div>
            <div className="metric-title">Bài chờ chấm</div>
            <div className="metric-val text-amber">{stats.ungradedCount}</div>
          </div>
        </div>

        <div className="grading-metric-card">
          <div className="metric-icon-wrap icon-green">
            <CheckCircle2 size={22} />
          </div>
          <div>
            <div className="metric-title">Đã chấm điểm</div>
            <div className="metric-val text-green">{stats.gradedCount}</div>
          </div>
        </div>

        <div className="grading-metric-card">
          <div className="metric-icon-wrap icon-rose">
            <Clock3 size={22} />
          </div>
          <div>
            <div className="metric-title">Bài nộp trễ</div>
            <div className="metric-val text-rose">{stats.lateCount}</div>
          </div>
        </div>

        <div className="grading-metric-card">
          <div className="metric-icon-wrap icon-blue">
            <BookOpen size={22} />
          </div>
          <div>
            <div className="metric-title">Tổng số bài nộp</div>
            <div className="metric-val">{stats.total}</div>
          </div>
        </div>
      </div>

      {/* ADVANCED FILTER TOOLBAR */}
      <div className="grading-filter-bar">
        <div className="grading-search-wrap">
          <Search size={18} />
          <input
            type="text"
            placeholder="Tìm theo tên, mã sinh viên hoặc bài tập..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        <div className="grading-selects-wrap">
          {/* Lọc Khóa */}
          <div className="assign-select-wrap">
            <select
              value={cohortFilter}
              onChange={(e) => setCohortFilter(e.target.value)}
            >
              <option value="ALL">Tất cả khóa (K45, K46, K47)</option>
              <option value="K47">Khóa K47 (sv23...)</option>
              <option value="K46">Khóa K46 (sv22...)</option>
              <option value="K45">Khóa K45 (sv21...)</option>
            </select>
          </div>

          {/* Lọc Trạng thái chấm */}
          <div className="assign-select-wrap">
            <select
              value={gradingFilter}
              onChange={(e) => setGradingFilter(e.target.value)}
            >
              <option value="ALL">Tất cả bài</option>
              <option value="UNGRADED">Chưa chấm ({stats.ungradedCount})</option>
              <option value="GRADED">Đã chấm ({stats.gradedCount})</option>
            </select>
          </div>

          {/* Lọc Tình trạng nộp */}
          <div className="assign-select-wrap">
            <select
              value={timingFilter}
              onChange={(e) => setTimingFilter(e.target.value)}
            >
              <option value="ALL">Tất cả thời gian</option>
              <option value="ONTIME">Đúng hạn</option>
              <option value="LATE">Nộp trễ</option>
            </select>
          </div>
        </div>
      </div>

      {/* ERROR */}
      {error && (
        <div className="assign-error-box">
          <AlertCircle size={18} />
          <span>{error}</span>
        </div>
      )}

      {/* SUBMISSIONS LIST */}
      {loading ? (
        <div className="assign-loading-box">
          <div className="assign-spinner" />
          <span>Đang đồng bộ bài nộp từ hệ thống LMS...</span>
        </div>
      ) : submissions.length === 0 ? (
        <div className="assign-empty-box">
          <ClipboardCheck size={42} className="empty-icon" />
          <h3>Không có bài nộp nào phù hợp</h3>
          <p>Hãy thử thay đổi tiêu chí lọc hoặc từ khóa tìm kiếm.</p>
        </div>
      ) : (
        <div className="grading-submissions-container">
          <table className="assign-table">
            <thead>
              <tr>
                <th>Sinh viên</th>
                <th>Bài tập & Môn học</th>
                <th>Thời điểm nộp</th>
                <th>Tình trạng</th>
                <th>Trạng thái chấm</th>
                <th>Điểm số</th>
                <th className="text-right">Hành động</th>
              </tr>
            </thead>
            <tbody>
              {submissions.map((sub) => {
                const isOnTime = Number(sub.isSubmittedOnTime) === 1;
                const isGraded = Number(sub.isGraded) === 1;

                return (
                  <tr key={sub.submissionId}>
                    <td>
                      <div className="grading-student-cell">
                        <div className="student-circle-avatar">
                          {getAvatarLetter(sub.studentName)}
                        </div>
                        <div>
                          <strong>{sub.studentName}</strong>
                          <small>
                            {sub.studentUsername} • {sub.studentEmail}
                          </small>
                        </div>
                      </div>
                    </td>

                    <td>
                      <div className="grading-task-cell">
                        <strong>{sub.activityName}</strong>
                        <span>
                          {sub.courseCode} - {sub.courseName}
                        </span>
                      </div>
                    </td>

                    <td>
                      <div className="grading-timing-cell">
                        <span>Nộp: {sub.submitDate || "Chưa ghi nhận"}</span>
                        <small>Hạn: {sub.dueDate}</small>
                      </div>
                    </td>

                    <td>
                      {isOnTime ? (
                        <span className="badge-timing ontime">
                          <CheckCircle2 size={13} /> Đúng hạn
                        </span>
                      ) : (
                        <span className="badge-timing late">
                          <AlertTriangle size={13} /> Nộp trễ
                        </span>
                      )}
                    </td>

                    <td>
                      {isGraded ? (
                        <span className="badge-grade-status graded">Đã công bố</span>
                      ) : sub.grade !== null && sub.grade !== undefined ? (
                        <span className="badge-grade-status draft">Lưu nháp</span>
                      ) : (
                        <span className="badge-grade-status pending">Chờ chấm</span>
                      )}
                    </td>

                    <td>
                      <div className="grading-score-display">
                        <strong>
                          {sub.grade !== null && sub.grade !== undefined
                            ? Number(sub.grade).toFixed(1)
                            : "—"}
                        </strong>
                        <small>/ {sub.maxGrade || 10}</small>
                      </div>
                    </td>

                    <td>
                      <div className="table-actions-group text-right">
                        <button
                          type="button"
                          className="assign-btn assign-btn-primary btn-sm"
                          onClick={() => handleOpenGradingModal(sub)}
                        >
                          {isGraded ? "Sửa điểm" : "Chấm bài"}
                          <ArrowRight size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* ========================================================
          MODAL CHẤM BÀI CHI TIẾT (INTERACTIVE GRADING MODAL)
      ======================================================== */}
      {activeSubmission && (
        <div className="assign-modal-overlay">
          <div className="grading-drawer-card">
            {/* DRAWER TOP BAR */}
            <div className="grading-drawer-header">
              <div className="drawer-title-area">
                <span className="eyebrow-grading">
                  CHẤM ĐIỂM BÀI TẬP #{activeSubmission.submissionId}
                </span>
                <h2>{activeSubmission.activityName}</h2>
                <span className="course-breadcrumb-text">
                  {activeSubmission.courseCode} — {activeSubmission.courseName}
                </span>
              </div>

              {/* CONSECUTIVE NAVIGATION */}
              <div className="drawer-consecutive-nav">
                <button
                  type="button"
                  className="nav-btn-icon"
                  disabled={currentSubIndex <= 0}
                  onClick={handleNavigatePrev}
                  title="Bài nộp trước đó"
                >
                  <ChevronLeft size={18} />
                </button>
                <span className="nav-index-indicator">
                  {currentSubIndex + 1} / {submissions.length}
                </span>
                <button
                  type="button"
                  className="nav-btn-icon"
                  disabled={currentSubIndex >= submissions.length - 1}
                  onClick={handleNavigateNext}
                  title="Bài nộp kế tiếp"
                >
                  <ChevronRight size={18} />
                </button>
                <button
                  type="button"
                  className="btn-modal-close"
                  onClick={() => setActiveSubmission(null)}
                >
                  <X size={18} />
                </button>
              </div>
            </div>

            {/* DRAWER CONTENT: 2 COLUMNS */}
            <div className="grading-drawer-body">
              {/* LEFT COLUMN: ĐỀ BÀI VÀ BÀI LÀM CỦA SINH VIÊN */}
              <div className="grading-student-panel">
                <div className="student-profile-strip">
                  <div className="student-circle-avatar large">
                    {getAvatarLetter(activeSubmission.studentName)}
                  </div>
                  <div>
                    <h3>{activeSubmission.studentName}</h3>
                    <span>
                      MSSV: <strong>{activeSubmission.studentUsername}</strong> • Email:{" "}
                      {activeSubmission.studentEmail}
                    </span>
                  </div>
                </div>

                <div className="grading-info-tags">
                  <div className="tag-box">
                    <small>Thời điểm nộp:</small>
                    <strong>{activeSubmission.submitDate || "14/10/2026"}</strong>
                  </div>
                  <div className="tag-box">
                    <small>Hạn chót (Deadline):</small>
                    <strong>{activeSubmission.dueDate}</strong>
                  </div>
                  <div className="tag-box">
                    <small>Tình trạng nộp:</small>
                    {Number(activeSubmission.isSubmittedOnTime) === 1 ? (
                      <span className="text-green font-semibold">Đúng hạn</span>
                    ) : (
                      <span className="text-rose font-semibold">Nộp trễ</span>
                    )}
                  </div>
                  <div className="tag-box">
                    <small>Thang điểm tối đa:</small>
                    <strong>{activeSubmission.maxGrade || 10} điểm</strong>
                  </div>
                </div>

                {/* YÊU CẦU ĐỀ BÀI */}
                <div className="paper-section">
                  <h4>
                    <FileText size={16} /> Đề bài & Hướng dẫn
                  </h4>
                  <div className="paper-content-box">
                    <p>
                      <strong>Yêu cầu: </strong>
                      Hoàn thành đầy đủ các câu hỏi của bài tập {activeSubmission.activityName}.
                      Trình bày chi tiết giải thuật hoặc mã nguồn truy vấn tương ứng.
                    </p>
                  </div>
                </div>

                {/* NỘI DUNG BÀI LÀM CỦA SINH VIÊN */}
                <div className="paper-section">
                  <h4>
                    <CheckCircle2 size={16} /> Bài làm của sinh viên
                  </h4>
                  <div className="paper-submission-content">
                    <p className="student-answer-text">
                      "Dạ thưa Thầy/Cô, em đã hoàn thành bài tập thực hành theo yêu cầu đề bài. Em
                      đã nộp đúng cú pháp, kiểm thử các trường hợp biên và đính kèm đầy đủ tài liệu
                      chứng minh kết quả."
                    </p>
                    <div className="submission-file-attachment">
                      <FileText size={20} className="file-icon" />
                      <div>
                        <strong>
                          BaiLam_{activeSubmission.studentUsername}_{activeSubmission.activityName}.pdf
                        </strong>
                        <small>Kích thước: 1.2 MB • Định dạng chuẩn</small>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* RIGHT COLUMN: Ô NHẬP ĐIỂM & NHẬN XÉT */}
              <div className="grading-control-panel">
                <div className="control-panel-heading">
                  <h3>Nhập kết quả chấm</h3>
                  <p>
                    Thang điểm tối đa: <strong>{activeSubmission.maxGrade || 10} điểm</strong>
                  </p>
                </div>

                {gradingError && (
                  <div className="grading-error-alert">
                    <AlertCircle size={16} />
                    <span>{gradingError}</span>
                  </div>
                )}

                {/* Ô NHẬP ĐIỂM */}
                <div className="grading-score-input-group">
                  <label>
                    Điểm số <span className="text-req">*</span>
                  </label>
                  <div className="score-input-wrap">
                    <input
                      type="number"
                      step="0.1"
                      min="0"
                      max={activeSubmission.maxGrade || 10}
                      value={scoreInput}
                      onChange={(e) => setScoreInput(e.target.value)}
                      placeholder="0.0 - 10.0"
                    />
                    <span className="score-max-affix">
                      / {activeSubmission.maxGrade || 10}
                    </span>
                  </div>
                  <small className="help-text">
                    Điểm từ 0 đến {activeSubmission.maxGrade || 10}. Không nhập số âm hoặc vượt thang điểm.
                  </small>
                </div>

                {/* Ô NHẬP NHẬN XÉT */}
                <div className="grading-form-group">
                  <label>Nhận xét / Phản hồi cho sinh viên</label>
                  <textarea
                    rows={4}
                    value={feedbackInput}
                    onChange={(e) => setFeedbackInput(e.target.value)}
                    placeholder="Ví dụ: Bài làm tốt, câu 2 trình bày rõ ràng, cần tối ưu thêm thời gian chạy..."
                  />
                </div>

                {/* NẾU SỬA ĐIỂM: Ô NHẬP LÝ DO ĐIỀU CHỈNH */}
                {Number(activeSubmission.isGraded) === 1 && (
                  <div className="grading-form-group reason-box">
                    <label>
                      Lý do điều chỉnh điểm <span className="text-req">*</span>
                    </label>
                    <textarea
                      rows={2}
                      value={reasonInput}
                      onChange={(e) => setReasonInput(e.target.value)}
                      placeholder="Ghi nhận vào audit log: Ví dụ: Phúc khảo câu 2, cộng điểm chuyên cần..."
                    />
                    <small className="help-text">
                      Lịch sử chỉnh sửa điểm sẽ được lưu vĩnh viễn phục vụ thanh tra đào tạo.
                    </small>
                  </div>
                )}

                {/* NÚT THAO TÁC */}
                <div className="grading-action-buttons">
                  <button
                    type="button"
                    className="assign-btn assign-btn-ghost btn-draft"
                    disabled={gradingSubmitting}
                    onClick={() => handleSubmitGrade(false)}
                  >
                    <Save size={16} />
                    <span>Lưu nháp điểm</span>
                  </button>

                  <button
                    type="button"
                    className="assign-btn assign-btn-primary btn-publish"
                    disabled={gradingSubmitting}
                    onClick={() => handleSubmitGrade(true)}
                  >
                    <Check size={16} />
                    <span>
                      {gradingSubmitting ? "Đang xử lý..." : "Xác nhận & Công bố điểm"}
                    </span>
                  </button>
                </div>

                {/* AUDIT LOG PREVIEW */}
                <div className="audit-log-preview-box">
                  <div className="audit-header">
                    <History size={15} />
                    <span>Lịch sử chấm điểm</span>
                  </div>
                  <div className="audit-content">
                    {activeSubmission.grade !== null && activeSubmission.grade !== undefined ? (
                      <p>
                        Điểm ghi nhận: <strong>{activeSubmission.grade}đ</strong> • Trạng thái:{" "}
                        {activeSubmission.isGraded === 1 ? "Đã công bố" : "Lưu nháp"}
                      </p>
                    ) : (
                      <p className="text-gray">Chưa có lịch sử chấm cho bài nộp này.</p>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
