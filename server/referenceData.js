// Reference data every deployment needs before the app is usable.
// Runs on every server start and is fully idempotent (ON CONFLICT DO NOTHING),
// so a fresh hosted database gets the curriculum without running initDb.js,
// and anything the Principal later edits or deletes-and-recreates is never
// overwritten.
const SUBJECTS_SQL = `
  INSERT INTO subjects (id, code, name, grade_level, periods_per_week, category, category_name) VALUES
      -- 6 Compulsory Core Subjects
      ('subj-rel-bud', 'REL-BUD', 'Buddhism', 'Grades 1-11', 4, 'compulsory', 'Religion'),
      ('subj-rel-hin', 'REL-HIN', 'Hinduism', 'Grades 1-11', 4, 'compulsory', 'Religion'),
      ('subj-isl', 'ISL-01', 'Islam', 'Grades 1-11', 4, 'compulsory', 'Religion'),
      ('subj-rel-chr', 'REL-CHR', 'Christianity', 'Grades 1-11', 4, 'compulsory', 'Religion'),
      ('subj-rel-cat', 'REL-CAT', 'Catholicism', 'Grades 1-11', 4, 'compulsory', 'Religion'),

      ('subj-sin', 'SIN-01', 'Sinhala Language & Literature', 'Grades 1-11', 5, 'compulsory', 'First Language'),
      ('subj-tam', 'TAM-01', 'Tamil Language & Literature', 'Grades 1-11', 5, 'compulsory', 'First Language'),

      ('subj-eng', 'ENG-01', 'English', 'Grades 1-11', 5, 'compulsory', 'English'),
      ('subj-math', 'MATH-01', 'Mathematics', 'Grades 1-11', 6, 'compulsory', 'Mathematics'),
      ('subj-sci', 'SCI-01', 'Science', 'Grades 6-11', 5, 'compulsory', 'Science'),
      ('subj-his', 'HIS-01', 'History', 'Grades 6-11', 4, 'compulsory', 'History'),

      -- Category I (Basket 1)
      ('subj-acc', 'CAT1-ACC', 'Business & Accounting Studies', 'Grades 10-11', 4, 'category_1', 'Category I'),
      ('subj-geo', 'CAT1-GEO', 'Geography', 'Grades 6-11', 3, 'category_1', 'Category I'),
      ('subj-civ', 'CAT1-CIV', 'Civic Education', 'Grades 6-11', 3, 'category_1', 'Category I'),
      ('subj-cat1-ent', 'CAT1-ENT', 'Entrepreneurship Studies', 'Grades 10-11', 4, 'category_1', 'Category I'),
      ('subj-cat1-2nd-sin', 'CAT1-2NDSIN', 'Second National Language (Sinhala)', 'Grades 6-11', 3, 'category_1', 'Category I'),
      ('subj-cat1-2nd-tam', 'CAT1-2NDTAM', 'Second National Language (Tamil)', 'Grades 6-11', 3, 'category_1', 'Category I'),
      ('subj-cat1-pali', 'CAT1-PALI', 'Pali', 'Grades 10-11', 4, 'category_1', 'Category I'),
      ('subj-cat1-sans', 'CAT1-SANS', 'Sanskrit', 'Grades 10-11', 4, 'category_1', 'Category I'),
      ('subj-cat1-fre', 'CAT1-FRE', 'French', 'Grades 10-11', 4, 'category_1', 'Category I'),
      ('subj-cat1-ger', 'CAT1-GER', 'German', 'Grades 10-11', 4, 'category_1', 'Category I'),
      ('subj-cat1-hin', 'CAT1-HIN', 'Hindi', 'Grades 10-11', 4, 'category_1', 'Category I'),
      ('subj-cat1-jap', 'CAT1-JAP', 'Japanese', 'Grades 10-11', 4, 'category_1', 'Category I'),
      ('subj-cat1-ara', 'CAT1-ARA', 'Arabic', 'Grades 10-11', 4, 'category_1', 'Category I'),
      ('subj-cat1-kor', 'CAT1-KOR', 'Korean', 'Grades 10-11', 4, 'category_1', 'Category I'),
      ('subj-cat1-chi', 'CAT1-CHI', 'Chinese', 'Grades 10-11', 4, 'category_1', 'Category I'),
      ('subj-cat1-rus', 'CAT1-RUS', 'Russian', 'Grades 10-11', 4, 'category_1', 'Category I'),

      -- Category II (Basket 2 - Aesthetics & Literature)
      ('subj-cat2-ormus', 'CAT2-ORMUS', 'Oriental Music', 'Grades 6-11', 4, 'category_2', 'Category II'),
      ('subj-cat2-wmus', 'CAT2-WMUS', 'Western Music', 'Grades 6-11', 4, 'category_2', 'Category II'),
      ('subj-cat2-cmus', 'CAT2-CMUS', 'Carnatic Music', 'Grades 6-11', 4, 'category_2', 'Category II'),
      ('subj-cat2-art', 'CAT2-ART', 'Art', 'Grades 6-11', 4, 'category_2', 'Category II'),
      ('subj-cat2-ordance', 'CAT2-ORDANCE', 'Oriental Dancing', 'Grades 6-11', 4, 'category_2', 'Category II'),
      ('subj-cat2-bdance', 'CAT2-BDANCE', 'Bharatha Dancing', 'Grades 6-11', 4, 'category_2', 'Category II'),
      ('subj-cat2-englit', 'CAT2-ENGLIT', 'Appreciation of English Literary Texts', 'Grades 10-11', 4, 'category_2', 'Category II'),
      ('subj-cat2-sinlit', 'CAT2-SINLIT', 'Appreciation of Sinhala Literary Texts', 'Grades 10-11', 4, 'category_2', 'Category II'),
      ('subj-tam-lit', 'CAT2-TAMLIT', 'Appreciation of Tamil Literary Texts', 'Grades 10-11', 4, 'category_2', 'Category II'),
      ('subj-ara-lit', 'CAT2-ARALIT', 'Appreciation of Arabic Literary Texts', 'Grades 10-11', 4, 'category_2', 'Category II'),
      ('subj-cat2-dram-sin', 'CAT2-DRAMSIN', 'Drama & Theatre (Sinhala)', 'Grades 10-11', 4, 'category_2', 'Category II'),
      ('subj-cat2-dram-tam', 'CAT2-DRAMTAM', 'Drama & Theatre (Tamil)', 'Grades 10-11', 4, 'category_2', 'Category II'),
      ('subj-cat2-dram-eng', 'CAT2-DRAMENG', 'Drama & Theatre (English)', 'Grades 10-11', 4, 'category_2', 'Category II'),

      -- Category III (Basket 3 - Technology & Practical)
      ('subj-ict', 'CAT3-ICT', 'Information & Communication Technology (ICT)', 'Grades 6-11', 4, 'category_3', 'Category III'),
      ('subj-agri', 'CAT3-AGRI', 'Agriculture & Food Technology', 'Grades 6-11', 4, 'category_3', 'Category III'),
      ('subj-cat3-aqua', 'CAT3-AQUA', 'Aquatic Bio-resources Technology', 'Grades 10-11', 4, 'category_3', 'Category III'),
      ('subj-cat3-craft', 'CAT3-CRAFT', 'Arts & Crafts', 'Grades 6-11', 4, 'category_3', 'Category III'),
      ('subj-cat3-home', 'CAT3-HOME', 'Home Economics', 'Grades 6-11', 4, 'category_3', 'Category III'),
      ('subj-cat3-health', 'CAT3-HEALTH', 'Health & Physical Education', 'Grades 6-11', 4, 'category_3', 'Category III'),
      ('subj-cat3-media', 'CAT3-MEDIA', 'Communication & Media Studies', 'Grades 10-11', 4, 'category_3', 'Category III'),
      ('subj-cat3-dct', 'CAT3-DCT', 'Design & Construction Technology', 'Grades 10-11', 4, 'category_3', 'Category III'),
      ('subj-cat3-dmt', 'CAT3-DMT', 'Design & Mechanical Technology', 'Grades 10-11', 4, 'category_3', 'Category III'),
      ('subj-cat3-deet', 'CAT3-DEET', 'Design, Electrical & Electronic Technology', 'Grades 10-11', 4, 'category_3', 'Category III'),
      ('subj-cat3-short-sin', 'CAT3-SHORTSIN', 'Electronic Writing & Shorthand (Sinhala)', 'Grades 10-11', 4, 'category_3', 'Category III'),
      ('subj-cat3-short-tam', 'CAT3-SHORTTAM', 'Electronic Writing & Shorthand (Tamil)', 'Grades 10-11', 4, 'category_3', 'Category III'),
      ('subj-cat3-short-eng', 'CAT3-SHORTENG', 'Electronic Writing & Shorthand (English)', 'Grades 10-11', 4, 'category_3', 'Category III'),
      ('subj-phy-sci', 'PHY-01', 'Physical Science', 'Grades 10-11', 5, 'general', NULL),
      ('subj-eco', 'ECO-01', 'Economics', 'Grades 10-11', 4, 'category_1', 'Category I')
  ON CONFLICT DO NOTHING;
`;

