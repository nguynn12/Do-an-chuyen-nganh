# TODO cho Antigravity — Gộp 2 giao diện về MỘT link

> Mục tiêu: chạy `npm run build` rồi mở **một địa chỉ duy nhất** `http://localhost:3000` cho cả hai:
> - `/` → trang chọn vai trò (Sinh viên / Giảng viên)
> - `/sinhvien/...` → giao diện Sinh viên
> - `/giangvien/...` → giao diện Giảng viên
> - `/api/...` → backend như cũ
>
> Hiện tại phải chạy 3 tiến trình: backend `:3000`, Giảng viên `:5173`, Sinh viên `:5174`.

## Quy tắc bắt buộc

1. Làm trên nhánh mới `feature/single-link` tách từ **`integration/merge-all`** (KHÔNG phải `main`, vì `main` chưa có code mới của nhóm).
2. Không force push, không `reset --hard`, không xoá nhánh, không push lên `main`.
3. **Không sửa nghiệp vụ**: không đổi nội dung trang, biểu đồ, API. Chỉ sửa cấu hình đường dẫn, router, địa chỉ API, phiên đăng nhập, phần phục vụ file tĩnh.
4. Làm theo từng Bước ở mục "Thứ tự". **Sau mỗi Bước DỪNG**, báo cáo: file đã sửa, cách tự test, kết quả build. Chờ xác nhận mới làm tiếp.
5. Không commit `.env`, secret. Không cài thêm thư viện lớn; nếu cần (ví dụ `concurrently`) hỏi trước.
6. Nếu thấy tên file/hàm không khớp với mô tả dưới đây, DỪNG và hỏi.

## Quyết định thiết kế (đã chốt)

**Chọn: một server, hai app riêng theo đường dẫn con.** Mỗi app vẫn là một bản build riêng (`base` khác nhau), Express phục vụ cả hai cạnh `/api`.

Lý do không gộp thành một app React duy nhất: hai app dùng chung nhiều đường dẫn trùng nhau (`/`, `/dang-nhap`), có CSS toàn cục dễ đè lên nhau khi nằm chung một bundle (Sinh viên còn dùng Tailwind), và phải sửa rất nhiều file của các bạn khác. Cách theo đường dẫn con gần như không đụng vào mã của ai.

## Những điểm đã kiểm tra trong repo (cần xử lý)

- `Frontend/GiangVien/vite.config.js` (cổng 5173) và `Frontend/SinhVien/vite.config.js` (cổng 5174) chưa có `base`. Cả hai dùng `BrowserRouter` không có `basename` (`src/main.jsx`).
- Địa chỉ API ghi cứng `http://localhost:3000` ở: `GiangVien/src/services/apiClient.js`, `notificationApi.js`, `teacherApi.js`, `pages/ClassComparison/ClassComparison.jsx` (`API_BASE_URL = "http://localhost:3000"`), `pages/Login.jsx`, và `SinhVien/src/pages/StudentLogin.jsx`. Riêng `SinhVien/src/services/apiClient.js` đã dùng đường dẫn tương đối `/api/v1/student` (tốt).
- `GiangVien/src/config/powerBiConfig.js` hàm `getMsalRedirectUri()` trả `${origin}/auth.html` (fallback `http://localhost:5173/auth.html`). Khi để dưới `/giangvien/` thì đường dẫn đổi.
- `backend/src/app.js`: CORS chỉ cho phép `localhost:5173/5174` (dòng ~50–53). Backend **chưa** phục vụ file tĩnh.
- `package.json` gốc: script `dev:backend` gọi `npm --prefix Backend` (chữ B hoa) trong khi thư mục là `backend`. Trên Windows chạy được, trên Linux/máy chủ thì hỏng.
- **Phiên đăng nhập dùng chung khoá khi cùng một origin:** cả hai app cùng ghi `isLoggedIn` và `userRole` vào `localStorage`. Hiện chạy hai cổng khác nhau nên không đụng nhau; khi gộp một link thì sẽ đụng. `GiangVien/src/components/ProtectedRoute.jsx` chỉ kiểm tra `isLoggedIn === "true"` (không kiểm tra vai trò) nên một sinh viên đã đăng nhập có thể mở được giao diện Giảng viên. Vai trò từ backend là `"teacher"` / `"student"`.
- Đăng xuất của Giảng viên (`components/Header.jsx`, ~dòng 12–13) chỉ xoá `teacherToken` và `teacherUser`, **không** xoá `isLoggedIn`. Đăng xuất của Sinh viên (`services/studentAuth.js`) thì gọi `localStorage.clear()` (xoá hết cả phiên của app kia).
- `SinhVien/src/components/StudentProtectedRoute.jsx` có lối tắt `?demo=1` tự đăng nhập không cần mật khẩu. Khi chỉ có một link, lối tắt này nguy hiểm hơn.

