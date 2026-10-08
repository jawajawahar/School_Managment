import React, { useState } from 'react';
import {
  ShieldCheck,
  Users,
  UserX,
  UserCheck as UserCheckIcon,
  History,
  Search,
  UserPlus,
  Key,
  Copy,
  CheckCircle2,
  GraduationCap,
  Briefcase,
  Eye,
  EyeOff,
  RefreshCw,
  Building,
  Sparkles,
  AlertTriangle,
  Trash2,
} from 'lucide-react';
import { useData } from '../../context/DataContext';
import { UserRole, AuditLog, User } from '../../types';
import { getCategorizedSubjectOptions } from '../../services/academicRules';
import { PageHeader } from '../ui/PageHeader';
import { Badge, BadgeTone } from '../ui/Badge';
import { Button } from '../ui/Button';
import { Card } from '../ui/Card';
import { Modal } from '../ui/Modal';
import { FormField, Input } from '../ui/FormField';
import { EmptyState } from '../ui/EmptyState';
import { Table, THead, TH, TBody, TR, TD } from '../ui/Table';
import { Pagination } from '../ui/Pagination';
import { CustomSelect } from '../common/CustomSelect';

const PAGE_SIZE = 15;

const ROLE_LABELS: Record<UserRole, string> = {
  principal: 'Principal',
  vice_principal: 'Vice Principal',
  admin: 'Admin',
  teacher: 'Teacher / Class Teacher',
  staff: 'Supporting Staff',
  librarian: 'Librarian (Library Staff)',
  lab_assistant: 'Lab Assistant (Science & IT)',
  student: 'Student',
  parent: 'Parent',
  education_officer: 'Education Officer',
};

const SUPPORTING_ROLES = [
  { value: 'staff', label: 'Supporting Staff / Office Admin' },
  { value: 'librarian', label: 'Librarian (Library & Learning Resources)' },
  { value: 'lab_assistant', label: 'Lab Assistant (Science & IT Labs)' },
  { value: 'education_officer', label: 'Zonal Education Inspector' },
];

const DEPARTMENTS = [
  'General School Administration',
  'Library & Learning Resources',
  'Science & Computer Laboratories',
  'Student Welfare & Health Services',
  'Finance & Accounting',
  'Sports & Extracurricular Facilities',
  'Maintenance & Logistics',
];

const actionTone = (action: AuditLog['action']): BadgeTone =>
  action === 'CREATE' ? 'success' : action === 'DELETE' ? 'danger' : action === 'APPROVE' ? 'brand' : action === 'LOGIN' ? 'neutral' : 'warning';

