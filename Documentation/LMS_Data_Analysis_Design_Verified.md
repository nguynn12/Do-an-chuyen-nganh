# TÀI LIỆU PHÂN TÍCH DỮ LIỆU & THIẾT KẾ CSDL
## LMS DATA VISUALIZATION / LEARNING ANALYTICS DASHBOARD

> **Mục tiêu tài liệu:** dùng làm tài liệu nền để trao đổi với giảng viên, thiết kế sơ đồ, giải thích từng bảng, viết báo cáo và kiểm soát scope.
>
> **Phạm vi hệ thống:** đây là hệ thống **phân tích và trực quan hóa dữ liệu LMS**, không phải LMS thay thế Moodle.
>
> **Trạng thái dữ liệu được chốt theo CSDL hiện tại:** 2026-09-04.

---

# 1. MỤC TIÊU NGHIỆP VỤ

Hệ thống lấy dữ liệu học tập từ một nguồn Moodle-like synthetic, chuyển đổi qua ETL vào Data Warehouse, sau đó phục vụ:

- Dashboard cho Giảng viên.
- Dashboard cho Sinh viên.
- Power BI.
- API phân tích.
- Báo cáo về điểm, nộp bài, enrollment và engagement.

Hệ thống **không** làm các nghiệp vụ vận hành LMS như:

- tạo/xóa course,
- upload học liệu,
- sinh viên nộp file,
- làm quiz,
- giảng viên nhập điểm,
- quản lý enrollment trực tiếp,
- forum/chat,
- quản trị Moodle.

---

# 2. KIẾN TRÚC TỔNG THỂ

```text
Moodle-like Synthetic Source
lms_moodle_source
        │
        │ ETL
        ▼
Learning Analytics Data Warehouse
lms_datawarehouse
        │
        ├────────► Node.js / Express API ─────► React Dashboard
        │
        └────────► Power BI
```

Database hiện có **11 bảng vật lý**, nhưng cần phân biệt rõ:

```text
9 bảng Analytical Data Warehouse
├── 4 Dimension
└── 5 Fact

2 bảng Application Support
├── app_user_account
└── teacher_schedule
```

Không nên gọi toàn bộ 11 bảng là “Star Schema”.

---

# 3. SOURCE DATABASE HIỆN TẠI

Database:

```text
lms_moodle_source
```

Hiện có **22 bảng nguồn**:

```text
mdl_assign
mdl_assign_grades
mdl_assign_submission
mdl_assignfeedback_comments
mdl_context
mdl_course
mdl_course_categories
mdl_course_modules
mdl_enrol
mdl_grade_grades
mdl_grade_items
mdl_local_course_daily_engagement
mdl_local_module_daily_engagement
mdl_modules
mdl_page
mdl_quiz
mdl_resource
mdl_role
mdl_role_assignments
mdl_url
mdl_user
mdl_user_enrolments
```

## Cách gọi chính xác

Không nên nói:

> “22 bảng chuẩn Moodle”.

Nên nói:

> “22 bảng trong nguồn Moodle-like synthetic của đồ án, bao gồm các bảng mô phỏng subset Moodle cần thiết và các bảng local/custom phục vụ learning analytics.”

Đặc biệt:

```text
mdl_local_course_daily_engagement
mdl_local_module_daily_engagement
```

là **bảng custom synthetic của đồ án**, không phải Moodle core table.

---

# 4. DATA WAREHOUSE HIỆN TẠI

Database:

```text
lms_datawarehouse
```

## 4.1. 11 bảng vật lý và số dòng

| Nhóm | Bảng | Số dòng hiện tại |
|---|---|---:|
| Dimension | `dim_user` | 14 |
| Dimension | `dim_course` | 4 |
| Dimension | `dim_date` | 5844 |
| Dimension | `dim_activity` | 20 |
| Fact | `fact_enrolment` | 24 |
| Fact | `fact_assignment_submission` | 48 |
| Fact | `fact_course_grade` | 54 |
| Fact | `fact_daily_engagement` | 1512 |
| Fact | `fact_module_engagement` | 4536 |
| Application | `app_user_account` | 2 |
| Application | `teacher_schedule` | 0 |

