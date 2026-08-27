-- ============================================================
-- 07_seed_moodle_source.sql
-- SEED DỮ LIỆU MOODLE GIẢ LẬP
-- ============================================================

USE lms_moodle_source;


-- ============================================================
-- 1. XÓA DỮ LIỆU CŨ NẾU ĐÃ CHẠY FILE NÀY TRƯỚC ĐÓ
-- Xóa theo thứ tự từ bảng con -> bảng cha
-- ============================================================

SET SQL_SAFE_UPDATES = 0;

DELETE FROM mdl_role_assignments;
DELETE FROM mdl_user_enrolments;
DELETE FROM mdl_context;
DELETE FROM mdl_enrol;
DELETE FROM mdl_role;
DELETE FROM mdl_course;
DELETE FROM mdl_course_categories;
DELETE FROM mdl_user;

SET SQL_SAFE_UPDATES = 1;


-- ============================================================
-- 2. COURSE CATEGORIES
-- ============================================================

INSERT INTO mdl_course_categories
(id, name, idnumber, description, parent, sortorder)
VALUES
(1, 'Khoa Công nghệ Thông tin', 'CNTT',
 'Các học phần thuộc Khoa Công nghệ Thông tin', 0, 1),

(2, 'Khoa Kinh tế', 'KT',
 'Các học phần thuộc Khoa Kinh tế', 0, 2),

(3, 'Cơ sở ngành CNTT', 'CNTT-CSN',
 'Các học phần cơ sở ngành Công nghệ Thông tin', 1, 3),

(4, 'Chuyên ngành CNTT', 'CNTT-CN',
 'Các học phần chuyên ngành Công nghệ Thông tin', 1, 4);


-- ============================================================
-- 3. USERS
-- 2 GIẢNG VIÊN + 12 SINH VIÊN
-- ============================================================

INSERT INTO mdl_user
(id, username, idnumber, firstname, lastname, email,
 suspended, deleted, firstaccess, lastaccess,
 timecreated, timemodified)
VALUES

-- =========================
-- GIẢNG VIÊN
-- =========================

(1, 'gv_nguyenan', 'GV001',
 'Nguyễn An', 'Nguyễn',
 'nguyenan@dlu.edu.vn',
 0, 0,
 UNIX_TIMESTAMP('2025-08-20 08:00:00'),
 UNIX_TIMESTAMP('2026-08-20 09:15:00'),
 UNIX_TIMESTAMP('2025-08-20 08:00:00'),
 UNIX_TIMESTAMP('2026-08-20 09:15:00')),

(2, 'gv_tranbinh', 'GV002',
 'Trần Bình', 'Trần',
 'tranbinh@dlu.edu.vn',
 0, 0,
 UNIX_TIMESTAMP('2025-08-20 08:00:00'),
 UNIX_TIMESTAMP('2026-08-21 14:30:00'),
 UNIX_TIMESTAMP('2025-08-20 08:00:00'),
 UNIX_TIMESTAMP('2026-08-21 14:30:00')),

-- =========================
-- SINH VIÊN
-- =========================

(101, 'sv2310001', '2310001',
 'Nguyễn Văn', 'An',
 '2310001@dlu.edu.vn',
 0, 0,
 UNIX_TIMESTAMP('2025-09-01 08:00:00'),
 UNIX_TIMESTAMP('2026-08-21 08:30:00'),
 UNIX_TIMESTAMP('2025-09-01 08:00:00'),
 UNIX_TIMESTAMP('2026-08-21 08:30:00')),

(102, 'sv2310002', '2310002',
 'Trần Thị', 'Bình',
 '2310002@dlu.edu.vn',
 0, 0,
 UNIX_TIMESTAMP('2025-09-01 08:00:00'),
 UNIX_TIMESTAMP('2026-08-20 10:20:00'),
 UNIX_TIMESTAMP('2025-09-01 08:00:00'),
 UNIX_TIMESTAMP('2026-08-20 10:20:00')),

