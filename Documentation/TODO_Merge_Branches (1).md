# TODO cho Antigravity — Gộp 3 nhánh mà KHÔNG làm mất công của ai

> Mục tiêu: gộp `VoHungManh_GiangVien` (Mạnh) và `SinhVien` (Phước) vào `SinhVien_Nguyen` (nhánh chung, đã chứa phần của Nguyên). Kết quả là 1 nhánh mới chạy được, **giữ nguyên toàn bộ tính năng của cả 3 người**.
> Phiên bản 2 (đã đối chiếu với báo cáo của Antigravity). Lưu ý về số xung đột: bản mô phỏng ban đầu (lấy `main` làm gốc, không có lịch sử commit) cho ra 18 file với Mạnh và 8 file với Phước. Đây chỉ là **cận trên**. Số thật có thể thấp hơn nhiều vì git có lịch sử thật (Phước ~10 commit, Mạnh 1 commit lớn 38 file). **Con số đáng tin là kết quả chạy thử merge thật ở Bước 1** bên dưới. Bảng mục 3 chỉ áp dụng cho những file thực sự xung đột.

## 0. Quy tắc an toàn (bắt buộc)

1. **Không** force push, **không** `git reset --hard`/`git checkout -- .` trên nhánh có sẵn, **không** xoá nhánh nào, **không** push thẳng lên `main`.
2. Trước khi làm: tạo tag backup cho cả 3 nhánh (`git tag backup/nguyen-<ngày> SinhVien_Nguyen`, tương tự `backup/manh-...`, `backup/phuoc-...`).
3. Làm trên nhánh mới `integration/merge-all` tách từ `SinhVien_Nguyen`. Merge từng nhánh bằng `git merge --no-ff` (giữ lịch sử tác giả), **không** squash, **không** rebase.
4. Khi giải quyết xung đột: mặc định **giữ cả hai bên (union)**. Chỉ được bỏ code của một bên khi bảng quy tắc ở mục 3 nói rõ. Cấm "accept ours/theirs" cho cả file nếu bảng không ghi như vậy.
5. Làm theo thứ tự ở mục 2. **Sau mỗi bước DỪNG**, báo cáo: file đã xung đột, cách đã giải quyết từng file, kết quả build/test. Chờ xác nhận mới làm bước sau.
6. Không commit file `.env`, token, secret. Không sửa nội dung nghiệp vụ ngoài phạm vi giải quyết xung đột.
7. Nếu gặp xung đột không có trong mục 3, hoặc không chắc nên giữ bên nào: DỪNG và hỏi, kèm `git diff` của đoạn đó.
8. **Phần việc chưa đẩy lên remote của Nguyên** (Design System, `DluHeader`, Hero score, Radar 5 cạnh, `Header.jsx`, `TeacherOverview.css`...) phải được commit và push lên `SinhVien_Nguyen` TRƯỚC khi merge bất cứ thứ gì. Bản trên remote hiện tại **chưa có** các file này (không tìm thấy `DluHeader*` ở cả 3 nhánh trên remote). Nếu quên bước này thì nhánh tích hợp sẽ thiếu giao diện mới.

## 1. Ai làm gì (để biết cái gì phải giữ)

**Nguyên (nhánh chung `SinhVien_Nguyen`)** — phần dữ liệu tổng hợp:
- `backend/src/shared/analytics/{analyticsConfig,behaviorMetrics}.js`; scripts `computeCorrelation.js`, `computeEarlyWarningEval.js`, `testBehaviorMetrics.js`, `testTask2..7*.js`; `Database/17_create_analytics_tables.sql`; thư mục `docs/`.
- Giảng viên: `components/class-management/{SubmissionBehaviorSection,SegmentsScatterSection,EarlyWarningRiskSection}.jsx` và các API tương ứng trong `courseController.js`/`courseRoutes.js`/`teacherApi.js`.
- Sinh viên: `pages/StudentBehavior.jsx`, mục menu "Hồ sơ hành vi" + route hash `#hanh-vi`, API `behavior-profile` (`studentController.js`, `studentRoutes.js`), sidebar thu gọn được, các chỉnh sửa `StudentOverview.jsx`.
- Phần Giảng viên dùng chung có sẵn trong nhánh (giống bản của Mạnh, không phải xung đột): lịch dạy có thêm/sửa/xoá, thông báo, so sánh lớp (`pages/ClassComparison`), `TeacherProfile`, `ActivityDashboard`, mailer.

