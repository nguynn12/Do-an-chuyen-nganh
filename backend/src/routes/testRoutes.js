import express from "express";
import pool from "../config/database.js";

const router = express.Router();

// ===============================
// TEST API
// GET /api/test
// ===============================

router.get("/", (req, res) => {
  res.json({
    success: true,
    message: "Backend đang hoạt động!",
  });
});

// ===============================
// TEST DATABASE
// GET /api/test/database
// ===============================

router.get("/database", async (req, res) => {
  try {
    const [rows] = await pool.query(`
      SELECT DATABASE() AS databaseName
    `);

    res.json({
      success: true,
      message: "Kết nối database thành công!",
      database: rows[0].databaseName,
    });
  } catch (error) {
    console.error(error);

    res.status(500).json({
      success: false,
      message: "Không thể kết nối database.",
      error: error.message,
    });
  }
});

// ===============================
// TEST DIM_USER
// GET /api/test/users
// ===============================

router.get("/users", async (req, res) => {
  try {
    const [rows] = await pool.query(`
      SELECT
        User_Key,
        Moodle_User_ID,
        Username,
        First_Name,
        Last_Name,
        Full_Name,
        Email,
        Primary_Role,
        Is_Active
      FROM Dim_User
      ORDER BY Moodle_User_ID
    `);

    res.json({
      success: true,
      total: rows.length,
      data: rows,
    });
  } catch (error) {
    console.error(error);

    res.status(500).json({
      success: false,
      message: "Không thể lấy danh sách user.",
      error: error.message,
    });
  }
});

export default router;