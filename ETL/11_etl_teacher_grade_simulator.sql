-- =====================================================
-- 11_etl_teacher_grade_simulator.sql
-- SOURCE: lms_moodle_source
-- TARGET: lms_datawarehouse
--
-- Chi ghi vao 3 bang warehouse moi cua Grade Simulator.
-- Khong sua/xoa bang ETL va bang warehouse cu.
-- =====================================================

USE lms_datawarehouse;

-- 1. DONG BO NHOM DIEM
INSERT INTO dim_teacher_grade_component (
    Source_Component_ID,
    Course_Key,
    Component_Name,
    Overall_Weight,
    Display_Order,
    Is_Active
)
SELECT
    src.Component_ID,
    dc.Course_Key,
    src.Component_Name,
    src.Overall_Weight,
    src.Display_Order,
    src.Is_Active
FROM lms_moodle_source.teacher_grade_component src
INNER JOIN Dim_Course dc
    ON dc.Moodle_Course_ID = src.Course_ID
ON DUPLICATE KEY UPDATE
    Component_Name = VALUES(Component_Name),
    Overall_Weight = VALUES(Overall_Weight),
    Display_Order = VALUES(Display_Order),
    Is_Active = VALUES(Is_Active);


-- 2. DONG BO DAU DIEM
INSERT INTO dim_teacher_grade_item (
    Source_Item_ID,
    Component_Key,
    Course_Key,
    Item_Name,
    Source_Type,
    LMS_Grade_Item_ID,
    Internal_Weight,
    Max_Score,
    Display_Order,
    Is_Active
)
SELECT
    src.Item_ID,
    comp.Component_Key,
    dc.Course_Key,
    src.Item_Name,
    src.Source_Type,
    src.LMS_Grade_Item_ID,
    src.Internal_Weight,
    src.Max_Score,
    src.Display_Order,
    src.Is_Active
FROM lms_moodle_source.teacher_grade_item src
INNER JOIN dim_teacher_grade_component comp
    ON comp.Source_Component_ID = src.Component_ID
INNER JOIN Dim_Course dc
    ON dc.Moodle_Course_ID = src.Course_ID
ON DUPLICATE KEY UPDATE
    Component_Key = VALUES(Component_Key),
    Item_Name = VALUES(Item_Name),
    Source_Type = VALUES(Source_Type),
    LMS_Grade_Item_ID = VALUES(LMS_Grade_Item_ID),
    Internal_Weight = VALUES(Internal_Weight),
    Max_Score = VALUES(Max_Score),
    Display_Order = VALUES(Display_Order),
    Is_Active = VALUES(Is_Active);


-- 3. DONG BO DIEM NGOAI LMS
INSERT INTO fact_teacher_grade_score (
    Source_Score_ID,
    Item_Key,
    User_Key,
    Course_Key,
    Score,
    Max_Score
)
SELECT
    src.Score_ID,
    di.Item_Key,
    du.User_Key,
    di.Course_Key,
    src.Score,
    di.Max_Score
FROM lms_moodle_source.teacher_grade_score src
INNER JOIN dim_teacher_grade_item di
    ON di.Source_Item_ID = src.Item_ID
INNER JOIN Dim_User du
    ON du.Moodle_User_ID = src.User_ID
WHERE di.Source_Type = 'EXTERNAL'
ON DUPLICATE KEY UPDATE
    Score = VALUES(Score),
    Max_Score = VALUES(Max_Score);


-- 4. KIEM TRA
SELECT 'Component' AS Loai, COUNT(*) AS SoDong
FROM dim_teacher_grade_component

UNION ALL

SELECT 'Item', COUNT(*)
FROM dim_teacher_grade_item

UNION ALL

SELECT 'Score', COUNT(*)
FROM fact_teacher_grade_score;