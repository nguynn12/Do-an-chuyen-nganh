-- ============================================================
-- FILE 29: SEED TEACHER GRADE SIMULATOR
-- DATABASE: lms_moodle_source
--
-- GOM TU CAC FILE:
-- 29_configure_grade_components.sql
-- 30_configure_attendance_grade_item.sql
-- 32_configure_lms_grade_items.sql
-- 33_add_external_grade_item.sql
-- 35_insert_external_grade_scores.sql
--
-- COURSE 101: CO SO DU LIEU
-- DU LIEU DEMO DA TAO TRUOC DO
--
-- ADD ONLY - KHONG UPDATE / DELETE / DROP
-- KHONG SUA DIEM LMS HAY DU LIEU DIEM DANH
-- ============================================================

USE lms_moodle_source;

-- ============================================================
-- 1. CAU HINH NHOM DIEM
-- Chuyen can: 10%
-- Giua ky:    40%
-- Cuoi ky:    50%
-- ============================================================

INSERT INTO teacher_grade_component (
    Course_ID,
    Component_Name,
    Overall_Weight,
    Display_Order
)
SELECT
    101,
    cfg.Component_Name,
    cfg.Overall_Weight,
    cfg.Display_Order
FROM (
    SELECT 'Chuyên cần' AS Component_Name,
           10.00 AS Overall_Weight,
           1 AS Display_Order

    UNION ALL

    SELECT 'Giữa kỳ', 40.00, 2

    UNION ALL

    SELECT 'Cuối kỳ', 50.00, 3
) cfg
WHERE EXISTS (
    SELECT 1
    FROM mdl_course
    WHERE id = 101
)
AND NOT EXISTS (
    SELECT 1
    FROM teacher_grade_component existing
    WHERE existing.Course_ID = 101
      AND existing.Component_Name = cfg.Component_Name
);


-- ============================================================
-- 2. CAU HINH DIEM DANH LMS
-- Trong so noi bo Chuyen can: 60%
-- Chi tham chieu diem danh da co.
-- ============================================================

INSERT INTO teacher_grade_item (
    Course_ID,
    Component_ID,
    Item_Name,
    Source_Type,
    LMS_Grade_Item_ID,
    Internal_Weight,
    Max_Score,
    Display_Order
)
SELECT
    c.Course_ID,
    c.Component_ID,
    'Điểm danh LMS',
    'ATTENDANCE',
    NULL,
    60.00,
    10.0000,
    1
FROM teacher_grade_component c
WHERE c.Course_ID = 101
  AND c.Component_Name = 'Chuyên cần'
  AND NOT EXISTS (
      SELECT 1
      FROM teacher_grade_item existing
      WHERE existing.Component_ID = c.Component_ID
        AND existing.Source_Type = 'ATTENDANCE'
  );


-- ============================================================
-- 3. CAU HINH BAI TAP LMS
--
-- 42001: Bai tap SQL co ban        10%
-- 42002: Bai tap thiet ke CSDL     10%
--
-- Diem bai tap duoc lay tu Moodle.
-- Khong sao chep hoac sua diem goc.
-- ============================================================

INSERT INTO teacher_grade_item (
    Course_ID,
    Component_ID,
    Item_Name,
    Source_Type,
    LMS_Grade_Item_ID,
    Internal_Weight,
    Max_Score,
    Display_Order
)
SELECT
    g.courseid,
    c.Component_ID,
    g.itemname,
    'LMS_GRADE',
    g.id,
    10.00,
    g.grademax,
    CASE
        WHEN g.id = 42001 THEN 2
        WHEN g.id = 42002 THEN 3
    END
FROM mdl_grade_items g
INNER JOIN teacher_grade_component c
    ON c.Course_ID = g.courseid
   AND c.Component_Name = 'Chuyên cần'
WHERE g.courseid = 101
  AND g.id IN (42001, 42002)
  AND g.grademax > 0
  AND NOT EXISTS (
      SELECT 1
      FROM teacher_grade_item existing
      WHERE existing.Course_ID = g.courseid
        AND existing.LMS_Grade_Item_ID = g.id
  );


-- ============================================================
-- 4. CAU HINH DAU DIEM NGOAI LMS
--
-- Bai kiem tra 15 phut
-- Trong so: 20%
-- Thang diem: 10
-- ============================================================

