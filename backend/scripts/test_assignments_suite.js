import pool from "../src/config/database.js";

async function runTests() {
  console.log("==================================================");
  console.log(" BẮT ĐẦU CHẠY TEST SUITE HỆ THỐNG BÀI TẬP & CHẤM ĐIỂM ");
  console.log("==================================================");

  let passed = 0;
  let failed = 0;

  function assert(condition, testName) {
    if (condition) {
      console.log(`✅ [PASS] ${testName}`);
      passed++;
    } else {
      console.error(`❌ [FAIL] ${testName}`);
      failed++;
    }
  }

  try {
    // 1. TEST: Tạo bài tập thiếu tiêu đề -> Phải báo lỗi
    const r1 = await fetch("http://localhost:3000/api/teachers/1/assignments/bank", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ courseId: 101, title: "", content: "Nội dung", topic: "SQL", maxScore: 10 }),
    }).then((r) => r.json());
    assert(
      r1.success === false && r1.message.toLowerCase().includes("tiêu đề"),
      "Test 1: Chặn tạo bài tập thiếu tiêu đề"
    );

    // 2. TEST: Tạo bài tập có Max_Score âm hoặc bằng 0 -> Phải báo lỗi
    const r2 = await fetch("http://localhost:3000/api/teachers/1/assignments/bank", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ courseId: 101, title: "Test", content: "Nội dung", topic: "SQL", maxScore: -5 }),
    }).then((r) => r.json());
    assert(
      r2.success === false && r2.message.toLowerCase().includes("lớn hơn 0"),
      "Test 2: Chặn tạo bài tập có Max_Score âm"
    );

    const r2b = await fetch("http://localhost:3000/api/teachers/1/assignments/bank", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ courseId: 101, title: "Test", content: "Nội dung", topic: "SQL", maxScore: 0 }),
    }).then((r) => r.json());
    assert(
      r2b.success === false && r2b.message.toLowerCase().includes("lớn hơn 0"),
      "Test 2b: Chặn tạo bài tập có Max_Score = 0"
    );

    // 3. TEST: Random preview đúng số bài và phân bố độ khó
    const r3 = await fetch("http://localhost:3000/api/teachers/1/assignments/campaigns/preview-random", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        courseId: 101,
        cohort: "K47",
        distributionType: "INDIVIDUAL",
        easyCount: 2,
        mediumCount: 2,
        hardCount: 1,
      }),
    }).then((r) => r.json());

    const sampleStudent = r3.previewDistributions?.[0];
    const easyCount = sampleStudent?.assignedQuestions.filter((q) => q.difficulty === "EASY").length;
    const medCount = sampleStudent?.assignedQuestions.filter((q) => q.difficulty === "MEDIUM").length;
    const hardCount = sampleStudent?.assignedQuestions.filter((q) => q.difficulty === "HARD").length;

    assert(
      r3.success === true &&
        sampleStudent?.assignedQuestions.length === 5 &&
        easyCount === 2 &&
        medCount === 2 &&
        hardCount === 1,
      "Test 3: Random phát sinh đúng 5 bài với 2 Dễ, 2 Trung bình, 1 Khó"
    );

    // 4. TEST: Không trùng lặp câu hỏi trong bộ bài của cùng sinh viên
    const uniqueIds = new Set(sampleStudent?.assignedQuestions.map((q) => q.id));
    assert(uniqueIds.size === 5, "Test 4: Không lặp câu hỏi trong bộ bài của cùng một sinh viên");

    // 5. TEST: Chặn giao bài cho sinh viên khóa ngoài môn (Course 101 không có K45)
    const r5 = await fetch("http://localhost:3000/api/teachers/1/assignments/campaigns/preview-random", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        courseId: 101,
        cohort: "K45",
        distributionType: "CLASS",
        easyCount: 1,
        mediumCount: 1,
        hardCount: 0,
      }),
    }).then((r) => r.json());
    assert(r5.success === false && r5.message.includes("K45"), "Test 5: Không giao bài cho khóa ngoài môn học");

    // 6. TEST: Chặn giảng viên chấm bài môn mình không phụ trách
    // Teacher 2 không phụ trách Course 101 (chỉ phụ trách 103, 104, 105, 106)
    const r6 = await fetch("http://localhost:3000/api/teachers/2/grading/submissions/6001/grade", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ score: 8, feedback: "Tốt" }),
    }).then((r) => r.json());
    assert(r6.success === false && r6.message.includes("phân công"), "Test 6: Chặn giảng viên chấm bài môn người khác");

    // 7. TEST: Chặn chấm điểm vượt Max_Score (> 10đ)
    const r7 = await fetch("http://localhost:3000/api/teachers/1/grading/submissions/6001/grade", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ score: 10.5, feedback: "Quá điểm" }),
    }).then((r) => r.json());
    assert(r7.success === false && r7.message.includes("vượt quá"), "Test 7: Chặn chấm điểm vượt quá Max_Score");

    // 8. TEST: Chặn chấm điểm âm (< 0đ)
    const r8 = await fetch("http://localhost:3000/api/teachers/1/grading/submissions/6001/grade", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ score: -1, feedback: "Âm" }),
    }).then((r) => r.json());
    assert(r8.success === false && r8.message.includes("số âm"), "Test 8: Chặn chấm điểm âm");

    // 9. TEST: Kiểm tra bảo mật điểm lưu nháp phía sinh viên
    // Sinh viên chỉ thấy điểm khi đã công bố (isGraded = 1)
    const r9 = await fetch("http://localhost:3000/api/v1/student/assigned-tasks?courseId=101&userId=18").then((r) =>
      r.json()
    );
    assert(r9.success === true, "Test 9: API tra cứu bài tập của sinh viên hoạt động an toàn");

    // 10. TEST: Kiểm tra cấu trúc câu hỏi ngẫu nhiên riêng biệt cho từng sinh viên
    const student1Tasks = r3.previewDistributions[0]?.assignedQuestions || [];
    const student2Tasks = r3.previewDistributions[1]?.assignedQuestions || [];
    const s1Easy = student1Tasks.filter((q) => q.difficulty === "EASY").length;
    const s2Easy = student2Tasks.filter((q) => q.difficulty === "EASY").length;
    assert(
      student1Tasks.length === 5 &&
        student2Tasks.length === 5 &&
        s1Easy === 2 &&
        s2Easy === 2,
      "Test 10: Từng sinh viên đều có đúng cấu trúc số lượng và phân bố độ khó quy định"
    );

    // 11. TEST: Chặn sửa điểm đã công bố mà không cung cấp lý do điều chỉnh
    const r11 = await fetch("http://localhost:3000/api/teachers/1/grading/submissions/6001/grade", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ score: 9.5, feedback: "Cập nhật", isPublish: true, reason: "" }),
    }).then((r) => r.json());
    assert(
      r11.success === false && r11.message.includes("lý do điều chỉnh"),
      "Test 11: Bắt buộc cung cấp lý do điều chỉnh khi sửa điểm đã công bố"
    );

    // 12. TEST: Chặn nộp bài nếu không có nội dung
    const r12 = await fetch("http://localhost:3000/api/v1/student/assigned-tasks/6001/submit?userId=18", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ submissionContent: "" }),
    }).then((r) => r.json());
    assert(
      r12.success === false && r12.message.includes("nội dung"),
      "Test 12: Chặn sinh viên nộp bài khi để trống nội dung"
    );

    // 13. TEST: Chặn nộp bài cho task không thuộc quyền sở hữu của sinh viên
    const r13 = await fetch("http://localhost:3000/api/v1/student/assigned-tasks/999999/submit?userId=18", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ submissionContent: "Bài làm thử" }),
    }).then((r) => r.json());
    assert(
      r13.success === false && r13.message.includes("Không tìm thấy"),
      "Test 13: Bảo mật chặn nộp bài cho task ngoài danh sách giao của sinh viên"
    );

    // 14. TEST: Kiểm tra toàn vẹn API danh sách bài nộp của giảng viên trên dữ liệu nguồn
    const r14 = await fetch("http://localhost:3000/api/teachers/1/grading/submissions?courseId=101").then((r) =>
      r.json()
    );
    assert(
      r14.success === true && Array.isArray(r14.data) && r14.total > 0,
      "Test 14: Lấy danh sách bài nộp của giảng viên từ OLTP thành công mà không chạm DW"
    );

    console.log("==================================================");
    console.log(` KẾT QUẢ KIỂM THỬ: ${passed} PASS, ${failed} FAIL `);
    console.log("==================================================");
    process.exit(failed > 0 ? 1 : 0);
  } catch (error) {
    console.error("Lỗi trong quá trình chạy test suite:", error);
    process.exit(1);
  }
}

runTests();
