-- ============================================================
-- 10_extend_moodle_submission_source.sql
-- Bổ sung synthetic Moodle Source cho Assignment Submission
-- Đây là subset phục vụ Data Warehouse, không phải full schema Moodle
-- ============================================================

USE lms_moodle_source;

SET SQL_SAFE_UPDATES = 0;


-- ============================================================
-- 1. ASSIGN SUBMISSION
-- ============================================================

CREATE TABLE IF NOT EXISTS mdl_assign_submission (
    id BIGINT PRIMARY KEY,
    assignment BIGINT NOT NULL,
    userid BIGINT NOT NULL,
    timecreated BIGINT NOT NULL,
    timemodified BIGINT NOT NULL,
    status VARCHAR(30) NOT NULL,
    attemptnumber INT NOT NULL DEFAULT 0,
    latest TINYINT(1) NOT NULL DEFAULT 1,

    CONSTRAINT fk_submission_assignment
        FOREIGN KEY (assignment)
        REFERENCES mdl_assign(id),

    CONSTRAINT fk_submission_user
        FOREIGN KEY (userid)
        REFERENCES mdl_user(id)
) ENGINE=InnoDB;


-- ============================================================
-- 2. ASSIGN GRADES
-- ============================================================

CREATE TABLE IF NOT EXISTS mdl_assign_grades (
    id BIGINT PRIMARY KEY,
    assignment BIGINT NOT NULL,
    userid BIGINT NOT NULL,
    timecreated BIGINT NOT NULL,
    timemodified BIGINT NOT NULL,
    grade DECIMAL(10,2),
    attemptnumber INT NOT NULL DEFAULT 0,

    CONSTRAINT fk_assign_grade_assignment
        FOREIGN KEY (assignment)
        REFERENCES mdl_assign(id),

    CONSTRAINT fk_assign_grade_user
        FOREIGN KEY (userid)
        REFERENCES mdl_user(id)
) ENGINE=InnoDB;


-- ============================================================
-- 3. ASSIGN FEEDBACK COMMENTS
-- ============================================================

CREATE TABLE IF NOT EXISTS mdl_assignfeedback_comments (
    id BIGINT PRIMARY KEY,
    assignment BIGINT NOT NULL,
    grade BIGINT NOT NULL,
    commenttext TEXT,

    CONSTRAINT fk_feedback_assignment
        FOREIGN KEY (assignment)
        REFERENCES mdl_assign(id),

    CONSTRAINT fk_feedback_grade
        FOREIGN KEY (grade)
        REFERENCES mdl_assign_grades(id)
) ENGINE=InnoDB;


-- ============================================================
-- 4. XÓA SEED CŨ
-- ============================================================

DELETE FROM mdl_assignfeedback_comments;
DELETE FROM mdl_assign_grades;
DELETE FROM mdl_assign_submission;


-- ============================================================
-- 5. TẠO STAGING SYNTHETIC
--
-- Mỗi sinh viên được enrol vào course sẽ có
-- 1 record cho mỗi assignment của course đó.
--
-- Hiện source có:
-- 24 enrolment
-- 2 assignment/course
-- => tổng 48 assignment-submission records
-- ============================================================

DROP TEMPORARY TABLE IF EXISTS tmp_submission_seed;

CREATE TEMPORARY TABLE tmp_submission_seed AS

SELECT
    6000 + ROW_NUMBER() OVER (
        ORDER BY a.id, ue.userid
    ) AS Submission_ID,

    a.id AS Assignment_ID,
    ue.userid AS User_ID,

    a.duedate - (14 * 86400) AS Time_Created,

    CASE

        -- Một số record ở trạng thái draft
        WHEN MOD(ue.userid + a.id, 6) = 0
        THEN a.duedate - (2 * 86400)

        -- Một số sinh viên nộp trễ 1 ngày
        WHEN MOD(ue.userid + a.id, 4) = 0
        THEN a.duedate + (1 * 86400)

        -- Các trường hợp còn lại nộp trước hạn 1-3 ngày
        ELSE
            a.duedate -
            ((MOD(ue.userid + a.id, 3) + 1) * 86400)

    END AS Time_Modified,

    CASE
        WHEN MOD(ue.userid + a.id, 6) = 0
        THEN 'draft'
        ELSE 'submitted'
    END AS Submission_Status

