const pool = require('../config/db');

async function getOverview() {
    const [rows] = await pool.query(`
        SELECT
            (
                SELECT COUNT(*)
                FROM Dim_User
                WHERE Primary_Role = 'Student'
                  AND Is_Active = 1
            ) AS totalStudents,

            (
                SELECT COUNT(*)
                FROM Dim_Course
                WHERE Is_Visible = 1
            ) AS totalCourses,

            (
                SELECT COUNT(*)
                FROM Dim_Activity
                WHERE Is_Visible = 1
            ) AS totalActivities,

            (
                SELECT COUNT(*)
                FROM Fact_Enrolment
                WHERE Status = 'Active'
            ) AS totalActiveEnrolments,

            (
                SELECT COUNT(*)
                FROM Fact_Assignment_Submission
            ) AS totalAssignmentRecords,

            (
                SELECT COUNT(*)
                FROM Fact_Assignment_Submission
                WHERE Submission_Status = 'submitted'
            ) AS totalSubmitted,

            (
                SELECT ROUND(AVG(Grade_Percentage), 2)
                FROM Fact_Course_Grade
                WHERE Grade_Percentage IS NOT NULL
            ) AS averageGradePercentage,

            (
                SELECT ROUND(
                    SUM(Time_Spent_Seconds) / 3600,
                    2
                )
                FROM Fact_Daily_Engagement
            ) AS totalEngagementHours
    `);

    return rows[0];
}

async function getCourses() {
    const [rows] = await pool.query(`
        SELECT
            dc.Course_Key AS courseKey,
            dc.Moodle_Course_ID AS moodleCourseId,
            dc.Course_Code AS courseCode,
            dc.Course_Name AS courseName,
            dc.Category_Name AS categoryName,
            DATE_FORMAT(dc.Start_Date, '%Y-%m-%d') AS startDate,
            DATE_FORMAT(dc.End_Date, '%Y-%m-%d') AS endDate,
            dc.Is_Visible AS isVisible,

            (
                SELECT COUNT(*)
                FROM Fact_Enrolment fe
                WHERE fe.Course_Key = dc.Course_Key
                  AND fe.Status = 'Active'
            ) AS totalStudents,

            (
                SELECT COUNT(*)
                FROM Dim_Activity da
                WHERE da.Course_Key = dc.Course_Key
                  AND da.Is_Visible = 1
            ) AS totalActivities,

            (
                SELECT COUNT(*)
                FROM Dim_Activity da
                WHERE da.Course_Key = dc.Course_Key
                  AND da.Activity_Type = 'assign'
                  AND da.Is_Visible = 1
            ) AS totalAssignments,

            (
                SELECT COUNT(*)
                FROM Dim_Activity da
                WHERE da.Course_Key = dc.Course_Key
                  AND da.Activity_Type = 'quiz'
                  AND da.Is_Visible = 1
            ) AS totalQuizzes,

            (
                SELECT COUNT(*)
                FROM Fact_Assignment_Submission fas
                WHERE fas.Course_Key = dc.Course_Key
                  AND fas.Submission_Status = 'submitted'
            ) AS totalSubmitted,

            (
                SELECT COUNT(*)
                FROM Fact_Assignment_Submission fas
                WHERE fas.Course_Key = dc.Course_Key
                  AND fas.Submission_Status = 'submitted'
                  AND fas.Is_Submitted_On_Time = 1
            ) AS totalSubmittedOnTime,

            (
                SELECT ROUND(AVG(fcg.Grade_Percentage), 2)
                FROM Fact_Course_Grade fcg
                WHERE fcg.Course_Key = dc.Course_Key
                  AND fcg.Grade_Percentage IS NOT NULL
            ) AS averageGradePercentage,

            (
                SELECT ROUND(
                    SUM(fde.Time_Spent_Seconds) / 3600,
                    2
                )
                FROM Fact_Daily_Engagement fde
                WHERE fde.Course_Key = dc.Course_Key
            ) AS totalEngagementHours

        FROM Dim_Course dc

        ORDER BY dc.Course_Code;
    `);

    return rows;
}

