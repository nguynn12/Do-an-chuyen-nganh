# TODO cho Antigravity — Chỉ số tổng hợp (phần CODE)

> Đây là file giao việc cho AI coding agent. Chỉ chứa việc viết code (SQL, Node backend, React, script).
> Phần Power BI do người làm tự thực hiện trong Power BI Desktop, KHÔNG nằm trong file này, không đụng tới.

## Quy tắc bắt buộc

1. Đây là dashboard **chỉ xem (read-only)**. Không thêm chức năng nộp bài, chấm điểm, sửa điểm, nhắn tin, tạo đề thi.
2. Làm **từng task một theo thứ tự**. Sau mỗi task DỪNG, báo cáo: file đã sửa/tạo, API mới (nếu có), cách tự test (lệnh chạy, URL mở). Chờ xác nhận mới làm task tiếp.
3. Không hardcode số liệu giả, không random. Mọi chỉ số tính từ bảng thật trong `lms_datawarehouse`.
4. Không cài thêm thư viện chart. Vẽ bằng SVG/CSS thuần theo phong cách `analytics-bar-item` và theme xanh DLU (`--dlu-green: #37883e`) đang có. Nếu thật sự cần thư viện, hỏi trước.
5. Nếu thấy tên bảng/cột/hàm trong file này không khớp code thật, DỪNG và hỏi, không tự đoán.
6. Không sửa/xoá chức năng ngoài phạm vi task đang làm.
7. Làm theo đúng pattern có sẵn: backend theo `backend/src/GiangVien/controllers/courseController.js` (hàm `getCourseStudentAnalytics`) và `backend/src/SinhVien/controllers/studentController.js` (hàm `resolveStudent`, `getStudentBenchmark`); frontend theo cấu trúc `Frontend/GiangVien/src` và `Frontend/SinhVien/src`.

## Bối cảnh (đã kiểm tra trong repo)

**Dữ liệu có sẵn trong DW:** `Dim_Date` (có `Full_Date`, `Week_Number`, `Day_Of_Week_Name`), `Dim_User`, `Dim_Course`, `Dim_Activity`, `Fact_Enrolment`, `Fact_Assignment_Submission` (`Submit_Date_Key`, `Due_Date_Key`, `Submission_Status`, `Is_Submitted_On_Time`, `Grade`), `Fact_Course_Grade` (`Grade_Item_Type`, `Date_Key`, `Grade`, `Grade_Percentage`, `Is_Passed`), `Fact_Daily_Engagement` (`Date_Key`, `Time_Spent_Seconds`, `Last_Access_Time`), `Fact_Module_Engagement`.

**Dữ liệu CHƯA có trong repo:** điểm danh (attendance) và chi tiết làm quiz (attempt, câu hỏi). `Teacher_Schedule` là lịch dạy của giảng viên, **không phải** dữ liệu điểm danh sinh viên. Vì vậy các cờ cảnh báo dùng **chỉ dữ liệu có sẵn** ở trên. Thiết kế để sau này có thể cắm thêm cờ "vắng" và "quiz giảm" mà không viết lại (xem Task 1).

**API đã có, KHÔNG làm lại:**
- Giảng viên: `GET /api/courses/:courseId/student-analytics`, `/grade-distribution`, `/engagement-trend`, `/students`.
- Sinh viên: `GET /api/v1/student/dashboard-summary`, `/courses`, `/courses/:courseId`, `/grades`, `/submissions`, `/engagement`, `/benchmark`.

**Việc sửa lỗi/dọn phạm vi đã có file riêng:** `Documentation/Documentation_TODO_Dashboard.md` (lịch mini giả, đổi tên "Tin nhắn", dọn trang đề thi/phúc khảo...). Làm file đó trước hoặc song song theo thứ tự đã thống nhất, không lặp lại ở đây.

**"Ngày hiện tại" của dữ liệu:** là dữ liệu quá khứ, KHÔNG dùng `NOW()`/`TODAY()`. Dùng `MAX(Full_Date)` của `Fact_Daily_Engagement` (join `Dim_Date`) làm mốc "hôm nay".

