import pool from "../config/database.js";


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