# LMS DATA VISUALIZATION DASHBOARD — MASTER SPECIFICATION

> **Tài liệu tổng hợp dùng làm “single source of truth” cho đồ án**
>
> **Tên đề tài:** Xây dựng dashboard cho giảng viên và sinh viên trên hệ thống LMS  
> **Bản chất hệ thống:** Ứng dụng **trực quan hóa và phân tích dữ liệu LMS**, KHÔNG phải hệ thống LMS thay thế Moodle.  
> **Công nghệ chính:** React, Node.js/Express, MySQL, Power BI, Git/GitHub.  
> **Nguồn dữ liệu hiện tại:** Dữ liệu Moodle giả lập/synthetic theo subset schema cần cho đồ án.  
> **Data Warehouse:** `lms_datawarehouse`  
> **Synthetic Moodle Source:** `lms_moodle_source`

---

# 1. MỤC TIÊU ĐỀ TÀI

Đồ án xây dựng một hệ thống dashboard hỗ trợ **sinh viên** và **giảng viên** quan sát, theo dõi và phân tích dữ liệu học tập/giảng dạy được lấy từ LMS.

Hệ thống tập trung vào:

- Trực quan hóa dữ liệu học tập.
- Tổng hợp KPI.
- Theo dõi tiến độ học tập.
- Theo dõi điểm số.
- Theo dõi tình trạng nộp bài.
- Theo dõi mức độ tương tác/thời gian học.
- Drill-down từ mức tổng quan → môn học → hoạt động → sinh viên.
- Hỗ trợ giảng viên phát hiện sinh viên có dấu hiệu học tập kém hoặc ít tương tác.
- Hỗ trợ sinh viên tự theo dõi kết quả và hành vi học tập của chính mình.
- Cung cấp dữ liệu có cấu trúc cho React Dashboard và Power BI.

---

# 2. PHẠM VI HỆ THỐNG — CỰC KỲ QUAN TRỌNG

## 2.1. Hệ thống này LÀ gì?

Đây là:

> **LMS Data Visualization / Learning Analytics Dashboard**

Nó nằm **sau LMS**, đọc dữ liệu đã phát sinh trong LMS, ETL dữ liệu sang Data Warehouse, sau đó cung cấp các dashboard phân tích.

Luồng chính:

```text
Moodle LMS / Moodle-like Source
            ↓
       Synthetic Source
       lms_moodle_source
            ↓
            ETL
            ↓
       Data Warehouse
       lms_datawarehouse
            ↓
       Node.js REST API
         ↙          ↘
   React Dashboard   Power BI
```

## 2.2. Hệ thống này KHÔNG phải gì?

Hệ thống **không phải Moodle mới** và không được biến thành LMS đầy đủ.

### Không làm các chức năng LMS chính như:

- Tạo khóa học.
- Chỉnh sửa khóa học.
- Xóa khóa học.
- Upload bài giảng.
- Quản lý file tài liệu học tập.
- Tạo assignment trực tiếp.
- Sửa assignment.
- Sinh viên upload/nộp bài.
- Làm quiz trực tiếp.
- Tạo câu hỏi quiz.
- Chấm bài trực tiếp.
- Nhập điểm trực tiếp.
- Quản lý enrollment.
- Quản lý role/quyền Moodle.
- Quản lý forum.
- Chat/nhắn tin như LMS.
- Quản lý nội dung học tập.
- Thay thế Moodle.

Nếu có hiển thị Assignment, Quiz, điểm, feedback... thì chỉ với mục đích **phân tích/trực quan hóa dữ liệu đã có**.

---

# 3. ĐỐI TƯỢNG SỬ DỤNG

## 3.1. Sinh viên

Sinh viên chỉ xem và phân tích dữ liệu liên quan đến quá trình học tập của chính mình.

## 3.2. Giảng viên

Giảng viên xem dữ liệu tổng hợp của các môn mình phụ trách, hoạt động học tập và hiệu suất sinh viên.

> Xác thực/SSO với Moodle hiện **chưa phải phần đã triển khai**. Trong giai đoạn phát triển có thể dùng dữ liệu role/user trong DW để mô phỏng phân quyền. Nếu GVHD yêu cầu đăng nhập thật thì tích hợp sau.

---

# 4. KIẾN TRÚC TỔNG THỂ

```text
┌──────────────────────────────────────────────┐
│                 MOODLE / LMS                 │
│       Nguồn nghiệp vụ trong thực tế          │
└──────────────────────┬───────────────────────┘
                       │
                       │ mô phỏng dữ liệu
                       ▼
┌──────────────────────────────────────────────┐
│          lms_moodle_source (MySQL)           │
│       Synthetic Moodle-like Source           │
└──────────────────────┬───────────────────────┘
                       │
                       │ ETL SQL
                       ▼
┌──────────────────────────────────────────────┐
│         lms_datawarehouse (MySQL)            │
│   Dimensions + Facts + Data Validation       │
└──────────────────────┬───────────────────────┘
                       │
             ┌─────────┴─────────┐
             ▼                   ▼
┌───────────────────────┐  ┌───────────────────┐
│ Node.js + Express API │  │     Power BI      │
└───────────┬───────────┘  └───────────────────┘
            │
            ▼
┌──────────────────────────────────────────────┐
│               React Frontend                 │
│        Student + Lecturer Dashboard          │
└──────────────────────────────────────────────┘
```

---

# 5. SYNTHETIC MOODLE SOURCE DATABASE

Database:

```text
lms_moodle_source
```

Dữ liệu hiện tại là **synthetic** vì không có dữ liệu LMS thật được cung cấp cho nhóm.

