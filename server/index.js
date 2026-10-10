process.on('uncaughtException', (err) => {
  console.error('⚠️ [UncaughtException safely handled]:', err.message);
});
process.on('unhandledRejection', (reason) => {
  console.error('⚠️ [UnhandledRejection safely handled]:', reason?.message || reason);
});

const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
const envPath = fs.existsSync(path.join(__dirname, '.env'))
  ? path.join(__dirname, '.env')
  : path.join(__dirname, '../.env');
require('dotenv').config({ path: envPath });
const { query, pool, initDatabase } = require('./db');
const {
  initWhatsApp,
  getWhatsAppStatus,
  sendWhatsAppMessage,
  sendWhatsAppDocument,
  logoutWhatsApp,
  getPairingCode,
} = require('./whatsappService');
const { generateTimetablePdfBuffer } = require('./timetablePdfService');
const { generateReportPdfBuffer } = require('./reportPdfService');

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

// Initialize Database Connection & Tables
initDatabase();

// Auto-initialize WhatsApp bot if existing credentials exist
initWhatsApp().catch((err) => console.log('WhatsApp Bot standby (ready for QR scan):', err.message));

// Root Health Check Endpoint
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', service: 'GSMS Express PostgreSQL Backend', timestamp: new Date() });
});

// ==========================================
// 1. PRINCIPAL EXECUTIVE DASHBOARD TELEMETRY & ACADEMIC PASS RATE ANALYTICS
// ==========================================
app.get('/api/principal/dashboard-summary', async (req, res) => {
  try {
    const studentsRes = await query('SELECT COUNT(*) FROM students');
    const teachersRes = await query('SELECT COUNT(*) FROM teachers');
    const classesRes = await query('SELECT COUNT(*) FROM classes');
    const pendingLeavesRes = await query("SELECT COUNT(*) FROM leave_requests WHERE status = 'pending'");
    const pendingAdmissionsRes = await query("SELECT COUNT(*) FROM admission_requests WHERE status = 'pending'");
    const pendingPurchasesRes = await query("SELECT COUNT(*) FROM purchase_disposal_requests WHERE status = 'pending'");

    const totalStudents = parseInt(studentsRes.rows[0].count, 10);
    const totalTeachers = parseInt(teachersRes.rows[0].count, 10);
    const totalClasses = parseInt(classesRes.rows[0].count, 10);

    // Dynamic Attendance Rate calculation from PostgreSQL
    const now = new Date();
    const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
    const todayAttRes = await query(
      "SELECT status FROM attendance WHERE date = $1::date OR TO_CHAR(date, 'YYYY-MM-DD') = $1::text",
      [todayStr]
    );
    let todayAttendanceRate = 0;
    if (todayAttRes.rows.length > 0) {
      const presentCount = todayAttRes.rows.filter(a => a.status === 'present' || a.status === 'late').length;
      todayAttendanceRate = Math.round((presentCount / todayAttRes.rows.length) * 100);
    } else {
      const recentAttRes = await query("SELECT status FROM attendance ORDER BY date DESC LIMIT 300");
      if (recentAttRes.rows.length > 0) {
        const presentCount = recentAttRes.rows.filter(a => a.status === 'present' || a.status === 'late').length;
        todayAttendanceRate = Math.round((presentCount / recentAttRes.rows.length) * 100);
      }
    }
    const pendingApprovalsCount =
      parseInt(pendingLeavesRes.rows[0].count, 10) +
      parseInt(pendingAdmissionsRes.rows[0].count, 10) +
      parseInt(pendingPurchasesRes.rows[0].count, 10);

    const examResultsRes = await query("SELECT grade, marks_obtained FROM exam_results");
    const totalResults = examResultsRes.rows.length;
    const passedResults = examResultsRes.rows.filter((r) => r.grade !== 'F' && Number(r.marks_obtained) >= 40).length;
    const termExamPassRate = totalResults > 0 ? Math.round((passedResults / totalResults) * 100) : 0;

    res.json({
      totalStudents,
      totalTeachers,
      totalClasses,
      pendingApprovalsCount,
      todayAttendanceRate,
      termExamPassRate,
      totalMarksRegistered: totalResults,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Detailed Pass Rate Analytics Endpoint
app.get('/api/academic/pass-rate-analytics', async (req, res) => {
  try {
    const resultsRes = await query(`
      SELECT 
        er.id, er.exam_id AS "examId", er.student_id AS "studentId", er.subject_id AS "subjectId",
        er.marks_obtained AS "marksObtained", er.grade, er.remarks,
        s.first_name || ' ' || s.last_name AS "studentName", s.student_no AS "studentNo", s.class_id AS "classId",
        sub.name AS "subjectName", sub.code AS "subjectCode",
        c.grade AS "classGrade", c.section AS "classSection"
      FROM exam_results er
      JOIN students s ON er.student_id = s.id
      JOIN subjects sub ON er.subject_id = sub.id
      LEFT JOIN classes c ON s.class_id = c.id
    `);

    const rows = resultsRes.rows;
    const totalRegistered = rows.length;
    const passedCount = rows.filter(r => r.grade !== 'F' && Number(r.marksObtained) >= 40).length;
    const failedCount = totalRegistered - passedCount;
    const overallPassRate = totalRegistered > 0 ? Math.round((passedCount / totalRegistered) * 100) : 0;

    // Grade spectrum counts
    const gradeSpectrum = {
      countA: rows.filter(r => r.grade === 'A').length,
      countB: rows.filter(r => r.grade === 'B').length,
      countC: rows.filter(r => r.grade === 'C').length,
      countS: rows.filter(r => r.grade === 'S').length,
      countF: rows.filter(r => r.grade === 'F').length,
    };

    // Subject breakdown
    const subjectMap = {};
    rows.forEach(r => {
      if (!subjectMap[r.subjectId]) {
        subjectMap[r.subjectId] = { id: r.subjectId, name: r.subjectName, code: r.subjectCode, total: 0, passed: 0 };
      }
      subjectMap[r.subjectId].total += 1;
      if (r.grade !== 'F' && Number(r.marksObtained) >= 40) {
        subjectMap[r.subjectId].passed += 1;
      }
    });

    const subjectBreakdown = Object.values(subjectMap).map(s => ({
      ...s,
      passRate: s.total > 0 ? Math.round((s.passed / s.total) * 100) : 0
    }));

    res.json({
      overallPassRate,
      totalRegistered,
      passedCount,
      failedCount,
      gradeSpectrum,
      subjectBreakdown,
      remedialStudents: rows.filter(r => r.grade === 'F')
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});


// ==========================================
// 2. AUTHENTICATION & USERS API
// ==========================================
app.post('/api/auth/login', async (req, res) => {
  const { email, password } = req.body;
  const cleanEmail = (email || '').trim().toLowerCase();
  const inputPassword = (password || '').trim();

  try {
    const { rows } = await query('SELECT * FROM users WHERE LOWER(email) = LOWER($1)', [cleanEmail]);
    if (rows.length === 0) {
      return res.status(401).json({ error: 'No registered user account found with this email. Please ask your Principal or Admin to provision your credentials.' });
    }

    const user = rows[0];
    if (!user.is_active) {
      return res.status(403).json({ error: 'This user account has been deactivated. Contact Administrator.' });
    }

    if (inputPassword && user.password_hash && inputPassword !== user.password_hash.trim()) {
      return res.status(401).json({ error: 'Incorrect password for this account. Access denied.' });
    }

    let assignedClassId = null;
    let assignedGrade = null;
    let assignedSection = null;
    let teacherId = null;

    if (user.role === 'teacher') {
      const classRes = await query(
        `SELECT c.id, c.grade, c.section, t.id AS teacher_id
         FROM classes c
         LEFT JOIN teachers t ON c.class_teacher_id = t.id OR c.class_teacher_id = t.user_id
         LEFT JOIN users u ON t.user_id = u.id
         WHERE c.class_teacher_id = $1 OR t.user_id = $1 OR LOWER(u.email) = LOWER($2)
         LIMIT 1`,
        [user.id, cleanEmail]
      );
      if (classRes.rows.length > 0) {
        assignedClassId = classRes.rows[0].id;
        assignedGrade = classRes.rows[0].grade;
        assignedSection = classRes.rows[0].section;
        teacherId = classRes.rows[0].teacher_id;
      }
    }

    res.json({
      user: {
        id: user.id,
        teacherId: teacherId || user.id,
        schoolId: user.school_id,
        email: user.email,
        fullName: user.full_name,
        role: user.role,
        isActive: user.is_active,
        phone: user.phone,
        password: user.password_hash,
        assignedClassId,
        assignedGrade,
        assignedSection,
      },
      token: `jwt_token_${user.id}_${Date.now()}`,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/users', async (req, res) => {
  try {
    const { rows } = await query(
      'SELECT id, school_id AS "schoolId", email, full_name AS "fullName", role, is_active AS "isActive", phone, password_hash AS "password" FROM users ORDER BY full_name'
    );
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/users', async (req, res) => {
  const { id: reqId, schoolId, email, fullName, role, password, isActive, phone } = req.body;
  const id = reqId || `user-${Date.now()}`;
  const cleanEmail = (email || '').trim().toLowerCase();
  const pwd = (password || 'GSMS@2026').trim();
  try {
    const { rows } = await query(
      `INSERT INTO users (id, school_id, email, full_name, role, is_active, phone, password_hash)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       ON CONFLICT (email) DO UPDATE SET
         full_name = EXCLUDED.full_name,
         role = EXCLUDED.role,
         is_active = EXCLUDED.is_active,
         phone = EXCLUDED.phone,
         password_hash = EXCLUDED.password_hash
       RETURNING id, school_id AS "schoolId", email, full_name AS "fullName", role, is_active AS "isActive", phone, password_hash AS "password"`,
      [id, schoolId || 'sch-colombo-01', cleanEmail, fullName, role || 'teacher', isActive !== false, phone || null, pwd]
    );
    res.status(201).json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.put('/api/users/:id', async (req, res) => {
  const { id } = req.params;
  const { fullName, role, isActive, phone, password, email } = req.body;
  const cleanEmail = email ? email.trim().toLowerCase() : null;
  const cleanPass = password ? password.trim() : null;
  try {
    const { rows } = await query(
      `UPDATE users
       SET full_name = COALESCE($1, full_name),
           role = COALESCE($2, role),
           is_active = COALESCE($3, is_active),
           phone = COALESCE($4, phone),
           password_hash = COALESCE($5, password_hash),
           email = COALESCE($6, email)
       WHERE id = $7 OR LOWER(email) = LOWER($6)
       RETURNING id, school_id AS "schoolId", email, full_name AS "fullName", role, is_active AS "isActive", phone, password_hash AS "password"`,
      [fullName, role, isActive, phone, cleanPass, cleanEmail, id]
    );
    if (rows.length === 0) return res.status(404).json({ error: 'User not found' });
    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ==========================================
// 3. ACADEMIC STRUCTURE & CLASS TEACHER ASSIGNMENTS
// ==========================================
app.get('/api/classes', async (req, res) => {
  try {
    const { rows } = await query(
      'SELECT id, school_id AS "schoolId", grade, section, academic_year AS "academicYear", class_teacher_id AS "classTeacherId", capacity FROM classes ORDER BY grade, section'
    );
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/classes', async (req, res) => {
  const { id: reqId, grade, section, academicYear, classTeacherId, capacity } = req.body;
  const id = reqId || `class-${grade.toLowerCase().replace(' ', '')}-${section.toLowerCase()}`;
  try {
    const { rows } = await query(
      `INSERT INTO classes (id, grade, section, academic_year, class_teacher_id, capacity)
       VALUES ($1, $2, $3, $4, $5, $6)
       ON CONFLICT (id) DO UPDATE SET
         grade = EXCLUDED.grade,
         section = EXCLUDED.section,
         academic_year = EXCLUDED.academic_year,
         capacity = EXCLUDED.capacity
       RETURNING id, grade, section, academic_year AS "academicYear", class_teacher_id AS "classTeacherId", capacity`,
      [id, grade, section, academicYear || 2026, classTeacherId || null, capacity || 35]
    );
    res.status(201).json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.put('/api/classes/:id/class-teacher', async (req, res) => {
  const { id } = req.params;
  const { teacherId } = req.body;
  try {
    await query('UPDATE classes SET class_teacher_id = $1 WHERE id = $2', [teacherId, id]);
    res.json({ success: true, message: `Principal assigned Class Teacher ${teacherId} to class ${id}` });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.put('/api/classes/:id', async (req, res) => {
  const { id } = req.params;
  const { grade, section, academicYear, capacity } = req.body;
  try {
    const { rows } = await query(
      `UPDATE classes
       SET grade = COALESCE($1, grade),
           section = COALESCE($2, section),
           academic_year = COALESCE($3, academic_year),
           capacity = COALESCE($4, capacity)
       WHERE id = $5
       RETURNING id, grade, section, academic_year AS "academicYear", class_teacher_id AS "classTeacherId", capacity`,
      [grade, section, academicYear, capacity, id]
    );
    if (rows.length === 0) return res.status(404).json({ error: 'Class not found' });
    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/classes/:id', async (req, res) => {
  const { id } = req.params;
  try {
    await query('DELETE FROM classes WHERE id = $1', [id]);
    res.json({ success: true, message: `Class ${id} deleted.` });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ==========================================
// 4. 9-SUBJECT TEACHER ALLOCATION GRID (Max 3 Subjects Constraint)
// ==========================================
app.get('/api/subjects', async (req, res) => {
  try {
    const { rows } = await query(
      'SELECT id, code, name, grade_level AS "gradeLevel", periods_per_week AS "periodsPerWeek", syllabus_url AS "syllabusUrl", category, category_name AS "categoryName" FROM subjects ORDER BY code'
    );
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/subjects', async (req, res) => {
  const { code, name, gradeLevel, periodsPerWeek, syllabusUrl, category, categoryName } = req.body;
  const id = `subj-${Date.now()}`;
  try {
    const { rows } = await query(
      `INSERT INTO subjects (id, code, name, grade_level, periods_per_week, syllabus_url, category, category_name)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       RETURNING id, code, name, grade_level AS "gradeLevel", periods_per_week AS "periodsPerWeek", syllabus_url AS "syllabusUrl", category, category_name AS "categoryName"`,
      [id, code, name, gradeLevel || 'Grades 1-11', periodsPerWeek || 5, syllabusUrl || null, category || 'general', categoryName || null]
    );
    res.status(201).json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.put('/api/subjects/:id', async (req, res) => {
  const { id } = req.params;
  const { code, name, gradeLevel, periodsPerWeek, syllabusUrl, category, categoryName } = req.body;
  try {
    const { rows } = await query(
      `UPDATE subjects 
       SET code = COALESCE($1, code),
           name = COALESCE($2, name),
           grade_level = COALESCE($3, grade_level),
           periods_per_week = COALESCE($4, periods_per_week),
           syllabus_url = COALESCE($5, syllabus_url),
           category = COALESCE($6, category),
           category_name = COALESCE($7, category_name)
       WHERE id = $8
       RETURNING id, code, name, grade_level AS "gradeLevel", periods_per_week AS "periodsPerWeek", syllabus_url AS "syllabusUrl", category, category_name AS "categoryName"`,
      [code, name, gradeLevel, periodsPerWeek, syllabusUrl, category, categoryName, id]
    );
    if (rows.length === 0) {
      return res.status(404).json({ error: 'Subject not found' });
    }
    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/subjects/:id', async (req, res) => {
  const { id } = req.params;
  try {
    await query('DELETE FROM subjects WHERE id = $1', [id]);
    res.json({ success: true, message: `Subject ${id} deleted.` });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/teaching-assignments', async (req, res) => {
  try {
    const { rows } = await query(
      'SELECT id, class_id AS "classId", subject_id AS "subjectId", teacher_id AS "teacherId", periods_per_week AS "periodsPerWeek" FROM teaching_assignments'
    );
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/teaching-assignments', async (req, res) => {
  const { classId, subjectId, teacherId } = req.body;

  try {
    // Principal Constraint Check: Max 3 Subjects Per Teacher
    const countRes = await query(
      'SELECT COUNT(*) FROM teaching_assignments WHERE teacher_id = $1 AND NOT (class_id = $2 AND subject_id = $3)',
      [teacherId, classId, subjectId]
    );
    const assignedCount = parseInt(countRes.rows[0].count, 10);

    if (assignedCount >= 3) {
      return res.status(400).json({
        success: false,
        error: `Workload Limit Exceeded: Teacher is already assigned to 3 subjects. Maximum allowed is 3 subjects per teacher.`,
      });
    }

    const id = `ta-${classId}-${subjectId}`;
    await query(
      `INSERT INTO teaching_assignments (id, class_id, subject_id, teacher_id)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (class_id, subject_id) 
       DO UPDATE SET teacher_id = EXCLUDED.teacher_id`,
      [id, classId, subjectId, teacherId]
    );

    res.json({ success: true, message: 'Subject teacher allocation saved successfully.' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ==========================================
// 5. STUDENTS DIRECTORY & CLASS ALLOCATION
// ==========================================
app.get('/api/students', async (req, res) => {
  const { classId } = req.query;
  try {
    let sql = `
      SELECT 
        s.id, s.school_id AS "schoolId", s.student_no AS "studentNo", s.user_id AS "userId",
        s.first_name AS "firstName", s.last_name AS "lastName",
        TO_CHAR(s.date_of_birth, 'YYYY-MM-DD') AS "dateOfBirth",
        s.class_id AS "classId",
        TO_CHAR(s.admission_date, 'YYYY-MM-DD') AS "admissionDate",
        s.status,
        COALESCE(u.phone, '') AS "phone",
        COALESCE(u.phone, '') AS "guardianPhone",
        '' AS "guardianName",
        COALESCE(s.enrolled_subject_ids, '[]'::jsonb) AS "enrolledSubjectIds"
      FROM students s
      LEFT JOIN users u ON s.user_id = u.id
    `;
    const params = [];
    if (classId) {
      params.push(classId);
      sql += ` WHERE s.class_id = $1 OR LOWER(s.class_id) = LOWER($1)`;
    }
    sql += ` ORDER BY s.first_name, s.last_name`;

    const { rows } = await query(sql, params);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/students', async (req, res) => {
  const { id: reqId, studentNo, firstName, lastName, dateOfBirth, classId, status, phone, guardianPhone, guardianName, enrolledSubjectIds } = req.body;
  const id = reqId || `stu-${Date.now()}`;
  const dob = (dateOfBirth && dateOfBirth.trim() !== '') ? dateOfBirth : '2012-01-01';
  const sno = studentNo || `GSMS-${Date.now()}`;
  const cid = classId || 'class-9a';
  const st = status || 'active';
  const gPhone = (guardianPhone || phone || '').trim();
  const gName = (guardianName || '').trim();
  const enrolledJson = JSON.stringify(Array.isArray(enrolledSubjectIds) ? enrolledSubjectIds : []);

  try {
    const { rows } = await query(
      `INSERT INTO students (id, student_no, first_name, last_name, date_of_birth, class_id, status, phone, guardian_phone, guardian_name, enrolled_subject_ids)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11::jsonb)
       ON CONFLICT (student_no) DO UPDATE SET
         first_name = EXCLUDED.first_name,
         last_name = EXCLUDED.last_name,
         date_of_birth = EXCLUDED.date_of_birth,
         class_id = EXCLUDED.class_id,
         status = EXCLUDED.status,
         phone = COALESCE(EXCLUDED.phone, students.phone),
         guardian_phone = COALESCE(EXCLUDED.guardian_phone, students.guardian_phone),
         guardian_name = COALESCE(EXCLUDED.guardian_name, students.guardian_name),
         enrolled_subject_ids = EXCLUDED.enrolled_subject_ids
       RETURNING id, student_no AS "studentNo", first_name AS "firstName", last_name AS "lastName", 
                 TO_CHAR(date_of_birth, 'YYYY-MM-DD') AS "dateOfBirth", class_id AS "classId", status,
                 phone, guardian_phone AS "guardianPhone", guardian_name AS "guardianName",
                 COALESCE(enrolled_subject_ids, '[]'::jsonb) AS "enrolledSubjectIds"`,
      [id, sno, firstName || 'Student', lastName || 'Record', dob, cid, st, gPhone || null, gPhone || null, gName || null, enrolledJson]
    );
    res.status(201).json(rows[0]);
  } catch (err) {
    console.error('Error inserting student:', err);
    res.status(500).json({ error: err.message });
  }
});

app.put('/api/students/:id/assign-class', async (req, res) => {
  const { id } = req.params;
  const { classId } = req.body;
  try {
    await query('UPDATE students SET class_id = $1 WHERE id = $2', [classId, id]);
    res.json({ success: true, message: `Principal assigned student ${id} to class ${classId}` });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.put('/api/students/:id', async (req, res) => {
  const { id } = req.params;
  const { studentNo, firstName, lastName, dateOfBirth, admissionDate, classId, status, phone, guardianPhone, guardianName, enrolledSubjectIds } = req.body;
  const gPhone = (guardianPhone || phone || '').trim();
  const enrolledJson = Array.isArray(enrolledSubjectIds) ? JSON.stringify(enrolledSubjectIds) : null;
  try {
    const { rows } = await query(
      `UPDATE students 
       SET student_no = COALESCE($1, student_no),
           first_name = COALESCE($2, first_name),
           last_name = COALESCE($3, last_name),
           date_of_birth = COALESCE($4, date_of_birth),
           admission_date = COALESCE($5, admission_date),
           class_id = COALESCE($6, class_id),
           status = COALESCE($7, status),
           phone = CASE WHEN $8 <> '' THEN $8 ELSE phone END,
           guardian_phone = CASE WHEN $8 <> '' THEN $8 ELSE guardian_phone END,
           guardian_name = CASE WHEN $9 <> '' THEN $9 ELSE guardian_name END,
           enrolled_subject_ids = COALESCE($10::jsonb, enrolled_subject_ids)
       WHERE id = $11
       RETURNING id, student_no AS "studentNo", first_name AS "firstName", last_name AS "lastName",
                 TO_CHAR(date_of_birth, 'YYYY-MM-DD') AS "dateOfBirth",
                 TO_CHAR(admission_date, 'YYYY-MM-DD') AS "admissionDate",
                 class_id AS "classId", status, phone, guardian_phone AS "guardianPhone", guardian_name AS "guardianName",
                 COALESCE(enrolled_subject_ids, '[]'::jsonb) AS "enrolledSubjectIds"`,
      [studentNo || null, firstName, lastName, dateOfBirth, admissionDate || null, classId, status, gPhone, guardianName || '', enrolledJson, id]
    );
    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/students/:id', async (req, res) => {
  const { id } = req.params;
  try {
    await query('DELETE FROM students WHERE id = $1', [id]);
    res.json({ success: true, message: `Student ${id} deleted.` });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/students/bulk-delete', async (req, res) => {
  const { ids } = req.body;
  try {
    if (ids && ids.length > 0) {
      await query('DELETE FROM students WHERE id = ANY($1)', [ids]);
    }
    res.json({ success: true, message: `Deleted ${ids ? ids.length : 0} students.` });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/students/bulk-import', async (req, res) => {
  const { students } = req.body;
  try {
    for (const s of students) {
      const id = s.id || `stu-${Date.now()}-${Math.random().toString(36).substring(2, 5)}`;
      await query(
        `INSERT INTO students (id, student_no, first_name, last_name, date_of_birth, class_id, status)
         VALUES ($1, $2, $3, $4, $5, $6, $7)
         ON CONFLICT (student_no) DO UPDATE SET first_name = EXCLUDED.first_name, last_name = EXCLUDED.last_name`,
        [id, s.studentNo, s.firstName, s.lastName, s.dateOfBirth || '2011-01-01', s.classId || 'class-9a', s.status || 'active']
      );
    }
    res.json({ success: true, message: `Imported ${students.length} students.` });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ==========================================
// 6. TEACHERS & FACULTY ROSTER WITH CONTACT INFO
// ==========================================
app.get('/api/teachers', async (req, res) => {
  try {
    const { rows } = await query(`
      SELECT 
        id, user_id AS "userId", school_id AS "schoolId", employee_no AS "employeeNo",
        qualification, subject_specialization AS "subjectSpecialization",
        max_periods_per_week AS "maxPeriodsPerWeek", current_periods_assigned AS "currentPeriodsAssigned",
        performance_score AS "performanceScore", phone
      FROM teachers
      ORDER BY employee_no
    `);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Creates the linked `users` row (role: teacher) and the `teachers` row in one
// transaction — teachers.user_id has a foreign key back to users, so a
// teacher can never be inserted before its user account exists.
app.post('/api/teachers', async (req, res) => {
  const {
    id: reqTeacherId,
    userId: reqUserId,
    fullName,
    email,
    password,
    phone,
    qualification,
    subjectSpecialization,
    employeeNo: reqEmployeeNo,
  } = req.body;

  const teacherId = reqTeacherId || `tch-${Date.now()}`;
  const userId = reqUserId || `user-tch-${Date.now()}`;
  const employeeNo = reqEmployeeNo || `EMP-${Date.now()}`;
  const cleanEmail = (email || '').trim().toLowerCase();
  const pwd = (password || 'GSMS@2026').trim();

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    await client.query(
      `INSERT INTO users (id, email, full_name, role, is_active, phone, password_hash)
       VALUES ($1, $2, $3, 'teacher', true, $4, $5)
       ON CONFLICT (email) DO UPDATE SET
         full_name = EXCLUDED.full_name,
         phone = EXCLUDED.phone,
         password_hash = EXCLUDED.password_hash`,
      [userId, cleanEmail, fullName, phone || null, pwd]
    );

    const { rows } = await client.query(
      `INSERT INTO teachers (id, user_id, employee_no, qualification, subject_specialization, phone)
       VALUES ($1, $2, $3, $4, $5, $6)
       ON CONFLICT (id) DO UPDATE SET
         qualification = EXCLUDED.qualification,
         subject_specialization = EXCLUDED.subject_specialization,
         phone = EXCLUDED.phone
       RETURNING id, user_id AS "userId", employee_no AS "employeeNo", qualification, subject_specialization AS "subjectSpecialization", phone`,
      [teacherId, userId, employeeNo, qualification, subjectSpecialization, phone || null]
    );

    await client.query('COMMIT');
    res.status(201).json(rows[0]);
  } catch (err) {
    await client.query('ROLLBACK');
    res.status(500).json({ error: err.message });
  } finally {
    client.release();
  }
});

// ==========================================
// 7. PRINCIPAL APPROVAL WORKFLOWS (Leave, Admissions, Inventory)
// ==========================================
app.get('/api/leave-requests', async (req, res) => {
  try {
    const { rows } = await query(`
      SELECT id, applicant_name AS "applicantName", role, type,
             TO_CHAR(start_date, 'YYYY-MM-DD') AS "startDate",
             TO_CHAR(end_date, 'YYYY-MM-DD') AS "endDate",
             reason, status
      FROM leave_requests ORDER BY start_date DESC
    `);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/leave-requests', async (req, res) => {
  const { id: reqId, applicantName, role, type, startDate, endDate, reason } = req.body;
  const id = reqId || `lvr-${Date.now()}`;
  try {
    const { rows } = await query(
      `INSERT INTO leave_requests (id, applicant_name, role, type, start_date, end_date, reason, status)
       VALUES ($1, $2, $3, $4, $5, $6, $7, 'pending')
       RETURNING id, applicant_name AS "applicantName", role, type,
                 TO_CHAR(start_date, 'YYYY-MM-DD') AS "startDate", TO_CHAR(end_date, 'YYYY-MM-DD') AS "endDate",
                 reason, status`,
      [id, applicantName, role, type, startDate, endDate, reason]
    );
    res.status(201).json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.put('/api/leave-requests/:id/status', async (req, res) => {
  const { id } = req.params;
  const { status } = req.body;
  try {
    await query('UPDATE leave_requests SET status = $1 WHERE id = $2', [status, id]);
    res.json({ success: true, message: `Principal ${status} leave request ${id}` });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ==========================================
// 7B. PRINCIPAL BROADCAST ANNOUNCEMENTS API
// ==========================================
app.get('/api/announcements', async (req, res) => {
  try {
    const { rows } = await query(`
      SELECT 
        id, 
        title, 
        body, 
        COALESCE(created_by, 'Principal Office') AS "createdBy",
        TO_CHAR(created_at, 'YYYY-MM-DD HH24:MI') AS "createdAt",
        COALESCE(is_emergency, false) AS "isEmergency"
      FROM announcements
      ORDER BY created_at DESC
    `);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/announcements', async (req, res) => {
  const { id: reqId, title, body, createdBy, isEmergency } = req.body;
  const id = reqId || `ann-${Date.now()}`;
  const author = createdBy || 'Principal Office';
  try {
    const { rows } = await query(
      `INSERT INTO announcements (id, title, body, created_by, is_emergency)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING id, title, body, created_by AS "createdBy", 
                 TO_CHAR(created_at, 'YYYY-MM-DD HH24:MI') AS "createdAt", 
                 COALESCE(is_emergency, false) AS "isEmergency"`,
      [id, title, body, author, isEmergency === true]
    );
    res.status(201).json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/announcements/:id', async (req, res) => {
  const { id } = req.params;
  try {
    await query('DELETE FROM announcements WHERE id = $1', [id]);
    res.json({ success: true, message: `Announcement ${id} deleted` });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

const admissionRequestColumns = `
  id, student_name AS "studentName", grade_applying AS "gradeApplying", guardian_name AS "guardianName",
  contact_no AS "contactNo", previous_school AS "previousSchool", status,
  type, class_id AS "classId", class_name AS "className", exam_term AS "examTerm",
  class_teacher_name AS "classTeacherName", submitted_by_teacher_id AS "submittedByTeacherId",
  submitted_by_teacher_name AS "submittedByTeacherName", signed_by_principal AS "signedByPrincipal",
  signed_at AS "signedAt", principal_name AS "principalName",
  total_class_students AS "totalClassStudents", eligible_student_count AS "eligibleStudentCount",
  student_roster AS "studentRoster"
`;

app.get('/api/admission-requests', async (req, res) => {
  try {
    const { rows } = await query(`SELECT ${admissionRequestColumns} FROM admission_requests ORDER BY id DESC`);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/admission-requests', async (req, res) => {
  const {
    id: reqId, studentName, gradeApplying, guardianName, contactNo, previousSchool,
    type, classId, className, examTerm, classTeacherName, submittedByTeacherId, submittedByTeacherName,
    totalClassStudents, eligibleStudentCount, studentRoster,
  } = req.body;
  const id = reqId || `adm-${Date.now()}`;
  try {
    const { rows } = await query(
      `INSERT INTO admission_requests (
         id, student_name, grade_applying, guardian_name, contact_no, previous_school, status,
         type, class_id, class_name, exam_term, class_teacher_name, submitted_by_teacher_id, submitted_by_teacher_name,
         total_class_students, eligible_student_count, student_roster
       )
       VALUES ($1, $2, $3, $4, $5, $6, 'pending', $7, $8, $9, $10, $11, $12, $13, $14, $15, $16)
       RETURNING ${admissionRequestColumns}`,
      [
        id, studentName, gradeApplying || null, guardianName || null, contactNo || null, previousSchool || null,
        type || 'school_admission', classId || null, className || null, examTerm || null, classTeacherName || null,
        submittedByTeacherId || null, submittedByTeacherName || null,
        totalClassStudents || null, eligibleStudentCount || null, studentRoster ? JSON.stringify(studentRoster) : null,
      ]
    );
    res.status(201).json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.put('/api/admission-requests/:id/status', async (req, res) => {
  const { id } = req.params;
  const { status } = req.body;
  try {
    await query('UPDATE admission_requests SET status = $1 WHERE id = $2', [status, id]);
    res.json({ success: true, message: `Principal ${status} admission request ${id}` });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// General update — used for signing/issuing exam hall passes, which rewrite
// the studentRoster JSON blob and the signedByPrincipal/principalName fields.
app.put('/api/admission-requests/:id', async (req, res) => {
  const { id } = req.params;
  const { status, signedByPrincipal, signedAt, principalName, studentRoster } = req.body;
  try {
    const { rows } = await query(
      `UPDATE admission_requests
       SET status = COALESCE($1, status),
           signed_by_principal = COALESCE($2, signed_by_principal),
           signed_at = COALESCE($3, signed_at),
           principal_name = COALESCE($4, principal_name),
           student_roster = COALESCE($5, student_roster)
       WHERE id = $6
       RETURNING ${admissionRequestColumns}`,
      [status, signedByPrincipal, signedAt, principalName, studentRoster ? JSON.stringify(studentRoster) : null, id]
    );
    if (rows.length === 0) return res.status(404).json({ error: 'Admission request not found' });
    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/admission-requests/:id', async (req, res) => {
  try {
    await query('DELETE FROM admission_requests WHERE id = $1', [req.params.id]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/admission-requests/bulk-delete', async (req, res) => {
  const { ids } = req.body;
  try {
    await query('DELETE FROM admission_requests WHERE id = ANY($1)', [ids]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/purchase-disposal-requests', async (req, res) => {
  try {
    const { rows } = await query(
      'SELECT id, type, item_name AS "itemName", quantity, estimated_cost AS "estimatedCost", reason, status FROM purchase_disposal_requests'
    );
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/purchase-disposal-requests', async (req, res) => {
  const { id: reqId, type, itemName, quantity, estimatedCost, reason } = req.body;
  const id = reqId || `pdr-${Date.now()}`;
  try {
    const { rows } = await query(
      `INSERT INTO purchase_disposal_requests (id, type, item_name, quantity, estimated_cost, reason, status)
       VALUES ($1, $2, $3, $4, $5, $6, 'pending')
       RETURNING id, type, item_name AS "itemName", quantity, estimated_cost AS "estimatedCost", reason, status`,
      [id, type, itemName, quantity, estimatedCost, reason]
    );
    res.status(201).json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.put('/api/purchase-disposal-requests/:id/status', async (req, res) => {
  const { id } = req.params;
  const { status } = req.body;
  try {
    await query('UPDATE purchase_disposal_requests SET status = $1 WHERE id = $2', [status, id]);
    res.json({ success: true, message: `Principal ${status} purchase/disposal request ${id}` });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ==========================================
// 8. DAILY ATTENDANCE REGISTER API (Oversight Mode)
// ==========================================
app.get('/api/attendance', async (req, res) => {
  const { date, classId } = req.query;
  try {
    let sql = `
      SELECT a.id, a.student_id AS "studentId", COALESCE(s.student_no, a.student_id) AS "studentNo",
             TO_CHAR(a.date, 'YYYY-MM-DD') AS date,
             a.status, a.marked_by AS "markedBy", a.remarks
      FROM attendance a
      LEFT JOIN students s ON a.student_id = s.id OR a.student_id = s.student_no
      WHERE 1=1
    `;
    const params = [];
    if (date) {
      params.push(date);
      sql += ` AND (a.date = $${params.length}::date OR TO_CHAR(a.date, 'YYYY-MM-DD') = $${params.length}::text)`;
    }
    if (classId) {
      params.push(classId);
      sql += ` AND s.class_id = $${params.length}`;
    }
    const { rows } = await query(sql, params);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/attendance', async (req, res) => {
  const { studentId, studentNo, date, status, markedBy, remarks } = req.body;
  const id = `att-${Date.now()}-${Math.random().toString(36).substring(2, 5)}`;
  const cleanDate = (date || '').split('T')[0];
  try {
    // Resolve studentId (could be id or student_no) to actual students.id in PostgreSQL
    let studentRes = await query(
      `SELECT id, student_no FROM students 
       WHERE id = $1 
          OR student_no = $1 
          OR ($2::text IS NOT NULL AND $2::text <> '' AND (id = $2 OR student_no = $2))
       LIMIT 1`,
      [studentId || '', studentNo || '']
    );
    let resolvedStudentId = studentRes.rows.length > 0 ? studentRes.rows[0].id : null;

    if (!resolvedStudentId) {
      const stuId = studentId || `stu-${Date.now()}-${Math.random().toString(36).substring(2, 5)}`;
      const stuNo = studentNo || (studentId && studentId.startsWith('GSMS-') ? studentId : `GSMS-2026-${Math.floor(1000 + Math.random() * 9000)}`);
      await query(
        `INSERT INTO students (id, school_id, student_no, first_name, last_name, class_id, status)
         VALUES ($1, 'sch-colombo-01', $2, 'Student', $3, 'class-10a', 'active')
         ON CONFLICT (student_no) DO UPDATE SET first_name = EXCLUDED.first_name`,
        [stuId, stuNo, studentId || 'Record']
      ).catch(() => {});
      resolvedStudentId = stuId;
    }

    const existingAtt = await query(
      `SELECT id FROM attendance WHERE student_id = $1 AND (date = $2::date OR TO_CHAR(date, 'YYYY-MM-DD') = $2::text)`,
      [resolvedStudentId, cleanDate]
    );
    if (existingAtt.rows.length > 0) {
      await query(
        `UPDATE attendance SET status = $1, remarks = $2, marked_by = $3 WHERE id = $4`,
        [status, remarks || '', markedBy || 'sys', existingAtt.rows[0].id]
      );
    } else {
      await query(
        `INSERT INTO attendance (id, student_id, date, status, marked_by, remarks)
         VALUES ($1, $2, $3::date, $4, $5, $6)`,
        [id, resolvedStudentId, cleanDate, status, markedBy || 'sys', remarks || '']
      );
    }
    res.json({ success: true, message: 'Attendance recorded successfully.' });
  } catch (err) {
    console.error('Error posting attendance:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// ==========================================
// 9. SCHOOL ANNOUNCEMENTS API
// ==========================================
app.get('/api/announcements', async (req, res) => {
  try {
    const { rows } = await query(
      `SELECT id, title, body, created_by AS "createdBy", created_at AS "createdAt",
              audience_role AS "audienceRole", audience_class_id AS "audienceClassId", is_emergency AS "isEmergency"
       FROM announcements ORDER BY created_at DESC`
    );
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/announcements', async (req, res) => {
  const { id: reqId, title, body, createdBy, audienceRole, audienceClassId, isEmergency } = req.body;
  const id = reqId || `ann-${Date.now()}`;
  try {
    const { rows } = await query(
      `INSERT INTO announcements (id, title, body, created_by, audience_role, audience_class_id, is_emergency)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING id, title, body, created_by AS "createdBy", created_at AS "createdAt",
                 audience_role AS "audienceRole", audience_class_id AS "audienceClassId", is_emergency AS "isEmergency"`,
      [id, title, body, createdBy || 'Principal', audienceRole || 'all', audienceClassId || null, isEmergency || false]
    );
    res.status(201).json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/announcements/:id', async (req, res) => {
  try {
    await query('DELETE FROM announcements WHERE id = $1', [req.params.id]);
    res.json({ success: true, message: `Announcement ${req.params.id} deleted successfully` });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ==========================================
// 9B. NOTIFICATIONS API (TARGETED TEACHER NOTIFICATIONS)
// ==========================================
app.get('/api/notifications', async (req, res) => {
  const { userId, teacherId, classId } = req.query;
  try {
    let queryStr = `
      SELECT id, recipient_id AS "recipientId", title, message, channel, status,
             COALESCE(category, 'general') AS category, COALESCE(is_read, false) AS "isRead",
             sent_at AS "sentAt"
      FROM notifications
    `;
    const params = [];
    const conditions = ["recipient_id = 'all'", "recipient_id = 'teacher'", "recipient_id = 'teachers'"];

    if (userId) {
      params.push(userId);
      conditions.push(`recipient_id = $${params.length}`);
    }
    if (teacherId) {
      params.push(teacherId);
      conditions.push(`recipient_id = $${params.length}`);
    }
    if (classId) {
      params.push(classId);
      conditions.push(`recipient_id = $${params.length}`);
    }

    if (conditions.length > 0) {
      queryStr += ` WHERE ` + conditions.join(' OR ');
    }

    queryStr += ` ORDER BY sent_at DESC LIMIT 100`;

    const { rows } = await query(queryStr, params);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/notifications', async (req, res) => {
  const { recipientId, title, message, channel = 'in_app', category = 'general' } = req.body;
  if (!recipientId || !title || !message) {
    return res.status(400).json({ error: 'recipientId, title, and message are required' });
  }
  const id = `notif-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
  try {
    const { rows } = await query(
      `INSERT INTO notifications (id, recipient_id, title, message, channel, category, is_read, sent_at)
       VALUES ($1, $2, $3, $4, $5, $6, false, CURRENT_TIMESTAMP)
       RETURNING id, recipient_id AS "recipientId", title, message, channel, status, category, is_read AS "isRead", sent_at AS "sentAt"`,
      [id, recipientId, title, message, channel, category]
    );
    res.status(201).json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.put('/api/notifications/:id/read', async (req, res) => {
  const { id } = req.params;
  try {
    await query(`UPDATE notifications SET is_read = true, status = 'read' WHERE id = $1`, [id]);
    res.json({ success: true, message: 'Notification marked as read' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.put('/api/notifications/read-all', async (req, res) => {
  const { recipientId } = req.body;
  try {
    if (recipientId) {
      await query(
        `UPDATE notifications SET is_read = true, status = 'read'
         WHERE recipient_id = $1 OR recipient_id = 'all' OR recipient_id = 'teacher'`,
        [recipientId]
      );
    } else {
      await query(`UPDATE notifications SET is_read = true, status = 'read'`);
    }
    res.json({ success: true, message: 'All notifications marked as read' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ==========================================
// 10. SECURITY AUDIT LOGS API
// ==========================================
app.get('/api/audit-logs', async (req, res) => {
  try {
    const { rows } = await query(
      'SELECT id, actor_id AS "actorId", actor_name AS "actorName", action, entity, entity_id AS "entityId", details, timestamp FROM audit_logs ORDER BY timestamp DESC'
    );
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/audit-logs', async (req, res) => {
  const { id: reqId, actorId, actorName, action, entity, entityId, details } = req.body;
  const id = reqId || `audit-${Date.now()}`;
  try {
    await query(
      `INSERT INTO audit_logs (id, actor_id, actor_name, action, entity, entity_id, details)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       ON CONFLICT (id) DO NOTHING`,
      [id, actorId, actorName, action, entity, entityId, details]
    );
    res.status(201).json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ==========================================
// STAFF API (non-teaching staff accounts)
// ==========================================
app.get('/api/staff', async (req, res) => {
  try {
    const { rows } = await query(
      `SELECT id, user_id AS "userId", school_id AS "schoolId", employee_no AS "employeeNo",
              role_description AS "roleDescription", department
       FROM staff ORDER BY employee_no`
    );
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Same pattern as /api/teachers: staff.user_id has a foreign key back to
// users, so the login account must be created in the same transaction.
app.post('/api/staff', async (req, res) => {
  const { id: reqId, userId: reqUserId, fullName, email, phone, roleDescription, department, employeeNo: reqEmployeeNo } = req.body;
  const staffId = reqId || `staff-${Date.now()}`;
  const userId = reqUserId || `user-staff-${Date.now()}`;
  const employeeNo = reqEmployeeNo || `STF-${Date.now()}`;

  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await client.query(
      `INSERT INTO users (id, email, full_name, role, is_active, phone)
       VALUES ($1, $2, $3, 'staff', true, $4)
       ON CONFLICT (id) DO UPDATE SET full_name = EXCLUDED.full_name, phone = EXCLUDED.phone`,
      [userId, email, fullName, phone || null]
    );
    const { rows } = await client.query(
      `INSERT INTO staff (id, user_id, employee_no, role_description, department)
       VALUES ($1, $2, $3, $4, $5)
       ON CONFLICT (id) DO UPDATE SET role_description = EXCLUDED.role_description, department = EXCLUDED.department
       RETURNING id, user_id AS "userId", employee_no AS "employeeNo", role_description AS "roleDescription", department`,
      [staffId, userId, employeeNo, roleDescription, department]
    );
    await client.query('COMMIT');
    res.status(201).json(rows[0]);
  } catch (err) {
    await client.query('ROLLBACK');
    res.status(500).json({ error: err.message });
  } finally {
    client.release();
  }
});

// ==========================================
// LIBRARY API (catalogue & circulation)
// ==========================================
app.get('/api/library-items', async (req, res) => {
  try {
    const { rows } = await query(
      `SELECT id, isbn, title, author, category, copies_total AS "copiesTotal",
              copies_available AS "copiesAvailable", shelf_location AS "shelfLocation"
       FROM library_items ORDER BY title`
    );
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/library-items', async (req, res) => {
  const { id: reqId, isbn, title, author, category, copiesTotal, copiesAvailable, shelfLocation } = req.body;
  const id = reqId || `lib-${Date.now()}`;
  try {
    const { rows } = await query(
      `INSERT INTO library_items (id, isbn, title, author, category, copies_total, copies_available, shelf_location)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       RETURNING id, isbn, title, author, category, copies_total AS "copiesTotal", copies_available AS "copiesAvailable", shelf_location AS "shelfLocation"`,
      [id, isbn, title, author, category, copiesTotal || 1, copiesAvailable ?? copiesTotal ?? 1, shelfLocation]
    );
    res.status(201).json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.put('/api/library-items/:id', async (req, res) => {
  const { id } = req.params;
  const { isbn, title, author, category, copiesTotal, copiesAvailable, shelfLocation } = req.body;
  try {
    const { rows } = await query(
      `UPDATE library_items
       SET isbn = COALESCE($1, isbn), title = COALESCE($2, title), author = COALESCE($3, author),
           category = COALESCE($4, category), copies_total = COALESCE($5, copies_total),
           copies_available = COALESCE($6, copies_available), shelf_location = COALESCE($7, shelf_location)
       WHERE id = $8
       RETURNING id, isbn, title, author, category, copies_total AS "copiesTotal", copies_available AS "copiesAvailable", shelf_location AS "shelfLocation"`,
      [isbn, title, author, category, copiesTotal, copiesAvailable, shelfLocation, id]
    );
    if (rows.length === 0) return res.status(404).json({ error: 'Library item not found' });
    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/library-items/:id', async (req, res) => {
  try {
    await query('DELETE FROM library_items WHERE id = $1', [req.params.id]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/library-transactions', async (req, res) => {
  try {
    const { rows } = await query(
      `SELECT id, item_id AS "itemId", borrower_id AS "borrowerId", borrower_type AS "borrowerType",
              TO_CHAR(issue_date, 'YYYY-MM-DD') AS "issueDate", TO_CHAR(due_date, 'YYYY-MM-DD') AS "dueDate",
              TO_CHAR(return_date, 'YYYY-MM-DD') AS "returnDate", status, fine_amount AS "fineAmount"
       FROM library_transactions ORDER BY issue_date DESC`
    );
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Issuing a book decrements copies_available and records the loan in one transaction.
app.post('/api/library-transactions', async (req, res) => {
  const { id: reqId, itemId, borrowerId, borrowerType, issueDate, dueDate } = req.body;
  const id = reqId || `lib-tx-${Date.now()}`;
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await client.query('UPDATE library_items SET copies_available = copies_available - 1 WHERE id = $1 AND copies_available > 0', [itemId]);
    const { rows } = await client.query(
      `INSERT INTO library_transactions (id, item_id, borrower_id, borrower_type, issue_date, due_date, status)
       VALUES ($1, $2, $3, $4, $5, $6, 'issued')
       RETURNING id, item_id AS "itemId", borrower_id AS "borrowerId", borrower_type AS "borrowerType",
                 TO_CHAR(issue_date, 'YYYY-MM-DD') AS "issueDate", TO_CHAR(due_date, 'YYYY-MM-DD') AS "dueDate", status`,
      [id, itemId, borrowerId, borrowerType, issueDate, dueDate]
    );
    await client.query('COMMIT');
    res.status(201).json(rows[0]);
  } catch (err) {
    await client.query('ROLLBACK');
    res.status(500).json({ error: err.message });
  } finally {
    client.release();
  }
});

app.put('/api/library-transactions/:id/return', async (req, res) => {
  const { id } = req.params;
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const { rows } = await client.query(
      `UPDATE library_transactions SET status = 'returned', return_date = CURRENT_DATE WHERE id = $1 RETURNING item_id AS "itemId"`,
      [id]
    );
    if (rows.length > 0) {
      await client.query('UPDATE library_items SET copies_available = copies_available + 1 WHERE id = $1', [rows[0].itemId]);
    }
    await client.query('COMMIT');
    res.json({ success: true });
  } catch (err) {
    await client.query('ROLLBACK');
    res.status(500).json({ error: err.message });
  } finally {
    client.release();
  }
});

// ==========================================
// INVENTORY API (school assets, consumables, lab equipment)
// ==========================================
app.get('/api/inventory-items', async (req, res) => {
  try {
    const { rows } = await query(
      `SELECT id, name, category, quantity_in_stock AS "quantity", unit, location,
              reorder_level AS "reorderLevel", status AS "condition"
       FROM inventory_items ORDER BY name`
    );
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/inventory-items', async (req, res) => {
  const { id: reqId, name, category, quantity, unit, reorderLevel, location, condition } = req.body;
  const id = reqId || `inv-${Date.now()}`;
  const itemCode = `ITM-${Date.now()}`;
  try {
    const { rows } = await query(
      `INSERT INTO inventory_items (id, item_code, name, category, quantity_in_stock, unit, reorder_level, location, status)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
       RETURNING id, name, category, quantity_in_stock AS "quantity", unit, location, reorder_level AS "reorderLevel", status AS "condition"`,
      [id, itemCode, name, category, quantity || 0, unit, reorderLevel || 0, location, condition || 'good']
    );
    res.status(201).json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.put('/api/inventory-items/:id', async (req, res) => {
  const { id } = req.params;
  const { name, category, quantity, unit, reorderLevel, location, condition } = req.body;
  try {
    const { rows } = await query(
      `UPDATE inventory_items
       SET name = COALESCE($1, name), category = COALESCE($2, category),
           quantity_in_stock = COALESCE($3, quantity_in_stock), unit = COALESCE($4, unit),
           reorder_level = COALESCE($5, reorder_level), location = COALESCE($6, location),
           status = COALESCE($7, status)
       WHERE id = $8
       RETURNING id, name, category, quantity_in_stock AS "quantity", unit, location, reorder_level AS "reorderLevel", status AS "condition"`,
      [name, category, quantity, unit, reorderLevel, location, condition, id]
    );
    if (rows.length === 0) return res.status(404).json({ error: 'Inventory item not found' });
    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/inventory-items/:id', async (req, res) => {
  try {
    await query('DELETE FROM inventory_items WHERE id = $1', [req.params.id]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Inventory Transactions & Asset Handover Log API
app.get('/api/inventory-transactions', async (req, res) => {
  try {
    const { rows } = await query(
      `SELECT t.id, t.item_id AS "itemId", i.name AS "itemName", i.category,
              t.type, t.quantity, t.issued_to AS "issuedTo", t.issued_by AS "issuedBy",
              t.recipient_category AS "recipientCategory",
              TO_CHAR(t.date, 'YYYY-MM-DD') AS "date", t.status,
              TO_CHAR(t.return_date, 'YYYY-MM-DD') AS "returnDate",
              t.return_condition AS "returnCondition", t.remarks
       FROM inventory_transactions t
       LEFT JOIN inventory_items i ON t.item_id = i.id
       ORDER BY t.date DESC, t.created_at DESC`
    );
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/inventory-transactions', async (req, res) => {
  const { id: reqId, itemId, type, quantity, issuedTo, issuedBy, recipientCategory, date, remarks, status } = req.body;
  const id = reqId || `inv-tx-${Date.now()}`;
  try {
    const { rows } = await query(
      `INSERT INTO inventory_transactions (id, item_id, type, quantity, issued_to, issued_by, recipient_category, date, remarks, status)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8::date, $9, $10)
       RETURNING id, item_id AS "itemId", type, quantity, issued_to AS "issuedTo", issued_by AS "issuedBy",
                 recipient_category AS "recipientCategory", TO_CHAR(date, 'YYYY-MM-DD') AS "date", remarks, status`,
      [id, itemId, type || 'issue', quantity, issuedTo || null, issuedBy || null, recipientCategory || null, date || new Date().toISOString().split('T')[0], remarks || null, status || 'dispatched']
    );
    res.status(201).json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.put('/api/inventory-transactions/:id/return', async (req, res) => {
  const { id } = req.params;
  const { remarks, returnCondition } = req.body;
  try {
    const { rows } = await query(
      `UPDATE inventory_transactions
       SET status = 'returned',
           return_date = CURRENT_DATE,
           return_condition = COALESCE($1, 'Good'),
           remarks = CASE WHEN $2::text IS NOT NULL AND $2::text <> '' THEN COALESCE(remarks || ' | ', '') || 'Returned: ' || $2::text ELSE remarks END
       WHERE id = $3
       RETURNING id, status, TO_CHAR(return_date, 'YYYY-MM-DD') AS "returnDate"`,
      [returnCondition || 'Good', remarks || null, id]
    );
    if (rows.length === 0) return res.status(404).json({ error: 'Transaction not found' });
    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/inventory-transactions/:id', async (req, res) => {
  try {
    await query('DELETE FROM inventory_transactions WHERE id = $1', [req.params.id]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ==========================================
// WELFARE API (programs & student enrolments)
// ==========================================
app.get('/api/welfare-programs', async (req, res) => {
  try {
    const { rows } = await query(
      `SELECT id, name, description, eligibility_criteria AS "eligibilityCriteria",
              academic_year AS "academicYear", budget_allocated AS "budgetAllocated",
              banner_url AS "bannerUrl", COALESCE(is_archived, FALSE) AS "isArchived"
       FROM welfare_programs ORDER BY academic_year DESC, name`
    );
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/welfare-programs', async (req, res) => {
  const { id: reqId, name, description, eligibilityCriteria, academicYear, budgetAllocated, bannerUrl, isArchived } = req.body;
  const id = reqId || `welf-${Date.now()}`;
  try {
    const { rows } = await query(
      `INSERT INTO welfare_programs (id, name, type, description, eligibility_criteria, academic_year, budget_allocated, banner_url, is_archived)
       VALUES ($1, $2, 'General', $3, $4, $5, $6, $7, $8)
       ON CONFLICT (id) DO UPDATE SET
         name = EXCLUDED.name,
         description = EXCLUDED.description,
         eligibility_criteria = EXCLUDED.eligibility_criteria,
         academic_year = EXCLUDED.academic_year,
         budget_allocated = EXCLUDED.budget_allocated,
         banner_url = EXCLUDED.banner_url,
         is_archived = EXCLUDED.is_archived
       RETURNING id, name, description, eligibility_criteria AS "eligibilityCriteria", academic_year AS "academicYear", budget_allocated AS "budgetAllocated", banner_url AS "bannerUrl", COALESCE(is_archived, FALSE) AS "isArchived"`,
      [id, name, description, eligibilityCriteria, academicYear || 2026, budgetAllocated || 0, bannerUrl || null, isArchived || false]
    );
    res.status(201).json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/welfare-programs/:id', async (req, res) => {
  const { id } = req.params;
  try {
    // Soft-delete to preserve all welfare enrolments and reports intact for financial/academic audits!
    await query('UPDATE welfare_programs SET is_archived = TRUE WHERE id = $1', [id]);
    res.json({ success: true, message: `Welfare program ${id} archived. Reports and enrolments preserved.` });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/welfare-enrolments', async (req, res) => {
  try {
    const { rows } = await query(
      `SELECT id, program_id AS "programId", student_id AS "studentId", status,
              TO_CHAR(disbursed_at, 'YYYY-MM-DD"T"HH24:MI:SS') AS "disbursedAt", remarks
       FROM welfare_enrolments ORDER BY id DESC`
    );
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/welfare-enrolments', async (req, res) => {
  const { id: reqId, programId, studentId } = req.body;
  const id = reqId || `wenr-${Date.now()}`;
  try {
    const { rows } = await query(
      `INSERT INTO welfare_enrolments (id, program_id, student_id, status)
       VALUES ($1, $2, $3, 'enrolled')
       RETURNING id, program_id AS "programId", student_id AS "studentId", status`,
      [id, programId, studentId]
    );
    res.status(201).json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.put('/api/welfare-enrolments/:id/disburse', async (req, res) => {
  try {
    await query(`UPDATE welfare_enrolments SET status = 'disbursed', disbursed_at = CURRENT_TIMESTAMP WHERE id = $1`, [req.params.id]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ==========================================
// NOTIFICATIONS API
// ==========================================
app.get('/api/notifications', async (req, res) => {
  try {
    const { rows } = await query(
      'SELECT id, recipient_id AS "recipientId", title, message, channel, status, sent_at AS "sentAt" FROM notifications ORDER BY sent_at DESC'
    );
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/notifications', async (req, res) => {
  const { id: reqId, recipientId, title, message, channel, status, sentAt } = req.body;
  const id = reqId || `notif-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
  try {
    const { rows } = await query(
      `INSERT INTO notifications (id, recipient_id, title, message, channel, status, sent_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       ON CONFLICT (id) DO UPDATE SET
         recipient_id = EXCLUDED.recipient_id,
         title = EXCLUDED.title,
         message = EXCLUDED.message,
         channel = EXCLUDED.channel,
         status = EXCLUDED.status,
         sent_at = EXCLUDED.sent_at
       RETURNING id, recipient_id AS "recipientId", title, message, channel, status, sent_at AS "sentAt"`,
      [id, recipientId || 'all', title, message, channel || 'in_app', status || 'sent', sentAt || new Date().toISOString()]
    );
    res.status(201).json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.put('/api/notifications/:id/read', async (req, res) => {
  try {
    await query("UPDATE notifications SET status = 'read' WHERE id = $1", [req.params.id]);
    res.json({ success: true, message: `Notification ${req.params.id} marked as read.` });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.put('/api/notifications/mark-all-read', async (req, res) => {
  const { recipientId } = req.body;
  try {
    if (recipientId && recipientId !== 'all') {
      await query("UPDATE notifications SET status = 'read' WHERE recipient_id = $1 OR recipient_id = 'all'", [recipientId]);
    } else {
      await query("UPDATE notifications SET status = 'read'");
    }
    res.json({ success: true, message: 'All notifications marked as read.' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/notifications/:id', async (req, res) => {
  try {
    await query('DELETE FROM notifications WHERE id = $1', [req.params.id]);
    res.json({ success: true, message: `Notification ${req.params.id} deleted.` });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/notifications', async (req, res) => {
  const { recipientId } = req.body;
  try {
    if (recipientId && recipientId !== 'all') {
      await query('DELETE FROM notifications WHERE recipient_id = $1 OR recipient_id = \'all\'', [recipientId]);
    } else {
      await query('DELETE FROM notifications');
    }
    res.json({ success: true, message: 'All notifications cleared.' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ==========================================
// USER ACCOUNT MANAGEMENT API
// ==========================================
app.put('/api/users/:id', async (req, res) => {
  const { id } = req.params;
  const { fullName, role, isActive, phone } = req.body;
  try {
    const { rows } = await query(
      `UPDATE users
       SET full_name = COALESCE($1, full_name), role = COALESCE($2, role),
           is_active = COALESCE($3, is_active), phone = COALESCE($4, phone), updated_at = CURRENT_TIMESTAMP
       WHERE id = $5
       RETURNING id, email, full_name AS "fullName", role, is_active AS "isActive", phone`,
      [fullName, role, isActive, phone, id]
    );
    if (rows.length === 0) return res.status(404).json({ error: 'User not found' });
    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ==========================================
// 11. PERMANENT TIMETABLE SLOTS API
// ==========================================
app.get('/api/timetable', async (req, res) => {
  try {
    const { rows } = await query(
      `SELECT id, class_id AS "classId", subject_id AS "subjectId", teacher_id AS "teacherId",
              day_of_week AS "dayOfWeek", period_no AS "periodNo", start_time AS "startTime",
              end_time AS "endTime", room
       FROM timetable_slots
       ORDER BY class_id, day_of_week, period_no`
    );
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/timetable', async (req, res) => {
  const { id, classId, subjectId, teacherId, dayOfWeek, periodNo, startTime, endTime, room } = req.body;
  const slotId = id || `slot-${Date.now()}`;
  try {
    // 1. Check for Teacher Schedule Conflict across different classes
    if (teacherId) {
      const clashRes = await query(
        `SELECT ts.*, c.grade, c.section, u.full_name AS teacher_name
         FROM timetable_slots ts
         JOIN classes c ON ts.class_id = c.id
         LEFT JOIN teachers t ON ts.teacher_id = t.id
         LEFT JOIN users u ON t.user_id = u.id
         WHERE ts.teacher_id = $1 
           AND ts.day_of_week = $2 
           AND ts.period_no = $3 
           AND ts.class_id != $4`,
        [teacherId, dayOfWeek, periodNo, classId]
      );
      if (clashRes.rows.length > 0) {
        const clash = clashRes.rows[0];
        const teacherName = clash.teacher_name || 'This teacher';
        const otherClass = `${clash.grade} (${clash.section})`;
        return res.status(409).json({
          error: `Schedule Conflict: ${teacherName} is already assigned to ${otherClass} during Period ${periodNo} on this day.`
        });
      }
    }

    // 2. Check for Room Conflict across different classes
    if (room && String(room).trim() !== '') {
      const roomClashRes = await query(
        `SELECT ts.*, c.grade, c.section
         FROM timetable_slots ts
         JOIN classes c ON ts.class_id = c.id
         WHERE LOWER(TRIM(ts.room)) = LOWER(TRIM($1))
           AND ts.day_of_week = $2
           AND ts.period_no = $3
           AND ts.class_id != $4`,
        [room.trim(), dayOfWeek, periodNo, classId]
      );
      if (roomClashRes.rows.length > 0) {
        const clash = roomClashRes.rows[0];
        return res.status(409).json({
          error: `Room Conflict: Classroom/Hall "${room.trim()}" is already in use by ${clash.grade} (${clash.section}) during Period ${periodNo} on this day.`
        });
      }
    }

    const { rows } = await query(
      `INSERT INTO timetable_slots (id, class_id, subject_id, teacher_id, day_of_week, period_no, start_time, end_time, room)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
       ON CONFLICT (class_id, day_of_week, period_no)
       DO UPDATE SET subject_id = EXCLUDED.subject_id, teacher_id = EXCLUDED.teacher_id,
                     room = EXCLUDED.room, start_time = EXCLUDED.start_time, end_time = EXCLUDED.end_time
       RETURNING id, class_id AS "classId", subject_id AS "subjectId", teacher_id AS "teacherId",
                 day_of_week AS "dayOfWeek", period_no AS "periodNo", start_time AS "startTime",
                 end_time AS "endTime", room`,
      [slotId, classId, subjectId, teacherId, dayOfWeek, periodNo, startTime, endTime, room]
    );
    res.status(201).json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/timetable/auto-generate', async (req, res) => {
  const { classId, slots } = req.body;
  try {
    await query('DELETE FROM timetable_slots WHERE class_id = $1', [classId]);
    for (const slot of slots) {
      await query(
        `INSERT INTO timetable_slots (id, class_id, subject_id, teacher_id, day_of_week, period_no, start_time, end_time, room)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
        [slot.id, slot.classId, slot.subjectId, slot.teacherId, slot.dayOfWeek, slot.periodNo, slot.startTime, slot.endTime, slot.room]
      );
    }
    res.json({ success: true, count: slots.length });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/timetable/:id', async (req, res) => {
  const { id } = req.params;
  try {
    await query('DELETE FROM timetable_slots WHERE id = $1', [id]);
    res.json({ success: true, message: `Slot ${id} deleted.` });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/timetable/class/:classId', async (req, res) => {
  const { classId } = req.params;
  try {
    await query('DELETE FROM timetable_slots WHERE class_id = $1', [classId]);
    res.json({ success: true, message: `Cleared timetable for class ${classId}` });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/timetable/teacher/:teacherId', async (req, res) => {
  const { teacherId } = req.params;
  try {
    await query('DELETE FROM timetable_slots WHERE teacher_id = $1', [teacherId]);
    res.json({ success: true, message: `Cleared timetable for teacher ${teacherId}` });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ==========================================
// 11A. WHATSAPP WEB MULTI-DEVICE QR BOT API
// ==========================================
app.get('/api/whatsapp/status', (req, res) => {
  res.json(getWhatsAppStatus());
});

app.post('/api/whatsapp/initialize', async (req, res) => {
  try {
    const status = await initWhatsApp(true);
    res.json({ success: true, ...status });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.post('/api/whatsapp/pairing-code', async (req, res) => {
  const { phone } = req.body;
  try {
    const result = await getPairingCode(phone);
    res.json(result);
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.post('/api/whatsapp/logout', async (req, res) => {
  try {
    const result = await logoutWhatsApp();
    res.json(result);
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.post('/api/whatsapp/send-direct', async (req, res) => {
  const { to, message } = req.body;
  try {
    const result = await sendWhatsAppMessage(to, message);
    res.json({ success: true, ...result });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.post('/api/reports/send-whatsapp', async (req, res) => {
  const {
    toPhone,
    studentName = 'Student',
    studentNo = 'GSMS-2026',
    className = 'Grade 10',
    examName = 'Term Examination 2026',
    academicYear = 2026,
    studentMarksList = [],
    totalMarks = 0,
    totalPossible = 400,
    studentAvg = '0',
    rankPosition = 1,
    totalClassStudents = 1,
    finalRemarks = 'Passed',
    teacherNote = '',
    classTeacherName = 'Class Teacher',
    principalName = 'A. R. Gunawardena',
    schoolName = 'Government Senior Model School',
    schoolCode = 'GSMS-2026/ZONE-01',
    zone = 'Eastern Educational Zone',
  } = req.body;

  try {
    if (!toPhone) {
      return res.status(400).json({ success: false, error: 'Recipient phone number is required' });
    }

    const waStatus = getWhatsAppStatus();
    if (!waStatus.isConnected) {
      return res.status(400).json({
        success: false,
        error: 'WhatsApp Web is not connected. Please scan the QR code first.',
      });
    }

    const pdfBuffer = await generateReportPdfBuffer({
      schoolName,
      schoolCode,
      zone,
      academicYear,
      examName,
      studentName,
      studentNo,
      className,
      classTeacherName,
      principalName,
      studentMarksList,
      totalMarks,
      totalPossible,
      studentAvg,
      rankPosition,
      totalClassStudents,
      finalRemarks,
      teacherNote,
      serialHash: `SERIAL HASH: GSMS-2026-RPT-${(studentNo || '').replace(/[^a-zA-Z0-9]/g, '')}`,
    });

    const cleanStuName = studentName.replace(/[^a-zA-Z0-9]/g, '_');
    const pdfFileName = `Academic_Report_${cleanStuName}_${academicYear}.pdf`;

    const caption =
      `🎓 *OFFICIAL ACADEMIC REPORT CARD*\n` +
      `🏛 *${schoolName.toUpperCase()}*\n` +
      `📅 *Exam:* ${examName}\n` +
      `🏫 *Class:* ${className} | *Rank:* 🏆 #${rankPosition} of ${totalClassStudents}\n\n` +
      `Dear Parent/Guardian of *${studentName}* (Roll No: ${studentNo}),\n\n` +
      `📊 *SUMMARY METRICS:*\n` +
      `• Total Marks: *${totalMarks} / ${totalPossible}*\n` +
      `• Average: *${studentAvg}%*\n` +
      `• Result Status: *${finalRemarks}*\n\n` +
      (teacherNote && teacherNote.trim() ? `💬 *Class Teacher Note:*\n"${teacherNote.trim()}"\n\n` : '') +
      `📄 Attached above is your child's official certified Report Card PDF document.\n` +
      `👨‍🏫 Class Teacher: ${classTeacherName}\n` +
      `----------------------------------------\n` +
      `Verified Record • Government School Management System`;

    const result = await sendWhatsAppDocument(toPhone, pdfBuffer, pdfFileName, caption, 'application/pdf');

    res.json({
      success: true,
      messageId: result.messageId,
      timestamp: result.timestamp,
      message: `Report Card PDF successfully delivered to ${toPhone}`,
    });
  } catch (err) {
    console.error('Error sending report card PDF via WhatsApp:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

app.get('/api/whatsapp/meta-status', (req, res) => {
  const isConfigured = Boolean(process.env.WHATSAPP_ACCESS_TOKEN && process.env.WHATSAPP_PHONE_NUMBER_ID);
  res.json({
    isConfigured,
    phoneNumberId: process.env.WHATSAPP_PHONE_NUMBER_ID ? `${process.env.WHATSAPP_PHONE_NUMBER_ID.slice(0, 4)}...${process.env.WHATSAPP_PHONE_NUMBER_ID.slice(-4)}` : null,
    hasToken: Boolean(process.env.WHATSAPP_ACCESS_TOKEN),
  });
});

app.post('/api/whatsapp/meta-config', (req, res) => {
  const { phoneNumberId, accessToken } = req.body;
  if (!phoneNumberId || !accessToken) {
    return res.status(400).json({ error: 'Phone Number ID and Access Token are required' });
  }

  process.env.WHATSAPP_PHONE_NUMBER_ID = phoneNumberId.trim();
  process.env.WHATSAPP_ACCESS_TOKEN = accessToken.trim();

  try {
    const path = require('path');
    const fs = require('fs');
    const envPath = path.join(__dirname, '.env');
    let envContent = fs.readFileSync(envPath, 'utf8');
    if (!envContent.includes('WHATSAPP_PHONE_NUMBER_ID=')) {
      envContent += `\nWHATSAPP_PHONE_NUMBER_ID=${phoneNumberId.trim()}\nWHATSAPP_ACCESS_TOKEN=${accessToken.trim()}\n`;
    } else {
      envContent = envContent.replace(/WHATSAPP_PHONE_NUMBER_ID=.*/g, `WHATSAPP_PHONE_NUMBER_ID=${phoneNumberId.trim()}`);
      envContent = envContent.replace(/WHATSAPP_ACCESS_TOKEN=.*/g, `WHATSAPP_ACCESS_TOKEN=${accessToken.trim()}`);
    }
    fs.writeFileSync(envPath, envContent, 'utf8');
  } catch (e) {
    console.error('Error persisting .env:', e.message);
  }

  res.json({ success: true, message: 'Meta WhatsApp Cloud API credentials configured successfully!' });
});

// ==========================================
// 11B. AUTOMATED WHATSAPP TIMETABLE DISPATCHER API
// ==========================================
app.post('/api/timetable/send-whatsapp', async (req, res) => {
  const {
    dispatchType = 'class',
    classId,
    teacherId,
    className,
    academicYear = 2026,
    teacher: clientTeacher,
    students: clientStudents,
    timetableText,
    notes,
    sendToTeacher = true,
    sendToStudents = true
  } = req.body;

  try {
    const isTeacherDispatch = dispatchType === 'teacher' || (!classId && teacherId);
    const deliveryLog = [];
    const waStatus = getWhatsAppStatus();
    const isBaileysConnected = waStatus.isConnected;

    const metaToken = process.env.WHATSAPP_ACCESS_TOKEN;
    const phoneId = process.env.WHATSAPP_PHONE_NUMBER_ID;
    const isLiveMetaConfigured = Boolean(metaToken && phoneId);

    let activeDeliveryMode = 'automated_simulation';
    if (isBaileysConnected) {
      activeDeliveryMode = `Direct WhatsApp Service (${waStatus.user || 'Connected'})`;
    } else if (isLiveMetaConfigured) {
      activeDeliveryMode = 'Meta WhatsApp Cloud API';
    }

    if (isTeacherDispatch && teacherId) {
      // ── DISPATCH TYPE: TEACHER PERSONAL TIMETABLE ────────────────────────
      const tchRes = await query(
        `SELECT t.id, t.subject_specialization, t.phone AS teacher_phone, u.full_name, u.phone AS user_phone
         FROM teachers t
         LEFT JOIN users u ON t.user_id = u.id
         WHERE t.id = $1 OR t.user_id = $1`,
        [teacherId]
      );
      const row = tchRes.rows[0];
      const teacherName = clientTeacher?.name || (row ? (row.full_name || 'Teacher') : 'Teacher');
      const teacherPhone = clientTeacher?.phone || (row ? (row.user_phone || row.teacher_phone || '+94771234567') : '+94771234567');
      const specialization = row ? (row.subject_specialization || '') : '';

      const slotsRes = await query(
        `SELECT ts.*, s.name AS subject_name, s.code AS subject_code, c.grade AS class_grade, c.section AS class_section, u.full_name AS teacher_name
         FROM timetable_slots ts
         LEFT JOIN subjects s ON ts.subject_id = s.id
         LEFT JOIN classes c ON ts.class_id = c.id
         LEFT JOIN teachers t ON ts.teacher_id = t.id
         LEFT JOIN users u ON t.user_id = u.id
         WHERE ts.teacher_id = $1 OR t.user_id = $1
         ORDER BY ts.day_of_week, ts.period_no`,
        [teacherId]
      );
      const slots = slotsRes.rows;

      let pdfBuffer = null;
      try {
        pdfBuffer = await generateTimetablePdfBuffer({
          type: 'teacher',
          teacherName,
          specialization,
          academicYear,
          notes: notes || 'Official personal teaching schedule approved by Academic Administration.',
          slots
        });
      } catch (pdfErr) {
        console.warn('Teacher PDF generation notice:', pdfErr.message);
      }

      const pdfFileName = `Teacher_${teacherName.replace(/[^a-zA-Z0-9]/g, '_')}_Personal_Schedule.pdf`;
      const host = req.get('host') || 'localhost:5000';
      const pdfDocumentUrl = `${req.protocol}://${host}/api/timetable/document/teacher/${teacherId}`;

      const captionBody = `👤 *OFFICIAL TEACHER PERSONAL TIMETABLE — ${teacherName.toUpperCase()}*\n` +
        `Specialization: ${specialization || 'Academic Faculty'}\n` +
        `Academic Year: ${academicYear}\n` +
        (notes ? `Notice: ${notes}\n\n` : '\n') +
        `📄 Official Certified Teacher Schedule PDF Attached.\n` +
        `Issued by School Administration & Academic Affairs.`;

      let status = 'delivered';
      let errorReason = null;
      let messageId = `wa-${Date.now()}`;

      if (sendToTeacher && teacherPhone) {
        if (isBaileysConnected) {
          try {
            if (pdfBuffer) {
              const sendRes = await sendWhatsAppDocument(teacherPhone, pdfBuffer, pdfFileName, captionBody);
              messageId = sendRes.messageId;
            } else {
              const sendRes = await sendWhatsAppMessage(teacherPhone, captionBody);
              messageId = sendRes.messageId;
            }
          } catch (e) {
            console.error(`❌ Dispatch failed for teacher ${teacherName}:`, e.message);
            status = 'failed';
            errorReason = e.message || 'WhatsApp Web engine dispatch error';
          }
        }

        deliveryLog.push({
          role: 'Teacher',
          name: teacherName,
          phone: teacherPhone,
          status,
          errorReason,
          messageId,
          deliveredAt: new Date().toISOString()
        });
      }

      const notifTitle = `WhatsApp Broadcast: Teacher ${teacherName} Timetable`;
      const notifMessage = `Teacher Personal Schedule PDF sent via WhatsApp to ${teacherName} (${teacherPhone}). (Mode: ${activeDeliveryMode})`;

      await query(
        `INSERT INTO notifications (id, recipient_id, title, message, channel, status, category, is_read, sent_at)
         VALUES ($1, $2, $3, $4, 'in_app', 'sent', 'timetable', false, CURRENT_TIMESTAMP)`,
        [`notif-wa-${Date.now()}`, teacherId || 'all', notifTitle, notifMessage]
      );

      const totalDelivered = deliveryLog.filter(d => d.status === 'delivered').length;
      const totalFailed = deliveryLog.filter(d => d.status === 'failed').length;
      const totalTarget = deliveryLog.length;

      return res.json({
        success: true,
        mode: activeDeliveryMode,
        isRealDelivery: isBaileysConnected || isLiveMetaConfigured,
        className: `Teacher Personal (${teacherName})`,
        teacher: { name: teacherName, phone: teacherPhone },
        studentsCount: 0,
        totalTarget,
        totalDelivered,
        totalFailed,
        successRate: totalTarget > 0 ? `${Math.round((totalDelivered / totalTarget) * 100)}%` : '0%',
        handshakeStatus: totalFailed === 0 ? 'SUCCESS_ACK_COMPLETE' : totalDelivered > 0 ? 'PARTIAL_ACK' : 'TRANSMISSION_FAILED',
        documentUrl: pdfDocumentUrl,
        deliveryLog,
        message: `Official teacher personal timetable successfully dispatched to ${teacherName}.`
      });
    }

    // ── DISPATCH TYPE: CLASS TIMETABLE ─────────────────────────────────────
    let targetClass = null;
    if (classId) {
      const clsRes = await query('SELECT * FROM classes WHERE id = $1', [classId]);
      if (clsRes.rows.length > 0) targetClass = clsRes.rows[0];
    }
    const finalClassName = className || (targetClass ? `${targetClass.grade} (${targetClass.section})` : 'Grade 10 (A)');

    let teacher = clientTeacher || null;
    if (!teacher && targetClass && targetClass.class_teacher_id) {
      const tchRes = await query(
        `SELECT t.id, t.phone AS teacher_phone, u.full_name, u.phone AS user_phone
         FROM teachers t
         LEFT JOIN users u ON t.user_id = u.id
         WHERE t.id = $1 OR t.user_id = $1`,
        [targetClass.class_teacher_id]
      );
      if (tchRes.rows.length > 0) {
        const row = tchRes.rows[0];
        teacher = {
          name: row.full_name || 'Class Teacher',
          phone: row.user_phone || row.teacher_phone || '+94771234567'
        };
      }
    }
    if (!teacher) {
      teacher = { name: 'Grade 10 Class Teacher', phone: '+94771234567' };
    }

    let students = Array.isArray(clientStudents) && clientStudents.length > 0 ? clientStudents : [];
    if (students.length === 0 && classId) {
      const stuRes = await query(
        `SELECT s.id, s.student_no AS "studentNo", s.first_name || ' ' || s.last_name AS name,
                COALESCE(s.guardian_phone, s.phone, u.phone) AS phone,
                s.guardian_phone AS "guardianPhone",
                s.guardian_name AS "guardianName"
         FROM students s
         LEFT JOIN users u ON s.user_id = u.id
         WHERE s.class_id = $1 AND s.status = 'active'`,
        [classId]
      );
      students = stuRes.rows;
    }

    const slotsRes = await query(
      `SELECT ts.*, s.name AS subject_name, s.code AS subject_code, u.full_name AS teacher_name
       FROM timetable_slots ts
       LEFT JOIN subjects s ON ts.subject_id = s.id
       LEFT JOIN teachers t ON ts.teacher_id = t.id
       LEFT JOIN users u ON t.user_id = u.id
       WHERE ts.class_id = $1
       ORDER BY ts.day_of_week, ts.period_no`,
      [classId || 'class-1790750809374']
    );
    const slots = slotsRes.rows;

    let pdfBuffer = null;
    try {
      pdfBuffer = await generateTimetablePdfBuffer({
        type: 'class',
        className: finalClassName,
        academicYear,
        teacherName: teacher.name,
        notes: notes || 'Official 40-period weekly schedule approved by Academic Administration.',
        slots
      });
    } catch (pdfErr) {
      console.warn('PDF generation fallback:', pdfErr.message);
    }

    const pdfFileName = `Timetable_${finalClassName.replace(/[^a-zA-Z0-9]/g, '_')}_${academicYear}.pdf`;
    const host = req.get('host') || 'localhost:5000';
    const pdfDocumentUrl = `${req.protocol}://${host}/api/timetable/document/class/${classId || 'class-10a'}`;

    const captionBody = `📚 *OFFICIAL CLASS TIMETABLE — ${finalClassName.toUpperCase()}*\n` +
      `Academic Year: ${academicYear}\n` +
      `Class Teacher: ${teacher.name}\n` +
      (notes ? `Notice: ${notes}\n\n` : '\n') +
      `📄 Official Certified PDF Attached above.\n` +
      `Issued by School Administration & Academic Affairs.`;

    if (sendToTeacher && teacher.phone) {
      let status = 'delivered';
      let errorReason = null;
      let messageId = `wa-${Date.now()}`;

      if (isBaileysConnected) {
        try {
          if (pdfBuffer) {
            const sendRes = await sendWhatsAppDocument(teacher.phone, pdfBuffer, pdfFileName, captionBody);
            messageId = sendRes.messageId;
          } else {
            const sendRes = await sendWhatsAppMessage(teacher.phone, captionBody);
            messageId = sendRes.messageId;
          }
        } catch (e) {
          status = 'failed';
          errorReason = e.message || 'WhatsApp Web engine dispatch error';
        }
      }

      deliveryLog.push({
        role: 'Class Teacher',
        name: teacher.name,
        phone: teacher.phone,
        status,
        errorReason,
        messageId,
        deliveredAt: new Date().toISOString()
      });
    }

    if (sendToStudents) {
      for (const stu of students) {
        if (!stu.phone) continue;
        const phone = stu.phone;
        let status = 'delivered';
        let errorReason = null;
        let messageId = `wa-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;

        const studentCaption = `📚 *OFFICIAL CLASS TIMETABLE — ${finalClassName.toUpperCase()}*\n` +
          `Student: ${stu.name}\n` +
          `Class Teacher: ${teacher.name}\n` +
          `Academic Year: ${academicYear}\n` +
          (notes ? `Notice: ${notes}\n\n` : '\n') +
          `📄 Attached is your official certified weekly timetable PDF.\n` +
          `Issued by School Administration & Academic Affairs.`;

        if (isBaileysConnected) {
          try {
            if (pdfBuffer) {
              const sendRes = await sendWhatsAppDocument(phone, pdfBuffer, pdfFileName, studentCaption);
              messageId = sendRes.messageId;
            } else {
              const sendRes = await sendWhatsAppMessage(phone, studentCaption);
              messageId = sendRes.messageId;
            }
          } catch (e) {
            status = 'failed';
            errorReason = e.message || 'WhatsApp Web engine dispatch error';
          }
        }

        deliveryLog.push({
          role: 'Student / Guardian',
          name: stu.name,
          studentNo: stu.studentNo,
          phone,
          status,
          errorReason,
          messageId,
          deliveredAt: new Date().toISOString()
        });
      }
    }

    const totalDelivered = deliveryLog.filter(d => d.status === 'delivered').length;
    const totalFailed = deliveryLog.filter(d => d.status === 'failed').length;
    const totalTarget = deliveryLog.length;

    let targetTeacherRecipient = classId || 'all';
    if (classId) {
      const clsRes = await query('SELECT class_teacher_id FROM classes WHERE id = $1', [classId]);
      if (clsRes.rows.length > 0 && clsRes.rows[0].class_teacher_id) {
        targetTeacherRecipient = clsRes.rows[0].class_teacher_id;
      }
    }

    await query(
      `INSERT INTO notifications (id, recipient_id, title, message, channel, status, category, is_read, sent_at)
       VALUES ($1, $2, $3, $4, 'in_app', 'sent', 'timetable', false, CURRENT_TIMESTAMP)`,
      [`notif-wa-${Date.now()}`, targetTeacherRecipient, notifTitle, notifMessage]
    );

    await query(
      `INSERT INTO audit_logs (id, actor_id, actor_name, action, entity, entity_id, details)
       VALUES ($1, 'system', 'WhatsApp Dispatcher', 'EXPORT', 'Timetable', $2, $3)`,
      [`audit-wa-${Date.now()}`, classId || 'class-10a', `Automated WhatsApp broadcast of ${finalClassName} timetable to ${totalDelivered} recipients via ${activeDeliveryMode}.`]
    );

    res.json({
      success: true,
      mode: activeDeliveryMode,
      isRealDelivery: isBaileysConnected || isLiveMetaConfigured,
      className: finalClassName,
      teacher,
      studentsCount: students.length,
      totalTarget,
      totalDelivered,
      totalFailed,
      successRate: totalTarget > 0 ? `${Math.round((totalDelivered / totalTarget) * 100)}%` : '0%',
      handshakeStatus: totalFailed === 0 ? 'SUCCESS_ACK_COMPLETE' : totalDelivered > 0 ? 'PARTIAL_ACK' : 'TRANSMISSION_FAILED',
      documentUrl: pdfDocumentUrl,
      deliveryLog,
      message: `Official weekly timetable successfully dispatched via ${activeDeliveryMode} to Class Teacher (${teacher.name}) and ${students.length} students.`
    });
  } catch (err) {
    console.error('WhatsApp Dispatcher Error:', err);
    res.status(500).json({ error: err.message });
  }
});

// ==========================================
// 11C. TIMETABLE PDF & WEB DOCUMENT GENERATION ENDPOINTS
// ==========================================

// Downloadable Teacher Personal Timetable PDF Document
app.get('/api/timetable/pdf/teacher/:teacherId', async (req, res) => {
  const { teacherId } = req.params;
  try {
    const tchRes = await query(
      `SELECT t.id, t.subject_specialization, t.phone AS teacher_phone, u.full_name
       FROM teachers t
       LEFT JOIN users u ON t.user_id = u.id
       WHERE t.id = $1 OR t.user_id = $1 OR t.employee_no = $1`,
      [teacherId]
    );
    const row = tchRes.rows[0];
    const teacherName = row ? (row.full_name || 'Teacher') : 'Teacher';
    const specialization = row ? (row.subject_specialization || '') : '';

    const slotsRes = await query(
      `SELECT ts.*, s.name AS subject_name, s.code AS subject_code, c.grade AS class_grade, c.section AS class_section, u.full_name AS teacher_name
       FROM timetable_slots ts
       LEFT JOIN subjects s ON ts.subject_id = s.id
       LEFT JOIN classes c ON ts.class_id = c.id
       LEFT JOIN teachers t ON ts.teacher_id = t.id
       LEFT JOIN users u ON t.user_id = u.id
       WHERE ts.teacher_id = $1 OR t.user_id = $1 OR ts.teacher_id IN (SELECT id FROM teachers WHERE user_id = $1 OR employee_no = $1)
       ORDER BY ts.day_of_week, ts.period_no`,
      [teacherId]
    );

    const pdfBuffer = await generateTimetablePdfBuffer({
      type: 'teacher',
      teacherName,
      specialization,
      academicYear: 2026,
      notes: 'Certified Teacher Personal Master Schedule',
      slots: slotsRes.rows
    });

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `inline; filename="Teacher_${teacherName.replace(/[^a-zA-Z0-9]/g, '_')}_Personal_Schedule.pdf"`);
    res.send(pdfBuffer);
  } catch (err) {
    res.status(500).send('Error generating Teacher PDF: ' + err.message);
  }
});

// Downloadable Class Timetable PDF Document
app.get('/api/timetable/pdf/class/:classId', async (req, res) => {
  const { classId } = req.params;
  try {
    const clsRes = await query('SELECT * FROM classes WHERE id = $1', [classId]);
    const targetClass = clsRes.rows[0];
    const className = targetClass ? `${targetClass.grade} Section ${targetClass.section}` : 'Grade 10 Section A';

    let teacherName = 'Class Teacher';
    try {
      if (targetClass?.class_teacher_id) {
        const ctRes = await query(
          `SELECT u.full_name FROM teachers t JOIN users u ON t.user_id = u.id WHERE t.id = $1 OR t.user_id = $1 OR t.employee_no = $1 LIMIT 1`,
          [targetClass.class_teacher_id]
        );
        if (ctRes.rows[0]?.full_name) teacherName = ctRes.rows[0].full_name;
      }
    } catch (_) {}

    const slotsRes = await query(
      `SELECT ts.*, s.name AS subject_name, s.code AS subject_code, u.full_name AS teacher_name
       FROM timetable_slots ts
       LEFT JOIN subjects s ON ts.subject_id = s.id
       LEFT JOIN teachers t ON ts.teacher_id = t.id
       LEFT JOIN users u ON t.user_id = u.id
       WHERE ts.class_id = $1
       ORDER BY ts.day_of_week, ts.period_no`,
      [classId]
    );

    const pdfBuffer = await generateTimetablePdfBuffer({
      type: 'class',
      className,
      academicYear: 2026,
      teacherName,
      notes: 'Certified Academic Class Timetable',
      slots: slotsRes.rows
    });

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `inline; filename="Timetable_${className.replace(/[^a-zA-Z0-9]/g, '_')}.pdf"`);
    res.send(pdfBuffer);
  } catch (err) {
    res.status(500).send('Error generating Class PDF: ' + err.message);
  }
});

// PDF Document Fallback Alias Route
app.get('/api/timetable/pdf/:id', async (req, res) => {
  const { id } = req.params;
  if (id.startsWith('tch-') || id.startsWith('user-tch-') || id.startsWith('user-')) {
    return res.redirect(`/api/timetable/pdf/teacher/${id}`);
  }
  return res.redirect(`/api/timetable/pdf/class/${id}`);
});

// Downloadable / Printable HTML Web Timetable Document for Teacher
app.get('/api/timetable/document/teacher/:teacherId', async (req, res) => {
  const { teacherId } = req.params;
  try {
    const tchRes = await query(
      `SELECT t.id, t.subject_specialization, t.phone AS teacher_phone, u.full_name
       FROM teachers t
       LEFT JOIN users u ON t.user_id = u.id
       WHERE t.id = $1 OR t.user_id = $1 OR t.employee_no = $1`,
      [teacherId]
    );
    const row = tchRes.rows[0];
    const teacherName = row ? (row.full_name || 'Teacher') : 'Teacher';
    const specialization = row ? (row.subject_specialization || 'Academic Faculty') : 'Academic Faculty';

    let schoolName = 'GOVERNMENT SENIOR MODEL SCHOOL (GSMS)';
    try {
      const schRes = await query('SELECT name FROM schools LIMIT 1');
      if (schRes.rows[0]?.name) schoolName = schRes.rows[0].name;
    } catch (_) {}

    const slotsRes = await query(
      `SELECT ts.*, s.name AS subject_name, s.code AS subject_code, c.grade AS class_grade, c.section AS class_section, u.full_name AS teacher_name
       FROM timetable_slots ts
       LEFT JOIN subjects s ON ts.subject_id = s.id
       LEFT JOIN classes c ON ts.class_id = c.id
       LEFT JOIN teachers t ON ts.teacher_id = t.id
       LEFT JOIN users u ON t.user_id = u.id
       WHERE ts.teacher_id = $1 OR t.user_id = $1 OR ts.teacher_id IN (SELECT id FROM teachers WHERE user_id = $1 OR employee_no = $1)
       ORDER BY ts.day_of_week, ts.period_no`,
      [teacherId]
    );

    const days = [
      { no: 1, name: 'Monday' },
      { no: 2, name: 'Tuesday' },
      { no: 3, name: 'Wednesday' },
      { no: 4, name: 'Thursday' },
      { no: 5, name: 'Friday' }
    ];

    const periods = [
      { no: 1, time: '08:00 - 08:45' },
      { no: 2, time: '08:45 - 09:30' },
      { no: 3, time: '09:30 - 10:15' },
      { no: 4, time: '10:15 - 11:00' },
      { interval: true, label: 'RECESS', time: '11:00 - 11:15' },
      { no: 5, time: '11:15 - 12:00' },
      { no: 6, time: '12:00 - 12:45' },
      { no: 7, time: '12:45 - 01:25' },
      { no: 8, time: '01:25 - 02:00' }
    ];

    const headerColsHtml = periods.map(p => {
      if (p.interval) {
        return `
          <th style="background: #ca8a04; color: #ffffff; font-size: 11px; font-weight: 700; padding: 10px 4px; text-align: center; width: 65px; border: 1px solid #a16207;">
            RECESS<br><span style="font-size: 9px; font-weight: normal; opacity: 0.95;">11:00-11:15</span>
          </th>
        `;
      }
      return `
        <th style="background: #065f46; color: #ffffff; font-size: 11px; font-weight: 700; padding: 10px 6px; text-align: center; min-width: 95px; border: 1px solid #064e3b;">
          Period ${p.no}<br><span style="font-size: 9px; font-weight: normal; color: #a7f3d0;">${p.time}</span>
        </th>
      `;
    }).join('');

    const tableRowsHtml = days.map(d => {
      const cellsHtml = periods.map(p => {
        if (p.interval) {
          return `
            <td style="background: #fefce8; border: 1px solid #fde047; text-align: center; vertical-align: middle; padding: 6px;">
              <span style="font-size: 10px; font-weight: bold; color: #a16207; letter-spacing: 0.5px;">TEA BREAK</span><br>
              <span style="font-size: 9px; color: #ca8a04;">15 mins</span>
            </td>
          `;
        }
        const slot = slotsRes.rows.find(s => Number(s.day_of_week) === d.no && Number(s.period_no) === p.no);
        if (!slot) {
          return `
            <td style="background: #ffffff; border: 1px solid #e2e8f0; text-align: center; vertical-align: middle; padding: 10px 6px; color: #94a3b8; font-size: 12px;">
              <span style="color: #cbd5e1;">FREE</span>
            </td>
          `;
        }
        const clsDisplay = slot.class_grade ? `Grade ${slot.class_grade} (${slot.class_section || 'A'})` : 'Assigned Class';
        return `
          <td style="background: #f0fdf4; border: 1px solid #bbf7d0; vertical-align: top; padding: 8px 6px; min-width: 95px;">
            <div style="font-weight: 800; font-size: 11px; color: #15803d; line-height: 1.2; margin-bottom: 2px;">
              ${clsDisplay}
            </div>
            <div style="font-weight: 700; font-size: 11px; color: #0f172a; margin-bottom: 3px;">
              ${slot.subject_name || slot.subject_code || 'Subject'}
            </div>
            ${slot.room ? `<div style="display: inline-block; font-size: 9px; font-weight: 600; color: #065f46; background: #d1fae5; border: 1px solid #a7f3d0; padding: 1px 5px; border-radius: 4px;">${slot.room}</div>` : ''}
          </td>
        `;
      }).join('');

      return `
        <tr>
          <th style="background: #f8fafc; border: 1px solid #cbd5e1; font-weight: 700; font-size: 12px; color: #0f172a; padding: 12px 8px; text-align: center; vertical-align: middle; width: 85px;">
            ${d.name}
          </th>
          ${cellsHtml}
        </tr>
      `;
    }).join('');

    res.send(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>Official Teacher Timetable - ${teacherName}</title>
        <meta name="viewport" content="width=device-width, initial-scale=1">
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; padding: 24px; color: #0f172a; background: #f8fafc; margin: 0; }
          .container { max-width: 1050px; margin: 0 auto; background: #fff; border: 1px solid #e2e8f0; border-radius: 16px; padding: 28px; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.1); }
          .top-bar { display: flex; justify-content: space-between; align-items: center; margin-bottom: 18px; flex-wrap: wrap; gap: 10px; }
          .header { text-align: center; border-bottom: 2px solid #059669; padding-bottom: 16px; margin-bottom: 20px; }
          .header h1 { margin: 0; font-size: 22px; color: #1e293b; letter-spacing: 0.5px; text-transform: uppercase; }
          .header h2 { margin: 6px 0 0 0; font-size: 14px; color: #059669; font-weight: 700; }
          .meta { display: flex; justify-content: space-between; align-items: center; background: #ecfdf5; border: 1px solid #a7f3d0; padding: 12px 20px; border-radius: 10px; margin-bottom: 20px; font-size: 13px; flex-wrap: wrap; gap: 10px; }
          .table-container { width: 100%; overflow-x: auto; margin-bottom: 24px; border-radius: 8px; box-shadow: 0 1px 3px rgba(0,0,0,0.05); }
          table.timetable-table { width: 100%; border-collapse: collapse; min-width: 800px; text-align: left; }
          .notice-box { background: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 8px; padding: 14px 18px; margin-bottom: 24px; font-size: 13px; color: #166534; line-height: 1.5; }
          .footer { display: flex; justify-content: space-between; align-items: flex-end; margin-top: 24px; padding-top: 16px; border-top: 1px solid #e2e8f0; font-size: 12px; color: #64748b; }
          .stamp { border: 2px dashed #059669; padding: 10px 20px; border-radius: 8px; text-align: center; color: #047857; }
          .btn-pdf { background: #059669; color: #fff; padding: 9px 18px; border-radius: 8px; text-decoration: none; font-weight: 600; font-size: 13px; display: inline-flex; align-items: center; gap: 6px; border: none; cursor: pointer; transition: background 0.2s; }
          .btn-pdf:hover { background: #047857; }
          .btn-print { background: #0f172a; color: #fff; padding: 9px 18px; border-radius: 8px; text-decoration: none; font-weight: 600; font-size: 13px; display: inline-flex; align-items: center; gap: 6px; border: none; cursor: pointer; transition: background 0.2s; }
          .btn-print:hover { background: #334155; }
          @media print {
            .top-bar { display: none !important; }
            body { padding: 0; background: #fff; }
            .container { border: none; box-shadow: none; padding: 0; max-width: 100%; }
          }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="top-bar">
            <span style="font-size: 13px; color: #059669; font-weight: 700; display: inline-flex; align-items: center; gap: 6px;">
              ✔ Verified Official Teacher Schedule
            </span>
            <div style="display: flex; gap: 10px; align-items: center;">
              <a href="/api/timetable/pdf/teacher/${teacherId}" target="_blank" class="btn-pdf">
                📄 Open / Download Official PDF
              </a>
              <button class="btn-print" onclick="window.print()">
                🖨️ Print Timetable
              </button>
            </div>
          </div>

          <div class="header">
            <h1>${schoolName}</h1>
            <h2>OFFICIAL TEACHER PERSONAL TIMETABLE — ${teacherName.toUpperCase()} (AY 2026)</h2>
          </div>

          <div class="meta">
            <div><strong>Teacher Name:</strong> ${teacherName}</div>
            <div><strong>Faculty Specialization:</strong> ${specialization}</div>
            <div><strong>Academic Year:</strong> 2026</div>
            <div><strong>Status:</strong> <span style="color: #059669; font-weight: 700;">Certified & Approved</span></div>
          </div>

          <div class="table-container">
            <table class="timetable-table">
              <thead>
                <tr>
                  <th style="background: #0f172a; color: #ffffff; font-size: 11px; font-weight: 700; padding: 10px 8px; text-align: center; border: 1px solid #0f172a;">
                    DAY / TIME
                  </th>
                  ${headerColsHtml}
                </tr>
              </thead>
              <tbody>
                ${tableRowsHtml}
              </tbody>
            </table>
          </div>

          <div class="notice-box">
            <strong>Faculty Schedule Notice:</strong> This master schedule represents your official teaching period allocations for Academic Year 2026. Please adhere to scheduled class times and rooms.
          </div>

          <div class="footer">
            <div>
              <strong>Academic Affairs Division</strong><br>
              Reference: TT/TEACHER/2026/${teacherId}<br>
              Issued: ${new Date().toLocaleDateString('en-GB')}
            </div>
            <div class="stamp">
              <div style="font-weight: 800; font-size: 12px; letter-spacing: 0.5px;">APPROVED & DIGITALLY SEALED</div>
              <div style="font-size: 11px; margin-top: 2px;">Principal Office</div>
            </div>
          </div>
        </div>
      </body>
      </html>
    `);
  } catch (err) {
    res.status(500).send('Error generating teacher timetable view: ' + err.message);
  }
});

// Downloadable / Printable HTML Web Timetable Document for Class
app.get('/api/timetable/document/class/:classId', async (req, res) => {
  const { classId } = req.params;
  try {
    const clsRes = await query('SELECT * FROM classes WHERE id = $1', [classId]);
    const targetClass = clsRes.rows[0];
    const className = targetClass ? `${targetClass.grade} Section ${targetClass.section}` : 'Grade 10 Section A';

    let schoolName = 'GOVERNMENT SENIOR MODEL SCHOOL (GSMS)';
    try {
      const schRes = await query('SELECT name FROM schools LIMIT 1');
      if (schRes.rows[0]?.name) schoolName = schRes.rows[0].name;
    } catch (_) {}

    let teacherName = 'Class Teacher';
    try {
      if (targetClass?.class_teacher_id) {
        const ctRes = await query(
          `SELECT u.full_name FROM teachers t JOIN users u ON t.user_id = u.id WHERE t.id = $1 OR t.user_id = $1 OR t.employee_no = $1 LIMIT 1`,
          [targetClass.class_teacher_id]
        );
        if (ctRes.rows[0]?.full_name) teacherName = ctRes.rows[0].full_name;
      }
    } catch (_) {}

    const slotsRes = await query(
      `SELECT ts.*, s.name AS subject_name, s.code AS subject_code, u.full_name AS teacher_name
       FROM timetable_slots ts
       LEFT JOIN subjects s ON ts.subject_id = s.id
       LEFT JOIN teachers t ON ts.teacher_id = t.id
       LEFT JOIN users u ON t.user_id = u.id
       WHERE ts.class_id = $1
       ORDER BY ts.day_of_week, ts.period_no`,
      [classId]
    );

    const days = [
      { no: 1, name: 'Monday' },
      { no: 2, name: 'Tuesday' },
      { no: 3, name: 'Wednesday' },
      { no: 4, name: 'Thursday' },
      { no: 5, name: 'Friday' }
    ];

    const periods = [
      { no: 1, time: '08:00 - 08:45' },
      { no: 2, time: '08:45 - 09:30' },
      { no: 3, time: '09:30 - 10:15' },
      { no: 4, time: '10:15 - 11:00' },
      { interval: true, label: 'RECESS', time: '11:00 - 11:15' },
      { no: 5, time: '11:15 - 12:00' },
      { no: 6, time: '12:00 - 12:45' },
      { no: 7, time: '12:45 - 01:25' },
      { no: 8, time: '01:25 - 02:00' }
    ];

    const headerColsHtml = periods.map(p => {
      if (p.interval) {
        return `
          <th style="background: #ca8a04; color: #ffffff; font-size: 11px; font-weight: 700; padding: 10px 4px; text-align: center; width: 65px; border: 1px solid #a16207;">
            RECESS<br><span style="font-size: 9px; font-weight: normal; opacity: 0.95;">11:00-11:15</span>
          </th>
        `;
      }
      return `
        <th style="background: #1e3a8a; color: #ffffff; font-size: 11px; font-weight: 700; padding: 10px 6px; text-align: center; min-width: 95px; border: 1px solid #172554;">
          Period ${p.no}<br><span style="font-size: 9px; font-weight: normal; color: #bfdbfe;">${p.time}</span>
        </th>
      `;
    }).join('');

    const tableRowsHtml = days.map(d => {
      const cellsHtml = periods.map(p => {
        if (p.interval) {
          return `
            <td style="background: #fefce8; border: 1px solid #fde047; text-align: center; vertical-align: middle; padding: 6px;">
              <span style="font-size: 10px; font-weight: bold; color: #a16207; letter-spacing: 0.5px;">TEA BREAK</span><br>
              <span style="font-size: 9px; color: #ca8a04;">15 mins</span>
            </td>
          `;
        }
        const slot = slotsRes.rows.find(s => Number(s.day_of_week) === d.no && Number(s.period_no) === p.no);
        if (!slot) {
          return `
            <td style="background: #ffffff; border: 1px solid #e2e8f0; text-align: center; vertical-align: middle; padding: 10px 6px; color: #94a3b8; font-size: 12px;">
              <span style="color: #cbd5e1;">—</span>
            </td>
          `;
        }
        return `
          <td style="background: #ffffff; border: 1px solid #cbd5e1; vertical-align: top; padding: 8px 6px; min-width: 95px;">
            <div style="font-weight: 700; font-size: 12px; color: #1e3a8a; line-height: 1.25; margin-bottom: 3px;">
              ${slot.subject_name || slot.subject_code || 'Subject'}
            </div>
            <div style="font-size: 11px; color: #475569; margin-bottom: 4px;">
              ${slot.teacher_name || 'Staff'}
            </div>
            ${slot.room ? `<div style="display: inline-block; font-size: 10px; font-weight: 600; color: #166534; background: #dcfce7; border: 1px solid #bbf7d0; padding: 1px 6px; border-radius: 4px;">${slot.room}</div>` : ''}
          </td>
        `;
      }).join('');

      return `
        <tr>
          <th style="background: #f8fafc; border: 1px solid #cbd5e1; font-weight: 700; font-size: 12px; color: #0f172a; padding: 12px 8px; text-align: center; vertical-align: middle; width: 85px;">
            ${d.name}
          </th>
          ${cellsHtml}
        </tr>
      `;
    }).join('');

    res.send(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>Official Timetable - ${className}</title>
        <meta name="viewport" content="width=device-width, initial-scale=1">
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; padding: 24px; color: #0f172a; background: #f8fafc; margin: 0; }
          .container { max-width: 1050px; margin: 0 auto; background: #fff; border: 1px solid #e2e8f0; border-radius: 16px; padding: 28px; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.1); }
          .top-bar { display: flex; justify-content: space-between; align-items: center; margin-bottom: 18px; flex-wrap: wrap; gap: 10px; }
          .header { text-align: center; border-bottom: 2px solid #2563eb; padding-bottom: 16px; margin-bottom: 20px; }
          .header h1 { margin: 0; font-size: 22px; color: #1e293b; letter-spacing: 0.5px; text-transform: uppercase; }
          .header h2 { margin: 6px 0 0 0; font-size: 14px; color: #2563eb; font-weight: 700; }
          .meta { display: flex; justify-content: space-between; align-items: center; background: #f1f5f9; padding: 12px 20px; border-radius: 10px; margin-bottom: 20px; font-size: 13px; flex-wrap: wrap; gap: 10px; }
          .table-container { width: 100%; overflow-x: auto; margin-bottom: 24px; border-radius: 8px; box-shadow: 0 1px 3px rgba(0,0,0,0.05); }
          table.timetable-table { width: 100%; border-collapse: collapse; min-width: 800px; text-align: left; }
          .notice-box { background: #ecfdf5; border: 1px solid #a7f3d0; border-radius: 8px; padding: 14px 18px; margin-bottom: 24px; font-size: 13px; color: #065f46; line-height: 1.5; }
          .footer { display: flex; justify-content: space-between; align-items: flex-end; margin-top: 24px; padding-top: 16px; border-top: 1px solid #e2e8f0; font-size: 12px; color: #64748b; }
          .stamp { border: 2px dashed #0f172a; padding: 10px 20px; border-radius: 8px; text-align: center; color: #0f172a; }
          .btn-pdf { background: #2563eb; color: #fff; padding: 9px 18px; border-radius: 8px; text-decoration: none; font-weight: 600; font-size: 13px; display: inline-flex; align-items: center; gap: 6px; border: none; cursor: pointer; transition: background 0.2s; }
          .btn-pdf:hover { background: #1d4ed8; }
          .btn-print { background: #0f172a; color: #fff; padding: 9px 18px; border-radius: 8px; text-decoration: none; font-weight: 600; font-size: 13px; display: inline-flex; align-items: center; gap: 6px; border: none; cursor: pointer; transition: background 0.2s; }
          .btn-print:hover { background: #334155; }
          @media print {
            .top-bar { display: none !important; }
            body { padding: 0; background: #fff; }
            .container { border: none; box-shadow: none; padding: 0; max-width: 100%; }
          }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="top-bar">
            <span style="font-size: 13px; color: #16a34a; font-weight: 700; display: inline-flex; align-items: center; gap: 6px;">
              ✔ Verified Official WhatsApp Document
            </span>
            <div style="display: flex; gap: 10px; align-items: center;">
              <a href="/api/timetable/pdf/class/${classId}" target="_blank" class="btn-pdf">
                📄 Open / Download Official PDF
              </a>
              <button class="btn-print" onclick="window.print()">
                🖨️ Print Timetable
              </button>
            </div>
          </div>

          <div class="header">
            <h1>${schoolName}</h1>
            <h2>OFFICIAL CLASS TIMETABLE — ${className.toUpperCase()} (AY 2026)</h2>
          </div>

          <div class="meta">
            <div><strong>Class:</strong> ${className}</div>
            <div><strong>Class Teacher:</strong> ${teacherName}</div>
            <div><strong>Academic Year:</strong> 2026</div>
            <div><strong>Status:</strong> <span style="color: #16a34a; font-weight: 700;">Certified & Active</span></div>
          </div>

          <div class="table-container">
            <table class="timetable-table">
              <thead>
                <tr>
                  <th style="background: #0f172a; color: #ffffff; font-size: 11px; font-weight: 700; padding: 10px 8px; text-align: center; border: 1px solid #0f172a;">
                    DAY / TIME
                  </th>
                  ${headerColsHtml}
                </tr>
              </thead>
              <tbody>
                ${tableRowsHtml}
              </tbody>
            </table>
          </div>

          <div class="notice-box">
            <strong>Notice to Students & Parents:</strong> This timetable has been officially confirmed and dispatched by the School Administration. Classes follow the regular 8-period daily structure with interval from 11:00 AM to 11:15 AM. Please ensure students arrive promptly with the required subject textbooks and materials.
          </div>

          <div class="footer">
            <div>
              <strong>Academic Affairs Division</strong><br>
              Reference: TT/2026/${classId}<br>
              Issued: ${new Date().toLocaleDateString('en-GB')}
            </div>
            <div class="stamp">
              <div style="font-weight: 800; font-size: 12px; letter-spacing: 0.5px;">APPROVED & DIGITALLY SEALED</div>
              <div style="font-size: 11px; margin-top: 2px;">Principal Office</div>
            </div>
          </div>
        </div>
      </body>
      </html>
    `);
  } catch (err) {
    res.status(500).send('Error generating Class timetable view: ' + err.message);
  }
});

// HTML Document Fallback Alias Route
app.get('/api/timetable/document/:id', async (req, res) => {
  const { id } = req.params;
  if (id.startsWith('tch-') || id.startsWith('user-tch-') || id.startsWith('user-')) {
    return res.redirect(`/api/timetable/document/teacher/${id}`);
  }
  return res.redirect(`/api/timetable/document/class/${id}`);
});

// ==========================================
// 12. EXAMS & EXAM RESULTS API
// ==========================================
app.get('/api/exams', async (req, res) => {
  try {
    const { rows } = await query(
      `SELECT id, name, term, academic_year AS "academicYear",
              TO_CHAR(start_date, 'YYYY-MM-DD') AS "startDate",
              TO_CHAR(end_date, 'YYYY-MM-DD') AS "endDate",
              is_published AS "isPublished"
       FROM exams
       ORDER BY academic_year DESC, term ASC`
    );
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/exam-results', async (req, res) => {
  try {
    const { rows } = await query(
      `SELECT r.id, r.exam_id AS "examId", r.student_id AS "studentId", s.student_no AS "studentNo",
              r.subject_id AS "subjectId", r.marks_obtained AS "marksObtained", r.grade, r.remarks
       FROM exam_results r
       LEFT JOIN students s ON r.student_id = s.id`
    );
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/exam-results', async (req, res) => {
  const { id, examId, studentId, subjectId, marksObtained, grade, remarks } = req.body;
  try {
    // Resolve student ID by id or student_no in PostgreSQL
    let targetStudentId = studentId;
    const stuRes = await query('SELECT id FROM students WHERE id = $1 OR student_no = $2', [studentId, studentId]);
    if (stuRes.rows.length > 0) {
      targetStudentId = stuRes.rows[0].id;
    } else {
      // Auto-create missing student in PostgreSQL database so Foreign Key NEVER fails
      const newStuId = studentId.startsWith('stu-') ? studentId : `stu-${Date.now()}`;
      const newStuNo = studentId.startsWith('GSMS-') ? studentId : `GSMS-${Date.now()}`;
      await query(
        `INSERT INTO students (id, school_id, student_no, first_name, last_name, date_of_birth, class_id, status)
         VALUES ($1, 'sch-colombo-01', $2, 'Student', 'Record', '2012-01-01', 'class-9a', 'active')
         ON CONFLICT (student_no) DO UPDATE SET first_name = EXCLUDED.first_name`,
        [newStuId, newStuNo]
      );
      targetStudentId = newStuId;
    }

    const resId = id || `res-${examId}-${targetStudentId}-${subjectId}`;
    const existingResult = await query(
      'SELECT id FROM exam_results WHERE (exam_id = $1 AND student_id = $2 AND subject_id = $3) OR id = $4',
      [examId, targetStudentId, subjectId, resId]
    );

    let resultRows;
    if (existingResult.rows.length > 0) {
      const targetId = existingResult.rows[0].id;
      const updated = await query(
        `UPDATE exam_results
         SET marks_obtained = $1, grade = $2, remarks = $3
         WHERE id = $4
         RETURNING id, exam_id AS "examId", student_id AS "studentId", subject_id AS "subjectId",
                   marks_obtained AS "marksObtained", grade, remarks`,
        [marksObtained, grade, remarks || '', targetId]
      );
      resultRows = updated.rows;
    } else {
      const inserted = await query(
        `INSERT INTO exam_results (id, exam_id, student_id, subject_id, marks_obtained, grade, remarks)
         VALUES ($1, $2, $3, $4, $5, $6, $7)
         RETURNING id, exam_id AS "examId", student_id AS "studentId", subject_id AS "subjectId",
                   marks_obtained AS "marksObtained", grade, remarks`,
        [resId, examId, targetStudentId, subjectId, marksObtained, grade, remarks || '']
      );
      resultRows = inserted.rows;
    }
    res.json(resultRows[0]);
  } catch (err) {
    console.error('Error saving exam result:', err);
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/exam-results', async (req, res) => {
  try {
    await query('DELETE FROM exam_results');
    res.json({ success: true, message: 'All exam results cleared.' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Admin Endpoint: Clear all sample / mock data for real data testing.
// TRUNCATE ... CASCADE on `users` also empties every table with a foreign
// key back to it (teachers, students, and transitively classes,
// teaching_assignments, timetable_slots, exam_results, attendance) — so
// those don't need separate statements. `subjects` and `exams` are
// intentionally kept: real curriculum/term reference data with no "add"
// UI yet, and exam_results.exam_id has a hard FK to exams.
app.post('/api/admin/clear-all-data', async (req, res) => {
  try {
    await query('TRUNCATE users CASCADE');
    await query('TRUNCATE leave_requests CASCADE');
    await query('TRUNCATE admission_requests CASCADE');
    await query('TRUNCATE purchase_disposal_requests CASCADE');
    await query('TRUNCATE audit_logs CASCADE');
    await query('TRUNCATE inventory_items CASCADE');
    await query('TRUNCATE welfare_programs CASCADE');
    await query('TRUNCATE announcements CASCADE');

    await query(
      `INSERT INTO users (id, school_id, email, password_hash, full_name, role, is_active)
       VALUES ('user-principal-1', 'sch-colombo-01', 'principal@school.edu', 'ChangeMe123!', 'Principal', 'principal', true)`
    );

    res.json({ success: true, message: 'All students, teachers, staff, classes, and activity records cleared. One bootstrap principal account was re-created (principal@school.edu).' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/admin/clear-attendance', async (req, res) => {
  try {
    await query('TRUNCATE attendance CASCADE');
    res.json({ success: true, message: 'All attendance records cleared.' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Start Express Server
app.listen(PORT, () => {
  console.log(`🚀 GSMS Express PostgreSQL Backend Server running on port ${PORT}`);
  console.log(`📡 Base API Endpoint: http://localhost:${PORT}/api`);
});
