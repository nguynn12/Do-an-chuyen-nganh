-- ============================================================
-- 31_seed_assignment_bank_optional.sql
-- FILE SEED DỮ LIỆU TÙY CHỌN CHO NGÂN HÀNG BÀI TẬP (36 BÀI TẬP THỰC TẾ)
-- Database: lms_moodle_source
-- LƯU Ý: ĐÂY LÀ FILE SEED TÙY CHỌN, KHÔNG CHẠY TỰ ĐỘNG KHI MIGRATION.
-- CHỈ CHẠY KHI ĐƯỢC PHÊ DUYỆT CẦN NẠP BỘ CÂU HỎI MẪU CHO MÔN HỌC 101-106.
-- ============================================================

USE lms_moodle_source;

INSERT IGNORE INTO assignment_bank (id, course_id, title, content, topic, difficulty, max_score, grading_guide, status, created_by)
VALUES
-- Môn 101: Cơ sở dữ liệu (Giảng viên: Nguyễn An - ID 1)
(1001, 101, 'Truy vấn SQL kết hợp JOIN nhiều bảng', 'Viết câu lệnh SQL truy vấn thông tin sinh viên, điểm trung bình và môn học tương ứng từ 3 bảng Users, Enrolments, Courses.', 'Chương 3: Ngôn ngữ SQL', 'EASY', 10.00, 'Đúng cú pháp SELECT, INNER JOIN: 6đ. GROUP BY và aggregate: 4đ.', 'ACTIVE', 1),
(1002, 101, 'Tối ưu hóa chỉ mục Index trong MySQL', 'Phân tích câu lệnh EXPLAIN trên bảng Fact_Assignment_Submission và đề xuất Index phù hợp để tăng tốc độ tìm kiếm.', 'Chương 4: Tối ưu hóa truy vấn', 'MEDIUM', 10.00, 'Giải thích kết quả EXPLAIN: 4đ. Đề xuất Index đúng: 6đ.', 'ACTIVE', 1),
(1003, 101, 'Thiết kế lược đồ quan hệ chuẩn 3NF', 'Cho bảng hóa đơn bán hàng bán lẻ chưa chuẩn hóa. Hãy phân rã thành các bảng đạt dạng chuẩn 3NF và vẽ lược đồ ERD.', 'Chương 2: Thiết kế CSDL', 'MEDIUM', 10.00, 'Xác định phụ thuộc hàm: 3đ. Đạt 2NF: 3đ. Đạt 3NF: 4đ.', 'ACTIVE', 1),
(1004, 101, 'Xây dựng Stored Procedure và Transaction', 'Viết Stored Procedure xử lý giao tác ghi danh môn học có kiểm tra sĩ số tối đa và ROLLBACK nếu vượt quá.', 'Chương 5: Lập trình CSDL', 'HARD', 10.00, 'Đúng cú pháp Procedure: 3đ. Xử lý Transaction/Rollback chuẩn: 7đ.', 'ACTIVE', 1),
(1005, 101, 'Trigger kiểm tra ràng buộc toàn vẹn', 'Tạo Trigger BEFORE INSERT trên bảng điểm số để ngăn chặn việc nhập điểm âm hoặc lớn hơn 10.', 'Chương 5: Lập trình CSDL', 'EASY', 10.00, 'Viết đúng Trigger: 10đ.', 'ACTIVE', 1),
(1006, 101, 'Phân vùng bảng Partitioning cho Big Data', 'Trình bày và thực thi giải pháp RANGE Partitioning cho bảng log hệ thống theo từng tháng.', 'Chương 6: CSDL nâng cao', 'HARD', 10.00, 'Lý thuyết phân vùng: 3đ. Script thực thi phân vùng: 7đ.', 'ACTIVE', 1),

