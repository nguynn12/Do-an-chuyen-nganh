import pool from "../../config/database.js";


// ======================================================
// DANH SÁCH SINH VIÊN CỦA MÔN
// ======================================================

export async function getCourseStudents(req, res) {
  try {
    const { courseId } = req.params;

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

      WHERE dc.Moodle_Course_ID = ?
        AND du.Primary_Role = 'Student'

      ORDER BY du.Full_Name
      `,
      [courseId]
    );

    return res.json({
      success: true,
      courseId: Number(courseId),
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
// ======================================================

export async function getCourseStudentAnalytics(
  req,
  res
) {
  try {
    const { courseId } = req.params;


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


        /* ==========================================
           GRADE
        ========================================== */

        grade_stats.Average_Grade_Percentage,

        grade_stats.Average_Grade,


        /* ==========================================
           ASSIGNMENTS
        ========================================== */

        COALESCE(
          assignment_stats.Total_Assignments,
          0
        ) AS Total_Assignments,


        COALESCE(
          submission_stats.Submitted_Assignments,
          0
        ) AS Submitted_Assignments,


        /* ==========================================
           SUBMISSION RATE
           Đã nộp / tổng assignment
        ========================================== */

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


        /* ==========================================
           ON TIME
        ========================================== */

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


        /* ==========================================
           ON TIME RATE
           đúng hạn / số bài đã nộp
        ========================================== */

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


        /* ==========================================
           ENGAGEMENT
        ========================================== */

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


        /* ==========================================
           PASS STATUS
        ========================================== */

        CASE
          WHEN grade_stats.Average_Grade_Percentage
            IS NULL
          THEN NULL

          WHEN grade_stats.Average_Grade_Percentage
            >= 50
          THEN 1

          ELSE 0
        END AS Is_Passed


      FROM Fact_Enrolment fe


      INNER JOIN Dim_User du
        ON du.User_Key = fe.User_Key


      INNER JOIN Dim_Course dc
        ON dc.Course_Key = fe.Course_Key


      /* ==========================================
         GRADE STATS
      ========================================== */

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


      /* ==========================================
         TỔNG ASSIGNMENT CỦA MÔN
      ========================================== */

      LEFT JOIN (
        SELECT
          Course_Key,

          COUNT(*) AS Total_Assignments

        FROM Dim_Activity

        WHERE Activity_Type = 'assign'
          AND Is_Visible = 1

        GROUP BY Course_Key
      ) assignment_stats

        ON assignment_stats.Course_Key =
          dc.Course_Key


      /* ==========================================
         SUBMISSION STATS
      ========================================== */

      LEFT JOIN (
        SELECT
          User_Key,
          Course_Key,


          /*
            Đếm DISTINCT Activity_Key để tránh
            nhiều attempt làm tăng số bài đã nộp.
          */
          COUNT(
            DISTINCT CASE
              WHEN Submission_Status IS NOT NULL
              THEN Activity_Key
            END
          ) AS Submitted_Assignments,


          COUNT(
            DISTINCT CASE
              WHEN
                Submission_Status IS NOT NULL
                AND Is_Submitted_On_Time = 1
              THEN Activity_Key
            END
          ) AS On_Time_Submissions,


          COUNT(
            DISTINCT CASE
              WHEN
                Submission_Status IS NOT NULL
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


      /* ==========================================
         ENGAGEMENT STATS
      ========================================== */

      LEFT JOIN (
        SELECT
          User_Key,
          Course_Key,

          SUM(
            Time_Spent_Seconds
          ) AS Total_Time_Spent_Seconds,

          MAX(
            Last_Access_Time
          ) AS Last_Access_Time

        FROM Fact_Daily_Engagement

        GROUP BY
          User_Key,
          Course_Key
      ) engagement_stats

        ON engagement_stats.User_Key =
          du.User_Key

        AND engagement_stats.Course_Key =
          dc.Course_Key


      WHERE dc.Moodle_Course_ID = ?
        AND du.Primary_Role = 'Student'


      ORDER BY du.Full_Name
      `,
      [courseId]
    );


    return res.json({
      success: true,
      courseId: Number(courseId),
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

      error:
        error.message,
    });
  }
}

// ======================================================
// PHÂN BỐ ĐIỂM SỐ THEO TỪNG BÀI ĐÁNH GIÁ (HISTOGRAM)
// GET /api/courses/:courseId/grade-distribution
// ======================================================

