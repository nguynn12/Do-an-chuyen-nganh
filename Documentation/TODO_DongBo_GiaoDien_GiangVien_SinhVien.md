# TODO: Đồng bộ giao diện Giảng viên và Sinh viên

**Dự án:** LMS Learning Analytics Platform  
**Nhánh kiểm tra:** `SinhVien_Nguyen`  
**Ngày kiểm tra:** 09/10/2026  
**Mục tiêu:** Hai cổng có cùng ngôn ngữ thiết kế và trải nghiệm sử dụng, nhưng vẫn giữ tính năng, menu và quyền truy cập riêng theo vai trò.

> **Phạm vi:** chỉ UI/UX, CSS, cấu trúc layout và thành phần hiển thị. Không sửa công thức analytics, Data Warehouse, API, authentication, phân quyền, Power BI hoặc logic nghiệp vụ. Không triển khai chức năng LMS mới.

## 0. Quy tắc ưu tiên cao nhất: layout linh hoạt, chống vỡ giao diện

**Đây là ràng buộc bắt buộc cho TOÀN BỘ Task 0–6, có ưu tiên cao hơn mọi con số minh họa trong tài liệu.**

- **Hạn chế tối đa magic numbers/hardcode kích thước** trong layout: `width: 1200px`, `height: 600px`, `left: 175px`, `margin-left: 175px`, `grid-template-columns: 800px 400px`, pixel offset tùy tiện, hoặc `!important` dùng để vá chồng chéo. Không copy các số hiện hữu từ một portal sang portal còn lại mà chưa kiểm tra sự phù hợp.
- **Phân biệt hai loại cố định:** màu thương hiệu, độ dày border, kích thước icon, breakpoint có chủ đích và giới hạn `min/max` có thể định nghĩa bằng design token. **Không cấm tuyệt đối px**, nhưng phải giải thích lý do và kiểm thử. Tránh chiều cao/chiều rộng cố định cho khối chứa chữ, dữ liệu, biểu đồ và nội dung thay đổi.
- **Ưu tiên CSS responsive:** `display: grid/flex`, `minmax(0, 1fr)`, `min(100%, ...)`, `clamp()`, `min-width: 0`, `max-width: 100%`, `%`, `rem`, `auto`, `flex-wrap`, media/container queries khi phù hợp. Không đặt phần nội dung theo tọa độ tuyệt đối để căn chỉnh layout chung.
- **Header:** dùng `min-height`, padding và bố trí responsive khi được; tên dài, ô tìm kiếm và nút phải thu gọn/chuyển dòng hoặc ẩn có chủ đích ở breakpoint, không đè nhau. Nếu header thay đổi chiều cao, vị trí content/sidebar phải cập nhật đúng, không giữ offset cũ.
- **Sidebar:** biến width chỉ được lấy từ một nguồn trạng thái thống nhất theo portal; phần content tự thích ứng với sidebar, không cộng/trừ pixel thủ công nhiều chỗ. Có chiến lược cho màn hình hẹp (drawer/overlay hoặc chế độ thu gọn), không chiếm mất vùng nội dung.
- **KPI cards, bảng, form, chart, Power BI embed:** số cột phải tự thay đổi theo không gian; dùng `minmax`, `auto-fit/auto-fill` khi phù hợp. Container cần `min-width: 0`; biểu đồ co theo container; bảng nhiều cột cuộn **trong vùng bảng**, không đẩy rộng toàn bộ trang. Tránh đặt chiều cao tĩnh làm cắt dữ liệu hoặc nút.
- **Không chữa tràn bằng cách giấu lỗi:** không dùng `overflow: hidden` trên toàn trang hoặc `display: none` để che nội dung quan trọng. Chỉ dùng ellipsis/clamp cho nhãn phụ phù hợp, phải cho xem đủ thông tin bằng tooltip/chi tiết khi cần.
- **Không tự ý thay thông số nếu chưa có căn cứ:** nếu phát hiện quy tắc CSS hiện hữu xung đột, giải thích nguyên nhân và sửa ở gốc; không thử liên tiếp những con số mới để “căn cho vừa một màn hình”.
- **Trước khi áp dụng hàng loạt:** thay một component/shell mẫu, chạy kiểm tra tại nhiều viewport, zoom 125%/200%, tên dài, dữ liệu trống/nhiều dòng và trạng thái sidebar mở/đóng. Nếu phát sinh tràn/chồng lấn thì dừng, khôi phục phần lỗi và báo rõ thay vì tiếp tục lan rộng.
- **Giữ nguyên chức năng:** responsive không được vô hiệu hóa nút, bỏ menu, giấu dữ liệu, làm mất cuộn, hỏng tooltip/modal hay đổi cách gọi API.

