USE lms_datawarehouse;

SET SESSION cte_max_recursion_depth = 10000;

INSERT INTO Dim_Date (
    Date_Key,
    Full_Date,
    Day_Of_Month,
    Month_Number,
    Month_Name,
    Quarter_Number,
    Year_Number,
    Week_Number,
    Day_Of_Week_Number,
    Day_Of_Week_Name,
    Is_Weekend,
    Academic_Semester
)
WITH RECURSIVE Date_Range AS (
    SELECT DATE('2020-01-01') AS Full_Date

    UNION ALL

    SELECT DATE_ADD(Full_Date, INTERVAL 1 DAY)
    FROM Date_Range
    WHERE Full_Date < DATE('2035-12-31')
)

SELECT
    CAST(DATE_FORMAT(Full_Date, '%Y%m%d') AS UNSIGNED) AS Date_Key,

    Full_Date,

    DAY(Full_Date) AS Day_Of_Month,

    MONTH(Full_Date) AS Month_Number,

    MONTHNAME(Full_Date) AS Month_Name,

    QUARTER(Full_Date) AS Quarter_Number,

    YEAR(Full_Date) AS Year_Number,

    WEEK(Full_Date, 3) AS Week_Number,

    DAYOFWEEK(Full_Date) AS Day_Of_Week_Number,

    DAYNAME(Full_Date) AS Day_Of_Week_Name,

    CASE
        WHEN DAYOFWEEK(Full_Date) IN (1, 7)
        THEN TRUE
        ELSE FALSE
    END AS Is_Weekend,

    CASE
        WHEN MONTH(Full_Date) BETWEEN 1 AND 6
            THEN CONCAT(
                'HK2_',
                YEAR(Full_Date) - 1,
                '-',
                YEAR(Full_Date)
            )

        ELSE CONCAT(
            'HK1_',
            YEAR(Full_Date),
            '-',
            YEAR(Full_Date) + 1
        )
    END AS Academic_Semester

FROM Date_Range;

SELECT
    COUNT(*) AS Total_Dates,
    MIN(Full_Date) AS Min_Date,
    MAX(Full_Date) AS Max_Date
FROM Dim_Date;


SELECT *
FROM Dim_Date
ORDER BY Full_Date
LIMIT 20;