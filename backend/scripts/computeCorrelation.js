/**
 * ============================================================
 * SCRIPT TÍNH TOÁN HỆ SỐ TƯƠNG QUAN PEARSON (TASK 6)
 * Ghi kết quả vào bảng Correlation_Result trong lms_datawarehouse
 * Phục vụ Power BI Analytics và LMS Backend API
 * ============================================================
 */

import pool from "../src/config/database.js";
import { calculateCourseBehaviorMetrics } from "../src/shared/analytics/behaviorMetrics.js";

/**
 * Tính hệ số tương quan tuyến tính Pearson R giữa 2 vector xArr và yArr.
 * Công thức: R = sum((x - meanX)*(y - meanY)) / sqrt(sum((x - meanX)^2) * sum((y - meanY)^2))
 *
 * Điều kiện biên:
 * - Nếu N < 5: trả về r = null
 * - Nếu phương sai của X hoặc Y = 0 (tất cả giá trị như nhau): trả về r = null
 *
 * @param {number[]} xArr Mảng giá trị của biến độc lập X
 * @param {number[]} yArr Mảng giá trị của biến phụ thuộc Y (Điểm số)
 * @param {number} minSampleSize Ngưỡng mẫu tối thiểu (mặc định 5)
 * @returns {{ r: number|null, n: number }}
 */
export function calculatePearsonR(xArr, yArr, minSampleSize = 5) {
  if (!Array.isArray(xArr) || !Array.isArray(yArr) || xArr.length !== yArr.length) {
    return { r: null, n: 0 };
  }

  const n = xArr.length;
  if (n < minSampleSize) {
    return { r: null, n };
  }

  const meanX = xArr.reduce((sum, val) => sum + val, 0) / n;
  const meanY = yArr.reduce((sum, val) => sum + val, 0) / n;

  let numerator = 0;
  let denomX = 0;
  let denomY = 0;

  for (let i = 0; i < n; i++) {
    const diffX = xArr[i] - meanX;
    const diffY = yArr[i] - meanY;
    numerator += diffX * diffY;
    denomX += diffX * diffX;
    denomY += diffY * diffY;
  }

  // Nếu không có độ biến thiên (phương sai = 0) thì hệ số tương quan không xác định
  if (denomX === 0 || denomY === 0) {
    return { r: null, n };
  }

  const r = numerator / Math.sqrt(denomX * denomY);
  return {
    r: Number(r.toFixed(4)),
    n,
  };
}

/**
 * Tạo bảng Correlation_Result nếu chưa tồn tại
 * @param {object} db Kết nối DB
 */
export async function ensureCorrelationTable(db = pool) {
  await db.query(`
    CREATE TABLE IF NOT EXISTS Correlation_Result (
      Course_Key INT NOT NULL,
      Factor VARCHAR(50) NOT NULL,
      R DECIMAL(6,4) NULL,
      N INT NOT NULL,
      Computed_At DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      PRIMARY KEY (Course_Key, Factor),
      INDEX idx_corr_course (Course_Key),
      CONSTRAINT fk_corr_course FOREIGN KEY (Course_Key) REFERENCES Dim_Course(Course_Key) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
  `);
}

/**
 * Tính toán tương quan cho tất cả các môn học và upsert vào Correlation_Result
 * @param {object} db Kết nối DB
 * @returns {Promise<Array>} Danh sách kết quả tính toán
 */
