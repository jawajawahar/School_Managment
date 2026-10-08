import React, { useState, useEffect } from 'react';
import { UserCheck, BookOpen, Award, CheckCircle, XCircle, Phone, Mail, Crown, Plus, Eye, FileText, ChevronLeft, ChevronRight, Briefcase, Pencil, Trash2, Clock, Search } from 'lucide-react';
import { useData } from '../../context/DataContext';
import { CustomSelect } from '../common/CustomSelect';
import { LeaveRequest } from '../../types';
import { PageHeader } from '../ui/PageHeader';
import { Badge, BadgeTone } from '../ui/Badge';
import { Button } from '../ui/Button';
import { Card } from '../ui/Card';
import { Modal } from '../ui/Modal';
import { FormField, Input, Select, Textarea } from '../ui/FormField';
import { DatePicker } from '../ui/DatePicker';
import { EmptyState } from '../ui/EmptyState';
import { Table, THead, TH, TBody, TR, TD } from '../ui/Table';

interface TeacherStaffModuleProps {
  initialTab?: 'teachers' | 'staff' | 'leave';
}

export const TeacherStaffModule: React.FC<TeacherStaffModuleProps> = ({ initialTab = 'teachers' }) => {
  const { teachers, staff, users, currentUser, activeRole, leaveRequests, teachingAssignments, subjects, classes, approveLeaveRequest, addTeacher, updateTeacher, deleteTeacher, addStaff, addLeaveRequest, schoolProfile } = useData();
  const [activeTab, setActiveTab] = useState<'teachers' | 'staff' | 'leave'>(initialTab);

  const [teachersPage, setTeachersPage] = useState<number>(1);

  useEffect(() => {
    if (initialTab) setActiveTab(initialTab);
  }, [initialTab]);

  const [showAddTeacherModal, setShowAddTeacherModal] = useState(false);
  const [showAddStaffModal, setShowAddStaffModal] = useState(false);
  const [showLeaveModal, setShowLeaveModal] = useState(false);
  const [viewingDossier, setViewingDossier] = useState<LeaveRequest | null>(null);

  // New Teacher Form State
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [qualification, setQualification] = useState('B.Sc (Hons) Education');
  const [subjectSpecialization, setSubjectSpecialization] = useState('Mathematics');

  // Edit Teacher Form State
  const [editingTeacherId, setEditingTeacherId] = useState<string | null>(null);
  const [showEditTeacherModal, setShowEditTeacherModal] = useState(false);
  const [editFullName, setEditFullName] = useState('');
  const [editEmail, setEditEmail] = useState('');
  const [editPhone, setEditPhone] = useState('');
  const [editQualification, setEditQualification] = useState('');
  const [editSubjectSpecialization, setEditSubjectSpecialization] = useState('');

  const handleOpenEditTeacher = (t: (typeof teachers)[number]) => {
    const user = users.find((u) => u.id === t.userId);
    setEditingTeacherId(t.id);
    setEditFullName(user?.fullName || '');
    setEditEmail(user?.email || '');
    setEditPhone(t.phone || user?.phone || '');
    setEditQualification(t.qualification || 'B.Sc (Hons) Education');
    setEditSubjectSpecialization(t.subjectSpecialization || 'Mathematics');
    setShowEditTeacherModal(true);
  };

  const handleEditTeacherSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingTeacherId || !editFullName || !editEmail) return;
    updateTeacher(editingTeacherId, {
      fullName: editFullName,
      email: editEmail,
      phone: editPhone,
      qualification: editQualification,
      subjectSpecialization: editSubjectSpecialization,
    });
    setShowEditTeacherModal(false);
    setEditingTeacherId(null);
  };

  const handleDeleteTeacher = (t: (typeof teachers)[number]) => {
    const user = users.find((u) => u.id === t.userId);
    const teacherName = user?.fullName || t.employeeNo;
    if (window.confirm(`Permanently delete record for ${teacherName} (${t.employeeNo})? This will unassign any class teacher or subject roles.`)) {
      deleteTeacher(t.id);
    }
  };

  // New Staff Form State
  const [staffFullName, setStaffFullName] = useState('');
  const [staffEmail, setStaffEmail] = useState('');
  const [staffPhone, setStaffPhone] = useState('');
  const [staffRoleDescription, setStaffRoleDescription] = useState('');
  const [staffDepartment, setStaffDepartment] = useState('Administration');

  // Leave Form State
  const [leaveApplicantName, setLeaveApplicantName] = useState(currentUser?.fullName || '');
  const [leaveRoleName, setLeaveRoleName] = useState('Grade 9 Class Teacher');
  const [leaveTypeVal, setLeaveTypeVal] = useState<'Sick Leave' | 'Casual Leave' | 'Duty Leave'>('Sick Leave');
  const [leaveStart, setLeaveStart] = useState('2026-08-01');
  const [leaveEnd, setLeaveEnd] = useState('2026-08-03');
  const [leaveReasonTxt, setLeaveReasonTxt] = useState('');

  // Filter & Search State for Leave Requests
  const [selectedApplicant, setSelectedApplicant] = useState<string>('all');
  const [leaveSearch, setLeaveSearch] = useState<string>('');
  const [leaveStatusFilter, setLeaveStatusFilter] = useState<string>('all');
  const [leaveTypeFilter, setLeaveTypeFilter] = useState<string>('all');

  const isPrincipalOrAdmin = ['principal', 'vice_principal', 'admin'].includes(activeRole);

  // Helper function to calculate duration in days (inclusive)
  const calculateLeaveDays = (startDate: string, endDate: string) => {
    if (!startDate || !endDate) return 1;
    const start = new Date(startDate).getTime();
    const end = new Date(endDate).getTime();
    if (isNaN(start) || isNaN(end)) return 1;
    const diffTime = end - start;
    const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24));
    return Math.max(1, diffDays + 1);
  };

  // Compile full list of unique teachers & staff names for applicant filter
  const allApplicantNames = Array.from(
    new Set([
      ...teachers.map((t) => users.find((u) => u.id === t.userId)?.fullName).filter((n): n is string => Boolean(n)),
      ...staff.map((s) => users.find((u) => u.id === s.userId)?.fullName).filter((n): n is string => Boolean(n)),
      ...leaveRequests.map((l) => l.applicantName).filter(Boolean),
    ])
  ).sort();

  // Non-admin staff only see their own leave history; principal/admin see everyone's.
  const baseLeaveRequests = isPrincipalOrAdmin
    ? leaveRequests
    : leaveRequests.filter((l) => l.applicantName === currentUser?.fullName);

  // Summary Metrics over baseLeaveRequests (or filtered by selected applicant)
  const metricRequests = selectedApplicant === 'all'
    ? baseLeaveRequests
    : baseLeaveRequests.filter((l) => l.applicantName === selectedApplicant);

  const totalLeaveCount = metricRequests.length;
  const approvedRequests = metricRequests.filter((l) => l.status === 'approved');
  const approvedLeaveCount = approvedRequests.length;
  const totalApprovedDays = approvedRequests.reduce((sum, l) => sum + calculateLeaveDays(l.startDate, l.endDate), 0);

  const pendingRequests = metricRequests.filter((l) => l.status === 'pending');
  const pendingLeaveCount = pendingRequests.length;
  const totalPendingDays = pendingRequests.reduce((sum, l) => sum + calculateLeaveDays(l.startDate, l.endDate), 0);

  const rejectedRequests = metricRequests.filter((l) => l.status === 'rejected');
  const rejectedLeaveCount = rejectedRequests.length;
  const totalRejectedDays = rejectedRequests.reduce((sum, l) => sum + calculateLeaveDays(l.startDate, l.endDate), 0);

  // Filtered list of requests for display in table
  const filteredLeaveRequests = baseLeaveRequests.filter((l) => {
    if (selectedApplicant !== 'all' && l.applicantName !== selectedApplicant) return false;
    if (leaveStatusFilter !== 'all' && l.status !== leaveStatusFilter) return false;
    if (leaveTypeFilter !== 'all' && l.type !== leaveTypeFilter) return false;
    if (leaveSearch) {
      const q = leaveSearch.toLowerCase();
      const matchApplicant = l.applicantName?.toLowerCase().includes(q);
      const matchRole = l.role?.toLowerCase().includes(q);
      const matchId = l.id?.toLowerCase().includes(q);
      const matchType = l.type?.toLowerCase().includes(q);
      if (!matchApplicant && !matchRole && !matchId && !matchType) return false;
    }
    return true;
  });

  const leaveStatusTone = (status: LeaveRequest['status']): BadgeTone =>
    status === 'approved' ? 'success' : status === 'rejected' ? 'danger' : 'warning';

  const handleAddTeacherSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!fullName || !email) return;
    addTeacher({ fullName, email, phone: phone || '+94 77 123 4567', qualification, subjectSpecialization });
    setFullName('');
    setEmail('');
    setPhone('');
    setShowAddTeacherModal(false);
  };

  const handleAddStaffSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!staffFullName || !staffEmail || !staffRoleDescription) return;
    addStaff({ fullName: staffFullName, email: staffEmail, phone: staffPhone || '+94 77 123 4567', roleDescription: staffRoleDescription, department: staffDepartment });
    setStaffFullName('');
    setStaffEmail('');
    setStaffPhone('');
    setStaffRoleDescription('');
    setShowAddStaffModal(false);
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <PageHeader
        eyebrow={<Badge tone="brand">Teacher & staff management</Badge>}
        title={
          activeTab === 'staff' ? 'Administrative support staff'
          : activeTab === 'leave' ? (isPrincipalOrAdmin ? 'Staff & teacher leave requests' : 'My leave requests')
          : 'Academic faculty roster'
        }
        description={
          activeTab === 'staff' ? 'Non-teaching staff directory and roles.'
          : activeTab === 'leave' ? (isPrincipalOrAdmin ? 'Review and approve leave applications.' : 'Track your submitted leave applications.')
          : 'Contact info, qualifications, and subject workload allocation.'
        }
        actions={
          isPrincipalOrAdmin && activeTab === 'teachers' ? (
            <Button onClick={() => setShowAddTeacherModal(true)}><Plus className="w-4 h-4" /> Register new teacher</Button>
          ) : isPrincipalOrAdmin && activeTab === 'staff' ? (
            <Button onClick={() => setShowAddStaffModal(true)}><Plus className="w-4 h-4" /> Register new staff</Button>
          ) : activeTab === 'leave' && !isPrincipalOrAdmin ? (
            <Button onClick={() => setShowLeaveModal(true)}><Plus className="w-4 h-4" /> Apply for leave</Button>
          ) : undefined
        }
      />

      {/* Teachers Roster Tab */}
      {activeTab === 'teachers' && (() => {
        const teachersPerPage = 10;
        const totalTeacherPages = Math.max(1, Math.ceil(teachers.length / teachersPerPage));
        const safeTeacherPage = Math.min(teachersPage, totalTeacherPages);
        const paginatedTeachers = teachers.slice((safeTeacherPage - 1) * teachersPerPage, safeTeacherPage * teachersPerPage);

        if (teachers.length === 0) {
          return (
            <Card>
              <EmptyState
                icon={UserCheck}
                title="No teachers registered yet"
                description="Click Register New Teacher above to add academic teachers to your school roster."
                action={isPrincipalOrAdmin ? <Button onClick={() => setShowAddTeacherModal(true)}><Plus className="w-4 h-4" /> Register first teacher</Button> : undefined}
              />
            </Card>
          );
        }

        return (
          <div className="space-y-4">
            <Card padded={false}>
              <Table>
                <THead>
                  <tr>
                    <TH className="py-3.5 px-4 whitespace-nowrap">Teacher & Employee ID</TH>
                    <TH className="py-3.5 px-4 whitespace-nowrap">Specialization & Class Role</TH>
                    <TH className="py-3.5 px-4 whitespace-nowrap">Contact Details</TH>
                    <TH className="py-3.5 px-4">Assigned Subjects</TH>
                    <TH className="py-3.5 px-4 text-center whitespace-nowrap">Workload</TH>
                    {isPrincipalOrAdmin && <TH className="py-3.5 px-4 text-right whitespace-nowrap">Actions</TH>}
                  </tr>
                </THead>
                <TBody>
                  {paginatedTeachers.map((t) => {
                    const user = users.find((u) => u.id === t.userId);
                    const teacherAssignments = teachingAssignments.filter((ta) => ta.teacherId === t.id);
                    const subjectCount = teacherAssignments.length;
                    const classTeacherOf = classes.find((c) => c.classTeacherId === t.id || c.classTeacherId === t.userId || c.classTeacherId === t.employeeNo);

                    const formatSubjectBadge = (subName: string, gradeLabel?: string) => {
                      let display = subName;
                      if (subName.toLowerCase().includes('information & communication technology')) {
                        display = 'ICT';
                      }
                      return gradeLabel ? `${display} (${gradeLabel})` : display;
                    };

                    return (
                      <TR key={t.id} className="hover:bg-surface-muted/50 transition-colors">
                        <TD className="py-4 px-4 whitespace-nowrap">
                          <div className="flex items-center gap-3">
                            <img
                              src={user?.avatarUrl || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=120'}
                              alt={user?.fullName || t.employeeNo}
                              className="w-10 h-10 rounded-full object-cover ring-2 ring-brand-tint shrink-0"
                            />
                            <div>
                              <div className="font-semibold text-ink text-sm leading-snug">{user?.fullName || 'Academic Teacher'}</div>
                              <div className="flex items-center gap-1.5 mt-0.5">
                                <span className="font-mono-data text-ink-muted text-xs bg-surface-muted px-1.5 py-0.5 rounded border border-border">
                                  {t.employeeNo}
                                </span>
                              </div>
                            </div>
                          </div>
                        </TD>

                        <TD className="py-4 px-4">
                          <div className="space-y-1 min-w-[200px]">
                            <div className="font-medium text-ink text-sm flex items-center gap-1.5">
                              <BookOpen className="w-3.5 h-3.5 text-brand shrink-0" />
                              <span>{t.subjectSpecialization}</span>
                            </div>
                            <div className="text-xs text-ink-faint">{t.qualification}</div>
                            {classTeacherOf ? (
                              <div className="pt-0.5">
                                <Badge tone="brand" className="whitespace-nowrap">
                                  <Crown className="w-3 h-3" /> Class Teacher: {classTeacherOf.grade} ({classTeacherOf.section})
                                </Badge>
                              </div>
                            ) : null}
                          </div>
                        </TD>

                        <TD className="py-4 px-4 whitespace-nowrap">
                          <div className="text-xs space-y-1 text-ink-muted">
                            <div className="flex items-center gap-1.5">
                              <Phone className="w-3.5 h-3.5 text-ink-faint shrink-0" />
                              <span className="font-mono-data">{t.phone || user?.phone || '+94 77 123 4567'}</span>
                            </div>
                            <div className="flex items-center gap-1.5">
                              <Mail className="w-3.5 h-3.5 text-ink-faint shrink-0" />
                              <span>{user?.email}</span>
                            </div>
                          </div>
                        </TD>

                        <TD className="py-4 px-4">
                          <div className="flex flex-wrap gap-1.5">
                            {teacherAssignments.length === 0 ? (
                              <span className="text-ink-faint text-xs italic">No subjects assigned yet</span>
                            ) : (
                              teacherAssignments.map((ta) => {
                                const subObj = subjects.find((s) => s.id === ta.subjectId);
                                const clsObj = classes.find((c) => c.id === ta.classId);
                                return (
                                  <span
                                    key={ta.id}
                                    className="bg-surface-muted border border-border px-2.5 py-1 rounded-lg text-xs font-semibold text-ink inline-flex items-center gap-1.5 whitespace-nowrap"
                                  >
                                    <BookOpen className="w-3 h-3 text-brand" />
                                    {formatSubjectBadge(subObj?.name || 'Subject', clsObj?.grade)}
                                  </span>
                                );
                              })
                            )}
                          </div>
                        </TD>

                        <TD className="py-4 px-4 text-center whitespace-nowrap">
                          <Badge tone={subjectCount >= 3 ? 'danger' : subjectCount > 0 ? 'success' : 'warning'}>
                            {subjectCount} / 3 subjects
                          </Badge>
                        </TD>

                        {isPrincipalOrAdmin && (
                          <TD className="py-4 px-4 text-right whitespace-nowrap">
                            <div className="flex items-center justify-end gap-1.5">
                              <button
                                onClick={() => handleOpenEditTeacher(t)}
                                className="p-1.5 text-ink-muted hover:text-ink hover:bg-surface-muted rounded-lg transition-colors"
                                title="Edit teacher profile & details"
                              >
                                <Pencil className="w-3.5 h-3.5" />
                              </button>
                              <button
                                onClick={() => handleDeleteTeacher(t)}
                                className="p-1.5 text-ink-muted hover:text-danger hover:bg-danger-tint rounded-lg transition-colors"
                                title="Delete teacher record"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </TD>
                        )}
                      </TR>
                    );
                  })}
                </TBody>
              </Table>
            </Card>

            {totalTeacherPages > 1 && (
              <div className="flex items-center justify-between p-3.5 bg-surface border border-border rounded-xl text-sm text-ink-muted">
                <span>Showing page <strong className="text-ink">{safeTeacherPage}</strong> of <strong className="text-ink">{totalTeacherPages}</strong> ({teachers.length} total teachers)</span>
                <div className="flex items-center gap-1">
                  <button disabled={safeTeacherPage === 1} onClick={() => setTeachersPage((p) => Math.max(1, p - 1))} className="px-3 py-1.5 rounded-lg bg-surface-muted hover:bg-border disabled:opacity-40 disabled:cursor-not-allowed font-semibold text-xs flex items-center gap-1">
                    <ChevronLeft className="w-3.5 h-3.5" /> Prev
                  </button>
                  {Array.from({ length: totalTeacherPages }, (_, i) => i + 1).map((p) => (
                    <button key={p} onClick={() => setTeachersPage(p)} className={`w-8 h-8 rounded-lg text-xs font-semibold transition-all ${safeTeacherPage === p ? 'bg-brand text-white' : 'bg-surface-muted text-ink-muted hover:text-ink'}`}>{p}</button>
                  ))}
                  <button disabled={safeTeacherPage === totalTeacherPages} onClick={() => setTeachersPage((p) => Math.min(totalTeacherPages, p + 1))} className="px-3 py-1.5 rounded-lg bg-surface-muted hover:bg-border disabled:opacity-40 disabled:cursor-not-allowed font-semibold text-xs flex items-center gap-1">
                    Next <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            )}
          </div>
        );
      })()}

      {/* Staff Roster Tab */}
      {activeTab === 'staff' && (
        staff.length === 0 ? (
          <Card>
            <EmptyState
              icon={Briefcase}
              title="No support staff registered yet"
              description="Register librarians, lab assistants, and administrative staff to track them here."
              action={isPrincipalOrAdmin ? <Button onClick={() => setShowAddStaffModal(true)}><Plus className="w-4 h-4" /> Register first staff member</Button> : undefined}
            />
          </Card>
        ) : (
          <Card padded={false}>
            <Table>
              <THead>
                <tr>
                  <TH>Employee ID</TH>
                  <TH>Full name</TH>
                  <TH>Role</TH>
                  <TH>Department</TH>
                  <TH className="text-right">Status</TH>
                </tr>
              </THead>
              <TBody>
                {staff.map((st) => {
                  const user = users.find((u) => u.id === st.userId);
                  return (
                    <TR key={st.id}>
                      <TD className="font-mono-data font-semibold">{st.employeeNo}</TD>
                      <TD className="font-semibold text-ink">{user?.fullName}</TD>
                      <TD className="text-ink-muted">{st.roleDescription}</TD>
                      <TD className="text-ink-muted">{st.department}</TD>
                      <TD className="text-right"><Badge tone="success">Active</Badge></TD>
                    </TR>
                  );
                })}
              </TBody>
            </Table>
          </Card>
        )
      )}

      {/* Leave Requests Tab */}
      {activeTab === 'leave' && (
        <div className="space-y-6">
          {/* Stat Summary Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card className="bg-surface border-border p-4">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-ink-muted uppercase tracking-wider">Total Leave Requests</span>
                <div className="p-2 bg-brand-tint text-brand rounded-lg">
                  <FileText className="w-5 h-5" />
                </div>
              </div>
              <div className="mt-2 flex items-baseline gap-2">
                <span className="text-2xl font-bold font-mono-data text-ink">{totalLeaveCount}</span>
                <span className="text-xs text-ink-muted">applications</span>
              </div>
              <p className="text-xs text-ink-faint mt-1">
                {selectedApplicant === 'all' ? 'All faculty & staff applications' : `Filtered for ${selectedApplicant}`}
              </p>
            </Card>

            <Card className="bg-surface border-border p-4">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-ink-muted uppercase tracking-wider">Approved Leaves</span>
                <div className="p-2 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 rounded-lg">
                  <CheckCircle className="w-5 h-5" />
                </div>
              </div>
              <div className="mt-2 flex items-baseline gap-2">
                <span className="text-2xl font-bold font-mono-data text-emerald-600 dark:text-emerald-400">{approvedLeaveCount}</span>
                <span className="text-xs font-medium text-emerald-600 dark:text-emerald-400">({totalApprovedDays} {totalApprovedDays === 1 ? 'day' : 'days'})</span>
              </div>
              <p className="text-xs text-ink-faint mt-1">Total approved days granted</p>
            </Card>

            <Card className="bg-surface border-border p-4">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-ink-muted uppercase tracking-wider">Pending Approval</span>
                <div className="p-2 bg-amber-500/10 text-amber-600 dark:text-amber-400 rounded-lg">
                  <Clock className="w-5 h-5" />
                </div>
              </div>
              <div className="mt-2 flex items-baseline gap-2">
                <span className="text-2xl font-bold font-mono-data text-amber-600 dark:text-amber-400">{pendingLeaveCount}</span>
                <span className="text-xs font-medium text-amber-600 dark:text-amber-400">({totalPendingDays} {totalPendingDays === 1 ? 'day' : 'days'})</span>
              </div>
              <p className="text-xs text-ink-faint mt-1">Awaiting principal sign-off</p>
            </Card>

            <Card className="bg-surface border-border p-4">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-ink-muted uppercase tracking-wider">Rejected Leaves</span>
                <div className="p-2 bg-rose-500/10 text-rose-600 dark:text-rose-400 rounded-lg">
                  <XCircle className="w-5 h-5" />
                </div>
              </div>
              <div className="mt-2 flex items-baseline gap-2">
                <span className="text-2xl font-bold font-mono-data text-rose-600 dark:text-rose-400">{rejectedLeaveCount}</span>
                <span className="text-xs font-medium text-rose-600 dark:text-rose-400">({totalRejectedDays} {totalRejectedDays === 1 ? 'day' : 'days'})</span>
              </div>
              <p className="text-xs text-ink-faint mt-1">Declined applications</p>
            </Card>
          </div>

          {/* Dynamic Applicant Leave Breakdown Banner (when specific teacher/staff is selected) */}
          {selectedApplicant !== 'all' && (() => {
            const sickDays = approvedRequests.filter((l) => l.type === 'Sick Leave').reduce((s, l) => s + calculateLeaveDays(l.startDate, l.endDate), 0);
            const casualDays = approvedRequests.filter((l) => l.type === 'Casual Leave').reduce((s, l) => s + calculateLeaveDays(l.startDate, l.endDate), 0);
            const dutyDays = approvedRequests.filter((l) => l.type === 'Duty Leave').reduce((s, l) => s + calculateLeaveDays(l.startDate, l.endDate), 0);

            return (
              <Card className="bg-brand-tint/30 border border-brand/20 p-5 rounded-2xl">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-full bg-brand text-white flex items-center justify-center font-bold text-lg shadow-sm">
                      {selectedApplicant.substring(0, 2).toUpperCase()}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="text-base font-bold text-ink">{selectedApplicant}</h3>
                        <Badge tone="brand">Faculty Leave Summary</Badge>
                      </div>
                      <p className="text-xs text-ink-muted mt-0.5">
                        Total approved leave taken: <strong className="text-brand font-mono-data">{totalApprovedDays} days</strong> across <strong className="text-ink font-mono-data">{approvedLeaveCount} approved requests</strong>.
                      </p>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-3">
                    <div className="bg-surface px-3 py-2 rounded-xl border border-border text-center min-w-[95px]">
                      <span className="text-[11px] text-ink-muted block font-medium">Sick Leave</span>
                      <span className="text-sm font-bold font-mono-data text-ink">{sickDays} days</span>
                    </div>
                    <div className="bg-surface px-3 py-2 rounded-xl border border-border text-center min-w-[95px]">
                      <span className="text-[11px] text-ink-muted block font-medium">Casual Leave</span>
                      <span className="text-sm font-bold font-mono-data text-ink">{casualDays} days</span>
                    </div>
                    <div className="bg-surface px-3 py-2 rounded-xl border border-border text-center min-w-[95px]">
                      <span className="text-[11px] text-ink-muted block font-medium">Duty Leave</span>
                      <span className="text-sm font-bold font-mono-data text-ink">{dutyDays} days</span>
                    </div>
                    <button
                      onClick={() => setSelectedApplicant('all')}
                      className="text-xs text-brand font-semibold hover:underline ml-2"
                    >
                      Clear Selection
                    </button>
                  </div>
                </div>
              </Card>
            );
          })()}

          {/* Controls & Filter Bar */}
          <div className="p-4 bg-surface rounded-xl border border-border space-y-3">
            <div className="flex flex-col md:flex-row items-stretch md:items-center gap-3">
              {/* Applicant Name Filter */}
              {isPrincipalOrAdmin && (
                <div className="w-full md:w-64">
                  <label className="text-xs font-semibold text-ink-muted block mb-1">Filter by Teacher / Staff</label>
                  <CustomSelect
                    value={selectedApplicant}
                    onChange={(val) => setSelectedApplicant(val)}
                    options={[
                      { value: 'all', label: 'All Teachers & Staff' },
                      ...allApplicantNames.map((name) => ({ value: name, label: name })),
                    ]}
                  />
                </div>
              )}

              {/* Leave Category Filter */}
              <div className="w-full md:w-44">
                <label className="text-xs font-semibold text-ink-muted block mb-1">Leave Category</label>
                <Select value={leaveTypeFilter} onChange={(e) => setLeaveTypeFilter(e.target.value)}>
                  <option value="all">All Categories</option>
                  <option value="Sick Leave">Sick Leave</option>
                  <option value="Casual Leave">Casual Leave</option>
                  <option value="Duty Leave">Duty Leave</option>
                </Select>
              </div>

              {/* Status Filter */}
              <div className="w-full md:w-40">
                <label className="text-xs font-semibold text-ink-muted block mb-1">Approval Status</label>
                <Select value={leaveStatusFilter} onChange={(e) => setLeaveStatusFilter(e.target.value)}>
                  <option value="all">All Statuses</option>
                  <option value="approved">Approved</option>
                  <option value="pending">Pending</option>
                  <option value="rejected">Rejected</option>
                </Select>
              </div>

              {/* Search Box */}
              <div className="w-full md:flex-1">
                <label className="text-xs font-semibold text-ink-muted block mb-1">Search Applications</label>
                <div className="relative">
                  <Search className="w-4 h-4 text-ink-faint absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={leaveSearch}
                    onChange={(e) => setLeaveSearch(e.target.value)}
                    placeholder="Search applicant name, role, ID..."
                    className="w-full pl-9 pr-3 py-2 text-sm bg-surface rounded-lg border border-border text-ink focus:outline-none focus:ring-2 focus:ring-brand/30"
                  />
                </div>
              </div>

              {(selectedApplicant !== 'all' || leaveStatusFilter !== 'all' || leaveTypeFilter !== 'all' || leaveSearch !== '') && (
                <div className="self-end pb-1">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setSelectedApplicant('all');
                      setLeaveStatusFilter('all');
                      setLeaveTypeFilter('all');
                      setLeaveSearch('');
                    }}
                  >
                    Reset
                  </Button>
                </div>
              )}
            </div>
          </div>

          {/* Table displaying filtered leave requests */}
          {filteredLeaveRequests.length === 0 ? (
            <Card>
              <EmptyState
                icon={FileText}
                title="No leave requests found"
                description="No leave records matched your selected filters or search query."
                action={
                  <Button
                    variant="secondary"
                    onClick={() => {
                      setSelectedApplicant('all');
                      setLeaveStatusFilter('all');
                      setLeaveTypeFilter('all');
                      setLeaveSearch('');
                    }}
                  >
                    Clear all filters
                  </Button>
                }
              />
            </Card>
          ) : (
            <Card padded={false}>
              <Table>
                <THead>
                  <tr>
                    <TH>Request ID</TH>
                    <TH>Applicant</TH>
                    <TH>Role</TH>
                    <TH>Leave type</TH>
                    <TH>Dates & Duration</TH>
                    <TH>Status</TH>
                    <TH className="text-right">Action</TH>
                  </tr>
                </THead>
                <TBody>
                  {filteredLeaveRequests.map((l) => {
                    const days = calculateLeaveDays(l.startDate, l.endDate);
                    return (
                      <TR key={l.id} className="hover:bg-surface-muted/50 transition-colors">
                        <TD className="font-mono-data font-semibold">{l.id}</TD>
                        <TD className="font-semibold text-ink">
                          <button
                            onClick={() => setSelectedApplicant(l.applicantName)}
                            className="hover:text-brand hover:underline text-left"
                            title="Filter leave history for this applicant"
                          >
                            {l.applicantName}
                          </button>
                        </TD>
                        <TD className="text-ink-muted text-xs">{l.role}</TD>
                        <TD className="font-semibold text-ink">
                          <span className="inline-flex items-center gap-1.5">
                            <span className="w-2 h-2 rounded-full bg-brand"></span>
                            {l.type}
                          </span>
                        </TD>
                        <TD className="font-mono-data text-ink-muted text-xs">
                          <div>{l.startDate} to {l.endDate}</div>
                          <div className="font-sans text-[11px] text-ink-faint font-semibold mt-0.5">
                            {days} {days === 1 ? 'day' : 'days'}
                          </div>
                        </TD>
                        <TD><Badge tone={leaveStatusTone(l.status)}>{l.status}</Badge></TD>
                        <TD className="text-right">
                          <div className="flex gap-1.5 justify-end items-center">
                            <button
                              onClick={() => setViewingDossier(l)}
                              className="p-1.5 text-ink-muted hover:text-ink hover:bg-surface-muted rounded-lg transition-colors"
                              title="View full leave dossier"
                            >
                              <Eye className="w-3.5 h-3.5" />
                            </button>
                            {l.status === 'pending' && isPrincipalOrAdmin && (
                              <>
                                <Button size="sm" variant="success" onClick={() => approveLeaveRequest(l.id, 'approved')}>
                                  <CheckCircle className="w-3.5 h-3.5" /> Approve
                                </Button>
                                <Button size="sm" variant="danger" onClick={() => approveLeaveRequest(l.id, 'rejected')}>
                                  <XCircle className="w-3.5 h-3.5" /> Reject
                                </Button>
                              </>
                            )}
                          </div>
                        </TD>
                      </TR>
                    );
                  })}
                </TBody>
              </Table>
            </Card>
          )}
        </div>
      )}

      {/* REGISTER NEW TEACHER MODAL */}
      <Modal
        open={showAddTeacherModal}
        onClose={() => setShowAddTeacherModal(false)}
        title="Register new teacher"
        eyebrow="Principal faculty registration"
        size="lg"
        footer={
          <>
            <Button variant="secondary" onClick={() => setShowAddTeacherModal(false)}>Cancel</Button>
            <Button type="submit" form="add-teacher-form">Register teacher</Button>
          </>
        }
      >
        <form id="add-teacher-form" onSubmit={handleAddTeacherSubmit} className="space-y-4">
          <FormField label="Full teacher name" required>
            <Input type="text" value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder="e.g. Sunil Perera" required />
          </FormField>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <FormField label="School email" required>
              <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="e.g. jane.doe@school.edu" required />
            </FormField>
            <FormField label="Contact phone">
              <Input type="text" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+94 77 111 2233" />
            </FormField>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <FormField label="Qualification">
              <Input type="text" value={qualification} onChange={(e) => setQualification(e.target.value)} placeholder="B.Sc (Hons) Education" />
            </FormField>
            <FormField label="Subject specialization">
              <CustomSelect
                value={subjectSpecialization}
                onChange={(val: string) => setSubjectSpecialization(val)}
                options={['Mathematics', 'Science', 'English', 'Tamil', 'Sinhala', 'Islam', 'History', 'Information Technology (IT)', 'Physical Science', 'Geography', 'Civics'].map((s) => ({ value: s, label: s }))}
              />
            </FormField>
          </div>
        </form>
      </Modal>

      {/* REGISTER NEW STAFF MODAL */}
      <Modal
        open={showAddStaffModal}
        onClose={() => setShowAddStaffModal(false)}
        title="Register new staff member"
        eyebrow="Administrative support"
        size="lg"
        footer={
          <>
            <Button variant="secondary" onClick={() => setShowAddStaffModal(false)}>Cancel</Button>
            <Button type="submit" form="add-staff-form">Register staff member</Button>
          </>
        }
      >
        <form id="add-staff-form" onSubmit={handleAddStaffSubmit} className="space-y-4">
          <FormField label="Full name" required>
            <Input type="text" value={staffFullName} onChange={(e) => setStaffFullName(e.target.value)} placeholder="e.g. Nalini Ratnayake" required />
          </FormField>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <FormField label="Email" required>
              <Input type="email" value={staffEmail} onChange={(e) => setStaffEmail(e.target.value)} placeholder="e.g. staff@school.edu" required />
            </FormField>
            <FormField label="Contact phone">
              <Input type="text" value={staffPhone} onChange={(e) => setStaffPhone(e.target.value)} placeholder="+94 77 111 2233" />
            </FormField>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <FormField label="Role description" required>
              <Input type="text" value={staffRoleDescription} onChange={(e) => setStaffRoleDescription(e.target.value)} placeholder="e.g. Librarian, Lab Assistant" required />
            </FormField>
            <FormField label="Department">
              <CustomSelect
                value={staffDepartment}
                onChange={(val: string) => setStaffDepartment(val)}
                options={['Administration', 'Library', 'Laboratory', 'Facilities', 'Finance', 'Health & Welfare'].map((d) => ({ value: d, label: d }))}
              />
            </FormField>
          </div>
        </form>
      </Modal>

      {/* APPLY FOR LEAVE MODAL */}
      <Modal
        open={showLeaveModal}
        onClose={() => setShowLeaveModal(false)}
        title="Submit leave application"
        size="lg"
        footer={
          <>
            <Button variant="secondary" onClick={() => setShowLeaveModal(false)}>Cancel</Button>
            <Button type="submit" form="apply-leave-form">Submit application</Button>
          </>
        }
      >
        <form
          id="apply-leave-form"
          onSubmit={(e) => {
            e.preventDefault();
            addLeaveRequest({
              applicantName: leaveApplicantName,
              role: leaveRoleName,
              type: leaveTypeVal,
              startDate: leaveStart,
              endDate: leaveEnd,
              reason: leaveReasonTxt || 'Standard leave application',
            });
            setShowLeaveModal(false);
            setLeaveReasonTxt('');
          }}
          className="space-y-3.5"
        >
          <FormField label="Your name" required>
            <Input type="text" value={leaveApplicantName} onChange={(e) => setLeaveApplicantName(e.target.value)} required />
          </FormField>
          <FormField label="Designation / subject role">
            <Input type="text" value={leaveRoleName} onChange={(e) => setLeaveRoleName(e.target.value)} />
          </FormField>
          <FormField label="Leave category">
            <Select value={leaveTypeVal} onChange={(e) => setLeaveTypeVal(e.target.value as any)}>
              <option value="Sick Leave">Sick Leave</option>
              <option value="Casual Leave">Casual Leave</option>
              <option value="Duty Leave">Duty Leave</option>
            </Select>
          </FormField>
          <div className="grid grid-cols-2 gap-3">
            <FormField label="Start date">
              <DatePicker value={leaveStart} onChange={setLeaveStart} required />
            </FormField>
            <FormField label="End date">
              <DatePicker value={leaveEnd} onChange={setLeaveEnd} required />
            </FormField>
          </div>
          <FormField label="Reason / details">
            <Textarea rows={2} value={leaveReasonTxt} onChange={(e) => setLeaveReasonTxt(e.target.value)} placeholder="Enter reason for leave application..." />
          </FormField>
        </form>
      </Modal>

      {/* FULL LEAVE DOSSIER MODAL */}
      <Modal
        open={Boolean(viewingDossier)}
        onClose={() => setViewingDossier(null)}
        eyebrow={schoolProfile?.schoolName || 'Your School'}
        title={viewingDossier ? `Official faculty leave dossier #${viewingDossier.id}` : ''}
        size="lg"
        footer={
          viewingDossier && (
            <>
              <Button variant="secondary" onClick={() => setViewingDossier(null)}>Close dossier</Button>
              {viewingDossier.status === 'pending' && isPrincipalOrAdmin && (
                <>
                  <Button variant="danger" onClick={() => { approveLeaveRequest(viewingDossier.id, 'rejected'); setViewingDossier(null); }}>
                    <XCircle className="w-3.5 h-3.5" /> Decline request
                  </Button>
                  <Button variant="success" onClick={() => { approveLeaveRequest(viewingDossier.id, 'approved'); setViewingDossier(null); }}>
                    <CheckCircle className="w-3.5 h-3.5" /> Sign & grant approval
                  </Button>
                </>
              )}
            </>
          )
        }
      >
        {viewingDossier && (
          <>
            <div className="p-3.5 bg-surface-muted rounded-xl space-y-2">
              <div className="flex justify-between items-center border-b border-border pb-2">
                <div className="font-display font-semibold text-sm text-ink">{viewingDossier.applicantName}</div>
                <Badge tone={leaveStatusTone(viewingDossier.status)}>{viewingDossier.status}</Badge>
              </div>
              <div className="text-sm">
                <span className="text-ink-faint block text-xs uppercase">Designation / role</span>
                <span className="font-semibold text-ink">{viewingDossier.role}</span>
              </div>
            </div>

            <div className="space-y-2 border border-border rounded-xl p-3.5">
              <h4 className="font-semibold text-xs uppercase text-ink border-b border-border pb-1.5 flex items-center gap-1">
                <FileText className="w-3.5 h-3.5 text-brand" /> Application specifications
              </h4>
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div><span className="text-ink-faint block text-xs uppercase">Leave category</span><span className="font-semibold text-ink">{viewingDossier.type}</span></div>
                <div><span className="text-ink-faint block text-xs uppercase">Date duration</span><span className="font-semibold text-ink">{viewingDossier.startDate} to {viewingDossier.endDate}</span></div>
              </div>
              <div className="pt-2 border-t border-border">
                <span className="text-ink-faint block text-xs uppercase font-semibold mb-1">Reason / details</span>
                <div className="p-2.5 bg-surface-muted rounded-lg text-ink text-sm leading-relaxed italic">"{viewingDossier.reason}"</div>
              </div>
            </div>
          </>
        )}
      </Modal>

      {/* EDIT TEACHER MODAL */}
      <Modal
        open={showEditTeacherModal}
        onClose={() => setShowEditTeacherModal(false)}
        title="Edit teacher details"
        eyebrow="Principal faculty management"
        size="lg"
        footer={
          <>
            <Button variant="secondary" onClick={() => setShowEditTeacherModal(false)}>Cancel</Button>
            <Button type="submit" form="edit-teacher-form">Save changes</Button>
          </>
        }
      >
        <form id="edit-teacher-form" onSubmit={handleEditTeacherSubmit} className="space-y-4">
          <FormField label="Full teacher name" required>
            <Input type="text" value={editFullName} onChange={(e) => setEditFullName(e.target.value)} required />
          </FormField>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <FormField label="School email" required>
              <Input type="email" value={editEmail} onChange={(e) => setEditEmail(e.target.value)} required />
            </FormField>
            <FormField label="Contact phone">
              <Input type="text" value={editPhone} onChange={(e) => setEditPhone(e.target.value)} />
            </FormField>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <FormField label="Qualification">
              <Input type="text" value={editQualification} onChange={(e) => setEditQualification(e.target.value)} />
            </FormField>
            <FormField label="Subject specialization">
              <CustomSelect
                value={editSubjectSpecialization}
                onChange={(val: string) => setEditSubjectSpecialization(val)}
                options={['Mathematics', 'Science', 'English', 'Tamil', 'Sinhala', 'Islam', 'History', 'Information Technology (IT)', 'Physical Science', 'Geography', 'Civics'].map((s) => ({ value: s, label: s }))}
              />
            </FormField>
          </div>
        </form>
      </Modal>
    </div>
  );
};
