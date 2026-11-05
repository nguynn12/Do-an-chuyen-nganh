import { useEffect, useState, useMemo } from "react";
import { BarChart3, Folder, Headphones, BookOpen, FileText, Users } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { IS_ASSIGNMENT_MANAGEMENT_ENABLED } from "../../config/featureFlags";
import { getCourseEngagementTrend, getCourseSegments } from "../../services/teacherApi";

function ActivityDashboard({ stats, courses = [] }) {
  const navigate = useNavigate();
  const [trendData, setTrendData] = useState([]);
  const [segmentData, setSegmentData] = useState(null);
  const [loading, setLoading] = useState(true);

  const courseIds = useMemo(() => {
    return (courses || [])
      .map((c) => c.id || c.courseId || c.Moodle_Course_ID)
      .filter(Boolean);
  }, [courses]);

  useEffect(() => {
    let isCancelled = false;

    if (!courseIds || courseIds.length === 0) {
      setLoading(false);
      setTrendData([]);
      setSegmentData(null);
      return;
    }

    setLoading(true);

    async function fetchActivity() {
      try {
        const trendPromises = courseIds.map((cid) =>
          getCourseEngagementTrend(cid).catch(() => [])
        );
        const segmentPromises = courseIds.map((cid) =>
          getCourseSegments(cid).catch(() => null)
        );

        const [trendResults, segmentResults] = await Promise.all([
          Promise.all(trendPromises),
          Promise.all(segmentPromises),
        ]);

        if (isCancelled) return;

        // 1. Tổng hợp xu hướng hoạt động các môn theo tuần
        const weekMap = new Map();
        trendResults.forEach((tList) => {
          if (Array.isArray(tList)) {
            tList.forEach((w) => {
              const key = w.weekLabel || `Tuần ${w.weekIndex}`;
              if (!weekMap.has(key)) {
                weekMap.set(key, {
                  label: key,
                  activeStudents: 0,
                  weekIndex: w.weekIndex || 0,
                });
              }
              const item = weekMap.get(key);
              item.activeStudents += Number(w.activeStudents || 0);
            });
          }
        });

        const aggregatedTrend = Array.from(weekMap.values()).sort(
          (a, b) => a.weekIndex - b.weekIndex
        );
        setTrendData(aggregatedTrend);

        // 2. Tổng hợp phân khúc hoạt động sinh viên thực tế từ các môn
        let good = 0;
        let watch = 0;
        let risk = 0;

        segmentResults.forEach((seg) => {
          if (seg && Array.isArray(seg.students)) {
            seg.students.forEach((s) => {
              if (s.riskLevel === "thấp") good++;
              else if (s.riskLevel === "trung bình") watch++;
              else if (s.riskLevel === "cao") risk++;
              else good++;
            });
          }
        });

        const totalStudents = good + watch + risk;
        if (totalStudents > 0) {
          const goodPct = Math.round((good / totalStudents) * 100);
          const watchPct = Math.round((watch / totalStudents) * 100);
          const riskPct = Math.max(0, 100 - goodPct - watchPct);
          setSegmentData({
            total: totalStudents,
            good,
            watch,
            risk,
            goodPct,
            watchPct,
            riskPct,
          });
        } else {
          setSegmentData(null);
        }
      } catch (err) {
        console.error("Lỗi nạp dữ liệu ActivityDashboard:", err);
        if (!isCancelled) {
          setTrendData([]);
          setSegmentData(null);
        }
      } finally {
        if (!isCancelled) setLoading(false);
      }
    }

    fetchActivity();

    return () => {
      isCancelled = true;
    };
  }, [courseIds]);

  // Tính tọa độ SVG cho biểu đồ đường
  const chartPoints = useMemo(() => {
    if (!trendData || trendData.length === 0) return [];
    const maxVal = Math.max(...trendData.map((d) => d.activeStudents), 1);
    const count = trendData.length;
    return trendData.map((d, i) => {
      const x = count === 1 ? 50 : 8 + i * (84 / (count - 1));
      const y = 68 - (d.activeStudents / maxVal) * 48;
      return { x, y, value: d.activeStudents, label: d.label };
    });
  }, [trendData]);

  const polyline = useMemo(() => {
    return chartPoints.map((p) => `${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(" ");
  }, [chartPoints]);

  return (
    <section className="activity-dashboard">
      {/* 1. Biểu đồ đường xu hướng hoạt động */}
      <div className="activity-card activity-chart-card">
        <div className="activity-heading">
          <span className="activity-icon" aria-hidden="true">
            <BarChart3 size={19} aria-hidden="true" />
          </span>
          <strong>
            Thống kê hoạt động <em>(theo tuần)</em>
          </strong>
          <select defaultValue="access" aria-label="Loại chỉ số hoạt động">
            <option value="access">Sinh viên tương tác</option>
          </select>
        </div>

        <div className="line-chart-wrap">
          {loading ? (
            <div
              style={{
                height: "125px",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "#64748b",
                fontSize: "12px",
              }}
            >
              Đang tải dữ liệu hoạt động...
            </div>
          ) : chartPoints.length > 0 ? (
            <>
              <svg
                viewBox="0 0 100 76"
                preserveAspectRatio="none"
                role="img"
                aria-label="Biểu đồ lượt sinh viên tương tác theo tuần"
              >
                {[18, 38, 58].map((y) => (
                  <line
                    key={y}
                    x1="8"
                    x2="94"
                    y1={y}
                    y2={y}
                    className="grid-line"
                  />
                ))}
                {chartPoints.length > 1 && (
                  <polygon
                    points={`8,70 ${polyline} 92,70`}
                    className="chart-area"
                  />
                )}
                {chartPoints.length > 1 && (
                  <polyline points={polyline} className="chart-line" />
                )}
                {chartPoints.map((p, i) => (
                  <circle
                    key={i}
                    cx={p.x}
                    cy={p.y}
                    r="1.6"
                    className="chart-dot"
                  />
                ))}
              </svg>
              <div className="chart-dates">
                {chartPoints.map((p, i) => (
                  <span key={i}>{p.label}</span>
                ))}
              </div>
            </>
          ) : (
            <div
              style={{
                height: "125px",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                color: "#64748b",
                fontSize: "12px",
                gap: "6px",
              }}
            >
              <BarChart3 size={24} style={{ opacity: 0.35 }} aria-hidden="true" />
              <span>Chưa có dữ liệu</span>
            </div>
          )}
        </div>
      </div>

      {/* 2. Biểu đồ Donut tỷ lệ sinh viên theo rủi ro / hoạt động */}
      <div className="activity-card student-activity-card">
        <div className="activity-heading">
          <span className="activity-icon" aria-hidden="true">
            <Users size={19} aria-hidden="true" />
          </span>
          <strong>Tỷ lệ hoạt động sinh viên</strong>
        </div>

        {loading ? (
          <div
            style={{
              height: "160px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "#64748b",
              fontSize: "12px",
            }}
          >
            Đang tải dữ liệu...
          </div>
        ) : segmentData && segmentData.total > 0 ? (
          <div className="donut-layout">
            <div
              className="donut"
              role="img"
              aria-label={`Tỷ lệ hoạt động sinh viên: Hoạt động tốt ${segmentData.good} (${segmentData.goodPct}%), Cần theo dõi ${segmentData.watch} (${segmentData.watchPct}%), Nguy cơ rủi ro ${segmentData.risk} (${segmentData.riskPct}%)`}
              style={{
                background: `conic-gradient(#2f8b45 0 ${segmentData.goodPct}%, #f2b632 ${segmentData.goodPct}% ${
                  segmentData.goodPct + segmentData.watchPct
                }%, #ef4d45 ${segmentData.goodPct + segmentData.watchPct}% 100%)`,
              }}
            >
              <div className="donut-hole">
                <b>{segmentData.total}</b>
                <span>Sinh viên</span>
              </div>
            </div>
            <div className="donut-legend">
              <div>
                <i className="good" />
                <span>Hoạt động tốt</span>
                <b>
                  {segmentData.good} ({segmentData.goodPct}%)
                </b>
              </div>
              <div>
                <i className="watch" />
                <span>Cần theo dõi</span>
                <b>
                  {segmentData.watch} ({segmentData.watchPct}%)
                </b>
              </div>
              <div>
                <i className="risk" />
                <span>Nguy cơ rủi ro</span>
                <b>
                  {segmentData.risk} ({segmentData.riskPct}%)
                </b>
              </div>
            </div>
          </div>
        ) : (
          <div
            style={{
              height: "160px",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              color: "#64748b",
              fontSize: "12px",
              gap: "6px",
            }}
          >
            <Users size={24} style={{ opacity: 0.35 }} aria-hidden="true" />
            <span>Chưa có dữ liệu</span>
          </div>
        )}
      </div>

      {/* 3. Phím tắt tài nguyên nhanh */}
      <div className="activity-card resources-card">
        <div className="activity-heading">
          <span className="activity-icon" aria-hidden="true">
            <Folder size={19} aria-hidden="true" />
          </span>
          <strong>Tài nguyên nhanh</strong>
        </div>
        <div className="resource-grid">
          {IS_ASSIGNMENT_MANAGEMENT_ENABLED && (
            <button
              type="button"
              onClick={() => navigate("/quan-ly-bai-tap")}
              title="Mở Quản lý bài tập & Ngân hàng đề thi"
            >
              <FileText size={25} aria-hidden="true" />
              <span>Ngân hàng đề thi</span>
            </button>
          )}
          <button
            type="button"
            onClick={() => navigate("/ho-tro")}
            title="Mở Hướng dẫn & Biểu mẫu"
          >
            <FileText size={25} aria-hidden="true" />
            <span>Biểu mẫu</span>
          </button>
          <button
            type="button"
            onClick={() => navigate("/ho-tro")}
            title="Mở Hướng dẫn sử dụng"
          >
            <BookOpen size={25} aria-hidden="true" />
            <span>Hướng dẫn sử dụng</span>
          </button>
          <button
            type="button"
            onClick={() => navigate("/ho-tro")}
            title="Liên hệ hỗ trợ kỹ thuật"
          >
            <Headphones size={25} aria-hidden="true" />
            <span>Liên hệ hỗ trợ</span>
          </button>
        </div>
      </div>
    </section>
  );
}

export default ActivityDashboard;
