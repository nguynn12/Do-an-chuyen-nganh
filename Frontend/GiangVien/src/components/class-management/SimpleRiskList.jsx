import React, { useMemo } from "react";
import { AlertTriangle, CheckCircle2 } from "lucide-react";

function formatLearningTime(minutes) {
  const value = Number(minutes || 0);

  if (value <= 0) {
    return "Chưa có dữ liệu";
  }

  const hours = Math.floor(value / 60);
  const remainMinutes = Math.round(value % 60);

  if (hours <= 0) {
    return `${remainMinutes} phút`;
  }

  if (remainMinutes === 0) {
    return `${hours} giờ`;
  }

  return `${hours} giờ ${remainMinutes} phút`;
}

function getStudentRiskFlags(student) {
  const flags = [];

  // 1. Điểm trung bình thấp (< 50% hoặc < 5.0 hoặc Is_Passed === 0)
  const score = student.averageScore;
  const pct = student.averageGradePercentage;
  if (
    (score !== null && score < 5.0) ||
    (pct !== null && pct < 50) ||
    student.isPassed === 0
  ) {
    flags.push({
      type: "grade",
      label: "Điểm thấp",
      badgeClass: "risk-flag-red",
      detail:
        score !== null
          ? `ĐTB: ${score.toFixed(1)}/10`
          : pct !== null
          ? `ĐTB: ${pct}%`
          : "Chưa đạt chuẩn",
      severity: 3,
    });
  }

  // 2. Tỷ lệ nộp bài đúng hạn thấp (< 50% hoặc trễ >= 2 bài hoặc chưa nộp nhiều)
  const onTimeRate = Number(student.onTimeRate || 0);
  const lateCount = Number(student.lateSubmissions || 0);
  const subRate = Number(student.submissionRate || 0);
  if (onTimeRate < 50 || lateCount >= 2 || subRate < 50) {
    flags.push({
      type: "submission",
      label: "Nộp trễ nhiều",
      badgeClass: "risk-flag-orange",
      detail: `Đúng hạn: ${onTimeRate}% (${lateCount} bài trễ)`,
      severity: 2,
    });
  }

  // 3. Thời gian học ít (< 60 phút)
  const minutes = Number(student.totalTimeSpentMinutes || 0);
  if (minutes < 60) {
    flags.push({
      type: "engagement",
      label: "Ít tương tác",
      badgeClass: "risk-flag-amber",
      detail: `Thời gian học: ${Math.round(minutes)} phút`,
      severity: 1,
    });
  }

  return flags;
}

