-- ============================================================
-- 07_etl_fact_daily_engagement.sql
-- ETL: Moodle Source -> Fact_Daily_Engagement
-- ============================================================

USE lms_datawarehouse;

SET SQL_SAFE_UPDATES = 0;


-- ============================================================
-- 1. STAGING
-- Grain:
-- 1 dòng = 1 user + 1 course + 1 ngày
-- ============================================================

DROP TEMPORARY TABLE IF EXISTS tmp_fact_daily_engagement;

CREATE TEMPORARY TABLE tmp_fact_daily_engagement AS

SELECT
    du.User_Key,

    dc.Course_Key,

    dd.Date_Key,

    e.time_spent_seconds AS Time_Spent_Seconds,

    e.last_access_time AS Last_Access_Time

FROM lms_moodle_source.mdl_local_course_daily_engagement e

INNER JOIN Dim_User du
    ON du.Moodle_User_ID = e.userid

INNER JOIN Dim_Course dc
    ON dc.Moodle_Course_ID = e.courseid

INNER JOIN Dim_Date dd
    ON dd.Full_Date = e.activitydate;


-- ============================================================
-- 2. KIỂM TRA STAGING
-- ============================================================

SELECT
    COUNT(*) AS Total_Staging
FROM tmp_fact_daily_engagement;

SELECT *
FROM tmp_fact_daily_engagement
ORDER BY
    Course_Key,
    User_Key,
    Date_Key
LIMIT 30;


-- ============================================================
-- 3. UPDATE RECORD ĐÃ TỒN TẠI
-- Natural key:
-- User_Key + Course_Key + Date_Key
-- ============================================================

UPDATE Fact_Daily_Engagement f

INNER JOIN tmp_fact_daily_engagement t
    ON  f.User_Key = t.User_Key
    AND f.Course_Key = t.Course_Key
    AND f.Date_Key = t.Date_Key

SET
    f.Time_Spent_Seconds = t.Time_Spent_Seconds,
    f.Last_Access_Time = t.Last_Access_Time;


-- ============================================================
-- 4. INSERT RECORD MỚI
-- ============================================================

INSERT INTO Fact_Daily_Engagement
(
    User_Key,
    Course_Key,
    Date_Key,
    Time_Spent_Seconds,
    Last_Access_Time
)

SELECT
    t.User_Key,
    t.Course_Key,
    t.Date_Key,
    t.Time_Spent_Seconds,
    t.Last_Access_Time

FROM tmp_fact_daily_engagement t

LEFT JOIN Fact_Daily_Engagement f
    ON  f.User_Key = t.User_Key
    AND f.Course_Key = t.Course_Key
    AND f.Date_Key = t.Date_Key

WHERE f.Engagement_Key IS NULL;


-- ============================================================
-- 5. KIỂM TRA TỔNG
-- ============================================================

SELECT
    COUNT(*) AS Total_Daily_Engagement
FROM Fact_Daily_Engagement;


-- ============================================================
-- 6. KIỂM TRA THEO COURSE
-- ============================================================

SELECT
    dc.Course_Code,
    COUNT(*) AS Total_Records,
    SUM(f.Time_Spent_Seconds) AS Total_Time_Seconds,
    ROUND(
        AVG(f.Time_Spent_Seconds),
        2
    ) AS Avg_Time_Seconds

FROM Fact_Daily_Engagement f

INNER JOIN Dim_Course dc
    ON dc.Course_Key = f.Course_Key

GROUP BY
    dc.Course_Key,
    dc.Course_Code

ORDER BY dc.Course_Code;


-- ============================================================
-- 7. KIỂM TRA DATE RANGE
-- ============================================================

SELECT
    MIN(dd.Full_Date) AS Min_Date,
    MAX(dd.Full_Date) AS Max_Date

FROM Fact_Daily_Engagement f

INNER JOIN Dim_Date dd
    ON dd.Date_Key = f.Date_Key;


-- ============================================================
-- 8. KIỂM TRA CHI TIẾT
-- ============================================================

SELECT
    f.Engagement_Key,

    du.Full_Name,

    dc.Course_Code,
    dc.Course_Name,

    dd.Full_Date AS Activity_Date,

    f.Time_Spent_Seconds,

    ROUND(
        f.Time_Spent_Seconds / 60,
        2
    ) AS Time_Spent_Minutes,

    f.Last_Access_Time

FROM Fact_Daily_Engagement f

INNER JOIN Dim_User du
    ON du.User_Key = f.User_Key

INNER JOIN Dim_Course dc
    ON dc.Course_Key = f.Course_Key

INNER JOIN Dim_Date dd
    ON dd.Date_Key = f.Date_Key

ORDER BY
    dc.Course_Code,
    du.Full_Name,
    dd.Full_Date

LIMIT 100;


SET SQL_SAFE_UPDATES = 1;