export async function getCourseGradeDistribution(req, res) {
  try {
    const { courseId } = req.params;

    // 1. Phân bố điểm theo từng bài đánh giá (Activities)
    const [activityRows] = await pool.query(
      `
      SELECT 
        da.Activity_Key,
        da.Activity_Name,
        da.Activity_Type,
        COALESCE(da.Max_Grade, 10) AS Activity_Max_Grade,
        COUNT(fcg.Grade_Key) AS Total_Graded,
        ROUND(AVG(fcg.Grade), 2) AS Average_Grade,
        ROUND(AVG(fcg.Grade_Percentage), 2) AS Average_Percentage,
        COALESCE(MIN(fcg.Grade), 0) AS Min_Grade,
        COALESCE(MAX(fcg.Grade), 0) AS Max_Grade,
        SUM(CASE WHEN fcg.Grade < 5.0 OR fcg.Grade_Percentage < 50 THEN 1 ELSE 0 END) AS Under_5,
        SUM(CASE WHEN (fcg.Grade >= 5.0 AND fcg.Grade < 7.0) OR (fcg.Grade_Percentage >= 50 AND fcg.Grade_Percentage < 70) THEN 1 ELSE 0 END) AS Range_5_To_7,
        SUM(CASE WHEN (fcg.Grade >= 7.0 AND fcg.Grade < 8.5) OR (fcg.Grade_Percentage >= 70 AND fcg.Grade_Percentage < 85) THEN 1 ELSE 0 END) AS Range_7_To_85,
        SUM(CASE WHEN fcg.Grade >= 8.5 OR fcg.Grade_Percentage >= 85 THEN 1 ELSE 0 END) AS Range_85_To_10
      FROM Dim_Activity da
      INNER JOIN Dim_Course dc ON dc.Course_Key = da.Course_Key
      LEFT JOIN Fact_Course_Grade fcg ON fcg.Activity_Key = da.Activity_Key AND fcg.Course_Key = dc.Course_Key
      WHERE (dc.Moodle_Course_ID = ? OR dc.Course_Key = ?) AND da.Is_Visible = 1
      GROUP BY da.Activity_Key, da.Activity_Name, da.Activity_Type, da.Max_Grade
      ORDER BY da.Activity_Name
      `,
      [courseId, courseId]
    );

    // 2. Phân bố điểm trung bình toàn môn (Overall)
    const [overallRows] = await pool.query(
      `
      SELECT 
        'OVERALL' AS Activity_Key,
        'Điểm trung bình toàn môn (Tổng hợp)' AS Activity_Name,
        'overall' AS Activity_Type,
        10 AS Activity_Max_Grade,
        COUNT(user_stats.User_Key) AS Total_Graded,
        ROUND(AVG(user_stats.avg_grade), 2) AS Average_Grade,
        ROUND(AVG(user_stats.avg_percentage), 2) AS Average_Percentage,
        COALESCE(MIN(user_stats.avg_grade), 0) AS Min_Grade,
        COALESCE(MAX(user_stats.avg_grade), 0) AS Max_Grade,
        SUM(CASE WHEN user_stats.avg_grade < 5.0 THEN 1 ELSE 0 END) AS Under_5,
        SUM(CASE WHEN user_stats.avg_grade >= 5.0 AND user_stats.avg_grade < 7.0 THEN 1 ELSE 0 END) AS Range_5_To_7,
        SUM(CASE WHEN user_stats.avg_grade >= 7.0 AND user_stats.avg_grade < 8.5 THEN 1 ELSE 0 END) AS Range_7_To_85,
        SUM(CASE WHEN user_stats.avg_grade >= 8.5 THEN 1 ELSE 0 END) AS Range_85_To_10
      FROM (
        SELECT 
          fcg.User_Key,
          AVG(fcg.Grade) AS avg_grade,
          AVG(fcg.Grade_Percentage) AS avg_percentage
        FROM Fact_Course_Grade fcg
        INNER JOIN Dim_Course dc ON dc.Course_Key = fcg.Course_Key
        WHERE dc.Moodle_Course_ID = ? OR dc.Course_Key = ?
        GROUP BY fcg.User_Key
      ) user_stats
      `,
      [courseId, courseId]
    );

    const overall = overallRows[0] || {
      Activity_Key: "OVERALL",
      Activity_Name: "Điểm trung bình toàn môn (Tổng hợp)",
      Activity_Type: "overall",
      Activity_Max_Grade: 10,
      Total_Graded: 0,
      Average_Grade: 0,
      Average_Percentage: 0,
      Min_Grade: 0,
      Max_Grade: 0,
      Under_5: 0,
      Range_5_To_7: 0,
      Range_7_To_85: 0,
      Range_85_To_10: 0,
    };

    const allItems = [overall, ...activityRows];

    return res.json({
      success: true,
      courseId: Number(courseId),
      data: allItems,
    });
  } catch (error) {
    console.error("Lỗi getCourseGradeDistribution:", error);
    return res.status(500).json({
      success: false,
      message: "Không thể lấy phân bố điểm số môn học.",
      error: error.message,
    });
  }
}

