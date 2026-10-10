-- ============================================================
-- FILE 30: UPGRADE TEACHER GRADE SIMULATOR
-- ============================================================
-- MUC DICH:
-- 1. Ho tro them nguon diem ASSIGNMENT
-- 2. Lien ket bai tap da ton tai trong LMS/DW
-- 3. Khong tao lai bai tap
-- 4. Khong sua diem sinh vien
-- 5. Khong xoa du lieu hien co
--
-- CHI THAY DOI 2 BANG MOI CUA GRADE SIMULATOR
--
-- LUU Y: SCRIPT NANG CAP CHAY MOT LAN
-- MySQL DDL co the tu dong COMMIT
-- ============================================================


-- ============================================================
-- PHAN 1: MOODLE SOURCE
-- ============================================================

USE lms_moodle_source;


-- 1. Bo sung ma tham chieu Module
-- Vi du: 105001, 105002, 106001...
ALTER TABLE teacher_grade_item
ADD COLUMN Source_Module_ID BIGINT NULL
AFTER LMS_Grade_Item_ID;


-- 2. Mo rong Source_Type
-- Them ASSIGNMENT nhung giu nguyen 3 loai cu

-- Bo ràng buộc cũ trước khi mở rộng ENUM
ALTER TABLE teacher_grade_item
DROP CHECK chk_teacher_grade_item_source;


ALTER TABLE teacher_grade_item
MODIFY COLUMN Source_Type ENUM(
    'ATTENDANCE',
    'LMS_GRADE',
    'EXTERNAL',
    'ASSIGNMENT'
) NOT NULL;


-- 3. Tao lai CHECK constraint cho 4 loai nguon
ALTER TABLE teacher_grade_item
ADD CONSTRAINT chk_teacher_grade_item_source
CHECK (
    (
        Source_Type = 'LMS_GRADE'
        AND LMS_Grade_Item_ID IS NOT NULL
        AND Source_Module_ID IS NULL
    )

    OR

    (
        Source_Type = 'ASSIGNMENT'
        AND Source_Module_ID IS NOT NULL
        AND LMS_Grade_Item_ID IS NULL
    )

    OR

    (
        Source_Type IN ('ATTENDANCE', 'EXTERNAL')
        AND LMS_Grade_Item_ID IS NULL
        AND Source_Module_ID IS NULL
    )
);


-- 4. Khong cho mot Module bi gan trung trong mot mon
CREATE UNIQUE INDEX uq_teacher_grade_item_course_module
ON teacher_grade_item (
    Course_ID,
    Source_Module_ID
);


-- ============================================================
-- PHAN 2: DATA WAREHOUSE
-- ============================================================

USE lms_datawarehouse;


-- 5. Bo sung ma Module tu Source
ALTER TABLE dim_teacher_grade_item
ADD COLUMN Source_Module_ID BIGINT NULL
AFTER LMS_Grade_Item_ID;


-- 6. Bo sung ma Activity trong Data Warehouse
ALTER TABLE dim_teacher_grade_item
ADD COLUMN Activity_Key INT NULL
AFTER Source_Module_ID;


-- 7. Tao index phuc vu tra cuu Activity
CREATE INDEX idx_sim_item_activity
ON dim_teacher_grade_item (Activity_Key);


-- ============================================================
-- PHAN 3: KIEM TRA KET QUA
-- ============================================================

-- 8. Kiem tra bang Source
SELECT
    COLUMN_NAME,
    COLUMN_TYPE,
    IS_NULLABLE
FROM information_schema.COLUMNS
WHERE TABLE_SCHEMA = 'lms_moodle_source'
  AND TABLE_NAME = 'teacher_grade_item'