-- Môn 102: Lập trình Web (Giảng viên: Nguyễn An - ID 1)
(1007, 102, 'Xây dựng bố cục Responsive với Flexbox và Grid', 'Xây dựng trang giao diện danh sách khóa học tương thích cả màn hình Desktop và Mobile bằng CSS Grid/Flexbox.', 'Bài 2: CSS Layout', 'EASY', 10.00, 'Đúng Responsive: 5đ. Thẩm mỹ và sạch sẽ: 5đ.', 'ACTIVE', 1),
(1008, 102, 'Tạo RESTful API CRUD sản phẩm với ExpressJS', 'Viết đầy đủ các endpoint GET, POST, PUT, DELETE cho quản lý danh mục sản phẩm có validate dữ liệu.', 'Bài 5: NodeJS Backend', 'MEDIUM', 10.00, 'Đủ 4 method: 6đ. Xử lý mã lỗi HTTP chuẩn: 4đ.', 'ACTIVE', 1),
(1009, 102, 'Xác thực người dùng với JSON Web Token (JWT)', 'Cài đặt middleware xác thực Token JWT và bảo vệ các private route trong ứng dụng ExpressJS.', 'Bài 6: Bảo mật Web', 'HARD', 10.00, 'Tạo token: 3đ. Middleware verify: 4đ. Xử lý hết hạn token: 3đ.', 'ACTIVE', 1),
(1010, 102, 'Xử lý Form tương tác với JavaScript Fetch API', 'Tạo form đăng ký và gửi dữ liệu không tải lại trang bằng Fetch API, hiển thị thông báo lỗi trực quan.', 'Bài 3: JavaScript DOM', 'EASY', 10.00, 'Ngăn chặn submit mặc định: 3đ. Gọi Fetch API: 4đ. Hiển thị thông báo: 3đ.', 'ACTIVE', 1),
(1011, 102, 'Tích hợp Upload File và Lưu trữ', 'Cài đặt Multer để nhận file ảnh đại diện sinh viên và lưu vào thư mục public của server.', 'Bài 7: Upload File', 'MEDIUM', 10.00, 'Cấu hình Multer: 5đ. Validate định dạng file: 5đ.', 'ACTIVE', 1),
(1012, 102, 'Phòng chống tấn công SQL Injection và XSS', 'Phân tích các lỗ hổng SQLi và XSS trong mã nguồn mẫu và viết lại code an toàn bằng Parameterized Query.', 'Bài 8: An toàn ứng dụng Web', 'HARD', 10.00, 'Chỉ ra lỗ hổng: 4đ. Khắc phục triệt để: 6đ.', 'ACTIVE', 1),

-- Môn 103: Game nâng cao (Giảng viên: Trần Bình - ID 2)
(1013, 103, 'Cài đặt Rigidbody và Va chạm vật lý', 'Tạo nhân vật di chuyển 2D có nhảy và xử lý va chạm với chướng ngại vật bằng Physics2D.', 'Chương 2: Vật lý Game', 'EASY', 10.00, 'Di chuyển mượt: 5đ. Va chạm chính xác: 5đ.', 'ACTIVE', 2),
(1014, 103, 'Thuật toán tìm đường A* cho NPC', 'Lập trình thuật toán A* trên lưới ô vuông để quái vật tự động tìm đường đến vị trí người chơi.', 'Chương 4: Trí tuệ nhân tạo Game', 'HARD', 10.00, 'Cài đặt đúng Heuristic: 4đ. Tránh chướng ngại vật: 6đ.', 'ACTIVE', 2),
(1015, 103, 'Xây dựng hệ thống UI và Menu Game', 'Thiết kế Main Menu, Pause Menu và hiển thị thanh máu HP cập nhật theo thời gian thực.', 'Chương 3: Giao diện Game', 'EASY', 10.00, 'Giao diện trực quan: 5đ. Sự kiện nút bấm: 5đ.', 'ACTIVE', 2),
(1016, 103, 'Quản lý trạng thái State Machine cho Boss', 'Xây dựng Finite State Machine quản lý 3 trạng thái của Boss: Patrol, Chase, và Attack.', 'Chương 5: Game Architecture', 'MEDIUM', 10.00, 'Tách state rõ ràng: 5đ. Chuyển đổi trạng thái đúng logic: 5đ.', 'ACTIVE', 2),
(1017, 103, 'Tối ưu hóa hiệu năng Draw Calls trong Scene', 'Sử dụng Sprite Atlas và Object Pooling để tối ưu số lượng Draw Calls khi spawn nhiều đạn.', 'Chương 6: Tối ưu hiệu năng', 'MEDIUM', 10.00, 'Cài đặt Object Pool: 6đ. Giảm Draw Calls: 4đ.', 'ACTIVE', 2),
(1018, 103, 'Xây dựng Shader đồ họa tùy chỉnh HLSL', 'Viết Shader hiệu ứng phát sáng Hologram cho nhân vật khi nhặt được vật phẩm đặc biệt.', 'Chương 7: Đồ họa nâng cao', 'HARD', 10.00, 'Shader biên dịch tốt: 5đ. Hiệu ứng thị giác đẹp: 5đ.', 'ACTIVE', 2),

