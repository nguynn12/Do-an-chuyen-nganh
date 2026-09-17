import pool from "../src/config/database.js";

async function run() {
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS lms_datawarehouse.fact_notification (
        notification_id INT AUTO_INCREMENT PRIMARY KEY,
        recipient_user_id INT NOT NULL,
        notification_type VARCHAR(50) NOT NULL,
        title VARCHAR(255) NOT NULL,
        message TEXT,
        course_id INT NULL,
        source_system VARCHAR(50) DEFAULT 'LMS',
        is_read TINYINT(1) DEFAULT 0,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        read_at DATETIME NULL,
        email_status VARCHAR(20) DEFAULT 'PENDING',
        email_sent_at DATETIME NULL,
        KEY idx_recipient (recipient_user_id),
        KEY idx_is_read (is_read),
        KEY idx_course (course_id)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);
    console.log("Table fact_notification created successfully!");
    process.exit(0);
  } catch (err) {
    console.error("Error creating table:", err);
    process.exit(1);
  }
}

run();
