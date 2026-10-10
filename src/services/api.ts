import {
  User,
  Student,
  Teacher,
  Staff,
  Class,
  Subject,
  Attendance,
  Exam,
  ExamResult,
  LeaveRequest,
  AdmissionRequest,
  PurchaseDisposalRequest,
  TeachingAssignment,
  Announcement,
  AuditLog,
  TimetableSlot,
  LibraryItem,
  LibraryTransaction,
  InventoryItem,
  InventoryTransaction,
  WelfareProgram,
  WelfareEnrolment,
  Notification,
} from '../types';

// A production build with no explicit API URL talks to the server that served
// it (single-container deployment); only `npm run dev` assumes a local backend.
const viteEnv = (import.meta as any).env || {};
const API_BASE_URL: string = viteEnv.VITE_API_BASE_URL || (viteEnv.DEV ? 'http://localhost:5000/api' : '/api');

export class ApiError extends Error {
  status: number;

  constructor(status: number, message: string) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
  }
}

// Every request in this file goes through here, so a rejected write (4xx/5xx)
// throws with the server's own reason instead of looking like a success.
const fetch = async (input: string, init?: RequestInit): Promise<Response> => {
  const res = await globalThis.fetch(input, init);
  if (!res.ok) {
    let message = `Server responded with ${res.status}`;
    try {
      const body = await res.clone().json();
      if (body?.error) message = body.error;
    } catch {
      // non-JSON error body: keep the status message
    }
    throw new ApiError(res.status, message);
  }
  return res;
};

/**
 * GSMS Backend REST API Integration Service Layer
 * Connects the frontend to your PostgreSQL Node.js Express Backend Server
 */
