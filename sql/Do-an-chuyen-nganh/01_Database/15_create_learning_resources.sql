-- ============================================================
-- 15_create_learning_resources.sql
-- BỔ SUNG HỌC LIỆU MẪU CHO MOODLE SOURCE
--
-- NGUYÊN TẮC:
-- - KHÔNG DELETE
-- - KHÔNG DROP
-- - KHÔNG TRUNCATE
-- - KHÔNG GHI ĐÈ DỮ LIỆU CŨ
-- - CHỈ INSERT KHI CHƯA TỒN TẠI
-- ============================================================

USE lms_moodle_source;


-- ============================================================
-- 1. MODULE TYPES
--
-- Hiện tại:
-- 1 = assign
-- 2 = quiz
--
-- Bổ sung:
-- 3 = resource
-- 4 = page
-- 5 = url
-- ============================================================

INSERT INTO mdl_modules (
    id,
    name,
    visible
)
SELECT
    3,
    'resource',
    1
WHERE NOT EXISTS (
    SELECT 1
    FROM mdl_modules
    WHERE id = 3
       OR name = 'resource'
);


INSERT INTO mdl_modules (
    id,
    name,
    visible
)
SELECT
    4,
    'page',
    1
WHERE NOT EXISTS (
    SELECT 1
    FROM mdl_modules
    WHERE id = 4
       OR name = 'page'
);


INSERT INTO mdl_modules (
    id,
    name,
    visible
)
SELECT
    5,
    'url',
    1
WHERE NOT EXISTS (
    SELECT 1
    FROM mdl_modules
    WHERE id = 5
       OR name = 'url'
);


-- ============================================================
-- 2. RESOURCE - CS301
-- ============================================================

INSERT INTO mdl_resource (
    id,
    course,
    name,
    intro,
    introformat,
    tobemigrated,
    legacyfiles,
    legacyfileslast,
    display,
    displayoptions,
    filterfiles,
    revision,
    timemodified
)
SELECT
    1001,
    101,
    'Slide Chương 1 - Tổng quan cơ sở dữ liệu',
    'Slide giới thiệu những khái niệm cơ bản về cơ sở dữ liệu.',
    0,
    0,
    0,
    NULL,
    0,
    NULL,
    0,
    1,
    UNIX_TIMESTAMP('2026-01-05 08:00:00')
WHERE NOT EXISTS (
    SELECT 1
    FROM mdl_resource
    WHERE id = 1001
);


INSERT INTO mdl_resource (
    id,
    course,
    name,
    intro,
    introformat,
    tobemigrated,
    legacyfiles,
    legacyfileslast,
    display,
    displayoptions,
    filterfiles,
    revision,
    timemodified
)
SELECT
    1002,
    101,
    'Tài liệu SQL cơ bản',
    'Tài liệu hướng dẫn các câu lệnh SQL cơ bản.',
    0,
    0,
    0,
    NULL,
    0,
    NULL,
    0,
    1,
    UNIX_TIMESTAMP('2026-01-07 08:00:00')
WHERE NOT EXISTS (
    SELECT 1
    FROM mdl_resource
    WHERE id = 1002
);


-- ============================================================
-- 3. RESOURCE - WEB302
-- ============================================================

INSERT INTO mdl_resource (
    id,
    course,
    name,
    intro,
    introformat,
    tobemigrated,
    legacyfiles,
    legacyfileslast,
    display,
    displayoptions,
    filterfiles,
    revision,
    timemodified
)
SELECT
    1003,
    102,
    'Slide HTML CSS cơ bản',
    'Slide giới thiệu HTML5 và CSS.',
    0,
    0,
    0,
    NULL,
    0,
    NULL,
    0,
    1,
    UNIX_TIMESTAMP('2026-02-10 08:00:00')
WHERE NOT EXISTS (
    SELECT 1
    FROM mdl_resource
    WHERE id = 1003
);


INSERT INTO mdl_resource (
    id,
    course,
    name,
    intro,
    introformat,
    tobemigrated,
    legacyfiles,
    legacyfileslast,
    display,
    displayoptions,
    filterfiles,
    revision,
    timemodified
)
SELECT
    1004,
    102,
    'Tài liệu REST API',
    'Tài liệu giới thiệu REST API và HTTP methods.',
    0,
    0,
    0,
    NULL,
    0,
    NULL,
    0,
    1,
    UNIX_TIMESTAMP('2026-03-30 08:00:00')
WHERE NOT EXISTS (
    SELECT 1
    FROM mdl_resource
    WHERE id = 1004
);


-- ============================================================
-- 4. PAGE - CS301
-- ============================================================

INSERT INTO mdl_page (
    id,
    course,
    name,
    intro,
    introformat,
    content,
    contentformat,
    legacyfiles,
    legacyfileslast,
    display,
    displayoptions,
    revision,
    timemodified
)
SELECT
    2001,
    101,
    'Hướng dẫn thực hành SQL',
    'Trang hướng dẫn sinh viên chuẩn bị thực hành SQL.',
    0,
    '<h2>Thực hành SQL</h2><p>Sinh viên đọc tài liệu SQL trước khi thực hành.</p>',
    0,
    0,
    NULL,
    0,
    NULL,
    1,
    UNIX_TIMESTAMP('2026-01-10 08:00:00')
WHERE NOT EXISTS (
    SELECT 1
    FROM mdl_page
    WHERE id = 2001
);


-- ============================================================
-- 5. PAGE - WEB302
-- ============================================================

