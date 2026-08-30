-- ============================================================
-- 09_etl_learning_resources.sql
-- ETL bổ sung học liệu Moodle -> Dim_Activity
--
-- Chỉ xử lý:
-- - resource
-- - page
-- - url
--
-- NGUYÊN TẮC:
-- - KHÔNG DELETE
-- - KHÔNG DROP bảng thật
-- - KHÔNG TRUNCATE
-- - KHÔNG UPDATE activity cũ
-- - CHỈ INSERT activity chưa tồn tại
-- ============================================================

USE lms_datawarehouse;


-- ============================================================
-- 1. TẠO STAGING TẠM CHO HỌC LIỆU
--
-- Bảng tạm chỉ tồn tại trong session hiện tại.
-- Không ảnh hưởng dữ liệu thật.
-- ============================================================

DROP TEMPORARY TABLE IF EXISTS tmp_learning_resources;


CREATE TEMPORARY TABLE tmp_learning_resources AS

SELECT
    cm.id AS Moodle_Module_ID,

    dc.Course_Key,

    m.name AS Activity_Type,


    CASE

        WHEN m.name = 'resource'
        THEN r.name

        WHEN m.name = 'page'
        THEN p.name

        WHEN m.name = 'url'
        THEN u.name

        ELSE NULL

    END AS Activity_Name,


    -- Học liệu không có hạn nộp
    NULL AS Due_Date_Key,


    -- Học liệu không có điểm tối đa
    NULL AS Max_Grade,


    CASE
        WHEN cm.visible = 1
        THEN TRUE

        ELSE FALSE
    END AS Is_Visible


FROM lms_moodle_source.mdl_course_modules cm


INNER JOIN lms_moodle_source.mdl_modules m
    ON m.id = cm.module


INNER JOIN Dim_Course dc
    ON dc.Moodle_Course_ID = cm.course


LEFT JOIN lms_moodle_source.mdl_resource r
    ON m.name = 'resource'
   AND r.id = cm.instance


LEFT JOIN lms_moodle_source.mdl_page p
    ON m.name = 'page'
   AND p.id = cm.instance


LEFT JOIN lms_moodle_source.mdl_url u
    ON m.name = 'url'
   AND u.id = cm.instance


WHERE m.name IN (
    'resource',
    'page',
    'url'
);


-- ============================================================
-- 2. KIỂM TRA STAGING
-- ============================================================

SELECT
    Moodle_Module_ID,
    Course_Key,
    Activity_Type,
    Activity_Name,
    Is_Visible

FROM tmp_learning_resources

ORDER BY
    Course_Key,
    Moodle_Module_ID;


-- ============================================================
-- 3. KIỂM TRA NHỮNG HỌC LIỆU CHƯA CÓ TRONG DIM_ACTIVITY
--
-- Đây chỉ là SELECT, chưa INSERT.
-- ============================================================

SELECT
    t.Moodle_Module_ID,
    t.Course_Key,
    t.Activity_Type,
    t.Activity_Name,
    t.Is_Visible

FROM tmp_learning_resources t

LEFT JOIN Dim_Activity d
    ON d.Moodle_Module_ID =
       t.Moodle_Module_ID

WHERE d.Activity_Key IS NULL

ORDER BY
    t.Course_Key,
    t.Moodle_Module_ID;


-- ============================================================
-- 4. INSERT HỌC LIỆU MỚI
--
-- Chỉ INSERT nếu Moodle_Module_ID chưa tồn tại.
-- Không update record cũ.
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

FROM tmp_learning_resources t

LEFT JOIN Dim_Activity d
    ON d.Moodle_Module_ID =
       t.Moodle_Module_ID

WHERE d.Activity_Key IS NULL;


-- ============================================================
-- 5. KIỂM TRA SỐ HỌC LIỆU THEO LOẠI
-- ============================================================

SELECT
    Activity_Type,
    COUNT(*) AS Total

FROM Dim_Activity

WHERE Activity_Type IN (
    'resource',
    'page',
    'url'
)

GROUP BY
    Activity_Type

ORDER BY
    Activity_Type;


-- ============================================================
-- 6. KIỂM TRA CHI TIẾT HỌC LIỆU
-- ============================================================

SELECT
    da.Activity_Key,
    da.Moodle_Module_ID,

    dc.Course_Code,
    dc.Course_Name,

    da.Activity_Type,
    da.Activity_Name,

    da.Is_Visible

FROM Dim_Activity da

INNER JOIN Dim_Course dc
    ON dc.Course_Key =
       da.Course_Key

WHERE da.Activity_Type IN (
    'resource',
    'page',
    'url'
)

ORDER BY
    dc.Course_Code,
    da.Activity_Type,
    da.Activity_Name;


-- ============================================================
-- 7. KIỂM TRA TỔNG ACTIVITY
--
-- Dự kiến:
-- 12 cũ + 8 học liệu mới = khoảng 20
-- ============================================================

SELECT
    COUNT(*) AS Total_Activities

FROM Dim_Activity;