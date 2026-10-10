-- ============================================
-- GRADE SIMULATOR - ADD ONLY
-- Database: lms_moodle_source
-- Chi tao bang moi, khong sua/xoa bang cu
-- ============================================

USE lms_moodle_source;

-- ============================================
-- 1. THANH PHAN DIEM (TANG 1)
-- Vi du: Chuyen can 10%, Giua ky 40%,
-- Cuoi ky 50%, hoac thanh phan tuy chinh.
-- ============================================

CREATE TABLE IF NOT EXISTS teacher_grade_component (
    Component_ID BIGINT NOT NULL AUTO_INCREMENT,
    Course_ID BIGINT NOT NULL,
    Component_Name VARCHAR(150) NOT NULL,
    Overall_Weight DECIMAL(6,2) NOT NULL DEFAULT 0.00,
    Display_Order INT NOT NULL DEFAULT 0,
    Is_Active TINYINT(1) NOT NULL DEFAULT 1,
    Created_At DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,

    PRIMARY KEY (Component_ID),

    UNIQUE KEY uq_teacher_grade_component_course_name
        (Course_ID, Component_Name),

    UNIQUE KEY uq_teacher_grade_component_id_course
        (Component_ID, Course_ID),

    KEY idx_teacher_grade_component_course_active
        (Course_ID, Is_Active),

    CONSTRAINT fk_teacher_grade_component_course
        FOREIGN KEY (Course_ID)
        REFERENCES mdl_course(id),

    CONSTRAINT chk_teacher_grade_component_weight
        CHECK (Overall_Weight BETWEEN 0 AND 100)

) ENGINE=InnoDB
DEFAULT CHARSET=utf8mb4
COLLATE=utf8mb4_unicode_ci;


-- ============================================
-- 2. DAU DIEM CHI TIET (TANG 2)
--
-- ATTENDANCE: Diem danh LMS, khoa diem
-- LMS_GRADE: Bai tap/Quiz LMS, khoa diem
-- EXTERNAL: Diem ngoai LMS do giao vien them
-- ============================================

CREATE TABLE IF NOT EXISTS teacher_grade_item (
    Item_ID BIGINT NOT NULL AUTO_INCREMENT,
    Course_ID BIGINT NOT NULL,
    Component_ID BIGINT NOT NULL,
    Item_Name VARCHAR(255) NOT NULL,

    Source_Type ENUM(
        'ATTENDANCE',
        'LMS_GRADE',
        'EXTERNAL'
    ) NOT NULL,

    LMS_Grade_Item_ID BIGINT NULL,
    Internal_Weight DECIMAL(6,2) NOT NULL DEFAULT 0.00,
    Max_Score DECIMAL(10,4) NOT NULL DEFAULT 10.0000,
    Display_Order INT NOT NULL DEFAULT 0,
    Is_Active TINYINT(1) NOT NULL DEFAULT 1,
    Created_At DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,

    PRIMARY KEY (Item_ID),

    UNIQUE KEY uq_teacher_grade_item_id_source
        (Item_ID, Source_Type),

    UNIQUE KEY uq_teacher_grade_item_course_lms
        (Course_ID, LMS_Grade_Item_ID),

    KEY idx_teacher_grade_item_component
        (Component_ID, Course_ID, Is_Active),

    CONSTRAINT fk_teacher_grade_item_component_course
        FOREIGN KEY (Component_ID, Course_ID)
        REFERENCES teacher_grade_component(Component_ID, Course_ID),

    CONSTRAINT fk_teacher_grade_item_lms
        FOREIGN KEY (LMS_Grade_Item_ID)
        REFERENCES mdl_grade_items(id),

    CONSTRAINT chk_teacher_grade_item_weight
        CHECK (Internal_Weight BETWEEN 0 AND 100),

    CONSTRAINT chk_teacher_grade_item_max
        CHECK (Max_Score > 0),

    CONSTRAINT chk_teacher_grade_item_source
        CHECK (
            (
                Source_Type = 'LMS_GRADE'
                AND LMS_Grade_Item_ID IS NOT NULL
            )
            OR
            (
                Source_Type IN ('ATTENDANCE', 'EXTERNAL')
                AND LMS_Grade_Item_ID IS NULL
            )
        )

) ENGINE=InnoDB
DEFAULT CHARSET=utf8mb4
COLLATE=utf8mb4_unicode_ci;


-- ============================================
-- 3. DIEM NGOAI LMS CUA SINH VIEN
--
-- Chi luu diem EXTERNAL.
-- Diem LMS va diem danh khong chinh sua o day.
-- ============================================

CREATE TABLE IF NOT EXISTS teacher_grade_score (
    Score_ID BIGINT NOT NULL AUTO_INCREMENT,
    Item_ID BIGINT NOT NULL,
    User_ID BIGINT NOT NULL,
    Score DECIMAL(10,4) NOT NULL,

    Created_At DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,

    Updated_At DATETIME NOT NULL
        DEFAULT CURRENT_TIMESTAMP
        ON UPDATE CURRENT_TIMESTAMP,

    PRIMARY KEY (Score_ID),

    UNIQUE KEY uq_teacher_grade_score_item_user
        (Item_ID, User_ID),

    KEY idx_teacher_grade_score_user (User_ID),

    CONSTRAINT fk_teacher_grade_score_item
        FOREIGN KEY (Item_ID)
        REFERENCES teacher_grade_item(Item_ID),

    CONSTRAINT fk_teacher_grade_score_user
        FOREIGN KEY (User_ID)
        REFERENCES mdl_user(id),

    CONSTRAINT chk_teacher_grade_score_nonnegative
        CHECK (Score >= 0)

) ENGINE=InnoDB
DEFAULT CHARSET=utf8mb4
COLLATE=utf8mb4_unicode_ci;


-- ============================================
-- 4. KIEM TRA SAU KHI TAO BANG
-- Chi SELECT/SHOW, khong thay doi du lieu
-- ============================================

SHOW TABLES LIKE 'teacher_grade_%';

SHOW CREATE TABLE teacher_grade_component;
SHOW CREATE TABLE teacher_grade_item;
SHOW CREATE TABLE teacher_grade_score;

SELECT
    'teacher_grade_component' AS Table_Name,
    COUNT(*) AS Row_Count
FROM teacher_grade_component

UNION ALL

SELECT
    'teacher_grade_item',
    COUNT(*)
FROM teacher_grade_item

UNION ALL

SELECT
    'teacher_grade_score',
    COUNT(*)
FROM teacher_grade_score;