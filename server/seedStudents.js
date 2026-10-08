const { Client } = require('pg');
require('dotenv').config();

const dbUser = process.env.DB_USER || 'postgres';
const dbPassword = process.env.DB_PASSWORD || 'postgres';
const dbHost = process.env.DB_HOST || 'localhost';
const dbPort = process.env.DB_PORT || 5432;
const targetDbName = process.env.DB_NAME || 'gsms_db';

const firstNames = [
  'Kasun', 'Nipuni', 'Dineth', 'Kavindi', 'Chamath', 'Anuki', 'Ruwan', 'Tharushi', 'Dulaj', 'Hasini',
  'Malith', 'Shanuki', 'Yasiru', 'Oshadi', 'Kaveesha', 'Tashmi', 'Pathum', 'Rashmi', 'Sahan', 'Ishara',
  'Madushan', 'Hiruni', 'Akila', 'Asini', 'Praveen', 'Shenali', 'Imran', 'Mohamed', 'Ahamed', 'Fathima',
  'Zainab', 'Bilal', 'Tariq', 'Maryam', 'Thashwin', 'Archana', 'Dinesh', 'Gayathri', 'Harish', 'Janani',
  'Kowsalya', 'Mithun', 'Nivedha', 'Pavithra', 'Sanjay', 'Vaishnavi', 'Vithusan'
];

const lastNames = [
  'Kalhara', 'Tharushika', 'Prabhashitha', 'Senanayake', 'Bandara', 'Jayasinghe', 'Perera', 'Silva',
  'Dissanayake', 'Fernando', 'Ratnayake', 'Wickramasinghe', 'Gunawardena', 'Abeywickrama', 'Herath',
  'Rajakaruna', 'Tennakoon', 'Alwis', 'Mendis', 'Peiris', 'Fonseka', 'Cooray', 'Liyanage', 'Karunaratne',
  'Kulatunga', 'Rajapaksha', 'Jayawardena', 'Nazeer', 'Rishad', 'Ahmed', 'Razak', 'Farook', 'Subramaniam',
  'Ramanathan', 'Balakrishnan', 'Shanmugam', 'Sivalingam', 'Selvaraj'
];

const classList = [
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

async function seedStudents() {
  console.log(`🔌 Connecting to PostgreSQL "${targetDbName}"...`);
  const client = new Client({
    user: dbUser,
    password: dbPassword,
    host: dbHost,
    port: dbPort,
    database: targetDbName,
  });

  try {
    await client.connect();
    console.log('✅ Connected.');

    let studentCounter = 101;
    let totalAdded = 0;

    for (const cls of classList) {
      console.log(`🏫 Seeding 25 students into ${cls.id} (Grade ${cls.grade})...`);
      for (let i = 1; i <= 25; i++) {
        const studentNo = `GSMS-2026-0${studentCounter}`;
        const studentId = `stu-${cls.grade}a-${i}`;
        const firstName = firstNames[(studentCounter + i) % firstNames.length];
        const lastName = lastNames[(studentCounter * 3 + i) % lastNames.length];
        const month = String((i % 12) + 1).padStart(2, '0');
        const day = String((i % 28) + 1).padStart(2, '0');
        const dob = `${cls.dobYear}-${month}-${day}`;

        await client.query(
          `INSERT INTO students (id, school_id, student_no, first_name, last_name, date_of_birth, class_id, status)
           VALUES ($1, 'sch-colombo-01', $2, $3, $4, $5, $6, 'active')
           ON CONFLICT (student_no) DO NOTHING`,
          [studentId, studentNo, firstName, lastName, dob, cls.id]
        );

        studentCounter++;
        totalAdded++;
      }
    }

    console.log(`\n🎉 SUCCESS! Seeded ${totalAdded} students across all 11 classes (25 students per class)!`);
    await client.end();
  } catch (err) {
    console.error('❌ Seeding Error:', err.message);
    process.exit(1);
  }
}

seedStudents();
