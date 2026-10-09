import { useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  ShieldAlert,
  ShieldCheck,
  AlertCircle,
  BarChart2,
  Search,
  Eye,
  CheckCircle2,
  Clock,
  BookOpen,
} from "lucide-react";
import { getCourseRisk } from "../../services/teacherApi";

// Cấu hình hiển thị theo mức độ rủi ro
const RISK_LEVEL_CONFIG = {
  cao: {
    label: "Rủi ro Cao",
    badgeClass: "risk-level-high",
    color: "#dc2626",
    bg: "#fee2e2",
    border: "#fca5a5",
    desc: "Điểm rủi ro ≥ 60. Cần can thiệp và hỗ trợ sớm.",
  },
  "trung bình": {
    label: "Cần theo dõi",
    badgeClass: "risk-level-medium",
    color: "#d97706",
    bg: "#fef3c7",
    border: "#fcd34d",
    desc: "Điểm rủi ro 30 - 59. Có dấu hiệu sụt giảm hoặc nộp trễ.",
  },
  thấp: {
    label: "Ổn định",
    badgeClass: "risk-level-low",
    color: "#16a34a",
    bg: "#dcfce7",
    border: "#86efac",
    desc: "Điểm rủi ro < 30. Tiến độ và kết quả học tập an toàn.",
  },
};

