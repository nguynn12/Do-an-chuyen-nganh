# UI Audit Report — DLU LMS Analytics Dashboard

> **Nhánh:** `feature/ui-polish` | **Phạm vi:** `Frontend/GiangVien/src` + `Frontend/SinhVien/src` + `Frontend/shared`
> **Ngày audit:** 2026-11-03 | **Phương pháp:** Impeccable audit/critique + taste/redesign-existing-projects (static source scan + subagent scan)
> **⚠️ Audit dựa hoàn toàn trên source code — không có browser render. Một số issues cần xác nhận thêm trên browser thật.**
> **KHÔNG sửa code trong audit này. Chờ duyệt.**

---

## Audit Health Score

| # | Dimension | Điểm | Phát hiện chính |
|---|-----------|------|-----------------|
| 1 | Accessibility (A11y) | **1/4** | 8px/9px text trên bảng và tab; `outline:none` không có `:focus-visible`; thiếu `role="alert"`, `aria-label` |
| 2 | Performance | **2/4** | `TeacherOverview.css` 4079 dòng import trên nhiều route; CSS classes trong JSX không tồn tại trong CSS |
| 3 | Theming / Token | **0/4** | **8 giá trị `--dlu-green` khác nhau** — mỗi CSS trang ghi đè `:root` với giá trị riêng |
| 4 | Responsive Design | **2/4** | Shared `dlu-theme.css` tốt; trang con dùng `padding-left: 272px` cứng, fixed column widths |
| 5 | Implementation Integrity | **1/4** | Silent error không show UI; fallback `teacherId = 1` nguy hiểm; fake charts trang trí |
| **Tổng** | | **6/20** | **Poor — Cần xử lý hệ thống, không chỉ polish** |

---

## Executive Summary

- **Tổng lỗi:** ~58 lỗi (P0: 8, P1: 22, P2: 20, P3: 8)
- **Nguyên nhân gốc rễ:** Codebase phát triển song song trên nhiều nhánh của nhiều thành viên, mỗi người tạo CSS riêng với `:root` local overrides thay vì dùng shared tokens. Điều này tạo ra **8 giá trị `--dlu-green` khác nhau** trên toàn project — một số file **ghi đè chính `--dlu-green` trong `:root`**, làm thay đổi toàn bộ màu sắc trong scope đó.

**Top 8 vấn đề nghiêm trọng nhất:**
1. **8 giá trị `--dlu-green` xung đột** — `ClassManagement.css`, `AssignmentManagement.css`, `Grading.css`, `Courses.css`, `TeacherProfile.css`, `Notifications.css` đều override `:root --dlu-green` với giá trị riêng
2. **Font 8px–9px trên functional text** — table header, tab label, stat label, breadcrumb — vi phạm legibility và WCAG
3. **`outline: none` không có `:focus-visible`** trên tabs (ClassManagement, Courses, Grading, AssignmentManagement) — keyboard users mất hoàn toàn focus indicator
4. **AssignmentManagement loading/error CSS classes không tồn tại** — JSX render `.assign-page-loading`, `.assign-spinner-large`, `.assign-page-error` nhưng không có CSS nào match
5. **Silent error trong App.jsx (SinhVien)** — `catch` chỉ `console.error`, không show UI error state
6. **`localStorage.getItem("currentTeacherId") || 1`** — fallback về teacher ID=1 có thể show dữ liệu của giảng viên khác
7. **Lime green `#52c41a`, `#a3e635`** trong login Sinh viên (Ant Design/Tailwind colors) — severely off-brand
8. **PowerBIEmbed active state dùng `#0284c7` (xanh dương)** — hoàn toàn lạc điệu với identity DLU xanh thông rừng

---

## Heuristics Score (Nielsen 10)

