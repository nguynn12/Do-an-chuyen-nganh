import React, { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import {
  BellRing,
  AlertTriangle,
  Clock,
  HelpCircle,
  Info,
  CheckCheck,
  Search,
  Plus,
  ArrowRight,
  Trash2,
  BookOpen,
  Filter,
  CheckCircle2,
  X,
  Send,
  Sparkles,
} from "lucide-react";

import Header from "../components/Header";
import Sidebar from "../components/Sidebar";
import LoadingScreen from "../components/common/LoadingScreen";
import ErrorScreen from "../components/common/ErrorScreen";
import useTeacherDashboard from "../hooks/useTeacherDashboard";
import { getTeacherLearningAlertsApi } from "../services/teacherApi";

import "../styles/TeacherOverview.css";
import "../styles/Messages.css";

export default function Messages() {
  const navigate = useNavigate();
  const { teacher, courses, loading, error } = useTeacherDashboard();

  const [notifications, setNotifications] = useState([]);
  const [alertsLoading, setAlertsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("all"); // all, risk, deadline, support, system
  const [searchKeyword, setSearchKeyword] = useState("");
  const [onlyUnread, setOnlyUnread] = useState(false);
  const [showComposeModal, setShowComposeModal] = useState(false);

  // Form soạn thông báo
  const [newTitle, setNewTitle] = useState("");
  const [newDesc, setNewDesc] = useState("");
  const [newCourse, setNewCourse] = useState("Tất cả các lớp phụ trách");
  const [newType, setNewType] = useState("deadline");

  // NẠP DỮ LIỆU THẬT 100% TỪ CƠ SỞ DỮ LIỆU DATA WAREHOUSE (fact_assignment_submission, dim_user, dim_course)
  useEffect(() => {
    if (!teacher?.id) return;

    setAlertsLoading(true);
    getTeacherLearningAlertsApi(teacher.id)
      .then((data) => {
        if (Array.isArray(data)) {
          setNotifications(data);
        }
      })
      .catch((err) => {
        console.error("Lỗi nạp cảnh báo học tập từ CSDL:", err);
      })
      .finally(() => {
        setAlertsLoading(false);
      });
  }, [teacher?.id]);

  // Đếm thống kê
  const stats = useMemo(() => {
    const risk = notifications.filter((n) => n.type === "risk").length;
    const deadline = notifications.filter((n) => n.type === "deadline").length;
    const support = notifications.filter((n) => n.type === "support").length;
    const unread = notifications.filter((n) => n.unread).length;
    return { risk, deadline, support, unread, total: notifications.length };
  }, [notifications]);

  // Lọc danh sách
  const filteredList = useMemo(() => {
    return notifications.filter((item) => {
      // Lọc theo Tab
      if (activeTab !== "all" && item.type !== activeTab) {
        return false;
      }
      // Lọc chưa đọc
      if (onlyUnread && !item.unread) {
        return false;
      }
      // Tìm kiếm
      if (searchKeyword.trim()) {
        const kw = searchKeyword.toLowerCase();
        const matchTitle = item.title.toLowerCase().includes(kw);
        const matchDesc = item.desc.toLowerCase().includes(kw);
        const matchCourse = item.courseName.toLowerCase().includes(kw);
        return matchTitle || matchDesc || matchCourse;
      }
      return true;
    });
  }, [notifications, activeTab, onlyUnread, searchKeyword]);

  // Đánh dấu 1 thông báo là đã đọc / chưa đọc
  const toggleRead = (id) => {
    setNotifications((prev) =>
      prev.map((item) =>
        item.id === id ? { ...item, unread: !item.unread } : item
      )
    );
  };

  // Đánh dấu tất cả đã đọc
  const markAllAsRead = () => {
    setNotifications((prev) => prev.map((item) => ({ ...item, unread: false })));
  };

  // Xóa thông báo
  const deleteNotification = (id) => {
    setNotifications((prev) => prev.filter((item) => item.id !== id));
  };

  // Gửi thông báo mới
  const handleSendBroadcast = (e) => {
    e.preventDefault();
    if (!newTitle.trim() || !newDesc.trim()) return;

    const matchedCourse = courses.find((c) => c.name === newCourse);
    const targetCourseId = matchedCourse ? (matchedCourse.courseId || matchedCourse.id) : null;

    const newItem = {
      id: Date.now(),
      type: newType,
      title: newTitle.trim(),
      desc: newDesc.trim(),
      courseName: newCourse,
      courseId: targetCourseId,
      time: "Vừa xong",
      unread: true,
      priority: newType === "risk" ? "high" : "medium",
      actionPath: targetCourseId ? `/quan-ly-lop/${targetCourseId}` : null,
      actionLabel: targetCourseId ? "Xem phân tích lớp" : null,
    };

    setNotifications([newItem, ...notifications]);
    setNewTitle("");
    setNewDesc("");
    setShowComposeModal(false);
  };

  if (loading) {
    return <LoadingScreen />;
  }

  if (error || !teacher) {
    return <ErrorScreen message={error || "Thiếu dữ liệu giảng viên."} />;
  }

  return (
    <div className="app">
      {/* HEADER */}
      <Header teacher={teacher} />

      {/* SIDEBAR */}
      <Sidebar />

      {/* NỘI DUNG CHÍNH */}
      <main className="page messages-layout">
        <div className="messages-page">
          {/* 1. HERO BANNER */}
          <section className="messages-hero">
            <div className="messages-hero-main">
              <div className="messages-hero-icon">
                <BellRing size={28} />
              </div>
              <div>
                <div className="messages-breadcrumb">
                  <BookOpen size={13} />
                  <span>Quản trị giảng dạy</span>
                  <span>/</span>
                  <strong>Cảnh báo học tập</strong>
                </div>
                <span className="messages-hero-kicker">
                  LEARNING ANALYTICS ALERT CENTER
                </span>
                <h1>Trung tâm Thông báo &amp; Cảnh báo Học tập</h1>
                <p>
                  Theo dõi kịp thời các cảnh báo rủi ro sinh viên, nhắc nhở hạn chót bài tập và các thông báo vận hành từ LMS.
                </p>
              </div>
            </div>

            <div className="messages-hero-actions">
              <button
                type="button"
                className="btn-compose"
                onClick={() => setShowComposeModal(true)}
              >
                <Plus size={16} /> Gửi thông báo lớp
              </button>
            </div>
          </section>

          {/* 2. STATS CARDS GRID */}
          <section className="messages-stats-grid">
            <div className="messages-stat-card">
              <div className="stat-icon-wrapper stat-icon-red">
                <AlertTriangle size={22} />
              </div>
              <div className="stat-info">
                <span className="stat-label">Cảnh báo rủi ro học tập</span>
                <span className="stat-value">{stats.risk}</span>
                <span className="stat-sub">Điểm thấp &amp; nộp trễ nhiều</span>
              </div>
            </div>

            <div className="messages-stat-card">
              <div className="stat-icon-wrapper stat-icon-orange">
                <Clock size={22} />
              </div>
              <div className="stat-info">
                <span className="stat-label">Hạn chót &amp; Chờ chấm</span>
                <span className="stat-value">{stats.deadline}</span>
                <span className="stat-sub">Bài Lab đến hạn &amp; trễ hạn</span>
              </div>
            </div>

            <div className="messages-stat-card">
              <div className="stat-icon-wrapper stat-icon-blue">
                <HelpCircle size={22} />
              </div>
              <div className="stat-info">
                <span className="stat-label">Yêu cầu &amp; Thắc mắc</span>
                <span className="stat-value">{stats.support}</span>
                <span className="stat-sub">Đăng ký nộp muộn, học bù</span>
              </div>
            </div>

            <div className="messages-stat-card">
              <div className="stat-icon-wrapper stat-icon-green">
                <CheckCircle2 size={22} />
              </div>
              <div className="stat-info">
                <span className="stat-label">Chưa đọc</span>
                <span className="stat-value">{stats.unread}</span>
                <span className="stat-sub">Trên tổng số {stats.total} tin</span>
              </div>
            </div>
          </section>

          {/* 3. TOOLBAR */}
          <section className="messages-toolbar">
            <div className="messages-tabs">
              <button
                type="button"
                className={`tab-btn ${activeTab === "all" ? "active" : ""}`}
                onClick={() => setActiveTab("all")}
              >
                Tất cả <span className="tab-count">{stats.total}</span>
              </button>

              <button
                type="button"
                className={`tab-btn ${activeTab === "risk" ? "active" : ""}`}
                onClick={() => setActiveTab("risk")}
              >
                <AlertTriangle size={14} color="#d32f2f" /> Cảnh báo rủi ro{" "}
                <span className="tab-count">{stats.risk}</span>
              </button>

              <button
                type="button"
                className={`tab-btn ${activeTab === "deadline" ? "active" : ""}`}
                onClick={() => setActiveTab("deadline")}
              >
                <Clock size={14} color="#e65100" /> Hạn nộp bài{" "}
                <span className="tab-count">{stats.deadline}</span>
              </button>

              <button
                type="button"
                className={`tab-btn ${activeTab === "support" ? "active" : ""}`}
                onClick={() => setActiveTab("support")}
              >
                <HelpCircle size={14} color="#1565c0" /> Thắc mắc sinh viên{" "}
                <span className="tab-count">{stats.support}</span>
              </button>

              <button
                type="button"
                className={`tab-btn ${activeTab === "system" ? "active" : ""}`}
                onClick={() => setActiveTab("system")}
              >
                <Info size={14} /> Hệ thống LMS
              </button>
            </div>

            <div className="messages-actions-right">
              <div className="search-box">
                <Search size={15} className="search-icon" />
                <input
                  type="text"
                  placeholder="Tìm thông báo, mã môn..."
                  value={searchKeyword}
                  onChange={(e) => setSearchKeyword(e.target.value)}
                />
              </div>

              <button
                type="button"
                className="action-btn-secondary"
                onClick={() => setOnlyUnread(!onlyUnread)}
                style={{
                  backgroundColor: onlyUnread ? "#e8f5e9" : "#ffffff",
                  borderColor: onlyUnread ? "#37883e" : "#dfe4e1",
                  color: onlyUnread ? "#2e7d32" : "#445048",
                }}
              >
                <Filter size={13} /> {onlyUnread ? "Đang lọc: Chưa đọc" : "Chưa đọc"}
              </button>

              {stats.unread > 0 && (
                <button
                  type="button"
                  className="action-btn-secondary"
                  onClick={markAllAsRead}
                  title="Đánh dấu tất cả đã đọc"
                >
                  <CheckCheck size={14} /> Đọc tất cả
                </button>
              )}
            </div>
          </section>

          {/* 4. NOTIFICATIONS LIST CONTAINER */}
          <section className="messages-container">
            {alertsLoading ? (
              <div className="messages-empty" style={{ padding: "48px 20px" }}>
                <div className="loading-spinner" style={{ margin: "0 auto 16px" }} />
                <h3>Đang trích xuất cảnh báo học tập...</h3>
                <p>Hệ thống đang phân tích dữ liệu bài nộp và bảng điểm thực tế từ Data Warehouse.</p>
              </div>
            ) : filteredList.length === 0 ? (
              <div className="messages-empty">
                <div className="messages-empty-icon">
                  <CheckCircle2 size={30} />
                </div>
                <h3>Không có thông báo nào phù hợp</h3>
                <p>Mọi cảnh báo học tập và thông báo hệ thống đều đã được xử lý.</p>
              </div>
            ) : (
              filteredList.map((item) => {
                const isRisk = item.type === "risk";
                const isDeadline = item.type === "deadline";
                const isSupport = item.type === "support";

                return (
                  <div
                    key={item.id}
                    className={`notification-item ${item.unread ? "unread" : ""}`}
                  >
                    {/* ICON THEO LOẠI */}
                    <div
                      className="notification-icon-col"
                      style={{
                        backgroundColor: isRisk
                          ? "#fde8e8"
                          : isDeadline
                          ? "#fff3e0"
                          : isSupport
                          ? "#e3f2fd"
                          : "#f3f5f4",
                        color: isRisk
                          ? "#d32f2f"
                          : isDeadline
                          ? "#e65100"
                          : isSupport
                          ? "#1565c0"
                          : "#55635b",
                      }}
                    >
                      {isRisk ? (
                        <AlertTriangle size={20} />
                      ) : isDeadline ? (
                        <Clock size={20} />
                      ) : isSupport ? (
                        <HelpCircle size={20} />
                      ) : (
                        <Info size={20} />
                      )}
                    </div>

                    {/* NỘI DUNG */}
                    <div className="notification-body">
                      <div className="notification-header-row">
                        <div className="notification-title-group">
                          <h4 className="notification-title">{item.title}</h4>
                          <span
                            className={`notification-badge ${
                              isRisk
                                ? "badge-risk"
                                : isDeadline
                                ? "badge-deadline"
                                : isSupport
                                ? "badge-support"
                                : "badge-system"
                            }`}
                          >
                            {isRisk
                              ? "Cảnh báo rủi ro"
                              : isDeadline
                              ? "Nhắc nhở hạn nộp"
                              : isSupport
                              ? "Thắc mắc sinh viên"
                              : "Thông báo hệ thống"}
                          </span>
                        </div>
                        <span className="notification-time">{item.time}</span>
                      </div>

                      <p className="notification-desc">{item.desc}</p>

                      <div className="notification-footer">
                        <div className="notification-course-tag">
                          <BookOpen size={12} />
                          <span>{item.courseName}</span>
                        </div>

                        <div className="notification-actions">
                          {item.actionPath && (
                            <button
                              type="button"
                              className="btn-item-action primary"
                              onClick={() => navigate(item.actionPath)}
                            >
                              <span>{item.actionLabel}</span>
                              <ArrowRight size={13} />
                            </button>
                          )}

                          <button
                            type="button"
                            className="btn-item-action"
                            onClick={() => toggleRead(item.id)}
                            title={item.unread ? "Đánh dấu đã đọc" : "Đánh dấu chưa đọc"}
                          >
                            {item.unread ? "Đã đọc" : "Chưa đọc"}
                          </button>

                          <button
                            type="button"
                            className="btn-item-action"
                            onClick={() => deleteNotification(item.id)}
                            title="Xóa thông báo"
                            style={{ color: "#d32f2f" }}
                          >
                            <Trash2 size={13} />
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </section>
        </div>
      </main>

      {/* 5. MODAL SOẠN THÔNG BÁO LỚP */}
      {showComposeModal && (
        <div className="modal-overlay" onClick={() => setShowComposeModal(false)}>
          <div
            className="compose-modal"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="modal-header">
              <div className="modal-title-group">
                <Sparkles size={18} color="#37883e" />
                <h2>Soạn thông báo gửi lớp học</h2>
              </div>
              <button
                type="button"
                className="btn-modal-close"
                onClick={() => setShowComposeModal(false)}
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSendBroadcast}>
              <div className="modal-body">
                <div className="form-group">
                  <label>Gửi đến học phần / lớp học:</label>
                  <select
                    value={newCourse}
                    onChange={(e) => setNewCourse(e.target.value)}
                  >
                    <option value="Tất cả các lớp phụ trách">
                      Tất cả các lớp phụ trách
                    </option>
                    {Array.isArray(courses) &&
                      courses.map((c) => (
                        <option key={c.id || c.courseId} value={c.name}>
                          {c.name} ({c.code || "DLU"})
                        </option>
                      ))}
                  </select>
                </div>

                <div className="form-group">
                  <label>Phân loại thông báo:</label>
                  <select
                    value={newType}
                    onChange={(e) => setNewType(e.target.value)}
                  >
                    <option value="deadline">Nhắc nhở hạn nộp bài tập / Lab</option>
                    <option value="risk">Cảnh báo tình hình học tập &amp; chuyên cần</option>
                    <option value="support">Thông báo lịch học bù / thi thử</option>
                    <option value="system">Thông báo tài liệu học phần mới</option>
                  </select>
                </div>

                <div className="form-group">
                  <label>Tiêu đề thông báo:</label>
                  <input
                    type="text"
                    required
                    placeholder="VD: Nhắc nhở hạn chót nộp bài thực hành Lab 4..."
                    value={newTitle}
                    onChange={(e) => setNewTitle(e.target.value)}
                  />
                </div>

                <div className="form-group">
                  <label>Nội dung chi tiết thông báo:</label>
                  <textarea
                    rows={4}
                    required
                    placeholder="Nhập nội dung nhắc nhở sinh viên về yêu cầu bài nộp, thời gian hết hạn hoặc tiêu chí đánh giá..."
                    value={newDesc}
                    onChange={(e) => setNewDesc(e.target.value)}
                  />
                </div>
              </div>

              <div className="modal-footer">
                <button
                  type="button"
                  className="action-btn-secondary"
                  onClick={() => setShowComposeModal(false)}
                >
                  Hủy bỏ
                </button>
                <button type="submit" className="btn-compose">
                  <Send size={14} /> Phát thông báo ngay
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
