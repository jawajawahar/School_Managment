import {
  User,
  Student,
  Guardian,
  Teacher,
  Staff,
  Class,
  Subject,
  TeachingAssignment,
  Attendance,
  TimetableSlot,
  Exam,
  ExamResult,
  LibraryItem,
  LibraryTransaction,
  InventoryItem,
  InventoryTransaction,
  WelfareProgram,
  WelfareEnrolment,
  Announcement,
  Notification,
  AuditLog,
  LeaveRequest,
  AdmissionRequest,
  PurchaseDisposalRequest,
  AcademicCalendarEvent,
  SchoolProfile,
} from '../types';

// ── Empty system seed for real-world deployment ────────────────────────────
// Every operational record (students, staff, classes, timetable, attendance,
// exam results, library/inventory stock, welfare, announcements, audit log)
// starts empty. Use the app's own "Add" / "Register" / "Enrol" flows in each
// module to populate real data — every one of those flows is fully wired to
// this data layer.

export const INITIAL_STUDENTS: Student[] = [];
export const INITIAL_TEACHERS: Teacher[] = [];
export const INITIAL_CLASSES: Class[] = [];
export const INITIAL_STAFF: Staff[] = [];
export const INITIAL_GUARDIANS: Guardian[] = [];
export const INITIAL_TEACHING_ASSIGNMENTS: TeachingAssignment[] = [];
export const INITIAL_TIMETABLE_SLOTS: TimetableSlot[] = [];
export const INITIAL_ATTENDANCE: Attendance[] = [];
export const INITIAL_EXAMS: Exam[] = [];
export const INITIAL_EXAM_RESULTS: ExamResult[] = [];
export const INITIAL_LIBRARY_ITEMS: LibraryItem[] = [];
export const INITIAL_LIBRARY_TRANSACTIONS: LibraryTransaction[] = [];
export const INITIAL_INVENTORY_ITEMS: InventoryItem[] = [];
export const INITIAL_INVENTORY_TRANSACTIONS: InventoryTransaction[] = [];
export const INITIAL_WELFARE_PROGRAMS: WelfareProgram[] = [];
export const INITIAL_WELFARE_ENROLMENTS: WelfareEnrolment[] = [];
export const INITIAL_ANNOUNCEMENTS: Announcement[] = [];
export const INITIAL_NOTIFICATIONS: Notification[] = [];
export const INITIAL_AUDIT_LOGS: AuditLog[] = [];
export const INITIAL_LEAVE_REQUESTS: LeaveRequest[] = [];
export const INITIAL_ADMISSION_REQUESTS: AdmissionRequest[] = [];
export const INITIAL_PURCHASE_DISPOSAL_REQUESTS: PurchaseDisposalRequest[] = [];
export const INITIAL_CALENDAR_EVENTS: AcademicCalendarEvent[] = [];

// Kept: the national G.C.E. curriculum subject catalogue. This is reference
// data (real subject codes), not sample/fake data — the O/L report card
// engine (services/academicRules.ts) matches against these exact subject
// IDs to compute the 6-compulsory + 3-basket rule for Grade 10-11. Remove or
// edit individual rows from Academic & Exams > Subject Teacher Allocations
// > All Subjects if your school's curriculum differs.
export const INITIAL_SUBJECTS: Subject[] = [
  { id: 'subj-tam', code: 'TAM-01', name: 'Tamil', gradeLevel: 'Grades 1-11', periodsPerWeek: 5 },
  { id: 'subj-sin', code: 'SIN-01', name: 'Sinhala', gradeLevel: 'Grades 1-11', periodsPerWeek: 5 },
  { id: 'subj-isl', code: 'ISL-01', name: 'Islam', gradeLevel: 'Grades 1-11', periodsPerWeek: 4 },
  { id: 'subj-math', code: 'MATH-01', name: 'Mathematics', gradeLevel: 'Grades 1-11', periodsPerWeek: 6 },
  { id: 'subj-his', code: 'HIS-01', name: 'History', gradeLevel: 'Grades 6-11', periodsPerWeek: 4 },
  { id: 'subj-tam-lit', code: 'TAMLIT-01', name: 'Tamil Literature', gradeLevel: 'Grades 10-11', periodsPerWeek: 4 },
  { id: 'subj-ict', code: 'ICT-01', name: 'Information Technology (IT)', gradeLevel: 'Grades 6-11', periodsPerWeek: 3 },
  { id: 'subj-phy-sci', code: 'PHY-01', name: 'Physical Science', gradeLevel: 'Grades 10-11', periodsPerWeek: 5 },
  { id: 'subj-geo', code: 'GEO-01', name: 'Geography', gradeLevel: 'Grades 6-11', periodsPerWeek: 3 },
  { id: 'subj-ara-lit', code: 'ARALIT-01', name: 'Arabic Literature', gradeLevel: 'Grades 10-11', periodsPerWeek: 4 },
  { id: 'subj-eng', code: 'ENG-01', name: 'English', gradeLevel: 'Grades 1-11', periodsPerWeek: 5 },
  { id: 'subj-sci', code: 'SCI-01', name: 'Science', gradeLevel: 'Grades 6-11', periodsPerWeek: 5 },
  { id: 'subj-agri', code: 'AGRI-01', name: 'Agriculture', gradeLevel: 'Grades 6-11', periodsPerWeek: 3 },
  { id: 'subj-civ', code: 'CIV-01', name: 'Civics', gradeLevel: 'Grades 6-11', periodsPerWeek: 3 },
  { id: 'subj-acc', code: 'ACC-01', name: 'Accounting', gradeLevel: 'Grades 10-11', periodsPerWeek: 4 },
  { id: 'subj-eco', code: 'ECO-01', name: 'Economics', gradeLevel: 'Grades 10-11', periodsPerWeek: 4 },
];

// Kept: exactly one bootstrap login. There is no self-service sign-up screen
// in this app — login only matches against this seeded user list — so at
// least one account must survive a full data wipe or the system can never
// be opened again. Log in with this account and change the password
// immediately (Users & Audit), then use "Register New Teacher" / "Register
// New Staff" / "Enrol new student" to create every other real account.
export const INITIAL_USERS: User[] = [
  {
    id: 'user-principal-1',
    schoolId: 'sch-colombo-01',
    email: 'principal@school.edu',
    password: 'ChangeMe123!',
    fullName: 'Principal',
    role: 'principal',
    isActive: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
];

export const INITIAL_SCHOOL_PROFILE: SchoolProfile = {
  schoolName: 'Your School Name',
  schoolCode: 'SCH-000',
  principalName: 'Principal',
  zone: '',
  address: '',
  academicYear: new Date().getFullYear(),
};
