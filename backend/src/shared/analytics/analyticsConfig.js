/**
 * Cấu hình các hằng số, trọng số và ngưỡng phục vụ tính toán chỉ số hành vi,
 * phân khúc và cảnh báo sớm trong hệ thống LMS Analytics.
 */

// Trọng số tính Điểm tham gia (Participation Score: 0 - 100)
export const PARTICIPATION_WEIGHTS = {
  onTime: 0.4,      // Tỷ lệ nộp bài đúng hạn
  engagement: 0.3,  // Giờ học tương tác chuẩn hóa theo lớp (0-1)
  grade: 0.3,       // Điểm trung bình chuẩn hóa (0-1)
};

// Trọng số tính Điểm rủi ro (Risk Score: 0 - 100)
// Chừa sẵn slot 'absent' và 'quizDrop' (giá trị 0 khi chưa có nguồn dữ liệu trong DW)
export const RISK_WEIGHTS = {
  lateSubmit: 0.35,     // Hay nộp bài trễ hạn
  inactive: 0.30,       // Lâu không hoạt động trên hệ thống
  gradeDrop: 0.20,      // Điểm gần đây giảm so với trước đó
  lowEngagement: 0.15,  // Giờ học thấp đáng kể so với mức trung bình lớp
  absent: 0.0,          // Vắng học liên tiếp (chưa có dữ liệu điểm danh)
  quizDrop: 0.0,        // Điểm quiz sụt giảm (chưa có dữ liệu quiz chi tiết)
};

// Các ngưỡng chuẩn đoán (Thresholds)
export const INACTIVE_DAYS = 14;        // Số ngày không hoạt động bị coi là rủi ro (>= 14 ngày)
export const LATE_RATE = 0.5;           // Tỷ lệ nộp đúng hạn dưới 50% bị cảnh báo nộp trễ
export const GRADE_DROP_POINTS = 10;    // Điểm sụt giảm >= 10% giữa các giai đoạn
export const LEAD_BUCKETS_HOURS = [0, 24, 72]; // Mốc chia bucket (giờ): <0 (Trễ), 0-24h (Dưới 24h), 24-72h (1-3 ngày), >72h (Sớm >3 ngày)

// Phân loại mức độ rủi ro (Risk Level)
export const RISK_LEVEL_THRESHOLDS = {
  high: 60,     // Điểm rủi ro >= 60: Cao
  medium: 30,   // Điểm rủi ro 30 - 59: Trung bình, < 30: Thấp
};

// Ngưỡng cảnh báo sớm (Early Warning)
export const EARLY_WARNING_THRESHOLD = 30; // Điểm rủi ro >= 30 được phân loại là có nguy cơ (Predicted_At_Risk = 1)
export const EARLY_WARNING_FAIL_GRADE_PCT = 70; // Ngưỡng điểm TB môn < 70% để xác định kết quả thực tế không đạt (Actual_Failed = 1)
export const EARLY_WARNING_WEEKS = [2, 3, 4, 6, 8]; // Các mốc tuần đánh giá mô hình cảnh báo sớm

// Nhãn phân loại nộp bài (Submit Style)
export const SUBMIT_STYLES = {
  LATE: "Hay trễ hạn",
  LAST_MINUTE: "Nước rút phút chót",
  REGULAR: "Làm đều",
  EARLY: "Làm sớm",
  NO_DATA: "Chưa có dữ liệu",
};

// Nhãn phân khúc sinh viên 2x2 (Segments)
export const SEGMENT_LABELS = {
  HIGH_PARTICIPATION_HIGH_GRADE: "Chăm & giỏi",
  HIGH_PARTICIPATION_LOW_GRADE: "Chăm nhưng điểm thấp",
  LOW_PARTICIPATION_HIGH_GRADE: "Ít tham gia nhưng điểm cao",
  LOW_PARTICIPATION_LOW_GRADE: "Nguy cơ cao",
};

