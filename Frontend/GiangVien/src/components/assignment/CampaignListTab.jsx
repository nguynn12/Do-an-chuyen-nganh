import React, { useState, useEffect } from "react";
import {
  Layers,
  Calendar,
  Clock,
  Users,
  CheckCircle2,
  AlertCircle,
  Eye,
  FileText,
  ShieldAlert,
} from "lucide-react";
import { getAssignmentCampaignsApi } from "../../services/teacherApi";

export default function CampaignListTab({ teacherId, selectedCourse }) {
  const [campaigns, setCampaigns] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [waitingMigration, setWaitingMigration] = useState(false);

  const courseId = selectedCourse?.Moodle_Course_ID;

  const loadCampaigns = async () => {
    if (!teacherId || !courseId) return;
    try {
      setLoading(true);
      setError("");
      const res = await getAssignmentCampaignsApi(teacherId, courseId);
      setCampaigns(res.data || []);
      setWaitingMigration(Boolean(res.waitingMigration));
    } catch (err) {
      console.error("Lỗi tải danh sách đợt giao bài:", err);
      setError(err.message || "Không thể tải danh sách đợt giao bài.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCampaigns();
  }, [teacherId, courseId]);

  return (
    <div className="assign-tab-content">
      {/* NOTICE BANNER */}
      {waitingMigration && (
        <div className="assign-banner-info">
          <AlertCircle size={20} className="banner-icon" />
          <div className="banner-text">
            <strong>Trạng thái đợt giao bài</strong>
            <p>
              Bảng <code>assignment_campaign</code> đang chờ migration CSDL. Khi xác nhận đợt giao mới,
              hệ thống sẽ lưu vết lịch sử giao bài ngẫu nhiên tại đây.
            </p>
          </div>
        </div>
      )}

      {/* ERROR */}
      {error && (
        <div className="assign-error-box">
          <AlertCircle size={18} />
          <span>{error}</span>
        </div>
      )}

      {/* TABLE */}
      {loading ? (
        <div className="assign-loading-box">
          <div className="assign-spinner" />
          <span>Đang tải các đợt giao bài...</span>
        </div>
      ) : campaigns.length === 0 ? (
        <div className="assign-empty-box">
          <Layers size={40} className="empty-icon" />
          <h3>Chưa có đợt giao bài nào</h3>
          <p>
            Chuyển sang tab <strong>"Tạo đợt giao & Random"</strong> để khởi tạo đợt giao bài tập đầu
            tiên cho môn <strong>{selectedCourse?.Course_Name}</strong>.
          </p>
        </div>
      ) : (
        <div className="assign-table-container">
          <table className="assign-table">
            <thead>
              <tr>
                <th>Mã đợt</th>
                <th>Tên đợt giao bài</th>
                <th>Khóa (Cohort)</th>
                <th>Hình thức giao</th>
                <th>Cấu trúc đề</th>
                <th>Thời gian mở & Hạn nộp</th>
                <th>Đã giao / Nộp</th>
                <th>Trạng thái</th>
              </tr>
            </thead>
            <tbody>
              {campaigns.map((camp) => (
                <tr key={camp.id}>
                  <td>
                    <code className="assign-code">#{camp.id}</code>
                  </td>
                  <td>
                    <strong>{camp.title}</strong>
                  </td>
                  <td>
                    <span className="topic-tag">{camp.cohort}</span>
                  </td>
                  <td>
                    {camp.distributionType === "CLASS" ? (
                      <span className="assign-badge badge-emerald">Chung cả lớp</span>
                    ) : (
                      <span className="assign-badge badge-blue">Riêng từng SV</span>
                    )}
                  </td>
                  <td>
                    <small>
                      {camp.easyCount} Dễ • {camp.mediumCount} TB • {camp.hardCount} Khó (Tổng:{" "}
                      {camp.totalQuestions} bài)
                    </small>
                  </td>
                  <td>
                    <div className="date-time-cell">
                      <span>Mở: {new Date(camp.openTime).toLocaleDateString("vi-VN")}</span>
                      <small className="text-red">
                        Hạn: {new Date(camp.dueDate).toLocaleDateString("vi-VN")}
                      </small>
                    </div>
                  </td>
                  <td>
                    <span>
                      {camp.studentCount || 0} SV (Đã nộp: {camp.submittedCount || 0})
                    </span>
                  </td>
                  <td>
                    <span
                      className={`status-pill ${
                        camp.status === "OPEN"
                          ? "status-active"
                          : camp.status === "EXPIRED"
                          ? "status-draft"
                          : "status-archived"
                      }`}
                    >
                      {camp.status === "OPEN" ? "Đang mở" : camp.status === "EXPIRED" ? "Hết hạn" : "Đã đóng"}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