---

# 5. MÔ HÌNH PHÂN TÍCH CỐT LÕI

```text
                    dim_user
                       │
        ┌──────────────┼──────────────┐
        │              │              │
        ▼              ▼              ▼
fact_enrolment   fact_course_grade   fact_daily_engagement
        │              │              │
        └───────┬──────┴──────┬───────┘
                │             │
                ▼             ▼
           dim_course     dim_date
                │
                ▼
           dim_activity
                │
        ┌───────┴────────┐
        ▼                ▼
fact_assignment_    fact_module_
submission          engagement
```

Đây là mô hình dữ liệu chiều **theo hướng Star Schema**, nhưng không phải Star Schema thuần túy 100%, vì:

- `dim_activity` có FK tới `dim_course`.
- `dim_activity` có `Due_Date_Key` tới `dim_date`.
- một số Fact đồng thời chứa cả `Course_Key` và `Activity_Key`.

Cách nói an toàn:

> “Kho dữ liệu được thiết kế theo mô hình dữ liệu chiều hướng Star Schema, với một số quan hệ bổ trợ giữa các dimension để biểu diễn course–activity và due date.”

---

# 6. BUSINESS PROCESS & BUS MATRIX

| Business Process | User | Course | Date | Activity |
|---|:---:|:---:|:---:|:---:|
| Enrollment | ✓ | ✓ | ✓ | |
| Assignment Submission | ✓ | ✓ | ✓ | ✓ |
| Grade | ✓ | ✓ | ✓ | ✓ |
| Daily Engagement | ✓ | ✓ | ✓ | |
| Module Engagement | ✓ | ✓ | ✓ | ✓ |

`Cohort/Khóa tuyển sinh` **chưa được mô hình hóa** ở phiên bản hiện tại.

---

# 7. VẤN ĐỀ COURSE – ENROLLMENT – COHORT

## 7.1. Course không gắn sẵn với “Khóa K47”

Không nên thiết kế:

```text
Course
└── Cohort_Key
```

vì một course có thể có sinh viên từ nhiều khóa khác nhau.

Quan hệ đúng:

```text
Student/User
    │
    ▼
Fact_Enrolment
    │
    ▼
Course
```

## 7.2. “Khóa K47” là chiều khác

Nếu sau này requirement cần phân tích theo khóa tuyển sinh/cohort thì nên bổ sung:

```text
dim_cohort
    │
    ▼
bridge_user_cohort
    │
    ▼
dim_user
```

và enrollment vẫn giữ riêng:

```text
dim_user
    │
    ▼
fact_enrolment
    │
    ▼
dim_course
```

Không được nhầm `Category_Name` của course với “Khóa K47”.

---

# 8. CÁCH GIẢI THÍCH MỖI BẢNG KHI GIẢNG VIÊN HỎI

Mỗi bảng cần trả lời được 9 câu:

1. Bảng đại diện cho đối tượng/sự kiện gì?
2. Grain của bảng là gì?
3. Nguồn lấy từ bảng source nào?
4. Tại sao chọn các cột này?
5. PK/FK/business key là gì?
6. ETL transform gì?
7. Tại sao Data Warehouse cần bảng này?
8. Bảng phục vụ KPI/biểu đồ nào?
9. Hạn chế hiện tại là gì?

---

# 9. DIMENSION 1 — `dim_user`

## Đại diện cho gì?

Một người dùng LMS, có thể là Student hoặc Teacher.

## Grain

> 1 dòng = 1 Moodle user.

## Nguồn

```text
mdl_user
mdl_role_assignments
mdl_role
```

## Cột hiện tại

| Cột | Vai trò |
|---|---|
| `User_Key` | Surrogate PK của DW |
| `Moodle_User_ID` | Business key từ source |
| `Username` | username từ LMS |
| `First_Name` | tên |
| `Last_Name` | họ |
| `Full_Name` | họ tên đã chuẩn hóa |
| `Email` | email |
| `Primary_Role` | Student / Teacher / Unknown |
| `Is_Active` | tài khoản còn hiệu lực |

