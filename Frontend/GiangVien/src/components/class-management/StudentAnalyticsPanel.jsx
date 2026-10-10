import {
  X,
  GraduationCap,
  ClipboardCheck,
  Clock3,
  AlertTriangle,
  CalendarClock,
  CheckCircle2,
  BarChart3,
  ExternalLink,
} from "lucide-react";
import { useNavigate } from "react-router-dom";


function formatMinutes(minutes) {
  const value = Number(minutes || 0);

  if (value <= 0) {
    return "Chưa có dữ liệu";
  }

  const hours = Math.floor(value / 60);
  const mins = Math.round(value % 60);

  if (hours <= 0) {
    return `${mins} phút`;
  }

  if (mins === 0) {
    return `${hours} giờ`;
  }

  return `${hours} giờ ${mins} phút`;
}


function formatDateTime(value) {
  if (!value) {
    return "Chưa có dữ liệu";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "Chưa có dữ liệu";
  }

  return date.toLocaleString("vi-VN");
}


function getStudentAssessment(student) {
  const score = student.averageScore;

  const submissionRate = Number(
    student.submissionRate || 0
  );

  const late = Number(
    student.lateSubmissions || 0
  );

  const reasons = [];


  // ==============================
  // CẦN CHÚ Ý
  // ==============================

  if (
    score !== null &&
    score !== undefined &&
    score < 5
  ) {
    reasons.push(
      "Điểm trung bình dưới 5.0"
    );
  }

  if (submissionRate < 60) {
    reasons.push(
      "Tỷ lệ nộp bài thấp"
    );
  }

  if (late >= 2) {
    reasons.push(
      `Có ${late} bài nộp trễ`
    );
  }

  if (reasons.length > 0) {
    return {
      key: "risk",
      label: "Cần chú ý",
      reasons,
    };
  }


  // ==============================
  // THEO DÕI
  // ==============================

  if (
    (
      score !== null &&
      score !== undefined &&
      score < 6.5
    ) ||
    late > 0 ||
    submissionRate < 75
  ) {
    if (
      score !== null &&
      score !== undefined &&
      score < 6.5
    ) {
      reasons.push(
        "Điểm trung bình dưới 6.5"
      );
    }

    if (late > 0) {
      reasons.push(
        `Có ${late} bài nộp trễ`
      );
    }

    if (submissionRate < 75) {
      reasons.push(
        "Tiến độ nộp bài cần theo dõi"
      );
    }

    return {
      key: "warning",
      label: "Theo dõi",
      reasons,
    };
  }


  // ==============================
  // ỔN ĐỊNH
  // ==============================

  return {
    key: "good",
    label: "Ổn định",
    reasons: [
      "Tiến độ học tập hiện tại ổn định",
    ],
  };
}


// ======================================================
// TẠO CƠ SỞ ĐÁNH GIÁ
// ======================================================

