-- ====================================================================
-- Government School Management System (GSMS)
-- PostgreSQL 3NF Relational Database Schema (GSMS_SDS.pdf Specification)
-- Complete Principal Functionality Database Tables
-- ====================================================================

-- 1. Users Table (Authentication & Accounts)
CREATE TABLE IF NOT EXISTS users (
    id VARCHAR(50) PRIMARY KEY,
    school_id VARCHAR(50) NOT NULL DEFAULT 'sch-colombo-01',
    email VARCHAR(100) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL DEFAULT 'password123',
    full_name VARCHAR(150) NOT NULL,
    role VARCHAR(50) NOT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    phone VARCHAR(30),
    avatar_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 2. Teachers Table
CREATE TABLE IF NOT EXISTS teachers (
    id VARCHAR(50) PRIMARY KEY,
    user_id VARCHAR(50) REFERENCES users(id) ON DELETE CASCADE,
    school_id VARCHAR(50) NOT NULL DEFAULT 'sch-colombo-01',
    employee_no VARCHAR(50) UNIQUE NOT NULL,
    qualification VARCHAR(150),
    subject_specialization VARCHAR(150),
    max_periods_per_week INT DEFAULT 30,
    current_periods_assigned INT DEFAULT 0,
    performance_score INT DEFAULT 90,
    phone VARCHAR(30)
);

-- 3. Classes Table (Grades 1 to 11)
CREATE TABLE IF NOT EXISTS classes (
    id VARCHAR(50) PRIMARY KEY,
    school_id VARCHAR(50) NOT NULL DEFAULT 'sch-colombo-01',
    grade VARCHAR(20) NOT NULL,
    section VARCHAR(10) NOT NULL,
    academic_year INT NOT NULL DEFAULT 2026,
    class_teacher_id VARCHAR(50) REFERENCES teachers(id) ON DELETE SET NULL,
    capacity INT DEFAULT 35
);

-- 4. Students Table
CREATE TABLE IF NOT EXISTS students (
    id VARCHAR(50) PRIMARY KEY,
    school_id VARCHAR(50) NOT NULL DEFAULT 'sch-colombo-01',
    student_no VARCHAR(50) UNIQUE NOT NULL,
    user_id VARCHAR(50) REFERENCES users(id) ON DELETE SET NULL,
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    date_of_birth DATE NOT NULL,
    class_id VARCHAR(50) REFERENCES classes(id) ON DELETE SET NULL,
    admission_date DATE NOT NULL DEFAULT CURRENT_DATE,
    status VARCHAR(20) DEFAULT 'active'
);

-- 5. Subjects Table (16 Sri Lankan Curriculum Subjects)
CREATE TABLE IF NOT EXISTS subjects (
    id VARCHAR(50) PRIMARY KEY,
    code VARCHAR(20) UNIQUE NOT NULL,
    name VARCHAR(100) NOT NULL,
    grade_level VARCHAR(50) NOT NULL,
    periods_per_week INT DEFAULT 5,
    syllabus_url TEXT,
    category VARCHAR(50) DEFAULT 'general',
    category_name VARCHAR(100)
);

-- 6. Teaching Assignments Table (9 Subjects per class allocation)
CREATE TABLE IF NOT EXISTS teaching_assignments (
    id VARCHAR(50) PRIMARY KEY,
    class_id VARCHAR(50) REFERENCES classes(id) ON DELETE CASCADE,
    subject_id VARCHAR(50) REFERENCES subjects(id) ON DELETE CASCADE,
    teacher_id VARCHAR(50) REFERENCES teachers(id) ON DELETE CASCADE,
    periods_per_week INT DEFAULT 5,
    CONSTRAINT unique_class_subject UNIQUE (class_id, subject_id)
);

-- 7. Daily Attendance Register Table
CREATE TABLE IF NOT EXISTS attendance (
    id VARCHAR(50) PRIMARY KEY,
    student_id VARCHAR(50) REFERENCES students(id) ON DELETE CASCADE,
    date DATE NOT NULL,
    status VARCHAR(20) NOT NULL, -- present, absent, late, excused
    marked_by VARCHAR(50) NOT NULL,
    remarks TEXT,
    CONSTRAINT unique_student_date UNIQUE (student_id, date)
);

-- 8. Principal Leave Requests Approval Table
CREATE TABLE IF NOT EXISTS leave_requests (
    id VARCHAR(50) PRIMARY KEY,
    applicant_name VARCHAR(150) NOT NULL,
    role VARCHAR(50) NOT NULL,
    type VARCHAR(50) NOT NULL, -- Sick Leave, Casual Leave, Duty Leave
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    reason TEXT NOT NULL,
    status VARCHAR(20) DEFAULT 'pending' -- pending, approved, rejected
);

-- 9. Principal Admission Requests Approval Table
CREATE TABLE IF NOT EXISTS admission_requests (
    id VARCHAR(50) PRIMARY KEY,
    student_name VARCHAR(150) NOT NULL,
    grade_applying VARCHAR(20) NOT NULL,
    guardian_name VARCHAR(150) NOT NULL,
    contact_no VARCHAR(30) NOT NULL,
    previous_school VARCHAR(150),
    status VARCHAR(20) DEFAULT 'pending'
);

-- 10. Principal Purchase & Disposal Requests Table
CREATE TABLE IF NOT EXISTS purchase_disposal_requests (
    id VARCHAR(50) PRIMARY KEY,
    type VARCHAR(20) NOT NULL, -- purchase, disposal
    item_name VARCHAR(150) NOT NULL,
    quantity INT NOT NULL,
    estimated_cost NUMERIC(12,2) NOT NULL,
    reason TEXT NOT NULL,
    status VARCHAR(20) DEFAULT 'pending' -- pending, approved, rejected
);

-- 11. Inventory Items Table
CREATE TABLE IF NOT EXISTS inventory_items (
    id VARCHAR(50) PRIMARY KEY,
    item_code VARCHAR(50) UNIQUE NOT NULL,
    name VARCHAR(150) NOT NULL,
    category VARCHAR(50) NOT NULL,
    quantity_in_stock INT NOT NULL DEFAULT 0,
    unit VARCHAR(30) DEFAULT 'units',
    reorder_level INT DEFAULT 5,
    location VARCHAR(100) NOT NULL,
    status VARCHAR(20) DEFAULT 'good'
);

-- 11b. Inventory Transactions & Asset Handover Log Table
CREATE TABLE IF NOT EXISTS inventory_transactions (
    id VARCHAR(50) PRIMARY KEY,
    item_id VARCHAR(50) REFERENCES inventory_items(id) ON DELETE CASCADE,
    type VARCHAR(30) NOT NULL, -- receipt, issue, adjustment, return
    quantity INT NOT NULL,
    issued_to VARCHAR(150),
    issued_by VARCHAR(150),
    recipient_category VARCHAR(50),
    date DATE NOT NULL DEFAULT CURRENT_DATE,
    status VARCHAR(30) DEFAULT 'dispatched',
    return_date DATE,
    return_condition VARCHAR(50),
    remarks TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 12. Welfare Programs Table
CREATE TABLE IF NOT EXISTS welfare_programs (
    id VARCHAR(50) PRIMARY KEY,
    name VARCHAR(150) NOT NULL,
    type VARCHAR(50) NOT NULL, -- Midday Meals, Uniform Vouchers, Textbooks, Scholarships
    academic_year INT NOT NULL DEFAULT 2026,
    budget_allocated NUMERIC(12,2) DEFAULT 0.00,
    status VARCHAR(20) DEFAULT 'active'
);

-- 13. School Announcements Table
CREATE TABLE IF NOT EXISTS announcements (
    id VARCHAR(50) PRIMARY KEY,
    title VARCHAR(200) NOT NULL,
    body TEXT NOT NULL,
    created_by VARCHAR(100) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 14. Term Examinations Table
CREATE TABLE IF NOT EXISTS exams (
    id VARCHAR(50) PRIMARY KEY,
    name VARCHAR(150) NOT NULL,
    term VARCHAR(20) NOT NULL,
    academic_year INT NOT NULL DEFAULT 2026,
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    is_published BOOLEAN DEFAULT FALSE
);

-- 15. Exam Results Table
CREATE TABLE IF NOT EXISTS exam_results (
    id VARCHAR(50) PRIMARY KEY,
    exam_id VARCHAR(50) REFERENCES exams(id) ON DELETE CASCADE,
    student_id VARCHAR(50) REFERENCES students(id) ON DELETE CASCADE,
    subject_id VARCHAR(50) REFERENCES subjects(id) ON DELETE CASCADE,
    marks_obtained NUMERIC(5,2) NOT NULL,
    grade VARCHAR(5) NOT NULL,
    remarks TEXT,
    CONSTRAINT unique_exam_student_subject UNIQUE (exam_id, student_id, subject_id)
);

-- 16. Audit Logs Table (Append-Only Trail)
CREATE TABLE IF NOT EXISTS audit_logs (
    id VARCHAR(50) PRIMARY KEY,
    actor_id VARCHAR(50) NOT NULL,
    actor_name VARCHAR(150) NOT NULL,
    action VARCHAR(50) NOT NULL,
    entity VARCHAR(50) NOT NULL,
    entity_id VARCHAR(50) NOT NULL,
    details TEXT NOT NULL,
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 17. Permanent Timetable Slots Table
CREATE TABLE IF NOT EXISTS timetable_slots (
    id VARCHAR(100) PRIMARY KEY,
    class_id VARCHAR(50) REFERENCES classes(id) ON DELETE CASCADE,
    subject_id VARCHAR(50) REFERENCES subjects(id) ON DELETE CASCADE,
    teacher_id VARCHAR(50) REFERENCES teachers(id) ON DELETE CASCADE,
    day_of_week INT NOT NULL,
    period_no INT NOT NULL,
    start_time VARCHAR(20) NOT NULL,
    end_time VARCHAR(20) NOT NULL,
    room VARCHAR(50) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT unique_class_day_period UNIQUE (class_id, day_of_week, period_no)
);
