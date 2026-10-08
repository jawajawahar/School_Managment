import React, { useState, useEffect, useRef } from 'react';
import { Upload, Search, UserCheck, Phone, Mail, CheckCircle, XCircle, GraduationCap, Clock, Eye, FileText, Paperclip, Plus, UserPlus, Trash2, LayoutGrid, List, AlertTriangle, ArrowRightLeft, Pencil, Save } from 'lucide-react';
import { useData } from '../../context/DataContext';
import { Student, AdmissionRequest, Subject } from '../../types';
import { CustomSelect, SelectOption } from '../common/CustomSelect';
import { PageHeader } from '../ui/PageHeader';
import { Badge, BadgeTone } from '../ui/Badge';
import { Button } from '../ui/Button';
import { Card } from '../ui/Card';
import { Modal } from '../ui/Modal';
import { FormField, Input, Select, Textarea } from '../ui/FormField';
import { DatePicker } from '../ui/DatePicker';
import { EmptyState } from '../ui/EmptyState';
import { Table, THead, TH, TBody, TR, TD } from '../ui/Table';

interface StudentModuleProps {
  initialSubTab?: 'directory' | 'admissions';
}

interface BulkImportRow {
  studentNo?: string;
  firstName: string;
  lastName: string;
  dateOfBirth?: string;
  classId?: string;
  resolvedClassLabel: string;
}

interface GroupedSubjectSelectorProps {
  subjects: Subject[];
  selectedSubjectIds: string[];
  onChange: (updatedIds: string[]) => void;
}