| # | Heuristic | Điểm | Vấn đề chính |
|---|-----------|------|--------------|
| 1 | Visibility of System Status | **1** | LoadingScreen có nhưng thiếu ARIA; Power BI không có fallback; App.jsx SinhVien: lỗi API không hiển thị |
| 2 | Match System / Real World | **3** | Tiếng Việt tốt; label tiếng Anh sót trong fake charts login ("Learning Progress", "Performance") |
| 3 | User Control and Freedom | **2** | Hash routing SinhVien cản browser back; không có undo cho logout |
| 4 | Consistency and Standards | **0** | 8 giá trị green xung đột; 2 portal inconsistent hoàn toàn về routing, loading states, sidebar margin |
| 5 | Error Prevention | **2** | Role guard tốt; fallback `teacherId || 1` nguy hiểm; login không disable button khi loading |
| 6 | Recognition Rather Than Recall | **2** | Sidebar label tốt khi expanded; collapsed mode không có ARIA; nhiều icon không có tooltip |
| 7 | Flexibility and Efficiency | **1** | Không có keyboard shortcuts; tab navigation không có `aria-selected`/`role="tablist"` |
| 8 | Aesthetic and Minimalist Design | **2** | Fake charts login; 4079 dòng CSS một trang; lime green off-brand trong Login SinhVien |
| 9 | Error Recovery | **1** | App.jsx SinhVien: silent error; AssignmentManagement: missing CSS cho error state; no `role="alert"` |
| 10 | Help and Documentation | **1** | Không có tooltip, không có help inline cho early warning score, không có onboarding |
| **Tổng** | | **15/40** | **Poor (37%) — Major UX overhaul required** |

---

## Nhóm 1: Màu sắc & Chữ

### 1.1 Token / Theming

#### [P0] 8 giá trị `--dlu-green` xung đột — mỗi CSS file override `:root`
- **Mức độ:** P0 — Brand-breaking, systemic
- **Files & giá trị:**

  | File | Giá trị `--dlu-green` khai báo trong `:root` |
  |------|----------------------------------------------|
  | `shared/dlu-theme.css` | `#0a543f` ✅ (canonical) |
  | `StudentDashboard.css` | `#0a543f` ✅ (đúng, nhưng sau đó dùng nhiều giá trị khác) |
  | `ClassManagement.css` L5 | `#6f9638` ❌ |
  | `AssignmentManagement.css` L6 | `#006837` ❌ |
  | `Grading.css` L6 | `#6f9638` ❌ |
  | `Courses.css` L6 | `#6f9638` ❌ |
  | `TeacherProfile.css` L1 | `#19713b` ❌ |
  | `Notifications.css` | `#08704f` ❌ (dùng như primary green) |
  | `Analytics.css` | `#2e7d32` ❌ (dùng như primary green) |
  | `Login.css` (SinhVien) | `#2d864e` ❌ (trên submit button) |

- **Hậu quả:** Khi một component dùng `var(--dlu-green)`, màu thực tế phụ thuộc vào CSS file nào load trước — không thể dự đoán. Đặc biệt nguy hiểm trên trang `ClassManagement` và `Courses` khi sidebar cùng page sẽ thấy `--dlu-green: #6f9638` thay vì `#0a543f`.
- **Khuyến nghị:** Xóa tất cả `:root { --dlu-green: ... }` trong CSS trang con, chỉ giữ định nghĩa trong `dlu-theme.css`.

#### [P0] Lime green `#52c41a`, `#a3e635` trong Login Sinh viên — severely off-brand
- **File:** `Frontend/SinhVien/src/styles/Login.css` dòng 83, 131, 146
- **Mô tả:**
  - L83: `.login-label { color: #52c41a }` — màu xanh lá Ant Design
  - L131: `.mini-card-title { color: #a3e635 }` — Tailwind lime-400
  - L146: `.fake-line { background: #a3e635 }` — cùng lime
- **Hậu quả:** Panel brand bên trái trang đăng nhập Sinh viên hiển thị màu xanh lá sáng, nhìn như thiết kế gaming hoặc app khởi nghiệp — hoàn toàn không khớp với DLU forest green identity.

#### [P1] PowerBIEmbed active state dùng `#0284c7` (xanh dương) — off-brand
- **File:** `Frontend/SinhVien/src/styles/PowerBIEmbed.css` dòng 75
- **Mô tả:** `.pbi-size-toggle-btn.active { background: ...; border-color: #0284c7; color: #0284c7 }` — đây là màu Tailwind `sky-600`, không liên quan đến DLU.
- **Khuyến nghị:** Đổi sang `var(--dlu-green)` hoặc `#37883e`.