Các bảng nguồn chỉ giữ subset cột cần cho đồ án, không khẳng định là full schema Moodle.

## 5.1. Core source tables

### `mdl_user`

Thông tin người dùng.

Các cột hiện dùng:

- `id`
- `username`
- `idnumber`
- `firstname`
- `lastname`
- `email`
- `suspended`
- `deleted`
- `firstaccess`
- `lastaccess`
- `timecreated`
- `timemodified`

Synthetic data hiện tại:

- 14 users
- 2 giảng viên
- 12 sinh viên

### `mdl_course_categories`

Danh mục khóa học.

Synthetic data:

- 4 categories

### `mdl_course`

Thông tin khóa học.

Synthetic data:

- 4 courses

| Moodle Course ID | Code | Course |
|---|---|---|
| 101 | CS301 | Cơ sở dữ liệu |
| 102 | WEB302 | Lập trình Web |
| 103 | GAME401 | Phát triển ứng dụng Game nâng cao |
| 104 | AI401 | Trí tuệ nhân tạo |

Mỗi course hiện:

- bắt đầu: `2026-01-05`
- kết thúc: `2026-05-30`
- visible = 1

### `mdl_enrol`

Cấu hình enrollment theo course.

Synthetic data: 4 records.

### `mdl_user_enrolments`

Người dùng được enroll vào course.

Synthetic data:

- 24 enrollments
- mỗi course có 6 sinh viên

### `mdl_role`

Role synthetic:

- teacher
- editingteacher
- student

### `mdl_context`

Context course.

Synthetic data: 4 records.

### `mdl_role_assignments`

Gán role vào user/context.

Synthetic data: 28 records.

---

# 6. SOURCE CHO ACTIVITY

Được bổ sung trong:

```text
09_extend_moodle_activity_source.sql
```

## `mdl_modules`

Module type:

- assign
- quiz

Synthetic data: 2 records.

## `mdl_course_modules`

Mapping activity vào course.

Synthetic data: 12 course modules.

Mỗi course:

- 2 assignments
- 1 quiz

## `mdl_assign`

Synthetic data: 8 assignments.

## `mdl_quiz`

Synthetic data: 4 quizzes.

Tổng activity:

```text
8 assignment + 4 quiz = 12
```

---

# 7. SOURCE CHO ASSIGNMENT SUBMISSION

Được bổ sung trong:

```text
10_extend_moodle_submission_source.sql
```

## `mdl_assign_submission`

Synthetic data: 48 submission records.

Trạng thái:

```text
draft      = 8
submitted  = 40
```

## `mdl_assign_grades`

Synthetic data: 30 records đã chấm.

## `mdl_assignfeedback_comments`

Synthetic data: 30 feedback comments.

Vì vậy:

```text
48 submission records
30 đã chấm
18 chưa chấm
```

---

# 8. SOURCE CHO GRADE

Được bổ sung trong:

```text
11_extend_moodle_grade_source.sql
```

## `mdl_grade_items`

Synthetic data:

```text
12 grade items
├── assign = 8
└── quiz   = 4
```

## `mdl_grade_grades`

Synthetic data:

```text
54 grade records
├── assignment grades = 30
└── quiz grades       = 24
```

---

# 9. SOURCE CHO ENGAGEMENT

Đây là các bảng custom/synthetic phục vụ Learning Analytics, không phải bảng Moodle core chuẩn.

## `mdl_local_course_daily_engagement`

File:

```text
12_extend_moodle_engagement_source.sql
```

Grain:

> 1 dòng = 1 user + 1 course + 1 ngày

Columns:

- `id`
- `userid`
- `courseid`
- `activitydate`
- `time_spent_seconds`
- `last_access_time`

Synthetic data:

```text
1512 records
```

Mỗi course:

```text
378 records
```

## `mdl_local_module_daily_engagement`

File:

```text
13_extend_moodle_module_engagement_source.sql
```

Grain:

> 1 dòng = 1 user + 1 course module/activity + 1 ngày

Columns:

- `id`
- `userid`
- `courseid`
- `coursemoduleid`
- `activitydate`
- `time_spent_seconds`

Synthetic data:

```text
4536 records
```

Điều kiện kiểm tra đã PASS:

```text
SUM(course daily time)
=
SUM(module daily time)
```

---

# 10. DATA WAREHOUSE

Database:

```text
lms_datawarehouse
```

Hiện Data Warehouse có đúng **9 bảng**:

```text
Dimensions
├── Dim_User
├── Dim_Course
├── Dim_Date
└── Dim_Activity

Facts
├── Fact_Enrolment
├── Fact_Assignment_Submission
├── Fact_Course_Grade
├── Fact_Daily_Engagement
└── Fact_Module_Engagement
```

---

# 11. DIMENSIONS

## `Dim_User`

Grain: 1 dòng = 1 Moodle user.

Columns:

- `User_Key`
- `Moodle_User_ID`
- `Username`
- `First_Name`
- `Last_Name`
- `Full_Name`
- `Email`
- `Primary_Role`
- `Is_Active`

### Lưu ý quan trọng

`Dim_User` **KHÔNG có**:

- `Student_Code`
- `Homeroom_Cohort_Key`

File cũ `08_etl_dimensions_old.sql` từng dùng 2 cột trên và đã được đánh dấu là file archive/không sử dụng.

Current rows:

```text
14
├── Student = 12
└── Teacher = 2
```

## `Dim_Course`

Grain: 1 dòng = 1 course.

Columns:

