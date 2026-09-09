import mysql from "mysql2/promise";
import dotenv from "dotenv";

dotenv.config();

const pool = mysql.createPool({
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,

  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
});

export async function testDatabaseConnection() {
  try {
    const connection = await pool.getConnection();

    console.log("✅ Kết nối MySQL thành công!");
    console.log(`📦 Database: ${process.env.DB_NAME}`);

    connection.release();
  } catch (error) {
    console.error("❌ Kết nối MySQL thất bại:");
    console.error(error.message);

    throw error;
  }
}

export default pool;