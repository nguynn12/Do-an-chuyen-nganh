import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import "./ClassComparison.css";

// ============================================================
// CONFIG
// ============================================================

const API_BASE_URL = "http://localhost:3000";

const POWER_BI_BASE_URL =
  "https://app.powerbi.com/view?r=eyJrIjoiN2NkMjk3MzUtMWU4MS00ODIwLWE5Y2YtYWYzNTA1N2EzMWI3IiwidCI6Ijg0NTAzNjliLTExZmEtNDQxMy04ZGM3LTA2MGFiOWYzNGY0MSIsImMiOjEwfQ%3D%3D";

const COURSES = {
  10: {
    code: "GAME401",
    name: "Phát triển ứng dụng Game nâng cao",
  },
  11: {
    code: "AI401",
    name: "Trí tuệ nhân tạo",
  },
  12: {
    code: "WEB401",
    name: "Phát triển Web nâng cao",
  },
  13: {
    code: "TEST401",
    name: "Kiểm thử phần mềm",
  },
};

const POWER_BI_PAGES = {
  10: {
    K47: "b9ef05d030d0d10de5a2",
    K46: "68a0ce8c095221933963",
    K45: "2ceff00560d09ab7be86",
  },

  11: {
    K47: "4697afec1d51ee78e0a4",
    K46: "bb50fd7953840ad36e0b",
    K45: "cb0f20ad0ce3187e0c5e",
  },

  12: {
    K47: "cc41e639909530844076",
    K46: "c01d90503ee56bb0265c",
    K45: "90ef4635d47b3e91e96b",
  },

  13: {
    K47: "c9f8184ce9d0608d9d26",
    K46: "dc0b90db8433e2287263",
    K45: "c5c0f4581b119841650a",
  },
};

// ============================================================
// HELPERS
// ============================================================

function normalizeCohort(value) {
  return String(value || "").trim().toUpperCase();
}

function getReportUrl(courseKey, cohort) {
  const pageName = POWER_BI_PAGES[courseKey]?.[cohort];

  if (!pageName) return "";

  return `${POWER_BI_BASE_URL}&pageName=${pageName}`;
}

function toNumber(value, fallback = 0) {
  const result = Number(value);
  return Number.isFinite(result) ? result : fallback;
}

function formatNumber(value, digits = 2) {
  const result = Number(value);

  if (!Number.isFinite(result)) return "—";

  return result.toFixed(digits).replace(".", ",");
}

function formatPercent(value) {
  const result = Number(value);

  if (!Number.isFinite(result)) return "—";

  return `${result.toFixed(2).replace(".", ",")}%`;
}

// ============================================================
// POWER BI CARD
// ============================================================

function ReportCard({
  label,
  courseKey,
  cohort,
  reportUrl,
  side,
}) {
  const course = COURSES[courseKey];

  return (
    <article
      className={`comparison-report-card comparison-report-${side}`}
    >
      <div className="comparison-report-top">
        <div className="comparison-report-heading">
          <div className="comparison-report-label">
            {label}
          </div>

          <div className="comparison-course-line">
            <div className="comparison-course-icon">
              {course?.code?.slice(0, 2) || "--"}
            </div>

            <div>
              <div className="comparison-course-code">
                {course?.code || `COURSE ${courseKey}`}
              </div>

              <h2>
                {course?.name || `Môn ${courseKey}`}
              </h2>
            </div>
          </div>
        </div>

        <span className="comparison-cohort-badge">
          {cohort}
        </span>
      </div>

      <div className="comparison-report-frame-wrap">
        {reportUrl ? (
          <iframe
            key={`${courseKey}-${cohort}`}
            className="comparison-report-frame"
            src={reportUrl}
            title={`Power BI - ${
              course?.name || courseKey
            } - ${cohort}`}
            frameBorder="0"
            allowFullScreen
          />
        ) : (
          <div className="comparison-report-empty">
            <div className="comparison-empty-icon">!</div>

            <strong>Chưa có báo cáo Power BI</strong>

            <span>
              Course_Key {courseKey} • {cohort}
            </span>
          </div>
        )}
      </div>
    </article>
  );
}

// ============================================================
// METRIC ROW
// ============================================================

