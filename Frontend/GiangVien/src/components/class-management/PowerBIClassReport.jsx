import { useState } from "react";
import { useNavigate } from "react-router-dom";

// ============================================================
// PowerBIClassReport.jsx
//
// Course_Key:
// 10 = Phát triển ứng dụng Game nâng cao
// 11 = Trí tuệ nhân tạo
// 12 = Phát triển Web nâng cao
// 13 = Kiểm thử phần mềm
//
// Cohort:
// K45 / K46 / K47
//
// Chức năng:
// - Hiển thị Power BI của lớp hiện tại
// - Bấm "So sánh"
// - Chọn bất kỳ môn + khóa khác
// - Bấm "Bắt đầu so sánh" sẽ chuyển sang trang /so-sanh-lop
// ============================================================


// ============================================================
// LINK POWER BI CHUNG
// ============================================================

const POWER_BI_BASE_URL =
  "https://app.powerbi.com/view?r=eyJrIjoiN2NkMjk3MzUtMWU4MS00ODIwLWE5Y2YtYWYzNTA1N2EzMWI3IiwidCI6Ijg0NTAzNjliLTExZmEtNDQxMy04ZGM3LTA2MGFiOWYzNGY0MSIsImMiOjEwfQ%3D%3D";


// ============================================================
// 12 TRANG POWER BI
// ============================================================

const POWER_BI_PAGES = {
  // Game
  10: {
    K47: "b9ef05d030d0d10de5a2",
    K46: "68a0ce8c095221933963",
    K45: "2ceff00560d09ab7be86",
  },

  // Trí tuệ nhân tạo
  11: {
    K47: "4697afec1d51ee78e0a4",
    K46: "bb50fd7953840ad36e0b",
    K45: "cb0f20ad0ce3187e0c5e",
  },

  // Web nâng cao
  12: {
    K47: "cc41e639909530844076",
    K46: "c01d90503ee56bb0265c",
    K45: "90ef4635d47b3e91e96b",
  },

  // Kiểm thử
  13: {
    K47: "c9f8184ce9d0608d9d26",
    K46: "dc0b90db8433e2287263",
    K45: "c5c0f4581b119841650a",
  },
};


// ============================================================
// TÊN MÔN
// ============================================================

const COURSE_NAMES = {
  10: "Phát triển ứng dụng Game nâng cao",
  11: "Trí tuệ nhân tạo",
  12: "Phát triển Web nâng cao",
  13: "Kiểm thử phần mềm",
};


// ============================================================
// DANH SÁCH MÔN CHO DROPDOWN
// ============================================================

const COURSES = [
  {
    key: 10,
    name: "Phát triển ứng dụng Game nâng cao",
  },
  {
    key: 11,
    name: "Trí tuệ nhân tạo",
  },
  {
    key: 12,
    name: "Phát triển Web nâng cao",
  },
  {
    key: 13,
    name: "Kiểm thử phần mềm",
  },
];

const COHORTS = ["K47", "K46", "K45"];


// ============================================================
// CHUẨN HÓA COHORT
// ============================================================

function normalizeCohort(cohort) {
  if (cohort === null || cohort === undefined) {
    return "";
  }

  const value = String(cohort)
    .trim()
    .toUpperCase();

  if (!value) {
    return "";
  }

  if (
    value === "45" ||
    value === "46" ||
    value === "47"
  ) {
    return `K${value}`;
  }

  return value;
}


// ============================================================
// LẤY URL POWER BI
// ============================================================

export function getPowerBIUrl(courseKey, cohort) {
  const normalizedCourseKey = Number(courseKey);
  const normalizedCohort = normalizeCohort(cohort);

  const pageName =
    POWER_BI_PAGES[normalizedCourseKey]?.[
      normalizedCohort
    ];

  if (!pageName) {
    return null;
  }

  return `${POWER_BI_BASE_URL}&pageName=${pageName}`;
}


// ============================================================
// COMPONENT
// ============================================================

