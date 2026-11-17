import pool from "../../config/database.js";
import {
  verifyApiKey,
  generateJsonContent,
} from "../services/geminiFactory.js";

/**
 * Helper: Tìm sinh viên mục tiêu theo ID hoặc lấy sinh viên active đầu tiên
 */
async function resolveStudent(req) {
  const identifier =
    req.query.userKey ||
    req.query.userId ||
    req.query.studentId ||
    req.params.userId;

  if (identifier) {
    const [rows] = await pool.query(
      `SELECT * FROM Dim_User 
       WHERE Primary_Role = 'Student' 
         AND (User_Key = ? OR Moodle_User_ID = ? OR Username = ?) 
       LIMIT 1`,
      [identifier, identifier, identifier]
    );
    if (rows.length > 0) return rows[0];
  }

  const [defaultRows] = await pool.query(
    `SELECT * FROM Dim_User 
     WHERE Primary_Role = 'Student' AND Is_Active = 1 
     ORDER BY User_Key ASC LIMIT 1`
  );
  return defaultRows[0] || null;
}

/**
 * 1. Ping xác thực API Key
 * POST /api/ai/verify-key
 */
export async function verifyKey(req, res) {
  try {
    const key = req.aiKey;
    await verifyApiKey(key);

    return res.json({
      success: true,
      message: "Kết nối thành công! Gemini API Key hợp lệ và sẵn sàng sử dụng.",
    });
  } catch (error) {
    return res.status(error.status || 500).json({
      success: false,
      message: error.message || "Xác thực API Key thất bại.",
      originalError: error.originalMessage,
    });
  }
}

/**
 * Cơ chế phân tích dự phòng dựa trên dữ liệu chuẩn Data Warehouse (Ground Truth)
 * Kích hoạt khi Google Gemini API gặp sự cố quá tải tạm thời (503) hoặc quá giới hạn (429)
 */
function generateHeuristicInsight(groundTruth) {
  const gpa = Number(groundTruth.diemTrungBinhHe10) || 7.5;
  const pending = Number(groundTruth.conNoChuaNop) || 0;
  const late = Number(groundTruth.nopTreHan) || 0;
  const lowest = groundTruth.cacBaiCoDiemThapNhat || [];
  const ranking = groundTruth.viTriXepHangSoVoiTongTheMonHoc;

  let status = "Tốt";
  if (gpa < 6.0 || pending > 1 || late > 2) {
    status = "Nguy cơ";
  } else if (gpa < 7.5 || pending > 0 || late > 0) {
    status = "Cần cố gắng";
  }

  let summary = "";
  if (ranking && ranking.topPercent) {
    summary = `Bạn đang ở vị trí ${ranking.overallRank} (${ranking.topPercent}). Điểm trung bình của bạn (${gpa}/10) ${
      ranking.gradeDiff >= 0
        ? `cao hơn mức trung bình lớp (+${ranking.gradeDiff} điểm).`
        : `thấp hơn trung bình môn (${ranking.gradeDiff} điểm), cần nỗ lực thêm ở các bài tập tiếp theo.`
    }`;
  } else if (status === "Tốt") {
    summary = `Bạn đang duy trì kết quả học tập rất tích cực với điểm trung bình ${gpa}/10 và tỷ lệ hoàn thành môn ${groundTruth.tyLeHoanThanhMon}.`;
  } else if (status === "Cần cố gắng") {
    summary = `Tiến độ học tập ở mức ổn định (ĐTB: ${gpa}/10). Cần chú ý hoàn thành đúng hạn các bài tập sắp tới để tối ưu điểm chuyên cần.`;
  } else {
    summary = `Cảnh báo học tập: Điểm trung bình (${gpa}/10) hoặc số bài tập còn nợ cần được cải thiện khẩn cấp trong các tuần tới.`;
  }

  let knowledgeGap = "Cần duy trì thời gian tự học đều đặn mỗi ngày theo thời khóa biểu.";
  if (lowest.length > 0) {
    knowledgeGap = `Cần ôn tập lại nội dung "${lowest[0].baiTap}" thuộc môn ${lowest[0].mon} (Điểm hiện tại: ${lowest[0].diem}).`;
  }

  const actionItems = [];
  if (pending > 0) {
    actionItems.push(`Hoàn thành ngay ${pending} bài tập đang nợ trước thời hạn cuối.`);
  } else {
    actionItems.push("Duy trì việc ôn tập và chuẩn bị trước bài học cho các tuần tiếp theo.");
  }
  actionItems.push("Dành thêm ít nhất 2 giờ tự học mỗi tuần để củng cố các môn chuyên ngành.");

  return {
    status,
    summary,
    knowledgeGap,
    actionItems,
    isDataWarehouseAnalysis: true,
  };
}