- `Course_Key`
- `Moodle_Course_ID`
- `Course_Code`
- `Course_Name`
- `Category_ID`
- `Category_Name`
- `Start_Date`
- `End_Date`
- `Is_Visible`

Current rows: 4.

Không có `Dim_Category` riêng. Category được denormalize vào `Dim_Course`.

## `Dim_Date`

Grain: 1 dòng = 1 calendar date.

Columns:

- `Date_Key`
- `Full_Date`
- `Day_Of_Month`
- `Month_Number`
- `Month_Name`
- `Quarter_Number`
- `Year_Number`
- `Week_Number`
- `Day_Of_Week_Number`
- `Day_Of_Week_Name`
- `Is_Weekend`
- `Academic_Semester`

Date range:

```text
2020-01-01 → 2035-12-31
```

Current rows: 5844.

## `Dim_Activity`

Grain: 1 dòng = 1 activity/course module.

Columns:

- `Activity_Key`
- `Moodle_Module_ID`
- `Course_Key`
- `Activity_Type`
- `Activity_Name`
- `Due_Date_Key`
- `Max_Grade`
- `Is_Visible`

Current rows:

```text
12
├── assign = 8
└── quiz   = 4
```

---

# 12. FACT TABLES

## `Fact_Enrolment`

Grain: 1 dòng = 1 user được enroll vào 1 course tại một thời điểm.

Columns:

- `Enrolment_Key`
- `User_Key`
- `Course_Key`
- `Enrol_Date_Key`
- `Unenrol_Date_Key`
- `Status`

Current rows: 24.

Current status: `Active = 24`.

## `Fact_Assignment_Submission`

Grain: 1 dòng = 1 attempt assignment của 1 user.

Columns:

- `Submission_Key`
- `User_Key`
- `Course_Key`
- `Activity_Key`
- `Submit_Date_Key`
- `Due_Date_Key`
- `Attempt_Number`
- `Submission_Status`
- `Is_Submitted_On_Time`
- `Grade`
- `Is_Graded`
- `Feedback_Comment`

Current rows: 48.

```text
draft      = 8
submitted  = 40
graded     = 30
not graded = 18
```

## `Fact_Course_Grade`

Grain: 1 dòng = 1 điểm của 1 user cho 1 grade item.

Columns:

- `Grade_Key`
- `User_Key`
- `Course_Key`
- `Grade_Item_ID`
- `Grade_Item_Name`
- `Grade_Item_Type`
- `Activity_Key`
- `Date_Key`
- `Grade`
- `Max_Grade`
- `Grade_Percentage`
- `Is_Passed`

Current rows:

```text
54
├── assign = 30
└── quiz   = 24
```

### Synthetic limitation

Dataset hiện tạo grade >= khoảng 5/10 và grade pass = 50%, vì vậy phần lớn/toàn bộ grade có thể đang pass. Nếu dashboard cần biểu đồ Pass/Fail có ý nghĩa hơn thì nên chỉnh synthetic seed sau.

## `Fact_Daily_Engagement`

Grain: 1 dòng = 1 user + 1 course + 1 ngày.

Columns:

- `Engagement_Key`
- `User_Key`
- `Course_Key`
- `Date_Key`
- `Time_Spent_Seconds`
- `Last_Access_Time`

Current rows: 1512.

## `Fact_Module_Engagement`

Grain: 1 dòng = 1 user + 1 course + 1 activity + 1 ngày.

Columns:

- `Module_Engagement_Key`
- `User_Key`
- `Course_Key`
- `Activity_Key`
- `Date_Key`
- `Time_Spent_Seconds`

Current rows: 4536.

---

# 13. DATA WAREHOUSE ROW COUNT CHUẨN HIỆN TẠI

| Table | Rows |
|---|---:|
| Dim_User | 14 |
| Dim_Course | 4 |
| Dim_Date | 5844 |
| Dim_Activity | 12 |
| Fact_Enrolment | 24 |
| Fact_Assignment_Submission | 48 |
| Fact_Course_Grade | 54 |
| Fact_Daily_Engagement | 1512 |
| Fact_Module_Engagement | 4536 |

---

# 14. ETL PIPELINE

Folder:

```text
02_ETL/
```

Current files:

```text
01_etl_dim_user.sql
02_etl_dim_course.sql
03_etl_dim_activity.sql
04_etl_fact_enrolment.sql
05_etl_fact_assignment_submission.sql
06_etl_fact_course_grade.sql
07_etl_fact_daily_engagement.sql
08_etl_fact_module_engagement.sql
09_validate_datawarehouse.sql
```

ETL flow:

```text
Source
  ↓
temporary staging
  ↓
lookup Dimension surrogate keys
  ↓
UPDATE existing records
  ↓
INSERT new records
  ↓
validation queries
```

Từ `Dim_Activity` trở đi, ETL ưu tiên `UPDATE + INSERT` thay vì xóa toàn bảng để không làm thay đổi surrogate key đang được Facts tham chiếu.

---

# 15. DATA QUALITY / VALIDATION

File:

```text
02_ETL/09_validate_datawarehouse.sql
```

Đã kiểm tra PASS:

- Row count 9 bảng.
- Duplicate business key Dimensions = 0.
- Duplicate natural key Facts = 0.
- Invalid `User_Key` FK = 0.
- Invalid `Course_Key` FK = 0.
- Draft có Submit_Date sai = 0.
- Submitted thiếu Submit_Date = 0.
- Grade percentage ngoài 0–100 = 0.
- Engagement time âm = 0.
- Daily engagement total time = Module engagement total time.

=> Database + ETL vòng 1 đã hoàn thành.