function PowerBIClassReport({ courseKey, cohort }) {
  const navigate = useNavigate();

  // ==========================================================
  // LỚP HIỆN TẠI
  // ==========================================================

  const currentCourseKey = Number(courseKey);
  const currentCohort = normalizeCohort(cohort);

  const validCourse =
    Number.isFinite(currentCourseKey) &&
    Object.prototype.hasOwnProperty.call(
      POWER_BI_PAGES,
      currentCourseKey
    );

  const validCohort =
    COHORTS.includes(currentCohort);

  const courseName =
    COURSE_NAMES[currentCourseKey] ||
    `Môn ${currentCourseKey}`;

  const reportUrl =
    getPowerBIUrl(
      currentCourseKey,
      currentCohort
    );


  // ==========================================================
  // STATE PANEL SO SÁNH
  // ==========================================================

  const [compareOpen, setCompareOpen] =
    useState(false);

  const [compareCourse, setCompareCourse] =
    useState(10);

  const [compareCohort, setCompareCohort] =
    useState("K46");


  // ==========================================================
  // THÔNG TIN LỚP SO SÁNH
  // ==========================================================

  const compareCourseName =
    COURSE_NAMES[Number(compareCourse)] || "";

  const compareUrl =
    getPowerBIUrl(
      compareCourse,
      compareCohort
    );


  // ==========================================================
  // MỞ PANEL SO SÁNH
  // ==========================================================

  function handleOpenCompare() {
    // Mặc định chọn cùng môn với lớp hiện tại.
    setCompareCourse(currentCourseKey);

    // Tự chọn một khóa khác để tiện so sánh.
    if (currentCohort === "K47") {
      setCompareCohort("K46");
    } else if (currentCohort === "K46") {
      setCompareCohort("K45");
    } else {
      setCompareCohort("K46");
    }

    setCompareOpen(true);
  }


  // ==========================================================
  // BẮT ĐẦU SO SÁNH
  //
  // QUAN TRỌNG:
  // Không render 2 Power BI tại ClassManagement nữa.
  // Chuyển hẳn sang route /so-sanh-lop.
  // ==========================================================

  function handleStartCompare() {
    if (!compareUrl) {
      return;
    }

    const normalizedCompareCohort =
      normalizeCohort(compareCohort);

    const params = new URLSearchParams({
      courseA: String(currentCourseKey),
      cohortA: currentCohort,
      courseB: String(compareCourse),
      cohortB: normalizedCompareCohort,
    });

    setCompareOpen(false);

    navigate(
      `/so-sanh-lop?${params.toString()}`
    );
  }


  // ==========================================================
  // STYLE THÔNG BÁO
  // ==========================================================

  const messageStyle = {
    minHeight: "400px",
    width: "100%",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    gap: "8px",
    color: "#7b867e",
    fontSize: "14px",
    textAlign: "center",
    padding: "30px",
    boxSizing: "border-box",
  };


  // ==========================================================
  // GIAO DIỆN
  // ==========================================================

  return (
    <section className="powerbi-section">

      {/* ======================================================
          HEADER
      ====================================================== */}

      <div className="powerbi-header">

        <div>
          <span>
            POWER BI ANALYTICS
          </span>

          <h2>
            Phân tích trực quan lớp học
          </h2>

          <p>
            Báo cáo tổng hợp theo môn học và{" "}
            {currentCohort || "khóa học"}.
          </p>
        </div>


        {/* ====================================================
            NÚT BÊN PHẢI HEADER
        ==================================================== */}

        <div className="powerbi-header-actions">

          {/* KHÓA HIỆN TẠI */}

          {currentCohort && (
            <div className="powerbi-badge">
              {currentCohort}
            </div>
          )}


          {/* NÚT SO SÁNH */}

          <button
            type="button"
            className="class-compare-button"
            onClick={handleOpenCompare}
          >
            <span>⇄</span>
            So sánh
          </button>

        </div>
      </div>


      {/* ======================================================
          PANEL CHỌN LỚP SO SÁNH
      ====================================================== */}

      {compareOpen && (
        <div className="powerbi-compare-panel">

          <div className="powerbi-compare-panel-top">

            <div>
              <span className="powerbi-compare-eyebrow">
                SO SÁNH VỚI
              </span>

              <h3>
                Chọn lớp cần đối chiếu
              </h3>

              <p>
                Bạn có thể chọn khóa khác
                của cùng môn hoặc một môn
                học khác.
              </p>
            </div>

            <button
              type="button"
              className="powerbi-compare-close"
              onClick={() =>
                setCompareOpen(false)
              }
              aria-label="Đóng"
            >
              ×
            </button>

          </div>


          <div className="powerbi-compare-fields">

            {/* MÔN HỌC */}

            <div className="powerbi-compare-field">

              <label>
                Môn học
              </label>

              <select
                value={compareCourse}
                onChange={(e) =>
                  setCompareCourse(
                    Number(e.target.value)
                  )
                }
              >
                {COURSES.map((course) => (
                  <option
                    key={course.key}
                    value={course.key}
                  >
                    {course.name}
                  </option>
                ))}
              </select>

            </div>


            {/* KHÓA */}

            <div className="powerbi-compare-field">

              <label>
                Khóa
              </label>

              <select
                value={compareCohort}
                onChange={(e) =>
                  setCompareCohort(
                    e.target.value
                  )
                }
              >
                {COHORTS.map(
                  (cohortOption) => (
                    <option
                      key={cohortOption}
                      value={cohortOption}
                    >
                      {cohortOption}
                    </option>
                  )
                )}
              </select>

            </div>

          </div>


          {/* ==================================================
              PREVIEW
          ================================================== */}

          <div className="powerbi-compare-preview">

            <div className="powerbi-compare-preview-class">

              <span>
                LỚP HIỆN TẠI
              </span>

              <strong>
                {courseName}
              </strong>

              <small>
                {currentCohort}
              </small>

            </div>


            <div className="powerbi-compare-vs">
              VS
            </div>


            <div className="powerbi-compare-preview-class">

              <span>
                SO SÁNH VỚI
              </span>

              <strong>
                {compareCourseName}
              </strong>

              <small>
                {compareCohort}
              </small>

            </div>

          </div>


          {/* ==================================================
              BUTTONS
          ================================================== */}

          <div className="powerbi-compare-panel-actions">

            <button
              type="button"
              className="powerbi-compare-cancel"
              onClick={() =>
                setCompareOpen(false)
              }
            >
              Hủy
            </button>

            <button
              type="button"
              className="powerbi-compare-submit"
              onClick={handleStartCompare}
              disabled={!compareUrl}
            >
              ⇄ Bắt đầu so sánh
            </button>

          </div>

        </div>
      )}


      {/* ======================================================
          KIỂM TRA DỮ LIỆU
      ====================================================== */}

      {!validCourse ? (
        <div
          className="powerbi-frame-wrap"
          style={messageStyle}
        >
          <strong>
            Không xác định được môn học.
          </strong>

          <span>
            Course_Key:{" "}
            {String(courseKey)}
          </span>
        </div>
      ) : !validCohort ? (
        <div
          className="powerbi-frame-wrap"
          style={messageStyle}
        >
          <strong>
            Không xác định được khóa học.
          </strong>

          <span>
            Cohort: {String(cohort)}
          </span>
        </div>
      ) : !reportUrl ? (
        <div
          className="powerbi-frame-wrap"
          style={messageStyle}
        >
          <strong>
            Chưa có báo cáo Power BI
            cho lớp này.
          </strong>
        </div>
      ) : (

        /* ====================================================
            POWER BI LỚP HIỆN TẠI
        ==================================================== */

        <div className="powerbi-frame-wrap">

          <iframe
            key={`${currentCourseKey}-${currentCohort}`}
            title={`Power BI - ${courseName} - ${currentCohort}`}
            src={reportUrl}
            frameBorder="0"
            allowFullScreen
            loading="lazy"
          />

        </div>
      )}

    </section>
  );
}

export default PowerBIClassReport;