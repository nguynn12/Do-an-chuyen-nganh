-- ============================================================
-- 05_etl_fact_assignment_submission.sql
-- ETL: Moodle Source -> Fact_Assignment_Submission
-- ============================================================

USE lms_datawarehouse;

SET SQL_SAFE_UPDATES = 0;


-- ============================================================
-- 1. STAGING
-- Grain:
-- 1 dòng = 1 lần nộp assignment của 1 user
-- ============================================================

DROP TEMPORARY TABLE IF EXISTS tmp_fact_assignment_submission;

CREATE TEMPORARY TABLE tmp_fact_assignment_submission AS

SELECT
    du.User_Key,

    dc.Course_Key,

    da.Activity_Key,

    CASE
        WHEN s.status = 'submitted'
         AND s.timemodified > 0
        THEN dd_submit.Date_Key
        ELSE NULL
    END AS Submit_Date_Key,

    da.Due_Date_Key,

    s.attemptnumber AS Attempt_Number,

    s.status AS Submission_Status,

    CASE
        WHEN s.status <> 'submitted'
            THEN NULL

        WHEN s.timemodified <= a.duedate
            THEN TRUE

        ELSE FALSE
    END AS Is_Submitted_On_Time,

    g.grade AS Grade,

    CASE
        WHEN g.id IS NOT NULL THEN TRUE
        ELSE FALSE
    END AS Is_Graded,

    fc.commenttext AS Feedback_Comment

FROM lms_moodle_source.mdl_assign_submission s

INNER JOIN lms_moodle_source.mdl_assign a
    ON a.id = s.assignment

INNER JOIN lms_moodle_source.mdl_course_modules cm
    ON cm.instance = a.id
   AND cm.course = a.course

INNER JOIN lms_moodle_source.mdl_modules m
    ON m.id = cm.module
   AND m.name = 'assign'

INNER JOIN Dim_User du
    ON du.Moodle_User_ID = s.userid

INNER JOIN Dim_Course dc
    ON dc.Moodle_Course_ID = a.course

INNER JOIN Dim_Activity da
    ON da.Moodle_Module_ID = cm.id

LEFT JOIN Dim_Date dd_submit
    ON dd_submit.Full_Date =
        DATE(FROM_UNIXTIME(s.timemodified))

LEFT JOIN lms_moodle_source.mdl_assign_grades g
    ON g.assignment = s.assignment
   AND g.userid = s.userid
   AND g.attemptnumber = s.attemptnumber

LEFT JOIN lms_moodle_source.mdl_assignfeedback_comments fc
    ON fc.grade = g.id

WHERE s.latest = 1;


-- ============================================================
-- 2. KIỂM TRA STAGING
-- ============================================================

SELECT *
FROM tmp_fact_assignment_submission
ORDER BY Activity_Key, User_Key;


-- ============================================================
-- 3. UPDATE RECORD ĐÃ TỒN TẠI
-- Natural key:
-- User_Key + Activity_Key + Attempt_Number
-- ============================================================

UPDATE Fact_Assignment_Submission f

INNER JOIN tmp_fact_assignment_submission t
    ON  f.User_Key = t.User_Key
    AND f.Activity_Key = t.Activity_Key
    AND f.Attempt_Number = t.Attempt_Number

SET
    f.Course_Key = t.Course_Key,
    f.Submit_Date_Key = t.Submit_Date_Key,
    f.Due_Date_Key = t.Due_Date_Key,
    f.Submission_Status = t.Submission_Status,
    f.Is_Submitted_On_Time = t.Is_Submitted_On_Time,
    f.Grade = t.Grade,
    f.Is_Graded = t.Is_Graded,
    f.Feedback_Comment = t.Feedback_Comment;


-- ============================================================
-- 4. INSERT RECORD MỚI
-- ============================================================

INSERT INTO Fact_Assignment_Submission
(
    User_Key,
    Course_Key,
    Activity_Key,
    Submit_Date_Key,
    Due_Date_Key,
    Attempt_Number,
    Submission_Status,
    Is_Submitted_On_Time,
    Grade,
    Is_Graded,
    Feedback_Comment
)

SELECT
    t.User_Key,
    t.Course_Key,
    t.Activity_Key,
    t.Submit_Date_Key,
    t.Due_Date_Key,
    t.Attempt_Number,
    t.Submission_Status,
    t.Is_Submitted_On_Time,
    t.Grade,
    t.Is_Graded,
    t.Feedback_Comment

FROM tmp_fact_assignment_submission t

LEFT JOIN Fact_Assignment_Submission f
    ON  f.User_Key = t.User_Key
    AND f.Activity_Key = t.Activity_Key
    AND f.Attempt_Number = t.Attempt_Number

WHERE f.Submission_Key IS NULL;


-- ============================================================
-- 5. KIỂM TRA TỔNG
-- ============================================================

SELECT
    COUNT(*) AS Total_Submissions
FROM Fact_Assignment_Submission;


-- ============================================================
-- 6. KIỂM TRA STATUS
-- ============================================================

SELECT
    Submission_Status,
    COUNT(*) AS Total
FROM Fact_Assignment_Submission
GROUP BY Submission_Status
ORDER BY Submission_Status;


-- ============================================================
-- 7. KIỂM TRA GRADED / NOT GRADED
-- ============================================================

SELECT
    Is_Graded,
    COUNT(*) AS Total
FROM Fact_Assignment_Submission
GROUP BY Is_Graded
ORDER BY Is_Graded;


-- ============================================================
-- 8. KIỂM TRA ON TIME / LATE
-- Chỉ xét bài đã submitted
-- ============================================================

SELECT
    Is_Submitted_On_Time,
    COUNT(*) AS Total
FROM Fact_Assignment_Submission
WHERE Submission_Status = 'submitted'
GROUP BY Is_Submitted_On_Time
ORDER BY Is_Submitted_On_Time;


-- ============================================================
-- 9. KIỂM TRA CHI TIẾT
-- ============================================================

SELECT
    f.Submission_Key,

    du.Full_Name,

    dc.Course_Code,

    da.Activity_Name,

    dd_submit.Full_Date AS Submit_Date,

    dd_due.Full_Date AS Due_Date,

    f.Attempt_Number,
    f.Submission_Status,
    f.Is_Submitted_On_Time,
    f.Grade,
    f.Is_Graded,
    f.Feedback_Comment

FROM Fact_Assignment_Submission f

INNER JOIN Dim_User du
    ON du.User_Key = f.User_Key

INNER JOIN Dim_Course dc
    ON dc.Course_Key = f.Course_Key

INNER JOIN Dim_Activity da
    ON da.Activity_Key = f.Activity_Key

LEFT JOIN Dim_Date dd_submit
    ON dd_submit.Date_Key = f.Submit_Date_Key

LEFT JOIN Dim_Date dd_due
    ON dd_due.Date_Key = f.Due_Date_Key

ORDER BY
    dc.Course_Code,
    da.Activity_Name,
    du.Full_Name;


SET SQL_SAFE_UPDATES = 1;