const GroupedSubjectSelector: React.FC<GroupedSubjectSelectorProps> = ({
  subjects,
  selectedSubjectIds,
  onChange,
}) => {
  const categories: {
    key: string;
    title: string;
    badge: string;
    badgeColor: string;
    description: string;
  }[] = [
    {
      key: 'compulsory',
      title: '📌 Compulsory Core Subjects',
      badge: 'Core',
      badgeColor: 'bg-blue-100 text-blue-800 border-blue-200 dark:bg-blue-950 dark:text-blue-300 dark:border-blue-800',
      description: 'Mandatory core subjects (Maths, Science, English, Languages, History)',
    },
    {
      key: 'category_1',
      title: '📘 Category I / Group 1 Electives',
      badge: 'Group 1',
      badgeColor: 'bg-purple-100 text-purple-800 border-purple-200 dark:bg-purple-950 dark:text-purple-300 dark:border-purple-800',
      description: 'Business & Accounting, Geography, Civics, Entrepreneurship, 2nd Languages',
    },
    {
      key: 'category_2',
      title: '📙 Category II / Group 2 Electives',
      badge: 'Group 2',
      badgeColor: 'bg-amber-100 text-amber-800 border-amber-200 dark:bg-amber-950 dark:text-amber-300 dark:border-amber-800',
      description: 'Music, Art, Dancing, Drama, Literature',
    },
    {
      key: 'category_3',
      title: '📗 Category III / Group 3 Electives',
      badge: 'Group 3',
      badgeColor: 'bg-emerald-100 text-emerald-800 border-emerald-200 dark:bg-emerald-950 dark:text-emerald-300 dark:border-emerald-800',
      description: 'ICT, Agriculture, Health & PE, Home Economics, Design & Tech',
    },
    {
      key: 'general',
      title: '📚 General & Additional Subjects',
      badge: 'General',
      badgeColor: 'bg-slate-100 text-slate-800 border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700',
      description: 'Other registered subjects',
    },
  ];

  const getCategoryKey = (sub: Subject): string => {
    if (sub.category && ['compulsory', 'category_1', 'category_2', 'category_3'].includes(sub.category)) {
      return sub.category;
    }
    if (['subj-math', 'subj-sci', 'subj-eng', 'subj-tam', 'subj-isl', 'subj-his'].includes(sub.id)) {
      return 'compulsory';
    }
    return 'general';
  };

  const handleSelectGroup = (groupSubjectIds: string[]) => {
    const newSelected = Array.from(new Set([...selectedSubjectIds, ...groupSubjectIds]));
    onChange(newSelected);
  };

  const handleDeselectGroup = (groupSubjectIds: string[]) => {
    const newSelected = selectedSubjectIds.filter((id) => !groupSubjectIds.includes(id));
    onChange(newSelected);
  };

  const totalSelected = selectedSubjectIds.length;

  return (
    <div className="space-y-3 border border-border rounded-xl p-3 bg-surface-muted/50 max-h-[380px] overflow-y-auto">
      {/* Top Header Summary & Global Actions */}
      <div className="flex items-center justify-between pb-2 border-b border-border sticky top-0 bg-surface-muted z-10 pt-0.5">
        <span className="text-xs font-bold text-ink">
          Total Selected: <span className="text-brand font-extrabold">{totalSelected}</span> / {subjects.length} Subjects
        </span>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => onChange(subjects.map((s) => s.id))}
            className="text-xs font-semibold text-brand hover:underline"
          >
            Select All
          </button>
          <span className="text-ink-faint text-xs">•</span>
          <button
            type="button"
            onClick={() => onChange([])}
            className="text-xs font-semibold text-danger hover:underline"
          >
            Deselect All
          </button>
        </div>
      </div>

      {/* Categorized Groups */}
      {categories.map((cat) => {
        const groupSubjects = subjects.filter((s) => getCategoryKey(s) === cat.key);
        if (groupSubjects.length === 0) return null;

        const groupIds = groupSubjects.map((s) => s.id);
        const selectedInGroup = groupIds.filter((id) => selectedSubjectIds.includes(id)).length;
        const isAllInGroupSelected = selectedInGroup === groupSubjects.length;

        return (
          <div key={cat.key} className="space-y-2 bg-surface p-3 rounded-xl border border-border/80 shadow-2xs">
            {/* Category Header */}
            <div className="flex flex-wrap items-center justify-between gap-2 pb-1.5 border-b border-border/50">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-ink">{cat.title}</span>
                <span className={`text-[10px] font-extrabold px-2 py-0.5 rounded-full border ${cat.badgeColor}`}>
                  {selectedInGroup}/{groupSubjects.length}
                </span>
              </div>
              <div className="flex items-center gap-2">
                {!isAllInGroupSelected ? (
                  <button
                    type="button"
                    onClick={() => handleSelectGroup(groupIds)}
                    className="text-[11px] font-semibold text-brand hover:underline"
                  >
                    + Select Group
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => handleDeselectGroup(groupIds)}
                    className="text-[11px] font-semibold text-danger hover:underline"
                  >
                    ✕ Deselect Group
                  </button>
                )}
              </div>
            </div>

            {/* Subject Checkboxes */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
              {groupSubjects.map((sub) => {
                const isChecked = selectedSubjectIds.includes(sub.id);
                return (
                  <label
                    key={sub.id}
                    className={`flex items-center gap-2.5 p-2 rounded-lg border text-xs font-medium cursor-pointer transition-all ${
                      isChecked
                        ? 'bg-brand-tint/40 border-brand/40 text-brand-dark ring-1 ring-brand/20 shadow-2xs font-semibold'
                        : 'bg-surface-muted/30 border-border text-ink-muted hover:border-ink-faint hover:bg-surface'
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={isChecked}
                      onChange={(e) => {
                        if (e.target.checked) {
                          onChange([...selectedSubjectIds, sub.id]);
                        } else {
                          onChange(selectedSubjectIds.filter((id) => id !== sub.id));
                        }
                      }}
                      className="rounded text-brand focus:ring-brand accent-brand w-3.5 h-3.5"
                    />
                    <span className="truncate flex-1">
                      {sub.name} <span className="text-ink-muted font-normal text-[11px]">({sub.code})</span>
                    </span>
                  </label>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
};

export const StudentModule: React.FC<StudentModuleProps> = ({ initialSubTab = 'directory' }) => {
  const {
    students,
    classes,
    guardians,
    teachers,
    users,
    activeRole,
    admissionRequests,
    addStudent,
    deleteStudent,
    deleteAdmissionRequest,
    bulkDeleteAdmissionRequests,
    addAdmissionRequest,
    acceptStudentIntoClass,
    importStudentsBulk,
    updateStudent,
    approveAdmissionRequest,
    updateStudentExamEligibility,
    issueStudentPass,
    issueAllPasses,
    assignStudentToClass,
    assignedClassId,
    currentUser,
    computeExamRoster,
    subjects,
    teachingAssignments,
    schoolProfile,
  } = useData();

  const [activeSubTab, setActiveSubTab] = useState<'directory' | 'admissions'>(initialSubTab);

  const [searchTerm, setSearchTerm] = useState('');
  const [selectedClassId, setSelectedClassId] = useState<string>(activeRole === 'teacher' ? assignedClassId : 'all');

  const [selectedStudentIds, setSelectedStudentIds] = useState<string[]>([]);
  const [selectedAdmissionIds, setSelectedAdmissionIds] = useState<string[]>([]);
  const [capacityError, setCapacityError] = useState<string | null>(null);

  useEffect(() => {
    setSelectedStudentIds([]);
    setSelectedAdmissionIds([]);
  }, [activeSubTab, searchTerm, selectedClassId]);

  useEffect(() => {
    if (initialSubTab) {
      setActiveSubTab(initialSubTab);
    }
  }, [initialSubTab]);

  const [showAddModal, setShowAddModal] = useState(false);
  const [showBulkModal, setShowBulkModal] = useState(false);
  const [showAdmissionModal, setShowAdmissionModal] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
  const [admViewMode, setAdmViewMode] = useState<'cards' | 'table'>('cards');
  const [statusChangeTarget, setStatusChangeTarget] = useState<string[] | null>(null);
  const [statusChangeValue, setStatusChangeValue] = useState<'withdrawn' | 'transferred' | 'graduated'>('withdrawn');

  // Edit student modal state
  const [editingStudent, setEditingStudent] = useState<Student | null>(null);
  const [editStudentNo, setEditStudentNo] = useState('');
  const [editFirstName, setEditFirstName] = useState('');
  const [editLastName, setEditLastName] = useState('');
  const [editDateOfBirth, setEditDateOfBirth] = useState('');
  const [editAdmissionDate, setEditAdmissionDate] = useState('');
  const [editClassId, setEditClassId] = useState('');
  const [editStatus, setEditStatus] = useState<Student['status']>('active');
  const [editGuardianName, setEditGuardianName] = useState('');
  const [editGuardianPhone, setEditGuardianPhone] = useState('');

  // Bulk import (real CSV parsing)
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [bulkImportRows, setBulkImportRows] = useState<BulkImportRow[]>([]);
  const [bulkImportFileName, setBulkImportFileName] = useState<string>('');
  const [bulkImportError, setBulkImportError] = useState<string | null>(null);

  const [currentPage, setCurrentPage] = useState<number>(1);
  const [pageSize, setPageSize] = useState<number>(10);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, selectedClassId, pageSize]);

  const [viewingAdmissionDossier, setViewingAdmissionDossier] = useState<AdmissionRequest | null>(null);
  const [viewingExamPass, setViewingExamPass] = useState<{
    studentNo: string;
    studentName: string;
    classId?: string;
    className: string;
    examTerm: string;
    attendancePercentage: number;
    principalName: string;
  } | null>(null);

  // New Admission Form state
  const [admissionModalType, setAdmissionModalType] = useState<'exam_admission' | 'school_admission'>('exam_admission');
  const [admStudentName, setAdmStudentName] = useState('');
  const [admGrade, setAdmGrade] = useState('Grade 9');
  const [admGuardian, setAdmGuardian] = useState('');
  const [admContact, setAdmContact] = useState('');
  const [admPrevSchool, setAdmPrevSchool] = useState('');

  const [examTermName, setExamTermName] = useState('2026 Term 1 Final Examinations');
  const [examClassSelect, setExamClassSelect] = useState(assignedClassId || 'class-9a');
  const [examMinAttendance, setExamMinAttendance] = useState(80);
  const [examNotes, setExamNotes] = useState('');
  const [examRosterPreview, setExamRosterPreview] = useState<NonNullable<AdmissionRequest['studentRoster']> | null>(null);
  const [examPreviewLoading, setExamPreviewLoading] = useState(false);

  // New student form
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [dateOfBirth, setDateOfBirth] = useState('');
  const [classId, setClassId] = useState('class-9a');
  const [studentNo, setStudentNo] = useState(`GSMS-2026-${Math.floor(1000 + Math.random() * 9000)}`);
  const [guardianName, setGuardianName] = useState('');
  const [guardianPhone, setGuardianPhone] = useState('');
  const [enrolledSubjectIds, setEnrolledSubjectIds] = useState<string[]>([]);
  const [editEnrolledSubjectIds, setEditEnrolledSubjectIds] = useState<string[]>([]);

  useEffect(() => {
    if (subjects.length > 0 && enrolledSubjectIds.length === 0) {
      setEnrolledSubjectIds(subjects.map((s) => s.id));
    }
  }, [subjects]);

  const isPrincipalOrAdmin = ['principal', 'vice_principal', 'admin'].includes(activeRole);

  // Class occupancy — used to keep class reassignment inside real capacity limits.
  const getClassOccupancy = (clsId: string) => students.filter((s) => s.classId === clsId).length;
  const classOptionsWithOccupancy: SelectOption[] = classes.map((c) => ({
    value: c.id,
    label: `${c.grade} - Section ${c.section} (${getClassOccupancy(c.id)}/${c.capacity})`,
  }));

  const handleReassignClass = (student: Student, newClassId: string) => {
    if (newClassId === student.classId) return;
    const target = classes.find((c) => c.id === newClassId);
    if (target && getClassOccupancy(newClassId) >= target.capacity) {
      setCapacityError(`${target.grade} - Section ${target.section} is already at full capacity (${target.capacity} students) — move another student out first, or increase capacity.`);
      return;
    }
    setCapacityError(null);
    assignStudentToClass(student.id, newClassId);
    if (selectedStudent?.id === student.id) {
      setSelectedStudent({ ...student, classId: newClassId });
    }
  };

  const statusTone = (status: Student['status']): BadgeTone =>
    status === 'active' ? 'success' : status === 'pending_acceptance' ? 'warning' : 'neutral';

  // Filtered students
  const filteredStudents = students.filter((s) => {
    const matchesSearch =
      `${s.firstName} ${s.lastName} ${s.studentNo}`.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesClass = selectedClassId === 'all' || s.classId === selectedClassId;
    return matchesSearch && matchesClass;
  });

  const handleAddStudentSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const finalEnrolled = enrolledSubjectIds.length > 0 ? enrolledSubjectIds : subjects.map((s) => s.id);
    addStudent({
      studentNo,
      firstName,
      lastName,
      dateOfBirth,
      classId,
      admissionDate: new Date().toISOString().split('T')[0],
      status: 'active',
      guardianIds: [],
      phone: guardianPhone,
      guardianPhone,
      guardianName,
      enrolledSubjectIds: finalEnrolled,
    });
    setShowAddModal(false);
    setFirstName('');
    setLastName('');
    setGuardianName('');
    setGuardianPhone('');
    setEnrolledSubjectIds(subjects.map((s) => s.id));
    setStudentNo(`GSMS-2026-${Math.floor(1000 + Math.random() * 9000)}`);
  };

  const handleConfirmStatusChange = () => {
    if (!statusChangeTarget) return;
    statusChangeTarget.forEach((id) => {
      const student = students.find((s) => s.id === id);
      if (student) updateStudent({ ...student, status: statusChangeValue });
    });
    setStatusChangeTarget(null);
    setSelectedStudentIds([]);
  };

  const handleStartEditStudent = (s: Student) => {
    setEditingStudent(s);
    setEditStudentNo(s.studentNo || '');
    setEditFirstName(s.firstName || '');
    setEditLastName(s.lastName || '');
    setEditDateOfBirth(s.dateOfBirth || '');
    setEditAdmissionDate(s.admissionDate || '');
    setEditClassId(s.classId || '');
    setEditStatus(s.status || 'active');
    setEditGuardianName(s.guardianName || '');
    setEditGuardianPhone(s.guardianPhone || s.phone || '');
    setEditEnrolledSubjectIds(
      s.enrolledSubjectIds && s.enrolledSubjectIds.length > 0 ? s.enrolledSubjectIds : subjects.map((sub) => sub.id)
    );
  };

  const handleSaveEditStudent = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingStudent) return;
    const updated: Student = {
      ...editingStudent,
      studentNo: editStudentNo.trim() || editingStudent.studentNo,
      firstName: editFirstName.trim(),
      lastName: editLastName.trim(),
      dateOfBirth: editDateOfBirth,
      admissionDate: editAdmissionDate || editingStudent.admissionDate,
      classId: editClassId,
      status: editStatus,
      guardianName: editGuardianName.trim(),
      guardianPhone: editGuardianPhone.trim(),
      phone: editGuardianPhone.trim(),
      enrolledSubjectIds: editEnrolledSubjectIds,
    };
    updateStudent(updated);
    setEditingStudent(null);
    if (selectedStudent?.id === editingStudent.id) {
      setSelectedStudent(updated);
    }
  };

  const handlePermanentDelete = (s: Student) => {
    if (window.confirm(`Permanently delete the record for ${s.firstName} ${s.lastName} (${s.studentNo})? This removes the record entirely and cannot be undone — use "Change status" instead unless this is a duplicate or data-entry mistake.`)) {
      deleteStudent(s.id);
      setSelectedStudent(null);
    }
  };

  // Real CSV parsing — expects header row with at least firstName,lastName;
  // optional studentNo, dateOfBirth, grade, section columns.
  const handleBulkFileSelected = (file: File) => {
    setBulkImportError(null);
    setBulkImportFileName(file.name);
    const reader = new FileReader();
    reader.onload = () => {
      const text = String(reader.result || '');
      const lines = text.split(/\r?\n/).filter((l) => l.trim().length > 0);
      if (lines.length < 2) {
        setBulkImportError('The CSV needs a header row plus at least one student row.');
        setBulkImportRows([]);
        return;
      }
      const header = lines[0].split(',').map((h) => h.trim().toLowerCase());
      const col = (name: string) => header.indexOf(name);
      const idx = {
        studentNo: col('studentno'),
        firstName: col('firstname'),
        lastName: col('lastname'),
        dateOfBirth: col('dateofbirth'),
        grade: col('grade'),
        section: col('section'),
      };
      if (idx.firstName === -1 || idx.lastName === -1) {
        setBulkImportError('CSV columns must include at least "firstName" and "lastName".');
        setBulkImportRows([]);
        return;
      }

      const rows: BulkImportRow[] = lines.slice(1).map((line) => {
        const cols = line.split(',').map((c) => c.trim());
        const grade = idx.grade >= 0 ? cols[idx.grade] : '';
        const section = idx.section >= 0 ? cols[idx.section] : '';
        const matchedClass = classes.find(
          (c) => c.grade.toLowerCase() === grade.toLowerCase() && (!section || c.section.toLowerCase() === section.toLowerCase())
        );
        return {
          studentNo: idx.studentNo >= 0 ? cols[idx.studentNo] : undefined,
          firstName: cols[idx.firstName] || '',
          lastName: cols[idx.lastName] || '',
          dateOfBirth: idx.dateOfBirth >= 0 ? cols[idx.dateOfBirth] : undefined,
          classId: matchedClass?.id,
          resolvedClassLabel: matchedClass
            ? `${matchedClass.grade} - Section ${matchedClass.section}`
            : grade
            ? `Not found: "${grade}${section ? ' ' + section : ''}"`
            : 'Not specified',
        };
      }).filter((r) => r.firstName && r.lastName);

      setBulkImportRows(rows);
    };
    reader.readAsText(file);
  };

  const handleConfirmBulkImport = () => {
    if (bulkImportRows.length === 0) return;
    importStudentsBulk(bulkImportRows);
    setShowBulkModal(false);
    setBulkImportRows([]);
    setBulkImportFileName('');
    setBulkImportError(null);
  };

  const resetBulkImportModal = () => {
    setShowBulkModal(false);
    setBulkImportRows([]);
    setBulkImportFileName('');
    setBulkImportError(null);
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <PageHeader
        eyebrow={<Badge tone="brand">Student management</Badge>}
        title={activeSubTab === 'admissions' ? 'Student admission requests' : 'Enrolled student directory'}
        description={
          activeSubTab === 'admissions'
            ? 'Review and approve incoming student admission applications.'
            : 'Class allocation and student roster management.'
        }
        actions={
          activeSubTab === 'directory' ? (
            isPrincipalOrAdmin && (
              <>
                <Button variant="secondary" onClick={() => setShowBulkModal(true)}>
                  <Upload className="w-4 h-4" /> Bulk import
                </Button>
                <Button onClick={() => setShowAddModal(true)}>
                  <UserPlus className="w-4 h-4" /> Enrol new student
                </Button>
              </>
            )
          ) : (
            <>
              <div className="inline-flex items-center gap-1 p-1 bg-surface-muted border border-border rounded-xl">
                <button
                  onClick={() => setAdmViewMode('cards')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all ${admViewMode === 'cards' ? 'bg-surface text-ink shadow-xs' : 'text-ink-muted hover:text-ink'}`}
                >
                  <LayoutGrid className="w-3.5 h-3.5" /> Cards
                </button>
                <button
                  onClick={() => setAdmViewMode('table')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all ${admViewMode === 'table' ? 'bg-surface text-ink shadow-xs' : 'text-ink-muted hover:text-ink'}`}
                >
                  <List className="w-3.5 h-3.5" /> Table
                </button>
              </div>
              {(isPrincipalOrAdmin || ['teacher', 'staff'].includes(activeRole)) && (
                <Button onClick={() => setShowAdmissionModal(true)}>
                  <Plus className="w-4 h-4" /> Submit request
                </Button>
              )}
            </>
          )
        }
      />

      {/* DIRECTORY VIEW */}
      {activeSubTab === 'directory' && (
        <div className="space-y-4">
          <Card className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="relative w-full sm:w-72">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-ink-faint" />
              <input
                type="text"
                placeholder="Filter by name or Student ID..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full bg-surface-muted border border-border rounded-full pl-9 pr-4 py-2 text-sm text-ink focus:outline-none focus:border-brand"
              />
            </div>

            <div className="flex items-center gap-2 text-sm text-ink">
              <span className="text-ink-muted">Filter class</span>
              <CustomSelect
                options={[
                  ...(isPrincipalOrAdmin ? [{ value: 'all', label: `All grades & sections (${students.length})` }] : []),
                  ...classes.map((c) => ({ value: c.id, label: `${c.grade} - Section ${c.section}` })),
                ]}
                value={selectedClassId}
                disabled={activeRole === 'teacher'}
                onChange={setSelectedClassId}
                className="min-w-[220px]"
              />
            </div>
          </Card>

          {capacityError && (
            <div className="p-3.5 bg-danger-tint border border-danger/30 rounded-xl flex items-center justify-between gap-3 text-sm text-danger">
              <span className="flex items-center gap-2"><AlertTriangle className="w-4 h-4 shrink-0" /> {capacityError}</span>
              <Button size="sm" variant="danger" onClick={() => setCapacityError(null)}>Dismiss</Button>
            </div>
          )}

          {activeRole === 'teacher' && (() => {
            const pendingForTeacher = students.filter((s) => s.classId === assignedClassId && s.status === 'pending_acceptance');
            if (pendingForTeacher.length === 0) return null;
            return (
              <Card className="border-warning/40 flex items-center gap-3">
                <UserPlus className="w-5 h-5 text-warning shrink-0" />
                <div>
                  <div className="font-semibold text-sm text-ink">Pending class enrolment requests ({pendingForTeacher.length})</div>
                  <div className="text-sm text-ink-muted">Principal registered student(s) for your class — review and accept below.</div>
                </div>
              </Card>
            );
          })()}

          {(() => {
            const totalStudents = filteredStudents.length;
            const totalPages = Math.max(1, Math.ceil(totalStudents / pageSize));
            const safeCurrentPage = Math.min(currentPage, totalPages);
            const startIndex = (safeCurrentPage - 1) * pageSize;
            const endIndex = Math.min(startIndex + pageSize, totalStudents);
            const paginatedStudents = filteredStudents.slice(startIndex, endIndex);

            const pageStudentIds = paginatedStudents.map((s) => s.id);
            const isAllPageSelected = pageStudentIds.length > 0 && pageStudentIds.every((id) => selectedStudentIds.includes(id));

            const toggleSelectAll = () => {
              if (isAllPageSelected) setSelectedStudentIds((prev) => prev.filter((id) => !pageStudentIds.includes(id)));
              else setSelectedStudentIds((prev) => Array.from(new Set([...prev, ...pageStudentIds])));
            };
            const toggleSelectStudent = (id: string) => {
              setSelectedStudentIds((prev) => (prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]));
            };

            return (
              <div className="space-y-3">
                {isPrincipalOrAdmin && selectedStudentIds.length > 0 && (
                  <div className="flex items-center justify-between p-3.5 bg-warning-tint border border-warning/30 rounded-xl text-sm">
                    <span className="font-semibold text-ink flex items-center gap-2">
                      {selectedStudentIds.length} student record(s) selected
                    </span>
                    <div className="flex items-center gap-2">
                      <Button size="sm" variant="secondary" onClick={() => setSelectedStudentIds([])}>Deselect all</Button>
                      <Button size="sm" variant="primary" onClick={() => setStatusChangeTarget(selectedStudentIds)}>
                        <ArrowRightLeft className="w-3.5 h-3.5" /> Change status ({selectedStudentIds.length})
                      </Button>
                    </div>
                  </div>
                )}

                <Card padded={false}>
                  <Table>
                    <THead>
                      <tr>
                        {isPrincipalOrAdmin && (
                          <TH className="w-10 text-center">
                            <input type="checkbox" checked={isAllPageSelected} onChange={toggleSelectAll} title="Select all on current page" />
                          </TH>
                        )}
                        <TH>Student ID</TH>
                        <TH>Student name</TH>
                        <TH>Class allocation</TH>
                        <TH>Date of birth</TH>
                        <TH>Enrolled</TH>
                        <TH>Status</TH>
                        <TH className="text-right">Actions</TH>
                      </tr>
                    </THead>
                    <TBody>
                      {paginatedStudents.length === 0 ? (
                        <TR><TD colSpan={8} className="text-center py-8 text-ink-muted italic">No matching student records found.</TD></TR>
                      ) : (
                        paginatedStudents.map((s) => {
                          const cls = classes.find((c) => c.id === s.classId);
                          const isSelected = selectedStudentIds.includes(s.id);

                          return (
                            <TR key={s.id} className={isSelected ? 'bg-brand-tint/40' : ''}>
                              {isPrincipalOrAdmin && (
                                <TD className="text-center">
                                  <input type="checkbox" checked={isSelected} onChange={() => toggleSelectStudent(s.id)} />
                                </TD>
                              )}
                              <TD>
                                <div className="flex items-center gap-2.5">
                                  <div className="w-8 h-8 rounded-full bg-brand-tint text-brand font-semibold text-xs flex items-center justify-center shrink-0">
                                    {s.firstName[0]}{s.lastName[0]}
                                  </div>
                                  <span className="font-mono-data text-xs font-semibold text-ink-muted">{s.studentNo}</span>
                                </div>
                              </TD>
                              <TD className="font-semibold text-ink">{s.firstName} {s.lastName}</TD>
                              <TD>
                                {isPrincipalOrAdmin ? (
                                  <CustomSelect
                                    options={classOptionsWithOccupancy}
                                    value={s.classId}
                                    onChange={(val) => handleReassignClass(s, val)}
                                    className="min-w-[200px]"
                                  />
                                ) : (
                                  <Badge tone="neutral">{cls ? `${cls.grade} (${cls.section})` : 'Unassigned'}</Badge>
                                )}
                              </TD>
                              <TD className="font-mono-data text-ink-muted">{s.dateOfBirth}</TD>
                              <TD className="font-mono-data text-ink-muted">{s.admissionDate}</TD>
                              <TD>
                                {s.status === 'pending_acceptance' ? (
                                  <div className="flex items-center gap-2 flex-wrap">
                                    <Badge tone="warning"><Clock className="w-3 h-3" /> Pending</Badge>
                                    {activeRole === 'teacher' && s.classId === assignedClassId && (
                                      <Button size="sm" variant="success" onClick={() => acceptStudentIntoClass(s.id)}>
                                        <UserCheck className="w-3.5 h-3.5" /> Accept
                                      </Button>
                                    )}
                                  </div>
                                ) : (
                                  <Badge tone={statusTone(s.status)}>{s.status}</Badge>
                                )}
                              </TD>
                              <TD className="text-right">
                                <div className="flex items-center justify-end gap-1.5">
                                  <button
                                    onClick={() => setSelectedStudent(s)}
                                    className="p-1.5 text-ink-muted hover:text-ink hover:bg-surface-muted rounded-lg transition-colors cursor-pointer"
                                    title="View student profile"
                                  >
                                    <Eye className="w-3.5 h-3.5" />
                                  </button>
                                  {isPrincipalOrAdmin && (
                                    <>
                                      <button
                                        onClick={() => handleStartEditStudent(s)}
                                        className="p-1.5 text-ink-muted hover:text-brand hover:bg-brand-tint rounded-lg transition-colors cursor-pointer"
                                        title="Edit student information"
                                      >
                                        <Pencil className="w-3.5 h-3.5" />
                                      </button>
                                      <button
                                        onClick={() => setStatusChangeTarget([s.id])}
                                        className="p-1.5 text-ink-muted hover:text-warning hover:bg-warning-tint rounded-lg transition-colors cursor-pointer"
                                        title="Change enrollment status (withdraw / transfer / graduate)"
                                      >
                                        <ArrowRightLeft className="w-3.5 h-3.5" />
                                      </button>
                                    </>
                                  )}
                                </div>
                              </TD>
                            </TR>
                          );
                        })
                      )}
                    </TBody>
                  </Table>
                </Card>

                <div className="flex flex-col sm:flex-row items-center justify-between gap-4 p-4 border-t border-border text-sm text-ink-muted">
                  <div className="flex items-center gap-3">
                    <span>
                      Showing <strong className="text-ink">{totalStudents > 0 ? startIndex + 1 : 0}</strong> to{' '}
                      <strong className="text-ink">{endIndex}</strong> of <strong className="text-ink">{totalStudents}</strong> students
                    </span>
                    <div className="flex items-center gap-1.5 border-l border-border pl-3">
                      <span>Per page:</span>
                      <CustomSelect
                        value={pageSize}
                        onChange={(val) => setPageSize(Number(val))}
                        options={[
                          { value: 10, label: '10' },
                          { value: 20, label: '20' },
                          { value: 50, label: '50' },
                          { value: 100, label: '100' },
                        ]}
                        className="w-20"
                      />
                    </div>
                  </div>

                  {totalPages > 1 && (
                    <div className="flex items-center gap-1">
                      <button disabled={safeCurrentPage === 1} onClick={() => setCurrentPage(1)} className="px-2.5 py-1.5 rounded-lg bg-surface-muted hover:bg-border disabled:opacity-40 disabled:cursor-not-allowed font-semibold text-xs" title="First page">«</button>
                      <button disabled={safeCurrentPage === 1} onClick={() => setCurrentPage((p) => Math.max(1, p - 1))} className="px-3 py-1.5 rounded-lg bg-surface-muted hover:bg-border disabled:opacity-40 disabled:cursor-not-allowed font-semibold text-xs">Prev</button>
                      <div className="flex items-center gap-1 px-1">
                        {Array.from({ length: totalPages }, (_, i) => i + 1)
                          .filter((p) => p === 1 || p === totalPages || Math.abs(p - safeCurrentPage) <= 2)
                          .map((p, idx, arr) => (
                            <React.Fragment key={p}>
                              {idx > 0 && arr[idx - 1] !== p - 1 && <span className="px-1 text-ink-faint">...</span>}
                              <button onClick={() => setCurrentPage(p)} className={`w-8 h-8 rounded-lg text-xs font-semibold transition-all ${safeCurrentPage === p ? 'bg-brand text-white' : 'bg-surface-muted text-ink-muted hover:text-ink'}`}>{p}</button>
                            </React.Fragment>
                          ))}
                      </div>
                      <button disabled={safeCurrentPage === totalPages} onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))} className="px-3 py-1.5 rounded-lg bg-surface-muted hover:bg-border disabled:opacity-40 disabled:cursor-not-allowed font-semibold text-xs">Next</button>
                      <button disabled={safeCurrentPage === totalPages} onClick={() => setCurrentPage(totalPages)} className="px-2.5 py-1.5 rounded-lg bg-surface-muted hover:bg-border disabled:opacity-40 disabled:cursor-not-allowed font-semibold text-xs" title="Last page">»</button>
                    </div>
                  )}
                </div>
              </div>
            );
          })()}
        </div>
      )}

      {/* ADMISSIONS TAB */}
      {activeSubTab === 'admissions' && (() => {
        const allAdmIds = admissionRequests.map((a) => a.id);
        const isAllAdmSelected = allAdmIds.length > 0 && allAdmIds.every((id) => selectedAdmissionIds.includes(id));
        const toggleSelectAllAdm = () => setSelectedAdmissionIds(isAllAdmSelected ? [] : allAdmIds);
        const toggleSelectAdm = (id: string) => setSelectedAdmissionIds((prev) => (prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]));

        const statusBadge = (status: AdmissionRequest['status']) =>
          status === 'approved' ? <Badge tone="success"><CheckCircle className="w-3.5 h-3.5" /> Admitted</Badge>
          : status === 'rejected' ? <Badge tone="danger"><XCircle className="w-3.5 h-3.5" /> Declined</Badge>
          : <Badge tone="warning"><Clock className="w-3.5 h-3.5" /> Pending</Badge>;

        const typeBadge = (isExamBatch: boolean) =>
          isExamBatch ? <Badge tone="info"><GraduationCap className="w-3.5 h-3.5" /> Exam batch</Badge>
          : <Badge tone="neutral"><FileText className="w-3.5 h-3.5" /> School admission</Badge>;

        return (
          <div className="space-y-4">
            {selectedAdmissionIds.length > 0 && (
              <div className="flex items-center justify-between p-3.5 bg-danger-tint border border-danger/30 rounded-xl text-sm">
                <span className="font-semibold text-danger">{selectedAdmissionIds.length} admission request(s) selected</span>
                <div className="flex items-center gap-2">
                  <Button size="sm" variant="secondary" onClick={() => setSelectedAdmissionIds([])}>Deselect all</Button>
                  <Button
                    size="sm"
                    variant="danger"
                    onClick={() => {
                      if (window.confirm(`Delete ${selectedAdmissionIds.length} selected admission request(s)? This cannot be undone.`)) {
                        bulkDeleteAdmissionRequests(selectedAdmissionIds);
                        setSelectedAdmissionIds([]);
                      }
                    }}
                  >
                    <Trash2 className="w-3.5 h-3.5" /> Delete selected
                  </Button>
                </div>
              </div>
            )}

            {admissionRequests.length === 0 ? (
              <Card>
                <EmptyState
                  icon={FileText}
                  title="No admission requests logged"
                  description='Click "Submit request" above to log a new school admission or exam batch application.'
                />
              </Card>
            ) : admViewMode === 'cards' ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {admissionRequests.map((adm) => {
                  const isSelected = selectedAdmissionIds.includes(adm.id);
                  const isExamBatch = adm.type === 'exam_admission';
                  return (
                    <Card key={adm.id} className={isSelected ? 'ring-2 ring-brand/30 border-brand/40' : ''}>
                      <div className="flex items-center justify-between gap-2 mb-3 pb-3 border-b border-border">
                        <div className="flex items-center gap-2">
                          <input type="checkbox" checked={isSelected} onChange={() => toggleSelectAdm(adm.id)} />
                          <span className="font-mono-data text-xs font-semibold text-ink-muted bg-surface-muted px-2 py-0.5 rounded">{adm.id}</span>
                        </div>
                        {typeBadge(isExamBatch)}
                      </div>

                      <div className="mb-3">
                        <h4 className="font-display font-semibold text-ink text-base leading-snug">{adm.studentName}</h4>
                        <div className="flex items-center gap-2 mt-1.5">
                          <span className="text-xs text-ink-faint uppercase font-semibold">Target:</span>
                          <Badge tone="neutral">{adm.gradeApplying}</Badge>
                        </div>
                      </div>

                      <div className="bg-surface-muted border border-border rounded-lg p-3 mb-4 space-y-1 text-sm">
                        <div className="flex items-center justify-between">
                          <span className="text-ink-faint text-xs">Sponsor / teacher:</span>
                          <span className="font-semibold text-ink">{adm.guardianName}</span>
                        </div>
                        {adm.contactNo && (
                          <div className="flex items-center gap-1.5 text-ink-muted text-xs">
                            <Phone className="w-3 h-3" /> <span>{adm.contactNo}</span>
                          </div>
                        )}
                      </div>

                      <div className="pt-3 border-t border-border flex items-center justify-between gap-2 flex-wrap">
                        {statusBadge(adm.status)}
                        <div className="flex items-center gap-1.5">
                          <button onClick={() => setViewingAdmissionDossier(adm)} className="p-1.5 text-ink-muted hover:text-ink hover:bg-surface-muted rounded-lg transition-colors" title="View full admission dossier">
                            <Eye className="w-3.5 h-3.5" />
                          </button>
                          {adm.status === 'pending' && isPrincipalOrAdmin && (
                            <>
                              <Button size="sm" variant="success" onClick={() => approveAdmissionRequest(adm.id, 'approved')}>
                                <CheckCircle className="w-3.5 h-3.5" /> Admit
                              </Button>
                              <Button size="sm" variant="danger" onClick={() => approveAdmissionRequest(adm.id, 'rejected')}>
                                <XCircle className="w-3.5 h-3.5" /> Reject
                              </Button>
                            </>
                          )}
                          <button
                            onClick={() => {
                              if (window.confirm(`Remove admission request ${adm.id} (${adm.studentName})?`)) {
                                deleteAdmissionRequest(adm.id);
                                setSelectedAdmissionIds((prev) => prev.filter((id) => id !== adm.id));
                              }
                            }}
                            className="p-1.5 text-danger hover:bg-danger-tint rounded-lg transition-colors"
                            title="Remove request"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    </Card>
                  );
                })}
              </div>
            ) : (
              <Card padded={false}>
                <Table>
                  <THead>
                    <tr>
                      <TH className="w-10 text-center"><input type="checkbox" checked={isAllAdmSelected} onChange={toggleSelectAllAdm} /></TH>
                      <TH>Application ID</TH>
                      <TH>Student / batch name</TH>
                      <TH>Target grade</TH>
                      <TH>Contact</TH>
                      <TH>Type</TH>
                      <TH>Status</TH>
                      <TH className="text-right">Actions</TH>
                    </tr>
                  </THead>
                  <TBody>
                    {admissionRequests.map((adm) => {
                      const isSelected = selectedAdmissionIds.includes(adm.id);
                      const isExamBatch = adm.type === 'exam_admission';
                      return (
                        <TR key={adm.id} className={isSelected ? 'bg-brand-tint/40' : ''}>
                          <TD className="text-center"><input type="checkbox" checked={isSelected} onChange={() => toggleSelectAdm(adm.id)} /></TD>
                          <TD className="font-mono-data font-semibold">{adm.id}</TD>
                          <TD className="font-semibold text-ink">{adm.studentName}</TD>
                          <TD className="font-mono-data text-ink-muted">{adm.gradeApplying}</TD>
                          <TD className="text-ink-muted">
                            <div className="font-semibold text-ink">{adm.guardianName}</div>
                            <div className="font-mono-data text-xs">{adm.contactNo}</div>
                          </TD>
                          <TD>{typeBadge(isExamBatch)}</TD>
                          <TD>{statusBadge(adm.status)}</TD>
                          <TD className="text-right">
                            <div className="flex gap-1.5 justify-end items-center flex-wrap">
                              <button onClick={() => setViewingAdmissionDossier(adm)} className="p-1.5 text-ink-muted hover:text-ink hover:bg-surface-muted rounded-lg transition-colors" title="View full admission dossier">
                                <Eye className="w-3.5 h-3.5" />
                              </button>
                              {adm.status === 'pending' && isPrincipalOrAdmin && (
                                <>
                                  <Button size="sm" variant="success" onClick={() => approveAdmissionRequest(adm.id, 'approved')}><CheckCircle className="w-3.5 h-3.5" /> Admit</Button>
                                  <Button size="sm" variant="danger" onClick={() => approveAdmissionRequest(adm.id, 'rejected')}><XCircle className="w-3.5 h-3.5" /> Reject</Button>
                                </>
                              )}
                              <button
                                onClick={() => {
                                  if (window.confirm(`Remove admission request ${adm.id} (${adm.studentName})?`)) {
                                    deleteAdmissionRequest(adm.id);
                                    setSelectedAdmissionIds((prev) => prev.filter((id) => id !== adm.id));
                                  }
                                }}
                                className="p-1.5 text-danger hover:bg-danger-tint rounded-lg transition-colors"
                                title="Remove request"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
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
        );
      })()}

      {/* ENROL NEW STUDENT MODAL */}
      <Modal
        open={showAddModal}
        onClose={() => setShowAddModal(false)}
        title="Enrol new student"
        eyebrow="Principal admission & class allocation"
        size="lg"
        footer={
          <>
            <Button variant="secondary" onClick={() => setShowAddModal(false)}>Cancel</Button>
            <Button type="submit" form="add-student-form">Enrol student</Button>
          </>
        }
      >
        <form id="add-student-form" onSubmit={handleAddStudentSubmit} className="space-y-4">
          <FormField label="Target class for allocation" required>
            <CustomSelect options={classOptionsWithOccupancy} value={classId} onChange={setClassId} className="w-full" />
          </FormField>

          {(() => {
            const targetClass = classes.find((c) => c.id === classId);
            const teacher = teachers.find((t) => t.id === targetClass?.classTeacherId || t.userId === targetClass?.classTeacherId || t.employeeNo === targetClass?.classTeacherId);
            const teacherUser = users.find((u) => u.id === teacher?.userId || u.id === targetClass?.classTeacherId);
            const teacherName = teacherUser?.fullName || (teacher ? `${teacher.employeeNo}${teacher.subjectSpecialization ? ` (${teacher.subjectSpecialization})` : ''}` : 'Unassigned');
            return (
              <div className="bg-surface-muted border border-border p-3 rounded-xl text-sm flex items-center justify-between shadow-2xs">
                <span className="text-ink-muted font-medium">Assigned Class Teacher:</span>
                <span className="font-semibold text-ink">{teacherName}</span>
              </div>
            );
          })()}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <FormField label="Student ID / Admission No." required>
              <Input type="text" value={studentNo} onChange={(e) => setStudentNo(e.target.value)} required />
            </FormField>
            <FormField label="Date of birth" required>
              <DatePicker value={dateOfBirth} onChange={setDateOfBirth} required align="right" />
            </FormField>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <FormField label="First name" required>
              <Input type="text" value={firstName} onChange={(e) => setFirstName(e.target.value)} required />
            </FormField>
            <FormField label="Last name" required>
              <Input type="text" value={lastName} onChange={(e) => setLastName(e.target.value)} required />
            </FormField>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <FormField label="Guardian / Parent name">
              <Input
                type="text"
                placeholder="e.g. A. H. Mohammed"
                value={guardianName}
                onChange={(e) => setGuardianName(e.target.value)}
              />
            </FormField>
            <FormField label="Guardian WhatsApp / Phone" required>
              <Input
                type="tel"
                placeholder="e.g. 0771234567 or +9477..."
                value={guardianPhone}
                onChange={(e) => setGuardianPhone(e.target.value)}
                required
              />
            </FormField>
          </div>

          <FormField label="Enrolled Subjects (Categorized O/L & Core Curriculum)">
            <GroupedSubjectSelector
              subjects={subjects}
              selectedSubjectIds={enrolledSubjectIds}
              onChange={setEnrolledSubjectIds}
            />
          </FormField>

          <div className="flex items-start gap-3 p-3 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-emerald-900 dark:text-emerald-200 rounded-xl text-xs leading-relaxed">
            <Phone className="w-4 h-4 shrink-0 text-emerald-600 dark:text-emerald-400 mt-0.5" />
            <div>
              <span className="font-bold">Automated WhatsApp Timetable & Alerts:</span> Class weekly timetables and school announcements will be automatically dispatched to this guardian number.
            </div>
          </div>

          <p className="text-xs text-ink-muted bg-brand-tint/60 p-3 rounded-xl border border-brand/20">
            ℹ️ The class teacher will receive a notification to confirm this student into their roster.
          </p>
        </form>
      </Modal>

      {/* EDIT STUDENT MODAL */}
      <Modal
        open={Boolean(editingStudent)}
        onClose={() => setEditingStudent(null)}
        title="Edit student record"
        eyebrow={editingStudent ? `${editingStudent.studentNo} • ${editingStudent.firstName} ${editingStudent.lastName}` : 'Edit record'}
        size="lg"
        footer={
          <>
            <Button variant="secondary" onClick={() => setEditingStudent(null)}>Cancel</Button>
            <Button type="submit" form="edit-student-form" className="flex items-center gap-1.5">
              <Save className="w-4 h-4" /> Save changes
            </Button>
          </>
        }
      >
        {editingStudent && (
          <form id="edit-student-form" onSubmit={handleSaveEditStudent} className="space-y-4">
            <FormField label="Target class for allocation" required>
              <CustomSelect options={classOptionsWithOccupancy} value={editClassId} onChange={setEditClassId} className="w-full" />
            </FormField>

            {(() => {
              const targetClass = classes.find((c) => c.id === editClassId);
              const teacher = teachers.find((t) => t.id === targetClass?.classTeacherId || t.userId === targetClass?.classTeacherId || t.employeeNo === targetClass?.classTeacherId);
              const teacherUser = users.find((u) => u.id === teacher?.userId || u.id === targetClass?.classTeacherId);
              const teacherName = teacherUser?.fullName || (teacher ? `${teacher.employeeNo}${teacher.subjectSpecialization ? ` (${teacher.subjectSpecialization})` : ''}` : 'Unassigned');
              return (
                <div className="bg-surface-muted border border-border p-3 rounded-xl text-sm flex items-center justify-between shadow-2xs">
                  <span className="text-ink-muted font-medium">Assigned Class Teacher:</span>
                  <span className="font-semibold text-ink">{teacherName}</span>
                </div>
              );
            })()}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <FormField label="Student ID / Admission No." required>
                <Input type="text" value={editStudentNo} onChange={(e) => setEditStudentNo(e.target.value)} required />
              </FormField>
              <FormField label="Enrollment Status" required>
                <Select value={editStatus} onChange={(e) => setEditStatus(e.target.value as Student['status'])}>
                  <option value="active">Active</option>
                  <option value="pending_acceptance">Pending Acceptance</option>
                  <option value="transferred">Transferred</option>
                  <option value="graduated">Graduated</option>
                  <option value="withdrawn">Withdrawn</option>
                </Select>
              </FormField>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <FormField label="First name" required>
                <Input type="text" value={editFirstName} onChange={(e) => setEditFirstName(e.target.value)} required />
              </FormField>
              <FormField label="Last name" required>
                <Input type="text" value={editLastName} onChange={(e) => setEditLastName(e.target.value)} required />
              </FormField>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <FormField label="Date of birth" required>
                <DatePicker value={editDateOfBirth} onChange={setEditDateOfBirth} required align="right" />
              </FormField>
              <FormField label="Admission / Enrolled Date">
                <DatePicker value={editAdmissionDate} onChange={setEditAdmissionDate} align="right" />
              </FormField>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <FormField label="Guardian / Parent name">
                <Input
                  type="text"
                  placeholder="e.g. A. H. Mohammed"
                  value={editGuardianName}
                  onChange={(e) => setEditGuardianName(e.target.value)}
                />
              </FormField>
              <FormField label="Guardian WhatsApp / Phone" required>
                <Input
                  type="tel"
                  placeholder="e.g. 0771234567 or +9477..."
                  value={editGuardianPhone}
                  onChange={(e) => setEditGuardianPhone(e.target.value)}
                  required
                />
              </FormField>
            </div>

            <FormField label="Enrolled Subjects (Categorized O/L & Core Curriculum)">
              <GroupedSubjectSelector
                subjects={subjects}
                selectedSubjectIds={editEnrolledSubjectIds}
                onChange={setEditEnrolledSubjectIds}
              />
            </FormField>

            <div className="flex items-start gap-3 p-3 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-emerald-900 dark:text-emerald-200 rounded-xl text-xs leading-relaxed">
              <Phone className="w-4 h-4 shrink-0 text-emerald-600 dark:text-emerald-400 mt-0.5" />
              <div>
                <span className="font-bold">Automated WhatsApp Timetable & Alerts:</span> Class weekly timetables and school announcements will be automatically dispatched to this guardian number.
              </div>
            </div>
          </form>
        )}
      </Modal>

      {/* BULK IMPORT MODAL (real CSV parsing) */}
      <Modal
        open={showBulkModal}
        onClose={resetBulkImportModal}
        title="Bulk import students"
        eyebrow="CSV upload"
        footer={
          <>
            <Button variant="secondary" onClick={resetBulkImportModal}>Cancel</Button>
            <Button onClick={handleConfirmBulkImport} disabled={bulkImportRows.length === 0}>
              Import {bulkImportRows.length > 0 ? `${bulkImportRows.length} students` : ''}
            </Button>
          </>
        }
      >
        <p className="text-sm text-ink-muted">
          Upload a CSV with a header row. Required columns: <code className="font-mono-data text-xs bg-surface-muted px-1 py-0.5 rounded">firstName</code>, <code className="font-mono-data text-xs bg-surface-muted px-1 py-0.5 rounded">lastName</code>.
          Optional: <code className="font-mono-data text-xs bg-surface-muted px-1 py-0.5 rounded">studentNo</code>, <code className="font-mono-data text-xs bg-surface-muted px-1 py-0.5 rounded">dateOfBirth</code>, <code className="font-mono-data text-xs bg-surface-muted px-1 py-0.5 rounded">grade</code>, <code className="font-mono-data text-xs bg-surface-muted px-1 py-0.5 rounded">section</code>.
        </p>

        <input
          ref={fileInputRef}
          type="file"
          accept=".csv,text/csv"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) handleBulkFileSelected(file);
          }}
        />

        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          className="w-full border-2 border-dashed border-border hover:border-brand p-6 text-center rounded-xl bg-surface-muted transition-colors"
        >
          <Upload className="w-7 h-7 text-brand mx-auto mb-2" />
          <div className="font-semibold text-sm text-ink">{bulkImportFileName || 'Click to choose a CSV file'}</div>
          <div className="text-xs text-ink-faint mt-0.5">
            {bulkImportRows.length > 0 ? `${bulkImportRows.length} rows parsed` : '.csv files only'}
          </div>
        </button>

        {bulkImportError && (
          <div className="p-3 bg-danger-tint text-danger text-sm rounded-lg flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 shrink-0" /> {bulkImportError}
          </div>
        )}

        {bulkImportRows.length > 0 && (
          <div className="border border-border rounded-xl overflow-hidden max-h-64 overflow-y-auto">
            <Table>
              <THead>
                <tr><TH>Student ID</TH><TH>Name</TH><TH>DOB</TH><TH>Class</TH></tr>
              </THead>
              <TBody>
                {bulkImportRows.map((row, i) => (
                  <TR key={i}>
                    <TD className="font-mono-data text-xs">{row.studentNo || '(auto)'}</TD>
                    <TD className="font-semibold text-ink text-sm">{row.firstName} {row.lastName}</TD>
                    <TD className="font-mono-data text-xs">{row.dateOfBirth || '—'}</TD>
                    <TD className={row.classId ? 'text-ink text-sm' : 'text-warning text-sm'}>{row.resolvedClassLabel}</TD>
                  </TR>
                ))}
              </TBody>
            </Table>
          </div>
        )}
      </Modal>

      {/* CHANGE ENROLLMENT STATUS MODAL */}
      <Modal
        open={Boolean(statusChangeTarget)}
        onClose={() => setStatusChangeTarget(null)}
        title="Change enrollment status"
        footer={
          <>
            <Button variant="secondary" onClick={() => setStatusChangeTarget(null)}>Cancel</Button>
            <Button variant="danger" onClick={handleConfirmStatusChange}>Confirm status change</Button>
          </>
        }
      >
        <p className="text-sm text-ink-muted">
          {statusChangeTarget && statusChangeTarget.length > 1
            ? `Update ${statusChangeTarget.length} selected students to:`
            : 'This keeps the student\'s history and records intact — use permanent deletion (in the student profile) only for genuine duplicates or data-entry mistakes.'}
        </p>
        <FormField label="New status">
          <Select value={statusChangeValue} onChange={(e) => setStatusChangeValue(e.target.value as typeof statusChangeValue)}>
            <option value="withdrawn">Withdrawn</option>
            <option value="transferred">Transferred to another school</option>
            <option value="graduated">Graduated</option>
          </Select>
        </FormField>
      </Modal>

      {/* STUDENT PROFILE MODAL */}
      <Modal
        open={Boolean(selectedStudent)}
        onClose={() => setSelectedStudent(null)}
        title={selectedStudent ? `${selectedStudent.firstName} ${selectedStudent.lastName}` : ''}
        eyebrow={selectedStudent ? `${selectedStudent.studentNo} • ${selectedStudent.status}` : ''}
        footer={
          selectedStudent && (
            <>
              {isPrincipalOrAdmin && (
                <>
                  <Button
                    variant="secondary"
                    className="mr-auto text-brand hover:bg-brand-tint flex items-center gap-1.5"
                    onClick={() => {
                      const toEdit = selectedStudent;
                      setSelectedStudent(null);
                      handleStartEditStudent(toEdit);
                    }}
                  >
                    <Pencil className="w-3.5 h-3.5" /> Edit student details
                  </Button>
                  <Button variant="ghost" className="text-danger hover:bg-danger-tint" onClick={() => handlePermanentDelete(selectedStudent)}>
                    <Trash2 className="w-3.5 h-3.5" /> Permanently delete
                  </Button>
                </>
              )}
              <Button variant="secondary" onClick={() => setSelectedStudent(null)}>Close</Button>
            </>
          )
        }
      >
        {selectedStudent && (
          <>
            {isPrincipalOrAdmin && (
              <FormField label="Class allocation">
                <CustomSelect
                  options={classOptionsWithOccupancy}
                  value={selectedStudent.classId}
                  onChange={(val) => handleReassignClass(selectedStudent, val)}
                  className="w-full"
                />
              </FormField>
            )}

            <div className="grid grid-cols-2 gap-3 text-sm bg-surface-muted p-3 rounded-lg">
              <div><span className="text-ink-faint">DOB:</span> <span className="text-ink font-semibold">{selectedStudent.dateOfBirth}</span></div>
              <div><span className="text-ink-faint">Admitted:</span> <span className="text-ink font-semibold">{selectedStudent.admissionDate}</span></div>
            </div>

            <div>
              <h4 className="font-semibold text-sm text-ink mb-2">Registered Enrolled Subjects</h4>
              {(() => {
                const enrolled = (selectedStudent.enrolledSubjectIds && selectedStudent.enrolledSubjectIds.length > 0)
                  ? subjects.filter((s) => selectedStudent.enrolledSubjectIds?.includes(s.id))
                  : subjects;
                return (
                  <div className="p-3 bg-surface-muted border border-border rounded-xl space-y-2">
                    <div className="text-xs font-semibold text-ink-muted">
                      Total Enrolled Subjects: <span className="text-brand font-bold">{enrolled.length}</span>
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {enrolled.map((sub) => (
                        <span
                          key={sub.id}
                          className="px-2.5 py-1 bg-surface border border-border text-ink rounded-lg text-xs font-medium"
                        >
                          {sub.name} <span className="text-ink-faint text-[10px]">({sub.code})</span>
                        </span>
                      ))}
                    </div>
                  </div>
                );
              })()}
            </div>

            <div>
              <h4 className="font-semibold text-sm text-ink mb-2">Linked guardian contact</h4>
              {(() => {
                const linkedGuardians = guardians.filter((g) => selectedStudent.guardianIds.includes(g.id));
                const directPhone = selectedStudent.guardianPhone || selectedStudent.phone;
                const directName = selectedStudent.guardianName;

                if (linkedGuardians.length === 0 && !directPhone && !directName) {
                  return <p className="text-sm italic text-ink-faint">No guardian currently linked.</p>;
                }

                return (
                  <div className="space-y-2">
                    {directPhone && (
                      <div className="p-3 bg-emerald-50/70 border border-emerald-200 rounded-lg text-sm space-y-1">
                        <div className="flex items-center justify-between">
                          <span className="font-semibold text-emerald-950">
                            {directName || 'Primary Guardian'}
                          </span>
                          <span className="inline-flex items-center gap-1 text-[11px] font-medium text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-full">
                            WhatsApp Enabled
                          </span>
                        </div>
                        <div className="flex items-center gap-4 text-emerald-800 text-xs">
                          <span className="flex items-center gap-1 font-mono-data">
                            <Phone className="w-3 h-3 text-emerald-600" /> {directPhone}
                          </span>
                        </div>
                      </div>
                    )}
                    {linkedGuardians.map((g) => (
                      <div key={g.id} className="p-3 bg-surface-muted border border-border rounded-lg text-sm space-y-1">
                        <div className="font-semibold text-ink">{g.fullName} ({g.relationship})</div>
                        <div className="flex items-center gap-4 text-ink-muted text-xs">
                          <span className="flex items-center gap-1"><Phone className="w-3 h-3" /> {g.phone}</span>
                          <span className="flex items-center gap-1"><Mail className="w-3 h-3" /> {g.email}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                );
              })()}
            </div>

            {(() => {
              const stuReq = admissionRequests.find((a) => a.studentRoster?.some((r) => r.studentNo === selectedStudent.studentNo));
              const rosterItem = stuReq?.studentRoster?.find((r) => r.studentNo === selectedStudent.studentNo);
              const stuClass = classes.find((c) => c.id === selectedStudent.classId);

              return (
                <div className="p-3.5 bg-surface-muted border border-border rounded-xl space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="font-semibold text-sm text-ink flex items-center gap-1.5">
                      <GraduationCap className="w-4 h-4 text-brand" /> Examination admission status
                    </div>
                    <Badge tone={stuReq?.signedByPrincipal ? 'success' : stuReq ? 'warning' : 'neutral'}>
                      {stuReq?.signedByPrincipal ? 'Signed & issued' : stuReq ? 'Pending sign-off' : 'Not requested'}
                    </Badge>
                  </div>

                  {rosterItem ? (
                    <div className="flex items-center justify-between text-sm pt-1">
                      <div>
                        <div className="text-ink font-semibold text-xs">{stuReq?.examTerm || '2026 Term 1 Final Examinations'}</div>
                        <div className="text-xs text-ink-muted">
                          Attendance: <strong className={rosterItem.isEligible ? 'text-success' : 'text-danger'}>{rosterItem.attendancePercentage}%</strong>
                        </div>
                      </div>
                      {rosterItem.isEligible && (
                        <Button
                          size="sm"
                          onClick={() =>
                            setViewingExamPass({
                              studentNo: selectedStudent.studentNo,
                              studentName: `${selectedStudent.firstName} ${selectedStudent.lastName}`,
                              className: stuClass ? `${stuClass.grade} - Section ${stuClass.section}` : 'Grade 9 - Section A',
                              examTerm: stuReq?.examTerm || '2026 Term 1 Final Examinations',
                              attendancePercentage: rosterItem.attendancePercentage,
                              principalName: stuReq?.principalName || schoolProfile?.principalName || 'Principal',
                            })
                          }
                        >
                          View signed hall pass
                        </Button>
                      )}
                    </div>
                  ) : (
                    <p className="text-xs text-ink-muted">No exam admission ticket currently issued for student.</p>
                  )}
                </div>
              );
            })()}
          </>
        )}
      </Modal>

      {/* FULL STUDENT ADMISSION DOSSIER MODAL */}
      <Modal
        open={Boolean(viewingAdmissionDossier)}
        onClose={() => setViewingAdmissionDossier(null)}
        eyebrow={schoolProfile?.schoolName || 'Your School'}
        title={viewingAdmissionDossier ? `Official student admission dossier #${viewingAdmissionDossier.id}` : ''}
        size="lg"
        footer={
          viewingAdmissionDossier && (
            <>
              <Button variant="secondary" onClick={() => setViewingAdmissionDossier(null)}>Close dossier</Button>
              {viewingAdmissionDossier.status === 'pending' && isPrincipalOrAdmin && (
                <>
                  <Button variant="danger" onClick={() => { approveAdmissionRequest(viewingAdmissionDossier.id, 'rejected'); setViewingAdmissionDossier(null); }}>
                    <XCircle className="w-3.5 h-3.5" /> Decline request
                  </Button>
                  <Button variant="success" onClick={() => { approveAdmissionRequest(viewingAdmissionDossier.id, 'approved'); setViewingAdmissionDossier(null); }}>
                    <CheckCircle className="w-3.5 h-3.5" />
                    {viewingAdmissionDossier.type === 'exam_admission' ? 'Sign & issue hall passes' : 'Sign & grant admission'}
                  </Button>
                </>
              )}
            </>
          )
        }
      >
        {viewingAdmissionDossier && (
          <>
            <div className="p-3.5 bg-surface-muted rounded-xl space-y-2">
              <div className="flex justify-between items-center border-b border-border pb-2">
                <div>
                  <div className="font-display font-semibold text-sm text-ink">{viewingAdmissionDossier.studentName}</div>
                  <div className="text-xs text-ink-faint">
                    {viewingAdmissionDossier.type === 'exam_admission' ? viewingAdmissionDossier.examTerm : `Applying for: ${viewingAdmissionDossier.gradeApplying}`}
                  </div>
                </div>
                <Badge tone={viewingAdmissionDossier.status === 'approved' ? 'success' : viewingAdmissionDossier.status === 'rejected' ? 'danger' : 'warning'}>
                  {viewingAdmissionDossier.status}
                </Badge>
              </div>
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div>
                  <span className="text-ink-faint block text-xs uppercase">{viewingAdmissionDossier.type === 'exam_admission' ? 'Class & section' : 'Previous school'}</span>
                  <span className="font-semibold text-ink">{viewingAdmissionDossier.type === 'exam_admission' ? viewingAdmissionDossier.className : viewingAdmissionDossier.previousSchool}</span>
                </div>
                <div>
                  <span className="text-ink-faint block text-xs uppercase">Class teacher submitter</span>
                  <span className="font-semibold text-ink">{viewingAdmissionDossier.classTeacherName || viewingAdmissionDossier.submittedByTeacherName || 'Class teacher'}</span>
                </div>
              </div>
            </div>

            {viewingAdmissionDossier.type === 'exam_admission' ? (
              <div className="space-y-2 border border-border rounded-xl p-3.5">
                <div className="flex justify-between items-center border-b border-border pb-2 flex-wrap gap-2">
                  <h4 className="font-semibold text-xs uppercase text-ink flex items-center gap-1">
                    <FileText className="w-3.5 h-3.5 text-brand" /> Class attendance & exam eligibility register (≥80% rule)
                  </h4>
                  <div className="flex items-center gap-2">
                    {viewingAdmissionDossier.status === 'approved' && ['teacher', 'principal', 'admin'].includes(activeRole) && (
                      <Button
                        size="sm"
                        onClick={() => {
                          issueAllPasses(viewingAdmissionDossier.id);
                          setViewingAdmissionDossier({
                            ...viewingAdmissionDossier,
                            studentRoster: (viewingAdmissionDossier.studentRoster || []).map((s) => (s.isEligible ? { ...s, isIssuedToStudent: true, issuedAt: new Date().toISOString() } : s)),
                          });
                        }}
                      >
                        Issue all passes to class
                      </Button>
                    )}
                    <Badge tone="success">{viewingAdmissionDossier.eligibleStudentCount} / {viewingAdmissionDossier.totalClassStudents} eligible</Badge>
                  </div>
                </div>

                <div className="space-y-1.5 max-h-56 overflow-y-auto pr-1">
                  {(viewingAdmissionDossier.studentRoster || []).map((s) => (
                    <div key={s.studentNo} className={`p-2 rounded-lg border text-xs flex items-center justify-between gap-2 ${s.isEligible ? 'bg-surface-muted border-border' : 'bg-danger-tint border-danger/30'}`}>
                      <div>
                        <div className="font-semibold text-ink text-xs flex items-center gap-1.5">
                          <span className="font-mono-data">{s.studentNo}</span>
                          <span>{s.studentName}</span>
                          {s.isIssuedToStudent && <Badge tone="success">Issued</Badge>}
                        </div>
                        <div className="text-ink-faint">
                          Attendance: <strong className={s.isEligible ? 'text-success' : 'text-danger'}>{s.attendancePercentage}%</strong> • {s.remarks}
                        </div>
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        {viewingAdmissionDossier.status === 'pending' && (
                          s.isEligible ? (
                            <button onClick={() => updateStudentExamEligibility(viewingAdmissionDossier.id, s.studentNo, false)} className="px-2 py-1 bg-danger-tint text-danger rounded-md text-xs font-semibold hover:bg-danger hover:text-white transition-colors">Deny ticket</button>
                          ) : (
                            <button onClick={() => updateStudentExamEligibility(viewingAdmissionDossier.id, s.studentNo, true)} className="px-2 py-1 bg-success-tint text-success rounded-md text-xs font-semibold hover:bg-success hover:text-white transition-colors">Grant ticket</button>
                          )
                        )}
                        {s.isEligible && viewingAdmissionDossier.status === 'approved' && !s.isIssuedToStudent && (
                          <button
                            onClick={() => {
                              issueStudentPass(viewingAdmissionDossier.id, s.studentNo);
                              setViewingAdmissionDossier({
                                ...viewingAdmissionDossier,
                                studentRoster: (viewingAdmissionDossier.studentRoster || []).map((st) => (st.studentNo === s.studentNo ? { ...st, isIssuedToStudent: true, issuedAt: new Date().toISOString() } : st)),
                              });
                            }}
                            className="px-2 py-1 bg-brand text-white rounded-md text-xs font-semibold hover:bg-brand-hover transition-colors"
                          >
                            Issue pass
                          </button>
                        )}
                        {s.isEligible && (
                          <button
                            onClick={() =>
                              setViewingExamPass({
                                studentNo: s.studentNo,
                                studentName: s.studentName,
                                className: viewingAdmissionDossier.className || 'Grade 9 - Section A',
                                examTerm: viewingAdmissionDossier.examTerm || '2026 Term 1 Final Examinations',
                                attendancePercentage: s.attendancePercentage,
                                principalName: viewingAdmissionDossier.principalName || schoolProfile?.principalName || 'Principal',
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
                  Sri Lanka Ministry regulation: minimum 80% attendance required for examination hall pass.
                </div>
              </div>
            ) : (
              <div className="space-y-2 border border-border rounded-xl p-3.5">
                <h4 className="font-semibold text-xs uppercase text-ink border-b border-border pb-1.5 flex items-center gap-1">
                  <FileText className="w-3.5 h-3.5 text-brand" /> Parent / guardian & verification summary
                </h4>
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div><span className="text-ink-faint block text-xs uppercase">Guardian full name</span><span className="font-semibold text-ink">{viewingAdmissionDossier.guardianName}</span></div>
                  <div><span className="text-ink-faint block text-xs uppercase">Contact phone</span><span className="font-semibold text-ink">{viewingAdmissionDossier.contactNo}</span></div>
                  <div><span className="text-ink-faint block text-xs uppercase">Academic transcript</span><span className="font-semibold text-success">✓ Ministry verified grade pass</span></div>
                  <div><span className="text-ink-faint block text-xs uppercase">Character certificate</span><span className="font-semibold text-success">✓ Valid & approved</span></div>
                </div>
                <div className="flex items-center justify-between p-2 bg-brand-tint rounded-lg text-sm mt-2">
                  <div className="flex items-center gap-1.5 text-ink font-semibold"><Paperclip className="w-3.5 h-3.5 text-brand" /><span>Zonal_Transfer_Clearance_Certificate.pdf</span></div>
                  <Badge tone="brand">Official clearance</Badge>
                </div>
              </div>
            )}
          </>
        )}
      </Modal>

      {/* NEW ADMISSION REQUISITION MODAL */}
      <Modal
        open={showAdmissionModal}
        onClose={() => setShowAdmissionModal(false)}
        title="Submit admission requisition to principal"
        eyebrow="Official ministry requisition portal"
        size="lg"
      >
        <div className="inline-flex items-center gap-1 p-1 bg-surface-muted border border-border rounded-xl w-full">
          <button
            type="button"
            onClick={() => setAdmissionModalType('exam_admission')}
            className={`flex-1 py-1.5 px-3 rounded-lg text-sm font-semibold flex items-center justify-center gap-1.5 transition-colors ${admissionModalType === 'exam_admission' ? 'bg-surface text-ink shadow-xs' : 'text-ink-muted hover:text-ink'}`}
          >
            <GraduationCap className="w-3.5 h-3.5" /> Term exam admission cards
          </button>
          <button
            type="button"
            onClick={() => setAdmissionModalType('school_admission')}
            className={`flex-1 py-1.5 px-3 rounded-lg text-sm font-semibold flex items-center justify-center gap-1.5 transition-colors ${admissionModalType === 'school_admission' ? 'bg-surface text-ink shadow-xs' : 'text-ink-muted hover:text-ink'}`}
          >
            <UserPlus className="w-3.5 h-3.5" /> New student enrolment
          </button>
        </div>

        {admissionModalType === 'exam_admission' ? (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (!examRosterPreview || examRosterPreview.length === 0) {
                alert('Click "Preview attendance roster" first to compute the real roster before submitting.');
                return;
              }
              const targetClassObj = classes.find((c) => c.id === examClassSelect) || classes[0];
              const classNameStr = `${targetClassObj.grade} - Section ${targetClassObj.section}`;
              const classTeacherRecord = teachers.find((t) => t.id === targetClassObj.classTeacherId || t.userId === targetClassObj.classTeacherId || t.employeeNo === targetClassObj.classTeacherId);
              const classTeacherUser = users.find((u) => u.id === classTeacherRecord?.userId || u.id === targetClassObj.classTeacherId);
              const classTeacherName = classTeacherUser?.fullName || (classTeacherRecord ? `${classTeacherRecord.employeeNo}${classTeacherRecord.subjectSpecialization ? ` (${classTeacherRecord.subjectSpecialization})` : ''}` : currentUser?.fullName || 'Class Teacher');
              const eligible = examRosterPreview.filter((s) => s.isEligible).length;
              const flagged = examRosterPreview.length - eligible;

              addAdmissionRequest({
                studentName: `${classNameStr} — Exam batch (${examRosterPreview.length} students)`,
                gradeApplying: classNameStr,
                guardianName: `Class Teacher: ${classTeacherName}`,
                contactNo: classTeacherUser?.phone || currentUser?.phone || '',
                previousSchool: examTermName,
                type: 'exam_admission',
                examTerm: examTermName,
                className: classNameStr,
                classTeacherName,
                totalClassStudents: examRosterPreview.length,
                eligibleStudentCount: eligible,
                flaggedStudentCount: flagged,
                studentRoster: examRosterPreview,
              });
              setShowAdmissionModal(false);
              setExamRosterPreview(null);
              setExamNotes('');
            }}
            className="space-y-3.5"
          >
            <p className="text-sm text-ink-muted bg-brand-tint p-3 rounded-lg">
              Select a class and attendance cut-off, then click <strong className="text-ink">Preview roster</strong> to
              compute real attendance from recorded data. Students ≥{examMinAttendance}% are automatically eligible.
            </p>

            <div className="grid grid-cols-2 gap-3">
              <FormField label="Class & section" required>
                <Select value={examClassSelect} onChange={(e) => { setExamClassSelect(e.target.value); setExamRosterPreview(null); }}>
                  {classes.map((cls) => (<option key={cls.id} value={cls.id}>{cls.grade} - Section {cls.section}</option>))}
                </Select>
              </FormField>
              <FormField label="Min. attendance cut-off" required>
                <Select value={examMinAttendance} onChange={(e) => { setExamMinAttendance(Number(e.target.value)); setExamRosterPreview(null); }}>
                  <option value={80}>80% — Standard ministry rule</option>
                  <option value={75}>75% — Special clearance</option>
                  <option value={70}>70% — Medical / compassionate waiver</option>
                </Select>
              </FormField>
            </div>

            <FormField label="Examination term name" required>
              <Input type="text" value={examTermName} onChange={(e) => setExamTermName(e.target.value)} placeholder="e.g. 2026 Term 1 Final Examinations" required />
            </FormField>

            <FormField label="Class teacher remarks / notes">
              <Textarea value={examNotes} onChange={(e) => setExamNotes(e.target.value)} rows={2} placeholder="Optional remarks for principal review..." />
            </FormField>

            <Button
              type="button"
              variant="secondary"
              className="w-full justify-center"
              onClick={() => {
                setExamPreviewLoading(true);
                setTimeout(() => {
                  const roster = computeExamRoster(examClassSelect, examMinAttendance);
                  setExamRosterPreview(roster || []);
                  setExamPreviewLoading(false);
                }, 200);
              }}
            >
              <Eye className="w-4 h-4" /> {examPreviewLoading ? 'Computing roster...' : 'Preview attendance roster from real data'}
            </Button>

            {examRosterPreview !== null && (
              <div className="border border-border rounded-xl overflow-hidden">
                <div className="px-3 py-2 bg-surface-muted border-b border-border flex justify-between items-center text-xs font-semibold text-ink">
                  <span>Live attendance roster — {examRosterPreview.length} students</span>
                  <span>
                    <span className="text-success">{examRosterPreview.filter((s) => s.isEligible).length} eligible</span>
                    {' · '}
                    <span className="text-danger">{examRosterPreview.filter((s) => !s.isEligible).length} flagged</span>
                  </span>
                </div>
                <div className="max-h-52 overflow-y-auto divide-y divide-border">
                  {examRosterPreview.map((s) => (
                    <div key={s.studentNo} className={`px-3 py-1.5 flex items-center justify-between text-xs ${s.isEligible ? '' : 'bg-danger-tint'}`}>
                      <div><span className="font-mono-data font-semibold text-ink">{s.studentNo}</span><span className="ml-2 text-ink">{s.studentName}</span></div>
                      <div className="flex items-center gap-2 shrink-0">
                        <span className={`font-semibold ${s.isEligible ? 'text-success' : 'text-danger'}`}>{s.attendancePercentage}%</span>
                        <Badge tone={s.isEligible ? 'success' : 'danger'}>{s.isEligible ? 'Eligible' : 'Flagged'}</Badge>
                      </div>
                    </div>
                  ))}
                  {examRosterPreview.length === 0 && (
                    <div className="px-4 py-6 text-center text-sm text-ink-muted">No active students found in this class — check class assignments in the directory.</div>
                  )}
                </div>
              </div>
            )}

            <div className="flex justify-end gap-2 pt-2 border-t border-border">
              <Button type="button" variant="secondary" onClick={() => { setShowAdmissionModal(false); setExamRosterPreview(null); }}>Cancel</Button>
              <Button type="submit" disabled={!examRosterPreview || examRosterPreview.length === 0}>
                <CheckCircle className="w-3.5 h-3.5" /> Submit exam batch to principal
              </Button>
            </div>
          </form>
        ) : (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              addAdmissionRequest({
                studentName: admStudentName,
                gradeApplying: admGrade,
                guardianName: admGuardian || 'Not Specified',
                contactNo: admContact || '+94 77 000 0000',
                previousSchool: admPrevSchool || 'Local Zonal School',
                type: 'school_admission',
              });
              setShowAdmissionModal(false);
              setAdmStudentName('');
              setAdmGuardian('');
              setAdmContact('');
              setAdmPrevSchool('');
            }}
            className="space-y-3.5"
          >
            <FormField label="Student full name" required>
              <Input type="text" value={admStudentName} onChange={(e) => setAdmStudentName(e.target.value)} placeholder="e.g. Ruwan Pathirana" required />
            </FormField>
            <div className="grid grid-cols-2 gap-3">
              <FormField label="Target grade" required>
                <Select value={admGrade} onChange={(e) => setAdmGrade(e.target.value)}>
                  {['Grade 6', 'Grade 7', 'Grade 8', 'Grade 9', 'Grade 10', 'Grade 11'].map((g) => (<option key={g} value={g}>{g}</option>))}
                </Select>
              </FormField>
              <FormField label="Guardian phone">
                <Input type="text" value={admContact} onChange={(e) => setAdmContact(e.target.value)} placeholder="+94 77 123 4567" />
              </FormField>
            </div>
            <FormField label="Guardian / parent full name">
              <Input type="text" value={admGuardian} onChange={(e) => setAdmGuardian(e.target.value)} placeholder="Parent / guardian name" />
            </FormField>
            <FormField label="Previous school attended">
              <Input type="text" value={admPrevSchool} onChange={(e) => setAdmPrevSchool(e.target.value)} placeholder="e.g. Mahanama College Colombo" />
            </FormField>
            <div className="flex justify-end gap-2 pt-2 border-t border-border">
              <Button type="button" variant="secondary" onClick={() => setShowAdmissionModal(false)}>Cancel</Button>
              <Button type="submit">Submit for principal sign-off</Button>
            </div>
          </form>
        )}
      </Modal>

      {/* PRINTABLE EXAMINATION HALL PASS MODAL */}
      <Modal
        open={Boolean(viewingExamPass)}
        onClose={() => setViewingExamPass(null)}
        title="Examination admission ticket (hall pass)"
        eyebrow={viewingExamPass ? `${schoolProfile?.schoolName || 'Your School'} • Card #${viewingExamPass.studentNo}` : ''}
        size="lg"
        footer={
          <>
            <Button variant="secondary" onClick={() => setViewingExamPass(null)}>Close pass</Button>
            <Button onClick={() => window.print()}>Print exam admission ticket</Button>
          </>
        }
      >
        {viewingExamPass && (
          <>
            <div className="text-center"><Badge tone="accent">{viewingExamPass.examTerm}</Badge></div>

            <div className="grid grid-cols-2 gap-3 bg-surface-muted p-3.5 rounded-xl">
              <div><span className="text-ink-faint block text-xs uppercase">Candidate name</span><span className="font-display font-semibold text-ink text-sm">{viewingExamPass.studentName}</span></div>
              <div><span className="text-ink-faint block text-xs uppercase">Index / reg number</span><span className="font-mono-data font-semibold text-ink">{viewingExamPass.studentNo}</span></div>
              <div><span className="text-ink-faint block text-xs uppercase">Class & section</span><span className="font-semibold text-ink">{viewingExamPass.className}</span></div>
              <div><span className="text-ink-faint block text-xs uppercase">Verified attendance</span><span className="font-semibold text-success">✓ {viewingExamPass.attendancePercentage}% (eligible)</span></div>
            </div>

            <div className="space-y-1.5 border border-border rounded-xl p-3.5">
              <div className="font-semibold text-ink text-xs border-b border-border pb-1.5 flex justify-between"><span>Authorized examination subjects</span><span>Status</span></div>
              {(() => {
                const targetClass = classes.find((c) => `${c.grade} - Section ${c.section}` === viewingExamPass.className || c.id === viewingExamPass.classId);
                const classAssignments = targetClass ? teachingAssignments.filter((ta) => ta.classId === targetClass.id) : [];
                const assignedSubjectIds = new Set(classAssignments.map((ta) => ta.subjectId));
                const passSubjects = assignedSubjectIds.size > 0 ? subjects.filter((sub) => assignedSubjectIds.has(sub.id)) : subjects.slice(0, 6);
                return (
                  <div className="space-y-1.5 text-xs max-h-36 overflow-y-auto pr-1">
                    {passSubjects.map((sub) => (
                      <div key={sub.id} className="flex justify-between items-center py-1 border-b border-border/60">
                        <span className="font-semibold text-ink">{sub.code} — {sub.name}</span>
                        <Badge tone="success">Granted</Badge>
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
                <Badge tone="success">Official principal seal applied</Badge>
              </div>
              <div className="text-right space-y-1">
                <div className="bg-ink text-white font-mono-data text-xs font-bold px-2 py-1 rounded tracking-widest">||||| | |||| ||| ||||</div>
                <div className="text-xs text-ink-faint">Validated hall pass</div>
              </div>
            </div>
          </>
        )}
      </Modal>
    </div>
  );
};
