# TODO — Sửa lỗi & bổ sung tính năng Dashboard LMS

> File này để AI coding agent (Antigravity) đọc và thực hiện theo đúng thứ tự ưu tiên bên dưới.
> **Nguyên tắc bắt buộc phải tuân thủ khi sửa/thêm bất kỳ mục nào:**
> 1. Đây là **dashboard trực quan hóa dữ liệu (read-only)**, KHÔNG phải hệ thống LMS vận hành. Không thêm bất kỳ chức năng nộp bài, chấm điểm, tạo đề thi, duyệt phúc khảo, chat 2 chiều nào.
> 2. Mọi biểu đồ/số liệu mới phải lấy từ dữ liệu **đã có thật** trong Data Warehouse (không hardcode, không random giả).
> 3. Ưu tiên tái sử dụng API đã tồn tại trước khi tạo endpoint mới — nhiều phần dữ liệu cần thiết **đã có sẵn trong response hiện tại nhưng chưa được frontend dùng hết**.
> 4. Không tự thêm thư viện chart mới nếu chưa có trong `package.json`; nếu cần line/donut/heatmap chart mà project chưa có thư viện, dùng SVG/CSS thuần theo đúng phong cách các biểu đồ hiện tại (`analytics-bar-item`) để giữ nhất quán UI, hoặc hỏi lại trước khi cài thêm package.

---

## PHẦN 1 — SỬA LỖI (làm trước tiên, ưu tiên cao nhất)

### 1.1. [BUG] Lịch mini ở `StudentOverview.jsx` đang đánh dấu ngày giả

**File:** `Frontend/SinhVien/src/pages/StudentOverview.jsx`

**Vấn đề:** Dòng khoảng 65:
```js
const isMarked = [5, 10, 15, 20, 25].includes(d);
```
Các chấm tròn đánh dấu ngày 5/10/15/20/25 mỗi tháng là hardcode cứng, không liên quan gì đến deadline thật. Trong khi đó biến `events` (dòng 28: `const events = summary?.events || [];`) đã lấy đúng danh sách deadline thật từ API `/api/v1/student/dashboard-summary` (field `events`, mỗi item có `date` dạng chuỗi `"dd/mm/yyyy"`).

**Cách sửa:**
1. Parse ngày (số ngày trong tháng) từ `ev.date` của từng phần tử trong `events` (format `dd/mm/yyyy` — lấy phần đầu tiên trước dấu `/`, và đối chiếu đúng tháng/năm đang hiển thị trên lịch, không chỉ đối chiếu số ngày).
2. Thay `isMarked` bằng logic: ô lịch được đánh dấu nếu có ít nhất 1 phần tử trong `events` rơi vào đúng ngày/tháng/năm của ô đó.
3. Giữ nguyên style `.calendar-dot` đang có, chỉ đổi nguồn dữ liệu.
4. (Tùy chọn) hover/click vào chấm tròn hiện tooltip tên bài + môn học (lấy từ `ev.title`, `ev.course`).

---

### 1.2. [Đổi tên cho đúng bản chất] `/tin-nhan` bên Giảng viên

**File:** `Frontend/GiangVien/src/pages/Messages.jsx`, `App.jsx`, và menu Sidebar.

**Vấn đề:** Trang tên "Tin nhắn & thông báo" nhưng code thực tế chỉ gọi `getTeacherNotifications` (danh sách thông báo 1 chiều, không phải chat). Tên gọi "Tin nhắn" dễ khiến giảng viên hướng dẫn hiểu nhầm đây là chức năng nhắn tin 2 chiều — vốn là nghiệp vụ vận hành, ngoài phạm vi đồ án.

**Cách sửa:** Đổi tiêu đề hiển thị (`<h1>`) và label trong Sidebar từ "Tin nhắn & thông báo" → **"Thông báo hệ thống"**. Không đổi route path hay logic, chỉ đổi text hiển thị để đúng bản chất read-only.

---

## PHẦN 2 — TÍNH NĂNG MỚI, DỮ LIỆU ĐÃ SẴN SÀNG 100%

### 2.1. [SINH VIÊN] Biểu đồ xu hướng điểm theo thời gian

**Trang:** `Frontend/SinhVien/src/pages/StudentGrades.jsx`
**Nguồn dữ liệu:** API `/api/v1/student/grades` — mỗi item trong `data[]` đã có sẵn field `Grade_Date` (dd/mm/yyyy), `Grade_Percentage`, `Course_Name`, `Activity_Name`.

**Việc cần làm:**
1. Trang này hiện chỉ có 4 KPI card + 1 bảng, hoàn toàn không có chart. Thêm 1 **line chart** phía trên bảng, trục X = `Grade_Date` (sắp xếp tăng dần theo ngày — hiện API trả về sort theo tên môn/tên bài chứ chưa theo ngày, cần sort lại ở frontend trước khi vẽ), trục Y = `Grade_Percentage`.
2. Nếu sinh viên học nhiều môn, cho phép lọc theo môn (dropdown `Course_Name`) để đường không rối, hoặc vẽ nhiều đường màu khác nhau theo môn (tối đa vài môn cùng lúc, nếu nhiều quá thì mặc định chọn 1 môn).
3. Không cần gọi thêm API — dữ liệu đã đủ trong response hiện tại.

