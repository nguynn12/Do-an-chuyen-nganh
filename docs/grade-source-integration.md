# Nguồn điểm LMS và nhập Excel

Luồng hiện có:
- Nguồn Moodle trong MySQL `lms_moodle_source.mdl_grade_items` / `mdl_grade_grades` → `lms_datawarehouse.Fact_Course_Grade` → API → bảng điểm giảng viên.
- File `.xlsx` / `.csv` → kiểm tra, xem trước → xác nhận nhập → `fact_teacher_grade_score`, `web_grade_confirmation` và `web_grade_import_log` trong MySQL → bảng điểm giảng viên.

Backend đang chạy sẽ đồng bộ các đầu điểm đã liên kết mỗi 30 giây. Trang đang mở kiểm tra mỗi 15 giây. Một lần chọn nguồn được áp dụng cho toàn bộ môn; không tự đoán Quiz nào là Giữa kỳ/Cuối kỳ.

Mở **Nguồn điểm LMS & nhập Excel** trong nhóm điểm. Chọn đầu điểm nhận dữ liệu. Với LMS, chọn bài đúng môn rồi **Liên kết và dùng điểm LMS**. Bước này bỏ bản điều chỉnh cũ của riêng đầu điểm đó để dùng nguồn LMS. Với đầu điểm mới, có thể **Tạo đầu điểm trong SQL** trước (trọng số ban đầu 0%), sau đó liên kết LMS hoặc nhập Excel.

Với Excel: tải mẫu của môn, điền các cột `MSSV`, `Diem`, `DiemToiDa` (mặc định 10). MSSV dùng đúng Username đã điền sẵn. Tối đa 1000 dòng và 2MB, sheet Diem. Điểm trống được bỏ qua; điểm 0 là điểm hợp lệ. File có dòng lỗi không được nhập. Bấm **Kiểm tra & xem trước**, rồi **Nhập ... điểm vào SQL**. Điểm được quy đổi sang thang 10 và lưu theo từng đầu điểm/sinh viên; giữ nguyên bảng nguồn Moodle.

Điểm Web đã chỉnh hoặc nhập Excel được đánh dấu riêng và không bị tác vụ LMS ghi đè. Khi điểm nguồn thay đổi mà bản lưu chỉ là bản sao điểm LMS cũ, bản lưu được cập nhật và hủy xác nhận nhóm/tổng kết liên quan. Điểm nháp đang nhập trên Web được giữ khi làm mới dữ liệu nền. Bản ghi thiếu điểm vẫn là NULL, không đổi thành 0.

Bảng bổ sung: chạy `node scripts/migrate_grade_ingestion.mjs` trong backend để tạo `web_grade_ingest_state` và `web_grade_import_log` (đã chạy trên máy hiện tại). Cần giữ backend chạy để tác vụ nền hoạt động.

Phạm vi kết nối: dùng nguồn Moodle/MySQL đã có trong đồ án. Chưa tạo kết nối REST tới một Moodle ở địa chỉ riêng; nếu nguồn này là bản sao, việc đưa dữ liệu từ máy chủ Moodle thật vào bản sao vẫn phải được cấu hình ở lớp nguồn. Trang SinhVien hiện tại là cổng phân tích, chưa có luồng làm/chấm Quiz mới trong phạm vi thay đổi này.

Power BI dùng Import nên vẫn cần Refresh semantic model để nhận các bản ghi/đầu điểm mới. Tự đồng bộ MySQL và bảng Web không đồng nghĩa refresh Power BI Service tức thì.

Kiểm thử: `node test_grade_ingestion.mjs` kiểm tra MySQL thật trong transaction rollback; gồm nguồn LMS, NULL, thang100, giữ override, XLSX/CSV, điểm0, MSSV sai/trùng, ô công thức, file thay đổi sau preview, ghi SQL và audit, quyền truy cập. `node test_grade_persistence.mjs` kiểm tra luồng lưu nhóm/tổng kết cũ. Giao diện đã được kiểm tra đồng bộ không mất điểm nhập dở và xem trước file; không nhập file thử vào dữ liệu sinh viên thực tế.
