import express from "express";
import path from "node:path";
import fs from "node:fs";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Đường dẫn tuyệt đối tới thư mục gốc dự án (2 cấp từ backend/src)
const PROJECT_ROOT = path.resolve(__dirname, "../../");

const GIANG_VIEN_DIST = path.resolve(PROJECT_ROOT, "Frontend/GiangVien/dist");
const SINH_VIEN_DIST = path.resolve(PROJECT_ROOT, "Frontend/SinhVien/dist");
const PORTAL_PATH = path.resolve(PROJECT_ROOT, "Frontend/portal/index.html");

/**
 * Cấu hình phục vụ file tĩnh và SPA fallback cho cả 2 phân hệ (Giảng Viên & Sinh Viên)
 * cùng trang chọn vai trò Portal tại "/"
 *
 * @param {import("express").Express} app
 */
export function setupFrontendServing(app) {
  // Biến môi trường SERVE_FRONTEND: mặc định bật (true); đặt "false" để tắt
  if (process.env.SERVE_FRONTEND === "false") {
    console.log("ℹ️  [Frontend] SERVE_FRONTEND=false, bỏ qua phục vụ file tĩnh frontend.");
    return;
  }

  const hasGiangVien = fs.existsSync(GIANG_VIEN_DIST);
  const hasSinhVien = fs.existsSync(SINH_VIEN_DIST);
  const hasPortal = fs.existsSync(PORTAL_PATH);

  if (!hasGiangVien || !hasSinhVien) {
    console.warn(
      "⚠️  [Frontend] Chưa build đầy đủ giao diện (thiếu GiangVien/dist hoặc SinhVien/dist). " +
        "Vui lòng chạy 'npm run build:all' để phục vụ trên cùng một cổng."
    );
  }

  // 1. Phục vụ Cổng Giảng Viên
  if (hasGiangVien) {
    // Phục vụ assets tĩnh (/giangvien/assets/*, /giangvien/favicon.svg, ...)
    app.use("/giangvien", express.static(GIANG_VIEN_DIST));

    // Đảm bảo /giangvien/auth.html trả về đúng auth.html cho MSAL redirect bridge
    app.get("/giangvien/auth.html", (req, res) => {
      res.sendFile(path.resolve(GIANG_VIEN_DIST, "auth.html"));
    });

    // SPA fallback: Mọi đường dẫn con không phải file tĩnh trả về index.html
    // Dùng cú pháp `{*splat}` tương thích Express 5 (path-to-regexp v8)
    app.get(["/giangvien", "/giangvien/{*splat}"], (req, res) => {
      res.sendFile(path.resolve(GIANG_VIEN_DIST, "index.html"));
    });
  }

  // 2. Phục vụ Cổng Sinh Viên
  if (hasSinhVien) {
    // Phục vụ assets tĩnh (/sinhvien/assets/*, ...)
    app.use("/sinhvien", express.static(SINH_VIEN_DIST));

    // SPA fallback: Mọi đường dẫn con không phải file tĩnh trả về index.html
    // Dùng cú pháp `{*splat}` tương thích Express 5 (path-to-regexp v8)
    app.get(["/sinhvien", "/sinhvien/{*splat}"], (req, res) => {
      res.sendFile(path.resolve(SINH_VIEN_DIST, "index.html"));
    });
  }

  // 3. Phục vụ Trang Chọn Vai Trò (Portal) tại "/"
  if (hasPortal) {
    app.get("/", (req, res) => {
      res.sendFile(PORTAL_PATH);
    });
  }
}

export default setupFrontendServing;