#### [P1] Bar fill trong `StudentCompetencyRadar` dùng `#2ecc71` (lime) trong gradient
- **File:** `Frontend/SinhVien/src/styles/StudentCompetencyRadar.css` dòng 107
- **Mô tả:** `background: linear-gradient(to right, #08754b, #2ecc71)` — `#2ecc71` là màu Emerald của Material, rất sáng và lạc điệu với DLU greens tối.

#### [P1] Hàng trăm hex hardcode không dùng `--dlu-*` tokens
- **Files & số lượng (approximate):**
  - `TeacherOverview.css` (4079 dòng): ~361 hex values
  - `StudentDashboard.css` (1755 dòng): ~192 hex values
  - `ClassManagement.css` (3904 dòng): nhiều trăm instances
  - `AssignmentManagement.css` (1703 dòng): ~100+ instances
  - `Grading.css` (1800 dòng): ~150+ instances
  - `Courses.css` (1633 dòng): ~150+ instances
- **Hậu quả:** Không thể thay đổi palette global. Mỗi lần cần update branding phải tìm-thay thủ công hàng nghìn chỗ.

#### [P2] `#2563eb` (Tailwind blue-600) xuất hiện trong cả hai cổng
- **Files:** `TeacherOverview.css`, `StudentDashboard.css`
- **Mô tả:** Màu link/action không thuộc bảng màu DLU.

#### [P2] Text muted không nhất quán — ít nhất 8 biến thể
- **Mô tả:** `--dlu-text-muted: #667970` là token chuẩn nhưng các file dùng: `#65746d`, `#6b7770`, `#66736b`, `#69746d`, `#79867d`, `#87928a`, `#84918c`, `#71827c` — tất cả gần giống nhau nhưng không phải token.

---

### 1.2 Typography

#### [P0] Font 8px trên functional text — critical readability failure
- **Files & locations:**

  | File | Selector | Size | Loại text |
  |------|----------|------|-----------|
  | `ClassManagement.css` L427 | panel heading span | **8px** | Nhãn phần |
  | `ClassManagement.css` L514 | `.student-tab span` | **8px** | Tab label |
  | `ClassManagement.css` L641 | table `th` | **8px** | Tiêu đề cột bảng |
  | `ClassManagement.css` L725 | `.student-profile span` | **8px** | MSSV / vai trò |
  | `Courses.css` L484 | stat small | **8px** | Số liệu thống kê |
  | `Courses.css` L540 | panel heading span | **8px** | Nhãn phần |
  | `Courses.css` L684 | tab span | **8px** | Tab label |
  | `Grading.css` L1066 | `.grading-table-head span` | **8px** | Tiêu đề cột bảng |

- **Hậu quả:** Chữ 8px không đọc được ở màn hình 1080p, gần như không thể đọc ở màn 4K/HiDPI, và vi phạm WCAG 1.4.4 (Resize Text).

#### [P0] Font 9px trên nhiều functional text
- **Locations:** `ClassManagement.css` dòng 170 (breadcrumb), 177 (breadcrumb button), 191 (kicker), 314 (stat label), 325 (stat small), 439 (panel p), 490 (student-tab), 654 (table td); `Courses.css` 250 (kicker), 339 (semester label), 646 (tab); `Grading.css` 525 (hero summary), 819 (kicker); `StudentDashboard.css` 607 (summary small), 964 (calendar week), 1041 (notification info), 1126 (kicker)
- **Hậu quả:** Bảng dữ liệu sinh viên (core của sản phẩm) dùng 9px cho table rows — người dùng cần kéo mặt lại gần màn hình mới đọc được.

#### [P1] Font 10px borderline trên input và kicker
- **Locations:** `ClassManagement.css` L584 (search input `10px`); `Grading.css` L1011 (select `10px`); `Login.css` SinhVien L70 (brand span `10px`); `StudentDashboard.css` L590 (summary span `10px`)
- **Khuyến nghị:** Tất cả nâng lên `11px` tối thiểu.

#### [P2] Font 8.5px trong shared header (đã ghi ở PRODUCT.md)
- **File:** `Frontend/shared/dlu-theme.css` dòng 147 (`school-sub`), 288 (`teacher-mini span`)
- **Hậu quả:** Metadata MSSV và vai trò người dùng không đọc được ở header — thông tin quan trọng cho người dùng.

---

## Nhóm 2: Khoảng cách & Bố cục

