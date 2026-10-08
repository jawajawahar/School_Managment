import React, { useState } from 'react';
import { GraduationCap, BookOpen, Layers, Plus, UserCheck, Shield, Crown, BookCheck, Phone, Mail, AlertTriangle, Calendar, ChevronLeft, ChevronRight, Pencil, Trash2, Save, X, LayoutGrid, List } from 'lucide-react';
import { useData } from '../../context/DataContext';
import { CustomSelect } from '../common/CustomSelect';
import { TimetableModule } from './TimetableModule';
import { Subject, SubjectCategory } from '../../types';
import { CORE_SUBJECT_IDS } from '../../services/academicRules';
import { PageHeader } from '../ui/PageHeader';
import { Tabs } from '../ui/Tabs';
import { Badge } from '../ui/Badge';
import { Button } from '../ui/Button';
import { Card, CardHeader, CardTitle } from '../ui/Card';
import { Modal } from '../ui/Modal';
import { FormField, Input } from '../ui/FormField';
import { EmptyState } from '../ui/EmptyState';
import { Table, THead, TH, TBody, TR, TD } from '../ui/Table';
import { IconTile } from '../ui/IconTile';

type AcademicTab = 'overview' | 'teachers' | 'subjects' | 'ol-basket';

export const AcademicModule: React.FC = () => {
  const {
    classes,
    subjects,
    teachers,
    users,
    activeRole,
    currentUser,
    assignedClassId,
    teachingAssignments,
    timetableSlots,
    assignClassTeacher,
    assignSubjectTeacher,
    addSubject,
    updateSubject,
    deleteSubject,
    addClass,
    updateClass,
    deleteClass,
  } = useData();

  const [activeTab, setActiveTab] = useState<AcademicTab>('overview');
  const [overviewViewMode, setOverviewViewMode] = useState<'table' | 'cards'>('table');
  const [selectedClassId, setSelectedClassId] = useState<string>(assignedClassId || 'class-9a');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [viewingTimetableClassId, setViewingTimetableClassId] = useState<string | null>(null);
  const [teacherMeterPage, setTeacherMeterPage] = useState<number>(1);

  // Editing state for Subject Catalogue
  const [editingSubjectId, setEditingSubjectId] = useState<string | null>(null);
  const [editSubjectCode, setEditSubjectCode] = useState<string>('');
  const [editSubjectName, setEditSubjectName] = useState<string>('');
  const [editSubjectGradeLevel, setEditSubjectGradeLevel] = useState<string>('');
  const [editSubjectPeriods, setEditSubjectPeriods] = useState<number>(5);
  const [editSubjectCategory, setEditSubjectCategory] = useState<SubjectCategory | ''>('');

  // Add New Subject Modal state
  const [showAddSubjectModal, setShowAddSubjectModal] = useState<boolean>(false);
  const [newSubjectCode, setNewSubjectCode] = useState<string>('');
  const [newSubjectName, setNewSubjectName] = useState<string>('');
  const [newSubjectGradeLevel, setNewSubjectGradeLevel] = useState<string>('Grades 6-11');
  const [newSubjectPeriods, setNewSubjectPeriods] = useState<number>(5);
  const [newSubjectCategory, setNewSubjectCategory] = useState<SubjectCategory | ''>('general');

  // Add / Edit Class Modal state
  const [showClassModal, setShowClassModal] = useState<boolean>(false);
  const [editingClassId, setEditingClassId] = useState<string | null>(null);
  const [classGrade, setClassGrade] = useState<string>('Grade 1');
  const [classSection, setClassSection] = useState<string>('A');
  const [classAcademicYear, setClassAcademicYear] = useState<number>(new Date().getFullYear());
  const [classCapacity, setClassCapacity] = useState<number>(35);
  const [classError, setClassError] = useState<string | null>(null);

  const categoryOptions: { value: SubjectCategory | ''; label: string }[] = [
    { value: 'general', label: 'General (not part of O/L basket)' },
    { value: 'compulsory', label: 'O/L compulsory core' },
    { value: 'category_1', label: 'O/L Category I elective' },
    { value: 'category_2', label: 'O/L Category II elective' },
    { value: 'category_3', label: 'O/L Category III elective' },
  ];

  const handleStartEditSubject = (sub: Subject) => {
    setEditingSubjectId(sub.id);
    setEditSubjectCode(sub.code);
    setEditSubjectName(sub.name);
    setEditSubjectGradeLevel(sub.gradeLevel);
    setEditSubjectPeriods(sub.periodsPerWeek);
    setEditSubjectCategory(sub.category || 'general');
  };

  const handleSaveEditSubject = (id: string) => {
    if (!editSubjectCode.trim() || !editSubjectName.trim()) {
      setErrorMessage('Subject code and title cannot be empty.');
      return;
    }
    updateSubject({
      id,
      code: editSubjectCode.trim().toUpperCase(),
      name: editSubjectName.trim(),
      gradeLevel: editSubjectGradeLevel.trim(),
      periodsPerWeek: Number(editSubjectPeriods) || 1,
      category: editSubjectCategory || 'general',
    });
    setEditingSubjectId(null);
  };

  const handleCreateSubject = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSubjectCode.trim() || !newSubjectName.trim()) {
      setErrorMessage('Subject code and title are required.');
      return;
    }
    addSubject({
      code: newSubjectCode.trim().toUpperCase(),
      name: newSubjectName.trim(),
      gradeLevel: newSubjectGradeLevel.trim(),
      periodsPerWeek: Number(newSubjectPeriods) || 1,
      category: newSubjectCategory || 'general',
    });
    setNewSubjectCode('');
    setNewSubjectName('');
    setNewSubjectGradeLevel('Grades 6-11');
    setNewSubjectPeriods(5);
    setNewSubjectCategory('general');
    setShowAddSubjectModal(false);
  };

  const isPrincipalOrAdmin = ['principal', 'vice_principal', 'admin'].includes(activeRole);
  const currentTeacherObj = teachers.find((t) => t.userId === currentUser?.id || t.id === currentUser?.id);
  const myAssignedClasses = classes.filter((c) => c.classTeacherId === currentTeacherObj?.id || c.classTeacherId === currentTeacherObj?.userId || c.classTeacherId === currentTeacherObj?.employeeNo);
  const isAssignedCT = myAssignedClasses.length > 0;

  const selectedClass = classes.find((c) => c.id === selectedClassId) || classes[0];
  const currentClassTeacher = teachers.find((t) => t.id === selectedClass?.classTeacherId || t.userId === selectedClass?.classTeacherId || t.employeeNo === selectedClass?.classTeacherId);
  const currentClassTeacherUser = users.find((u) => u.id === currentClassTeacher?.userId || u.id === selectedClass?.classTeacherId);
  const currentClassTeacherDisplayName = currentClassTeacherUser?.fullName || (currentClassTeacher ? `${currentClassTeacher.employeeNo}${currentClassTeacher.subjectSpecialization ? ` (${currentClassTeacher.subjectSpecialization})` : ''}` : 'Not assigned');

  // Core subject list used for the per-class teacher allocation table.
  // Resolved from the live subjects catalogue (by the shared CORE_SUBJECT_IDS
  // list) so edits to a subject's name/code stay in sync everywhere.
  // NOTE: this fixed 9-subject list mirrors the Grade 10-11 G.C.E. O/L basket
  // rule but is applied to every grade class here — a known data-model
  // limitation flagged for a future pass, not fixed in this redesign.
  const core9Subjects = CORE_SUBJECT_IDS
    .map((id) => subjects.find((s) => s.id === id))
    .filter((s): s is Subject => Boolean(s));

  const getTeacherSubjectCount = (teacherId: string) =>
    teachingAssignments.filter((ta) => ta.teacherId === teacherId).length;

  const handleTeacherAssignmentChange = (classId: string, subjectId: string, teacherId: string) => {
    setErrorMessage(null);
    const res = assignSubjectTeacher(classId, subjectId, teacherId);
    if (res && res.success === false && res.error) {
      setErrorMessage(res.error);
    }
  };

  const gradeOptions = [
    'Grade 1', 'Grade 2', 'Grade 3', 'Grade 4', 'Grade 5', 'Grade 6', 'Grade 7',
    'Grade 8', 'Grade 9', 'Grade 10', 'Grade 11',
  ];

  const handleOpenCreateClass = () => {
    setEditingClassId(null);
    setClassGrade('Grade 1');
    setClassSection('A');
    setClassAcademicYear(new Date().getFullYear());
    setClassCapacity(35);
    setClassError(null);
    setShowClassModal(true);
  };

  const handleOpenEditClass = (cls: (typeof classes)[number]) => {
    setEditingClassId(cls.id);
    setClassGrade(cls.grade);
    setClassSection(cls.section);
    setClassAcademicYear(cls.academicYear);
    setClassCapacity(cls.capacity);
    setClassError(null);
    setShowClassModal(true);
  };

  const handleSubmitClass = (e: React.FormEvent) => {
    e.preventDefault();
    const duplicate = classes.find(
      (c) =>
        c.id !== editingClassId &&
        c.grade === classGrade &&
        c.section.trim().toUpperCase() === classSection.trim().toUpperCase() &&
        c.academicYear === classAcademicYear
    );
    if (duplicate) {
      setClassError(`${classGrade} - Section ${classSection.toUpperCase()} already exists for ${classAcademicYear}.`);
      return;
    }
    if (editingClassId) {
      const existing = classes.find((c) => c.id === editingClassId);
      if (existing) {
        updateClass({ ...existing, grade: classGrade, section: classSection.trim().toUpperCase(), academicYear: classAcademicYear, capacity: Number(classCapacity) || 1 });
      }
    } else {
      addClass({ grade: classGrade, section: classSection.trim().toUpperCase(), academicYear: classAcademicYear, capacity: Number(classCapacity) || 1, classTeacherId: '' });
    }
    setShowClassModal(false);
  };

  const handleDeleteClass = (cls: (typeof classes)[number]) => {
    if (window.confirm(`Delete ${cls.grade} - Section ${cls.section}? This is only safe if no students, timetable slots, or subject-teacher allocations reference it yet.`)) {
      deleteClass(cls.id);
    }
  };

  const overviewLabel = isPrincipalOrAdmin
    ? `Class overview (${classes.length})`
    : isAssignedCT
    ? `My class (${myAssignedClasses[0]?.grade})`
    : 'Classroom roster';

  return (
    <div className="space-y-6 animate-fade-in">
      <PageHeader
        eyebrow={<Badge tone="brand">Academic structure • Grades 1 to 11</Badge>}
        title="Subject teacher allocations"
        description="Assign class teachers and subject teachers across all grade classes."
        actions={
          <Tabs
            value={activeTab}
            onChange={setActiveTab}
            options={[
              { id: 'overview', label: overviewLabel, icon: GraduationCap },
              { id: 'teachers', label: 'Subject teachers', icon: BookCheck },
              { id: 'subjects', label: `All subjects (${subjects.length})`, icon: BookOpen },
              { id: 'ol-basket', label: 'O/L basket structure', icon: Layers },
            ]}
          />
        }
      />

      {errorMessage && (
        <div className="bg-danger-tint border border-danger/30 p-4 rounded-xl flex items-center justify-between gap-3 text-sm text-danger">
          <div className="flex items-center gap-2 font-semibold">
            <AlertTriangle className="w-4 h-4 shrink-0" />
            <span>{errorMessage}</span>
          </div>
          <Button size="sm" variant="danger" onClick={() => setErrorMessage(null)}>Dismiss</Button>
        </div>
      )}

      {/* SUBJECT TEACHERS TAB */}
      {activeTab === 'teachers' && (
        <div className="space-y-6">
          <Card>
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <span className="text-xs font-semibold text-ink-muted uppercase whitespace-nowrap">Class</span>
                <CustomSelect
                  options={(isPrincipalOrAdmin
                    ? classes
                    : classes.filter((c) => c.id === assignedClassId || c.classTeacherId === teachers.find((t) => t.userId === currentUser?.id)?.id)
                  ).map((c) => ({
                    value: c.id,
                    label: `${c.grade} - Section ${c.section} (AY ${c.academicYear})`,
                  }))}
                  value={selectedClassId}
                  onChange={setSelectedClassId}
                  disabled={activeRole === 'teacher'}
                />
              </div>

              <div className="flex items-center gap-3">
                <div className="bg-surface-muted border border-border px-3.5 py-2 rounded-lg text-sm text-ink flex items-center gap-2">
                  <Crown className="w-3.5 h-3.5 text-brand shrink-0" />
                  <span className="text-ink-muted">Class teacher:</span>
                  <strong className="font-semibold">{currentClassTeacherDisplayName}</strong>
                </div>
                <Button variant="secondary" onClick={() => setViewingTimetableClassId(selectedClassId)}>
                  <Calendar className="w-4 h-4" /> View timetable
                </Button>
              </div>
            </div>
          </Card>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Subject Teacher Allocation Table */}
            <Card padded={false} className="lg:col-span-2">
              <div className="px-6 py-3.5 border-b border-border flex justify-between items-center">
                <span className="font-semibold text-sm text-ink">
                  Subject teacher allocations • {selectedClass?.grade} ({selectedClass?.section})
                </span>
                <span className="text-xs text-ink-muted">Rule: min 1, max 3 subjects per teacher</span>
              </div>

              <Table>
                <THead>
                  <tr>
                    <TH className="w-10">#</TH>
                    <TH>Code</TH>
                    <TH>Subject</TH>
                    <TH>Role</TH>
                    <TH className="text-right">Assigned teacher</TH>
                  </tr>
                </THead>
                <TBody>
                  {core9Subjects.map((sub, idx) => {
                    const assignment = teachingAssignments.find(
                      (ta) => ta.classId === selectedClassId && ta.subjectId === sub.id
                    );
                    const slotForSub = (timetableSlots || []).find(
                      (s) => s.classId === selectedClassId && s.subjectId === sub.id
                    );
                    const defaultSubjectTeacherMap: Record<string, string> = {
                      'subj-math': 'tch-1',
                      'subj-sci': 'tch-2',
                      'subj-eng': 'tch-3',
                      'subj-tam': 'tch-4',
                      'subj-isl': 'tch-5',
                      'subj-his': 'tch-6',
                      'subj-ict': 'tch-7',
                      'subj-geo': 'tch-9',
                      'subj-civ': 'tch-13',
                    };
                    const assignedTeacherId = slotForSub?.teacherId || assignment?.teacherId || defaultSubjectTeacherMap[sub.id] || teachers[idx % teachers.length]?.id;
                    const assignedTeacher = teachers.find((t) => t.id === assignedTeacherId);
                    const assignedTeacherUser = users.find((u) => u.id === assignedTeacher?.userId);
                    const isClassTeacherAlsoSubjectTeacher = assignedTeacherId === selectedClass?.classTeacherId;

                    return (
                      <TR key={sub.id}>
                        <TD className="text-ink-faint font-mono-data">{idx + 1}</TD>
                        <TD className="font-mono-data font-semibold">{sub.code}</TD>
                        <TD className="font-semibold text-ink">{sub.name}</TD>
                        <TD>
                          {isClassTeacherAlsoSubjectTeacher ? (
                            <Badge tone="brand"><Crown className="w-3 h-3" /> Class teacher</Badge>
                          ) : (
                            <span className="text-ink-faint text-xs uppercase font-semibold">Specialist</span>
                          )}
                        </TD>
                        <TD className="text-right">
                          {isPrincipalOrAdmin ? (
                            <CustomSelect
                              options={teachers.map((t) => {
                                const u = users.find((usr) => usr.id === t.userId);
                                const isCTThisClass = t.id === selectedClass?.classTeacherId;
                                const ctClassOfTeacher = classes.find((c) => c.classTeacherId === t.id);
                                const count = getTeacherSubjectCount(t.id);
                                const isFull = count >= 3 && t.id !== assignedTeacherId;
                                const spec = t.subjectSpecialization ? ` [${t.subjectSpecialization}]` : '';

                                return {
                                  value: t.id,
                                  label: `${u?.fullName || t.employeeNo}${spec} (${count}/3 subj)${isCTThisClass ? ' — CT this class' : ctClassOfTeacher ? ` — CT ${ctClassOfTeacher.grade}` : ''}${isFull ? ' • full' : ''}`,
                                };
                              })}
                              value={assignedTeacherId}
                              onChange={(val) => handleTeacherAssignmentChange(selectedClassId, sub.id, val)}
                              className="min-w-[280px]"
                            />
                          ) : (
                            <span className="font-semibold text-sm text-ink">
                              {assignedTeacherUser?.fullName || 'Unassigned'}
                            </span>
                          )}
                        </TD>
                      </TR>
                    );
                  })}
                </TBody>
              </Table>
            </Card>

            {/* Teacher Workload & Contact Sidebar */}
            <Card>
              <CardHeader>
                <div className="flex items-center gap-2.5">
                  <IconTile icon={UserCheck} tone="brand" />
                  <CardTitle>Teacher workload</CardTitle>
                </div>
              </CardHeader>

              <div className="space-y-3">
                {(() => {
                  const teachersPerPage = 4;
                  const totalPages = Math.max(1, Math.ceil(teachers.length / teachersPerPage));
                  const currentPage = Math.min(teacherMeterPage, totalPages);
                  const paginatedTeachers = teachers.slice((currentPage - 1) * teachersPerPage, currentPage * teachersPerPage);

                  return (
                    <>
                      {paginatedTeachers.map((t) => {
                        const u = users.find((usr) => usr.id === t.userId);
                        const classAssignments = teachingAssignments.filter((ta) => ta.teacherId === t.id);
                        const uniqueSubjectCount = new Set(classAssignments.map((ta) => ta.subjectId)).size;
                        const totalClassCount = classAssignments.length;
                        const isCT = t.id === selectedClass?.classTeacherId;

                        return (
                          <div key={t.id} className="p-3 bg-surface-muted border border-border rounded-lg space-y-2">
                            <div className="flex justify-between items-start gap-2">
                              <div>
                                <div className="font-semibold text-ink text-sm flex items-center gap-1">
                                  {u?.fullName} {isCT && <Crown className="w-3.5 h-3.5 text-brand inline shrink-0" />}
                                </div>
                                <div className="text-xs text-ink-faint">{t.subjectSpecialization}</div>
                              </div>
                              <div className="text-right shrink-0">
                                <Badge tone={uniqueSubjectCount === 3 ? 'danger' : uniqueSubjectCount > 0 ? 'success' : 'warning'}>
                                  {uniqueSubjectCount} / 3
                                </Badge>
                                <div className="text-xs text-ink-faint mt-0.5">
                                  {totalClassCount} {totalClassCount === 1 ? 'class' : 'classes'}
                                </div>
                              </div>
                            </div>

                            <div className="flex flex-col gap-1 text-xs text-ink-muted border-t border-border pt-2">
                              <div className="flex items-center gap-1.5">
                                <Phone className="w-3 h-3 text-ink-faint" />
                                <span>{t.phone || u?.phone || '+94 77 123 4567'}</span>
                              </div>
                              <div className="flex items-center gap-1.5">
                                <Mail className="w-3 h-3 text-ink-faint" />
                                <span className="truncate">{u?.email}</span>
                              </div>
                            </div>
                          </div>
                        );
                      })}

                      {totalPages > 1 && (
                        <div className="flex items-center justify-between border-t border-border pt-3">
                          <button
                            disabled={currentPage === 1}
                            onClick={() => setTeacherMeterPage((p) => Math.max(1, p - 1))}
                            className="px-2.5 py-1.5 rounded-lg bg-surface-muted hover:bg-border disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-1 font-semibold text-ink text-xs transition-all"
                          >
                            <ChevronLeft className="w-3.5 h-3.5" /> Prev
                          </button>
                          <span className="text-ink-muted text-xs font-medium">Page {currentPage} of {totalPages}</span>
                          <button
                            disabled={currentPage === totalPages}
                            onClick={() => setTeacherMeterPage((p) => Math.min(totalPages, p + 1))}
                            className="px-2.5 py-1.5 rounded-lg bg-surface-muted hover:bg-border disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-1 font-semibold text-ink text-xs transition-all"
                          >
                            Next <ChevronRight className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      )}
                    </>
                  );
                })()}
              </div>
            </Card>
          </div>
        </div>
      )}

      {/* CLASS OVERVIEW TAB */}
      {activeTab === 'overview' && (
        <div className="space-y-4">
          {!isPrincipalOrAdmin && !isAssignedCT ? (
            <Card>
              <EmptyState
                icon={UserCheck}
                title="Subject specialist overview"
                description={`You're logged in as a subject specialist teacher (${currentUser?.fullName}). Class management cards are reserved for class teachers and principal administration.`}
                action={
                  <Button onClick={() => setActiveTab('teachers')}>
                    <BookCheck className="w-4 h-4" /> View my subject teaching schedule
                  </Button>
                }
              />
            </Card>
          ) : (
            <>
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 bg-surface-muted border border-border p-3 rounded-xl text-sm font-semibold text-ink">
                <span>
                  {isPrincipalOrAdmin
                    ? `School academic structure — all ${classes.length} grade classes`
                    : `My assigned classroom (${myAssignedClasses[0]?.grade} - Section ${myAssignedClasses[0]?.section})`}
                </span>
                <div className="flex items-center gap-2">
                  <div className="inline-flex items-center gap-1 p-1 bg-surface border border-border rounded-xl">
                    <button
                      onClick={() => setOverviewViewMode('table')}
                      className={`px-3 py-1 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all ${
                        overviewViewMode === 'table' ? 'bg-brand text-white shadow-xs' : 'text-ink-muted hover:text-ink'
                      }`}
                    >
                      <List className="w-3.5 h-3.5" /> List
                    </button>
                    <button
                      onClick={() => setOverviewViewMode('cards')}
                      className={`px-3 py-1 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all ${
                        overviewViewMode === 'cards' ? 'bg-brand text-white shadow-xs' : 'text-ink-muted hover:text-ink'
                      }`}
                    >
                      <LayoutGrid className="w-3.5 h-3.5" /> Cards
                    </button>
                  </div>
                  {isPrincipalOrAdmin && (
                    <Button size="sm" onClick={handleOpenCreateClass}>
                      <Plus className="w-3.5 h-3.5" /> Create class
                    </Button>
                  )}
                </div>
              </div>

              {isPrincipalOrAdmin && classes.length === 0 ? (
                <Card>
                  <EmptyState
                    icon={GraduationCap}
                    title="No classes set up yet"
                    description="Create your school's grade/section classes (e.g. Grade 1 - Section A) before enrolling students or building timetables. Everything else in this app — enrollment, timetable, exams — depends on a class existing first."
                    action={
                      <Button onClick={handleOpenCreateClass}>
                        <Plus className="w-4 h-4" /> Create first class
                      </Button>
                    }
                  />
                </Card>
              ) : overviewViewMode === 'table' ? (
                <Card padded={false}>
                  <Table>
                    <THead>
                      <tr>
                        <TH>Grade & Section</TH>
                        <TH>Academic Year</TH>
                        <TH>Assigned Class Teacher</TH>
                        <TH>Capacity</TH>
                        <TH className="text-right">Actions</TH>
                      </tr>
                    </THead>
                    <TBody>
                      {(isPrincipalOrAdmin ? classes : myAssignedClasses).map((cls) => {
                        const currentTeacher = teachers.find((t) => t.id === cls.classTeacherId || t.userId === cls.classTeacherId || t.employeeNo === cls.classTeacherId);
                        const currentTeacherUser = users.find((u) => u.id === currentTeacher?.userId || u.id === cls.classTeacherId);
                        const isMyClass = currentTeacher?.userId === currentUser?.id || cls.classTeacherId === currentUser?.id;

                        return (
                          <TR key={cls.id} className={isMyClass ? 'bg-brand-tint/30' : ''}>
                            <TD>
                              <div className="flex items-center gap-2">
                                <span className="font-display font-semibold text-ink text-base">{cls.grade}</span>
                                <span className="text-sm font-medium text-ink-muted">— Section {cls.section}</span>
                                {isMyClass && <Badge tone="brand">My class</Badge>}
                              </div>
                            </TD>
                            <TD>
                              <Badge tone="neutral" className="font-mono-data">AY {cls.academicYear}</Badge>
                            </TD>
                            <TD className="min-w-[240px]">
                              {isPrincipalOrAdmin ? (
                                <CustomSelect
                                  options={[
                                    { value: '', label: '— Unassigned —' },
                                    ...teachers.map((t) => {
                                      const u = users.find((usr) => usr.id === t.userId);
                                      return { value: t.id, label: `${u?.fullName || t.employeeNo} (${t.subjectSpecialization})` };
                                    }),
                                  ]}
                                  value={cls.classTeacherId || ''}
                                  onChange={(val) => assignClassTeacher(cls.id, val)}
                                  className="w-full"
                                />
                              ) : (
                                <div className="font-semibold text-ink text-sm">
                                  {currentTeacherUser?.fullName || (currentTeacher ? `${currentTeacher.employeeNo} (${currentTeacher.subjectSpecialization})` : 'Pending principal assignment')}
                                </div>
                              )}
                            </TD>
                            <TD className="font-mono-data text-ink-muted">
                              {cls.capacity} students
                            </TD>
                            <TD className="text-right">
                              <div className="flex items-center justify-end gap-2">
                                <Button
                                  size="sm"
                                  variant="secondary"
                                  onClick={() => {
                                    setSelectedClassId(cls.id);
                                    setActiveTab('teachers');
                                  }}
                                >
                                  <BookCheck className="w-3.5 h-3.5" />
                                  {isPrincipalOrAdmin ? 'Subject teachers' : 'View teachers'}
                                </Button>
                                <Button size="sm" variant="secondary" onClick={() => setViewingTimetableClassId(cls.id)}>
                                  <Calendar className="w-3.5 h-3.5" /> Timetable
                                </Button>
                                {isPrincipalOrAdmin && (
                                  <>
                                    <button
                                      onClick={() => handleOpenEditClass(cls)}
                                      className="p-1.5 text-ink-muted hover:text-ink hover:bg-surface-muted rounded-lg transition-colors"
                                      title="Edit class"
                                    >
                                      <Pencil className="w-3.5 h-3.5" />
                                    </button>
                                    <button
                                      onClick={() => handleDeleteClass(cls)}
                                      className="p-1.5 text-ink-muted hover:text-danger hover:bg-danger-tint rounded-lg transition-colors"
                                      title="Delete class"
                                    >
                                      <Trash2 className="w-3.5 h-3.5" />
                                    </button>
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
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                  {(isPrincipalOrAdmin ? classes : myAssignedClasses).map((cls) => {
                    const currentTeacher = teachers.find((t) => t.id === cls.classTeacherId || t.userId === cls.classTeacherId || t.employeeNo === cls.classTeacherId);
                    const currentTeacherUser = users.find((u) => u.id === currentTeacher?.userId || u.id === cls.classTeacherId);
                    const isMyClass = currentTeacher?.userId === currentUser?.id || cls.classTeacherId === currentUser?.id;

                    return (
                      <Card key={cls.id} className={isMyClass ? 'ring-2 ring-brand/40 border-brand/40' : ''}>
                        <div className="flex justify-between items-start border-b border-border pb-3 mb-3">
                          <div>
                            <div className="flex items-center gap-2">
                              <h3 className="font-display font-semibold text-lg text-ink">{cls.grade}</h3>
                              {isMyClass && <Badge tone="brand">My class</Badge>}
                            </div>
                            <div className="text-sm text-ink-muted mt-0.5">Section {cls.section}</div>
                          </div>
                          <Badge tone="neutral">AY {cls.academicYear}</Badge>
                        </div>

                        <div className="space-y-1.5 bg-surface-muted border border-border p-3 rounded-lg mb-3">
                          <div className="flex items-center gap-1.5 text-xs text-ink-faint uppercase font-semibold">
                            <UserCheck className="w-3.5 h-3.5" /> Assigned class teacher
                          </div>

                          {isPrincipalOrAdmin ? (
                            <CustomSelect
                              options={[
                                { value: '', label: '— Unassigned —' },
                                ...teachers.map((t) => {
                                  const u = users.find((usr) => usr.id === t.userId);
                                  return { value: t.id, label: `${u?.fullName || t.employeeNo} (${t.subjectSpecialization})` };
                                }),
                              ]}
                              value={cls.classTeacherId || ''}
                              onChange={(val) => assignClassTeacher(cls.id, val)}
                              className="w-full"
                            />
                          ) : (
                            <div className="font-semibold text-ink text-sm">
                              {currentTeacherUser?.fullName || (currentTeacher ? `${currentTeacher.employeeNo} (${currentTeacher.subjectSpecialization})` : 'Pending principal assignment')}
                            </div>
                          )}
                        </div>

                        <div className="flex justify-between text-sm mb-3">
                          <span className="text-ink-muted">Capacity</span>
                          <span className="font-semibold text-ink">{cls.capacity} students</span>
                        </div>

                        <div className="pt-3 border-t border-border flex items-center justify-between gap-2">
                          <button
                            onClick={() => {
                              setSelectedClassId(cls.id);
                              setActiveTab('teachers');
                            }}
                            className="text-brand hover:text-brand-hover font-semibold text-xs flex items-center gap-1"
                          >
                            <BookCheck className="w-3.5 h-3.5" />
                            {isPrincipalOrAdmin ? 'Manage subject teachers' : 'View subject teachers'}
                          </button>
                          <div className="flex items-center gap-1.5">
                            <Button size="sm" variant="secondary" onClick={() => setViewingTimetableClassId(cls.id)}>
                              <Calendar className="w-3.5 h-3.5" /> Timetable
                            </Button>
                            {isPrincipalOrAdmin && (
                              <>
                                <button
                                  onClick={() => handleOpenEditClass(cls)}
                                  className="p-1.5 text-ink-muted hover:text-ink hover:bg-surface-muted rounded-lg transition-colors"
                                  title="Edit class"
                                >
                                  <Pencil className="w-3.5 h-3.5" />
                                </button>
                                <button
                                  onClick={() => handleDeleteClass(cls)}
                                  className="p-1.5 text-ink-muted hover:text-danger hover:bg-danger-tint rounded-lg transition-colors"
                                  title="Delete class"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </>
                            )}
                          </div>
                        </div>
                      </Card>
                    );
                  })}
                </div>
              )}
            </>
          )}
        </div>
      )}

      {/* SUBJECT CATALOGUE TAB */}
      {activeTab === 'subjects' && (
        <div className="space-y-4">
          <Card className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <h3 className="font-display font-semibold text-lg text-ink flex items-center gap-2">
                <BookOpen className="w-4.5 h-4.5 text-brand" /> Curriculum & weekly period allocations
              </h3>
              <p className="text-sm text-ink-muted mt-0.5">
                Set which grade level each subject belongs to and how many weekly periods it has.
              </p>
            </div>
            {isPrincipalOrAdmin && (
              <Button onClick={() => setShowAddSubjectModal(true)} className="shrink-0">
                <Plus className="w-4 h-4" /> Add subject
              </Button>
            )}
          </Card>

          <Card padded={false}>
            <Table>
              <THead>
                <tr>
                  <TH>Code</TH>
                  <TH>Title</TH>
                  <TH>Grade level</TH>
                  <TH>O/L category</TH>
                  <TH className="text-center">Periods / week</TH>
                  {isPrincipalOrAdmin && <TH className="text-right">Actions</TH>}
                </tr>
              </THead>
              <TBody>
                {subjects.map((sub) => {
                  const isEditing = editingSubjectId === sub.id;

                  if (isEditing) {
                    return (
                      <TR key={sub.id} className="bg-brand-tint/40">
                        <TD>
                          <Input
                            type="text"
                            value={editSubjectCode}
                            onChange={(e) => setEditSubjectCode(e.target.value)}
                            className="w-28 py-1.5 uppercase"
                            placeholder="CODE"
                          />
                        </TD>
                        <TD>
                          <Input
                            type="text"
                            value={editSubjectName}
                            onChange={(e) => setEditSubjectName(e.target.value)}
                            className="w-full py-1.5"
                            placeholder="Subject title"
                          />
                        </TD>
                        <TD>
                          <Input
                            type="text"
                            value={editSubjectGradeLevel}
                            onChange={(e) => setEditSubjectGradeLevel(e.target.value)}
                            className="w-44 py-1.5"
                            placeholder="e.g. Grades 1-11"
                          />
                        </TD>
                        <TD>
                          <CustomSelect
                            value={editSubjectCategory}
                            onChange={(val) => setEditSubjectCategory(val as SubjectCategory)}
                            options={categoryOptions}
                            className="w-44"
                          />
                        </TD>
                        <TD className="text-center">
                          <Input
                            type="number"
                            min={1}
                            max={15}
                            value={editSubjectPeriods}
                            onChange={(e) => setEditSubjectPeriods(Number(e.target.value))}
                            className="w-20 py-1.5 text-center mx-auto"
                          />
                        </TD>
                        <TD className="text-right space-x-2">
                          <Button size="sm" onClick={() => handleSaveEditSubject(sub.id)}>
                            <Save className="w-3.5 h-3.5" /> Save
                          </Button>
                          <Button size="sm" variant="secondary" onClick={() => setEditingSubjectId(null)}>
                            <X className="w-3.5 h-3.5" /> Cancel
                          </Button>
                        </TD>
                      </TR>
                    );
                  }

                  return (
                    <TR key={sub.id}>
                      <TD className="font-mono-data font-semibold">{sub.code}</TD>
                      <TD className="font-semibold text-ink">{sub.name}</TD>
                      <TD>
                        <Badge tone="neutral">{sub.gradeLevel}</Badge>
                      </TD>
                      <TD>
                        {sub.category && sub.category !== 'general' ? (
                          <Badge tone={sub.category === 'compulsory' ? 'brand' : 'warning'}>
                            {categoryOptions.find((o) => o.value === sub.category)?.label || sub.category}
                          </Badge>
                        ) : (
                          <span className="text-ink-faint text-xs">General</span>
                        )}
                      </TD>
                      <TD className="text-center">
                        <Badge tone="brand">{sub.periodsPerWeek} periods</Badge>
                      </TD>
                      {isPrincipalOrAdmin && (
                        <TD className="text-right space-x-2">
                          <Button size="sm" variant="secondary" onClick={() => handleStartEditSubject(sub)}>
                            <Pencil className="w-3.5 h-3.5" /> Edit
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            className="text-danger hover:bg-danger-tint"
                            onClick={() => {
                              if (confirm(`Delete subject '${sub.name}' (${sub.code})?`)) {
                                deleteSubject(sub.id);
                              }
                            }}
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </Button>
                        </TD>
                      )}
                    </TR>
                  );
                })}
              </TBody>
            </Table>
          </Card>
        </div>
      )}

      {/* O/L BASKET STRUCTURE TAB */}
      {activeTab === 'ol-basket' && (
        <div className="space-y-6 animate-fade-in">
          <Card className="border-brand/30">
            <div className="flex items-center gap-2 text-xs font-semibold text-brand uppercase tracking-wide">
              <Crown className="w-4 h-4" /> Sri Lankan Ministry of Education • National G.C.E. O/L framework
            </div>
            <h3 className="font-display font-semibold text-xl text-ink mt-2">
              Grade 10 &amp; 11 mandatory 9-subject structure
            </h3>
            <p className="text-sm text-ink-muted leading-relaxed max-w-4xl mt-2">
              Every student in Grade 10 &amp; 11 sits exactly <strong className="text-ink">9 subjects</strong> in the
              Sri Lankan G.C.E. O/L Examination: <strong className="text-ink">6 compulsory core subjects</strong> plus{' '}
              <strong className="text-ink">3 optional basket-choice subjects</strong> (one choice each from Category I, II, and III).
            </p>
          </Card>

          <Card className="space-y-4">
            <CardHeader>
              <div className="flex items-center gap-2">
                <Shield className="w-4.5 h-4.5 text-brand" />
                <CardTitle>1. Compulsory core subjects (6 mandatory for all O/L students)</CardTitle>
              </div>
              <Badge tone="brand">6 / 6 compulsory</Badge>
            </CardHeader>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {[
                { label: 'Religion', desc: "Choose student's faith domain:", tags: ['Buddhism', 'Hinduism', 'Islam', 'Christianity', 'Catholicism'] },
                { label: 'First language', desc: 'Medium of instruction & literature:', tags: ['Sinhala Language & Lit', 'Tamil Language & Lit'] },
                { label: 'English language', desc: 'National secondary English curriculum', code: 'ENG-01 (5 periods/week)' },
                { label: 'Mathematics', desc: 'General O/L mathematics & algebra', code: 'MATH-01 (6 periods/week)' },
                { label: 'Science', desc: 'Physics, chemistry & biology integration', code: 'SCI-01 (5 periods/week)' },
                { label: 'History', desc: 'Sri Lankan & world history', code: 'HIS-01 (4 periods/week)' },
              ].map((item, i) => (
                <div key={item.label} className="bg-surface-muted border border-border p-4 rounded-lg space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold uppercase text-ink-faint">Subject #{i + 1}</span>
                    <Badge tone="brand">Core</Badge>
                  </div>
                  <h5 className="font-display font-semibold text-sm text-ink">{item.label}</h5>
                  <p className="text-xs text-ink-muted">{item.desc}</p>
                  {item.tags ? (
                    <div className="flex flex-wrap gap-1 pt-1">
                      {item.tags.map((tag) => (
                        <span key={tag} className="px-2 py-0.5 bg-surface border border-border text-ink text-xs rounded">{tag}</span>
                      ))}
                    </div>
                  ) : (
                    <Badge tone="neutral" className="font-mono-data">{item.code}</Badge>
                  )}
                </div>
              ))}
            </div>
          </Card>

          <Card className="space-y-4">
            <CardHeader>
              <div className="flex items-center gap-2">
                <Layers className="w-4.5 h-4.5 text-brand" />
                <CardTitle>2. Optional basket-choice subjects (3 electives per student)</CardTitle>
              </div>
              <Badge tone="brand">Choose 1 from each category</Badge>
            </CardHeader>

            <div className="space-y-4">
              {[
                { cat: 'I', title: 'Category I', sub: 'Social sciences, commerce & languages', filter: 'category_1' as const },
                { cat: 'II', title: 'Category II', sub: 'Aesthetics, drama & literary texts', filter: 'category_2' as const },
                { cat: 'III', title: 'Category III', sub: 'Technology, agriculture, health & technical', filter: 'category_3' as const },
              ].map((basket) => (
                <div key={basket.cat} className="bg-surface-muted border border-border p-4 rounded-lg space-y-3">
                  <div className="flex items-center justify-between flex-wrap gap-2">
                    <div className="flex items-center gap-2">
                      <span className="w-6 h-6 rounded-full bg-brand text-white text-xs font-bold flex items-center justify-center">{basket.cat}</span>
                      <h5 className="font-display font-semibold text-sm text-ink">{basket.title} (choose one)</h5>
                    </div>
                    <span className="text-xs text-ink-faint uppercase font-semibold">{basket.sub}</span>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {subjects.filter((s) => s.category === basket.filter).length === 0 ? (
                      <span className="text-xs text-ink-faint italic">
                        No subjects assigned to this category yet — set a subject's O/L category in the All Subjects tab.
                      </span>
                    ) : (
                      subjects.filter((s) => s.category === basket.filter).map((sub) => (
                        <span key={sub.id} className="px-2.5 py-1 bg-surface border border-border text-ink text-xs font-semibold rounded">
                          {sub.name} <span className="text-ink-faint font-normal">({sub.code})</span>
                        </span>
                      ))
                    )}
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </div>
      )}

      {/* CLASS TIMETABLE MODAL */}
      <Modal
        open={Boolean(viewingTimetableClassId)}
        onClose={() => setViewingTimetableClassId(null)}
        title="Weekly class timetable & subject teacher roster"
        size="xl"
      >
        {viewingTimetableClassId && <TimetableModule initialClassId={viewingTimetableClassId} />}
      </Modal>

      {/* CREATE / EDIT CLASS MODAL */}
      <Modal
        open={showClassModal}
        onClose={() => setShowClassModal(false)}
        title={editingClassId ? 'Edit class' : 'Create new class'}
        footer={
          <>
            <Button variant="secondary" onClick={() => setShowClassModal(false)}>Cancel</Button>
            <Button type="submit" form="class-form"><Save className="w-4 h-4" /> {editingClassId ? 'Save changes' : 'Create class'}</Button>
          </>
        }
      >
        {classError && (
          <div className="p-3 bg-danger-tint text-danger text-sm rounded-lg flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 shrink-0" />
            <span>{classError}</span>
          </div>
        )}
        <form id="class-form" onSubmit={handleSubmitClass} className="space-y-3.5">
          <div className="grid grid-cols-2 gap-3">
            <FormField label="Grade" required>
              <CustomSelect
                options={gradeOptions.map((g) => ({ value: g, label: g }))}
                value={classGrade}
                onChange={setClassGrade}
                className="w-full"
              />
            </FormField>
            <FormField label="Section" required>
              <Input type="text" required maxLength={2} placeholder="e.g. A" value={classSection} onChange={(e) => setClassSection(e.target.value)} className="uppercase" />
            </FormField>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <FormField label="Academic year" required>
              <Input type="number" required min={2020} max={2100} value={classAcademicYear} onChange={(e) => setClassAcademicYear(Number(e.target.value) || new Date().getFullYear())} />
            </FormField>
            <FormField label="Capacity" required>
              <Input type="number" required min={1} max={200} value={classCapacity} onChange={(e) => setClassCapacity(Number(e.target.value) || 1)} />
            </FormField>
          </div>
          <p className="text-xs text-ink-muted bg-brand-tint p-2.5 rounded-lg">
            Assign a class teacher afterwards from the class card, or from Teacher &amp; Staff.
          </p>
        </form>
      </Modal>

      {/* ADD NEW SUBJECT MODAL */}
      <Modal
        open={showAddSubjectModal}
        onClose={() => setShowAddSubjectModal(false)}
        title="Add new subject to curriculum"
        footer={
          <>
            <Button variant="secondary" onClick={() => setShowAddSubjectModal(false)}>Cancel</Button>
            <Button type="submit" form="add-subject-form"><Save className="w-4 h-4" /> Save subject</Button>
          </>
        }
      >
        <form id="add-subject-form" onSubmit={handleCreateSubject} className="space-y-3.5">
          <FormField label="Subject code" required>
            <Input type="text" required placeholder="e.g. BIO-01" value={newSubjectCode} onChange={(e) => setNewSubjectCode(e.target.value)} className="uppercase" />
          </FormField>
          <FormField label="Subject title" required>
            <Input type="text" required placeholder="e.g. Biology" value={newSubjectName} onChange={(e) => setNewSubjectName(e.target.value)} />
          </FormField>
          <FormField label="Target grade level / class" required>
            <Input type="text" required placeholder="e.g. Grades 10-11 or Grade 9" value={newSubjectGradeLevel} onChange={(e) => setNewSubjectGradeLevel(e.target.value)} />
          </FormField>
          <FormField label="O/L category" hint="Only relevant for Grade 10-11 subjects that count toward the 9-subject O/L basket.">
            <CustomSelect
              value={newSubjectCategory}
              onChange={(val) => setNewSubjectCategory(val as SubjectCategory)}
              options={categoryOptions}
            />
          </FormField>
          <FormField label="Weekly periods allocated" required>
            <Input type="number" min={1} max={15} required value={newSubjectPeriods} onChange={(e) => setNewSubjectPeriods(Number(e.target.value))} />
          </FormField>
        </form>
      </Modal>
    </div>
  );
};
