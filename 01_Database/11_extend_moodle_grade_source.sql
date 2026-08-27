-- ============================================================
-- 11_extend_moodle_grade_source.sql
-- Synthetic Moodle Source cho Grade
-- ============================================================

USE lms_moodle_source;

SET SQL_SAFE_UPDATES = 0;


-- ============================================================
-- 1. GRADE ITEMS
-- ============================================================

CREATE TABLE IF NOT EXISTS mdl_grade_items (
    id BIGINT PRIMARY KEY,
    courseid BIGINT NOT NULL,
    itemname VARCHAR(255),
    itemtype VARCHAR(50),
    itemmodule VARCHAR(50),
    iteminstance BIGINT,
    grademax DECIMAL(10,4),
    gradepass DECIMAL(10,4),

    CONSTRAINT fk_grade_item_course
        FOREIGN KEY (courseid)
        REFERENCES mdl_course(id)
) ENGINE=InnoDB;


-- ============================================================
-- 2. GRADE GRADES
-- ============================================================

CREATE TABLE IF NOT EXISTS mdl_grade_grades (
    id BIGINT PRIMARY KEY,
    itemid BIGINT NOT NULL,
    userid BIGINT NOT NULL,
    finalgrade DECIMAL(10,4),
    timemodified BIGINT,

    CONSTRAINT fk_grade_grade_item
        FOREIGN KEY (itemid)
        REFERENCES mdl_grade_items(id),

    CONSTRAINT fk_grade_grade_user
        FOREIGN KEY (userid)
        REFERENCES mdl_user(id)
) ENGINE=InnoDB;


-- ============================================================
-- 3. XÓA SEED CŨ
-- ============================================================

DELETE FROM mdl_grade_grades;
DELETE FROM mdl_grade_items;


-- ============================================================
-- 4. GRADE ITEMS CHO ASSIGNMENT
-- 8 assignments
-- ============================================================

INSERT INTO mdl_grade_items
(
    id,
    courseid,
    itemname,
    itemtype,
    itemmodule,
    iteminstance,
    grademax,
    gradepass
)
SELECT
    40000 + a.id,
    a.course,
    a.name,
    'mod',
    'assign',
    a.id,
    a.grade,
    a.grade * 0.5
FROM mdl_assign a;


-- ============================================================
-- 5. GRADE ITEMS CHO QUIZ
-- 4 quizzes
-- ============================================================

INSERT INTO mdl_grade_items
(
    id,
    courseid,
    itemname,
    itemtype,
    itemmodule,
    iteminstance,
    grademax,
    gradepass
)
SELECT
    50000 + q.id,
    q.course,
    q.name,
    'mod',
    'quiz',
    q.id,
    q.grade,
    q.grade * 0.5
FROM mdl_quiz q;


-- ============================================================
-- 6. GRADE GRADES TỪ ASSIGNMENT ĐÃ CHẤM
-- Source hiện có 30 mdl_assign_grades
-- ============================================================

INSERT INTO mdl_grade_grades
(
    id,
    itemid,
    userid,
    finalgrade,
    timemodified
)
SELECT
    60000 + g.id,
    40000 + g.assignment,
    g.userid,
    g.grade,
    g.timemodified
FROM mdl_assign_grades g
WHERE g.grade IS NOT NULL;


-- ============================================================
-- 7. SYNTHETIC QUIZ GRADES
--
-- Mỗi course có 6 sinh viên enrol
-- Mỗi course có 1 quiz
-- => 24 quiz grade records
-- ============================================================

INSERT INTO mdl_grade_grades
(
    id,
    itemid,
    userid,
    finalgrade,
    timemodified
)
SELECT
    200000
    + ROW_NUMBER() OVER (
        ORDER BY q.id, ue.userid
    ) AS id,

    50000 + q.id AS itemid,

    ue.userid,

    ROUND(
        5 + (MOD(q.id + ue.userid, 51) / 10),
        4
    ) AS finalgrade,

    q.timeclose - 3600 AS timemodified

FROM mdl_quiz q

INNER JOIN mdl_enrol e
    ON e.courseid = q.course
   AND e.status = 0

INNER JOIN mdl_user_enrolments ue
    ON ue.enrolid = e.id;


SET SQL_SAFE_UPDATES = 1;


-- ============================================================
-- 8. KIỂM TRA
-- ============================================================

SELECT
    'mdl_grade_items' AS Table_Name,
    COUNT(*) AS Total
FROM mdl_grade_items

UNION ALL

SELECT
    'mdl_grade_grades',
    COUNT(*)
FROM mdl_grade_grades;


-- ============================================================
-- 9. KIỂM TRA GRADE ITEM TYPE
-- ============================================================

SELECT
    itemmodule,
    COUNT(*) AS Total
FROM mdl_grade_items
GROUP BY itemmodule
ORDER BY itemmodule;


-- ============================================================
-- 10. KIỂM TRA CHI TIẾT
-- ============================================================

SELECT
    gi.id AS Grade_Item_ID,
    gi.courseid,
    gi.itemname,
    gi.itemmodule,
    gi.iteminstance,
    gg.userid,
    gg.finalgrade,
    gi.grademax,
    gi.gradepass,
    FROM_UNIXTIME(gg.timemodified) AS Grade_Time
FROM mdl_grade_items gi

LEFT JOIN mdl_grade_grades gg
    ON gg.itemid = gi.id

ORDER BY
    gi.courseid,
    gi.id,
    gg.userid;