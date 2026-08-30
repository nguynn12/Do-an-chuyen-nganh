import { Database } from "lucide-react";
import { useNavigate } from "react-router-dom";

function AnalyticsOverview({ analytics }) {
  const navigate = useNavigate();

  const maxScore = Math.max(
    10,
    ...analytics.topCourses.map((item) => item.value)
  );

  return (
    <section className="section">
      <div
        className="section-title left clickable-title"
        onClick={() => navigate("/phan-tich")}
      >
        <Database size={19} />
        <strong>Tổng quan phân tích lớp học</strong>
      </div>

      <div className="analytics-card">
        <div className="chart-block">
          <strong>Điểm trung bình top 3 lớp</strong>

          <div className="bar-chart">
            {analytics.topCourses.map((item) => (
              <div className="bar-wrapper" key={item.courseId} title={item.label}>
                <div
                  className="bar"
                  style={{ height: `${(item.value / maxScore) * 100}%` }}
                >
                  <span>{item.value.toFixed(1)}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="chart-block">
          <strong>Chuyên cần hàng tuần</strong>

          <div className="attendance-chart">
            {analytics.attendanceTrend.map((item, index) => {
              const x =
                analytics.attendanceTrend.length <= 1
                  ? 50
                  : 10 +
                    (index / (analytics.attendanceTrend.length - 1)) * 80;
              const y = 100 - item.rate;

              return (
                <span
                  key={`${item.week}-${index}`}
                  className="dot"
                  title={`${item.week}: ${item.rate}%`}
                  style={{
                    left: `${x}%`,
                    top: `${Math.max(8, Math.min(80, y * 2.5))}%`,
                  }}
                />
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}

export default AnalyticsOverview;
