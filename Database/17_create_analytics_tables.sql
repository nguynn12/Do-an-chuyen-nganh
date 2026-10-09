-- ============================================================
-- SCRIPT TẠO BẢNG CHỨA KẾT QUẢ PHÂN TÍCH TỔNG HỢP VÀ CẢNH BÁO SỚM
-- Phục vụ Power BI Analytics và LMS Backend API
-- ============================================================

USE lms_datawarehouse;

-- 1. BẢNG KẾT QUẢ TƯƠNG QUAN PEARSON GIỮA CÁC YẾU TỐ VÀ ĐIỂM SỐ
CREATE TABLE IF NOT EXISTS Correlation_Result (
  Course_Key INT NOT NULL,
  Factor VARCHAR(50) NOT NULL,
  R DECIMAL(6,4) NULL,
  N INT NOT NULL,
  Computed_At DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (Course_Key, Factor),
  INDEX idx_corr_course (Course_Key),
  CONSTRAINT fk_corr_course FOREIGN KEY (Course_Key) REFERENCES Dim_Course(Course_Key) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 2. BẢNG ĐÁNH GIÁ ĐỘ CHÍNH XÁC CẢNH BÁO SỚM THEO TUẦN (TASK 7)
CREATE TABLE IF NOT EXISTS Early_Warning_Eval (
  Course_Key INT NOT NULL,
  User_Key INT NOT NULL,
  Week_N INT NOT NULL,
  Risk_Score INT NOT NULL,
  Predicted_At_Risk TINYINT(1) NOT NULL,
  Actual_Failed TINYINT(1) NOT NULL,
  Computed_At DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (Course_Key, User_Key, Week_N),
  INDEX idx_eval_course_week (Course_Key, Week_N),
  INDEX idx_eval_user (User_Key),
  CONSTRAINT fk_eval_course FOREIGN KEY (Course_Key) REFERENCES Dim_Course(Course_Key) ON DELETE CASCADE,
  CONSTRAINT fk_eval_user FOREIGN KEY (User_Key) REFERENCES Dim_User(User_Key) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
