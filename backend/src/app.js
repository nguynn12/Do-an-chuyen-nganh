import express from "express";
import cors from "cors";

// Shared routes
import authRoutes from "./shared/routes/authRoutes.js";
import testRoutes from "./shared/routes/testRoutes.js";

// Phân hệ Giảng viên
import teacherRoutes from "./GiangVien/routes/teacherRoutes.js";
import courseRoutes from "./GiangVien/routes/courseRoutes.js";

// Phân hệ Sinh viên
import studentRoutes from "./SinhVien/routes/studentRoutes.js";

const app = express();

const allowedOrigins = [
  "http://localhost:5173",
  "http://localhost:5174",
  "http://127.0.0.1:5173",
  "http://127.0.0.1:5174",
];

app.use(
  cors({
    origin: (origin, callback) => {
      // Cho phép requests không có origin (curl/Postman) hoặc nằm trong danh sách
      if (!origin || allowedOrigins.includes(origin)) {
        return callback(null, true);
      }
      return callback(null, true);
    },
    credentials: true,
  })
);

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.get("/", (req, res) => {
  res.json({
    success: true,
    message: "LMS Backend API đang hoạt động!",
  });
});

// 1. Shared APIs
app.use("/api/auth", authRoutes);
app.use("/api/test", testRoutes);

// 2. Cổng Giảng viên APIs
app.use("/api/teachers", teacherRoutes);
app.use("/api/courses", courseRoutes);

// 3. Cổng Sinh viên APIs
app.use("/api/v1/student", studentRoutes);
app.use("/api/student", studentRoutes);

app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: "Không tìm thấy API.",
  });
});

export default app;