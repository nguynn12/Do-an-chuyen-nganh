import pool from "../../config/database.js";

// ======================================================
// HELPER - COHORT
// ======================================================

function normalizeCohort(value) {
  const cohort = String(value || "K47")
    .trim()
    .toUpperCase();

  if (
    cohort === "K45" ||
    cohort === "K46" ||
    cohort === "K47"
  ) {
    return cohort;
  }

  return "K47";
}

function getCohortPattern(cohort) {
  const mapping = {
    K45: "sv21%",
    K46: "sv22%",
    K47: "sv23%",
  };

  return mapping[cohort] || "sv23%";
}

// ======================================================
// LẤY THỐNG KÊ 1 LỚP
// ======================================================

async function getClassAnalytics(courseId, cohort) {
  const cohortPattern = getCohortPattern(cohort);

  const [rows] = await pool.query(
    `
      SELECT
        du.User_Key,
        du.Moodle_User_ID,
        du.Username,
        du.Full_Name,
        du.Email,

        dc.Course_Key,
        dc.Course_Code,
        dc.Course_Name,

        grade_stats.Average_Grade,
        grade_stats.Average_Grade_Percentage,

        COALESCE(
          assignment_stats.Total_Assignments,
          0
        ) AS Total_Assignments,

        COALESCE(
          submission_stats.Submitted_Assignments,
          0
        ) AS Submitted_Assignments,

        COALESCE(
          submission_stats.On_Time_Submissions,
          0
        ) AS On_Time_Submissions,

        COALESCE(
          submission_stats.Late_Submissions,
          0
        ) AS Late_Submissions,

        CASE
          WHEN grade_stats.Average_Grade_Percentage IS NULL
            THEN NULL

          WHEN grade_stats.Average_Grade_Percentage >= 50
            THEN 1

          ELSE 0
        END AS Is_Passed

      FROM Fact_Enrolment fe

      INNER JOIN Dim_User du
        ON du.User_Key = fe.User_Key

      INNER JOIN Dim_Course dc
        ON dc.Course_Key = fe.Course_Key


      /* ===============================================
         ĐIỂM SINH VIÊN
      =============================================== */

      LEFT JOIN (
        SELECT
          User_Key,
          Course_Key,

          ROUND(
            AVG(Grade),
            2
          ) AS Average_Grade,

          ROUND(
            AVG(Grade_Percentage),
            2
          ) AS Average_Grade_Percentage

        FROM Fact_Course_Grade

        GROUP BY
          User_Key,
          Course_Key

      ) grade_stats

        ON grade_stats.User_Key = du.User_Key
        AND grade_stats.Course_Key = dc.Course_Key


      /* ===============================================
         TỔNG SỐ ASSIGNMENT CỦA MÔN
      =============================================== */

      LEFT JOIN (
        SELECT
          Course_Key,
          COUNT(*) AS Total_Assignments

        FROM Dim_Activity

        WHERE Activity_Type IN (
          'assign',
          'assignment'
        )

        AND Is_Visible = 1

        GROUP BY Course_Key

      ) assignment_stats

        ON assignment_stats.Course_Key =
          dc.Course_Key


      /* ===============================================
         TÌNH TRẠNG NỘP BÀI
      =============================================== */

      LEFT JOIN (
        SELECT
          User_Key,
          Course_Key,

          COUNT(
            DISTINCT CASE
              WHEN Submission_Status = 'submitted'
              THEN Activity_Key
            END
          ) AS Submitted_Assignments,

          COUNT(
            DISTINCT CASE
              WHEN Submission_Status = 'submitted'
                AND Is_Submitted_On_Time = 1
              THEN Activity_Key
            END
          ) AS On_Time_Submissions,

          COUNT(
            DISTINCT CASE
              WHEN Submission_Status = 'submitted'
                AND Is_Submitted_On_Time = 0
              THEN Activity_Key
            END
          ) AS Late_Submissions

        FROM Fact_Assignment_Submission

        GROUP BY
          User_Key,
          Course_Key

      ) submission_stats

        ON submission_stats.User_Key =
          du.User_Key

        AND submission_stats.Course_Key =
          dc.Course_Key


      WHERE
        (
          dc.Moodle_Course_ID = ?
          OR dc.Course_Key = ?
        )

        AND du.Username LIKE ?

      ORDER BY du.Full_Name
    `,
    [
      courseId,
      courseId,
      cohortPattern,
    ]
  );

  return rows;
}


// ======================================================
// TẠO SUMMARY CHO 1 LỚP
// ======================================================