#### [P1] `TeacherOverview.css` import trên nhiều route — 4079 dòng
- **File:** `Frontend/GiangVien/src/pages/ClassManagement.jsx` dòng 45: `import "../styles/TeacherOverview.css"` kèm `import "../styles/ClassManagement.css"`
- **Hậu quả:** Mọi route Giảng viên tải ~8000 dòng CSS. CSS cascade không có chủ đích có thể làm một số styles bị ghi đè không mong muốn.

#### [P1] `Notifications.css` dùng `padding-left: 272px` cứng cho sidebar offset
- **File:** `Frontend/GiangVien/src/styles/Notifications.css` dòng 22
- **Mô tả:** `padding-left: 272px` giả định sidebar đang mở rộng hoàn toàn. Khi sidebar thu gọn về 56px, trang Notifications sẽ có khoảng trống 216px thừa bên trái.
- **Khuyến nghị:** Dùng `margin-left: var(--dlu-sidebar-width, 56px)` như `dlu-theme.css` đã định nghĩa trong `.page`.

#### [P1] Bố cục hash-routing SinhVien — không nhất quán với GiangVien
- **File:** `Frontend/SinhVien/src/App.jsx` dòng 52–80
- **Mô tả:** Navigation dùng `window.location.hash` (`#course-id`, `#hanh-vi`) thay vì React Router `<Route>`. Hậu quả: (1) Focus không được manage khi "navigate", gây confusion cho screen reader; (2) Browser Back button hoạt động không như mong đợi.

#### [P2] Login container không collapse trên mobile — cả 2 cổng
- **Files:** `Frontend/GiangVien/src/styles/Login.css` và `Frontend/SinhVien/src/styles/Login.css`
- **Mô tả:** `.login-container { grid-template-columns: 1fr 1fr }` không có breakpoint collapse xuống 1 cột trên viewport < 768px. Form đăng nhập bị đẩy ra ngoài màn hình.

#### [P2] `TeacherProfile.css` dùng `margin-left: 136px` thay vì `var(--dlu-sidebar-width)`
- **File:** `Frontend/GiangVien/src/styles/TeacherProfile.css` dòng 66
- **Mô tả:** `margin-left: 136px` — giá trị tùy tiện, khác với `56px` (collapsed) và `175px` (expanded) của sidebar. StudentDashboard dùng `var(--dlu-sidebar-width, 56px)` đúng cách.

#### [P2] Border radius không đồng nhất — token `14px` bị bỏ qua
- **Mô tả:** Token `--dlu-radius-card: 14px` nhưng thực tế:
  - `ClassManagement.css`: `24px` (hero), `22px` (panel), `18px` (stats grid)
  - `AssignmentManagement.css`: `18px` (hero), `14px` (panel) ← may match
  - `Grading.css`: `26px` (hero), `22px` (panel)
  - `Courses.css`: tương tự ClassManagement
  - `TeacherProfile.css`: `18px`
  - `PowerBIEmbed.css`: `12px`
  - `StudentCompetencyRadar.css`: `12px`
- **Hậu quả:** Mỗi trang có "hình dạng" khác nhau — không có ngôn ngữ hình thức thống nhất.

#### [P3] KPI gap không nhất quán giữa hai cổng
- GiangVien dùng `gap: 20px`, SinhVien dùng `gap: 12px` trong KPI grid.

---

## Nhóm 3: Biểu đồ

#### [P0] Fake charts trang trí trên Login Sinh viên — integrity violation
- **File:** `Frontend/SinhVien/src/pages/StudentLogin.jsx` dòng 128–155
- **Mô tả:** Block `analytics-decoration` chứa:
  - `"mini-chart line-card"` với label `"Learning Progress"` (tiếng Anh)
  - `fake-line-chart` + `fake-line` divs — không có dữ liệu
  - `<PieChart size={42} />` với label `"Performance"` (tiếng Anh)
  - `<BarChart3 size={50} />` với label `"Activity"` (tiếng Anh)
- **Hậu quả:** Vi phạm design taste rule "no fake dashboards of grey bars"; vi phạm "Vietnamese First rule"; giả mạo dữ liệu phân tích không tồn tại.

#### [P0] Bar fill `StudentCompetencyRadar` dùng lime green `#2ecc71`
- **File:** `Frontend/SinhVien/src/styles/StudentCompetencyRadar.css` dòng 107
- **Mô tả:** Đã ghi ở mục màu sắc. Trong context biểu đồ: màu progress bar không match với màu badge trạng thái, gây confusion về meaning.