export async function computeAllCorrelations(db = pool) {
  await ensureCorrelationTable(db);

  // Lấy danh sách tất cả các môn học
  const [courses] = await db.query(`
    SELECT Course_Key, Moodle_Course_ID, Course_Code, Course_Name 
    FROM Dim_Course 
    ORDER BY Course_Key ASC
  `);

  const results = [];

  for (const course of courses) {
    const courseKey = course.Course_Key;
    const metrics = await calculateCourseBehaviorMetrics(db, courseKey);

    // Chuẩn bị các vector (X, Y)
    // Biến phụ thuộc Y: Điểm trung bình môn (avgGradePct)
    const validStudents = metrics.students.filter(
      (s) => s.avgGradePct !== null && s.avgGradePct !== undefined && !Number.isNaN(s.avgGradePct)
    );

    // 1. Yếu tố: Nộp bài đúng hạn (onTimeRate)
    const xOnTime = [];
    const yOnTime = [];

    // 2. Yếu tố: Thời gian học (engagementHours)
    const xEngagement = [];
    const yEngagement = [];

    // 3. Yếu tố: Điểm bài tập (avgSubmissionGrade)
    const xSubGrade = [];
    const ySubGrade = [];

    // 4. Yếu tố: Nộp bài sớm (avgLeadDays)
    const xLeadDays = [];
    const yLeadDays = [];

    validStudents.forEach((s) => {
      const y = Number(s.avgGradePct);

      // Yếu tố 1: OnTimeRate
      if (s.onTimeRate !== null && s.onTimeRate !== undefined && !Number.isNaN(s.onTimeRate)) {
        xOnTime.push(Number(s.onTimeRate));
        yOnTime.push(y);
      }

      // Yếu tố 2: EngagementHours
      if (s.engagementHours !== null && s.engagementHours !== undefined && !Number.isNaN(s.engagementHours)) {
        xEngagement.push(Number(s.engagementHours));
        yEngagement.push(y);
      }

      // Yếu tố 3: Điểm bài tập TB (tính từ các submissions đã chấm điểm)
      const gradedSubs = s.submissions?.filter(
        (sub) => sub.grade !== null && sub.grade !== undefined && !Number.isNaN(Number(sub.grade))
      );
      if (gradedSubs && gradedSubs.length > 0) {
        const sumGrade = gradedSubs.reduce((acc, sub) => acc + Number(sub.grade), 0);
        const avgSub = Number((sumGrade / gradedSubs.length).toFixed(2));
        xSubGrade.push(avgSub);
        ySubGrade.push(y);
      }

      // Yếu tố 4: Số ngày nộp sớm trung bình
      if (s.avgLeadDays !== null && s.avgLeadDays !== undefined && !Number.isNaN(s.avgLeadDays)) {
        xLeadDays.push(Number(s.avgLeadDays));
        yLeadDays.push(y);
      }
    });

    const factorDefs = [
      { name: "Nộp bài đúng hạn", x: xOnTime, y: yOnTime },
      { name: "Thời gian học", x: xEngagement, y: yEngagement },
      { name: "Điểm bài tập", x: xSubGrade, y: ySubGrade },
      { name: "Nộp bài sớm", x: xLeadDays, y: yLeadDays },
    ];

    for (const factor of factorDefs) {
      const { r, n } = calculatePearsonR(factor.x, factor.y, 5);

      // Upsert vào database
      await db.query(
        `INSERT INTO Correlation_Result (Course_Key, Factor, R, N, Computed_At)
         VALUES (?, ?, ?, ?, NOW())
         ON DUPLICATE KEY UPDATE
           R = VALUES(R),
           N = VALUES(N),
           Computed_At = NOW()`,
        [courseKey, factor.name, r, n]
      );

      results.push({
        courseKey,
        courseCode: course.Course_Code,
        courseName: course.Course_Name,
        factor: factor.name,
        r,
        n,
        xVector: factor.x,
        yVector: factor.y,
      });
    }
  }

  return results;
}

// Thực thi nếu chạy trực tiếp từ dòng lệnh
if (process.argv[1]?.includes("computeCorrelation.js")) {
  (async () => {
    try {
      console.log("============================================================");
      console.log("  ĐANG TÍNH TOÁN HỆ SỐ TƯƠNG QUAN PEARSON (TASK 6)...");
      console.log("============================================================\n");

      const results = await computeAllCorrelations(pool);

      console.table(
        results.map((r) => ({
          "Course Key": r.courseKey,
          "Môn học": `[${r.courseCode}] ${r.courseName}`,
          "Yếu tố": r.factor,
          "Mẫu (N)": r.n,
          "Pearson R": r.r !== null ? r.r : "NULL (<5 hoặc Var=0)",
          "Mức độ":
            r.r === null
              ? "Không xác định"
              : Math.abs(r.r) >= 0.7
              ? "Tương quan mạnh"
              : Math.abs(r.r) >= 0.4
              ? "Tương quan vừa"
              : "Tương quan yếu",
        }))
      );

      console.log("\n✅ Đã ghi thành công kết quả tương quan vào bảng Correlation_Result!");
    } catch (error) {
      console.error("❌ Lỗi khi tính toán tương quan:", error);
    } finally {
      await pool.end();
    }
  })();
}
