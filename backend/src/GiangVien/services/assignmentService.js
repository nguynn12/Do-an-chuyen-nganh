import pool from "../../config/database.js";

// ============================================================
// HELPER: KIỂM TRA BẢNG NGHIỆP VỤ MỚI ĐÃ ĐƯỢC MIGRATION CHƯA
// ============================================================

let _tablesExistCache = null;
let _tablesExistLastChecked = 0;

export async function checkAssignmentTablesExist() {
  const now = Date.now();
  if (_tablesExistCache !== null && now - _tablesExistLastChecked < 10000) {
    return _tablesExistCache;
  }

  try {
    const [rows] = await pool.query(`
      SELECT COUNT(*) AS count
      FROM information_schema.tables
      WHERE table_schema = 'lms_moodle_source'
        AND table_name IN ('assignment_bank', 'assignment_campaign', 'assignment_distribution', 'assignment_submission_record')
    `);

    _tablesExistCache = Number(rows[0]?.count || 0) >= 4;
    _tablesExistLastChecked = now;
    return _tablesExistCache;
  } catch (err) {
    console.error("Lỗi kiểm tra bảng assignment trong information_schema:", err.message);
    return false;
  }
}

// ============================================================
// HELPER: COHORT MAPPING
// ============================================================

export function getCohortPattern(cohort) {
  const mapping = {
    K45: "sv21%",
    K46: "sv22%",
    K47: "sv23%",
  };
  return mapping[cohort] || "sv23%";
}

// ============================================================
// HELPER: KIỂM TRA PHÂN QUYỀN GIẢNG VIÊN VỚI MÔN HỌC
// ============================================================

export async function checkTeacherCoursePermission(teacherId, courseId) {
  const [rows] = await pool.query(
    `
    SELECT 1
    FROM lms_moodle_source.mdl_role_assignments ra
    INNER JOIN lms_moodle_source.mdl_role r ON r.id = ra.roleid
    INNER JOIN lms_moodle_source.mdl_context ctx ON ctx.id = ra.contextid AND ctx.contextlevel = 50
    WHERE ra.userid = ?
      AND ctx.instanceid = ?
      AND r.shortname IN ('teacher', 'editingteacher')
    LIMIT 1
    `,
    [teacherId, courseId]
  );

  return rows.length > 0;
}

// ============================================================
// DỮ LIỆU ĐỀ XUẤT CHO NGÂN HÀNG BÀI TẬP (MẪU KHỞI TẠO TỪ 31_create_assignment_management.sql)
// ============================================================