#### [P1] Power BI iframe không có `title` attribute — accessibility
- **Files:** `Frontend/SinhVien/src/components/PowerBIEmbed.jsx`, `Frontend/GiangVien/src/components/class-management/PowerBIClassReport.jsx`
- **Mô tả:** Screen reader đọc iframe nhưng không biết nó chứa gì nếu không có `title="Báo cáo phân tích Power BI"`.
- **Chuẩn vi phạm:** WCAG 2.1 SC 4.1.2

#### [P1] Power BI không có fallback content khi embed fail
- **File:** `Analytics.jsx`
- **Mô tả:** Nếu người dùng không có Power BI license hoặc iframe fail load, không có fallback message. Người dùng thấy trang trắng hoặc iframe lỗi.

#### [P2] Màu rủi ro `EarlyWarningRiskSection` dùng Tailwind colors
- **File:** `Frontend/GiangVien/src/components/class-management/EarlyWarningRiskSection.jsx` dòng 17–42
- **Mô tả:** `#dc2626` (red-600), `#d97706` (amber-600), `#16a34a` (green-600) — Tailwind semantic colors, không thuộc bảng màu DLU.
- **Khuyến nghị:** Map sang DLU equivalents: risk cao → `#e87524` (--dlu-orange); risk trung bình → `#e6a23c` (--dlu-gold-seal); ổn định → `#37883e` (--dlu-green-brand).

#### [P2] Radar SVG không có `role="img"` hay `aria-label`
- **File:** `Frontend/SinhVien/src/components/StudentCompetencyRadar.jsx` (cần kiểm tra JSX, likely SVG inline)
- **Mô tả:** Biểu đồ radar là SVG — nếu không có `role="img" aria-label="..."`, screen reader sẽ traverse từng path element.

---

## Nhóm 4: Trạng thái rỗng, lỗi, đang tải

#### [P0] App.jsx SinhVien — silent error: API fail không hiển thị UI
- **File:** `Frontend/SinhVien/src/App.jsx` dòng ~106
- **Mô tả:** `catch` block chỉ `console.error(...)` — nếu API `/api/v1/student/summary` fail, user thấy màn hình loading trống mãi mãi. Không có error state UI.
- **Hậu quả:** Người dùng không biết có lỗi hay app đang chờ — frustrating, không có cách recover.

#### [P0] AssignmentManagement loading/error CSS classes không tồn tại
- **File:** `Frontend/GiangVien/src/pages/AssignmentManagement.jsx`
- **Mô tả:** JSX render các class:
  - `.assign-page-loading` (line ~118)
  - `.assign-spinner-large` (spinner div)
  - `.assign-page-error` (line ~128)
  - Nhưng **không có CSS nào** cho các class này trong `AssignmentManagement.css`
- **Hậu quả:** Loading và error states hiển thị không có style — text trần trên nền trắng, không rõ là trạng thái gì.

#### [P1] App.jsx SinhVien dùng inline styles với hardcode colors
- **File:** `Frontend/SinhVien/src/App.jsx` dòng 136–160
- **Mô tả:**
  ```jsx
  style={{ padding: "60px", textAlign: "center", color: "#66736b", marginTop: "20px" }}
  style={{ fontSize: "16px", fontWeight: "700", marginBottom: "8px", color: "#17221d" }}
  ```
  Inline styles bypass hoàn toàn design system — không thể controlled bằng CSS variables.

#### [P1] `LoadingScreen.jsx` thiếu ARIA — screen reader không biết đang loading
- **File:** `Frontend/GiangVien/src/components/common/LoadingScreen.jsx` dòng 4
- **Mô tả:** `<div className="loader"></div>` — không có `role="status"`, không có `aria-label="Đang tải..."`, không có `aria-live="polite"`.
- **Chuẩn vi phạm:** WCAG 2.1 SC 4.1.3

#### [P1] SinhVien không có `LoadingScreen`/`ErrorScreen` component tập trung
- **Mô tả:** GiangVien có `<LoadingScreen>` và `<ErrorScreen>` tách riêng. SinhVien xử lý inline với styles khác nhau ở từng page. Không nhất quán và không maintainable.