---

## Task 1 — Module tính chỉ số dùng chung

**Mục tiêu:** một nơi duy nhất tính các chỉ số hành vi, để giảng viên và sinh viên dùng chung (số liệu hai bên luôn khớp).

**Tạo:**
- `backend/src/shared/analytics/analyticsConfig.js`: các hằng số cấu hình (xuất ra để dễ chỉnh):
  - Trọng số điểm tham gia: `PARTICIPATION_WEIGHTS = { onTime: 0.4, engagement: 0.3, grade: 0.3 }` (đề xuất khởi đầu, nhóm sẽ chốt lại).
  - Trọng số rủi ro: `RISK_WEIGHTS = { lateSubmit: 0.35, inactive: 0.30, gradeDrop: 0.20, lowEngagement: 0.15 }`. Có sẵn chỗ để thêm `absent` và `quizDrop` sau (giá trị 0 khi chưa có dữ liệu, trọng số tự chia lại).
  - Ngưỡng: `INACTIVE_DAYS = 14`, `LATE_RATE = 0.5`, `GRADE_DROP_POINTS = 10` (phần trăm), `LEAD_BUCKETS_HOURS = [0, 24, 72]`.
- `backend/src/shared/analytics/behaviorMetrics.js`: hàm tính cho **từng sinh viên trong 1 môn**, đầu vào là kết nối DB và `courseKey`:
  - `onTimeRate`: tỷ lệ bài nộp đúng hạn (từ `Is_Submitted_On_Time`).
  - `leadHours` mỗi bài = (`Due_Date` − `Submit_Date`) tính bằng giờ (join `Dim_Date` qua `Due_Date_Key`/`Submit_Date_Key`; nếu chỉ có ngày thì tính theo ngày × 24 và ghi chú rõ độ chính xác). Bucket: `Trễ hạn` (<0), `Dưới 24 giờ`, `1-3 ngày`, `Sớm hơn 3 ngày`, `Chưa nộp`.
  - `avgLeadDays` và nhãn `submitStyle`: `Hay trễ hạn` (<0), `Nước rút phút chót` (<1 ngày), `Làm đều` (1–3 ngày), `Làm sớm` (>3 ngày).
  - `engagementHours`, `inactiveDays` (so với "ngày hiện tại" của dữ liệu), `avgGradePct`, `gradeTrend` (so sánh trung bình các điểm gần nhất với các điểm trước đó).
  - `participationScore` (0–100) = tổ hợp có trọng số của `onTimeRate`, giờ học chuẩn hóa (chia cho giờ học cao nhất của lớp, tối đa 1) và điểm trung bình.
  - `flags` (mỗi cờ 0/1) + `riskScore` (0–100) + `riskReasons` (mảng chuỗi tiếng Việt, ví dụ "Hay nộp trễ", "Lâu không hoạt động (17 ngày)", "Điểm gần đây giảm so với trước", "Ít tương tác so với lớp").
  - `segment`: dựa trên **trung vị của lớp** cho `participationScore` và `avgGradePct`: `Chăm & giỏi`, `Chăm nhưng điểm thấp`, `Ít tham gia nhưng điểm cao`, `Nguy cơ cao`.
- Xử lý biên: sinh viên chưa có dữ liệu thì trả `null` cho chỉ số đó, **không** trả 0 (tránh gắn nhãn sai). Lớp quá ít sinh viên (< 5) thì trả thêm cờ `lowSample: true`.

**Nghiệm thu:** có file test hoặc script chạy thử in ra kết quả cho 1 môn thật; đối chiếu tay 2 sinh viên với bảng gốc (báo cáo kết quả đối chiếu).

---

## Task 2 — Giảng viên: Hành vi nộp bài (nước rút / trì hoãn)

