-- ============================================================
-- 16_seed_learning_resource_engagement.sql
--
-- Bổ sung dữ liệu tương tác cho học liệu:
-- - resource
-- - page
-- - url
--
-- Nguồn:
-- lms_moodle_source.mdl_local_module_daily_engagement
--
-- NGUYÊN TẮC AN TOÀN:
-- - KHÔNG DELETE
-- - KHÔNG UPDATE dữ liệu cũ
-- - KHÔNG DROP bảng thật
-- - KHÔNG TRUNCATE
-- - CHỈ INSERT nếu interaction chưa tồn tại
-- ============================================================

USE lms_moodle_source;


-- ============================================================
-- 1. KIỂM TRA 8 COURSE MODULE HỌC LIỆU
-- ============================================================

SELECT
    cm.id AS coursemoduleid,
    cm.course,
    m.name AS module_type,
    cm.instance,
    cm.visible

FROM mdl_course_modules cm

INNER JOIN mdl_modules m
    ON m.id = cm.module

WHERE cm.id BETWEEN 10001 AND 10008

ORDER BY
    cm.course,
    cm.id;


-- ============================================================
-- 2. KIỂM TRA SINH VIÊN ĐANG ENROL
--
-- Không INSERT ở bước này.
-- Chỉ kiểm tra danh sách user trong course.
-- ============================================================

SELECT
    e.courseid,
    ue.userid

FROM mdl_user_enrolments ue

INNER JOIN mdl_enrol e
    ON e.id = ue.enrolid

WHERE e.courseid IN (
    101,
    102
)

ORDER BY
    e.courseid,
    ue.userid;


-- ============================================================
-- 3. RESOURCE 10001
-- CS301
-- Slide Chương 1 - Tổng quan cơ sở dữ liệu
--
-- Mục tiêu:
-- 6 sinh viên đầu tiên đều tương tác
-- => mức tiếp cận cao
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

SELECT
    700000000000
        + (10001 * 100000)
        + (s.userid * 10)
        + 1,

    s.userid,

    101,

    10001,

    DATE('2026-01-05'),

    900 + (s.rn * 120)

FROM
(
    SELECT
        ue.userid,

        ROW_NUMBER() OVER (
            ORDER BY ue.userid
        ) AS rn

    FROM mdl_user_enrolments ue

    INNER JOIN mdl_enrol e
        ON e.id = ue.enrolid

    WHERE e.courseid = 101
) s

WHERE s.rn <= 6

AND NOT EXISTS
(
    SELECT 1

    FROM mdl_local_module_daily_engagement old

    WHERE old.userid = s.userid
      AND old.courseid = 101
      AND old.coursemoduleid = 10001
      AND old.activitydate = '2026-01-05'
);


-- ============================================================
-- 4. RESOURCE 10002
-- CS301
-- Tài liệu SQL cơ bản
--
-- Mục tiêu:
-- 5 sinh viên tương tác
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

SELECT
    700000000000
        + (10002 * 100000)
        + (s.userid * 10)
        + 1,

    s.userid,

    101,

    10002,

    DATE('2026-01-07'),

    720 + (s.rn * 100)

FROM
(
    SELECT
        ue.userid,

        ROW_NUMBER() OVER (
            ORDER BY ue.userid
        ) AS rn

    FROM mdl_user_enrolments ue

    INNER JOIN mdl_enrol e
        ON e.id = ue.enrolid

    WHERE e.courseid = 101
) s

WHERE s.rn <= 5

AND NOT EXISTS
(
    SELECT 1

    FROM mdl_local_module_daily_engagement old

    WHERE old.userid = s.userid
      AND old.courseid = 101
      AND old.coursemoduleid = 10002
      AND old.activitydate = '2026-01-07'
);


-- ============================================================
-- 5. PAGE 10003
-- CS301
-- Hướng dẫn thực hành SQL
--
-- Mục tiêu:
-- 4 sinh viên tương tác
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

SELECT
    700000000000
        + (10003 * 100000)
        + (s.userid * 10)
        + 1,

    s.userid,

    101,

    10003,

    DATE('2026-01-10'),

    600 + (s.rn * 90)

FROM
(
    SELECT
        ue.userid,

        ROW_NUMBER() OVER (
            ORDER BY ue.userid
        ) AS rn

    FROM mdl_user_enrolments ue

    INNER JOIN mdl_enrol e
        ON e.id = ue.enrolid

    WHERE e.courseid = 101
) s

WHERE s.rn <= 4

AND NOT EXISTS
(
    SELECT 1

    FROM mdl_local_module_daily_engagement old

    WHERE old.userid = s.userid
      AND old.courseid = 101
      AND old.coursemoduleid = 10003
      AND old.activitydate = '2026-01-10'
);


-- ============================================================
-- 6. URL 10004
-- CS301
-- Video hướng dẫn SQL JOIN
--
-- Mục tiêu:
-- chỉ 2 sinh viên tương tác
-- => đây sẽ là học liệu "ít tương tác"
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