---

### 2.2. [SINH VIÊN] Donut chart tỷ lệ nộp bài đúng hạn / trễ hạn / chưa nộp

**Trang:** `Frontend/SinhVien/src/pages/StudentSubmissions.jsx`
**Nguồn dữ liệu:** API `/api/v1/student/submissions` — mỗi item có `Submission_Status`, `Is_Submitted_On_Time`.

**Việc cần làm:**
1. Tính 3 nhóm: Đúng hạn (`Is_Submitted_On_Time = 1`), Trễ hạn (đã nộp nhưng `Is_Submitted_On_Time = 0`), Chưa nộp (`Submission_Status` tương ứng chưa nộp).
2. Vẽ donut/pie chart thể hiện tỷ lệ 3 nhóm này, đặt ở đầu trang (trên bảng chi tiết hiện có).
3. Không cần gọi thêm API.

---

### 2.3. [SINH VIÊN] Heatmap thời gian học theo ngày trong tuần

**Trang:** `Frontend/SinhVien/src/pages/StudentEngagement.jsx`
**Nguồn dữ liệu:** API `/api/v1/student/engagement`, field `dailyTrend[]` — **đã trả về TOÀN BỘ lịch sử theo ngày** (`date`, `totalHours`), không chỉ 5 ngày gần nhất. Frontend hiện tại đang tự cắt (`.slice`) chỉ lấy 5 dòng cuối để hiển thị thành list tĩnh "Nhật ký tương tác gần đây" — đây là chỗ đang lãng phí dữ liệu.

**Việc cần làm:**
1. Giữ nguyên phần "Nhật ký tương tác gần đây" nếu muốn (list 5 ngày gần nhất vẫn có giá trị tham khảo nhanh), nhưng **thêm mới** bên cạnh/bên dưới: 1 heatmap kiểu GitHub-contribution — dùng toàn bộ `dailyTrend[]`, group theo tuần (cột) và thứ trong tuần (hàng: T2–CN), tô đậm nhạt theo `totalHours` (càng nhiều giờ càng đậm màu xanh DLU `--dlu-green-accent`).
2. Nếu dữ liệu trải quá nhiều tuần gây chật, giới hạn hiển thị 8–12 tuần gần nhất, có thể thêm nút "xem toàn bộ".
3. Không cần gọi thêm API, không cần sửa backend.

---

### 2.4. [GIẢNG VIÊN] Danh sách sinh viên có nguy cơ (Risk List) — ưu tiên cao nhất bên Giảng viên

**API đã tồn tại sẵn:** `GET /api/courses/:courseId/student-analytics` (controller: `getCourseStudentAnalytics` trong `backend/src/GiangVien/controllers/courseController.js`) — **API này đã trả về gần như đầy đủ mọi thứ cần cho risk list**, gồm mỗi sinh viên có: `Average_Grade_Percentage`, `Submission_Rate`, `On_Time_Rate`, `Late_Submissions`, `Total_Time_Spent_Minutes`, `Is_Passed`.

**Việc cần làm:**
1. Kiểm tra `Frontend/GiangVien/src/pages/ClassManagement.jsx` xem đã gọi API này chưa (khu vực `student-analysis-section`) — nếu đã gọi rồi thì **không cần fetch mới**, chỉ cần bổ sung UI.
2. Thêm 1 section "Sinh viên cần chú ý" ở đầu trang `ClassManagement.jsx` (trước bảng danh sách đầy đủ), lọc + sort theo quy tắc rủi ro, ví dụ (có thể điều chỉnh ngưỡng theo dữ liệu thực tế):
   - `Average_Grade_Percentage < 50` (dưới điểm đạt), HOẶC
   - `On_Time_Rate < 50` (trễ hạn hơn một nửa), HOẶC
   - `Total_Time_Spent_Minutes` thuộc nhóm thấp nhất (ví dụ dưới 25th percentile trong lớp)
3. Mỗi dòng risk list hiển thị: tên SV, lý do được gắn cờ (badge màu đỏ/cam: "Điểm thấp", "Nộp trễ nhiều", "Ít tương tác"), và số liệu cụ thể đi kèm.
4. Đây chỉ là danh sách quan sát — không có nút hành động nào khác ngoài "Xem chi tiết" (điều hướng tới thông tin sinh viên đó trong bảng đầy đủ bên dưới).

---

### 2.5. [GIẢNG VIÊN] Histogram phân bố điểm theo từng bài

**Nguồn dữ liệu:** Cùng API `student-analytics` ở trên đã có `Average_Grade_Percentage` theo từng sinh viên trong course. Nếu cần phân bố theo **từng bài cụ thể** (không chỉ điểm trung bình cả môn), cần thêm 1 endpoint mới hoặc mở rộng endpoint hiện tại để trả về `Fact_Course_Grade` theo từng `Activity_Key` thay vì gộp trung bình — kiểm tra trước khi code mới, có thể tận dụng cùng JOIN đã viết sẵn trong `courseController.js`, chỉ bỏ bước `AVG()` và group theo `Activity_Key` thay vì theo `User_Key`.