---

# 16. CẤU TRÚC PROJECT HIỆN TẠI

```text
DoAnChuyenNganh/
├── 01_Database/
│   ├── 01_create_database.sql
│   ├── 02_create_dimensions.sql
│   ├── 03_create_facts.sql
│   ├── 04_create_indexes.sql
│   ├── 05_seed_date.sql
│   ├── 06_create_moodle_source.sql
│   ├── 07_seed_moodle_source.sql
│   ├── 08_etl_dimensions_old.sql
│   ├── 09_extend_moodle_activity_source.sql
│   ├── 10_extend_moodle_submission_source.sql
│   ├── 11_extend_moodle_grade_source.sql
│   ├── 12_extend_moodle_engagement_source.sql
│   └── 13_extend_moodle_module_engagement_source.sql
│
├── 02_ETL/
│   ├── 01_etl_dim_user.sql
│   ├── 02_etl_dim_course.sql
│   ├── 03_etl_dim_activity.sql
│   ├── 04_etl_fact_enrolment.sql
│   ├── 05_etl_fact_assignment_submission.sql
│   ├── 06_etl_fact_course_grade.sql
│   ├── 07_etl_fact_daily_engagement.sql
│   ├── 08_etl_fact_module_engagement.sql
│   └── 09_validate_datawarehouse.sql
│
├── 03_Backend/
├── 04_Frontend/
├── 05_PowerBI/
└── 06_Documentation/
```

---

# 17. BACKEND

Technology:

```text
Node.js
Express
mysql2/promise
cors
dotenv
nodemon
```

Current basic structure:

```text
03_Backend/
├── src/
│   ├── config/
│   │   └── db.js
│   ├── controllers/
│   │   └── dashboard.controller.js
│   ├── routes/
│   │   └── dashboard.routes.js
│   ├── services/
│   │   └── dashboard.service.js
│   └── app.js
├── .env
├── .gitignore
└── package.json
```

Layering:

```text
Route
  ↓
Controller
  ↓
Service
  ↓
MySQL Data Warehouse
```

---

# 18. BACKEND ENDPOINTS ĐÃ HOÀN THÀNH

## Test Database

```http
GET /api/test-db
```

PASS với:

```text
totalUsers      = 14
totalCourses    = 4
totalActivities = 12
```

## Dashboard Overview

```http
GET /api/dashboard/overview
```

KPI hiện có:

- totalStudents
- totalCourses
- totalActivities
- totalActiveEnrolments
- totalAssignmentRecords
- totalSubmitted
- averageGradePercentage
- totalEngagementHours

## Course List Dashboard

```http
GET /api/dashboard/courses
```

Mỗi course trả:

- courseKey
- moodleCourseId
- courseCode
- courseName
- categoryName
- startDate
- endDate
- isVisible
- totalStudents
- totalActivities
- totalAssignments
- totalQuizzes
- totalSubmitted
- totalSubmittedOnTime
- averageGradePercentage
- totalEngagementHours

Expected:

```text
4 courses
mỗi course:
6 students
3 activities
2 assignments
1 quiz
```

## Course Detail

```http
GET /api/dashboard/courses/:courseKey
```

Response gồm:

```text
course
kpis
activities[]
```

CS301 đã test PASS:

```text
totalStudents = 6
totalActivities = 3
totalAssignments = 2
totalQuizzes = 1
totalSubmitted = 10
totalSubmittedOnTime = 7
averageGradePercentage = 76.93
totalEngagementHours = 620.81
activities.length = 3
```

---

# 19. QUY TẮC BACKEND QUAN TRỌNG

## Không hard-code surrogate key

Ví dụ `Course_Key` hiện có thể là `8, 9, 10, 11` do Dimension từng được load lại.

Không giả định `Course_Key = 1,2,3,4`.

Frontend phải dùng key API trả về.

## Date timezone

MySQL `DATE` nếu trả thẳng qua Node có thể trở thành UTC datetime và lệch ngày.

Do đó query API nên dùng:

```sql
DATE_FORMAT(Start_Date, '%Y-%m-%d')
```

Expected frontend:

```text
2026-01-05
```

không phải UTC datetime lệch ngày.

## DECIMAL

Một số field MySQL DECIMAL được `mysql2` trả dưới dạng string, ví dụ:

```json
"76.93"
```

Frontend có thể dùng `Number(value)` trước khi chart/calculation.

---

# 20. BACKEND API CẦN LÀM TIẾP

Các endpoint dưới đây là **planned core API**, phù hợp dữ liệu DW hiện có.

## Course Students

```http
GET /api/dashboard/courses/:courseKey/students
```

Mỗi student nên trả:

- userKey
- moodleUserId
- fullName
- email
- averageGradePercentage
- assignmentSubmitted
- assignmentTotal
- submittedOnTime
- lateSubmissions
- gradedAssignments
- totalEngagementHours
- lastAccessTime

## Student Detail

Đề xuất:

```http
GET /api/dashboard/students/:userKey
```

hoặc:

```http
GET /api/dashboard/courses/:courseKey/students/:userKey
```

Response:

- student profile
- enrolled courses
- grades
- submissions
- engagement
- activities

## Course Grade Analytics

```http
GET /api/dashboard/courses/:courseKey/grades
```

Dữ liệu:

- average grade
- min/max
- grade distribution
- grade by activity
- pass/fail
- student table/ranking

## Course Submission Analytics

```http
GET /api/dashboard/courses/:courseKey/submissions
```

Dữ liệu:

- submitted
- draft
- on time
- late
- graded
- not graded
- submission by assignment
- feedback availability

