# Lịch giảng dạy

Trang `/lich` và bảng Quản lý lịch ở Tổng quan dùng chung dữ liệu `Teacher_Schedule` và cùng component quản lý.

## Cài đặt

Với database có sẵn, chạy trong thư mục `backend`:

```powershell
node scripts/migrate_schedule_planning.mjs
```

Script chỉ bổ sung cột còn thiếu: `End_Time`, `Location`, `Meeting_Url`, `Series_ID`. Chạy lại được, giữ lịch cũ. Cài mới dùng định nghĩa bảng trong `Database/14_create_teacher_schedule.sql`.

## Cách hoạt động

- Xem tháng hoặc tuần, tìm theo tên/ghi chú/địa điểm, lọc loại lịch.
- Chọn ngày để tạo, sửa, nhân bản hoặc xóa một buổi. Nhân bản mở bản nháp để chọn ngày và giờ trước khi lưu.
- Giờ kết thúc phải sau giờ bắt đầu trong cùng ngày. Không có giờ bắt đầu là lịch cả ngày; có giờ bắt đầu nhưng chưa có giờ kết thúc được kiểm tra trùng tại thời điểm bắt đầu.
- Lặp hằng tuần đến ngày chọn, tối đa một năm. Mỗi buổi là một dòng riêng, cùng `Series_ID`. Toàn bộ chuỗi được lưu trong một transaction.
- Kiểm tra trùng giờ dựa trên lịch tự tạo của cùng giảng viên, áp dụng cho tất cả ngày trong chuỗi. Hai buổi nối tiếp không bị coi là trùng. Mặc định từ chối; người dùng có thể xác nhận cho phép trùng giờ.
- Khóa giảng viên trong transaction để tuần tự hóa các lần lưu đồng thời. Hạn nộp nguồn LMS chỉ đọc, không tham gia kiểm tra xung đột giờ dạy.
- Chỉnh sửa/xóa chỉ áp dụng buổi được chọn. Chưa có chỉnh sửa/xóa toàn chuỗi hoặc lặp nhiều thứ trong tuần.
- Email nhắc lịch hiện có đọc từng buổi có giờ; không tạo thêm bộ gửi email. Địa điểm/link được thêm vào thông báo. Không gửi email cho sự kiện cả ngày.
- Xuất `.ics` theo bộ lọc có giờ kết thúc, địa điểm và link online. Đây là xuất file, không tự đồng bộ hai chiều với ứng dụng lịch.

## Kiểm tra

```powershell
cd backend
node test_schedule_planning.mjs
node test_schedule_planning.mjs --db
```

Kiểm tra MySQL dùng dữ liệu năm 2099 và dọn bằng marker riêng trong `finally`. Không gửi email thử. Sau đó chạy build giao diện từ root bằng `npm run build:gv`.