(103, 'sv2310003', '2310003',
 'Lê Minh', 'Châu',
 '2310003@dlu.edu.vn',
 0, 0,
 UNIX_TIMESTAMP('2025-09-01 08:00:00'),
 UNIX_TIMESTAMP('2026-08-21 13:10:00'),
 UNIX_TIMESTAMP('2025-09-01 08:00:00'),
 UNIX_TIMESTAMP('2026-08-21 13:10:00')),

(104, 'sv2310004', '2310004',
 'Phạm Quốc', 'Dũng',
 '2310004@dlu.edu.vn',
 0, 0,
 UNIX_TIMESTAMP('2025-09-01 08:00:00'),
 UNIX_TIMESTAMP('2026-08-18 15:00:00'),
 UNIX_TIMESTAMP('2025-09-01 08:00:00'),
 UNIX_TIMESTAMP('2026-08-18 15:00:00')),

(105, 'sv2310005', '2310005',
 'Hoàng Thị', 'Giang',
 '2310005@dlu.edu.vn',
 0, 0,
 UNIX_TIMESTAMP('2025-09-01 08:00:00'),
 UNIX_TIMESTAMP('2026-08-21 16:00:00'),
 UNIX_TIMESTAMP('2025-09-01 08:00:00'),
 UNIX_TIMESTAMP('2026-08-21 16:00:00')),

(106, 'sv2310006', '2310006',
 'Võ Minh', 'Hải',
 '2310006@dlu.edu.vn',
 0, 0,
 UNIX_TIMESTAMP('2025-09-01 08:00:00'),
 UNIX_TIMESTAMP('2026-08-17 09:30:00'),
 UNIX_TIMESTAMP('2025-09-01 08:00:00'),
 UNIX_TIMESTAMP('2026-08-17 09:30:00')),

(107, 'sv2310007', '2310007',
 'Đặng Ngọc', 'Lan',
 '2310007@dlu.edu.vn',
 0, 0,
 UNIX_TIMESTAMP('2025-09-01 08:00:00'),
 UNIX_TIMESTAMP('2026-08-21 11:45:00'),
 UNIX_TIMESTAMP('2025-09-01 08:00:00'),
 UNIX_TIMESTAMP('2026-08-21 11:45:00')),

(108, 'sv2310008', '2310008',
 'Nguyễn Hoàng', 'Minh',
 '2310008@dlu.edu.vn',
 0, 0,
 UNIX_TIMESTAMP('2025-09-01 08:00:00'),
 UNIX_TIMESTAMP('2026-08-19 14:20:00'),
 UNIX_TIMESTAMP('2025-09-01 08:00:00'),
 UNIX_TIMESTAMP('2026-08-19 14:20:00')),

(109, 'sv2310009', '2310009',
 'Trần Quốc', 'Nam',
 '2310009@dlu.edu.vn',
 0, 0,
 UNIX_TIMESTAMP('2025-09-01 08:00:00'),
 UNIX_TIMESTAMP('2026-08-21 09:00:00'),
 UNIX_TIMESTAMP('2025-09-01 08:00:00'),
 UNIX_TIMESTAMP('2026-08-21 09:00:00')),

(110, 'sv2310010', '2310010',
 'Phan Thị', 'Oanh',
 '2310010@dlu.edu.vn',
 0, 0,
 UNIX_TIMESTAMP('2025-09-01 08:00:00'),
 UNIX_TIMESTAMP('2026-08-16 10:00:00'),
 UNIX_TIMESTAMP('2025-09-01 08:00:00'),
 UNIX_TIMESTAMP('2026-08-16 10:00:00')),

(111, 'sv2310011', '2310011',
 'Vũ Anh', 'Phúc',
 '2310011@dlu.edu.vn',
 0, 0,
 UNIX_TIMESTAMP('2025-09-01 08:00:00'),
 UNIX_TIMESTAMP('2026-08-20 16:15:00'),
 UNIX_TIMESTAMP('2025-09-01 08:00:00'),
 UNIX_TIMESTAMP('2026-08-20 16:15:00')),