FROM mdl_assign a

INNER JOIN mdl_enrol e
    ON e.courseid = a.course
   AND e.status = 0

INNER JOIN mdl_user_enrolments ue
    ON ue.enrolid = e.id;


-- ============================================================
-- 6. INSERT SUBMISSION
-- ============================================================

INSERT INTO mdl_assign_submission
(
    id,
    assignment,
    userid,
    timecreated,
    timemodified,
    status,
    attemptnumber,
    latest
)
SELECT
    Submission_ID,
    Assignment_ID,
    User_ID,
    Time_Created,
    Time_Modified,
    Submission_Status,
    0,
    1
FROM tmp_submission_seed;


-- ============================================================
-- 7. INSERT GRADE
--
-- Chỉ những bài:
-- - status = submitted
-- - và thỏa điều kiện synthetic dưới đây
-- mới được chấm.
--
-- Nhờ vậy Dashboard có cả:
-- Graded và Not Graded
-- ============================================================

INSERT INTO mdl_assign_grades
(
    id,
    assignment,
    userid,
    timecreated,
    timemodified,
    grade,
    attemptnumber
)
SELECT
    10000 + s.id,

    s.assignment,
    s.userid,

    s.timemodified + 3600,
    s.timemodified + 3600,

    ROUND(
        5 + (MOD(s.userid + s.assignment, 51) / 10),
        2
    ) AS Grade,

    s.attemptnumber

FROM mdl_assign_submission s

WHERE s.status = 'submitted'
  AND MOD(s.userid + s.assignment, 5) <> 0;


-- ============================================================
-- 8. INSERT FEEDBACK
-- ============================================================

INSERT INTO mdl_assignfeedback_comments
(
    id,
    assignment,
    grade,
    commenttext
)
SELECT
    30000 + g.id,

    g.assignment,

    g.id,

    CASE
        WHEN g.grade >= 8
            THEN 'Hoàn thành tốt bài tập.'

        WHEN g.grade >= 6.5
            THEN 'Bài làm đạt yêu cầu.'

        ELSE
            'Cần cải thiện và xem lại nội dung bài học.'
    END

FROM mdl_assign_grades g;


SET SQL_SAFE_UPDATES = 1;


-- ============================================================
-- 9. KIỂM TRA
-- ============================================================

SELECT
    'mdl_assign_submission' AS Table_Name,
    COUNT(*) AS Total
FROM mdl_assign_submission

UNION ALL

SELECT
    'mdl_assign_grades',
    COUNT(*)
FROM mdl_assign_grades

UNION ALL

SELECT
    'mdl_assignfeedback_comments',
    COUNT(*)
FROM mdl_assignfeedback_comments;


-- ============================================================
-- 10. KIỂM TRA STATUS
-- ============================================================

SELECT
    status,
    COUNT(*) AS Total
FROM mdl_assign_submission
GROUP BY status
ORDER BY status;


-- ============================================================
-- 11. KIỂM TRA CHI TIẾT
-- ============================================================

SELECT
    s.id AS Submission_ID,

    s.userid,

    a.course,

    s.assignment,

    a.name AS Assignment_Name,

    FROM_UNIXTIME(a.duedate) AS Due_Time,

    CASE
        WHEN s.status = 'submitted'
        THEN FROM_UNIXTIME(s.timemodified)
        ELSE NULL
    END AS Submit_Time,

    s.status,

    g.grade,

    fc.commenttext

FROM mdl_assign_submission s

INNER JOIN mdl_assign a
    ON a.id = s.assignment

LEFT JOIN mdl_assign_grades g
    ON g.assignment = s.assignment
   AND g.userid = s.userid
   AND g.attemptnumber = s.attemptnumber

LEFT JOIN mdl_assignfeedback_comments fc
    ON fc.grade = g.id

ORDER BY
    a.course,
    s.assignment,
    s.userid;