INSERT INTO mdl_page (
    id,
    course,
    name,
    intro,
    introformat,
    content,
    contentformat,
    legacyfiles,
    legacyfileslast,
    display,
    displayoptions,
    revision,
    timemodified
)
SELECT
    2002,
    102,
    'Hướng dẫn xây dựng REST API',
    'Trang hướng dẫn từng bước xây dựng REST API.',
    0,
    '<h2>REST API</h2><p>Hướng dẫn xây dựng API theo kiến trúc REST.</p>',
    0,
    0,
    NULL,
    0,
    NULL,
    1,
    UNIX_TIMESTAMP('2026-04-01 08:00:00')
WHERE NOT EXISTS (
    SELECT 1
    FROM mdl_page
    WHERE id = 2002
);


-- ============================================================
-- 6. URL - CS301
-- ============================================================

INSERT INTO mdl_url (
    id,
    course,
    name,
    intro,
    introformat,
    externalurl,
    display,
    displayoptions,
    parameters,
    timemodified
)
SELECT
    3001,
    101,
    'Video hướng dẫn SQL JOIN',
    'Video hỗ trợ sinh viên học các loại JOIN trong SQL.',
    0,
    'https://example.com/sql-join',
    0,
    NULL,
    NULL,
    UNIX_TIMESTAMP('2026-01-12 08:00:00')
WHERE NOT EXISTS (
    SELECT 1
    FROM mdl_url
    WHERE id = 3001
);


-- ============================================================
-- 7. URL - WEB302
-- ============================================================

INSERT INTO mdl_url (
    id,
    course,
    name,
    intro,
    introformat,
    externalurl,
    display,
    displayoptions,
    parameters,
    timemodified
)
SELECT
    3002,
    102,
    'Video hướng dẫn REST API',
    'Video minh họa quá trình xây dựng REST API.',
    0,
    'https://example.com/rest-api',
    0,
    NULL,
    NULL,
    UNIX_TIMESTAMP('2026-04-02 08:00:00')
WHERE NOT EXISTS (
    SELECT 1
    FROM mdl_url
    WHERE id = 3002
);


-- ============================================================
-- 8. COURSE MODULES - CS301
-- ============================================================

INSERT INTO mdl_course_modules (
    id,
    course,
    module,
    instance,
    visible
)
SELECT
    10001,
    101,
    3,
    1001,
    1
WHERE NOT EXISTS (
    SELECT 1
    FROM mdl_course_modules
    WHERE id = 10001
);


INSERT INTO mdl_course_modules (
    id,
    course,
    module,
    instance,
    visible
)
SELECT
    10002,
    101,
    3,
    1002,
    1
WHERE NOT EXISTS (
    SELECT 1
    FROM mdl_course_modules
    WHERE id = 10002
);


INSERT INTO mdl_course_modules (
    id,
    course,
    module,
    instance,
    visible
)
SELECT
    10003,
    101,
    4,
    2001,
    1
WHERE NOT EXISTS (
    SELECT 1
    FROM mdl_course_modules
    WHERE id = 10003
);


INSERT INTO mdl_course_modules (
    id,
    course,
    module,
    instance,
    visible
)
SELECT
    10004,
    101,
    5,
    3001,
    1
WHERE NOT EXISTS (
    SELECT 1
    FROM mdl_course_modules
    WHERE id = 10004
);


-- ============================================================
-- 9. COURSE MODULES - WEB302
-- ============================================================

INSERT INTO mdl_course_modules (
    id,
    course,
    module,
    instance,
    visible
)
SELECT
    10005,
    102,
    3,
    1003,
    1
WHERE NOT EXISTS (
    SELECT 1
    FROM mdl_course_modules
    WHERE id = 10005
);


INSERT INTO mdl_course_modules (
    id,
    course,
    module,
    instance,
    visible
)
SELECT
    10006,
    102,
    3,
    1004,
    1
WHERE NOT EXISTS (
    SELECT 1
    FROM mdl_course_modules
    WHERE id = 10006
);


INSERT INTO mdl_course_modules (
    id,
    course,
    module,
    instance,
    visible
)
SELECT
    10007,
    102,
    4,
    2002,
    1
WHERE NOT EXISTS (
    SELECT 1
    FROM mdl_course_modules
    WHERE id = 10007
);


INSERT INTO mdl_course_modules (
    id,
    course,
    module,
    instance,
    visible
)
SELECT
    10008,
    102,
    5,
    3002,
    1
WHERE NOT EXISTS (
    SELECT 1
    FROM mdl_course_modules
    WHERE id = 10008
);


-- ============================================================
-- 10. KIỂM TRA MODULE TYPES
-- ============================================================

SELECT
    id,
    name,
    visible
FROM mdl_modules
ORDER BY id;


-- ============================================================
-- 11. KIỂM TRA RESOURCE
-- ============================================================

SELECT
    id,
    course,
    name
FROM mdl_resource

WHERE id IN (
    1001,
    1002,
    1003,
    1004
)

ORDER BY
    course,
    id;


-- ============================================================
-- 12. KIỂM TRA PAGE
-- ============================================================

SELECT
    id,
    course,
    name
FROM mdl_page

WHERE id IN (
    2001,
    2002
)

ORDER BY
    course,
    id;


-- ============================================================
-- 13. KIỂM TRA URL
-- ============================================================

SELECT
    id,
    course,
    name,
    externalurl
FROM mdl_url

WHERE id IN (
    3001,
    3002
)

ORDER BY
    course,
    id;


-- ============================================================
-- 14. KIỂM TRA COURSE MODULES
-- ============================================================

SELECT
    cm.id AS Course_Module_ID,
    cm.course AS Moodle_Course_ID,
    m.name AS Module_Type,
    cm.instance AS Module_Instance_ID,
    cm.visible

FROM mdl_course_modules cm

INNER JOIN mdl_modules m
    ON m.id = cm.module

WHERE cm.id BETWEEN 10001 AND 10008

ORDER BY
    cm.course,
    cm.id;