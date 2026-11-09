import pool from "../../config/database.js";
import { calculateCourseBehaviorMetrics } from "../../shared/analytics/behaviorMetrics.js";


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
    cohort === "K47" ||
    cohort === "K48" ||
    cohort === "ALL"
  ) {
    return cohort;
  }

  return "K47";
}


function getCohortPattern(cohort) {
  const mapping = {
    ALL: "%",
    K45: "sv21%",
    K46: "sv22%",
    K47: "sv23%",
    K48: "sv24%",
  };

  return mapping[cohort] || "sv23%";
}


// ======================================================
// DANH SÁCH SINH VIÊN CỦA MÔN
//
// GET:
// /api/courses/:courseId/students?cohort=K47
// ======================================================

export async function getCourseStudents(req, res) {
  try {
    const { courseId } = req.params;

    const cohort = normalizeCohort(
      req.query.cohort
    );

    const cohortPattern =
      getCohortPattern(cohort);


    const [rows] = await pool.query(
      `
        SELECT
          du.User_Key,
          du.Moodle_User_ID,
          du.Username,
          du.First_Name,
          du.Last_Name,
          du.Full_Name,
          du.Email,
          du.Primary_Role,

          dc.Course_Key,
          dc.Moodle_Course_ID,
          dc.Course_Code,
          dc.Course_Name,

          fe.Status AS Enrolment_Status

        FROM Fact_Enrolment fe

        INNER JOIN Dim_User du
          ON du.User_Key = fe.User_Key

        INNER JOIN Dim_Course dc
          ON dc.Course_Key = fe.Course_Key

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


    return res.json({
      success: true,
      courseId: Number(courseId),
      cohort,
      total: rows.length,
      data: rows,
    });

  } catch (error) {

    console.error(
      "Lỗi getCourseStudents:",
      error
    );

    return res.status(500).json({
      success: false,
      message:
        "Không thể lấy danh sách sinh viên của môn học.",
      error: error.message,
    });
  }
}


// ======================================================
// THỐNG KÊ SINH VIÊN CỦA MÔN
//
// GET:
// /api/courses/:courseId/student-analytics?cohort=K47
// ======================================================

export async function getCourseStudentAnalytics(
  req,
  res
) {
  try {
    const { courseId } = req.params;

    const cohort = normalizeCohort(
      req.query.cohort
    );

    const cohortPattern =
      getCohortPattern(cohort);


    const [rows] = await pool.query(
      `
        SELECT

          du.User_Key,
          du.Moodle_User_ID,
          du.Username,
          du.Full_Name,
          du.Email,

          dc.Course_Key,
          dc.Moodle_Course_ID,
          dc.Course_Code,
          dc.Course_Name,

          fe.Status AS Enrolment_Status,


          /* ===========================
             GRADE
          =========================== */

          grade_stats.Average_Grade_Percentage,

          grade_stats.Average_Grade,


          /* ===========================
             ASSIGNMENT
          =========================== */

          COALESCE(
            assignment_stats.Total_Assignments,
            0
          ) AS Total_Assignments,


          COALESCE(
            submission_stats.Submitted_Assignments,
            0
          ) AS Submitted_Assignments,


          /* ===========================
             SUBMISSION RATE
          =========================== */

          CASE

            WHEN COALESCE(
              assignment_stats.Total_Assignments,
              0
            ) = 0

            THEN 0

            ELSE ROUND(
              (
                COALESCE(
                  submission_stats.Submitted_Assignments,
                  0
                )
                /
                assignment_stats.Total_Assignments
              ) * 100,
              2
            )

          END AS Submission_Rate,


          /* ===========================
             ON TIME
          =========================== */

          COALESCE(
            submission_stats.On_Time_Submissions,
            0
          ) AS On_Time_Submissions,


          COALESCE(
            submission_stats.Late_Submissions,
            0
          ) AS Late_Submissions,


          COALESCE(
            submission_stats.Graded_Submissions,
            0
          ) AS Graded_Submissions,


          /* ===========================
             ON TIME RATE
          =========================== */

          CASE

            WHEN COALESCE(
              submission_stats.Submitted_Assignments,
              0
            ) = 0

            THEN 0

            ELSE ROUND(
              (
                COALESCE(
                  submission_stats.On_Time_Submissions,
                  0
                )
                /
                submission_stats.Submitted_Assignments
              ) * 100,
              2
            )

          END AS On_Time_Rate,


          /* ===========================
             ENGAGEMENT
          =========================== */

          COALESCE(
            engagement_stats.Total_Time_Spent_Seconds,
            0
          ) AS Total_Time_Spent_Seconds,


          ROUND(
            COALESCE(
              engagement_stats.Total_Time_Spent_Seconds,
              0
            ) / 60,
            2
          ) AS Total_Time_Spent_Minutes,


          engagement_stats.Last_Access_Time,


          /* ===========================
             ATTENDANCE / CHUYÊN CẦN (ĐIỂM DANH LỚP HỌC)
          =========================== */
          attendance_stats.Total_Attendance_Sessions,
          attendance_stats.Attended_Sessions,

          CASE
            WHEN COALESCE(attendance_stats.Total_Attendance_Sessions, 0) = 0
            THEN NULL
            ELSE ROUND(
              (
                attendance_stats.Attended_Sessions
                /
                attendance_stats.Total_Attendance_Sessions
              ) * 100,
              2
            )
          END AS Attendance_Rate,


          /* ===========================
             ENGAGEMENT (TƯƠNG TÁC HỌC TẬP ONLINE)
          =========================== */
          COALESCE(
            engagement_stats.Active_Days,
            0
          ) AS Active_Days,


          COALESCE(
            engagement_stats.Total_Tracked_Days,
            0
          ) AS Total_Tracked_Days,


          /* ===========================
             PASS STATUS
          =========================== */

          CASE

            WHEN
              grade_stats.Average_Grade_Percentage
              IS NULL

            THEN NULL

            WHEN
              grade_stats.Average_Grade_Percentage
              >= 50

            THEN 1

            ELSE 0

          END AS Is_Passed


        FROM Fact_Enrolment fe


        INNER JOIN Dim_User du
          ON du.User_Key = fe.User_Key


        INNER JOIN Dim_Course dc
          ON dc.Course_Key = fe.Course_Key


        /* ===========================
           GRADE STATS
        =========================== */

        LEFT JOIN (

          SELECT

            User_Key,
            Course_Key,

            ROUND(
              AVG(Grade_Percentage),
              2
            ) AS Average_Grade_Percentage,

            ROUND(
              AVG(Grade),
              2
            ) AS Average_Grade

          FROM Fact_Course_Grade

          GROUP BY
            User_Key,
            Course_Key

        ) grade_stats

          ON grade_stats.User_Key =
            du.User_Key

          AND grade_stats.Course_Key =
            dc.Course_Key


        /* ===========================
           ASSIGNMENT COUNT
        =========================== */

        LEFT JOIN (

          SELECT

            Course_Key,

            COUNT(*) AS Total_Assignments

          FROM Dim_Activity

          WHERE
            Activity_Type IN (
              'assign',
              'assignment'
            )

            AND Is_Visible = 1

          GROUP BY Course_Key

        ) assignment_stats

          ON assignment_stats.Course_Key =
            dc.Course_Key


        /* ===========================
           SUBMISSION STATS
        =========================== */

        LEFT JOIN (

          SELECT

            User_Key,
            Course_Key,


            COUNT(
              DISTINCT CASE

                WHEN
                  Submission_Status = 'submitted'

                THEN Activity_Key

              END
            ) AS Submitted_Assignments,


            COUNT(
              DISTINCT CASE

                WHEN
                  Submission_Status = 'submitted'

                  AND Is_Submitted_On_Time = 1

                THEN Activity_Key

              END
            ) AS On_Time_Submissions,


            COUNT(
              DISTINCT CASE

                WHEN
                  Submission_Status = 'submitted'

                  AND Is_Submitted_On_Time = 0

                THEN Activity_Key

              END
            ) AS Late_Submissions,


            COUNT(
              DISTINCT CASE

                WHEN Is_Graded = 1

                THEN Activity_Key

              END
            ) AS Graded_Submissions


          FROM Fact_Assignment_Submission


          GROUP BY
            User_Key,
            Course_Key

        ) submission_stats

          ON submission_stats.User_Key =
            du.User_Key

          AND submission_stats.Course_Key =
            dc.Course_Key


        /* ===========================
           ENGAGEMENT + ATTENDANCE
        =========================== */

        LEFT JOIN (

          SELECT

            fde.User_Key,
            fde.Course_Key,


            /* Tổng thời gian học */

            SUM(
              COALESCE(
                fde.Time_Spent_Seconds,
                0
              )
            ) AS Total_Time_Spent_Seconds,


            /* Lần truy cập cuối */

            MAX(
              fde.Last_Access_Time
            ) AS Last_Access_Time,


            /* Số ngày sinh viên có hoạt động */

            COUNT(
              DISTINCT CASE

                WHEN COALESCE(
                  fde.Time_Spent_Seconds,
                  0
                ) > 0

                THEN fde.Date_Key

              END
            ) AS Active_Days,


            /* Tổng số ngày có dữ liệu của môn */

            (
              SELECT
                COUNT(
                  DISTINCT fde2.Date_Key
                )

              FROM Fact_Daily_Engagement fde2

              WHERE
                fde2.Course_Key =
                  fde.Course_Key

            ) AS Total_Tracked_Days


          FROM Fact_Daily_Engagement fde


          GROUP BY
            fde.User_Key,
            fde.Course_Key

        ) engagement_stats

          ON engagement_stats.User_Key =
            du.User_Key

          AND engagement_stats.Course_Key =
            dc.Course_Key


        /* ===========================
           ATTENDANCE STATS (ĐIỂM DANH LỚP HỌC)
        =========================== */

        LEFT JOIN (

          SELECT

            fa.User_Key,
            fa.Course_Key,

            COUNT(fa.Attendance_Key) AS Total_Attendance_Sessions,

            SUM(
              CASE
                WHEN LOWER(fa.Attendance_Status) IN ('present', 'p', 'late', 'l')
                THEN 1
                ELSE 0
              END
            ) AS Attended_Sessions

          FROM Fact_Attendance fa

          GROUP BY
            fa.User_Key,
            fa.Course_Key

        ) attendance_stats

          ON attendance_stats.User_Key =
            du.User_Key

          AND attendance_stats.Course_Key =
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


    return res.json({
      success: true,
      courseId: Number(courseId),
      cohort,
      total: rows.length,
      data: rows,
    });

  } catch (error) {

    console.error(
      "Lỗi getCourseStudentAnalytics:",
      error
    );

    return res.status(500).json({
      success: false,
      message:
        "Không thể lấy thống kê sinh viên.",
      error: error.message,
    });
  }
}


// ======================================================
// GRADE DISTRIBUTION
//
// GET:
// /api/courses/:courseId/grade-distribution?cohort=K47
// ======================================================

export async function getCourseGradeDistribution(
  req,
  res
) {
  try {

    const { courseId } = req.params;

    const cohort = normalizeCohort(
      req.query.cohort
    );

    const cohortPattern =
      getCohortPattern(cohort);


    // ==================================================
    // 1. TỪNG ACTIVITY
    // ==================================================

    const [activityRows] =
      await pool.query(
        `
          SELECT

            da.Activity_Key,
            da.Activity_Name,
            da.Activity_Type,

            COALESCE(
              da.Max_Grade,
              10
            ) AS Activity_Max_Grade,


            COUNT(
              fcg.Grade_Key
            ) AS Total_Graded,


            ROUND(
              AVG(fcg.Grade),
              2
            ) AS Average_Grade,


            ROUND(
              AVG(fcg.Grade_Percentage),
              2
            ) AS Average_Percentage,


            COALESCE(
              MIN(fcg.Grade),
              0
            ) AS Min_Grade,


            COALESCE(
              MAX(fcg.Grade),
              0
            ) AS Max_Grade,


            COALESCE(
              SUM(
                CASE

                  WHEN
                    fcg.Grade < 5.0
                    OR
                    fcg.Grade_Percentage < 50

                  THEN 1

                  ELSE 0

                END
              ),
              0
            ) AS Under_5,


            COALESCE(
              SUM(
                CASE

                  WHEN
                    (
                      fcg.Grade >= 5.0
                      AND fcg.Grade < 7.0
                    )

                    OR

                    (
                      fcg.Grade_Percentage >= 50
                      AND fcg.Grade_Percentage < 70
                    )

                  THEN 1

                  ELSE 0

                END
              ),
              0
            ) AS Range_5_To_7,


            COALESCE(
              SUM(
                CASE

                  WHEN
                    (
                      fcg.Grade >= 7.0
                      AND fcg.Grade < 8.5
                    )

                    OR

                    (
                      fcg.Grade_Percentage >= 70
                      AND fcg.Grade_Percentage < 85
                    )

                  THEN 1

                  ELSE 0

                END
              ),
              0
            ) AS Range_7_To_85,


            COALESCE(
              SUM(
                CASE

                  WHEN
                    fcg.Grade >= 8.5

                    OR

                    fcg.Grade_Percentage >= 85

                  THEN 1

                  ELSE 0

                END
              ),
              0
            ) AS Range_85_To_10


          FROM Dim_Activity da


          INNER JOIN Dim_Course dc

            ON dc.Course_Key =
              da.Course_Key


          LEFT JOIN Fact_Course_Grade fcg

            ON fcg.Activity_Key =
              da.Activity_Key

            AND fcg.Course_Key =
              dc.Course_Key


          LEFT JOIN Dim_User du

            ON du.User_Key =
              fcg.User_Key


          WHERE
            (
              dc.Moodle_Course_ID = ?
              OR
              dc.Course_Key = ?
            )

            AND da.Is_Visible = 1

            AND (
              fcg.User_Key IS NULL
              OR du.Username LIKE ?
            )


          GROUP BY

            da.Activity_Key,
            da.Activity_Name,
            da.Activity_Type,
            da.Max_Grade


          ORDER BY da.Activity_Name
        `,
        [
          courseId,
          courseId,
          cohortPattern,
        ]
      );


    // ==================================================
    // 2. OVERALL
    // ==================================================

    const [overallRows] =
      await pool.query(
        `
          SELECT

            'OVERALL' AS Activity_Key,

            'Điểm trung bình toàn môn (Tổng hợp)'
              AS Activity_Name,

            'overall' AS Activity_Type,

            10 AS Activity_Max_Grade,


            COUNT(
              user_stats.User_Key
            ) AS Total_Graded,


            ROUND(
              AVG(
                user_stats.avg_grade
              ),
              2
            ) AS Average_Grade,


            ROUND(
              AVG(
                user_stats.avg_percentage
              ),
              2
            ) AS Average_Percentage,


            COALESCE(
              MIN(
                user_stats.avg_grade
              ),
              0
            ) AS Min_Grade,


            COALESCE(
              MAX(
                user_stats.avg_grade
              ),
              0
            ) AS Max_Grade,


            COALESCE(
              SUM(
                CASE

                  WHEN
                    user_stats.avg_grade < 5

                  THEN 1

                  ELSE 0

                END
              ),
              0
            ) AS Under_5,


            COALESCE(
              SUM(
                CASE

                  WHEN
                    user_stats.avg_grade >= 5

                    AND
                    user_stats.avg_grade < 7

                  THEN 1

                  ELSE 0

                END
              ),
              0
            ) AS Range_5_To_7,


            COALESCE(
              SUM(
                CASE

                  WHEN
                    user_stats.avg_grade >= 7

                    AND
                    user_stats.avg_grade < 8.5

                  THEN 1

                  ELSE 0

                END
              ),
              0
            ) AS Range_7_To_85,


            COALESCE(
              SUM(
                CASE

                  WHEN
                    user_stats.avg_grade >= 8.5

                  THEN 1

                  ELSE 0

                END
              ),
              0
            ) AS Range_85_To_10


          FROM (

            SELECT

              fcg.User_Key,

              AVG(
                fcg.Grade
              ) AS avg_grade,

              AVG(
                fcg.Grade_Percentage
              ) AS avg_percentage


            FROM Fact_Course_Grade fcg


            INNER JOIN Dim_Course dc

              ON dc.Course_Key =
                fcg.Course_Key


            INNER JOIN Dim_User du

              ON du.User_Key =
                fcg.User_Key


            WHERE
              (
                dc.Moodle_Course_ID = ?
                OR
                dc.Course_Key = ?
              )

              AND du.Username LIKE ?


            GROUP BY fcg.User_Key

          ) user_stats
        `,
        [
          courseId,
          courseId,
          cohortPattern,
        ]
      );


    const overall =
      overallRows[0] || {
        Activity_Key: "OVERALL",

        Activity_Name:
          "Điểm trung bình toàn môn (Tổng hợp)",

        Activity_Type:
          "overall",

        Activity_Max_Grade:
          10,

        Total_Graded:
          0,

        Average_Grade:
          0,

        Average_Percentage:
          0,

        Min_Grade:
          0,

        Max_Grade:
          0,

        Under_5:
          0,

        Range_5_To_7:
          0,

        Range_7_To_85:
          0,

        Range_85_To_10:
          0,
      };


    const data = [
      overall,
      ...activityRows,
    ];


    return res.json({
      success: true,
      courseId: Number(courseId),
      cohort,
      data,
    });

  } catch (error) {

    console.error(
      "Lỗi getCourseGradeDistribution:",
      error
    );

    return res.status(500).json({
      success: false,
      message:
        "Không thể lấy phân bố điểm số môn học.",
      error: error.message,
    });
  }
}


// ======================================================
// ENGAGEMENT TREND
//
// GET:
// /api/courses/:courseId/engagement-trend?cohort=K47
// ======================================================

export async function getCourseEngagementTrend(
  req,
  res
) {
  try {

    const { courseId } = req.params;

    const cohort = normalizeCohort(
      req.query.cohort
    );

    const cohortPattern =
      getCohortPattern(cohort);


    // ==================================================
    // TOTAL STUDENTS
    // ==================================================

    const [studentCountRows] =
      await pool.query(
        `
          SELECT

            COUNT(
              DISTINCT fe.User_Key
            ) AS totalStudents

          FROM Fact_Enrolment fe


          INNER JOIN Dim_Course dc

            ON dc.Course_Key =
              fe.Course_Key


          INNER JOIN Dim_User du

            ON du.User_Key =
              fe.User_Key


          WHERE
            (
              dc.Moodle_Course_ID = ?
              OR
              dc.Course_Key = ?
            )

            AND du.Username LIKE ?
        `,
        [
          courseId,
          courseId,
          cohortPattern,
        ]
      );


    const totalStudents =
      Number(
        studentCountRows[0]
          ?.totalStudents || 0
      );


    // ==================================================
    // TREND
    // ==================================================

    const [trendRows] =
      await pool.query(
        `
          SELECT

            dd.Year_Number
              AS year,

            dd.Week_Number
              AS weekNumber,


            DATE_FORMAT(
              MIN(dd.Full_Date),
              '%d/%m/%Y'
            ) AS weekStartDate,


            DATE_FORMAT(
              MAX(dd.Full_Date),
              '%d/%m/%Y'
            ) AS weekEndDate,


            COUNT(
              DISTINCT fde.User_Key
            ) AS activeStudents,


            COALESCE(
              SUM(
                fde.Time_Spent_Seconds
              ),
              0
            ) AS totalSeconds,


            ROUND(
              COALESCE(
                SUM(
                  fde.Time_Spent_Seconds
                ),
                0
              ) / 3600,
              2
            ) AS totalHours,


            ROUND(
              COALESCE(
                SUM(
                  fde.Time_Spent_Seconds
                ),
                0
              ) / 60,
              1
            ) AS totalMinutes


          FROM Fact_Daily_Engagement fde


          INNER JOIN Dim_Course dc

            ON dc.Course_Key =
              fde.Course_Key


          INNER JOIN Dim_Date dd

            ON dd.Date_Key =
              fde.Date_Key


          INNER JOIN Dim_User du

            ON du.User_Key =
              fde.User_Key


          WHERE
            (
              dc.Moodle_Course_ID = ?
              OR
              dc.Course_Key = ?
            )

            AND du.Username LIKE ?


          GROUP BY

            dd.Year_Number,
            dd.Week_Number


          ORDER BY

            dd.Year_Number ASC,
            dd.Week_Number ASC
        `,
        [
          courseId,
          courseId,
          cohortPattern,
        ]
      );


    const trend =
      trendRows.map(
        (row, index) => {

          const activeCount =
            Number(
              row.activeStudents || 0
            );


          const denominator =

            totalStudents > 0

              ? totalStudents

              : activeCount > 0

              ? activeCount

              : 1;


          const avgHoursPerStudent =
            Number(
              (
                Number(
                  row.totalHours || 0
                )

                /

                denominator

              ).toFixed(2)
            );


          const avgMinutesPerStudent =
            Math.round(

              Number(
                row.totalMinutes || 0
              )

              /

              denominator
            );


          return {

            weekIndex:
              index + 1,

            weekLabel:
              `Tuần ${index + 1}`,

            weekNumber:
              row.weekNumber,

            year:
              row.year,


            weekStartDate:
              row.weekStartDate,

            weekEndDate:
              row.weekEndDate,


            dateRange:
              `${row.weekStartDate} - ${row.weekEndDate}`,


            activeStudents:
              activeCount,

            totalStudents,


            activeRate:

              totalStudents > 0

                ? Math.round(
                    (
                      activeCount
                      /
                      totalStudents
                    ) * 100
                  )

                : 0,


            totalHours:
              Number(
                row.totalHours || 0
              ),

            totalMinutes:
              Number(
                row.totalMinutes || 0
              ),

            avgHoursPerStudent,

            avgMinutesPerStudent,
          };
        }
      );


    return res.json({
      success: true,
      courseId: Number(courseId),
      cohort,
      totalStudents,
      data: trend,
    });

  } catch (error) {

    console.error(
      "Lỗi getCourseEngagementTrend:",
      error
    );

    return res.status(500).json({
      success: false,
      message:
        "Không thể lấy xu hướng tương tác của lớp học.",
      error: error.message,
    });
  }
}


// ======================================================
// HÀNH VI NỘP BÀI (NƯỚC RÚT / TRÌ HOÃN)
//
// GET:
// /api/courses/:courseId/submission-behavior
// ======================================================

export async function getCourseSubmissionBehavior(req, res) {
  try {
    const { courseId } = req.params;

    if (!courseId) {
      return res.status(400).json({
        success: false,
        message: "Mã khóa học là bắt buộc.",
      });
    }

    const cohort = req.query.cohort;
    const metrics = await calculateCourseBehaviorMetrics(pool, courseId, { cohort });

    const submissionSummary = {
      totalStudents: metrics.summary.totalStudents,
      lowSample: metrics.summary.lowSample,
      buckets: metrics.summary.submissionBuckets,
      totalSubmissionsCount: metrics.summary.submissionBuckets.reduce(
        (sum, b) => sum + b.count,
        0
      ),
    };

    const students = metrics.students.map((s) => ({
      userKey: s.userKey,
      moodleUserId: s.moodleUserId,
      username: s.username,
      fullName: s.fullName,
      email: s.email,
      totalAssignments: s.totalAssignments,
      submittedCount: s.submittedCount,
      onTimeCount: s.onTimeCount,
      lateCount: s.lateCount,
      onTimeRate: s.onTimeRate,
      avgLeadDays: s.avgLeadDays,
      submitStyle: s.submitStyle,
      submissions: s.submissions,
    }));

    return res.json({
      success: true,
      course: metrics.course,
      cohort: cohort || null,
      referenceDate: metrics.referenceDate,
      summary: submissionSummary,
      students,
    });
  } catch (error) {
    console.error("Lỗi getCourseSubmissionBehavior:", error);

    return res.status(500).json({
      success: false,
      message: "Không thể lấy dữ liệu hành vi nộp bài của môn học.",
      error: error.message,
    });
  }
}


// ======================================================
// PHÂN KHÚC SINH VIÊN 2x2
//
// GET:
// /api/courses/:courseId/segments?cohort=K47
// ======================================================

export async function getCourseSegments(req, res) {
  try {
    const { courseId } = req.params;

    if (!courseId) {
      return res.status(400).json({
        success: false,
        message: "Mã khóa học là bắt buộc.",
      });
    }

    const cohort = req.query.cohort;
    const metrics = await calculateCourseBehaviorMetrics(pool, courseId, { cohort });

    const students = metrics.students.map((s) => ({
      userKey: s.userKey,
      moodleUserId: s.moodleUserId,
      username: s.username,
      name: s.fullName,
      fullName: s.fullName,
      email: s.email,
      participationScore: s.participationScore,
      avgGradePct: s.avgGradePct,
      avgGrade10: s.avgGrade10,
      segment: s.segment,
      submitStyle: s.submitStyle,
      onTimeRate: s.onTimeRate,
      engagementHours: s.engagementHours,
      inactiveDays: s.inactiveDays,
      riskScore: s.riskScore,
      riskLevel: s.riskLevel,
    }));

    return res.json({
      success: true,
      course: metrics.course,
      cohort: cohort || null,
      referenceDate: metrics.referenceDate,
      thresholds: metrics.summary.thresholds,
      counts: metrics.summary.segmentCounts,
      totalStudents: metrics.summary.totalStudents,
      lowSample: metrics.summary.lowSample,
      students,
    });
  } catch (error) {
    console.error("Lỗi getCourseSegments:", error);

    return res.status(500).json({
      success: false,
      message: "Không thể lấy dữ liệu phân khúc 2x2 của môn học.",
      error: error.message,
    });
  }
}


// ======================================================
// CẢNH BÁO SỚM & ĐÁNH GIÁ RỦI RO HỌC TẬP
//
// GET:
// /api/courses/:courseId/risk?cohort=K47
// ======================================================

export async function getCourseRisk(req, res) {
  try {
    const { courseId } = req.params;

    if (!courseId) {
      return res.status(400).json({
        success: false,
        message: "Mã khóa học là bắt buộc.",
      });
    }

    const cohort = req.query.cohort;
    const metrics = await calculateCourseBehaviorMetrics(pool, courseId, { cohort });

    // Sắp xếp giảm dần theo riskScore
    const sortedStudents = [...metrics.students].sort(
      (a, b) => b.riskScore - a.riskScore
    );

    const riskCounts = {
      high: sortedStudents.filter((s) => s.riskLevel === "cao").length,
      medium: sortedStudents.filter((s) => s.riskLevel === "trung bình").length,
      low: sortedStudents.filter((s) => s.riskLevel === "thấp").length,
    };

    const students = sortedStudents.map((s) => ({
      userKey: s.userKey,
      moodleUserId: s.moodleUserId,
      username: s.username,
      name: s.fullName,
      fullName: s.fullName,
      email: s.email,
      riskScore: s.riskScore,
      riskLevel: s.riskLevel,
      riskReasons: s.riskReasons,
      flags: s.flags,
      avgGradePct: s.avgGradePct,
      avgGrade10: s.avgGrade10,
      onTimeRate: s.onTimeRate,
      engagementHours: s.engagementHours,
      inactiveDays: s.inactiveDays,
      submitStyle: s.submitStyle,
      submittedCount: s.submittedCount,
      totalAssignments: s.totalAssignments,
    }));

    return res.json({
      success: true,
      course: metrics.course,
      cohort: cohort || null,
      referenceDate: metrics.referenceDate,
      summary: {
        totalStudents: metrics.summary.totalStudents,
        lowSample: metrics.summary.lowSample,
        riskCounts,
        riskDistribution: metrics.summary.riskDistribution,
      },
      students,
    });
  } catch (error) {
    console.error("Lỗi getCourseRisk:", error);

    return res.status(500).json({
      success: false,
      message: "Không thể lấy dữ liệu cảnh báo rủi ro của môn học.",
      error: error.message,
    });
  }
}


// ======================================================
// DANH SÁCH COHORT THỰC TẾ CỦA MÔN HỌC
//
// GET:
// /api/courses/:courseId/cohorts
// ======================================================

export async function getCourseCohorts(req, res) {
  try {
    const { courseId } = req.params;

    if (!courseId) {
      return res.status(400).json({
        success: false,
        message: "Mã khóa học là bắt buộc.",
      });
    }

    const [courseRows] = await pool.query(
      `SELECT Course_Key, Moodle_Course_ID 
       FROM Dim_Course 
       WHERE Moodle_Course_ID = ? OR Course_Key = ? 
       LIMIT 1`,
      [courseId, courseId]
    );

    if (courseRows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Không tìm thấy môn học.",
      });
    }

    const courseKey = courseRows[0].Course_Key;
    const moodleCourseId = courseRows[0].Moodle_Course_ID;

    const [rows] = await pool.query(
      `SELECT 
         CASE 
           WHEN du.Username LIKE 'sv21%' THEN 'K45'
           WHEN du.Username LIKE 'sv22%' THEN 'K46'
           WHEN du.Username LIKE 'sv23%' THEN 'K47'
           WHEN du.Username LIKE 'sv24%' THEN 'K48'
           ELSE 'Other'
         END AS cohort,
         COUNT(DISTINCT fe.User_Key) AS studentCount
       FROM Fact_Enrolment fe
       JOIN Dim_User du ON du.User_Key = fe.User_Key
       WHERE fe.Course_Key = ? AND du.Primary_Role = 'Student'
       GROUP BY cohort
       HAVING cohort != 'Other' AND studentCount > 0
       ORDER BY cohort DESC`,
      [courseKey]
    );

    return res.json({
      success: true,
      courseId: moodleCourseId,
      courseKey,
      data: rows.map((r) => ({
        cohort: r.cohort || r.Cohort,
        studentCount: Number(r.studentCount ?? r.StudentCount ?? r.student_count ?? 0),
      })),
    });
  } catch (error) {
    console.error("Lỗi getCourseCohorts:", error);

    return res.status(500).json({
      success: false,
      message: "Không thể lấy danh sách khóa của môn học.",
      error: error.message,
    });
  }
}