## Course Engagement Analytics

```http
GET /api/dashboard/courses/:courseKey/engagement
```

Dữ liệu:

- daily engagement trend
- total hours
- average hours/student
- engagement by activity
- most/least engaged activity
- last access
- student engagement table

## Student Personal Dashboard API

Đề xuất:

```http
GET /api/student/:userKey/overview
GET /api/student/:userKey/courses
GET /api/student/:userKey/courses/:courseKey
GET /api/student/:userKey/grades
GET /api/student/:userKey/submissions
GET /api/student/:userKey/engagement
```

Có thể gom endpoint nếu frontend muốn đơn giản.

---

# 21. FRONTEND — NGUYÊN TẮC CHUNG

Frontend dùng React.

Frontend phải làm rõ ngay từ UI:

> Đây là **Dashboard phân tích dữ liệu LMS**, không phải giao diện học LMS.

Các màn hình tập trung vào:

- KPI cards
- chart
- table
- trend
- filter
- drill-down
- status
- insight

Không có form nghiệp vụ kiểu “Tạo khóa học”, “Nộp bài”, “Chấm bài”.

---

# 22. FRONTEND GIẢNG VIÊN — CHỨC NĂNG CORE

## Lecturer Overview Dashboard

### KPI cards

- Tổng số sinh viên.
- Tổng số môn đang theo dõi.
- Tổng activity.
- Tổng enrollment.
- Tổng assignment submission.
- Tỷ lệ submission.
- Điểm trung bình.
- Tổng thời gian engagement.

### Visualization

- Điểm trung bình theo course.
- Engagement hours theo course.
- Submission status.
- On-time vs late.
- Assignment vs quiz grade.
- Course performance comparison.

### Filters

- Course.
- Date range.
- Category.
- Activity type.

---

# 23. FRONTEND GIẢNG VIÊN — COURSE LIST

Mỗi course card/row:

- Course code.
- Course name.
- Category.
- Start/end date.
- Student count.
- Activity count.
- Assignment count.
- Quiz count.
- Submitted count.
- On-time count.
- Average grade.
- Engagement hours.

Action hợp lệ:

```text
View Analytics / Xem chi tiết
```

Không có:

```text
Edit Course
Delete Course
Create Assignment
```

---

# 24. FRONTEND GIẢNG VIÊN — COURSE DETAIL

## Header

- Course code.
- Course name.
- Category.
- Start/end date.

## KPI

- Students.
- Activities.
- Assignments.
- Quizzes.
- Submitted.
- On-time.
- Average grade.
- Engagement hours.

## Activity table

- Activity name.
- Type.
- Due date.
- Max grade.
- Submitted count.
- On-time count.
- Average grade.
- Visibility.

### Lưu ý Quiz

Quiz có thể `totalSubmitted = 0` trong `Fact_Assignment_Submission`, nhưng vẫn có điểm trong `Fact_Course_Grade`. Đây là logic đúng vì submission fact hiện chỉ dành cho assignment.

---

# 25. FRONTEND GIẢNG VIÊN — STUDENT PERFORMANCE

Route frontend gợi ý:

```text
/lecturer/courses/:courseKey/students
```

Columns:

- Student.
- Email.
- Average grade.
- Submitted assignments.
- Submission rate.
- On-time submissions.
- Late submissions.
- Graded assignments.
- Engagement hours.
- Last access.
- Risk/status.

Sort:

- Điểm thấp → cao.
- Engagement thấp → cao.
- Submission thấp → cao.
- Last access cũ → mới.

Search:

- Tên sinh viên.
- Email.

Filter:

- Submission status.
- Grade range.
- Engagement range.

---

# 26. FRONTEND GIẢNG VIÊN — STUDENT DETAIL

Giảng viên click vào 1 student trong course.

## Student summary

- Full name.
- Email.
- Course.
- Average grade.
- Submission rate.
- On-time rate.
- Engagement hours.
- Last access.

## Grade section

- Activity.
- Grade.
- Max grade.
- Grade percentage.
- Pass status.
- Grade date.

## Submission section

- Assignment.
- Due date.
- Submit date.
- Status.
- On-time/late.
- Grade.
- Is graded.
- Feedback.

## Engagement section

- Daily time trend.
- Time by activity.
- Total learning hours.
- Last access.

---

# 27. FRONTEND GIẢNG VIÊN — ASSIGNMENT ANALYTICS

Mục tiêu: phân tích hành vi nộp bài, KHÔNG quản lý assignment.

Dashboard:

- Total assignment records.
- Submitted.
- Draft.
- On-time.
- Late.
- Graded.
- Not graded.

Charts:

- Submission status distribution.
- On-time vs late.
- Submission count theo assignment.
- Average grade theo assignment.

Table:

- Assignment.
- Due date.
- Submission count.
- On-time.
- Late.
- Graded.
- Average grade.

---

# 28. FRONTEND GIẢNG VIÊN — GRADE ANALYTICS

Dashboard:

- Average grade.
- Minimum.
- Maximum.
- Average percentage.
- Pass rate.

Charts:

- Average grade by course.
- Average grade by activity.
- Assignment vs Quiz performance.
- Grade distribution.

Table:

- Student.
- Grade item.
- Type.
- Grade.
- Max grade.
- Percentage.
- Pass/fail.

### Current synthetic limitation

Dữ liệu pass/fail hiện có thể bị lệch về Pass vì seed grade đang >= ngưỡng pass. Nếu dùng biểu đồ Pass/Fail trong demo, nên bổ sung vài synthetic fail records sau.