function MetricRow({
  label,
  valueA,
  valueB,
  difference,
  type = "number",
}) {
  const diff = Number(difference);

  function renderValue(value) {
    if (type === "percent") {
      return formatPercent(value);
    }

    if (type === "integer") {
      return toNumber(value);
    }

    return formatNumber(value);
  }

  function renderDifference() {
    if (!Number.isFinite(diff)) return "—";

    const prefix = diff > 0 ? "+" : "";

    if (type === "percent") {
      return `${prefix}${formatNumber(diff)}%`;
    }

    if (type === "integer") {
      return `${prefix}${diff}`;
    }

    return `${prefix}${formatNumber(diff)}`;
  }

  let diffClass = "neutral";

  if (Number.isFinite(diff)) {
    if (diff > 0) diffClass = "positive";
    if (diff < 0) diffClass = "negative";
  }

  return (
    <div className="comparison-metric-row">
      <div className="comparison-metric-name">
        {label}
      </div>

      <div className="comparison-metric-value comparison-metric-value-a">
        {renderValue(valueA)}
      </div>

      <div className="comparison-metric-value comparison-metric-value-b">
        {renderValue(valueB)}
      </div>

      <div
        className={`comparison-difference ${diffClass}`}
      >
        {renderDifference()}
      </div>
    </div>
  );
}

// ============================================================
// MAIN
// ============================================================

