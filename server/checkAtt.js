const { query } = require('./db');

async function checkAtt() {
  try {
    const resToday = await query("SELECT * FROM attendance WHERE date = '2026-10-07'");
    console.log("2026-10-07 Attendance Records in DB:", resToday.rows.length, resToday.rows);

    const resAll = await query("SELECT id, student_id, date, status, marked_by, remarks FROM attendance ORDER BY date DESC LIMIT 15");
    console.log("Recent Attendance Records in DB:", resAll.rows);
  } catch (err) {
    console.error(err);
  } finally {
    process.exit(0);
  }
}

checkAtt();
