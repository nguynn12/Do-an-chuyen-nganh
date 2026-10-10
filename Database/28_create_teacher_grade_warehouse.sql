-- ==========================================
-- GRADE SIMULATOR - DATA WAREHOUSE
-- ADD ONLY
-- ==========================================

USE lms_datawarehouse;

-- 1. Nhóm tính điểm
CREATE TABLE IF NOT EXISTS dim_teacher_grade_component (
    Component_Key BIGINT AUTO_INCREMENT PRIMARY KEY,
    Source_Component_ID BIGINT NOT NULL UNIQUE,
    Course_Key INT NOT NULL,
    Component_Name VARCHAR(150) NOT NULL,
    Overall_Weight DECIMAL(6,2) NOT NULL,
    Display_Order INT DEFAULT 0,
    Is_Active BOOLEAN DEFAULT TRUE,

    INDEX idx_sim_component_course (Course_Key),

    FOREIGN KEY (Course_Key)
        REFERENCES Dim_Course(Course_Key)
) ENGINE=InnoDB;


-- 2. Các đầu điểm
CREATE TABLE IF NOT EXISTS dim_teacher_grade_item (
    Item_Key BIGINT AUTO_INCREMENT PRIMARY KEY,
    Source_Item_ID BIGINT NOT NULL UNIQUE,
    Component_Key BIGINT NOT NULL,
    Course_Key INT NOT NULL,
    Item_Name VARCHAR(255) NOT NULL,
    Source_Type VARCHAR(20) NOT NULL,
    LMS_Grade_Item_ID BIGINT NULL,
    Internal_Weight DECIMAL(6,2) NOT NULL,
    Max_Score DECIMAL(10,4) NOT NULL,
    Display_Order INT DEFAULT 0,
    Is_Active BOOLEAN DEFAULT TRUE,

    INDEX idx_sim_item_component (Component_Key),
    INDEX idx_sim_item_course (Course_Key),

    FOREIGN KEY (Component_Key)
        REFERENCES dim_teacher_grade_component(Component_Key),

    FOREIGN KEY (Course_Key)
        REFERENCES Dim_Course(Course_Key)
) ENGINE=InnoDB;


-- 3. Điểm ngoài LMS
CREATE TABLE IF NOT EXISTS fact_teacher_grade_score (
    Score_Key BIGINT AUTO_INCREMENT PRIMARY KEY,
    Source_Score_ID BIGINT NOT NULL UNIQUE,
    Item_Key BIGINT NOT NULL,
    User_Key INT NOT NULL,
    Course_Key INT NOT NULL,
    Score DECIMAL(10,4) NOT NULL,
    Max_Score DECIMAL(10,4) NOT NULL,

    UNIQUE KEY uq_sim_item_student (Item_Key, User_Key),

    FOREIGN KEY (Item_Key)
        REFERENCES dim_teacher_grade_item(Item_Key),

    FOREIGN KEY (User_Key)
        REFERENCES Dim_User(User_Key),

    FOREIGN KEY (Course_Key)
        REFERENCES Dim_Course(Course_Key)
) ENGINE=InnoDB;


-- KIỂM TRA
SHOW TABLES LIKE '%teacher_grade%';