**Mạnh (`VoHungManh_GiangVien`)** — phần Giảng viên + Power BI:
- Nhúng Power BI **có xác thực** (MSAL, User-owns-data): `components/powerbi/SecurePowerBIReport.jsx`, `services/powerBiAuthService.js`, `config/powerBiConfig.js`, `config/msalConfig.js` (đọc từ biến môi trường), `auth.html`, `src/auth-bridge.js`, `.env.example`, `vite.config.js`, và trang `pages/Analytics.jsx` với 7 tab ứng với 7 trang Power BI.
- Grade Simulator (CSDL): `Database/27..30_*teacher_grade*`, `ETL/11_etl_teacher_grade_simulator.sql`.
- Module **Quản lý bài tập & chấm điểm**: `pages/AssignmentManagement.jsx`, `components/assignment/*` (ngân hàng bài tập, giao bài ngẫu nhiên, danh sách đợt giao, chấm điểm, tab Power BI), `assignmentController/Routes/Service`, `Database/31_*`, `ETL/12_sync_assignment_to_dw.sql`, `scripts/test_assignments_suite.js`.
- Danh sách "sinh viên cần chú ý" viết trực tiếp trong `ClassManagement.jsx` (biến `riskStudents`).

**Phước (`SinhVien`)** — phần Sinh viên + Power BI:
- Đăng nhập sinh viên: `pages/StudentLogin.jsx`, `components/StudentProtectedRoute.jsx`, `services/studentAuth.js` (có `getStudentUsername`), `styles/Login.css`; chỉnh sửa `seedAuth.js`, `Login.jsx` (Giảng viên).
- Nhúng Power BI cho sinh viên: `components/PowerBIEmbed.jsx` (bản mới có nút mở rộng 880px), `services/powerbiConfig.js` (ID trang Grade Prediction / Effort, bộ lọc URL theo username và môn), `styles/PowerBIEmbed.css`, nhúng vào `StudentCourses.jsx` (Effort) và `StudentCourseDetail.jsx` (Grade Prediction), `styles/course-detail.css`.
- Sửa nhỏ `studentController.js` (thêm `courseName`, `name`).

## 2. Thứ tự thực hiện

**Bước 1 — Chuẩn bị và chạy thử (dry-run):**
1. `git fetch --all --prune`. Kiểm tra `git status` ở `SinhVien_Nguyen` (local). Commit và push toàn bộ phần việc chưa đẩy (quy tắc 8). Báo cáo `git log --oneline origin/SinhVien_Nguyen -5`.
2. Tag backup 3 nhánh. Tạo `integration/merge-all` từ `SinhVien_Nguyen`.
3. Chạy `npm install` + `npm run build` ở `Frontend/GiangVien`, `Frontend/SinhVien` và khởi động backend để biết trạng thái "xanh" ban đầu.
4. **Dry-run thật:** `git merge --no-commit --no-ff origin/SinhVien` rồi `git diff --name-only --diff-filter=U`, sau đó `git merge --abort`. Làm tương tự với `origin/VoHungManh_GiangVien`. Báo cáo danh sách xung đột thật của từng nhánh, và **tác giả từng nhánh** (`git log --format='%an %s' <nhánh> --not SinhVien_Nguyen`). DỪNG chờ xác nhận.

**Bước 2 — Merge Phước trước** (ít xung đột, 8 file). Giải quyết theo mục 3. Build lại cả hai frontend. DỪNG báo cáo.

**Bước 3 — Merge Mạnh** (xung đột chính). Giải quyết theo mục 3. Build lại, khởi động backend, thử các endpoint ở mục 4. DỪNG báo cáo.

**Bước 4 — Kiểm tra bảo toàn** theo checklist mục 4 (grep từng mục phải tồn tại). Báo cáo bảng PASS/FAIL.

**Bước 5 — Push** nhánh `integration/merge-all` (không phải `main`) và nêu sẵn lệnh/nội dung để người dùng tạo Pull Request.

## 3. Quy tắc giải quyết xung đột theo từng file

### Sinh viên (khi merge Phước)

| File | Cách giải quyết |
|---|---|
| `PowerBIEmbed.jsx`, `styles/PowerBIEmbed.css`, `services/studentAuth.js` (add/add) | Lấy bản của **Phước** (mới hơn: có nút mở rộng, có `getStudentUsername`). Kiểm tra mọi chỗ trong code của Nguyên đang gọi `PowerBIEmbed`/`studentAuth` vẫn đúng tham số (ví dụ `StudentAnalytics.jsx`). |
| `StudentCourses.jsx`, `StudentCourseDetail.jsx` | Lấy bản của **Phước** (có nhúng Power BI Effort/Grade Prediction). Giữ lại mọi thay đổi nhỏ của Nguyên nếu không trùng chỗ (khớp từng hunk, không thay cả file). |
| `StudentSidebar.jsx`, `StudentHeader.jsx` | **Gộp (union)**: giữ sidebar thu gọn + mục "Hồ sơ hành vi" + nhãn của Nguyên, **và** nút Đăng xuất/`clearAuthStorage` + phần xác thực của Phước. Không được mất mục menu nào. |
| `main.jsx`, `App.jsx` (Sinh viên) | **Gộp**: route của Nguyên (`#hanh-vi`/`behavior`, `StudentBehavior`) + bảo vệ đăng nhập (`StudentProtectedRoute`) và trang login của Phước. |