**Điều kiện nghiệm thu bắt buộc:** không có nội dung cắt mất, chồng chữ, card đè nhau, chart vượt khung, bảng làm giãn cả trang, sidebar phủ nội dung sai cách hoặc nút không thể bấm. Kiểm thử ít nhất 390 / 768 / 1024 / 1440px và zoom 200%; có ảnh trước/sau. Nếu không có môi trường chạy, phải ghi *chưa kiểm chứng responsive*, không báo hoàn tất.

---

## 1. Kết quả kiểm tra mã nguồn hiện tại

Các file đã đối chiếu trực tiếp trên nhánh:

- `Frontend/GiangVien/src/App.jsx`
- `Frontend/SinhVien/src/App.jsx`
- `Frontend/GiangVien/src/components/Header.jsx`, `Sidebar.jsx`
- `Frontend/SinhVien/src/components/StudentHeader.jsx`, `StudentSidebar.jsx`
- `Frontend/GiangVien/src/index.css`, `styles/TeacherOverview.css`
- `Frontend/SinhVien/src/index.css`, `styles/StudentDashboard.css`
- Danh sách file trong `Frontend/*/src/pages`, `components`, `styles`.

### 1.1. Khác biệt đã xác minh

| Hạng mục | Giảng viên | Sinh viên | Xử lý |
|---|---|---|---|
| Cấu trúc | React + Vite, `Header`/`Sidebar` | React + Vite, `StudentHeader`/`StudentSidebar` | Giữ hai ứng dụng, chuẩn hóa giao diện |
| Font gốc | `Inter` trong `index.css`; một số CSS trang lại dùng Arial | `Segoe UI` trong `index.css` và `StudentDashboard.css` | Chuẩn hóa `Inter` làm font giao diện chính |
| Header | `TeacherOverview.css`: 62px, nền xanh đen | `StudentDashboard.css`: 58px, nền sáng | Dùng token chung nhưng cho phép co giãn theo nội dung/breakpoint; không khóa cứng chiều cao nếu gây tràn |
| Sidebar thu gọn | Component giảng viên: 56px; CSS trang cũ có 58px | 56px | Chọn token thống nhất cho trạng thái thu gọn, kiểm tra kích thước icon và vùng bấm |
| Sidebar mở rộng | Component giảng viên: 136px | Component sinh viên: 175px | Không ép một width cố định; dùng kích thước linh hoạt theo nội dung và breakpoint |
| Màu chủ đạo | Có `#37883e` và nhiều xanh khác | CSS sinh viên đặt `--dlu-green: #0a543f` | Chốt token xanh thương hiệu; dùng biến phụ cho sắc thái |
| Điều hướng | `react-router-dom` theo pathname | Router cho `/dang-nhap`, nhưng nội bộ dashboard dùng `window.location.hash` | Giữ cơ chế hiện tại ở giai đoạn đồng bộ thị giác; không đổi route thiếu kế hoạch |
| Trạng thái sidebar | `dluSidebarCollapsed` | `dluStudentSidebarCollapsed` | Giữ khóa riêng, thống nhất hành vi mặc định và hiển thị |
| UI framework | CSS thủ công | Tailwind v4 trong `index.css`, theo README còn có AntD | Không ép thay toàn bộ framework; tránh reset CSS ảnh hưởng chéo |

