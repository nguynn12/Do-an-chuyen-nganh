import bcrypt from "bcryptjs";
import pool from "../src/config/database.js";

async function seedAuth() {
  try {
    console.log("Đang tạo tài khoản đăng nhập...");

    const accounts = [
      {
        moodleUserId: 1,
        username: "gv_nguyenan",
        password: "123456",
        role: "teacher",
      },
      {
        moodleUserId: 2,
        username: "gv_tranminhb",
        password: "123456",
        role: "teacher",
      },
      {
        moodleUserId: 101,
        username: "sv2310001",
        password: "123456",
        role: "student",
      },
      {
        moodleUserId: 102,
        username: "sv2310002",
        password: "123456",
        role: "student",
      },
      {
        moodleUserId: 103,
        username: "sv2310003",
        password: "123456",
        role: "student",
      },
      {
        moodleUserId: 104,
        username: "sv2310004",
        password: "123456",
        role: "student",
      },
      {
        moodleUserId: 105,
        username: "sv2310005",
        password: "123456",
        role: "student",
      },
      {
        moodleUserId: 106,
        username: "sv2310006",
        password: "123456",
        role: "student",
      },
      {
        moodleUserId: 107,
        username: "sv2310007",
        password: "123456",
        role: "student",
      },
      {
        moodleUserId: 108,
        username: "sv2310008",
        password: "123456",
        role: "student",
      },
      {
        moodleUserId: 109,
        username: "sv2310009",
        password: "123456",
        role: "student",
      },
      {
        moodleUserId: 110,
        username: "sv2310010",
        password: "123456",
        role: "student",
      },
      {
        moodleUserId: 111,
        username: "sv2310011",
        password: "123456",
        role: "student",
      },
      {
        moodleUserId: 112,
        username: "sv2310012",
        password: "123456",
        role: "student",
      },
    ];

    for (const account of accounts) {
      const [users] = await pool.query(
        `
        SELECT
          User_Key,
          Moodle_User_ID,
          Username,
          Full_Name,
          Primary_Role
        FROM Dim_User
        WHERE Moodle_User_ID = ?
        LIMIT 1
        `,
        [account.moodleUserId]
      );

      if (users.length === 0) {
        console.log(
          `Không tìm thấy Moodle user ${account.moodleUserId}`
        );
        continue;
      }

      const user = users[0];

      const passwordHash = await bcrypt.hash(
        account.password,
        10
      );

      await pool.query(
        `
        INSERT INTO App_User_Account (
          User_Key,
          Username,
          Password_Hash,
          Role,
          Is_Active
        )
        VALUES (?, ?, ?, ?, 1)

        ON DUPLICATE KEY UPDATE
          User_Key = VALUES(User_Key),
          Password_Hash = VALUES(Password_Hash),
          Role = VALUES(Role),
          Is_Active = 1
        `,
        [
          user.User_Key,
          account.username,
          passwordHash,
          account.role,
        ]
      );

      console.log(
        `✅ ${account.username} - ${user.Full_Name} (${account.role})`
      );
    }

    console.log("");
    console.log("✅ Tạo tài khoản hoàn tất.");

    await pool.end();
    process.exit(0);
  } catch (error) {
    console.error(
      "❌ Không thể tạo tài khoản:",
      error
    );

    await pool.end();
    process.exit(1);
  }
}

seedAuth();