async function getCourseDetail(courseKey) {
    const [courseRows] = await pool.query(`
        SELECT
            Course_Key AS courseKey,
            Moodle_Course_ID AS moodleCourseId,
            Course_Code AS courseCode,
            Course_Name AS courseName,
            Category_Name AS categoryName,
            DATE_FORMAT(Start_Date, '%Y-%m-%d') AS startDate,
            DATE_FORMAT(End_Date, '%Y-%m-%d') AS endDate,
            Is_Visible AS isVisible
        FROM Dim_Course
        WHERE Course_Key = ?
    `, [courseKey]);

    if (courseRows.length === 0) {
        return null;
    }

    const [kpiRows] = await pool.query(`
        SELECT
            (
                SELECT COUNT(*)
                FROM Fact_Enrolment
                WHERE Course_Key = ?
                  AND Status = 'Active'
            ) AS totalStudents,

            (
                SELECT COUNT(*)
                FROM Dim_Activity
                WHERE Course_Key = ?
                  AND Is_Visible = 1
            ) AS totalActivities,

            (
                SELECT COUNT(*)
                FROM Dim_Activity
                WHERE Course_Key = ?
                  AND Activity_Type = 'assign'
                  AND Is_Visible = 1
            ) AS totalAssignments,

            (
                SELECT COUNT(*)
                FROM Dim_Activity
                WHERE Course_Key = ?
                  AND Activity_Type = 'quiz'
                  AND Is_Visible = 1
            ) AS totalQuizzes,

            (
                SELECT COUNT(*)
                FROM Fact_Assignment_Submission
                WHERE Course_Key = ?
                  AND Submission_Status = 'submitted'
            ) AS totalSubmitted,

            (
                SELECT COUNT(*)
                FROM Fact_Assignment_Submission
                WHERE Course_Key = ?
                  AND Submission_Status = 'submitted'
                  AND Is_Submitted_On_Time = 1
            ) AS totalSubmittedOnTime,

            (
                SELECT ROUND(AVG(Grade_Percentage), 2)
                FROM Fact_Course_Grade
                WHERE Course_Key = ?
                  AND Grade_Percentage IS NOT NULL
            ) AS averageGradePercentage,

            (
                SELECT ROUND(
                    SUM(Time_Spent_Seconds) / 3600,
                    2
                )
                FROM Fact_Daily_Engagement
                WHERE Course_Key = ?
            ) AS totalEngagementHours
    `, [
        courseKey,
        courseKey,
        courseKey,
        courseKey,
        courseKey,
        courseKey,
        courseKey,
        courseKey
    ]);

    const [activityRows] = await pool.query(`
        SELECT
            da.Activity_Key AS activityKey,
            da.Moodle_Module_ID AS moodleModuleId,
            da.Activity_Type AS activityType,
            da.Activity_Name AS activityName,

            DATE_FORMAT(
                dd.Full_Date,
                '%Y-%m-%d'
            ) AS dueDate,

            da.Max_Grade AS maxGrade,
            da.Is_Visible AS isVisible,

            (
                SELECT COUNT(*)
                FROM Fact_Assignment_Submission fas
                WHERE fas.Activity_Key = da.Activity_Key
                  AND fas.Submission_Status = 'submitted'
            ) AS totalSubmitted,

            (
                SELECT COUNT(*)
                FROM Fact_Assignment_Submission fas
                WHERE fas.Activity_Key = da.Activity_Key
                  AND fas.Submission_Status = 'submitted'
                  AND fas.Is_Submitted_On_Time = 1
            ) AS totalSubmittedOnTime,

            (
                SELECT ROUND(
                    AVG(fcg.Grade_Percentage),
                    2
                )
                FROM Fact_Course_Grade fcg
                WHERE fcg.Activity_Key = da.Activity_Key
                  AND fcg.Grade_Percentage IS NOT NULL
            ) AS averageGradePercentage

        FROM Dim_Activity da

        LEFT JOIN Dim_Date dd
            ON dd.Date_Key = da.Due_Date_Key

        WHERE da.Course_Key = ?

        ORDER BY
            dd.Full_Date,
            da.Activity_Key
    `, [courseKey]);

    return {
        course: courseRows[0],
        kpis: kpiRows[0],
        activities: activityRows
    };
}

module.exports = {
    getOverview,
    getCourses,
    getCourseDetail
};