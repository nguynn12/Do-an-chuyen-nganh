import express from "express";
import cors from "cors";

import testRoutes from "./routes/testRoutes.js";
import teacherRoutes from "./routes/teacherRoutes.js";
import courseRoutes from "./routes/courseRoutes.js";
import authRoutes from "./routes/authRoutes.js";

const app = express();

app.use(
  cors({
    origin: "http://localhost:5173",
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

app.use("/api/auth", authRoutes);

app.use("/api/test", testRoutes);

app.use("/api/teachers", teacherRoutes);

app.use("/api/courses", courseRoutes);

app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: "Không tìm thấy API.",
  });
});

export default app;