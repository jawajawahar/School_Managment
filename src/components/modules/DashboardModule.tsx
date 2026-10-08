import React, { useState } from 'react';
import {
  Users,
  CalendarCheck,
  GraduationCap,
  HeartHandshake,
  TrendingUp,
  Clock,
  Award,
  BellRing,
  CheckCircle,
  XCircle,
  FileCheck,
  Calendar,
  ExternalLink,
  Eye,
  FileText,
  ShieldCheck,
  Paperclip,
  AlertTriangle,
  Trash2,
} from 'lucide-react';
import { useData } from '../../context/DataContext';
import { LeaveRequest, AdmissionRequest } from '../../types';
import { PageHeader } from '../ui/PageHeader';
import { StatCard } from '../ui/StatCard';
import { Card, CardHeader, CardTitle } from '../ui/Card';
import { Badge } from '../ui/Badge';
import { Button } from '../ui/Button';
import { Modal } from '../ui/Modal';
import { FormField, Input, Select, Textarea } from '../ui/FormField';
import { DatePicker } from '../ui/DatePicker';
import { EmptyState } from '../ui/EmptyState';
import { IconTile } from '../ui/IconTile';

export const DashboardModule: React.FC<{ onNavigate: (tab: any) => void }> = ({ onNavigate }) => {
  const {
    activeRole,
    currentUser,
    students,
    teachers,
    staff,
    attendance,
    examResults,
    welfareEnrolments,
    announcements,
    deleteAnnouncement,
    leaveRequests,
    admissionRequests,
    purchaseDisposalRequests,
    calendarEvents,
    approveLeaveRequest,
    approveAdmissionRequest,
    updateStudentExamEligibility,
    approvePurchaseDisposalRequest,
    addLeaveRequest,
    assignedClassId,
    classes,
    subjects,
    teachingAssignments,
    schoolProfile,
  } = useData();

  const [showAddLeaveModal, setShowAddLeaveModal] = useState(false);
  const [viewingLeave, setViewingLeave] = useState<LeaveRequest | null>(null);
  const [viewingAdmission, setViewingAdmission] = useState<AdmissionRequest | null>(null);
  const [viewingExamPass, setViewingExamPass] = useState<{
    studentNo: string;
    studentName: string;
    classId?: string;
    className: string;
    examTerm: string;
    attendancePercentage: number;
    principalName: string;
  } | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Form fields: Leave Request
  const [leaveApplicant, setLeaveApplicant] = useState('Sunil Perera');
  const [leaveRole, setLeaveRole] = useState('Maths Teacher (Grade 9-A)');
  const [leaveType, setLeaveType] = useState<'Sick Leave' | 'Casual Leave' | 'Duty Leave'>('Sick Leave');
  const [leaveStartDate, setLeaveStartDate] = useState('2026-08-01');
  const [leaveEndDate, setLeaveEndDate] = useState('2026-08-03');
  const [leaveReason, setLeaveReason] = useState('');

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  const isTeacherRole = activeRole === 'teacher';

  // Metrics calculations
  const classScopedStudents = isTeacherRole ? students.filter((s) => s.classId === assignedClassId) : students;
  const totalStudents = classScopedStudents.length;
  const totalTeachers = teachers.length;
  const totalStaff = staff.length;

  const getTodayDateStr = () => {
    const d = new Date();
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const realTodayStr = getTodayDateStr();
  const targetAttendanceDate = realTodayStr;

  const targetAttendanceRecords = attendance.filter((a: any) => (a.date || '').split('T')[0] === targetAttendanceDate);

  // Deduplicated student status mapping to eliminate duplicate records & capped metrics
  const studentAttStatusMap = new Map<string, string>();
  classScopedStudents.forEach((student) => {
    const sId = student.id;
    const sNo = student.studentNo || '';
    const recs = targetAttendanceRecords.filter((a: any) => {
      const aId = a.studentId || a.student_id;
      const aNo = a.studentNo || a.student_no;
      return (sId && (aId === sId || aNo === sId)) || (sNo && (aId === sNo || aNo === sNo));
    });
    const confirmedRec = recs.find((r: any) => r.status === 'present' || r.status === 'absent' || r.status === 'late') || recs[0];
    if (confirmedRec) {
      studentAttStatusMap.set(student.id, confirmedRec.status);
    }
  });

  const markedStudentsCount = studentAttStatusMap.size;
  const presentCount = Array.from(studentAttStatusMap.values()).filter((st) => st === 'present').length;
  const totalScopedStudents = classScopedStudents.length;

  const isAttendanceMarked = markedStudentsCount > 0;
  const attendanceRate = totalScopedStudents > 0 ? Math.round((presentCount / totalScopedStudents) * 100) : 0;

  const scopedStudentIds = new Set<string>();
  classScopedStudents.forEach((s) => {
    if (s.id) scopedStudentIds.add(s.id);
    if (s.studentNo) scopedStudentIds.add(s.studentNo);
  });

  const targetStudentIds = scopedStudentIds;
  const relevantResults = examResults.filter((r) => targetStudentIds.has(r.studentId));

  const passCount = relevantResults.filter((r) => r.grade !== 'F' && r.marksObtained >= 40).length;
  const examPassRate = relevantResults.length > 0 ? Math.round((passCount / relevantResults.length) * 100) : 0;

  const welfareCount = welfareEnrolments.filter((w) => w.status === 'disbursed').length;

  const pendingLeaves = leaveRequests.filter((l) => l.status === 'pending');
  const pendingAdmissions = admissionRequests.filter((a) => a.status === 'pending');
  const pendingPurchases = purchaseDisposalRequests.filter((p) => p.status === 'pending');
  const totalPendingApprovals = pendingLeaves.length + pendingAdmissions.length + pendingPurchases.length;

  const isPrincipalOrVP = activeRole === 'principal' || activeRole === 'vice_principal';

  // Filter announcements for current user's target audience (role & class)
  const userStudent = currentUser ? students.find((s) => s.userId === currentUser.id || s.id === currentUser.id) : null;
  const userTeacher = currentUser ? teachers.find((t) => t.userId === currentUser.id || t.id === currentUser.id) : null;

  const userClassIds = new Set<string>();
  if (assignedClassId) userClassIds.add(assignedClassId);
  if (userStudent?.classId) userClassIds.add(userStudent.classId);
  if (userTeacher) {
    teachingAssignments.filter((ta) => ta.teacherId === userTeacher.id).forEach((ta) => userClassIds.add(ta.classId));
    classes.filter((c) => c.classTeacherId === userTeacher.id || c.classTeacherId === userTeacher.userId).forEach((c) => userClassIds.add(c.id));
  }

  const isManagement = ['principal', 'vice_principal', 'admin'].includes(activeRole);

  const visibleAnnouncements = (announcements || []).filter((ann) => {
    // 1. Management roles see all announcements
    if (isManagement) return true;

    // 2. School-wide (no class restriction AND role is all or empty)
    const isSchoolWide = (!ann.audienceClassId || ann.audienceClassId === '') && (!ann.audienceRole || ann.audienceRole === 'all');
    if (isSchoolWide) return true;

    // 3. Role-matched
    if (ann.audienceRole && (ann.audienceRole === activeRole || ann.audienceRole === currentUser?.role)) return true;

    // 4. Class-matched (e.g. Grade 9 announcement for Grade 9 teacher or Grade 9 student)
    if (ann.audienceClassId && userClassIds.has(ann.audienceClassId)) return true;

    return false;
  }).sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  const passStatusText = relevantResults.length === 0 ? 'No exam data' : (examPassRate >= 75 ? 'High proficiency' : (examPassRate >= 50 ? 'Passing' : 'Attention required'));

  const roleTitle =
    (activeRole === 'principal' && 'Principal executive command & approvals portal') ||
    (activeRole === 'teacher' && 'Daily classroom & grading portal') ||
    (activeRole === 'parent' && "My child's academic & attendance portal") ||
    (activeRole === 'student' && 'My academic timetable & examination portal') ||
    (activeRole === 'librarian' && 'Library catalogue & circulation management') ||
    (activeRole === 'education_officer' && 'Zonal district oversight dashboard') ||
    (['admin', 'staff', 'lab_assistant'].includes(activeRole) && 'Central school operations dashboard') ||
    'Dashboard';

  return (
    <div className="space-y-6 animate-fade-in">
      <PageHeader
        eyebrow={
          <Badge tone="brand">
            {currentUser?.fullName} • {activeRole.replace('_', ' ')}
          </Badge>
        }
        title={roleTitle}
        description={`Live summary for ${schoolProfile?.schoolName || 'your school'} — attendance, examinations, and welfare, synchronised in real time.`}
        actions={
          <>
            {isPrincipalOrVP && totalPendingApprovals > 0 && (
              <Badge tone="warning" className="text-xs px-3 py-1.5">
                <FileCheck className="w-3.5 h-3.5" /> {totalPendingApprovals} approvals pending
              </Badge>
            )}
            <Button onClick={() => onNavigate('attendance')}>
              <CalendarCheck className="w-4 h-4" /> Daily roster
            </Button>
          </>
        }
      />

      {/* KPI Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label={targetAttendanceDate === realTodayStr ? "Today's attendance" : `Attendance (${targetAttendanceDate})`}
          icon={CalendarCheck}
          tone={isAttendanceMarked ? 'success' : 'warning'}
          value={isAttendanceMarked ? `${attendanceRate}%` : 'Pending'}
          trend={
            isAttendanceMarked ? (
              <Badge tone={markedStudentsCount >= totalScopedStudents ? 'success' : 'info'}>
                {markedStudentsCount >= totalScopedStudents ? (
                  <>
                    <CheckCircle className="w-3 h-3" /> Fully marked
                  </>
                ) : (
                  <>{markedStudentsCount} of {totalScopedStudents} marked</>
                )}
              </Badge>
            ) : (
              <Badge tone="warning">Not marked yet</Badge>
            )
          }
          footnote={
            isAttendanceMarked
              ? `${presentCount} of ${totalScopedStudents} students present`
              : `0 of ${totalScopedStudents} students marked for ${targetAttendanceDate === realTodayStr ? 'today' : targetAttendanceDate}`
          }
          onClick={() => onNavigate('attendance')}
        />

        <StatCard
          label="Faculty & staff"
          icon={Users}
          tone="info"
          value={totalTeachers + totalStaff}
          trend={
            <div className="flex items-center gap-1.5 flex-wrap">
              <Badge tone="info">{totalTeachers} teachers</Badge>
              <Badge tone="neutral">{totalStaff} staff</Badge>
            </div>
          }
          footnote="100% active duty assigned"
        />

        <StatCard
          label="Term exam pass rate"
          icon={GraduationCap}
          tone="brand"
          value={`${examPassRate}%`}
          trend={<Badge tone="brand">{passStatusText}</Badge>}
          footnote={`${relevantResults.length} marks registered`}
          onClick={() => onNavigate('academic_spectrum')}
        />

        <StatCard
          label="Welfare disbursed"
          icon={HeartHandshake}
          tone="warning"
          value={welfareCount}
          trend={<span className="text-xs font-semibold text-ink-muted">Beneficiaries</span>}
          footnote="Meals • Scholarships • Uniforms"
        />
      </div>

      {/* TEACHER WORKSPACE HUB */}
      {isTeacherRole && (
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2.5">
              <IconTile icon={GraduationCap} tone="brand" />
              <CardTitle>Classroom teacher workspace & daily operations</CardTitle>
            </div>
            <Badge tone="neutral">Grade 9 - Section A (25 students)</Badge>
          </CardHeader>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {[
              {
                step: '1. Daily attendance',
                icon: CalendarCheck,
                tone: 'success' as const,
                desc: 'Mark morning attendance (present/absent/late) for Grade 9-A students.',
                cta: 'Open attendance register',
                onClick: () => onNavigate('attendance'),
              },
              {
                step: '2. Term exam marks',
                icon: Award,
                tone: 'warning' as const,
                desc: 'Enter student exam scores (0–100) and generate official report cards.',
                cta: 'Enter Grade 9 marks',
                onClick: () => onNavigate('academic'),
              },
              {
                step: '3. My schedule',
                icon: Clock,
                tone: 'info' as const,
                desc: 'View weekly teaching periods, room allocations, and free periods.',
                cta: 'View teaching timetable',
                onClick: () => onNavigate('timetable'),
              },
              {
                step: '4. Apply for leave',
                icon: CalendarCheck,
                tone: 'brand' as const,
                desc: 'Submit medical, casual, or duty leave application for principal sign-off.',
                cta: 'Request leave',
                onClick: () => setShowAddLeaveModal(true),
              },
            ].map((action) => (
              <div key={action.step} className="bg-surface-muted/60 border border-border p-4 rounded-xl flex flex-col justify-between gap-3">
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-semibold text-ink uppercase tracking-wide">{action.step}</span>
                    <IconTile icon={action.icon} tone={action.tone} size="sm" />
                  </div>
                  <p className="text-sm text-ink-muted leading-snug">{action.desc}</p>
                </div>
                <Button size="sm" onClick={action.onClick} className="w-full justify-center">
                  {action.cta} →
                </Button>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* PRINCIPAL APPROVALS HUB */}
      {isPrincipalOrVP && (
        <Card className="border-brand/25">
          <CardHeader>
            <div className="flex items-center gap-2.5">
              <IconTile icon={FileCheck} tone="warning" />
              <CardTitle>Principal executive approvals hub</CardTitle>
            </div>
            <div className="flex items-center gap-3">
              {toastMessage && <Badge tone="success">{toastMessage}</Badge>}
              <Badge tone="warning">{totalPendingApprovals} action items awaiting approval</Badge>
            </div>
          </CardHeader>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Teacher Leave Requests */}
            <div className="bg-surface-muted/60 p-4 rounded-xl border border-border space-y-3">
              <div className="flex items-center justify-between border-b border-border pb-2">
                <button
                  onClick={() => onNavigate('teachers_leave')}
                  className="hover:text-brand flex items-center gap-1.5 transition-colors text-left text-xs font-semibold text-ink uppercase tracking-wide"
                >
                  <span>Teacher leave requests</span>
                  <ExternalLink className="w-3.5 h-3.5 text-ink-faint" />
                </button>
                <Badge tone={pendingLeaves.length > 0 ? 'warning' : 'neutral'}>{pendingLeaves.length} pending</Badge>
              </div>

              {pendingLeaves.length === 0 ? (
                <EmptyState icon={CalendarCheck} title="No pending leave requests" compact />
              ) : (
                pendingLeaves.map((l) => (
                  <div key={l.id} className="p-3.5 bg-surface rounded-xl border border-border space-y-2.5">
                    <div className="flex justify-between items-start">
                      <div>
                        <div className="font-semibold text-ink text-sm">{l.applicantName}</div>
                        <div className="text-sm text-ink-muted mt-0.5">{l.role}</div>
                      </div>
                      <Badge tone="neutral">{l.type}</Badge>
                    </div>

                    <div className="text-sm text-ink-muted bg-surface-muted rounded-lg p-2.5 leading-snug">
                      {l.startDate} → {l.endDate}
                      <br />
                      <span>{l.reason}</span>
                    </div>

                    <div className="flex gap-2 pt-1">
                      <Button size="sm" variant="secondary" onClick={() => setViewingLeave(l)}>
                        <Eye className="w-3.5 h-3.5" /> View
                      </Button>
                      <Button
                        size="sm"
                        variant="success"
                        className="flex-1 justify-center"
                        onClick={() => { approveLeaveRequest(l.id, 'approved'); showToast(`Approved leave for ${l.applicantName}`); }}
                      >
                        <CheckCircle className="w-3.5 h-3.5" /> Approve
                      </Button>
                      <Button
                        size="sm"
                        variant="danger"
                        onClick={() => { approveLeaveRequest(l.id, 'rejected'); showToast('Rejected leave request'); }}
                        title="Reject"
                      >
                        <XCircle className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Admission & Transfer Approvals */}
            <div className="bg-surface-muted/60 p-4 rounded-xl border border-border space-y-3">
              <div className="flex justify-between items-center text-xs font-semibold text-ink uppercase tracking-wide border-b border-border pb-2">
                <button onClick={() => onNavigate('students_admissions')} className="hover:text-brand flex items-center gap-1.5 transition-colors text-left">
                  <span>Student admissions</span>
                  <ExternalLink className="w-3.5 h-3.5 text-ink-faint" />
                </button>
                <Badge tone="warning">{pendingAdmissions.length}</Badge>
              </div>

              {pendingAdmissions.length === 0 ? (
                <EmptyState icon={FileText} title="No pending admission requests" compact />
              ) : (
                pendingAdmissions.map((a) => (
                  <div key={a.id} className="p-3.5 bg-surface border border-border rounded-xl text-sm space-y-2">
                    <div className="flex justify-between items-start">
                      <div>
                        <div className="font-semibold text-ink text-sm flex items-center gap-1.5">
                          {a.type === 'exam_admission' && <span>🎟️</span>}
                          <span>{a.studentName}</span>
                        </div>
                        <div className="text-ink-muted mt-0.5">
                          {a.type === 'exam_admission' ? a.examTerm : `Target: ${a.gradeApplying}`}
                        </div>
                      </div>
                      <Badge tone={a.type === 'exam_admission' ? 'brand' : 'neutral'}>
                        {a.type === 'exam_admission' ? 'Exam cards' : `Prev: ${a.previousSchool}`}
                      </Badge>
                    </div>

                    <div className="text-ink-muted bg-surface-muted p-2.5 rounded-lg">
                      {a.type === 'exam_admission' ? (
                        <div className="flex justify-between font-semibold">
                          <span>{a.classTeacherName}</span>
                          <span className="text-success">✓ {a.eligibleStudentCount} eligible</span>
                        </div>
                      ) : (
                        `Guardian: ${a.guardianName} (${a.contactNo})`
                      )}
                    </div>

                    <div className="flex gap-1.5 pt-1">
                      <Button size="sm" variant="secondary" onClick={() => setViewingAdmission(a)}>
                        <Eye className="w-3.5 h-3.5" /> {a.type === 'exam_admission' ? 'Roster' : 'Details'}
                      </Button>
                      <Button
                        size="sm"
                        variant="success"
                        className="flex-1 justify-center"
                        onClick={() => {
                          approveAdmissionRequest(a.id, 'approved');
                          showToast(a.type === 'exam_admission' ? `Signed exam admission cards for ${a.className}` : `Admitted student ${a.studentName}`);
                        }}
                      >
                        <CheckCircle className="w-3.5 h-3.5" /> {a.type === 'exam_admission' ? 'Sign passes' : 'Admit'}
                      </Button>
                      <Button
                        size="sm"
                        variant="danger"
                        onClick={() => { approveAdmissionRequest(a.id, 'rejected'); showToast('Declined request'); }}
                        title="Reject"
                      >
                        <XCircle className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Inventory Purchases & Disposals */}
            <div className="bg-surface-muted/60 p-4 rounded-xl border border-border space-y-3">
              <div className="flex justify-between items-center text-xs font-semibold text-ink uppercase tracking-wide border-b border-border pb-2">
                <button onClick={() => onNavigate('inventory')} className="hover:text-brand flex items-center gap-1.5 transition-colors text-left">
                  <span>Inventory sign-offs</span>
                  <ExternalLink className="w-3.5 h-3.5 text-ink-faint" />
                </button>
                <Badge tone="warning">{pendingPurchases.length}</Badge>
              </div>

              {pendingPurchases.length === 0 ? (
                <EmptyState icon={ShieldCheck} title="No pending inventory approvals" compact />
              ) : (
                pendingPurchases.map((p) => (
                  <div key={p.id} className="p-3.5 bg-surface border border-border rounded-xl text-sm space-y-2">
                    <div className="flex justify-between font-semibold text-ink text-sm">
                      <span>{p.itemName} ({p.quantity} qty)</span>
                      <Badge tone="neutral">{p.type}</Badge>
                    </div>
                    <div className="text-ink-muted bg-surface-muted p-2.5 rounded-lg">
                      Est. cost: LKR {p.estimatedCost.toLocaleString()} • {p.reason}
                    </div>
                    <div className="flex gap-2 pt-1">
                      <Button
                        size="sm"
                        variant="success"
                        className="flex-1 justify-center"
                        onClick={() => { approvePurchaseDisposalRequest(p.id, 'approved'); showToast(`Approved ${p.type} for ${p.itemName}`); }}
                      >
                        <CheckCircle className="w-3.5 h-3.5" /> Sign-off
                      </Button>
                      <Button
                        size="sm"
                        variant="danger"
                        className="flex-1 justify-center"
                        onClick={() => { approvePurchaseDisposalRequest(p.id, 'rejected'); showToast('Declined inventory sign-off'); }}
                      >
                        <XCircle className="w-3.5 h-3.5" /> Decline
                      </Button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </Card>
      )}

      {/* Announcements & Academic Calendar */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <Card className="lg:col-span-2">
          <CardHeader>
            <div className="flex items-center gap-2.5">
              <IconTile icon={BellRing} tone="warning" />
              <CardTitle>School announcements</CardTitle>
            </div>
            <button
              onClick={() => onNavigate('communication')}
              className="text-sm font-semibold text-ink-muted hover:text-brand transition-colors flex items-center gap-1"
            >
              View all
            </button>
          </CardHeader>

          <div className="space-y-3">
            {visibleAnnouncements.length === 0 ? (
              <EmptyState icon={BellRing} title="No announcements published for your class" compact />
            ) : (
              visibleAnnouncements.map((ann) => {
                const targetCls = ann.audienceClassId ? classes.find((c) => c.id === ann.audienceClassId) : null;
                const audienceText = targetCls
                  ? `Grade ${targetCls.grade} - Section ${targetCls.section}`
                  : ann.audienceRole && ann.audienceRole !== 'all'
                  ? `${ann.audienceRole.toUpperCase()}`
                  : 'School-wide';

                return (
                  <div
                    key={ann.id}
                    className={`p-4 rounded-xl space-y-2 transition-all ${
                      ann.isEmergency
                        ? 'bg-danger-tint/80 border-l-4 border-danger shadow-xs'
                        : 'bg-surface-muted/60 border-l-4 border-brand'
                    }`}
                  >
                    <div className="flex items-center justify-between text-xs mb-1">
                      <span className="font-semibold text-ink-muted flex items-center gap-1.5 flex-wrap">
                        <span>{ann.createdBy}</span>
                        <Badge tone={ann.isEmergency ? 'danger' : 'neutral'} className="text-[10px] px-1.5 py-0">
                          Audience: {audienceText}
                        </Badge>
                      </span>
                      <div className="flex items-center gap-2">
                        <span className="text-ink-faint font-mono-data">
                          {new Date(ann.createdAt).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })}
                        </span>
                        {(isManagement || ann.createdBy === currentUser?.fullName) && (
                          <button
                            type="button"
                            onClick={() => deleteAnnouncement(ann.id)}
                            title="Remove announcement"
                            className="p-1 text-ink-faint hover:text-danger hover:bg-danger-tint rounded-md transition-colors cursor-pointer"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </div>

                    <h4 className="font-display font-bold text-base text-ink leading-snug flex items-center gap-2">
                      {ann.isEmergency && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-danger text-white text-xs font-bold uppercase tracking-wider shrink-0">
                          <AlertTriangle className="w-3 h-3" /> Emergency
                        </span>
                      )}
                      <span>{ann.title}</span>
                    </h4>

                    <p className="text-sm text-ink-muted leading-relaxed whitespace-pre-wrap">{ann.body}</p>
                  </div>
                );
              })
            )}
          </div>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-center gap-2.5">
              <IconTile icon={Calendar} tone="info" />
              <CardTitle>Academic calendar</CardTitle>
            </div>
          </CardHeader>

          <div className="space-y-2.5">
            {calendarEvents.length === 0 ? (
              <EmptyState icon={Calendar} title="No upcoming events" compact />
            ) : (
              calendarEvents.map((evt) => (
                <div key={evt.id} className="p-3 bg-surface-muted/60 border border-border rounded-xl flex items-center justify-between">
                  <div>
                    <div className="font-semibold text-ink text-sm">{evt.title}</div>
                    <div className="text-xs text-ink-faint mt-0.5">{evt.date}</div>
                  </div>
                  <Badge tone="brand">{evt.type}</Badge>
                </div>
              ))
            )}
          </div>
        </Card>
      </div>

      {/* NEW LEAVE REQUEST MODAL */}
      <Modal
        open={showAddLeaveModal}
        onClose={() => setShowAddLeaveModal(false)}
        title="Submit teacher & staff leave request"
        footer={
          <>
            <Button variant="secondary" onClick={() => setShowAddLeaveModal(false)}>Cancel</Button>
            <Button type="submit" form="leave-request-form">Submit leave request</Button>
          </>
        }
      >
        <form
          id="leave-request-form"
          onSubmit={(e) => {
            e.preventDefault();
            addLeaveRequest({
              applicantName: leaveApplicant,
              role: leaveRole,
              type: leaveType,
              startDate: leaveStartDate,
              endDate: leaveEndDate,
              reason: leaveReason || 'Standard leave application',
            });
            setShowAddLeaveModal(false);
            showToast(`Submitted leave request for ${leaveApplicant}`);
            setLeaveReason('');
          }}
          className="space-y-3.5"
        >
          <FormField label="Applicant name" required>
            <Input value={leaveApplicant} onChange={(e) => setLeaveApplicant(e.target.value)} required />
          </FormField>

          <FormField label="Designation / role">
            <Input value={leaveRole} onChange={(e) => setLeaveRole(e.target.value)} />
          </FormField>

          <FormField label="Leave category">
            <Select value={leaveType} onChange={(e) => setLeaveType(e.target.value as any)}>
              <option value="Sick Leave">Sick Leave</option>
              <option value="Casual Leave">Casual Leave</option>
              <option value="Duty Leave">Duty Leave</option>
            </Select>
          </FormField>

          <div className="grid grid-cols-2 gap-3">
            <FormField label="Start date">
              <DatePicker value={leaveStartDate} onChange={setLeaveStartDate} required />
            </FormField>
            <FormField label="End date">
              <DatePicker value={leaveEndDate} onChange={setLeaveEndDate} required />
            </FormField>
          </div>

          <FormField label="Reason / details">
            <Textarea rows={2} value={leaveReason} onChange={(e) => setLeaveReason(e.target.value)} placeholder="Enter reason for leave application..." />
          </FormField>
        </form>
      </Modal>

      {/* FULL LEAVE DOSSIER VIEW MODAL */}
      <Modal
        open={Boolean(viewingLeave)}
        onClose={() => setViewingLeave(null)}
        eyebrow={schoolProfile?.schoolName || 'Your School'}
        title={viewingLeave ? `Official faculty leave dossier #${viewingLeave.id}` : ''}
        size="lg"
        footer={
          viewingLeave && (
            <>
              <Button variant="secondary" onClick={() => setViewingLeave(null)}>Close dossier</Button>
              {viewingLeave.status === 'pending' && (
                <>
                  <Button
                    variant="danger"
                    onClick={() => {
                      approveLeaveRequest(viewingLeave.id, 'rejected');
                      showToast(`Rejected leave request for ${viewingLeave.applicantName}`);
                      setViewingLeave(null);
                    }}
                  >
                    <XCircle className="w-3.5 h-3.5" /> Decline request
                  </Button>
                  <Button
                    variant="success"
                    onClick={() => {
                      approveLeaveRequest(viewingLeave.id, 'approved');
                      showToast(`Approved leave for ${viewingLeave.applicantName}`);
                      setViewingLeave(null);
                    }}
                  >
                    <CheckCircle className="w-3.5 h-3.5" /> Sign & grant approval
                  </Button>
                </>
              )}
            </>
          )
        }
      >
        {viewingLeave && (
          <>
            <div className="p-3.5 bg-surface-muted rounded-xl space-y-2">
              <div className="flex justify-between items-center border-b border-border pb-2">
                <div className="font-display font-semibold text-sm text-ink">{viewingLeave.applicantName}</div>
                <Badge tone={viewingLeave.status === 'approved' ? 'success' : viewingLeave.status === 'rejected' ? 'danger' : 'warning'}>
                  {viewingLeave.status}
                </Badge>
              </div>
              <div className="text-sm">
                <span className="text-ink-faint block text-xs uppercase">Designation / role</span>
                <span className="font-semibold text-ink">{viewingLeave.role}</span>
              </div>
            </div>

            <div className="space-y-2 border border-border rounded-xl p-3.5">
              <h4 className="font-semibold text-xs uppercase text-ink border-b border-border pb-1.5 flex items-center gap-1">
                <FileText className="w-3.5 h-3.5 text-brand" /> Application specifications
              </h4>
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <span className="text-ink-faint block text-xs uppercase">Leave category</span>
                  <span className="font-semibold text-ink">{viewingLeave.type}</span>
                </div>
                <div>
                  <span className="text-ink-faint block text-xs uppercase">Date duration</span>
                  <span className="font-semibold text-ink">{viewingLeave.startDate} to {viewingLeave.endDate}</span>
                </div>
              </div>

              <div className="pt-2 border-t border-border">
                <span className="text-ink-faint block text-xs uppercase font-semibold mb-1">Reason / details</span>
                <div className="p-2.5 bg-surface-muted rounded-lg text-ink text-sm leading-relaxed italic">
                  "{viewingLeave.reason}"
                </div>
              </div>
            </div>
          </>
        )}
      </Modal>

      {/* FULL STUDENT ADMISSION DOSSIER VIEW MODAL */}
      <Modal
        open={Boolean(viewingAdmission)}
        onClose={() => setViewingAdmission(null)}
        eyebrow={schoolProfile?.schoolName || 'Your School'}
        title={viewingAdmission ? `Official student admission dossier #${viewingAdmission.id}` : ''}
        size="lg"
        footer={
          viewingAdmission && (
            <>
              <Button variant="secondary" onClick={() => setViewingAdmission(null)}>Close dossier</Button>
              {viewingAdmission.status === 'pending' && (
                <>
                  <Button
                    variant="danger"
                    onClick={() => {
                      approveAdmissionRequest(viewingAdmission.id, 'rejected');
                      showToast('Rejected request');
                      setViewingAdmission(null);
                    }}
                  >
                    <XCircle className="w-3.5 h-3.5" /> Decline request
                  </Button>
                  <Button
                    variant="success"
                    onClick={() => {
                      approveAdmissionRequest(viewingAdmission.id, 'approved');
                      showToast(
                        viewingAdmission.type === 'exam_admission'
                          ? `Signed & issued official exam admission cards for ${viewingAdmission.className}`
                          : `Admitted student ${viewingAdmission.studentName}`
                      );
                      setViewingAdmission(null);
                    }}
                  >
                    <CheckCircle className="w-3.5 h-3.5" />
                    {viewingAdmission.type === 'exam_admission' ? 'Sign & issue hall passes' : 'Sign & grant admission'}
                  </Button>
                </>
              )}
            </>
          )
        }
      >
        {viewingAdmission && (
          <>
            <div className="p-3.5 bg-surface-muted rounded-xl space-y-2">
              <div className="flex justify-between items-center border-b border-border pb-2">
                <div>
                  <div className="font-display font-semibold text-sm text-ink">{viewingAdmission.studentName}</div>
                  <div className="text-xs text-ink-faint">
                    {viewingAdmission.type === 'exam_admission' ? viewingAdmission.examTerm : `Applying for: ${viewingAdmission.gradeApplying}`}
                  </div>
                </div>
                <Badge tone={viewingAdmission.status === 'approved' ? 'success' : viewingAdmission.status === 'rejected' ? 'danger' : 'warning'}>
                  {viewingAdmission.status}
                </Badge>
              </div>
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div>
                  <span className="text-ink-faint block text-xs uppercase">
                    {viewingAdmission.type === 'exam_admission' ? 'Class & section' : 'Previous school'}
                  </span>
                  <span className="font-semibold text-ink">
                    {viewingAdmission.type === 'exam_admission' ? viewingAdmission.className : viewingAdmission.previousSchool}
                  </span>
                </div>
                <div>
                  <span className="text-ink-faint block text-xs uppercase">Class teacher submitter</span>
                  <span className="font-semibold text-ink">
                    {viewingAdmission.classTeacherName || viewingAdmission.submittedByTeacherName || 'Class Teacher'}
                  </span>
                </div>
              </div>
            </div>

            {viewingAdmission.type === 'exam_admission' ? (
              <div className="space-y-2 border border-border rounded-xl p-3.5">
                <div className="flex justify-between items-center border-b border-border pb-2">
                  <h4 className="font-semibold text-xs uppercase text-ink flex items-center gap-1">
                    <FileText className="w-3.5 h-3.5 text-brand" /> Class attendance & exam eligibility register (≥80% rule)
                  </h4>
                  <Badge tone="success">
                    {viewingAdmission.eligibleStudentCount} / {viewingAdmission.totalClassStudents} eligible
                  </Badge>
                </div>

                <div className="space-y-1.5 max-h-56 overflow-y-auto pr-1">
                  {(viewingAdmission.studentRoster || []).map((s) => (
                    <div
                      key={s.studentNo}
                      className={`p-2 rounded-lg border text-xs flex items-center justify-between gap-2 ${
                        s.isEligible ? 'bg-surface-muted border-border' : 'bg-danger-tint border-danger/30'
                      }`}
                    >
                      <div>
                        <div className="font-semibold text-ink text-xs flex items-center gap-1.5">
                          <span className="font-mono-data">{s.studentNo}</span>
                          <span>{s.studentName}</span>
                        </div>
                        <div className="text-xs text-ink-faint">
                          Attendance: <strong className={s.isEligible ? 'text-success' : 'text-danger'}>{s.attendancePercentage}%</strong> • {s.remarks}
                        </div>
                      </div>

                      <div className="flex items-center gap-1 shrink-0">
                        {s.isEligible ? (
                          <button
                            type="button"
                            onClick={() => updateStudentExamEligibility(viewingAdmission.id, s.studentNo, false)}
                            className="px-2 py-1 bg-danger-tint text-danger rounded-md text-xs font-semibold hover:bg-danger hover:text-white transition-colors"
                          >
                            Deny ticket
                          </button>
                        ) : (
                          <button
                            type="button"
                            onClick={() => updateStudentExamEligibility(viewingAdmission.id, s.studentNo, true)}
                            className="px-2 py-1 bg-success-tint text-success rounded-md text-xs font-semibold hover:bg-success hover:text-white transition-colors"
                          >
                            Grant ticket
                          </button>
                        )}

                        {s.isEligible && (
                          <button
                            type="button"
                            onClick={() =>
                              setViewingExamPass({
                                studentNo: s.studentNo,
                                studentName: s.studentName,
                                className: viewingAdmission.className || 'Grade 9 - Section A',
                                examTerm: viewingAdmission.examTerm || '2026 Term 1 Final Examinations',
                                attendancePercentage: s.attendancePercentage,
                                principalName: schoolProfile?.principalName || 'Principal',
                              })
                            }
                            className="px-2 py-1 bg-accent-tint text-accent font-semibold rounded-md text-xs hover:bg-accent hover:text-white transition-colors"
                          >
                            View pass
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>

                <div className="pt-2 border-t border-border text-xs text-ink-muted">
                  Sri Lanka Ministry Regulation: minimum 80% attendance required for examination hall pass.
                </div>
              </div>
            ) : (
              <div className="space-y-2 border border-border rounded-xl p-3.5">
                <h4 className="font-semibold text-xs uppercase text-ink border-b border-border pb-1.5 flex items-center gap-1">
                  <FileText className="w-3.5 h-3.5 text-brand" /> Parent / guardian & verification summary
                </h4>
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <span className="text-ink-faint block text-xs uppercase">Guardian full name</span>
                    <span className="font-semibold text-ink">{viewingAdmission.guardianName}</span>
                  </div>
                  <div>
                    <span className="text-ink-faint block text-xs uppercase">Contact phone</span>
                    <span className="font-semibold text-ink">{viewingAdmission.contactNo}</span>
                  </div>
                  <div>
                    <span className="text-ink-faint block text-xs uppercase">Academic transcript</span>
                    <span className="font-semibold text-success">✓ Ministry verified grade pass</span>
                  </div>
                  <div>
                    <span className="text-ink-faint block text-xs uppercase">Character certificate</span>
                    <span className="font-semibold text-success">✓ Valid & approved</span>
                  </div>
                </div>
                <div className="flex items-center justify-between p-2 bg-brand-tint rounded-lg text-sm mt-2">
                  <div className="flex items-center gap-1.5 text-ink font-semibold">
                    <Paperclip className="w-3.5 h-3.5 text-brand" />
                    <span>Zonal_Transfer_Clearance_Certificate.pdf</span>
                  </div>
                  <Badge tone="brand">Official clearance</Badge>
                </div>
              </div>
            )}
          </>
        )}
      </Modal>

      {/* OFFICIAL PRINTABLE EXAMINATION HALL PASS MODAL */}
      <Modal
        open={Boolean(viewingExamPass)}
        onClose={() => setViewingExamPass(null)}
        title="Examination admission ticket (hall pass)"
        eyebrow={viewingExamPass ? `${schoolProfile?.schoolName || 'Your School'} • Card #${viewingExamPass.studentNo}` : ''}
        size="lg"
        footer={
          <>
            <Button variant="secondary" onClick={() => setViewingExamPass(null)}>Close pass</Button>
            <Button variant="primary" onClick={() => window.print()}>Print exam admission ticket</Button>
          </>
        }
      >
        {viewingExamPass && (
          <>
            <div className="text-center">
              <Badge tone="accent" className="text-xs">{viewingExamPass.examTerm}</Badge>
            </div>

            <div className="grid grid-cols-2 gap-3 bg-surface-muted p-3.5 rounded-xl">
              <div>
                <span className="text-ink-faint block text-xs uppercase">Candidate name</span>
                <span className="font-display font-semibold text-ink text-sm">{viewingExamPass.studentName}</span>
              </div>
              <div>
                <span className="text-ink-faint block text-xs uppercase">Index / reg number</span>
                <span className="font-mono-data font-semibold text-ink">{viewingExamPass.studentNo}</span>
              </div>
              <div>
                <span className="text-ink-faint block text-xs uppercase">Class & section</span>
                <span className="font-semibold text-ink">{viewingExamPass.className}</span>
              </div>
              <div>
                <span className="text-ink-faint block text-xs uppercase">Verified attendance</span>
                <span className="font-semibold text-success">✓ {viewingExamPass.attendancePercentage}% (eligible)</span>
              </div>
            </div>

            <div className="space-y-1.5 border border-border rounded-xl p-3.5">
              <div className="font-semibold text-ink text-xs border-b border-border pb-1.5 flex justify-between">
                <span>Authorized examination subjects</span>
                <span>Status</span>
              </div>
              {(() => {
                const targetClass = classes.find((c) => `${c.grade} - Section ${c.section}` === viewingExamPass.className);
                const classAssignments = targetClass ? teachingAssignments.filter((ta) => ta.classId === targetClass.id) : [];
                const assignedSubjectIds = new Set(classAssignments.map((ta) => ta.subjectId));
                const passSubjects = assignedSubjectIds.size > 0
                  ? subjects.filter((sub) => assignedSubjectIds.has(sub.id))
                  : subjects.slice(0, 6);

                return (
                  <div className="space-y-1.5 text-xs max-h-36 overflow-y-auto pr-1">
                    {passSubjects.map((sub) => (
                      <div key={sub.id} className="flex justify-between items-center py-1 border-b border-border/60">
                        <span className="font-semibold text-ink">{sub.code} — {sub.name}</span>
                        <Badge tone="success">✓ Granted</Badge>
                      </div>
                    ))}
                  </div>
                );
              })()}
            </div>

            <div className="pt-3 border-t border-border flex items-center justify-between">
              <div className="space-y-1">
                <div className="text-xs text-ink-faint uppercase">Executive sign-off & stamp</div>
                <div className="font-semibold text-ink text-sm italic">Signed: {viewingExamPass.principalName}</div>
                <Badge tone="success">Official principal seal applied ✓</Badge>
              </div>
              <div className="text-right space-y-1">
                <div className="bg-ink text-white font-mono-data text-xs font-bold px-2 py-1 rounded tracking-widest">
                  ||||| | |||| ||| ||||
                </div>
                <div className="text-[9px] text-ink-faint">Validated hall pass</div>
              </div>
            </div>
          </>
        )}
      </Modal>
    </div>
  );
};
