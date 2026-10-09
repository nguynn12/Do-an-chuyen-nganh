/**
 * ============================================================
 * SCRIPT ĐÁNH GIÁ ĐỘ CHÍNH XÁC CẢNH BÁO SỚM THEO TUẦN (TASK 7)
 * Ghi kết quả vào bảng Early_Warning_Eval trong lms_datawarehouse
 * Phục vụ Power BI Model Evaluation và Dashboard Analytics
 * ============================================================
 */

import pool from "../src/config/database.js";
import {
  calculateCourseBehaviorMetrics,
} from "../src/shared/analytics/behaviorMetrics.js";
import {
  EARLY_WARNING_THRESHOLD,
  EARLY_WARNING_FAIL_GRADE_PCT,
  EARLY_WARNING_WEEKS,
} from "../src/shared/analytics/analyticsConfig.js";

/**
 * Đảm bảo bảng Early_Warning_Eval tồn tại trong CSDL
 * @param {object} db Kết nối DB
 */
export async function ensureEarlyWarningEvalTable(db = pool) {
  await db.query(`
    CREATE TABLE IF NOT EXISTS Early_Warning_Eval (
      Course_Key INT NOT NULL,
      User_Key INT NOT NULL,
      Week_N INT NOT NULL,
      Risk_Score INT NOT NULL,
      Predicted_At_Risk TINYINT(1) NOT NULL,
      Actual_Failed TINYINT(1) NOT NULL,
      Computed_At DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      PRIMARY KEY (Course_Key, User_Key, Week_N),
      INDEX idx_eval_course_week (Course_Key, Week_N),
      INDEX idx_eval_user (User_Key),
      CONSTRAINT fk_eval_course FOREIGN KEY (Course_Key) REFERENCES Dim_Course(Course_Key) ON DELETE CASCADE,
      CONSTRAINT fk_eval_user FOREIGN KEY (User_Key) REFERENCES Dim_User(User_Key) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
  `);
}

/**
 * Tính toán và nạp dữ liệu đánh giá cảnh báo sớm cho toàn bộ môn học
 * @param {object} db Kết nối DB
 * @param {object} options Tùy chọn cấu hình (ngưỡng rủi ro, ngưỡng rớt, danh sách tuần)
 * @returns {Promise<object>} Báo cáo tổng hợp
 */
