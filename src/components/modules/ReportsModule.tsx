import React, { useState, useEffect } from 'react';
import {
  Download,
  Filter,
  CheckCircle2,
  AlertTriangle,
  Search,
  Users,
  Eye,
  UserCheck,
  Crown,
  Calendar,
  TrendingUp,
  Award,
  GraduationCap,
  BookOpen,
  MessageSquare,
  Send,
  ExternalLink,
  Phone,
} from 'lucide-react';
import { useData } from '../../context/DataContext';
import { api } from '../../services/api';
import { isStudentEnrolledInSubject } from '../../services/academicRules';
import { PageHeader } from '../ui/PageHeader';
import { Badge, BadgeTone } from '../ui/Badge';
import { Button } from '../ui/Button';
import { Card } from '../ui/Card';
import { Modal } from '../ui/Modal';
import { EmptyState } from '../ui/EmptyState';
import { Table, THead, TH, TBody, TR, TD } from '../ui/Table';
import { Pagination } from '../ui/Pagination';
import { CustomSelect } from '../common/CustomSelect';
import { FormField, Input, Textarea } from '../ui/FormField';

interface ReportsModuleProps {
  initialReportType?: 'attendance' | 'academic' | 'student_dossier' | 'principal_decision' | 'welfare' | 'inventory';
}

const PAGE_SIZE = 15;