export const SAMPLE_BANK_BY_COURSE = {
  101: [
    { id: 1001, courseId: 101, title: 'Truy vấn SQL kết hợp JOIN nhiều bảng', content: 'Viết câu lệnh SQL truy vấn thông tin sinh viên, điểm trung bình và môn học tương ứng từ 3 bảng Users, Enrolments, Courses.', topic: 'Chương 3: Ngôn ngữ SQL', difficulty: 'EASY', maxScore: 10.00, gradingGuide: 'Đúng cú pháp SELECT, INNER JOIN: 6đ. GROUP BY và aggregate: 4đ.', status: 'ACTIVE', createdBy: 1, firstname: 'An', lastname: 'Nguyễn' },
    { id: 1002, courseId: 101, title: 'Tối ưu hóa chỉ mục Index trong MySQL', content: 'Phân tích câu lệnh EXPLAIN trên bảng Fact_Assignment_Submission và đề xuất Index phù hợp để tăng tốc độ tìm kiếm.', topic: 'Chương 4: Tối ưu hóa truy vấn', difficulty: 'MEDIUM', maxScore: 10.00, gradingGuide: 'Giải thích kết quả EXPLAIN: 4đ. Đề xuất Index đúng: 6đ.', status: 'ACTIVE', createdBy: 1, firstname: 'An', lastname: 'Nguyễn' },
    { id: 1003, courseId: 101, title: 'Thiết kế lược đồ quan hệ chuẩn 3NF', content: 'Cho bảng hóa đơn bán hàng bán lẻ chưa chuẩn hóa. Hãy phân rã thành các bảng đạt dạng chuẩn 3NF và vẽ lược đồ ERD.', topic: 'Chương 2: Thiết kế CSDL', difficulty: 'MEDIUM', maxScore: 10.00, gradingGuide: 'Xác định phụ thuộc hàm: 3đ. Đạt 2NF: 3đ. Đạt 3NF: 4đ.', status: 'ACTIVE', createdBy: 1, firstname: 'An', lastname: 'Nguyễn' },
    { id: 1004, courseId: 101, title: 'Xây dựng Stored Procedure và Transaction', content: 'Viết Stored Procedure xử lý giao tác ghi danh môn học có kiểm tra sĩ số tối đa và ROLLBACK nếu vượt quá.', topic: 'Chương 5: Lập trình CSDL', difficulty: 'HARD', maxScore: 10.00, gradingGuide: 'Đúng cú pháp Procedure: 3đ. Xử lý Transaction/Rollback chuẩn: 7đ.', status: 'ACTIVE', createdBy: 1, firstname: 'An', lastname: 'Nguyễn' },
    { id: 1005, courseId: 101, title: 'Trigger kiểm tra ràng buộc toàn vẹn', content: 'Tạo Trigger BEFORE INSERT trên bảng điểm số để ngăn chặn việc nhập điểm âm hoặc lớn hơn 10.', topic: 'Chương 5: Lập trình CSDL', difficulty: 'EASY', maxScore: 10.00, gradingGuide: 'Viết đúng Trigger: 10đ.', status: 'ACTIVE', createdBy: 1, firstname: 'An', lastname: 'Nguyễn' },
    { id: 1006, courseId: 101, title: 'Phân vùng bảng Partitioning cho Big Data', content: 'Trình bày và thực thi giải pháp RANGE Partitioning cho bảng log hệ thống theo từng tháng.', topic: 'Chương 6: CSDL nâng cao', difficulty: 'HARD', maxScore: 10.00, gradingGuide: 'Lý thuyết phân vùng: 3đ. Script thực thi phân vùng: 7đ.', status: 'ACTIVE', createdBy: 1, firstname: 'An', lastname: 'Nguyễn' },
  ],
  102: [
    { id: 1007, courseId: 102, title: 'Xây dựng bố cục Responsive với Flexbox và Grid', content: 'Xây dựng trang giao diện danh sách khóa học tương thích cả màn hình Desktop và Mobile bằng CSS Grid/Flexbox.', topic: 'Bài 2: CSS Layout', difficulty: 'EASY', maxScore: 10.00, gradingGuide: 'Đúng Responsive: 5đ. Thẩm mỹ và sạch sẽ: 5đ.', status: 'ACTIVE', createdBy: 1, firstname: 'An', lastname: 'Nguyễn' },
    { id: 1008, courseId: 102, title: 'Tạo RESTful API CRUD sản phẩm với ExpressJS', content: 'Viết đầy đủ các endpoint GET, POST, PUT, DELETE cho quản lý danh mục sản phẩm có validate dữ liệu.', topic: 'Bài 5: NodeJS Backend', difficulty: 'MEDIUM', maxScore: 10.00, gradingGuide: 'Đủ 4 method: 6đ. Xử lý mã lỗi HTTP chuẩn: 4đ.', status: 'ACTIVE', createdBy: 1, firstname: 'An', lastname: 'Nguyễn' },
    { id: 1009, courseId: 102, title: 'Xác thực người dùng với JSON Web Token (JWT)', content: 'Cài đặt middleware xác thực Token JWT và bảo vệ các private route trong ứng dụng ExpressJS.', topic: 'Bài 6: Bảo mật Web', difficulty: 'HARD', maxScore: 10.00, gradingGuide: 'Tạo token: 3đ. Middleware verify: 4đ. Xử lý hết hạn token: 3đ.', status: 'ACTIVE', createdBy: 1, firstname: 'An', lastname: 'Nguyễn' },
    { id: 1010, courseId: 102, title: 'Xử lý Form tương tác với JavaScript Fetch API', content: 'Tạo form đăng ký và gửi dữ liệu không tải lại trang bằng Fetch API, hiển thị thông báo lỗi trực quan.', topic: 'Bài 3: JavaScript DOM', difficulty: 'EASY', maxScore: 10.00, gradingGuide: 'Ngăn chặn submit mặc định: 3đ. Gọi Fetch API: 4đ. Hiển thị thông báo: 3đ.', status: 'ACTIVE', createdBy: 1, firstname: 'An', lastname: 'Nguyễn' },
    { id: 1011, courseId: 102, title: 'Tích hợp Upload File và Lưu trữ', content: 'Cài đặt Multer để nhận file ảnh đại diện sinh viên và lưu vào thư mục public của server.', topic: 'Bài 7: Upload File', difficulty: 'MEDIUM', maxScore: 10.00, gradingGuide: 'Cấu hình Multer: 5đ. Validate định dạng file: 5đ.', status: 'ACTIVE', createdBy: 1, firstname: 'An', lastname: 'Nguyễn' },
    { id: 1012, courseId: 102, title: 'Phòng chống tấn công SQL Injection và XSS', content: 'Phân tích các lỗ hổng SQLi và XSS trong mã nguồn mẫu và viết lại code an toàn bằng Parameterized Query.', topic: 'Bài 8: An toàn ứng dụng Web', difficulty: 'HARD', maxScore: 10.00, gradingGuide: 'Chỉ ra lỗ hổng: 4đ. Khắc phục triệt để: 6đ.', status: 'ACTIVE', createdBy: 1, firstname: 'An', lastname: 'Nguyễn' },
  ],
  103: [
    { id: 1013, courseId: 103, title: 'Cài đặt Rigidbody và Va chạm vật lý', content: 'Tạo nhân vật di chuyển 2D có nhảy và xử lý va chạm với chướng ngại vật bằng Physics2D.', topic: 'Chương 2: Vật lý Game', difficulty: 'EASY', maxScore: 10.00, gradingGuide: 'Di chuyển mượt: 5đ. Va chạm chính xác: 5đ.', status: 'ACTIVE', createdBy: 2, firstname: 'Bình', lastname: 'Trần' },
    { id: 1014, courseId: 103, title: 'Thuật toán tìm đường A* cho NPC', content: 'Lập trình thuật toán A* trên lưới ô vuông để quái vật tự động tìm đường đến vị trí người chơi.', topic: 'Chương 4: Trí tuệ nhân tạo Game', difficulty: 'HARD', maxScore: 10.00, gradingGuide: 'Cài đặt đúng Heuristic: 4đ. Tránh chướng ngại vật: 6đ.', status: 'ACTIVE', createdBy: 2, firstname: 'Bình', lastname: 'Trần' },
    { id: 1015, courseId: 103, title: 'Xây dựng hệ thống UI và Menu Game', content: 'Thiết kế Main Menu, Pause Menu và hiển thị thanh máu HP cập nhật theo thời gian thực.', topic: 'Chương 3: Giao diện Game', difficulty: 'EASY', maxScore: 10.00, gradingGuide: 'Giao diện trực quan: 5đ. Sự kiện nút bấm: 5đ.', status: 'ACTIVE', createdBy: 2, firstname: 'Bình', lastname: 'Trần' },
    { id: 1016, courseId: 103, title: 'Quản lý trạng thái State Machine cho Boss', content: 'Xây dựng Finite State Machine quản lý 3 trạng thái của Boss: Patrol, Chase, và Attack.', topic: 'Chương 5: Game Architecture', difficulty: 'MEDIUM', maxScore: 10.00, gradingGuide: 'Tách state rõ ràng: 5đ. Chuyển đổi trạng thái đúng logic: 5đ.', status: 'ACTIVE', createdBy: 2, firstname: 'Bình', lastname: 'Trần' },
    { id: 1017, courseId: 103, title: 'Tối ưu hóa hiệu năng Draw Calls trong Scene', content: 'Sử dụng Sprite Atlas và Object Pooling để tối ưu số lượng Draw Calls khi spawn nhiều đạn.', topic: 'Chương 6: Tối ưu hiệu năng', difficulty: 'MEDIUM', maxScore: 10.00, gradingGuide: 'Cài đặt Object Pool: 6đ. Giảm Draw Calls: 4đ.', status: 'ACTIVE', createdBy: 2, firstname: 'Bình', lastname: 'Trần' },
    { id: 1018, courseId: 103, title: 'Xây dựng Shader đồ họa tùy chỉnh HLSL', content: 'Viết Shader hiệu ứng phát sáng Hologram cho nhân vật khi nhặt được vật phẩm đặc biệt.', topic: 'Chương 7: Đồ họa nâng cao', difficulty: 'HARD', maxScore: 10.00, gradingGuide: 'Shader biên dịch tốt: 5đ. Hiệu ứng thị giác đẹp: 5đ.', status: 'ACTIVE', createdBy: 2, firstname: 'Bình', lastname: 'Trần' },
  ],
  104: [
    { id: 1019, courseId: 104, title: 'Cài đặt thuật toán tìm kiếm Minimax', content: 'Lập trình thuật toán Minimax có tỉa cành Alpha-Beta cho trò chơi Cờ caro (Tic-tac-toe).', topic: 'Chương 2: Tìm kiếm đối kháng', difficulty: 'MEDIUM', maxScore: 10.00, gradingGuide: 'Minimax cơ bản: 5đ. Tỉa cành Alpha-Beta: 5đ.', status: 'ACTIVE', createdBy: 2, firstname: 'Bình', lastname: 'Trần' },
    { id: 1020, courseId: 104, title: 'Phân loại ảnh chữ số viết tay với KNN', content: 'Sử dụng thuật toán K-Nearest Neighbors để phân loại tập dữ liệu chữ số MNIST, đánh giá Accuracy.', topic: 'Chương 3: Machine Learning', difficulty: 'EASY', maxScore: 10.00, gradingGuide: 'Tiền xử lý ảnh: 4đ. Huấn luyện và đánh giá: 6đ.', status: 'ACTIVE', createdBy: 2, firstname: 'Bình', lastname: 'Trần' },
    { id: 1021, courseId: 104, title: 'Xây dựng mạng nơ-ron Perceptron từ đầu', content: 'Viết thuật toán lan truyền xuôi và lan truyền ngược (Backpropagation) cho mạng MLP không dùng thư viện ngoài.', topic: 'Chương 4: Deep Learning', difficulty: 'HARD', maxScore: 10.00, gradingGuide: 'Tính toán đạo hàm: 4đ. Cập nhật Gradient Descent: 6đ.', status: 'ACTIVE', createdBy: 2, firstname: 'Bình', lastname: 'Trần' },
    { id: 1022, courseId: 104, title: 'Thuật toán di truyền Genetic Algorithm', content: 'Giải bài toán người đưa thư (TSP) cho 20 thành phố bằng thuật toán di truyền Genetic Algorithm.', topic: 'Chương 5: Giải thuật di truyền', difficulty: 'MEDIUM', maxScore: 10.00, gradingGuide: 'Cơ chế đột biến/lai ghép: 5đ. Hội tụ kết quả tốt: 5đ.', status: 'ACTIVE', createdBy: 2, firstname: 'Bình', lastname: 'Trần' },
    { id: 1023, courseId: 104, title: 'Xử lý ngôn ngữ tự nhiên cơ bản TF-IDF', content: 'Trích xuất đặc trưng văn bản bằng TF-IDF và phân loại cảm xúc tích cực/tiêu cực của bình luận.', topic: 'Chương 6: NLP', difficulty: 'EASY', maxScore: 10.00, gradingGuide: 'Tính đúng TF-IDF: 6đ. Phân loại cảm xúc: 4đ.', status: 'ACTIVE', createdBy: 2, firstname: 'Bình', lastname: 'Trần' },
    { id: 1024, courseId: 104, title: 'Mô hình học tăng cường Q-Learning', content: 'Huấn luyện Agent tìm đường ra khỏi mê cung bằng thuật toán Q-Learning với bảng phần thưởng Q-Table.', topic: 'Chương 7: Reinforcement Learning', difficulty: 'HARD', maxScore: 10.00, gradingGuide: 'Hàm cập nhật Bellman: 5đ. Agent tìm đường tối ưu: 5đ.', status: 'ACTIVE', createdBy: 2, firstname: 'Bình', lastname: 'Trần' },
  ],
  105: [
    { id: 1025, courseId: 105, title: 'Quản lý trạng thái toàn cục với Redux Toolkit', content: 'Cài đặt Redux Toolkit để quản lý giỏ hàng, tính tổng tiền và lưu vào LocalStorage.', topic: 'Chương 2: State Management', difficulty: 'MEDIUM', maxScore: 10.00, gradingGuide: 'Slice & Actions chuẩn: 5đ. Đồng bộ LocalStorage: 5đ.', status: 'ACTIVE', createdBy: 2, firstname: 'Bình', lastname: 'Trần' },
    { id: 1026, courseId: 105, title: 'Tối ưu hiệu năng React với useMemo và useCallback', content: 'Phân tích re-render trong danh sách 10,000 phần tử và áp dụng Memoization để tránh lag.', topic: 'Chương 3: Performance Tuning', difficulty: 'EASY', maxScore: 10.00, gradingGuide: 'Chỉ ra nguyên nhân re-render: 4đ. Áp dụng đúng hook: 6đ.', status: 'ACTIVE', createdBy: 2, firstname: 'Bình', lastname: 'Trần' },
    { id: 1027, courseId: 105, title: 'Xây dựng tính năng Realtime với Socket.IO', content: 'Cài đặt phòng chat trực tuyến giữa giảng viên và sinh viên có thông báo gõ phím (typing).', topic: 'Chương 4: Realtime Web', difficulty: 'HARD', maxScore: 10.00, gradingGuide: 'Kết nối Socket ổn định: 4đ. Sự kiện phòng chat: 6đ.', status: 'ACTIVE', createdBy: 2, firstname: 'Bình', lastname: 'Trần' },
    { id: 1028, courseId: 105, title: 'Thiết kế Custom Hook tái sử dụng', content: 'Viết custom hook useFetch hỗ trợ AbortController, cache dữ liệu và tự động thử lại khi mất mạng.', topic: 'Chương 2: React Hooks', difficulty: 'EASY', maxScore: 10.00, gradingGuide: 'Hook xử lý loading/error: 5đ. Hỗ trợ hủy request: 5đ.', status: 'ACTIVE', createdBy: 2, firstname: 'Bình', lastname: 'Trần' },
    { id: 1029, courseId: 105, title: 'Server-Side Rendering (SSR) với Next.js', content: 'Chuyển đổi trang chi tiết sản phẩm sang SSR trong Next.js để tối ưu SEO và thời gian First Paint.', topic: 'Chương 5: Next.js & SSR', difficulty: 'MEDIUM', maxScore: 10.00, gradingGuide: 'Cấu hình getServerSideProps: 5đ. Tối ưu SEO metadata: 5đ.', status: 'ACTIVE', createdBy: 2, firstname: 'Bình', lastname: 'Trần' },
    { id: 1030, courseId: 105, title: 'Triển khai CI/CD và Docker hóa ứng dụng', content: 'Viết Dockerfile đa tầng (Multi-stage build) và kịch bản GitHub Actions tự động kiểm thử và build ảnh Docker.', topic: 'Chương 6: DevOps cho Web', difficulty: 'HARD', maxScore: 10.00, gradingGuide: 'Dockerfile tối ưu dung lượng: 5đ. Script CI/CD chạy thành công: 5đ.', status: 'ACTIVE', createdBy: 2, firstname: 'Bình', lastname: 'Trần' },
  ],
  106: [
    { id: 1031, courseId: 106, title: 'Thiết kế bảng quyết định Decision Table', content: 'Thiết kế bảng quyết định kiểm thử chức năng tính tiền cước vận chuyển dựa trên khối lượng và cự ly.', topic: 'Chương 2: Hộp đen Testing', difficulty: 'EASY', maxScore: 10.00, gradingGuide: 'Lập đủ quy tắc: 5đ. Rút gọn bảng quyết định: 5đ.', status: 'ACTIVE', createdBy: 2, firstname: 'Bình', lastname: 'Trần' },
    { id: 1032, courseId: 106, title: 'Viết Unit Test với Jest và Mock Function', content: 'Viết bộ kiểm thử đơn vị bao phủ 100% chi nhánh rẽ (Branch Coverage) cho module tính điểm trung bình.', topic: 'Chương 3: Unit Testing', difficulty: 'MEDIUM', maxScore: 10.00, gradingGuide: 'Test cases đầy đủ: 6đ. Dùng mock đúng cách: 4đ.', status: 'ACTIVE', createdBy: 2, firstname: 'Bình', lastname: 'Trần' },
    { id: 1033, courseId: 106, title: 'Kiểm thử tự động End-to-End với Cypress', content: 'Viết kịch bản Cypress tự động đăng nhập hệ thống, nộp bài tập và kiểm tra thông báo thành công.', topic: 'Chương 5: Automation Testing', difficulty: 'HARD', maxScore: 10.00, gradingGuide: 'Script chạy mượt mà: 6đ. Xử lý selector và async chuẩn: 4đ.', status: 'ACTIVE', createdBy: 2, firstname: 'Bình', lastname: 'Trần' },
    { id: 1034, courseId: 106, title: 'Phân tích giá trị biên Boundary Value Analysis', content: 'Xác định các giá trị kiểm thử biên cho trường nhập tuổi sinh viên hợp lệ từ 18 đến 60 tuổi.', topic: 'Chương 2: Kỹ thuật kiểm thử', difficulty: 'EASY', maxScore: 10.00, gradingGuide: 'Đủ các giá trị biên min, min+, nom, max-, max: 10đ.', status: 'ACTIVE', createdBy: 2, firstname: 'Bình', lastname: 'Trần' },
    { id: 1035, courseId: 106, title: 'Kiểm thử hiệu năng tải với Apache JMeter', content: 'Tạo kịch bản kiểm thử tải mô phỏng 200 sinh viên đồng thời truy cập xem điểm trong 30 giây.', topic: 'Chương 4: Performance Testing', difficulty: 'MEDIUM', maxScore: 10.00, gradingGuide: 'Cấu hình Thread Group: 5đ. Phân tích báo cáo thông lượng: 5đ.', status: 'ACTIVE', createdBy: 2, firstname: 'Bình', lastname: 'Trần' },
    { id: 1036, courseId: 106, title: 'Kiểm thử bảo mật tự động với OWASP ZAP', content: 'Quét lỗ hổng bảo mật trên website cục bộ và lập báo cáo phân loại mức độ nghiêm trọng.', topic: 'Chương 6: Security Testing', difficulty: 'HARD', maxScore: 10.00, gradingGuide: 'Quét thành công: 4đ. Báo cáo đề xuất khắc phục: 6đ.', status: 'ACTIVE', createdBy: 2, firstname: 'Bình', lastname: 'Trần' },
  ],
};