---

## Thứ tự thực hiện

### Bước 1 — Đường dẫn con và địa chỉ API tương đối

1. `Frontend/GiangVien/vite.config.js`: thêm `base: '/giangvien/'`. Giữ cổng 5173, giữ proxy `/api`, giữ hai điểm vào (`index.html`, `auth.html`).
2. `Frontend/SinhVien/vite.config.js`: thêm `base: '/sinhvien/'`. Giữ cổng 5174 và proxy.
3. Cả hai `src/main.jsx`: `<BrowserRouter basename="/giangvien">` và `<BrowserRouter basename="/sinhvien">`. Các `navigate("/...")`, `<Link to="/...">` trong app **không cần sửa** vì đã tính theo `basename`. Tìm và liệt kê mọi chỗ dùng `window.location.href/assign/replace` hoặc `<a href="/...">` ngắn (nếu có) để sửa thêm tiền tố.
4. Hai `index.html`: kiểm tra đường dẫn favicon/ảnh còn trỏ `/...` tuyệt đối; sửa để dùng `base` (Vite tự xử lý `/favicon.svg` trong `public/`, nhưng `/src/assets/vite.svg` thì nên đổi sang import hoặc đường dẫn có `base`).
5. Thay mọi địa chỉ ghi cứng `http://localhost:3000...` ở các file nêu trên bằng đường dẫn tương đối `/api/...`:
   - `apiClient.js`: `import.meta.env.VITE_API_URL || "/api"` (giữ khả năng ghi đè bằng biến môi trường).
   - `ClassComparison.jsx`: kiểm tra cách ghép chuỗi (`API_BASE_URL` + `/api/...`) để không bị `/api/api`.
   - `Login.jsx` và `StudentLogin.jsx`: `fetch("/api/auth/login", ...)`.
6. `powerBiConfig.js` → `getMsalRedirectUri()`: fallback đổi thành `${window.location.origin}/giangvien/auth.html` (và giá trị cuối `http://localhost:3000/giangvien/auth.html`). Biến `VITE_POWERBI_REDIRECT_URI` vẫn ưu tiên. Kiểm tra `auth.html` và `src/auth-bridge.js` không dùng đường dẫn tuyệt đối sai.
7. Kiểm tra: `npm run build` ở cả hai thư mục thành công; mở bản dev `http://localhost:5173/giangvien/` và `http://localhost:5174/sinhvien/` vẫn chạy bình thường (đăng nhập, đổi trang, tải lại trang đang đứng ở đường dẫn sâu).

**DỪNG báo cáo.**

### Bước 2 — Backend phục vụ cả hai bản build

Sửa `backend/src/app.js` (hoặc tách `backend/src/serveFrontend.js` rồi gọi từ `app.js`), đặt **sau** các route `/api` và **trước** trình xử lý 404:

