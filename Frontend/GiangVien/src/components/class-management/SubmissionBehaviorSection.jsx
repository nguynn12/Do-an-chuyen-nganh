import { useEffect, useMemo, useState } from "react";
import {
  Clock,
  AlertTriangle,
  CheckCircle2,
  Calendar,
  Layers,
  ChevronDown,
  Search,
  Filter,
  BarChart2,
  Info,
} from "lucide-react";
import { getCourseSubmissionBehavior } from "../../services/teacherApi";

// Màu sắc cho các bucket thời gian nộp
const BUCKET_CONFIG = {
  "Trễ hạn": {
    color: "#dc2626",
    bg: "#fee2e2",
    border: "#fca5a5",
    desc: "Nộp sau hạn chót (< 0h)",
  },
  "Dưới 24 giờ": {
    color: "#d97706",
    bg: "#fef3c7",
    border: "#fcd34d",
    desc: "Nộp sát hạn trong vòng 24h",
  },
  "1-3 ngày": {
    color: "#37883e",
    bg: "#dcfce7",
    border: "#86efac",
    desc: "Nộp trước hạn 1 đến 3 ngày",
  },
  "Sớm hơn 3 ngày": {
    color: "#2563eb",
    bg: "#dbeafe",
    border: "#93c5fd",
    desc: "Nộp rất sớm (> 3 ngày)",
  },
  "Chưa nộp": {
    color: "#6b7280",
    bg: "#f3f4f6",
    border: "#d1d5db",
    desc: "Chưa nộp hoặc bản nháp",
  },
};

// Màu sắc badge cho các Submit Style
const STYLE_BADGES = {
  "Hay trễ hạn": {
    badgeClass: "badge-late",
    bg: "#fee2e2",
    color: "#991b1b",
    border: "#f87171",
  },
  "Nước rút phút chót": {
    badgeClass: "badge-last-minute",
    bg: "#fef3c7",
    color: "#92400e",
    border: "#fbbf24",
  },
  "Làm đều": {
    badgeClass: "badge-regular",
    bg: "#dcfce7",
    color: "#166534",
    border: "#4ade80",
  },
  "Làm sớm": {
    badgeClass: "badge-early",
    bg: "#dbeafe",
    color: "#1e40af",
    border: "#60a5fa",
  },
  "Chưa có dữ liệu": {
    badgeClass: "badge-nodata",
    bg: "#f3f4f6",
    color: "#4b5563",
    border: "#d1d5db",
  },
};