**Lưu ý:** Đã xác minh bằng file nguồn công khai; chưa chạy ứng dụng ở trình duyệt, chưa đối chiếu ảnh chụp từng trang hay tính đúng của API. Các kích thước/giá trị ở bảng là cấu hình tìm thấy trong code, chưa khẳng định CSS cuối cùng được áp dụng ở runtime khi có selector ghi đè.

### 1.2. Những vấn đề cần rà soát thêm trong khi triển khai

1. `TeacherOverview.css` chứa nhiều quy tắc global cho `body`, `.header`, `.sidebar`, `.page`; `StudentDashboard.css` cũng định nghĩa global layout. Cần kiểm tra thứ tự import và specificity, tránh sửa một trang làm vỡ trang khác.
2. Phần sinh viên có nhiều giá trị fallback trong `StudentOverview.jsx` (ví dụ tên/MSSV, điểm `7.0`, tiến độ `100`). **Không được coi chúng là dữ liệu thực**. Chỉ lập danh sách để xử lý riêng, không tự ý biến thành task redesign.
3. Kiểm tra màu xanh của logo, header, sidebar và các card trên màn hình thật. Token CSS có thể khác màu được render do gradient và override.
4. Cần kiểm kê thêm tất cả trang con trước khi sửa hàng loạt, đặc biệt `ClassManagement`, `Analytics`, `StudentBehavior`, `StudentGrades`, `StudentSubmissions`.

## 2. Design system chung cần thống nhất

Các giá trị dưới đây là **đề xuất thiết kế**, không phải xác nhận chúng đã đồng bộ trong code.

```css
:root {
  --lms-font: "Inter", system-ui, sans-serif;
  --lms-primary: #37883e;
  --lms-primary-hover: #2d7033;
  --lms-primary-soft: #eaf4eb;
  --lms-text: #17251f;
  --lms-muted: #667970;
  --lms-background: #f5f7f5;
  --lms-surface: #ffffff;
  --lms-border: #dfe7e1;
  --lms-danger: #c0504d;
  --lms-warning: #e0a030;
  --lms-info: #4a90b8;
  /* Giá trị tham chiếu, KHÔNG dùng để ép layout bất biến */
  --lms-header-min-height: 3.875rem;
  --lms-sidebar-collapsed: 3.5rem;
  --lms-sidebar-expanded-max: 14rem;
  --lms-radius-card: 12px;
  --lms-radius-control: 8px;
  --lms-space-1: 4px;
  --lms-space-2: 8px;
  --lms-space-3: 12px;
  --lms-space-4: 16px;
  --lms-space-6: 24px;
}
```

**Nguyên tắc:** cả hai frontend cùng sử dụng một bảng token. Nếu không chia sẻ package được, cho phép hai file token giống hệt nhau và ghi rõ nơi cập nhật; tránh dùng các giá trị hex rải rác. Không đổi màu nhận diện hoặc logo khi chưa xác nhận từ mẫu thiết kế chính thức của nhóm.

## 3. Danh sách công việc giao Antigravity

### Task 0. Kiểm kê trước khi sửa (bắt buộc)

- [ ] Checkout đúng `SinhVien_Nguyen`, ghi lại commit SHA, kiểm tra working tree sạch hoặc liệt kê file chưa commit.
- [ ] Liệt kê các route, component layout, stylesheet và **tất cả magic numbers/hardcode ảnh hưởng layout** của cả hai frontend (width/height/offset/grid/breakpoint), phân loại cái nào cần giữ làm token, cái nào phải chuyển sang adaptive.
- [ ] Chụp ảnh hiện trạng các trang đại diện ở desktop và màn hình nhỏ nếu có môi trường chạy.
- [ ] Kiểm tra `package.json` và lệnh build thực tế; không giả định hai app cùng dependencies.
- [ ] Chốt với người giao việc: lấy khung header/sidebar nào làm **mẫu hình ảnh chuẩn**. Mặc định đề xuất lấy cấu trúc giảng viên làm baseline rồi bổ sung các chi tiết cần thiết cho sinh viên, nhưng không tự thay đổi nhận diện chỉ vì file CSS khác.
- [ ] Báo cáo kết quả; **chưa sửa code ở Task 0**.