1. Phục vụ `Frontend/SinhVien/dist` tại `/sinhvien` và `Frontend/GiangVien/dist` tại `/giangvien` bằng `express.static`. Dùng `path.resolve` tính từ vị trí file, **không** phụ thuộc thư mục đang chạy.
2. Với mỗi app, thêm trả về `index.html` cho mọi đường dẫn con **không phải file tĩnh** (để tải lại trang ở `/sinhvien/hanh-vi` hay `/giangvien/quan-ly-lop/10` không bị 404). Riêng `/giangvien/auth.html` phải trả đúng `auth.html`, không bị thay bằng `index.html`. Các đường `/api/*` tuyệt đối không bị bắt.
3. Tạo trang chọn vai trò tĩnh `Frontend/portal/index.html` (một file HTML thuần, không cần build): hai thẻ lớn "Sinh viên" → `/sinhvien/dang-nhap` và "Giảng viên" → `/giangvien/dang-nhap`, dùng màu xanh DLU `#37883e` giống hai app. Phục vụ tại `/`.
4. Nếu thư mục `dist` chưa tồn tại thì không làm sập backend: ghi log thân thiện "Chưa build giao diện, chạy `npm run build:all`" và bỏ qua phần tĩnh.
5. Thêm biến môi trường `SERVE_FRONTEND` (mặc định bật; đặt `false` để tắt) và `EXTRA_ALLOWED_ORIGINS` (danh sách, ngăn bằng dấu phẩy) cộng thêm vào `allowedOrigins`. Giữ nguyên các origin `localhost:5173/5174` hiện có để chạy dev vẫn được.

Kiểm tra: build hai app, chạy backend, `http://localhost:3000/` ra trang chọn vai trò; `/sinhvien/dang-nhap` và `/giangvien/dang-nhap` hiện đúng trang; F5 ở đường dẫn sâu không lỗi; `http://localhost:3000/api/test` vẫn trả như cũ.

**DỪNG báo cáo.**

### Bước 3 — Tách phiên đăng nhập giữa hai vai trò

1. `GiangVien/src/components/ProtectedRoute.jsx`: ngoài `isLoggedIn === "true"`, yêu cầu thêm `localStorage.getItem("userRole") === "teacher"`. Không đúng thì xoá phiên và chuyển về `/dang-nhap` (hiện thông báo nếu là tài khoản sinh viên: "Tài khoản này là Sinh viên, vui lòng đăng nhập tại Cổng Sinh viên" kèm đường dẫn `/sinhvien/dang-nhap`).
2. Đăng nhập thành công ở mỗi app: trước khi ghi phiên mới, xoá các khoá của app còn lại. Khoá Sinh viên: `studentUserKey`, `studentMoodleId`, `studentUsername`, `studentName`, `studentEmail`, `rememberStudentLogin`. Khoá Giảng viên: `currentTeacherId`, `currentUserKey`, `currentUsername`, `teacherUser`, `teacherToken`, `rememberLogin` (liệt kê đầy đủ bằng cách `grep` các `localStorage.setItem` trong `Login.jsx` của Giảng viên, rồi dùng đúng danh sách đó).
3. Đăng xuất của Giảng viên (`Header.jsx` và nơi khác nếu có, ví dụ `TeacherProfile.jsx`): xoá **cả** `isLoggedIn`, `userRole` và toàn bộ khoá Giảng viên (hiện chỉ xoá `teacherToken`/`teacherUser`, nên đăng xuất xong có thể vào lại mà không cần mật khẩu). Đăng xuất của Sinh viên: thay `localStorage.clear()` bằng xoá đúng các khoá của Sinh viên và `isLoggedIn`, `userRole`, để không xoá cả tuỳ chọn giao diện (`dluSidebarCollapsed`, `dluStudentSidebarCollapsed`) của app kia.
4. `StudentProtectedRoute.jsx`: chỉ cho phép lối tắt `?demo=1` khi `import.meta.env.DEV === true` hoặc `import.meta.env.VITE_ALLOW_DEMO === "true"`. Bản build mặc định phải **không** có lối tắt này. Ghi rõ trong báo cáo.