## Vì sao cần bảng này?

Hầu hết Fact đều cần trả lời câu hỏi “ai”:

- ai được enroll?
- ai nộp bài?
- ai nhận điểm?
- ai có engagement?

## Vì sao giữ cả `User_Key` và `Moodle_User_ID`?

- `User_Key`: khóa thay thế nội bộ DW, dùng JOIN.
- `Moodle_User_ID`: giữ khả năng đối chiếu về source.

## Transform chính

- Ghép `First_Name` + `Last_Name` thành `Full_Name`.
- Map role Moodle thành `Primary_Role`.
- Xác định `Is_Active` dựa trên suspended/deleted.

## Phục vụ phân tích

- số sinh viên,
- số giảng viên,
- student detail,
- lọc theo role,
- drill-down từ course → student.

## Hạn chế hiện tại

Không có:

```text
Student_Code
Cohort_Key
Homeroom_Cohort_Key
```

Nên không được nói rằng DW hiện đã phân tích được theo “Khóa K47”.

---

# 10. DIMENSION 2 — `dim_course`

## Đại diện cho gì?

Một học phần/course trong LMS.

## Grain

> 1 dòng = 1 course.

## Nguồn

```text
mdl_course
mdl_course_categories
```

## Cột

| Cột | Vai trò |
|---|---|
| `Course_Key` | Surrogate PK |
| `Moodle_Course_ID` | business key |
| `Course_Code` | mã học phần |
| `Course_Name` | tên học phần |
| `Category_ID` | ID category |
| `Category_Name` | tên category |
| `Start_Date` | ngày bắt đầu |
| `End_Date` | ngày kết thúc |
| `Is_Visible` | trạng thái hiển thị |

## Vì sao không có `Cohort_Key`?

Vì course không sở hữu một cohort cố định.

Sinh viên tham gia course thông qua enrollment.

## Vì sao denormalize Category?

Dashboard chủ yếu cần category để:

- lọc course,
- nhóm course,
- hiển thị thông tin.

Do dataset nhỏ và mục tiêu là BI/analytics, `Category_Name` được giữ ngay trong `dim_course` thay vì tạo `dim_category` riêng.

## Phục vụ phân tích

- số course,
- KPI theo course,
- average grade/course,
- submission/course,
- engagement/course.

---

# 11. DIMENSION 3 — `dim_date`

## Đại diện cho gì?

Chiều lịch dùng chung cho các Fact.

## Grain

> 1 dòng = 1 ngày lịch.

## Số dòng

```text
5844
```

Khoảng:

```text
2020-01-01 → 2035-12-31
```

## Cột

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

## Vì sao cần?

Giúp phân tích theo:

- tháng,
- quý,
- năm,
- tuần,
- học kỳ,
- weekday/weekend.

## Phục vụ biểu đồ

- engagement theo ngày/tuần/tháng,
- submission theo thời gian,
- grade trend,
- phân tích học kỳ.

---

# 12. DIMENSION 4 — `dim_activity`

## Đại diện cho gì?

Một activity hoặc learning resource nằm trong course.

## Grain

> 1 dòng = 1 course module/activity.

## Nguồn hiện tại

```text
mdl_course_modules
mdl_modules
mdl_assign
mdl_quiz
mdl_resource
mdl_page
mdl_url
```

## Cột

| Cột | Vai trò |
|---|---|
| `Activity_Key` | Surrogate PK |
| `Moodle_Module_ID` | business key từ course module |
| `Course_Key` | activity thuộc course nào |
| `Activity_Type` | assign / quiz / resource / page / url |
| `Activity_Name` | tên |
| `Due_Date_Key` | hạn nộp/đóng nếu có |
| `Max_Grade` | điểm tối đa nếu có |
| `Is_Visible` | có hiển thị hay không |

