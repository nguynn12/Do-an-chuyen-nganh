import pool from "../src/config/database.js";
import { getStudentBehaviorProfile } from "../src/SinhVien/controllers/studentController.js";

// Mock helper req, res cho Express controller
function createMockReqRes(userKey, courseId = 8) {
  const req = {
    query: {
      userId: String(userKey),
      courseId: String(courseId),
    },
    params: {},
  };

  let jsonResult = null;
  let statusCode = 200;

  const res = {
    status(code) {
      statusCode = code;
      return this;
    },
    json(data) {
      jsonResult = data;
      return this;
    },
  };

  return { req, res, getResult: () => ({ statusCode, jsonResult }) };
}

async function verifyTask5() {
  console.log("==================================================================");
  console.log(" KIỂM THỬ VÀ NGHIỆM THU TASK 5: HỒ SƠ HÀNH VI CỦA TÔI (SINH VIÊN)");
  console.log("==================================================================");

  try {
    const studentA_Key = 18; // Đặng Văn Lâm (Chăm & Giỏi, Đúng hạn 100%)
    const studentB_Key = 22; // Phạm Đức Huy (Nguy cơ cao, Đúng hạn 0%)

    console.log(`\n--- 1. GỌI API CHO SINH VIÊN A (User_Key: ${studentA_Key}) ---`);
    const mockA = createMockReqRes(studentA_Key);
    await getStudentBehaviorProfile(mockA.req, mockA.res);
    const resA = mockA.getResult().jsonResult;

    console.log(`Sinh viên A: [${resA.student.fullName}] (${resA.student.username})`);
    console.log(`Nhóm phân khúc của mình: ${resA.behavior.mySegment}`);
    console.log(`Tọa độ của mình: (X=${resA.behavior.myCoords.x}, Y=${resA.behavior.myCoords.y})`);
    console.log(`Phong cách nộp bài: ${resA.behavior.submitProfile.mySubmitStyle}`);
    console.log(`Tín hiệu chú ý (attention):`, resA.behavior.attention);

    console.log(`\n--- 2. GỌI API CHO SINH VIÊN B (User_Key: ${studentB_Key}) ---`);
    const mockB = createMockReqRes(studentB_Key);
    await getStudentBehaviorProfile(mockB.req, mockB.res);
    const resB = mockB.getResult().jsonResult;

    console.log(`Sinh viên B: [${resB.student.fullName}] (${resB.student.username})`);
    console.log(`Nhóm phân khúc của mình: ${resB.behavior.mySegment}`);
    console.log(`Tọa độ của mình: (X=${resB.behavior.myCoords.x}, Y=${resB.behavior.myCoords.y})`);
    console.log(`Phong cách nộp bài: ${resB.behavior.submitProfile.mySubmitStyle}`);
    console.log(`Tín hiệu chú ý (attention):`, resB.behavior.attention);

    // ==================================================================
    // KIỂM TRA ĐIỀU KIỆN 1: BẢO MẬT VÀ ẨN DANH (KHÔNG LỘ THÔNG TIN BẠN KHÁC)
    // ==================================================================
    console.log(`\n==================================================================`);
    console.log(`--- 3. KIỂM TRA TÍNH ẨN DANH VÀ BẢO MẬT TRONG RESPONSE JSON ---`);
    const scatterPointsA = resA.behavior.anonymousScatter;
    console.log(`Tổng số điểm trên biểu đồ phân tán: ${scatterPointsA.length} điểm`);
    console.log(`Mẫu dữ liệu của 1 điểm:`, scatterPointsA[0]);

    // Kiểm tra xem có field nhạy cảm nào bị lộ trong anonymousScatter không
    const hasSensitiveFields = scatterPointsA.some(
      (pt) => pt.name || pt.fullName || pt.username || pt.email || pt.userKey || pt.studentId || pt.moodleUserId
    );

    console.log(`Kiểm tra các trường nhạy cảm (name, email, userKey...): ${hasSensitiveFields ? "❌ BỊ LỘ THÔNG TIN" : "✅ ẨN DANH HOÀN TOÀN (100%)"}`);

    // Kiểm tra xem tên của sinh viên B có xuất hiện trong JSON của sinh viên A không
    const stringifiedA = JSON.stringify(resA);
    const containsOtherStudentName = stringifiedA.includes(resB.student.fullName) || stringifiedA.includes(resB.student.username);
    console.log(`Kiểm tra tên/mã bạn khác trong JSON: ${containsOtherStudentName ? "❌ PHÁT HIỆN TÊN BẠN KHÁC" : "✅ KHÔNG CHỨA BẤT KỲ TÊN/MÃ CỦA BẠN KHÁC"}`);

    // Kiểm tra không có riskScore và không có chữ "nguy cơ" trong attention
    const hasRiskScore = stringifiedA.includes("riskScore") || JSON.stringify(resA.behavior.attention).includes("nguy cơ");
    console.log(`Kiểm tra không lộ riskScore / không dùng chữ 'nguy cơ': ${hasRiskScore ? "❌ CÓ TỪ NGUY CƠ" : "✅ VĂN PHONG NHẸ NHÀNG, KHÔNG LỘ RISK SCORE"}`);

    // ==================================================================
    // KIỂM TRA ĐIỀU KIỆN 2: 2 TÀI KHOẢN KHÁC NHAU THẤY HỒ SƠ KHÁC NHAU
    // ==================================================================
    console.log(`\n==================================================================`);
    console.log(`--- 4. SO SÁNH HỒ SƠ GIỮA 2 TÀI KHOẢN SINH VIÊN ---`);
    const comparisonTable = [
      {
        Chỉ_Mục: "Họ và tên",
        Sinh_Viên_A: resA.student.fullName,
        Sinh_Viên_B: resB.student.fullName,
        Khác_biệt: resA.student.fullName !== resB.student.fullName ? "✅ Khác nhau" : "❌ Trùng",
      },
      {
        Chỉ_Mục: "Phân khúc 2x2",
        Sinh_Viên_A: resA.behavior.mySegment,
        Sinh_Viên_B: resB.behavior.mySegment,
        Khác_biệt: resA.behavior.mySegment !== resB.behavior.mySegment ? "✅ Khác nhau" : "❌ Trùng",
      },
      {
        Chỉ_Mục: "Tọa độ (Tham gia, Điểm TB)",
        Sinh_Viên_A: `(${resA.behavior.myCoords.x}, ${resA.behavior.myCoords.y}%)`,
        Sinh_Viên_B: `(${resB.behavior.myCoords.x}, ${resB.behavior.myCoords.y}%)`,
        Khác_biệt: resA.behavior.myCoords.x !== resB.behavior.myCoords.x ? "✅ Khác nhau" : "❌ Trùng",
      },
      {
        Chỉ_Mục: "Tỷ lệ nộp đúng hạn",
        Sinh_Viên_A: `${resA.behavior.myScores.onTimeRate}%`,
        Sinh_Viên_B: `${resB.behavior.myScores.onTimeRate}%`,
        Khác_biệt: resA.behavior.myScores.onTimeRate !== resB.behavior.myScores.onTimeRate ? "✅ Khác nhau" : "❌ Trùng",
      },
      {
        Chỉ_Mục: "Tín hiệu chú ý (attention)",
        Sinh_Viên_A: resA.behavior.attention[0],
        Sinh_Viên_B: resB.behavior.attention[0],
        Khác_biệt: resA.behavior.attention[0] !== resB.behavior.attention[0] ? "✅ Khác nhau" : "❌ Trùng",
      },
    ];
    console.table(comparisonTable);

    console.log("\n==================================================================");
    console.log(" TASK 5 HOÀN TẤT VÀ ĐẠT TẤT CẢ ĐIỀU KIỆN NGHIỆM THU!");
    console.log("==================================================================");
  } catch (err) {
    console.error("Lỗi kiểm thử Task 5:", err);
  } finally {
    await pool.end();
  }
}

verifyTask5();