// ======================================================
// XU HƯỚNG ENGAGEMENT LỚP THEO TUẦN (WEEKLY ENGAGEMENT TREND)
// GET /api/courses/:courseId/engagement-trend
// ======================================================

export async function getCourseEngagementTrend(req, res) {
  try {
    const { courseId } = req.params;

    // 1. Lấy tổng số sinh viên của môn học
    const [studentCountRows] = await pool.query(
      `
      SELECT COUNT(DISTINCT fe.User_Key) AS totalStudents
      FROM Fact_Enrolment fe
      INNER JOIN Dim_Course dc ON dc.Course_Key = fe.Course_Key
      INNER JOIN Dim_User du ON du.User_Key = fe.User_Key
      WHERE (dc.Moodle_Course_ID = ? OR dc.Course_Key = ?)
        AND du.Primary_Role = 'Student'
      `,
      [courseId, courseId]
    );

    const totalStudents = Number(studentCountRows[0]?.totalStudents || 0);

    // 2. Lấy thời gian tương tác gom nhóm theo tuần từ Fact_Daily_Engagement join Dim_Date
    const [trendRows] = await pool.query(
      `
      SELECT 
        dd.Year_Number AS year,
        dd.Week_Number AS weekNumber,
        DATE_FORMAT(MIN(dd.Full_Date), '%d/%m/%Y') AS weekStartDate,
        DATE_FORMAT(MAX(dd.Full_Date), '%d/%m/%Y') AS weekEndDate,
        COUNT(DISTINCT fde.User_Key) AS activeStudents,
        COALESCE(SUM(fde.Time_Spent_Seconds), 0) AS totalSeconds,
        ROUND(COALESCE(SUM(fde.Time_Spent_Seconds), 0) / 3600, 2) AS totalHours,
        ROUND(COALESCE(SUM(fde.Time_Spent_Seconds), 0) / 60, 1) AS totalMinutes
      FROM Fact_Daily_Engagement fde
      INNER JOIN Dim_Course dc ON dc.Course_Key = fde.Course_Key
      INNER JOIN Dim_Date dd ON dd.Date_Key = fde.Date_Key
      INNER JOIN Dim_User du ON du.User_Key = fde.User_Key
      WHERE (dc.Moodle_Course_ID = ? OR dc.Course_Key = ?)
        AND du.Primary_Role = 'Student'
      GROUP BY dd.Year_Number, dd.Week_Number
      ORDER BY dd.Year_Number ASC, dd.Week_Number ASC
      `,
      [courseId, courseId]
    );

    const trend = trendRows.map((row, index) => {
      const activeCount = Number(row.activeStudents || 0);
      const denominator = totalStudents > 0 ? totalStudents : (activeCount > 0 ? activeCount : 1);
      const avgHoursPerStudent = Number((Number(row.totalHours) / denominator).toFixed(2));
      const avgMinutesPerStudent = Math.round(Number(row.totalMinutes) / denominator);

      return {
        weekIndex: index + 1,
        weekLabel: `Tuần ${index + 1}`,
        weekNumber: row.weekNumber,
        year: row.year,
        weekStartDate: row.weekStartDate,
        weekEndDate: row.weekEndDate,
        dateRange: `${row.weekStartDate} - ${row.weekEndDate}`,
        activeStudents: activeCount,
        totalStudents,
        activeRate: totalStudents > 0 ? Math.round((activeCount / totalStudents) * 100) : 100,
        totalHours: Number(row.totalHours),
        totalMinutes: Number(row.totalMinutes),
        avgHoursPerStudent,
        avgMinutesPerStudent,
      };
    });

    return res.json({
      success: true,
      courseId: Number(courseId),
      totalStudents,
      data: trend,
    });
  } catch (error) {
    console.error("Lỗi getCourseEngagementTrend:", error);
    return res.status(500).json({
      success: false,
      message: "Không thể lấy xu hướng tương tác của lớp học.",
      error: error.message,
    });
  }
}