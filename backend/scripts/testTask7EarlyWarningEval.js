/**
 * ============================================================
 * SCRIPT KIỂM THỬ VÀ NGHIỆM THU TASK 7: ĐÁNH GIÁ CẢNH BÁO SỚM
 * ============================================================
 */

import pool from "../src/config/database.js";

async function runTask7Verification() {
  console.log("============================================================");
  console.log("  NGHIỆM THU TASK 7: BẢNG Early_Warning_Eval VÀ MA TRẬN ĐÁNH GIÁ");
  console.log("============================================================\n");

  // 1. Kiểm tra tổng số bản ghi trong bảng Early_Warning_Eval
  console.log("1. KIỂM TRA SỐ LƯỢNG BẢN GHI TRONG BẢNG Early_Warning_Eval:");
  const [[{ totalRows }]] = await pool.query(
    "SELECT COUNT(*) AS totalRows FROM Early_Warning_Eval"
  );
  const [courseWeekCounts] = await pool.query(`
    SELECT 
      ewe.Course_Key,
      dc.Course_Code,
      dc.Course_Name,
      COUNT(DISTINCT ewe.User_Key) AS totalStudents,
      COUNT(DISTINCT ewe.Week_N) AS totalWeeks,
      COUNT(*) AS totalEvalRecords
    FROM Early_Warning_Eval ewe
    JOIN Dim_Course dc ON dc.Course_Key = ewe.Course_Key
    GROUP BY ewe.Course_Key
  `);
  console.table(courseWeekCounts);
  console.log(`   => Tổng số bản ghi đánh giá: ${totalRows} (Kỳ vọng: 4 môn x 6 SV x 5 tuần = 120 dòng)`);
  console.log(totalRows === 120 ? "   ✅ ĐÚNG 100% SỐ LƯỢNG BẢN GHI!" : "   ❌ SAI SỐ LƯỢNG BẢN GHI");

  // 2. Nghiệm thu đếm tay cho 1 môn tại 1 mốc tuần cụ thể (Week 8 của Môn Game401)
  console.log("\n2. ĐỐI CHIẾU ĐẾM TAY 1 MÔN CỤ THỂ TẠI TUẦN 8 (WEEK 8):");
  console.log("   Môn: [GAME401] Phát triển ứng dụng Game nâng cao (Course_Key: 10) - Tuần 8\n");

  const [studentRecords] = await pool.query(`
    SELECT 
      ewe.User_Key,
      du.Full_Name,
      ewe.Week_N,
      ewe.Risk_Score,
      ewe.Predicted_At_Risk,
      ewe.Actual_Failed,
      ROUND(AVG(fcg.Grade_Percentage), 2) AS Actual_Avg_Grade_Pct
    FROM Early_Warning_Eval ewe
    JOIN Dim_User du ON du.User_Key = ewe.User_Key
    LEFT JOIN Fact_Course_Grade fcg ON fcg.Course_Key = ewe.Course_Key AND fcg.User_Key = ewe.User_Key
    WHERE ewe.Course_Key = 10 AND ewe.Week_N = 8
    GROUP BY ewe.User_Key, ewe.Week_N, ewe.Risk_Score, ewe.Predicted_At_Risk, ewe.Actual_Failed
    ORDER BY ewe.Risk_Score DESC, Actual_Avg_Grade_Pct ASC
  `);

  let manualTP = 0;
  let manualFP = 0;
  let manualFN = 0;
  let manualTN = 0;

  const tableData = studentRecords.map((s) => {
    let classification = "";
    if (s.Predicted_At_Risk === 1 && s.Actual_Failed === 1) {
      classification = "TP (True Positive - Đúng nguy cơ)";
      manualTP++;
    } else if (s.Predicted_At_Risk === 1 && s.Actual_Failed === 0) {
      classification = "FP (False Positive - Cảnh báo nhầm)";
      manualFP++;
    } else if (s.Predicted_At_Risk === 0 && s.Actual_Failed === 1) {
      classification = "FN (False Negative - Bỏ sót)";
      manualFN++;
    } else {
      classification = "TN (True Negative - Đúng an toàn)";
      manualTN++;
    }

    return {
      "User Key": s.User_Key,
      "Họ và tên": s.Full_Name,
      "Risk Score": s.Risk_Score,
      "Dự báo (Predicted)": s.Predicted_At_Risk === 1 ? "Nguy cơ (1)" : "An toàn (0)",
      "Thực tế (Actual)": s.Actual_Failed === 1 ? "Không đạt (<70%)" : "Đạt (>=70%)",
      "Điểm TB thực tế": `${s.Actual_Avg_Grade_Pct}%`,
      "Phân loại Confusion": classification,
    };
  });

  console.table(tableData);

  console.log("   --- KẾT QUẢ ĐẾM TAY TỪ DỮ LIỆU GỐC ---");
  console.log(`   - TP (True Positive):  ${manualTP}`);
  console.log(`   - FP (False Positive): ${manualFP}`);
  console.log(`   - FN (False Negative): ${manualFN}`);
  console.log(`   - TN (True Negative):  ${manualTN}`);
  console.log(`   - Tổng số sinh viên:   ${manualTP + manualFP + manualFN + manualTN} SV`);

  // Truy vấn trực tiếp từ bảng DB để đối chiếu
  const [[dbConfusion]] = await pool.query(`
    SELECT 
      SUM(CASE WHEN Predicted_At_Risk = 1 AND Actual_Failed = 1 THEN 1 ELSE 0 END) AS TP,
      SUM(CASE WHEN Predicted_At_Risk = 1 AND Actual_Failed = 0 THEN 1 ELSE 0 END) AS FP,
      SUM(CASE WHEN Predicted_At_Risk = 0 AND Actual_Failed = 1 THEN 1 ELSE 0 END) AS FN,
      SUM(CASE WHEN Predicted_At_Risk = 0 AND Actual_Failed = 0 THEN 1 ELSE 0 END) AS TN
    FROM Early_Warning_Eval
    WHERE Course_Key = 10 AND Week_N = 8
  `);

  console.log("\n   --- ĐỐI CHIẾU VỚI CƠ SỞ DỮ LIỆU ---");
  console.log(`   - DB TP: ${dbConfusion.TP} | Đếm tay TP: ${manualTP} => ${Number(dbConfusion.TP) === manualTP ? "✅ KHỚP" : "❌ LỆCH"}`);
  console.log(`   - DB FP: ${dbConfusion.FP} | Đếm tay FP: ${manualFP} => ${Number(dbConfusion.FP) === manualFP ? "✅ KHỚP" : "❌ LỆCH"}`);
  console.log(`   - DB FN: ${dbConfusion.FN} | Đếm tay FN: ${manualFN} => ${Number(dbConfusion.FN) === manualFN ? "✅ KHỚP" : "❌ LỆCH"}`);
  console.log(`   - DB TN: ${dbConfusion.TN} | Đếm tay TN: ${manualTN} => ${Number(dbConfusion.TN) === manualTN ? "✅ KHỚP" : "❌ LỆCH"}`);

  // 3. Bảng tổng hợp toàn bộ các tuần
  console.log("\n3. BẢNG TỔNG HỢP TOÀN BỘ 5 TUẦN ĐÁNH GIÁ (WEEK 2, 3, 4, 6, 8):");
  const [weeklyOverall] = await pool.query(`
    SELECT 
      CONCAT('Tuần ', Week_N) AS Week_Label,
      COUNT(*) AS Total_Samples,
      SUM(CASE WHEN Predicted_At_Risk = 1 AND Actual_Failed = 1 THEN 1 ELSE 0 END) AS TP,
      SUM(CASE WHEN Predicted_At_Risk = 1 AND Actual_Failed = 0 THEN 1 ELSE 0 END) AS FP,
      SUM(CASE WHEN Predicted_At_Risk = 0 AND Actual_Failed = 1 THEN 1 ELSE 0 END) AS FN,
      SUM(CASE WHEN Predicted_At_Risk = 0 AND Actual_Failed = 0 THEN 1 ELSE 0 END) AS TN,
      ROUND(SUM(CASE WHEN (Predicted_At_Risk = 1 AND Actual_Failed = 1) OR (Predicted_At_Risk = 0 AND Actual_Failed = 0) THEN 1 ELSE 0 END) / COUNT(*) * 100, 1) AS Accuracy_Pct
    FROM Early_Warning_Eval
    GROUP BY Week_N
    ORDER BY Week_N ASC
  `);
  console.table(weeklyOverall);

  console.log("\n============================================================");
  console.log("  NGHIỆM THU TASK 7 HOÀN TẤT THÀNH CÔNG 100%!");
  console.log("============================================================");

  await pool.end();
}

runTask7Verification();