---

# 29. FRONTEND GIẢNG VIÊN — ENGAGEMENT ANALYTICS

Course-level:

- Total engagement hours.
- Average engagement/student.
- Daily engagement trend.
- Last access.
- Most active students.
- Least active students.

Module-level:

- Time spent by activity.
- Activity engagement ranking.
- Assignment vs quiz engagement.
- Engagement trend by activity.

Có thể dùng analytics status:

```text
High engagement
Normal
Low engagement
```

Nhưng threshold phải được nhóm định nghĩa rõ, không tự xem là quy tắc Moodle.

---

# 30. FRONTEND SINH VIÊN — PERSONAL OVERVIEW

KPI:

- Số môn đang học.
- Điểm trung bình.
- Tổng assignment.
- Số bài đã submitted.
- Số bài on-time.
- Số bài late/draft.
- Tổng engagement hours.
- Last access.

Charts:

- Điểm trung bình theo course.
- Engagement theo course.
- Submission status.
- Grade trend.
- Engagement trend.

---

# 31. FRONTEND SINH VIÊN — MY COURSES

Mỗi card:

- Course code.
- Course name.
- Category.
- Start/end date.
- Personal average grade.
- Assignment progress.
- Personal engagement hours.
- Last activity/access.

Action:

```text
View My Analytics
```

Không phải:

```text
Enter Course Content
Upload Assignment
Take Quiz
```

---

# 32. FRONTEND SINH VIÊN — PERSONAL COURSE DETAIL

## Course info

- Course code/name.
- Category.
- Start/end.

## Personal KPIs

- Average grade.
- Submitted assignments.
- On-time submissions.
- Late submissions.
- Engagement hours.
- Last access.

## Activities

Mỗi activity:

- Name.
- Type.
- Due date.
- Max grade.
- Personal grade.
- Grade percentage.
- Submission status nếu là assignment.
- On-time/late.
- Feedback nếu có.

---

# 33. FRONTEND SINH VIÊN — GRADES

Table:

- Course.
- Grade item.
- Activity type.
- Grade.
- Max grade.
- Percentage.
- Pass/fail.
- Grade date.

Charts:

- Grade by course.
- Grade by activity.
- Grade trend over time.
- Assignment vs quiz performance.

---

# 34. FRONTEND SINH VIÊN — SUBMISSIONS

Chỉ trực quan hóa submission.

Thông tin:

- Assignment.
- Course.
- Due date.
- Submit date.
- Status.
- On-time/late.
- Grade.
- Graded/not graded.
- Feedback.

Các trạng thái visualization:

```text
Submitted on time
Submitted late
Draft
Not graded
Graded
```

Không có nút:

```text
Submit
Resubmit
Upload file
```

---

# 35. FRONTEND SINH VIÊN — ENGAGEMENT

Dashboard cá nhân:

- Total time spent.
- Time spent by course.
- Time spent by activity.
- Daily learning time.
- Weekly/monthly trend.
- Last access.

Có thể thêm:

- Most engaged course.
- Most engaged activity.
- Days with no activity.

Các insight chỉ mang tính phân tích dữ liệu, không phải kết luận học thuật tuyệt đối.

---

# 36. FRONTEND SINH VIÊN — PERSONAL INSIGHTS

Có thể hiển thị rule-based insight như:

```text
Bạn có bài nộp trễ trong môn X.
Bạn đang có assignment ở trạng thái draft.
Thời gian tương tác tuần này thấp hơn các tuần trước.
Điểm trung bình môn X thấp hơn các môn khác của bạn.
```

Đây là **analytics insight**, không phải notification engine LMS hoặc hệ thống AI cố vấn phức tạp.

---

# 37. SHARED FRONTEND COMPONENTS

Dùng chung cho cả 2 role:

## Layout

- Sidebar.
- Header.
- Breadcrumb.
- Main dashboard area.

## Components

- KPI Card.
- Course Card.
- Chart Card.
- Data Table.
- Status Badge.
- Filter Bar.
- Date Range Filter.
- Course Select.
- Loading State.
- Empty State.
- Error State.

## Visualization candidates

- Bar chart.
- Line chart.
- Pie/donut chart.
- Progress bar.
- Ranking table.

---

# 38. FILTERS NÊN HỖ TRỢ

Tùy màn hình:

- Course.
- Category.
- Date range.
- Activity type.
- Submission status.
- On-time/late.
- Graded/not graded.
- Student.
- Grade range.

Không cần implement tất cả ở phiên bản đầu tiên.

Ưu tiên:

1. Course.
2. Date range.
3. Activity type.
4. Student search.

---

# 39. DRILL-DOWN FLOW GIẢNG VIÊN

```text
Lecturer Overview
        ↓
Course List
        ↓
Course Detail
     ↙      ↘
Activities  Students
     ↓         ↓
Activity     Student Detail
Analytics       ↓
            Grade / Submission /
              Engagement
```

---

# 40. DRILL-DOWN FLOW SINH VIÊN

```text
Student Overview
        ↓
My Courses
        ↓
Personal Course Detail
      ↙    ↓     ↘
 Grades Submissions Engagement
```

---

# 41. KPI DEFINITIONS

## Total Students

Toàn hệ thống:

```text
COUNT Dim_User
WHERE Primary_Role = Student
AND Is_Active = 1
```

Theo course:

```text
COUNT Fact_Enrolment
WHERE Course_Key = ...
AND Status = Active
```

## Total Activities

```text
COUNT Dim_Activity
WHERE Is_Visible = 1
```

## Submission Count