// ============================================================
// 1. NGÂN HÀNG BÀI TẬP: LẤY DANH SÁCH BÀI TẬP THEO MÔN
// ============================================================

export async function getAssignmentBank(teacherId, courseId, query = {}) {
  const hasPerm = await checkTeacherCoursePermission(teacherId, courseId);
  if (!hasPerm) {
    throw new Error("Bạn không được phân công phụ trách môn học này.");
  }

  const tablesExist = await checkAssignmentTablesExist();
  if (!tablesExist) {
    const rawList = SAMPLE_BANK_BY_COURSE[Number(courseId)] || [];
    let filtered = [...rawList];

    if (query.difficulty && query.difficulty !== "ALL") {
      filtered = filtered.filter((r) => r.difficulty === query.difficulty);
    }
    if (query.topic) {
      const t = query.topic.toLowerCase();
      filtered = filtered.filter((r) => r.topic.toLowerCase().includes(t));
    }
    if (query.search) {
      const s = query.search.toLowerCase();
      filtered = filtered.filter(
        (r) => r.title.toLowerCase().includes(s) || r.content.toLowerCase().includes(s)
      );
    }

    return {
      waitingMigration: true,
      message:
        "Cơ sở dữ liệu chưa chạy migration bảng assignment_bank (đang hiển thị bộ bài tập mẫu chuẩn bị cho môn học từ 31_create_assignment_management.sql).",
      data: filtered,
      stats: {
        total: filtered.length,
        easy: filtered.filter((r) => r.difficulty === "EASY").length,
        medium: filtered.filter((r) => r.difficulty === "MEDIUM").length,
        hard: filtered.filter((r) => r.difficulty === "HARD").length,
        active: filtered.filter((r) => r.status === "ACTIVE").length,
      },
    };
  }


  let sql = `
    SELECT
      ab.id,
      ab.course_id AS courseId,
      ab.title,
      ab.content,
      ab.topic,
      ab.difficulty,
      ab.max_score AS maxScore,
      ab.grading_guide AS gradingGuide,
      ab.status,
      ab.created_by AS createdBy,
      u.firstname,
      u.lastname,
      ab.created_at AS createdAt,
      ab.updated_at AS updatedAt,
      (
        SELECT COUNT(DISTINCT ad.id)
        FROM lms_moodle_source.assignment_distribution ad
        WHERE ad.assignment_bank_id = ab.id
      ) AS distributedCount
    FROM lms_moodle_source.assignment_bank ab
    INNER JOIN lms_moodle_source.mdl_user u ON u.id = ab.created_by
    WHERE ab.course_id = ?
  `;

  const params = [courseId];

  if (query.difficulty && query.difficulty !== "ALL") {
    sql += " AND ab.difficulty = ?";
    params.push(query.difficulty);
  }

  if (query.topic) {
    sql += " AND ab.topic LIKE ?";
    params.push(`%${query.topic}%`);
  }

  if (query.status && query.status !== "ALL") {
    sql += " AND ab.status = ?";
    params.push(query.status);
  }

  if (query.search) {
    sql += " AND (ab.title LIKE ? OR ab.content LIKE ? OR ab.topic LIKE ?)";
    const term = `%${query.search}%`;
    params.push(term, term, term);
  }

  sql += " ORDER BY ab.id DESC";

  const [rows] = await pool.query(sql, params);

  // Thống kê nhanh theo độ khó
  const stats = {
    total: rows.length,
    easy: rows.filter((r) => r.difficulty === "EASY").length,
    medium: rows.filter((r) => r.difficulty === "MEDIUM").length,
    hard: rows.filter((r) => r.difficulty === "HARD").length,
    active: rows.filter((r) => r.status === "ACTIVE").length,
  };

  return {
    waitingMigration: false,
    data: rows,
    stats,
  };
}