## Phân bố hiện tại

| Activity Type | Số dòng |
|---|---:|
| assign | 8 |
| quiz | 4 |
| resource | 4 |
| page | 2 |
| url | 2 |
| **Tổng** | **20** |

## Vì sao đưa resource/page/url vào cùng dimension?

Vì về mặt dashboard, tất cả đều là “đối tượng học tập trong course”:

- assignment,
- quiz,
- slide/PDF,
- page,
- external URL.

Dùng một `dim_activity` giúp Fact module engagement có thể tham chiếu thống nhất bằng `Activity_Key`.

## Hạn chế hiện tại

Learning resources mới đã có metadata trong dimension, nhưng **chưa có module engagement data**.

---

# 13. FACT 1 — `fact_enrolment`

## Đại diện cho gì?

Sự kiện một user được enroll vào một course.

## Grain

> 1 dòng = 1 lượt user được enroll vào 1 course tại một thời điểm.

## Nguồn

```text
mdl_user_enrolments
mdl_enrol
```

## Cột

- `Enrolment_Key`
- `User_Key`
- `Course_Key`
- `Enrol_Date_Key`
- `Unenrol_Date_Key`
- `Status`

## Vì sao bảng này quan trọng?

Đây là bảng biểu diễn quan hệ:

```text
Student ↔ Course
```

Một student có thể học nhiều course, một course có nhiều student.

Đó là quan hệ nhiều-nhiều nên không thể nhét Student_ID trực tiếp vào `dim_course`.

## Phục vụ KPI

- số sinh viên/course,
- số course/student,
- active enrolment,
- drill-down course → students.

## Số dòng hiện tại

```text
24
```

Với synthetic data hiện tại:

```text
4 course × 6 student = 24 enrolment
```

---

# 14. FACT 2 — `fact_assignment_submission`

## Đại diện cho gì?

Một attempt nộp assignment của user.

## Grain

> 1 dòng = 1 attempt của 1 user cho 1 assignment.

## Nguồn

```text
mdl_assign_submission
mdl_assign_grades
mdl_assignfeedback_comments
mdl_assign
```

## Cột

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

## Transform quan trọng

```text
Submit Time <= Due Time
→ Is_Submitted_On_Time = 1
```

Có grade tương ứng:

```text
Is_Graded = 1
```

## Số dòng hiện tại

```text
48
```

Trạng thái đã validate:

```text
submitted = 40
draft     = 8
graded    = 30
ungraded  = 18
```

## Phục vụ KPI

- submission rate,
- on-time rate,
- late submissions,
- bài chờ chấm,
- feedback availability,
- assignment performance.

## Lưu ý

Bảng này chỉ biểu diễn **assignment submission**, không phải quiz attempt.

---

# 15. FACT 3 — `fact_course_grade`

## Đại diện cho gì?

Một grade record của user cho một grade item.

## Grain

> 1 dòng = 1 user + 1 grade item.

## Nguồn

```text
mdl_grade_items
mdl_grade_grades
```

## Cột

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

## Transform

```text
Grade_Percentage = Grade / Max_Grade × 100
```

```text
Is_Passed = Grade >= GradePass
```

## Số dòng

```text
54
```

Phân bố thực tế:

| Grade Item Type | Số dòng |
|---|---:|
| assign | 30 |
| quiz | 24 |

## Điều rất quan trọng

Hiện **không có `Grade_Item_Type = 'course'`** trong dữ liệu.

Nên nói:

> “Fact_Course_Grade hiện lưu các grade item assignment và quiz trong synthetic dataset.”

## Phục vụ KPI

- average grade,
- grade percentage,
- assignment vs quiz,
- grade by activity,
- pass/fail nếu dữ liệu phù hợp.

---

# 16. FACT 4 — `fact_daily_engagement`

## Đại diện cho gì?

Tổng thời gian tương tác của 1 user trong 1 course trong 1 ngày.

## Grain

> 1 user + 1 course + 1 date.

## Nguồn trực tiếp hiện tại

