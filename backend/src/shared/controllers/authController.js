import bcrypt from "bcryptjs";
import pool from "../../config/database.js";

export async function login(req, res) {
  try {
    const { username, password } = req.body;

    if (!username?.trim() || !password) {
      return res.status(400).json({
        success: false,
        message:
          "Vui lòng nhập đầy đủ tên đăng nhập và mật khẩu.",
      });
    }

    const [rows] = await pool.query(
      `
      SELECT
        a.Account_ID,
        a.Username,
        a.Password_Hash,
        a.Role,
        a.Is_Active AS Account_Is_Active,

        u.User_Key,
        u.Moodle_User_ID,
        u.Full_Name,
        u.Email,
        u.Primary_Role,
        u.Is_Active AS User_Is_Active

      FROM App_User_Account a

      INNER JOIN Dim_User u
        ON u.User_Key = a.User_Key

      WHERE LOWER(a.Username) = LOWER(?)

      LIMIT 1
      `,
      [username.trim()]
    );

    if (rows.length === 0) {
      return res.status(401).json({
        success: false,
        message:
          "Tên đăng nhập hoặc mật khẩu không đúng.",
      });
    }

    const account = rows[0];

    if (
      !account.Account_Is_Active ||
      !account.User_Is_Active
    ) {
      return res.status(403).json({
        success: false,
        message:
          "Tài khoản hiện đang bị khóa.",
      });
    }

    const passwordMatched =
      await bcrypt.compare(
        password,
        account.Password_Hash
      );

    if (!passwordMatched) {
      return res.status(401).json({
        success: false,
        message:
          "Tên đăng nhập hoặc mật khẩu không đúng.",
      });
    }

    return res.json({
      success: true,
      message: "Đăng nhập thành công.",

      user: {
        userKey: account.User_Key,
        moodleUserId:
          account.Moodle_User_ID,
        username:
          account.Username,
        fullName:
          account.Full_Name,
        email:
          account.Email,
        role:
          account.Role,
        primaryRole:
          account.Primary_Role,
      },
    });
  } catch (error) {
    console.error("Lỗi login:", error);

    return res.status(500).json({
      success: false,
      message: "Không thể đăng nhập.",
      error: error.message,
    });
  }
}