USE lms_datawarehouse;

CREATE TABLE IF NOT EXISTS Teacher_Schedule (
    Schedule_ID BIGINT AUTO_INCREMENT PRIMARY KEY,

    Teacher_User_Key INT NOT NULL,

    Event_Date DATE NOT NULL,

    Event_Time TIME NULL,

    Title VARCHAR(255) NOT NULL,

    Event_Type VARCHAR(30) NOT NULL DEFAULT 'class',

    Description TEXT NULL,

    Created_At DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,

    Updated_At DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
        ON UPDATE CURRENT_TIMESTAMP,

    CONSTRAINT fk_teacher_schedule_user
        FOREIGN KEY (Teacher_User_Key)
        REFERENCES Dim_User(User_Key)
        ON DELETE CASCADE
        ON UPDATE CASCADE,

    INDEX idx_teacher_schedule_teacher (
        Teacher_User_Key
    ),

    INDEX idx_teacher_schedule_date (
        Event_Date
    ),

    INDEX idx_teacher_schedule_teacher_date (
        Teacher_User_Key,
        Event_Date
    )
);