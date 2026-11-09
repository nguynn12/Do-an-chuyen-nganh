import pool from "../../config/database.js";
import { parseLocalIntent } from "../services/aiIntentParser.js";
import {
  classifyIntentWithGemini,
  isGeminiConfigured,
} from "../services/geminiIntentService.js";

/**
 * Controller xử lý yêu cầu AI Assistant LMS
 * Endpoint: POST /api/ai/assistant/query
 * Middleware bảo vệ: requireCourseTeacher (đã kiểm tra Token 401 & Quyền môn học 403)
 */
export async function handleAiAssistantQuery(req, res) {
  try {
    const promptText = req.body?.promptText ?? req.body?.prompt ?? req.body?.query;
    let course = req.course;
    if (!course && (req.body?.courseId || req.query?.courseId)) {
      const cId = Number(req.body?.courseId || req.query?.courseId);
      const [cRows] = await pool.query(
        "SELECT Course_Key, Course_Code, Course_Name FROM Dim_Course WHERE Course_Key = ? OR Moodle_Course_ID = ? LIMIT 1",
        [cId, cId]
      );
      if (cRows.length > 0) {
        course = cRows[0];
      }
    }
    const teacher = req.teacher;

    // 1. Phân tích ý định câu hỏi tiếng Việt (Ưu tiên Gemini API thật, fallback sang rule-based khi chưa cấu hình key/lỗi)
    let parsedIntent = null;
    let mode = "fallback_rule_based";
    let geminiStatus = isGeminiConfigured() ? "CONFIGURED" : "BLOCKED_NO_KEY";
    let modelUsed = "none";
    let explanation = "";

    const cleanPrompt = String(promptText || "").trim();

    if (cleanPrompt.length > 300) {
      return res.json({
        success: false,
        supported: false,
        intent: "too_long",
        message: "Câu hỏi vượt quá giới hạn độ dài cho phép (tối đa 300 ký tự).",
        mode,
        geminiStatus,
        modelUsed,
        confidence: 0,
        availableIntents: [
          {
            intent: "grade_distribution",
            label: "Phân bố điểm môn học",
            description: "Phân tích phổ điểm, các mức xếp loại (Xuất sắc, Giỏi, Khá, Trung bình, Yếu) và tỷ lệ đạt của môn học.",
          },
        ],
        course: {
          courseKey: course.Course_Key,
          courseCode: course.Course_Code,
          courseName: course.Course_Name,
        },
      });
    }

    if (isGeminiConfigured()) {
      const geminiRes = await classifyIntentWithGemini(cleanPrompt);
      if (geminiRes.success) {
        parsedIntent = geminiRes;
        mode = "gemini_api";
        geminiStatus = "OK";
        modelUsed = geminiRes.modelUsed || "gemini-3.1-flash-lite";
        explanation = geminiRes.explanation || "";
      } else if (geminiRes.fallbackRequired) {
        // Fallback an toàn sang parser quy tắc cục bộ khi Gemini gặp lỗi/hạn ngạch
        geminiStatus = geminiRes.reason || "FALLBACK_ON_ERROR";
        parsedIntent = parseLocalIntent(cleanPrompt);
        mode = "fallback_rule_based";
        modelUsed = "none";
        explanation = geminiRes.message || "Đã tự động chuyển sang bộ phân loại dự phòng.";
      } else {
        parsedIntent = geminiRes;
        mode = "gemini_api";
        geminiStatus = "FAILED";
      }
    } else {
      // Khi chưa cấu hình GEMINI_API_KEY
      parsedIntent = parseLocalIntent(cleanPrompt);
      mode = "fallback_rule_based";
      geminiStatus = "BLOCKED_NO_KEY";
      modelUsed = "none";
      explanation = "GEMINI_API_KEY chưa được cấu hình. Đang chạy ở chế độ phân loại dự phòng.";
    }

    if (!parsedIntent.matched) {
      return res.json({
        success: false,
        supported: false,
        intent: parsedIntent.intent || "unsupported",
        message: parsedIntent.message || "Hiện tại hệ thống chỉ hỗ trợ phân tích phổ điểm môn học (grade_distribution).",
        mode,
        geminiStatus,
        modelUsed,
        explanation,
        confidence: parsedIntent.confidence || 0,
        availableIntents: [
          {
            intent: "grade_distribution",
            label: "Phân bố điểm môn học",
            description: "Phân tích phổ điểm, các mức xếp loại (Xuất sắc, Giỏi, Khá, Trung bình, Yếu) và tỷ lệ đạt của môn học.",
          },
        ],
        course: {
          courseKey: course.Course_Key,
          courseCode: course.Course_Code,
          courseName: course.Course_Name,
        },
      });
    }

    // 2. Xử lý Intent: grade_distribution (Phân bố kết quả học tập môn học)
    if (parsedIntent.intent === "grade_distribution") {
      // BẢO MẬT P1: Truy vấn có tham số hóa, chọn User_Key để phân biệt lượt điểm và số sinh viên
      const [rows] = await pool.query(
        `
        SELECT
          fcg.User_Key,
          fcg.Grade,
          fcg.Max_Grade,
          fcg.Grade_Percentage,
          fcg.Is_Passed
        FROM Fact_Course_Grade fcg
        WHERE fcg.Course_Key = ?
          AND fcg.Grade IS NOT NULL
        `,
        [course.Course_Key]
      );

      const bucketLabels = [
        "Yếu (< 5.0)",
        "Trung bình (5.0 - 6.4)",
        "Khá (6.5 - 7.9)",
        "Giỏi (8.0 - 8.9)",
        "Xuất sắc (9.0 - 10.0)",
      ];

      const bucketColors = [
        "#ef4444", // Đỏ - Yếu
        "#f59e0b", // Cam - Trung bình
        "#3b82f6", // Xanh dương - Khá
        "#10b981", // Xanh lục - Giỏi
        "#8b5cf6", // Tím - Xuất sắc
      ];

      // Nếu môn học chưa có bản ghi điểm nào
      if (rows.length === 0) {
        return res.json({
          success: true,
          supported: true,
          intent: "grade_distribution",
          courseId: course.Course_Key,
          moodleCourseId: course.Moodle_Course_ID,
          courseCode: course.Course_Code,
          courseName: course.Course_Name,
          title: `Phân bố kết quả học tập — ${course.Course_Code}`,
          chartType: "bar",
          scaleInfo: "Thang điểm chuẩn hóa 0–10 (Grade / Max_Grade * 10). Không tự gán NULL thành 0.",
          labels: bucketLabels,
          values: [0, 0, 0, 0, 0],
          percentages: [0, 0, 0, 0, 0],
          colors: bucketColors,
          unit: "sinh viên",
          sampleSize: 0,
          sampleSizeStudents: 0,
          sampleSizeRecords: 0,
          summary: {
            studentAverageScore: 0,
            studentPassRate: 0,
            passedStudents: 0,
            totalStudents: 0,
            recordAverageScore: 0,
            recordPassRate: 0,
            passedRecords: 0,
            totalRecords: 0,
            highestScore: 0,
            lowestScore: 0,
          },
          metrics: {
            studentLevel: {
              unit: "sinh viên",
              sampleSize: 0,
              values: [0, 0, 0, 0, 0],
              percentages: [0, 0, 0, 0, 0],
              averageScore: 0,
              passRate: 0,
              passedCount: 0,
              description: "Điểm trung bình theo từng sinh viên (COUNT DISTINCT User_Key)",
            },
            recordLevel: {
              unit: "lượt điểm",
              sampleSize: 0,
              values: [0, 0, 0, 0, 0],
              percentages: [0, 0, 0, 0, 0],
              averageScore: 0,
              passRate: 0,
              passedCount: 0,
              description: "Thống kê theo từng lượt đánh giá/bài làm (COUNT Fact_Course_Grade)",
            },
          },
          source: "Fact_Course_Grade (LMS Data Warehouse)",
          mode,
          geminiStatus,
          modelUsed,
          explanation,
          confidence: parsedIntent.confidence || 0,
          teacher: {
            username: teacher.username,
          },
          message: "Môn học hiện tại chưa có dữ liệu điểm trong kho dữ liệu.",
          generatedAt: new Date().toISOString(),
        });
      }

      // 3. Chuẩn hóa thang đo 0–10: Grade / Max_Grade * 10 (loại trừ các bản ghi thiếu Max_Grade hoặc Grade là NULL)
      const validRecords = [];
      rows.forEach((r) => {
        if (r.Grade !== null && r.Max_Grade !== null && Number(r.Max_Grade) > 0) {
          const rawGrade = Number(r.Grade);
          const rawMax = Number(r.Max_Grade);
          const scaledScore = Math.round(((rawGrade / rawMax) * 10) * 100) / 100;
          validRecords.push({
            userKey: r.User_Key,
            rawGrade,
            rawMax,
            scaledScore,
            isPassed: scaledScore >= 5.0,
          });
        }
      });

      // --- Thống kê Cấp độ 1: Theo từng Lượt đánh giá (Fact_Course_Grade records) ---
      const totalRecords = validRecords.length;
      const recordScores = validRecords.map((r) => r.scaledScore);
      const passedRecords = validRecords.filter((r) => r.isPassed).length;
      const recordPassRate =
        totalRecords > 0 ? Math.round((passedRecords / totalRecords) * 1000) / 10 : 0;
      const recordAvg =
        totalRecords > 0
          ? Math.round((recordScores.reduce((a, b) => a + b, 0) / totalRecords) * 100) / 100
          : 0;

      const recordBuckets = {
        yeu: recordScores.filter((s) => s < 5.0).length,
        trungBinh: recordScores.filter((s) => s >= 5.0 && s < 6.5).length,
        kha: recordScores.filter((s) => s >= 6.5 && s < 8.0).length,
        gioi: recordScores.filter((s) => s >= 8.0 && s < 9.0).length,
        xuatSac: recordScores.filter((s) => s >= 9.0).length,
      };
      const recordValues = [
        recordBuckets.yeu,
        recordBuckets.trungBinh,
        recordBuckets.kha,
        recordBuckets.gioi,
        recordBuckets.xuatSac,
      ];
      const recordPercentages = recordValues.map((v) =>
        totalRecords > 0 ? Math.round((v / totalRecords) * 1000) / 10 : 0
      );

      // --- Thống kê Cấp độ 2: Theo từng Sinh viên (Group by User_Key - COUNT DISTINCT) ---
      const studentGroup = new Map();
      validRecords.forEach((r) => {
        if (!studentGroup.has(r.userKey)) {
          studentGroup.set(r.userKey, []);
        }
        studentGroup.get(r.userKey).push(r.scaledScore);
      });

      const studentAverages = [];
      studentGroup.forEach((scores, userKey) => {
        const avg = scores.reduce((a, b) => a + b, 0) / scores.length;
        const roundedAvg = Math.round(avg * 100) / 100;
        studentAverages.push({
          userKey,
          averageScore: roundedAvg,
          isPassed: roundedAvg >= 5.0,
          assessmentCount: scores.length,
        });
      });

      const totalStudents = studentAverages.length;
      const studentScores = studentAverages.map((s) => s.averageScore);
      const passedStudents = studentAverages.filter((s) => s.isPassed).length;
      const studentPassRate =
        totalStudents > 0 ? Math.round((passedStudents / totalStudents) * 1000) / 10 : 0;
      const studentAvg =
        totalStudents > 0
          ? Math.round((studentScores.reduce((a, b) => a + b, 0) / totalStudents) * 100) / 100
          : 0;

      const studentBuckets = {
        yeu: studentScores.filter((s) => s < 5.0).length,
        trungBinh: studentScores.filter((s) => s >= 5.0 && s < 6.5).length,
        kha: studentScores.filter((s) => s >= 6.5 && s < 8.0).length,
        gioi: studentScores.filter((s) => s >= 8.0 && s < 9.0).length,
        xuatSac: studentScores.filter((s) => s >= 9.0).length,
      };
      const studentValues = [
        studentBuckets.yeu,
        studentBuckets.trungBinh,
        studentBuckets.kha,
        studentBuckets.gioi,
        studentBuckets.xuatSac,
      ];
      const studentPercentages = studentValues.map((v) =>
        totalStudents > 0 ? Math.round((v / totalStudents) * 1000) / 10 : 0
      );

      const minScore = recordScores.length > 0 ? Math.min(...recordScores) : 0;
      const maxScore = recordScores.length > 0 ? Math.max(...recordScores) : 0;

      // 4. Trả về JSON Schema đầy đủ, chuẩn hóa ngữ nghĩa thống kê
      return res.json({
        success: true,
        supported: true,
        intent: "grade_distribution",
        courseId: course.Course_Key,
        moodleCourseId: course.Moodle_Course_ID,
        courseCode: course.Course_Code,
        courseName: course.Course_Name,
        title: `Phân bố kết quả học tập — ${course.Course_Code} (${course.Course_Name})`,
        chartType: "bar",
        scaleInfo: "Thang điểm 0–10 chuẩn hóa (Grade / Max_Grade * 10). Loại trừ bản ghi NULL, không gán NULL thành 0.",
        // Mặc định biểu đồ chính thể hiện theo số sinh viên
        unit: "sinh viên",
        sampleSize: totalStudents,
        sampleSizeStudents: totalStudents,
        sampleSizeRecords: totalRecords,
        labels: bucketLabels,
        values: studentValues,
        percentages: studentPercentages,
        colors: bucketColors,
        summary: {
          studentAverageScore: studentAvg,
          studentPassRate,
          passedStudents,
          totalStudents,
          recordAverageScore: recordAvg,
          recordPassRate,
          passedRecords,
          totalRecords,
          highestScore: maxScore,
          lowestScore: minScore,
        },
        metrics: {
          studentLevel: {
            unit: "sinh viên",
            sampleSize: totalStudents,
            values: studentValues,
            percentages: studentPercentages,
            averageScore: studentAvg,
            passRate: studentPassRate,
            passedCount: passedStudents,
            description: "Thống kê theo điểm trung bình của từng sinh viên (COUNT DISTINCT User_Key)",
          },
          recordLevel: {
            unit: "lượt điểm",
            sampleSize: totalRecords,
            values: recordValues,
            percentages: recordPercentages,
            averageScore: recordAvg,
            passRate: recordPassRate,
            passedCount: passedRecords,
            description: "Thống kê theo từng lượt đánh giá/bản ghi điểm (COUNT Fact_Course_Grade)",
          },
        },
        source: "Fact_Course_Grade (LMS Data Warehouse)",
        mode,
        geminiStatus,
        modelUsed,
        explanation,
        confidence: parsedIntent.confidence || 0,
        teacher: {
          username: teacher.username,
        },
        generatedAt: new Date().toISOString(),
      });
    }

    // Trường hợp dự phòng
    return res.status(400).json({
      success: false,
      message: "Không tìm thấy logic xử lý cho yêu cầu này.",
    });
  } catch (error) {
    console.error("[AI Assistant Controller] Lỗi xử lý query:", error);
    return res.status(500).json({
      success: false,
      message: "Lỗi hệ thống khi xử lý câu hỏi của AI Assistant.",
      error: error.message,
    });
  }
}