INSERT INTO teacher_grade_item (
    Course_ID,
    Component_ID,
    Item_Name,
    Source_Type,
    LMS_Grade_Item_ID,
    Internal_Weight,
    Max_Score,
    Display_Order
)
SELECT
    c.Course_ID,
    c.Component_ID,
    'Bài kiểm tra 15 phút',
    'EXTERNAL',
    NULL,
    20.00,
    10.0000,
    4
FROM teacher_grade_component c
WHERE c.Course_ID = 101
  AND c.Component_Name = 'Chuyên cần'
  AND NOT EXISTS (
      SELECT 1
      FROM teacher_grade_item existing
      WHERE existing.Component_ID = c.Component_ID
        AND existing.Source_Type = 'EXTERNAL'
        AND existing.Item_Name = 'Bài kiểm tra 15 phút'
  );


-- ============================================================
-- 5. DIEM NGOAI LMS - DU LIEU DEMO
--
-- sv2310001: 8.0
-- sv2310002: 7.5
-- sv2310003: 9.0
-- sv2310004: 6.5
-- sv2310005: 8.5
-- sv2310006: 7.0
--
-- Khong ghi de diem da ton tai.
-- Khong dung diem demo lam diem chinh thuc.
-- ============================================================

INSERT INTO teacher_grade_score (
    Item_ID,
    User_ID,
    Score
)
SELECT
    i.Item_ID,
    demo.User_ID,
    demo.Score
FROM teacher_grade_item i
INNER JOIN (
    SELECT 101 AS User_ID, 8.0 AS Score
    UNION ALL SELECT 102, 7.5
    UNION ALL SELECT 103, 9.0
    UNION ALL SELECT 104, 6.5
    UNION ALL SELECT 105, 8.5
    UNION ALL SELECT 106, 7.0
) demo
    ON 1 = 1
INNER JOIN mdl_user u
    ON u.id = demo.User_ID
WHERE i.Course_ID = 101
  AND i.Source_Type = 'EXTERNAL'
  AND i.Item_Name = 'Bài kiểm tra 15 phút'
  AND i.Max_Score = 10
  AND NOT EXISTS (
      SELECT 1
      FROM teacher_grade_score existing
      WHERE existing.Item_ID = i.Item_ID
        AND existing.User_ID = demo.User_ID
  );


-- ============================================================
-- 6. KIEM TRA CUOI FILE
-- ============================================================

-- Cau hinh nhom diem
SELECT
    Component_ID,
    Course_ID,
    Component_Name,
    Overall_Weight
FROM teacher_grade_component
WHERE Course_ID = 101
ORDER BY Display_Order;


-- Cau hinh dau diem
SELECT
    c.Component_Name,
    i.Item_ID,
    i.Item_Name,
    i.Source_Type,
    i.Internal_Weight,
    i.Max_Score
FROM teacher_grade_component c
LEFT JOIN teacher_grade_item i
    ON i.Component_ID = c.Component_ID
WHERE c.Course_ID = 101
ORDER BY c.Display_Order, i.Display_Order;


-- Tong trong so chuyen can
SELECT
    c.Course_ID,
    c.Component_Name,
    COALESCE(SUM(i.Internal_Weight), 0)
        AS Total_Internal_Weight
FROM teacher_grade_component c
LEFT JOIN teacher_grade_item i
    ON i.Component_ID = c.Component_ID
   AND i.Is_Active = 1
WHERE c.Course_ID = 101
  AND c.Component_Name = 'Chuyên cần'
GROUP BY c.Course_ID, c.Component_ID, c.Component_Name;


-- So sinh vien co diem ngoai LMS
SELECT
    i.Item_Name,
    COUNT(s.Score_ID) AS So_Sinh_Vien_Co_Diem
FROM teacher_grade_item i
LEFT JOIN teacher_grade_score s
    ON s.Item_ID = i.Item_ID
WHERE i.Course_ID = 101
  AND i.Source_Type = 'EXTERNAL'
GROUP BY i.Item_ID, i.Item_Name;
-- ============================================================
-- 7. GRADE SIMULATOR - GIANG VIEN TRAN BINH
-- MON 103: GAME NANG CAO
-- MON 104: TRI TUE NHAN TAO
-- CAU HINH DEMO, KHONG CO DINH TRONG SO
-- ============================================================