Kiểm tra: đăng nhập sinh viên rồi gõ `/giangvien/` → bị chuyển về đăng nhập Giảng viên với thông báo; đăng nhập giảng viên rồi vào `/sinhvien/` → tương tự; đăng xuất giảng viên xong bấm Back không vào lại được; bản build không còn chạy được `?demo=1`.

**DỪNG báo cáo.**

### Bước 4 — Script chạy và tài liệu

1. `package.json` gốc: sửa `Backend` → `backend` (chữ thường). Thêm: `"install:all"` (cài `npm install` ở `Frontend/GiangVien`, `Frontend/SinhVien`, `backend`), `"build:all"` (chạy `build:gv` rồi `build:sv`), `"start"` (`npm --prefix backend start`), `"app"` (`build:all` rồi `start`). Giữ nguyên các script cũ (`dev:gv`, `dev:sv`, `dev:backend`).
2. `README.md`: thêm mục **"Chạy bằng một link"** với các lệnh chính xác theo thứ tự: `npm run install:all` → `npm run app` → mở `http://localhost:3000`. Ghi rõ chạy dev 3 cổng vẫn dùng được (`http://localhost:5173/giangvien/`, `http://localhost:5174/sinhvien/`).
3. Ghi vào README mục **"Việc phải làm thủ công (AI không làm được)"**:
   - Đăng ký thêm Redirect URI trong Azure (App registration của Power BI): `http://localhost:3000/giangvien/auth.html`, và địa chỉ công khai nếu có dùng ngrok. Nếu không đăng ký thì nút đăng nhập Microsoft ở trang Phân tích của Giảng viên sẽ báo lỗi.
   - Nếu chia sẻ ra ngoài bằng ngrok hoặc cloudflared: `ngrok http 3000`, rồi thêm địa chỉ nhận được vào `EXTRA_ALLOWED_ORIGINS`.
4. Thêm `.gitignore` cho `Frontend/*/dist` nếu chưa có.

**DỪNG báo cáo.**

### Bước 5 — Kiểm tra tổng thể và báo cáo

Chạy `npm run app` từ thư mục gốc và báo cáo bảng PASS/FAIL cho từng dòng:

- `/` hiện trang chọn vai trò; hai nút đi đúng trang đăng nhập.
- Đăng nhập sinh viên (tài khoản trong `backend/scripts/seedAuth.js`): vào được Tổng quan, Khoá học, Hồ sơ hành vi, Phân tích; F5 ở `/sinhvien/hanh-vi` không lỗi; ảnh và biểu tượng hiển thị.
- Đăng nhập giảng viên: vào được Tổng quan, Quản lý lớp (đủ các khối của nhóm), Phân tích; F5 ở `/giangvien/quan-ly-lop/<id>` không lỗi.
- Tab Network của trình duyệt: mọi lời gọi API đều đi tới `/api/...` cùng origin, **không** còn `localhost:3000` ghi cứng.
- Chéo vai trò bị chặn (mục Bước 3).
- `npm run dev:gv`, `npm run dev:sv`, `npm run dev:backend` vẫn chạy được như trước.
- Liệt kê rõ phần chưa kiểm tra được vì cần thao tác thủ công (đăng nhập Microsoft/Power BI).

Báo cáo cuối: danh sách file đã sửa theo từng Bước, các chỗ phải quyết định, lệnh để tạo Pull Request.

## Ghi chú rủi ro (ghi vào báo cáo, không sửa trong lần này)

- Backend **chưa có middleware xác thực**: các API nhận mã người dùng qua tham số (`userId`) nên ai biết mã người khác có thể gọi trực tiếp. Chỉ dùng link công khai để demo ngắn hạn, không triển khai lâu dài.
- Trang Power BI của sinh viên lọc bằng bộ lọc trên URL, không phải phân quyền theo hàng thật.
