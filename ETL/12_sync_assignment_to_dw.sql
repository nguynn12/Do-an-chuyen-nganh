-- ============================================================
-- 12_sync_assignment_to_dw.sql
-- ĐỒNG BỘ DỮ LIỆU BÀI TẬP & CHẤM ĐIỂM SANG DATA WAREHOUSE
-- Tự động ánh xạ từ lms_moodle_source.assignment_submission_record
-- sang Fact_Assignment_Submission và Fact_Course_Grade
-- ============================================================

USE lms_datawarehouse;

SET SQL_SAFE_UPDATES = 0;

-- 1. Đảm bảo Dim_Activity có đầy đủ activity cho từng Assignment Campaign
INSERT INTO Dim_Activity (Course_Key, Moodle_Module_ID, Activity_Type, Activity_Name, Due_Date_Key, Max_Grade, Is_Visible)
SELECT
    dc.Course_Key,
    90000 + c.id AS Moodle_Module_ID,
    'assign' AS Activity_Type,
    c.title AS Activity_Name,
    COALESCE(dd.Date_Key, 20261015) AS Due_Date_Key,
    10.00 AS Max_Grade,
    1 AS Is_Visible
FROM lms_moodle_source.assignment_campaign c
INNER JOIN Dim_Course dc ON dc.Moodle_Course_ID = c.course_id
LEFT JOIN Dim_Date dd ON dd.Full_Date = DATE(c.due_date)
WHERE NOT EXISTS (
    SELECT 1 FROM Dim_Activity da
    WHERE da.Moodle_Module_ID = (90000 + c.id)
);

-- 2. ĐỒNG BỘ BÀI NỘP VÀO FACT_ASSIGNMENT_SUBMISSION
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
    du.User_Key,
    dc.Course_Key,
    da.Activity_Key,
    COALESCE(dd_sub.Date_Key, dd_due.Date_Key) AS Submit_Date_Key,
    da.Due_Date_Key,
    1 AS Attempt_Number,
    'submitted' AS Submission_Status,
    CASE WHEN sub.is_late = 1 THEN 0 ELSE 1 END AS Is_Submitted_On_Time,
    sub.score AS Grade,
    CASE WHEN sub.grading_status = 'PUBLISHED' THEN 1 ELSE 0 END AS Is_Graded,
    sub.feedback AS Feedback_Comment
FROM lms_moodle_source.assignment_submission_record sub
INNER JOIN lms_moodle_source.assignment_campaign cmp ON cmp.id = sub.campaign_id
INNER JOIN Dim_User du ON du.Moodle_User_ID = sub.student_id
INNER JOIN Dim_Course dc ON dc.Moodle_Course_ID = cmp.course_id
INNER JOIN Dim_Activity da ON da.Moodle_Module_ID = (90000 + cmp.id)
LEFT JOIN Dim_Date dd_sub ON dd_sub.Full_Date = DATE(sub.submitted_at)
LEFT JOIN Dim_Date dd_due ON dd_due.Date_Key = da.Due_Date_Key
ON DUPLICATE KEY UPDATE
    Grade = VALUES(Grade),
    Is_Graded = VALUES(Is_Graded),
    Feedback_Comment = VALUES(Feedback_Comment),
    Is_Submitted_On_Time = VALUES(Is_Submitted_On_Time);

SET SQL_SAFE_UPDATES = 1;
