import React, { useState, useEffect } from 'react';
import { Award, FileText, Printer, Save, CheckCircle, Eye, ChevronLeft, ChevronRight, RotateCcw, ShieldCheck, GraduationCap, PenTool, Send, Smartphone, MessageSquare, AlertCircle, CheckCircle2, Loader2, RefreshCw } from 'lucide-react';
import { useData } from '../../context/DataContext';
import { api } from '../../services/api';
import { CustomSelect } from '../common/CustomSelect';
import { Student, Subject } from '../../types';
import { getReportCardSlots, getCategorizedSubjectOptions, isStudentEnrolledInSubject } from '../../services/academicRules';
import { PageHeader } from '../ui/PageHeader';
import { Badge, BadgeTone } from '../ui/Badge';
import { Button } from '../ui/Button';
import { Card } from '../ui/Card';
import { Modal } from '../ui/Modal';
import { Table, THead, TH, TBody, TR, TD } from '../ui/Table';

export const ExaminationModule: React.FC = () => {
  const { classes, students, subjects, teachers, users, exams, examResults, saveExamResult, currentUser, assignedClassId, schoolProfile } = useData();

  const [selectedExamId, setSelectedExamId] = useState<string>('exam-term1-2026');
  const [selectedClassId, setSelectedClassId] = useState<string>(currentUser?.role === 'teacher' ? assignedClassId : classes[0]?.id || '');
  const [selectedSubjectId, setSelectedSubjectId] = useState<string>('subj-math');

  // Classes, subjects and the class assignment load after mount: keep the
  // selections on records that really exist.
  useEffect(() => {
    if (currentUser?.role === 'teacher') {
      if (selectedClassId !== assignedClassId) setSelectedClassId(assignedClassId);
    } else if (classes.length > 0 && !classes.some((c) => c.id === selectedClassId)) {
      setSelectedClassId(classes[0].id);
    }
    if (subjects.length > 0 && !subjects.some((s) => s.id === selectedSubjectId)) setSelectedSubjectId(subjects[0].id);
  }, [currentUser?.role, assignedClassId, classes, subjects, selectedClassId, selectedSubjectId]);

  const [marksPage, setMarksPage] = useState<number>(1);

  useEffect(() => {
    setMarksPage(1);
  }, [selectedClassId, selectedSubjectId, selectedExamId]);

  const [selectedReportStudent, setSelectedReportStudent] = useState<Student | null>(null);

  // Form input cache composite key: `${examId}_${subjectId}_${studentId}`
  const [marksState, setMarksState] = useState<{ [key: string]: number }>({});

  // Bulk WhatsApp Dispatch State
  const [bulkWhatsAppModalOpen, setBulkWhatsAppModalOpen] = useState<boolean>(false);
  const [bulkDispatching, setBulkDispatching] = useState<boolean>(false);
  const [bulkProgress, setBulkProgress] = useState<{ sent: number; total: number; currentName: string }>({ sent: 0, total: 0, currentName: '' });
  const [bulkLogs, setBulkLogs] = useState<Array<{ studentId: string; studentName: string; phone: string; status: 'sent' | 'failed' | 'skipped'; error?: string; timestamp: string }>>([]);
  const [waStatusState, setWaStatusState] = useState<{ isConnected: boolean; status: string; qrCode: string | null; user: string | null } | null>(null);
  const [checkingWaStatus, setCheckingWaStatus] = useState<boolean>(false);
  const [customTeacherNote, setCustomTeacherNote] = useState<string>('Term 1 academic report card released. Please review your child\'s performance.');
  const [dispatchCompleted, setDispatchCompleted] = useState<boolean>(false);
  const [waConnectTab, setWaConnectTab] = useState<'qr' | 'code'>('qr');
  const [pairingPhone, setPairingPhone] = useState<string>('');
  const [pairingCodeState, setPairingCodeState] = useState<string | null>(null);
  const [isRequestingPairingCode, setIsRequestingPairingCode] = useState<boolean>(false);

  // Digital Signatures state (persisted in localStorage)
  const [digitalSignatures, setDigitalSignatures] = useState<{ teacherSignature?: string; principalSignature?: string }>(() => {
    try {
      const saved = localStorage.getItem('gsms_digital_signatures_v1');
      return saved ? JSON.parse(saved) : {};
    } catch {
      return {};
    }
  });

  const [signatureModalOpen, setSignatureModalOpen] = useState<boolean>(false);
  const [signatureTarget, setSignatureTarget] = useState<'teacher' | 'principal'>('teacher');
  const [signatureTab, setSignatureTab] = useState<'draw' | 'upload'>('draw');
  const [isDrawing, setIsDrawing] = useState<boolean>(false);
  const canvasRef = React.useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    try {
      localStorage.setItem('gsms_digital_signatures_v1', JSON.stringify(digitalSignatures));
    } catch {}
  }, [digitalSignatures]);

  const handleStartDraw = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    setIsDrawing(true);
    const rect = canvas.getBoundingClientRect();
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
    ctx.beginPath();
    ctx.moveTo(clientX - rect.left, clientY - rect.top);
  };

  const handleDraw = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const rect = canvas.getBoundingClientRect();
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
    ctx.lineTo(clientX - rect.left, clientY - rect.top);
    ctx.strokeStyle = '#0f172a';
    ctx.lineWidth = 2.5;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.stroke();
  };

  const handleStopDraw = () => {
    setIsDrawing(false);
  };

  const handleClearCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
  };

  const handleSaveCanvasSignature = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const dataUrl = canvas.toDataURL('image/png');
    setDigitalSignatures((prev) => ({
      ...prev,
      [signatureTarget === 'teacher' ? 'teacherSignature' : 'principalSignature']: dataUrl,
    }));
    setSignatureModalOpen(false);
  };

  const handleFileUploadSignature = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      if (event.target?.result) {
        const dataUrl = event.target.result as string;
        setDigitalSignatures((prev) => ({
          ...prev,
          [signatureTarget === 'teacher' ? 'teacherSignature' : 'principalSignature']: dataUrl,
        }));
        setSignatureModalOpen(false);
      }
    };
    reader.readAsDataURL(file);
  };
  const [savedSuccess, setSavedSuccess] = useState(false);

  const selectedExam = exams.find((e) => e.id === selectedExamId);
  const selectedClass = classes.find((c) => c.id === selectedClassId);
  const selectedSubject = subjects.find((s) => s.id === selectedSubjectId);

  const classStudents = students.filter(
    (s) => s.classId === selectedClassId && isStudentEnrolledInSubject(s, selectedSubjectId, subjects)
  );

  const isPrincipalOrAdmin = currentUser?.role === 'principal' || currentUser?.role === 'admin';
  const isTeacherRole = currentUser?.role === 'teacher';

  const canEditMarks = isTeacherRole && selectedClassId === assignedClassId;

  const getMarksObtained = (studentId: string) => {
    const key = `${selectedExamId}_${selectedSubjectId}_${studentId}`;
    if (marksState[key] !== undefined) return marksState[key];

    const studentObj = classStudents.find((s) => s.id === studentId);
    const stuNo = studentObj?.studentNo;

    const res = examResults.find(
      (r) =>
        r.examId === selectedExamId &&
        r.subjectId === selectedSubjectId &&
        (r.studentId === studentId || (stuNo && (r.studentId === stuNo || (r as any).studentNo === stuNo)))
    );
    return res ? res.marksObtained : 0;
  };

  const getGrade = (score: number) => {
    if (score >= 75) return 'A';
    if (score >= 65) return 'B';
    if (score >= 55) return 'C';
    if (score >= 40) return 'S';
    return 'F';
  };

  const gradeTone = (grade: string): BadgeTone =>
    grade === 'A' ? 'success' : grade === 'B' || grade === 'C' ? 'brand' : grade === 'S' ? 'neutral' : 'danger';

  const handleScoreChange = (studentId: string, value: string) => {
    const num = Math.min(100, Math.max(0, Number(value) || 0));
    const key = `${selectedExamId}_${selectedSubjectId}_${studentId}`;
    setMarksState((prev) => ({ ...prev, [key]: num }));
    if (canEditMarks) {
      saveExamResult(selectedExamId, studentId, selectedSubjectId, num, 100);
    }
  };

  const handleSaveAll = () => {
    if (!canEditMarks) return;
    classStudents.forEach((s) => {
      const score = getMarksObtained(s.id);
      saveExamResult(selectedExamId, s.id, selectedSubjectId, score, 100);
    });
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 3000);
  };

  const handleResetMarks = () => {
    if (window.confirm(`Reset all marks for ${selectedSubject?.name} in ${selectedClass?.grade} (${selectedClass?.section}) to 0?`)) {
      const newMarksState = { ...marksState };
      classStudents.forEach((s) => {
        const key = `${selectedExamId}_${selectedSubjectId}_${s.id}`;
        newMarksState[key] = 0;
        if (canEditMarks) {
          saveExamResult(selectedExamId, s.id, selectedSubjectId, 0, 100);
        }
      });
      setMarksState(newMarksState);
    }
  };

  const fetchWaStatus = async () => {
    try {
      const res = await api.getWhatsAppStatus();
      setWaStatusState(res);
    } catch {
      setWaStatusState({ isConnected: false, status: 'disconnected', qrCode: null, user: null });
    }
  };

  const handleInitWaQr = async () => {
    setCheckingWaStatus(true);
    try {
      const res = await api.initializeWhatsApp();
      setWaStatusState({
        isConnected: res.status === 'connected',
        status: res.status,
        qrCode: res.qrCode,
        user: res.user || null,
      });
    } catch {
      setWaStatusState({ isConnected: false, status: 'disconnected', qrCode: null, user: null });
    } finally {
      setCheckingWaStatus(false);
    }
  };

  const handleGetPairingCode = async () => {
    if (!pairingPhone.trim()) return;
    setIsRequestingPairingCode(true);
    setPairingCodeState(null);
    try {
      const res = await api.requestWhatsAppPairingCode(pairingPhone.trim());
      if (res.success && res.pairingCode) {
        setPairingCodeState(res.pairingCode);
      } else {
        alert(res.error || 'Failed to generate 8-digit pairing code. Ensure phone number starts with country code (e.g. 94752572722).');
      }
    } catch (err: any) {
      alert(err.message || 'Error generating pairing code');
    } finally {
      setIsRequestingPairingCode(false);
    }
  };

  useEffect(() => {
    if (bulkWhatsAppModalOpen) {
      fetchWaStatus();
      const interval = setInterval(fetchWaStatus, 2500);
      return () => clearInterval(interval);
    }
  }, [bulkWhatsAppModalOpen]);

  const getStudentReportSummary = (student: Student) => {
    const classStudentsList = students.filter((s) => s.classId === (student.classId || selectedClassId));

    const studentRankings = classStudentsList.map((stu) => {
      const stuEnrolledIds = stu.enrolledSubjectIds && stu.enrolledSubjectIds.length > 0 ? stu.enrolledSubjectIds : null;
      const stuSubList = stuEnrolledIds ? subjects.filter((sub) => stuEnrolledIds.includes(sub.id)) : subjects;

      let totalScore = 0;
      let evaluatedCount = 0;

      stuSubList.forEach((sub) => {
        const draftKey = `${selectedExamId}_${sub.id}_${stu.id}`;
        const res = examResults.find(
          (r) => r.examId === selectedExamId && (r.studentId === stu.id || r.studentId === stu.studentNo) && r.subjectId === sub.id
        );
        const score = res ? res.marksObtained : (marksState[draftKey] !== undefined ? marksState[draftKey] : 0);
        if (res !== undefined || marksState[draftKey] !== undefined) {
          evaluatedCount++;
        }
        totalScore += score;
      });

      const avg = evaluatedCount > 0 ? totalScore / evaluatedCount : 0;
      return { studentId: stu.id, totalScore, avg };
    });

    studentRankings.sort((a, b) => b.totalScore - a.totalScore || b.avg - a.avg);

    const rankIndex = studentRankings.findIndex((r) => r.studentId === student.id);
    const classRankPosition = rankIndex !== -1 ? rankIndex + 1 : 1;
    const totalClassStudents = classStudentsList.length;

    const enrolledIds = student.enrolledSubjectIds;
    let studentMarksList: Array<{ label: string; score: number; grade: string; hasMark: boolean }> = [];

    if (enrolledIds && enrolledIds.length > 0) {
      studentMarksList = enrolledIds.map((subId) => {
        const sub = subjects.find((s) => s.id === subId);
        const res = examResults.find(
          (r) => r.examId === selectedExamId && (r.studentId === student.id || r.studentId === student.studentNo) && r.subjectId === subId
        );
        const draftKey = `${selectedExamId}_${subId}_${student.id}`;
        const hasMark = res !== undefined || marksState[draftKey] !== undefined;
        const score = res ? res.marksObtained : (marksState[draftKey] !== undefined ? marksState[draftKey] : 0);
        const grade = getGrade(score);
        return { label: sub ? sub.name : `Subject (${subId})`, score, grade, hasMark };
      });
    } else {
      const studentClassObj = classes.find((c) => c.id === student.classId) || selectedClass;
      const slots = getReportCardSlots(studentClassObj?.grade, student.id, subjects, examResults);
      studentMarksList = slots.map((slot) => {
        if (!slot.subject) {
          return { label: slot.label, score: 0, grade: 'F', hasMark: false };
        }
        const sub = slot.subject;
        const res = examResults.find(
          (r) => r.examId === selectedExamId && (r.studentId === student.id || r.studentId === student.studentNo) && r.subjectId === sub.id
        );
        const draftKey = `${selectedExamId}_${sub.id}_${student.id}`;
        const hasMark = res !== undefined || marksState[draftKey] !== undefined;
        const score = res ? res.marksObtained : (marksState[draftKey] !== undefined ? marksState[draftKey] : 0);
        const grade = getGrade(score);
        return { label: slot.label, score, grade, hasMark };
      });
    }

    const evaluated = studentMarksList.filter((m) => m.hasMark);
    const totalMarks = evaluated.reduce((acc, item) => acc + item.score, 0);
    const totalPossible = evaluated.length * 100;
    const studentAvg = evaluated.length > 0 ? (totalMarks / evaluated.length).toFixed(1) : '0';
    const hasFailedSubject = evaluated.some((m) => m.grade === 'F');
    const numAvg = Number(studentAvg);

    let finalRemarks = 'Passed';
    if (hasFailedSubject) finalRemarks = 'Remedial Action Needed';
    else if (numAvg >= 75) finalRemarks = 'Passed with Distinction';
    else if (numAvg >= 65) finalRemarks = 'Passed with Merit';
    else if (numAvg >= 55) finalRemarks = 'Passed with Credit';
    else finalRemarks = 'Passed';

    const guardianPhone = (student.guardianPhone || student.phone || '').trim();

    return {
      studentMarksList,
      totalMarks,
      totalPossible,
      studentAvg,
      rankPosition: classRankPosition,
      totalClassStudents,
      finalRemarks,
      guardianPhone,
    };
  };

  const handleStartBulkWhatsAppDispatch = async () => {
    if (classStudents.length === 0) return;
    setBulkDispatching(true);
    setDispatchCompleted(false);
    setBulkLogs([]);
    setBulkProgress({ sent: 0, total: classStudents.length, currentName: '' });

    const currentClassTeacherRecord = teachers.find(
      (t) => t.id === selectedClass?.classTeacherId || t.userId === selectedClass?.classTeacherId || t.employeeNo === selectedClass?.classTeacherId
    );
    const currentClassTeacherUser = users.find((u) => u.id === currentClassTeacherRecord?.userId || u.id === selectedClass?.classTeacherId);
    const classTeacherName = currentClassTeacherUser?.fullName || 'Class Teacher';
    const schoolName = schoolProfile?.schoolName || 'Government Senior Model School';
    const examName = selectedExam?.name || 'First Term Examination 2026';
    const classNameStr = `${selectedClass?.grade} (${selectedClass?.section})`;

    const newLogs: Array<{ studentId: string; studentName: string; phone: string; status: 'sent' | 'failed' | 'skipped'; error?: string; timestamp: string }> = [];

    for (let i = 0; i < classStudents.length; i++) {
      const stu = classStudents[i];
      const stuName = `${stu.firstName} ${stu.lastName}`;
      setBulkProgress({ sent: i, total: classStudents.length, currentName: stuName });

      const summary = getStudentReportSummary(stu);

      if (!summary.guardianPhone) {
        newLogs.push({
          studentId: stu.id,
          studentName: stuName,
          phone: 'No phone recorded',
          status: 'skipped',
          error: 'Missing guardian contact phone number',
          timestamp: new Date().toLocaleTimeString(),
        });
        setBulkLogs([...newLogs]);
        await new Promise((r) => setTimeout(r, 150));
        continue;
      }

      const message = (
        `🎓 *OFFICIAL ACADEMIC REPORT CARD*\n` +
        `🏛 *${schoolName.toUpperCase()}*\n` +
        `📅 *Exam:* ${examName}\n` +
        `🏫 *Class:* ${classNameStr}\n\n` +
        `Dear Parent/Guardian of *${stuName}* (Roll No: ${stu.studentNo}),\n\n` +
        `Here is the academic performance summary for ${examName}:\n\n` +
        `📊 *SUMMARY METRICS:*\n` +
        `• Total Marks: *${summary.totalMarks} / ${summary.totalPossible}*\n` +
        `• Average: *${summary.studentAvg}%*\n` +
        `• Class Rank: *🏆 ${summary.rankPosition} of ${summary.totalClassStudents}*\n` +
        `• Result Status: *${summary.finalRemarks}*\n\n` +
        `📚 *SUBJECT MARKS BREAKDOWN:*\n` +
        summary.studentMarksList.map((m) => `  • ${m.label}: *${m.hasMark ? `${m.score} (${m.grade})` : 'Awaiting'}*`).join('\n') +
        `\n\n` +
        (customTeacherNote.trim() ? `💬 *Class Teacher Note:*\n"${customTeacherNote.trim()}"\n\n` : '') +
        `👨‍🏫 Class Teacher: ${classTeacherName}\n` +
        `----------------------------------------\n` +
        `Verified Record • Government School Management System`
      );

      try {
        const res = await api.sendReportWhatsAppPDF({
          toPhone: summary.guardianPhone,
          studentName: stuName,
          studentNo: stu.studentNo,
          className: classNameStr,
          examName: examName,
          academicYear: Number(selectedExam?.academicYear) || 2026,
          studentMarksList: summary.studentMarksList,
          totalMarks: summary.totalMarks,
          totalPossible: summary.totalPossible,
          studentAvg: summary.studentAvg,
          rankPosition: summary.rankPosition,
          totalClassStudents: summary.totalClassStudents,
          finalRemarks: summary.finalRemarks,
          teacherNote: customTeacherNote,
          classTeacherName: classTeacherName,
          principalName: schoolProfile?.principalName || 'A. R. Gunawardena',
          schoolName: schoolName,
          schoolCode: schoolProfile?.schoolCode || 'GSMS-2026/ZONE-01',
          zone: schoolProfile?.zone || 'Eastern Educational Zone',
        });

        if (res.success) {
          newLogs.push({
            studentId: stu.id,
            studentName: stuName,
            phone: summary.guardianPhone,
            status: 'sent',
            timestamp: new Date().toLocaleTimeString(),
          });
        } else {
          newLogs.push({
            studentId: stu.id,
            studentName: stuName,
            phone: summary.guardianPhone,
            status: 'failed',
            error: res.error || 'WhatsApp service timeout',
            timestamp: new Date().toLocaleTimeString(),
          });
        }
      } catch (err: any) {
        newLogs.push({
          studentId: stu.id,
          studentName: stuName,
          phone: summary.guardianPhone,
          status: 'failed',
          error: err.message || 'Dispatch error',
          timestamp: new Date().toLocaleTimeString(),
        });
      }

      setBulkLogs([...newLogs]);
      setBulkProgress({ sent: i + 1, total: classStudents.length, currentName: stuName });
      await new Promise((r) => setTimeout(r, 400));
    }

    setBulkDispatching(false);
    setDispatchCompleted(true);

    const deliveredCount = newLogs.filter((l) => l.status === 'sent').length;
    api.createNotification({
      title: `WhatsApp Batch Report Card Broadcast`,
      message: `Class Teacher sent ${deliveredCount} of ${classStudents.length} student report cards for ${classNameStr} via WhatsApp.`,
      recipientId: 'all',
    });
  };

  const totalScores = classStudents.map((s) => getMarksObtained(s.id));
  const avgScore = totalScores.length > 0 ? Math.round(totalScores.reduce((a, b) => a + b, 0) / totalScores.length) : 0;
  const passedStudentsCount = totalScores.filter((score) => score >= 40).length;
  const classPassRate = totalScores.length > 0 ? Math.round((passedStudentsCount / totalScores.length) * 100) : 0;

  return (
    <div className="space-y-6 animate-fade-in">
      <PageHeader
        eyebrow={<Badge tone="brand">Term exams & marks</Badge>}
        title="Marks entry & report cards"
        description="Enter term exam scores and generate official student report cards."
        actions={
          <div className="flex flex-wrap items-center gap-2 sm:gap-2.5 w-full 2xl:w-auto">
            <CustomSelect
              className="w-full sm:w-48 lg:w-52"
              options={(exams && exams.length > 0 ? exams : [
                { id: 'exam-term1-2026', name: 'First Term Examination 2026' },
                { id: 'exam-term2-2026', name: 'Second Term Examination 2026' },
                { id: 'exam-term3-2026', name: 'Third Term Examination 2026' },
              ]).map((e) => ({ value: e.id, label: e.name }))}
              value={selectedExamId}
              onChange={setSelectedExamId}
            />
            <CustomSelect
              className="w-full sm:w-44 lg:w-48"
              options={classes.map((c) => ({
                value: c.id,
                label: `${c.grade} - Section ${c.section}${isTeacherRole && c.id === assignedClassId ? ' (Your class)' : ''}`,
              }))}
              value={selectedClassId}
              onChange={setSelectedClassId}
              disabled={isTeacherRole}
            />
            <CustomSelect
              className="w-full sm:w-56 lg:w-64 max-w-full"
              options={getCategorizedSubjectOptions(subjects, (s) => `${s.name} (${s.code})`)}
              value={selectedSubjectId}
              onChange={setSelectedSubjectId}
            />

            {canEditMarks ? (
              <Button onClick={handleSaveAll} className="w-full sm:w-auto shrink-0 whitespace-nowrap">
                <Save className="w-4 h-4" /> Save marks sheet
              </Button>
            ) : (
              <Badge tone="neutral" className="shrink-0" title="Principal & admin view is read-only. Only assigned subject teachers can enter exam marks.">
                <Eye className="w-3.5 h-3.5" /> Read-only view
              </Badge>
            )}
          </div>
        }
      />

      {isPrincipalOrAdmin && (
        <Card className="text-sm text-ink flex items-center justify-between gap-3">
          <span className="flex items-center gap-2">
            <Eye className="w-4 h-4 text-ink-faint shrink-0" />
            <span><strong className="font-semibold">Principal read-only access</strong> — you can inspect exam marks & report cards across all classes; mark entry is restricted to assigned subject teachers.</span>
          </span>
          <Badge tone="neutral">Principal</Badge>
        </Card>
      )}

      {isTeacherRole && (
        <Card className="text-sm text-ink flex items-center justify-between gap-3">
          <span className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-brand shrink-0" />
            <span><strong className="font-semibold">Subject teacher entry access</strong> — you can enter & save exam marks for {selectedClass?.grade} ({selectedClass?.section}).</span>
          </span>
          <Badge tone="brand">Class teacher</Badge>
        </Card>
      )}

      {savedSuccess && (
        <div className="p-3 bg-success-tint text-success text-sm rounded-lg flex items-center gap-2 animate-fade-in">
          <CheckCircle className="w-4 h-4" />
          <span>Exam marks saved. Grade rankings recalculated.</span>
        </div>
      )}

      {/* Marks Entry Sheet */}
      <Card padded={false}>
        <div className="px-6 py-3.5 border-b border-border flex flex-wrap items-center justify-between gap-3">
          <span className="text-sm font-semibold text-ink">
            {selectedExam?.name} • {selectedClass?.grade} ({selectedClass?.section}) • {selectedSubject?.name}
          </span>
          <div className="flex items-center gap-2.5 flex-wrap">
            <Button
              size="sm"
              onClick={() => setBulkWhatsAppModalOpen(true)}
              className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold flex items-center gap-1.5 shadow-sm"
              title="Send cumulative report card summaries for all students in this class to guardians via WhatsApp"
            >
              <Smartphone className="w-4 h-4" /> Send All Reports via WhatsApp
            </Button>
            <Button size="sm" variant="ghost" className="text-danger hover:bg-danger-tint" onClick={handleResetMarks}>
              <RotateCcw className="w-3.5 h-3.5" /> Reset sheet
            </Button>
            <div className="flex items-center gap-1.5 bg-surface-muted px-3 py-1.5 rounded-lg text-xs font-semibold text-ink-muted">
              <span>Class avg:</span>
              <span className="font-mono-data text-ink">{avgScore} / 100</span>
            </div>
            <Badge tone="brand">
              <Award className="w-3.5 h-3.5" /> Pass rate {classPassRate}%
            </Badge>
          </div>
        </div>

        {(() => {
          const itemsPerPage = 10;
          const totalPages = Math.max(1, Math.ceil(classStudents.length / itemsPerPage));
          const safeMarksPage = Math.min(marksPage, totalPages);
          const startIndex = (safeMarksPage - 1) * itemsPerPage;
          const endIndex = Math.min(startIndex + itemsPerPage, classStudents.length);
          const paginatedStudents = classStudents.slice(startIndex, endIndex);

          return (
            <>
              <Table>
                <THead>
                  <tr>
                    <TH className="w-16">#</TH>
                    <TH>Student ID</TH>
                    <TH>Full student name</TH>
                    <TH className="text-center">Marks (0-100)</TH>
                    <TH className="text-center">Grade</TH>
                    <TH className="text-right">Report card</TH>
                  </tr>
                </THead>
                <TBody>
                  {paginatedStudents.map((s, idx) => {
                    const realIndex = startIndex + idx + 1;
                    const score = getMarksObtained(s.id);
                    const grade = getGrade(score);

                    return (
                      <TR key={s.id}>
                        <TD className="text-ink-faint font-mono-data">{realIndex}</TD>
                        <TD className="font-mono-data font-semibold">{s.studentNo}</TD>
                        <TD className="font-medium text-ink">{s.firstName} {s.lastName}</TD>
                        <TD className="text-center">
                          {canEditMarks ? (
                            <input
                              type="number"
                              min="0"
                              max="100"
                              value={score}
                              onChange={(e) => handleScoreChange(s.id, e.target.value)}
                              className="w-20 text-center font-mono-data text-sm font-semibold bg-surface-muted border border-border rounded-lg py-1.5 px-2 text-ink focus:outline-none focus:border-brand"
                            />
                          ) : (
                            <span className="inline-block w-16 py-1.5 px-2 bg-surface-muted border border-border rounded-lg font-mono-data text-sm font-semibold text-ink text-center">
                              {score}
                            </span>
                          )}
                        </TD>
                        <TD className="text-center">
                          <Badge tone={gradeTone(grade)}>{grade}</Badge>
                        </TD>
                        <TD className="text-right">
                          <button
                            onClick={() => setSelectedReportStudent(s)}
                            className="px-3 py-1.5 bg-surface-muted hover:bg-border text-ink-muted hover:text-ink rounded-lg text-xs font-semibold flex items-center gap-1.5 ml-auto transition-colors"
                          >
                            <FileText className="w-3.5 h-3.5" /> View report card
                          </button>
                        </TD>
                      </TR>
                    );
                  })}
                </TBody>
              </Table>

              {totalPages > 1 && (
                <div className="flex items-center justify-between p-4 border-t border-border text-sm">
                  <span className="text-ink-muted">
                    Showing <strong className="text-ink">{startIndex + 1}</strong>–<strong className="text-ink">{endIndex}</strong> of <strong className="text-ink">{classStudents.length}</strong> students
                  </span>

                  <div className="flex items-center gap-1">
                    <button
                      disabled={safeMarksPage === 1}
                      onClick={() => setMarksPage((p) => Math.max(1, p - 1))}
                      className="px-3 py-1.5 rounded-lg bg-surface-muted hover:bg-border disabled:opacity-40 disabled:cursor-not-allowed font-semibold text-xs flex items-center gap-1 transition-colors"
                    >
                      <ChevronLeft className="w-3.5 h-3.5" /> Prev
                    </button>

                    {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
                      <button
                        key={p}
                        onClick={() => setMarksPage(p)}
                        className={`w-8 h-8 rounded-lg font-semibold text-xs transition-colors ${
                          safeMarksPage === p ? 'bg-brand text-white' : 'bg-surface-muted text-ink-muted hover:text-ink'
                        }`}
                      >
                        {p}
                      </button>
                    ))}

                    <button
                      disabled={safeMarksPage === totalPages}
                      onClick={() => setMarksPage((p) => Math.min(totalPages, p + 1))}
                      className="px-3 py-1.5 rounded-lg bg-surface-muted hover:bg-border disabled:opacity-40 disabled:cursor-not-allowed font-semibold text-xs flex items-center gap-1 transition-colors"
                    >
                      Next <ChevronRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              )}
            </>
          );
        })()}
      </Card>

      {/* Printable Report Card Modal */}
      <Modal
        open={Boolean(selectedReportStudent)}
        onClose={() => setSelectedReportStudent(null)}
        title="Official Government Academic Report Card"
        size="xl"
        footer={
          <div className="flex items-center justify-between w-full">
            <div className="text-xs text-ink-muted hidden sm:block">
              Official Government School Record • Print-ready A4 Sheet
            </div>
            <div className="flex items-center gap-2 ml-auto">
              <Button variant="secondary" onClick={() => { setSignatureTarget('teacher'); setSignatureModalOpen(true); }}>
                <PenTool className="w-4 h-4" /> Digital Signatures
              </Button>
              <Button variant="secondary" onClick={() => setSelectedReportStudent(null)}>Close</Button>
              <Button onClick={() => window.print()} className="bg-slate-900 hover:bg-slate-800 text-amber-400">
                <Printer className="w-4 h-4" /> Print Official Report Card
              </Button>
            </div>
          </div>
        }
      >
        {selectedReportStudent && (() => {
          // Calculate Class Rank Position for all students in the class
          const classStudentsList = students.filter((s) => s.classId === (selectedReportStudent.classId || selectedClassId));

          const studentRankings = classStudentsList.map((stu) => {
            const stuEnrolledIds = stu.enrolledSubjectIds && stu.enrolledSubjectIds.length > 0 ? stu.enrolledSubjectIds : null;
            const stuSubList = stuEnrolledIds ? subjects.filter((sub) => stuEnrolledIds.includes(sub.id)) : subjects;

            let totalScore = 0;
            let evaluatedCount = 0;

            stuSubList.forEach((sub) => {
              const draftKey = `${selectedExamId}_${sub.id}_${stu.id}`;
              const res = examResults.find(
                (r) => r.examId === selectedExamId && (r.studentId === stu.id || r.studentId === stu.studentNo) && r.subjectId === sub.id
              );
              const score = res ? res.marksObtained : (marksState[draftKey] !== undefined ? marksState[draftKey] : 0);
              if (res !== undefined || marksState[draftKey] !== undefined) {
                evaluatedCount++;
              }
              totalScore += score;
            });

            const avg = evaluatedCount > 0 ? totalScore / evaluatedCount : 0;
            return {
              studentId: stu.id,
              totalScore,
              avg,
            };
          });

          studentRankings.sort((a, b) => b.totalScore - a.totalScore || b.avg - a.avg);

          const rankIndex = studentRankings.findIndex((r) => r.studentId === selectedReportStudent.id);
          const classRankPosition = rankIndex !== -1 ? rankIndex + 1 : 1;
          const totalClassStudents = classStudentsList.length;

          const getOrdinal = (n: number) => {
            const s = ['th', 'st', 'nd', 'rd'];
            const v = n % 100;
            return n + (s[(v - 20) % 10] || s[v] || s[0]);
          };

          // Filter report card subjects strictly by student's enrolled subjects if defined
          const enrolledIds = selectedReportStudent.enrolledSubjectIds;
          let studentMarksList: Array<{
            key: string;
            sub: Subject | null;
            label: string;
            hasMark: boolean;
            score: number;
            grade: string;
            statusText: string;
          }> = [];

          if (enrolledIds && enrolledIds.length > 0) {
            studentMarksList = enrolledIds.map((subId) => {
              const sub = subjects.find((s) => s.id === subId) || null;
              const res = examResults.find(
                (r) => r.examId === selectedExamId && (r.studentId === selectedReportStudent.id || r.studentId === selectedReportStudent.studentNo) && r.subjectId === subId
              );
              const draftKey = `${selectedExamId}_${subId}_${selectedReportStudent.id}`;
              const hasMark = res !== undefined || marksState[draftKey] !== undefined;
              const score = res ? res.marksObtained : (marksState[draftKey] !== undefined ? marksState[draftKey] : 0);
              const grade = getGrade(score);

              let statusText = 'Awaiting Evaluation';
              if (hasMark) {
                if (grade === 'A') statusText = 'Distinction';
                else if (grade === 'B') statusText = 'Very Good Merit';
                else if (grade === 'C') statusText = 'Credit Pass';
                else if (grade === 'S') statusText = 'Ordinary Pass';
                else statusText = 'Remedial Action';
              }

              return {
                key: subId,
                sub,
                label: sub ? sub.name : `Subject (${subId})`,
                hasMark,
                score,
                grade,
                statusText,
              };
            });
          } else {
            const reportCardStudentClass = classes.find((c) => c.id === selectedReportStudent.classId) || selectedClass;
            const slots = getReportCardSlots(reportCardStudentClass?.grade, selectedReportStudent.id, subjects, examResults);
            studentMarksList = slots.map((slot) => {
              if (!slot.subject) {
                return { key: slot.key, sub: null as Subject | null, label: slot.label, hasMark: false, score: 0, grade: 'F', statusText: 'Elective Not Selected' };
              }
              const sub = slot.subject;
              const res = examResults.find(
                (r) => r.examId === selectedExamId && (r.studentId === selectedReportStudent.id || r.studentId === selectedReportStudent.studentNo) && r.subjectId === sub.id
              );
              const draftKey = `${selectedExamId}_${sub.id}_${selectedReportStudent.id}`;
              const hasMark = res !== undefined || marksState[draftKey] !== undefined;
              const score = res ? res.marksObtained : (marksState[draftKey] !== undefined ? marksState[draftKey] : 0);
              const grade = getGrade(score);

              let statusText = 'Awaiting Evaluation';
              if (hasMark) {
                if (grade === 'A') statusText = 'Distinction';
                else if (grade === 'B') statusText = 'Very Good Merit';
                else if (grade === 'C') statusText = 'Credit Pass';
                else if (grade === 'S') statusText = 'Ordinary Pass';
                else statusText = 'Remedial Action';
              }

              return { key: slot.key, sub, label: slot.label, hasMark, score, grade, statusText };
            });
          }

          const evaluated = studentMarksList.filter((m) => m.hasMark);
          const totalMarks = evaluated.reduce((acc, item) => acc + item.score, 0);
          const totalPossible = evaluated.length * 100;
          const studentAvg = evaluated.length > 0 ? (totalMarks / evaluated.length).toFixed(1) : '0';
          const hasFailedSubject = evaluated.some((m) => m.grade === 'F');
          const numAvg = Number(studentAvg);

          let finalRemarks = 'Passed';
          if (hasFailedSubject) finalRemarks = 'Remedial';
          else if (numAvg >= 75) finalRemarks = 'Pass (Distinction)';
          else if (numAvg >= 65) finalRemarks = 'Pass (Merit)';
          else if (numAvg >= 55) finalRemarks = 'Pass (Credit)';
          else finalRemarks = 'Passed';

          const currentClassTeacherRecord = teachers.find((t) => t.id === selectedClass?.classTeacherId || t.userId === selectedClass?.classTeacherId || t.employeeNo === selectedClass?.classTeacherId);
          const currentClassTeacherUser = users.find((u) => u.id === currentClassTeacherRecord?.userId || u.id === selectedClass?.classTeacherId);
          const classTeacherForReport = currentClassTeacherUser?.fullName || (currentClassTeacherRecord ? `${currentClassTeacherRecord.employeeNo}${currentClassTeacherRecord.subjectSpecialization ? ` (${currentClassTeacherRecord.subjectSpecialization})` : ''}` : 'Class Teacher');

          return (
            <div id="government-report-sheet" className="p-6 md:p-8 bg-amber-50/20 dark:bg-slate-900 border-4 border-double border-slate-800 dark:border-amber-500/50 rounded-2xl shadow-xl relative overflow-hidden text-slate-800 dark:text-slate-100 font-sans print:p-0 print:border-none print:shadow-none print:bg-white print:overflow-visible print:max-h-none print:h-auto">
              {/* Watermark Background Emblem */}
              <div className="absolute inset-0 flex items-center justify-center opacity-[0.03] dark:opacity-[0.05] pointer-events-none select-none">
                <GraduationCap className="w-96 h-96 text-slate-900 dark:text-amber-400" />
              </div>

              {/* Top Government Emblem Header */}
              <div className="text-center space-y-2 border-b-2 border-amber-600/40 pb-5 relative z-10">
                <div className="flex items-center justify-center gap-3">
                  <div className="w-12 h-12 rounded-full bg-gradient-to-br from-amber-500 to-amber-700 text-white flex items-center justify-center shadow-md border-2 border-amber-300">
                    <Award className="w-7 h-7" />
                  </div>
                  <div>
                    <div className="text-[11px] uppercase tracking-widest font-black text-amber-700 dark:text-amber-400">
                      GOVERNMENT OF SRI LANKA · DEPARTMENT OF EDUCATION
                    </div>
                    <h1 className="text-2xl md:text-3xl font-serif font-black tracking-tight text-slate-900 dark:text-white uppercase">
                      {schoolProfile?.schoolName || 'Government Senior Model School'}
                    </h1>
                  </div>
                  <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-900 to-slate-900 text-amber-400 flex items-center justify-center shadow-md border-2 border-amber-400/40">
                    <ShieldCheck className="w-7 h-7" />
                  </div>
                </div>

                <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-1 text-xs font-medium text-slate-600 dark:text-slate-300 pt-1">
                  <span>School Code: <strong className="font-mono text-slate-900 dark:text-amber-300">{schoolProfile?.schoolCode || 'GSMS-2026/ZONE-01'}</strong></span>
                  <span>•</span>
                  <span>Zone: <strong className="text-slate-900 dark:text-amber-300">{schoolProfile?.zone || 'Eastern Educational Zone'}</strong></span>
                  <span>•</span>
                  <span>Academic Year: <strong className="text-slate-900 dark:text-amber-300">{selectedExam?.academicYear || 2026}</strong></span>
                </div>

                <div className="inline-block mt-2 px-5 py-1 bg-gradient-to-r from-blue-950 via-slate-900 to-blue-950 text-amber-300 font-serif font-bold text-xs uppercase tracking-wider rounded-full shadow-inner border border-amber-500/40">
                  Official Cumulative Student Academic Performance & Evaluation Report
                </div>
              </div>

              {/* Exam Term Banner & Student Details Ledger */}
              <div className="mt-5 space-y-4 relative z-10">
                <div className="flex items-center justify-between bg-slate-900 text-white px-4 py-2.5 rounded-xl text-xs font-bold uppercase tracking-wider border border-amber-500/30">
                  <span>EXAMINATION TERM: {selectedExam?.name || 'FIRST TERM EXAMINATION 2026'}</span>
                </div>

                <div className="grid grid-cols-3 gap-4 bg-white dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 p-4 rounded-xl shadow-xs text-xs">
                  <div className="space-y-0.5">
                    <span className="text-[10px] uppercase tracking-wider font-bold text-slate-400">Student Name</span>
                    <div className="font-bold text-base text-slate-900 dark:text-white capitalize">
                      {selectedReportStudent.firstName} {selectedReportStudent.lastName}
                    </div>
                  </div>
                  <div className="space-y-0.5">
                    <span className="text-[10px] uppercase tracking-wider font-bold text-slate-400">Class & Section</span>
                    <div className="font-bold text-base text-slate-900 dark:text-white">
                      {selectedClass?.grade} ({selectedClass?.section})
                    </div>
                  </div>
                  <div className="space-y-0.5">
                    <span className="text-[10px] uppercase tracking-wider font-bold text-slate-400">Class Teacher</span>
                    <div className="font-semibold text-sm text-slate-800 dark:text-slate-200 truncate">{classTeacherForReport}</div>
                  </div>
                </div>
              </div>

              {/* Subject Performance Matrix Table */}
              <div className="mt-5 border-2 border-slate-800 dark:border-slate-600 rounded-xl overflow-hidden shadow-sm relative z-10 bg-white dark:bg-slate-900">
                <table className="w-full text-xs text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-900 text-white uppercase text-[11px] font-bold tracking-wider divide-x divide-slate-700">
                      <th className="py-2.5 px-3 text-center w-10">#</th>
                      <th className="py-2.5 px-3 w-24">Code</th>
                      <th className="py-2.5 px-4">Subject Title</th>
                      <th className="py-2.5 px-3 text-center w-20">Max</th>
                      <th className="py-2.5 px-3 text-center w-24">Marks</th>
                      <th className="py-2.5 px-3 text-center w-20">Grade</th>
                      <th className="py-2.5 px-4 text-right">Remarks</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
                    {studentMarksList.map((item, idx) => (
                      <tr key={item.key} className={`hover:bg-slate-50 dark:hover:bg-slate-800/50 ${idx % 2 === 0 ? 'bg-white dark:bg-slate-900' : 'bg-slate-50/60 dark:bg-slate-800/30'}`}>
                        <td className="py-2.5 px-3 text-center font-mono text-slate-400">{idx + 1}</td>
                        <td className="py-2.5 px-3 font-mono font-bold text-blue-700 dark:text-blue-400">{item.sub?.code || '—'}</td>
                        <td className="py-2.5 px-4 font-semibold text-slate-900 dark:text-white">
                          {item.sub ? item.sub.name : item.label}
                          {item.sub?.category === 'compulsory' && <span className="ml-2 text-[10px] text-amber-700 bg-amber-100 dark:bg-amber-900/40 dark:text-amber-300 px-1.5 py-0.5 rounded font-mono font-normal">Core</span>}
                        </td>
                        <td className="py-2.5 px-3 text-center font-mono text-slate-500">100</td>
                        <td className="py-2.5 px-3 text-center font-mono font-extrabold text-sm text-slate-900 dark:text-white">
                          {item.hasMark ? item.score : <span className="text-slate-400 font-normal italic">Awaiting</span>}
                        </td>
                        <td className="py-2.5 px-3 text-center">
                          {item.hasMark ? (
                            <span className={`inline-block px-2.5 py-0.5 rounded font-mono font-bold text-xs shadow-xs ${
                              item.grade === 'A' ? 'bg-emerald-600 text-white' :
                              item.grade === 'B' ? 'bg-blue-600 text-white' :
                              item.grade === 'C' ? 'bg-amber-600 text-white' :
                              item.grade === 'S' ? 'bg-slate-600 text-white' : 'bg-rose-600 text-white'
                            }`}>
                              {item.grade}
                            </span>
                          ) : (
                            <span className="text-slate-400">—</span>
                          )}
                        </td>
                        <td className="py-2.5 px-4 text-right font-medium text-slate-600 dark:text-slate-300">
                          {item.statusText}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Executive Metrics Summary Cards */}
              <div className="mt-5 grid grid-cols-4 gap-3 relative z-10 text-xs">
                <div className="p-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-center space-y-1 shadow-xs">
                  <span className="text-[11px] font-bold tracking-wide text-slate-500 dark:text-slate-400">Total Marks</span>
                  <div className="text-base font-mono font-extrabold text-slate-900 dark:text-white">
                    {totalMarks} <span className="text-xs font-normal text-slate-400">/ {totalPossible}</span>
                  </div>
                </div>
                <div className="p-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-center space-y-1 shadow-xs">
                  <span className="text-[11px] font-bold tracking-wide text-slate-500 dark:text-slate-400">Average</span>
                  <div className="text-base font-mono font-extrabold text-blue-600 dark:text-blue-400">
                    {studentAvg}%
                  </div>
                </div>
                <div className="p-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-center space-y-1 shadow-xs">
                  <span className="text-[11px] font-bold tracking-wide text-slate-500 dark:text-slate-400">Rank</span>
                  <div className="text-base font-extrabold text-amber-600 dark:text-amber-400">
                    🏆 {getOrdinal(classRankPosition)} <span className="text-xs font-normal text-slate-400">of {totalClassStudents}</span>
                  </div>
                </div>
                <div className={`p-3 border rounded-xl text-center space-y-1 shadow-xs ${
                  hasFailedSubject ? 'bg-rose-50 dark:bg-rose-950/30 border-rose-300 text-rose-700 dark:text-rose-300' : 'bg-emerald-50 dark:bg-emerald-950/30 border-emerald-300 text-emerald-700 dark:text-emerald-300'
                }`}>
                  <span className="text-[11px] font-bold tracking-wide opacity-80">Status</span>
                  <div className="text-sm font-extrabold">{finalRemarks}</div>
                </div>
              </div>

              {/* Grading Reference Scheme Legend */}
              <div className="mt-4 p-3 bg-slate-100 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-xl flex flex-wrap items-center justify-between gap-2 text-[11px] text-slate-600 dark:text-slate-300 relative z-10">
                <span className="font-bold text-slate-900 dark:text-amber-400 uppercase tracking-wider">Ministry Grading Key:</span>
                <div className="flex items-center gap-3 flex-wrap font-mono">
                  <span><strong className="text-emerald-600 font-bold">A</strong> (75-100% Distinction)</span>
                  <span><strong className="text-blue-600 font-bold">B</strong> (65-74% Very Good)</span>
                  <span><strong className="text-amber-600 font-bold">C</strong> (55-64% Credit Pass)</span>
                  <span><strong className="text-slate-600 font-bold">S</strong> (40-54% Ordinary Pass)</span>
                  <span><strong className="text-rose-600 font-bold">F</strong> (0-39% Weak/Fail)</span>
                </div>
              </div>

              {/* Official Stamp & Signatures Block */}
              <div className="mt-6 pt-5 border-t-2 border-slate-300 dark:border-slate-700 grid grid-cols-3 gap-4 items-end text-center text-xs relative z-10">
                {/* Left: Class Teacher */}
                <div
                  className="space-y-1 relative group cursor-pointer p-1 rounded-lg hover:bg-amber-100/30 dark:hover:bg-slate-800/40 transition-colors"
                  title="Click to add/edit digital signature"
                  onClick={() => { setSignatureTarget('teacher'); setSignatureModalOpen(true); }}
                >
                  <div className="h-12 flex items-end justify-center">
                    {digitalSignatures.teacherSignature ? (
                      <img src={digitalSignatures.teacherSignature} alt="Class Teacher Digital Signature" className="h-11 max-w-[150px] object-contain filter drop-shadow-xs" />
                    ) : (
                      <span className="font-serif italic text-blue-900 dark:text-blue-300 text-base font-bold">{classTeacherForReport}</span>
                    )}
                  </div>
                  <div className="border-b border-slate-400 w-4/5 mx-auto" />
                  <div className="font-bold text-slate-900 dark:text-white">{classTeacherForReport}</div>
                  <div className="text-[10px] text-slate-500 uppercase tracking-wider font-semibold flex items-center justify-center gap-1">
                    <span>Class Teacher Signature</span>
                    <PenTool className="w-3 h-3 text-brand opacity-60 group-hover:opacity-100 transition-opacity print:hidden" />
                  </div>
                </div>

                {/* Center: Official Government School Stamp Seal */}
                <div className="flex flex-col items-center justify-center space-y-1">
                  <div className="w-20 h-20 rounded-full border-4 border-double border-red-700/80 dark:border-red-500 text-red-700 dark:text-red-400 flex flex-col items-center justify-center p-1 bg-red-50/50 dark:bg-red-950/20 transform -rotate-6 shadow-sm">
                    <ShieldCheck className="w-5 h-5 text-red-700 dark:text-red-400" />
                    <span className="text-[7px] font-black uppercase text-center leading-tight">OFFICE OF THE PRINCIPAL</span>
                    <span className="text-[8px] font-bold">APPROVED</span>
                    <span className="text-[6px] font-mono">SEAL & STAMP</span>
                  </div>
                  <span className="text-[9px] font-mono text-slate-400">Issued: {new Date().toLocaleDateString()}</span>
                </div>

                {/* Right: Principal Signature */}
                <div
                  className="space-y-1 relative group cursor-pointer p-1 rounded-lg hover:bg-amber-100/30 dark:hover:bg-slate-800/40 transition-colors"
                  title="Click to add/edit digital signature"
                  onClick={() => { setSignatureTarget('principal'); setSignatureModalOpen(true); }}
                >
                  <div className="h-12 flex items-end justify-center">
                    {digitalSignatures.principalSignature ? (
                      <img src={digitalSignatures.principalSignature} alt="Principal Digital Signature" className="h-11 max-w-[150px] object-contain filter drop-shadow-xs" />
                    ) : (
                      <span className="font-serif italic font-bold text-slate-900 dark:text-amber-300 text-base">
                        {schoolProfile?.principalName || 'A. R. Gunawardena'}
                      </span>
                    )}
                  </div>
                  <div className="border-b border-slate-400 w-4/5 mx-auto" />
                  <div className="font-bold text-slate-900 dark:text-white">{schoolProfile?.principalName || 'Principal'}</div>
                  <div className="text-[10px] text-slate-500 uppercase tracking-wider font-semibold flex items-center justify-center gap-1">
                    <span>Principal Seal & Signature</span>
                    <PenTool className="w-3 h-3 text-brand opacity-60 group-hover:opacity-100 transition-opacity print:hidden" />
                  </div>
                </div>
              </div>

              {/* Security QR & Verification Footer */}
              <div className="mt-4 pt-3 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between text-[10px] text-slate-400 font-mono">
                <span>SERIAL HASH: GSMS-2026-RPT-{(selectedReportStudent.id).slice(0, 8).toUpperCase()}</span>
                <span>VERIFIED GOVERNMENT SCHOOL RECORD SYSTEM</span>
              </div>
            </div>
          );
        })()}
      </Modal>

      {/* Digital Signature Pad Modal */}
      <Modal
        open={signatureModalOpen}
        onClose={() => setSignatureModalOpen(false)}
        title="Digital Signature Pad"
        size="md"
        footer={
          <div className="flex items-center justify-between w-full">
            <Button variant="ghost" onClick={handleClearCanvas} className="text-slate-600">
              <RotateCcw className="w-4 h-4" /> Clear Canvas
            </Button>
            <div className="flex items-center gap-2">
              <Button variant="secondary" onClick={() => setSignatureModalOpen(false)}>Cancel</Button>
              {signatureTab === 'draw' && (
                <Button onClick={handleSaveCanvasSignature} className="bg-brand text-white">
                  <CheckCircle className="w-4 h-4" /> Save Signature
                </Button>
              )}
            </div>
          </div>
        }
      >
        <div className="space-y-4">
          <div className="flex items-center justify-center bg-surface-muted p-1 rounded-xl border border-border">
            <button
              type="button"
              onClick={() => setSignatureTarget('teacher')}
              className={`flex-1 py-1.5 px-3 text-xs font-semibold rounded-lg transition-all ${
                signatureTarget === 'teacher' ? 'bg-surface text-ink shadow-xs' : 'text-ink-muted hover:text-ink'
              }`}
            >
              Class Teacher Signature
            </button>
            <button
              type="button"
              onClick={() => setSignatureTarget('principal')}
              className={`flex-1 py-1.5 px-3 text-xs font-semibold rounded-lg transition-all ${
                signatureTarget === 'principal' ? 'bg-surface text-ink shadow-xs' : 'text-ink-muted hover:text-ink'
              }`}
            >
              Principal Signature
            </button>
          </div>

          <div className="flex items-center gap-4 text-xs border-b border-border pb-2">
            <button
              type="button"
              onClick={() => setSignatureTab('draw')}
              className={`font-semibold pb-1 border-b-2 transition-colors ${
                signatureTab === 'draw' ? 'border-brand text-brand' : 'border-transparent text-ink-muted hover:text-ink'
              }`}
            >
              ✍️ Draw Signature
            </button>
            <button
              type="button"
              onClick={() => setSignatureTab('upload')}
              className={`font-semibold pb-1 border-b-2 transition-colors ${
                signatureTab === 'upload' ? 'border-brand text-brand' : 'border-transparent text-ink-muted hover:text-ink'
              }`}
            >
              📁 Upload Image File
            </button>
          </div>

          {signatureTab === 'draw' ? (
            <div className="space-y-2">
              <div className="text-xs text-ink-muted flex items-center justify-between">
                <span>Draw signature with mouse or touch:</span>
                <span className="text-[11px] font-semibold text-brand">Dark Navy Slate Ink</span>
              </div>
              <div className="border-2 border-dashed border-border rounded-xl bg-white dark:bg-slate-900 p-1 shadow-inner relative">
                <canvas
                  ref={canvasRef}
                  width={450}
                  height={150}
                  onMouseDown={handleStartDraw}
                  onMouseMove={handleDraw}
                  onMouseUp={handleStopDraw}
                  onMouseLeave={handleStopDraw}
                  onTouchStart={handleStartDraw}
                  onTouchMove={handleDraw}
                  onTouchEnd={handleStopDraw}
                  className="w-full h-36 touch-none cursor-crosshair rounded-lg bg-white dark:bg-slate-900"
                />
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="border-2 border-dashed border-border rounded-xl p-6 text-center space-y-3 bg-surface-muted/50">
                <div className="w-10 h-10 rounded-full bg-brand/10 text-brand mx-auto flex items-center justify-center">
                  <PenTool className="w-5 h-5" />
                </div>
                <div className="text-xs text-ink-muted">
                  Upload signature image (<strong className="text-ink">PNG with transparent background</strong> recommended).
                </div>
                <input
                  type="file"
                  accept="image/png, image/jpeg, image/webp, image/svg+xml"
                  onChange={handleFileUploadSignature}
                  className="block w-full text-xs text-ink file:mr-3 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-brand file:text-white hover:file:bg-brand-hover cursor-pointer"
                />
              </div>
            </div>
          )}

          {(digitalSignatures.teacherSignature || digitalSignatures.principalSignature) && (
            <div className="pt-2 border-t border-border flex items-center justify-between text-xs">
              <span className="text-ink-muted">Active Signatures:</span>
              <div className="flex items-center gap-2">
                {digitalSignatures.teacherSignature && (
                  <button
                    type="button"
                    onClick={() => setDigitalSignatures((prev) => ({ ...prev, teacherSignature: undefined }))}
                    className="text-[11px] text-danger hover:underline font-semibold"
                  >
                    Reset Teacher Signature
                  </button>
                )}
                {digitalSignatures.principalSignature && (
                  <button
                    type="button"
                    onClick={() => setDigitalSignatures((prev) => ({ ...prev, principalSignature: undefined }))}
                    className="text-[11px] text-danger hover:underline font-semibold"
                  >
                    Reset Principal Signature
                  </button>
                )}
              </div>
            </div>
          )}
        </div>
      </Modal>

      {/* Bulk WhatsApp Report Card Dispatcher Modal */}
      <Modal
        open={bulkWhatsAppModalOpen}
        onClose={() => {
          if (!bulkDispatching) {
            setBulkWhatsAppModalOpen(false);
          }
        }}
        title={`📱 Dispatch Academic Reports via WhatsApp — ${selectedClass?.grade} (${selectedClass?.section})`}
        size="xl"
        footer={
          <div className="flex items-center justify-between w-full">
            <div className="text-xs text-ink-muted flex items-center gap-2">
              <span>Class Students: <strong className="text-ink">{classStudents.length}</strong></span>
              <span>•</span>
              <span>Valid Contacts: <strong className="text-emerald-600 font-semibold">{classStudents.filter((s) => (s.guardianPhone || s.phone || '').trim().length > 0).length} Guardians</strong></span>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="secondary"
                onClick={() => setBulkWhatsAppModalOpen(false)}
                disabled={bulkDispatching}
              >
                {dispatchCompleted ? 'Close' : 'Cancel'}
              </Button>
              <Button
                onClick={handleStartBulkWhatsAppDispatch}
                disabled={bulkDispatching || classStudents.length === 0}
                className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold flex items-center gap-2 shadow-md"
              >
                {bulkDispatching ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Sending ({bulkProgress.sent}/{bulkProgress.total})...</span>
                  </>
                ) : dispatchCompleted ? (
                  <>
                    <RefreshCw className="w-4 h-4" />
                    <span>Re-send All Reports</span>
                  </>
                ) : (
                  <>
                    <Send className="w-4 h-4" />
                    <span>Send Reports to All Guardians ({classStudents.length})</span>
                  </>
                )}
              </Button>
            </div>
          </div>
        }
      >
        <div className="space-y-4">
          {/* WhatsApp Connection Engine Status Bar */}
          <div className="p-3.5 rounded-xl border flex items-center justify-between gap-3 text-xs bg-surface-muted border-border">
            <div className="flex items-center gap-2.5">
              <div className={`w-3 h-3 rounded-full shrink-0 ${waStatusState?.isConnected ? 'bg-emerald-500 animate-pulse' : 'bg-amber-500'}`} />
              <div>
                <span className="font-semibold text-ink">WhatsApp Web Service: </span>
                {checkingWaStatus ? (
                  <span className="text-ink-muted">Checking connection...</span>
                ) : waStatusState?.isConnected ? (
                  <span className="text-emerald-600 dark:text-emerald-400 font-bold">
                    Connected {waStatusState.user ? `(${waStatusState.user})` : '• Ready to dispatch live messages'}
                  </span>
                ) : (
                  <span className="text-amber-600 dark:text-amber-400 font-medium">
                    {waStatusState?.status === 'qr_ready' ? 'Scan Required (QR Code Ready below)' : waStatusState?.status === 'connecting' ? 'Connecting to WhatsApp socket...' : 'Scan QR Code below to connect'}
                  </span>
                )}
              </div>
            </div>
            <button
              type="button"
              onClick={handleInitWaQr}
              disabled={checkingWaStatus}
              className="text-xs text-brand hover:underline font-semibold flex items-center gap-1 shrink-0"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${checkingWaStatus ? 'animate-spin' : ''}`} /> Refresh QR
            </button>
          </div>

          {/* WhatsApp Connection Box (QR Code or 8-Digit Pairing Code) */}
          {!waStatusState?.isConnected && (
            <div className="p-4 rounded-xl border border-amber-300 bg-amber-50/60 dark:bg-amber-950/20 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Smartphone className="w-5 h-5 text-amber-600" />
                  <span className="text-xs font-bold text-slate-900 dark:text-amber-200">Connect WhatsApp Web</span>
                </div>
                <div className="flex items-center gap-1 bg-white dark:bg-slate-800 p-1 rounded-lg border border-slate-200 text-xs">
                  <button
                    type="button"
                    onClick={() => setWaConnectTab('qr')}
                    className={`px-2.5 py-1 rounded font-bold transition-all ${
                      waConnectTab === 'qr' ? 'bg-amber-500 text-white' : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    📷 Scan QR Code
                  </button>
                  <button
                    type="button"
                    onClick={() => setWaConnectTab('code')}
                    className={`px-2.5 py-1 rounded font-bold transition-all ${
                      waConnectTab === 'code' ? 'bg-amber-500 text-white' : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    🔑 8-Digit Code
                  </button>
                </div>
              </div>

              {waConnectTab === 'qr' ? (
                <div className="space-y-2.5">
                  <p className="text-xs text-slate-700 dark:text-slate-300 font-medium">
                    Open WhatsApp on your phone ➔ <strong>Settings / 3-dots ➔ Linked Devices ➔ Link a Device</strong>, then scan the QR code below:
                  </p>

                  {waStatusState?.qrCode ? (
                    <div className="flex flex-col items-center justify-center p-3 bg-white rounded-xl border border-slate-300 w-fit mx-auto shadow-sm">
                      <img src={waStatusState.qrCode} alt="WhatsApp QR Code" className="w-48 h-48 object-contain" />
                      <span className="text-[11px] text-emerald-700 font-bold mt-1.5 flex items-center gap-1">
                        <CheckCircle2 className="w-3.5 h-3.5" /> Ready to scan — connects automatically when scanned
                      </span>
                    </div>
                  ) : (
                    <div className="text-center py-5 bg-white dark:bg-slate-900 rounded-xl border border-dashed border-slate-300 space-y-2">
                      <p className="text-xs text-slate-600 dark:text-slate-400">Click below to generate a fresh QR Code instantly:</p>
                      <button
                        type="button"
                        onClick={handleInitWaQr}
                        className="px-4 py-2 bg-brand text-white font-bold text-xs rounded-lg shadow-xs hover:bg-brand-hover transition-colors inline-flex items-center gap-1.5 cursor-pointer"
                      >
                        <RefreshCw className={`w-3.5 h-3.5 ${checkingWaStatus ? 'animate-spin' : ''}`} /> Generate Live QR Code Now
                      </button>
                    </div>
                  )}
                </div>
              ) : (
                <div className="space-y-3 p-3 bg-white dark:bg-slate-900 rounded-xl border border-slate-200">
                  <div className="text-xs text-slate-700 dark:text-slate-300 font-semibold">
                    1. On your phone: Tap <strong>"Link with phone number instead"</strong> at the bottom of the WhatsApp scanning screen.
                  </div>
                  <div className="text-xs text-slate-700 dark:text-slate-300 font-semibold">
                    2. Enter your WhatsApp phone number below to receive your 8-digit pairing code:
                  </div>

                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      value={pairingPhone}
                      onChange={(e) => setPairingPhone(e.target.value)}
                      placeholder="e.g. 94752572722"
                      className="flex-1 text-xs font-mono p-2 border border-slate-300 rounded-lg bg-surface text-ink focus:outline-none focus:border-brand"
                    />
                    <Button
                      size="sm"
                      onClick={handleGetPairingCode}
                      disabled={isRequestingPairingCode || !pairingPhone.trim()}
                      className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold shrink-0"
                    >
                      {isRequestingPairingCode ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : 'Get 8-Digit Code'}
                    </Button>
                  </div>

                  {pairingCodeState && (
                    <div className="p-3 bg-emerald-50 dark:bg-emerald-950/40 border-2 border-emerald-500 rounded-xl text-center space-y-1">
                      <span className="text-[11px] uppercase tracking-wider font-bold text-emerald-800 dark:text-emerald-300">Your WhatsApp 8-Digit Pairing Code:</span>
                      <div className="text-2xl font-mono font-black text-emerald-600 dark:text-emerald-400 tracking-widest">
                        {pairingCodeState}
                      </div>
                      <p className="text-[11px] text-slate-600 dark:text-slate-300">
                        Enter this 8-digit code on your mobile phone screen to pair instantly.
                      </p>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Custom Class Teacher Message Note Input */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-ink flex items-center justify-between">
              <span className="flex items-center gap-1.5">
                <MessageSquare className="w-3.5 h-3.5 text-brand" /> Custom Class Teacher Remarks (Optional):
              </span>
              <span className="text-[11px] text-ink-muted">Appended to each guardian's report card</span>
            </label>
            <textarea
              rows={2}
              value={customTeacherNote}
              onChange={(e) => setCustomTeacherNote(e.target.value)}
              disabled={bulkDispatching}
              placeholder="e.g. Term 1 academic report card released. Parent-Teacher meeting scheduled for Friday at 10:00 AM."
              className="w-full text-xs bg-surface border border-border rounded-xl p-2.5 text-ink focus:outline-none focus:border-brand disabled:opacity-50"
            />
          </div>

          {/* Real-time Progress Bar */}
          {bulkDispatching && (
            <div className="p-3 bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800 rounded-xl space-y-2">
              <div className="flex items-center justify-between text-xs font-bold text-emerald-800 dark:text-emerald-300">
                <span className="flex items-center gap-2">
                  <Loader2 className="w-4 h-4 animate-spin text-emerald-600" />
                  Dispatching report for {bulkProgress.currentName}...
                </span>
                <span>{bulkProgress.sent} of {bulkProgress.total} ({Math.round((bulkProgress.sent / bulkProgress.total) * 100)}%)</span>
              </div>
              <div className="w-full bg-emerald-200 dark:bg-emerald-900 h-2.5 rounded-full overflow-hidden">
                <div
                  className="bg-emerald-600 h-full transition-all duration-300 rounded-full"
                  style={{ width: `${(bulkProgress.sent / bulkProgress.total) * 100}%` }}
                />
              </div>
            </div>
          )}

          {dispatchCompleted && (
            <div className="p-3 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-300 dark:border-emerald-700 rounded-xl text-xs flex items-center justify-between gap-2 text-emerald-800 dark:text-emerald-200">
              <span className="flex items-center gap-2 font-bold">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                WhatsApp report broadcast completed! Delivered to {bulkLogs.filter(l => l.status === 'sent').length} of {bulkProgress.total} guardians.
              </span>
              <Badge tone="success">Finished</Badge>
            </div>
          )}

          {/* Students Recipient Preview & Delivery Log Table */}
          <div className="border border-border rounded-xl overflow-hidden max-h-72 overflow-y-auto">
            <Table>
              <THead>
                <tr>
                  <TH className="w-10">#</TH>
                  <TH>Student Name & ID</TH>
                  <TH>Guardian Contact</TH>
                  <TH className="text-center">Total Marks</TH>
                  <TH className="text-center">Rank</TH>
                  <TH className="text-center">Status</TH>
                  <TH className="text-right">WhatsApp Status</TH>
                </tr>
              </THead>
              <TBody>
                {classStudents.map((s, idx) => {
                  const summary = getStudentReportSummary(s);
                  const logItem = bulkLogs.find((l) => l.studentId === s.id);

                  return (
                    <TR key={s.id}>
                      <TD className="text-ink-faint font-mono-data text-xs">{idx + 1}</TD>
                      <TD className="text-xs">
                        <div className="font-bold text-ink">{s.firstName} {s.lastName}</div>
                        <div className="text-[10px] text-ink-muted font-mono">{s.studentNo}</div>
                      </TD>
                      <TD className="text-xs font-mono">
                        {summary.guardianPhone ? (
                          <span className="text-emerald-700 dark:text-emerald-400 font-semibold">{summary.guardianPhone}</span>
                        ) : (
                          <span className="text-rose-500 italic text-[11px]">No phone registered</span>
                        )}
                      </TD>
                      <TD className="text-center font-mono-data text-xs font-bold">
                        {summary.totalMarks} / {summary.totalPossible} ({summary.studentAvg}%)
                      </TD>
                      <TD className="text-center text-xs font-extrabold text-amber-600">
                        #{summary.rankPosition}
                      </TD>
                      <TD className="text-center text-xs">
                        <span className={`inline-block px-2 py-0.5 rounded text-[11px] font-bold ${
                          summary.finalRemarks.includes('Remedial') ? 'bg-rose-100 text-rose-700 dark:bg-rose-900/40 dark:text-rose-300' : 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300'
                        }`}>
                          {summary.finalRemarks}
                        </span>
                      </TD>
                      <TD className="text-right text-xs">
                        {logItem ? (
                          logItem.status === 'sent' ? (
                            <span className="text-emerald-600 font-bold flex items-center gap-1 justify-end">
                              <CheckCircle2 className="w-3.5 h-3.5" /> Sent ({logItem.timestamp})
                            </span>
                          ) : logItem.status === 'skipped' ? (
                            <span className="text-amber-600 font-semibold flex items-center gap-1 justify-end">
                              <AlertCircle className="w-3.5 h-3.5" /> Skipped (No Phone)
                            </span>
                          ) : (
                            <span className="text-rose-600 font-semibold flex items-center gap-1 justify-end">
                              <AlertCircle className="w-3.5 h-3.5" /> Failed
                            </span>
                          )
                        ) : bulkDispatching && bulkProgress.currentName.includes(s.firstName) ? (
                          <span className="text-brand font-bold animate-pulse flex items-center gap-1 justify-end">
                            <Loader2 className="w-3.5 h-3.5 animate-spin" /> Sending...
                          </span>
                        ) : (
                          <span className="text-ink-faint italic text-[11px]">Ready</span>
                        )}
                      </TD>
                    </TR>
                  );
                })}
              </TBody>
            </Table>
          </div>
        </div>
      </Modal>
    </div>
  );
};