SELECT
    700000000000
        + (10004 * 100000)
        + (s.userid * 10)
        + 1,

    s.userid,

    101,

    10004,

    DATE('2026-01-12'),

    480 + (s.rn * 80)

FROM
(
    SELECT
        ue.userid,

        ROW_NUMBER() OVER (
            ORDER BY ue.userid
        ) AS rn

    FROM mdl_user_enrolments ue

    INNER JOIN mdl_enrol e
        ON e.id = ue.enrolid

    WHERE e.courseid = 101
) s

WHERE s.rn <= 2

AND NOT EXISTS
(
    SELECT 1

    FROM mdl_local_module_daily_engagement old

    WHERE old.userid = s.userid
      AND old.courseid = 101
      AND old.coursemoduleid = 10004
      AND old.activitydate = '2026-01-12'
);


-- ============================================================
-- 7. RESOURCE 10005
-- WEB302
-- Slide HTML CSS cơ bản
--
-- Mục tiêu:
-- 6 sinh viên tương tác
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

SELECT
    700000000000
        + (10005 * 100000)
        + (s.userid * 10)
        + 1,

    s.userid,

    102,

    10005,

    DATE('2026-02-10'),

    850 + (s.rn * 110)

FROM
(
    SELECT
        ue.userid,

        ROW_NUMBER() OVER (
            ORDER BY ue.userid
        ) AS rn

    FROM mdl_user_enrolments ue

    INNER JOIN mdl_enrol e
        ON e.id = ue.enrolid

    WHERE e.courseid = 102
) s

WHERE s.rn <= 6

AND NOT EXISTS
(
    SELECT 1

    FROM mdl_local_module_daily_engagement old

    WHERE old.userid = s.userid
      AND old.courseid = 102
      AND old.coursemoduleid = 10005
      AND old.activitydate = '2026-02-10'
);


-- ============================================================
-- 8. RESOURCE 10006
-- WEB302
-- Tài liệu REST API
--
-- Mục tiêu:
-- 5 sinh viên tương tác
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

SELECT
    700000000000
        + (10006 * 100000)
        + (s.userid * 10)
        + 1,

    s.userid,

    102,

    10006,

    DATE('2026-03-30'),

    780 + (s.rn * 100)

FROM
(
    SELECT
        ue.userid,

        ROW_NUMBER() OVER (
            ORDER BY ue.userid
        ) AS rn

    FROM mdl_user_enrolments ue

    INNER JOIN mdl_enrol e
        ON e.id = ue.enrolid

    WHERE e.courseid = 102
) s

WHERE s.rn <= 5

AND NOT EXISTS
(
    SELECT 1

    FROM mdl_local_module_daily_engagement old

    WHERE old.userid = s.userid
      AND old.courseid = 102
      AND old.coursemoduleid = 10006
      AND old.activitydate = '2026-03-30'
);


-- ============================================================
-- 9. PAGE 10007
-- WEB302
-- Hướng dẫn xây dựng REST API
--
-- Mục tiêu:
-- 4 sinh viên tương tác
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

SELECT
    700000000000
        + (10007 * 100000)
        + (s.userid * 10)
        + 1,

    s.userid,

    102,

    10007,

    DATE('2026-04-01'),

    650 + (s.rn * 95)

FROM
(
    SELECT
        ue.userid,

        ROW_NUMBER() OVER (
            ORDER BY ue.userid
        ) AS rn

    FROM mdl_user_enrolments ue

    INNER JOIN mdl_enrol e
        ON e.id = ue.enrolid

    WHERE e.courseid = 102
) s

WHERE s.rn <= 4

AND NOT EXISTS
(
    SELECT 1

    FROM mdl_local_module_daily_engagement old

    WHERE old.userid = s.userid
      AND old.courseid = 102
      AND old.coursemoduleid = 10007
      AND old.activitydate = '2026-04-01'
);


-- ============================================================
-- 10. URL 10008
-- WEB302
-- Video hướng dẫn REST API
--
-- Mục tiêu:
-- 3 sinh viên tương tác
-- => tương tác tương đối thấp
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

SELECT
    700000000000
        + (10008 * 100000)
        + (s.userid * 10)
        + 1,

    s.userid,

    102,

    10008,

    DATE('2026-04-02'),

    500 + (s.rn * 80)

FROM
(
    SELECT
        ue.userid,

        ROW_NUMBER() OVER (
            ORDER BY ue.userid
        ) AS rn

    FROM mdl_user_enrolments ue

    INNER JOIN mdl_enrol e
        ON e.id = ue.enrolid

    WHERE e.courseid = 102
) s

WHERE s.rn <= 3

AND NOT EXISTS
(
    SELECT 1

    FROM mdl_local_module_daily_engagement old

    WHERE old.userid = s.userid
      AND old.courseid = 102
      AND old.coursemoduleid = 10008
      AND old.activitydate = '2026-04-02'
);


