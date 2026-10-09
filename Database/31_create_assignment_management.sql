-- ============================================================
-- 31_create_assignment_management.sql
-- HỆ THỐNG QUẢN LÝ BÀI TẬP, GIAO BÀI NGẪU NHIÊN VÀ CHẤM ĐIỂM LMS
-- Database: lms_moodle_source (Tầng nghiệp vụ OLTP)
-- Thiết kế độc lập, bảo toàn dữ liệu, an toàn khi chạy lại
-- Lưu ý: Không tắt FOREIGN_KEY_CHECKS, tạo theo đúng thứ tự phụ thuộc
-- ============================================================

USE lms_moodle_source;

-- ============================================================
-- 1. BẢNG NGÂN HÀNG BÀI TẬP (ASSIGNMENT BANK)
-- Phụ thuộc: mdl_course, mdl_user
-- ============================================================

CREATE TABLE IF NOT EXISTS assignment_bank (
    id BIGINT NOT NULL AUTO_INCREMENT,
    course_id BIGINT NOT NULL,
    title VARCHAR(255) NOT NULL,
    content TEXT NOT NULL,
    topic VARCHAR(150) NOT NULL,
    difficulty ENUM('EASY', 'MEDIUM', 'HARD') NOT NULL DEFAULT 'MEDIUM',
    max_score DECIMAL(5,2) NOT NULL DEFAULT 10.00,
    grading_guide TEXT NULL,
    status ENUM('DRAFT', 'ACTIVE', 'ARCHIVED') NOT NULL DEFAULT 'ACTIVE',
    created_by BIGINT NOT NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    PRIMARY KEY (id),
    KEY idx_assign_bank_course (course_id),
    KEY idx_assign_bank_difficulty (difficulty),
    KEY idx_assign_bank_status (status),
    KEY idx_assign_bank_created_by (created_by),

    CONSTRAINT fk_assign_bank_course
        FOREIGN KEY (course_id)
        REFERENCES mdl_course(id)
        ON DELETE RESTRICT,

    CONSTRAINT fk_assign_bank_creator
        FOREIGN KEY (created_by)
        REFERENCES mdl_user(id)
        ON DELETE RESTRICT,

    CONSTRAINT chk_assign_bank_max_score
        CHECK (max_score > 0)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


-- ============================================================
-- 2. BẢNG ĐỢT GIAO BÀI (ASSIGNMENT CAMPAIGN)
-- Phụ thuộc: mdl_course, mdl_user
-- ============================================================

CREATE TABLE IF NOT EXISTS assignment_campaign (
    id BIGINT NOT NULL AUTO_INCREMENT,
    title VARCHAR(255) NOT NULL,
    course_id BIGINT NOT NULL,
    cohort VARCHAR(10) NOT NULL DEFAULT 'K47',
    distribution_type ENUM('CLASS', 'INDIVIDUAL') NOT NULL DEFAULT 'INDIVIDUAL',
    easy_count INT NOT NULL DEFAULT 0,
    medium_count INT NOT NULL DEFAULT 0,
    hard_count INT NOT NULL DEFAULT 0,
    total_questions INT NOT NULL DEFAULT 0,
    open_time DATETIME NOT NULL,
    due_date DATETIME NOT NULL,
    allow_late TINYINT(1) NOT NULL DEFAULT 0,
    late_penalty_percent DECIMAL(5,2) NOT NULL DEFAULT 0.00,
    status ENUM('DRAFT', 'SCHEDULED', 'OPEN', 'EXPIRED', 'CLOSED') NOT NULL DEFAULT 'OPEN',
    created_by BIGINT NOT NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    PRIMARY KEY (id),
    KEY idx_campaign_course (course_id),
    KEY idx_campaign_cohort (cohort),
    KEY idx_campaign_status (status),
    KEY idx_campaign_created_by (created_by),

    CONSTRAINT fk_campaign_course
        FOREIGN KEY (course_id)
        REFERENCES mdl_course(id)
        ON DELETE RESTRICT,

    CONSTRAINT fk_campaign_creator
        FOREIGN KEY (created_by)
        REFERENCES mdl_user(id)
        ON DELETE RESTRICT,

    CONSTRAINT chk_campaign_time
        CHECK (due_date > open_time)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


-- ============================================================
-- 3. BẢNG PHÂN PHỐI BÀI TẬP RANDOM CHO SINH VIÊN (ASSIGNMENT DISTRIBUTION)
-- Phụ thuộc: assignment_campaign, mdl_user, assignment_bank
-- Dùng ON DELETE RESTRICT để bảo toàn lịch sử giao bài
-- ============================================================

CREATE TABLE IF NOT EXISTS assignment_distribution (
    id BIGINT NOT NULL AUTO_INCREMENT,
    campaign_id BIGINT NOT NULL,
    student_id BIGINT NOT NULL,
    assignment_bank_id BIGINT NOT NULL,
    distribution_type ENUM('CLASS', 'INDIVIDUAL') NOT NULL DEFAULT 'INDIVIDUAL',
    assigned_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,

    PRIMARY KEY (id),
    UNIQUE KEY uq_campaign_student_assignment (campaign_id, student_id, assignment_bank_id),
    KEY idx_dist_campaign (campaign_id),
    KEY idx_dist_student (student_id),
    KEY idx_dist_bank (assignment_bank_id),

    CONSTRAINT fk_dist_campaign
        FOREIGN KEY (campaign_id)
        REFERENCES assignment_campaign(id)
        ON DELETE RESTRICT,

    CONSTRAINT fk_dist_student
        FOREIGN KEY (student_id)
        REFERENCES mdl_user(id)
        ON DELETE RESTRICT,

    CONSTRAINT fk_dist_bank
        FOREIGN KEY (assignment_bank_id)
        REFERENCES assignment_bank(id)
        ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


-- ============================================================
-- 4. BẢNG BÀI NỘP VÀ KẾT QUẢ CHẤM (ASSIGNMENT SUBMISSION RECORD)
-- Phụ thuộc: assignment_campaign, assignment_distribution, mdl_user, assignment_bank
-- Dùng ON DELETE RESTRICT để không làm mất bài nộp
-- ============================================================

CREATE TABLE IF NOT EXISTS assignment_submission_record (
    id BIGINT NOT NULL AUTO_INCREMENT,
    campaign_id BIGINT NOT NULL,
    distribution_id BIGINT NOT NULL,
    student_id BIGINT NOT NULL,
    assignment_bank_id BIGINT NOT NULL,
    submission_content TEXT NULL,
    attachment_url VARCHAR(500) NULL,
    submitted_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    is_late TINYINT(1) NOT NULL DEFAULT 0,
    score DECIMAL(5,2) NULL,
    feedback TEXT NULL,
    grading_status ENUM('SUBMITTED', 'DRAFT_GRADED', 'PUBLISHED') NOT NULL DEFAULT 'SUBMITTED',
    graded_by BIGINT NULL,
    graded_at DATETIME NULL,
    published_at DATETIME NULL,

    PRIMARY KEY (id),
    UNIQUE KEY uq_submission_dist (distribution_id),
    KEY idx_sub_campaign (campaign_id),
    KEY idx_sub_student (student_id),
    KEY idx_sub_bank (assignment_bank_id),
    KEY idx_sub_status (grading_status),

    CONSTRAINT fk_sub_campaign
        FOREIGN KEY (campaign_id)
        REFERENCES assignment_campaign(id)
        ON DELETE RESTRICT,

    CONSTRAINT fk_sub_dist
        FOREIGN KEY (distribution_id)
        REFERENCES assignment_distribution(id)
        ON DELETE RESTRICT,

    CONSTRAINT fk_sub_student
        FOREIGN KEY (student_id)
        REFERENCES mdl_user(id)
        ON DELETE RESTRICT,

    CONSTRAINT fk_sub_bank
        FOREIGN KEY (assignment_bank_id)
        REFERENCES assignment_bank(id)
        ON DELETE RESTRICT,

    CONSTRAINT fk_sub_grader
        FOREIGN KEY (graded_by)
        REFERENCES mdl_user(id)
        ON DELETE SET NULL,

    CONSTRAINT chk_sub_score
        CHECK (score IS NULL OR score >= 0)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


-- ============================================================
-- 5. BẢNG LỊCH SỬ CHỈNH SỬA ĐIỂM (ASSIGNMENT GRADE AUDIT)
-- Phụ thuộc: assignment_submission_record, mdl_user
-- Dùng ON DELETE RESTRICT để bảo toàn lịch sử chấm điểm
-- ============================================================

CREATE TABLE IF NOT EXISTS assignment_grade_history (
    id BIGINT NOT NULL AUTO_INCREMENT,
    submission_id BIGINT NOT NULL,
    old_score DECIMAL(5,2) NULL,
    new_score DECIMAL(5,2) NOT NULL,
    old_feedback TEXT NULL,
    new_feedback TEXT NULL,
    change_reason TEXT NOT NULL,
    changed_by BIGINT NOT NULL,
    changed_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,

    PRIMARY KEY (id),
    KEY idx_audit_submission (submission_id),
    KEY idx_audit_changed_by (changed_by),

    CONSTRAINT fk_audit_submission
        FOREIGN KEY (submission_id)
        REFERENCES assignment_submission_record(id)
        ON DELETE RESTRICT,

    CONSTRAINT fk_audit_changer
        FOREIGN KEY (changed_by)
        REFERENCES mdl_user(id)
        ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
