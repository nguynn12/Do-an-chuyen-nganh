-- ============================================================
-- 09_etl_learning_resources.sql
-- ETL: Moodle Source -> Data Warehouse
-- Dimension: Dim_Activity (Bổ sung Resource, Page, URL)
-- ============================================================

USE lms_datawarehouse;

SET SQL_SAFE_UPDATES = 0;


-- ============================================================
-- 1. TẠO STAGING TẠM CHO HỌC LIỆU
-- ============================================================

DROP TEMPORARY TABLE IF EXISTS tmp_learning_resources;

CREATE TEMPORARY TABLE tmp_learning_resources AS
SELECT
    cm.id AS Moodle_Module_ID,
    dc.Course_Key,
    m.name AS Activity_Type,

    CASE
        WHEN m.name = 'resource' THEN r.name
        WHEN m.name = 'page' THEN p.name
        WHEN m.name = 'url' THEN u.name
        ELSE NULL
    END AS Activity_Name,

    NULL AS Due_Date_Key,
    NULL AS Max_Grade,

    CASE
        WHEN cm.visible = 1 THEN TRUE
        ELSE FALSE
    END AS Is_Visible

FROM lms_moodle_source.mdl_course_modules cm
INNER JOIN lms_moodle_source.mdl_modules m ON m.id = cm.module
INNER JOIN Dim_Course dc ON dc.Moodle_Course_ID = cm.course

LEFT JOIN lms_moodle_source.mdl_resource r
    ON m.name = 'resource' AND r.id = cm.instance

LEFT JOIN lms_moodle_source.mdl_page p
    ON m.name = 'page' AND p.id = cm.instance

LEFT JOIN lms_moodle_source.mdl_url u
    ON m.name = 'url' AND u.id = cm.instance

WHERE m.name IN ('resource', 'page', 'url');


-- ============================================================
-- 2. KIỂM TRA STAGING
-- ============================================================

SELECT *
FROM tmp_learning_resources
ORDER BY Course_Key, Moodle_Module_ID;


-- ============================================================
-- 3. INSERT HỌC LIỆU MỚI VÀO DIM_ACTIVITY
-- ============================================================

INSERT INTO Dim_Activity (
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
FROM tmp_learning_resources t
LEFT JOIN Dim_Activity d ON d.Moodle_Module_ID = t.Moodle_Module_ID
WHERE d.Activity_Key IS NULL;


-- ============================================================
-- KIỂM TRA TỔNG SỐ ACTIVITY THEO LOẠI
-- ============================================================

SELECT
    Activity_Type,
    COUNT(*) AS Total
FROM Dim_Activity
GROUP BY Activity_Type
ORDER BY Activity_Type;