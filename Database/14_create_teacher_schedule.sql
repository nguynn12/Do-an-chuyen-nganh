-- ============================================================
-- 14_create_teacher_schedule.sql
-- TẠO CÁC BẢNG ỨNG DỤNG CHO GIẢNG VIÊN & ĐĂNG NHẬP
-- ============================================================

USE lms_datawarehouse;


-- ============================================================
-- 1. TÀI KHOẢN ĐĂNG NHẬP (APP USER ACCOUNT)
-- ============================================================

CREATE TABLE IF NOT EXISTS App_User_Account (
    Account_ID INT AUTO_INCREMENT PRIMARY KEY,

    User_Key INT NOT NULL UNIQUE,
    Username VARCHAR(100) NOT NULL UNIQUE,
    Password_Hash VARCHAR(255) NOT NULL,
    Role VARCHAR(50) NOT NULL DEFAULT 'teacher',

    Is_Active BOOLEAN NOT NULL DEFAULT TRUE,

    Created_At DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    Updated_At DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    INDEX idx_app_user_username (Username),
    INDEX idx_app_user_role (Role),

    CONSTRAINT fk_app_user_account_user
        FOREIGN KEY (User_Key)
        REFERENCES Dim_User(User_Key)
        ON DELETE CASCADE
        ON UPDATE CASCADE
) ENGINE=InnoDB;


-- ============================================================
-- 2. LỊCH GIẢNG DẠY (TEACHER SCHEDULE)
-- ============================================================

CREATE TABLE IF NOT EXISTS Teacher_Schedule (
    Schedule_ID BIGINT AUTO_INCREMENT PRIMARY KEY,

    Teacher_User_Key INT NOT NULL,

    Event_Date DATE NOT NULL,
    Event_Time TIME NULL,
    Title VARCHAR(255) NOT NULL,
    Event_Type VARCHAR(30) NOT NULL DEFAULT 'class',
    Description TEXT NULL,

    Created_At DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    Updated_At DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    INDEX idx_teacher_schedule_teacher (Teacher_User_Key),
    INDEX idx_teacher_schedule_date (Event_Date),
    INDEX idx_teacher_schedule_teacher_date (Teacher_User_Key, Event_Date),

    CONSTRAINT fk_teacher_schedule_user
        FOREIGN KEY (Teacher_User_Key)
        REFERENCES Dim_User(User_Key)
        ON DELETE CASCADE
        ON UPDATE CASCADE
) ENGINE=InnoDB;


-- ============================================================
-- KIỂM TRA
-- ============================================================

SHOW TABLES LIKE '%Schedule%';
SHOW TABLES LIKE '%Account%';