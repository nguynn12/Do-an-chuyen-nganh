import express from "express";
import cors from "cors";

// ============================================================
// SHARED ROUTES
// ============================================================

import authRoutes from "./shared/routes/authRoutes.js";
import testRoutes from "./shared/routes/testRoutes.js";


// ============================================================
// PHÂN HỆ GIẢNG VIÊN
// ============================================================

import teacherRoutes from "./GiangVien/routes/teacherRoutes.js";
import courseRoutes from "./GiangVien/routes/courseRoutes.js";


// ===== SO SÁNH LỚP =====
import comparisonRoutes from "./GiangVien/routes/comparisonRoutes.js";


// ===== THÔNG BÁO =====
import notificationRoutes from "./GiangVien/routes/notificationRoutes.js";


// ===== LỊCH GIẢNG VIÊN =====
import calendarRoutes from "./GiangVien/routes/calendarRoutes.js";


// ============================================================
// PHÂN HỆ SINH VIÊN
// ============================================================

import studentRoutes from "./SinhVien/routes/studentRoutes.js";


const app = express();


// ============================================================
// CORS
// ============================================================

const allowedOrigins = [
  "http://localhost:5173",
  "http://localhost:5174",
  "http://127.0.0.1:5173",
  "http://127.0.0.1:5174",
];

app.use(
  cors({
    origin: (origin, callback) => {
      // Cho phép request không có origin
      // như Postman / curl
      if (!origin || allowedOrigins.includes(origin)) {
        return callback(null, true);
      }

      return callback(null, true);
    },

    credentials: true,
  })
);


// ============================================================
// BODY PARSER
// ============================================================

app.use(express.json());

app.use(
  express.urlencoded({
    extended: true,
  })
);


// ============================================================
// ROOT API
// ============================================================

app.get("/", (req, res) => {
  res.json({
    success: true,
    message: "LMS Backend API đang hoạt động!",
  });
});


// ============================================================
// 1. SHARED APIs
// ============================================================

app.use(
  "/api/auth",
  authRoutes
);

app.use(
  "/api/test",
  testRoutes
);


// ============================================================
// 2. CỔNG GIẢNG VIÊN APIs
// ============================================================


// ------------------------------------------------------------
// Thông tin / Dashboard giảng viên
// ------------------------------------------------------------

app.use(
  "/api/teachers",
  teacherRoutes
);


// ------------------------------------------------------------
// Thông báo giảng viên
// ------------------------------------------------------------

app.use(
  "/api/teachers",
  notificationRoutes
);


// ------------------------------------------------------------
// Lịch giảng viên + deadline Moodle
// ------------------------------------------------------------

app.use(
  "/api/teachers",
  calendarRoutes
);


// ------------------------------------------------------------
// Khóa học
// ------------------------------------------------------------

app.use(
  "/api/courses",
  courseRoutes
);


// ------------------------------------------------------------
// So sánh lớp học
// ------------------------------------------------------------

app.use(
  "/api/comparison",
  comparisonRoutes
);


// ============================================================
// 3. CỔNG SINH VIÊN APIs
// ============================================================

app.use(
  "/api/v1/student",
  studentRoutes
);

app.use(
  "/api/student",
  studentRoutes
);


// ============================================================
// 404 - API KHÔNG TỒN TẠI
// ============================================================

app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: "Không tìm thấy API.",
  });
});


export default app;