function buildSummary(rows) {
  const totalStudents = rows.length;

  const studentsWithGrade =
    rows.filter(
      (student) =>
        student.Average_Grade !== null &&
        student.Average_Grade !== undefined
    );

  // --------------------------------------------------
  // ĐIỂM TRUNG BÌNH
  // --------------------------------------------------

  const averageGrade =
    studentsWithGrade.length > 0
      ? Number(
          (
            studentsWithGrade.reduce(
              (sum, student) =>
                sum +
                Number(
                  student.Average_Grade || 0
                ),
              0
            ) / studentsWithGrade.length
          ).toFixed(2)
        )
      : 0;


  // --------------------------------------------------
  // SINH VIÊN ĐẠT
  // --------------------------------------------------

  const passedStudents =
    rows.filter(
      (student) =>
        Number(student.Is_Passed) === 1
    ).length;

  const passRate =
    studentsWithGrade.length > 0
      ? Number(
          (
            passedStudents /
            studentsWithGrade.length *
            100
          ).toFixed(2)
        )
      : 0;


  // --------------------------------------------------
  // NỘP BÀI
  // --------------------------------------------------

  const totalSubmitted =
    rows.reduce(
      (sum, student) =>
        sum +
        Number(
          student.Submitted_Assignments || 0
        ),
      0
    );

  const totalOnTime =
    rows.reduce(
      (sum, student) =>
        sum +
        Number(
          student.On_Time_Submissions || 0
        ),
      0
    );

  const totalLate =
    rows.reduce(
      (sum, student) =>
        sum +
        Number(
          student.Late_Submissions || 0
        ),
      0
    );

  const onTimeRate =
    totalSubmitted > 0
      ? Number(
          (
            totalOnTime /
            totalSubmitted *
            100
          ).toFixed(2)
        )
      : 0;


  // --------------------------------------------------
  // SINH VIÊN CẦN CHÚ Ý
  //
  // Tạm định nghĩa:
  // điểm trung bình < 5
  // HOẶC chưa nộp đủ bài
  // --------------------------------------------------

  const attentionStudents =
    rows.filter((student) => {
      const grade =
        student.Average_Grade === null
          ? null
          : Number(student.Average_Grade);

      const submitted =
        Number(
          student.Submitted_Assignments || 0
        );

      const totalAssignments =
        Number(
          student.Total_Assignments || 0
        );

      return (
        (grade !== null && grade < 5) ||
        (
          totalAssignments > 0 &&
          submitted < totalAssignments
        )
      );
    });


  return {
    totalStudents,
    averageGrade,

    passedStudents,
    passRate,

    totalSubmitted,
    totalOnTime,
    totalLate,
    onTimeRate,

    attentionCount:
      attentionStudents.length,
  };
}


// ======================================================
// API SO SÁNH 2 LỚP
//
// GET:
// /api/comparison
// ?courseA=12
// &cohortA=K47
// &courseB=10
// &cohortB=K45
// ======================================================

export async function compareClasses(req, res) {
  try {
    const {
      courseA,
      cohortA,
      courseB,
      cohortB,
    } = req.query;


    // --------------------------------------------------
    // VALIDATE
    // --------------------------------------------------

    if (!courseA || !courseB) {
      return res.status(400).json({
        success: false,
        message:
          "Thiếu courseA hoặc courseB.",
      });
    }


    const normalizedCohortA =
      normalizeCohort(cohortA);

    const normalizedCohortB =
      normalizeCohort(cohortB);


    // --------------------------------------------------
    // QUERY 2 LỚP SONG SONG
    // --------------------------------------------------

    const [
      classAStudents,
      classBStudents,
    ] = await Promise.all([
      getClassAnalytics(
        courseA,
        normalizedCohortA
      ),

      getClassAnalytics(
        courseB,
        normalizedCohortB
      ),
    ]);


    // --------------------------------------------------
    // SUMMARY
    // --------------------------------------------------

    const summaryA =
      buildSummary(classAStudents);

    const summaryB =
      buildSummary(classBStudents);


    // --------------------------------------------------
    // THÔNG TIN MÔN
    // --------------------------------------------------

    const courseInfoA =
      classAStudents[0]
        ? {
            courseKey:
              classAStudents[0].Course_Key,

            courseCode:
              classAStudents[0].Course_Code,

            courseName:
              classAStudents[0].Course_Name,
          }
        : null;


    const courseInfoB =
      classBStudents[0]
        ? {
            courseKey:
              classBStudents[0].Course_Key,

            courseCode:
              classBStudents[0].Course_Code,

            courseName:
              classBStudents[0].Course_Name,
          }
        : null;


    // --------------------------------------------------
    // CHÊNH LỆCH
    // A - B
    // --------------------------------------------------

    const difference = {
      averageGrade:
        Number(
          (
            summaryA.averageGrade -
            summaryB.averageGrade
          ).toFixed(2)
        ),

      passRate:
        Number(
          (
            summaryA.passRate -
            summaryB.passRate
          ).toFixed(2)
        ),

      onTimeRate:
        Number(
          (
            summaryA.onTimeRate -
            summaryB.onTimeRate
          ).toFixed(2)
        ),

      attentionCount:
        summaryA.attentionCount -
        summaryB.attentionCount,
    };


    // --------------------------------------------------
    // RESPONSE
    // --------------------------------------------------

    return res.json({
      success: true,

      classA: {
        course: courseInfoA,
        cohort: normalizedCohortA,
        summary: summaryA,
        students: classAStudents,
      },

      classB: {
        course: courseInfoB,
        cohort: normalizedCohortB,
        summary: summaryB,
        students: classBStudents,
      },

      difference,
    });

  } catch (error) {
    console.error(
      "Lỗi compareClasses:",
      error
    );

    return res.status(500).json({
      success: false,
      message:
        "Không thể so sánh hai lớp học.",
      error: error.message,
    });
  }
}