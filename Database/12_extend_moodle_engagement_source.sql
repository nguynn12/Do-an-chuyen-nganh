-- ============================================================
-- 12_extend_moodle_engagement_source.sql
-- Synthetic course-level daily engagement source
-- ============================================================

USE lms_moodle_source;

SET SQL_SAFE_UPDATES = 0;


-- ============================================================
-- 1. COURSE DAILY ENGAGEMENT SOURCE
-- Grain:
-- 1 dòng = 1 user + 1 course + 1 ngày
-- ============================================================

CREATE TABLE IF NOT EXISTS mdl_local_course_daily_engagement (
    id BIGINT PRIMARY KEY,

    userid BIGINT NOT NULL,
    courseid BIGINT NOT NULL,

    activitydate DATE NOT NULL,

    time_spent_seconds BIGINT NOT NULL DEFAULT 0,

    last_access_time DATETIME,

    UNIQUE KEY uq_course_daily_engagement
        (userid, courseid, activitydate),

    CONSTRAINT fk_engagement_user
        FOREIGN KEY (userid)
        REFERENCES mdl_user(id),

    CONSTRAINT fk_engagement_course
        FOREIGN KEY (courseid)
        REFERENCES mdl_course(id)
) ENGINE=InnoDB;


-- ============================================================
-- 2. XÓA SEED CŨ
-- ============================================================

DELETE FROM mdl_local_course_daily_engagement;


-- ============================================================
-- 3. TẠO DATE RANGE
--
-- Các course hiện tại:
-- 2026-01-05 -> 2026-05-30
--
-- Synthetic engagement:
-- Thứ 2, Thứ 4, Thứ 6
-- ============================================================

SET SESSION cte_max_recursion_depth = 10000;

INSERT INTO mdl_local_course_daily_engagement
(
    id,
    userid,
    courseid,
    activitydate,
    time_spent_seconds,
    last_access_time
)

WITH RECURSIVE date_range AS
(
    SELECT
        DATE(FROM_UNIXTIME(MIN(startdate))) AS activitydate
    FROM mdl_course
    WHERE startdate > 0

    UNION ALL

    SELECT
        activitydate + INTERVAL 1 DAY
    FROM date_range

    WHERE activitydate <
    (
        SELECT
            DATE(FROM_UNIXTIME(MAX(enddate)))
        FROM mdl_course
        WHERE enddate > 0
    )
),

engagement_seed AS
(
    SELECT
        ue.userid,

        e.courseid,

        d.activitydate,

        -- Synthetic time spent:
        -- khoảng 15 phút đến dưới 2 giờ
        900
        +
        MOD(
            ue.userid * 37
            + e.courseid * 11
            + DATEDIFF(d.activitydate, '2026-01-05'),
            6300
        ) AS time_spent_seconds,

        DATE_ADD(
            DATE_ADD(
                CAST(d.activitydate AS DATETIME),

                INTERVAL
                    (
                        8 + MOD(ue.userid + e.courseid, 12)
                    )
                HOUR
            ),

            INTERVAL
                MOD(
                    ue.userid
                    + e.courseid
                    + DATEDIFF(d.activitydate, '2026-01-05'),
                    60
                )
            MINUTE
        ) AS last_access_time

    FROM mdl_user_enrolments ue

    INNER JOIN mdl_enrol e
        ON e.id = ue.enrolid
       AND e.status = 0

    INNER JOIN mdl_course c
        ON c.id = e.courseid

    INNER JOIN date_range d
        ON d.activitydate BETWEEN
            DATE(FROM_UNIXTIME(c.startdate))
            AND
            DATE(FROM_UNIXTIME(c.enddate))

    -- Monday = 0
    -- Wednesday = 2
    -- Friday = 4
    WHERE WEEKDAY(d.activitydate) IN (0, 2, 4)
)

SELECT
    700000
    +
    ROW_NUMBER() OVER (
        ORDER BY courseid, userid, activitydate
    ) AS id,

    userid,
    courseid,
    activitydate,
    time_spent_seconds,
    last_access_time

FROM engagement_seed;


SET SQL_SAFE_UPDATES = 1;


-- ============================================================
-- 4. KIỂM TRA TỔNG
-- ============================================================

SELECT
    COUNT(*) AS Total_Daily_Engagement
FROM mdl_local_course_daily_engagement;


-- ============================================================
-- 5. KIỂM TRA THEO COURSE
-- ============================================================

SELECT
    courseid,
    COUNT(*) AS Total
FROM mdl_local_course_daily_engagement
GROUP BY courseid
ORDER BY courseid;


-- ============================================================
-- 6. KIỂM TRA DATE RANGE
-- ============================================================

SELECT
    MIN(activitydate) AS Min_Date,
    MAX(activitydate) AS Max_Date,

    MIN(time_spent_seconds) AS Min_Time,
    MAX(time_spent_seconds) AS Max_Time

FROM mdl_local_course_daily_engagement;


-- ============================================================
-- 7. KIỂM TRA SAMPLE
-- ============================================================

SELECT *
FROM mdl_local_course_daily_engagement
ORDER BY
    courseid,
    userid,
    activitydate
LIMIT 30;