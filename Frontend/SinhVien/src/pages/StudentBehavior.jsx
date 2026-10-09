import { useEffect, useState } from "react";
import {
  Compass,
  CheckCircle2,
  AlertCircle,
  Clock,
  Calendar,
  Award,
  BookOpen,
  Sparkles,
  TrendingUp,
  BarChart2,
  ChevronDown,
} from "lucide-react";
import { studentGet } from "../services/apiClient";
import "../styles/StudentDashboard.css";

// Màu sắc phân khúc
const SEGMENT_THEMES = {
  "Chăm & giỏi": {
    color: "#37883e",
    bg: "#dcfce7",
    border: "#86efac",
    desc: "Bạn có mức độ tham gia cao và kết quả điểm số rất tốt. Hãy tiếp tục duy trì phong độ xuất sắc này!",
  },
  "Chăm nhưng điểm thấp": {
    color: "#e0a030",
    bg: "#fef3c7",
    border: "#fcd34d",
    desc: "Bạn rất chăm chỉ tương tác và nộp bài. Hãy tập trung củng cố phương pháp ôn tập các nội dung cốt lõi để nâng cao điểm số.",
  },
  "Ít tham gia nhưng điểm cao": {
    color: "#4a90b8",
    bg: "#e0f2fe",
    border: "#7dd3fc",
    desc: "Bạn có nền tảng học lực tốt. Hãy tăng cường tương tác bài giảng và thảo luận để tối ưu hóa tiềm năng của mình.",
  },
  "Nguy cơ cao": {
    color: "#c0504d",
    bg: "#fee2e2",
    border: "#fca5a5",
    desc: "Mức độ tương tác và kết quả gần đây đang thấp hơn kỳ vọng của môn. Hãy dành thêm thời gian học và nộp bài đúng hạn.",
  },
};