```text
mdl_local_course_daily_engagement
```

Đây là bảng custom synthetic.

## Cột

- `Engagement_Key`
- `User_Key`
- `Course_Key`
- `Date_Key`
- `Time_Spent_Seconds`
- `Last_Access_Time`

## Vì sao lưu seconds?

Seconds là đơn vị dễ SUM.

```text
minutes = seconds / 60
hours   = seconds / 3600
```

## Số dòng

```text
1512
```

## Phục vụ KPI

- total engagement hours,
- daily trend,
- average time/student,
- last access,
- low-engagement students.

## Lưu ý

Hiện pipeline lấy dữ liệu từ bảng aggregate synthetic, không nên mô tả là đã sessionize trực tiếp từ `mdl_logstore_standard_log` nếu chưa có code thật.

---

# 17. FACT 5 — `fact_module_engagement`

## Đại diện cho gì?

Thời gian tương tác của user với một activity cụ thể trong một ngày.

## Grain

> 1 user + 1 course + 1 activity + 1 date.

## Nguồn

```text
mdl_local_module_daily_engagement
```

## Cột

- `Module_Engagement_Key`
- `User_Key`
- `Course_Key`
- `Activity_Key`
- `Date_Key`
- `Time_Spent_Seconds`

## Số dòng

```text
4536
```

## Phục vụ phân tích

- engagement theo activity,
- activity ranking,
- time spent by assignment/quiz/resource,
- drill-down course → activity.

---

# 18. KẾT QUẢ KIỂM TRA MODULE ENGAGEMENT MỚI NHẤT

Kết quả database hiện tại:

| Activity Type | Engagement Rows | Activities có engagement | Engagement Hours |
|---|---:|---:|---:|
| assign | 3024 | 8 | 1893.49 |
| quiz | 1512 | 4 | 631.65 |

Các activity sau **đang có 0 engagement rows**:

| Activity Key | Type | Activity |
|---:|---|---|
| 18 | page | Hướng dẫn thực hành SQL |
| 22 | page | Hướng dẫn xây dựng REST API |
| 16 | resource | Slide Chương 1 - Tổng quan cơ sở dữ liệu |
| 17 | resource | Tài liệu SQL cơ bản |
| 20 | resource | Slide HTML CSS cơ bản |
| 21 | resource | Tài liệu REST API |
| 19 | url | Video hướng dẫn SQL JOIN |
| 23 | url | Video hướng dẫn REST API |

## Cách giải thích đúng

> “Dimension Activity đã được mở rộng để chứa cả assignment, quiz và learning resources. Tuy nhiên dữ liệu synthetic module engagement hiện tại mới có cho assignment và quiz; các resource/page/url mới chưa được sinh engagement records.”

## Hướng xử lý sau

### A. Giữ nguyên

Chấp nhận learning resource metadata có nhưng engagement = 0.

### B. Bổ sung synthetic engagement

Sau này sinh thêm engagement cho:

```text
resource
page
url
```

rồi ETL lại `fact_module_engagement`.

---

# 19. APPLICATION TABLE 1 — `app_user_account`

## Đây có phải Dimension/Fact không?

Không. Đây là bảng hỗ trợ ứng dụng.

## Grain

> 1 dòng = 1 account đăng nhập Dashboard.

## Cột

- `Account_ID`
- `User_Key`
- `Username`
- `Password_Hash`
- `Role`
- `Is_Active`
- `Created_At`
- `Updated_At`

## Quan hệ

```text
app_user_account.User_Key
→ dim_user.User_Key
```

## Vì sao tách khỏi `dim_user`?

- `dim_user`: phục vụ analytics.
- `app_user_account`: phục vụ authentication/authorization.

## Hiện tại

```text
2 accounts
```

Nếu dùng bcrypt thì thuật ngữ đúng là mật khẩu được **hash/băm**.

---

# 20. APPLICATION TABLE 2 — `teacher_schedule`

## Có phải Data Warehouse Fact không?

Không nên xem là Fact analytics.