(112, 'sv2310012', '2310012',
 'Lê Thảo', 'Vy',
 '2310012@dlu.edu.vn',
 0, 0,
 UNIX_TIMESTAMP('2025-09-01 08:00:00'),
 UNIX_TIMESTAMP('2026-08-21 17:00:00'),
 UNIX_TIMESTAMP('2025-09-01 08:00:00'),
 UNIX_TIMESTAMP('2026-08-21 17:00:00'));


-- ============================================================
-- 4. COURSES
-- ============================================================

INSERT INTO mdl_course
(id, category, fullname, shortname, idnumber, summary,
 startdate, enddate, visible)
VALUES

(101,
 3,
 'Cơ sở dữ liệu',
 'CS301',
 'CS301',
 'Học phần cơ sở dữ liệu và hệ quản trị cơ sở dữ liệu.',
 UNIX_TIMESTAMP('2026-01-05 00:00:00'),
 UNIX_TIMESTAMP('2026-05-30 23:59:59'),
 1),

(102,
 3,
 'Lập trình Web',
 'WEB302',
 'WEB302',
 'Học phần phát triển ứng dụng Web.',
 UNIX_TIMESTAMP('2026-01-05 00:00:00'),
 UNIX_TIMESTAMP('2026-05-30 23:59:59'),
 1),

(103,
 4,
 'Phát triển ứng dụng Game nâng cao',
 'GAME401',
 'GAME401',
 'Phát triển game nâng cao với công cụ Unity.',
 UNIX_TIMESTAMP('2026-01-05 00:00:00'),
 UNIX_TIMESTAMP('2026-05-30 23:59:59'),
 1),

(104,
 4,
 'Trí tuệ nhân tạo',
 'AI401',
 'AI401',
 'Các khái niệm và kỹ thuật cơ bản của trí tuệ nhân tạo.',
 UNIX_TIMESTAMP('2026-01-05 00:00:00'),
 UNIX_TIMESTAMP('2026-05-30 23:59:59'),
 1);


-- ============================================================
-- 5. ROLES
-- ============================================================

INSERT INTO mdl_role
(id, name, shortname, description, archetype)
VALUES

(3,
 'Giảng viên',
 'teacher',
 'Giảng viên phụ trách khóa học.',
 'teacher'),

(4,
 'Giảng viên chỉnh sửa',
 'editingteacher',
 'Giảng viên có quyền quản lý và chỉnh sửa khóa học.',
 'editingteacher'),

(5,
 'Sinh viên',
 'student',
 'Người học trong khóa học.',
 'student');


-- ============================================================
-- 6. ENROL
-- Mỗi course có một phương thức ghi danh
-- ============================================================

INSERT INTO mdl_enrol
(id, enrol, status, courseid, sortorder,
 enrolstartdate, enrolenddate)
VALUES

(1001, 'manual', 0, 101, 1,
 UNIX_TIMESTAMP('2026-01-01 00:00:00'),
 UNIX_TIMESTAMP('2026-06-30 23:59:59')),

(1002, 'manual', 0, 102, 1,
 UNIX_TIMESTAMP('2026-01-01 00:00:00'),
 UNIX_TIMESTAMP('2026-06-30 23:59:59')),

(1003, 'manual', 0, 103, 1,
 UNIX_TIMESTAMP('2026-01-01 00:00:00'),
 UNIX_TIMESTAMP('2026-06-30 23:59:59')),

(1004, 'manual', 0, 104, 1,
 UNIX_TIMESTAMP('2026-01-01 00:00:00'),
 UNIX_TIMESTAMP('2026-06-30 23:59:59'));


-- ============================================================
-- 7. CONTEXT
-- contextlevel = 50: COURSE
-- ============================================================