export default function ClassComparison() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  // ==========================================================
  // URL PARAMS
  // ==========================================================

  const courseA = Number(searchParams.get("courseA"));
  const courseB = Number(searchParams.get("courseB"));

  const cohortA = normalizeCohort(
    searchParams.get("cohortA")
  );

  const cohortB = normalizeCohort(
    searchParams.get("cohortB")
  );

  const selectedClassA = COURSES[courseA];
  const selectedClassB = COURSES[courseB];

  const reportA = getReportUrl(courseA, cohortA);
  const reportB = getReportUrl(courseB, cohortB);

  const valid =
    Boolean(selectedClassA) &&
    Boolean(selectedClassB) &&
    Boolean(cohortA) &&
    Boolean(cohortB);

  // ==========================================================
  // STATE
  // ==========================================================

  const [comparisonData, setComparisonData] =
    useState(null);

  const [loading, setLoading] =
    useState(false);

  const [apiError, setApiError] =
    useState("");

  // ==========================================================
  // API
  // ==========================================================

  useEffect(() => {
    if (!valid) return;

    const controller = new AbortController();

    async function loadComparison() {
      try {
        setLoading(true);
        setApiError("");
        setComparisonData(null);

        const params = new URLSearchParams({
          courseA: String(courseA),
          cohortA,
          courseB: String(courseB),
          cohortB,
        });

        const url =
          `${API_BASE_URL}/api/comparison?` +
          params.toString();

        console.log(
          "=========================================="
        );
        console.log("CLASS COMPARISON - NEW VERSION");
        console.log("API:", url);
        console.log(
          "=========================================="
        );

        const response = await fetch(url, {
          method: "GET",
          headers: {
            Accept: "application/json",
          },
          signal: controller.signal,
        });

        if (!response.ok) {
          const text = await response.text();

          throw new Error(
            `Backend trả về HTTP ${response.status}: ${text}`
          );
        }

        const result = await response.json();

        console.log("COMPARISON RESULT:", result);

        if (!result?.success) {
          throw new Error(
            result?.message ||
              "Backend không trả dữ liệu thành công."
          );
        }

        if (!result?.classA || !result?.classB) {
          throw new Error(
            "Backend thiếu dữ liệu classA hoặc classB."
          );
        }

        setComparisonData(result);
      } catch (error) {
        if (error.name === "AbortError") return;

        console.error(
          "COMPARISON API ERROR:",
          error
        );

        setApiError(
          error?.message ||
            "Không thể kết nối tới backend."
        );
      } finally {
        if (!controller.signal.aborted) {
          setLoading(false);
        }
      }
    }

    loadComparison();

    return () => {
      controller.abort();
    };
  }, [
    valid,
    courseA,
    cohortA,
    courseB,
    cohortB,
  ]);

  // ==========================================================
  // DATA
  // ==========================================================

  const apiClassA =
    comparisonData?.classA || null;

  const apiClassB =
    comparisonData?.classB || null;

  const summaryA =
    apiClassA?.summary || {};

  const summaryB =
    apiClassB?.summary || {};

  const difference =
    comparisonData?.difference || {};

  const comparisonInsights = comparisonData
    ? [
        { title: "Điểm trung bình", valueA: toNumber(summaryA.averageGrade), valueB: toNumber(summaryB.averageGrade), unit: " điểm", reverse: false },
        { title: "Tỷ lệ đạt", valueA: toNumber(summaryA.passRate), valueB: toNumber(summaryB.passRate), unit: " điểm %", reverse: false },
        { title: "Nộp đúng hạn", valueA: toNumber(summaryA.onTimeRate), valueB: toNumber(summaryB.onTimeRate), unit: " điểm %", reverse: false },
        { title: "Bài nộp trễ", valueA: toNumber(summaryA.totalLate), valueB: toNumber(summaryB.totalLate), unit: " bài", reverse: true },
      ].map((item) => {
        const delta = item.valueA - item.valueB;
        const equal = Math.abs(delta) < 0.01;
        const betterA = item.reverse ? delta < 0 : delta > 0;
        const codeA = `${apiClassA?.course?.courseCode || selectedClassA.code} • ${apiClassA?.cohort || cohortA}`;
        const codeB = `${apiClassB?.course?.courseCode || selectedClassB.code} • ${apiClassB?.cohort || cohortB}`;
        if (equal) return { tone: "neutral", title: item.title, text: `Hai lớp đang tương đương ở chỉ số ${item.title.toLowerCase()}.` };
        return { tone: item.reverse ? "warning" : "positive", title: item.title, text: `${betterA ? codeA : codeB} ${item.reverse ? "có ít hơn" : "cao hơn"} ${formatNumber(Math.abs(delta))}${item.unit} so với lớp còn lại.` };
      })
    : [];

  // ==========================================================
  // INVALID PARAMS
  // ==========================================================

  if (!valid) {
    return (
      <main className="comparison-page">
        <div className="comparison-invalid">
          <div className="comparison-invalid-icon">
            !
          </div>

          <h2>
            Không xác định được lớp cần so sánh
          </h2>

          <p>
            Hãy quay lại lớp học và chọn hai lớp
            trước khi bắt đầu so sánh.
          </p>

          <button
            type="button"
            onClick={() => navigate(-1)}
          >
            ← Quay lại
          </button>
        </div>
      </main>
    );
  }

  // ==========================================================
  // UI
  // ==========================================================

  return (
    <main className="comparison-page">

      {/* ====================================================
          HEADER
      ==================================================== */}

      <section className="comparison-page-header">
        <div>
          <div className="comparison-eyebrow">
            POWER BI ANALYTICS
          </div>

          <h1>So sánh lớp học</h1>

          <p>
            Đối chiếu trực quan kết quả học tập
            giữa hai lớp.
          </p>
        </div>

        <button
          type="button"
          className="comparison-back-button"
          onClick={() => navigate(-1)}
        >
          <span>←</span>
          Quay lại lớp
        </button>
      </section>

      {/* ====================================================
          CLASS SUMMARY
      ==================================================== */}

      <section className="comparison-selection-summary">
        <div className="comparison-selected-class">
          <span>LỚP HIỆN TẠI</span>

          <strong>
            {selectedClassA.name}
          </strong>

          <small>
            {selectedClassA.code} • {cohortA}
          </small>
        </div>

        <div className="comparison-vs">
          <span>VS</span>
        </div>

        <div className="comparison-selected-class comparison-selected-class-right">
          <span>SO SÁNH VỚI</span>

          <strong>
            {selectedClassB.name}
          </strong>

          <small>
            {selectedClassB.code} • {cohortB}
          </small>
        </div>
      </section>

      {/* ====================================================
          POWER BI
      ==================================================== */}

      <section className="comparison-section">
        <div className="comparison-section-heading">
          <div className="comparison-section-icon">
            ↗
          </div>

          <div>
            <h2>Phân tích trực quan</h2>

            <p>
              Báo cáo Power BI của hai lớp được
              hiển thị song song.
            </p>
          </div>
        </div>

        <div className="comparison-reports-grid">
          <ReportCard
            label="LỚP HIỆN TẠI"
            courseKey={courseA}
            cohort={cohortA}
            reportUrl={reportA}
            side="a"
          />

          <ReportCard
            label="SO SÁNH VỚI"
            courseKey={courseB}
            cohort={cohortB}
            reportUrl={reportB}
            side="b"
          />
        </div>
      </section>

      {/* ====================================================
          TỔNG QUAN - LUÔN HIỆN
      ==================================================== */}

      <section className="comparison-analysis-section">
        <div className="comparison-section-heading">
          <div className="comparison-section-icon">
            ≡
          </div>

          <div>
            <h2>Tổng quan so sánh</h2>

            <p>
              Dữ liệu được tổng hợp trực tiếp từ
              hệ thống LMS.
            </p>
          </div>
        </div>

        {/* LOADING */}

        {loading && (
          <div
            className="comparison-data-state"
            style={{
              padding: "25px",
              background: "#f7faf7",
              border: "1px solid #e1e9e2",
              borderRadius: "12px",
            }}
          >
            <strong>
              Đang tổng hợp dữ liệu so sánh...
            </strong>

            <div
              style={{
                marginTop: "5px",
                color: "#7b887f",
                fontSize: "12px",
              }}
            >
              Đang lấy dữ liệu hai lớp từ
              backend.
            </div>
          </div>
        )}

        {/* ERROR */}

        {!loading && apiError && (
          <div
            className="comparison-data-error"
            style={{
              padding: "20px",
              background: "#fff5f3",
              border: "1px solid #f1cbc5",
              borderRadius: "12px",
              color: "#a53c30",
            }}
          >
            <strong>
              Không tải được dữ liệu phân tích
            </strong>

            <div
              style={{
                marginTop: "6px",
                fontSize: "12px",
              }}
            >
              {apiError}
            </div>
          </div>
        )}

        {/* NO DATA */}

        {!loading &&
          !apiError &&
          !comparisonData && (
            <div
              style={{
                padding: "20px",
                background: "#f7faf7",
                border: "1px solid #e1e9e2",
                borderRadius: "12px",
                color: "#69776d",
              }}
            >
              Chưa nhận được dữ liệu từ backend.
            </div>
          )}

        {/* DATA */}

        {!loading &&
          !apiError &&
          comparisonData && (
            <>
              <div className="comparison-overview-head">
                <div />

                <div className="comparison-overview-class class-a">
                  <span>LỚP HIỆN TẠI</span>

                  <strong>
                    {apiClassA?.course?.courseCode ||
                      selectedClassA.code}
                  </strong>

                  <small>
                    {apiClassA?.cohort || cohortA}
                  </small>
                </div>

                <div className="comparison-overview-class class-b">
                  <span>SO SÁNH VỚI</span>

                  <strong>
                    {apiClassB?.course?.courseCode ||
                      selectedClassB.code}
                  </strong>

                  <small>
                    {apiClassB?.cohort || cohortB}
                  </small>
                </div>

                <div className="comparison-overview-diff-title">
                  CHÊNH LỆCH
                </div>
              </div>

              <div className="comparison-metrics">
                <MetricRow
                  label="Số sinh viên"
                  valueA={summaryA.totalStudents}
                  valueB={summaryB.totalStudents}
                  difference={
                    toNumber(
                      summaryA.totalStudents
                    ) -
                    toNumber(
                      summaryB.totalStudents
                    )
                  }
                  type="integer"
                />

                <MetricRow
                  label="Điểm trung bình"
                  valueA={summaryA.averageGrade}
                  valueB={summaryB.averageGrade}
                  difference={
                    difference.averageGrade
                  }
                />

                <MetricRow
                  label="Tỷ lệ đạt"
                  valueA={summaryA.passRate}
                  valueB={summaryB.passRate}
                  difference={
                    difference.passRate
                  }
                  type="percent"
                />

                <MetricRow
                  label="Tỷ lệ nộp đúng hạn"
                  valueA={summaryA.onTimeRate}
                  valueB={summaryB.onTimeRate}
                  difference={
                    difference.onTimeRate
                  }
                  type="percent"
                />

                <MetricRow
                  label="Tổng bài đã nộp"
                  valueA={summaryA.totalSubmitted}
                  valueB={summaryB.totalSubmitted}
                  difference={
                    toNumber(
                      summaryA.totalSubmitted
                    ) -
                    toNumber(
                      summaryB.totalSubmitted
                    )
                  }
                  type="integer"
                />

                <MetricRow
                  label="Tổng bài nộp trễ"
                  valueA={summaryA.totalLate}
                  valueB={summaryB.totalLate}
                  difference={
                    toNumber(summaryA.totalLate) -
                    toNumber(summaryB.totalLate)
                  }
                  type="integer"
                />
              </div>
            </>
          )}
      </section>

      {/* NHẬN XÉT SO SÁNH TỰ ĐỘNG */}
      {!loading && !apiError && comparisonData && (
        <section className="comparison-insights-section">
          <div className="comparison-section-heading">
            <div className="comparison-section-icon">✦</div>
            <div>
              <h2>Nhận xét so sánh</h2>
              <p>Nhận xét tự động từ các chỉ số tổng hợp của hai lớp.</p>
            </div>
          </div>
          <div className="comparison-insights-grid">
            {comparisonInsights.map((item, index) => (
              <article key={`${item.title}-${index}`} className={`comparison-insight-card ${item.tone}`}>
                <div className="comparison-insight-number">{String(index + 1).padStart(2, "0")}</div>
                <div><h3>{item.title}</h3><p>{item.text}</p></div>
              </article>
            ))}
          </div>
          <div className="comparison-insight-note"><strong>Gợi ý:</strong><span>Đối chiếu thêm Power BI phía trên khi cần xem chi tiết.</span></div>
        </section>
      )}

    </main>
  );
}