export const UserManagementModule: React.FC = () => {
  const {
    users,
    teachers,
    staff,
    classes,
    subjects,
    auditLogs,
    currentUser,
    activeRole,
    updateUser,
    provisionUser,
    purgeMockDataAndStartRealMode,
  } = useData();

  const [activeTab, setActiveTab] = useState<'accounts' | 'audit'>('accounts');
  const isPrincipalOrAdmin = ['principal', 'vice_principal', 'admin'].includes(activeRole);
  const isPrincipal = activeRole === 'principal';

  const [showResetModal, setShowResetModal] = useState(false);
  const [resetConfirmText, setResetConfirmText] = useState('');
  const [resetInProgress, setResetInProgress] = useState(false);
  const RESET_PHRASE = 'DELETE EVERYTHING';

  const handleConfirmReset = async () => {
    if (resetConfirmText !== RESET_PHRASE) return;
    setResetInProgress(true);
    try {
      await purgeMockDataAndStartRealMode();
    } finally {
      setResetInProgress(false);
      setShowResetModal(false);
      setResetConfirmText('');
    }
  };

  // Accounts List state
  const [userSearch, setUserSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<'all' | 'teacher' | 'staff' | 'leadership'>('all');
  const [roleFilter, setRoleFilter] = useState<'all' | UserRole>('all');
  const [accountsPage, setAccountsPage] = useState(1);

  // Audit Logs state
  const [auditSearch, setAuditSearch] = useState('');
  const [auditPage, setAuditPage] = useState(1);

  // Provisioning Modal State
  const [showProvisionModal, setShowProvisionModal] = useState(false);
  const [provisionCategory, setProvisionCategory] = useState<'teacher' | 'staff'>('teacher');
  const [showPassword, setShowPassword] = useState(false);
  const [copiedNotice, setCopiedNotice] = useState(false);

  // Form State
  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    password: 'GSMS@' + Math.floor(1000 + Math.random() * 9000),
    phone: '+94 77 ',
    employeeNo: `EMP-2026-${Math.floor(100 + Math.random() * 900)}`,
    // Teacher specific
    qualification: 'B.Sc (Hons) Education',
    subjectSpecialization: 'Mathematics',
    classId: '',
    // Staff specific
    role: 'staff' as UserRole,
    department: 'General School Administration',
    roleDescription: 'Administrative Officer',
  });

  // Provisioned Result Handover Card Modal State
  const [provisionedCredentials, setProvisionedCredentials] = useState<{
    user: User;
    password: string;
    categoryLabel: string;
    details: string;
  } | null>(null);

  // View / Reset Password Modal State
  const [selectedUserForCredentials, setSelectedUserForCredentials] = useState<User | null>(null);
  const [resetPasswordVal, setResetPasswordVal] = useState('');
  const [passwordResetSuccess, setPasswordResetSuccess] = useState(false);

  const handleGeneratePassword = () => {
    setFormData((prev) => ({
      ...prev,
      password: 'GSMS@' + Math.floor(1000 + Math.random() * 9000),
    }));
  };

  const handleNameChange = (name: string) => {
    const suggestedEmail = name.toLowerCase().trim().replace(/\s+/g, '.') + '@school.edu';
    setFormData((prev) => ({
      ...prev,
      fullName: name,
      email: prev.email ? prev.email : suggestedEmail,
    }));
  };

  const handleProvisionSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.fullName || !formData.email || !formData.password) {
      alert('Please fill in all required user fields (Name, Email, Password).');
      return;
    }

    const payloadRole: UserRole = provisionCategory === 'teacher' ? 'teacher' : formData.role;

    const result = provisionUser({
      category: provisionCategory,
      fullName: formData.fullName,
      email: formData.email,
      password: formData.password,
      phone: formData.phone,
      role: payloadRole,
      employeeNo: formData.employeeNo,
      qualification: formData.qualification,
      subjectSpecialization: formData.subjectSpecialization,
      classId: formData.classId,
      department: formData.department,
      roleDescription: formData.roleDescription,
    });

    const assignedClassObj = classes.find((c) => c.id === formData.classId);
    const categoryLabel = provisionCategory === 'teacher'
      ? (assignedClassObj ? `Class Teacher (${assignedClassObj.grade} ${assignedClassObj.section})` : `Academic Specialist Teacher (${formData.subjectSpecialization})`)
      : `Supporting Staff (${formData.department})`;

    const detailText = provisionCategory === 'teacher'
      ? `Specialization: ${formData.subjectSpecialization} · Qualification: ${formData.qualification}${assignedClassObj ? ` · Class Teacher: ${assignedClassObj.grade} (${assignedClassObj.section})` : ''}`
      : `Department: ${formData.department} · Designation: ${formData.roleDescription}`;

    setProvisionedCredentials({
      user: result.user,
      password: result.password,
      categoryLabel,
      details: detailText,
    });

    setShowProvisionModal(false);
    // Reset form
    setFormData({
      fullName: '',
      email: '',
      password: 'GSMS@' + Math.floor(1000 + Math.random() * 9000),
      phone: '+94 77 ',
      employeeNo: `EMP-2026-${Math.floor(100 + Math.random() * 900)}`,
      qualification: 'B.Sc (Hons) Education',
      subjectSpecialization: 'Mathematics',
      classId: '',
      role: 'staff',
      department: 'General School Administration',
      roleDescription: 'Administrative Officer',
    });
  };

  const handleCopyCredentials = (email: string, pass: string) => {
    const text = `GSMS User Credentials:\nName: ${provisionedCredentials?.user.fullName}\nEmail: ${email}\nPassword: ${pass}\nPortal: http://localhost:3000/`;
    navigator.clipboard.writeText(text);
    setCopiedNotice(true);
    setTimeout(() => setCopiedNotice(false), 3000);
  };

  const handleResetPasswordSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUserForCredentials || !resetPasswordVal.trim()) return;
    const newPassword = resetPasswordVal.trim();
    const updatedUser: User = {
      ...selectedUserForCredentials,
      password: newPassword,
      updatedAt: new Date().toISOString(),
    };
    updateUser(updatedUser);
    setSelectedUserForCredentials(updatedUser);
    setPasswordResetSuccess(true);
    setResetPasswordVal('');

    setTimeout(() => {
      setPasswordResetSuccess(false);
    }, 3000);
  };

  // Filter Accounts
  const filteredUsers = users.filter((u) => {
    const matchesSearch = `${u.fullName} ${u.email} ${u.role}`.toLowerCase().includes(userSearch.toLowerCase());
    const matchesRole = roleFilter === 'all' || u.role === roleFilter;

    let matchesCategory = true;
    if (categoryFilter === 'teacher') {
      matchesCategory = u.role === 'teacher';
    } else if (categoryFilter === 'staff') {
      matchesCategory = ['staff', 'librarian', 'lab_assistant', 'education_officer'].includes(u.role);
    } else if (categoryFilter === 'leadership') {
      matchesCategory = ['principal', 'vice_principal', 'admin'].includes(u.role);
    }

    return matchesSearch && matchesRole && matchesCategory;
  });

  const accountsTotalPages = Math.max(1, Math.ceil(filteredUsers.length / PAGE_SIZE));
  const accountsSafePage = Math.min(accountsPage, accountsTotalPages);
  const paginatedUsers = filteredUsers.slice((accountsSafePage - 1) * PAGE_SIZE, accountsSafePage * PAGE_SIZE);

  // Filter Audit Logs
  const filteredAuditLogs = auditLogs.filter((log) => {
    const term = auditSearch.toLowerCase();
    return !term || `${log.actorName} ${log.entity} ${log.details}`.toLowerCase().includes(term);
  });

  const auditTotalPages = Math.max(1, Math.ceil(filteredAuditLogs.length / PAGE_SIZE));
  const auditSafePage = Math.min(auditPage, auditTotalPages);
  const paginatedAuditLogs = filteredAuditLogs.slice((auditSafePage - 1) * PAGE_SIZE, auditSafePage * PAGE_SIZE);

  const activeCount = users.filter((u) => u.isActive).length;
  const teacherAccountsCount = users.filter((u) => u.role === 'teacher').length;
  const staffAccountsCount = users.filter((u) => ['staff', 'librarian', 'lab_assistant', 'education_officer'].includes(u.role)).length;

  const handleToggleActive = (user: User) => {
    const action = user.isActive ? 'deactivate' : 'reactivate';
    if (window.confirm(`${action === 'deactivate' ? 'Deactivate' : 'Reactivate'} the account for ${user.fullName}?`)) {
      updateUser({ ...user, isActive: !user.isActive, updatedAt: new Date().toISOString() });
    }
  };

  const getTeacherAssignmentDetails = (userId: string) => {
    const tch = teachers.find((t) => t.userId === userId);
    if (!tch) return null;
    const cls = classes.find((c) => c.classTeacherId === tch.id || c.classTeacherId === tch.userId || c.classTeacherId === tch.employeeNo);
    return { tch, cls };
  };

  const getStaffDepartmentDetails = (userId: string) => {
    const stf = staff.find((s) => s.userId === userId);
    return stf;
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <PageHeader
        eyebrow={<Badge tone="brand">Principal User Access & Governance</Badge>}
        title="User accounts & access privileges"
        description="Provision staff credentials, assign role privileges, and inspect security audit logs."
        actions={
          <div className="flex items-center gap-3">
            <div className="inline-flex items-center gap-1 p-1 bg-surface-muted border border-border rounded-xl">
              <button
                onClick={() => setActiveTab('accounts')}
                className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all ${
                  activeTab === 'accounts' ? 'bg-surface text-ink shadow-xs' : 'text-ink-muted hover:text-ink'
                }`}
              >
                <Users className="w-3.5 h-3.5" /> Accounts ({users.length})
              </button>
              <button
                onClick={() => setActiveTab('audit')}
                className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all ${
                  activeTab === 'audit' ? 'bg-surface text-ink shadow-xs' : 'text-ink-muted hover:text-ink'
                }`}
              >
                <History className="w-3.5 h-3.5" /> Audit log ({auditLogs.length})
              </button>
            </div>
            {isPrincipalOrAdmin && (
              <Button onClick={() => setShowProvisionModal(true)}>
                <UserPlus className="w-4 h-4" /> Provision User Credentials
              </Button>
            )}
          </div>
        }
      />

      {activeTab === 'accounts' && (
        <div className="space-y-4">
          {/* Summary Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
            <Card>
              <div className="text-xs text-ink-muted uppercase font-semibold">Total Accounts</div>
              <div className="text-3xl font-semibold text-ink mt-1 font-mono-data">{users.length}</div>
            </Card>
            <Card>
              <div className="text-xs text-brand uppercase font-semibold">Academic & Class Teachers</div>
              <div className="text-3xl font-semibold text-brand mt-1 font-mono-data">{teacherAccountsCount}</div>
            </Card>
            <Card>
              <div className="text-xs text-warning uppercase font-semibold">Supporting & Tech Staff</div>
              <div className="text-3xl font-semibold text-warning mt-1 font-mono-data">{staffAccountsCount}</div>
            </Card>
            <Card>
              <div className="text-xs text-success uppercase font-semibold">Active Logins</div>
              <div className="text-3xl font-semibold text-success mt-1 font-mono-data">{activeCount}</div>
            </Card>
          </div>

          {/* Filter Bar */}
          <Card className="flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="flex items-center gap-2 flex-wrap w-full sm:w-auto">
              <span className="text-xs font-semibold text-ink-faint uppercase mr-1">Category:</span>
              <button
                onClick={() => { setCategoryFilter('all'); setAccountsPage(1); }}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                  categoryFilter === 'all' ? 'bg-brand text-white' : 'bg-surface-muted text-ink-muted hover:text-ink'
                }`}
              >
                All Accounts ({users.length})
              </button>
              <button
                onClick={() => { setCategoryFilter('teacher'); setAccountsPage(1); }}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all ${
                  categoryFilter === 'teacher' ? 'bg-brand text-white' : 'bg-surface-muted text-ink-muted hover:text-ink'
                }`}
              >
                <GraduationCap className="w-3.5 h-3.5" /> Class Teachers ({teacherAccountsCount})
              </button>
              <button
                onClick={() => { setCategoryFilter('staff'); setAccountsPage(1); }}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all ${
                  categoryFilter === 'staff' ? 'bg-brand text-white' : 'bg-surface-muted text-ink-muted hover:text-ink'
                }`}
              >
                <Briefcase className="w-3.5 h-3.5" /> Supporting Staff ({staffAccountsCount})
              </button>
            </div>

            <div className="flex items-center gap-3 w-full sm:w-auto justify-end">
              <div className="relative w-full sm:w-64">
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-ink-faint" />
                <input
                  type="text"
                  placeholder="Search name, email, or role..."
                  value={userSearch}
                  onChange={(e) => { setUserSearch(e.target.value); setAccountsPage(1); }}
                  className="w-full bg-surface-muted border border-border rounded-full pl-9 pr-4 py-2 text-sm text-ink focus:outline-none focus:border-brand"
                />
              </div>
              <CustomSelect
                value={roleFilter}
                onChange={(val) => { setRoleFilter(val as any); setAccountsPage(1); }}
                options={[
                  { value: 'all', label: 'All Specific Roles' },
                  ...Object.entries(ROLE_LABELS).map(([value, label]) => ({ value, label })),
                ]}
                className="w-48"
              />
            </div>
          </Card>

          {/* Accounts Table */}
          <Card padded={false}>
            {filteredUsers.length === 0 ? (
              <EmptyState icon={Users} title="No accounts match this filter" description="Try adjusting your search query or role filter." compact />
            ) : (
              <>
                <Table>
                  <THead>
                    <tr>
                      <TH>User & Login Email</TH>
                      <TH>Category & Privileges</TH>
                      <TH>Assignment / Department</TH>
                      <TH>Credentials</TH>
                      <TH>Status</TH>
                      {isPrincipalOrAdmin && <TH className="text-right">Actions</TH>}
                    </tr>
                  </THead>
                  <TBody>
                    {paginatedUsers.map((u) => {
                      const isSelf = u.id === currentUser?.id;
                      const tchDetails = getTeacherAssignmentDetails(u.id);
                      const stfDetails = getStaffDepartmentDetails(u.id);

                      const isTeacher = u.role === 'teacher';
                      const isStaff = ['staff', 'librarian', 'lab_assistant', 'education_officer'].includes(u.role);

                      return (
                        <TR key={u.id}>
                          <TD>
                            <div className="font-semibold text-ink flex items-center gap-1.5">
                              {u.fullName}
                              {isSelf && <span className="text-xs text-brand font-mono-data bg-brand-tint px-1.5 py-0.5 rounded">(You)</span>}
                            </div>
                            <div className="font-mono-data text-xs text-ink-muted">{u.email}</div>
                          </TD>
                          <TD>
                            <div className="flex items-center gap-1.5">
                              {isTeacher ? (
                                <Badge tone="brand"><GraduationCap className="w-3 h-3" /> Class Teacher</Badge>
                              ) : isStaff ? (
                                <Badge tone="warning"><Briefcase className="w-3 h-3" /> Supporting Staff</Badge>
                              ) : (
                                <Badge tone="neutral"><ShieldCheck className="w-3 h-3" /> Leadership</Badge>
                              )}
                              <span className="text-xs text-ink-faint font-medium">({ROLE_LABELS[u.role]})</span>
                            </div>
                          </TD>
                          <TD className="text-sm">
                            {tchDetails ? (
                              <div>
                                {tchDetails.cls ? (
                                  <span className="font-semibold text-success flex items-center gap-1">
                                    <Building className="w-3.5 h-3.5" /> Class Teacher: {tchDetails.cls.grade} ({tchDetails.cls.section})
                                  </span>
                                ) : (
                                  <span className="text-ink-muted">Specialist: {tchDetails.tch.subjectSpecialization}</span>
                                )}
                              </div>
                            ) : stfDetails ? (
                              <div>
                                <span className="font-semibold text-ink">{stfDetails.department}</span>
                                <div className="text-xs text-ink-faint">{stfDetails.roleDescription}</div>
                              </div>
                            ) : (
                              <span className="text-ink-faint">Administrative Officer</span>
                            )}
                          </TD>
                          <TD>
                            <div className="flex items-center gap-1.5">
                              <Badge tone={u.password ? 'success' : 'neutral'} className="text-[11px]">
                                <Key className="w-3 h-3" /> {u.password ? 'Custom Password' : 'SSO / Standard'}
                              </Badge>
                            </div>
                          </TD>
                          <TD>
                            <Badge tone={u.isActive ? 'success' : 'danger'}>
                              {u.isActive ? 'Active' : 'Deactivated'}
                            </Badge>
                          </TD>
                          {isPrincipalOrAdmin && (
                            <TD className="text-right">
                              <div className="flex items-center justify-end gap-1.5">
                                <Button
                                  size="sm"
                                  variant="secondary"
                                  onClick={() => setSelectedUserForCredentials(u)}
                                  title="View account credentials or reset password"
                                >
                                  <Key className="w-3.5 h-3.5" /> Credentials
                                </Button>

                                <Button
                                  size="sm"
                                  variant={u.isActive ? 'ghost' : 'secondary'}
                                  className={u.isActive ? 'text-danger hover:bg-danger-tint' : ''}
                                  disabled={isSelf}
                                  title={isSelf ? "You can't deactivate your own account" : undefined}
                                  onClick={() => handleToggleActive(u)}
                                >
                                  {u.isActive ? (
                                    <><UserX className="w-3.5 h-3.5" /> Deactivate</>
                                  ) : (
                                    <><UserCheckIcon className="w-3.5 h-3.5" /> Reactivate</>
                                  )}
                                </Button>
                              </div>
                            </TD>
                          )}
                        </TR>
                      );
                    })}
                  </TBody>
                </Table>
                <Pagination
                  page={accountsSafePage}
                  totalPages={accountsTotalPages}
                  onPageChange={setAccountsPage}
                  totalItems={filteredUsers.length}
                  itemLabel="user accounts"
                />
              </>
            )}
          </Card>

          {isPrincipal && (
            <Card className="border-danger/30">
              <div className="flex items-start justify-between gap-4 flex-wrap">
                <div className="flex items-start gap-3">
                  <div className="w-9 h-9 rounded-lg bg-danger-tint text-danger flex items-center justify-center shrink-0">
                    <AlertTriangle className="w-4.5 h-4.5" />
                  </div>
                  <div>
                    <div className="font-semibold text-sm text-ink">Danger zone — reset to an empty school</div>
                    <p className="text-sm text-ink-muted mt-0.5 max-w-xl">
                      Permanently deletes every student, teacher, staff member, class, timetable slot, exam mark,
                      attendance record, leave/admission request, inventory item, welfare enrolment, and announcement —
                      in both this browser and the backend database. Only the curriculum subject list, term exam
                      definitions, and your own principal login survive. Use this once, before real data entry begins —
                      never after the school has started using the system.
                    </p>
                  </div>
                </div>
                <Button variant="danger" onClick={() => setShowResetModal(true)}>
                  <Trash2 className="w-3.5 h-3.5" /> Reset to empty
                </Button>
              </div>
            </Card>
          )}
        </div>
      )}

      {/* DANGER ZONE: RESET TO EMPTY CONFIRMATION MODAL */}
      <Modal
        open={showResetModal}
        onClose={() => { setShowResetModal(false); setResetConfirmText(''); }}
        title="Reset to an empty school"
        footer={
          <>
            <Button variant="secondary" onClick={() => { setShowResetModal(false); setResetConfirmText(''); }}>Cancel</Button>
            <Button
              variant="danger"
              disabled={resetConfirmText !== RESET_PHRASE || resetInProgress}
              onClick={handleConfirmReset}
            >
              <Trash2 className="w-3.5 h-3.5" /> {resetInProgress ? 'Resetting…' : 'Permanently reset'}
            </Button>
          </>
        }
      >
        <div className="p-3 bg-danger-tint text-danger text-sm rounded-lg flex items-start gap-2">
          <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
          <span>This cannot be undone. Every student, teacher, staff, class, and activity record will be permanently deleted from this browser and the backend database.</span>
        </div>
        <FormField label={`Type "${RESET_PHRASE}" to confirm`}>
          <Input
            type="text"
            value={resetConfirmText}
            onChange={(e) => setResetConfirmText(e.target.value)}
            placeholder={RESET_PHRASE}
            autoFocus
          />
        </FormField>
      </Modal>

      {/* Audit Log Tab */}
      {activeTab === 'audit' && (
        <div className="space-y-4">
          <Card>
            <div className="relative w-full sm:w-80">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-ink-faint" />
              <input
                type="text"
                placeholder="Search actor, entity, or details..."
                value={auditSearch}
                onChange={(e) => { setAuditSearch(e.target.value); setAuditPage(1); }}
                className="w-full bg-surface-muted border border-border rounded-full pl-9 pr-4 py-2 text-sm text-ink focus:outline-none focus:border-brand"
              />
            </div>
          </Card>

          <Card padded={false}>
            {filteredAuditLogs.length === 0 ? (
              <EmptyState icon={ShieldCheck} title="No audit log entries match this search" compact />
            ) : (
              <>
                <Table>
                  <THead>
                    <tr>
                      <TH>Timestamp</TH>
                      <TH>Actor</TH>
                      <TH>Action</TH>
                      <TH>Entity</TH>
                      <TH>Details</TH>
                    </tr>
                  </THead>
                  <TBody>
                    {paginatedAuditLogs.map((log) => (
                      <TR key={log.id}>
                        <TD className="font-mono-data text-xs text-ink-muted whitespace-nowrap">
                          {new Date(log.timestamp).toLocaleString([], { dateStyle: 'short', timeStyle: 'medium' })}
                        </TD>
                        <TD className="font-semibold text-ink">{log.actorName}</TD>
                        <TD><Badge tone={actionTone(log.action)}>{log.action}</Badge></TD>
                        <TD className="font-mono-data text-xs font-semibold text-ink">{log.entity}</TD>
                        <TD className="text-ink-muted text-sm">{log.details}</TD>
                      </TR>
                    ))}
                  </TBody>
                </Table>
                <Pagination
                  page={auditSafePage}
                  totalPages={auditTotalPages}
                  onPageChange={setAuditPage}
                  totalItems={filteredAuditLogs.length}
                  itemLabel="log entries"
                />
              </>
            )}
          </Card>
        </div>
      )}

      {/* PROVISION USER ACCOUNT & CREDENTIALS MODAL */}
      <Modal
        open={showProvisionModal}
        onClose={() => setShowProvisionModal(false)}
        title="Provision User Account & Credentials"
        eyebrow="Principal User Governance"
        size="xl"
        footer={
          <>
            <Button variant="secondary" onClick={() => setShowProvisionModal(false)}>Cancel</Button>
            <Button type="submit" form="provision-user-form">
              <Sparkles className="w-4 h-4" /> Provision Credentials & Login
            </Button>
          </>
        }
      >
        <div className="space-y-5">
          {/* Category Tabs: Class Teachers vs Supporting Staff */}
          <div className="flex items-center p-1.5 bg-surface-muted border border-border rounded-xl">
            <button
              type="button"
              onClick={() => { setProvisionCategory('teacher'); setFormData((p) => ({ ...p, role: 'teacher' })); }}
              className={`flex-1 py-2.5 px-4 rounded-lg text-xs font-semibold flex items-center justify-center gap-2 transition-all ${
                provisionCategory === 'teacher'
                  ? 'bg-brand text-white shadow-xs'
                  : 'text-ink-muted hover:text-ink'
              }`}
            >
              <GraduationCap className="w-4 h-4 shrink-0" />
              <span>Class & Academic Teachers</span>
            </button>
            <button
              type="button"
              onClick={() => { setProvisionCategory('staff'); setFormData((p) => ({ ...p, role: 'staff' })); }}
              className={`flex-1 py-2.5 px-4 rounded-lg text-xs font-semibold flex items-center justify-center gap-2 transition-all ${
                provisionCategory === 'staff'
                  ? 'bg-brand text-white shadow-xs'
                  : 'text-ink-muted hover:text-ink'
              }`}
            >
              <Briefcase className="w-4 h-4 shrink-0" />
              <span>Supporting Staff & Operations</span>
            </button>
          </div>

          <form id="provision-user-form" onSubmit={handleProvisionSubmit} className="space-y-4">
            {/* Common User Info */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField label="Full Name" required>
                <Input
                  type="text"
                  placeholder="e.g. Malini Wickramasinghe"
                  value={formData.fullName}
                  onChange={(e) => handleNameChange(e.target.value)}
                  required
                />
              </FormField>

              <FormField label="Employee No." required>
                <Input
                  type="text"
                  value={formData.employeeNo}
                  onChange={(e) => setFormData({ ...formData, employeeNo: e.target.value })}
                  required
                />
              </FormField>
            </div>

            {/* Credentials Fields */}
            <div className="p-4 bg-brand-tint/60 border border-brand/20 rounded-xl space-y-3.5">
              <div className="flex items-center gap-2 text-xs font-semibold text-brand uppercase tracking-wide">
                <Key className="w-4 h-4" /> System Credentials Assignment
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField label="Login Email" required hint="Used by staff to log in to the portal">
                  <Input
                    type="email"
                    placeholder="user@school.edu"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    required
                  />
                </FormField>

                <FormField label="Assigned Password" required hint="Initial password for login">
                  <div className="relative flex items-center">
                    <Input
                      type={showPassword ? 'text' : 'password'}
                      value={formData.password}
                      onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                      required
                      className="pr-16"
                    />
                    <div className="absolute right-2 flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="p-1.5 text-ink-muted hover:text-ink rounded transition-colors"
                        title={showPassword ? 'Hide password' : 'Show password'}
                      >
                        {showPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                      </button>
                      <button
                        type="button"
                        onClick={handleGeneratePassword}
                        className="p-1.5 text-brand hover:text-brand-dark rounded transition-colors"
                        title="Generate random password"
                      >
                        <RefreshCw className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </FormField>
              </div>
            </div>

            <FormField label="Contact Phone Number">
              <Input
                type="text"
                placeholder="+94 77 123 4567"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
              />
            </FormField>

            {/* CLASS TEACHER SPECIFIC FIELDS */}
            {provisionCategory === 'teacher' && (
              <div className="space-y-4 pt-3 border-t border-border">
                <div className="text-xs font-semibold text-ink-muted uppercase">Academic & Class Teacher Specification</div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField label="Qualification" required>
                    <Input
                      type="text"
                      placeholder="e.g. B.Sc (Hons) Education"
                      value={formData.qualification}
                      onChange={(e) => setFormData({ ...formData, qualification: e.target.value })}
                      required
                    />
                  </FormField>

                  <FormField label="Primary Subject Specialization" required>
                    <CustomSelect
                      value={formData.subjectSpecialization}
                      onChange={(val) => setFormData({ ...formData, subjectSpecialization: val })}
                      options={getCategorizedSubjectOptions(subjects, (sub) => sub.name).map((opt) => ({
                        value: opt.label,
                        label: opt.label,
                        group: opt.group,
                      }))}
                      className="w-full"
                    />
                  </FormField>
                </div>

                <FormField label="Class Teacher Assignment" hint="Assign this teacher as the official Class Teacher for a grade">
                  <CustomSelect
                    value={formData.classId}
                    onChange={(val) => setFormData({ ...formData, classId: val })}
                    options={[
                      { value: '', label: 'None (Subject Teacher Only)' },
                      ...classes.map((cls) => {
                        const currentTch = teachers.find((t) => t.id === cls.classTeacherId || t.userId === cls.classTeacherId || t.employeeNo === cls.classTeacherId);
                        const tchUser = users.find((u) => u.id === currentTch?.userId || u.id === cls.classTeacherId);
                        const tchDisplayName = tchUser?.fullName || (currentTch ? `${currentTch.employeeNo}${currentTch.subjectSpecialization ? ` (${currentTch.subjectSpecialization})` : ''}` : null);
                        return {
                          value: cls.id,
                          label: `${cls.grade} (${cls.section}) ${tchDisplayName ? `· Current: ${tchDisplayName}` : '· Unassigned'}`,
                        };
                      }),
                    ]}
                    className="w-full"
                  />
                </FormField>
              </div>
            )}

            {/* SUPPORTING STAFF SPECIFIC FIELDS */}
            {provisionCategory === 'staff' && (
              <div className="space-y-4 pt-3 border-t border-border">
                <div className="text-xs font-semibold text-ink-muted uppercase">Supporting Staff & Department Specification</div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField label="Role Privilege" required>
                    <CustomSelect
                      value={formData.role}
                      onChange={(val) => setFormData({ ...formData, role: val as UserRole })}
                      options={SUPPORTING_ROLES}
                      className="w-full"
                    />
                  </FormField>

                  <FormField label="Department" required>
                    <CustomSelect
                      value={formData.department}
                      onChange={(val) => setFormData({ ...formData, department: val })}
                      options={DEPARTMENTS.map((dept) => ({ value: dept, label: dept }))}
                      className="w-full"
                    />
                  </FormField>
                </div>

                <FormField label="Role Description / Designation" required>
                  <Input
                    type="text"
                    placeholder="e.g. Chief Librarian / Senior Lab Assistant"
                    value={formData.roleDescription}
                    onChange={(e) => setFormData({ ...formData, roleDescription: e.target.value })}
                    required
                  />
                </FormField>
              </div>
            )}
          </form>
        </div>
      </Modal>

      {/* CREDENTIALS HANDOVER CARD MODAL */}
      <Modal
        open={Boolean(provisionedCredentials)}
        onClose={() => setProvisionedCredentials(null)}
        title="User Provisioned Successfully"
        eyebrow="Credentials Generated"
        footer={
          <div className="flex items-center justify-between w-full">
            {copiedNotice ? (
              <span className="text-xs font-semibold text-success flex items-center gap-1">
                <CheckCircle2 className="w-4 h-4" /> Credentials copied to clipboard!
              </span>
            ) : (
              <span className="text-xs text-ink-faint">Hand over these credentials to the staff member.</span>
            )}
            <div className="flex items-center gap-2">
              <Button
                variant="secondary"
                onClick={() =>
                  handleCopyCredentials(provisionedCredentials!.user.email, provisionedCredentials!.password)
                }
              >
                <Copy className="w-4 h-4" /> Copy Credentials
              </Button>
              <Button onClick={() => setProvisionedCredentials(null)}>Done</Button>
            </div>
          </div>
        }
      >
        {provisionedCredentials && (
          <div className="space-y-4">
            <div className="p-4 bg-success-tint border border-success/30 rounded-xl flex items-start gap-3">
              <CheckCircle2 className="w-5 h-5 text-success shrink-0 mt-0.5" />
              <div>
                <h4 className="font-semibold text-ink text-sm">Account Created & Login Enabled</h4>
                <p className="text-xs text-ink-muted mt-0.5">
                  The user can now immediately log in to the Government School Management System using the assigned email and password below.
                </p>
              </div>
            </div>

            <div className="bg-surface border border-border p-4 rounded-xl space-y-3 shadow-xs">
              <div className="flex justify-between items-start border-b border-border pb-2.5">
                <div>
                  <h3 className="font-display font-semibold text-base text-ink">{provisionedCredentials.user.fullName}</h3>
                  <Badge tone="brand" className="mt-1">{provisionedCredentials.categoryLabel}</Badge>
                </div>
                <div className="font-mono-data text-xs text-ink-faint font-semibold">
                  {provisionedCredentials.user.id}
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
                <div className="bg-surface-muted p-2.5 rounded-lg">
                  <span className="text-xs text-ink-faint block uppercase font-semibold">Login Email</span>
                  <span className="font-mono-data font-semibold text-ink text-sm break-all">
                    {provisionedCredentials.user.email}
                  </span>
                </div>

                <div className="bg-surface-muted p-2.5 rounded-lg">
                  <span className="text-xs text-ink-faint block uppercase font-semibold">Assigned Password</span>
                  <span className="font-mono-data font-semibold text-brand text-sm">
                    {provisionedCredentials.password}
                  </span>
                </div>
              </div>

              <div className="text-xs text-ink-muted pt-1">
                {provisionedCredentials.details}
              </div>
            </div>
          </div>
        )}
      </Modal>

      {/* VIEW / RESET CREDENTIALS MODAL */}
      <Modal
        open={Boolean(selectedUserForCredentials)}
        onClose={() => setSelectedUserForCredentials(null)}
        title={selectedUserForCredentials ? `Account Credentials: ${selectedUserForCredentials.fullName}` : ''}
        eyebrow="User Access Management"
      >
        {selectedUserForCredentials && (
          <div className="space-y-4">
            <div className="bg-surface-muted p-4 rounded-xl space-y-2 text-sm">
              <div className="flex justify-between"><span className="text-ink-faint">Full Name</span><span className="font-semibold text-ink">{selectedUserForCredentials.fullName}</span></div>
              <div className="flex justify-between"><span className="text-ink-faint">Email</span><span className="font-mono-data text-ink">{selectedUserForCredentials.email}</span></div>
              <div className="flex justify-between"><span className="text-ink-faint">Active Password</span><span className="font-mono-data font-semibold text-brand">{selectedUserForCredentials.password || 'password123'}</span></div>
              <div className="flex justify-between"><span className="text-ink-faint">Role Privilege</span><Badge tone="neutral">{ROLE_LABELS[selectedUserForCredentials.role]}</Badge></div>
              <div className="flex justify-between"><span className="text-ink-faint">Status</span><Badge tone={selectedUserForCredentials.isActive ? 'success' : 'danger'}>{selectedUserForCredentials.isActive ? 'Active' : 'Deactivated'}</Badge></div>
            </div>

            <form onSubmit={handleResetPasswordSubmit} className="p-4 border border-border rounded-xl space-y-3 bg-surface">
              <h4 className="font-semibold text-sm text-ink flex items-center gap-2">
                <Key className="w-4 h-4 text-brand" /> Reset Password for User
              </h4>
              <p className="text-xs text-ink-faint">Assign a new password for this staff member to override their existing login credentials.</p>

              <FormField label="New Password" required>
                <div className="flex gap-2">
                  <Input
                    type="text"
                    placeholder="Enter new password"
                    value={resetPasswordVal}
                    onChange={(e) => setResetPasswordVal(e.target.value)}
                    required
                  />
                  <Button type="submit" disabled={!resetPasswordVal.trim()}>
                    Save Password
                  </Button>
                </div>
              </FormField>

              {passwordResetSuccess && (
                <div className="p-2 bg-success-tint text-success text-xs rounded-lg flex items-center gap-1.5 font-semibold animate-fade-in">
                  <CheckCircle2 className="w-3.5 h-3.5" /> Password updated successfully!
                </div>
              )}
            </form>
          </div>
        )}
      </Modal>
    </div>
  );
};