const seedReferenceData = async (client) => {
  await client.query(`
    ALTER TABLE subjects ADD COLUMN IF NOT EXISTS category VARCHAR(50) DEFAULT 'general';
    ALTER TABLE subjects ADD COLUMN IF NOT EXISTS category_name VARCHAR(100);
  `);

  // Only seed the catalogue into an empty table: once the school has its own
  // subject list, deleted subjects must stay deleted across restarts.
  const subjects = await client.query('SELECT COUNT(*) FROM subjects');
  if (parseInt(subjects.rows[0].count, 10) === 0) {
    await client.query(SUBJECTS_SQL);
    console.log('✅ Curriculum subjects seeded.');
  }

  const exams = await client.query('SELECT COUNT(*) FROM exams');
  if (parseInt(exams.rows[0].count, 10) === 0) {
    await client.query(`
      INSERT INTO exams (id, name, term, academic_year, start_date, end_date, is_published) VALUES
      ('exam-term1-2026', 'First Term Examination 2026', 'Term 1', 2026, '2026-04-01', '2026-04-15', true),
      ('exam-term2-2026', 'Second Term Examination 2026', 'Term 2', 2026, '2026-08-01', '2026-08-15', true),
      ('exam-term3-2026', 'Third Term Examination 2026', 'Term 3', 2026, '2026-12-01', '2026-12-15', true)
      ON CONFLICT DO NOTHING;
    `);
    console.log('✅ Term examinations seeded.');
  }

  // There is no sign-up screen, so a database with no principal can never be
  // opened. Matches the bootstrap account in src/services/mockData.ts.
  const principals = await client.query("SELECT COUNT(*) FROM users WHERE role = 'principal'");
  if (parseInt(principals.rows[0].count, 10) === 0) {
    await client.query(`
      INSERT INTO users (id, school_id, email, password_hash, full_name, role, is_active)
      VALUES ('user-principal-1', 'sch-colombo-01', 'principal@school.edu', 'ChangeMe123!', 'Principal', 'principal', true)
      ON CONFLICT DO NOTHING;
    `);
    console.log('✅ Bootstrap principal account created (principal@school.edu).');
  }
};

module.exports = { seedReferenceData };