#### [P2] Login submit button không có loading indicator (spinner)
- **File:** Cả hai `Login.jsx`
- **Mô tả:** State `loading` được set khi API call, button có thể disabled, nhưng không có visual spinner — người dùng không thấy phản hồi sau khi click.

#### [P2] Empty state sinh viên trong `StudentTable` chưa rõ từ source
- **File:** `Frontend/GiangVien/src/components/class-management/StudentTable.jsx`
- **Mô tả:** Cần xác nhận khi filter không có kết quả hoặc lớp trống có empty state illustration/message không. CSS có `.students-empty` nhưng JSX cần xác nhận.

#### [P2] Power BI không có loading skeleton
- **Mô tả:** Khi iframe Power BI đang load, không có skeleton placeholder. `PowerBIEmbed.css` có `.pbi-embed-loading` ✅ nhưng cần kiểm tra JSX có trigger nó không.

---

## Nhóm 5: Responsive

#### [P1] Login cả 2 cổng — không collapse trên mobile
- **Đã ghi ở Nhóm 2 — Bố cục.** Mobile là critical path.

#### [P1] Table sinh viên — min-width 950px không có sticky columns
- **File:** `Frontend/GiangVien/src/styles/ClassManagement.css` dòng ~626
- **Mô tả:** `table { min-width: 950px }` gây horizontal scroll trên viewport nhỏ, nhưng không có sticky first column nên khi scroll ngang, người dùng mất context về sinh viên nào đang xem.

#### [P2] `Notifications.css` — `padding-left: 272px` vỡ khi sidebar thu gọn
- **Đã ghi ở Nhóm 2.** Severity P1 cho functional, P2 cho responsive.

#### [P2] Sidebar SinhVien — mobile overlay cần xác nhận
- **File:** `Frontend/SinhVien/src/components/StudentSidebar.jsx`
- **Mô tả:** `dlu-theme.css` định nghĩa `.dlu-sidebar.is-mobile-open` nhưng `StudentSidebar.jsx` cần kiểm tra có implement toggle này không.

#### [P2] Power BI iframe — không responsive
- **File:** `Frontend/SinhVien/src/styles/PowerBIEmbed.css`
- **Mô tả:** iframe cần `aspect-ratio` hoặc padding-top trick để maintain ratio trên mobile. Cần xác nhận.

#### [P3] Fixed column widths trong Grading table
- **File:** `Frontend/GiangVien/src/styles/Grading.css` dòng 1032–1034
- **Mô tả:** Columns `110px`, `130px`, `120px` fixed — vỡ ở viewport nhỏ hơn 800px.

---

## Nhóm 6: Truy cập (Accessibility)

#### [P0] `outline: none` không có `:focus-visible` — keyboard users mù hoàn toàn
- **Files & selectors:**
  - `ClassManagement.css` L486: `.student-tab { outline: none }` — **không có `:focus-visible` replacement**
  - `Courses.css` L638: `.course-tab { outline: none }` — **không có `:focus-visible`**
  - `AssignmentManagement.css` L172, L479: `select { outline: none }` — **mất native focus ring, không có replacement**
  - `Grading.css`: `select { outline: none }` — tương tự
- **Chuẩn vi phạm:** WCAG 2.1 SC 2.4.7 (Focus Visible) — Level AA

#### [P0] Sidebar icon-only collapsed không có ARIA label
- **Files:** `Frontend/GiangVien/src/components/Sidebar.jsx`, `Frontend/SinhVien/src/components/StudentSidebar.jsx`
- **Mô tả:** Khi sidebar `is-collapsed`, `.sidebar-label { display: none !important }`. Nếu button không có `aria-label`, screen reader không đọc được navigation.
- **Chuẩn vi phạm:** WCAG 2.1 SC 1.1.1, SC 4.1.2

#### [P1] Form login không có `<label>` liên kết với input
- **Files:** Cả hai `Login.jsx`
- **Mô tả:** Dùng icon + placeholder thay vì `<label for="...">`. Placeholder biến mất khi nhập — screen reader không biết field này là gì sau khi nhập.
- **Chuẩn vi phạm:** WCAG 2.1 SC 1.3.1, SC 3.3.2