export default function SimpleRiskList({ students = [], onSelectStudent }) {
  const riskStudents = useMemo(() => {
    return (students || [])
      .map((s) => ({
        student: s,
        flags: getStudentRiskFlags(s),
      }))
      .filter((item) => item.flags.length > 0)
      .sort((a, b) => {
        const maxSevA = Math.max(...a.flags.map((f) => f.severity));
        const maxSevB = Math.max(...b.flags.map((f) => f.severity));
        if (maxSevB !== maxSevA) return maxSevB - maxSevA;
        if (b.flags.length !== a.flags.length) return b.flags.length - a.flags.length;
        return (a.student.averageScore ?? 10) - (b.student.averageScore ?? 10);
      });
  }, [students]);

  return (
    <details
      style={{
        maxWidth: "1450px",
        margin: "0 auto 28px",
        background: "#ffffff",
        border: "1px solid rgba(75, 99, 78, 0.14)",
        borderRadius: "16px",
        padding: "16px 20px",
        boxShadow: "0 4px 18px rgba(44, 65, 48, 0.03)",
      }}
    >
      <summary
        style={{
          cursor: "pointer",
          fontWeight: 700,
          color: "#2c4130",
          fontSize: "14px",
          display: "flex",
          alignItems: "center",
          gap: "8px",
          userSelect: "none",
        }}
      >
        <AlertTriangle size={18} style={{ color: "#e7893b" }} />
        <span>Danh sách lọc theo ngưỡng đơn giản (Rule-based filter)</span>
        <span
          style={{
            marginLeft: "auto",
            fontSize: "12px",
            fontWeight: 600,
            color: "#79867d",
            background: "#f0f4ee",
            padding: "2px 10px",
            borderRadius: "12px",
          }}
        >
          {riskStudents.length} sinh viên gắn cờ
        </span>
      </summary>

      <div style={{ marginTop: "16px" }}>
        <section className="risk-section" style={{ margin: 0, padding: 0, background: "transparent", border: "none" }}>
          <div className="risk-section-header" style={{ marginBottom: "12px" }}>
            <p style={{ margin: 0, fontSize: "12px", color: "#66736b" }}>
              Hệ thống lọc nhanh sinh viên theo các ngưỡng cứng: Điểm TB &lt; 5.0, Tỷ lệ đúng hạn &lt; 50% hoặc thời gian học &lt; 60 phút.
            </p>
          </div>

          {riskStudents.length === 0 ? (
            <div className="risk-empty-box">
              <CheckCircle2 size={22} style={{ color: "#37883e" }} />
              <div>
                <strong>Không phát hiện sinh viên nào có nguy cơ</strong>
                <p>
                  Toàn bộ sinh viên trong lớp đều đang duy trì kết quả và tiến độ học tập đạt chuẩn.
                </p>
              </div>
            </div>
          ) : (
            <div className="risk-table-wrap">
              <table className="risk-table">
                <thead>
                  <tr>
                    <th>Sinh viên</th>
                    <th>Cờ cảnh báo (Lý do gắn cờ)</th>
                    <th>Điểm TB</th>
                    <th>Tiến độ nộp bài</th>
                    <th>Thời gian học</th>
                    <th style={{ textAlign: "right" }}>Thao tác</th>
                  </tr>
                </thead>
                <tbody>
                  {riskStudents.map(({ student: s, flags }) => {
                    const avatarLetter =
                      s.fullName
                        ?.trim()
                        .split(" ")
                        .slice(-1)[0]
                        ?.charAt(0)
                        ?.toUpperCase() || "S";

                    return (
                      <tr key={s.userKey || s.id}>
                        <td>
                          <div className="risk-student-info">
                            <div className="risk-avatar">{avatarLetter}</div>
                            <div>
                              <strong className="risk-student-name">
                                {s.fullName}
                              </strong>
                              <span className="risk-student-code">
                                {s.studentCode} • {s.email}
                              </span>
                            </div>
                          </div>
                        </td>
                        <td>
                          <div className="risk-flags-wrap">
                            {flags.map((f, fIdx) => (
                              <span
                                key={fIdx}
                                className={`risk-flag-badge ${f.badgeClass}`}
                                title={f.detail}
                              >
                                <i>●</i> {f.label}: <strong>{f.detail}</strong>
                              </span>
                            ))}
                          </div>
                        </td>
                        <td>
                          <strong
                            style={{
                              color:
                                s.averageScore !== null && s.averageScore < 5
                                  ? "#dc2626"
                                  : "#203026",
                            }}
                          >
                            {s.averageScore !== null
                              ? `${s.averageScore.toFixed(1)}/10`
                              : "—"}
                          </strong>
                        </td>
                        <td>
                          <div>
                            <span>
                              {s.submittedAssignments}/{s.totalAssignments} bài
                            </span>
                            <span
                              style={{
                                fontSize: "11px",
                                color:
                                  s.onTimeRate < 50 ? "#dc2626" : "#79867d",
                                marginLeft: "4px",
                              }}
                            >
                              ({s.onTimeRate}% đúng hạn)
                            </span>
                          </div>
                        </td>
                        <td>
                          <span>
                            {formatLearningTime(s.totalTimeSpentMinutes)}
                          </span>
                        </td>
                        <td style={{ textAlign: "right" }}>
                          <button
                            type="button"
                            className="risk-action-btn"
                            onClick={() => onSelectStudent && onSelectStudent(s)}
                          >
                            Xem chi tiết
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>
    </details>
  );
}
