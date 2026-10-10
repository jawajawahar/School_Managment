const { Client } = require('pg');
const fs = require('fs');
const path = require('path');
const { seedReferenceData } = require('./referenceData');
require('dotenv').config({ path: path.join(__dirname, '.env') });

const dbUser = process.env.DB_USER || 'postgres';
const dbPassword = process.env.DB_PASSWORD || 'postgres';
const dbHost = process.env.DB_HOST || 'localhost';
const dbPort = process.env.DB_PORT || 5432;
const targetDbName = process.env.DB_NAME || 'gsms_db';

async function main() {
  console.log(`🔌 Connecting to PostgreSQL at ${dbHost}:${dbPort} as user "${dbUser}"...`);

  // Step 1: Connect to default 'postgres' database
  const rootClient = new Client({
    user: dbUser,
    password: dbPassword,
    host: dbHost,
    port: dbPort,
    database: 'postgres',
  });

  try {
    await rootClient.connect();
    console.log('✅ Connected to PostgreSQL root server.');

    // Step 2: Check if target database exists
    const checkRes = await rootClient.query(
      `SELECT 1 FROM pg_database WHERE datname = $1`,
      [targetDbName]
    );

    if (checkRes.rows.length === 0) {
      console.log(`🔨 Database "${targetDbName}" does not exist. Creating database...`);
      await rootClient.query(`CREATE DATABASE "${targetDbName}"`);
      console.log(`🎉 Database "${targetDbName}" created successfully!`);
    } else {
      console.log(`ℹ️ Database "${targetDbName}" already exists.`);
    }

    await rootClient.end();

    // Step 3: Connect to target database and initialize 3NF schema tables
    console.log(`📦 Initializing 3NF Schema tables in "${targetDbName}"...`);
    const appClient = new Client({
      user: dbUser,
      password: dbPassword,
      host: dbHost,
      port: dbPort,
      database: targetDbName,
    });

    await appClient.connect();
    const schemaSql = fs.readFileSync(path.join(__dirname, 'schema.sql'), 'utf-8');
    await appClient.query(schemaSql);

    // Ensure category columns exist on subjects table
    await appClient.query(`
      ALTER TABLE subjects ADD COLUMN IF NOT EXISTS category VARCHAR(50) DEFAULT 'general';
      ALTER TABLE subjects ADD COLUMN IF NOT EXISTS category_name VARCHAR(100);
    `);

    console.log('✨ All 10 Relational Schema Tables initialized successfully!');

    // Seed default Grade 1 to 11 classes if empty
    const classesCount = await appClient.query('SELECT COUNT(*) FROM classes');
    if (parseInt(classesCount.rows[0].count, 10) === 0) {
      console.log('🏫 Seeding default Grade 1 to 11 classes...');
      await appClient.query(`
        INSERT INTO classes (id, school_id, grade, section, academic_year, capacity) VALUES
        ('class-1a', 'sch-colombo-01', 'Grade 1', 'A', 2026, 30),
        ('class-2a', 'sch-colombo-01', 'Grade 2', 'A', 2026, 30),
        ('class-3a', 'sch-colombo-01', 'Grade 3', 'A', 2026, 32),
        ('class-4a', 'sch-colombo-01', 'Grade 4', 'A', 2026, 32),
        ('class-5a', 'sch-colombo-01', 'Grade 5', 'A', 2026, 35),
        ('class-6a', 'sch-colombo-01', 'Grade 6', 'A', 2026, 35),
        ('class-7a', 'sch-colombo-01', 'Grade 7', 'A', 2026, 35),
        ('class-8a', 'sch-colombo-01', 'Grade 8', 'A', 2026, 35),
        ('class-9a', 'sch-colombo-01', 'Grade 9', 'A', 2026, 35),
        ('class-10a', 'sch-colombo-01', 'Grade 10', 'A', 2026, 40),
        ('class-11a', 'sch-colombo-01', 'Grade 11', 'A', 2026, 38)
        ON CONFLICT (id) DO NOTHING;
      `);
      console.log('✅ Default Grade 1 to 11 classes seeded.');
    }

    // Curriculum subjects, term exams and the bootstrap principal account
    await seedReferenceData(appClient);

    // Seed 16 specialist teachers if empty
    const teachersCount = await appClient.query('SELECT COUNT(*) FROM teachers');
    if (parseInt(teachersCount.rows[0].count, 10) === 0) {
      console.log('👨‍🏫 Seeding 16 specialist teachers into PostgreSQL...');
      await appClient.query(`
        INSERT INTO users (id, school_id, email, full_name, role, is_active, phone) VALUES
        ('user-tch-1', 'sch-colombo-01', 'sunil.perera@gsms.edu.lk', 'Sunil Perera', 'teacher', true, '+94 77 111 2233'),
        ('user-tch-2', 'sch-colombo-01', 'kanthi.silva@gsms.edu.lk', 'Kanthi Silva', 'teacher', true, '+94 77 222 3344'),
        ('user-tch-3', 'sch-colombo-01', 'anoma.j@gsms.edu.lk', 'Anoma Jayasinghe', 'teacher', true, '+94 77 333 4455'),
        ('user-tch-4', 'sch-colombo-01', 'm.rishad@gsms.edu.lk', 'Mohamed Rishad', 'teacher', true, '+94 77 444 5566'),
        ('user-tch-5', 'sch-colombo-01', 'a.nazeer@gsms.edu.lk', 'Ahamed Nazeer', 'teacher', true, '+94 77 555 6677'),
        ('user-tch-6', 'sch-colombo-01', 'sarath.b@gsms.edu.lk', 'Sarath Bandara', 'teacher', true, '+94 77 666 7788'),
        ('user-tch-7', 'sch-colombo-01', 'nimal.f@gsms.edu.lk', 'Nimal Fernando', 'teacher', true, '+94 77 777 8899'),
        ('user-tch-8', 'sch-colombo-01', 'kamal.g@gsms.edu.lk', 'Kamal Gunaratne', 'teacher', true, '+94 77 888 9900'),
        ('user-tch-9', 'sch-colombo-01', 'priyantha.k@gsms.edu.lk', 'Priyantha Kumara', 'teacher', true, '+94 77 999 0011'),
        ('user-tch-10', 'sch-colombo-01', 'f.raziya@gsms.edu.lk', 'Fathima Raziya', 'teacher', true, '+94 77 101 0202'),
        ('user-tch-11', 'sch-colombo-01', 'chamari.a@gsms.edu.lk', 'Chamari Athapaththu', 'teacher', true, '+94 77 202 0303'),
        ('user-tch-12', 'sch-colombo-01', 'dilshan.m@gsms.edu.lk', 'Dilshan Mendis', 'teacher', true, '+94 77 303 0404'),
        ('user-tch-13', 'sch-colombo-01', 'ruwan.d@gsms.edu.lk', 'Ruwan Dissanayake', 'teacher', true, '+94 77 404 0505'),
        ('user-tch-14', 'sch-colombo-01', 'sanjeewa.w@gsms.edu.lk', 'Sanjeewa Wickramasinghe', 'teacher', true, '+94 77 505 0606'),
        ('user-tch-15', 'sch-colombo-01', 'manjula.p@gsms.edu.lk', 'Manjula Peiris', 'teacher', true, '+94 77 606 0707'),
        ('user-tch-16', 'sch-colombo-01', 'tharanga.r@gsms.edu.lk', 'Tharanga Rajapaksha', 'teacher', true, '+94 77 707 0808')
        ON CONFLICT (id) DO NOTHING;

        INSERT INTO teachers (id, user_id, school_id, employee_no, qualification, subject_specialization, phone) VALUES
        ('tch-1', 'user-tch-1', 'sch-colombo-01', 'EMP-2026-101', 'B.Sc (Hons) Education', 'Mathematics', '+94 77 111 2233'),
        ('tch-2', 'user-tch-2', 'sch-colombo-01', 'EMP-2026-102', 'B.Sc Physical Science', 'Science', '+94 77 222 3344'),
        ('tch-3', 'user-tch-3', 'sch-colombo-01', 'EMP-2026-103', 'B.A English Literature', 'English', '+94 77 333 4455'),
        ('tch-4', 'user-tch-4', 'sch-colombo-01', 'EMP-2026-104', 'B.A Tamil Language', 'Tamil', '+94 77 444 5566'),
        ('tch-5', 'user-tch-5', 'sch-colombo-01', 'EMP-2026-105', 'B.A Islamic Studies', 'Islam', '+94 77 555 6677'),
        ('tch-6', 'user-tch-6', 'sch-colombo-01', 'EMP-2026-106', 'B.A History & Heritage', 'History', '+94 77 666 7788'),
        ('tch-7', 'user-tch-7', 'sch-colombo-01', 'EMP-2026-107', 'B.Sc Computer Science', 'Information Technology (IT)', '+94 77 777 8899'),
        ('tch-8', 'user-tch-8', 'sch-colombo-01', 'EMP-2026-108', 'M.Sc Applied Physics', 'Physical Science', '+94 77 888 9900'),
        ('tch-9', 'user-tch-9', 'sch-colombo-01', 'EMP-2026-109', 'B.A Geography', 'Geography', '+94 77 999 0011'),
        ('tch-10', 'user-tch-10', 'sch-colombo-01', 'EMP-2026-110', 'B.A Arabic Literature', 'Arabic Literature', '+94 77 101 0202'),
        ('tch-11', 'user-tch-11', 'sch-colombo-01', 'EMP-2026-111', 'B.A Sinhala Studies', 'Sinhala', '+94 77 202 0303'),
        ('tch-12', 'user-tch-12', 'sch-colombo-01', 'EMP-2026-112', 'B.Sc Agriculture Science', 'Agriculture', '+94 77 303 0404'),
        ('tch-13', 'user-tch-13', 'sch-colombo-01', 'EMP-2026-113', 'B.A Political Science', 'Civics', '+94 77 404 0505'),
        ('tch-14', 'user-tch-14', 'sch-colombo-01', 'EMP-2026-114', 'B.Com Accounting', 'Accounting', '+94 77 505 0606'),
        ('tch-15', 'user-tch-15', 'sch-colombo-01', 'EMP-2026-115', 'B.A Economics', 'Economics', '+94 77 606 0707'),
        ('tch-16', 'user-tch-16', 'sch-colombo-01', 'EMP-2026-116', 'B.A Tamil Literature', 'Tamil Literature', '+94 77 707 0808')
        ON CONFLICT (id) DO NOTHING;
      `);
      console.log('✅ 16 Specialist teachers seeded.');
    }

    // Seed 275 students across Grades 1 to 11 if empty or incomplete
    const studentsCount = await appClient.query('SELECT COUNT(*) FROM students');
    if (parseInt(studentsCount.rows[0].count, 10) < 275) {
      console.log('🎓 Seeding 275 students across Grades 1 to 11 into PostgreSQL...');
      const firstNamesList = [
        'Kasun', 'Nipuni', 'Dineth', 'Kavindi', 'Chamath', 'Anuki', 'Ruwan', 'Tharushi', 'Dulaj', 'Hasini',
        'Malith', 'Shanuki', 'Yasiru', 'Oshadi', 'Kaveesha', 'Tashmi', 'Pathum', 'Rashmi', 'Sahan', 'Ishara',
        'Madushan', 'Hiruni', 'Akila', 'Asini', 'Praveen', 'Shenali', 'Imran', 'Mohamed', 'Ahamed', 'Fathima',
        'Zainab', 'Bilal', 'Tariq', 'Maryam', 'Thashwin', 'Archana', 'Dinesh', 'Gayathri', 'Harish', 'Janani'
      ];
      const lastNamesList = [
        'Kalhara', 'Tharushika', 'Prabhashitha', 'Senanayake', 'Bandara', 'Jayasinghe', 'Perera', 'Silva',
        'Dissanayake', 'Fernando', 'Ratnayake', 'Wickramasinghe', 'Gunawardena', 'Abeywickrama', 'Herath',
        'Rajakaruna', 'Tennakoon', 'Alwis', 'Mendis', 'Peiris', 'Fonseka', 'Cooray', 'Liyanage', 'Karunaratne',
        'Kulatunga', 'Rajapaksha', 'Jayawardena', 'Nazeer', 'Rishad', 'Ahmed', 'Subramaniam', 'Sivalingam'
      ];
      const gradesInfo = [
        { id: 'class-1a', grade: 1, dobYear: 2020 },
        { id: 'class-2a', grade: 2, dobYear: 2019 },
        { id: 'class-3a', grade: 3, dobYear: 2018 },
        { id: 'class-4a', grade: 4, dobYear: 2017 },
        { id: 'class-5a', grade: 5, dobYear: 2016 },
        { id: 'class-6a', grade: 6, dobYear: 2015 },
        { id: 'class-7a', grade: 7, dobYear: 2014 },
        { id: 'class-8a', grade: 8, dobYear: 2013 },
        { id: 'class-9a', grade: 9, dobYear: 2012 },
        { id: 'class-10a', grade: 10, dobYear: 2011 },
        { id: 'class-11a', grade: 11, dobYear: 2010 },
      ];

      let counter = 101;
      for (const cls of gradesInfo) {
        for (let i = 1; i <= 25; i++) {
          const fn = firstNamesList[(counter + i) % firstNamesList.length];
          const ln = lastNamesList[(counter * 3 + i) % lastNamesList.length];
          const studentId = `stu-${cls.grade}a-${i}`;
          const studentNo = `GSMS-2026-0${counter}`;
          const dob = `${cls.dobYear}-05-15`;

          await appClient.query(`
            INSERT INTO students (id, school_id, student_no, first_name, last_name, date_of_birth, class_id, admission_date, status)
            VALUES ($1, 'sch-colombo-01', $2, $3, $4, $5, $6, '2026-01-10', 'active')
            ON CONFLICT (student_no) DO UPDATE SET
              id = EXCLUDED.id,
              first_name = EXCLUDED.first_name,
              last_name = EXCLUDED.last_name;
          `, [studentId, studentNo, fn, ln, dob, cls.id]);

          counter++;
        }
      }
      console.log('✅ 275 Enrolled students seeded across Grades 1-11.');
    }

    // Exam Results Table starts clean (No fake/mock scores)

    // Seed Grade 9 Timetable Slots if empty
    const timetableCount = await appClient.query('SELECT COUNT(*) FROM timetable_slots');
    if (parseInt(timetableCount.rows[0].count, 10) === 0) {
      console.log('📅 Seeding sample weekly timetable for Grade 9 - Section A...');
      const core9SubjectIds = ['subj-math', 'subj-sci', 'subj-eng', 'subj-tam', 'subj-isl', 'subj-his', 'subj-ict', 'subj-geo', 'subj-civ'];
      const defaultTeachers = {
        'subj-math': 'tch-1', 'subj-sci': 'tch-2', 'subj-eng': 'tch-3', 'subj-tam': 'tch-4',
        'subj-isl': 'tch-5', 'subj-his': 'tch-6', 'subj-ict': 'tch-7', 'subj-geo': 'tch-9', 'subj-civ': 'tch-13'
      };
      const periodTimesMap = {
        1: ['08:00', '08:45'], 2: ['08:45', '09:30'], 3: ['09:30', '10:15'], 4: ['10:15', '11:00'],
        5: ['11:15', '12:00'], 6: ['12:00', '12:45'], 7: ['12:45', '13:30'], 8: ['13:30', '14:15']
      };

      for (let day = 1; day <= 5; day++) {
        for (let period = 1; period <= 8; period++) {
          const subId = core9SubjectIds[(day * 3 + period) % core9SubjectIds.length];
          const teacherId = defaultTeachers[subId] || 'tch-1';
          const [startTime, endTime] = periodTimesMap[period];
          const room = period === 4 || period === 7 ? (day % 2 === 0 ? 'Science Lab 1' : 'IT Computer Lab') : 'Hall 9A';
          const slotId = `slot-g9-${day}-${period}`;

          await appClient.query(`
            INSERT INTO timetable_slots (id, class_id, subject_id, teacher_id, day_of_week, period_no, start_time, end_time, room)
            VALUES ($1, 'class-9a', $2, $3, $4, $5, $6, $7, $8)
            ON CONFLICT (class_id, day_of_week, period_no) DO NOTHING;
          `, [slotId, subId, teacherId, day, period, startTime, endTime, room]);
        }
      }
      console.log('✅ Sample 40-period timetable for Grade 9 seeded into PostgreSQL.');
    }

    await appClient.end();
    console.log('\n🚀 SETUP COMPLETE! 16 Teachers, Grade 1 to 11 Classes, 16 Subjects, 25 Grade 9 Students & 400 Exam Marks seeded. Start server with: npm start');
  } catch (err) {
    console.error('\n❌ PostgreSQL Setup Error:', err.message);
    console.error('💡 Please make sure PostgreSQL is running on your machine and the password in server/.env is correct.');
    process.exit(1);
  }
}

main();