```text
COUNT Fact_Assignment_Submission
WHERE Submission_Status = 'submitted'
```

## On-time Submission

```text
Submission_Status = 'submitted'
AND Is_Submitted_On_Time = 1
```

## Late Submission

```text
Submission_Status = 'submitted'
AND Is_Submitted_On_Time = 0
```

## Graded

```text
Is_Graded = 1
```

## Average Grade Percentage

```text
AVG(Fact_Course_Grade.Grade_Percentage)
```

## Total Engagement Hours

```text
SUM(Time_Spent_Seconds) / 3600
```

---

# 42. POWER BI

Power BI sử dụng cùng Data Warehouse, không cần database riêng.

Suggested pages:

## Page 1 — Executive Overview

- Students.
- Courses.
- Activities.
- Submissions.
- Average grade.
- Engagement.

## Page 2 — Course Analytics

- Course comparison.
- Students/course.
- Grade/course.
- Submission/course.
- Engagement/course.

## Page 3 — Assignment Analytics

- Draft vs submitted.
- On-time vs late.
- Graded vs not graded.
- Average grade by assignment.

## Page 4 — Student Performance

- Student table.
- Average grade.
- Submission rate.
- Engagement hours.

## Page 5 — Engagement

- Daily trend.
- Course engagement.
- Module engagement.
- Student engagement.

Power BI là kênh BI bổ sung; React là ứng dụng Web tương tác chính.

---

# 43. GIT / TEAM WORKFLOW

Project sử dụng Git/GitHub.

Nguyên tắc:

- Không code trực tiếp tất cả trên `main`.
- Thành viên có thể làm trên branch riêng.
- `git fetch origin`.
- Checkout đúng branch remote.
- Pull branch đó và làm tiếp.
- Chỉ merge vào `main` khi chức năng đã ổn.

Không đưa `.env` lên Git.

`.gitignore` Backend:

```text
node_modules/
.env
```

---

# 44. CÁC FILE DATABASE HIỆN TẠI

```text
01_Database/
01_create_database.sql
02_create_dimensions.sql
03_create_facts.sql
04_create_indexes.sql
05_seed_date.sql
06_create_moodle_source.sql
07_seed_moodle_source.sql
08_etl_dimensions_old.sql
09_extend_moodle_activity_source.sql
10_extend_moodle_submission_source.sql
11_extend_moodle_grade_source.sql
12_extend_moodle_engagement_source.sql
13_extend_moodle_module_engagement_source.sql
```

`08_etl_dimensions_old.sql`:

> Archive only — không chạy.

---

# 45. TRẠNG THÁI ĐỒ ÁN HIỆN TẠI

| Hạng mục | Trạng thái |
|---|---|
| Database DDL | DONE — vòng 1 |
| Synthetic Moodle Source | DONE — vòng 1 |
| Data Warehouse | DONE — 9 tables |
| ETL | DONE — 8 ETL files |
| Validation | DONE — PASS |
| Backend connection | DONE |
| `/api/test-db` | PASS |
| `/api/dashboard/overview` | PASS |
| `/api/dashboard/courses` | PASS |
| `/api/dashboard/courses/:courseKey` | PASS |
| Frontend | Chưa hoàn thiện |
| Power BI | Chưa hoàn thiện |
| Documentation/Report | Đang xây dựng |

---

# 46. ƯU TIÊN TRIỂN KHAI TIẾP THEO

## Phase A — Backend Lecturer

1. Course students endpoint.
2. Student detail endpoint.
3. Grade analytics endpoint.
4. Submission analytics endpoint.
5. Engagement analytics endpoint.

## Phase B — Lecturer Frontend

1. Dashboard Overview.
2. Courses.
3. Course Detail.
4. Student Performance.
5. Student Detail.
6. Grade Analytics.
7. Submission Analytics.
8. Engagement Analytics.

## Phase C — Student Backend

1. Personal overview.
2. Personal course detail.
3. Personal grades.
4. Personal submissions.
5. Personal engagement.

## Phase D — Student Frontend

1. Student Overview.
2. My Courses.
3. Course Analytics.
4. Grades.
5. Submissions.
6. Engagement.

## Phase E — Power BI

1. Connect DW.
2. Build relationships.
3. Measures.
4. Overview.
5. Course analytics.
6. Student analytics.
7. Engagement analytics.

## Phase F — Finalization

1. UI polish.
2. Responsive.
3. Error/loading/empty states.
4. Integration testing.
5. Screenshots.
6. Report.
7. Demo script.

---

# 47. CHỨC NĂNG CORE VS OPTIONAL

## Core — phải ưu tiên

### Lecturer

- Overview.
- Courses.
- Course detail.
- Student performance.
- Grade analytics.
- Assignment analytics.
- Engagement analytics.

### Student

- Personal overview.
- My courses.
- Personal course detail.
- Grades.
- Submission tracking.
- Engagement analytics.

## Optional nếu còn thời gian

- Export CSV.
- Export chart/image.
- Advanced comparison.
- Custom threshold for risk.
- More sophisticated alerts.
- Dark mode.
- Advanced pagination.
- Authentication/SSO integration.
- Real Moodle DB connector.

Không để optional làm chậm core.

---

# 48. NHỮNG THỨ TUYỆT ĐỐI KHÔNG NÊN THÊM VÀO SCOPE CORE

- Moodle clone.
- LMS course builder.
- File learning management.
- Quiz taking engine.
- Assignment upload.
- Grade input UI.
- Enrollment admin.
- Teacher authoring system.
- Chat/forum.
- Attendance system nếu không có dữ liệu.
- Notification service phức tạp.
- AI recommendation phức tạp.
- Microservices không cần thiết.