INSERT INTO mdl_context
(id, contextlevel, instanceid, path, depth)
VALUES

(501, 50, 101, '/1/501', 2),
(502, 50, 102, '/1/502', 2),
(503, 50, 103, '/1/503', 2),
(504, 50, 104, '/1/504', 2);


-- ============================================================
-- 8. ROLE ASSIGNMENTS
-- GIẢNG VIÊN
-- ============================================================

INSERT INTO mdl_role_assignments
(id, roleid, contextid, userid, timemodified)
VALUES

-- Nguyễn An phụ trách Cơ sở dữ liệu
(1, 3, 501, 1, UNIX_TIMESTAMP('2026-01-05 08:00:00')),

-- Nguyễn An phụ trách Lập trình Web
(2, 3, 502, 1, UNIX_TIMESTAMP('2026-01-05 08:00:00')),

-- Trần Bình phụ trách Game
(3, 3, 503, 2, UNIX_TIMESTAMP('2026-01-05 08:00:00')),

-- Trần Bình phụ trách AI
(4, 3, 504, 2, UNIX_TIMESTAMP('2026-01-05 08:00:00'));


-- ============================================================
-- 9. ROLE ASSIGNMENTS
-- SINH VIÊN
-- ============================================================

INSERT INTO mdl_role_assignments
(id, roleid, contextid, userid, timemodified)
VALUES

-- Course 101 - Cơ sở dữ liệu
(101, 5, 501, 101, UNIX_TIMESTAMP('2026-01-05')),
(102, 5, 501, 102, UNIX_TIMESTAMP('2026-01-05')),
(103, 5, 501, 103, UNIX_TIMESTAMP('2026-01-05')),
(104, 5, 501, 104, UNIX_TIMESTAMP('2026-01-05')),
(105, 5, 501, 105, UNIX_TIMESTAMP('2026-01-05')),
(106, 5, 501, 106, UNIX_TIMESTAMP('2026-01-05')),

-- Course 102 - Lập trình Web
(107, 5, 502, 101, UNIX_TIMESTAMP('2026-01-05')),
(108, 5, 502, 102, UNIX_TIMESTAMP('2026-01-05')),
(109, 5, 502, 103, UNIX_TIMESTAMP('2026-01-05')),
(110, 5, 502, 107, UNIX_TIMESTAMP('2026-01-05')),
(111, 5, 502, 108, UNIX_TIMESTAMP('2026-01-05')),
(112, 5, 502, 109, UNIX_TIMESTAMP('2026-01-05')),

-- Course 103 - Game
(113, 5, 503, 103, UNIX_TIMESTAMP('2026-01-05')),
(114, 5, 503, 104, UNIX_TIMESTAMP('2026-01-05')),
(115, 5, 503, 105, UNIX_TIMESTAMP('2026-01-05')),
(116, 5, 503, 107, UNIX_TIMESTAMP('2026-01-05')),
(117, 5, 503, 110, UNIX_TIMESTAMP('2026-01-05')),
(118, 5, 503, 111, UNIX_TIMESTAMP('2026-01-05')),

-- Course 104 - AI
(119, 5, 504, 101, UNIX_TIMESTAMP('2026-01-05')),
(120, 5, 504, 106, UNIX_TIMESTAMP('2026-01-05')),
(121, 5, 504, 108, UNIX_TIMESTAMP('2026-01-05')),
(122, 5, 504, 109, UNIX_TIMESTAMP('2026-01-05')),
(123, 5, 504, 111, UNIX_TIMESTAMP('2026-01-05')),
(124, 5, 504, 112, UNIX_TIMESTAMP('2026-01-05'));


-- ============================================================
-- 10. USER ENROLMENTS
-- ============================================================

INSERT INTO mdl_user_enrolments
(id, enrolid, userid, timestart, timeend,
 modifierid, timecreated, timemodified)
