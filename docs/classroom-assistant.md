# Trợ lý AI hội thoại lớp học

## Phiên bản hội thoại trực tiếp

`POST /api/ai/assistant/chat` dùng `classroomConversationService.js`. Mọi câu hỏi đều do Groq xử lý; không dùng bộ phân loại từ khóa hoặc câu trả lời mẫu để chặn câu hỏi. Thầy cô có thể hỏi kiến thức chung, nhờ giải thích, soạn bài và hỏi tiếp dựa trên ngữ cảnh.

- Groq tự chọn gọi công cụ `get_classroom_statistics` khi cần dữ liệu lớp. Công cụ chỉ đọc đúng môn đã qua `requireCourseTeacher`; không nhận SQL hoặc course ID do model đề xuất.
- Công cụ hỗ trợ bài tập, thiếu bài, Quiz, chủ đề và điểm tích lũy. Công cụ khác chưa có thì AI phải nói rõ; không có quyền tự gửi email, sửa dữ liệu hoặc truy cập Internet.
- UI hiển thị lời trả lời tự nhiên từ model. Biểu đồ và liên kết vẫn dựng từ dữ liệu và route thật trong backend.
- Hội thoại lưu trong bộ nhớ backend tối đa 30 phút, tối đa 5 lượt gần nhất được đưa vào ngữ cảnh (có cắt ngắn để tiết kiệm token). ID hội thoại gắn giảng viên + môn + kỳ, không dùng chéo tài khoản. Đổi môn/kỳ hoặc chọn cuộc trò chuyện mới sẽ dùng ID mới. Khởi động lại backend sẽ mất lịch sử.
- Câu hỏi và ngữ cảnh chat gửi tới Groq. Công cụ chỉ gửi chỉ số tổng hợp, không gửi hồ sơ, tên, email, ID sinh viên hoặc dòng điểm cá nhân. Nội dung người dùng tự nhập vẫn được gửi như một câu hỏi nên tránh nhập thông tin cá nhân nhạy cảm.
- Cache chỉ dữ liệu công cụ trong 60 giây; lời trả lời không lấy từ mẫu/cache câu hỏi. Giới hạn 12 câu hỏi/phút và một yêu cầu đang chạy trên cùng giảng viên/môn/kỳ.
- Groq lỗi hoặc hết quota: hiển thị lỗi rõ, không thay bằng câu trả lời giả mang nhãn AI.

## Phạm vi dữ liệu

Bài tập đối chiếu ghi danh Moodle; khi thiếu toàn bộ phân vai trò lớp, chỉ đối chiếu với người có vai trò Student rõ ràng trong kho, đồng thời loại người có vai trò dạy/quản lý trong lớp. UI cảnh báo nguồn đối chiếu.

Bài tập lọc theo hạn nộp, trạng thái là hiện tại, không tái tạo ảnh chụp cuối tuần trước. Quiz lọc `Attempt_Finish`. Điểm là tích lũy đã chuẩn hóa theo sinh viên, không phải điểm chính thức hay điểm trong tuần. Tuần tính từ thứ Hai theo GMT+7. Power BI mở đúng môn nhưng người dùng cần chọn thời gian trong báo cáo.

## Kiểm tra

Trong `backend`:

```powershell
node test_classroom_conversation.mjs
node test_classroom_conversation.mjs --synthetic
node test_classroom_chat.mjs
node test_classroom_chat.mjs --dbsnapshot
```

`--synthetic` kiểm tra Groq thật với kiến thức lập trình và lựa chọn công cụ giả lập; không gửi số liệu LMS thật. `--dbsnapshot` kiểm tra truy vấn thật trong máy với provider giả lập.

Phép thử gửi số liệu thật ra Groq từng bị auto-review từ chối vì cần xác nhận riêng. Không chạy `--http --live` trước khi được xác nhận. Bộ xử lý cũ trong `classroomAssistantService.js` còn dùng cho kiểm tra tổng hợp/dựng biểu đồ; không còn điều khiển câu trả lời chat.

## Thống kê theo sinh viên và đối chiếu Power BI

`studentAssignmentStatsService.js` dùng chung định nghĩa với bảng tính DAX `StudentAssignmentStatus` được kiểm tra trong `backups/grade-sync-20261104-115054/model-before.bim`: ghi danh Active phân biệt người dùng × Dim_Activity hiển thị thuộc assign/assignment. Bất kỳ lượt submitted nào thắng draft. Chưa ghi nhận = không có submitted, gồm cả draft. Không cộng số lần nộp thành số bài, không đưa người ngoài ghi danh vào mẫu số.

Tổng hợp bài tập và bảng xếp hạng chat đều dùng kết quả này. Topic `missing` đưa bảng tên/mã/số bài/đã nộp/chưa ghi nhận/bản nháp (tối đa 50 người) về UI. Groq chỉ nhận highestMissing, tiedLeaders, studentsWithMissing, draftPairs; tên và mã sinh viên không gửi lên model.

Link báo cáo có cohort=ALL, trang Analytics đọc bộ lọc URL này để tránh mặc định K47. Thời gian trong Power BI vẫn chọn trong báo cáo. Chưa xác minh hay tự refresh model đang publish trên Service; không khẳng định snapshot Service đã khớp DB. Các measure chỉ đếm bản nháp phải đối chiếu riêng, không coi là tổng chưa ghi nhận.

Kiểm tra bằng `node test_student_assignment_stats.mjs --db` trong backend, chỉ đọc database, dùng model giả lập. Không thay đổi bản ghi database trong đợt nối công cụ này.
