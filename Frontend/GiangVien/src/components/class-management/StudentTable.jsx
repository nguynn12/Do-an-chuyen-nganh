import {
  ChevronRight,
  MoreHorizontal,
} from "lucide-react";


// ======================================================
// TRẠNG THÁI SINH VIÊN
//
// < 5.0       → Cần chú ý
// 5.0 - < 7.0 → Theo dõi
// >= 7.0      → Ổn định
//
// Ngoài ra:
// chuyên cần < 70%  → Cần chú ý
// chuyên cần < 80%  → Theo dõi
// nộp bài < 60%     → Cần chú ý
// nộp bài < 75%     → Theo dõi
// >= 2 bài trễ      → Theo dõi
// ======================================================

function getStudentStatus(
  student
) {
  const attendance =
    student.attendance;

  const submissionRate =
    Number(
      student.submissionRate ??
        0
    );

  const averageScore =
    student.averageScore;

  const lateSubmissions =
    Number(
      student.lateSubmissions ??
        0
    );


  // ====================================================
  // CẦN CHÚ Ý
  // ====================================================

  const lowAttendance =
    attendance !== null &&
    attendance !== undefined &&
    Number(attendance) < 70;


  const veryLowSubmission =
    submissionRate < 60;


  const veryLowScore =
    averageScore !== null &&
    averageScore !== undefined &&
    Number(averageScore) < 5;


  if (
    lowAttendance ||
    veryLowSubmission ||
    veryLowScore
  ) {
    return {
      key: "risk",
      label: "Cần chú ý",
    };
  }


  // ====================================================
  // THEO DÕI
  // ====================================================

  const warningAttendance =
    attendance !== null &&
    attendance !== undefined &&
    Number(attendance) < 80;


  const warningSubmission =
    submissionRate < 75;


  /*
    Điểm từ 5.0 đến dưới 7.0
    được xếp Theo dõi.
  */

  const warningScore =
    averageScore !== null &&
    averageScore !== undefined &&
    Number(averageScore) < 7;


  /*
    1 bài trễ chỉ ghi chú.
    Từ 2 bài trễ mới chuyển Theo dõi.
  */

  const warningLate =
    lateSubmissions >= 2;


  if (
    warningAttendance ||
    warningSubmission ||
    warningScore ||
    warningLate
  ) {
    return {
      key: "warning",
      label: "Theo dõi",
    };
  }


  // ====================================================
  // ỔN ĐỊNH
  // ====================================================

  return {
    key: "good",
    label: "Ổn định",
  };
}


// ======================================================
// STUDENT TABLE
// ======================================================

function StudentTable({
  students,
  onViewStudent,
}) {
  return (
    <div className="student-table-wrapper">

      <table className="student-table">

        {/* ==============================================
            HEADER
        ============================================== */}

        <thead>

          <tr>

            <th>
              MSSV
            </th>

            <th>
              Sinh viên
            </th>

            <th>
              Chuyên cần
            </th>

            <th>
              Nộp bài
            </th>

            <th>
              Điểm TB
            </th>

            <th>
              Trạng thái
            </th>

            <th></th>

          </tr>

        </thead>


        {/* ==============================================
            BODY
        ============================================== */}

        <tbody>

          {students.map(
            (student) => {

              const status =
                getStudentStatus(
                  student
                );


              // ==========================================
              // ATTENDANCE
              // ==========================================

              const hasAttendance =
                student.attendance !==
                  null &&
                student.attendance !==
                  undefined;


              const attendanceValue =
                hasAttendance
                  ? Number(
                      student.attendance
                    )
                  : null;


              // ==========================================
              // SUBMISSION
              // ==========================================

              const submissionRate =
                Number(
                  student.submissionRate ??
                    0
                );


              // ==========================================
              // SCORE
              // ==========================================

              const hasScore =
                student.averageScore !==
                  null &&
                student.averageScore !==
                  undefined;


              const averageScore =
                hasScore
                  ? Number(
                      student.averageScore
                    )
                  : null;


              // ==========================================
              // AVATAR
              // ==========================================

              const avatarLetter =
                student.fullName
                  ?.trim()
                  .split(" ")
                  .slice(-1)[0]
                  ?.charAt(0)
                  ?.toUpperCase() ||
                "S";


              return (
                <tr
                  key={
                    student.id
                  }
                >

                  {/* ===============================
                      MSSV
                  =============================== */}

                  <td>

                    <span className="student-code">
                      {student.studentCode}
                    </span>

                  </td>


                  {/* ===============================
                      STUDENT
                  =============================== */}

                  <td>

                    <div className="student-profile">

                      <div className="student-avatar">
                        {avatarLetter}
                      </div>


                      <div>

                        <strong>
                          {student.fullName}
                        </strong>


                        <span>
                          {student.email}
                        </span>

                      </div>

                    </div>

                  </td>


                  {/* ===============================
                      ATTENDANCE
                  =============================== */}

                  <td>

                    <div className="student-progress">

                      <div className="progress-header">

                        <strong>
                          {hasAttendance
                            ? `${attendanceValue}%`
                            : "—"}
                        </strong>

                      </div>


                      <div className="progress-track">

                        <span
                          style={{
                            width:
                              hasAttendance
                                ? `${Math.min(
                                    100,
                                    Math.max(
                                      0,
                                      attendanceValue
                                    )
                                  )}%`
                                : "0%",
                          }}
                        />

                      </div>

                    </div>

                  </td>


                  {/* ===============================
                      SUBMISSION
                  =============================== */}

                  <td>

                    <div className="student-progress">

                      <div className="progress-header">

                        <strong>
                          {submissionRate}%
                        </strong>

                      </div>


                      <div className="progress-track">

                        <span
                          style={{
                            width:
                              `${Math.min(
                                100,
                                Math.max(
                                  0,
                                  submissionRate
                                )
                              )}%`,
                          }}
                        />

                      </div>

                    </div>

                  </td>


                  {/* ===============================
                      SCORE
                  =============================== */}

                  <td>

                    <strong className="student-score">

                      {hasScore
                        ? averageScore.toFixed(
                            1
                          )
                        : "—"}

                    </strong>

                  </td>


                  {/* ===============================
                      STATUS
                  =============================== */}

                  <td>

                    <span
                      className={`student-status ${status.key}`}
                    >
                      {status.label}
                    </span>

                  </td>


                  {/* ===============================
                      ACTIONS
                  =============================== */}

                  <td>

                    <div className="student-actions">

                      <button
                        type="button"
                        className="student-more-button"
                        title="Tùy chọn"
                      >
                        <MoreHorizontal
                          size={17}
                        />
                      </button>


                      <button
                        type="button"
                        className="student-detail-button"
                        onClick={() =>
                          onViewStudent(
                            student
                          )
                        }
                        title="Xem hồ sơ phân tích"
                      >
                        <ChevronRight
                          size={17}
                        />
                      </button>

                    </div>

                  </td>

                </tr>
              );
            }
          )}

        </tbody>

      </table>

    </div>
  );
}


export default StudentTable;