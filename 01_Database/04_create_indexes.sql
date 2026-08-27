USE lms_datawarehouse;

CREATE INDEX idx_user_role_active
ON Dim_User (Primary_Role, Is_Active);

CREATE INDEX idx_course_visible
ON Dim_Course (Is_Visible);

CREATE INDEX idx_activity_course_type
ON Dim_Activity (Course_Key, Activity_Type);

CREATE INDEX idx_enrolment_user_course
ON Fact_Enrolment (User_Key, Course_Key);

CREATE INDEX idx_enrolment_course_status
ON Fact_Enrolment (Course_Key, Status);

CREATE INDEX idx_assignment_course_status
ON Fact_Assignment_Submission
    (Course_Key, Submission_Status);

CREATE INDEX idx_assignment_user_activity
ON Fact_Assignment_Submission
    (User_Key, Activity_Key);

CREATE INDEX idx_grade_course_user
ON Fact_Course_Grade
    (Course_Key, User_Key);

CREATE INDEX idx_grade_course_item
ON Fact_Course_Grade
    (Course_Key, Grade_Item_ID);

CREATE INDEX idx_daily_course_date
ON Fact_Daily_Engagement
    (Course_Key, Date_Key);

CREATE INDEX idx_daily_user_date
ON Fact_Daily_Engagement
    (User_Key, Date_Key);

CREATE INDEX idx_module_course_date
ON Fact_Module_Engagement
    (Course_Key, Date_Key);

CREATE INDEX idx_module_user_date
ON Fact_Module_Engagement
    (User_Key, Date_Key);

CREATE INDEX idx_module_activity_date
ON Fact_Module_Engagement
    (Activity_Key, Date_Key);

SHOW INDEX FROM Dim_User;
SHOW INDEX FROM Dim_Course;
SHOW INDEX FROM Dim_Activity;

SHOW INDEX FROM Fact_Enrolment;
SHOW INDEX FROM Fact_Assignment_Submission;
SHOW INDEX FROM Fact_Course_Grade;
SHOW INDEX FROM Fact_Daily_Engagement;
SHOW INDEX FROM Fact_Module_Engagement;