export async function computeEarlyWarningEval(db = pool, options = {}) {
  const riskThreshold = options.riskThreshold ?? EARLY_WARNING_THRESHOLD;
  const failGradePct = options.failGradePct ?? EARLY_WARNING_FAIL_GRADE_PCT;
  const weeks = options.weeks ?? EARLY_WARNING_WEEKS;

  await ensureEarlyWarningEvalTable(db);

  // 1. Lấy danh sách tất cả các môn học
  const [courses] = await db.query(`
    SELECT Course_Key, Moodle_Course_ID, Course_Code, Course_Name, Start_Date, End_Date 
    FROM Dim_Course 
    ORDER BY Course_Key ASC
  `);

  const allRecords = [];
  const weeklyStats = {};

  weeks.forEach((w) => {
    weeklyStats[w] = {
      week: w,
      totalStudents: 0,
      tp: 0, // True Positive: Dự báo có nguy cơ & Thực tế không đạt
      fp: 0, // False Positive: Dự báo có nguy cơ nhưng Thực tế đạt
      fn: 0, // False Negative: Dự báo an toàn nhưng Thực tế không đạt
      tn: 0, // True Negative: Dự báo an toàn & Thực tế đạt
    };
  });

  for (const course of courses) {
    const courseKey = course.Course_Key;

    // Lấy kết quả cuối cùng (toàn bộ học kỳ, không cut-off) để xác định Actual_Failed
    const finalMetrics = await calculateCourseBehaviorMetrics(db, courseKey);

    // Bản đồ kết quả thực tế của từng sinh viên
    const actualOutcomeByUser = new Map();
    finalMetrics.students.forEach((s) => {
      // Actual_Failed = 1 nếu điểm TB môn < failGradePct (ngưỡng 70%)
      const isFailed = s.avgGradePct !== null && s.avgGradePct < failGradePct ? 1 : 0;
      actualOutcomeByUser.set(s.userKey, {
        actualFailed: isFailed,
        avgGradePct: s.avgGradePct,
        fullName: s.fullName,
      });
    });

    const startDate = new Date(course.Start_Date);

    // 2. Lặp qua từng mốc tuần Week_N
    for (const weekNum of weeks) {
      // Ngày cut-off = Start_Date + (weekNum * 7 - 1) ngày
      const cutOffDateObj = new Date(
        startDate.getTime() + (weekNum * 7 - 1) * 24 * 60 * 60 * 1000
      );
      const cutOffStr = cutOffDateObj.toISOString().split("T")[0];

      // Tính toán chỉ số hành vi và riskScore chỉ dùng dữ liệu ĐẾN HẾT TUẦN N
      const weekMetrics = await calculateCourseBehaviorMetrics(db, courseKey, {
        cutOffDate: cutOffStr,
      });

      for (const student of weekMetrics.students) {
        const userKey = student.userKey;
        const riskScore = student.riskScore || 0;
        const predictedAtRisk = riskScore >= riskThreshold ? 1 : 0;

        const outcome = actualOutcomeByUser.get(userKey) || {
          actualFailed: 0,
          avgGradePct: null,
          fullName: student.fullName,
        };
        const actualFailed = outcome.actualFailed;

        // Upsert vào bảng Early_Warning_Eval
        await db.query(
          `INSERT INTO Early_Warning_Eval (Course_Key, User_Key, Week_N, Risk_Score, Predicted_At_Risk, Actual_Failed, Computed_At)
           VALUES (?, ?, ?, ?, ?, ?, NOW())
           ON DUPLICATE KEY UPDATE
             Risk_Score = VALUES(Risk_Score),
             Predicted_At_Risk = VALUES(Predicted_At_Risk),
             Actual_Failed = VALUES(Actual_Failed),
             Computed_At = NOW()`,
          [courseKey, userKey, weekNum, riskScore, predictedAtRisk, actualFailed]
        );

        // Thống kê ma trận nhầm lẫn
        const wStat = weeklyStats[weekNum];
        wStat.totalStudents++;

        if (predictedAtRisk === 1 && actualFailed === 1) {
          wStat.tp++;
        } else if (predictedAtRisk === 1 && actualFailed === 0) {
          wStat.fp++;
        } else if (predictedAtRisk === 0 && actualFailed === 1) {
          wStat.fn++;
        } else {
          wStat.tn++;
        }

        allRecords.push({
          courseKey,
          courseCode: course.Course_Code,
          courseName: course.Course_Name,
          userKey,
          fullName: student.fullName,
          weekNum,
          cutOffStr,
          riskScore,
          predictedAtRisk,
          actualFailed,
          avgGradePct: outcome.avgGradePct,
        });
      }
    }
  }

  // 3. Tính toán các chỉ số chất lượng mô hình theo từng tuần
  const weeklySummary = Object.values(weeklyStats).map((w) => {
    const accuracy =
      w.totalStudents > 0
        ? Number((((w.tp + w.tn) / w.totalStudents) * 100).toFixed(1))
        : 0;
    const precision =
      w.tp + w.fp > 0
        ? Number(((w.tp / (w.tp + w.fp)) * 100).toFixed(1))
        : null;
    const recall =
      w.tp + w.fn > 0
        ? Number(((w.tp / (w.tp + w.fn)) * 100).toFixed(1))
        : null;
    const f1 =
      precision !== null && recall !== null && precision + recall > 0
        ? Number(
            (
              (2 * (precision / 100) * (recall / 100)) /
              (precision / 100 + recall / 100) *
              100
            ).toFixed(1)
          )
        : null;

    return {
      week: `Tuần ${w.week}`,
      total: w.totalStudents,
      tp: w.tp,
      fp: w.fp,
      fn: w.fn,
      tn: w.tn,
      accuracyPct: `${accuracy}%`,
      precisionPct: precision !== null ? `${precision}%` : "N/A",
      recallPct: recall !== null ? `${recall}%` : "N/A",
      f1Score: f1 !== null ? `${f1}%` : "N/A",
    };
  });

  return {
    records: allRecords,
    weeklySummary,
    config: {
      riskThreshold,
      failGradePct,
      weeks,
    },
  };
}

// Chạy trực tiếp từ dòng lệnh
if (process.argv[1]?.includes("computeEarlyWarningEval.js")) {
  (async () => {
    try {
      console.log("============================================================");
      console.log("  ĐANG TÍNH TOÁN ĐÁNH GIÁ CẢNH BÁO SỚM (TASK 7)...");
      console.log("============================================================\n");

      const result = await computeEarlyWarningEval(pool);

      console.log("📌 CẤU HÌNH ĐÁNH GIÁ:");
      console.log(`   - Ngưỡng dự báo có nguy cơ (Predicted_At_Risk = 1): Risk_Score >= ${result.config.riskThreshold}`);
      console.log(`   - Ngưỡng kết quả thực tế không đạt (Actual_Failed = 1): Điểm TB < ${result.config.failGradePct}% (< 7.0/10)`);
      console.log(`   - Các mốc tuần đánh giá: Tuần [${result.config.weeks.join(", ")}]\n`);

      console.log("📊 MA TRẬN NHẦM LẪN VÀ ĐỘ CHÍNH XÁC MÔ HÌNH THEO TUẦN:");
      console.table(
        result.weeklySummary.map((s) => ({
          "Mốc thời gian": s.week,
          "Tổng mẫu": s.total,
          "TP (Đúng nguy cơ)": s.tp,
          "FP (Báo nhầm)": s.fp,
          "FN (Bỏ sót)": s.fn,
          "TN (Đúng an toàn)": s.tn,
          "Độ chính xác (Accuracy)": s.accuracyPct,
          "Độ chuẩn xác (Precision)": s.precisionPct,
          "Độ nhạy (Recall)": s.recallPct,
          "F1-Score": s.f1Score,
        }))
      );

      console.log("\n✅ Đã ghi thành công toàn bộ kết quả đánh giá vào bảng Early_Warning_Eval!");
    } catch (error) {
      console.error("❌ Lỗi khi tính toán đánh giá cảnh báo sớm:", error);
    } finally {
      await pool.end();
    }
  })();
}
