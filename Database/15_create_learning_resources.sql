-- ============================================================
-- 15_create_learning_resources.sql
-- BỔ SUNG HỌC LIỆU MẪU CHO MOODLE SOURCE
-- (Resource, Page, URL)
-- ============================================================

USE lms_moodle_source;

SET SQL_SAFE_UPDATES = 0;


-- ============================================================
-- 1. TẠO CÁC BẢNG HỌC LIỆU NẾU CHƯA TỒN TẠI
-- ============================================================

CREATE TABLE IF NOT EXISTS mdl_resource (
    id BIGINT PRIMARY KEY,
    course BIGINT NOT NULL,
    name VARCHAR(255) NOT NULL,
    intro TEXT,
    introformat SMALLINT NOT NULL DEFAULT 0,
    tobemigrated SMALLINT NOT NULL DEFAULT 0,
    legacyfiles SMALLINT NOT NULL DEFAULT 0,
    legacyfileslast BIGINT NULL,
    display SMALLINT NOT NULL DEFAULT 0,
    displayoptions TEXT NULL,
    filterfiles SMALLINT NOT NULL DEFAULT 0,
    revision BIGINT NOT NULL DEFAULT 1,
    timemodified BIGINT NOT NULL DEFAULT 0,

    CONSTRAINT fk_source_resource_course
        FOREIGN KEY (course)
        REFERENCES mdl_course(id)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS mdl_page (
    id BIGINT PRIMARY KEY,
    course BIGINT NOT NULL,
    name VARCHAR(255) NOT NULL,
    intro TEXT,
    introformat SMALLINT NOT NULL DEFAULT 0,
    content LONGTEXT,
    contentformat SMALLINT NOT NULL DEFAULT 0,
    legacyfiles SMALLINT NOT NULL DEFAULT 0,
    legacyfileslast BIGINT NULL,
    display SMALLINT NOT NULL DEFAULT 0,
    displayoptions TEXT NULL,
    revision BIGINT NOT NULL DEFAULT 1,
    timemodified BIGINT NOT NULL DEFAULT 0,

    CONSTRAINT fk_source_page_course
        FOREIGN KEY (course)
        REFERENCES mdl_course(id)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS mdl_url (
    id BIGINT PRIMARY KEY,
    course BIGINT NOT NULL,
    name VARCHAR(255) NOT NULL,
    intro TEXT,
    introformat SMALLINT NOT NULL DEFAULT 0,
    externalurl TEXT,
    display SMALLINT NOT NULL DEFAULT 0,
    displayoptions TEXT NULL,
    parameters TEXT NULL,
    timemodified BIGINT NOT NULL DEFAULT 0,

    CONSTRAINT fk_source_url_course
        FOREIGN KEY (course)
        REFERENCES mdl_course(id)
) ENGINE=InnoDB;


-- ============================================================
-- 2. BỔ SUNG MODULE TYPES
-- 1 = assign, 2 = quiz, 3 = resource, 4 = page, 5 = url
-- ============================================================

INSERT INTO mdl_modules (id, name)
VALUES
(3, 'resource'),
(4, 'page'),
(5, 'url')
ON DUPLICATE KEY UPDATE name = VALUES(name);


-- ============================================================
-- 3. SEED RESOURCES (TÀI LIỆU / SLIDE)
-- ============================================================

INSERT INTO mdl_resource
(id, course, name, intro, introformat, tobemigrated, legacyfiles, legacyfileslast, display, displayoptions, filterfiles, revision, timemodified)
VALUES
-- Course 101: Cơ sở dữ liệu
(1001, 101, 'Slide Chương 1 - Tổng quan cơ sở dữ liệu',
 'Slide giới thiệu những khái niệm cơ bản về cơ sở dữ liệu.', 0, 0, 0, NULL, 0, NULL, 0, 1, UNIX_TIMESTAMP('2026-01-05 08:00:00')),

(1002, 101, 'Tài liệu SQL cơ bản',
 'Tài liệu hướng dẫn các câu lệnh SQL cơ bản.', 0, 0, 0, NULL, 0, NULL, 0, 1, UNIX_TIMESTAMP('2026-01-07 08:00:00')),

-- Course 102: Lập trình Web
(1003, 102, 'Slide HTML CSS cơ bản',
 'Slide giới thiệu HTML5 và CSS.', 0, 0, 0, NULL, 0, NULL, 0, 1, UNIX_TIMESTAMP('2026-02-10 08:00:00')),

(1004, 102, 'Tài liệu REST API',
 'Tài liệu giới thiệu REST API và HTTP methods.', 0, 0, 0, NULL, 0, NULL, 0, 1, UNIX_TIMESTAMP('2026-03-30 08:00:00'))

ON DUPLICATE KEY UPDATE
    name = VALUES(name),
    intro = VALUES(intro),
    timemodified = VALUES(timemodified);


-- ============================================================
-- 4. SEED PAGES (TRANG HƯỚNG DẪN NỘI BỘ)
-- ============================================================

INSERT INTO mdl_page
(id, course, name, intro, introformat, content, contentformat, legacyfiles, legacyfileslast, display, displayoptions, revision, timemodified)
VALUES
-- Course 101: Cơ sở dữ liệu
(2001, 101, 'Hướng dẫn thực hành SQL',
 'Trang hướng dẫn sinh viên chuẩn bị thực hành SQL.', 0,
 '<h2>Thực hành SQL</h2><p>Sinh viên đọc tài liệu SQL trước khi thực hành.</p>', 0, 0, NULL, 0, NULL, 1, UNIX_TIMESTAMP('2026-01-10 08:00:00')),

-- Course 102: Lập trình Web
(2002, 102, 'Hướng dẫn xây dựng REST API',
 'Trang hướng dẫn từng bước xây dựng REST API.', 0,
 '<h2>REST API</h2><p>Hướng dẫn xây dựng API theo kiến trúc REST.</p>', 0, 0, NULL, 0, NULL, 1, UNIX_TIMESTAMP('2026-04-01 08:00:00'))

ON DUPLICATE KEY UPDATE
    name = VALUES(name),
    intro = VALUES(intro),
    content = VALUES(content),
    timemodified = VALUES(timemodified);


-- ============================================================
-- 5. SEED URLS (LIÊN KẾT NGOÀI / VIDEO)
-- ============================================================

INSERT INTO mdl_url
(id, course, name, intro, introformat, externalurl, display, displayoptions, parameters, timemodified)
VALUES
-- Course 101: Cơ sở dữ liệu
(3001, 101, 'Video hướng dẫn SQL JOIN',
 'Video hỗ trợ sinh viên học các loại JOIN trong SQL.', 0,
 'https://example.com/sql-join', 0, NULL, NULL, UNIX_TIMESTAMP('2026-01-12 08:00:00')),

-- Course 102: Lập trình Web
(3002, 102, 'Video hướng dẫn REST API',
 'Video minh họa quá trình xây dựng REST API.', 0,
 'https://example.com/rest-api', 0, NULL, NULL, UNIX_TIMESTAMP('2026-04-02 08:00:00'))

ON DUPLICATE KEY UPDATE
    name = VALUES(name),
    intro = VALUES(intro),
    externalurl = VALUES(externalurl),
    timemodified = VALUES(timemodified);


-- ============================================================
-- 6. GẮN HỌC LIỆU VÀO KHÓA HỌC (COURSE MODULES)
-- ============================================================

INSERT INTO mdl_course_modules
(id, course, module, instance, visible)
VALUES
-- Course 101: Cơ sở dữ liệu
(10001, 101, 3, 1001, 1),
(10002, 101, 3, 1002, 1),
(10003, 101, 4, 2001, 1),
(10004, 101, 5, 3001, 1),

-- Course 102: Lập trình Web
(10005, 102, 3, 1003, 1),
(10006, 102, 3, 1004, 1),
(10007, 102, 4, 2002, 1),
(10008, 102, 5, 3002, 1)

ON DUPLICATE KEY UPDATE
    course = VALUES(course),
    module = VALUES(module),
    instance = VALUES(instance),
    visible = VALUES(visible);


-- ============================================================
-- KIỂM TRA
-- ============================================================

SELECT
    cm.id AS Course_Module_ID,
    cm.course AS Moodle_Course_ID,
    m.name AS Module_Type,
    cm.instance AS Module_Instance_ID,
    cm.visible
FROM mdl_course_modules cm
INNER JOIN mdl_modules m ON m.id = cm.module
WHERE cm.id BETWEEN 10001 AND 10008
ORDER BY cm.course, cm.id;