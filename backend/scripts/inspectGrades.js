import pool from "../src/config/database.js";
import { calculateCourseBehaviorMetrics } from "../src/shared/analytics/behaviorMetrics.js";

async function inspectGrades() {
  console.log("=== 1. DANH SÁCH MÔN HỌC & NGÀY BẮT ĐẦU ===");
  const [courses] = await pool.query(
    "SELECT Course_Key, Course_Code, Course_Name, Start_Date, End_Date FROM Dim_Course ORDER BY Course_Key"
  );
  console.table(courses);

  console.log("\n=== 2. CÁC LOẠI GRADE_ITEM_TYPE TRONG FACT_COURSE_GRADE ===");
  const [itemTypes] = await pool.query(
    "SELECT Grade_Item_Type, COUNT(*) as count, MIN(Grade) as minGrade, MAX(Grade) as maxGrade, MIN(Grade_Percentage) as minPct, MAX(Grade_Percentage) as maxPct FROM Fact_Course_Grade GROUP BY Grade_Item_Type"
  );
  console.table(itemTypes);

  console.log("\n=== 3. THỐNG KÊ IS_PASSED THEO MÔN ===");
  const [passedStats] = await pool.query(`
    SELECT 
      Course_Key, 
      COUNT(*) AS totalGrades, 
      SUM(CASE WHEN Is_Passed = 1 THEN 1 ELSE 0 END) AS passedCount,
      SUM(CASE WHEN Is_Passed = 0 THEN 1 ELSE 0 END) AS failedCount
    FROM Fact_Course_Grade 
    GROUP BY Course_Key
  `);
  console.table(passedStats);

  console.log("\n=== 4. ĐIỂM TRUNG BÌNH CỦA TỪNG SINH VIÊN MỖI MÔN ===");
  const [studentAvgs] = await pool.query(`
    SELECT 
      fcg.Course_Key,
      dc.Course_Code,
      fcg.User_Key,
      du.Full_Name,
      COUNT(fcg.Grade_Key) AS totalItems,
      ROUND(AVG(fcg.Grade_Percentage), 2) AS avgGradePct,
      ROUND(AVG(fcg.Grade), 2) AS avgGrade10,
      MIN(fcg.Is_Passed) AS allPassed
    FROM Fact_Course_Grade fcg
    JOIN Dim_Course dc ON dc.Course_Key = fcg.Course_Key
    JOIN Dim_User du ON du.User_Key = fcg.User_Key
    GROUP BY fcg.Course_Key, fcg.User_Key
    ORDER BY fcg.Course_Key, avgGradePct ASC
  `);
  console.table(studentAvgs);

  console.log("\n=== 5. KIỂM TRA TÍNH TOÁN CẢNH BÁO SỚM THEO TUẦN (WEEKLY CUT-OFF) ===");
  const weeks = [2, 3, 4, 6, 8];

  for (const c of courses) {
    console.log(`\n--- Môn: [${c.Course_Code}] ${c.Course_Name} (Start: ${c.Start_Date?.toISOString?.()?.split("T")[0] || c.Start_Date}) ---`);
    const startDate = new Date(c.Start_Date);

    for (const w of weeks) {
      const cutOff = new Date(startDate.getTime() + (w * 7 - 1) * 24 * 60 * 60 * 1000);
      const cutOffStr = cutOff.toISOString().split("T")[0];

      const metrics = await calculateCourseBehaviorMetrics(pool, c.Course_Key, { cutOffDate: cutOffStr });
      const atRiskStudents = metrics.students.filter((s) => s.riskScore >= 40);
      const scores = metrics.students.map((s) => `${s.userKey}: ${s.riskScore}`);

      console.log(
        `Tuần ${w} (CutOff: ${cutOffStr}): ${metrics.students.length} SV | Nguy cơ (Risk>=40): ${atRiskStudents.length} SV | Scores: [${scores.join(", ")}]`
      );
    }
  }

  await pool.end();
}

inspectGrades();
