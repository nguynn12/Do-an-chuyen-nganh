-- ============================================================
-- 03_etl_dim_activity.sql
-- ETL: Moodle Source -> Data Warehouse
-- Dimension: Dim_Activity
-- ============================================================

USE lms_datawarehouse;

SET SQL_SAFE_UPDATES = 0;


-- ============================================================
-- 1. TẠO STAGING TẠM CHO ACTIVITY
-- ============================================================

DROP TEMPORARY TABLE IF EXISTS tmp_dim_activity;

CREATE TEMPORARY TABLE tmp_dim_activity AS

SELECT
    cm.id AS Moodle_Module_ID,

    dc.Course_Key AS Course_Key,

    m.name AS Activity_Type,

    CASE
        WHEN m.name = 'assign' THEN a.name
        WHEN m.name = 'quiz' THEN q.name
        ELSE NULL
    END AS Activity_Name,

    d.Date_Key AS Due_Date_Key,

    CASE
        WHEN m.name = 'assign' THEN a.grade
        WHEN m.name = 'quiz' THEN q.grade
        ELSE NULL
    END AS Max_Grade,

    CASE
        WHEN cm.visible = 1 THEN TRUE
        ELSE FALSE
    END AS Is_Visible

FROM lms_moodle_source.mdl_course_modules cm

INNER JOIN lms_moodle_source.mdl_modules m
    ON m.id = cm.module

INNER JOIN Dim_Course dc
    ON dc.Moodle_Course_ID = cm.course

LEFT JOIN lms_moodle_source.mdl_assign a
    ON m.name = 'assign'
   AND a.id = cm.instance

LEFT JOIN lms_moodle_source.mdl_quiz q
    ON m.name = 'quiz'
   AND q.id = cm.instance

LEFT JOIN Dim_Date d
    ON d.Full_Date =
        CASE
            WHEN m.name = 'assign'
             AND a.duedate > 0
            THEN DATE(FROM_UNIXTIME(a.duedate))

            WHEN m.name = 'quiz'
             AND q.timeclose > 0
            THEN DATE(FROM_UNIXTIME(q.timeclose))

            ELSE NULL
        END;


-- ============================================================
-- 2. KIỂM TRA STAGING TRƯỚC KHI LOAD
-- ============================================================

SELECT *
FROM tmp_dim_activity
ORDER BY Moodle_Module_ID;


-- ============================================================
-- 3. UPDATE ACTIVITY ĐÃ TỒN TẠI
-- Không xóa Dim_Activity để giữ nguyên surrogate key
-- ============================================================

UPDATE Dim_Activity d
INNER JOIN tmp_dim_activity t
    ON d.Moodle_Module_ID = t.Moodle_Module_ID

SET
    d.Course_Key = t.Course_Key,
    d.Activity_Type = t.Activity_Type,
    d.Activity_Name = t.Activity_Name,
    d.Due_Date_Key = t.Due_Date_Key,
    d.Max_Grade = t.Max_Grade,
    d.Is_Visible = t.Is_Visible;


-- ============================================================
-- 4. INSERT ACTIVITY MỚI
-- ============================================================

INSERT INTO Dim_Activity
(
    Moodle_Module_ID,
    Course_Key,
    Activity_Type,
    Activity_Name,
    Due_Date_Key,
    Max_Grade,
    Is_Visible
)
SELECT
    t.Moodle_Module_ID,
    t.Course_Key,
    t.Activity_Type,
    t.Activity_Name,
    t.Due_Date_Key,
    t.Max_Grade,
    t.Is_Visible

FROM tmp_dim_activity t

LEFT JOIN Dim_Activity d
    ON d.Moodle_Module_ID = t.Moodle_Module_ID

WHERE d.Activity_Key IS NULL;


-- ============================================================
-- 5. KIỂM TRA TỔNG SỐ ACTIVITY
-- ============================================================

SELECT
    COUNT(*) AS Total_Activities
FROM Dim_Activity;


-- ============================================================
-- 6. KIỂM TRA PHÂN BỐ LOẠI ACTIVITY
-- ============================================================

SELECT
    Activity_Type,
    COUNT(*) AS Total
FROM Dim_Activity
GROUP BY Activity_Type
ORDER BY Activity_Type;


-- ============================================================
-- 7. KIỂM TRA CHI TIẾT
-- ============================================================

SELECT
    da.Activity_Key,
    da.Moodle_Module_ID,
    dc.Course_Code,
    dc.Course_Name,
    da.Activity_Type,
    da.Activity_Name,
    da.Due_Date_Key,
    dd.Full_Date AS Due_Date,
    da.Max_Grade,
    da.Is_Visible
FROM Dim_Activity da

JOIN Dim_Course dc
    ON dc.Course_Key = da.Course_Key

LEFT JOIN Dim_Date dd
    ON dd.Date_Key = da.Due_Date_Key

ORDER BY da.Moodle_Module_ID;

SET SQL_SAFE_UPDATES = 1;