- Backend: thêm vào `courseController.js` và `courseRoutes.js`: `GET /api/courses/:courseId/submission-behavior`. Trả về: số bài theo từng bucket (cho histogram) và danh sách sinh viên với `avgLeadDays`, `submitStyle`, `onTimeRate`. Dùng Task 1.
- Frontend (`Frontend/GiangVien`): thêm section trong `ClassManagement.jsx` (hoặc component riêng trong `components/`): histogram cột theo bucket và bảng sinh viên (tô màu theo `submitStyle`). Theo style hiện có.
- Thêm hàm gọi API vào `services/teacherApi.js` theo pattern các hàm có sẵn.

**Nghiệm thu:** chọn 1 môn, tổng số bài các bucket = tổng số bài trong `Fact_Assignment_Submission` của môn đó.

## Task 3 — Giảng viên: Phân khúc 2×2

- Backend: `GET /api/courses/:courseId/segments`. Trả `{ thresholds: { participation, grade }, students: [{ userKey, name, participationScore, avgGradePct, segment }], counts }`.
- Frontend: scatter bằng SVG (X = `participationScore`, Y = `avgGradePct`), hai đường chia theo ngưỡng, chấm tô màu theo nhóm (xanh `#37883e` chăm & giỏi, vàng `#e0a030` chăm nhưng điểm thấp, xanh dương `#4a90b8` ít tham gia điểm cao, đỏ `#c0504d` nguy cơ cao), tooltip tên + số liệu, ô thống kê số sinh viên từng nhóm. Click một chấm cuộn/mở tới sinh viên đó trong bảng của `ClassManagement.jsx`.

**Nghiệm thu:** tổng 4 nhóm = số sinh viên của lớp; đổi môn thì ngưỡng đổi theo.

## Task 4 — Giảng viên: Cảnh báo sớm kèm lý do

- Backend: `GET /api/courses/:courseId/risk`. Trả danh sách sinh viên sắp xếp giảm dần theo `riskScore`, mỗi người có `riskScore`, `riskLevel` (`cao` ≥ 60, `trung bình` 30–59, `thấp` < 30), `riskReasons[]`. Kèm phân bố điểm rủi ro (histogram theo khoảng 0–20, 20–40, ...).
- Frontend: section "Sinh viên cần chú ý" **đầu trang** `ClassManagement.jsx`: bảng (tên, điểm rủi ro, nhãn mức, các lý do dạng badge) + histogram phân bố. Chỉ có hành động "Xem chi tiết" (cuộn tới dòng sinh viên). Không có nút liên hệ/gửi tin.
- Thay thế và gộp với mục "Risk List" đã mô tả trong `Documentation_TODO_Dashboard.md` (mục 2.4): làm một lần, không tạo hai bản.

**Nghiệm thu:** chọn 1 sinh viên điểm rủi ro cao, từng lý do hiển thị phải kiểm chứng được bằng dữ liệu gốc.

## Task 5 — Sinh viên: trang "Hồ sơ hành vi của tôi"

- Backend: `GET /api/v1/student/behavior-profile?courseId=` (và alias `/api/student/...` như các route hiện có). Dùng `resolveStudent` để xác định sinh viên đang đăng nhập. Trả về:
  - `segment` của mình + toạ độ của mình + danh sách chấm **ẩn danh** của cả lớp (chỉ `participationScore`, `avgGradePct`, KHÔNG có tên/mã/key của người khác) + ngưỡng.
  - `attention[]`: tối đa 3 tín hiệu của riêng mình, văn phong nhẹ nhàng ("Bạn đã không hoạt động 17 ngày", "Tỷ lệ nộp đúng hạn đang thấp hơn mức lớp"). **Không** trả `riskScore` và không dùng chữ "nguy cơ". Nếu không có tín hiệu: "Bạn đang đi đúng hướng".
  - `submitProfile`: phân bố bucket nộp bài của mình và trung bình lớp, kèm `submitStyle` của mình.
  - `factorCorrelation[]`: từ Task 6 (chỉ số liệu gộp cả lớp).
