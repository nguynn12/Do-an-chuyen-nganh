import dotenv from "dotenv";

dotenv.config();

import app from "./src/app.js";
import { testDatabaseConnection } from "./src/config/database.js";

const PORT = process.env.PORT || 3000;

async function startServer() {
  try {
    await testDatabaseConnection();

    app.listen(PORT, () => {
      console.log("");
      console.log("=================================");
      console.log("🚀 LMS Backend đang chạy");
      console.log(`🌐 http://localhost:${PORT}`);
      console.log(`🧪 http://localhost:${PORT}/api/test`);
      console.log(`🗄️ http://localhost:${PORT}/api/test/database`);
      console.log(`👤 http://localhost:${PORT}/api/test/users`);
      console.log("=================================");
      console.log("");
    });
  } catch (error) {
    console.error("❌ Không thể khởi động server.");
    process.exit(1);
  }
}

startServer();