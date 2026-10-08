export type UserRole =
  | 'principal'
  | 'vice_principal'
  | 'admin'
  | 'teacher'
  | 'staff'
  | 'librarian'
  | 'lab_assistant'
  | 'student'
  | 'parent'
  | 'education_officer';

export interface User {
  id: string;
  schoolId: string;
  email: string;
  password?: string;
  fullName: string;
  role: UserRole;
  isActive: boolean;
  avatarUrl?: string;
  phone?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Student {
  id: string;
  schoolId: string;
  studentNo: string;
  userId?: string;
  firstName: string;
  lastName: string;
  dateOfBirth: string;
  classId: string;
  admissionDate: string;
  status: 'active' | 'pending_acceptance' | 'transferred' | 'graduated' | 'withdrawn';
  guardianIds: string[];
  phone?: string;
  guardianPhone?: string;
  guardianName?: string;
  disciplinaryNotes?: string[];
  enrolledSubjectIds?: string[];
}

export interface Guardian {
  id: string;
  fullName: string;
  phone: string;
  email: string;
  relationship: string;
  studentIds: string[];
}

export interface Teacher {
  id: string;
  userId: string;
  schoolId: string;
  employeeNo: string;
  qualification: string;
  subjectSpecialization: string;
  maxPeriodsPerWeek: number;
  currentPeriodsAssigned: number;
  performanceScore?: number; // Out of 100
  phone?: string;
}

export interface Staff {
  id: string;
  userId: string;
  schoolId: string;
  employeeNo: string;
  roleDescription: string;
  department: string;
}

export interface Class {
  id: string;
  schoolId: string;
  grade: string;
  section: string;
  academicYear: number;
  classTeacherId: string;
  capacity: number;
}

export type SubjectCategory = 'compulsory' | 'category_1' | 'category_2' | 'category_3' | 'general';

export interface Subject {
  id: string;
  code: string;
  name: string;
  gradeLevel: string;
  periodsPerWeek: number;
  syllabusUrl?: string;
  category?: SubjectCategory;
  categoryName?: string;
}

export interface TeachingAssignment {
  id: string;
  classId: string;
  subjectId: string;
  teacherId: string;
  periodsPerWeek?: number;
}

export type AttendanceStatus = 'present' | 'absent' | 'late' | 'excused';

export interface Attendance {
  id: string;
  studentId?: string;
  staffId?: string;
  date: string;
  status: AttendanceStatus;
  markedBy: string;
  remarks?: string;
}

export interface TimetableSlot {
  id: string;
  classId: string;
  subjectId: string;
  teacherId: string;
  dayOfWeek: number;
  periodNo: number;
  startTime: string;
  endTime: string;
  room: string;
}

export interface Exam {
  id: string;
  name: string;
  term: string;
  academicYear: number;
  startDate: string;
  endDate: string;
  isPublished: boolean;
}

export interface ExamResult {
  id: string;
  examId: string;
  studentId: string;
  subjectId: string;
  marksObtained: number;
  maxMarks: number;
  grade: string;
  enteredBy: string;
  enteredAt: string;
}

export interface LibraryItem {
  id: string;
  isbn: string;
  title: string;
  author: string;
  category: string;
  copiesTotal: number;
  copiesAvailable: number;
  shelfLocation: string;
}

export interface LibraryTransaction {
  id: string;
  itemId: string;
  borrowerId: string;
  borrowerName?: string;
  borrowerType: 'student' | 'staff';
  issueDate: string;
  dueDate: string;
  returnDate?: string;
  status: 'issued' | 'returned' | 'overdue';
  fineAmount?: number;
  dailyFineRate?: number;
  daysOverdue?: number;
  remarks?: string;
}

export interface InventoryItem {
  id: string;
  name: string;
  category: 'Asset' | 'Consumable' | 'Lab Equipment';
  quantity: number;
  unit: string;
  reorderLevel: number;
  location: string;
  condition: 'Good' | 'Fair' | 'Needs Repair';
}

export interface InventoryTransaction {
  id: string;
  itemId: string;
  itemName?: string;
  category?: 'Asset' | 'Consumable' | 'Lab Equipment';
  type: 'receipt' | 'issue' | 'adjustment' | 'return';
  quantity: number;
  issuedTo?: string;
  issuedBy?: string;
  recipientCategory?: string;
  date: string;
  remarks?: string;
  status?: 'dispatched' | 'returned';
  returnDate?: string;
  returnCondition?: string;
}

export interface WelfareProgram {
  id: string;
  name: string;
  description: string;
  eligibilityCriteria: string;
  academicYear: number;
  budgetAllocated: number;
  bannerUrl?: string;
  isArchived?: boolean;
}

export interface WelfareEnrolment {
  id: string;
  programId: string;
  studentId: string;
  status: 'enrolled' | 'disbursed' | 'cancelled';
  disbursedAt?: string;
  remarks?: string;
}

export interface Announcement {
  id: string;
  title: string;
  body: string;
  createdBy: string;
  audienceRole?: UserRole | 'all';
  audienceClassId?: string;
  isEmergency?: boolean;
  createdAt: string;
}

export interface Notification {
  id: string;
  recipientId: string;
  title: string;
  message: string;
  channel: 'in_app' | 'email' | 'sms';
  status: 'pending' | 'sent' | 'read';
  sentAt: string;
}

export interface AuditLog {
  id: string;
  actorId: string;
  actorName: string;
  action: 'CREATE' | 'UPDATE' | 'DELETE' | 'LOGIN' | 'EXPORT' | 'APPROVE';
  entity: string;
  entityId: string;
  details: string;
  timestamp: string;
}

// Principal Approval Entities
export interface LeaveRequest {
  id: string;
  applicantName: string;
  role: string;
  type: 'Sick Leave' | 'Casual Leave' | 'Duty Leave';
  startDate: string;
  endDate: string;
  reason: string;
  status: 'pending' | 'approved' | 'rejected';
}

export interface AdmissionRequest {
  id: string;
  studentName: string;
  gradeApplying: string;
  guardianName: string;
  contactNo: string;
  previousSchool: string;
  status: 'pending' | 'approved' | 'rejected';
  submittedByTeacherId?: string;
  submittedByTeacherName?: string;
  signedByPrincipal?: boolean;
  signedAt?: string;
  principalName?: string;

  // Exam Admission Card & Attendance Eligibility Specifications
  type?: 'school_admission' | 'exam_admission';
  mode?: 'class_batch' | 'single_student';
  examTerm?: string;
  classId?: string;
  className?: string;
  classTeacherName?: string;
  attendancePercentage?: number;
  isEligibleForExam?: boolean;
  totalClassStudents?: number;
  eligibleStudentCount?: number;
  flaggedStudentCount?: number;
  studentRoster?: {
    studentNo: string;
    studentName: string;
    attendancePercentage: number;
    isEligible: boolean;
    remarks: string;
    isIssuedToStudent?: boolean;
    issuedAt?: string;
  }[];
}

export interface PurchaseDisposalRequest {
  id: string;
  type: 'purchase' | 'disposal';
  itemName: string;
  quantity: number;
  estimatedCost: number;
  reason: string;
  status: 'pending' | 'approved' | 'rejected';
}

export interface AcademicCalendarEvent {
  id: string;
  title: string;
  date: string;
  type: 'Holiday' | 'Exam' | 'PTA Meeting' | 'Sports Day' | 'Term End';
}

export interface SchoolProfile {
  schoolName: string;
  schoolCode: string;
  principalName: string;
  zone: string;
  address: string;
  academicYear: number;
  principalSignatureUrl?: string;
}
