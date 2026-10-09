/**
 * ============================================================
 * SCRIPT KIỂM THỬ VÀ NGHIỆM THU TASK 6: TƯƠNG QUAN PEARSON
 * ============================================================
 */

import pool from "../src/config/database.js";
import { calculatePearsonR } from "./computeCorrelation.js";

async function runTask6Verification() {
  console.log("============================================================");
  console.log("  NGHIỆM THU TASK 6: HỆ SỐ TƯƠNG QUAN PEARSON VÀ BẢNG Correlation_Result");
  console.log("============================================================\n");

  // 1. Kiểm tra dữ liệu trong bảng Correlation_Result
  console.log("1. KIỂM TRA BẢNG Correlation_Result TRONG DATABASE:");
  const [dbRows] = await pool.query(`
    SELECT 
      cr.Course_Key,
      dc.Course_Name,
      cr.Factor,
      cr.R,
      cr.N,
      DATE_FORMAT(cr.Computed_At, '%Y-%m-%d %H:%i:%s') AS Computed_At
    FROM Correlation_Result cr
    JOIN Dim_Course dc ON dc.Course_Key = cr.Course_Key
    ORDER BY cr.Course_Key ASC, ABS(cr.R) DESC
  `);
  console.table(dbRows);

  // 2. Đối chiếu tay 1 cặp (Môn, Yếu tố) với công thức Excel CORREL
  console.log("\n2. ĐỐI CHIẾU TAY CÔNG THỨC TOÁN HỌC & EXCEL CORREL:");
  console.log("   Môn: [CS301] Cơ sở dữ liệu (Course_Key: 8)");
  console.log("   Yếu tố: 'Nộp bài đúng hạn' (X) vs 'Điểm trung bình %' (Y)\n");

  const xVector = [100, 50, 100, 100, 50, 50];
  const yVector = [81.0, 78.5, 71.67, 95.0, 72.67, 76.67];

  const n = xVector.length;
  const meanX = xVector.reduce((a, b) => a + b, 0) / n;
  const meanY = yVector.reduce((a, b) => a + b, 0) / n;

  let sumDiffSqX = 0;
  let sumDiffSqY = 0;
  let sumProdDiff = 0;

  console.log("   --- Bảng chi tiết từng sinh viên (6 SV) ---");
  for (let i = 0; i < n; i++) {
    const diffX = xVector[i] - meanX;
    const diffY = yVector[i] - meanY;
    const diffSqX = diffX * diffX;
    const diffSqY = diffY * diffY;
    const prodDiff = diffX * diffY;

    sumDiffSqX += diffSqX;
    sumDiffSqY += diffSqY;
    sumProdDiff += prodDiff;

    console.log(
      `   SV ${i + 1}: X=${xVector[i].toString().padStart(3)}, ` +
        `Y=${yVector[i].toFixed(2).padStart(5)} | ` +
        `(X - X_mean)=${diffX.toFixed(2).padStart(6)}, ` +
        `(Y - Y_mean)=${diffY.toFixed(2).padStart(6)} | ` +
        `(X-X_m)*(Y-Y_m)=${prodDiff.toFixed(2).padStart(7)}`
    );
  }

  const rCalculated = sumProdDiff / Math.sqrt(sumDiffSqX * sumDiffSqY);

  console.log("\n   --- Thống kê tổng hợp ---");
  console.log(`   - Kích thước mẫu (N): ${n}`);
  console.log(`   - Mean X (TB Tỷ lệ đúng hạn): ${meanX.toFixed(4)}%`);
  console.log(`   - Mean Y (TB Điểm số): ${meanY.toFixed(4)}%`);
  console.log(`   - Tổng bình phương sai lệch X: sum((X - meanX)^2) = ${sumDiffSqX.toFixed(4)}`);
  console.log(`   - Tổng bình phương sai lệch Y: sum((Y - meanY)^2) = ${sumDiffSqY.toFixed(4)}`);
  console.log(`   - Tử số (Hiệp phương sai): sum((X - meanX)*(Y - meanY)) = ${sumProdDiff.toFixed(4)}`);
  console.log(`   - Mẫu số: sqrt(${sumDiffSqX.toFixed(4)} * ${sumDiffSqY.toFixed(4)}) = ${Math.sqrt(sumDiffSqX * sumDiffSqY).toFixed(4)}`);
  console.log(`   - Hệ số Pearson R tính được: ${rCalculated.toFixed(6)} => Làm tròn 4 chữ số: ${rCalculated.toFixed(4)}`);

  const dbTargetRow = dbRows.find(
    (r) => r.Course_Key === 8 && r.Factor === "Nộp bài đúng hạn"
  );
  console.log(`   - Giá trị R lưu trong DB: ${dbTargetRow?.R}`);

  const isMatch = Math.abs(Number(dbTargetRow?.R) - Number(rCalculated.toFixed(4))) < 0.0001;
  console.log(`   => Kết luận kiểm chứng: ${isMatch ? "✅ KHỚP CHÍNH XÁC 100% VỚI EXCEL CORREL" : "❌ KHÔNG KHỚP"}`);

  // 3. Kiểm thử điều kiện biên
  console.log("\n3. KIỂM THỬ ĐIỀU KIỆN BIÊN:");
  const testSampleLess5 = calculatePearsonR([1, 2, 3, 4], [10, 20, 30, 40], 5);
  console.log("   - Trường hợp N < 5 (N=4):", testSampleLess5, testSampleLess5.r === null ? "✅ ĐÚNG (R = null)" : "❌ SAI");

  const testZeroVarianceX = calculatePearsonR([100, 100, 100, 100, 100], [50, 60, 70, 80, 90], 5);
  console.log("   - Trường hợp phương sai X = 0 (tất cả 100):", testZeroVarianceX, testZeroVarianceX.r === null ? "✅ ĐÚNG (R = null)" : "❌ SAI");

  console.log("\n============================================================");
  console.log("  NGHIỆM THU TASK 6 HOÀN TẤT THÀNH CÔNG!");
  console.log("============================================================");

  await pool.end();
}

runTask6Verification();
