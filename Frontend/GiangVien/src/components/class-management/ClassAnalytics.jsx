import { useMemo } from "react";

import {
  TrendingUp,
  TrendingDown,
  CircleCheckBig,
  TriangleAlert,
  Clock3,
  GitCompareArrows,
} from "lucide-react";

function formatScore(value) {
  if (
    value === null ||
    value === undefined ||
    Number.isNaN(Number(value))
  ) {
    return "—";
  }

  return Number(value).toFixed(1);
}

function AnalyticsCard({
  icon,
  label,
  value,
  description,
}) {
  return (
    <div className="class-analytics-card">
      <div className="class-analytics-card-icon">
        {icon}
      </div>

      <div>
        <span>{label}</span>

        <strong>{value}</strong>

        <small>{description}</small>
      </div>
    </div>
  );
}

function ClassAnalytics({
  students = [],
  course,
  goodCount = 0,
  warningCount = 0,
  riskCount = 0,
}) {
  const analytics = useMemo(() => {
    const scores = students
      .map((student) => student.averageScore)
      .filter(
        (score) =>
          score !== null &&
          score !== undefined &&
          Number.isFinite(Number(score))
      )
      .map(Number);

    const highestScore =
      scores.length > 0
        ? Math.max(...scores)
        : null;

    const lowestScore =
      scores.length > 0
        ? Math.min(...scores)
        : null;

    const passedStudents =
      scores.filter(
        (score) => score >= 5
      ).length;

    const passRate =
      scores.length > 0
        ? Math.round(
            (passedStudents /
              scores.length) *
              100
          )
        : 0;

    const lateSubmissions =
      students.reduce(
        (total, student) =>
          total +
          Number(
            student.lateSubmissions ||
              0
          ),
        0
      );

    // ================================
    // PHÂN BỐ ĐIỂM
    // ================================

    const distribution = [
      {
        label: "< 5",
        count: scores.filter(
          (score) => score < 5
        ).length,
      },
      {
        label: "5 - < 6.5",
        count: scores.filter(
          (score) =>
            score >= 5 &&
            score < 6.5
        ).length,
      },
      {
        label: "6.5 - < 8",
        count: scores.filter(
          (score) =>
            score >= 6.5 &&
            score < 8
        ).length,
      },
      {
        label: "8 - 10",
        count: scores.filter(
          (score) => score >= 8
        ).length,
      },
    ];

    const maxDistribution =
      Math.max(
        ...distribution.map(
          (item) => item.count
        ),
        1
      );

    return {
      highestScore,
      lowestScore,
      passRate,
      lateSubmissions,
      distribution,
      maxDistribution,
    };
  }, [students]);

  return (
    <section className="class-analytics-section">

      {/* ===============================
          HEADER
      =============================== */}

      <div className="class-analytics-heading">

        <div>
          <span>
            PHÂN TÍCH LỚP HỌC
          </span>

          <h2>
            Thống kê lớp hiện tại
          </h2>

          <p>
            Tổng hợp kết quả học tập
            và tình trạng sinh viên
            của lớp đang chọn.
          </p>
        </div>

        <button
          type="button"
          className="class-compare-button"
        >
          <GitCompareArrows
            size={17}
          />

          So sánh khóa
        </button>

      </div>


      {/* ===============================
          KPI
      =============================== */}

      <div className="class-analytics-cards">

        <AnalyticsCard
          icon={
            <TrendingUp
              size={19}
            />
          }
          label="Điểm cao nhất"
          value={formatScore(
            analytics.highestScore
          )}
          description="Sinh viên có kết quả cao nhất"
        />

        <AnalyticsCard
          icon={
            <TrendingDown
              size={19}
            />
          }
          label="Điểm thấp nhất"
          value={formatScore(
            analytics.lowestScore
          )}
          description="Mức điểm thấp nhất hiện tại"
        />

        <AnalyticsCard
          icon={
            <CircleCheckBig
              size={19}
            />
          }
          label="Tỷ lệ đạt"
          value={`${analytics.passRate}%`}
          description="Sinh viên có điểm từ 5.0"
        />

        <AnalyticsCard
          icon={
            <Clock3
              size={19}
            />
          }
          label="Bài nộp trễ"
          value={
            analytics.lateSubmissions
          }
          description="Tổng số bài nộp trễ"
        />

      </div>


      {/* ===============================
          CHARTS
      =============================== */}

      <div className="class-analytics-grid">

        {/* PHÂN BỐ ĐIỂM */}

        <div className="analytics-chart-card">

          <div className="analytics-chart-header">

            <div>
              <span>
                KẾT QUẢ HỌC TẬP
              </span>

              <h3>
                Phân bố điểm
              </h3>
            </div>

            <strong>
              {students.length} SV
            </strong>

          </div>


          <div className="score-distribution">

            {analytics.distribution.map(
              (item) => {
                const width =
                  (
                    item.count /
                    analytics.maxDistribution
                  ) *
                  100;

                return (
                  <div
                    className="score-distribution-row"
                    key={item.label}
                  >

                    <span className="score-distribution-label">
                      {item.label}
                    </span>

                    <div className="score-distribution-track">

                      <div
                        className="score-distribution-bar"
                        style={{
                          width:
                            item.count === 0
                              ? "0%"
                              : `${Math.max(
                                  width,
                                  8
                                )}%`,
                        }}
                      />

                    </div>

                    <strong>
                      {item.count}
                    </strong>

                  </div>
                );
              }
            )}

          </div>

        </div>


        {/* TÌNH TRẠNG SINH VIÊN */}

        <div className="analytics-chart-card">

          <div className="analytics-chart-header">

            <div>
              <span>
                THEO DÕI SINH VIÊN
              </span>

              <h3>
                Tình trạng lớp
              </h3>
            </div>

            <TriangleAlert
              size={19}
            />

          </div>


          <div className="student-status-summary">

            <div className="status-summary-item good">

              <div>
                <span />
                <p>Ổn định</p>
              </div>

              <strong>
                {goodCount}
              </strong>

            </div>


            <div className="status-summary-item warning">

              <div>
                <span />
                <p>Theo dõi</p>
              </div>

              <strong>
                {warningCount}
              </strong>

            </div>


            <div className="status-summary-item risk">

              <div>
                <span />
                <p>Cần chú ý</p>
              </div>

              <strong>
                {riskCount}
              </strong>

            </div>

          </div>


          <div className="analytics-class-summary">

            <div>
              <span>Điểm TB lớp</span>

              <strong>
                {formatScore(
                  course?.averageScore
                )}
              </strong>
            </div>

            <div>
              <span>Nộp bài</span>

              <strong>
                {Math.round(
                  Number(
                    course?.submissionRate ||
                      0
                  )
                )}
                %
              </strong>
            </div>

          </div>

        </div>

      </div>

    </section>
  );
}

export default ClassAnalytics;