export default function SubmissionBehaviorSection({ courseId }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Bộ lọc
  const [selectedStyle, setSelectedStyle] = useState("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [expandedStudentKey, setExpandedStudentKey] = useState(null);

  useEffect(() => {
    let isCancelled = false;

    async function loadBehavior() {
      if (!courseId) return;
      try {
        setLoading(true);
        setError(null);
        const res = await getCourseSubmissionBehavior(courseId);
        if (!isCancelled) {
          setData(res);
        }
      } catch (err) {
        if (!isCancelled) {
          console.error("Lỗi nạp dữ liệu hành vi nộp bài:", err);
          setError(err.message || "Không thể tải dữ liệu hành vi nộp bài.");
        }
      } finally {
        if (!isCancelled) setLoading(false);
      }
    }

    loadBehavior();
    return () => {
      isCancelled = true;
    };
  }, [courseId]);

  // Danh sách sinh viên sau lọc
  const filteredStudents = useMemo(() => {
    if (!data?.students) return [];
    return data.students.filter((s) => {
      const matchStyle =
        selectedStyle === "all" || s.submitStyle === selectedStyle;
      const matchSearch =
        !searchTerm.trim() ||
        s.fullName?.toLowerCase().includes(searchTerm.toLowerCase().trim()) ||
        s.username?.toLowerCase().includes(searchTerm.toLowerCase().trim()) ||
        s.email?.toLowerCase().includes(searchTerm.toLowerCase().trim());
      return matchStyle && matchSearch;
    });
  }, [data, selectedStyle, searchTerm]);

  // Tính các con số tổng kết nhanh
  const statsSummary = useMemo(() => {
    if (!data?.students) return null;
    const students = data.students;
    const totalStudents = students.length;

    const validOnTime = students
      .map((s) => s.onTimeRate)
      .filter((v) => v !== null && v !== undefined);
    const avgClassOnTime =
      validOnTime.length > 0
        ? Math.round(validOnTime.reduce((a, b) => a + b, 0) / validOnTime.length)
        : 0;

    const validLeads = students
      .map((s) => s.avgLeadDays)
      .filter((v) => v !== null && v !== undefined);
    const avgClassLeadDays =
      validLeads.length > 0
        ? (validLeads.reduce((a, b) => a + b, 0) / validLeads.length).toFixed(1)
        : 0;

    const lastMinuteCount = students.filter(
      (s) =>
        s.submitStyle === "Nước rút phút chót" || s.submitStyle === "Hay trễ hạn"
    ).length;

    const totalSubmissions = data.summary?.totalSubmissionsCount || 0;

    return {
      totalStudents,
      avgClassOnTime,
      avgClassLeadDays,
      lastMinuteCount,
      totalSubmissions,
    };
  }, [data]);

  if (loading) {
    return (
      <div className="submission-behavior-card" style={{ padding: "32px", textAlign: "center", background: "#ffffff", borderRadius: "20px", border: "1px solid rgba(55, 136, 62, 0.15)", marginBottom: "28px" }}>
        <div style={{ color: "#37883e", fontWeight: "600", marginBottom: "8px" }}>
          Đang tải dữ liệu phân tích hành vi nộp bài...
        </div>
        <div style={{ fontSize: "13px", color: "#6b7280" }}>
          Đang tính toán bucket thời gian và phong cách nộp bài từ Data Warehouse
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div
        className="submission-behavior-card"
        style={{
          padding: "24px",
          background: "#fef2f2",
          border: "1px solid #fecaca",
          borderRadius: "16px",
          color: "#991b1b",
          marginBottom: "28px",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "10px", fontWeight: "600" }}>
          <AlertTriangle size={20} /> Không thể hiển thị phân tích hành vi nộp bài
        </div>
        <div style={{ fontSize: "13px", marginTop: "6px" }}>{error}</div>
      </div>
    );
  }

  const buckets = data.summary?.buckets || [];
  const maxBucketCount = Math.max(...buckets.map((b) => b.count), 1);
  const totalSubmissions = data.summary?.totalSubmissionsCount || 1;

  return (
    <section className="submission-behavior-section" style={{ marginBottom: "28px", display: "block", width: "100%", clear: "both" }}>
      <div
        className="submission-behavior-card"
        style={{
          background: "linear-gradient(135deg, #ffffff 0%, #f9fbf8 100%)",
          border: "1px solid rgba(55, 136, 62, 0.15)",
          borderRadius: "20px",
          padding: "26px",
          boxShadow: "0 10px 30px rgba(32, 53, 34, 0.05)",
          display: "block",
          width: "100%",
          boxSizing: "border-box",
        }}
      >
        {/* Header */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            flexWrap: "wrap",
            gap: "14px",
            borderBottom: "1px solid rgba(67, 91, 70, 0.1)",
            paddingBottom: "18px",
            marginBottom: "20px",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
            <div
              style={{
                width: "42px",
                height: "42px",
                borderRadius: "12px",
                background: "rgba(55, 136, 62, 0.12)",
                color: "#37883e",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Clock size={24} />
            </div>
            <div>
              <h3
                style={{
                  margin: 0,
                  fontSize: "18px",
                  fontWeight: "700",
                  color: "#203026",
                }}
              >
                Hành vi Nộp bài (Nước rút & Trì hoãn)
              </h3>
              <p style={{ margin: "3px 0 0", fontSize: "13px", color: "#66736b" }}>
                Phân tích mức độ chủ động nộp bài trước hạn chót và phong cách học tập của sinh viên
              </p>
            </div>
          </div>

          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "8px",
              background: "#f0fdf4",
              border: "1px solid #bbf7d0",
              padding: "6px 14px",
              borderRadius: "20px",
              fontSize: "12px",
              color: "#166534",
              fontWeight: "600",
            }}
          >
            <Calendar size={14} /> Mốc dữ liệu DW: {data.referenceDate}
          </div>
        </div>

        {/* 4 Quick Stat Cards */}
        {statsSummary && (
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
              gap: "14px",
              marginBottom: "24px",
            }}
          >
            <div
              style={{
                background: "#ffffff",
                border: "1px solid rgba(67, 91, 70, 0.12)",
                borderRadius: "14px",
                padding: "16px",
              }}
            >
              <div style={{ fontSize: "12px", color: "#66736b", fontWeight: "500" }}>
                Tỷ lệ Đúng hạn Lớp
              </div>
              <div
                style={{
                  fontSize: "24px",
                  fontWeight: "800",
                  color: "#37883e",
                  marginTop: "4px",
                }}
              >
                {statsSummary.avgClassOnTime}%
              </div>
              <div style={{ fontSize: "11px", color: "#79867d", marginTop: "2px" }}>
                Trung bình toàn bộ sinh viên
              </div>
            </div>

            <div
              style={{
                background: "#ffffff",
                border: "1px solid rgba(67, 91, 70, 0.12)",
                borderRadius: "14px",
                padding: "16px",
              }}
            >
              <div style={{ fontSize: "12px", color: "#66736b", fontWeight: "500" }}>
                Nộp Sớm Trung bình
              </div>
              <div
                style={{
                  fontSize: "24px",
                  fontWeight: "800",
                  color: "#2563eb",
                  marginTop: "4px",
                }}
              >
                {statsSummary.avgClassLeadDays > 0 ? `+${statsSummary.avgClassLeadDays}` : statsSummary.avgClassLeadDays} ngày
              </div>
              <div style={{ fontSize: "11px", color: "#79867d", marginTop: "2px" }}>
                Khoảng cách trung bình trước hạn
              </div>
            </div>

            <div
              style={{
                background: "#ffffff",
                border: "1px solid rgba(67, 91, 70, 0.12)",
                borderRadius: "14px",
                padding: "16px",
              }}
            >
              <div style={{ fontSize: "12px", color: "#66736b", fontWeight: "500" }}>
                Nước rút / Trễ hạn
              </div>
              <div
                style={{
                  fontSize: "24px",
                  fontWeight: "800",
                  color: statsSummary.lastMinuteCount > 0 ? "#d97706" : "#37883e",
                  marginTop: "4px",
                }}
              >
                {statsSummary.lastMinuteCount}{" "}
                <span style={{ fontSize: "14px", fontWeight: "500" }}>
                  / {statsSummary.totalStudents} SV
                </span>
              </div>
              <div style={{ fontSize: "11px", color: "#79867d", marginTop: "2px" }}>
                Cần nhắc nhở nộp bài sớm hơn
              </div>
            </div>

            <div
              style={{
                background: "#ffffff",
                border: "1px solid rgba(67, 91, 70, 0.12)",
                borderRadius: "14px",
                padding: "16px",
              }}
            >
              <div style={{ fontSize: "12px", color: "#66736b", fontWeight: "500" }}>
                Tổng Số Bài Nộp
              </div>
              <div
                style={{
                  fontSize: "24px",
                  fontWeight: "800",
                  color: "#203026",
                  marginTop: "4px",
                }}
              >
                {statsSummary.totalSubmissions}{" "}
                <span style={{ fontSize: "14px", fontWeight: "500" }}>bài</span>
              </div>
              <div style={{ fontSize: "11px", color: "#79867d", marginTop: "2px" }}>
                Ghi nhận trong DW môn học
              </div>
            </div>
          </div>
        )}

        {/* Biểu đồ Histogram SVG Phân bố Nộp bài theo Bucket */}
        <div
          style={{
            background: "#ffffff",
            border: "1px solid rgba(67, 91, 70, 0.12)",
            borderRadius: "16px",
            padding: "20px",
            marginBottom: "24px",
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              marginBottom: "16px",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <BarChart2 size={18} color="#37883e" />
              <span style={{ fontSize: "15px", fontWeight: "700", color: "#203026" }}>
                Phân bố Thời điểm Nộp bài của Cả lớp (Histogram)
              </span>
            </div>
            <div style={{ fontSize: "12px", color: "#79867d" }}>
              Tổng cộng: <strong>{totalSubmissions}</strong> bài tập & bài nộp
            </div>
          </div>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(5, 1fr)",
              gap: "12px",
              alignItems: "flex-end",
              minHeight: "180px",
              paddingTop: "30px",
              borderBottom: "2px solid #e5e7eb",
              paddingBottom: "12px",
            }}
          >
            {buckets.map((b) => {
              const cfg = BUCKET_CONFIG[b.bucket] || BUCKET_CONFIG["Chưa nộp"];
              const pct = Math.round((b.count / totalSubmissions) * 100);
              const heightPct = Math.max(14, Math.round((b.count / maxBucketCount) * 100));

              return (
                <div
                  key={b.bucket}
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    justifyContent: "flex-end",
                    height: "100%",
                    gap: "8px",
                  }}
                >
                  <span
                    style={{
                      fontSize: "13px",
                      fontWeight: "800",
                      color: cfg.color,
                    }}
                  >
                    {b.count} bài ({pct}%)
                  </span>

                  <div
                    style={{
                      width: "100%",
                      maxWidth: "70px",
                      height: `${heightPct}%`,
                      minHeight: "14px",
                      background: `linear-gradient(180deg, ${cfg.color} 0%, ${cfg.bg} 100%)`,
                      border: `1.5px solid ${cfg.border}`,
                      borderRadius: "8px 8px 3px 3px",
                      transition: "all 0.3s ease",
                      boxShadow: "0 4px 10px rgba(0,0,0,0.04)",
                      cursor: "pointer",
                    }}
                    title={`${b.bucket}: ${b.count} bài (${pct}% tổng số bài)`}
                  />

                  <div style={{ textAlign: "center", marginTop: "4px" }}>
                    <div
                      style={{
                        fontSize: "12px",
                        fontWeight: "700",
                        color: "#203026",
                      }}
                    >
                      {b.bucket}
                    </div>
                    <div style={{ fontSize: "10px", color: "#79867d" }}>
                      {cfg.desc}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Bảng Chi tiết Phong cách Nộp bài của Từng Sinh viên */}
        <div
          style={{
            background: "#ffffff",
            border: "1px solid rgba(67, 91, 70, 0.12)",
            borderRadius: "16px",
            overflow: "hidden",
          }}
        >
          {/* Controls Bar: Filter Style + Search */}
          <div
            style={{
              padding: "16px 20px",
              borderBottom: "1px solid #f3f4f6",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              flexWrap: "wrap",
              gap: "12px",
              background: "#fafbf9",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap" }}>
              <span
                style={{
                  fontSize: "13px",
                  fontWeight: "700",
                  color: "#203026",
                  marginRight: "4px",
                }}
              >
                Lọc phong cách:
              </span>
              {[
                { key: "all", label: "Tất cả" },
                { key: "Hay trễ hạn", label: "Hay trễ hạn" },
                { key: "Nước rút phút chót", label: "Nước rút phút chót" },
                { key: "Làm đều", label: "Làm đều" },
                { key: "Làm sớm", label: "Làm sớm" },
              ].map((tab) => (
                <button
                  key={tab.key}
                  type="button"
                  onClick={() => setSelectedStyle(tab.key)}
                  style={{
                    padding: "6px 12px",
                    borderRadius: "20px",
                    fontSize: "12px",
                    fontWeight: "600",
                    border: "none",
                    cursor: "pointer",
                    background:
                      selectedStyle === tab.key ? "#37883e" : "rgba(67, 91, 70, 0.08)",
                    color: selectedStyle === tab.key ? "#ffffff" : "#4b5563",
                    transition: "all 0.2s",
                  }}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            <div
              style={{
                position: "relative",
                display: "flex",
                alignItems: "center",
                minWidth: "220px",
              }}
            >
              <Search
                size={16}
                color="#9ca3af"
                style={{ position: "absolute", left: "12px" }}
              />
              <input
                type="text"
                placeholder="Tìm sinh viên..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                style={{
                  width: "100%",
                  padding: "7px 12px 7px 34px",
                  borderRadius: "20px",
                  border: "1px solid #d1d5db",
                  fontSize: "12px",
                  outline: "none",
                }}
              />
            </div>
          </div>

          {/* Table */}
          <div style={{ overflowX: "auto" }}>
            <table
              style={{
                width: "100%",
                borderCollapse: "collapse",
                fontSize: "13px",
                textAlign: "left",
              }}
            >
              <thead>
                <tr
                  style={{
                    background: "#f9fafb",
                    borderBottom: "1px solid #e5e7eb",
                    color: "#4b5563",
                    fontSize: "12px",
                    textTransform: "uppercase",
                    letterSpacing: "0.5px",
                  }}
                >
                  <th style={{ padding: "12px 18px" }}>Sinh viên</th>
                  <th style={{ padding: "12px 16px" }}>Tiến độ nộp</th>
                  <th style={{ padding: "12px 16px" }}>Đúng hạn %</th>
                  <th style={{ padding: "12px 16px" }}>Nộp trước hạn TB</th>
                  <th style={{ padding: "12px 16px" }}>Phong cách nộp</th>
                  <th style={{ padding: "12px 16px", textAlign: "right" }}>Chi tiết bài</th>
                </tr>
              </thead>
              <tbody>
                {filteredStudents.length === 0 ? (
                  <tr>
                    <td
                      colSpan={6}
                      style={{
                        padding: "36px",
                        textAlign: "center",
                        color: "#9ca3af",
                      }}
                    >
                      Không tìm thấy sinh viên nào phù hợp với bộ lọc.
                    </td>
                  </tr>
                ) : (
                  filteredStudents.map((s) => {
                    const badge =
                      STYLE_BADGES[s.submitStyle] || STYLE_BADGES["Chưa có dữ liệu"];
                    const isExpanded = expandedStudentKey === s.userKey;

                    return (
                      <>
                        <tr
                          key={s.userKey}
                          style={{
                            borderBottom: "1px solid #f3f4f6",
                            transition: "background 0.2s",
                          }}
                        >
                          <td style={{ padding: "14px 18px" }}>
                            <div style={{ fontWeight: "700", color: "#1f2937" }}>
                              {s.fullName}
                            </div>
                            <div style={{ fontSize: "11px", color: "#6b7280" }}>
                              {s.username} • {s.email}
                            </div>
                          </td>

                          <td style={{ padding: "14px 16px" }}>
                            <div style={{ fontWeight: "600", color: "#374151" }}>
                              {s.submittedCount} / {s.totalAssignments} bài
                            </div>
                            <div
                              style={{
                                width: "90px",
                                height: "6px",
                                background: "#e5e7eb",
                                borderRadius: "4px",
                                overflow: "hidden",
                                marginTop: "4px",
                              }}
                            >
                              <div
                                style={{
                                  width: `${s.totalAssignments > 0 ? (s.submittedCount / s.totalAssignments) * 100 : 0}%`,
                                  height: "100%",
                                  background: "#37883e",
                                }}
                              />
                            </div>
                          </td>

                          <td style={{ padding: "14px 16px" }}>
                            {s.onTimeRate !== null ? (
                              <span
                                style={{
                                  fontWeight: "700",
                                  color: s.onTimeRate >= 80 ? "#16a34a" : s.onTimeRate >= 50 ? "#d97706" : "#dc2626",
                                }}
                              >
                                {s.onTimeRate}%
                              </span>
                            ) : (
                              <span style={{ color: "#9ca3af" }}>Chưa nộp</span>
                            )}
                          </td>

                          <td style={{ padding: "14px 16px" }}>
                            {s.avgLeadDays !== null ? (
                              <span
                                style={{
                                  fontWeight: "600",
                                  color: s.avgLeadDays < 0 ? "#dc2626" : s.avgLeadDays < 1 ? "#d97706" : "#2563eb",
                                }}
                              >
                                {s.avgLeadDays > 0 ? `+${s.avgLeadDays}` : s.avgLeadDays} ngày
                              </span>
                            ) : (
                              <span style={{ color: "#9ca3af" }}>—</span>
                            )}
                          </td>

                          <td style={{ padding: "14px 16px" }}>
                            <span
                              style={{
                                display: "inline-block",
                                padding: "4px 10px",
                                borderRadius: "12px",
                                fontSize: "11px",
                                fontWeight: "700",
                                background: badge.bg,
                                color: badge.color,
                                border: `1px solid ${badge.border}`,
                              }}
                            >
                              {s.submitStyle}
                            </span>
                          </td>

                          <td style={{ padding: "14px 16px", textAlign: "right" }}>
                            <button
                              type="button"
                              onClick={() =>
                                setExpandedStudentKey(isExpanded ? null : s.userKey)
                              }
                              style={{
                                padding: "5px 10px",
                                borderRadius: "8px",
                                border: "1px solid #e5e7eb",
                                background: isExpanded ? "#f3f4f6" : "#ffffff",
                                color: "#374151",
                                fontSize: "11px",
                                fontWeight: "600",
                                cursor: "pointer",
                                display: "inline-flex",
                                alignItems: "center",
                                gap: "4px",
                              }}
                            >
                              {isExpanded ? "Thu gọn" : "Xem bài"}
                              <ChevronDown
                                size={14}
                                style={{
                                  transform: isExpanded ? "rotate(180deg)" : "none",
                                  transition: "transform 0.2s",
                                }}
                              />
                            </button>
                          </td>
                        </tr>

                        {/* Accordion mở rộng chi tiết các bài nộp */}
                        {isExpanded && (
                          <tr key={`${s.userKey}-details`} style={{ background: "#f9fafb" }}>
                            <td colSpan={6} style={{ padding: "12px 20px" }}>
                              <div
                                style={{
                                  display: "grid",
                                  gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
                                  gap: "10px",
                                }}
                              >
                                {s.submissions?.map((sub) => {
                                  const cfg =
                                    BUCKET_CONFIG[sub.bucket] || BUCKET_CONFIG["Chưa nộp"];
                                  return (
                                    <div
                                      key={sub.activityKey}
                                      style={{
                                        background: "#ffffff",
                                        border: `1px solid ${cfg.border}`,
                                        borderRadius: "10px",
                                        padding: "10px 12px",
                                        display: "flex",
                                        flexDirection: "column",
                                        gap: "4px",
                                      }}
                                    >
                                      <div
                                        style={{
                                          fontSize: "12px",
                                          fontWeight: "700",
                                          color: "#1f2937",
                                        }}
                                      >
                                        {sub.activityName}
                                      </div>
                                      <div
                                        style={{
                                          display: "flex",
                                          justifyContent: "space-between",
                                          fontSize: "11px",
                                        }}
                                      >
                                        <span style={{ color: "#6b7280" }}>Hạn: {sub.dueDate?.slice(0, 10) || "—"}</span>
                                        <span style={{ color: cfg.color, fontWeight: "700" }}>
                                          {sub.bucket}
                                        </span>
                                      </div>
                                      {sub.submitDate && (
                                        <div style={{ fontSize: "10px", color: "#79867d" }}>
                                          Nộp: {sub.submitDate?.slice(0, 10)}
                                          {sub.leadDays !== null && ` (${sub.leadDays > 0 ? `Sớm ${sub.leadDays} ngày` : `Trễ ${Math.abs(sub.leadDays)} ngày`})`}
                                        </div>
                                      )}
                                    </div>
                                  );
                                })}
                              </div>
                            </td>
                          </tr>
                        )}
                      </>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </section>
  );
}
