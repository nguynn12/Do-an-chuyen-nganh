import {
  X,
  UserRound,
  GraduationCap,
  ClipboardCheck,
  Clock3,
  AlertTriangle,
  CalendarClock,
  CheckCircle2,
} from "lucide-react";


function formatMinutes(minutes) {
  const value =
    Number(minutes || 0);

  if (value <= 0) {
    return "Chưa có dữ liệu";
  }

  const hours =
    Math.floor(value / 60);

  const mins =
    Math.round(value % 60);

  if (hours <= 0) {
    return `${mins} phút`;
  }

  return `${hours} giờ ${mins} phút`;
}


function formatDateTime(value) {
  if (!value) {
    return "Chưa có dữ liệu";
  }

  const date =
    new Date(value);

  if (
    Number.isNaN(
      date.getTime()
    )
  ) {
    return "Chưa có dữ liệu";
  }

  return date.toLocaleString(
    "vi-VN"
  );
}


function getStudentAssessment(
  student
) {
  const score =
    student.averageScore;

  const submissionRate =
    Number(
      student.submissionRate ||
        0
    );

  const late =
    Number(
      student.lateSubmissions ||
        0
    );


  const reasons = [];


  if (
    score !== null &&
    score !== undefined &&
    score < 5
  ) {
    reasons.push(
      "Điểm trung bình dưới 5.0"
    );
  }


  if (
    submissionRate < 60
  ) {
    reasons.push(
      "Tỷ lệ nộp bài thấp"
    );
  }


  if (late >= 2) {
    reasons.push(
      `Có ${late} bài nộp trễ`
    );
  }


  if (
    reasons.length > 0
  ) {
    return {
      key: "risk",
      label: "Cần chú ý",
      reasons,
    };
  }


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


    if (
      submissionRate < 75
    ) {
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


  return {
    key: "good",
    label: "Ổn định",
    reasons: [
      "Tiến độ học tập hiện tại ổn định",
    ],
  };
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
  open,
  onClose,
}) {
  if (
    !open ||
    !student
  ) {
    return null;
  }


  const assessment =
    getStudentAssessment(
      student
    );


  return (
    <div
      className="student-analysis-overlay"
      onMouseDown={
        onClose
      }
    >

      <aside
        className="student-analysis-panel"
        onMouseDown={(
          event
        ) =>
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
            onClick={
              onClose
            }
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


          <div>
            <h3>
              {student.fullName}
            </h3>

            <span>
              {student.studentCode}
            </span>

            <p>
              {student.email}
            </p>
          </div>

        </section>


        {/* STATUS */}

        <section
          className={`student-analysis-status ${assessment.key}`}
        >

          <div>
            {assessment.key ===
            "good" ? (
              <CheckCircle2
                size={19}
              />
            ) : (
              <AlertTriangle
                size={19}
              />
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
                <GraduationCap
                  size={18}
                />
              }
              label="Điểm trung bình"
              value={
                student.averageScore ===
                  null ||
                student.averageScore ===
                  undefined
                  ? "—"
                  : Number(
                      student.averageScore
                    ).toFixed(1)
              }
            />


            <MetricCard
              icon={
                <ClipboardCheck
                  size={18}
                />
              }
              label="Tỷ lệ nộp bài"
              value={`${Number(
                student.submissionRate ||
                  0
              )}%`}
            />


            <MetricCard
              icon={
                <AlertTriangle
                  size={18}
                />
              }
              label="Bài nộp trễ"
              value={
                student.lateSubmissions ||
                0
              }
            />


            <MetricCard
              icon={
                <Clock3
                  size={18}
                />
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

            <CalendarClock
              size={17}
            />

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

            <ClipboardCheck
              size={17}
            />

            <div>
              <span>
                Bài đã nộp
              </span>

              <strong>
                {student.submittedAssignments ||
                  0}
                {" / "}
                {student.totalAssignments ||
                  0}
              </strong>
            </div>

          </div>

        </section>


        {/* REASONS */}

        <section className="student-analysis-section">

          <div className="student-analysis-section-title">
            Nhận định
          </div>


          <div className="student-analysis-reasons">

            {assessment.reasons.map(
              (
                reason,
                index
              ) => (
                <div
                  key={index}
                >
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