#### [P1] Error messages không có `role="alert"`
- **Files:** `StudentLogin.jsx` dòng ~100 (`setError`), `Login.jsx`, `ErrorScreen.jsx`
- **Mô tả:** Error text xuất hiện nhưng không có `role="alert"` hay `aria-live="polite"` — screen reader không thông báo lỗi cho người dùng.
- **Chuẩn vi phạm:** WCAG 2.1 SC 4.1.3

#### [P1] Password toggle button không có `aria-label`
- **Files:** `StudentLogin.jsx`, `Login.jsx`
- **Mô tả:** `<button onClick={() => setShowPassword(!showPassword)}>` chỉ chứa `<Eye>` hoặc `<EyeOff>` icon — không có text hay `aria-label`. Screen reader không biết button này làm gì.

#### [P1] Tab navigation thiếu `role="tablist"`, `aria-selected`, `aria-controls`
- **Files:** `AssignmentManagement.jsx`, `Analytics.jsx`, và likely ClassManagement
- **Mô tả:** Tab switching dùng `<button>` nhưng không có ARIA tab pattern. Screen reader không announce đây là tab navigation, không biết tab nào đang active.
- **Chuẩn vi phạm:** WCAG 2.1 SC 4.1.2, ARIA 1.1 Tab Pattern

#### [P1] `ErrorScreen.jsx` button thiếu `type="button"`
- **File:** `Frontend/GiangVien/src/components/common/ErrorScreen.jsx` dòng 6
- **Mô tả:** `<button onClick={...}>Tải lại</button>` — default là `type="submit"`, có thể trigger form submit không mong muốn trong một số context.

#### [P2] Decorative icons không có `aria-hidden="true"`
- **Files:** Nhiều JSX files dùng Lucide icons như decoration
- **Đặc biệt:** Login SinhVien dòng 131–155: `<TrendingUp>`, `<PieChart>`, `<BarChart3>` trang trí không có `aria-hidden`
- **Chuẩn vi phạm:** WCAG 2.1 SC 1.1.1

#### [P2] Power BI iframes thiếu `title` attribute
- **Đã ghi ở Nhóm 3.**

#### [P2] Focus visible không kiểm soát trong custom CSS
- **Mô tả:** Ngoài search box trong `dlu-theme.css`, không tìm thấy `:focus-visible` rule nào rõ ràng trong các CSS file custom.

#### [P2] Heading hierarchy lạc điệu trong Login SinhVien
- **File:** `Frontend/SinhVien/src/pages/StudentLogin.jsx` dòng 121
- **Mô tả:** `<h1>LMS Analytics Platform</h1>` ở panel brand bên trái. Form đăng nhập bên phải không có heading — cấu trúc ngữ nghĩa ngược với mục tiêu chính của trang (đăng nhập).

---

## Nhóm 7: Vấn đề bảo mật / dữ liệu (liên quan đến UI)

#### [P0] `localStorage.getItem("currentTeacherId") || 1` — fallback nguy hiểm
- **Files:** `Frontend/GiangVien/src/pages/AssignmentManagement.jsx` dòng ~39, `Analytics.jsx`
- **Mô tả:** Nếu `currentTeacherId` không có trong localStorage (logout chưa hoàn toàn, storage bị xóa, session mới), fallback về ID=1 sẽ **show dữ liệu của giảng viên khác**. Người dùng có thể không nhận ra họ đang xem data sai.
- **Khuyến nghị:** Nếu `currentTeacherId` null → redirect về login thay vì fallback.

---

## Nhóm 8: Nhất quán giữa Sinh viên ↔ Giảng viên

| Vấn đề | Cổng Giảng viên | Cổng Sinh viên | Mức |
|--------|-----------------|-----------------|-----|
| Header component | `Header.jsx` tự viết | `DluHeader.jsx` từ shared ✅ | P1 — GV nên migrate |
| Loading component | `<LoadingScreen>` tách riêng ✅ | Inline trong App.jsx | P1 |
| Error state | `<ErrorScreen>` tập trung ✅ | Silent catch; inline styles | P0 |
| Navigation routing | React Router `<Route>` ✅ | Hash routing `window.location.hash` | P1 |
| Sidebar margin | `136px` hardcode | `var(--dlu-sidebar-width, 56px)` ✅ | P2 |
| `--dlu-green` value | `#6f9638` (override) | `#0a543f` (đúng) ✅ | P0 |
| Login button color | Chưa xác định | `#2d864e` | P2 — khác nhau |
| Badge trạng thái | "Cần chú ý"/"Theo dõi"/"Ổn định" ✅ | Không có tương đương rõ ràng | P2 |
| Tab ARIA | Thiếu `role="tablist"` | Thiếu `role="tablist"` | P1 — cả 2 |
| Font size tối thiểu | 8px ở bảng/tab labels | 9px ở một số nơi | P0/P1 |

