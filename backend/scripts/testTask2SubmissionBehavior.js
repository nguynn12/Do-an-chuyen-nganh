import pool from "../src/config/database.js";
import { calculateCourseBehaviorMetrics } from "../src/shared/analytics/behaviorMetrics.js";

async function verifyTask2() {
  console.log("==================================================================");
  console.log(" KIỂM THỬ VÀ NGHIỆM THU TASK 2: HÀNH VI NỘP BÀI (SUBMISSION BEHAVIOR)");
  console.log("==================================================================");

  try {
    const courses = [8, 9, 10, 11];

    for (const courseKey of courses) {
      console.log(`\n--- KIỂM TRA MÔN HỌC (Course_Key: ${courseKey}) ---`);
      
      // 1. Lấy kết quả từ module
      const metrics = await calculateCourseBehaviorMetrics(pool, courseKey);
      const buckets = metrics.summary.submissionBuckets;
      const totalBucketCount = buckets.reduce((sum, b) => sum + b.count, 0);

      // 2. Lấy dữ liệu thực tế từ Fact_Assignment_Submission
      const [[rawCount]] = await pool.query(
        `SELECT COUNT(*) AS totalInDb,
                SUM(CASE WHEN Submission_Status = 'submitted' THEN 1 ELSE 0 END) AS submittedInDb,
                SUM(CASE WHEN Submission_Status = 'draft' OR Submission_Status IS NULL THEN 1 ELSE 0 END) AS notSubmittedInDb
         FROM Fact_Assignment_Submission 
         WHERE Course_Key = ?`,
        [courseKey]
      );

      console.log(`Môn: [${metrics.course.code}] ${metrics.course.name}`);
      console.log("Phân bố Buckets:", buckets);
      console.log(`Tổng số bài tính theo Buckets: ${totalBucketCount} bài`);
      console.log(`Tổng số bài trong Fact_Assignment_Submission: ${rawCount.totalInDb} bài (Đã nộp: ${rawCount.submittedInDb}, Draft/Chưa nộp: ${rawCount.notSubmittedInDb})`);

      const isMatch = totalBucketCount === Number(rawCount.totalInDb);
      console.log(`Kết quả đối chiếu: ${isMatch ? "✅ KHỚP TUYỆT ĐỐI (100%)" : "❌ KHÔNG KHỚP"}`);
      if (!isMatch) {
        throw new Error(`Môn ${courseKey} không khớp số lượng bài!`);
      }
    }

    console.log("\n==================================================================");
    console.log(" TẤT CẢ CÁC MÔN ĐỀU ĐẠT CHUẨN NGHIỆM THU CỦA TASK 2!");
    console.log("==================================================================");
  } catch (err) {
    console.error("Lỗi kiểm thử Task 2:", err);
  } finally {
    await pool.end();
  }
}

verifyTask2();