function getAssessmentBasis(
  student,
  classAverageScore
) {
  const basis = [];

  const score =
    student.averageScore === null ||
    student.averageScore === undefined
      ? null
      : Number(student.averageScore);

  const classAverage =
    classAverageScore === null ||
    classAverageScore === undefined
      ? null
      : Number(classAverageScore);

  const submitted =
    Number(
      student.submittedAssignments || 0
    );

  const total =
    Number(
      student.totalAssignments || 0
    );

  const late =
    Number(
      student.lateSubmissions || 0
    );

  const submissionRate =
    Number(
      student.submissionRate || 0
    );

  const learningMinutes =
    Number(
      student.totalTimeSpentMinutes || 0
    );


  // ==============================
  // ĐIỂM SO VỚI TRUNG BÌNH LỚP
  // ==============================

  if (score !== null) {
    if (classAverage !== null) {
      const difference =
        score - classAverage;

      if (Math.abs(difference) < 0.05) {
        basis.push({
          type: "good",
          text:
            `Điểm TB ${score.toFixed(1)}, ` +
            `xấp xỉ TB lớp ${classAverage.toFixed(1)}`,
        });
      } else if (difference > 0) {
        basis.push({
          type: "good",
          text:
            `Điểm TB ${score.toFixed(1)}, ` +
            `cao hơn TB lớp ${classAverage.toFixed(1)}`,
        });
      } else {
        basis.push({
          type:
            score < 5
              ? "risk"
              : "warning",
          text:
            `Điểm TB ${score.toFixed(1)}, ` +
            `thấp hơn TB lớp ${classAverage.toFixed(1)}`,
        });
      }
    } else {
      basis.push({
        type:
          score < 5
            ? "risk"
            : "good",
        text:
          `Điểm trung bình hiện tại ${score.toFixed(1)}`,
      });
    }
  }


  // ==============================
  // TIẾN ĐỘ NỘP BÀI
  // ==============================

  if (total > 0) {
    if (submitted >= total) {
      basis.push({
        type: "good",
        text:
          `Hoàn thành ${submitted}/${total} bài`,
      });
    } else {
      basis.push({
        type:
          submissionRate < 60
            ? "risk"
            : "warning",
        text:
          `Đã hoàn thành ${submitted}/${total} bài ` +
          `(${submissionRate}% tiến độ)`,
      });
    }
  }


  // ==============================
  // BÀI NỘP TRỄ
  // ==============================

  if (late === 0) {
    basis.push({
      type: "good",
      text: "Không có bài nộp trễ",
    });
  } else {
    basis.push({
      type:
        late >= 2
          ? "risk"
          : "warning",
      text:
        `Có ${late} bài nộp trễ`,
    });
  }


  // ==============================
  // MỨC ĐỘ HOẠT ĐỘNG
  // ==============================

  if (learningMinutes > 0) {
    if (learningMinutes < 60) {
      basis.push({
        type: "warning",
        text:
          `Thời gian học mới ghi nhận ${formatMinutes(
            learningMinutes
          )}`,
      });
    } else {
      basis.push({
        type: "good",
        text:
          `Đã ghi nhận ${formatMinutes(
            learningMinutes
          )} hoạt động học tập`,
      });
    }
  } else {
    basis.push({
      type: "warning",
      text:
        "Chưa ghi nhận thời gian học tập",
    });
  }


  return basis;
}


function MetricCard({
  icon,
  label,
  value,
}) {
  return (
    <div className="student-analysis-metric">

      <div className="student-analysis-metric-icon">
        {icon}
      </div>

      <div>
        <span>
          {label}
        </span>

        <strong>
          {value}
        </strong>
      </div>

    </div>
  );
}