### Giảng viên (khi merge Mạnh)

| File | Cách giải quyết |
|---|---|
| `config/msalConfig.js` (add/add) | Lấy bản của **Mạnh** (đọc từ `powerBiConfig`, `redirectUri` qua `auth.html`). Giữ nguyên `auth.html`, `auth-bridge.js`, `vite.config.js`, `.env.example` của Mạnh. |
| `pages/Analytics.jsx`, `components/class-management/PowerBIClassReport.jsx`, `StudentAnalyticsPanel.jsx` | Lấy bản của **Mạnh** (Power BI có xác thực, 7 tab). Nếu bản của Nguyên có phần nào khác (ví dụ dùng `useTeacherDashboard`), báo cáo trước khi bỏ. |
| `pages/ClassManagement.jsx` | Nguyên là chính: giữ `SubmissionBehaviorSection`, `SegmentsScatterSection`, `EarlyWarningRiskSection`. **Không xoá** khối "risk list" của Mạnh: tách ra component mới `components/class-management/SimpleRiskList.jsx` (giữ nguyên logic `riskStudents`, kèm CSS), rồi hiển thị dưới `EarlyWarningRiskSection` trong một khối thu gọn `<details>` tên "Danh sách lọc theo ngưỡng đơn giản". |
| `styles/ClassManagement.css` | Gộp cả hai (cùng giữ class của hai bên). Nếu trùng tên class, đổi tên class của Mạnh thêm tiền tố `simple-` và cập nhật `SimpleRiskList.jsx`. |
| `components/Sidebar.jsx`, `Header.jsx`, `App.jsx`, `main.jsx` (Giảng viên) | **Gộp**. Route/Menu của cả hai cùng tồn tại. Riêng route chấm điểm xem mục "Quyết định cần xác nhận" bên dưới. |
| `services/teacherApi.js` | **Gộp**: giữ hàm của cả hai (hàm của Nguyên: submission-behavior, segments, risk...; của Mạnh: assignment/grading...). Kiểm tra không trùng tên hàm/export. |
| `backend/src/GiangVien/controllers/courseController.js` | **Gộp** hàm của cả hai (Nguyên: `getCourseSubmissionBehavior`, segments, risk...; Mạnh: các thay đổi của họ). Kiểm tra `export` không trùng. |
| `backend/src/app.js` | **Gộp**: giữ mọi `import`/`app.use` của cả hai (đặc biệt `assignmentRoutes` gắn dưới `/api/teachers` của Mạnh, và các route comparison/calendar/notification/analytics của nhánh chung). Kiểm tra thứ tự không làm route `/:teacherId` bắt nhầm. |
| `Frontend/SinhVien/src/{App.jsx,main.jsx,StudentSidebar.jsx,StudentHeader.jsx,StudentCompetencyRadar.jsx}` (xung đột khi Mạnh vào) | Nếu đã merge Phước trước, dùng quy tắc ở bảng Sinh viên ở trên. Với `StudentCompetencyRadar.jsx` (add/add, hai bản khác nhau ~138 dòng): in `diff` ra báo cáo, mặc định giữ bản **Nguyên** nếu bản Mạnh không có tính năng thêm; nếu có thì hợp nhất thủ công và nói rõ. |

### Cơ sở dữ liệu / ETL
Không xung đột tên file (`17_*` của Nguyên; `27..31_*` và `ETL/11,12` của Mạnh). Giữ tất cả. Có **hai file bắt đầu bằng `31_`** của Mạnh (`31_create_assignment_management.sql`, `31_seed_assignment_bank_optional.sql`): giữ nguyên tên, ghi vào mục "thứ tự chạy SQL" trong README mới (không đổi tên nếu chưa được duyệt).

### Quyết định cần xác nhận (mặc định bên dưới, người dùng có thể đổi)

**Module Quản lý bài tập & chấm điểm của Mạnh** cho phép giảng viên tạo bài, giao bài ngẫu nhiên và **chấm điểm trong hệ thống**. Điều này trái với định hướng của giảng viên hướng dẫn (dashboard chỉ để theo dõi, không vận hành LMS), và nhánh Mạnh đã **thay** các route `/cham-diem/:courseId` (vốn là trang theo dõi + nút "Mở LMS") bằng `AssignmentManagement`.
- **Mặc định (A):** giữ toàn bộ code của Mạnh, nhưng (1) khôi phục `/cham-diem/:courseId` và `/cham-diem` về trang `Grading` theo dõi như nhánh Nguyên, (2) giữ `AssignmentManagement` ở `/quan-ly-bai-tap`, (3) mục menu "Quản lý bài tập" chỉ hiện khi biến môi trường `VITE_ENABLE_ASSIGNMENT_MANAGEMENT=true` (mặc định `false`, ghi vào `.env.example`). Backend và CSDL của Mạnh giữ nguyên, không mất dữ liệu.
- **Phương án (B):** để menu hiện như bản của Mạnh. Chỉ làm nếu người dùng yêu cầu.