// ======================================================
// THÔNG TIN CHI TIẾT MÔN HỌC
//
// GET:
// /api/courses/:courseId
// ======================================================

export async function getCourseDetails(req, res) {
  try {
    const { courseId } = req.params;

    if (!courseId) {
      return res.status(400).json({
        success: false,
        message: "Mã khóa học là bắt buộc.",
      });
    }

    const [rows] = await pool.query(
      `SELECT 
         dc.Course_Key,
         dc.Moodle_Course_ID,
         dc.Course_Code,
         dc.Course_Name,
         dc.Category_ID,
         dc.Category_Name,
         dc.Start_Date,
         dc.End_Date,
         dc.Is_Visible
       FROM Dim_Course dc
       WHERE dc.Moodle_Course_ID = ? OR dc.Course_Key = ?
       LIMIT 1`,
      [courseId, courseId]
    );

    if (rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Không tìm thấy môn học.",
      });
    }

    return res.json({
      success: true,
      data: rows[0],
    });
  } catch (error) {
    console.error("Lỗi getCourseDetails:", error);
    return res.status(500).json({
      success: false,
      message: "Không thể lấy thông tin môn học.",
      error: error.message,
    });
  }
}


// ======================================================
// ĐỌC TOÀN BỘ ĐIỂM ĐÃ CÓ CỦA MỘT SINH VIÊN (READ-ONLY)
// GET /api/courses/:courseId/students/:studentId/grades
// ======================================================

