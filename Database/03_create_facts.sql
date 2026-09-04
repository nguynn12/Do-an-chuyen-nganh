USE lms_datawarehouse;

CREATE TABLE Fact_Enrolment (
    Enrolment_Key BIGINT AUTO_INCREMENT PRIMARY KEY,

    User_Key INT NOT NULL,
    Course_Key INT NOT NULL,

    Enrol_Date_Key INT NOT NULL,
    Unenrol_Date_Key INT,

    Status VARCHAR(30) NOT NULL DEFAULT 'Active',

    INDEX idx_fact_enrolment_user (User_Key),
    INDEX idx_fact_enrolment_course (Course_Key),
    INDEX idx_fact_enrolment_enrol_date (Enrol_Date_Key),
    INDEX idx_fact_enrolment_status (Status),

    CONSTRAINT fk_fact_enrolment_user
        FOREIGN KEY (User_Key)
        REFERENCES Dim_User(User_Key),

    CONSTRAINT fk_fact_enrolment_course
        FOREIGN KEY (Course_Key)
        REFERENCES Dim_Course(Course_Key),

    CONSTRAINT fk_fact_enrolment_enrol_date
        FOREIGN KEY (Enrol_Date_Key)
        REFERENCES Dim_Date(Date_Key),

    CONSTRAINT fk_fact_enrolment_unenrol_date
        FOREIGN KEY (Unenrol_Date_Key)
        REFERENCES Dim_Date(Date_Key)
) ENGINE=InnoDB;

CREATE TABLE Fact_Assignment_Submission (
    Submission_Key BIGINT AUTO_INCREMENT PRIMARY KEY,

    User_Key INT NOT NULL,
    Course_Key INT NOT NULL,
    Activity_Key INT NOT NULL,

    Submit_Date_Key INT,
    Due_Date_Key INT,

    Attempt_Number INT NOT NULL DEFAULT 0,

    Submission_Status VARCHAR(30) NOT NULL,

    Is_Submitted_On_Time BOOLEAN,

    Grade DECIMAL(10,2),

    Is_Graded BOOLEAN NOT NULL DEFAULT FALSE,

    Feedback_Comment TEXT,

    INDEX idx_fact_assignment_user (User_Key),
    INDEX idx_fact_assignment_course (Course_Key),
    INDEX idx_fact_assignment_activity (Activity_Key),
    INDEX idx_fact_assignment_submit_date (Submit_Date_Key),
    INDEX idx_fact_assignment_due_date (Due_Date_Key),
    INDEX idx_fact_assignment_status (Submission_Status),

    CONSTRAINT fk_fact_assignment_user
        FOREIGN KEY (User_Key)
        REFERENCES Dim_User(User_Key),

    CONSTRAINT fk_fact_assignment_course
        FOREIGN KEY (Course_Key)
        REFERENCES Dim_Course(Course_Key),

    CONSTRAINT fk_fact_assignment_activity
        FOREIGN KEY (Activity_Key)
        REFERENCES Dim_Activity(Activity_Key),

    CONSTRAINT fk_fact_assignment_submit_date
        FOREIGN KEY (Submit_Date_Key)
        REFERENCES Dim_Date(Date_Key),

    CONSTRAINT fk_fact_assignment_due_date
        FOREIGN KEY (Due_Date_Key)
        REFERENCES Dim_Date(Date_Key)
) ENGINE=InnoDB;

CREATE TABLE Fact_Course_Grade (
    Grade_Key BIGINT AUTO_INCREMENT PRIMARY KEY,

    User_Key INT NOT NULL,
    Course_Key INT NOT NULL,

    Grade_Item_ID BIGINT NOT NULL,

    Grade_Item_Name VARCHAR(255),

    Grade_Item_Type VARCHAR(50),

    Activity_Key INT,

    Date_Key INT,

    Grade DECIMAL(10,4),

    Max_Grade DECIMAL(10,4),

    Grade_Percentage DECIMAL(7,4),

    Is_Passed BOOLEAN,

    INDEX idx_fact_grade_user (User_Key),
    INDEX idx_fact_grade_course (Course_Key),
    INDEX idx_fact_grade_item (Grade_Item_ID),
    INDEX idx_fact_grade_activity (Activity_Key),
    INDEX idx_fact_grade_date (Date_Key),

    CONSTRAINT fk_fact_grade_user
        FOREIGN KEY (User_Key)
        REFERENCES Dim_User(User_Key),

    CONSTRAINT fk_fact_grade_course
        FOREIGN KEY (Course_Key)
        REFERENCES Dim_Course(Course_Key),

    CONSTRAINT fk_fact_grade_activity
        FOREIGN KEY (Activity_Key)
        REFERENCES Dim_Activity(Activity_Key),

    CONSTRAINT fk_fact_grade_date
        FOREIGN KEY (Date_Key)
        REFERENCES Dim_Date(Date_Key)
) ENGINE=InnoDB;

CREATE TABLE Fact_Daily_Engagement (
    Engagement_Key BIGINT AUTO_INCREMENT PRIMARY KEY,

    User_Key INT NOT NULL,
    Course_Key INT NOT NULL,
    Date_Key INT NOT NULL,

    Time_Spent_Seconds BIGINT NOT NULL DEFAULT 0,

    Last_Access_Time DATETIME,

    INDEX idx_fact_daily_user (User_Key),
    INDEX idx_fact_daily_course (Course_Key),
    INDEX idx_fact_daily_date (Date_Key),

    CONSTRAINT fk_fact_daily_user
        FOREIGN KEY (User_Key)
        REFERENCES Dim_User(User_Key),

    CONSTRAINT fk_fact_daily_course
        FOREIGN KEY (Course_Key)
        REFERENCES Dim_Course(Course_Key),

    CONSTRAINT fk_fact_daily_date
        FOREIGN KEY (Date_Key)
        REFERENCES Dim_Date(Date_Key)
) ENGINE=InnoDB;

CREATE TABLE Fact_Module_Engagement (
    Module_Engagement_Key BIGINT AUTO_INCREMENT PRIMARY KEY,

    User_Key INT NOT NULL,
    Course_Key INT NOT NULL,
    Activity_Key INT NOT NULL,
    Date_Key INT NOT NULL,

    Time_Spent_Seconds BIGINT NOT NULL DEFAULT 0,

    INDEX idx_fact_module_user (User_Key),
    INDEX idx_fact_module_course (Course_Key),
    INDEX idx_fact_module_activity (Activity_Key),
    INDEX idx_fact_module_date (Date_Key),

    CONSTRAINT fk_fact_module_user
        FOREIGN KEY (User_Key)
        REFERENCES Dim_User(User_Key),

    CONSTRAINT fk_fact_module_course
        FOREIGN KEY (Course_Key)
        REFERENCES Dim_Course(Course_Key),

    CONSTRAINT fk_fact_module_activity
        FOREIGN KEY (Activity_Key)
        REFERENCES Dim_Activity(Activity_Key),

    CONSTRAINT fk_fact_module_date
        FOREIGN KEY (Date_Key)
        REFERENCES Dim_Date(Date_Key)
) ENGINE=InnoDB;

SHOW TABLES;