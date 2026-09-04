-- ============================================================
-- 13_extend_moodle_module_engagement_source.sql
-- Synthetic module-level engagement source
-- Đây là bảng custom phục vụ đồ án, không phải bảng Moodle chuẩn
-- ============================================================

USE lms_moodle_source;

SET SQL_SAFE_UPDATES = 0;


-- ============================================================
-- 1. MODULE DAILY ENGAGEMENT
-- Grain:
-- 1 dòng = 1 user + 1 course module + 1 ngày
-- ============================================================

CREATE TABLE IF NOT EXISTS mdl_local_module_daily_engagement (
    id BIGINT PRIMARY KEY,

    userid BIGINT NOT NULL,
    courseid BIGINT NOT NULL,
    coursemoduleid BIGINT NOT NULL,

    activitydate DATE NOT NULL,

    time_spent_seconds BIGINT NOT NULL DEFAULT 0,

    UNIQUE KEY uq_module_daily_engagement
        (userid, coursemoduleid, activitydate),

    CONSTRAINT fk_module_engagement_user
        FOREIGN KEY (userid)
        REFERENCES mdl_user(id),

    CONSTRAINT fk_module_engagement_course
        FOREIGN KEY (courseid)
        REFERENCES mdl_course(id),

    CONSTRAINT fk_module_engagement_cm
        FOREIGN KEY (coursemoduleid)
        REFERENCES mdl_course_modules(id)

) ENGINE=InnoDB;


-- ============================================================
-- 2. XÓA SEED CŨ
-- ============================================================

DELETE FROM mdl_local_module_daily_engagement;


-- ============================================================
-- 3. PHÂN BỔ COURSE ENGAGEMENT XUỐNG MODULE
--
-- Mỗi course hiện có 3 activity:
-- activity 1: 40%
-- activity 2: 35%
-- activity 3: phần còn lại
--
-- Tổng module time của 1 ngày vẫn bằng course time.
-- ============================================================

INSERT INTO mdl_local_module_daily_engagement
(
    id,
    userid,
    courseid,
    coursemoduleid,
    activitydate,
    time_spent_seconds
)

WITH module_rank AS
(
    SELECT
        cm.id AS coursemoduleid,
        cm.course AS courseid,

        ROW_NUMBER() OVER (
            PARTITION BY cm.course
            ORDER BY cm.id
        ) AS activity_rank

    FROM mdl_course_modules cm
),

module_seed AS
(
    SELECT
        ce.userid,
        ce.courseid,
        mr.coursemoduleid,
        ce.activitydate,

        CASE

            WHEN mr.activity_rank = 1
            THEN FLOOR(ce.time_spent_seconds * 0.40)

            WHEN mr.activity_rank = 2
            THEN FLOOR(ce.time_spent_seconds * 0.35)

            ELSE
                ce.time_spent_seconds
                - FLOOR(ce.time_spent_seconds * 0.40)
                - FLOOR(ce.time_spent_seconds * 0.35)

        END AS module_time

    FROM mdl_local_course_daily_engagement ce

    INNER JOIN module_rank mr
        ON mr.courseid = ce.courseid
)

SELECT
    900000
    +
    ROW_NUMBER() OVER (
        ORDER BY
            courseid,
            userid,
            activitydate,
            coursemoduleid
    ) AS id,

    userid,
    courseid,
    coursemoduleid,
    activitydate,
    module_time

FROM module_seed;


SET SQL_SAFE_UPDATES = 1;


-- ============================================================
-- 4. KIỂM TRA TỔNG
-- ============================================================

SELECT
    COUNT(*) AS Total_Module_Engagement
FROM mdl_local_module_daily_engagement;


-- ============================================================
-- 5. KIỂM TRA THEO COURSE
-- ============================================================

SELECT
    courseid,
    COUNT(*) AS Total
FROM mdl_local_module_daily_engagement
GROUP BY courseid
ORDER BY courseid;


-- ============================================================
-- 6. KIỂM TRA THEO ACTIVITY
-- ============================================================

SELECT
    coursemoduleid,
    COUNT(*) AS Total
FROM mdl_local_module_daily_engagement
GROUP BY coursemoduleid
ORDER BY coursemoduleid;


-- ============================================================
-- 7. KIỂM TRA TỔNG TIME COURSE VS MODULE
-- Hai tổng phải bằng nhau
-- ============================================================

SELECT
    (
        SELECT SUM(time_spent_seconds)
        FROM mdl_local_course_daily_engagement
    ) AS Course_Total_Time,

    (
        SELECT SUM(time_spent_seconds)
        FROM mdl_local_module_daily_engagement
    ) AS Module_Total_Time;


-- ============================================================
-- 8. SAMPLE
-- ============================================================

SELECT *
FROM mdl_local_module_daily_engagement
ORDER BY
    courseid,
    userid,
    activitydate,
    coursemoduleid
LIMIT 30;