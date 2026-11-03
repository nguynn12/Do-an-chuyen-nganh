# Đồ Án Chuyên Ngành - LMS Learning Analytics Platform

Hệ thống phân tích học tập (Learning Analytics) và quản lý LMS dành cho Giảng viên và Sinh viên.

---

## 🌟 Chạy bằng một link (Khuyến nghị)

Chạy toàn bộ hệ thống (Portal chọn vai trò, Cổng Giảng viên, Cổng Sinh viên và Backend API) trên **MỘT địa chỉ duy nhất**: `http://localhost:3000`.

### Thứ tự thực hiện:

1. **Cài đặt tất cả thư viện (cả 2 frontend và backend):**
   ```bash
   npm run install:all
   ```

2. **Build giao diện và khởi động hệ thống:**
   ```bash
   npm run app
   ```

3. **Mở trình duyệt:**
   - **Trang chủ / Chọn vai trò:** [http://localhost:3000](http://localhost:3000)
   - **Cổng Sinh viên:** [http://localhost:3000/sinhvien/dang-nhap](http://localhost:3000/sinhvien/dang-nhap)
   - **Cổng Giảng viên:** [http://localhost:3000/giangvien/dang-nhap](http://localhost:3000/giangvien/dang-nhap)
   - **Backend API:** [http://localhost:3000/api/test](http://localhost:3000/api/test)

> **Lưu ý:** Chế độ phát triển độc lập (3 tiến trình / 3 cổng) vẫn hoạt động bình thường nếu cần debug:
> - Cổng Giảng viên (dev): `npm run dev:gv` &rarr; [http://localhost:5173/giangvien/](http://localhost:5173/giangvien/)
> - Cổng Sinh viên (dev): `npm run dev:sv` &rarr; [http://localhost:5174/sinhvien/](http://localhost:5174/sinhvien/)
> - Backend API (dev): `npm run dev:backend` &rarr; [http://localhost:3000](http://localhost:3000)

---

## ⚠️ Việc phải làm thủ công (AI không làm được)

1. **Đăng ký Redirect URI trên Azure Portal (Microsoft Entra ID cho Power BI):**
   - Truy cập **Azure Portal** &rarr; **App registrations** &rarr; Chọn App của dự án (Client ID: `a8b09661-e072-43e9-945e-41512d641ccb`).
   - Vào mục **Authentication** &rarr; **Single-page application (SPA)**.
   - Thêm Redirect URI:
     - `http://localhost:3000/giangvien/auth.html`
     - *(Nếu có sử dụng ngrok hoặc domain công khai: Thêm `https://<subdomain>.ngrok-free.app/giangvien/auth.html`)*
   - Bấm **Save**.
   - *Nếu chưa đăng ký URI này, popup đăng nhập Microsoft ở trang Phân tích (Power BI Embed) của Giảng viên sẽ báo lỗi `AADSTS50011: The reply URL specified in the request does not match the reply URLs configured for the application`.*

2. **Chia sẻ ra mạng ngoài (ngrok / Cloudflare Tunnel):**
   - Khởi chạy tunnel:
     ```bash
     ngrok http 3000
     ```
   - Thêm địa chỉ nhận được (ví dụ `https://abc-xyz.ngrok-free.app`) vào biến môi trường `EXTRA_ALLOWED_ORIGINS` trong file `backend/.env`:
     ```env
     EXTRA_ALLOWED_ORIGINS=https://abc-xyz.ngrok-free.app
     ```
   - Khởi động lại backend để áp dụng CORS cho domain mới.

---

## 📁 Cấu trúc thư mục dự án

```text
DoAnChuyenNganh/
├── backend/                 # Máy chủ API Node.js / Express (Port 3000)
│   ├── .env.example         # File cấu hình môi trường mẫu
│   ├── scripts/seedAuth.js  # Script tạo tài khoản mẫu bcrypt
│   └── src/
│       ├── config/          # Cấu hình kết nối MySQL pool
│       ├── shared/          # API xác thực đăng nhập & test
│       ├── GiangVien/       # Controllers & Routes phân hệ Giảng viên
│       ├── SinhVien/        # Controllers & Routes phân hệ Sinh viên
│       └── serveFrontend.js # Phục vụ file tĩnh và SPA fallback cho 2 app
├── Database/                # 16 file SQL DDL & Seed dữ liệu (Moodle source & Data Warehouse)
├── ETL/                     # 9 file SQL ETL nạp dữ liệu vào Data Warehouse
├── Documentation/           # Tài liệu thiết kế & báo cáo đồ án
└── Frontend/
    ├── portal/              # Trang Portal HTML thuần chọn vai trò tại "/"
    ├── GiangVien/           # Cổng Giảng viên (React + Vite, base: /giangvien/)
    └── SinhVien/            # Cổng Sinh viên (React + Tailwind v4 + AntD, base: /sinhvien/)
```

---

## 🚀 Hướng dẫn chuẩn bị Cơ sở dữ liệu & Cài đặt truyền thống

### 1. Chuẩn bị Cơ sở dữ liệu (MySQL)
1. Chạy các file SQL trong thư mục `Database/` theo thứ tự từ `01` đến `16`.
2. Chạy các file ETL trong thư mục `ETL/` từ `01` đến `09` để đồng bộ dữ liệu vào `lms_datawarehouse`.

### 2. Cấu hình Backend
1. Tạo file `backend/.env` từ `backend/.env.example` và điền cấu hình MySQL:
   ```env
   PORT=3000
   DB_HOST=localhost
   DB_PORT=3306
   DB_USER=root
   DB_PASSWORD=your_mysql_password
   DB_NAME=lms_datawarehouse
   ```
2. Tạo tài khoản mẫu cho giảng viên và sinh viên:
   ```powershell
   node backend/scripts/seedAuth.js
   ```
   - *Tài khoản Giảng viên:* `gv_nguyenan` hoặc `gv_tranminhb` | *Mật khẩu:* `123456`
   - *Tài khoản Sinh viên:* `sv2310002` | *Mật khẩu:* `123456`

---

## 💻 Danh mục các lệnh npm từ thư mục gốc

| Mục đích | Lệnh chạy từ root | Mô tả |
| :--- | :--- | :--- |
| **Cài đặt tất cả** | `npm run install:all` | Chạy `npm install` ở cả 3 thư mục |
| **Build toàn bộ** | `npm run build:all` | Build cả Cổng Giảng viên và Cổng Sinh viên |
| **Chạy 1 link duy nhất** | `npm run app` | Tự động build và chạy backend tại `http://localhost:3000` |
| **Chạy server backend** | `npm run start` | Chạy backend Node.js (`server.js`) |
| **Dev Giảng viên** | `npm run dev:gv` *(hoặc `dev`)* | Vite dev server tại `http://localhost:5173/giangvien/` |
| **Dev Sinh viên** | `npm run dev:sv` | Vite dev server tại `http://localhost:5174/sinhvien/` |
| **Dev Backend** | `npm run dev:backend` | Nodemon backend API tại `http://localhost:3000` |