Đây là bảng application/operational support.

## Grain

> 1 dòng = 1 schedule event của teacher.

## Cột

- `Schedule_ID`
- `Teacher_User_Key`
- `Event_Date`
- `Event_Time`
- `Title`
- `Event_Type`
- `Description`
- `Created_At`
- `Updated_At`

## Quan hệ

```text
Teacher_User_Key
→ dim_user.User_Key
```

## Hiện tại

```text
0 rows
```

## Khuyến nghị trình bày

Khi vẽ Star Schema, tách bảng này ra vùng:

```text
Application Support
```

---

# 21. SOURCE → TARGET MAPPING TỔNG QUÁT

```text
mdl_user
+ mdl_role_assignments
+ mdl_role
        ↓
dim_user
```

```text
mdl_course
+ mdl_course_categories
        ↓
dim_course
```

```text
mdl_course_modules
+ mdl_modules
+ mdl_assign
+ mdl_quiz
+ mdl_resource
+ mdl_page
+ mdl_url
        ↓
dim_activity
```

```text
mdl_user_enrolments
+ mdl_enrol
+ dimension lookups
        ↓
fact_enrolment
```

```text
mdl_assign_submission
+ mdl_assign_grades
+ mdl_assignfeedback_comments
+ dimension lookups
        ↓
fact_assignment_submission
```

```text
mdl_grade_items
+ mdl_grade_grades
+ dimension lookups
        ↓
fact_course_grade
```

```text
mdl_local_course_daily_engagement
+ dimension lookups
        ↓
fact_daily_engagement
```

```text
mdl_local_module_daily_engagement
+ dimension lookups
        ↓
fact_module_engagement
```

---

# 22. KPI CATALOG

## Total Students

Global:

```text
COUNT(dim_user)
WHERE Primary_Role = 'Student'
AND Is_Active = 1
```

Course-level:

```text
COUNT(active fact_enrolment rows)
```

## Total Activities

```text
COUNT(dim_activity)
WHERE Is_Visible = 1
```

## Submitted Assignments

```text
COUNT(fact_assignment_submission)
WHERE Submission_Status = 'submitted'
```

## On-time

```text
Submission_Status = 'submitted'
AND Is_Submitted_On_Time = 1
```