export async function getStudentCourseGrades(req, res) {
  try {
    const { courseId, studentId } = req.params;

    // 1. Xác định môn học (theo Moodle_Course_ID hoặc Course_Key)
    const [courses] = await pool.query(
      `SELECT Course_Key, Moodle_Course_ID, Course_Code, Course_Name
       FROM Dim_Course
       WHERE Moodle_Course_ID = ? OR Course_Key = ?
       LIMIT 1`,
      [courseId, courseId]
    );

    if (!courses || courses.length === 0) {
      return res.status(404).json({
        success: false,
        message: `Không tìm thấy môn học có ID: ${courseId}`,
      });
    }
    const course = courses[0];

    // 2. Xác định sinh viên (theo User_Key, Moodle_User_ID, hoặc Username)
    const [users] = await pool.query(
      `SELECT User_Key, Moodle_User_ID, Username, First_Name, Last_Name, Full_Name, Email, Primary_Role
       FROM Dim_User
       WHERE User_Key = ? OR Moodle_User_ID = ? OR Username = ?
       LIMIT 1`,
      [studentId, studentId, studentId]
    );

    if (!users || users.length === 0) {
      return res.status(404).json({
        success: false,
        message: `Không tìm thấy sinh viên có ID: ${studentId}`,
      });
    }
    const student = users[0];

    // 3. Kiểm tra tính hợp lệ về phân quyền & ghi danh (Enrollment validation)
    const [enrolments] = await pool.query(
      `SELECT Enrolment_Key, Status
       FROM Fact_Enrolment
       WHERE User_Key = ? AND Course_Key = ?
       LIMIT 1`,
      [student.User_Key, course.Course_Key]
    );

    const isEnrolled = enrolments.length > 0;
    const enrolmentStatus = isEnrolled ? enrolments[0].Status : "Not_Enrolled";

    // 4. Lấy danh sách đầu điểm cấu hình trong Data Warehouse (dim_teacher_grade_item)
    const [items] = await pool.query(
      `SELECT
        i.Item_Key,
        i.Component_Key,
        c.Component_Name,
        c.Overall_Weight,
        i.Item_Name,
        i.Source_Type,
        i.LMS_Grade_Item_ID,
        i.Internal_Weight,
        i.Max_Score,
        i.Display_Order
      FROM dim_teacher_grade_item i
      LEFT JOIN dim_teacher_grade_component c
        ON i.Component_Key = c.Component_Key
      WHERE i.Course_Key = ? AND (i.Is_Active = 1 OR i.Is_Active IS NULL)
      ORDER BY i.Display_Order ASC, i.Item_Key ASC`,
      [course.Course_Key]
    );

    const criteriaResults = [];
    let totalWeight = 0;
    let allScored = true;
    let weightedScoreSum = 0;
    const mappedLmsItemIds = new Set();

    for (const item of items) {
      const weight = Number(item.Internal_Weight) || 0;
      totalWeight += weight;
      let maxScore = Number(item.Max_Score) || 10;

      let score = null;
      let status = "ungraded";
      let provenance = "";
      let reason = "";
      let attendanceDetails = null;

      if (item.Source_Type === "LMS_GRADE") {
        if (!item.LMS_Grade_Item_ID) {
          status = "missing_mapping";
          reason = "Chưa ánh xạ LMS_Grade_Item_ID trong CSDL (Dim_Teacher_Grade_Item.LMS_Grade_Item_ID = NULL)";
          provenance = "Dim_Teacher_Grade_Item (Thiếu LMS ID)";
        } else {
          mappedLmsItemIds.add(Number(item.LMS_Grade_Item_ID));
          const [grades] = await pool.query(
            `SELECT Grade, Max_Grade, Grade_Percentage, Is_Passed
             FROM Fact_Course_Grade
             WHERE User_Key = ? AND Course_Key = ? AND Grade_Item_ID = ?
             LIMIT 1`,
            [student.User_Key, course.Course_Key, item.LMS_Grade_Item_ID]
          );

          if (grades.length > 0 && grades[0].Grade !== null && grades[0].Grade !== undefined) {
            maxScore = Number(grades[0].Max_Grade) || maxScore;
            score = Math.round(Number(grades[0].Grade) * 100) / 100;
            status = "graded";
            provenance = `Fact_Course_Grade (Moodle LMS Item #${item.LMS_Grade_Item_ID})`;
          } else {
            status = "ungraded";
            reason = "Chưa có điểm bài tập trong LMS (Chưa nộp bài hoặc chưa chấm)";
            provenance = `Fact_Course_Grade (Moodle LMS Item #${item.LMS_Grade_Item_ID})`;
          }
        }
      } else if (item.Source_Type === "ATTENDANCE") {
        const [attRows] = await pool.query(
          `SELECT Attendance_Status, COUNT(*) as cnt
           FROM fact_attendance
           WHERE User_Key = ? AND Course_Key = ?
           GROUP BY Attendance_Status`,
          [student.User_Key, course.Course_Key]
        );

        let present = 0;
        let late = 0;
        let absent = 0;

        attRows.forEach((r) => {
          const st = String(r.Attendance_Status).toLowerCase();
          if (st === "present") present = Number(r.cnt);
          else if (st === "late") late = Number(r.cnt);
          else if (st === "absent") absent = Number(r.cnt);
        });

        const totalSessions = present + late + absent;
        if (totalSessions > 0) {
          score = Math.round(((present * 1.0 + late * 0.5) / totalSessions) * maxScore * 100) / 100;
          status = "graded";
          provenance = `fact_attendance (${present} có mặt, ${late} muộn, ${absent} vắng / ${totalSessions} buổi)`;
          attendanceDetails = {
            total: totalSessions,
            present,
            late,
            absent,
            rate: Math.round(((present + late * 0.5) / totalSessions) * 100),
          };
        } else {
          status = "ungraded";
          reason = "Chưa có dữ liệu điểm danh trong fact_attendance";
          provenance = "fact_attendance";
        }
      } else {
        // EXTERNAL / ASSIGNMENT (Đầu điểm ngoài LMS hoặc bài tập tự do)
        const [scores] = await pool.query(
          `SELECT Score, Max_Score
           FROM fact_teacher_grade_score
           WHERE Item_Key = ? AND User_Key = ? AND Course_Key = ?
           LIMIT 1`,
          [item.Item_Key, student.User_Key, course.Course_Key]
        );

        if (scores.length > 0 && scores[0].Score !== null && scores[0].Score !== undefined) {
          score = Math.round(Number(scores[0].Score) * 100) / 100;
          status = "graded";
          provenance = "fact_teacher_grade_score (Điểm giảng viên nhập ngoài LMS)";
        } else {
          status = "ungraded";
          reason = "Chưa chấm (Chưa có bản ghi điểm trong fact_teacher_grade_score)";
          provenance = "fact_teacher_grade_score";
        }
      }

      if (score === null) {
        allScored = false;
      } else {
        weightedScoreSum += score * (weight / 100);
      }

      criteriaResults.push({
        id: `item_${item.Item_Key}`,
        itemKey: item.Item_Key,
        componentKey: item.Component_Key,
        componentName: item.Component_Name || "Chuyên cần",
        name: item.Item_Name,
        sourceType: item.Source_Type,
        lmsGradeItemId: item.LMS_Grade_Item_ID,
        weight,
        maxScore,
        score, // Giá trị số hoặc null (TUYỆT ĐỐI KHÔNG BIẾN NULL THÀNH 0)
        status, // 'graded' | 'ungraded' | 'missing_mapping'
        provenance,
        reason,
        attendanceDetails,
      });
    }

    // 5. Tìm thêm các đầu điểm LMS khác có trong Fact_Course_Grade chưa được map vào criteria
    const [otherGradesRows] = await pool.query(
      `SELECT
        Grade_Item_ID,
        Grade_Item_Name,
        Grade_Item_Type,
        Grade,
        Max_Grade,
        Grade_Percentage,
        Is_Passed
       FROM Fact_Course_Grade
       WHERE User_Key = ? AND Course_Key = ?`,
      [student.User_Key, course.Course_Key]
    );

    const otherLmsGrades = otherGradesRows
      .filter((g) => !mappedLmsItemIds.has(Number(g.Grade_Item_ID)))
      .map((g) => ({
        gradeItemId: g.Grade_Item_ID,
        name: g.Grade_Item_Name,
        type: g.Grade_Item_Type,
        score: g.Grade !== null ? Math.round(Number(g.Grade) * 100) / 100 : null,
        maxScore: Number(g.Max_Grade) || 10,
        status: g.Grade !== null ? "graded" : "ungraded",
        provenance: `Fact_Course_Grade (LMS ID: ${g.Grade_Item_ID})`,
      }));

    // 6. Tính toán điểm chuyên cần tổng hợp
    const isWeightValid = Math.abs(totalWeight - 100) < 0.01;
    const calculatedFinalScore =
      isWeightValid && allScored && criteriaResults.length > 0
        ? Math.round(weightedScoreSum * 100) / 100
        : null;

    return res.json({
      success: true,
      student: {
        userKey: student.User_Key,
        moodleUserId: student.Moodle_User_ID,
        username: student.Username,
        fullName: student.Full_Name,
        email: student.Email,
        role: student.Primary_Role,
      },
      course: {
        courseKey: course.Course_Key,
        moodleCourseId: course.Moodle_Course_ID,
        courseCode: course.Course_Code,
        courseName: course.Course_Name,
      },
      isEnrolled,
      enrolmentStatus,
      criteria: criteriaResults,
      otherLmsGrades,
      totalWeight,
      isWeightValid,
      calculatedFinalScore,
      allScored,
      summary: {
        totalItems: criteriaResults.length,
        gradedItems: criteriaResults.filter((c) => c.status === "graded").length,
        ungradedItems: criteriaResults.filter((c) => c.status === "ungraded").length,
        missingMappingItems: criteriaResults.filter((c) => c.status === "missing_mapping").length,
      },
    });
  } catch (error) {
    console.error("Lỗi getStudentCourseGrades:", error);
    return res.status(500).json({
      success: false,
      message: "Không thể lấy dữ liệu điểm sinh viên.",
      error: error.message,
    });
  }
}