export default function EarlyWarningRiskSection({ courseId, onSelectStudent }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Bộ lọc
  const [selectedLevelFilter, setSelectedLevelFilter] = useState("all");
  const [searchTerm, setSearchTerm] = useState("");

  useEffect(() => {
    let isCancelled = false;

    async function loadRiskData() {
      if (!courseId) return;
      try {
        setLoading(true);
        setError(null);
        const res = await getCourseRisk(courseId);
        if (!isCancelled) {
          setData(res);
        }
      } catch (err) {
        if (!isCancelled) {
          console.error("Lỗi nạp dữ liệu cảnh báo rủi ro:", err);
          setError(err.message || "Không thể tải dữ liệu cảnh báo sớm.");
        }
      } finally {
        if (!isCancelled) setLoading(false);
      }
    }

    loadRiskData();
    return () => {
      isCancelled = true;
    };
  }, [courseId]);

  // Sinh viên sau lọc
  const filteredStudents = useMemo(() => {
    if (!data?.students) return [];
    return data.students.filter((s) => {
      const matchLevel =
        selectedLevelFilter === "all" || s.riskLevel === selectedLevelFilter;
      const matchSearch =
        !searchTerm.trim() ||
        s.name?.toLowerCase().includes(searchTerm.toLowerCase().trim()) ||
        s.username?.toLowerCase().includes(searchTerm.toLowerCase().trim()) ||
        s.email?.toLowerCase().includes(searchTerm.toLowerCase().trim());
      return matchLevel && matchSearch;
    });
  }, [data, selectedLevelFilter, searchTerm]);

  // Cuộn đến dòng sinh viên
  const handleViewDetail = (student) => {
    if (onSelectStudent) {
      onSelectStudent(student);
    }
    const element = document.getElementById(`student-row-${student.userKey}`);
    if (element) {
      element.scrollIntoView({ behavior: "smooth", block: "center" });
      element.style.outline = "2px solid #dc2626";
      setTimeout(() => {
        element.style.outline = "none";
      }, 2500);
    }
  };

  if (loading) {
    return (
      <div className="early-warning-card" style={{ padding: "32px", textAlign: "center", background: "#ffffff", borderRadius: "20px", border: "1px solid rgba(220, 38, 38, 0.15)", marginBottom: "28px" }}>
        <div style={{ color: "#37883e", fontWeight: "600", marginBottom: "8px" }}>
          Đang tính toán điểm cảnh báo sớm và phân tích rủi ro...
        </div>
        <div style={{ fontSize: "13px", color: "#6b7280" }}>
          Đang tổng hợp cờ trễ hạn, mức độ không hoạt động và xu hướng điểm số từ Data Warehouse
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div
        className="early-warning-card"
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
          <AlertTriangle size={20} /> Không thể hiển thị dữ liệu cảnh báo sớm
        </div>
        <div style={{ fontSize: "13px", marginTop: "6px" }}>{error}</div>
      </div>
    );
  }

  const { summary, students } = data;
  const riskCounts = summary?.riskCounts || { high: 0, medium: 0, low: 0 };
  const riskDistribution = summary?.riskDistribution || [];
  const totalStudents = summary?.totalStudents || students.length || 1;
  const maxBucketCount = Math.max(...riskDistribution.map((b) => b.count), 1);
  const totalAtRisk = riskCounts.high + riskCounts.medium;

  return (
    <section className="early-warning-risk-section" style={{ marginBottom: "28px", display: "block", width: "100%", clear: "both" }}>
      <div
        className="early-warning-card"
        style={{
          background: "linear-gradient(135deg, #ffffff 0%, #fffbf8 100%)",
          border: "1px solid rgba(220, 38, 38, 0.15)",
          borderRadius: "20px",
          padding: "26px",
          boxShadow: "0 10px 30px rgba(220, 38, 38, 0.04)",
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
            marginBottom: "22px",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
            <div
              style={{
                width: "42px",
                height: "42px",
                borderRadius: "12px",
                background: "rgba(220, 38, 38, 0.12)",
                color: "#dc2626",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <ShieldAlert size={24} />
            </div>
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                <h3
                  style={{
                    margin: 0,
                    fontSize: "18px",
                    fontWeight: "700",
                    color: "#203026",
                  }}
                >
                  Sinh viên Cần Chú Ý (Cảnh báo Sớm & Lý do Rủi ro)
                </h3>
                <span
                  style={{
                    background: totalAtRisk > 0 ? "#fee2e2" : "#dcfce7",
                    color: totalAtRisk > 0 ? "#991b1b" : "#166534",
                    border: `1px solid ${totalAtRisk > 0 ? "#fca5a5" : "#86efac"}`,
                    fontSize: "12px",
                    fontWeight: "700",
                    padding: "2px 10px",
                    borderRadius: "12px",
                  }}
                >
                  {totalAtRisk} sinh viên có dấu hiệu rủi ro
                </span>
              </div>
              <p style={{ margin: "3px 0 0", fontSize: "13px", color: "#66736b" }}>
                Đánh giá nguy cơ học tập từ 4 yếu tố: nộp trễ hạn, không tương tác, sụt giảm điểm và thiếu giờ học
              </p>
            </div>
          </div>

          <div
            style={{
              fontSize: "12px",
              color: "#6b7280",
              background: "#f9fafb",
              border: "1px solid #e5e7eb",
              padding: "6px 12px",
              borderRadius: "16px",
            }}
          >
            Mốc DW: <strong>{data.referenceDate}</strong>
          </div>
        </div>

        {/* 3 Summary Cards */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
            gap: "14px",
            marginBottom: "24px",
          }}
        >
          {/* Card Rủi ro Cao */}
          <div
            onClick={() =>
              setSelectedLevelFilter(selectedLevelFilter === "cao" ? "all" : "cao")
            }
            style={{
              background: selectedLevelFilter === "cao" ? "#fee2e2" : "#ffffff",
              border: `1.5px solid ${selectedLevelFilter === "cao" ? "#dc2626" : "rgba(220, 38, 38, 0.18)"}`,
              borderRadius: "16px",
              padding: "16px",
              cursor: "pointer",
              transition: "all 0.2s",
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span style={{ fontSize: "12px", fontWeight: "700", color: "#dc2626" }}>
                ● RỦI RO CAO (≥ 60 điểm)
              </span>
              <span style={{ fontSize: "11px", color: "#991b1b" }}>Cần chú ý ngay</span>
            </div>
            <div style={{ fontSize: "26px", fontWeight: "800", color: "#dc2626", marginTop: "6px" }}>
              {riskCounts.high}{" "}
              <span style={{ fontSize: "14px", fontWeight: "600", color: "#6b7280" }}>
                / {totalStudents} SV
              </span>
            </div>
            <div style={{ fontSize: "11px", color: "#79867d", marginTop: "2px" }}>
              Có từ 2 dấu hiệu rủi ro nghiêm trọng trở lên
            </div>
          </div>

          {/* Card Cần Theo dõi */}
          <div
            onClick={() =>
              setSelectedLevelFilter(selectedLevelFilter === "trung bình" ? "all" : "trung bình")
            }
            style={{
              background: selectedLevelFilter === "trung bình" ? "#fef3c7" : "#ffffff",
              border: `1.5px solid ${selectedLevelFilter === "trung bình" ? "#d97706" : "rgba(217, 119, 6, 0.18)"}`,
              borderRadius: "16px",
              padding: "16px",
              cursor: "pointer",
              transition: "all 0.2s",
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span style={{ fontSize: "12px", fontWeight: "700", color: "#d97706" }}>
                ● CẦN THEO DÕI (30 - 59 điểm)
              </span>
              <span style={{ fontSize: "11px", color: "#92400e" }}>Theo dõi sát</span>
            </div>
            <div style={{ fontSize: "26px", fontWeight: "800", color: "#d97706", marginTop: "6px" }}>
              {riskCounts.medium}{" "}
              <span style={{ fontSize: "14px", fontWeight: "600", color: "#6b7280" }}>
                / {totalStudents} SV
              </span>
            </div>
            <div style={{ fontSize: "11px", color: "#79867d", marginTop: "2px" }}>
              Có 1 dấu hiệu cảnh báo cần nhắc nhở
            </div>
          </div>

          {/* Card Ổn định */}
          <div
            onClick={() =>
              setSelectedLevelFilter(selectedLevelFilter === "thấp" ? "all" : "thấp")
            }
            style={{
              background: selectedLevelFilter === "thấp" ? "#dcfce7" : "#ffffff",
              border: `1.5px solid ${selectedLevelFilter === "thấp" ? "#16a34a" : "rgba(22, 163, 74, 0.18)"}`,
              borderRadius: "16px",
              padding: "16px",
              cursor: "pointer",
              transition: "all 0.2s",
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span style={{ fontSize: "12px", fontWeight: "700", color: "#16a34a" }}>
                ● ỔN ĐỊNH (&lt; 30 điểm)
              </span>
              <span style={{ fontSize: "11px", color: "#166534" }}>Đạt chuẩn</span>
            </div>
            <div style={{ fontSize: "26px", fontWeight: "800", color: "#16a34a", marginTop: "6px" }}>
              {riskCounts.low}{" "}
              <span style={{ fontSize: "14px", fontWeight: "600", color: "#6b7280" }}>
                / {totalStudents} SV
              </span>
            </div>
            <div style={{ fontSize: "11px", color: "#79867d", marginTop: "2px" }}>
              Tiến độ và kết quả học tập duy trì tốt
            </div>
          </div>
        </div>

        {/* Biểu đồ Histogram Phân bố Điểm Rủi ro */}
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
              marginBottom: "14px",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <BarChart2 size={18} color="#dc2626" />
              <span style={{ fontSize: "14px", fontWeight: "700", color: "#203026" }}>
                Phân bố Điểm Rủi ro Lớp học (Risk Score Histogram)
              </span>
            </div>
            <div style={{ fontSize: "11px", color: "#79867d" }}>
              Thang điểm 0 (An toàn nhất) → 100 (Nguy cơ cao nhất)
            </div>
          </div>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(5, 1fr)",
              gap: "10px",
              alignItems: "flex-end",
              height: "130px",
              paddingTop: "16px",
              borderBottom: "2px solid #e5e7eb",
              paddingBottom: "10px",
            }}
          >
            {riskDistribution.map((b) => {
              const heightPct = Math.max(14, Math.round((b.count / maxBucketCount) * 100));
              let color = "#16a34a";
              let bg = "#dcfce7";
              if (b.min >= 60) {
                color = "#dc2626";
                bg = "#fee2e2";
              } else if (b.min >= 30) {
                color = "#d97706";
                bg = "#fef3c7";
              }

              return (
                <div
                  key={b.range}
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    justifyContent: "flex-end",
                    height: "100%",
                    gap: "6px",
                  }}
                >
                  <span style={{ fontSize: "12px", fontWeight: "800", color }}>
                    {b.count} SV
                  </span>
                  <div
                    style={{
                      width: "100%",
                      maxWidth: "60px",
                      height: `${heightPct}%`,
                      minHeight: "12px",
                      background: `linear-gradient(180deg, ${color} 0%, ${bg} 100%)`,
                      border: `1.5px solid ${color}`,
                      borderRadius: "6px 6px 2px 2px",
                      boxShadow: "0 2px 6px rgba(0,0,0,0.04)",
                      transition: "height 0.3s ease",
                    }}
                    title={`Khoảng điểm ${b.range}: ${b.count} sinh viên`}
                  />
                  <span style={{ fontSize: "11px", fontWeight: "600", color: "#4b5563" }}>
                    {b.range} đ
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Bảng Danh sách Sinh viên Cần Chú Ý */}
        <div
          style={{
            background: "#ffffff",
            border: "1px solid rgba(67, 91, 70, 0.12)",
            borderRadius: "16px",
            overflow: "hidden",
          }}
        >
          {/* Controls Bar */}
          <div
            style={{
              padding: "14px 20px",
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
              <span style={{ fontSize: "13px", fontWeight: "700", color: "#203026" }}>
                Lọc mức rủi ro:
              </span>
              {[
                { key: "all", label: "Tất cả" },
                { key: "cao", label: "Rủi ro Cao" },
                { key: "trung bình", label: "Cần theo dõi" },
                { key: "thấp", label: "Ổn định" },
              ].map((tab) => (
                <button
                  key={tab.key}
                  type="button"
                  onClick={() => setSelectedLevelFilter(tab.key)}
                  style={{
                    padding: "5px 12px",
                    borderRadius: "20px",
                    fontSize: "12px",
                    fontWeight: "600",
                    border: "none",
                    cursor: "pointer",
                    background:
                      selectedLevelFilter === tab.key
                        ? "#dc2626"
                        : "rgba(67, 91, 70, 0.08)",
                    color: selectedLevelFilter === tab.key ? "#ffffff" : "#4b5563",
                  }}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            <div style={{ position: "relative", minWidth: "220px" }}>
              <Search
                size={16}
                color="#9ca3af"
                style={{ position: "absolute", left: "12px", top: "8px" }}
              />
              <input
                type="text"
                placeholder="Tìm sinh viên..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                style={{
                  width: "100%",
                  padding: "6px 12px 6px 34px",
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
                  }}
                >
                  <th style={{ padding: "12px 18px" }}>Sinh viên</th>
                  <th style={{ padding: "12px 16px" }}>Điểm rủi ro</th>
                  <th style={{ padding: "12px 16px" }}>Mức độ</th>
                  <th style={{ padding: "12px 16px" }}>Lý do cảnh báo</th>
                  <th style={{ padding: "12px 16px" }}>Điểm TB</th>
                  <th style={{ padding: "12px 16px" }}>Đúng hạn %</th>
                  <th style={{ padding: "12px 16px", textAlign: "right" }}>Thao tác</th>
                </tr>
              </thead>
              <tbody>
                {filteredStudents.length === 0 ? (
                  <tr>
                    <td
                      colSpan={7}
                      style={{ padding: "32px", textAlign: "center", color: "#9ca3af" }}
                    >
                      Không có sinh viên nào trong danh mục này.
                    </td>
                  </tr>
                ) : (
                  filteredStudents.map((s) => {
                    const cfg =
                      RISK_LEVEL_CONFIG[s.riskLevel] || RISK_LEVEL_CONFIG["thấp"];

                    return (
                      <tr
                        key={s.userKey}
                        id={`risk-student-row-${s.userKey}`}
                        style={{
                          borderBottom: "1px solid #f3f4f6",
                          background: s.riskLevel === "cao" ? "rgba(254, 242, 242, 0.4)" : "transparent",
                          transition: "background 0.2s",
                        }}
                      >
                        <td style={{ padding: "14px 18px" }}>
                          <div style={{ fontWeight: "700", color: "#1f2937" }}>
                            {s.fullName || s.name}
                          </div>
                          <div style={{ fontSize: "11px", color: "#6b7280" }}>
                            {s.username} • {s.email}
                          </div>
                        </td>

                        <td style={{ padding: "14px 16px" }}>
                          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                            <strong style={{ fontSize: "14px", color: cfg.color }}>
                              {s.riskScore}
                            </strong>
                            <div
                              style={{
                                width: "60px",
                                height: "6px",
                                background: "#e5e7eb",
                                borderRadius: "4px",
                                overflow: "hidden",
                              }}
                            >
                              <div
                                style={{
                                  width: `${s.riskScore}%`,
                                  height: "100%",
                                  background: cfg.color,
                                }}
                              />
                            </div>
                          </div>
                        </td>

                        <td style={{ padding: "14px 16px" }}>
                          <span
                            style={{
                              display: "inline-block",
                              padding: "3px 8px",
                              borderRadius: "10px",
                              fontSize: "11px",
                              fontWeight: "700",
                              background: cfg.bg,
                              color: cfg.color,
                              border: `1px solid ${cfg.border}`,
                            }}
                          >
                            {cfg.label}
                          </span>
                        </td>

                        <td style={{ padding: "14px 16px" }}>
                          <div style={{ display: "flex", flexWrap: "wrap", gap: "6px" }}>
                            {s.riskReasons && s.riskReasons.length > 0 ? (
                              s.riskReasons.map((reason, rIdx) => (
                                <span
                                  key={rIdx}
                                  style={{
                                    display: "inline-flex",
                                    alignItems: "center",
                                    gap: "4px",
                                    background: "#fee2e2",
                                    color: "#991b1b",
                                    border: "1px solid #fca5a5",
                                    borderRadius: "8px",
                                    padding: "2px 8px",
                                    fontSize: "11px",
                                    fontWeight: "600",
                                  }}
                                >
                                  <i>●</i> {reason}
                                </span>
                              ))
                            ) : (
                              <span style={{ color: "#16a34a", fontSize: "12px", display: "inline-flex", alignItems: "center", gap: "4px" }}>
                                <CheckCircle2 size={13} /> Duy trì tốt
                              </span>
                            )}
                          </div>
                        </td>

                        <td style={{ padding: "14px 16px" }}>
                          <strong
                            style={{
                              color:
                                s.avgGradePct !== null && s.avgGradePct < 50
                                  ? "#dc2626"
                                  : "#1f2937",
                            }}
                          >
                            {s.avgGradePct !== null ? `${s.avgGradePct}%` : "—"}
                          </strong>
                        </td>

                        <td style={{ padding: "14px 16px" }}>
                          <span
                            style={{
                              fontWeight: "600",
                              color:
                                s.onTimeRate !== null && s.onTimeRate < 50
                                  ? "#dc2626"
                                  : "#1f2937",
                            }}
                          >
                            {s.onTimeRate !== null ? `${s.onTimeRate}%` : "—"}
                          </span>
                        </td>

                        <td style={{ padding: "14px 16px", textAlign: "right" }}>
                          <button
                            type="button"
                            onClick={() => handleViewDetail(s)}
                            style={{
                              padding: "5px 10px",
                              borderRadius: "8px",
                              border: "1px solid #e5e7eb",
                              background: "#ffffff",
                              color: "#374151",
                              fontSize: "11px",
                              fontWeight: "600",
                              cursor: "pointer",
                              display: "inline-flex",
                              alignItems: "center",
                              gap: "4px",
                            }}
                          >
                            <Eye size={13} /> Xem chi tiết
                          </button>
                        </td>
                      </tr>
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