-- Môn 104: Trí tuệ nhân tạo (Giảng viên: Trần Bình - ID 2)
(1019, 104, 'Cài đặt thuật toán tìm kiếm Minimax', 'Lập trình thuật toán Minimax có tỉa cành Alpha-Beta cho trò chơi Cờ caro (Tic-tac-toe).', 'Chương 2: Tìm kiếm đối kháng', 'MEDIUM', 10.00, 'Minimax cơ bản: 5đ. Tỉa cành Alpha-Beta: 5đ.', 'ACTIVE', 2),
(1020, 104, 'Phân loại ảnh chữ số viết tay với KNN', 'Sử dụng thuật toán K-Nearest Neighbors để phân loại tập dữ liệu chữ số MNIST, đánh giá Accuracy.', 'Chương 3: Machine Learning', 'EASY', 10.00, 'Tiền xử lý ảnh: 4đ. Huấn luyện và đánh giá: 6đ.', 'ACTIVE', 2),
(1021, 104, 'Xây dựng mạng nơ-ron Perceptron từ đầu', 'Viết thuật toán lan truyền xuôi và lan truyền ngược (Backpropagation) cho mạng MLP không dùng thư viện ngoài.', 'Chương 4: Deep Learning', 'HARD', 10.00, 'Tính toán đạo hàm: 4đ. Cập nhật Gradient Descent: 6đ.', 'ACTIVE', 2),
(1022, 104, 'Thuật toán di truyền Genetic Algorithm', 'Giải bài toán người đưa thư (TSP) cho 20 thành phố bằng thuật toán di truyền Genetic Algorithm.', 'Chương 5: Giải thuật di truyền', 'MEDIUM', 10.00, 'Cơ chế đột biến/lai ghép: 5đ. Hội tụ kết quả tốt: 5đ.', 'ACTIVE', 2),
(1023, 104, 'Xử lý ngôn ngữ tự nhiên cơ bản TF-IDF', 'Trích xuất đặc trưng văn bản bằng TF-IDF và phân loại cảm xúc tích cực/tiêu cực của bình luận.', 'Chương 6: NLP', 'EASY', 10.00, 'Tính đúng TF-IDF: 6đ. Phân loại cảm xúc: 4đ.', 'ACTIVE', 2),
(1024, 104, 'Mô hình học tăng cường Q-Learning', 'Huấn luyện Agent tìm đường ra khỏi mê cung bằng thuật toán Q-Learning với bảng phần thưởng Q-Table.', 'Chương 7: Reinforcement Learning', 'HARD', 10.00, 'Hàm cập nhật Bellman: 5đ. Agent tìm đường tối ưu: 5đ.', 'ACTIVE', 2),

