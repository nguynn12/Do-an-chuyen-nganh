-- ============================================================
-- 09_extend_moodle_activity_source.sql
-- Bổ sung Moodle Source giả lập cho Activity
-- ============================================================

USE lms_moodle_source;

SET SQL_SAFE_UPDATES = 0;


-- ============================================================
-- 1. MODULE TYPES
-- ============================================================

CREATE TABLE IF NOT EXISTS mdl_modules (
    id BIGINT PRIMARY KEY,
    name VARCHAR(50) NOT NULL UNIQUE
) ENGINE=InnoDB;


-- ============================================================
-- 2. COURSE MODULES
-- Grain: 1 dòng = 1 activity được gắn vào course
-- ============================================================

CREATE TABLE IF NOT EXISTS mdl_course_modules (
    id BIGINT PRIMARY KEY,
    course BIGINT NOT NULL,
    module BIGINT NOT NULL,
    instance BIGINT NOT NULL,
    visible TINYINT(1) NOT NULL DEFAULT 1,

    CONSTRAINT fk_source_cm_course
        FOREIGN KEY (course)
        REFERENCES mdl_course(id),

    CONSTRAINT fk_source_cm_module
        FOREIGN KEY (module)
        REFERENCES mdl_modules(id)
) ENGINE=InnoDB;


-- ============================================================
-- 3. ASSIGNMENT
-- Chỉ giữ các cột cần cho Dashboard / DW
-- ============================================================

CREATE TABLE IF NOT EXISTS mdl_assign (
    id BIGINT PRIMARY KEY,
    course BIGINT NOT NULL,
    name VARCHAR(255) NOT NULL,
    duedate BIGINT NOT NULL DEFAULT 0,
    grade DECIMAL(10,2) NOT NULL DEFAULT 10,

    CONSTRAINT fk_source_assign_course
        FOREIGN KEY (course)
        REFERENCES mdl_course(id)
) ENGINE=InnoDB;


-- ============================================================
-- 4. QUIZ
-- Chỉ giữ các cột cần cho Dashboard / DW
-- ============================================================

CREATE TABLE IF NOT EXISTS mdl_quiz (
    id BIGINT PRIMARY KEY,
    course BIGINT NOT NULL,
    name VARCHAR(255) NOT NULL,
    timeclose BIGINT NOT NULL DEFAULT 0,
    grade DECIMAL(10,2) NOT NULL DEFAULT 10,

    CONSTRAINT fk_source_quiz_course
        FOREIGN KEY (course)
        REFERENCES mdl_course(id)
) ENGINE=InnoDB;


-- ============================================================
-- 5. XÓA DATA SEED CŨ
-- ============================================================

DELETE FROM mdl_course_modules;
DELETE FROM mdl_assign;
DELETE FROM mdl_quiz;
DELETE FROM mdl_modules;


-- ============================================================
-- 6. MODULE TYPES
-- Synthetic IDs dùng trong bộ dữ liệu mô phỏng
-- ============================================================

INSERT INTO mdl_modules (id, name)
VALUES
(1, 'assign'),
(2, 'quiz');


-- ============================================================
-- 7. ASSIGNMENTS
-- 2 Assignment / Course
-- ============================================================

INSERT INTO mdl_assign
(id, course, name, duedate, grade)
VALUES

-- Course 101: Cơ sở dữ liệu
(2001, 101, 'Bài tập SQL cơ bản',
 UNIX_TIMESTAMP('2026-02-15 23:59:59'), 10),

(2002, 101, 'Bài tập thiết kế cơ sở dữ liệu',
 UNIX_TIMESTAMP('2026-03-20 23:59:59'), 10),

-- Course 102: Lập trình Web
(2003, 102, 'Bài tập HTML CSS',
 UNIX_TIMESTAMP('2026-02-18 23:59:59'), 10),

(2004, 102, 'Bài tập xây dựng REST API',
 UNIX_TIMESTAMP('2026-04-05 23:59:59'), 10),

-- Course 103: Game
(2005, 103, 'Bài tập Unity cơ bản',
 UNIX_TIMESTAMP('2026-02-25 23:59:59'), 10),

(2006, 103, 'Bài tập xây dựng Gameplay',
 UNIX_TIMESTAMP('2026-04-10 23:59:59'), 10),

-- Course 104: AI
(2007, 104, 'Bài tập tìm kiếm trạng thái',
 UNIX_TIMESTAMP('2026-03-01 23:59:59'), 10),

(2008, 104, 'Bài tập Machine Learning cơ bản',
 UNIX_TIMESTAMP('2026-04-15 23:59:59'), 10);


-- ============================================================
-- 8. QUIZZES
-- 1 Quiz / Course
-- ============================================================

INSERT INTO mdl_quiz
(id, course, name, timeclose, grade)
VALUES

(3001, 101, 'Quiz SQL',
 UNIX_TIMESTAMP('2026-03-05 23:59:59'), 10),

(3002, 102, 'Quiz JavaScript',
 UNIX_TIMESTAMP('2026-03-10 23:59:59'), 10),

(3003, 103, 'Quiz Unity',
 UNIX_TIMESTAMP('2026-03-15 23:59:59'), 10),

(3004, 104, 'Quiz Trí tuệ nhân tạo',
 UNIX_TIMESTAMP('2026-03-20 23:59:59'), 10);


-- ============================================================
-- 9. COURSE MODULES
--
-- module = 1 -> assign
-- module = 2 -> quiz
-- ============================================================

INSERT INTO mdl_course_modules
(id, course, module, instance, visible)
VALUES

-- Course 101
(5001, 101, 1, 2001, 1),
(5002, 101, 1, 2002, 1),
(5003, 101, 2, 3001, 1),

-- Course 102
(5004, 102, 1, 2003, 1),
(5005, 102, 1, 2004, 1),
(5006, 102, 2, 3002, 1),

-- Course 103
(5007, 103, 1, 2005, 1),
(5008, 103, 1, 2006, 1),
(5009, 103, 2, 3003, 1),

-- Course 104
(5010, 104, 1, 2007, 1),
(5011, 104, 1, 2008, 1),
(5012, 104, 2, 3004, 1);


SET SQL_SAFE_UPDATES = 1;


-- ============================================================
-- 10. KIỂM TRA
-- ============================================================

SELECT
    'mdl_modules' AS Table_Name,
    COUNT(*) AS Total
FROM mdl_modules

UNION ALL

SELECT
    'mdl_course_modules',
    COUNT(*)
FROM mdl_course_modules

UNION ALL

SELECT
    'mdl_assign',
    COUNT(*)
FROM mdl_assign

UNION ALL

SELECT
    'mdl_quiz',
    COUNT(*)
FROM mdl_quiz;


-- ============================================================
-- 11. KIỂM TRA ACTIVITY ĐÃ NỐI ĐÚNG COURSE
-- ============================================================

SELECT
    cm.id AS Moodle_Module_ID,
    c.shortname AS Course_Code,
    m.name AS Activity_Type,
    cm.instance AS Instance_ID,
    cm.visible AS Is_Visible
FROM mdl_course_modules cm
JOIN mdl_course c
    ON c.id = cm.course
JOIN mdl_modules m
    ON m.id = cm.module
ORDER BY cm.id;