// ============================================================
// 2. NGÂN HÀNG BÀI TẬP: TẠO BÀI TẬP MỚI
// ============================================================

export async function createAssignmentBankItem(teacherId, data) {
  const { courseId, title, content, topic, difficulty, maxScore, gradingGuide, status } = data;

  if (!title || !String(title).trim()) {
    throw new Error("Tiêu đề bài tập không được để trống.");
  }
  if (!content || !String(content).trim()) {
    throw new Error("Nội dung bài tập không được để trống.");
  }
  if (!topic || !String(topic).trim()) {
    throw new Error("Chủ đề bài tập không được để trống.");
  }
  const score = Number(maxScore);
  if (isNaN(score) || score <= 0) {
    throw new Error("Thang điểm tối đa phải là số lớn hơn 0.");
  }

  const validDifficulties = ["EASY", "MEDIUM", "HARD"];
  const diff = String(difficulty || "MEDIUM").toUpperCase();
  if (!validDifficulties.includes(diff)) {
    throw new Error("Độ khó phải là Dễ (EASY), Trung bình (MEDIUM), hoặc Khó (HARD).");
  }

  const hasPerm = await checkTeacherCoursePermission(teacherId, courseId);
  if (!hasPerm) {
    throw new Error("Bạn không được phân công phụ trách môn học này.");
  }

  const tablesExist = await checkAssignmentTablesExist();
  if (!tablesExist) {
    return {
      waitingMigration: true,
      message:
        "Bảng assignment_bank chưa được migration. Vui lòng thực thi Database/31_create_assignment_management.sql khi được phê duyệt.",
    };
  }

  const [result] = await pool.query(
    `
    INSERT INTO lms_moodle_source.assignment_bank
    (course_id, title, content, topic, difficulty, max_score, grading_guide, status, created_by)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `,
    [
      courseId,
      title.trim(),
      content.trim(),
      topic.trim(),
      diff,
      score,
      gradingGuide || "",
      status || "ACTIVE",
      teacherId,
    ]
  );

  return {
    waitingMigration: false,
    id: result.insertId,
    message: "Tạo bài tập vào ngân hàng thành công.",
  };
}