-- 7.1. Tao cac nhom diem
INSERT INTO teacher_grade_component (
    Course_ID,
    Component_Name,
    Overall_Weight,
    Display_Order
)
SELECT
    c.id,
    cfg.Component_Name,
    cfg.Overall_Weight,
    cfg.Display_Order
FROM mdl_course c
CROSS JOIN (
    SELECT 'Chuyên cần' AS Component_Name,
           10.00 AS Overall_Weight,
           1 AS Display_Order
    UNION ALL
    SELECT 'Giữa kỳ', 40.00, 2
    UNION ALL
    SELECT 'Cuối kỳ', 50.00, 3
) cfg
WHERE c.id IN (103, 104)
  AND NOT EXISTS (
      SELECT 1
      FROM teacher_grade_component existing
      WHERE existing.Course_ID = c.id
        AND existing.Component_Name = cfg.Component_Name
  );


-- 7.2. Cau hinh Diem danh LMS: 60%
INSERT INTO teacher_grade_item (
    Course_ID,
    Component_ID,
    Item_Name,
    Source_Type,
    LMS_Grade_Item_ID,
    Internal_Weight,
    Max_Score,
    Display_Order
)
SELECT
    c.Course_ID,
    c.Component_ID,
    'Điểm danh LMS',
    'ATTENDANCE',
    NULL,
    60.00,
    10.0000,
    1
FROM teacher_grade_component c
WHERE c.Course_ID IN (103, 104)
  AND c.Component_Name = 'Chuyên cần'
  AND NOT EXISTS (
      SELECT 1
      FROM teacher_grade_item existing
      WHERE existing.Component_ID = c.Component_ID
        AND existing.Source_Type = 'ATTENDANCE'
  );


-- 7.3. Cau hinh bai tap LMS: moi bai 10%
INSERT INTO teacher_grade_item (
    Course_ID,
    Component_ID,
    Item_Name,
    Source_Type,
    LMS_Grade_Item_ID,
    Internal_Weight,
    Max_Score,
    Display_Order
)
SELECT
    g.courseid,
    c.Component_ID,
    g.itemname,
    'LMS_GRADE',
    g.id,
    10.00,
    g.grademax,
    CASE
        WHEN g.id IN (42005, 42007) THEN 2
        ELSE 3
    END
FROM mdl_grade_items g
INNER JOIN teacher_grade_component c
    ON c.Course_ID = g.courseid
   AND c.Component_Name = 'Chuyên cần'
WHERE (
       (g.courseid = 103 AND g.id IN (42005, 42006))
    OR (g.courseid = 104 AND g.id IN (42007, 42008))
)
  AND g.grademax > 0
  AND NOT EXISTS (
      SELECT 1
      FROM teacher_grade_item existing
      WHERE existing.Course_ID = g.courseid
        AND existing.LMS_Grade_Item_ID = g.id
  );


-- 7.4. Tao dau diem ngoai LMS: 20%
-- CHUA NHAP DIEM SINH VIEN
INSERT INTO teacher_grade_item (
    Course_ID,
    Component_ID,
    Item_Name,
    Source_Type,
    LMS_Grade_Item_ID,
    Internal_Weight,
    Max_Score,
    Display_Order
)
SELECT
    c.Course_ID,
    c.Component_ID,
    'Bài kiểm tra 15 phút',
    'EXTERNAL',
    NULL,
    20.00,
    10.0000,
    4
FROM teacher_grade_component c
WHERE c.Course_ID IN (103, 104)
  AND c.Component_Name = 'Chuyên cần'
  AND NOT EXISTS (
      SELECT 1
      FROM teacher_grade_item existing
      WHERE existing.Component_ID = c.Component_ID
        AND existing.Source_Type = 'EXTERNAL'
        AND existing.Item_Name = 'Bài kiểm tra 15 phút'
  );


-- 7.5. Kiem tra tong trong so Chuyen can
SELECT
    c.Course_ID,
    c.Component_Name,
    COUNT(i.Item_ID) AS So_Dau_Diem,
    COALESCE(SUM(i.Internal_Weight), 0) AS Tong_Trong_So
FROM teacher_grade_component c
LEFT JOIN teacher_grade_item i
    ON i.Component_ID = c.Component_ID
   AND i.Is_Active = 1
WHERE c.Course_ID IN (103, 104)
  AND c.Component_Name = 'Chuyên cần'
GROUP BY
    c.Course_ID,
    c.Component_ID,
    c.Component_Name
ORDER BY c.Course_ID;