VALUES

-- ============================================================
-- COURSE 101 - CƠ SỞ DỮ LIỆU
-- ============================================================

(10001, 1001, 101,
 UNIX_TIMESTAMP('2026-01-05'), 0, 1,
 UNIX_TIMESTAMP('2026-01-05'), UNIX_TIMESTAMP('2026-01-05')),

(10002, 1001, 102,
 UNIX_TIMESTAMP('2026-01-05'), 0, 1,
 UNIX_TIMESTAMP('2026-01-05'), UNIX_TIMESTAMP('2026-01-05')),

(10003, 1001, 103,
 UNIX_TIMESTAMP('2026-01-05'), 0, 1,
 UNIX_TIMESTAMP('2026-01-05'), UNIX_TIMESTAMP('2026-01-05')),

(10004, 1001, 104,
 UNIX_TIMESTAMP('2026-01-05'), 0, 1,
 UNIX_TIMESTAMP('2026-01-05'), UNIX_TIMESTAMP('2026-01-05')),

(10005, 1001, 105,
 UNIX_TIMESTAMP('2026-01-05'), 0, 1,
 UNIX_TIMESTAMP('2026-01-05'), UNIX_TIMESTAMP('2026-01-05')),

(10006, 1001, 106,
 UNIX_TIMESTAMP('2026-01-05'), 0, 1,
 UNIX_TIMESTAMP('2026-01-05'), UNIX_TIMESTAMP('2026-01-05')),

-- ============================================================
-- COURSE 102 - LẬP TRÌNH WEB
-- ============================================================

(10007, 1002, 101,
 UNIX_TIMESTAMP('2026-01-05'), 0, 1,
 UNIX_TIMESTAMP('2026-01-05'), UNIX_TIMESTAMP('2026-01-05')),

(10008, 1002, 102,
 UNIX_TIMESTAMP('2026-01-05'), 0, 1,
 UNIX_TIMESTAMP('2026-01-05'), UNIX_TIMESTAMP('2026-01-05')),

(10009, 1002, 103,
 UNIX_TIMESTAMP('2026-01-05'), 0, 1,
 UNIX_TIMESTAMP('2026-01-05'), UNIX_TIMESTAMP('2026-01-05')),

(10010, 1002, 107,
 UNIX_TIMESTAMP('2026-01-05'), 0, 1,
 UNIX_TIMESTAMP('2026-01-05'), UNIX_TIMESTAMP('2026-01-05')),

(10011, 1002, 108,
 UNIX_TIMESTAMP('2026-01-05'), 0, 1,
 UNIX_TIMESTAMP('2026-01-05'), UNIX_TIMESTAMP('2026-01-05')),

(10012, 1002, 109,
 UNIX_TIMESTAMP('2026-01-05'), 0, 1,
 UNIX_TIMESTAMP('2026-01-05'), UNIX_TIMESTAMP('2026-01-05')),

-- ============================================================
-- COURSE 103 - GAME
-- ============================================================

(10013, 1003, 103,
 UNIX_TIMESTAMP('2026-01-05'), 0, 2,
 UNIX_TIMESTAMP('2026-01-05'), UNIX_TIMESTAMP('2026-01-05')),

(10014, 1003, 104,
 UNIX_TIMESTAMP('2026-01-05'), 0, 2,
 UNIX_TIMESTAMP('2026-01-05'), UNIX_TIMESTAMP('2026-01-05')),

(10015, 1003, 105,
 UNIX_TIMESTAMP('2026-01-05'), 0, 2,
 UNIX_TIMESTAMP('2026-01-05'), UNIX_TIMESTAMP('2026-01-05')),

(10016, 1003, 107,
 UNIX_TIMESTAMP('2026-01-05'), 0, 2,
 UNIX_TIMESTAMP('2026-01-05'), UNIX_TIMESTAMP('2026-01-05')),