Các phần này sẽ làm đề tài lệch khỏi mục tiêu **Data Visualization / Learning Analytics**.

---

# 49. CÁCH MÔ TẢ ĐỀ TÀI TRONG BÁO CÁO

> Hệ thống được xây dựng dưới dạng một lớp phân tích và trực quan hóa dữ liệu nằm trên hệ thống LMS. Dữ liệu phát sinh từ LMS được trích xuất, biến đổi và nạp vào Data Warehouse. Từ Data Warehouse, hệ thống Node.js cung cấp REST API cho ứng dụng React và dữ liệu phân tích cho Power BI. Ứng dụng không thay thế các chức năng vận hành của Moodle như quản lý nội dung, nộp bài hay làm bài kiểm tra, mà tập trung hỗ trợ sinh viên và giảng viên theo dõi kết quả học tập, tình trạng nộp bài, điểm số và mức độ tương tác thông qua dashboard.

---

# 50. GỢI Ý CẤU TRÚC BÁO CÁO

## Chương 1 — Tổng quan đề tài

- Lý do chọn đề tài.
- Mục tiêu.
- Đối tượng.
- Phạm vi.
- Công nghệ.

## Chương 2 — Cơ sở lý thuyết

- LMS.
- Moodle.
- Data Warehouse.
- ETL.
- Dashboard.
- Learning Analytics.
- Data Visualization.

## Chương 3 — Phân tích và thiết kế

- Yêu cầu Lecturer.
- Yêu cầu Student.
- Use case.
- Architecture.
- Source schema.
- DW design.
- Grain.
- PK/FK.
- ETL mapping.
- API design.
- UI design.

## Chương 4 — Xây dựng hệ thống

- Synthetic source.
- MySQL DW.
- ETL implementation.
- Node.js backend.
- React frontend.
- Power BI.

## Chương 5 — Kiểm thử và kết quả

- Data validation.
- API testing.
- UI testing.
- KPI comparison.
- Screenshots.

## Chương 6 — Kết luận

- Kết quả đạt được.
- Hạn chế.
- Hướng phát triển.

---

# 51. SOURCE → DW MAPPING TỔNG QUÁT

```text
mdl_user
+ mdl_role_assignments
+ mdl_role
        ↓
Dim_User
```

```text
mdl_course
+ mdl_course_categories
        ↓
Dim_Course
```

```text
Calendar generated
        ↓
Dim_Date
```

```text
mdl_course_modules
+ mdl_modules
+ mdl_assign
+ mdl_quiz
        ↓
Dim_Activity
```

```text
mdl_user_enrolments
+ mdl_enrol
+ Dim_User
+ Dim_Course
+ Dim_Date
        ↓
Fact_Enrolment
```

```text
mdl_assign_submission
+ mdl_assign_grades
+ mdl_assignfeedback_comments
+ Dimensions
        ↓
Fact_Assignment_Submission
```

```text
mdl_grade_items
+ mdl_grade_grades
+ Dimensions
        ↓
Fact_Course_Grade
```

```text
mdl_local_course_daily_engagement
+ Dimensions
        ↓
Fact_Daily_Engagement
```

```text
mdl_local_module_daily_engagement
+ Dimensions
        ↓
Fact_Module_Engagement
```

---

# 52. DATA FLOW TỪ DATABASE ĐẾN UI

Ví dụ Lecturer Course Detail:

```text
Fact + Dimensions
       ↓
dashboard.service.js
       ↓
dashboard.controller.js
       ↓
dashboard.routes.js
       ↓
GET /api/dashboard/courses/:courseKey
       ↓
React Course Detail Page
       ↓
KPI + Activity Table + Charts
```

---

# 53. NGUYÊN TẮC PHÁT TRIỂN TỪ ĐÂY

1. Không tự thêm table/column nếu chưa kiểm tra schema.
2. Nếu cần dữ liệu mới, xác định source trước.
3. Sau source mới ETL sang DW.
4. Sau DW mới viết API.
5. Sau API mới build UI.
6. KPI phải có định nghĩa SQL rõ.
7. Frontend không tự tính business logic phức tạp nếu backend/DW có thể tính.
8. Không hard-code surrogate key.
9. Không nhầm Data Visualization Dashboard với Moodle LMS.
10. Mỗi chức năng mới phải trả lời được:
   - dữ liệu lấy từ đâu?
   - dùng bảng nào?
   - KPI là gì?
   - phục vụ Student hay Lecturer?
   - có đúng phạm vi Visualization không?

---

# 54. TÓM TẮT MỘT CÂU

> **Đồ án là hệ thống Learning Analytics Dashboard lấy dữ liệu từ LMS, chuẩn hóa qua Data Warehouse và trực quan hóa cho Sinh viên/Giảng viên bằng React và Power BI; hệ thống không thay thế chức năng vận hành của Moodle.**

---

# 55. CHECKLIST TRƯỚC KHI THÊM MỘT CHỨC NĂNG MỚI

- [ ] Đây có phải chức năng phân tích/trực quan hóa không?
- [ ] Dữ liệu hiện có trong Source/DW chưa?
- [ ] Nếu chưa có, có thực sự cần mở rộng source không?
- [ ] API nào sẽ cung cấp dữ liệu?
- [ ] Chức năng dành cho Student hay Lecturer?

Nếu câu trả lời đầu tiên là “không”, khả năng cao chức năng đó thuộc LMS chính và nên loại khỏi scope.

---

**END OF MASTER SPECIFICATION**
