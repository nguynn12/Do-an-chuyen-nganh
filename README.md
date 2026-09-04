# Đồ Án Chuyên Ngành - LMS Learning Analytics Platform

Hệ thống phân tích học tập (Learning Analytics) và quản lý LMS dành cho Giảng viên và Sinh viên.

---

## 📁 Cấu trúc thư mục dự án

```text
DoAnChuyenNganh/
├── Backend/                 # Máy chủ API Node.js / Express (Port 3000)
│   ├── .env.example         # File cấu hình môi trường mẫu
│   ├── scripts/seedAuth.js  # Script tạo tài khoản mẫu bcrypt
│   └── src/                 # Mã nguồn backend (routes, controllers, models)
├── Database/                # 16 file SQL DDL & Seed dữ liệu (Moodle source & Data Warehouse)
├── ETL/                     # 9 file SQL ETL nạp dữ liệu vào Data Warehouse
├── Documentation/           # Tài liệu thiết kế & báo cáo đồ án
└── Frontend/
    ├── GiangVien/           # Cổng Giảng viên (React + Vite, Port 5173)
    └── SinhVien/            # Cổng Sinh viên (React + Tailwind v4 + AntD, Port 5174)
```

---

## 🚀 Hướng dẫn cài đặt & Khởi chạy

### 1. Chuẩn bị Cơ sở dữ liệu (MySQL)
1. Chạy các file SQL trong thư mục `Database/` theo thứ tự từ `01` đến `16`.
2. Chạy các file ETL trong thư mục `ETL/` từ `01` đến `09` để đồng bộ dữ liệu vào `lms_datawarehouse`.

### 2. Cài đặt Backend
1. Vào thư mục `Backend`:
   ```powershell
   cd Backend
   npm install
   ```
2. Tạo file `.env` từ `.env.example` và điền mật khẩu MySQL của bạn:
   ```env
   PORT=3000
   DB_HOST=localhost
   DB_PORT=3306
   DB_USER=root
   DB_PASSWORD=your_mysql_password
   DB_NAME=lms_datawarehouse
   ```
3. Tạo tài khoản mẫu cho giảng viên:
   ```powershell
   node scripts/seedAuth.js
   ```
   *Tài khoản mặc định:* `gv_nguyenan` hoặc `gv_tranminhb` | *Mật khẩu:* `123456`

### 3. Cài đặt các cổng Frontend
Từ thư mục gốc hoặc vào từng thư mục để cài đặt:
```powershell
npm --prefix Frontend/GiangVien install
npm --prefix Frontend/SinhVien install
```

---

## 💻 Các lệnh khởi chạy hệ thống

Từ thư mục gốc của dự án, sử dụng các lệnh tiện lợi sau:

| Dịch vụ | Lệnh chạy từ root | Địa chỉ truy cập |
| :--- | :--- | :--- |
| **Backend API** | `npm run dev:backend` | `http://localhost:3000` |
| **Cổng Giảng Viên** | `npm run dev:gv` *(hoặc `npm run dev`)* | `http://localhost:5173` |
| **Cổng Sinh Viên** | `npm run dev:sv` | `http://localhost:5174` |