**Việc dọn dẹp thêm, làm ở commit riêng sau khi merge xong và chờ duyệt:** nhóm đã chốt không đưa "Tài liệu môn học" vào dashboard, nhưng `StudentCourseDetail.jsx` ở cả 3 nhánh vẫn còn khối này. Đề xuất ẩn khối đó (không xoá API).

## 4. Checklist bảo toàn (phải PASS hết sau merge)

Kiểm tra bằng `grep`/`ls`, báo cáo từng dòng PASS/FAIL:

**Nguyên (giao diện mới, chưa lên remote lúc kiểm tra):** còn `DluHeader` (nơi nào được dùng), Hero score và Radar 5 cạnh ở `StudentOverview.jsx`/`StudentCompetencyRadar.jsx`, `Header.jsx` đồng bộ, `TeacherOverview.css`. Trang `AssignmentManagement.jsx` của Mạnh phải dùng Header/Sidebar đã đồng bộ (không giữ Header cũ).

**Nguyên (phân tích):** tồn tại `behaviorMetrics.js`, `analyticsConfig.js`, `computeCorrelation.js`, `computeEarlyWarningEval.js`, `17_create_analytics_tables.sql`, `StudentBehavior.jsx`, 3 section giảng viên; `ClassManagement.jsx` còn render cả 3; sidebar sinh viên còn mục "Hồ sơ hành vi"; `studentRoutes.js` còn `behavior-profile`; `courseRoutes.js` còn các route submission-behavior/segments/risk.

**Mạnh:** tồn tại `SecurePowerBIReport.jsx`, `powerBiAuthService.js`, `powerBiConfig.js`, `auth.html`, `auth-bridge.js`; `Analytics.jsx` còn 7 tab; còn `AssignmentManagement.jsx` + `components/assignment/*` + `assignmentRoutes.js` được mount trong `app.js`; còn `Database/27..31_*`, `ETL/11,12`; còn logic `riskStudents` (trong `SimpleRiskList.jsx`).

**Phước:** tồn tại `StudentLogin.jsx`, `StudentProtectedRoute.jsx`, `studentAuth.js` (có `getStudentUsername`), `powerbiConfig.js`, `PowerBIEmbed.jsx` (có nút mở rộng); `StudentCourses.jsx` nhúng Effort, `StudentCourseDetail.jsx` nhúng Grade Prediction; sidebar sinh viên còn nút Đăng xuất.

**Chạy được:** `npm run build` thành công ở cả hai frontend; backend khởi động không lỗi; đăng nhập được 1 tài khoản sinh viên và 1 tài khoản giảng viên (`seedAuth.js`); mở được các trang: Tổng quan, Khóa học, Hồ sơ hành vi, Phân tích (sinh viên); Tổng quan, Quản lý lớp (đủ 3 section mới + danh sách thu gọn), Phân tích 7 tab, Lịch, Thông báo (giảng viên).

## 4b. Ghi chú rủi ro (không sửa trong lần merge này, chỉ ghi vào báo cáo)

- `powerbiConfig.js` của Phước lọc dữ liệu theo sinh viên bằng **bộ lọc trên URL** (`&$filter=` theo `Username`) cùng `filterPaneEnabled=false`. Cách này chỉ ẩn giao diện, người dùng có kỹ thuật vẫn sửa được URL để xem người khác. Nó **không phải** phân quyền thật (RLS). Ghi rõ trong báo cáo là mô phỏng đăng nhập cho đồ án.
- Sinh viên hiện có hai cách nhúng Power BI: link Publish to Web (`StudentAnalytics.jsx`, công khai) và `reportEmbed` có `autoAuth` (Phước). Ghi chú sự khác biệt, không hợp nhất trong lần này.
- ID tenant/client/workspace/report đang nằm mặc định trong mã nguồn (không phải secret). Không có `.env`, secret hay `client_secret` nào bị commit. `seedAuth.js` có mật khẩu mẫu `123456` chỉ dùng cho dữ liệu demo.

## 5. Báo cáo cuối

Liệt kê: danh sách file xung đột và cách giải quyết từng file, các chỗ đã gộp thủ công, các chỗ cần người duyệt (đặc biệt `StudentCompetencyRadar.jsx` và quyết định A/B ở trên), kết quả checklist, và lệnh để tạo Pull Request.