- Frontend (`Frontend/SinhVien`): thêm `pages/StudentBehavior.jsx`, route `/hanh-vi`, mục menu "Hồ sơ hành vi" ở sidebar. Bốn khối: scatter "Tôi đang ở góc nào" (chấm xám nhỏ ẩn danh, chấm của mình to và tô màu), "Điều cần chú ý", "Hồ sơ nộp bài của tôi" (cột nhóm so với lớp), "Yếu tố liên quan nhiều nhất tới điểm" (bar ngang). Có dropdown chọn môn.
- **Không** làm lại Grade Prediction, Effort Meter, GPA 4.0, Leaderboard, Donut nộp bài, Heatmap (thuộc phần Power BI của người khác).

**Nghiệm thu:** kiểm tra response JSON không chứa tên/mã của sinh viên khác; đăng nhập 2 tài khoản khác nhau thấy hồ sơ khác nhau.

## Task 6 — Script tính tương quan → bảng `Correlation_Result`

- Tạo `Database/17_create_analytics_tables.sql` với bảng `Correlation_Result(Course_Key INT, Factor VARCHAR(50), R DECIMAL(6,4), N INT, Computed_At DATETIME)`, khoá chính (`Course_Key`, `Factor`).
- Tạo `backend/scripts/computeCorrelation.js`: với mỗi môn, tính hệ số Pearson giữa từng yếu tố (`onTimeRate`, `engagementHours`, `avgSubmissionGrade`, `leadDays`) và điểm tổng kết/điểm trung bình của sinh viên; bỏ qua sinh viên thiếu dữ liệu; `N` là số sinh viên dùng được; nếu `N < 5` hoặc phương sai bằng 0 thì ghi `R = NULL`. Chạy lại được nhiều lần (upsert).
- Power BI (phần người làm) sẽ đọc bảng này cho ma trận tương quan, và API sinh viên ở Task 5 dùng nó.

**Nghiệm thu:** đối chiếu 1 cặp (môn, yếu tố) với tính bằng Excel `CORREL`; báo cáo kết quả.

## Task 7 — Script đánh giá cảnh báo sớm → bảng `Early_Warning_Eval` (làm cuối)

- Thêm vào `17_create_analytics_tables.sql`: `Early_Warning_Eval(Course_Key, User_Key, Week_N, Risk_Score, Predicted_At_Risk TINYINT, Actual_Failed TINYINT)`.
- Tạo `backend/scripts/computeEarlyWarningEval.js`: với mỗi môn, mỗi `Week_N` thuộc `{2, 3, 4, 6, 8}` (tuần tính từ ngày hoạt động đầu tiên của môn), chỉ dùng dữ liệu **đến hết tuần N** để tính `riskScore` (dùng lại Task 1, thêm tham số "cut-off date"), `Predicted_At_Risk = riskScore ≥ ngưỡng (mặc định 40, cấu hình trong config)`. `Actual_Failed` lấy từ kết quả cuối thật.
- **Trước khi code, DỪNG và báo cáo:** (a) định nghĩa "rớt" tìm được trong dữ liệu (cột `Is_Passed` của grade item loại tổng kết nào), (b) số sinh viên mỗi môn và số người rớt. Nếu quá ít người rớt (< 3 mỗi môn) thì hỏi lại hướng xử lý, không tự bịa dữ liệu.
- Script chỉ ghi bảng; hiển thị do Power BI đảm nhiệm.

**Nghiệm thu:** với một `Week_N`, đếm tay TP/FP/FN/TN cho 1 môn và khớp với kết quả script.

---

## Ghi chú cho người giao việc (không phải để agent làm)

- Nhờ bạn phụ trách điểm danh/quiz **đẩy script tạo bảng và ETL của điểm danh, quiz lên repo** (hiện repo chưa có). Khi có, mở rộng Task 1 để cắm thêm cờ `absent` và `quizDrop` (config đã chừa chỗ).
- Trọng số và ngưỡng trong `analyticsConfig.js` là đề xuất khởi đầu; nhóm cần chốt và ghi lại lý do để trả lời hội đồng.
