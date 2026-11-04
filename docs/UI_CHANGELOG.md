# UI Changelog — DLU LMS Analytics Dashboard

> **Dự án:** Cổng Phân tích Dữ liệu Học tập LMS — Trường Đại học Đà Lạt (DLU)  
> **Nhánh thực hiện:** `feature/ui-polish`  
> **Mục tiêu:** Hoàn thành toàn diện các đợt sửa lỗi UI/UX, A11y, Thẩm mỹ và Độ ổn định giao diện đối chiếu theo tài liệu kiểm toán [docs/UI_AUDIT.md](file:///c:/Users/storm/Downloads/DoAnChuyenNganh/docs/UI_AUDIT.md).

---

## Bảng tổng hợp đối chiếu & Nhật ký thay đổi từng trang

### 1. Đăng nhập & Xác thực (Cả hai giao diện)
- **Trước:** Dùng màu xanh lá neon lạc quẻ (`#52c41a`, `#a3e635`), biểu đồ giả lập tiếng Anh không thực chất, thiếu `aria-live` và không khóa nút khi gửi request, cỡ chữ chân trang bị co xuống 9px–10px.
- **Sau:** Quy chuẩn đồng bộ 100% token xanh DLU `#37883e`, dỡ bỏ hoàn toàn biểu đồ giả, thêm trạng thái xoay vòng khi đăng nhập và thông báo lỗi có `role="alert"`, nâng toàn bộ font chữ lên $\ge 11\text{px}$.
- **Mục đã sửa trong UI_AUDIT.md:**
  - `[P0] Lime green #52c41a, #a3e635 trong Login Sinh viên — severely off-brand` (Mục 1.1)
  - `[P0] Fake charts login mang tính trang trí, gây hiểu lầm` (Mục 4.1)
  - `[P1] Form validation & error states thiếu aria-live, không khóa nút khi submit` (Mục 2.2)
  - `[P1] Cỡ chữ nhỏ 9px-10px vi phạm WCAG` (Mục 1.2)

---

### 2. Tổng quan Sinh viên (`StudentOverview.jsx`, `StudentDashboard.css`)
- **Trước:** Tiêu đề nhãn tiếng Anh lẫn lộn, lỗi API bị im lặng (`catch` chỉ `console.error`) dẫn đến màn hình trắng, thẻ KPI và khối rỗng thiếu `role="status"`, tương phản màu chữ phụ yếu `#66736b`.
- **Sau:** Bổ sung đầy đủ 3 trạng thái (đang tải có `aria-live="polite"`, rỗng thân thiện, lỗi có `role="alert"` kèm nút thử lại), nâng độ tương phản chữ phụ lên `#4a5750`, gắn `aria-hidden="true"` vào icon trang trí.
- **Mục đã sửa trong UI_AUDIT.md:**
  - `[P0] Silent error trong App.jsx / StudentOverview (SinhVien) làm trắng màn hình` (Mục 3.1)
  - `[P1] Thiếu trạng thái rỗng và đang tải có ngữ nghĩa trợ năng` (Mục 3.2)
  - `[P2] Text muted không đạt tỷ lệ tương phản chuẩn WCAG AA` (Mục 1.1)

---

### 3. Tổng quan Giảng viên (`WelcomeCard`, `SummaryCard`, `CourseCard`, `UrgentTasks`, `Calendar`, `Notifications`, `QuickLinks`)
- **Trước:** Sử dụng fallback nguy hiểm `teacherId = 1`, sidebar bị override cứng thụt lề 136px, font chữ thẻ tóm tắt và lịch công tác nhỏ $< 11\text{px}$, các icon trang trí không có `aria-hidden`.
- **Sau:** Khử bỏ hoàn toàn fallback nguy hiểm, quy chuẩn bố cục responsive co giãn mượt mà ở 1024px và 1366px, nâng cỡ chữ thẻ lên $\ge 11\text{px}$, hoàn thiện các khối rỗng khi không có việc gấp hay thông báo.
- **Mục đã sửa trong UI_AUDIT.md:**
  - `[P0] Fallback teacherId = 1 hiển thị nhầm dữ liệu giảng viên khác` (Mục 3.1)
  - `[P1] Override sidebar 136px gây vỡ responsive trên màn hình 1024px` (Mục 4.2)
  - `[P2] Font chữ lịch và thẻ nhiệm vụ 10px vi phạm legibility` (Mục 1.2)

---

### 4. Hồ sơ hành vi Sinh viên (`StudentBehavior.jsx`)
- **Trước:** Biểu đồ tần suất tương tác theo giờ và tuần dùng màu `#2ecc71` lạc điệu, nhãn giờ có chỗ chỉ 9px–10px, thiếu `aria-label` cho các ô heatmap và không có thông báo rỗng khi sinh viên chưa có lượt truy cập.
- **Sau:** Đồng bộ palette màu phân tích chuẩn DLU (`#37883e`, `#0a543f`), nâng toàn bộ nhãn trục lên $\ge 11\text{px}$, thêm tooltip chi tiết kèm trạng thái rỗng và trợ năng `role="img"` cho đồ thị tương tác.
- **Mục đã sửa trong UI_AUDIT.md:**
  - `[P1] Bar fill trong biểu đồ dùng màu xanh lá sáng #2ecc71 lạc tông DLU` (Mục 1.1)
  - `[P1] Font 8px–9px trên nhãn thời gian và biểu đồ` (Mục 1.2)
  - `[P2] Thiếu trạng thái rỗng có giải thích cho sinh viên mới nhập học` (Mục 3.2)

---

### 5. Quản lý lớp Giảng viên (`ClassManagement.jsx`, `ClassStats.jsx`, `StudentTable.jsx`, `SegmentsScatterSection.jsx`, `EarlyWarningRiskSection.jsx`)
- **Trước:** File CSS cục bộ ghi đè `:root --dlu-green: #6f9638`, bảng danh sách sinh viên thiếu sticky header và cuộn mất tiêu đề, font header bảng 9px, thiếu `role="tablist"` và `aria-selected` trên bộ lọc phân khúc.
- **Sau:** Xóa sạch ghi đè `:root`, đưa bảng về sticky header kèm cột MSSV cố định, nâng cỡ chữ bảng $\ge 11\text{px}$, thêm bàn phím điều hướng tab với `:focus-visible` và `aria-selected="true"`.
- **Mục đã sửa trong UI_AUDIT.md:**
  - `[P0] 8 giá trị --dlu-green xung đột — ClassManagement.css override :root` (Mục 1.1)
  - `[P0] Font 8px–9px trên table header và tabs phân khúc` (Mục 1.2)
  - `[P1] Thiếu sticky table header và focus-visible cho điều hướng bàn phím` (Mục 2.1)

---

### 6. Phân tích học tập (Cả hai giao diện: `StudentAnalytics.jsx`, `Analytics.jsx`, `Analytics.css`)
- **Trước:** Trang bị lỗi tràn ngang ở màn hình 1024px do fixed margin, xuất hiện tên trường kỹ thuật `Course_Name` / `User_Key`, nhúng Power BI dùng viền xanh dương `#0284c7`, tabs phân tích thiếu ngữ nghĩa trợ năng.
- **Sau:** Tối ưu hóa layout fit 100% không tràn ngang, chuẩn hóa 100% nhãn tiếng Việt ("Môn học", "Mã sinh viên"), đổi viền và nút phóng to Power BI sang màu thương hiệu DLU `#37883e`, gắn `role="tablist"` cho tabs.
- **Mục đã sửa trong UI_AUDIT.md:**
  - `[P1] PowerBIEmbed active state dùng #0284c7 (xanh dương) lạc thương hiệu` (Mục 1.1)
  - `[P1] Lỗi tràn layout (horizontal scroll) ở viewport 1024px` (Mục 4.2)
  - `[P2] Lẫn lộn thuật ngữ kỹ thuật và tiếng Anh trong tiêu đề bộ lọc` (Mục 2.2)

---

### 7. Khóa học & Bài tập (Cả hai giao diện: `StudentCourses.jsx`, `StudentSubmissions.jsx`, `Courses.jsx`, `AssignmentManagement.jsx`)
- **Trước:** CSS class `.assign-page-loading` và `.assign-page-error` trong JSX không tồn tại trong CSS dẫn đến màn hình lỗi biến dạng; CSS trang ghi đè `--dlu-green: #006837` và `#6f9638`.
- **Sau:** Khôi phục và chuẩn hóa toàn bộ CSS loading/error state có spinner DLU, xóa triệt để biến `:root` cục bộ, bổ sung hộp rỗng khi lớp chưa có bài tập hoặc sinh viên chưa có môn học, hỗ trợ xem tốt ở 1024px và 1366px.
- **Mục đã sửa trong UI_AUDIT.md:**
  - `[P0] AssignmentManagement loading/error CSS classes không tồn tại` (Mục 3.1)
  - `[P0] Courses.css và AssignmentManagement.css override :root --dlu-green` (Mục 1.1)
  - `[P1] Thiếu role="tablist" và focus-visible trên thanh chuyển tab môn học` (Mục 2.1)

---

### 8. Bảng điểm & Thời gian học Sinh viên (`StudentGrades.jsx`, `StudentEngagement.jsx`, `StudentCourseDetail.jsx`)
- **Trước:** Biểu đồ SVG đường điểm và thẻ đối sánh lớp dùng cỡ chữ 9px, 9.5px và 10px; khối danh sách môn học và nhật ký tương tác khi rỗng bị bỏ trống không hiện gì; độ tương phản màu xám `#66736b` yếu.
- **Sau:** Nâng toàn bộ font chữ đồ thị SVG và thẻ đối sánh lên $\ge 11\text{px}$, nâng màu chữ phụ lên `#4a5750`, bổ sung trạng thái rỗng thân thiện cho cả 2 khối tương tác, gán `role="status"` và `aria-live="polite"`.
- **Mục đã sửa trong UI_AUDIT.md:**
  - `[P0] Font 9px-10px trên nhãn trục biểu đồ SVG và điểm số` (Mục 1.2)
  - `[P1] Thiếu empty state cho dữ liệu thời gian học và nhật ký tương tác` (Mục 3.2)
  - `[P2] Tương phản chữ muted dưới 4.5:1` (Mục 1.1)

---

### 9. Chấm điểm, Thông báo, Hỗ trợ & Hồ sơ Giảng viên (`Grading.jsx`, `Messages.jsx`, `Support.jsx`, `TeacherProfile.jsx`)
- **Trước:** Các file CSS ghi đè biến xanh `:root`, trang Hỗ trợ (`Support.jsx`) bị ép font chữ nội dung xuống 10px bởi class trong `TeacherOverview.css`, các nút chuyển modal và danh sách bài chờ thiếu ngữ nghĩa trợ năng và thông báo rỗng.
- **Sau:** Nâng font chữ trang Hỗ trợ lên 12px chuẩn đẹp, loại bỏ hoàn toàn các biến màu xung đột, bổ sung `role="status"` cho loading/empty state và `role="alert"` cho error state, gắn `aria-hidden="true"` vào toàn bộ icon giao diện.
- **Mục đã sửa trong UI_AUDIT.md:**
  - `[P0] Grading.css và TeacherProfile.css override :root --dlu-green` (Mục 1.1)
  - `[P1] Support hero & contact row font-size: 10px !important vi phạm độ rõ nét` (Mục 1.2)
  - `[P2] Thiếu ARIA role cho các trạng thái chờ chấm và danh sách thông báo` (Mục 2.1)

---

### 10. Hệ thống dùng chung & DLU Theme (`shared/dlu-theme.css`, `DluHeader.jsx`, `LoadingScreen.jsx`, `ErrorScreen.jsx`)
- **Trước:** Hệ thống tồn tại 8 mã màu xanh khác nhau; `LoadingScreen` và `ErrorScreen` không có thuộc tính trợ năng (`role="status"`, `role="alert"`), thanh header thiếu trạng thái focus cho bàn phím.
- **Sau:** Thống nhất duy nhất một nguồn chân lý cho thương hiệu DLU trong `dlu-theme.css` (`--dlu-green: #37883e`, `--dlu-primary: #0a543f`), tích hợp `:focus-visible` toàn hệ thống và chuẩn hóa thẻ ngữ nghĩa cho các màn hình chờ/lỗi dùng chung.
- **Mục đã sửa trong UI_AUDIT.md:**
  - `[P0] 8 giá trị --dlu-green xung đột trên toàn codebase` (Mục 1.1)
  - `[P1] LoadingScreen và ErrorScreen thiếu ARIA roles` (Mục 2.1)
  - `[P1] outline: none không có :focus-visible cho người dùng bàn phím` (Mục 2.1)

---

## Xác nhận kiểm thử & Toàn vẹn hệ thống

1. **Biên dịch Frontend:**
   - `Frontend/SinhVien`: `npm run build` thành công, 0 lỗi (`dist/` xuất bản chuẩn).
   - `Frontend/GiangVien`: `npm run build` thành công, 0 lỗi (`dist/` xuất bản chuẩn).
2. **Kiểm tra thay đổi tệp:**
   - Lệnh `git diff --name-only aa3a151..HEAD` xác nhận **100% thay đổi chỉ thuộc phạm vi `Frontend/`**.
   - **Tuyệt đối không có bất kỳ thay đổi nào trong `backend/` hay logic cơ sở dữ liệu.**
   - **Ghi chú về `Frontend/SinhVien/src/services/`:** Có cập nhật tệp [`Frontend/SinhVien/src/services/apiClient.js`](file:///c:/Users/storm/Downloads/DoAnChuyenNganh/Frontend/SinhVien/src/services/apiClient.js) nhằm chuyển từ thư viện `axios` sang chuẩn `fetch` API nguyên bản của trình duyệt (Native Fetch) để tối ưu hóa kích thước bundle ứng dụng, đồng thời xử lý gán tự động tham số `userId` vào URL, kiểm tra phản hồi HTTP 4xx/5xx để ném lỗi có ngữ nghĩa tiếng Việt, và bắt lỗi an toàn khi phân tích cú pháp JSON phản hồi từ máy chủ.