---

## Điểm tốt cần giữ lại

- ✅ **`dlu-theme.css` là nền tảng vững** — `--dlu-*` tokens tốt, `clamp()` responsive, breakpoints rõ ràng. Nếu tất cả CSS trang con dùng đúng, phần lớn P1/P2 tự giải quyết.
- ✅ **Shared `DluHeader` component** — `StudentHeader.jsx` dùng `DluHeader.jsx` từ shared là pattern đúng.
- ✅ **Loading/Error components tư duy đúng ở GiangVien** — chỉ cần polish ARIA và CSS.
- ✅ **Tiếng Việt trong nghiệp vụ** — hầu hết label, message, button đúng tiếng Việt có dấu.
- ✅ **isCancelled cleanup pattern** — `EarlyWarningRiskSection.jsx` tránh state update sau unmount.
- ✅ **Role-based auth guard** — `ProtectedRoute.jsx` check đúng `userRole` sau update.
- ✅ **Form semantics** — Login dùng `<form>` với `onSubmit` ✅; input focus state có border-color + box-shadow ✅.
- ✅ **Notifications.css** — có đủ 3 states: loading, empty, error ✅.
- ✅ **Messages.css** — font size minimum 11px ✅; breakpoints mobile đúng ✅.
- ✅ **AssignmentManagement cancel pattern** — async cleanup đúng cách.
- ✅ **StudentCompetencyRadar** — font size tốt, breakpoints responsive đầy đủ.

---

## Recommended Actions (theo thứ tự ưu tiên)

| # | Lệnh | Target | Mô tả |
|---|------|--------|-------|
| 1 | `$impeccable harden` | `ClassManagement.css`, `Courses.css`, `Grading.css`, `AssignmentManagement.css` | Xóa `:root { --dlu-green: ... }` override; fix `outline:none` → thêm `:focus-visible`; sửa AssignmentManagement missing CSS classes |
| 2 | `$impeccable typeset` | Tất cả CSS files | Nâng tất cả font size < 11px lên ≥ 11px (table headers, tab labels, stat labels, breadcrumbs) |
| 3 | `$impeccable harden` | Login pages (cả 2) | Thêm `<label>`, `role="alert"`, `aria-label` cho toggle, fix responsive 2→1 cột, remove fake charts |
| 4 | `$impeccable harden` | `App.jsx` SinhVien | Thêm catch → error UI state; remove inline styles → dùng CSS classes |
| 5 | `$impeccable colorize` | `EarlyWarningRiskSection.jsx`, `PowerBIEmbed.css`, `StudentCompetencyRadar.css`, `Login.css` SinhVien | Map màu về DLU tokens; xóa lime `#a3e635`, Tailwind reds, blue `#0284c7` |
| 6 | `$impeccable harden` | `LoadingScreen.jsx`, `ErrorScreen.jsx` | Thêm `role="status"`, `aria-label`, `type="button"` |
| 7 | `$impeccable distill` | `StudentLogin.jsx` | Xóa fake charts decoration block |
| 8 | `$impeccable adapt` | Login pages | Thêm breakpoint mobile collapse |
| 9 | `$impeccable layout` | `Notifications.css`, `TeacherProfile.css` | Fix hardcoded `272px`/`136px` → `var(--dlu-sidebar-width)` |
| 10 | `$impeccable harden` | Sidebar components | Thêm `aria-label` cho icon-only buttons khi collapsed |
| 11 | `$impeccable onboard` | Power BI iframes | Thêm `title`, fallback content, loading skeleton |
| 12 | `$impeccable polish` | Toàn bộ | Final pass sau khi các issues trên đã fix |

---

*Audit hoàn tất. Dừng tại đây — chờ duyệt trước khi thực hiện bất kỳ sửa đổi nào.*
