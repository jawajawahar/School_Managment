const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');
const envPath = fs.existsSync(path.join(__dirname, '.env'))
  ? path.join(__dirname, '.env')
  : path.join(__dirname, '../.env');
require('dotenv').config({ path: envPath });

const pool = new Pool({
  connectionString:
    process.env.DATABASE_URL ||
    `postgres://${process.env.DB_USER || 'postgres'}:${process.env.DB_PASSWORD || 'postgres'}@${
      process.env.DB_HOST || 'localhost'
    }:${process.env.DB_PORT || 5432}/${process.env.DB_NAME || 'gsms_db'}`,
  ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : false,
});

// Auto-initialize PostgreSQL 3NF Tables on startup
const initDatabase = async () => {
  try {
    const client = await pool.connect();
    console.log('✅ PostgreSQL Database connected successfully.');

    const schemaSql = fs.readFileSync(path.join(__dirname, 'schema.sql'), 'utf-8');
    await client.query(schemaSql);
    console.log('✅ PostgreSQL Schema initialized (3NF Tables ready).');

    // Idempotent migrations for tables/columns added after the initial schema.
    // Safe to run on every startup — every statement is IF NOT EXISTS.
    await client.query(`
      CREATE TABLE IF NOT EXISTS staff (
        id VARCHAR(50) PRIMARY KEY,
        user_id VARCHAR(50) REFERENCES users(id) ON DELETE CASCADE,
        school_id VARCHAR(50) NOT NULL DEFAULT 'sch-colombo-01',
        employee_no VARCHAR(50) UNIQUE NOT NULL,
        role_description VARCHAR(150),
        department VARCHAR(150)
      );

      CREATE TABLE IF NOT EXISTS library_items (
        id VARCHAR(50) PRIMARY KEY,
        isbn VARCHAR(30),
        title VARCHAR(200) NOT NULL,
        author VARCHAR(150),
        category VARCHAR(100),
        copies_total INT NOT NULL DEFAULT 1,
        copies_available INT NOT NULL DEFAULT 1,
        shelf_location VARCHAR(100)
      );

      CREATE TABLE IF NOT EXISTS library_transactions (
        id VARCHAR(50) PRIMARY KEY,
        item_id VARCHAR(50) REFERENCES library_items(id) ON DELETE CASCADE,
        borrower_id VARCHAR(50) NOT NULL,
        borrower_type VARCHAR(20) NOT NULL,
        issue_date DATE NOT NULL,
        due_date DATE NOT NULL,
        return_date DATE,
        status VARCHAR(20) NOT NULL DEFAULT 'issued',
        fine_amount NUMERIC(10,2)
      );

      CREATE TABLE IF NOT EXISTS welfare_enrolments (
        id VARCHAR(50) PRIMARY KEY,
        program_id VARCHAR(50) REFERENCES welfare_programs(id) ON DELETE CASCADE,
        student_id VARCHAR(50) REFERENCES students(id) ON DELETE CASCADE,
        status VARCHAR(20) NOT NULL DEFAULT 'enrolled',
        disbursed_at TIMESTAMP WITH TIME ZONE,
        remarks TEXT
      );

      CREATE TABLE IF NOT EXISTS notifications (
        id VARCHAR(100) PRIMARY KEY,
        recipient_id VARCHAR(100) NOT NULL,
        title VARCHAR(255) NOT NULL,
        message TEXT NOT NULL,
        channel VARCHAR(30) DEFAULT 'in_app',
        status VARCHAR(30) DEFAULT 'sent',
        sent_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );

      ALTER TABLE inventory_items ADD COLUMN IF NOT EXISTS unit VARCHAR(30);
      ALTER TABLE inventory_items ADD COLUMN IF NOT EXISTS reorder_level INT DEFAULT 0;

      ALTER TABLE welfare_programs ADD COLUMN IF NOT EXISTS description TEXT;
      ALTER TABLE welfare_programs ADD COLUMN IF NOT EXISTS eligibility_criteria TEXT;
      ALTER TABLE welfare_programs ALTER COLUMN type DROP NOT NULL;

      ALTER TABLE announcements ADD COLUMN IF NOT EXISTS audience_role VARCHAR(50);
      ALTER TABLE announcements ADD COLUMN IF NOT EXISTS audience_class_id VARCHAR(50);
      ALTER TABLE announcements ADD COLUMN IF NOT EXISTS is_emergency BOOLEAN DEFAULT FALSE;

      ALTER TABLE admission_requests ALTER COLUMN grade_applying DROP NOT NULL;
      ALTER TABLE admission_requests ALTER COLUMN guardian_name DROP NOT NULL;
      ALTER TABLE admission_requests ALTER COLUMN contact_no DROP NOT NULL;
      ALTER TABLE admission_requests ADD COLUMN IF NOT EXISTS type VARCHAR(30);
      ALTER TABLE admission_requests ADD COLUMN IF NOT EXISTS class_id VARCHAR(50);
      ALTER TABLE admission_requests ADD COLUMN IF NOT EXISTS class_name VARCHAR(100);
      ALTER TABLE admission_requests ADD COLUMN IF NOT EXISTS exam_term VARCHAR(150);
      ALTER TABLE admission_requests ADD COLUMN IF NOT EXISTS class_teacher_name VARCHAR(150);
      ALTER TABLE admission_requests ADD COLUMN IF NOT EXISTS submitted_by_teacher_id VARCHAR(50);
      ALTER TABLE admission_requests ADD COLUMN IF NOT EXISTS submitted_by_teacher_name VARCHAR(150);
      ALTER TABLE admission_requests ADD COLUMN IF NOT EXISTS signed_by_principal BOOLEAN DEFAULT FALSE;
      ALTER TABLE admission_requests ADD COLUMN IF NOT EXISTS signed_at TIMESTAMP WITH TIME ZONE;
      ALTER TABLE admission_requests ADD COLUMN IF NOT EXISTS principal_name VARCHAR(150);
      ALTER TABLE admission_requests ADD COLUMN IF NOT EXISTS total_class_students INT;
      ALTER TABLE admission_requests ADD COLUMN IF NOT EXISTS eligible_student_count INT;
      ALTER TABLE admission_requests ADD COLUMN IF NOT EXISTS student_roster JSONB;

      ALTER TABLE users ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP;
      ALTER TABLE students ADD COLUMN IF NOT EXISTS enrolled_subject_ids JSONB DEFAULT '[]'::jsonb;
      ALTER TABLE welfare_programs ADD COLUMN IF NOT EXISTS banner_url TEXT;
      ALTER TABLE welfare_programs ADD COLUMN IF NOT EXISTS is_archived BOOLEAN DEFAULT FALSE;
    `);
    console.log('✅ PostgreSQL migrations applied (staff, library, welfare enrolments, extended columns).');

    client.release();
  } catch (err) {
    console.warn('⚠️ PostgreSQL Connection Notice:', err.message);
    console.warn('💡 Ensure PostgreSQL service is running and DATABASE_URL in server/.env is configured.');
  }
};

module.exports = {
  pool,
  query: (text, params) => pool.query(text, params),
  initDatabase,
};