function StudentAnalyticsPanel({
  student,
  classAverageScore,
  open,
  onClose,
}) {
  const navigate = useNavigate();

  if (!open || !student) {
    return null;
  }

  const assessment =
    getStudentAssessment(student);

  const assessmentBasis =
    getAssessmentBasis(
      student,
      classAverageScore
    );

  const handleOpenStudent360 = () => {
    onClose();
    navigate(`/phan-tich?tab=STUDENT_360`);
  };

  return (
    <div
      className="student-analysis-overlay"
      onMouseDown={onClose}
    >

      <aside
        className="student-analysis-panel"
        onMouseDown={(event) =>
          event.stopPropagation()
        }
      >

        {/* HEADER */}

        <div className="student-analysis-header">

          <div>
            <span>
              HỒ SƠ PHÂN TÍCH
            </span>

            <h2>
              Sinh viên
            </h2>
          </div>


          <button
            type="button"
            onClick={onClose}
            title="Đóng"
          >
            <X size={18} />
          </button>

        </div>


        {/* PROFILE */}

        <section className="student-analysis-profile">

          <div className="student-analysis-avatar">
            {student.fullName
              ?.trim()
              .split(" ")
              .slice(-1)[0]
              ?.charAt(0)
              ?.toUpperCase() ||
              "S"}
          </div>


          <div style={{ flex: 1 }}>
            <h3>
              {student.fullName}
            </h3>

            <span>
              {student.studentCode}
            </span>

            <p>
              {student.email}
            </p>

            <button
              type="button"
              onClick={handleOpenStudent360}
              style={{
                marginTop: "8px",
                display: "inline-flex",
                alignItems: "center",
                gap: "6px",
                padding: "6px 12px",
                fontSize: "11px",
                fontWeight: 600,
                color: "#1e3a8a",
                background: "#eff6ff",
                border: "1px solid #bfdbfe",
                borderRadius: "6px",
                cursor: "pointer",
                transition: "all 0.2s ease",
              }}
              title="Mở báo cáo Power BI Student 360 cho sinh viên này"
            >
              <BarChart3 size={13} />
              Mở Power BI Student 360
              <ExternalLink size={11} />
            </button>
          </div>

        </section>


        {/* STATUS */}

        <section
          className={`student-analysis-status ${assessment.key}`}
        >

          <div>
            {assessment.key === "good" ? (
              <CheckCircle2 size={19} />
            ) : (
              <AlertTriangle size={19} />
            )}
          </div>


          <div>
            <span>
              Đánh giá hiện tại
            </span>

            <strong>
              {assessment.label}
            </strong>
          </div>

        </section>


        {/* METRICS */}

        <section className="student-analysis-section">

          <div className="student-analysis-section-title">
            Chỉ số học tập
          </div>


          <div className="student-analysis-grid">

            <MetricCard
              icon={
                <GraduationCap size={18} />
              }
              label="Điểm trung bình"
              value={
                student.averageScore === null ||
                student.averageScore === undefined
                  ? "—"
                  : Number(
                      student.averageScore
                    ).toFixed(1)
              }
            />


            <MetricCard
              icon={
                <ClipboardCheck size={18} />
              }
              label="Tỷ lệ nộp bài"
              value={`${Number(
                student.submissionRate || 0
              )}%`}
            />


            <MetricCard
              icon={
                <AlertTriangle size={18} />
              }
              label="Bài nộp trễ"
              value={
                student.lateSubmissions || 0
              }
            />


            <MetricCard
              icon={
                <Clock3 size={18} />
              }
              label="Thời gian học"
              value={formatMinutes(
                student.totalTimeSpentMinutes
              )}
            />

          </div>

        </section>


        {/* ACTIVITY */}

        <section className="student-analysis-section">

          <div className="student-analysis-section-title">
            Hoạt động gần đây
          </div>


          <div className="student-analysis-info-row">

            <CalendarClock size={17} />

            <div>
              <span>
                Truy cập gần nhất
              </span>

              <strong>
                {formatDateTime(
                  student.lastAccessTime
                )}
              </strong>
            </div>

          </div>


          <div className="student-analysis-info-row">

            <ClipboardCheck size={17} />

            <div>
              <span>
                Bài đã nộp
              </span>

              <strong>
                {student.submittedAssignments || 0}
                {" / "}
                {student.totalAssignments || 0}
              </strong>
            </div>

          </div>

        </section>


        {/* CƠ SỞ ĐÁNH GIÁ */}

        <section className="student-analysis-section">

          <div className="student-analysis-section-title">
            Cơ sở đánh giá
          </div>


          <div className="student-analysis-basis">

            {assessmentBasis.map(
              (item, index) => (
                <div
                  className={`student-analysis-basis-item ${item.type}`}
                  key={index}
                >
                  {item.type === "good" ? (
                    <CheckCircle2 size={16} />
                  ) : (
                    <AlertTriangle size={16} />
                  )}

                  <p>
                    {item.text}
                  </p>
                </div>
              )
            )}

          </div>

        </section>


        {/* NHẬN ĐỊNH */}

        <section className="student-analysis-section">

          <div className="student-analysis-section-title">
            Nhận định
          </div>


          <div className="student-analysis-reasons">

            {assessment.reasons.map(
              (reason, index) => (
                <div key={index}>
                  <span />

                  <p>
                    {reason}
                  </p>
                </div>
              )
            )}

          </div>

        </section>

      </aside>

    </div>
  );
}


export default StudentAnalyticsPanel;