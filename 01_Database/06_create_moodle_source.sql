-- ============================================================
-- 06_create_moodle_source.sql
-- MOODLE SOURCE DATABASE - DỮ LIỆU GIẢ LẬP
-- ============================================================

CREATE DATABASE IF NOT EXISTS lms_moodle_source
CHARACTER SET utf8mb4
COLLATE utf8mb4_unicode_ci;

USE lms_moodle_source;


-- ============================================================
-- 1. USER
-- Nguồn Moodle: user
-- Grain: 1 dòng = 1 người dùng
-- ============================================================

CREATE TABLE mdl_user (
    id BIGINT PRIMARY KEY,
    username VARCHAR(100) NOT NULL,
    idnumber VARCHAR(255),
    firstname VARCHAR(100) NOT NULL,
    lastname VARCHAR(100) NOT NULL,
    email VARCHAR(100),
    suspended TINYINT(1) NOT NULL DEFAULT 0,
    deleted TINYINT(1) NOT NULL DEFAULT 0,
    firstaccess BIGINT NOT NULL DEFAULT 0,
    lastaccess BIGINT NOT NULL DEFAULT 0,
    timecreated BIGINT NOT NULL,
    timemodified BIGINT NOT NULL
) ENGINE=InnoDB;


-- ============================================================
-- 2. COURSE CATEGORY
-- Nguồn Moodle: course_categories
-- ============================================================

CREATE TABLE mdl_course_categories (
    id BIGINT PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    idnumber VARCHAR(100),
    description TEXT,
    parent BIGINT NOT NULL DEFAULT 0,
    sortorder BIGINT NOT NULL DEFAULT 0
) ENGINE=InnoDB;


-- ============================================================
-- 3. COURSE
-- Nguồn Moodle: course
-- ============================================================

CREATE TABLE mdl_course (
    id BIGINT PRIMARY KEY,
    category BIGINT NOT NULL,
    fullname VARCHAR(254) NOT NULL,
    shortname VARCHAR(255) NOT NULL,
    idnumber VARCHAR(100),
    summary TEXT,
    startdate BIGINT NOT NULL DEFAULT 0,
    enddate BIGINT NOT NULL DEFAULT 0,
    visible TINYINT(1) NOT NULL DEFAULT 1,
    
    FOREIGN KEY (category)
        REFERENCES mdl_course_categories(id)
) ENGINE=InnoDB;


-- ============================================================
-- 4. ENROL
-- Nguồn Moodle: enrol
-- ============================================================

CREATE TABLE mdl_enrol (
    id BIGINT PRIMARY KEY,
    enrol VARCHAR(20) NOT NULL,
    status BIGINT NOT NULL DEFAULT 0,
    courseid BIGINT NOT NULL,
    sortorder BIGINT NOT NULL DEFAULT 0,
    enrolstartdate BIGINT NOT NULL DEFAULT 0,
    enrolenddate BIGINT NOT NULL DEFAULT 0,
    
    FOREIGN KEY (courseid)
        REFERENCES mdl_course(id)
) ENGINE=InnoDB;


-- ============================================================
-- 5. USER ENROLMENTS
-- Nguồn Moodle: user_enrolments
-- ============================================================

CREATE TABLE mdl_user_enrolments (
    id BIGINT PRIMARY KEY,
    enrolid BIGINT NOT NULL,
    userid BIGINT NOT NULL,
    timestart BIGINT NOT NULL,
    timeend BIGINT NOT NULL DEFAULT 0,
    modifierid BIGINT NOT NULL DEFAULT 0,
    timecreated BIGINT NOT NULL,
    timemodified BIGINT NOT NULL,
    
    FOREIGN KEY (enrolid)
        REFERENCES mdl_enrol(id),

    FOREIGN KEY (userid)
        REFERENCES mdl_user(id)
) ENGINE=InnoDB;


-- ============================================================
-- 6. ROLE
-- Nguồn Moodle: role
-- ============================================================

CREATE TABLE mdl_role (
    id BIGINT PRIMARY KEY,
    name VARCHAR(255),
    shortname VARCHAR(255) NOT NULL,
    description TEXT,
    archetype VARCHAR(30)
) ENGINE=InnoDB;


-- ============================================================
-- 7. CONTEXT
-- Nguồn Moodle: context
-- ============================================================

CREATE TABLE mdl_context (
    id BIGINT PRIMARY KEY,
    contextlevel BIGINT NOT NULL,
    instanceid BIGINT NOT NULL,
    path VARCHAR(255),
    depth TINYINT NOT NULL
) ENGINE=InnoDB;


-- ============================================================
-- 8. ROLE ASSIGNMENTS
-- Nguồn Moodle: role_assignments
-- ============================================================

CREATE TABLE mdl_role_assignments (
    id BIGINT PRIMARY KEY,
    roleid BIGINT NOT NULL,
    contextid BIGINT NOT NULL,
    userid BIGINT NOT NULL,
    timemodified BIGINT NOT NULL,
    
    FOREIGN KEY (roleid)
        REFERENCES mdl_role(id),

    FOREIGN KEY (contextid)
        REFERENCES mdl_context(id),

    FOREIGN KEY (userid)
        REFERENCES mdl_user(id)
) ENGINE=InnoDB;


-- ============================================================
-- KIỂM TRA
-- ============================================================

SHOW TABLES;