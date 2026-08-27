USE lms_datawarehouse;

-- ============================================================
-- FILE 08 - ETL MOODLE SOURCE -> DATA WAREHOUSE
-- PHẦN 1: ETL DIM_USER
-- ============================================================

INSERT INTO Dim_User
(
    Moodle_User_ID,
    Student_Code,
    Username,
    Full_Name,
    Email,
    Primary_Role,
    Homeroom_Cohort_Key,
    Is_Active
)
SELECT
    u.id AS Moodle_User_ID,

    NULLIF(u.idnumber, '') AS Student_Code,

    u.username AS Username,

    CONCAT(u.firstname, ' ', u.lastname) AS Full_Name,

    u.email AS Email,

    CASE
        WHEN EXISTS (
            SELECT 1
            FROM lms_moodle_source.mdl_role_assignments ra
            INNER JOIN lms_moodle_source.mdl_role r
                ON r.id = ra.roleid
            WHERE ra.userid = u.id
              AND r.shortname IN ('editingteacher', 'teacher')
        )
        THEN 'Teacher'

        WHEN EXISTS (
            SELECT 1
            FROM lms_moodle_source.mdl_role_assignments ra
            INNER JOIN lms_moodle_source.mdl_role r
                ON r.id = ra.roleid
            WHERE ra.userid = u.id
              AND r.shortname = 'student'
        )
        THEN 'Student'

        ELSE 'Other'
    END AS Primary_Role,

    NULL AS Homeroom_Cohort_Key,

    CASE
        WHEN u.suspended = 0
         AND u.deleted = 0
        THEN TRUE
        ELSE FALSE
    END AS Is_Active

FROM lms_moodle_source.mdl_user u

WHERE u.deleted = 0;