**Việc cần làm:**
1. Thêm section trong `ClassManagement.jsx` hoặc trang `Courses.jsx`: chọn 1 assignment/quiz cụ thể → hiển thị histogram (số sinh viên đạt từng khoảng điểm: 0–5, 5–7, 7–8.5, 8.5–10).
2. Vẽ bằng cùng phong cách bar chart CSS đang dùng (`analytics-bar-item`), trục là khoảng điểm thay vì tên môn.

---

### 2.6. [GIẢNG VIÊN] Bảng so sánh các lớp/course đang dạy

**Nguồn dữ liệu:** `GET /api/teachers/:teacherId/courses` (đã có danh sách course) kết hợp `student-analytics` mỗi course để tính trung bình.

**Việc cần làm:**
1. Thêm 1 bảng/section trong `TeacherOverview.jsx` hoặc `Courses.jsx`: mỗi dòng là 1 course GV đang dạy, cột gồm: điểm TB cả lớp, tỷ lệ pass (`Is_Passed = 1` / tổng), tỷ lệ nộp đúng hạn TB, tổng giờ tương tác TB.
2. Chỉ hiển thị nếu GV dạy từ 2 course trở lên (nếu chỉ dạy 1 course thì ẩn phần so sánh, không có ý nghĩa).

---

### 2.7. [GIẢNG VIÊN] Xu hướng engagement lớp theo tuần

**Nguồn dữ liệu:** `Fact_Daily_Engagement` join `Dim_Date` — cần viết query mới group theo `Week_Number` và `Course_Key`, trung bình `Time_Spent_Seconds` của tất cả sinh viên trong lớp mỗi tuần.

**Việc cần làm:**
1. Thêm endpoint mới, ví dụ `GET /api/courses/:courseId/engagement-trend`, trả về mảng `{ week, avgHoursPerStudent }`.
2. Vẽ line chart trong `ClassManagement.jsx` — giúp GV thấy tuần nào cả lớp giảm tương tác (ví dụ sau giữa kỳ) để điều chỉnh.

---

## PHẦN 3 — CẦN THÊM DỮ LIỆU TRƯỚC KHI LÀM UI (chưa làm ngay)

### 3.1. So sánh bản thân sinh viên với trung bình lớp (ẩn danh)

Ý tưởng: "Bạn cao hơn trung bình lớp 0.8 điểm", "Bạn thuộc top 30% thời gian học". Cần thêm 1 endpoint tính AVG/PERCENTILE theo `Course_Key` trên toàn bộ sinh viên trong lớp (không lộ danh tính ai khác), rồi so với số liệu của sinh viên đang đăng nhập. Dữ liệu nguồn đã đủ (`Fact_Course_Grade`, `Fact_Daily_Engagement`), nhưng logic tính percentile chưa có ở backend — **để sau khi làm xong Phần 1 và Phần 2**.

---

## PHẦN 4 — DỌN SCOPE (làm sau cùng, không gấp)

| Route | Vấn đề | Việc cần làm |
|---|---|---|
| `Frontend/GiangVien` — `/de-thi` (`App.jsx`, hiện là `SimplePage title="Quản lý đề thi"`) | Chức năng vận hành LMS thật (tạo/sửa đề thi), ngoài phạm vi đồ án | Xóa route + mục menu trong Sidebar. Nếu muốn giữ, đổi nội dung placeholder thành ghi chú rõ "Ngoài phạm vi đồ án — quản lý đề thi thực hiện trên LMS gốc" |
| `/phuc-khao` (`SimplePage title="Xét duyệt phúc khảo"`) | Duyệt phúc khảo là thao tác nghiệp vụ | Xóa route + mục menu. Nếu có dữ liệu phúc khảo thật trong DW thì thay bằng báo cáo số liệu (read-only), nếu không có dữ liệu thì xóa hẳn |
| `/lich`, `/ho-tro` | Đang là trang rỗng "sẽ nối dữ liệu sau" | Nếu giữ: `/lich` chỉ hiển thị lịch tổng hợp deadline + lịch dạy (đọc từ `getTeacherSchedule` đã có), không phải công cụ tạo lịch mới cho GV thao tác nghiệp vụ ngoài phạm vi. `/ho-tro` cân nhắc xóa nếu không có dữ liệu hỗ trợ thật trong DW |

---

## Thứ tự thực hiện đề xuất cho Antigravity

1. Phần 1 (1.1, 1.2) — sửa bug + đổi tên, rủi ro thấp, làm trước.
2. Mục 2.1, 2.2, 2.3 (Sinh viên) — không cần đổi backend, chỉ thêm UI dùng lại data có sẵn.
3. Mục 2.4 (Risk List Giảng viên) — ưu tiên cao nhất bên Giảng viên, tận dụng API đã có.
4. Mục 2.5, 2.6, 2.7 (Giảng viên) — cần thêm/mở rộng backend.
5. Phần 4 — dọn scope.
6. Phần 3 — làm cuối cùng nếu còn thời gian.