function downloadCSV(filename: string, headers: string[], rows: (string | number)[][]) {
  const escape = (v: string | number) => `"${String(v).replace(/"/g, '""')}"`;
  const csv = [headers.map(escape).join(','), ...rows.map((r) => r.map(escape).join(','))].join('\r\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export const ReportsModule: React.FC<ReportsModuleProps> = ({ initialReportType = 'attendance' }) => {
  const {
    activeRole,
    currentUser,
    assignedClassId,
    students,
    attendance,
    examResults,
    exams,
    subjects,
    classes,
    teachers,
    users,
    notifications,
    welfareEnrolments,
    welfarePrograms,
    inventoryItems,
    addNotification,
    logAudit,
  } = useData();

  const [reportType, setReportType] = useState(initialReportType);
  const [selectedGrade, setSelectedGrade] = useState<string>('all');
  const [selectedTerm, setSelectedTerm] = useState<string>('all');
  const [selectedYear, setSelectedYear] = useState<number>(2026);
  const [selectedSubjectId, setSelectedSubjectId] = useState<string>('all');
  const [selectedRiskType, setSelectedRiskType] = useState<'all' | 'exam' | 'attendance'>('all');
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [actionNotice, setActionNotice] = useState<string | null>(null);
  const [dossierStudentId, setDossierStudentId] = useState<string | null>(null);
  const [examDetailStudentId, setExamDetailStudentId] = useState<string | null>(null);
  const [modalTerm, setModalTerm] = useState<string>('all');

  // Guardian Meeting WhatsApp Dispatch Modal State
  const [showGuardianMeetingModal, setShowGuardianMeetingModal] = useState(false);
  const [selectedGuardianItem, setSelectedGuardianItem] = useState<(typeof atRiskStudents)[number] | null>(null);
  const [guardianNameInput, setGuardianNameInput] = useState('');
  const [guardianPhoneInput, setGuardianPhoneInput] = useState('');
  const [customWhatsAppMessage, setCustomWhatsAppMessage] = useState('');
  const [isDispatchingWA, setIsDispatchingWA] = useState(false);
  const [waStatusInfo, setWaStatusInfo] = useState<{ isConnected: boolean; user?: string | null; status?: string } | null>(null);

  useEffect(() => {
    if (examDetailStudentId) {
      setModalTerm(selectedTerm);
    }
  }, [examDetailStudentId, selectedTerm]);

  const [attendancePage, setAttendancePage] = useState(1);
  const [dossierPage, setDossierPage] = useState(1);
  const [welfarePage, setWelfarePage] = useState(1);

  useEffect(() => {
    if (initialReportType) setReportType(initialReportType);
  }, [initialReportType]);

  useEffect(() => {
    setAttendancePage(1);
    setDossierPage(1);
    setWelfarePage(1);
  }, [selectedGrade, selectedTerm, selectedYear, selectedSubjectId, selectedRiskType, searchTerm, reportType]);

  const showNotice = (msg: string) => {
    setActionNotice(msg);
    setTimeout(() => setActionNotice(null), 4000);
  };

  const isTeacher = activeRole === 'teacher';
  const isPrincipalOrAdmin = activeRole === 'principal' || activeRole === 'admin' || currentUser?.role === 'principal' || currentUser?.role === 'admin';
  const roleScopedStudents = isTeacher ? students.filter((s) => s.classId === assignedClassId) : students;

  // Filters that apply to student-level tabs (attendance, dossiers, at-risk, welfare)
  const filteredStudents = roleScopedStudents.filter((s) => {
    const cls = classes.find((c) => c.id === s.classId);
    const matchesGrade = selectedGrade === 'all' || cls?.grade === selectedGrade;
    const matchesSearch = `${s.firstName} ${s.lastName} ${s.studentNo}`.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesGrade && matchesSearch;
  });

  // Filters that apply to exam-level tabs (term exam history) — real dimensions,
  // resolved through the exam record rather than left decorative.
  const filteredExamResults = examResults.filter((r) => {
    const exam = exams.find((e) => e.id === r.examId);
    const matchesTerm = selectedTerm === 'all' || exam?.term === selectedTerm;
    const matchesYear = !exam || exam.academicYear === selectedYear;
    return matchesTerm && matchesYear;
  });

  const filteredAttendance = attendance.filter((a) => new Date(a.date).getFullYear() === selectedYear);

  const getStudentAttStats = (studentId: string) => {
    const student = students.find((s) => s.id === studentId || s.studentNo === studentId);
    const sId = student ? student.id : studentId;
    const sNo = student ? student.studentNo : '';
    const records = filteredAttendance.filter(
      (a: any) =>
        (a.studentId && (a.studentId === sId || a.studentId === sNo)) ||
        (a.studentNo && (a.studentNo === sId || a.studentNo === sNo)) ||
        (a.student_id && (a.student_id === sId || a.student_id === sNo))
    );
    const total = records.length;
    const present = records.filter((a) => a.status === 'present').length;
    const absent = records.filter((a) => a.status === 'absent').length;
    const late = records.filter((a) => a.status === 'late').length;
    const rate = total > 0 ? Math.round(((present + late) / total) * 100) : 100;
    return { total, present, absent, late, rate };
  };

  const atRiskStudents = filteredStudents.map((s) => {
    const att = getStudentAttStats(s.id);

    // Exam results filtered by term, year, subject, AND student subject enrollment
    const studentExamResults = examResults.filter((r) => {
      if (r.studentId !== s.id) return false;
      if (!isStudentEnrolledInSubject(s, r.subjectId, subjects)) return false;
      const exam = exams.find((e) => e.id === r.examId);
      const matchesTerm = selectedTerm === 'all' || exam?.term === selectedTerm;
      const matchesYear = !exam || exam.academicYear === selectedYear;
      return matchesTerm && matchesYear;
    });

    const failedResults = studentExamResults.filter((r) => {
      const isFailing = r.grade === 'F' || r.marksObtained < 40;
      const matchesSubject = selectedSubjectId === 'all' || r.subjectId === selectedSubjectId;
      return isFailing && matchesSubject;
    });

    const hasFailedExams = failedResults.length > 0;
    const hasLowAttendance = att.rate < 80;

    let isAtRisk = false;
    if (selectedSubjectId !== 'all') {
      isAtRisk = hasFailedExams;
    } else if (selectedRiskType === 'exam') {
      isAtRisk = hasFailedExams;
    } else if (selectedRiskType === 'attendance') {
      isAtRisk = hasLowAttendance;
    } else {
      isAtRisk = hasLowAttendance || hasFailedExams;
    }

    const cls = classes.find((c) => c.id === s.classId);

    const failedDetails = failedResults.map((r) => {
      const sub = subjects.find((sub) => sub.id === r.subjectId);
      const exam = exams.find((e) => e.id === r.examId);
      return {
        subjectId: r.subjectId,
        subjectName: sub?.name || 'Subject',
        subjectCode: sub?.code || '',
        marks: r.marksObtained,
        maxMarks: r.maxMarks || 100,
        grade: r.grade,
        examName: exam?.name || 'Term Exam',
        term: exam?.term || (selectedTerm === 'all' ? 'All Terms' : selectedTerm),
      };
    });

    return {
      student: s,
      className: cls ? `${cls.grade} (${cls.section})` : 'Unassigned',
      attRate: att.rate,
      absentDays: att.absent,
      studentExamResults,
      failedCount: failedResults.length,
      failedExamDetails: failedDetails,
      failedSubjects: failedDetails.map((fd) => `${fd.subjectName} (${fd.marks}/${fd.maxMarks}, ${fd.grade})`),
      isAtRisk,
    };
  }).filter((item) => item.isAtRisk);

  const subjectPerformance = subjects.map((sub) => {
    const subResults = filteredExamResults.filter((r) => r.subjectId === sub.id);
    const total = subResults.length;
    const passed = subResults.filter((r) => r.grade !== 'F' && r.marksObtained >= 40).length;
    const passRate = total > 0 ? Math.round((passed / total) * 100) : 0;
    const avgScore = total > 0 ? Math.round(subResults.reduce((acc, curr) => acc + Number(curr.marksObtained), 0) / total) : 0;
    return { subject: sub, total, passed, failed: total - passed, passRate, avgScore };
  });

  const welfareRows = welfareEnrolments
    .map((enr) => ({
      enr,
      student: students.find((s) => s.id === enr.studentId),
      program: welfarePrograms.find((p) => p.id === enr.programId),
    }))
    .filter(({ student }) => {
      if (!student) return false;
      if (isTeacher && student.classId !== assignedClassId) return false;
      const cls = classes.find((c) => c.id === student.classId);
      const matchesGrade = selectedGrade === 'all' || cls?.grade === selectedGrade;
      const matchesSearch = `${student.firstName} ${student.lastName} ${student.studentNo}`.toLowerCase().includes(searchTerm.toLowerCase());
      return matchesGrade && matchesSearch;
    });

  const distinctSchoolDays = new Set(filteredAttendance.map((a) => a.date)).size;
  const overallAttendanceRate = filteredAttendance.length > 0
    ? Math.round((filteredAttendance.filter((a) => a.status === 'present' || a.status === 'late').length / filteredAttendance.length) * 100)
    : 100;

  const enrolmentStatusTone = (status: string): BadgeTone => status === 'disbursed' ? 'success' : status === 'cancelled' ? 'neutral' : 'warning';
  const conditionTone = (condition: string): BadgeTone => condition === 'Good' ? 'success' : condition === 'Fair' ? 'warning' : 'danger';

  const handleTeacherEscalateToPrincipal = (item: (typeof atRiskStudents)[number]) => {
    const cls = classes.find((c) => c.id === item.student.classId);
    const className = cls ? `${cls.grade} (${cls.section})` : item.className;
    const failingSummary = item.failedSubjects.length > 0 ? `Failing subjects: ${item.failedSubjects.join(', ')}` : 'Attendance concerns (<80%)';
    const teacherName = currentUser?.fullName || 'Class Teacher';

    addNotification({
      recipientId: 'user-principal-1',
      title: `Principal Intervention Requested: ${item.student.firstName} ${item.student.lastName}`,
      message: `Class Teacher ${teacherName} requested Principal intervention & parent WhatsApp alert for ${item.student.firstName} ${item.student.lastName} (${item.student.studentNo}, ${className}). Reason: ${failingSummary} (Attendance: ${item.attRate}%).`,
      channel: 'in_app',
    });

    logAudit?.(
      'CREATE',
      'GuardianMeetingRequest',
      item.student.id,
      `Teacher ${teacherName} requested Principal intervention for student ${item.student.firstName} ${item.student.lastName}`
    );

    showNotice(`Intervention request for ${item.student.firstName} ${item.student.lastName} sent to Principal's Office! The Principal will review and dispatch the WhatsApp alert to parent.`);
  };

  const handleOpenGuardianMeetingModal = async (item: (typeof atRiskStudents)[number]) => {
    const cls = classes.find((c) => c.id === item.student.classId);
    const className = cls ? `${cls.grade} (${cls.section})` : item.className;
    const failingSummary = item.failedSubjects.length > 0 ? `Failing subjects: ${item.failedSubjects.join(', ')}` : 'Attendance concerns (<80%)';
    const gName = item.student.guardianName || `Guardian of ${item.student.firstName} ${item.student.lastName}`;
    const gPhone = item.student.guardianPhone || item.student.phone || '+94 77 123 4567';

    const defaultMsg = `Urgent Guardian Meeting Request — Government Senior Model School\n\n` +
      `Dear ${gName},\n\n` +
      `This is an official communication from the Principal's Office regarding your child:\n` +
      `• Student Name: ${item.student.firstName} ${item.student.lastName} (${item.student.studentNo})\n` +
      `• Class: ${className}\n` +
      `• Current Attendance Rate: ${item.attRate}%\n` +
      `• Academic Status: ${failingSummary}\n\n` +
      `We kindly request an urgent Guardian Meeting at the school to discuss your child's academic progress and support plan.\n\n` +
      `Please reply to this message or contact the Principal's Office to confirm your appointment time.\n\n` +
      `Thank you,\n` +
      `Principal's Office & Academic Management`;

    setSelectedGuardianItem(item);
    setGuardianNameInput(gName);
    setGuardianPhoneInput(gPhone);
    setCustomWhatsAppMessage(defaultMsg);
    setShowGuardianMeetingModal(true);

    try {
      const statusRes = await api.getWhatsAppStatus();
      setWaStatusInfo(statusRes);
    } catch (_) {
      setWaStatusInfo(null);
    }
  };

  const handleSendWhatsAppSystem = async () => {
    if (!selectedGuardianItem || !guardianPhoneInput) return;
    setIsDispatchingWA(true);
    try {
      const res = await api.sendDirectWhatsAppMessage(guardianPhoneInput, customWhatsAppMessage);
      const cls = classes.find((c) => c.id === selectedGuardianItem.student.classId);
      const teacher = teachers.find((t) => t.id === cls?.classTeacherId || t.userId === cls?.classTeacherId || t.employeeNo === cls?.classTeacherId);

      if (teacher) {
        addNotification({
          recipientId: teacher.userId,
          title: `WhatsApp Guardian Meeting Sent: ${selectedGuardianItem.student.firstName} ${selectedGuardianItem.student.lastName}`,
          message: `Principal sent custom WhatsApp meeting request to guardian (${guardianPhoneInput}).`,
          channel: 'in_app',
        });
      }

      logAudit?.(
        'CREATE',
        'GuardianMeeting',
        selectedGuardianItem.student.id,
        `Principal sent custom WhatsApp meeting request to guardian (${guardianNameInput}, ${guardianPhoneInput}) for ${selectedGuardianItem.student.firstName} ${selectedGuardianItem.student.lastName}`
      );

      if (res.success) {
        showNotice(`WhatsApp meeting request successfully sent to ${guardianNameInput} (${guardianPhoneInput})!`);
      } else {
        showNotice(`WhatsApp meeting request logged for ${guardianNameInput} (${guardianPhoneInput}).`);
      }

      setShowGuardianMeetingModal(false);
    } catch (e: any) {
      showNotice(`WhatsApp dispatch notice: ${e?.message || 'Logged'}`);
    } finally {
      setIsDispatchingWA(false);
    }
  };

  const handleOpenWhatsAppWeb = () => {
    if (!selectedGuardianItem || !guardianPhoneInput) return;
    const cleanPhone = guardianPhoneInput.replace(/[^0-9]/g, '');
    let formattedPhone = cleanPhone;
    if (cleanPhone.startsWith('0') && cleanPhone.length === 10) {
      formattedPhone = '94' + cleanPhone.substring(1);
    } else if (cleanPhone.length === 9) {
      formattedPhone = '94' + cleanPhone;
    }

    const waUrl = `https://wa.me/${formattedPhone}?text=${encodeURIComponent(customWhatsAppMessage)}`;
    window.open(waUrl, '_blank');

    const cls = classes.find((c) => c.id === selectedGuardianItem.student.classId);
    const teacher = teachers.find((t) => t.id === cls?.classTeacherId || t.userId === cls?.classTeacherId || t.employeeNo === cls?.classTeacherId);
    if (teacher) {
      addNotification({
        recipientId: teacher.userId,
        title: `Guardian Meeting WhatsApp Prepared: ${selectedGuardianItem.student.firstName} ${selectedGuardianItem.student.lastName}`,
        message: `Principal launched WhatsApp Web meeting invitation for guardian (${guardianPhoneInput}).`,
        channel: 'in_app',
      });
    }

    logAudit?.(
      'CREATE',
      'GuardianMeeting',
      selectedGuardianItem.student.id,
      `Principal launched WhatsApp Web meeting request for guardian (${guardianNameInput}, ${guardianPhoneInput})`
    );

    showNotice(`Opened WhatsApp Web dispatch window for ${guardianNameInput} (${guardianPhoneInput}).`);
    setShowGuardianMeetingModal(false);
  };

  const handleExport = () => {
    if (reportType === 'attendance') {
      downloadCSV('attendance-report.csv', ['Student ID', 'Name', 'Class', 'Present', 'Absent', 'Late', 'Rate %'],
        filteredStudents.map((s) => { const st = getStudentAttStats(s.id); const cls = classes.find((c) => c.id === s.classId); return [s.studentNo, `${s.firstName} ${s.lastName}`, cls ? `${cls.grade} (${cls.section})` : '', st.present, st.absent, st.late, st.rate]; }));
    } else if (reportType === 'academic') {
      downloadCSV('academic-performance.csv', ['Code', 'Subject', 'Registered', 'Passed', 'Avg score', 'Pass rate %'],
        subjectPerformance.map((sp) => [sp.subject.code, sp.subject.name, sp.total, sp.passed, sp.avgScore, sp.passRate]));
    } else if (reportType === 'student_dossier') {
      downloadCSV('student-dossiers.csv', ['Student ID', 'Name', 'Class', 'Attendance %', 'Exam papers passed'],
        filteredStudents.map((s) => { const st = getStudentAttStats(s.id); const cls = classes.find((c) => c.id === s.classId); const passed = examResults.filter((r) => r.studentId === s.id && r.grade !== 'F' && r.marksObtained >= 40).length; return [s.studentNo, `${s.firstName} ${s.lastName}`, cls ? `${cls.grade} (${cls.section})` : '', st.rate, passed]; }));
    } else if (reportType === 'principal_decision') {
      downloadCSV('at-risk-students.csv', ['Student ID', 'Name', 'Class', 'Attendance %', 'Term', 'Failing subjects & marks'],
        atRiskStudents.map((item) => [
          item.student.studentNo,
          `${item.student.firstName} ${item.student.lastName}`,
          item.className,
          item.attRate,
          selectedTerm === 'all' ? 'All Terms' : selectedTerm,
          item.failedSubjects.length > 0 ? item.failedSubjects.join('; ') : 'None (attendance only)'
        ]));
    } else if (reportType === 'welfare') {
      downloadCSV('welfare-disbursements.csv', ['Student', 'Class', 'Program', 'Status', 'Disbursed at'],
        welfareRows.map(({ enr, student, program }) => { const cls = classes.find((c) => c.id === student?.classId); return [`${student?.firstName} ${student?.lastName}`, cls ? `${cls.grade} (${cls.section})` : '', program?.name || 'Unknown program', enr.status, enr.disbursedAt || '']; }));
    } else if (reportType === 'inventory') {
      downloadCSV('inventory-audit.csv', ['Item', 'Category', 'Quantity', 'Unit', 'Location', 'Condition'],
        inventoryItems.map((i) => [i.name, i.category, i.quantity, i.unit, i.location, i.condition]));
    }
    showNotice('CSV file downloaded.');
  };

  const dossierStudent = dossierStudentId ? students.find((s) => s.id === dossierStudentId) : null;
  const examDetailStudent = examDetailStudentId ? students.find((s) => s.id === examDetailStudentId) : null;

  const categoryTabs = [
    { key: 'attendance', label: 'Attendance history' },
    { key: 'academic', label: 'Term exam history' },
    { key: 'student_dossier', label: 'Student dossiers' },
    { key: 'principal_decision', label: 'At-risk watchlist' },
    { key: 'welfare', label: 'Welfare disbursements' },
    { key: 'inventory', label: 'Inventory audit' },
  ] as const;

  const showGradeSearch = ['attendance', 'student_dossier', 'principal_decision', 'welfare'].includes(reportType);
  const showTerm = reportType === 'academic' || reportType === 'principal_decision';
  const showYear = reportType === 'attendance' || reportType === 'academic' || reportType === 'principal_decision';

  return (
    <div className="space-y-6 animate-fade-in">
      <PageHeader
        eyebrow={<Badge tone="brand">Reports & analytics</Badge>}
        title="School records & decision intelligence"
        description="Historical telemetry across attendance, exam results, welfare, and inventory."
        actions={<Button variant="secondary" onClick={handleExport}><Download className="w-4 h-4" /> Export CSV</Button>}
      />

      {actionNotice && (
        <div className="p-3 bg-success-tint text-success text-sm rounded-lg flex items-center gap-2 animate-fade-in">
          <CheckCircle2 className="w-4.5 h-4.5 shrink-0" /> <span>{actionNotice}</span>
        </div>
      )}

      <Card className="space-y-3.5">
        <div className="flex flex-wrap items-center gap-2 border-b border-border pb-3.5">
          <Filter className="w-4 h-4 text-ink-faint shrink-0" />
          {categoryTabs.map((t) => (
            <button
              key={t.key}
              onClick={() => setReportType(t.key)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                reportType === t.key ? 'bg-brand text-white' : 'bg-surface-muted text-ink-muted hover:text-ink'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        {(showGradeSearch || showTerm || showYear) && (
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3 flex-wrap">
              {showGradeSearch && (
                <div className="flex items-center gap-1.5 text-sm">
                  <span className="text-ink-faint">Grade:</span>
                  <CustomSelect
                    value={selectedGrade}
                    onChange={(val) => setSelectedGrade(val)}
                    options={[
                      { value: 'all', label: 'All grades' },
                      ...Array.from(new Set(classes.map((c) => c.grade))).map((g) => ({ value: g, label: g }))
                    ]}
                    className="w-36"
                  />
                </div>
              )}
              {showTerm && (
                <div className="flex items-center gap-1.5 text-sm">
                  <span className="text-ink-faint">Term:</span>
                  <CustomSelect
                    value={selectedTerm}
                    onChange={(val) => setSelectedTerm(val)}
                    options={[
                      { value: 'all', label: 'All terms (cumulative)' },
                      { value: 'Term 1', label: 'Term 1' },
                      { value: 'Term 2', label: 'Term 2' },
                      { value: 'Term 3', label: 'Term 3' },
                    ]}
                    className="w-44"
                  />
                </div>
              )}
              {showYear && (
                <div className="flex items-center gap-1.5 text-sm">
                  <span className="text-ink-faint">Year:</span>
                  <CustomSelect
                    value={selectedYear}
                    onChange={(val) => setSelectedYear(Number(val))}
                    options={[
                      { value: 2026, label: 'AY 2026 (current)' },
                      { value: 2025, label: 'AY 2025 (historical)' },
                    ]}
                    className="w-36"
                  />
                </div>
              )}
              {reportType === 'principal_decision' && (
                <>
                  <div className="flex items-center gap-1.5 text-sm">
                    <span className="text-ink-faint">Subject:</span>
                    <CustomSelect
                      value={selectedSubjectId}
                      onChange={(val) => setSelectedSubjectId(val)}
                      options={[
                        { value: 'all', label: 'All subjects' },
                        ...subjects.map((sub) => ({ value: sub.id, label: `${sub.name} (${sub.code})` })),
                      ]}
                      className="w-44"
                    />
                  </div>
                  <div className="flex items-center gap-1.5 text-sm">
                    <span className="text-ink-faint">Focus:</span>
                    <CustomSelect
                      value={selectedRiskType}
                      onChange={(val) => setSelectedRiskType(val as any)}
                      options={[
                        { value: 'all', label: 'All at-risk' },
                        { value: 'exam', label: 'Failing exams only' },
                        { value: 'attendance', label: 'Low attendance only' },
                      ]}
                      className="w-40"
                    />
                  </div>
                </>
              )}
            </div>

            {showGradeSearch && (
              <div className="relative w-full sm:w-64">
                <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-ink-faint" />
                <input
                  type="text"
                  placeholder="Search student or ID..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full bg-surface-muted border border-border pl-8 pr-3 py-1.5 rounded-lg text-sm text-ink focus:outline-none"
                />
              </div>
            )}
          </div>
        )}
      </Card>

      {/* ATTENDANCE HISTORY */}
      {reportType === 'attendance' && (() => {
        const totalPages = Math.max(1, Math.ceil(filteredStudents.length / PAGE_SIZE));
        const page = Math.min(attendancePage, totalPages);
        const paginated = filteredStudents.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

        return (
          <div className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <Card><div className="text-xs text-ink-muted uppercase font-semibold">Total records</div><div className="text-3xl font-semibold text-ink mt-1">{filteredAttendance.length}</div><p className="text-sm text-ink-faint mt-0.5">Historical daily roll-call logs</p></Card>
              <Card><div className="text-xs text-success uppercase font-semibold">Overall attendance rate</div><div className="text-3xl font-semibold text-success mt-1">{overallAttendanceRate}%</div><p className="text-sm text-ink-faint mt-0.5">Average across {distinctSchoolDays} school days</p></Card>
              <Card><div className="text-xs text-danger uppercase font-semibold">Flagged low attendance (&lt;80%)</div><div className="text-3xl font-semibold text-danger mt-1">{filteredStudents.filter((s) => getStudentAttStats(s.id).rate < 80).length}</div><p className="text-sm text-ink-faint mt-0.5">May need a guardian meeting</p></Card>
            </div>

            <Card padded={false}>
              {filteredStudents.length === 0 ? (
                <EmptyState icon={Users} title="No students match this filter" compact />
              ) : (
                <>
                  <Table>
                    <THead>
                      <tr><TH>Student</TH><TH>Class</TH><TH className="text-center">Present</TH><TH className="text-center">Absent</TH><TH className="text-center">Late</TH><TH className="text-center">Rate</TH><TH className="text-right">Status</TH></tr>
                    </THead>
                    <TBody>
                      {paginated.map((s) => {
                        const stats = getStudentAttStats(s.id);
                        const cls = classes.find((c) => c.id === s.classId);
                        return (
                          <TR key={s.id}>
                            <TD><div className="font-semibold text-ink">{s.firstName} {s.lastName}</div><div className="font-mono-data text-xs text-ink-faint">{s.studentNo}</div></TD>
                            <TD className="text-ink-muted">{cls ? `${cls.grade} (${cls.section})` : 'Unassigned'}</TD>
                            <TD className="text-center font-semibold text-success">{stats.present}</TD>
                            <TD className="text-center font-semibold text-danger">{stats.absent}</TD>
                            <TD className="text-center font-semibold text-warning">{stats.late}</TD>
                            <TD className="text-center font-semibold text-ink">{stats.rate}%</TD>
                            <TD className="text-right">
                              {stats.rate < 80 ? <Badge tone="danger"><AlertTriangle className="w-3 h-3" /> Flagged</Badge> : <Badge tone="success">Normal</Badge>}
                            </TD>
                          </TR>
                        );
                      })}
                    </TBody>
                  </Table>
                  <Pagination page={page} totalPages={totalPages} onPageChange={setAttendancePage} totalItems={filteredStudents.length} itemLabel="students" />
                </>
              )}
            </Card>
          </div>
        );
      })()}

      {/* TERM EXAM HISTORY */}
      {reportType === 'academic' && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
            <Card><div className="text-xs text-ink-muted uppercase font-semibold">Marks registered</div><div className="text-3xl font-semibold text-ink mt-1">{filteredExamResults.length}</div><p className="text-sm text-ink-faint mt-0.5">Across {subjects.length} subjects</p></Card>
            <Card><div className="text-xs text-success uppercase font-semibold">Passed (A-S)</div><div className="text-3xl font-semibold text-success mt-1">{filteredExamResults.filter((r) => r.grade !== 'F' && r.marksObtained >= 40).length}</div></Card>
            <Card><div className="text-xs text-danger uppercase font-semibold">Failing (F)</div><div className="text-3xl font-semibold text-danger mt-1">{filteredExamResults.filter((r) => r.grade === 'F' || r.marksObtained < 40).length}</div></Card>
            <Card><div className="text-xs text-brand uppercase font-semibold">Overall pass rate</div><div className="text-3xl font-semibold text-ink mt-1">{filteredExamResults.length > 0 ? Math.round((filteredExamResults.filter((r) => r.grade !== 'F').length / filteredExamResults.length) * 100) : 0}%</div></Card>
          </div>

          <Card padded={false}>
            <Table>
              <THead><tr><TH>Code</TH><TH>Subject</TH><TH className="text-center">Registered</TH><TH className="text-center">Passed</TH><TH className="text-center">Avg score</TH><TH className="text-right">Pass rate</TH></tr></THead>
              <TBody>
                {subjectPerformance.map((sp) => (
                  <TR key={sp.subject.id}>
                    <TD className="font-mono-data font-semibold">{sp.subject.code}</TD>
                    <TD className="font-semibold text-ink">{sp.subject.name}</TD>
                    <TD className="text-center">{sp.total}</TD>
                    <TD className="text-center text-success font-semibold">{sp.passed}</TD>
                    <TD className="text-center font-semibold text-ink">{sp.avgScore} / 100</TD>
                    <TD className="text-right"><Badge tone={sp.passRate >= 75 ? 'success' : sp.passRate >= 50 ? 'warning' : 'danger'}>{sp.passRate}%</Badge></TD>
                  </TR>
                ))}
              </TBody>
            </Table>
          </Card>
        </div>
      )}

      {/* STUDENT DOSSIERS */}
      {reportType === 'student_dossier' && (() => {
        const totalPages = Math.max(1, Math.ceil(filteredStudents.length / PAGE_SIZE));
        const page = Math.min(dossierPage, totalPages);
        const paginated = filteredStudents.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

        return (
          <Card padded={false}>
            <div className="px-6 py-4 border-b border-border flex justify-between items-center flex-wrap gap-2">
              <div>
                <h3 className="font-display font-semibold text-base text-ink">Student cumulative dossiers</h3>
                <p className="text-sm text-ink-muted mt-0.5">Attendance, exam performance, and enrollment status per student.</p>
              </div>
              <Badge tone="neutral">{filteredStudents.length} students</Badge>
            </div>

            {filteredStudents.length === 0 ? (
              <EmptyState icon={Users} title="No students match this filter" compact />
            ) : (
              <>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 p-6">
                  {paginated.map((s) => {
                    const stats = getStudentAttStats(s.id);
                    const cls = classes.find((c) => c.id === s.classId);
                    const stuResults = examResults.filter((r) => r.studentId === s.id);
                    const passedCount = stuResults.filter((r) => r.grade !== 'F' && r.marksObtained >= 40).length;

                    return (
                      <div key={s.id} className="p-4 bg-surface-muted border border-border rounded-xl space-y-2.5">
                        <div className="flex justify-between items-start border-b border-border pb-2">
                          <div><div className="font-semibold text-ink text-sm">{s.firstName} {s.lastName}</div><div className="font-mono-data text-xs text-ink-faint">{s.studentNo}</div></div>
                          <Badge tone="neutral">{cls ? `${cls.grade} (${cls.section})` : 'Unassigned'}</Badge>
                        </div>
                        <div className="space-y-1.5 text-sm">
                          <div className="flex justify-between"><span className="text-ink-faint">Admitted</span><span className="font-semibold text-ink">{s.admissionDate}</span></div>
                          <div className="flex justify-between"><span className="text-ink-faint">Attendance</span><span className={`font-semibold ${stats.rate >= 80 ? 'text-success' : 'text-danger'}`}>{stats.rate}% ({stats.present}P/{stats.absent}A)</span></div>
                          <div className="flex justify-between"><span className="text-ink-faint">Exam papers passed</span><span className="font-semibold text-ink">{passedCount} / {stuResults.length}</span></div>
                        </div>
                        <div className="pt-2 border-t border-border flex justify-between items-center">
                          <Badge tone="neutral">{s.status}</Badge>
                          <Button size="sm" onClick={() => setDossierStudentId(s.id)}><Eye className="w-3.5 h-3.5" /> Full dossier</Button>
                        </div>
                      </div>
                    );
                  })}
                </div>
                <Pagination page={page} totalPages={totalPages} onPageChange={setDossierPage} totalItems={filteredStudents.length} itemLabel="students" />
              </>
            )}
          </Card>
        );
      })()}

      {/* AT-RISK WATCHLIST */}
      {reportType === 'principal_decision' && (
        <div className="space-y-5">
          <Card className="border-brand/30">
            <div className="flex items-center gap-2 text-xs font-semibold text-brand uppercase tracking-wide"><Crown className="w-4 h-4" /> Intervention watchlist</div>
            <h3 className="font-display font-semibold text-xl text-ink mt-2">Students flagged for principal follow-up</h3>
            <p className="text-sm text-ink-muted mt-2 leading-relaxed">
              Combines attendance history and term exam results to flag students below 80% attendance or with a failing subject.
            </p>
          </Card>

          <Card padded={false}>
            <div className="px-6 py-4 border-b border-border flex justify-between items-center">
              <h4 className="font-semibold text-sm text-ink flex items-center gap-2"><AlertTriangle className="w-4 h-4 text-danger" /> At-risk students ({atRiskStudents.length})</h4>
              {atRiskStudents.length > 0 && <Badge tone="danger">Action required</Badge>}
            </div>

            {atRiskStudents.length === 0 ? (
              <EmptyState icon={CheckCircle2} title="No students currently flagged" description="Everyone meets the attendance and pass-rate benchmarks." compact />
            ) : (
              <Table>
                <THead>
                  <tr>
                    <TH>Student</TH>
                    <TH>Class</TH>
                    <TH className="text-center">Attendance</TH>
                    <TH>Term exam status & failing subjects</TH>
                    <TH className="text-right">Action</TH>
                  </tr>
                </THead>
                <TBody>
                  {atRiskStudents.map((item) => {
                    const isMeetingRequested = notifications.some(
                      (n) =>
                        (n.title.toLowerCase().includes('guardian meeting') || n.title.toLowerCase().includes('principal intervention')) &&
                        (n.title.includes(item.student.firstName) || n.message.includes(item.student.studentNo))
                    );
                    return (
                      <TR key={item.student.id}>
                        <TD className="font-semibold text-ink">
                          <div>{item.student.firstName} {item.student.lastName}</div>
                          <div className="font-mono-data text-xs text-ink-faint">{item.student.studentNo}</div>
                        </TD>
                        <TD className="text-ink-muted">{item.className}</TD>
                        <TD className="text-center font-semibold text-danger">{item.attRate}%</TD>
                        <TD>
                          {item.failedExamDetails.length > 0 ? (
                            <div className="space-y-1.5">
                              <div className="flex flex-wrap gap-1.5 items-center">
                                {item.failedExamDetails.map((fd, idx) => (
                                  <span
                                    key={idx}
                                    className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-danger-tint text-danger text-xs font-medium border border-danger/20"
                                    title={`${fd.examName} (${fd.term})`}
                                  >
                                    <span className="font-semibold">{fd.subjectName}</span>
                                    <span className="text-[11px] font-mono opacity-90">{fd.marks}/{fd.maxMarks}</span>
                                    <span className="text-[10px] font-bold bg-danger text-white px-1 py-0.2 rounded">{fd.grade}</span>
                                  </span>
                                ))}
                              </div>
                              <div>
                                <button
                                  type="button"
                                  onClick={() => setExamDetailStudentId(item.student.id)}
                                  className="text-xs text-brand hover:underline font-semibold inline-flex items-center gap-1"
                                >
                                  <Eye className="w-3 h-3" /> View exam sheet ({selectedTerm === 'all' ? 'All Terms' : selectedTerm})
                                </button>
                              </div>
                            </div>
                          ) : (
                            <div className="flex items-center gap-2">
                              <span className="text-xs text-ink-muted">Passed all term exams</span>
                              <button
                                type="button"
                                onClick={() => setExamDetailStudentId(item.student.id)}
                                className="text-xs text-brand hover:underline font-semibold inline-flex items-center gap-1"
                              >
                                <Eye className="w-3 h-3" /> Exam sheet
                              </button>
                            </div>
                          )}
                        </TD>
                        <TD className="text-right">
                          {!isPrincipalOrAdmin ? (
                            <Button
                              size="sm"
                              variant={isMeetingRequested ? 'secondary' : 'primary'}
                              className={isMeetingRequested ? '' : 'bg-amber-600 hover:bg-amber-700 text-white'}
                              onClick={() => handleTeacherEscalateToPrincipal(item)}
                              title={isMeetingRequested ? 'Intervention request already sent to Principal. Click to re-notify.' : 'Request Principal to review student and send WhatsApp alert to parent'}
                            >
                              {isMeetingRequested ? (
                                <>
                                  <CheckCircle2 className="w-3.5 h-3.5 text-success" /> Escalated to Principal
                                </>
                              ) : (
                                <>
                                  <Send className="w-3.5 h-3.5" /> Request Principal Intervention
                                </>
                              )}
                            </Button>
                          ) : (
                            <Button
                              size="sm"
                              variant="danger"
                              onClick={() => handleOpenGuardianMeetingModal(item)}
                              title="Open Principal WhatsApp Dispatch Console to send alert to parent"
                            >
                              <MessageSquare className="w-3.5 h-3.5" />
                              {isMeetingRequested ? 'Send WhatsApp Alert (Teacher Escalated)' : 'Send WhatsApp Alert to Parent'}
                            </Button>
                          )}
                        </TD>
                      </TR>
                    );
                  })}
                </TBody>
              </Table>
            )}
          </Card>
        </div>
      )}

      {/* WELFARE DISBURSEMENTS */}
      {reportType === 'welfare' && (() => {
        const totalPages = Math.max(1, Math.ceil(welfareRows.length / PAGE_SIZE));
        const page = Math.min(welfarePage, totalPages);
        const paginated = welfareRows.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

        return (
          <Card padded={false}>
            <div className="px-6 py-4 border-b border-border"><span className="font-semibold text-sm text-ink">Welfare disbursement log</span></div>
            {welfareRows.length === 0 ? (
              <EmptyState icon={Users} title="No welfare enrolments recorded" description="Enrol students in the Welfare Schemes module to see real disbursement records here." compact />
            ) : (
              <>
                <Table>
                  <THead><tr><TH>Student</TH><TH>Class</TH><TH>Program</TH><TH>Status</TH><TH className="text-right">Disbursed at</TH></tr></THead>
                  <TBody>
                    {paginated.map(({ enr, student, program }) => {
                      const cls = classes.find((c) => c.id === student?.classId);
                      return (
                        <TR key={enr.id}>
                          <TD className="font-semibold text-ink">{student ? `${student.firstName} ${student.lastName}` : 'Unknown'}</TD>
                          <TD className="text-ink-muted">{cls ? `${cls.grade} (${cls.section})` : 'Unassigned'}</TD>
                          <TD className="text-ink-muted">{program?.name || 'Unknown program'}</TD>
                          <TD><Badge tone={enrolmentStatusTone(enr.status)}>{enr.status}</Badge></TD>
                          <TD className="text-right font-mono-data text-xs text-ink-muted">{enr.disbursedAt ? new Date(enr.disbursedAt).toLocaleDateString() : 'Pending'}</TD>
                        </TR>
                      );
                    })}
                  </TBody>
                </Table>
                <Pagination page={page} totalPages={totalPages} onPageChange={setWelfarePage} totalItems={welfareRows.length} itemLabel="enrolments" />
              </>
            )}
          </Card>
        );
      })()}

      {/* INVENTORY AUDIT */}
      {reportType === 'inventory' && (
        <Card padded={false}>
          <div className="px-6 py-4 border-b border-border flex justify-between items-center">
            <span className="font-semibold text-sm text-ink">Inventory & infrastructure audit</span>
            <Badge tone="neutral">{inventoryItems.length} items</Badge>
          </div>
          {inventoryItems.length === 0 ? (
            <EmptyState icon={Users} title="No inventory items tracked" description="Add items in the Inventory module to see them audited here." compact />
          ) : (
            <Table>
              <THead><tr><TH>Item</TH><TH>Category</TH><TH className="text-center">Quantity</TH><TH>Location</TH><TH className="text-right">Condition</TH></tr></THead>
              <TBody>
                {inventoryItems.map((inv) => (
                  <TR key={inv.id}>
                    <TD className="font-semibold text-ink">{inv.name}</TD>
                    <TD className="text-ink-muted">{inv.category}</TD>
                    <TD className="text-center">
                      <span className="font-semibold text-ink">{inv.quantity} {inv.unit}</span>
                      {inv.quantity <= inv.reorderLevel && <Badge tone="warning" className="ml-2">Low stock</Badge>}
                    </TD>
                    <TD className="text-ink-muted">{inv.location}</TD>
                    <TD className="text-right"><Badge tone={conditionTone(inv.condition)}>{inv.condition}</Badge></TD>
                  </TR>
                ))}
              </TBody>
            </Table>
          )}
        </Card>
      )}

      {/* FULL DOSSIER MODAL */}
      <Modal
        open={Boolean(dossierStudent)}
        onClose={() => setDossierStudentId(null)}
        size="lg"
        title={
          dossierStudent ? (
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-brand/10 text-brand flex items-center justify-center font-bold text-base ring-1 ring-brand/20">
                {dossierStudent.firstName?.[0]}{dossierStudent.lastName?.[0]}
              </div>
              <div>
                <div className="text-xl font-display font-semibold text-ink leading-tight">
                  {dossierStudent.firstName} {dossierStudent.lastName}
                </div>
                <div className="text-xs text-ink-muted mt-0.5">
                  Student Record Dossier · <span className="font-mono-data text-ink-faint">{dossierStudent.studentNo}</span>
                </div>
              </div>
            </div>
          ) : ''
        }
        eyebrow="Comprehensive student dossier"
        footer={
          <div className="flex justify-end w-full">
            <Button variant="secondary" onClick={() => setDossierStudentId(null)}>Close</Button>
          </div>
        }
      >
        {dossierStudent && (() => {
          const stats = getStudentAttStats(dossierStudent.id);
          const cls = classes.find((c) => c.id === dossierStudent.classId);
          const stuResults = examResults.filter((r) => r.studentId === dossierStudent.id);
          const passedCount = stuResults.filter((r) => r.grade !== 'F' && r.marksObtained >= 40).length;
          return (
            <div className="space-y-4">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-surface-muted/70 p-4 rounded-xl text-sm border border-border/60">
                <div>
                  <span className="text-ink-faint block text-xs uppercase font-semibold">Student ID</span>
                  <span className="font-mono-data font-semibold text-ink mt-0.5 block">{dossierStudent.studentNo}</span>
                </div>
                <div>
                  <span className="text-ink-faint block text-xs uppercase font-semibold">Class</span>
                  <span className="font-semibold text-ink mt-0.5 block">{cls ? `${cls.grade} (${cls.section})` : 'Unassigned'}</span>
                </div>
                <div>
                  <span className="text-ink-faint block text-xs uppercase font-semibold">Attendance rate</span>
                  <span className={`font-semibold mt-0.5 block ${stats.rate >= 80 ? 'text-success' : 'text-danger'}`}>{stats.rate}%</span>
                </div>
                <div>
                  <span className="text-ink-faint block text-xs uppercase font-semibold">Exam papers passed</span>
                  <span className="font-semibold text-ink mt-0.5 block">{passedCount} / {stuResults.length}</span>
                </div>
              </div>
              <p className="text-xs text-ink-faint">
                Open the Student Directory for guardian contacts, admission history, and class reassignment.
              </p>
            </div>
          );
        })()}
      </Modal>

      {/* TERM EXAM DETAILS MODAL (SPACIOUS EXECUTIVE UI) */}
      <Modal
        open={Boolean(examDetailStudent)}
        onClose={() => setExamDetailStudentId(null)}
        size="xl"
        title={
          examDetailStudent ? (
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-xl bg-brand/10 text-brand flex items-center justify-center font-bold text-lg ring-1 ring-brand/20">
                {examDetailStudent.firstName?.[0]}{examDetailStudent.lastName?.[0]}
              </div>
              <div>
                <div className="text-xl font-display font-semibold text-ink leading-tight">
                  {examDetailStudent.firstName} {examDetailStudent.lastName}
                </div>
                <div className="text-xs text-ink-muted flex items-center gap-2 mt-1 flex-wrap">
                  <span className="font-mono-data font-medium text-ink-faint">Index: {examDetailStudent.studentNo}</span>
                  <span>•</span>
                  <span>Class: <strong className="text-ink font-semibold">{classes.find((c) => c.id === examDetailStudent.classId) ? `${classes.find((c) => c.id === examDetailStudent.classId)?.grade} (${classes.find((c) => c.id === examDetailStudent.classId)?.section})` : 'Unassigned'}</strong></span>
                  <span>•</span>
                  <span>Academic Year: <strong className="text-ink font-semibold">{selectedYear}</strong></span>
                </div>
              </div>
            </div>
          ) : ''
        }
        eyebrow="Academic performance & term examination report"
        footer={
          <div className="flex flex-col sm:flex-row items-center justify-between w-full gap-3">
            <div className="text-xs text-ink-muted flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-success shrink-0" />
              <span>G.C.E. Grading Scale: <strong>A</strong> (75+), <strong>B</strong> (65-74), <strong>C</strong> (50-64), <strong>S</strong> (40-49), <strong>F</strong> (&lt;40)</span>
            </div>
            <Button variant="secondary" onClick={() => setExamDetailStudentId(null)}>
              Close
            </Button>
          </div>
        }
      >
        {examDetailStudent && (() => {
          const studentExams = examResults.filter((r) => {
            if (r.studentId !== examDetailStudent.id) return false;
            const exam = exams.find((e) => e.id === r.examId);
            const matchesTerm = modalTerm === 'all' || exam?.term === modalTerm;
            const matchesYear = !exam || exam.academicYear === selectedYear;
            return matchesTerm && matchesYear;
          });
          const totalPapers = studentExams.length;
          const passedCount = studentExams.filter((r) => r.grade !== 'F' && r.marksObtained >= 40).length;
          const failedCount = totalPapers - passedCount;
          const avgScore = totalPapers > 0 ? Math.round(studentExams.reduce((sum, r) => sum + Number(r.marksObtained), 0) / totalPapers) : 0;

          // Find best subject
          const bestExam = studentExams.length > 0
            ? [...studentExams].sort((a, b) => Number(b.marksObtained) - Number(a.marksObtained))[0]
            : null;
          const bestSub = bestExam ? subjects.find((s) => s.id === bestExam.subjectId) : null;

          const getGradePill = (grade: string) => {
            const g = (grade || '').toUpperCase();
            if (g === 'A') {
              return (
                <span className="inline-flex items-center justify-center w-8 h-8 rounded-lg font-mono font-bold text-sm bg-emerald-50 text-emerald-700 border border-emerald-200">
                  A
                </span>
              );
            }
            if (g === 'B') {
              return (
                <span className="inline-flex items-center justify-center w-8 h-8 rounded-lg font-mono font-bold text-sm bg-blue-50 text-blue-700 border border-blue-200">
                  B
                </span>
              );
            }
            if (g === 'C') {
              return (
                <span className="inline-flex items-center justify-center w-8 h-8 rounded-lg font-mono font-bold text-sm bg-amber-50 text-amber-700 border border-amber-200">
                  C
                </span>
              );
            }
            if (g === 'S') {
              return (
                <span className="inline-flex items-center justify-center w-8 h-8 rounded-lg font-mono font-bold text-sm bg-slate-100 text-slate-700 border border-slate-200">
                  S
                </span>
              );
            }
            return (
              <span className="inline-flex items-center justify-center w-8 h-8 rounded-lg font-mono font-bold text-sm bg-danger text-white border border-danger">
                F
              </span>
            );
          };

          return (
            <div className="space-y-5">
              {/* Term Filter Tabs */}
              <div className="flex flex-wrap items-center justify-between gap-3 bg-surface-muted/60 p-2 rounded-xl border border-border/70">
                <div className="flex items-center gap-1.5 flex-wrap">
                  <span className="text-xs font-semibold text-ink-muted px-2 flex items-center gap-1.5">
                    <Calendar className="w-3.5 h-3.5 text-brand" /> Term View:
                  </span>
                  {(['all', 'Term 1', 'Term 2', 'Term 3'] as const).map((t) => (
                    <button
                      key={t}
                      type="button"
                      onClick={() => setModalTerm(t)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                        modalTerm === t
                          ? 'bg-brand text-white shadow-sm ring-1 ring-brand'
                          : 'bg-surface text-ink-muted hover:text-ink hover:bg-surface-muted border border-border/60'
                      }`}
                    >
                      {t === 'all' ? 'All Terms (Cumulative)' : t}
                    </button>
                  ))}
                </div>
                <div className="text-xs font-medium text-ink-muted pr-2">
                  Showing <strong className="text-ink">{studentExams.length}</strong> {studentExams.length === 1 ? 'subject paper' : 'subject papers'}
                </div>
              </div>

              {/* Spacious Executive Metrics Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
                {/* Metric 1: Average Score */}
                <div className="p-4 rounded-xl bg-surface border border-border/80 shadow-2xs space-y-2 relative overflow-hidden">
                  <div className="text-xs font-semibold uppercase tracking-wider text-ink-faint flex items-center justify-between">
                    <span>Term Average</span>
                    <TrendingUp className="w-4 h-4 text-brand" />
                  </div>
                  <div className="text-3xl font-display font-black text-ink flex items-baseline gap-1.5">
                    <span className={avgScore >= 75 ? 'text-success' : avgScore >= 50 ? 'text-brand' : 'text-danger'}>
                      {avgScore}%
                    </span>
                    <span className="text-xs font-normal text-ink-muted">overall</span>
                  </div>
                  <div className="text-xs text-ink-muted font-medium pt-0.5">
                    {avgScore >= 75 ? (
                      <span className="text-success font-semibold flex items-center gap-1">
                        <CheckCircle2 className="w-3.5 h-3.5" /> High Distinction
                      </span>
                    ) : avgScore >= 50 ? (
                      <span className="text-brand font-semibold flex items-center gap-1">
                        <CheckCircle2 className="w-3.5 h-3.5" /> Satisfactory Pass
                      </span>
                    ) : (
                      <span className="text-danger font-semibold flex items-center gap-1">
                        <AlertTriangle className="w-3.5 h-3.5" /> Below Benchmark
                      </span>
                    )}
                  </div>
                </div>

                {/* Metric 2: Pass vs Fail Ratio */}
                <div className="p-4 rounded-xl bg-surface border border-border/80 shadow-2xs space-y-2">
                  <div className="text-xs font-semibold uppercase tracking-wider text-ink-faint flex items-center justify-between">
                    <span>Pass / Fail Ratio</span>
                    <CheckCircle2 className="w-4 h-4 text-success" />
                  </div>
                  <div className="text-2xl font-display font-black text-ink flex items-baseline gap-1">
                    <span className="text-success">{passedCount} Passed</span>
                    <span className="text-ink-faint font-light text-lg">/</span>
                    <span className={failedCount > 0 ? 'text-danger font-bold' : 'text-ink-muted font-normal'}>{failedCount} Failed</span>
                  </div>
                  <div className="text-xs text-ink-muted font-medium">
                    {totalPapers > 0 ? `${Math.round((passedCount / totalPapers) * 100)}% subject pass rate` : 'No papers recorded'}
                  </div>
                </div>

                {/* Metric 3: Academic Standing */}
                <div className="p-4 rounded-xl bg-surface border border-border/80 shadow-2xs space-y-2">
                  <div className="text-xs font-semibold uppercase tracking-wider text-ink-faint flex items-center justify-between">
                    <span>Academic Standing</span>
                    <Award className="w-4 h-4 text-amber-500" />
                  </div>
                  <div className="text-lg font-bold truncate">
                    {failedCount === 0 ? (
                      <span className="text-success flex items-center gap-1.5 font-extrabold">
                        <CheckCircle2 className="w-4 h-4" /> Good Standing
                      </span>
                    ) : (
                      <span className="text-danger flex items-center gap-1.5 font-extrabold">
                        <AlertTriangle className="w-4 h-4" /> Action Required
                      </span>
                    )}
                  </div>
                  <div className="text-xs text-ink-muted truncate">
                    {failedCount === 0 ? 'Passed all evaluated papers' : `${failedCount} failing subject(s)`}
                  </div>
                </div>

                {/* Metric 4: Top Subject */}
                <div className="p-4 rounded-xl bg-surface border border-border/80 shadow-2xs space-y-2">
                  <div className="text-xs font-semibold uppercase tracking-wider text-ink-faint flex items-center justify-between">
                    <span>Best Subject</span>
                    <Crown className="w-4 h-4 text-amber-500" />
                  </div>
                  <div className="text-lg font-extrabold text-ink truncate" title={bestSub?.name || ''}>
                    {bestSub ? bestSub.name : '—'}
                  </div>
                  <div className="text-xs text-ink-muted font-medium">
                    {bestExam ? `${bestExam.marksObtained} / ${bestExam.maxMarks || 100} (Grade ${bestExam.grade})` : 'No score data'}
                  </div>
                </div>
              </div>

              {/* Subject Examination Table */}
              {studentExams.length === 0 ? (
                <EmptyState
                  icon={AlertTriangle}
                  title="No exam marks found"
                  description={`No exam results recorded for this student in ${modalTerm === 'all' ? 'academic year ' + selectedYear : modalTerm + ' (' + selectedYear + ')'}.`}
                  compact
                />
              ) : (
                <div className="border border-border rounded-xl overflow-hidden shadow-2xs bg-surface">
                  <Table>
                    <THead>
                      <tr>
                        <TH className="w-2/5">Subject & Code</TH>
                        <TH className="w-1/4">Examination / Term</TH>
                        <TH className="text-center w-28">Score</TH>
                        <TH className="text-center w-24">Grade</TH>
                        <TH className="text-right w-28">Status</TH>
                      </tr>
                    </THead>
                    <TBody>
                      {studentExams.map((r) => {
                        const sub = subjects.find((s) => s.id === r.subjectId);
                        const exam = exams.find((e) => e.id === r.examId);
                        const isFail = r.grade === 'F' || r.marksObtained < 40;
                        const maxM = r.maxMarks || 100;

                        return (
                          <TR key={r.id}>
                            <TD>
                              <div className="font-semibold text-ink text-sm leading-snug">{sub?.name || 'Subject'}</div>
                              <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                                <span className="inline-block px-2 py-0.5 rounded-md bg-surface-muted text-ink-muted font-mono-data text-[11px] font-semibold border border-border/60">
                                  {sub?.code || 'SUB-00'}
                                </span>
                                {sub?.categoryName && (
                                  <span className="inline-block px-2 py-0.5 rounded-md bg-brand/10 text-brand font-semibold text-[10px] tracking-wide">
                                    {sub.categoryName}
                                  </span>
                                )}
                                {sub?.gradeLevel && (
                                  <span className="text-[11px] text-ink-faint">{sub.gradeLevel}</span>
                                )}
                              </div>
                            </TD>
                            <TD className="text-xs">
                              <div className="font-medium text-ink">{exam?.name || 'Term Examination'}</div>
                              <div className="text-ink-faint mt-0.5 flex items-center gap-1">
                                <Badge tone="neutral" className="px-1.5 py-0 text-[10px]">
                                  {exam?.term || modalTerm}
                                </Badge>
                                <span>· {exam?.academicYear || selectedYear}</span>
                              </div>
                            </TD>
                            <TD className="text-center">
                              <div className="inline-flex items-baseline justify-center gap-1 px-3 py-1.5 rounded-lg bg-surface-muted/60 border border-border/50 shadow-2xs">
                                <span className={`text-base font-extrabold font-mono-data ${isFail ? 'text-danger' : 'text-ink'}`}>
                                  {r.marksObtained}
                                </span>
                                <span className="text-xs text-ink-faint font-semibold">/ {maxM}</span>
                              </div>
                            </TD>
                            <TD className="text-center">
                              {getGradePill(r.grade)}
                            </TD>
                            <TD className="text-right">
                              <Badge tone={isFail ? 'danger' : 'success'} className="px-2.5 py-1">
                                {isFail ? 'Failed' : 'Passed'}
                              </Badge>
                            </TD>
                          </TR>
                        );
                      })}
                    </TBody>
                  </Table>
                </div>
              )}
            </div>
          );
        })()}
      </Modal>
      {/* GUARDIAN MEETING & WHATSAPP DISPATCH MODAL */}
      <Modal
        open={showGuardianMeetingModal}
        onClose={() => setShowGuardianMeetingModal(false)}
        title={selectedGuardianItem ? `Request Guardian Meeting: ${selectedGuardianItem.student.firstName} ${selectedGuardianItem.student.lastName}` : 'Guardian Meeting'}
        eyebrow="Principal Office · Direct Guardian WhatsApp Outreach"
        size="lg"
        footer={
          <div className="flex flex-wrap items-center justify-between gap-2 w-full">
            <Button variant="secondary" onClick={() => setShowGuardianMeetingModal(false)}>
              Cancel
            </Button>
            <div className="flex items-center gap-2">
              <Button
                variant="secondary"
                onClick={handleOpenWhatsAppWeb}
                title="Open directly in WhatsApp Web or WhatsApp Desktop App"
              >
                <ExternalLink className="w-4 h-4 text-emerald-600" /> Open WhatsApp Web
              </Button>
              <Button
                onClick={handleSendWhatsAppSystem}
                disabled={isDispatchingWA || !guardianPhoneInput}
                className="bg-emerald-600 hover:bg-emerald-700 text-white"
              >
                {isDispatchingWA ? (
                  'Sending Message...'
                ) : (
                  <>
                    <Send className="w-4 h-4" /> Send via System WhatsApp
                  </>
                )}
              </Button>
            </div>
          </div>
        }
      >
        {selectedGuardianItem && (
          <div className="space-y-4">
            {/* Student At-Risk Summary Banner */}
            <div className="p-3.5 bg-surface-muted border border-border rounded-xl space-y-2">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <div>
                  <span className="font-semibold text-ink text-sm">
                    {selectedGuardianItem.student.firstName} {selectedGuardianItem.student.lastName}
                  </span>
                  <span className="font-mono-data text-xs text-ink-faint ml-2">
                    ({selectedGuardianItem.student.studentNo})
                  </span>
                </div>
                <div className="flex items-center gap-1.5">
                  <Badge tone="neutral">{selectedGuardianItem.className}</Badge>
                  <Badge tone={selectedGuardianItem.attRate < 80 ? 'danger' : 'success'}>
                    Attendance: {selectedGuardianItem.attRate}%
                  </Badge>
                </div>
              </div>
              {selectedGuardianItem.failedSubjects.length > 0 && (
                <div className="text-xs text-danger font-medium flex items-center gap-1.5 pt-1 border-t border-border/60">
                  <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                  <span>Academic Failures: {selectedGuardianItem.failedSubjects.join(', ')}</span>
                </div>
              )}
            </div>

            {/* Guardian Contact Details */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <FormField label="Guardian Name" required>
                <Input
                  type="text"
                  value={guardianNameInput}
                  onChange={(e) => setGuardianNameInput(e.target.value)}
                  placeholder="e.g. Mr. Ahammed (Father)"
                  required
                />
              </FormField>

              <FormField label="Guardian Phone Number (WhatsApp)" required hint="The message will be sent to this guardian phone number">
                <div className="relative">
                  <Phone className="w-4 h-4 text-ink-faint absolute left-3 top-1/2 -translate-y-1/2" />
                  <Input
                    type="text"
                    value={guardianPhoneInput}
                    onChange={(e) => setGuardianPhoneInput(e.target.value)}
                    placeholder="+94 77 123 4567"
                    className="pl-9 font-mono-data"
                    required
                  />
                </div>
              </FormField>
            </div>

            {/* WhatsApp Engine Status Indicator */}
            <div className="p-3 bg-surface border border-border rounded-xl flex items-center justify-between text-xs">
              <div className="flex items-center gap-2">
                <MessageSquare className="w-4 h-4 text-emerald-600 shrink-0" />
                <span className="font-semibold text-ink">System WhatsApp Dispatch Status:</span>
              </div>
              <div>
                {waStatusInfo?.isConnected ? (
                  <Badge tone="success" className="font-mono-data">
                    Connected ({waStatusInfo.user || 'Bot Engine'})
                  </Badge>
                ) : (
                  <Badge tone="warning">Standby Engine (Web App Dispatch Ready)</Badge>
                )}
              </div>
            </div>

            {/* Editable Custom WhatsApp Message */}
            <FormField
              label="Custom WhatsApp Message for Guardian"
              required
              hint="You can customize this message before sending it to the guardian's WhatsApp phone number."
            >
              <Textarea
                rows={7}
                value={customWhatsAppMessage}
                onChange={(e) => setCustomWhatsAppMessage(e.target.value)}
                placeholder="Write custom message to guardian..."
                className="font-sans text-xs leading-relaxed"
                required
              />
            </FormField>
          </div>
        )}
      </Modal>
    </div>
  );
};
