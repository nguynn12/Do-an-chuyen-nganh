import React, { useState, useEffect, useMemo, useRef } from "react";
import {
  Sparkles,
  Send,
  AlertCircle,
  CheckCircle2,
  BarChart3,
  HelpCircle,
  ChevronDown,
  ChevronUp,
  RefreshCw,
  ShieldCheck,
  Info,
  Layers,
  ArrowRight,
} from "lucide-react";
import { queryAiAssistant } from "../../services/teacherApi";
import "../../styles/AiAssistantWidget.css";

const PROMPT_SUGGESTIONS = [
  "Xem phân bố điểm môn học",
  "Phổ điểm cả lớp",
  "Thống kê điểm số",
];

export default function AiAssistantWidget({
  courseId,
  courseName: _courseName,
  courseCode: _courseCode,
  defaultExpanded = true,
}) {
  const [isExpanded, setIsExpanded] = useState(defaultExpanded);
  const [promptText, setPromptText] = useState("Xem phân bố điểm môn học");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [result, setResult] = useState(null);
  const [hoveredBarIndex, setHoveredBarIndex] = useState(null);
  const [metricView, setMetricView] = useState("student"); // "student" (theo sinh viên) | "record" (theo lượt điểm)
  const chartContainerRef = useRef(null);

  const requestVersion = useRef(0);
  useEffect(() => {
    const version = ++requestVersion.current;
    setResult(null); setError(null);
    if (!courseId) { setLoading(false); return; }
    setLoading(true);
    queryAiAssistant(courseId, 'Xem phân bố điểm môn học')
      .then(response => { if (version === requestVersion.current) setResult(response); })
      .catch(err => { if (version === requestVersion.current) setError(err.message || 'Không thể tải phân tích.'); })
      .finally(() => { if (version === requestVersion.current) setLoading(false); });
    return () => { requestVersion.current++; };
  }, [courseId]);

  const handleQuery = async (textToQuery) => {
    const query = String(textToQuery ?? promptText).trim();
    if (!query || !courseId) return;
    const version = ++requestVersion.current;
    try {
      setLoading(true); setError(null);
      const response = await queryAiAssistant(courseId, query);
      if (version === requestVersion.current) setResult(response);
    } catch (err) {
      if (version === requestVersion.current) { setError(err.message || 'Không thể xử lý yêu cầu.'); setResult(null); }
    } finally {
      if (version === requestVersion.current) setLoading(false);
    }
  };

  const handleFormSubmit = (e) => {
    e.preventDefault();
    handleQuery(promptText);
  };

  // Tính toán kích thước SVG Bar Chart
  const chartDimensions = {
    width: 600,
    height: 240,
    paddingTop: 30,
    paddingBottom: 45,
    paddingLeft: 40,
    paddingRight: 20,
  };

  // Chọn bộ dữ liệu hiển thị tương ứng với góc nhìn thống kê
  const activeMetric = useMemo(() => {
    if (!result) return null;
    if (metricView === "record" && result.metrics?.recordLevel) {
      const rec = result.metrics.recordLevel;
      return {
        type: "record",
        title: "Theo lượt đánh giá (COUNT Fact_Course_Grade)",
        unit: "lượt điểm",
        sampleSize: result.sampleSizeRecords ?? rec.sampleSize,
        values: rec.values || [],
        percentages: rec.percentages || [],
        avg: rec.averageScore ?? result.summary?.recordAverageScore ?? 0,
        passRate: rec.passRate ?? result.summary?.recordPassRate ?? 0,
        passedCount: rec.passedCount ?? result.summary?.passedRecords ?? 0,
      };
    }
    // Mặc định: Cấp độ Sinh viên (COUNT DISTINCT User_Key)
    const stu = result.metrics?.studentLevel;
    return {
      type: "student",
      title: "Theo từng sinh viên (COUNT DISTINCT User_Key)",
      unit: "sinh viên",
      sampleSize: result.sampleSizeStudents ?? stu?.sampleSize ?? result.sampleSize ?? 0,
      values: stu?.values || result.values || [],
      percentages: stu?.percentages || result.percentages || [],
      avg: stu?.averageScore ?? result.summary?.studentAverageScore ?? result.summary?.averageScore ?? 0,
      passRate: stu?.passRate ?? result.summary?.studentPassRate ?? result.summary?.passRate ?? 0,
      passedCount: stu?.passedCount ?? result.summary?.passedStudents ?? 0,
    };
  }, [result, metricView]);

  const maxVal = useMemo(() => {
    const vals = activeMetric?.values;
    if (!vals || vals.length === 0) return 10;
    const highest = Math.max(...vals);
    return highest > 0 ? Math.ceil(highest * 1.25) : 10;
  }, [activeMetric]);

  return (
    <div className={`ai-assistant-widget ${isExpanded ? "expanded" : "collapsed"}`}>
      {/* HEADER SECTION */}
      <div className="ai-widget-header" onClick={() => setIsExpanded(!isExpanded)}>
        <div className="ai-widget-title-group">
          <div className="ai-sparkle-icon">
            <Sparkles size={18} />
          </div>
          <div>
            <div className="ai-title-row">
              <h3>Trợ lý Phân tích LMS</h3>
              <span className="ai-badge-secure">
                <ShieldCheck size={12} />
                Phân quyền an toàn
              </span>
              {result?.mode === "gemini_api" || result?.mode === "gemini" ? (
                <span className="ai-badge-gemini">
                  <Sparkles size={11} />
                  Gemini API ({result?.modelUsed || "gemini-3.1-flash-lite"})
                </span>
              ) : result?.mode === "fallback_rule_based" ? (
                <span className="ai-badge-rule">
                  <Layers size={11} />
                  Bộ quy tắc dự phòng
                </span>
              ) : (
                <span className="ai-badge-local">NLU Parser</span>
              )}
            </div>
            <p className="ai-subtitle">
              Nhận diện yêu cầu tiếng Việt tự nhiên và trực quan hóa số liệu học tập từ MySQL Data Warehouse
            </p>
          </div>
        </div>

        <button
          type="button"
          className="ai-toggle-btn"
          aria-label={isExpanded ? "Thu gọn" : "Mở rộng"}
        >
          {isExpanded ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
        </button>
      </div>

      {/* BODY CONTENT */}
      {isExpanded && (
        <div className="ai-widget-body">
          {/* PROMPT INPUT FORM */}
          <form className="ai-prompt-form" onSubmit={handleFormSubmit}>
            <div className="ai-input-wrap">
              <input
                type="text"
                className="ai-text-input"
                placeholder="Ví dụ: 'Xem phân bố điểm môn học', 'Phổ điểm cả lớp'..."
                value={promptText}
                onChange={(e) => setPromptText(e.target.value)}
                maxLength={500}
                disabled={loading}
              />
              <button
                type="submit"
                className="ai-submit-btn"
                disabled={loading || !promptText.trim()}
              >
                {loading ? (
                  <RefreshCw size={16} className="ai-spin" />
                ) : (
                  <>
                    <span>Phân tích</span>
                    <Send size={15} />
                  </>
                )}
              </button>
            </div>

            {/* QUICK SUGGESTIONS */}
            <div className="ai-suggestions-row">
              <span className="ai-suggestions-label">Gợi ý nhanh:</span>
              {PROMPT_SUGGESTIONS.map((suggestion, idx) => (
                <button
                  key={idx}
                  type="button"
                  className="ai-suggestion-chip"
                  onClick={() => {
                    setPromptText(suggestion);
                    handleQuery(suggestion);
                  }}
                  disabled={loading}
                >
                  {suggestion}
                </button>
              ))}
            </div>
          </form>

          {/* LOADING STATE */}
          {loading && (
            <div className="ai-loading-box">
              <RefreshCw size={24} className="ai-spin" />
              <span>Đang phân tích cú pháp và trích xuất dữ liệu từ Data Warehouse...</span>
            </div>
          )}

          {/* ERROR STATE */}
          {!loading && error && (
            <div className="ai-alert-box error">
              <AlertCircle size={20} />
              <div>
                <strong>Lỗi xác thực / phân quyền:</strong>
                <p>{error}</p>
                <small>* Nếu gặp lỗi 403, kiểm tra xem tài khoản giảng viên hiện tại có được phân công dạy môn này không.</small>
              </div>
            </div>
          )}

          {/* UNSUPPORTED INTENT */}
          {!loading && result && !result.supported && (
            <div className="ai-alert-box info">
              <Info size={20} />
              <div>
                <strong>Chưa hỗ trợ câu hỏi này:</strong>
                <p>{result.message}</p>
                {result.explanation && (
                  <p className="ai-explanation-note">
                    <em>Giải thích: {result.explanation}</em>
                  </p>
                )}
                {result.availableIntents && (
                  <div className="ai-intent-list">
                    <span>Tính năng đang hỗ trợ:</span>
                    <ul>
                      {result.availableIntents.map((it, i) => (
                        <li key={i}>
                          <strong>{it.label}:</strong> {it.description}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* SUCCESS RESULT: GRADE DISTRIBUTION */}
          {!loading && result && result.supported && result.intent === "grade_distribution" && (
            <div className="ai-result-content">
              {/* RESULT HEADER & SUMMARY BADGES */}
              <div className="ai-result-header">
                <div>
                  <h4 className="ai-chart-title">
                    <BarChart3 size={18} />
                    {result.title}
                  </h4>
                  <span className="ai-source-caption">
                    Dữ liệu thực tế: {result.source} • Mẫu khảo sát: <strong>{result.sampleSizeStudents || 0}</strong> sinh viên ({result.sampleSizeRecords || 0} lượt điểm)
                  </span>
                </div>

                {result.summary && (
                  <div className="ai-summary-badges">
                    <div className="ai-summary-badge">
                      <span>SV Đạt</span>
                      <strong style={{ color: "#16a34a" }}>
                        {result.summary.passedStudents ?? 0}/{result.sampleSizeStudents ?? 0} ({result.summary.studentPassRate ?? 0}%)
                      </strong>
                    </div>
                    <div className="ai-summary-badge">
                      <span>Lượt Đạt</span>
                      <strong style={{ color: "#2563eb" }}>
                        {result.summary.passedRecords ?? 0}/{result.sampleSizeRecords ?? 0} ({result.summary.recordPassRate ?? 0}%)
                      </strong>
                    </div>
                    <div className="ai-summary-badge">
                      <span>Điểm TB ({metricView === "student" ? "SV" : "Lượt"})</span>
                      <strong style={{ color: "#8b5cf6" }}>
                        {activeMetric?.avg?.toFixed(2) ?? "—"}
                      </strong>
                    </div>
                    <div className="ai-summary-badge">
                      <span>Thang đo</span>
                      <strong style={{ color: "#0f766e" }}>0 – 10</strong>
                    </div>
                  </div>
                )}
              </div>

              {/* CHUYỂN ĐỔI GÓC NHÌN THỐNG KÊ (SINH VIÊN VS LƯỢT ĐIỂM) */}
              <div className="ai-metric-toggle-row">
                <div className="ai-metric-toggle-group">
                  <button
                    type="button"
                    className={`ai-metric-tab ${metricView === "student" ? "active" : ""}`}
                    onClick={() => setMetricView("student")}
                  >
                    Theo sinh viên (N = {result.sampleSizeStudents || 0} SV)
                  </button>
                  <button
                    type="button"
                    className={`ai-metric-tab ${metricView === "record" ? "active" : ""}`}
                    onClick={() => setMetricView("record")}
                  >
                    Theo lượt đánh giá (N = {result.sampleSizeRecords || 0} lượt)
                  </button>
                </div>
                <span className="ai-source-caption">
                  Đang xem: <b>{activeMetric?.title}</b>
                </span>
              </div>

              {/* REAL SVG BAR CHART */}
              {activeMetric && activeMetric.sampleSize > 0 ? (
                <div className="ai-chart-wrap" ref={chartContainerRef}>
                  <svg
                    viewBox={`0 0 ${chartDimensions.width} ${chartDimensions.height}`}
                    className="ai-bar-svg"
                  >
                    {/* Background Grid Lines */}
                    {[0, 0.25, 0.5, 0.75, 1.0].map((ratio, idx) => {
                      const y =
                        chartDimensions.height -
                        chartDimensions.paddingBottom -
                        ratio *
                          (chartDimensions.height -
                            chartDimensions.paddingTop -
                            chartDimensions.paddingBottom);
                      const labelVal = Math.round(ratio * maxVal);
                      return (
                        <g key={idx}>
                          <line
                            x1={chartDimensions.paddingLeft}
                            y1={y}
                            x2={chartDimensions.width - chartDimensions.paddingRight}
                            y2={y}
                            stroke="#e2ece3"
                            strokeDasharray={idx === 0 ? "none" : "3 3"}
                            strokeWidth="1"
                          />
                          <text
                            x={chartDimensions.paddingLeft - 8}
                            y={y + 3}
                            textAnchor="end"
                            fontSize="10"
                            fill="#7a8b80"
                          >
                            {labelVal}
                          </text>
                        </g>
                      );
                    })}

                    {/* Bars */}
                    {result.labels.map((label, idx) => {
                      const val = activeMetric.values[idx] || 0;
                      const pct = activeMetric.percentages ? activeMetric.percentages[idx] : 0;
                      const color = result.colors ? result.colors[idx] : "#3b82f6";
                      const isHovered = hoveredBarIndex === idx;

                      const availWidth =
                        chartDimensions.width -
                        chartDimensions.paddingLeft -
                        chartDimensions.paddingRight;
                      const barSlotWidth = availWidth / result.labels.length;
                      const barWidth = Math.min(barSlotWidth * 0.62, 54);
                      const barX =
                        chartDimensions.paddingLeft +
                        idx * barSlotWidth +
                        (barSlotWidth - barWidth) / 2;

                      const availHeight =
                        chartDimensions.height -
                        chartDimensions.paddingTop -
                        chartDimensions.paddingBottom;
                      const barHeight = maxVal > 0 ? (val / maxVal) * availHeight : 0;
                      const barY =
                        chartDimensions.height -
                        chartDimensions.paddingBottom -
                        barHeight;

                      return (
                        <g
                          key={idx}
                          className="ai-bar-group"
                          onMouseEnter={() => setHoveredBarIndex(idx)}
                          onMouseLeave={() => setHoveredBarIndex(null)}
                        >
                          {/* Value on top of bar */}
                          <text
                            x={barX + barWidth / 2}
                            y={barY - 7}
                            textAnchor="middle"
                            fontSize="11"
                            fontWeight="600"
                            fill={isHovered ? color : "#2e3e33"}
                          >
                            {val} ({pct}%)
                          </text>

                          {/* Rect Bar */}
                          <rect
                            x={barX}
                            y={barY}
                            width={barWidth}
                            height={Math.max(barHeight, 2)}
                            rx="5"
                            ry="5"
                            fill={color}
                            opacity={isHovered ? 1 : 0.88}
                            stroke={isHovered ? "#1f2937" : "none"}
                            strokeWidth="1.5"
                            style={{
                              transition: "all 0.2s ease",
                              cursor: "pointer",
                            }}
                          />

                          {/* X-axis Label */}
                          <text
                            x={barX + barWidth / 2}
                            y={chartDimensions.height - chartDimensions.paddingBottom + 18}
                            textAnchor="middle"
                            fontSize="10"
                            fontWeight={isHovered ? "600" : "500"}
                            fill={isHovered ? "#111827" : "#55645a"}
                          >
                            {label.split(" (")[0]}
                          </text>

                          {/* Sub-label range */}
                          <text
                            x={barX + barWidth / 2}
                            y={chartDimensions.height - chartDimensions.paddingBottom + 31}
                            textAnchor="middle"
                            fontSize="9"
                            fill="#8a998f"
                          >
                            {label.includes("(") ? `(${label.split("(")[1]}` : ""}
                          </text>
                        </g>
                      );
                    })}
                  </svg>

                  {/* HOVER TOOLTIP POPUP */}
                  {hoveredBarIndex !== null && (
                    <div className="ai-chart-tooltip">
                      <strong>{result.labels[hoveredBarIndex]}</strong>
                      <div>
                        Số lượng: <b>{activeMetric.values[hoveredBarIndex]} {activeMetric.unit}</b>
                      </div>
                      <div>
                        Tỷ lệ: <b>{activeMetric.percentages[hoveredBarIndex]}%</b>
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="ai-empty-box">
                  <Info size={24} />
                  <span>{result.message || "Môn học này hiện chưa có dữ liệu điểm trong kho Fact_Course_Grade."}</span>
                </div>
              )}

              {/* GHI CHÚ BẢO MẬT & NGỮ NGHĨA SỐ LIỆU */}
              <div className="ai-stat-note">
                <strong>Ghi chú ngữ nghĩa số liệu:</strong> Fact_Course_Grade chứa nhiều lượt điểm trên mỗi sinh viên. Thang đo được quy chuẩn 0–10 qua <code>(Grade / Max_Grade) * 10</code>. Dữ liệu NULL được loại trừ (không tự gán thành 0). Tỷ lệ sinh viên đạt được tính dựa trên điểm trung bình tổng kết (&ge; 5.0).
              </div>

              {/* FOOTER METADATA */}
              <div className="ai-result-footer">
                <span>
                  ✓ Phân quyền Moodle: <strong>{result.courseCode}</strong> • Bộ máy:{" "}
                  <strong>
                    {result.mode === "gemini_api" || result.mode === "gemini"
                      ? `Gemini API (${result.modelUsed || "gemini-3.1-flash-lite"})`
                      : "Bộ quy tắc dự phòng (Rule-based)"}
                  </strong>
                </span>
                <span>
                  Thời điểm tạo: {new Date(result.generatedAt).toLocaleTimeString("vi-VN")}
                </span>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