-- ============================================================
-- 11. THÊM MỘT SỐ LẦN TƯƠNG TÁC LẶP LẠI
--
-- Mục đích:
-- Power BI có dữ liệu xu hướng theo ngày,
-- không phải mỗi học liệu chỉ xuất hiện đúng một ngày.
--
-- Chỉ bổ sung cho một số sinh viên đầu tiên.
-- ============================================================


-- ------------------------------------------------------------
-- CS301 - Slide Chương 1
-- Sinh viên quay lại xem ngày 07/01
-- ------------------------------------------------------------

INSERT INTO mdl_local_module_daily_engagement
(
    id,
    userid,
    courseid,
    coursemoduleid,
    activitydate,
    time_spent_seconds
)

SELECT
    700000000000
        + (10001 * 100000)
        + (s.userid * 10)
        + 2,

    s.userid,

    101,

    10001,

    DATE('2026-01-07'),

    420 + (s.rn * 60)

FROM
(
    SELECT
        ue.userid,

        ROW_NUMBER() OVER (
            ORDER BY ue.userid
        ) AS rn

    FROM mdl_user_enrolments ue

    INNER JOIN mdl_enrol e
        ON e.id = ue.enrolid

    WHERE e.courseid = 101
) s

WHERE s.rn <= 3

AND NOT EXISTS
(
    SELECT 1

    FROM mdl_local_module_daily_engagement old

    WHERE old.userid = s.userid
      AND old.courseid = 101
      AND old.coursemoduleid = 10001
      AND old.activitydate = '2026-01-07'
);


-- ------------------------------------------------------------
-- CS301 - Tài liệu SQL cơ bản
-- Một số sinh viên xem lại ngày 10/01
-- ------------------------------------------------------------

INSERT INTO mdl_local_module_daily_engagement
(
    id,
    userid,
    courseid,
    coursemoduleid,
    activitydate,
    time_spent_seconds
)

SELECT
    700000000000
        + (10002 * 100000)
        + (s.userid * 10)
        + 2,

    s.userid,

    101,

    10002,

    DATE('2026-01-10'),

    390 + (s.rn * 55)

FROM
(
    SELECT
        ue.userid,

        ROW_NUMBER() OVER (
            ORDER BY ue.userid
        ) AS rn

    FROM mdl_user_enrolments ue

    INNER JOIN mdl_enrol e
        ON e.id = ue.enrolid

    WHERE e.courseid = 101
) s

WHERE s.rn <= 2

AND NOT EXISTS
(
    SELECT 1

    FROM mdl_local_module_daily_engagement old

    WHERE old.userid = s.userid
      AND old.courseid = 101
      AND old.coursemoduleid = 10002
      AND old.activitydate = '2026-01-10'
);


-- ------------------------------------------------------------
-- WEB302 - Slide HTML CSS
-- Một số sinh viên quay lại xem
-- ------------------------------------------------------------

INSERT INTO mdl_local_module_daily_engagement
(
    id,
    userid,
    courseid,
    coursemoduleid,
    activitydate,
    time_spent_seconds
)

SELECT
    700000000000
        + (10005 * 100000)
        + (s.userid * 10)
        + 2,

    s.userid,

    102,

    10005,

    DATE('2026-02-12'),

    400 + (s.rn * 60)

FROM
(
    SELECT
        ue.userid,

        ROW_NUMBER() OVER (
            ORDER BY ue.userid
        ) AS rn

    FROM mdl_user_enrolments ue

    INNER JOIN mdl_enrol e
        ON e.id = ue.enrolid

    WHERE e.courseid = 102
) s

WHERE s.rn <= 3

AND NOT EXISTS
(
    SELECT 1

    FROM mdl_local_module_daily_engagement old

    WHERE old.userid = s.userid
      AND old.courseid = 102
      AND old.coursemoduleid = 10005
      AND old.activitydate = '2026-02-12'
);


-- ============================================================
-- 12. KIỂM TRA DỮ LIỆU VỪA BỔ SUNG
-- ============================================================

SELECT
    courseid,
    coursemoduleid,

    COUNT(*) AS Total_Interaction_Records,

    COUNT(
        DISTINCT userid
    ) AS Unique_Students,

    SUM(
        time_spent_seconds
    ) AS Total_Time_Seconds,

    ROUND(
        AVG(
            time_spent_seconds
        ),
        2
    ) AS Avg_Time_Seconds

FROM mdl_local_module_daily_engagement

WHERE coursemoduleid BETWEEN
      10001 AND 10008

GROUP BY
    courseid,
    coursemoduleid

ORDER BY
    courseid,
    coursemoduleid;


-- ============================================================
-- 13. KIỂM TRA CHI TIẾT
-- ============================================================

SELECT
    id,
    userid,
    courseid,
    coursemoduleid,
    activitydate,
    time_spent_seconds

FROM mdl_local_module_daily_engagement

WHERE coursemoduleid BETWEEN
      10001 AND 10008

ORDER BY
    courseid,
    coursemoduleid,
    userid,
    activitydate;