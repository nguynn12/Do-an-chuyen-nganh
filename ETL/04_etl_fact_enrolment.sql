-- ============================================================
-- 04_etl_fact_enrolment.sql
-- ETL: Moodle Source -> Fact_Enrolment
-- ============================================================

USE lms_datawarehouse;

SET SQL_SAFE_UPDATES = 0;


-- ============================================================
-- 1. STAGING
-- Grain:
-- 1 dòng = 1 user được enrol vào 1 course
-- ============================================================

DROP TEMPORARY TABLE IF EXISTS tmp_fact_enrolment;

CREATE TEMPORARY TABLE tmp_fact_enrolment AS

SELECT
    du.User_Key,
    dc.Course_Key,

    dd_start.Date_Key AS Enrol_Date_Key,

    dd_end.Date_Key AS Unenrol_Date_Key,

    CASE
        WHEN e.status = 0 THEN 'Active'
        ELSE 'Inactive'
    END AS Status

FROM lms_moodle_source.mdl_user_enrolments ue

INNER JOIN lms_moodle_source.mdl_enrol e
    ON e.id = ue.enrolid

INNER JOIN Dim_User du
    ON du.Moodle_User_ID = ue.userid

INNER JOIN Dim_Course dc
    ON dc.Moodle_Course_ID = e.courseid

INNER JOIN Dim_Date dd_start
    ON dd_start.Full_Date =
        DATE(FROM_UNIXTIME(ue.timestart))

LEFT JOIN Dim_Date dd_end
    ON dd_end.Full_Date =
        CASE
            WHEN ue.timeend > 0
            THEN DATE(FROM_UNIXTIME(ue.timeend))
            ELSE NULL
        END;


-- ============================================================
-- 2. KIỂM TRA STAGING
-- ============================================================

SELECT *
FROM tmp_fact_enrolment
ORDER BY Course_Key, User_Key;


-- ============================================================
-- 3. UPDATE RECORD ĐÃ CÓ
-- Natural key tạm dùng:
-- User_Key + Course_Key + Enrol_Date_Key
-- ============================================================

UPDATE Fact_Enrolment f
INNER JOIN tmp_fact_enrolment t
    ON  f.User_Key = t.User_Key
    AND f.Course_Key = t.Course_Key
    AND f.Enrol_Date_Key = t.Enrol_Date_Key

SET
    f.Unenrol_Date_Key = t.Unenrol_Date_Key,
    f.Status = t.Status;


-- ============================================================
-- 4. INSERT RECORD MỚI
-- ============================================================

INSERT INTO Fact_Enrolment
(
    User_Key,
    Course_Key,
    Enrol_Date_Key,
    Unenrol_Date_Key,
    Status
)
SELECT
    t.User_Key,
    t.Course_Key,
    t.Enrol_Date_Key,
    t.Unenrol_Date_Key,
    t.Status

FROM tmp_fact_enrolment t

LEFT JOIN Fact_Enrolment f
    ON  f.User_Key = t.User_Key
    AND f.Course_Key = t.Course_Key
    AND f.Enrol_Date_Key = t.Enrol_Date_Key

WHERE f.Enrolment_Key IS NULL;


-- ============================================================
-- 5. KIỂM TRA TỔNG SỐ ENROLMENT
-- ============================================================

SELECT
    COUNT(*) AS Total_Enrolments
FROM Fact_Enrolment;


-- ============================================================
-- 6. KIỂM TRA THEO STATUS
-- ============================================================

SELECT
    Status,
    COUNT(*) AS Total
FROM Fact_Enrolment
GROUP BY Status
ORDER BY Status;


-- ============================================================
-- 7. KIỂM TRA CHI TIẾT
-- ============================================================

SELECT
    fe.Enrolment_Key,

    du.Moodle_User_ID,
    du.Full_Name,
    du.Primary_Role,

    dc.Course_Code,
    dc.Course_Name,

    dd_start.Full_Date AS Enrol_Date,
    dd_end.Full_Date AS Unenrol_Date,

    fe.Status

FROM Fact_Enrolment fe

INNER JOIN Dim_User du
    ON du.User_Key = fe.User_Key

INNER JOIN Dim_Course dc
    ON dc.Course_Key = fe.Course_Key

INNER JOIN Dim_Date dd_start
    ON dd_start.Date_Key = fe.Enrol_Date_Key

LEFT JOIN Dim_Date dd_end
    ON dd_end.Date_Key = fe.Unenrol_Date_Key

ORDER BY
    dc.Course_Code,
    du.Full_Name;


SET SQL_SAFE_UPDATES = 1;