export default function StudentBehavior() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedCourseId, setSelectedCourseId] = useState("");

  const fetchData = async (courseId = "") => {
    try {
      setLoading(true);
      setError(null);
      const query = courseId ? `?courseId=${courseId}` : "";
      const res = await studentGet(`/behavior-profile${query}`);
      setData(res);
      if (res?.currentCourse?.courseKey && !selectedCourseId) {
        setSelectedCourseId(String(res.currentCourse.courseKey));
      }
    } catch (err) {
      console.error("Lỗi nạp hồ sơ hành vi sinh viên:", err);
      setError(err.message || "Không thể tải hồ sơ hành vi học tập.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData(selectedCourseId);
  }, [selectedCourseId]);

  if (loading && !data) {
    return (
      <main className="page-full">
        <div className="welcome-card" style={{ textAlign: "center", padding: "40px" }}>
          <div style={{ fontSize: "16px", fontWeight: "700", color: "#37883e" }}>
            Đang tổng hợp Hồ sơ Hành vi Học tập...
          </div>
          <div style={{ fontSize: "13px", color: "#66736b", marginTop: "6px" }}>
            Đang so sánh ẩn danh mức độ tham gia và tiến độ nộp bài của bạn với lớp
          </div>
        </div>
      </main>
    );
  }

  if (error && !data) {
    return (
      <main className="page-full">
        <div className="card" style={{ padding: "30px", background: "#fef2f2", color: "#991b1b" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "8px", fontWeight: "700" }}>
            <AlertCircle size={20} /> Không thể hiển thị hồ sơ hành vi
          </div>
          <div style={{ fontSize: "13px", marginTop: "6px" }}>{error}</div>
        </div>
      </main>
    );
  }

  const { student, currentCourse, courses, referenceDate, behavior } = data || {};
  const { mySegment, myCoords, myScores, thresholds, anonymousScatter, attention, submitProfile, factorCorrelation } = behavior || {};

  const pThresh = thresholds?.participation ?? 50;
  const gThresh = thresholds?.grade ?? 50;
  const segmentTheme = SEGMENT_THEMES[mySegment] || SEGMENT_THEMES["Nguy cơ cao"];

  // Cấu hình Scatter SVG
  const svgWidth = 560;
  const svgHeight = 360;
  const padding = { top: 30, right: 30, bottom: 50, left: 55 };
  const plotWidth = svgWidth - padding.left - padding.right;
  const plotHeight = svgHeight - padding.top - padding.bottom;

  const getX = (val) => padding.left + (Math.max(0, Math.min(100, val || 0)) / 100) * plotWidth;
  const getY = (val) => padding.top + (1 - Math.max(0, Math.min(100, val || 0)) / 100) * plotHeight;

  const lineX = getX(pThresh);
  const lineY = getY(gThresh);

  return (
    <main className="page-full" style={{ paddingBottom: "60px" }}>
      {/* 1. Header & Course Selector */}
      <section className="welcome-card" style={{ marginBottom: "20px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "16px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "14px" }}>
            <div
              style={{
                width: "48px",
                height: "48px",
                borderRadius: "14px",
                background: "rgba(55, 136, 62, 0.12)",
                color: "#37883e",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Compass size={26} />
            </div>
            <div>
              <div style={{ fontSize: "12px", color: "#66736b", fontWeight: "600", textTransform: "uppercase" }}>
                GÓC NHÌN BẢN THÂN & ĐỒNG BỘ ẨN DANH
              </div>
              <h1 style={{ margin: "2px 0 0", fontSize: "22px", fontWeight: "800", color: "#17221d" }}>
                Hồ sơ Hành vi Học tập của Tôi
              </h1>
              <div style={{ fontSize: "13px", color: "#506155", marginTop: "2px" }}>
                Xin chào, <strong>{student?.fullName}</strong> • Phân tích tại môn <strong>[{currentCourse?.code}] {currentCourse?.name}</strong>
              </div>
            </div>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <div style={{ fontSize: "12px", color: "#66736b", fontWeight: "600" }}>Chọn môn:</div>
            <select
              value={selectedCourseId}
              onChange={(e) => setSelectedCourseId(e.target.value)}
              style={{
                padding: "8px 16px",
                borderRadius: "12px",
                border: "1.5px solid #37883e",
                background: "#ffffff",
                color: "#17221d",
                fontSize: "13px",
                fontWeight: "700",
                cursor: "pointer",
                outline: "none",
              }}
            >
              {courses?.map((c) => (
                <option key={c.courseKey} value={c.courseKey}>
                  [{c.code}] {c.name}
                </option>
              ))}
            </select>
          </div>
        </div>
      </section>

      {/* 2. Grid 2 Cột: Scatter 2x2 "Tôi đang ở đâu" & "Điều cần chú ý" */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(360px, 1fr))", gap: "20px", marginBottom: "20px" }}>
        {/* Khối 1: Scatter Chart 2x2 */}
        <section className="card" style={{ padding: "22px", background: "#ffffff", borderRadius: "18px", border: "1px solid rgba(67, 91, 70, 0.12)" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "14px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <Sparkles size={18} color="#37883e" />
              <h2 style={{ fontSize: "16px", fontWeight: "700", margin: 0, color: "#17221d" }}>
                Tôi đang ở góc nào trong lớp?
              </h2>
            </div>
            <span style={{ fontSize: "11px", color: "#79867d" }}>* Ẩn danh toàn bộ bạn học</span>
          </div>

          <div style={{ position: "relative", width: "100%", overflowX: "auto" }}>
            <svg viewBox={`0 0 ${svgWidth} ${svgHeight}`} style={{ width: "100%", height: "auto", display: "block", overflow: "visible" }}>
              {/* 4 Quadrant Backgrounds */}
              <rect x={padding.left} y={padding.top} width={lineX - padding.left} height={lineY - padding.top} fill="rgba(74, 144, 184, 0.05)" />
              <rect x={lineX} y={padding.top} width={padding.left + plotWidth - lineX} height={lineY - padding.top} fill="rgba(55, 136, 62, 0.06)" />
              <rect x={padding.left} y={lineY} width={lineX - padding.left} height={padding.top + plotHeight - lineY} fill="rgba(192, 80, 77, 0.05)" />
              <rect x={lineX} y={lineY} width={padding.left + plotWidth - lineX} height={padding.top + plotHeight - lineY} fill="rgba(224, 160, 48, 0.05)" />

              {/* Quadrant Labels */}
              <text x={padding.left + 10} y={padding.top + 16} fill="#4a90b8" fontSize="10" fontWeight="700">ÍT THAM GIA, ĐIỂM CAO</text>
              <text x={padding.left + plotWidth - 10} y={padding.top + 16} fill="#37883e" fontSize="10" fontWeight="700" textAnchor="end">CHĂM & GIỎI</text>
              <text x={padding.left + 10} y={padding.top + plotHeight - 10} fill="#c0504d" fontSize="10" fontWeight="700">CẦN CỐ GẮNG</text>
              <text x={padding.left + plotWidth - 10} y={padding.top + plotHeight - 10} fill="#e0a030" fontSize="10" fontWeight="700" textAnchor="end">CHĂM, ĐIỂM CHƯA CAO</text>

              {/* Grid & Axis */}
              {[0, 25, 50, 75, 100].map((val) => (
                <g key={`gx-${val}`}>
                  <line x1={getX(val)} y1={padding.top} x2={getX(val)} y2={padding.top + plotHeight} stroke="#f0f3f1" />
                  <text x={getX(val)} y={padding.top + plotHeight + 16} textAnchor="middle" fontSize="10" fill="#79867d">{val}</text>
                </g>
              ))}

              {[0, 25, 50, 75, 100].map((val) => (
                <g key={`gy-${val}`}>
                  <line x1={padding.left} y1={getY(val)} x2={padding.left + plotWidth} y2={getY(val)} stroke="#f0f3f1" />
                  <text x={padding.left - 8} y={getY(val) + 3} textAnchor="end" fontSize="10" fill="#79867d">{val}%</text>
                </g>
              ))}

              <line x1={padding.left} y1={padding.top + plotHeight} x2={padding.left + plotWidth} y2={padding.top + plotHeight} stroke="#9ca3af" />
              <line x1={padding.left} y1={padding.top} x2={padding.left} y2={padding.top + plotHeight} stroke="#9ca3af" />

              {/* Threshold Lines */}
              <line x1={lineX} y1={padding.top} x2={lineX} y2={padding.top + plotHeight} stroke="#4b5563" strokeDasharray="4 4" />
              <line x1={padding.left} y1={lineY} x2={padding.left + plotWidth} y2={lineY} stroke="#4b5563" strokeDasharray="4 4" />

              {/* Chấm tròn ẩn danh của các bạn trong lớp */}
              {anonymousScatter?.filter((pt) => !pt.isMe).map((pt, idx) => (
                <circle
                  key={idx}
                  cx={getX(pt.x)}
                  cy={getY(pt.y)}
                  r={5.5}
                  fill="#9ca3af"
                  opacity={0.45}
                  stroke="#ffffff"
                  strokeWidth={1}
                />
              ))}

              {/* Chấm tròn NỔI BẬT CỦA BẢN THÂN */}
              {myCoords && (
                <g>
                  <circle
                    cx={getX(myCoords.x)}
                    cy={getY(myCoords.y)}
                    r={18}
                    fill={segmentTheme.color}
                    opacity={0.25}
                  />
                  <circle
                    cx={getX(myCoords.x)}
                    cy={getY(myCoords.y)}
                    r={9}
                    fill={segmentTheme.color}
                    stroke="#ffffff"
                    strokeWidth={2.5}
                  />
                  <rect
                    x={getX(myCoords.x) - 45}
                    y={getY(myCoords.y) - 30}
                    width="90"
                    height="18"
                    rx="5"
                    fill="#17221d"
                  />
                  <text
                    x={getX(myCoords.x)}
                    y={getY(myCoords.y) - 18}
                    textAnchor="middle"
                    fill="#ffffff"
                    fontSize="9.5"
                    fontWeight="700"
                  >
                    VỊ TRÍ CỦA BẠN
                  </text>
                </g>
              )}

              {/* Tên trục */}
              <text x={padding.left + plotWidth / 2} y={padding.top + plotHeight + 36} textAnchor="middle" fontSize="11" fontWeight="700" fill="#203026">
                Điểm Tham gia Tổng hợp (0 → 100)
              </text>
              <text x={-(padding.top + plotHeight / 2)} y={16} transform="rotate(-90)" textAnchor="middle" fontSize="11" fontWeight="700" fill="#203026">
                Điểm TB (%)
              </text>
            </svg>
          </div>

          {/* Segment Feedback Box */}
          <div
            style={{
              marginTop: "16px",
              padding: "14px",
              borderRadius: "12px",
              background: segmentTheme.bg,
              border: `1.5px solid ${segmentTheme.border}`,
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "4px" }}>
              <span style={{ fontSize: "13px", fontWeight: "700", color: segmentTheme.color }}>
                Nhóm của bạn: {mySegment}
              </span>
              <span style={{ fontSize: "11px", fontWeight: "600", color: "#4b5563" }}>
                Tham gia: {myScores?.participationScore}/100 • Điểm TB: {myScores?.avgGradePct}%
              </span>
            </div>
            <div style={{ fontSize: "12px", color: "#374151", lineHeight: "1.4" }}>
              {segmentTheme.desc}
            </div>
          </div>
        </section>

        {/* Khối 2: "Điều cần chú ý" */}
        <section className="card" style={{ padding: "22px", background: "#ffffff", borderRadius: "18px", border: "1px solid rgba(67, 91, 70, 0.12)", display: "flex", flexDirection: "column" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "16px" }}>
            <AlertCircle size={18} color="#e0a030" />
            <h2 style={{ fontSize: "16px", fontWeight: "700", margin: 0, color: "#17221d" }}>
              Tín hiệu Cần Chú ý & Khuyến nghị
            </h2>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: "12px", flex: 1 }}>
            {attention?.map((item, idx) => (
              <div
                key={idx}
                style={{
                  display: "flex",
                  alignItems: "flex-start",
                  gap: "12px",
                  padding: "14px",
                  borderRadius: "12px",
                  background: item.includes("đúng hướng") ? "#f0fdf4" : "#fffbeb",
                  border: `1px solid ${item.includes("đúng hướng") ? "#bbf7d0" : "#fef08a"}`,
                }}
              >
                {item.includes("đúng hướng") ? (
                  <CheckCircle2 size={20} color="#16a34a" style={{ flexShrink: 0, marginTop: "2px" }} />
                ) : (
                  <Clock size={20} color="#d97706" style={{ flexShrink: 0, marginTop: "2px" }} />
                )}
                <div>
                  <div style={{ fontSize: "13px", fontWeight: "700", color: item.includes("đúng hướng") ? "#166534" : "#92400e" }}>
                    {item.includes("đúng hướng") ? "Phong độ Tốt" : "Gợi ý Cải thiện"}
                  </div>
                  <div style={{ fontSize: "12px", color: "#4b5563", marginTop: "2px", lineHeight: "1.4" }}>
                    {item}
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Quick Metrics of Mine */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "10px", marginTop: "16px", paddingTop: "14px", borderTop: "1px solid #f3f4f6" }}>
            <div style={{ textAlign: "center", padding: "10px", background: "#fafbf9", borderRadius: "10px" }}>
              <div style={{ fontSize: "11px", color: "#79867d" }}>Tỷ lệ Đúng hạn</div>
              <div style={{ fontSize: "16px", fontWeight: "800", color: "#37883e", marginTop: "2px" }}>
                {myScores?.onTimeRate !== null ? `${myScores.onTimeRate}%` : "—"}
              </div>
            </div>

            <div style={{ textAlign: "center", padding: "10px", background: "#fafbf9", borderRadius: "10px" }}>
              <div style={{ fontSize: "11px", color: "#79867d" }}>Nộp trước hạn TB</div>
              <div style={{ fontSize: "16px", fontWeight: "800", color: "#2563eb", marginTop: "2px" }}>
                {myScores?.avgLeadDays !== null ? `${myScores.avgLeadDays > 0 ? `+${myScores.avgLeadDays}` : myScores.avgLeadDays}d` : "—"}
              </div>
            </div>

            <div style={{ textAlign: "center", padding: "10px", background: "#fafbf9", borderRadius: "10px" }}>
              <div style={{ fontSize: "11px", color: "#79867d" }}>Giờ học tương tác</div>
              <div style={{ fontSize: "16px", fontWeight: "800", color: "#17221d", marginTop: "2px" }}>
                {myScores?.engagementHours}h
              </div>
            </div>
          </div>
        </section>
      </div>

      {/* 3. Grid 2 Cột: "Hồ sơ nộp bài của tôi" & "Yếu tố liên quan nhiều nhất tới điểm" */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(360px, 1fr))", gap: "20px" }}>
        {/* Khối 3: Hồ sơ nộp bài so với lớp */}
        <section className="card" style={{ padding: "22px", background: "#ffffff", borderRadius: "18px", border: "1px solid rgba(67, 91, 70, 0.12)" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "14px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <BarChart2 size={18} color="#37883e" />
              <h2 style={{ fontSize: "16px", fontWeight: "700", margin: 0, color: "#17221d" }}>
                Hồ sơ Nộp bài của Tôi vs Cả lớp
              </h2>
            </div>
            <span
              style={{
                fontSize: "11px",
                fontWeight: "700",
                padding: "3px 10px",
                borderRadius: "10px",
                background: "#dcfce7",
                color: "#166534",
              }}
            >
              Phong cách: {submitProfile?.mySubmitStyle}
            </span>
          </div>

          <div style={{ fontSize: "12px", color: "#66736b", marginBottom: "16px" }}>
            So sánh tỷ lệ phân bố bài nộp của bạn theo các khoảng thời gian so với mức bình quân của lớp học:
          </div>

          {/* Grouped Bars Comparison */}
          <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
            {submitProfile?.bucketsComparison?.map((b) => (
              <div key={b.bucket}>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: "12px", marginBottom: "4px" }}>
                  <span style={{ fontWeight: "700", color: "#203026" }}>{b.bucket}</span>
                  <span style={{ fontSize: "11px", color: "#6b7280" }}>
                    Tôi: <strong>{b.myCount} bài ({b.myPct}%)</strong> • Lớp: <strong>{b.classPct}%</strong>
                  </span>
                </div>

                {/* Thanh kép: Tôi vs Lớp */}
                <div style={{ display: "flex", flexDirection: "column", gap: "3px" }}>
                  {/* Cột của tôi */}
                  <div style={{ width: "100%", height: "8px", background: "#f3f4f6", borderRadius: "4px", overflow: "hidden" }}>
                    <div
                      style={{
                        width: `${b.myPct}%`,
                        height: "100%",
                        background: "#37883e",
                        borderRadius: "4px",
                        transition: "width 0.4s ease",
                      }}
                      title={`Bạn: ${b.myPct}%`}
                    />
                  </div>
                  {/* Cột của lớp */}
                  <div style={{ width: "100%", height: "5px", background: "#f3f4f6", borderRadius: "3px", overflow: "hidden" }}>
                    <div
                      style={{
                        width: `${b.classPct}%`,
                        height: "100%",
                        background: "#9ca3af",
                        borderRadius: "3px",
                        transition: "width 0.4s ease",
                      }}
                      title={`Lớp: ${b.classPct}%`}
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Legend */}
          <div style={{ display: "flex", gap: "16px", marginTop: "18px", paddingTop: "12px", borderTop: "1px solid #f3f4f6", fontSize: "11px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
              <span style={{ width: "10px", height: "10px", borderRadius: "2px", background: "#37883e" }} />
              <span style={{ fontWeight: "600", color: "#374151" }}>Bài nộp của tôi</span>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
              <span style={{ width: "10px", height: "10px", borderRadius: "2px", background: "#9ca3af" }} />
              <span style={{ color: "#6b7280" }}>Bình quân cả lớp</span>
            </div>
          </div>
        </section>

        {/* Khối 4: Yếu tố liên quan nhiều nhất tới điểm */}
        <section className="card" style={{ padding: "22px", background: "#ffffff", borderRadius: "18px", border: "1px solid rgba(67, 91, 70, 0.12)" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "14px" }}>
            <TrendingUp size={18} color="#2563eb" />
            <h2 style={{ fontSize: "16px", fontWeight: "700", margin: 0, color: "#17221d" }}>
              Yếu tố Liên quan Nhiều nhất tới Điểm ở Lớp này
            </h2>
          </div>

          <div style={{ fontSize: "12px", color: "#66736b", marginBottom: "16px" }}>
            Hệ số tương quan thống kê Pearson (|R|) giữa các yếu tố hành vi và điểm tổng kết cuối khóa của lớp:
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
            {factorCorrelation?.map((f, idx) => {
              const rVal = Math.abs(Number(f.r || 0));
              const rPct = Math.round(rVal * 100);
              return (
                <div key={idx}>
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: "12px", marginBottom: "4px" }}>
                    <span style={{ fontWeight: "700", color: "#1f2937" }}>{f.factor}</span>
                    <span style={{ fontWeight: "700", color: "#2563eb" }}>
                      R = {Number(f.r).toFixed(2)} ({rPct >= 60 ? "Tương quan mạnh" : "Tương quan vừa"})
                    </span>
                  </div>
                  <div style={{ width: "100%", height: "10px", background: "#f3f4f6", borderRadius: "5px", overflow: "hidden" }}>
                    <div
                      style={{
                        width: `${rPct}%`,
                        height: "100%",
                        background: "linear-gradient(90deg, #3b82f6 0%, #2563eb 100%)",
                        borderRadius: "5px",
                      }}
                    />
                  </div>
                </div>
              );
            })}
          </div>

          {/* Academic disclaimer */}
          <div
            style={{
              marginTop: "20px",
              padding: "10px 12px",
              borderRadius: "8px",
              background: "#f9fafb",
              border: "1px solid #e5e7eb",
              fontSize: "11px",
              color: "#6b7280",
              lineHeight: "1.4",
            }}
          >
            💡 <strong>Gợi ý học tập:</strong> Ở môn này, việc <strong>nộp bài đúng hạn</strong> và <strong>duy trì thời lượng học tập đều đặn</strong> có liên hệ tích cực cao nhất tới kết quả điểm số.
            <div style={{ marginTop: "4px", fontStyle: "italic" }}>
              * Chú thích: Tương quan thống kê không đồng nghĩa với quan hệ nhân quả.
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