/**
 * 2. Phân tích cố vấn học tập AI Study Coach
 * GET /api/ai/student/coach
 */
export async function getStudentStudyCoach(req, res) {
  try {
    const student = await resolveStudent(req);
    if (!student) {
      return res.status(404).json({
        success: false,
        message: "Không tìm thấy dữ liệu sinh viên trong hệ thống.",
      });
    }

    const userKey = student.User_Key;
    const courseKey = req.query.courseKey || null;

    // --- BƯỚC 1: TRUY VẤN DỮ LIỆU THỰC TẾ (GROUND TRUTH) TỪ DWH ---

    // 1. Điểm số từ Fact_Course_Grade
    let gradeQuery = `
      SELECT 
        ROUND(AVG(Grade_Percentage), 1) AS avgPercentage,
        ROUND(AVG(Grade), 1) AS avgGrade,
        COUNT(*) AS totalGrades,
        SUM(CASE WHEN Is_Passed = 1 THEN 1 ELSE 0 END) AS passedCount,
        SUM(CASE WHEN Is_Passed = 0 THEN 1 ELSE 0 END) AS failedCount
      FROM Fact_Course_Grade
      WHERE User_Key = ?
    `;
    const gradeParams = [userKey];
    if (courseKey) {
      gradeQuery += ` AND Course_Key = ?`;
      gradeParams.push(courseKey);
    }
    const [[gradeStats]] = await pool.query(gradeQuery, gradeParams);

    // 2. Tình trạng nộp bài từ Fact_Assignment_Submission
    let subQuery = `
      SELECT 
        COUNT(*) AS totalSubmissions,
        SUM(CASE WHEN Is_Submitted_On_Time = 1 THEN 1 ELSE 0 END) AS onTimeCount,
        SUM(CASE WHEN Is_Submitted_On_Time = 0 AND Submission_Status IS NOT NULL THEN 1 ELSE 0 END) AS lateCount,
        SUM(CASE WHEN Submission_Status IS NULL OR Submission_Status = 'New' THEN 1 ELSE 0 END) AS pendingCount
      FROM Fact_Assignment_Submission
      WHERE User_Key = ?
    `;
    const subParams = [userKey];
    if (courseKey) {
      subQuery += ` AND Course_Key = ?`;
      subParams.push(courseKey);
    }
    const [[subStats]] = await pool.query(subQuery, subParams);

    // 3. Thời gian học từ Fact_Daily_Engagement
    let engQuery = `
      SELECT ROUND(COALESCE(SUM(Time_Spent_Seconds), 0) / 3600, 1) AS totalHours
      FROM Fact_Daily_Engagement
      WHERE User_Key = ?
    `;
    const engParams = [userKey];
    if (courseKey) {
      engQuery += ` AND Course_Key = ?`;
      engParams.push(courseKey);
    }
    const [[{ totalHours }]] = await pool.query(engQuery, engParams);

    // 4. Lấy 4 bài điểm thấp nhất hoặc gần nhất để phân tích lỗ hổng kiến thức
    let recentGradesQuery = `
      SELECT 
        dc.Course_Name AS courseName,
        da.Activity_Name AS activityName,
        da.Activity_Type AS activityType,
        fcg.Grade AS grade,
        fcg.Max_Grade AS maxGrade,
        fcg.Grade_Percentage AS percentage,
        fcg.Is_Passed AS isPassed
      FROM Fact_Course_Grade fcg
      INNER JOIN Dim_Course dc ON dc.Course_Key = fcg.Course_Key
      INNER JOIN Dim_Activity da ON da.Activity_Key = fcg.Activity_Key
      WHERE fcg.User_Key = ?
    `;
    const recentGradesParams = [userKey];
    if (courseKey) {
      recentGradesQuery += ` AND fcg.Course_Key = ?`;
      recentGradesParams.push(courseKey);
    }
    recentGradesQuery += ` ORDER BY fcg.Grade_Percentage ASC LIMIT 4`;
    const [lowestGrades] = await pool.query(
      recentGradesQuery,
      recentGradesParams
    );

    // 5. Tính toán thứ bậc xếp hạng cá nhân so với tổng thể môn học (Bảo mật 100%, không lộ danh tính sinh viên khác)
    const [coursesEnrolled] = await pool.query(
      `SELECT DISTINCT Course_Key FROM Fact_Enrolment WHERE User_Key = ? AND Status = 'Active'`,
      [userKey]
    );

    const targetCourseKeys = courseKey
      ? [Number(courseKey)]
      : coursesEnrolled.map((c) => c.Course_Key);

    const courseRankings = [];
    for (const cKey of targetCourseKeys) {
      const [classGrades] = await pool.query(
        `SELECT 
           User_Key,
           ROUND(AVG(Grade), 2) AS avgGrade
         FROM Fact_Course_Grade
         WHERE Course_Key = ?
         GROUP BY User_Key
         ORDER BY avgGrade DESC`,
        [cKey]
      );

      const totalInClass = classGrades.length || 1;
      const myIndex = classGrades.findIndex((r) => r.User_Key === userKey);
      const myRank = myIndex !== -1 ? myIndex + 1 : totalInClass;
      const myAvg = myIndex !== -1 ? Number(classGrades[myIndex].avgGrade) : 0;
      const classAvg = Number(
        (
          classGrades.reduce((sum, r) => sum + Number(r.avgGrade || 0), 0) /
          totalInClass
        ).toFixed(1)
      );

      const [courseInfo] = await pool.query(
        `SELECT Course_Name, Course_Code FROM Dim_Course WHERE Course_Key = ? LIMIT 1`,
        [cKey]
      );

      courseRankings.push({
        courseKey: cKey,
        courseName: courseInfo[0]?.Course_Name || `Môn học ${cKey}`,
        courseCode: courseInfo[0]?.Course_Code || "",
        myRank,
        totalInClass,
        topPercent: Math.max(1, Math.round((myRank / totalInClass) * 100)),
        myGrade: myAvg,
        classAvg,
        gradeDiff: Number((myAvg - classAvg).toFixed(1)),
      });
    }

    const overallTotal = courseRankings.length > 0 ? courseRankings[0].totalInClass : 1;
    const avgRank = Math.round(
      courseRankings.reduce((sum, r) => sum + r.myRank, 0) / (courseRankings.length || 1)
    );
    const avgTopPercent = Math.round(
      courseRankings.reduce((sum, r) => sum + r.topPercent, 0) / (courseRankings.length || 1)
    );
    const overallClassAvg = Number(
      (
        courseRankings.reduce((sum, r) => sum + r.classAvg, 0) /
        (courseRankings.length || 1)
      ).toFixed(1)
    );

    const rankingOverview = {
      overallRank: `#${avgRank} / ${overallTotal}`,
      topPercent: `Top ${avgTopPercent}%`,
      myGpa: gradeStats?.avgGrade || 0,
      classAvgGpa: overallClassAvg,
      gradeDiff: Number(((gradeStats?.avgGrade || 0) - overallClassAvg).toFixed(1)),
      byCourse: courseRankings,
    };

    // Đóng gói Ground Truth object
    const groundTruth = {
      sinhVien: student.Full_Name,
      monHoc: courseKey ? `Môn mã số ${courseKey}` : "Toàn bộ môn đang học kỳ này",
      diemTrungBinhHe10: gradeStats?.avgGrade || 0,
      tyLeHoanThanhMon: `${gradeStats?.avgPercentage || 0}%`,
      soMonQua: gradeStats?.passedCount || 0,
      soMonChuaDat: gradeStats?.failedCount || 0,
      tongSoBaiNop: subStats?.totalSubmissions || 0,
      nopDungHan: subStats?.onTimeCount || 0,
      nopTreHan: subStats?.lateCount || 0,
      conNoChuaNop: subStats?.pendingCount || 0,
      tongGioTuHoc: `${totalHours || 0} giờ`,
      viTriXepHangSoVoiTongTheMonHoc: rankingOverview,
      cacBaiCoDiemThapNhat: lowestGrades.map((g) => ({
        mon: g.courseName,
        baiTap: g.activityName,
        diem: `${g.grade}/${g.maxGrade} (${g.percentage}%)`,
      })),
    };

    // --- BƯỚC 2: TẠO PROMPT VÀ GỌI GEMINI ---
    const systemInstruction = `
Bạn là "AI Study Coach" - Cố vấn học tập thông minh của Trường Đại học Đà Lạt (DLU LMS).
Nhiệm vụ của bạn là dựa trên DỮ LIỆU HỌC TẬP THỰC TẾ từ Data Warehouse để đưa ra lời khuyên mang tính xây dựng, tích cực và thực tế cho sinh viên.
Quy tắc:
1. Tuyệt đối KHÔNG tự bịa số liệu. Mọi đánh giá phải dựa trên JSON số liệu được cung cấp.
2. Trả về đúng định dạng JSON được yêu cầu, không kèm bất kỳ văn bản ngoài nào.
3. Văn phong sư phạm, thân thiện, súc tích, mang tính định hướng hành động.
    `.trim();

    const userPrompt = `
Dưới đây là dữ liệu học tập chính xác được trích xuất từ MySQL Data Warehouse của sinh viên:
${JSON.stringify(groundTruth, null, 2)}

Hãy phân tích và trả về DUY NHẤT một chuỗi JSON hợp lệ theo đúng cấu trúc sau:
{
  "status": "Tốt" | "Cần cố gắng" | "Nguy cơ",
  "summary": "Nhận xét tổng quan tiến độ học tập (tối đa 2 câu ngắn gọn).",
  "knowledgeGap": "Chỉ ra 1 lỗ hổng kiến thức hoặc bài học cần chú ý cải thiện dựa trên các bài điểm thấp.",
  "actionItems": [
    "Hành động cụ thể thứ nhất cần làm trong tuần này",
    "Hành động cụ thể thứ hai cần làm trong tuần này"
  ]
}
    `.trim();

    let aiResult;
    try {
      aiResult = await generateJsonContent(
        req.aiKey,
        userPrompt,
        systemInstruction
      );
    } catch (geminiError) {
      console.warn(
        "Gemini API phản hồi chậm hoặc bận, chuyển sang phân tích Ground Truth từ Data Warehouse:",
        geminiError.message
      );
      aiResult = generateHeuristicInsight(groundTruth);
    }

    return res.json({
      success: true,
      data: {
        ...aiResult,
        ranking: rankingOverview,
        updatedAt: new Date().toISOString(),
        studentName: student.Full_Name,
      },
      groundTruth,
    });
  } catch (error) {
    console.error("Lỗi getStudentStudyCoach:", error);
    return res.status(error.status || 500).json({
      success: false,
      message:
        error.message ||
        "Không thể hoàn tất phân tích cố vấn AI lúc này. Vui lòng thử lại sau.",
    });
  }
}

