import React, { useState, useEffect } from "react";
import {
  Sparkles,
  Key,
  CheckCircle2,
  AlertTriangle,
  Flame,
  RotateCw,
  Target,
  BookOpen,
  ArrowRight,
  ShieldCheck,
} from "lucide-react";
import { useAIKey } from "../context/AIKeyContext";
import { fetchStudentStudyCoach } from "../services/aiApiClient";

export default function AIStudyCoachWidget({ userKey, courseKey }) {
  const { isConfigured, setIsModalOpen, apiKey } = useAIKey();

  const [coachData, setCoachData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const loadInsights = async () => {
    if (!isConfigured) return;

    try {
      setLoading(true);
      setError(null);
      const res = await fetchStudentStudyCoach(userKey, courseKey);
      if (res.success && res.data) {
        setCoachData(res.data);
      }
    } catch (err) {
      console.error("Lỗi tải AI Study Coach:", err);
      setError(
        err.message || "Không thể phân tích dữ liệu lúc này. Vui lòng thử lại."
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isConfigured) {
      loadInsights();
    } else {
      setCoachData(null);
    }
  }, [isConfigured, userKey, courseKey]);

  // Helper render Badge trạng thái
  const renderStatusBadge = (status) => {
    const s = (status || "").toLowerCase();
    if (s.includes("tốt") || s.includes("good")) {
      return (
        <span
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: "5px",
            backgroundColor: "#ecfdf5",
            color: "#047857",
            border: "1px solid #a7f3d0",
            padding: "3px 10px",
            borderRadius: "9999px",
            fontSize: "12px",
            fontWeight: "700",
          }}
        >
          <CheckCircle2 size={13} /> Tiến độ Tốt
        </span>
      );
    }
    if (s.includes("nguy cơ") || s.includes("risk")) {
      return (
        <span
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: "5px",
            backgroundColor: "#fff1f2",
            color: "#be123c",
            border: "1px solid #fecdd3",
            padding: "3px 10px",
            borderRadius: "9999px",
            fontSize: "12px",
            fontWeight: "700",
          }}
        >
          <AlertTriangle size={13} /> Cần Chú Ý Cao
        </span>
      );
    }
    return (
      <span
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: "5px",
          backgroundColor: "#fffbeb",
          color: "#b45309",
          border: "1px solid #fde68a",
          padding: "3px 10px",
          borderRadius: "9999px",
          fontSize: "12px",
          fontWeight: "700",
        }}
      >
        <Flame size={13} /> Cần Cố Gắng Thêm
      </span>
    );
  };

  // 1. TRẠNG THÁI CHƯA CẤU HÌNH KEY (BYOK BANNER)
  if (!isConfigured) {
    return (
      <div
        style={{
          background: "linear-gradient(135deg, #f0fdf4 0%, #e8f5e9 100%)",
          border: "1px solid #c8e6c9",
          borderRadius: "14px",
          padding: "16px 20px",
          marginBottom: "20px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          flexWrap: "wrap",
          gap: "14px",
          boxShadow: "0 2px 8px rgba(46, 125, 50, 0.06)",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "14px" }}>
          <div
            style={{
              width: "44px",
              height: "44px",
              borderRadius: "12px",
              backgroundColor: "#2e7d32",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "#ffffff",
              boxShadow: "0 4px 10px rgba(46, 125, 50, 0.2)",
            }}
          >
            <Sparkles size={24} />
          </div>
          <div>
            <div
              style={{
                fontSize: "15px",
                fontWeight: "700",
                color: "#1b5e20",
                display: "flex",
                alignItems: "center",
                gap: "8px",
              }}
            >
              Cố vấn học tập AI (AI Study Coach)
              <span
                style={{
                  fontSize: "11px",
                  fontWeight: "600",
                  backgroundColor: "#ffffff",
                  color: "#2e7d32",
                  border: "1px solid #a5d6a7",
                  padding: "1px 7px",
                  borderRadius: "10px",
                }}
              >
                BYOK Model
              </span>
            </div>
            <p
              style={{
                margin: "4px 0 0 0",
                fontSize: "12.5px",
                color: "#2e7d32",
                maxWidth: "600px",
                lineHeight: 1.45,
              }}
            >
              Nhập Google Gemini API Key cá nhân để mở khóa nhận xét sư phạm tự
              động từ dữ liệu điểm số và chuyên cần của bạn trên Data Warehouse.
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={() => setIsModalOpen(true)}
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: "7px",
            backgroundColor: "#2e7d32",
            color: "#ffffff",
            padding: "9px 16px",
            borderRadius: "8px",
            border: "none",
            fontSize: "13px",
            fontWeight: "700",
            cursor: "pointer",
            boxShadow: "0 3px 8px rgba(46, 125, 50, 0.25)",
          }}
        >
          <Key size={15} /> Nhập API Key để kích hoạt
        </button>
      </div>
    );
  }

  // 2. TRẠNG THÁI LOADING
  if (loading) {
    return (
      <div
        style={{
          backgroundColor: "#ffffff",
          border: "1px solid #c8e6c9",
          borderRadius: "14px",
          padding: "20px 24px",
          marginBottom: "20px",
          boxShadow: "0 2px 8px rgba(46, 125, 50, 0.05)",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "16px" }}>
          <div
            style={{
              width: "36px",
              height: "36px",
              borderRadius: "10px",
              backgroundColor: "#2e7d32",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "#ffffff",
              boxShadow: "0 2px 6px rgba(46, 125, 50, 0.2)",
            }}
          >
            <Sparkles size={20} className="animate-spin" />
          </div>
          <div>
            <div style={{ fontSize: "14.5px", fontWeight: "700", color: "#1b5e20" }}>
              Cố vấn học tập AI đang phân tích dữ liệu...
            </div>
            <div style={{ fontSize: "12px", color: "#66736b" }}>
              Đang tổng hợp điểm số, tiến độ nộp bài và chuyên cần từ MySQL Data Warehouse
            </div>
          </div>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
          <div
            style={{
              width: "90%",
              height: "12px",
              backgroundColor: "#f1f5f9",
              borderRadius: "6px",
              animation: "pulse 1.5s infinite",
            }}
          />
          <div
            style={{
              width: "65%",
              height: "12px",
              backgroundColor: "#f1f5f9",
              borderRadius: "6px",
              animation: "pulse 1.5s infinite",
            }}
          />
        </div>
      </div>
    );
  }

  // 3. TRẠNG THÁI LỖI
  if (error) {
    return (
      <div
        style={{
          backgroundColor: "#fffdfb",
          border: "1px solid #fed7aa",
          borderRadius: "14px",
          padding: "16px 20px",
          marginBottom: "20px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: "12px",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          <AlertTriangle size={20} color="#ea580c" />
          <span style={{ fontSize: "13px", color: "#9a3412" }}>{error}</span>
        </div>
        <div style={{ display: "flex", gap: "8px" }}>
          <button
            type="button"
            onClick={loadInsights}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "5px",
              padding: "6px 12px",
              borderRadius: "6px",
              border: "1px solid #fdba74",
              backgroundColor: "#fff",
              color: "#c2410c",
              fontSize: "12px",
              fontWeight: "600",
              cursor: "pointer",
            }}
          >
            <RotateCw size={13} /> Thử lại
          </button>
          <button
            type="button"
            onClick={() => setIsModalOpen(true)}
            style={{
              padding: "6px 12px",
              borderRadius: "6px",
              border: "none",
              backgroundColor: "#ea580c",
              color: "#fff",
              fontSize: "12px",
              fontWeight: "600",
              cursor: "pointer",
            }}
          >
            Đổi Key
          </button>
        </div>
      </div>
    );
  }

  if (!coachData) return null;

  // 4. TRẠNG THÁI THÀNH CÔNG (RENDER KẾT QUẢ PHÂN TÍCH)
  return (
    <div
      style={{
        backgroundColor: "#ffffff",
        border: "1px solid #dcfce7",
        borderRadius: "14px",
        padding: "18px 22px",
        marginBottom: "20px",
        boxShadow: "0 3px 12px rgba(46, 125, 50, 0.05)",
        position: "relative",
      }}
    >
      {/* Top Header */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: "12px",
          flexWrap: "wrap",
          gap: "8px",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          <div
            style={{
              width: "32px",
              height: "32px",
              borderRadius: "8px",
              backgroundColor: "#ecfdf5",
              color: "#059669",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Sparkles size={18} />
          </div>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <span
                style={{
                  fontSize: "14.5px",
                  fontWeight: "700",
                  color: "#166534",
                }}
              >
                Nhận xét Cố vấn học tập AI
              </span>
              {renderStatusBadge(coachData.status)}
            </div>
            <span
              style={{
                fontSize: "11px",
                color: "#64748b",
                display: "inline-flex",
                alignItems: "center",
                gap: "4px",
              }}
            >
              <ShieldCheck size={12} color="#16a34a" /> Dữ liệu cá nhân bảo mật & đối sánh thứ hạng môn học
            </span>
          </div>
        </div>

        <button
          type="button"
          onClick={loadInsights}
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: "5px",
            padding: "5px 10px",
            borderRadius: "6px",
            border: "1px solid #e2e8f0",
            backgroundColor: "#f8fafc",
            color: "#475569",
            fontSize: "11.5px",
            cursor: "pointer",
          }}
          title="Phân tích lại theo dữ liệu mới nhất"
        >
          <RotateCw size={12} /> Cập nhật
        </button>
      </div>

      {/* Tóm tắt ngắn gọn */}
      <div
        style={{
          fontSize: "13.5px",
          color: "#1e293b",
          lineHeight: 1.55,
          marginBottom: "14px",
          backgroundColor: "#f8fafc",
          padding: "10px 14px",
          borderRadius: "8px",
          borderLeft: "3px solid #2e7d32",
        }}
      >
        {coachData.summary}
      </div>

      {/* Vị trí cá nhân so với tổng thể môn học */}
      {coachData.ranking && (
        <div
          style={{
            backgroundColor: "#f8fafc",
            border: "1px solid #e2e8f0",
            borderRadius: "10px",
            padding: "12px 14px",
            marginBottom: "14px",
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              marginBottom: "10px",
              flexWrap: "wrap",
              gap: "6px",
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "6px",
                fontSize: "12.5px",
                fontWeight: "700",
                color: "#1e293b",
              }}
            >
              <Target size={15} color="#2e7d32" />
              Thứ tự bản thân so với tổng thể môn học:
            </div>
            <span
              style={{
                fontSize: "11.5px",
                color: "#15803d",
                backgroundColor: "#f0fdf4",
                padding: "2px 8px",
                borderRadius: "6px",
                border: "1px solid #bbf7d0",
                fontWeight: "700",
              }}
            >
              Vị trí tổng thể: {coachData.ranking.overallRank} ({coachData.ranking.topPercent})
            </span>
          </div>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(210px, 1fr))",
              gap: "8px",
            }}
          >
            {coachData.ranking.byCourse?.map((c) => (
              <div
                key={c.courseKey}
                style={{
                  backgroundColor: "#ffffff",
                  border: "1px solid #e2e8f0",
                  borderRadius: "8px",
                  padding: "9px 12px",
                }}
              >
                <div
                  style={{
                    fontSize: "12px",
                    fontWeight: "700",
                    color: "#1e293b",
                    whiteSpace: "nowrap",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                  }}
                  title={c.courseName}
                >
                  {c.courseName}
                </div>
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    marginTop: "5px",
                    fontSize: "11.5px",
                  }}
                >
                  <span style={{ color: "#64748b" }}>
                    Xếp hạng:{" "}
                    <strong
                      style={{
                        color:
                          c.myRank <= 2
                            ? "#16a34a"
                            : c.myRank <= 4
                            ? "#2563eb"
                            : "#ea580c",
                      }}
                    >
                      #{c.myRank} / {c.totalInClass}
                    </strong>
                  </span>
                  <span
                    style={{
                      color: c.gradeDiff >= 0 ? "#16a34a" : "#dc2626",
                      fontWeight: "600",
                      fontSize: "11px",
                    }}
                  >
                    {c.gradeDiff >= 0 ? `+${c.gradeDiff}` : c.gradeDiff} so với TB lớp
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Grid: Lỗ hổng kiến thức + Action items */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
          gap: "12px",
        }}
      >
        {/* Knowledge Gap */}
        <div
          style={{
            backgroundColor: "#fefce8",
            border: "1px solid #fef08a",
            borderRadius: "10px",
            padding: "12px 14px",
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "6px",
              fontSize: "12px",
              fontWeight: "700",
              color: "#854d0e",
              marginBottom: "5px",
            }}
          >
            <BookOpen size={14} /> Điểm yếu / Lỗ hổng kiến thức cần ôn:
          </div>
          <div style={{ fontSize: "12.5px", color: "#713f12", lineHeight: 1.45 }}>
            {coachData.knowledgeGap || "Chưa phát hiện điểm yếu rõ rệt. Tiếp tục phát huy!"}
          </div>
        </div>

        {/* Action Items */}
        <div
          style={{
            backgroundColor: "#f0fdf4",
            border: "1px solid #bbf7d0",
            borderRadius: "10px",
            padding: "12px 14px",
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "6px",
              fontSize: "12px",
              fontWeight: "700",
              color: "#166534",
              marginBottom: "6px",
            }}
          >
            <Target size={14} /> Kế hoạch hành động trong tuần:
          </div>
          <ul
            style={{
              margin: 0,
              paddingLeft: "18px",
              fontSize: "12px",
              color: "#14532d",
              lineHeight: 1.5,
            }}
          >
            {(coachData.actionItems || []).map((action, idx) => (
              <li key={idx} style={{ marginBottom: "3px" }}>
                {action}
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}

