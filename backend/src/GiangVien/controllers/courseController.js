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
             ATTENDANCE / CHUYÊN CẦN
          =========================== */

          COALESCE(
            engagement_stats.Active_Days,
            0
          ) AS Active_Days,


          COALESCE(
            engagement_stats.Total_Tracked_Days,
            0
          ) AS Total_Tracked_Days,


          CASE

            WHEN COALESCE(
              engagement_stats.Total_Tracked_Days,
              0
            ) = 0

            THEN NULL

            ELSE LEAST(
              100,
              ROUND(
                (
                  COALESCE(
                    engagement_stats.Active_Days,
                    0
                  )
                  /
                  engagement_stats.Total_Tracked_Days
                ) * 100,
                2
              )
            )

          END AS Attendance_Rate,


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

    const metrics = await calculateCourseBehaviorMetrics(pool, courseId);

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
// /api/courses/:courseId/segments
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

    const metrics = await calculateCourseBehaviorMetrics(pool, courseId);

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
// /api/courses/:courseId/risk
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

    const metrics = await calculateCourseBehaviorMetrics(pool, courseId);

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

