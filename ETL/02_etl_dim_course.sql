USE lms_datawarehouse;

SET SQL_SAFE_UPDATES = 0;

DELETE FROM Dim_Course;

INSERT INTO Dim_Course
(
    Moodle_Course_ID,
    Course_Code,
    Course_Name,
    Category_ID,
    Category_Name,
    Start_Date,
    End_Date,
    Is_Visible
)
SELECT
    c.id AS Moodle_Course_ID,
    c.shortname AS Course_Code,
    c.fullname AS Course_Name,

    c.category AS Category_ID,
    cc.name AS Category_Name,

    CASE
        WHEN c.startdate IS NOT NULL
         AND c.startdate > 0
        THEN FROM_UNIXTIME(c.startdate)
        ELSE NULL
    END AS Start_Date,

    CASE
        WHEN c.enddate IS NOT NULL
         AND c.enddate > 0
        THEN FROM_UNIXTIME(c.enddate)
        ELSE NULL
    END AS End_Date,

    CASE
        WHEN c.visible = 1 THEN TRUE
        ELSE FALSE
    END AS Is_Visible

FROM lms_moodle_source.mdl_course c

LEFT JOIN lms_moodle_source.mdl_course_categories cc
    ON cc.id = c.category;

SET SQL_SAFE_UPDATES = 1;


-- KIỂM TRA
SELECT *
FROM Dim_Course
ORDER BY Course_Key;

SELECT
    COUNT(*) AS Total_Courses,
    MIN(Start_Date) AS Min_Start_Date,
    MAX(End_Date) AS Max_End_Date
FROM Dim_Course;