// ============================================================
// 3. NGÂN HÀNG BÀI TẬP: CẬP NHẬT BÀI TẬP (NẾU CHƯA GIAO)
// ============================================================

export async function updateAssignmentBankItem(teacherId, itemId, data) {
  const tablesExist = await checkAssignmentTablesExist();
  if (!tablesExist) {
    return { waitingMigration: true, message: "Bảng assignment_bank chưa được migration." };
  }

  const [existing] = await pool.query(
    `SELECT * FROM lms_moodle_source.assignment_bank WHERE id = ?`,
    [itemId]
  );

  if (existing.length === 0) {
    throw new Error("Không tìm thấy bài tập trong ngân hàng.");
  }

  const item = existing[0];
  const hasPerm = await checkTeacherCoursePermission(teacherId, item.course_id);
  if (!hasPerm) {
    throw new Error("Bạn không có quyền chỉnh sửa bài tập của môn học này.");
  }

  // Kiểm tra bài tập đã được giao chưa
  const [dist] = await pool.query(
    `SELECT COUNT(*) AS count FROM lms_moodle_source.assignment_distribution WHERE assignment_bank_id = ?`,
    [itemId]
  );

  const isDistributed = Number(dist[0]?.count || 0) > 0;

  // Nếu đã giao bài, chỉ cho phép chỉnh sửa trạng thái (Archive), không cho sửa nội dung / điểm
  if (isDistributed) {
    if (data.status) {
      await pool.query(
        `UPDATE lms_moodle_source.assignment_bank SET status = ? WHERE id = ?`,
        [data.status, itemId]
      );
      return {
        waitingMigration: false,
        message: "Bài tập đã được giao trước đó. Đã cập nhật trạng thái lưu trữ mà không thay đổi đề bài lịch sử.",
      };
    }
    throw new Error("Bài tập này đã được phân phối cho sinh viên trong đợt giao bài. Không thể sửa nội dung gốc.");
  }

  const score = Number(data.maxScore ?? item.max_score);
  if (isNaN(score) || score <= 0) {
    throw new Error("Thang điểm tối đa phải là số lớn hơn 0.");
  }

  await pool.query(
    `
    UPDATE lms_moodle_source.assignment_bank
    SET
      title = COALESCE(?, title),
      content = COALESCE(?, content),
      topic = COALESCE(?, topic),
      difficulty = COALESCE(?, difficulty),
      max_score = ?,
      grading_guide = COALESCE(?, grading_guide),
      status = COALESCE(?, status)
    WHERE id = ?
    `,
    [
      data.title?.trim() || null,
      data.content?.trim() || null,
      data.topic?.trim() || null,
      data.difficulty || null,
      score,
      data.gradingGuide || null,
      data.status || null,
      itemId,
    ]
  );

  return { waitingMigration: false, message: "Cập nhật bài tập thành công." };
}

// ============================================================
// 4. RANDOM GIAO BÀI: XEM TRƯỚC (PREVIEW RANDOM)
// Backend chịu trách nhiệm phát sinh ngẫu nhiên, không phụ thuộc client!
// ============================================================

export async function previewRandomDistribution({
  teacherId,
  courseId,
  cohort = "K47",
  distributionType = "CLASS",
  easyCount = 0,
  mediumCount = 0,
  hardCount = 0,
}) {
  const hasPerm = await checkTeacherCoursePermission(teacherId, courseId);
  if (!hasPerm) {
    throw new Error("Bạn không được phân công phụ trách môn học này.");
  }

  const reqEasy = Math.max(0, parseInt(easyCount, 10) || 0);
  const reqMedium = Math.max(0, parseInt(mediumCount, 10) || 0);
  const reqHard = Math.max(0, parseInt(hardCount, 10) || 0);
  const totalRequired = reqEasy + reqMedium + reqHard;

  if (totalRequired <= 0) {
    throw new Error("Vui lòng chọn ít nhất 1 bài tập trong phân bố độ khó.");
  }

  // 1. Lấy danh sách sinh viên thực tế thuộc môn và đúng khóa (cohort)
  const cohortPattern = getCohortPattern(cohort);
  const [students] = await pool.query(
    `
    SELECT
      u.id AS studentId,
      u.username AS studentUsername,
      CONCAT(u.lastname, ' ', u.firstname) AS studentName,
      u.email AS studentEmail
    FROM lms_moodle_source.mdl_user u
    INNER JOIN lms_moodle_source.mdl_user_enrolments ue ON ue.userid = u.id
    INNER JOIN lms_moodle_source.mdl_enrol e ON e.id = ue.enrolid AND e.courseid = ?
    WHERE u.deleted = 0
      AND u.suspended = 0
      AND u.username LIKE ?
    ORDER BY u.username
    `,
    [courseId, cohortPattern]
  );

  if (students.length === 0) {
    throw new Error(`Không tìm thấy sinh viên nào thuộc khóa ${cohort} trong môn học này.`);
  }

  // 2. Lấy câu hỏi từ ngân hàng bài tập (hoặc từ ngân hàng mẫu nếu đang chờ migration)
  const tablesExist = await checkAssignmentTablesExist();
  let bankQuestions = [];
  let isWaitingMigration = false;

  if (tablesExist) {
    const [rows] = await pool.query(
      `
      SELECT id, title, topic, difficulty, max_score AS maxScore
      FROM lms_moodle_source.assignment_bank
      WHERE course_id = ? AND status = 'ACTIVE'
      ORDER BY id ASC
      `,
      [courseId]
    );
    bankQuestions = rows;
  } else {
    isWaitingMigration = true;
    bankQuestions = SAMPLE_BANK_BY_COURSE[Number(courseId)] || [];
  }

  const easyPool = bankQuestions.filter((q) => q.difficulty === "EASY");
  const mediumPool = bankQuestions.filter((q) => q.difficulty === "MEDIUM");
  const hardPool = bankQuestions.filter((q) => q.difficulty === "HARD");

  if (easyPool.length < reqEasy) {
    throw new Error(
      `Ngân hàng môn học chỉ có ${easyPool.length} bài Dễ, không đủ để chọn ${reqEasy} bài. Vui lòng thêm bài hoặc giảm số lượng.`
    );
  }
  if (mediumPool.length < reqMedium) {
    throw new Error(
      `Ngân hàng môn học chỉ có ${mediumPool.length} bài Trung bình, không đủ để chọn ${reqMedium} bài.`
    );
  }
  if (hardPool.length < reqHard) {
    throw new Error(
      `Ngân hàng môn học chỉ có ${hardPool.length} bài Khó, không đủ để chọn ${reqHard} bài.`
    );
  }

  // Helper hàm bốc ngẫu nhiên k phần tử không lặp lại (Fisher-Yates shuffle)
  function sampleWithoutReplacement(array, count) {
    const copy = [...array];
    for (let i = copy.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [copy[i], copy[j]] = [copy[j], copy[i]];
    }
    return copy.slice(0, count);
  }

  const previewDistributions = [];

  if (distributionType === "CLASS") {
    // A. RANDOM CHUNG CHO CẢ LỚP: Tất cả sinh viên nhận cùng bộ bài
    const chosenEasy = sampleWithoutReplacement(easyPool, reqEasy);
    const chosenMedium = sampleWithoutReplacement(mediumPool, reqMedium);
    const chosenHard = sampleWithoutReplacement(hardPool, reqHard);
    const commonSet = [...chosenEasy, ...chosenMedium, ...chosenHard];

    students.forEach((student) => {
      previewDistributions.push({
        studentId: student.studentId,
        studentUsername: student.studentUsername,
        studentName: student.studentName,
        studentEmail: student.studentEmail,
        assignedQuestions: commonSet,
      });
    });
  } else {
    // B. RANDOM RIÊNG TỪNG SINH VIÊN: Mỗi sinh viên có bộ bài riêng, cùng cấu trúc độ khó
    students.forEach((student) => {
      const chosenEasy = sampleWithoutReplacement(easyPool, reqEasy);
      const chosenMedium = sampleWithoutReplacement(mediumPool, reqMedium);
      const chosenHard = sampleWithoutReplacement(hardPool, reqHard);
      const studentSet = [...chosenEasy, ...chosenMedium, ...chosenHard];

      previewDistributions.push({
        studentId: student.studentId,
        studentUsername: student.studentUsername,
        studentName: student.studentName,
        studentEmail: student.studentEmail,
        assignedQuestions: studentSet,
      });
    });
  }

  return {
    waitingMigration: isWaitingMigration,
    message: isWaitingMigration
      ? "Đang sử dụng ngân hàng đề mẫu chuẩn bị cho môn học (chờ migration). Thuật toán phân bổ ngẫu nhiên đã được tính toán đầy đủ cho từng sinh viên."
      : "Phát sinh ngẫu nhiên thành công từ ngân hàng bài tập thực tế.",
    courseId: Number(courseId),
    cohort,
    distributionType,
    totalStudents: students.length,
    rules: { easy: reqEasy, medium: reqMedium, hard: reqHard, total: totalRequired },
    previewDistributions,
  };
}