### Task 1. Token và CSS nền tảng

- [ ] Tạo/chuẩn hóa stylesheet token dùng chung cho cả hai app.
- [ ] Đồng bộ font, background, màu chữ, màu border, button/input, trạng thái hover/focus/disabled.
- [ ] Giảm xung đột selector global (`body`, `.page`, `.header`, `.sidebar`), ưu tiên namespace hoặc shell class rõ ràng.
- [ ] Không chỉnh CSS thư viện toàn cục nếu làm ảnh hưởng các page/modal/table hiện có.
- [ ] Kiểm tra font tải lỗi thì vẫn có system fallback.

### Task 2. Header chung về thiết kế

- [ ] Đồng nhất: chiều cao, padding, logo/brand, tiêu đề hệ thống, vị trí thanh tìm kiếm (nếu chức năng tồn tại), cụm avatar/tên/vai trò.
- [ ] Xử lý hiển thị dài: tên người dùng, mã sinh viên, tiêu đề, ô tìm kiếm không được tràn.
- [ ] Giữ menu/hành động riêng theo quyền giảng viên và sinh viên; không tạo search giả hoặc nút không có tác dụng.
- [ ] Giữ nguyên luồng đăng xuất và đường dẫn hồ sơ hiện có.
- [ ] Header không đè nội dung khi scroll, zoom hoặc chuyển viewport.

### Task 3. Sidebar và điều hướng

- [ ] Đồng bộ quy tắc co giãn cho sidebar thu gọn/mở rộng, icon size, active state, hover, tooltip, padding và khu vực cuối sidebar; không ép width cố định gây tràn chữ.
- [ ] Khắc phục sai lệch biến `--dlu-sidebar-width` khi hai shell dùng CSS khác nhau.
- [ ] Thống nhất hành vi mở/thu gọn, nhưng vẫn dùng storage key riêng cho từng vai trò.
- [ ] Chỉ đồng bộ **cách hiển thị**, giữ nguyên danh sách menu chức năng theo từng vai trò.
- [ ] Kiểm thử liên kết từ menu và active state trên mọi route; đặc biệt sinh viên dùng hash trong dashboard.
- [ ] Đảm bảo dùng bàn phím được (focus visible, aria-label và tooltip ở chế độ thu gọn).

### Task 4. Chuẩn hóa layout trang và component chung

- [ ] Đồng bộ khoảng cách từ header/sidebar tới content, quy tắc width/min-width/max-width linh hoạt, spacing, card radius/shadow và typography.
- [ ] Chuẩn hóa cấu trúc tiêu đề trang, breadcrumb (nếu sẵn có), bộ lọc, KPI card, bảng, trạng thái rỗng/loading/error.
- [ ] Giữ thiết kế riêng cho biểu đồ chuyên biệt và chức năng theo vai trò; không ép hai trang khác chức năng thành cùng một bố cục.
- [ ] Các chart, bảng và bộ lọc vẫn hoạt động; không đổi tên field, API, dữ liệu, DAX hoặc toán tử thống kê.
- [ ] Thống nhất ngôn ngữ hiển thị (Việt hóa nhãn điều hướng chung), không thay đổi thuật ngữ chuyên môn khi chưa có đối chiếu.

### Task 5. Responsive và accessibility

- [ ] Kiểm tra ở ít nhất 1440px, 1024px, 768px, 390px và zoom 200%; không xuất hiện horizontal scroll ngoài ý muốn toàn trang, không che hoặc cắt nội dung.
- [ ] Ở màn hình hẹp: sidebar chuyển sang chế độ phù hợp; header không chồng lấn; biểu đồ/bảng có scroll cục bộ hoặc bố trí dọc.
- [ ] Thứ tự tab, keyboard focus, label của nút icon-only, độ tương phản chữ và trạng thái loading rõ ràng.
- [ ] Không dùng màu sắc là tín hiệu duy nhất của cảnh báo/rủi ro.

