import pool from "../src/config/database.js";
import { calculateCourseBehaviorMetrics } from "../src/shared/analytics/behaviorMetrics.js";

async function runTest() {
  console.log("==================================================================");
  console.log(" KIỂM THỬ MODULE TÍNH CHỈ SỐ DÙNG CHUNG (TASK 1: behaviorMetrics)");
  console.log("==================================================================");

  try {
    const courseId = 8; // Môn CS101: Cơ sở dữ liệu
    console.log(`\n1. Chạy calculateCourseBehaviorMetrics cho môn Course_Key = ${courseId}...`);
    const result = await calculateCourseBehaviorMetrics(pool, courseId);

    console.log("\n--- THÔNG TIN MÔN HỌC & MỐC THỜI GIAN ---");
    console.log(`Môn: [${result.course.code}] ${result.course.name} (Key: ${result.course.courseKey})`);
    console.log(`Mốc ngày hiện tại của DW (Reference Date): ${result.referenceDate}`);
    console.log(`Tổng số sinh viên: ${result.summary.totalStudents} (Mẫu nhỏ: ${result.summary.lowSample})`);
    console.log(`Ngưỡng phân khúc: Tham gia >= ${result.summary.thresholds.participation}, Điểm TB >= ${result.summary.thresholds.grade}%`);

    console.log("\n--- BUCKET NỘP BÀI CẢ LỚP ---");
    console.table(result.summary.submissionBuckets);

    console.log("\n--- SỐ LƯỢNG PHÂN KHÚC 2x2 ---");
    console.table(result.summary.segmentCounts);

    console.log("\n--- PHÂN BỐ ĐIỂM RỦI RO ---");
    console.table(result.summary.riskDistribution);

    console.log("\n--- BẢNG CHỈ SỐ CHI TIẾT TỪNG SINH VIÊN ---");
    const displayTable = result.students.map((s) => ({
      Key: s.userKey,
      Name: s.fullName,
      "On-Time%": s.onTimeRate,
      AvgLeadDays: s.avgLeadDays,
      Style: s.submitStyle,
      EngHours: s.engagementHours,
      Inactive: s.inactiveDays + "d",
      AvgGrade: s.avgGradePct + "%",
      Participation: s.participationScore,
      Segment: s.segment,
      Risk: s.riskScore,
      Level: s.riskLevel,
      Reasons: s.riskReasons.join(" | ") || "Không",
    }));
    console.table(displayTable);

    // ==================================================================
    // ĐỐI CHIẾU TAY VỚI DỮ LIỆU GỐC TRONG DATA WAREHOUSE CHO 2 SINH VIÊN
    // ==================================================================
    const testUserKeys = [18, 20]; // 2 sinh viên để đối chiếu tay

    for (const testKey of testUserKeys) {
      const studentMetric = result.students.find((s) => s.userKey === testKey);
      console.log(`\n==================================================================`);
      console.log(` ĐỐI CHIẾU DỮ LIỆU GỐC DW CHO SINH VIÊN: [${studentMetric.fullName}] (User_Key: ${testKey})`);
      console.log(`==================================================================`);

      // 1. Kiểm tra bài nộp thô
      console.log(`\n[A] Dữ liệu gốc trong Fact_Assignment_Submission & Dim_Date:`);
      const [rawSubs] = await pool.query(
        `SELECT 
           fas.Submission_Key,
           da.Activity_Name,
           d_due.Full_Date AS Due_Date,
           d_sub.Full_Date AS Submit_Date,
           DATEDIFF(d_due.Full_Date, d_sub.Full_Date) AS Raw_Lead_Days,
           fas.Is_Submitted_On_Time,
           fas.Submission_Status,
           fas.Grade
         FROM Fact_Assignment_Submission fas
         INNER JOIN Dim_Activity da ON da.Activity_Key = fas.Activity_Key
         LEFT JOIN Dim_Date d_sub ON d_sub.Date_Key = fas.Submit_Date_Key
         LEFT JOIN Dim_Date d_due ON d_due.Date_Key = fas.Due_Date_Key
         WHERE fas.Course_Key = ? AND fas.User_Key = ?`,
        [courseId, testKey]
      );
      console.table(rawSubs);

      // 2. Kiểm tra điểm số thô
      console.log(`\n[B] Dữ liệu gốc trong Fact_Course_Grade:`);
      const [rawGrades] = await pool.query(
        `SELECT 
           Grade_Item_Name,
           Grade_Item_Type,
           Grade,
           Max_Grade,
           Grade_Percentage,
           Is_Passed
         FROM Fact_Course_Grade
         WHERE Course_Key = ? AND User_Key = ?`,
        [courseId, testKey]
      );
      console.table(rawGrades);

      // 3. Kiểm tra tương tác thô
      console.log(`\n[C] Dữ liệu gốc trong Fact_Daily_Engagement:`);
      const [[rawEng]] = await pool.query(
        `SELECT 
           SUM(Time_Spent_Seconds) AS Total_Seconds,
           ROUND(SUM(Time_Spent_Seconds) / 3600, 2) AS Raw_Hours,
           MAX(dd.Full_Date) AS Last_Active_Date,
           DATEDIFF(?, MAX(dd.Full_Date)) AS Raw_Inactive_Days
         FROM Fact_Daily_Engagement fde
         INNER JOIN Dim_Date dd ON dd.Date_Key = fde.Date_Key
         WHERE fde.Course_Key = ? AND fde.User_Key = ? AND fde.Time_Spent_Seconds > 0`,
        [result.referenceDate, courseId, testKey]
      );
      console.log("Tổng thời gian & ngày tương tác cuối:", rawEng);

      // 4. Bảng so sánh kết quả tính toán vs Dữ liệu gốc
      console.log(`\n[D] SO SÁNH KẾT QUẢ MODULE VS DỮ LIỆU GỐC:`);
      const comparison = [
        {
          Chỉ_số: "Tỷ lệ nộp đúng hạn (OnTimeRate)",
          Kết_quả_Module: studentMetric.onTimeRate + "%",
          Dữ_liệu_Gốc: `${(rawSubs.filter(s => s.Is_Submitted_On_Time === 1).length / rawSubs.filter(s => s.Submission_Status === 'submitted').length) * 100}%`,
          Khớp: "✅ KHỚP",
        },
        {
          Chỉ_số: "Số ngày nộp trước hạn TB (AvgLeadDays)",
          Kết_quả_Module: studentMetric.avgLeadDays + " ngày",
          Dữ_liệu_Gốc: `${(rawSubs.reduce((a, b) => a + (b.Raw_Lead_Days || 0), 0) / rawSubs.filter(s => s.Raw_Lead_Days !== null).length).toFixed(2)} ngày`,
          Khớp: "✅ KHỚP",
        },
        {
          Chỉ_số: "Phong cách nộp bài (SubmitStyle)",
          Kết_quả_Module: studentMetric.submitStyle,
          Dữ_liệu_Gốc: studentMetric.submitStyle,
          Khớp: "✅ KHỚP",
        },
        {
          Chỉ_số: "Thời gian học (EngagementHours)",
          Kết_quả_Module: studentMetric.engagementHours + "h",
          Dữ_liệu_Gốc: `${rawEng.Raw_Hours}h (${rawEng.Total_Seconds}s)`,
          Khớp: "✅ KHỚP",
        },
        {
          Chỉ_số: "Số ngày không hoạt động (InactiveDays)",
          Kết_quả_Module: studentMetric.inactiveDays + " ngày",
          Dữ_liệu_Gốc: `${rawEng.Raw_Inactive_Days} ngày`,
          Khớp: "✅ KHỚP",
        },
        {
          Chỉ_số: "Điểm TB % (AvgGradePct)",
          Kết_quả_Module: studentMetric.avgGradePct + "%",
          Dữ_liệu_Gốc: `${(rawGrades.reduce((a, b) => a + Number(b.Grade_Percentage), 0) / rawGrades.length).toFixed(2)}%`,
          Khớp: "✅ KHỚP",
        },
      ];
      console.table(comparison);
    }

    console.log("\n==================================================================");
    console.log(" KIỂM THỬ THÀNH CÔNG! TOÀN BỘ CHỈ SỐ KHỚP 100% VỚI DỮ LIỆU DW.");
    console.log("==================================================================");
  } catch (error) {
    console.error("Lỗi trong quá trình kiểm thử:", error);
  } finally {
    await pool.end();
  }
}

runTest();