## Late

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
AVG(fact_course_grade.Grade_Percentage)
```

## Total Engagement Hours

```text
SUM(Time_Spent_Seconds) / 3600
```

---

# 23. SƠ ĐỒ NÊN CHUẨN BỊ CHO GIẢNG VIÊN

Nên có:

1. **Source ERD** — 22 bảng `lms_moodle_source`.
2. **Analytical DW Diagram** — chỉ 9 bảng, 4 Dimension + 5 Fact.
3. **Application Support Diagram** — `app_user_account`, `teacher_schedule` liên kết `dim_user`.
4. **Data Lineage Diagram** — Source → ETL → DW → API → Dashboard/Power BI.

---

# 24. CÂU HỎI GIẢNG VIÊN CÓ THỂ HỎI

## “Tại sao có Fact_Enrolment?”

Vì Student và Course là quan hệ many-to-many.

`fact_enrolment` trả lời user nào tham gia course nào.

## “Tại sao không gắn Khóa K47 vào Course?”

Vì cohort/khóa sinh viên không phải thuộc tính cố định của course.

Nếu cần phân tích theo cohort thì bổ sung dimension riêng.

## “Tại sao Fact có cả Course_Key và Activity_Key?”

Để query analytics trực tiếp theo course-level lẫn activity-level.

## “Tại sao cần Dim_Date?”

Để phân tích theo ngày/tháng/quý/tuần/học kỳ mà không lặp logic xử lý date.

## “Tại sao Resource có trong Dim_Activity nhưng không có engagement?”

Vì metadata learning resource đã được bổ sung vào dimension, nhưng synthetic engagement hiện mới sinh cho assignment/quiz.

## “Tại sao không query trực tiếp Moodle?”

Vì tầng DW:

- đơn giản hóa schema phục vụ BI,
- chuẩn hóa metric,
- giảm phụ thuộc source,
- thuận tiện cho API và Power BI.

---

# 25. NHỮNG CÂU KHÔNG ĐƯỢC NÓI TRONG BÁO CÁO HIỆN TẠI

Không nói:

> “22 bảng chuẩn Moodle.”

Không nói:

> “11 bảng đều là Star Schema.”

Không nói:

> “Fact_Course_Grade đã có course total.”

Không nói:

> “Resource/Page/URL đã có engagement analytics.”

Không nói:

> “Engagement được tính trực tiếp từ raw log bằng session timeout 30 phút.”

nếu chưa có implementation.

Không nói:

> “Course thuộc Khóa K47.”

Không nói:

> “Category là Khóa sinh viên.”

Không nói:

> “API phản hồi dưới 50ms.”

nếu chưa benchmark.

---

# 26. CÁCH TRÌNH BÀY DATABASE HIỆN TẠI TRONG 30 GIÂY

> “Database của nhóm hiện có 11 bảng vật lý. Phần Learning Analytics Data Warehouse gồm 4 Dimension là User, Course, Date và Activity; 5 Fact tương ứng với Enrollment, Assignment Submission, Grade, Daily Engagement và Module Engagement. Hai bảng còn lại là App_User_Account và Teacher_Schedule, chỉ phục vụ chức năng ứng dụng Web nên được tách khỏi mô hình phân tích. Dữ liệu được ETL từ nguồn Moodle-like synthetic gồm 22 bảng. Quan hệ giữa sinh viên và course được biểu diễn qua Fact_Enrolment chứ course không gắn cố định với một khóa tuyển sinh.”

---

# 27. TODO PHÂN TÍCH TIẾP THEO

- [ ] Source ERD 22 bảng.
- [ ] Data Warehouse diagram chỉ 9 bảng.
- [ ] Tách 2 Application tables khỏi Star Schema presentation.
- [ ] Data Dictionary đầy đủ.
- [ ] Source-to-Target Mapping chi tiết theo từng cột.
- [ ] Bus Matrix.
- [ ] KPI Catalog.
- [ ] Quyết định có cần Cohort/Khóa tuyển sinh không.
- [ ] Quyết định có cần synthetic engagement cho resource/page/url không.
- [ ] Chỉnh tài liệu cũ: `dim_activity = 20`.
- [ ] Chỉnh tài liệu cũ: grade types chỉ `assign` và `quiz`.
- [ ] Không mô tả raw log sessionization nếu chưa có implementation.

---

# 28. TÓM TẮT HIỆN TRẠNG

```text
Source DB:
22 bảng Moodle-like synthetic

Analytical DW:
4 Dimensions
5 Facts
= 9 bảng

Application Support:
2 bảng

Tổng vật lý:
11 bảng trong lms_datawarehouse

Dim_Activity:
20 activities
├── assign: 8
├── quiz: 4
├── resource: 4
├── page: 2
└── url: 2

Fact_Module_Engagement:
4536 rows
├── assign: 3024 rows / 1893.49 h
├── quiz:   1512 rows / 631.65 h
└── resource/page/url: 0 rows hiện tại

Fact_Course_Grade:
54 rows
├── assign: 30
└── quiz: 24

Cohort/Khóa tuyển sinh:
chưa được mô hình hóa
```

---

# 29. NGUYÊN TẮC TỪ ĐÂY

Mỗi khi muốn thêm bảng/cột/chức năng, phải trả lời:

```text
Dữ liệu nguồn ở đâu?
        ↓
Business process nào?
        ↓
Grain là gì?
        ↓
Dimension hay Fact?
        ↓
ETL transform gì?
        ↓
KPI nào cần?
        ↓
Dashboard dùng ở đâu?
```

Nếu không trả lời được chuỗi trên thì chưa nên code tiếp.

---

**END — CURRENT VERIFIED ANALYSIS & DATABASE DESIGN GUIDE**