### Task 6. Nghiệm thu và chống hồi quy

- [ ] Chạy build cả hai frontend bằng script có thật trong từng `package.json`.
- [ ] Mở lần lượt toàn bộ menu và các trang đại diện cho mỗi vai trò; kiểm tra không lỗi console mới.
- [ ] Kiểm tra đăng nhập, đăng xuất, đổi môn, chuyển trang, mở/thu sidebar, điều hướng trực tiếp URL/hash và reload.
- [ ] Kiểm tra dữ liệu API/biểu đồ không thay đổi do redesign.
- [ ] Chụp ảnh **trước/sau** cùng độ phân giải, đối chiếu header/sidebar/font/card/filter/table.
- [ ] Gửi danh sách file đã sửa, nguyên nhân và kết quả test; nêu rõ những điểm chưa đạt.

## 4. Những thứ tuyệt đối không sửa trong đợt đồng bộ

- Cấu trúc Data Warehouse, ETL và seed SQL.
- Controller, route, query backend, API response, quy tắc RLS/phân quyền.
- Dashboard Power BI hoặc bất kỳ `.pbix` nào.
- Công thức risk score, participation score, phân khúc và số liệu analytics.
- Logic chấm điểm, nộp bài, tính điểm, dữ liệu sinh viên.
- Điều hướng bằng cách rewrite toàn bộ app hoặc hợp nhất hai frontend thành một app.
- Xóa các trang/các thành phần hiện có vì trông không giống mẫu.

## 5. Tiêu chí hoàn thành

1. Hai portal nhìn thuộc **cùng một hệ thống**: font, màu, header, sidebar, button/card/table và nhịp spacing thống nhất.
2. Mỗi portal giữ đầy đủ menu, hành vi, quyền truy cập và data binding đã có.
3. Chuyển vai trò không tạo khác biệt khó giải thích về kích thước header/sidebar hoặc cấu trúc trang.
4. Không có regression nghiêm trọng ở điều hướng, responsiveness, loading, biểu đồ, form hay đăng nhập.
5. Có bằng chứng bằng ảnh trước/sau và kết quả build/test cho cả hai frontend.

## 6. Prompt giao Antigravity

> Đọc `docs/TODO_DongBo_GiaoDien_GiangVien_SinhVien.md` và kiểm tra nhánh `SinhVien_Nguyen`. Chỉ làm **Task 0** trước: kiểm kê toàn bộ giao diện Giảng viên/Sinh viên, stylesheet, selector xung đột, route, layout, design token và lệnh build. Báo cáo file nào sẽ sửa, đề xuất baseline giao diện, những rủi ro ảnh hưởng chức năng và hình ảnh hiện trạng nếu chạy được. **Ưu tiên tuyệt đối Mục 0: không hardcode kích thước layout, không chỉnh các số tùy tiện để vá giao diện, thiết kế thích ứng theo container và viewport; phải kiểm thử chống tràn, chồng lấn, vỡ bố cục và zoom 200%. Không sửa code khi chưa được duyệt Task 0.** Sau khi được duyệt, làm từng task theo thứ tự, luôn build/test cả hai frontend, không đụng backend/database/ETL/Power BI, không xóa tính năng hiện có. Nếu thông tin trong TODO khác code thật, ưu tiên kiểm chứng code và báo sai khác, không tự đoán.

## 7. Nguồn đối chiếu

- Repository: https://github.com/nguynn12/Do-an-chuyen-nganh/tree/SinhVien_Nguyen
- Giảng viên: `Frontend/GiangVien/src/`
- Sinh viên: `Frontend/SinhVien/src/`
- Đây là đặc tả sửa UI, **không phải báo cáo xác nhận Task 1–6 đã hoàn thành**.
