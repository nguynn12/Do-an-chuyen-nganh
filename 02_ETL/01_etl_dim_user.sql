-- ============================================================
-- 01_etl_dim_user.sql
-- ETL: Moodle Source -> Data Warehouse
-- Nguồn:
--   mdl_user
--   mdl_role_assignments
--   mdl_role
--
-- Đích:
--   Dim_User
-- ============================================================


-- ============================================================
-- 1. CHỌN DATABASE
-- ============================================================

USE lms_moodle_source;


-- ============================================================
-- 2. KIỂM TRA DỮ LIỆU NGUỒN
-- ============================================================

SELECT
    u.id AS Moodle_User_ID,
    u.username,
    u.firstname,
    u.lastname,
    u.email,
    u.suspended,
    u.deleted,
    GROUP_CONCAT(
        DISTINCT r.shortname
        ORDER BY r.shortname
        SEPARATOR ', '
    ) AS Moodle_Roles
FROM mdl_user u
LEFT JOIN mdl_role_assignments ra
    ON ra.userid = u.id
LEFT JOIN mdl_role r
    ON r.id = ra.roleid
WHERE u.deleted = 0
GROUP BY
    u.id,
    u.username,
    u.firstname,
    u.lastname,
    u.email,
    u.suspended,
    u.deleted
ORDER BY u.id;


-- ============================================================
-- 3. CHUYỂN SANG DATABASE DATA WAREHOUSE
-- ============================================================

USE lms_datawarehouse;


-- ============================================================
-- 4. XÓA DỮ LIỆU CŨ TRONG DIM_USER
--    Chỉ dùng trong giai đoạn xây dựng / seed dữ liệu.
-- ============================================================

DELETE FROM Dim_User;


-- ============================================================
-- 5. LOAD DỮ LIỆU VÀO DIM_USER
-- ============================================================

INSERT INTO Dim_User
(
    Moodle_User_ID,
    Username,
    First_Name,
    Last_Name,
    Full_Name,
    Email,
    Primary_Role,
    Is_Active
)
SELECT
    u.id AS Moodle_User_ID,

    u.username AS Username,

    u.firstname AS First_Name,

    u.lastname AS Last_Name,

    TRIM(
        CONCAT(
            COALESCE(u.firstname, ''),
            CASE
                WHEN u.firstname IS NOT NULL
                 AND u.lastname IS NOT NULL
                 AND u.lastname <> ''
                THEN ' '
                ELSE ''
            END,
            COALESCE(u.lastname, '')
        )
    ) AS Full_Name,

    u.email AS Email,

    CASE
        WHEN MAX(
            CASE
                WHEN r.shortname IN ('teacher', 'editingteacher')
                THEN 1
                ELSE 0
            END
        ) = 1
        THEN 'Teacher'

        WHEN MAX(
            CASE
                WHEN r.shortname = 'student'
                THEN 1
                ELSE 0
            END
        ) = 1
        THEN 'Student'

        ELSE 'Unknown'
    END AS Primary_Role,

    CASE
        WHEN u.suspended = 0
         AND u.deleted = 0
        THEN TRUE
        ELSE FALSE
    END AS Is_Active

FROM lms_moodle_source.mdl_user u

LEFT JOIN lms_moodle_source.mdl_role_assignments ra
    ON ra.userid = u.id

LEFT JOIN lms_moodle_source.mdl_role r
    ON r.id = ra.roleid

WHERE u.deleted = 0

GROUP BY
    u.id,
    u.username,
    u.firstname,
    u.lastname,
    u.email,
    u.suspended,
    u.deleted;


-- ============================================================
-- 6. KIỂM TRA TỔNG SỐ USER
-- ============================================================

SELECT
    COUNT(*) AS Total_Users
FROM Dim_User;


-- ============================================================
-- 7. KIỂM TRA PHÂN BỐ ROLE
-- ============================================================

SELECT
    Primary_Role,
    COUNT(*) AS Total_Users
FROM Dim_User
GROUP BY Primary_Role
ORDER BY Primary_Role;


-- ============================================================
-- 8. KIỂM TRA CHI TIẾT
-- ============================================================

SELECT
    User_Key,
    Moodle_User_ID,
    Username,
    First_Name,
    Last_Name,
    Full_Name,
    Email,
    Primary_Role,
    Is_Active
FROM Dim_User
ORDER BY Moodle_User_ID;