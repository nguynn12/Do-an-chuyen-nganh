USE lms_datawarehouse;

CREATE TABLE Dim_Date (
    Date_Key INT PRIMARY KEY,
    Full_Date DATE NOT NULL UNIQUE,

    Day_Of_Month TINYINT NOT NULL,
    Month_Number TINYINT NOT NULL,
    Month_Name VARCHAR(20) NOT NULL,

    Quarter_Number TINYINT NOT NULL,
    Year_Number SMALLINT NOT NULL,

    Week_Number TINYINT NOT NULL,
    Day_Of_Week_Number TINYINT NOT NULL,
    Day_Of_Week_Name VARCHAR(20) NOT NULL,

    Is_Weekend BOOLEAN NOT NULL DEFAULT FALSE,

    Academic_Semester VARCHAR(30),

    INDEX idx_dim_date_year (Year_Number),
    INDEX idx_dim_date_month (Year_Number, Month_Number),
    INDEX idx_dim_date_semester (Academic_Semester)
) ENGINE=InnoDB;

CREATE TABLE Dim_User (
    User_Key INT AUTO_INCREMENT PRIMARY KEY,

    Moodle_User_ID BIGINT NOT NULL UNIQUE,

    Username VARCHAR(100),
    First_Name VARCHAR(100),
    Last_Name VARCHAR(100),

    Full_Name VARCHAR(255) NOT NULL,

    Email VARCHAR(255),

    Primary_Role VARCHAR(50),

    Is_Active BOOLEAN NOT NULL DEFAULT TRUE,

    INDEX idx_dim_user_moodle_id (Moodle_User_ID),
    INDEX idx_dim_user_role (Primary_Role),
    INDEX idx_dim_user_name (Full_Name)
) ENGINE=InnoDB;

CREATE TABLE Dim_Course (
    Course_Key INT AUTO_INCREMENT PRIMARY KEY,

    Moodle_Course_ID BIGINT NOT NULL UNIQUE,

    Course_Code VARCHAR(100),
    Course_Name VARCHAR(255) NOT NULL,

    Category_ID BIGINT,
    Category_Name VARCHAR(255),

    Start_Date DATE,
    End_Date DATE,

    Is_Visible BOOLEAN NOT NULL DEFAULT TRUE,

    INDEX idx_dim_course_moodle_id (Moodle_Course_ID),
    INDEX idx_dim_course_code (Course_Code),
    INDEX idx_dim_course_category (Category_ID),
    INDEX idx_dim_course_name (Course_Name)
) ENGINE=InnoDB;

CREATE TABLE Dim_Activity (
    Activity_Key INT AUTO_INCREMENT PRIMARY KEY,

    Moodle_Module_ID BIGINT NOT NULL UNIQUE,

    Course_Key INT NOT NULL,

    Activity_Type VARCHAR(50) NOT NULL,

    Activity_Name VARCHAR(255),

    Due_Date_Key INT,

    Max_Grade DECIMAL(10,2),

    Is_Visible BOOLEAN NOT NULL DEFAULT TRUE,

    INDEX idx_dim_activity_course (Course_Key),
    INDEX idx_dim_activity_type (Activity_Type),
    INDEX idx_dim_activity_due_date (Due_Date_Key),

    CONSTRAINT fk_dim_activity_course
        FOREIGN KEY (Course_Key)
        REFERENCES Dim_Course(Course_Key),

    CONSTRAINT fk_dim_activity_due_date
        FOREIGN KEY (Due_Date_Key)
        REFERENCES Dim_Date(Date_Key)
) ENGINE=InnoDB;

-- KIỂM TRA

SHOW TABLES;