(10017, 1003, 110,
 UNIX_TIMESTAMP('2026-01-05'), 0, 2,
 UNIX_TIMESTAMP('2026-01-05'), UNIX_TIMESTAMP('2026-01-05')),

(10018, 1003, 111,
 UNIX_TIMESTAMP('2026-01-05'), 0, 2,
 UNIX_TIMESTAMP('2026-01-05'), UNIX_TIMESTAMP('2026-01-05')),

-- ============================================================
-- COURSE 104 - AI
-- ============================================================

(10019, 1004, 101,
 UNIX_TIMESTAMP('2026-01-05'), 0, 2,
 UNIX_TIMESTAMP('2026-01-05'), UNIX_TIMESTAMP('2026-01-05')),

(10020, 1004, 106,
 UNIX_TIMESTAMP('2026-01-05'), 0, 2,
 UNIX_TIMESTAMP('2026-01-05'), UNIX_TIMESTAMP('2026-01-05')),

(10021, 1004, 108,
 UNIX_TIMESTAMP('2026-01-05'), 0, 2,
 UNIX_TIMESTAMP('2026-01-05'), UNIX_TIMESTAMP('2026-01-05')),

(10022, 1004, 109,
 UNIX_TIMESTAMP('2026-01-05'), 0, 2,
 UNIX_TIMESTAMP('2026-01-05'), UNIX_TIMESTAMP('2026-01-05')),

(10023, 1004, 111,
 UNIX_TIMESTAMP('2026-01-05'), 0, 2,
 UNIX_TIMESTAMP('2026-01-05'), UNIX_TIMESTAMP('2026-01-05')),

(10024, 1004, 112,
 UNIX_TIMESTAMP('2026-01-05'), 0, 2,
 UNIX_TIMESTAMP('2026-01-05'), UNIX_TIMESTAMP('2026-01-05'));


-- ============================================================
-- 11. KIỂM TRA DỮ LIỆU
-- ============================================================

SELECT 'USERS' AS Data_Type, COUNT(*) AS Total
FROM mdl_user

UNION ALL

SELECT 'COURSE_CATEGORIES', COUNT(*)
FROM mdl_course_categories

UNION ALL

SELECT 'COURSES', COUNT(*)
FROM mdl_course

UNION ALL

SELECT 'ROLES', COUNT(*)
FROM mdl_role

UNION ALL

SELECT 'ENROL', COUNT(*)
FROM mdl_enrol

UNION ALL

SELECT 'USER_ENROLMENTS', COUNT(*)
FROM mdl_user_enrolments

UNION ALL

SELECT 'CONTEXT', COUNT(*)
FROM mdl_context

UNION ALL

SELECT 'ROLE_ASSIGNMENTS', COUNT(*)
FROM mdl_role_assignments;


-- ============================================================
-- 12. KIỂM TRA QUAN HỆ
-- ============================================================

SELECT
    c.id AS Course_ID,
    c.fullname AS Course_Name,
    u.id AS User_ID,
    CONCAT(u.firstname, ' ', u.lastname) AS Student_Name,
    r.shortname AS Role_Name
FROM mdl_role_assignments ra
JOIN mdl_context ctx
    ON ra.contextid = ctx.id
JOIN mdl_course c
    ON ctx.instanceid = c.id
JOIN mdl_user u
    ON ra.userid = u.id
JOIN mdl_role r
    ON ra.roleid = r.id
WHERE ctx.contextlevel = 50
ORDER BY c.id, r.id, u.id;


-- ============================================================
-- 13. KIỂM TRA GHI DANH
-- ============================================================

SELECT
    c.id AS Course_ID,
    c.fullname AS Course_Name,
    COUNT(ue.userid) AS Total_Students
FROM mdl_course c
JOIN mdl_enrol e
    ON e.courseid = c.id
JOIN mdl_user_enrolments ue
    ON ue.enrolid = e.id
GROUP BY c.id, c.fullname
ORDER BY c.id;