// ============================================================
// 5. QUẢN LÝ ĐỢT GIAO BÀI: XÁC NHẬN GIAO BÀI (TRANSACTION AN TOÀN)
// Tránh duplicate submit, lưu kết quả random cố định vào DB
// ============================================================

export async function confirmAssignmentCampaign(teacherId, campaignPayload) {
  const {
    title,
    courseId,
    cohort,
    distributionType,
    easyCount,
    mediumCount,
    hardCount,
    openTime,
    dueDate,
    allowLate,
    latePenaltyPercent,
    distributions, // Mảng kết quả random được gửi từ preview
  } = campaignPayload;

  if (!title || !title.trim()) {
    throw new Error("Tên đợt giao bài không được để trống.");
  }
  if (!openTime || !dueDate) {
    throw new Error("Thời gian mở bài và hạn nộp không được để trống.");
  }
  if (new Date(dueDate) <= new Date(openTime)) {
    throw new Error("Hạn nộp phải sau thời gian mở bài.");
  }

  const hasPerm = await checkTeacherCoursePermission(teacherId, courseId);
  if (!hasPerm) {
    throw new Error("Bạn không được phân công phụ trách môn học này.");
  }

  const tablesExist = await checkAssignmentTablesExist();
  if (!tablesExist) {
    return {
      waitingMigration: true,
      message:
        "Bảng assignment_campaign chưa được migration trên MySQL. Vui lòng áp dụng Database/31_create_assignment_management.sql khi được phê duyệt.",
    };
  }

  // Idempotency: Kiểm tra đợt giao bài trùng tên trong vòng 3 phút
  const [duplicateCheck] = await pool.query(
    `
    SELECT id
    FROM lms_moodle_source.assignment_campaign
    WHERE course_id = ?
      AND title = ?
      AND created_at >= NOW() - INTERVAL 3 MINUTE
    LIMIT 1
    `,
    [courseId, title.trim()]
  );

  if (duplicateCheck.length > 0) {
    throw new Error("Đợt giao bài có cùng tiêu đề vừa được tạo gần đây. Vui lòng không nhấn xác nhận lặp lại.");
  }

  const connection = await pool.getConnection();

  try {
    await connection.beginTransaction();

    const totalQuestions = (parseInt(easyCount, 10) || 0) + (parseInt(mediumCount, 10) || 0) + (parseInt(hardCount, 10) || 0);

    // 1. Tạo campaign
    const [campResult] = await connection.query(
      `
      INSERT INTO lms_moodle_source.assignment_campaign
      (title, course_id, cohort, distribution_type, easy_count, medium_count, hard_count, total_questions, open_time, due_date, allow_late, late_penalty_percent, status, created_by)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'OPEN', ?)
      `,
      [
        title.trim(),
        courseId,
        cohort || "K47",
        distributionType || "CLASS",
        parseInt(easyCount, 10) || 0,
        parseInt(mediumCount, 10) || 0,
        parseInt(hardCount, 10) || 0,
        totalQuestions,
        new Date(openTime),
        new Date(dueDate),
        allowLate ? 1 : 0,
        parseFloat(latePenaltyPercent) || 0.0,
        teacherId,
      ]
    );

    const campaignId = campResult.insertId;

    // 2. Chèn danh sách assignment_distribution
    const distValues = [];
    distributions.forEach((item) => {
      const studentId = item.studentId;
      const questions = item.assignedQuestions || [];

      questions.forEach((q) => {
        distValues.push([campaignId, studentId, q.id, distributionType || "CLASS"]);
      });
    });

    if (distValues.length > 0) {
      await connection.query(
        `
        INSERT INTO lms_moodle_source.assignment_distribution
        (campaign_id, student_id, assignment_bank_id, distribution_type)
        VALUES ?
        `,
        [distValues]
      );
    }

    await connection.commit();

    return {
      waitingMigration: false,
      campaignId,
      totalDistributions: distValues.length,
      message: `Đã xác nhận và giao bài thành công cho ${distributions.length} sinh viên!`,
    };
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}

// ============================================================
// 6. DANH SÁCH CÁC ĐỢT GIAO BÀI CỦA MÔN
// ============================================================

export async function getAssignmentCampaigns(teacherId, courseId) {
  const hasPerm = await checkTeacherCoursePermission(teacherId, courseId);
  if (!hasPerm) {
    throw new Error("Bạn không được phân công phụ trách môn học này.");
  }

  const tablesExist = await checkAssignmentTablesExist();
  if (!tablesExist) {
    return {
      waitingMigration: true,
      data: [],
    };
  }

  const [rows] = await pool.query(
    `
    SELECT
      c.id,
      c.title,
      c.course_id AS courseId,
      c.cohort,
      c.distribution_type AS distributionType,
      c.easy_count AS easyCount,
      c.medium_count AS mediumCount,
      c.hard_count AS hardCount,
      c.total_questions AS totalQuestions,
      c.open_time AS openTime,
      c.due_date AS dueDate,
      c.allow_late AS allowLate,
      c.status,
      c.created_at AS createdAt,
      COUNT(DISTINCT ad.student_id) AS studentCount,
      COUNT(DISTINCT asr.id) AS submittedCount
    FROM lms_moodle_source.assignment_campaign c
    LEFT JOIN lms_moodle_source.assignment_distribution ad ON ad.campaign_id = c.id
    LEFT JOIN lms_moodle_source.assignment_submission_record asr ON asr.campaign_id = c.id
    WHERE c.course_id = ?
    GROUP BY c.id
    ORDER BY c.id DESC
    `,
    [courseId]
  );

  return {
    waitingMigration: false,
    data: rows,
  };
}

// ============================================================
// 7. CHẤM ĐIỂM: DANH SÁCH BÀI NỘP CHỜ CHẤM & ĐÃ CHẤM (TẦNG OLTP NGUỒN)
// Nghiệp vụ truy vấn từ lms_moodle_source.mdl_assign_submission
// Tách biệt hoàn toàn với Data Warehouse, hỗ trợ lọc theo Môn & Khóa K45/46/47
// ============================================================

export async function getGradingSubmissions(teacherId, filters = {}) {
  const { courseId, cohort, submissionStatus, gradingStatus, search } = filters;

  // 1. Kiểm tra giảng viên
  const [teachers] = await pool.query(
    `SELECT id, username, firstname, lastname FROM lms_moodle_source.mdl_user WHERE id = ?`,
    [teacherId]
  );
  if (teachers.length === 0) {
    throw new Error("Không tìm thấy thông tin giảng viên đang thao tác.");
  }

  let courseFilter = "";
  const params = [teacherId];

  if (courseId) {
    courseFilter += " AND c.id = ?";
    params.push(courseId);
  }

  let cohortFilter = "";
  if (cohort && cohort !== "ALL") {
    const pattern = getCohortPattern(cohort);
    cohortFilter += " AND u.username LIKE ?";
    params.push(pattern);
  }

  // Truy vấn từ lms_moodle_source.mdl_assign_submission kết hợp mdl_assign, mdl_course, mdl_user
  const querySql = `
    SELECT
      s.id AS submissionId,
      s.userid AS studentId,
      s.assignment AS assignmentId,
      s.status AS submissionStatus,
      s.attemptnumber AS attemptNumber,
      s.timecreated AS submitTime,
      s.timemodified AS submitModified,
      u.username AS studentUsername,
      CONCAT(u.lastname, ' ', u.firstname) AS studentName,
      u.email AS studentEmail,
      c.id AS courseId,
      c.fullname AS courseName,
      c.shortname AS courseCode,
      a.name AS activityName,
      CAST(a.grade AS DECIMAL(5,2)) AS maxGrade,
      a.duedate AS rawDueDate,
      FROM_UNIXTIME(a.duedate, '%Y-%m-%d %H:%i') AS dueDate,
      FROM_UNIXTIME(s.timemodified, '%Y-%m-%d %H:%i') AS submitDate,
      CASE WHEN s.timemodified <= a.duedate THEN 1 ELSE 0 END AS isSubmittedOnTime,
      g.id AS gradeId,
      g.grade AS grade,
      CASE WHEN g.id IS NOT NULL AND g.grade IS NOT NULL THEN 1 ELSE 0 END AS isGraded,
      fc.commenttext AS feedback
    FROM lms_moodle_source.mdl_assign_submission s
    JOIN lms_moodle_source.mdl_assign a ON a.id = s.assignment
    JOIN lms_moodle_source.mdl_course c ON c.id = a.course
    JOIN lms_moodle_source.mdl_user u ON u.id = s.userid
    JOIN lms_moodle_source.mdl_context ctx ON ctx.instanceid = c.id AND ctx.contextlevel = 50
    JOIN lms_moodle_source.mdl_role_assignments ra ON ra.contextid = ctx.id
    JOIN lms_moodle_source.mdl_role r ON r.id = ra.roleid
    LEFT JOIN lms_moodle_source.mdl_assign_grades g ON g.assignment = s.assignment AND g.userid = s.userid AND g.attemptnumber = s.attemptnumber
    LEFT JOIN lms_moodle_source.mdl_assignfeedback_comments fc ON fc.grade = g.id
    WHERE ra.userid = ?
      AND r.shortname IN ('teacher', 'editingteacher')
      AND s.latest = 1
      ${courseFilter}
      ${cohortFilter}
    ORDER BY isGraded ASC, c.fullname ASC, u.username ASC
  `;

  const [rows] = await pool.query(querySql, params);

  // Áp dụng bộ lọc client-side cho trạng thái chấm / tìm kiếm
  let filtered = rows;

  if (gradingStatus === "UNGRADED") {
    filtered = filtered.filter((r) => Number(r.isGraded) === 0);
  } else if (gradingStatus === "GRADED") {
    filtered = filtered.filter((r) => Number(r.isGraded) === 1);
  }

  if (submissionStatus === "ONTIME") {
    filtered = filtered.filter((r) => Number(r.isSubmittedOnTime) === 1);
  } else if (submissionStatus === "LATE") {
    filtered = filtered.filter((r) => Number(r.isSubmittedOnTime) === 0);
  }

  if (search) {
    const term = search.toLowerCase();
    filtered = filtered.filter(
      (r) =>
        (r.studentName && r.studentName.toLowerCase().includes(term)) ||
        (r.studentUsername && r.studentUsername.toLowerCase().includes(term)) ||
        (r.activityName && r.activityName.toLowerCase().includes(term)) ||
        (r.courseName && r.courseName.toLowerCase().includes(term))
    );
  }

  return {
    total: filtered.length,
    ungradedCount: rows.filter((r) => Number(r.isGraded) === 0).length,
    gradedCount: rows.filter((r) => Number(r.isGraded) === 1).length,
    lateCount: rows.filter((r) => Number(r.isSubmittedOnTime) === 0).length,
    data: filtered,
  };
}

// ============================================================
// 8. CHẤM ĐIỂM CHI TIẾT & GIAO TÁC GHI VÀO CSDL NGHIỆP VỤ (TRANSACTION AN TOÀN)
// Tuyệt đối không ghi trực tiếp vào Data Warehouse như một thao tác nghiệp vụ!
// Đồng bộ sang Data Warehouse bằng ETL khi refresh.
// ============================================================

export async function submitGrading({
  teacherId,
  submissionId,
  score,
  feedback,
  isPublish = false,
  reason = "",
}) {
  const numericScore = parseFloat(score);

  if (isNaN(numericScore)) {
    throw new Error("Điểm số phải là một số hợp lệ.");
  }
  if (numericScore < 0) {
    throw new Error("Điểm số không được là số âm.");
  }

  // 1. Lấy thông tin bài nộp từ mdl_assign_submission
  const [subRows] = await pool.query(
    `
    SELECT
      s.id,
      s.assignment,
      s.userid,
      s.status,
      s.attemptnumber,
      a.course AS courseId,
      CAST(a.grade AS DECIMAL(5,2)) AS maxGrade,
      g.id AS gradeId,
      g.grade AS currentGrade,
      CASE WHEN g.id IS NOT NULL AND g.grade IS NOT NULL THEN 1 ELSE 0 END AS isGraded,
      fc.id AS feedbackId,
      fc.commenttext AS currentFeedback
    FROM lms_moodle_source.mdl_assign_submission s
    JOIN lms_moodle_source.mdl_assign a ON a.id = s.assignment
    LEFT JOIN lms_moodle_source.mdl_assign_grades g ON g.assignment = s.assignment AND g.userid = s.userid AND g.attemptnumber = s.attemptnumber
    LEFT JOIN lms_moodle_source.mdl_assignfeedback_comments fc ON fc.grade = g.id
    WHERE s.id = ?
    `,
    [submissionId]
  );

  let sub = null;
  let isMoodleSource = false;

  if (subRows.length > 0) {
    sub = subRows[0];
    isMoodleSource = true;
  } else {
    // Thử tìm trong Fact_Assignment_Submission để tương thích dữ liệu cũ
    const [factRows] = await pool.query(
      `
      SELECT
        fas.Submission_Key AS id,
        fas.Activity_Key AS assignment,
        du.Moodle_User_ID AS userid,
        fas.Submission_Status AS status,
        fas.Attempt_Number AS attemptnumber,
        dc.Moodle_Course_ID AS courseId,
        CAST(da.Max_Grade AS DECIMAL(5,2)) AS maxGrade,
        fas.Grade AS currentGrade,
        fas.Is_Graded AS isGraded,
        fas.Feedback_Comment AS currentFeedback
      FROM Fact_Assignment_Submission fas
      JOIN Dim_User du ON du.User_Key = fas.User_Key
      JOIN Dim_Course dc ON dc.Course_Key = fas.Course_Key
      JOIN Dim_Activity da ON da.Activity_Key = fas.Activity_Key
      WHERE fas.Submission_Key = ?
      `,
      [submissionId]
    );

    if (factRows.length > 0) {
      sub = factRows[0];
    } else {
      throw new Error("Không tìm thấy bài nộp chỉ định.");
    }
  }

  // 2. Ràng buộc: Không lưu điểm cho bài chưa có bài nộp hợp lệ
  if (sub.status !== "submitted") {
    throw new Error("Không thể lưu điểm khi thiếu bài nộp hợp lệ của sinh viên.");
  }

  const maxScore = Number(sub.maxGrade || 10.0);
  if (numericScore > maxScore) {
    throw new Error(`Điểm số (${numericScore}) không được vượt quá thang điểm tối đa (${maxScore}).`);
  }

  // 3. Kiểm tra phân quyền giảng viên với môn học
  const hasPerm = await checkTeacherCoursePermission(teacherId, sub.courseId);
  if (!hasPerm) {
    throw new Error("Bạn không được phân công chấm bài cho môn học này.");
  }

  // 4. Kiểm tra lý do nếu sửa điểm đã công bố
  const oldScore = sub.currentGrade !== null ? Number(sub.currentGrade) : null;
  const isAlreadyPublished = Number(sub.isGraded) === 1;

  if (isAlreadyPublished && isPublish && (!reason || !String(reason).trim())) {
    throw new Error("Bài tập này đã có điểm công bố trước đó. Vui lòng cung cấp lý do điều chỉnh điểm.");
  }

  // 5. Giao tác ghi vào OLTP nguồn lms_moodle_source
  const connection = await pool.getConnection();

  try {
    await connection.beginTransaction();

    if (isMoodleSource) {
      if (isPublish) {
        if (sub.gradeId) {
          await connection.query(
            `UPDATE lms_moodle_source.mdl_assign_grades
             SET grade = ?, timemodified = UNIX_TIMESTAMP()
             WHERE id = ?`,
            [numericScore, sub.gradeId]
          );
        } else {
          const [insGrade] = await connection.query(
            `INSERT INTO lms_moodle_source.mdl_assign_grades
             (assignment, userid, grade, timecreated, timemodified, attemptnumber)
             VALUES (?, ?, ?, UNIX_TIMESTAMP(), UNIX_TIMESTAMP(), ?)`,
            [sub.assignment, sub.userid, numericScore, sub.attemptnumber || 0]
          );
          sub.gradeId = insGrade.insertId;
        }

        if (sub.feedbackId) {
          await connection.query(
            `UPDATE lms_moodle_source.mdl_assignfeedback_comments
             SET commenttext = ?
             WHERE id = ?`,
            [feedback || "", sub.feedbackId]
          );
        } else if (sub.gradeId) {
          await connection.query(
            `INSERT INTO lms_moodle_source.mdl_assignfeedback_comments
             (assignment, grade, commenttext)
             VALUES (?, ?, ?)`,
            [sub.assignment, sub.gradeId, feedback || ""]
          );
        }
      }
    }

    // 6. Ghi Audit Log nếu có bảng assignment_grade_history
    const tablesExist = await checkAssignmentTablesExist();
    if (tablesExist) {
      try {
        await connection.query(
          `
          INSERT INTO lms_moodle_source.assignment_grade_history
          (submission_id, old_score, new_score, old_feedback, new_feedback, change_reason, changed_by)
          VALUES (?, ?, ?, ?, ?, ?, ?)
          `,
          [
            submissionId,
            oldScore,
            numericScore,
            sub.currentFeedback || "",
            feedback || "",
            reason || (isAlreadyPublished ? "Giảng viên điều chỉnh điểm số" : "Chấm bài lần đầu"),
            teacherId,
          ]
        );
      } catch (auditErr) {
        console.warn("Không thể ghi log audit lịch sử điểm:", auditErr.message);
      }
    }

    await connection.commit();
  } catch (err) {
    await connection.rollback();
    throw err;
  } finally {
    connection.release();
  }

  return {
    success: true,
    submissionId,
    score: numericScore,
    isGraded: isPublish ? 1 : 0,
    status: isPublish ? "PUBLISHED" : "DRAFT_GRADED",
    message: isPublish ? "Đã xác nhận và công bố điểm thành công." : "Đã lưu nháp kết quả chấm.",
  };
}
