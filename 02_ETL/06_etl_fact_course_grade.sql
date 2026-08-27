-- ============================================================
-- 06_etl_fact_course_grade.sql
-- ETL: Moodle Source -> Fact_Course_Grade
-- ============================================================

USE lms_datawarehouse;

SET SQL_SAFE_UPDATES = 0;


-- ============================================================
-- 1. STAGING
-- Grain:
-- 1 dòng = 1 điểm của 1 user cho 1 grade item
-- ============================================================

DROP TEMPORARY TABLE IF EXISTS tmp_fact_course_grade;

CREATE TEMPORARY TABLE tmp_fact_course_grade AS

SELECT
    du.User_Key,

    dc.Course_Key,

    gi.id AS Grade_Item_ID,

    gi.itemname AS Grade_Item_Name,

    gi.itemmodule AS Grade_Item_Type,

    da.Activity_Key,

    dd.Date_Key,

    gg.finalgrade AS Grade,

    gi.grademax AS Max_Grade,

    CASE
        WHEN gg.finalgrade IS NOT NULL
         AND gi.grademax IS NOT NULL
         AND gi.grademax > 0
        THEN ROUND(
            (gg.finalgrade / gi.grademax) * 100,
            4
        )
        ELSE NULL
    END AS Grade_Percentage,

    CASE
        WHEN gg.finalgrade IS NULL
            THEN NULL

        WHEN gi.gradepass IS NULL
            THEN NULL

        WHEN gg.finalgrade >= gi.gradepass
            THEN TRUE

        ELSE FALSE
    END AS Is_Passed

FROM lms_moodle_source.mdl_grade_grades gg

INNER JOIN lms_moodle_source.mdl_grade_items gi
    ON gi.id = gg.itemid

INNER JOIN Dim_User du
    ON du.Moodle_User_ID = gg.userid

INNER JOIN Dim_Course dc
    ON dc.Moodle_Course_ID = gi.courseid


-- ============================================================
-- MAP GRADE ITEM -> MOODLE COURSE MODULE
-- ============================================================

LEFT JOIN lms_moodle_source.mdl_modules m
    ON m.name = gi.itemmodule

LEFT JOIN lms_moodle_source.mdl_course_modules cm
    ON cm.course = gi.courseid
   AND cm.module = m.id
   AND cm.instance = gi.iteminstance

LEFT JOIN Dim_Activity da
    ON da.Moodle_Module_ID = cm.id


-- ============================================================
-- MAP THỜI GIAN CHẤM -> DIM_DATE
-- ============================================================

LEFT JOIN Dim_Date dd
    ON dd.Full_Date =
        CASE
            WHEN gg.timemodified IS NOT NULL
             AND gg.timemodified > 0
            THEN DATE(FROM_UNIXTIME(gg.timemodified))
            ELSE NULL
        END;


-- ============================================================
-- 2. KIỂM TRA STAGING
-- ============================================================

SELECT *
FROM tmp_fact_course_grade
ORDER BY
    Course_Key,
    Grade_Item_ID,
    User_Key;


-- ============================================================
-- 3. UPDATE RECORD ĐÃ TỒN TẠI
--
-- Natural key hiện tại:
-- User_Key + Grade_Item_ID
-- ============================================================

UPDATE Fact_Course_Grade f

INNER JOIN tmp_fact_course_grade t
    ON  f.User_Key = t.User_Key
    AND f.Grade_Item_ID = t.Grade_Item_ID

SET
    f.Course_Key = t.Course_Key,
    f.Grade_Item_Name = t.Grade_Item_Name,
    f.Grade_Item_Type = t.Grade_Item_Type,
    f.Activity_Key = t.Activity_Key,
    f.Date_Key = t.Date_Key,
    f.Grade = t.Grade,
    f.Max_Grade = t.Max_Grade,
    f.Grade_Percentage = t.Grade_Percentage,
    f.Is_Passed = t.Is_Passed;


-- ============================================================
-- 4. INSERT RECORD MỚI
-- ============================================================

INSERT INTO Fact_Course_Grade
(
    User_Key,
    Course_Key,
    Grade_Item_ID,
    Grade_Item_Name,
    Grade_Item_Type,
    Activity_Key,
    Date_Key,
    Grade,
    Max_Grade,
    Grade_Percentage,
    Is_Passed
)

SELECT
    t.User_Key,
    t.Course_Key,
    t.Grade_Item_ID,
    t.Grade_Item_Name,
    t.Grade_Item_Type,
    t.Activity_Key,
    t.Date_Key,
    t.Grade,
    t.Max_Grade,
    t.Grade_Percentage,
    t.Is_Passed

FROM tmp_fact_course_grade t

LEFT JOIN Fact_Course_Grade f
    ON  f.User_Key = t.User_Key
    AND f.Grade_Item_ID = t.Grade_Item_ID

WHERE f.Grade_Key IS NULL;


-- ============================================================
-- 5. KIỂM TRA TỔNG
-- ============================================================

SELECT
    COUNT(*) AS Total_Grades
FROM Fact_Course_Grade;


-- ============================================================
-- 6. KIỂM TRA THEO LOẠI GRADE ITEM
-- ============================================================

SELECT
    Grade_Item_Type,
    COUNT(*) AS Total
FROM Fact_Course_Grade
GROUP BY Grade_Item_Type
ORDER BY Grade_Item_Type;


-- ============================================================
-- 7. KIỂM TRA PASS / FAIL
-- ============================================================

SELECT
    Is_Passed,
    COUNT(*) AS Total
FROM Fact_Course_Grade
GROUP BY Is_Passed
ORDER BY Is_Passed;


-- ============================================================
-- 8. KIỂM TRA GRADE PERCENTAGE
-- ============================================================

SELECT
    MIN(Grade_Percentage) AS Min_Percentage,
    MAX(Grade_Percentage) AS Max_Percentage,
    ROUND(AVG(Grade_Percentage), 2) AS Avg_Percentage
FROM Fact_Course_Grade;


-- ============================================================
-- 9. KIỂM TRA CHI TIẾT
-- ============================================================

SELECT
    f.Grade_Key,

    du.Full_Name,

    dc.Course_Code,

    f.Grade_Item_ID,
    f.Grade_Item_Name,
    f.Grade_Item_Type,

    da.Activity_Name,

    dd.Full_Date AS Grade_Date,

    f.Grade,
    f.Max_Grade,
    f.Grade_Percentage,
    f.Is_Passed

FROM Fact_Course_Grade f

INNER JOIN Dim_User du
    ON du.User_Key = f.User_Key

INNER JOIN Dim_Course dc
    ON dc.Course_Key = f.Course_Key

LEFT JOIN Dim_Activity da
    ON da.Activity_Key = f.Activity_Key

LEFT JOIN Dim_Date dd
    ON dd.Date_Key = f.Date_Key

ORDER BY
    dc.Course_Code,
    f.Grade_Item_Name,
    du.Full_Name;


SET SQL_SAFE_UPDATES = 1;