const { query } = require('./db');

async function checkGrade11Teacher() {
  try {
    const res = await query(`
      SELECT 
        u.id AS user_id,
        u.email,
        u.password_hash AS password,
        u.full_name,
        u.role,
        t.id AS teacher_id,
        t.employee_no,
        t.qualification,
        t.subject_specialization,
        c.id AS class_id,
        c.grade,
        c.section
      FROM classes c
      JOIN teachers t ON c.class_teacher_id = t.id OR c.class_teacher_id = t.user_id
      JOIN users u ON t.user_id = u.id
      WHERE c.grade LIKE '%11%' OR c.grade = 'Grade 11'
    `);
    console.log('Grade 11 Class Teacher Details:', res.rows);
  } catch (err) {
    console.error(err);
  } finally {
    process.exit(0);
  }
}

checkGrade11Teacher();
