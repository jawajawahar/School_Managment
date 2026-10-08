const { query } = require('./db');

async function seedToday() {
  try {
    const studentsRes = await query('SELECT id, student_no, first_name, last_name FROM students');
    console.log(`Found ${studentsRes.rows.length} students in DB.`);

    const todayStr = '2026-10-07';
    let count = 0;

    for (const student of studentsRes.rows) {
      const attId = `att-20261007-${student.id.replace(/[^a-zA-Z0-9]/g, '')}`;
      let status = 'present';
      if (student.student_no === 'GSMS-2026-4648' || student.student_no === 'GSMS-2026-8844') {
        status = 'absent';
      } else if (student.student_no === 'GSMS-2026-4610') {
        status = 'late';
      }

      await query(
        `INSERT INTO attendance (id, student_id, date, status, marked_by, remarks)
         VALUES ($1, $2, $3, $4, $5, $6)
         ON CONFLICT (id) DO UPDATE SET status = EXCLUDED.status, date = EXCLUDED.date, remarks = EXCLUDED.remarks`,
        [attId, student.id, todayStr, status, 'tch-1790750158387', 'Marked by class teacher']
      );
      count++;
    }

    console.log(`✅ Successfully seeded/updated attendance for ${count} students on ${todayStr}!`);

    const summaryRes = await query(
      "SELECT status, COUNT(*) FROM attendance WHERE date = '2026-10-07' GROUP BY status"
    );
    console.log('2026-10-07 Attendance Summary in DB:', summaryRes.rows);
  } catch (err) {
    console.error('Error seeding today attendance:', err);
  } finally {
    process.exit(0);
  }
}

seedToday();