export const api = {
  // Principal Executive Dashboard Summary
  async getDashboardSummary(): Promise<{
    totalStudents: number;
    totalTeachers: number;
    totalClasses: number;
    pendingApprovalsCount: number;
    todayAttendanceRate: number;
    termExamPassRate: number;
  }> {
    const res = await fetch(`${API_BASE_URL}/principal/dashboard-summary`);
    if (!res.ok) return { totalStudents: 0, totalTeachers: 0, totalClasses: 0, pendingApprovalsCount: 0, todayAttendanceRate: 0, termExamPassRate: 0 };
    return res.json();
  },

  // Authentication & Session API
  async login(email: string, password?: string): Promise<{ user: User; token: string }> {
    const res = await fetch(`${API_BASE_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });
    return res.json();
  },

  // Students API
  async getStudents(): Promise<Student[]> {
    const res = await fetch(`${API_BASE_URL}/students`);
    return res.json();
  },

  async createStudent(studentData: Omit<Student, 'id'>): Promise<Student> {
    const res = await fetch(`${API_BASE_URL}/students`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(studentData),
    });
    return res.json();
  },

  async updateStudent(id: string, studentData: Partial<Student>): Promise<Student> {
    const res = await fetch(`${API_BASE_URL}/students/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(studentData),
    });
    return res.json();
  },

  async deleteStudent(id: string): Promise<void> {
    await fetch(`${API_BASE_URL}/students/${id}`, {
      method: 'DELETE',
    });
  },

  async bulkDeleteStudents(ids: string[]): Promise<void> {
    await fetch(`${API_BASE_URL}/students/bulk-delete`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ids }),
    });
  },

  async bulkImportStudents(students: Partial<Student>[]): Promise<void> {
    await fetch(`${API_BASE_URL}/students/bulk-import`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ students }),
    });
  },

  async assignStudentClass(studentId: string, classId: string): Promise<void> {
    await fetch(`${API_BASE_URL}/students/${studentId}/assign-class`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ classId }),
    });
  },

  // Teachers & Staff API
  async getTeachers(): Promise<Teacher[]> {
    const res = await fetch(`${API_BASE_URL}/teachers`);
    return res.json();
  },

  async createTeacher(teacherData: {
    id: string;
    userId: string;
    fullName: string;
    email: string;
    password?: string;
    phone?: string;
    qualification: string;
    subjectSpecialization: string;
    employeeNo: string;
  }): Promise<Teacher> {
    const res = await fetch(`${API_BASE_URL}/teachers`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(teacherData),
    });
    return res.json();
  },

  async updateTeacher(
    id: string,
    teacherData: { fullName?: string; email?: string; phone?: string; qualification?: string; subjectSpecialization?: string }
  ): Promise<Teacher> {
    const res = await fetch(`${API_BASE_URL}/teachers/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(teacherData),
    });
    return res.json();
  },

  async deleteTeacher(id: string): Promise<void> {
    await fetch(`${API_BASE_URL}/teachers/${id}`, { method: 'DELETE' });
  },

  async assignClassTeacher(classId: string, teacherId: string): Promise<void> {
    await fetch(`${API_BASE_URL}/classes/${classId}/class-teacher`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ teacherId }),
    });
  },

  async getTeachingAssignments(): Promise<TeachingAssignment[]> {
    const res = await fetch(`${API_BASE_URL}/teaching-assignments`);
    return res.json();
  },

  async assignSubjectTeacher(classId: string, subjectId: string, teacherId: string): Promise<{ success: boolean; error?: string }> {
    const res = await fetch(`${API_BASE_URL}/teaching-assignments`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ classId, subjectId, teacherId }),
    });
    return res.json();
  },

  // Classes & Academic Structure API
  async getClasses(): Promise<Class[]> {
    const res = await fetch(`${API_BASE_URL}/classes`);
    return res.json();
  },

  async createClass(classData: { id: string; grade: string; section: string; academicYear: number; capacity: number; classTeacherId?: string }): Promise<Class> {
    const res = await fetch(`${API_BASE_URL}/classes`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(classData),
    });
    return res.json();
  },

  async updateClass(id: string, classData: { grade?: string; section?: string; academicYear?: number; capacity?: number }): Promise<Class> {
    const res = await fetch(`${API_BASE_URL}/classes/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(classData),
    });
    return res.json();
  },

  async deleteClass(id: string): Promise<void> {
    await fetch(`${API_BASE_URL}/classes/${id}`, { method: 'DELETE' });
  },

  async getSubjects(): Promise<Subject[]> {
    const res = await fetch(`${API_BASE_URL}/subjects`);
    return res.json();
  },

  async createSubject(subject: Omit<Subject, 'id'>): Promise<Subject> {
    const res = await fetch(`${API_BASE_URL}/subjects`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(subject),
    });
    return res.json();
  },

  async updateSubject(id: string, subject: Partial<Subject>): Promise<Subject> {
    const res = await fetch(`${API_BASE_URL}/subjects/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(subject),
    });
    return res.json();
  },

  async deleteSubject(id: string): Promise<void> {
    await fetch(`${API_BASE_URL}/subjects/${id}`, {
      method: 'DELETE',
    });
  },

  // Daily Attendance Register API
  async getAttendance(date: string, classId?: string): Promise<Attendance[]> {
    const query = new URLSearchParams({ date, ...(classId ? { classId } : {}) });
    const res = await fetch(`${API_BASE_URL}/attendance?${query.toString()}`);
    return res.json();
  },

  async getAllAttendance(): Promise<Attendance[]> {
    const res = await fetch(`${API_BASE_URL}/attendance`);
    return res.json();
  },

  async markAttendance(studentId: string, status: string, date: string, remarks?: string, studentNo?: string): Promise<void> {
    await fetch(`${API_BASE_URL}/attendance`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ studentId, studentNo, status, date, remarks }),
    });
  },

  // Principal Leave & Approval Workflows API
  async getLeaveRequests(): Promise<LeaveRequest[]> {
    const res = await fetch(`${API_BASE_URL}/leave-requests`);
    return res.json();
  },

  async updateLeaveStatus(id: string, status: 'approved' | 'rejected'): Promise<void> {
    await fetch(`${API_BASE_URL}/leave-requests/${id}/status`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status }),
    });
  },

  async getAdmissionRequests(): Promise<AdmissionRequest[]> {
    const res = await fetch(`${API_BASE_URL}/admission-requests`);
    return res.json();
  },

  async updateAdmissionStatus(id: string, status: 'approved' | 'rejected'): Promise<void> {
    await fetch(`${API_BASE_URL}/admission-requests/${id}/status`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status }),
    });
  },

  async createAdmissionRequest(reqData: Partial<AdmissionRequest> & { id: string }): Promise<AdmissionRequest> {
    const res = await fetch(`${API_BASE_URL}/admission-requests`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(reqData),
    });
    return res.json();
  },

  async updateAdmissionRequest(id: string, reqData: Partial<AdmissionRequest>): Promise<AdmissionRequest> {
    const res = await fetch(`${API_BASE_URL}/admission-requests/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(reqData),
    });
    return res.json();
  },

  async deleteAdmissionRequest(id: string): Promise<void> {
    await fetch(`${API_BASE_URL}/admission-requests/${id}`, { method: 'DELETE' });
  },

  async bulkDeleteAdmissionRequests(ids: string[]): Promise<void> {
    await fetch(`${API_BASE_URL}/admission-requests/bulk-delete`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ids }),
    });
  },

  async getPurchaseDisposalRequests(): Promise<PurchaseDisposalRequest[]> {
    const res = await fetch(`${API_BASE_URL}/purchase-disposal-requests`);
    return res.json();
  },

  async createPurchaseDisposalRequest(reqData: Omit<PurchaseDisposalRequest, 'id' | 'status'> & { id: string }): Promise<PurchaseDisposalRequest> {
    const res = await fetch(`${API_BASE_URL}/purchase-disposal-requests`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(reqData),
    });
    return res.json();
  },

  async updatePurchaseDisposalStatus(id: string, status: 'approved' | 'rejected'): Promise<void> {
    await fetch(`${API_BASE_URL}/purchase-disposal-requests/${id}/status`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status }),
    });
  },

  // Announcements API
  async getAnnouncements(): Promise<Announcement[]> {
    const res = await fetch(`${API_BASE_URL}/announcements`);
    return res.json();
  },

  async createAnnouncement(annData: { id: string; title: string; body: string; createdBy?: string; audienceRole?: string; audienceClassId?: string; isEmergency?: boolean }): Promise<Announcement> {
    const res = await fetch(`${API_BASE_URL}/announcements`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(annData),
    });
    return res.json();
  },

  async deleteAnnouncement(id: string): Promise<void> {
    await fetch(`${API_BASE_URL}/announcements/${id}`, { method: 'DELETE' }).catch(() => {});
  },

  // Security Audit Logs API
  async getAuditLogs(): Promise<AuditLog[]> {
    const res = await fetch(`${API_BASE_URL}/audit-logs`);
    return res.json();
  },

  async createAuditLog(logData: AuditLog): Promise<void> {
    await fetch(`${API_BASE_URL}/audit-logs`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(logData),
    });
  },

  // Leave Requests API
  async createLeaveRequest(reqData: Omit<LeaveRequest, 'id' | 'status'> & { id: string }): Promise<LeaveRequest> {
    const res = await fetch(`${API_BASE_URL}/leave-requests`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(reqData),
    });
    return res.json();
  },

  // Staff API
  async getStaff(): Promise<Staff[]> {
    const res = await fetch(`${API_BASE_URL}/staff`);
    return res.json();
  },

  async createStaff(staffData: { id: string; userId: string; fullName: string; email: string; phone?: string; roleDescription: string; department: string; employeeNo: string }): Promise<Staff> {
    const res = await fetch(`${API_BASE_URL}/staff`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(staffData),
    });
    return res.json();
  },

  // Users API
  async getUsers(): Promise<User[]> {
    const res = await fetch(`${API_BASE_URL}/users`);
    return res.json();
  },

  async createUser(userData: Partial<User>): Promise<User> {
    const res = await fetch(`${API_BASE_URL}/users`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(userData),
    });
    return res.json();
  },

  async updateUserAccount(id: string, userData: { fullName?: string; role?: string; isActive?: boolean; phone?: string; password?: string; email?: string }): Promise<User> {
    const res = await fetch(`${API_BASE_URL}/users/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(userData),
    });
    return res.json();
  },

  // Library API
  async getLibraryItems(): Promise<LibraryItem[]> {
    const res = await fetch(`${API_BASE_URL}/library-items`);
    return res.json();
  },

  async createLibraryItem(itemData: Omit<LibraryItem, 'id'> & { id: string }): Promise<LibraryItem> {
    const res = await fetch(`${API_BASE_URL}/library-items`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(itemData),
    });
    return res.json();
  },

  async updateLibraryItem(id: string, itemData: Partial<LibraryItem>): Promise<LibraryItem> {
    const res = await fetch(`${API_BASE_URL}/library-items/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(itemData),
    });
    return res.json();
  },

  async deleteLibraryItem(id: string): Promise<void> {
    await fetch(`${API_BASE_URL}/library-items/${id}`, { method: 'DELETE' });
  },

  async getLibraryTransactions(): Promise<LibraryTransaction[]> {
    const res = await fetch(`${API_BASE_URL}/library-transactions`);
    return res.json();
  },

  async issueLibraryBook(txData: LibraryTransaction): Promise<LibraryTransaction> {
    const res = await fetch(`${API_BASE_URL}/library-transactions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(txData),
    });
    return res.json();
  },

  async returnLibraryBook(transactionId: string, payload?: { fineAmountCollected?: number; remarks?: string }): Promise<void> {
    await fetch(`${API_BASE_URL}/library-transactions/${transactionId}/return`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload || {}),
    });
  },

  // Inventory API
  async getInventoryItems(): Promise<InventoryItem[]> {
    const res = await fetch(`${API_BASE_URL}/inventory-items`);
    return res.json();
  },

  async createInventoryItem(itemData: Omit<InventoryItem, 'id'> & { id: string }): Promise<InventoryItem> {
    const res = await fetch(`${API_BASE_URL}/inventory-items`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(itemData),
    });
    return res.json();
  },

  async updateInventoryItem(id: string, itemData: Partial<InventoryItem>): Promise<InventoryItem> {
    const res = await fetch(`${API_BASE_URL}/inventory-items/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(itemData),
    });
    return res.json();
  },

  async deleteInventoryItem(id: string): Promise<void> {
    await fetch(`${API_BASE_URL}/inventory-items/${id}`, { method: 'DELETE' });
  },

  async getInventoryTransactions(): Promise<InventoryTransaction[]> {
    try {
      const res = await fetch(`${API_BASE_URL}/inventory-transactions`);
      if (!res.ok) return [];
      return res.json();
    } catch {
      return [];
    }
  },

  async createInventoryTransaction(txData: InventoryTransaction): Promise<InventoryTransaction | null> {
    try {
      const res = await fetch(`${API_BASE_URL}/inventory-transactions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(txData),
      });
      if (!res.ok) return null;
      return res.json();
    } catch {
      return null;
    }
  },

  async returnInventoryTransaction(transactionId: string, returnQty?: number, remarks?: string): Promise<void> {
    try {
      await fetch(`${API_BASE_URL}/inventory-transactions/${transactionId}/return`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ returnQty, remarks }),
      });
    } catch (e) {
      console.error('returnInventoryTransaction error:', e);
    }
  },

  async deleteInventoryTransaction(id: string): Promise<void> {
    try {
      await fetch(`${API_BASE_URL}/inventory-transactions/${id}`, { method: 'DELETE' });
    } catch (e) {
      console.error('deleteInventoryTransaction error:', e);
    }
  },

  // Welfare API
  async getWelfarePrograms(): Promise<WelfareProgram[]> {
    const res = await fetch(`${API_BASE_URL}/welfare-programs`);
    return res.json();
  },

  async createWelfareProgram(programData: Omit<WelfareProgram, 'id'> & { id: string }): Promise<WelfareProgram> {
    const res = await fetch(`${API_BASE_URL}/welfare-programs`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(programData),
    });
    return res.json();
  },

  async deleteWelfareProgram(id: string): Promise<void> {
    await fetch(`${API_BASE_URL}/welfare-programs/${id}`, { method: 'DELETE' });
  },

  async getWelfareEnrolments(): Promise<WelfareEnrolment[]> {
    const res = await fetch(`${API_BASE_URL}/welfare-enrolments`);
    return res.json();
  },

  async enrolWelfareStudent(enrolData: { id: string; programId: string; studentId: string }): Promise<WelfareEnrolment> {
    const res = await fetch(`${API_BASE_URL}/welfare-enrolments`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(enrolData),
    });
    return res.json();
  },

  async disburseWelfareItem(enrolmentId: string): Promise<void> {
    await fetch(`${API_BASE_URL}/welfare-enrolments/${enrolmentId}/disburse`, { method: 'PUT' });
  },

  // Permanent Timetable API
  async getTimetableSlots(): Promise<TimetableSlot[]> {
    const res = await fetch(`${API_BASE_URL}/timetable`);
    return res.json();
  },

  async saveTimetableSlot(slot: TimetableSlot): Promise<void> {
    await fetch(`${API_BASE_URL}/timetable`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(slot),
    });
  },

  async autoGenerateTimetable(classId: string, slots: TimetableSlot[]): Promise<void> {
    await fetch(`${API_BASE_URL}/timetable/auto-generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ classId, slots }),
    });
  },

  async deleteTimetableSlot(id: string): Promise<void> {
    await fetch(`${API_BASE_URL}/timetable/${id}`, { method: 'DELETE' });
  },

  async clearClassTimetable(classId: string): Promise<void> {
    await fetch(`${API_BASE_URL}/timetable/class/${classId}`, { method: 'DELETE' });
  },

  async clearTeacherTimetable(teacherId: string): Promise<void> {
    await fetch(`${API_BASE_URL}/timetable/teacher/${teacherId}`, { method: 'DELETE' });
  },

  async sendTimetableWhatsApp(payload: {
    dispatchType?: 'class' | 'teacher';
    classId?: string;
    teacherId?: string;
    className?: string;
    academicYear?: number;
    teacher?: { name: string; phone?: string };
    students?: Array<{ id: string; name: string; studentNo?: string; phone?: string }>;
    notes?: string;
    sendToTeacher?: boolean;
    sendToStudents?: boolean;
  }): Promise<{
    success: boolean;
    summary?: {
      className: string;
      teacher: string;
      totalDelivered: number;
      studentsCount: number;
      mode: string;
      documentUrl: string;
    };
    deliveryLog?: Array<{
      recipientType: string;
      name: string;
      phone: string;
      status: string;
      timestamp: string;
      messageId: string;
    }>;
    message?: string;
    error?: string;
  }> {
    const res = await fetch(`${API_BASE_URL}/timetable/send-whatsapp`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    return res.json();
  },

  async getWhatsAppStatus(): Promise<{
    isConnected: boolean;
    status: 'disconnected' | 'connecting' | 'qr_ready' | 'connected';
    qrCode: string | null;
    user: string | null;
  }> {
    try {
      const res = await fetch(`${API_BASE_URL}/whatsapp/status`);
      if (!res.ok) return { isConnected: false, status: 'disconnected', qrCode: null, user: null };
      return res.json();
    } catch {
      return { isConnected: false, status: 'disconnected', qrCode: null, user: null };
    }
  },

  async initializeWhatsApp(): Promise<{
    success: boolean;
    status: string;
    qrCode: string | null;
    user?: string | null;
  }> {
    const res = await fetch(`${API_BASE_URL}/whatsapp/initialize`, { method: 'POST' });
    return res.json();
  },

  async requestWhatsAppPairingCode(phone: string): Promise<{ success: boolean; pairingCode?: string; error?: string }> {
    try {
      const res = await fetch(`${API_BASE_URL}/whatsapp/pairing-code`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone }),
      });
      return res.json();
    } catch (err: any) {
      return { success: false, error: err?.message || 'Failed to request pairing code' };
    }
  },

  async logoutWhatsApp(): Promise<{ success: boolean; message?: string }> {
    const res = await fetch(`${API_BASE_URL}/whatsapp/logout`, { method: 'POST' });
    return res.json();
  },

  async sendDirectWhatsAppMessage(to: string, message: string): Promise<{ success: boolean; messageId?: string; error?: string }> {
    try {
      const res = await fetch(`${API_BASE_URL}/whatsapp/send-direct`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ to, message }),
      });
      return res.json();
    } catch (err: any) {
      return { success: false, error: err?.message || 'Failed to dispatch WhatsApp message' };
    }
  },

  async sendReportWhatsAppPDF(data: {
    toPhone: string;
    studentName: string;
    studentNo: string;
    className: string;
    examName: string;
    academicYear?: number;
    studentMarksList: any[];
    totalMarks: number;
    totalPossible: number;
    studentAvg: string;
    rankPosition: number;
    totalClassStudents: number;
    finalRemarks: string;
    teacherNote?: string;
    classTeacherName?: string;
    principalName?: string;
    schoolName?: string;
    schoolCode?: string;
    zone?: string;
  }): Promise<{ success: boolean; messageId?: string; error?: string }> {
    try {
      const res = await fetch(`${API_BASE_URL}/reports/send-whatsapp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      return res.json();
    } catch (err: any) {
      return { success: false, error: err?.message || 'Failed to send Report Card PDF via WhatsApp' };
    }
  },

  async getMetaWhatsAppStatus(): Promise<{
    isConfigured: boolean;
    phoneNumberId: string | null;
    hasToken: boolean;
  }> {
    try {
      const res = await fetch(`${API_BASE_URL}/whatsapp/meta-status`);
      if (!res.ok) return { isConfigured: false, phoneNumberId: null, hasToken: false };
      return res.json();
    } catch {
      return { isConfigured: false, phoneNumberId: null, hasToken: false };
    }
  },

  async saveMetaWhatsAppConfig(config: { phoneNumberId: string; accessToken: string }): Promise<{
    success: boolean;
    message?: string;
    error?: string;
  }> {
    const res = await fetch(`${API_BASE_URL}/whatsapp/meta-config`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(config),
    });
    return res.json();
  },

  async getExams(): Promise<Exam[]> {
    try {
      const res = await fetch(`${API_BASE_URL}/exams`);
      if (!res.ok) return [];
      return res.json();
    } catch {
      return [];
    }
  },

  async getExamResults(): Promise<ExamResult[]> {
    try {
      const res = await fetch(`${API_BASE_URL}/exam-results`);
      if (!res.ok) return [];
      const data = await res.json();
      return data.map((r: any) => ({
        ...r,
        marksObtained: Number(r.marksObtained),
      }));
    } catch {
      return [];
    }
  },

  async saveExamResult(result: Partial<ExamResult>): Promise<ExamResult | null> {
    try {
      const res = await fetch(`${API_BASE_URL}/exam-results`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(result),
      });
      if (!res.ok) return null;
      const r = await res.json();
      return {
        ...r,
        marksObtained: Number(r.marksObtained),
      };
    } catch {
      return null;
    }
  },

  async clearAllSampleData(): Promise<void> {
    try {
      await fetch(`${API_BASE_URL}/admin/clear-all-data`, { method: 'POST' });
    } catch (e) {
      console.error('Clear sample data error:', e);
    }
  },

  async clearAttendanceRecords(): Promise<void> {
    try {
      await fetch(`${API_BASE_URL}/admin/clear-attendance`, { method: 'POST' });
    } catch (e) {
      console.error('Clear attendance error:', e);
    }
  },

  async getNotifications(): Promise<Notification[]> {
    try {
      const res = await fetch(`${API_BASE_URL}/notifications`);
      if (!res.ok) return [];
      return res.json();
    } catch {
      return [];
    }
  },

  async createNotification(notif: Partial<Notification>): Promise<Notification | null> {
    try {
      const res = await fetch(`${API_BASE_URL}/notifications`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(notif),
      });
      if (!res.ok) return null;
      return res.json();
    } catch {
      return null;
    }
  },

  async markNotificationAsRead(id: string): Promise<void> {
    try {
      await fetch(`${API_BASE_URL}/notifications/${id}/read`, { method: 'PUT' });
    } catch (e) {
      console.error('markNotificationAsRead error:', e);
    }
  },

  async markAllNotificationsAsRead(recipientId: string): Promise<void> {
    try {
      await fetch(`${API_BASE_URL}/notifications/mark-all-read`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ recipientId }),
      });
    } catch (e) {
      console.error('markAllNotificationsAsRead error:', e);
    }
  },

  async deleteNotification(id: string): Promise<void> {
    try {
      await fetch(`${API_BASE_URL}/notifications/${id}`, { method: 'DELETE' });
    } catch (e) {
      console.error('deleteNotification error:', e);
    }
  },

  async clearNotifications(recipientId: string): Promise<void> {
    try {
      await fetch(`${API_BASE_URL}/notifications`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ recipientId }),
      });
    } catch (e) {
      console.error('clearNotifications error:', e);
    }
  },
};
