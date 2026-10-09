import React, { useState, useEffect } from "react";
import {
  BookOpen,
  Plus,
  Search,
  Filter,
  CheckCircle2,
  Clock,
  Archive,
  Edit,
  Eye,
  AlertCircle,
  HelpCircle,
  X,
  Layers,
  Sparkles,
} from "lucide-react";
import {
  getAssignmentBankApi,
  createAssignmentBankItemApi,
  updateAssignmentBankItemApi,
} from "../../services/teacherApi";

export default function AssignmentBankTab({ teacherId, selectedCourse, courses }) {
  const [bankItems, setBankItems] = useState([]);
  const [stats, setStats] = useState({ total: 0, easy: 0, medium: 0, hard: 0, active: 0 });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [waitingMigration, setWaitingMigration] = useState(false);
  const [migrationMessage, setMigrationMessage] = useState("");

  // Filters
  const [difficultyFilter, setDifficultyFilter] = useState("ALL");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [searchTerm, setSearchTerm] = useState("");

  // Modals
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState(null);
  const [editingItem, setEditingItem] = useState(null);

  // Form State
  const [formData, setFormData] = useState({
    title: "",
    content: "",
    topic: "",
    difficulty: "MEDIUM",
    maxScore: "10.00",
    gradingGuide: "",
    status: "ACTIVE",
  });
  const [formError, setFormError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");

  const courseId = selectedCourse?.Moodle_Course_ID;

  // Load bank items
  const loadBank = async () => {
    if (!courseId || !teacherId) return;
    try {
      setLoading(true);
      setError("");
      const res = await getAssignmentBankApi(teacherId, courseId, {
        difficulty: difficultyFilter,
        status: statusFilter,
        search: searchTerm,
      });

      setBankItems(res.data || []);
      setStats(res.stats || { total: 0, easy: 0, medium: 0, hard: 0, active: 0 });
      setWaitingMigration(Boolean(res.waitingMigration));
      setMigrationMessage(res.message || "");
    } catch (err) {
      console.error("Lỗi tải ngân hàng bài tập:", err);
      setError(err.message || "Không thể tải ngân hàng bài tập.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadBank();
  }, [courseId, teacherId, difficultyFilter, statusFilter, searchTerm]);

  // Open Create Modal
  const handleOpenCreate = () => {
    setEditingItem(null);
    setFormData({
      title: "",
      content: "",
      topic: "",
      difficulty: "MEDIUM",
      maxScore: "10.00",
      gradingGuide: "",
      status: "ACTIVE",
    });
    setFormError("");
    setIsCreateModalOpen(true);
  };

  // Open Edit Modal
  const handleOpenEdit = (item) => {
    setEditingItem(item);
    setFormData({
      title: item.title,
      content: item.content,
      topic: item.topic,
      difficulty: item.difficulty,
      maxScore: String(item.maxScore),
      gradingGuide: item.gradingGuide || "",
      status: item.status,
    });
    setFormError("");
    setIsCreateModalOpen(true);
  };

  // View Details
  const handleViewDetail = (item) => {
    setSelectedItem(item);
    setIsDetailModalOpen(true);
  };

  // Archive Item
  const handleArchive = async (item) => {
    if (!window.confirm(`Bạn có chắc muốn lưu trữ bài tập "${item.title}" không?`)) {
      return;
    }
    try {
      await updateAssignmentBankItemApi(teacherId, item.id, {
        status: item.status === "ARCHIVED" ? "ACTIVE" : "ARCHIVED",
      });
      setSuccessMessage("Cập nhật trạng thái bài tập thành công.");
      setTimeout(() => setSuccessMessage(""), 4000);
      loadBank();
    } catch (err) {
      alert(err.message || "Không thể cập nhật trạng thái bài tập.");
    }
  };

  // Submit Form
  const handleSubmitForm = async (e) => {
    e.preventDefault();
    setFormError("");

    // Validate
    if (!formData.title.trim()) {
      setFormError("Vui lòng nhập tiêu đề bài tập.");
      return;
    }
    if (!formData.content.trim()) {
      setFormError("Vui lòng nhập nội dung đề bài.");
      return;
    }
    if (!formData.topic.trim()) {
      setFormError("Vui lòng nhập chủ đề hoặc chương học.");
      return;
    }
    const score = Number(formData.maxScore);
    if (isNaN(score) || score <= 0) {
      setFormError("Thang điểm tối đa phải là số lớn hơn 0.");
      return;
    }

    try {
      setSubmitting(true);
      if (editingItem) {
        await updateAssignmentBankItemApi(teacherId, editingItem.id, {
          ...formData,
          courseId,
        });
        setSuccessMessage("Cập nhật bài tập thành công.");
      } else {
        await createAssignmentBankItemApi(teacherId, {
          ...formData,
          courseId,
        });
        setSuccessMessage("Thêm bài tập mới vào ngân hàng thành công.");
      }

      setIsCreateModalOpen(false);
      setTimeout(() => setSuccessMessage(""), 4000);
      loadBank();
    } catch (err) {
      setFormError(err.message || "Có lỗi xảy ra khi lưu bài tập.");
    } finally {
      setSubmitting(false);
    }
  };

  // Helper badge màu độ khó
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
      {/* MIGRATION NOTICE BANNER */}
      {waitingMigration && (
        <div className="assign-banner-info">
          <AlertCircle size={20} className="banner-icon" />
          <div className="banner-text">
            <strong>Trạng thái chuẩn bị Migration CSDL</strong>
            <p>
              Bản SQL khởi tạo bảng ngân hàng bài tập đã sẵn sàng tại{" "}
              <code>Database/31_create_assignment_management.sql</code>. Hệ thống đang hiển thị bộ đề
              mẫu thực tế cho môn học <strong>{selectedCourse?.Course_Name}</strong> để giảng viên
              trải nghiệm và kiểm thử.
            </p>
          </div>
        </div>
      )}

      {/* SUCCESS MESSAGE */}
      {successMessage && (
        <div className="assign-banner-success">
          <CheckCircle2 size={18} />
          <span>{successMessage}</span>
        </div>
      )}

      {/* STATS STRIP */}
      <div className="assign-stats-grid">
        <div className="assign-stat-card">
          <div className="stat-icon-wrap icon-green">
            <BookOpen size={20} />
          </div>
          <div>
            <div className="stat-label">Tổng bài trong ngân hàng</div>
            <div className="stat-value">{stats.total}</div>
          </div>
        </div>

        <div className="assign-stat-card">
          <div className="stat-icon-wrap icon-emerald">
            <Layers size={20} />
          </div>
          <div>
            <div className="stat-label">Bài Dễ (Easy)</div>
            <div className="stat-value">{stats.easy}</div>
          </div>
        </div>

        <div className="assign-stat-card">
          <div className="stat-icon-wrap icon-amber">
            <Sparkles size={20} />
          </div>
          <div>
            <div className="stat-label">Bài Trung bình (Medium)</div>
            <div className="stat-value">{stats.medium}</div>
          </div>
        </div>

        <div className="assign-stat-card">
          <div className="stat-icon-wrap icon-rose">
            <AlertCircle size={20} />
          </div>
          <div>
            <div className="stat-label">Bài Khó (Hard)</div>
            <div className="stat-value">{stats.hard}</div>
          </div>
        </div>
      </div>

      {/* TOOLBAR */}
      <div className="assign-toolbar-wrap">
        <div className="assign-search-box">
          <Search size={18} />
          <input
            type="text"
            placeholder="Tìm theo tiêu đề, nội dung hoặc chủ đề..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        <div className="assign-filters-row">
          <div className="assign-select-wrap">
            <Filter size={15} />
            <select
              value={difficultyFilter}
              onChange={(e) => setDifficultyFilter(e.target.value)}
            >
              <option value="ALL">Tất cả độ khó</option>
              <option value="EASY">Dễ</option>
              <option value="MEDIUM">Trung bình</option>
              <option value="HARD">Khó</option>
            </select>
          </div>

          <div className="assign-select-wrap">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
            >
              <option value="ALL">Tất cả trạng thái</option>
              <option value="ACTIVE">Đang sử dụng</option>
              <option value="ARCHIVED">Lưu trữ</option>
            </select>
          </div>

          <button
            type="button"
            className="assign-btn assign-btn-primary"
            onClick={handleOpenCreate}
          >
            <Plus size={16} />
            <span>Thêm bài tập mới</span>
          </button>
        </div>
      </div>

      {/* ERROR */}
      {error && (
        <div className="assign-error-box">
          <AlertCircle size={18} />
          <span>{error}</span>
        </div>
      )}

      {/* TABLE / LIST */}
      {loading ? (
        <div className="assign-loading-box">
          <div className="assign-spinner" />
          <span>Đang tải ngân hàng bài tập...</span>
        </div>
      ) : bankItems.length === 0 ? (
        <div className="assign-empty-box">
          <BookOpen size={40} className="empty-icon" />
          <h3>Không tìm thấy bài tập nào</h3>
          <p>Chưa có bài tập nào phù hợp với bộ lọc hiện tại trong môn học này.</p>
          <button
            type="button"
            className="assign-btn assign-btn-outline"
            onClick={handleOpenCreate}
          >
            <Plus size={16} /> Thêm bài tập đầu tiên
          </button>
        </div>
      ) : (
        <div className="assign-table-container">
          <table className="assign-table">
            <thead>
              <tr>
                <th>Mã</th>
                <th>Tiêu đề bài tập</th>
                <th>Chủ đề / Chương</th>
                <th>Độ khó</th>
                <th>Thang điểm</th>
                <th>Trạng thái</th>
                <th>Đã giao</th>
                <th className="text-right">Thao tác</th>
              </tr>
            </thead>
            <tbody>
              {bankItems.map((item) => (
                <tr key={item.id}>
                  <td>
                    <code className="assign-code">#{item.id}</code>
                  </td>
                  <td>
                    <div className="item-title-wrap">
                      <strong>{item.title}</strong>
                      <small className="item-snippet">
                        {item.content?.length > 70
                          ? item.content.substring(0, 70) + "..."
                          : item.content}
                      </small>
                    </div>
                  </td>
                  <td>
                    <span className="topic-tag">{item.topic}</span>
                  </td>
                  <td>{getDifficultyBadge(item.difficulty)}</td>
                  <td>
                    <strong>{item.maxScore}</strong> điểm
                  </td>
                  <td>
                    {item.status === "ACTIVE" ? (
                      <span className="status-pill status-active">Hoạt động</span>
                    ) : item.status === "DRAFT" ? (
                      <span className="status-pill status-draft">Bản nháp</span>
                    ) : (
                      <span className="status-pill status-archived">Lưu trữ</span>
                    )}
                  </td>
                  <td>
                    <span className="badge-distributed">
                      {item.distributedCount || 0} lần
                    </span>
                  </td>
                  <td>
                    <div className="table-actions-group">
                      <button
                        type="button"
                        className="btn-action-icon"
                        title="Xem chi tiết"
                        onClick={() => handleViewDetail(item)}
                      >
                        <Eye size={16} />
                      </button>
                      <button
                        type="button"
                        className="btn-action-icon"
                        title="Chỉnh sửa"
                        onClick={() => handleOpenEdit(item)}
                      >
                        <Edit size={16} />
                      </button>
                      <button
                        type="button"
                        className={`btn-action-icon ${
                          item.status === "ARCHIVED" ? "text-green" : "text-amber"
                        }`}
                        title={
                          item.status === "ARCHIVED"
                            ? "Kích hoạt lại"
                            : "Ngừng sử dụng (Lưu trữ)"
                        }
                        onClick={() => handleArchive(item)}
                      >
                        <Archive size={16} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* MODAL: CREATE / EDIT ASSIGNMENT */}
      {isCreateModalOpen && (
        <div className="assign-modal-overlay">
          <div className="assign-modal-card">
            <div className="assign-modal-header">
              <div>
                <h3>{editingItem ? "Chỉnh sửa bài tập" : "Thêm bài tập vào ngân hàng"}</h3>
                <p>
                  Môn học: <strong>{selectedCourse?.Course_Name}</strong>
                </p>
              </div>
              <button
                type="button"
                className="btn-modal-close"
                onClick={() => setIsCreateModalOpen(false)}
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSubmitForm} className="assign-modal-form">
              {formError && (
                <div className="form-error-banner">
                  <AlertCircle size={16} />
                  <span>{formError}</span>
                </div>
              )}

              <div className="form-group">
                <label>
                  Tiêu đề bài tập <span className="text-req">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ví dụ: Truy vấn SQL kết hợp JOIN nhiều bảng..."
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                />
              </div>

              <div className="form-row-2">
                <div className="form-group">
                  <label>
                    Chủ đề / Chương <span className="text-req">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Ví dụ: Chương 3: Ngôn ngữ SQL"
                    value={formData.topic}
                    onChange={(e) => setFormData({ ...formData, topic: e.target.value })}
                  />
                </div>

                <div className="form-group">
                  <label>
                    Độ khó <span className="text-req">*</span>
                  </label>
                  <select
                    value={formData.difficulty}
                    onChange={(e) =>
                      setFormData({ ...formData, difficulty: e.target.value })
                    }
                  >
                    <option value="EASY">Dễ (Easy)</option>
                    <option value="MEDIUM">Trung bình (Medium)</option>
                    <option value="HARD">Khó (Hard)</option>
                  </select>
                </div>
              </div>

              <div className="form-row-2">
                <div className="form-group">
                  <label>
                    Thang điểm tối đa <span className="text-req">*</span>
                  </label>
                  <input
                    type="number"
                    step="0.5"
                    min="0.5"
                    max="100"
                    required
                    value={formData.maxScore}
                    onChange={(e) => setFormData({ ...formData, maxScore: e.target.value })}
                  />
                </div>

                <div className="form-group">
                  <label>Trạng thái</label>
                  <select
                    value={formData.status}
                    onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                  >
                    <option value="ACTIVE">Hoạt động (Sẵn sàng giao)</option>
                    <option value="DRAFT">Lưu nháp</option>
                    <option value="ARCHIVED">Lưu trữ</option>
                  </select>
                </div>
              </div>

              <div className="form-group">
                <label>
                  Nội dung đề bài chi tiết <span className="text-req">*</span>
                </label>
                <textarea
                  rows={4}
                  required
                  placeholder="Mô tả yêu cầu bài toán, các bước thực hiện hoặc định dạng đầu ra..."
                  value={formData.content}
                  onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                />
              </div>

              <div className="form-group">
                <label>Hướng dẫn chấm / Tiêu chí Rubric (Tùy chọn)</label>
                <textarea
                  rows={3}
                  placeholder="Ví dụ: Đúng cú pháp: 4đ. Tối ưu truy vấn: 3đ. Trình bày sạch sẽ: 3đ..."
                  value={formData.gradingGuide}
                  onChange={(e) =>
                    setFormData({ ...formData, gradingGuide: e.target.value })
                  }
                />
              </div>

              <div className="assign-modal-footer">
                <button
                  type="button"
                  className="assign-btn assign-btn-ghost"
                  onClick={() => setIsCreateModalOpen(false)}
                >
                  Hủy bỏ
                </button>
                <button
                  type="submit"
                  className="assign-btn assign-btn-primary"
                  disabled={submitting}
                >
                  {submitting ? "Đang lưu..." : editingItem ? "Lưu thay đổi" : "Tạo bài tập"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: DETAIL VIEW */}
      {isDetailModalOpen && selectedItem && (
        <div className="assign-modal-overlay">
          <div className="assign-modal-card">
            <div className="assign-modal-header">
              <div>
                <span className="eyebrow-code">Bài tập #{selectedItem.id}</span>
                <h3>{selectedItem.title}</h3>
              </div>
              <button
                type="button"
                className="btn-modal-close"
                onClick={() => setIsDetailModalOpen(false)}
              >
                <X size={18} />
              </button>
            </div>

            <div className="detail-modal-body">
              <div className="detail-meta-strip">
                <div>
                  <small>Chủ đề:</small>
                  <strong>{selectedItem.topic}</strong>
                </div>
                <div>
                  <small>Độ khó:</small>
                  <div>{getDifficultyBadge(selectedItem.difficulty)}</div>
                </div>
                <div>
                  <small>Thang điểm tối đa:</small>
                  <strong>{selectedItem.maxScore} điểm</strong>
                </div>
                <div>
                  <small>Trạng thái:</small>
                  <strong>{selectedItem.status}</strong>
                </div>
              </div>

              <div className="detail-section">
                <h4>Nội dung đề bài</h4>
                <div className="content-box-display">{selectedItem.content}</div>
              </div>

              {selectedItem.gradingGuide && (
                <div className="detail-section">
                  <h4>Hướng dẫn & Tiêu chí chấm</h4>
                  <div className="guide-box-display">{selectedItem.gradingGuide}</div>
                </div>
              )}
            </div>

            <div className="assign-modal-footer">
              <button
                type="button"
                className="assign-btn assign-btn-outline"
                onClick={() => {
                  setIsDetailModalOpen(false);
                  handleOpenEdit(selectedItem);
                }}
              >
                <Edit size={15} /> Chỉnh sửa
              </button>
              <button
                type="button"
                className="assign-btn assign-btn-ghost"
                onClick={() => setIsDetailModalOpen(false)}
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