-- Môn 105: Phát triển Web nâng cao (Giảng viên: Trần Bình - ID 2)
(1025, 105, 'Quản lý trạng thái toàn cục với Redux Toolkit', 'Cài đặt Redux Toolkit để quản lý giỏ hàng, tính tổng tiền và lưu vào LocalStorage.', 'Chương 2: State Management', 'MEDIUM', 10.00, 'Slice & Actions chuẩn: 5đ. Đồng bộ LocalStorage: 5đ.', 'ACTIVE', 2),
(1026, 105, 'Tối ưu hiệu năng React với useMemo và useCallback', 'Phân tích re-render trong danh sách 10,000 phần tử và áp dụng Memoization để tránh lag.', 'Chương 3: Performance Tuning', 'EASY', 10.00, 'Chỉ ra nguyên nhân re-render: 4đ. Áp dụng đúng hook: 6đ.', 'ACTIVE', 2),
(1027, 105, 'Xây dựng tính năng Realtime với Socket.IO', 'Cài đặt phòng chat trực tuyến giữa giảng viên và sinh viên có thông báo gõ phím (typing).', 'Chương 4: Realtime Web', 'HARD', 10.00, 'Kết nối Socket ổn định: 4đ. Sự kiện phòng chat: 6đ.', 'ACTIVE', 2),
(1028, 105, 'Thiết kế Custom Hook tái sử dụng', 'Viết custom hook useFetch hỗ trợ AbortController, cache dữ liệu và tự động thử lại khi mất mạng.', 'Chương 2: React Hooks', 'EASY', 10.00, 'Hook xử lý loading/error: 5đ. Hỗ trợ hủy request: 5đ.', 'ACTIVE', 2),
(1029, 105, 'Server-Side Rendering (SSR) với Next.js', 'Chuyển đổi trang chi tiết sản phẩm sang SSR trong Next.js để tối ưu SEO và thời gian First Paint.', 'Chương 5: Next.js & SSR', 'MEDIUM', 10.00, 'Cấu hình getServerSideProps: 5đ. Tối ưu SEO metadata: 5đ.', 'ACTIVE', 2),
(1030, 105, 'Triển khai CI/CD và Docker hóa ứng dụng', 'Viết Dockerfile đa tầng (Multi-stage build) và kịch bản GitHub Actions tự động kiểm thử và build ảnh Docker.', 'Chương 6: DevOps cho Web', 'HARD', 10.00, 'Dockerfile tối ưu dung lượng: 5đ. Script CI/CD chạy thành công: 5đ.', 'ACTIVE', 2),

-- Môn 106: Kiểm thử phần mềm (Giảng viên: Trần Bình - ID 2)
(1031, 106, 'Thiết kế bảng quyết định Decision Table', 'Thiết kế bảng quyết định kiểm thử chức năng tính tiền cước vận chuyển dựa trên khối lượng và cự ly.', 'Chương 2: Hộp đen Testing', 'EASY', 10.00, 'Lập đủ quy tắc: 5đ. Rút gọn bảng quyết định: 5đ.', 'ACTIVE', 2),
(1032, 106, 'Viết Unit Test với Jest và Mock Function', 'Viết bộ kiểm thử đơn vị bao phủ 100% chi nhánh rẽ (Branch Coverage) cho module tính điểm trung bình.', 'Chương 3: Unit Testing', 'MEDIUM', 10.00, 'Test cases đầy đủ: 6đ. Dùng mock đúng cách: 4đ.', 'ACTIVE', 2),
(1033, 106, 'Kiểm thử tự động End-to-End với Cypress', 'Viết kịch bản Cypress tự động đăng nhập hệ thống, nộp bài tập và kiểm tra thông báo thành công.', 'Chương 5: Automation Testing', 'HARD', 10.00, 'Script chạy mượt mà: 6đ. Xử lý selector và async chuẩn: 4đ.', 'ACTIVE', 2),
(1034, 106, 'Phân tích giá trị biên Boundary Value Analysis', 'Xác định các giá trị kiểm thử biên cho trường nhập tuổi sinh viên hợp lệ từ 18 đến 60 tuổi.', 'Chương 2: Kỹ thuật kiểm thử', 'EASY', 10.00, 'Đủ các giá trị biên min, min+, nom, max-, max: 10đ.', 'ACTIVE', 2),
(1035, 106, 'Kiểm thử hiệu năng tải với Apache JMeter', 'Tạo kịch bản kiểm thử tải mô phỏng 200 sinh viên đồng thời truy cập xem điểm trong 30 giây.', 'Chương 4: Performance Testing', 'MEDIUM', 10.00, 'Cấu hình Thread Group: 5đ. Phân tích báo cáo thông lượng: 5đ.', 'ACTIVE', 2),
(1036, 106, 'Kiểm thử bảo mật tự động với OWASP ZAP', 'Quét lỗ hổng bảo mật trên website cục bộ và lập báo cáo phân loại mức độ nghiêm trọng.', 'Chương 6: Security Testing', 'HARD', 10.00, 'Quét thành công: 4đ. Báo cáo đề xuất khắc phục: 6đ.', 'ACTIVE', 2);
