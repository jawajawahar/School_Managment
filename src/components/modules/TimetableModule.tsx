import React, { useState, useEffect } from 'react';
import {
  AlertOctagon,
  Plus,
  Trash2,
  RefreshCw,
  Calendar,
  User,
  Crown,
  MapPin,
  Coffee,
  Share2,
  Send,
  Printer,
  CheckCircle2,
  ExternalLink,
  MessageSquare,
  Users,
  CheckSquare,
  Square,
  Sparkles,
  FileText,
  Phone,
  ShieldCheck,
  Check,
  AlertCircle,
  Clock,
  QrCode,
  Smartphone,
  LogOut,
} from 'lucide-react';

import { useData } from '../../context/DataContext';
import { api } from '../../services/api';
import type { TimetableSlot } from '../../types';
import { CustomSelect } from '../common/CustomSelect';
import { PageHeader } from '../ui/PageHeader';
import { Badge } from '../ui/Badge';
import { Button } from '../ui/Button';
import { Card } from '../ui/Card';
import { Modal } from '../ui/Modal';
import { FormField, Input } from '../ui/FormField';
import { DatePicker } from '../ui/DatePicker';
import { Tabs } from '../ui/Tabs';

export const TimetableModule: React.FC<{ initialClassId?: string }> = ({ initialClassId }) => {
  const {
    classes,
    subjects,
    teachers,
    users,
    students,
    timetableSlots,
    activeRole,
    currentUser,
    assignedClassId,
    addTimetableSlot,
    deleteTimetableSlot,
    clearClassTimetable,
    createAnnouncement,
    addNotification,
    logAudit,
    schoolProfile,
  } = useData();

  // Active View Mode: 'class' (Particular Class Timetable) or 'teacher' (Class Teacher Own Timetable)
  const [viewMode, setViewMode] = useState<'class' | 'teacher'>('class');

  // Selected Class (persisted in localStorage across refreshes)
  const [selectedClassId, setSelectedClassId] = useState<string>(() => {
    return initialClassId || localStorage.getItem('gsms_selected_timetable_class') || assignedClassId || 'class-9a';
  });

  useEffect(() => {
    if (selectedClassId) {
      localStorage.setItem('gsms_selected_timetable_class', selectedClassId);
    }
  }, [selectedClassId]);

  const isPrincipalOrAdmin = ['principal', 'vice_principal', 'admin'].includes(activeRole);
  const loggedInTeacher = teachers.find((t) => t.userId === currentUser?.id) || teachers[0];

  // Selected Teacher for Teacher View (locked to loggedInTeacher if not principal)
  const [selectedTeacherId, setSelectedTeacherId] = useState<string>(
    isPrincipalOrAdmin ? (loggedInTeacher?.id || 'tch-1') : (loggedInTeacher?.id || 'tch-3')
  );

  // Modals state
  const [showAddModal, setShowAddModal] = useState(false);
  const [showSubModal, setShowSubModal] = useState(false);
  const [isPublished, setIsPublished] = useState(true);

  const getClassDefaultRoom = (cId: string) => {
    const c = classes.find((cls) => cls.id === cId);
    if (!c) return 'Hall 9A';
    const cleanGrade = c.grade.replace(/Grade\s*/i, '').trim();
    return `Hall ${cleanGrade}${c.section || ''}`.trim();
  };

  // Target class in Add Slot modal
  const [targetClassIdModal, setTargetClassIdModal] = useState(selectedClassId);

  // Modal form state
  const [dayOfWeek, setDayOfWeek] = useState(1);
  const [periodNo, setPeriodNo] = useState(1);
  const [subjectId, setSubjectId] = useState(subjects[0]?.id || '');
  const [teacherId, setTeacherId] = useState(teachers[0]?.id || '');
  const [room, setRoom] = useState(() => {
    const initialCls = initialClassId || localStorage.getItem('gsms_selected_timetable_class') || assignedClassId || 'class-9a';
    const c = classes.find((cls) => cls.id === initialCls);
    if (!c) return 'Hall 9A';
    const cleanGrade = c.grade.replace(/Grade\s*/i, '').trim();
    return `Hall ${cleanGrade}${c.section || ''}`.trim();
  });
  const [errorMessage, setErrorMessage] = useState('');

  // Export / Share state
  const [showShareModal, setShowShareModal] = useState(false);
  const [targetAudience, setTargetAudience] = useState<'parents' | 'teachers'>('parents');

  // Automated WhatsApp Dispatcher state
  const [showWhatsAppModal, setShowWhatsAppModal] = useState(false);
  const [dispatchType, setDispatchType] = useState<'class' | 'teacher'>('class');
  const [sendToTeacher, setSendToTeacher] = useState(true);
  const [sendToStudents, setSendToStudents] = useState(true);
  const [whatsAppNote, setWhatsAppNote] = useState(
    'Please find attached the official weekly class timetable for the academic year 2026. Kindly adhere to this schedule.'
  );
  const [isSendingWhatsApp, setIsSendingWhatsApp] = useState(false);
  const [whatsAppSuccessResult, setWhatsAppSuccessResult] = useState<any>(null);
  const [whatsAppError, setWhatsAppError] = useState<string | null>(null);

  // WhatsApp Multi-Device QR Bot state
  const [waBotStatus, setWaBotStatus] = useState<{
    isConnected: boolean;
    status: 'disconnected' | 'connecting' | 'qr_ready' | 'connected';
    qrCode: string | null;
    user: string | null;
  }>({
    isConnected: false,
    status: 'disconnected',
    qrCode: null,
    user: null,
  });
  const [isRefreshingQr, setIsRefreshingQr] = useState(false);
  const [waConnectTab, setWaConnectTab] = useState<'qr' | 'code'>('qr');
  const [pairingPhone, setPairingPhone] = useState('');
  const [pairingCodeState, setPairingCodeState] = useState<string | null>(null);
  const [isRequestingPairingCode, setIsRequestingPairingCode] = useState(false);

  // Poll WhatsApp bot status when modal is open
  useEffect(() => {
    if (!showWhatsAppModal) return;

    let isMounted = true;
    const checkStatus = async () => {
      try {
        const res = await api.getWhatsAppStatus();
        if (isMounted) setWaBotStatus(res);
      } catch (e) {
        // ignore
      }
    };

    checkStatus();
    const interval = setInterval(checkStatus, 2500);
    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, [showWhatsAppModal]);

  const handleInitWhatsAppQr = async () => {
    setIsRefreshingQr(true);
    try {
      const res = await api.initializeWhatsApp();
      setWaBotStatus((prev) => ({
        ...prev,
        status: res.status as any,
        qrCode: res.qrCode,
        isConnected: res.status === 'connected',
      }));
    } catch (e) {
      console.error(e);
    } finally {
      setIsRefreshingQr(false);
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
        alert(res.error || 'Failed to generate pairing code. Ensure phone number starts with country code (e.g. 94752572722).');
      }
    } catch (err: any) {
      alert(err.message || 'Error generating pairing code');
    } finally {
      setIsRequestingPairingCode(false);
    }
  };

  const handleLogoutWhatsApp = async () => {
    if (window.confirm('Are you sure you want to disconnect this WhatsApp session?')) {
      await api.logoutWhatsApp();
      setWaBotStatus({ isConnected: false, status: 'disconnected', qrCode: null, user: null });
      handleInitWhatsAppQr();
    }
  };

  // Substitution form state
  const [absentTeacherId, setAbsentTeacherId] = useState(teachers[0]?.id || '');
  const [substituteTeacherId, setSubstituteTeacherId] = useState(teachers[1]?.id || '');
  const [subDate, setSubDate] = useState('2026-07-24');
  const [subNotes, setSubNotes] = useState('Covering Grade 9 English Period 3');
  const [subErrorMessage, setSubErrorMessage] = useState('');

  const selectedClass = classes.find((c) => c.id === selectedClassId) || classes[0];
  const classTeacher = teachers.find((t) => t.id === selectedClass?.classTeacherId || t.userId === selectedClass?.classTeacherId || t.employeeNo === selectedClass?.classTeacherId);
  const classTeacherUser = users.find((u) => u.id === classTeacher?.userId || u.id === selectedClass?.classTeacherId);

  const selectedTeacher = teachers.find((t) => t.id === selectedTeacherId) || teachers[0];
  const selectedTeacherUser = users.find((u) => u.id === selectedTeacher?.userId);

  const days = [
    { num: 1, name: 'Monday' },
    { num: 2, name: 'Tuesday' },
    { num: 3, name: 'Wednesday' },
    { num: 4, name: 'Thursday' },
    { num: 5, name: 'Friday' },
  ];

  const periods = [1, 2, 3, 4, 5, 6, 7, 8];

  const periodTimes: { [key: number]: string } = {
    1: '08:00 - 08:45',
    2: '08:45 - 09:30',
    3: '09:30 - 10:15',
    4: '10:15 - 11:00',
    5: '11:15 - 12:00',
    6: '12:00 - 12:45',
    7: '12:45 - 13:30',
    8: '13:30 - 14:15',
  };

  const getClassSlot = (day: number, period: number) =>
    timetableSlots.find((s) => s.classId === selectedClassId && s.dayOfWeek === day && s.periodNo === period);

  const getTeacherSlot = (day: number, period: number) =>
    timetableSlots.find((s) => s.teacherId === selectedTeacherId && s.dayOfWeek === day && s.periodNo === period);

  // Official Timetable Text Generator (used by WhatsApp share + copy)
  const generateShareText = () => {
    const isTeacher = dispatchType === 'teacher' || viewMode === 'teacher';
    if (isTeacher) {
      const tchName = selectedTeacherUser?.fullName || selectedTeacher?.employeeNo || 'Teacher';
      let msg = `*${(schoolProfile?.schoolName || 'YOUR SCHOOL').toUpperCase()}*\n`;
      msg += `Official Teacher Personal Timetable — ${tchName} (Academic Year 2026)\n`;
      msg += `Specialization: ${selectedTeacher?.subjectSpecialization || 'Academic Faculty'}\n\n`;

      days.forEach((d) => {
        msg += `*${d.name.toUpperCase()}*\n`;
        let dayHasSlots = false;
        periods.forEach((pNum) => {
          const slot = timetableSlots.find(
            (s) => (s.teacherId === selectedTeacherId || s.teacherId === selectedTeacher?.id) && s.dayOfWeek === d.num && s.periodNo === pNum
          );
          if (slot) {
            dayHasSlots = true;
            const sub = subjects.find((s) => s.id === slot.subjectId);
            const cls = classes.find((c) => c.id === slot.classId);
            const clsName = cls ? `Grade ${cls.grade} (${cls.section})` : 'Class';
            msg += `  P${pNum} (${periodTimes[pNum]}): ${clsName} — ${sub?.name || 'Subject'} [${slot.room}]\n`;
          }
        });
        if (!dayHasSlots) msg += `  No scheduled periods\n`;
        msg += `\n`;
      });
      return msg;
    }

    if (!selectedClass) return '';
    const clsName = `${selectedClass.grade} - Section ${selectedClass.section}`;
    const ctName = classTeacherUser?.fullName || 'Unassigned';

    let msg = `*${(schoolProfile?.schoolName || 'YOUR SCHOOL').toUpperCase()}*\n`;
    msg += `Official class timetable — ${clsName} (Academic Year ${selectedClass.academicYear || 2026})\n`;
    msg += `Class teacher: ${ctName}\n\n`;

    days.forEach((d) => {
      msg += `*${d.name.toUpperCase()}*\n`;
      let dayHasSlots = false;
      periods.forEach((pNum) => {
        const slot = timetableSlots.find(
          (s) => s.classId === selectedClassId && s.dayOfWeek === d.num && s.periodNo === pNum
        );
        if (slot) {
          dayHasSlots = true;
          const sub = subjects.find((s) => s.id === slot.subjectId);
          const tch = teachers.find((t) => t.id === slot.teacherId);
          const tchUser = users.find((u) => u.id === tch?.userId);
          msg += `  P${pNum} (${periodTimes[pNum]}): ${sub?.name || 'Subject'} — ${tchUser?.fullName || 'Teacher'} [${slot.room}]\n`;
        }
      });
      if (!dayHasSlots) msg += `  No scheduled classes\n`;
      msg += `\n`;
    });

    return msg;
  };

  const handleOpenWhatsapp = () => {
    const host = window.location.hostname || 'localhost';
    const isTeacher = dispatchType === 'teacher' || viewMode === 'teacher';
    const docUrl = isTeacher
      ? `http://${host}:5000/api/timetable/document/teacher/${selectedTeacherId}`
      : `http://${host}:5000/api/timetable/document/${selectedClassId}`;
    const textWithDoc = `${generateShareText()}\n📄 Official Certified PDF & Web Document:\n${docUrl}`;
    const url = `https://api.whatsapp.com/send?text=${encodeURIComponent(textWithDoc)}`;
    window.open(url, '_blank');
  };

  const handleAutomatedWhatsAppDispatch = async () => {
    setIsSendingWhatsApp(true);
    setWhatsAppError(null);
    setWhatsAppSuccessResult(null);

    try {
      if (dispatchType === 'teacher') {
        const teacherName = selectedTeacherUser?.fullName || 'Teacher';
        const teacherPhone = selectedTeacherUser?.phone || selectedTeacher?.employeeNo || '+94771234567';

        const response = await api.sendTimetableWhatsApp({
          dispatchType: 'teacher',
          teacherId: selectedTeacherId,
          academicYear: 2026,
          teacher: {
            name: teacherName,
            phone: teacherPhone,
          },
          notes: whatsAppNote,
          sendToTeacher: true,
          sendToStudents: false,
        });

        if (response && response.success) {
          setWhatsAppSuccessResult(response);
          addNotification({
            recipientId: selectedTeacherUser?.id || currentUser?.id || 'admin',
            title: `WhatsApp Broadcast: Teacher ${teacherName} Timetable`,
            message: `Official personal teacher schedule PDF dispatched via WhatsApp to ${teacherName} (${teacherPhone}).`,
            channel: 'in_app',
          });
          logAudit(
            'EXPORT',
            'Timetable',
            selectedTeacherId,
            `Automated WhatsApp timetable broadcast sent to Teacher ${teacherName} (${teacherPhone}).`
          );
        } else {
          setWhatsAppError(response?.error || 'Failed to dispatch WhatsApp message to teacher. Please check server logs.');
        }
      } else {
        if (!selectedClass) return;
        const clsStudents = (students || []).filter(
          (s) => s.classId === selectedClassId && s.status === 'active'
        );
        const resolvedStudents = clsStudents
          .map((s) => {
            const rawPhone = (s.guardianPhone || s.phone || users.find((u) => u.id === s.userId)?.phone || '').trim();
            return {
              id: s.id,
              name: `${s.firstName} ${s.lastName}`,
              studentNo: s.studentNo,
              phone: rawPhone,
            };
          })
          .filter((s) => {
            const digits = s.phone.replace(/[^0-9]/g, '');
            return digits.length >= 9;
          });

        const teacherName = classTeacherUser?.fullName || 'Class Teacher';
        const teacherPhone = classTeacherUser?.phone || classTeacher?.employeeNo || '+94771234567';

        const response = await api.sendTimetableWhatsApp({
          dispatchType: 'class',
          classId: selectedClassId,
          className: `${selectedClass.grade} - Section ${selectedClass.section}`,
          academicYear: selectedClass.academicYear || 2026,
          teacher: {
            name: teacherName,
            phone: teacherPhone,
          },
          students: resolvedStudents,
          notes: whatsAppNote,
          sendToTeacher,
          sendToStudents,
        });

        if (response && response.success) {
          setWhatsAppSuccessResult(response);
          addNotification({
            recipientId: classTeacherUser?.id || currentUser?.id || 'admin',
            title: `WhatsApp Broadcast: ${selectedClass.grade} (${selectedClass.section}) Timetable`,
            message: `Official weekly timetable PDF dispatched via WhatsApp to Class Teacher (${teacherName}) and ${resolvedStudents.length} students/guardians.`,
            channel: 'in_app',
          });
          logAudit(
            'EXPORT',
            'Timetable',
            selectedClassId,
            `Automated WhatsApp timetable broadcast sent to Class Teacher (${teacherName}) and ${resolvedStudents.length} students.`
          );
        } else {
          setWhatsAppError(response?.error || 'Failed to dispatch WhatsApp messages. Please check server logs.');
        }
      }
    } catch (err: any) {
      setWhatsAppError(err?.message || 'Error connecting to WhatsApp dispatcher API');
    } finally {
      setIsSendingWhatsApp(false);
    }
  };

  const handlePrintTemplate = () => {
    if (!selectedClass) return;
    const printContent = document.getElementById('official-timetable-template');
    if (!printContent) return;
    const win = window.open('', '_blank');
    if (win) {
      win.document.write(`
        <!DOCTYPE html>
        <html>
          <head>
            <title>Official Timetable - ${selectedClass.grade} Section ${selectedClass.section}</title>
            <style>
              body { font-family: 'Segoe UI', Arial, sans-serif; padding: 24px; color: #101828; background: #fff; }
              .header { text-align: center; border-bottom: 2px solid #1E4B8F; padding-bottom: 12px; margin-bottom: 16px; }
              .header h1 { margin: 0; font-size: 22px; text-transform: uppercase; color: #101828; font-weight: 800; letter-spacing: 0.5px; }
              .header h2 { margin: 4px 0 0 0; font-size: 13px; font-weight: 600; color: #1E4B8F; }
              .meta-grid { display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px; font-size: 11px; background: #F1F3F6; padding: 12px 16px; border-radius: 8px; border: 1px solid #DEE2E8; }
              table { width: 100%; border-collapse: collapse; margin-top: 12px; }
              th, td { border: 1px solid #DEE2E8; padding: 10px 8px; text-align: center; font-size: 11px; }
              th { background: #1E4B8F; color: #fff; text-transform: uppercase; font-weight: 700; letter-spacing: 0.5px; }
              .period-time { font-weight: 700; color: #101828; background: #F1F3F6; font-family: monospace; }
              .subj-name { font-weight: 800; color: #101828; font-size: 12px; }
              .tch-name { font-size: 10px; color: #475467; margin-top: 2px; font-weight: 600; }
              .room-tag { font-size: 9px; color: #1E4B8F; font-weight: 700; margin-top: 2px; }
              .tea-break { background: #FBF1DD; font-weight: 800; color: #B7791B; text-transform: uppercase; letter-spacing: 1px; }
              .footer-bar { margin-top: 32px; display: flex; justify-content: space-between; align-items: flex-end; font-size: 11px; }
              .stamp-box { border: 2px dashed #101828; padding: 10px 20px; border-radius: 8px; text-align: center; color: #101828; }
              @media print { body { padding: 0; } }
            </style>
          </head>
          <body>${printContent.innerHTML}</body>
        </html>
      `);
      win.document.close();
      win.focus();
      setTimeout(() => win.print(), 400);
    }
  };

  const handleBroadcastInApp = () => {
    if (!selectedClass) return;
    createAnnouncement(
      `Official timetable released: ${selectedClass.grade} (${selectedClass.section})`,
      `The official weekly timetable for ${selectedClass.grade} - Section ${selectedClass.section} has been updated and published by the school administration. Please check the Timetable module.`,
      targetAudience === 'parents' ? 'parent' : 'teacher',
      selectedClassId
    );
    alert(`In-app notification sent to all ${targetAudience} of ${selectedClass.grade}!`);
  };

  // Active modal class & conflict tracking
  const currentModalClassId = targetClassIdModal || selectedClassId;
  const currentModalClass = classes.find((c) => c.id === currentModalClassId);

  // Check if selected teacher has a conflict in another class during this exact day & period
  const conflictingTeacherSlot = teacherId
    ? timetableSlots.find(
        (s) =>
          s.teacherId === teacherId &&
          s.dayOfWeek === Number(dayOfWeek) &&
          s.periodNo === Number(periodNo) &&
          s.classId !== currentModalClassId
      )
    : null;

  const conflictingTeacherClass = conflictingTeacherSlot
    ? classes.find((c) => c.id === conflictingTeacherSlot.classId)
    : null;

  const selectedTeacherObj = teachers.find((t) => t.id === teacherId);
  const selectedTeacherUserObj = users.find((u) => u.id === selectedTeacherObj?.userId);

  // Check if current room has a conflict in another class during this day & period
  const conflictingRoomSlot =
    room && room.trim() !== ''
      ? timetableSlots.find(
          (s) =>
            s.room?.trim().toLowerCase() === room.trim().toLowerCase() &&
            s.dayOfWeek === Number(dayOfWeek) &&
            s.periodNo === Number(periodNo) &&
            s.classId !== currentModalClassId
        )
      : null;

  const conflictingRoomClass = conflictingRoomSlot
    ? classes.find((c) => c.id === conflictingRoomSlot.classId)
    : null;

  const handleAddSlot = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');

    if (conflictingTeacherSlot) {
      setErrorMessage(
        `Schedule Conflict: ${selectedTeacherUserObj?.fullName || 'This teacher'} is already assigned to teach ${
          conflictingTeacherClass ? `${conflictingTeacherClass.grade} (${conflictingTeacherClass.section})` : 'another class'
        } during Period ${periodNo} on this day! A teacher cannot teach two classes at the same time.`
      );
      return;
    }

    if (conflictingRoomSlot) {
      setErrorMessage(
        `Room Conflict: Room "${room.trim()}" is already occupied by ${
          conflictingRoomClass ? `${conflictingRoomClass.grade} (${conflictingRoomClass.section})` : 'another class'
        } during Period ${periodNo} on this day.`
      );
      return;
    }

    const res = addTimetableSlot({
      classId: currentModalClassId,
      subjectId,
      teacherId,
      dayOfWeek: Number(dayOfWeek),
      periodNo: Number(periodNo),
      startTime: periodTimes[periodNo].split(' - ')[0],
      endTime: periodTimes[periodNo].split(' - ')[1],
      room,
    });

    if (res.success) {
      setShowAddModal(false);
    } else if (res.error) {
      setErrorMessage(res.error);
    }
  };

  const handleEmptyCellClick = (dayNum: number, pNum: number) => {
    if (!isPrincipalOrAdmin) return;
    setDayOfWeek(dayNum);
    setPeriodNo(pNum);
    setTargetClassIdModal(selectedClassId);
    setRoom(getClassDefaultRoom(selectedClassId));
    setErrorMessage('');
    setShowAddModal(true);
  };

  const handleEditSlotClick = (slot: TimetableSlot) => {
    if (!isPrincipalOrAdmin) return;
    setDayOfWeek(slot.dayOfWeek);
    setPeriodNo(slot.periodNo);
    setSubjectId(slot.subjectId);
    setTeacherId(slot.teacherId);
    setRoom(slot.room || getClassDefaultRoom(slot.classId));
    setTargetClassIdModal(slot.classId);
    setErrorMessage('');
    setShowAddModal(true);
  };

  const handleTeacherEmptyCellClick = (dayNum: number, pNum: number) => {
    if (!isPrincipalOrAdmin) return;
    setDayOfWeek(dayNum);
    setPeriodNo(pNum);
    setTeacherId(selectedTeacherId);
    setTargetClassIdModal(selectedClassId);
    setRoom(getClassDefaultRoom(selectedClassId));
    setErrorMessage('');
    setShowAddModal(true);
  };

  const handleClearClassTimetable = () => {
    if (!selectedClass) return;
    const clsName = `${selectedClass.grade} (${selectedClass.section})`;
    if (window.confirm(`Clear all timetable slots for ${clsName}? You can rebuild it anytime.`)) {
      clearClassTimetable(selectedClassId);
    }
  };

  const handleSubstitutionSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSubErrorMessage('');

    if (absentTeacherId === substituteTeacherId) {
      setSubErrorMessage('Absent teacher and substitute teacher cannot be the same person.');
      return;
    }

    const absTeacherObj = teachers.find((t) => t.id === absentTeacherId);
    const absUser = users.find((u) => u.id === absTeacherObj?.userId);

    const subTeacherObj = teachers.find((t) => t.id === substituteTeacherId);
    const subUser = users.find((u) => u.id === subTeacherObj?.userId);

    const notifs = [];
    if (subUser) {
      notifs.push({
        recipientId: subUser.id,
        title: `Ad-hoc substitution assigned (${subDate})`,
        message: `Principal assigned you to cover ${absUser?.fullName || 'Teacher'}'s classes on ${subDate}. Notes: ${subNotes}`,
      });
    }
    if (absUser) {
      notifs.push({
        recipientId: absUser.id,
        title: `Substitution notice (${subDate})`,
        message: `Teacher ${subUser?.fullName || 'Substitute'} was assigned by Principal to cover your classes on ${subDate}. Notes: ${subNotes}`,
      });
    }
    if (notifs.length > 0) addNotification(notifs);

    logAudit('CREATE', 'Substitution', absentTeacherId, `Assigned substitute ${subUser?.fullName} for absent teacher ${absUser?.fullName}`);

    setShowSubModal(false);
    alert(`Substitution notice sent to ${subUser?.fullName || 'substitute teacher'} and ${absUser?.fullName || 'related subject teacher'}.`);
  };

  const IntervalRow = ({ colSpan }: { colSpan: number }) => (
    <tr className="bg-warning-tint border-y border-warning/30">
      <td className="py-2.5 px-3 border-r border-warning/30 font-mono-data text-sm text-warning font-bold text-center">
        <div>INTERVAL</div>
        <div className="text-xs font-medium">11:00 - 11:15</div>
      </td>
      <td colSpan={colSpan} className="py-2.5 px-4 text-center text-sm font-semibold text-warning tracking-wide">
        <div className="flex items-center justify-center gap-2">
          <Coffee className="w-4 h-4 shrink-0" />
          <span>Morning refreshment & recreation interval (11:00 AM – 11:15 AM)</span>
        </div>
      </td>
    </tr>
  );

  return (
    <div className="space-y-6 animate-fade-in">
      <PageHeader
        eyebrow={<Badge tone="brand">Timetable management</Badge>}
        title="School timetable & teacher rosters"
        description="Switch between class-wise timetables and teacher personal schedules."
        actions={
          <>
            <Tabs
              value={viewMode}
              onChange={setViewMode}
              options={[
                { id: 'class', label: 'Class timetable', icon: Calendar },
                { id: 'teacher', label: 'Teacher timetable', icon: User },
              ]}
            />
            <Button variant="secondary" onClick={() => setShowShareModal(true)}>
              <Share2 className="w-4 h-4" /> Export & share
            </Button>
            <button
              onClick={() => {
                setWhatsAppSuccessResult(null);
                setWhatsAppError(null);
                setDispatchType(viewMode);
                setShowWhatsAppModal(true);
              }}
              className="bg-[#25D366] hover:bg-[#20bd5a] text-white font-semibold text-xs py-2 px-3 rounded-lg shadow-xs flex items-center gap-1.5 transition-all cursor-pointer"
              title="Automated WhatsApp Timetable Dispatcher"
            >
              <Share2 className="w-3.5 h-3.5" /> WhatsApp Dispatch
            </button>
            {isPrincipalOrAdmin && (
              <Button variant={isPublished ? 'primary' : 'secondary'} onClick={() => setIsPublished(!isPublished)}>
                {isPublished ? 'Published' : 'Publish'}
              </Button>
            )}
          </>
        }
      />

      {/* MODE 1: CLASS TIMETABLE VIEW */}
      {viewMode === 'class' && (
        <div className="space-y-6">
          <Card>
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
              <div className="flex flex-wrap items-center gap-3">
                <div className="flex items-center gap-2.5">
                  <span className="text-xs font-semibold text-ink-muted uppercase whitespace-nowrap">Class</span>
                  <CustomSelect
                    options={(isPrincipalOrAdmin
                      ? classes
                      : classes.filter((c) => c.id === assignedClassId || c.classTeacherId === loggedInTeacher?.id || c.classTeacherId === loggedInTeacher?.userId || c.classTeacherId === loggedInTeacher?.employeeNo)
                    ).map((c) => ({
                      value: c.id,
                      label: `${c.grade} - Section ${c.section} (${c.academicYear})`,
                    }))}
                    value={selectedClassId}
                    onChange={setSelectedClassId}
                    disabled={!isPrincipalOrAdmin}
                  />
                </div>

                <div className="flex items-center gap-2 bg-surface-muted border border-border px-3.5 py-2 rounded-lg text-sm text-ink whitespace-nowrap">
                  <Crown className="w-3.5 h-3.5 text-brand shrink-0" />
                  <span className="text-ink-muted">Class teacher:</span>
                  <strong className="font-semibold">{classTeacherUser?.fullName || 'Not assigned'}</strong>
                </div>
              </div>

              {isPrincipalOrAdmin && (
                <div className="flex items-center gap-2.5 shrink-0">
                  <Button variant="secondary" onClick={() => setShowSubModal(true)}>
                    <RefreshCw className="w-4 h-4" /> Ad-hoc substitution
                  </Button>
                  <Button variant="ghost" className="text-danger hover:bg-danger-tint" onClick={handleClearClassTimetable}>
                    <Trash2 className="w-4 h-4" /> Clear schedule
                  </Button>
                </div>
              )}
            </div>
          </Card>

          {/* Class Timetable Weekly Grid */}
          <Card padded={false}>
            <div className="px-6 py-4 border-b border-border flex justify-between items-center">
              <span className="font-semibold text-sm text-ink">
                Weekly timetable: {selectedClass?.grade} - Section {selectedClass?.section}
              </span>
              <span className="text-sm text-ink-muted">8 periods / day • 45 minutes each</span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-center border-collapse min-w-[900px]">
                <thead>
                  <tr className="border-b border-border bg-surface-muted text-sm uppercase text-ink-muted font-semibold tracking-wide">
                    <th className="py-3.5 px-4 w-36 border-r border-border">Period / time</th>
                    {days.map((d) => (
                      <th key={d.num} className="py-3.5 px-3 border-r border-border last:border-r-0">{d.name}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {periods.map((pNum) => (
                    <React.Fragment key={pNum}>
                      <tr className="border-b border-border/60">
                        <td className="py-3 px-3 bg-surface-muted/60 border-r border-border">
                          <div className="font-semibold text-sm text-ink">Period {pNum}</div>
                          <div className="text-xs text-ink-faint font-mono-data mt-0.5">{periodTimes[pNum]}</div>
                        </td>

                        {days.map((d) => {
                          const slot = getClassSlot(d.num, pNum);
                          const subject = subjects.find((s) => s.id === slot?.subjectId);
                          const teacher = teachers.find((t) => t.id === slot?.teacherId);
                          const teacherUser = users.find((u) => u.id === teacher?.userId);

                          return (
                            <td key={d.num} className="p-2 border-r border-border last:border-r-0 h-28 align-top relative group">
                              {slot ? (
                                <div
                                  onClick={() => isPrincipalOrAdmin && handleEditSlotClick(slot)}
                                  className={`h-full bg-surface border border-border rounded-lg p-3 text-left flex flex-col justify-between transition-all group ${
                                    isPrincipalOrAdmin ? 'cursor-pointer hover:border-brand hover:shadow-xs' : ''
                                  }`}
                                  title={isPrincipalOrAdmin ? 'Click to edit or reassign this slot' : undefined}
                                >
                                  <div>
                                    <div className="font-semibold text-sm text-ink leading-snug">{subject?.name || 'Subject'}</div>
                                    <div className="text-[13px] text-ink-muted mt-0.5">{teacherUser?.fullName || 'Teacher'}</div>
                                  </div>
                                  <div className="flex items-center justify-between mt-1.5 text-xs text-ink-faint border-t border-border pt-1.5">
                                    <span className="flex items-center gap-1">
                                      <MapPin className="w-3 h-3" /> {slot.room}
                                    </span>
                                    {isPrincipalOrAdmin && (
                                      <button
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          deleteTimetableSlot(slot.id);
                                        }}
                                        className="text-danger opacity-0 group-hover:opacity-100 transition-opacity p-0.5 hover:bg-danger-tint rounded"
                                        title="Delete period slot"
                                      >
                                        <Trash2 className="w-3.5 h-3.5" />
                                      </button>
                                    )}
                                  </div>
                                </div>
                              ) : (
                                <button
                                  onClick={() => handleEmptyCellClick(d.num, pNum)}
                                  className={`w-full h-full border border-dashed border-border rounded-lg flex items-center justify-center text-sm transition-all ${
                                    isPrincipalOrAdmin
                                      ? 'text-ink-faint hover:border-brand hover:text-brand hover:bg-brand-tint cursor-pointer'
                                      : 'text-ink-faint/60 cursor-default'
                                  }`}
                                  title={isPrincipalOrAdmin ? `Click to assign slot for Period ${pNum} (${d.name})` : 'Free period'}
                                >
                                  {isPrincipalOrAdmin && <Plus className="w-3.5 h-3.5 mr-1" />}
                                  <span>Free</span>
                                </button>
                              )}
                            </td>
                          );
                        })}
                      </tr>
                      {pNum === 4 && <IntervalRow colSpan={5} />}
                    </React.Fragment>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        </div>
      )}

      {/* MODE 2: TEACHER PERSONAL TIMETABLE VIEW */}
      {viewMode === 'teacher' && (
        <div className="space-y-6">
          <Card>
            <div className="flex items-center gap-3">
              <span className="text-xs font-semibold text-ink-muted uppercase whitespace-nowrap">Teacher</span>
              <CustomSelect
                options={(isPrincipalOrAdmin ? teachers : [loggedInTeacher]).map((t) => {
                  const u = users.find((usr) => usr.id === t.userId);
                  const ctClass = classes.find((c) => c.classTeacherId === t.id || c.classTeacherId === t.userId || c.classTeacherId === t.employeeNo);
                  return {
                    value: t.id,
                    label: `${u?.fullName || t.employeeNo} (${t.subjectSpecialization})${ctClass ? ` — CT ${ctClass.grade}` : ''}`,
                  };
                })}
                value={selectedTeacherId}
                onChange={setSelectedTeacherId}
                disabled={!isPrincipalOrAdmin}
                className="min-w-[280px]"
              />
            </div>
          </Card>

          <Card padded={false}>
            <div className="px-6 py-4 border-b border-border flex justify-between items-center">
              <span className="font-semibold text-sm text-ink">Personal teaching schedule: {selectedTeacherUser?.fullName}</span>
              <span className="text-sm text-ink-muted hidden sm:inline">Individual teaching allocations & prep periods</span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-center border-collapse min-w-[900px]">
                <thead>
                  <tr className="border-b border-border bg-surface-muted text-sm uppercase text-ink-muted font-semibold tracking-wide">
                    <th className="py-3.5 px-4 w-36 border-r border-border">Period / time</th>
                    {days.map((d) => (
                      <th key={d.num} className="py-3.5 px-3 border-r border-border last:border-r-0">{d.name}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {periods.map((pNum) => (
                    <React.Fragment key={pNum}>
                      <tr className="border-b border-border/60">
                        <td className="py-3 px-3 bg-surface-muted/60 border-r border-border">
                          <div className="font-semibold text-sm text-ink">Period {pNum}</div>
                          <div className="text-xs text-ink-faint font-mono-data mt-0.5">{periodTimes[pNum]}</div>
                        </td>

                        {days.map((d) => {
                          const slot = getTeacherSlot(d.num, pNum);
                          const cls = classes.find((c) => c.id === slot?.classId);
                          const subject = subjects.find((s) => s.id === slot?.subjectId);

                          return (
                            <td key={d.num} className="p-2 border-r border-border last:border-r-0 h-28 align-top group">
                              {slot ? (
                                <div className="h-full bg-brand-tint border border-brand/30 rounded-lg p-3 text-left flex flex-col justify-between">
                                  <div>
                                    <div className="font-semibold text-sm text-ink leading-snug flex items-center justify-between">
                                      <span>{cls?.grade} - Sec {cls?.section}</span>
                                      {isPrincipalOrAdmin && (
                                        <button
                                          onClick={() => deleteTimetableSlot(slot.id)}
                                          className="text-danger opacity-0 group-hover:opacity-100 transition-opacity p-0.5"
                                          title="Delete period slot"
                                        >
                                          <Trash2 className="w-3.5 h-3.5" />
                                        </button>
                                      )}
                                    </div>
                                    <div className="text-[13px] text-ink-muted mt-0.5">{subject?.name || 'Subject'}</div>
                                  </div>
                                  <div className="flex items-center gap-1 text-xs text-ink-faint border-t border-brand/20 pt-1.5 mt-1.5">
                                    <MapPin className="w-3 h-3" /> {slot.room}
                                  </div>
                                </div>
                              ) : (
                                <button
                                  onClick={() => handleTeacherEmptyCellClick(d.num, pNum)}
                                  className={`w-full h-full border border-dashed rounded-lg p-2 flex flex-col items-center justify-center text-sm transition-all ${
                                    isPrincipalOrAdmin
                                      ? 'border-border text-ink-faint hover:border-brand hover:text-brand hover:bg-brand-tint cursor-pointer'
                                      : 'border-border/60 text-ink-faint/50 cursor-default'
                                  }`}
                                  title={isPrincipalOrAdmin ? `Click to add slot for Period ${pNum} (${d.name})` : 'Free / prep'}
                                >
                                  {isPrincipalOrAdmin ? (
                                    <>
                                      <Plus className="w-3.5 h-3.5 mb-1" />
                                      <span className="font-semibold">Add slot</span>
                                    </>
                                  ) : (
                                    <>
                                      <Coffee className="w-3.5 h-3.5 mb-1" />
                                      <span>Free / prep</span>
                                    </>
                                  )}
                                </button>
                              )}
                            </td>
                          );
                        })}
                      </tr>
                      {pNum === 4 && <IntervalRow colSpan={5} />}
                    </React.Fragment>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        </div>
      )}

      {/* AD-HOC TEACHER SUBSTITUTION MODAL */}
      <Modal
        open={showSubModal}
        onClose={() => setShowSubModal(false)}
        title="Ad-hoc teacher substitution"
        footer={
          <>
            <Button variant="secondary" onClick={() => setShowSubModal(false)}>Cancel</Button>
            <Button type="submit" form="sub-form">Dispatch substitution alert</Button>
          </>
        }
      >
        {subErrorMessage && (
          <div className="p-3 bg-danger-tint text-danger text-sm rounded-lg flex items-center gap-2">
            <AlertOctagon className="w-4 h-4 shrink-0" />
            <span>{subErrorMessage}</span>
          </div>
        )}

        <p className="text-sm text-ink-muted bg-surface-muted p-3 rounded-lg">
          Notifications go only to the assigned substitute teacher and the related subject teacher.
        </p>

        <form id="sub-form" onSubmit={handleSubstitutionSubmit} className="space-y-3.5">
          <FormField label="Absent teacher" required>
            <CustomSelect
              options={teachers.map((t) => {
                const u = users.find((usr) => usr.id === t.userId);
                return { value: t.id, label: `${u?.fullName || t.employeeNo} (${t.subjectSpecialization})` };
              })}
              value={absentTeacherId}
              onChange={setAbsentTeacherId}
            />
          </FormField>

          <FormField label="Assigned substitute teacher" required>
            <CustomSelect
              options={teachers.map((t) => {
                const u = users.find((usr) => usr.id === t.userId);
                return { value: t.id, label: `${u?.fullName || t.employeeNo} (${t.subjectSpecialization})` };
              })}
              value={substituteTeacherId}
              onChange={setSubstituteTeacherId}
            />
          </FormField>

          <div className="grid grid-cols-2 gap-3">
            <FormField label="Substitution date">
              <DatePicker value={subDate} onChange={setSubDate} />
            </FormField>
            <FormField label="Coverage notes">
              <Input type="text" value={subNotes} onChange={(e) => setSubNotes(e.target.value)} />
            </FormField>
          </div>
        </form>
      </Modal>

      {/* ADD / EDIT SLOT MODAL */}
      <Modal
        open={showAddModal}
        onClose={() => setShowAddModal(false)}
        title="Allocate period slot"
        eyebrow={currentModalClass ? `${currentModalClass.grade} - Section ${currentModalClass.section} • Period ${periodNo} (${days.find((d) => d.num === dayOfWeek)?.name})` : undefined}
        footer={
          <>
            <Button variant="secondary" onClick={() => setShowAddModal(false)}>Cancel</Button>
            <Button
              type="submit"
              form="add-slot-form"
              disabled={Boolean(conflictingTeacherSlot || conflictingRoomSlot)}
              className={
                conflictingTeacherSlot || conflictingRoomSlot
                  ? 'opacity-50 cursor-not-allowed bg-red-600 hover:bg-red-600 text-white'
                  : ''
              }
            >
              {conflictingTeacherSlot
                ? '🚫 Blocked: Teacher Conflict'
                : conflictingRoomSlot
                ? '⚠️ Blocked: Room Conflict'
                : 'Confirm slot assignment'}
            </Button>
          </>
        }
      >
        {errorMessage && (
          <div className="p-3 bg-danger-tint text-danger text-sm rounded-lg flex items-center gap-2">
            <AlertOctagon className="w-4 h-4 shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}

        {conflictingTeacherSlot && (
          <div className="p-3.5 bg-red-50 dark:bg-red-950/40 border-2 border-red-500 text-red-950 dark:text-red-200 rounded-xl flex items-start gap-3 shadow-xs">
            <AlertOctagon className="w-5 h-5 text-red-600 dark:text-red-400 shrink-0 mt-0.5" />
            <div className="text-xs space-y-1">
              <div className="font-bold text-red-700 dark:text-red-400 text-sm flex items-center gap-1.5">
                <span>🚫 Schedule Conflict — Assignment Blocked</span>
              </div>
              <p className="leading-relaxed">
                <strong>{selectedTeacherUserObj?.fullName || 'This teacher'}</strong> is already scheduled to teach in{' '}
                <strong className="underline text-red-800 dark:text-red-300">
                  {conflictingTeacherClass ? `${conflictingTeacherClass.grade} - Section ${conflictingTeacherClass.section}` : 'another class'}
                </strong>{' '}
                during <strong>Period {periodNo}</strong> ({periodTimes[periodNo]}) on this day.
              </p>
              <p className="text-red-600 dark:text-red-400 font-semibold">
                A teacher cannot teach two different classes at the same time. The system strictly disallows this assignment.
              </p>
            </div>
          </div>
        )}

        {conflictingRoomSlot && (
          <div className="p-3.5 bg-amber-50 dark:bg-amber-950/40 border-2 border-amber-500 text-amber-950 dark:text-amber-200 rounded-xl flex items-start gap-3 shadow-xs">
            <AlertOctagon className="w-5 h-5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
            <div className="text-xs space-y-1.5 flex-1">
              <div className="font-bold text-amber-800 dark:text-amber-400 text-sm flex items-center justify-between">
                <span>⚠️ Room Conflict — Space Already Occupied</span>
              </div>
              <p className="leading-relaxed">
                Room <strong>"{room.trim()}"</strong> is already occupied by{' '}
                <strong className="underline text-amber-900 dark:text-amber-300">
                  {conflictingRoomClass ? `${conflictingRoomClass.grade} (${conflictingRoomClass.section})` : 'another class'}
                </strong>{' '}
                during Period {periodNo}.
              </p>
              <div className="pt-1 flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setRoom(getClassDefaultRoom(currentModalClassId))}
                  className="px-2.5 py-1 bg-amber-200 hover:bg-amber-300 dark:bg-amber-800 dark:hover:bg-amber-700 text-amber-900 dark:text-amber-100 rounded-lg font-semibold text-xs transition-colors cursor-pointer"
                >
                  👉 Switch to {getClassDefaultRoom(currentModalClassId)} (Classroom)
                </button>
              </div>
            </div>
          </div>
        )}

        <form id="add-slot-form" onSubmit={handleAddSlot} className="space-y-3.5">
          <FormField label="Target class" required>
            <CustomSelect
              options={classes.map((c) => ({ value: c.id, label: `${c.grade} - Section ${c.section} (${c.academicYear})` }))}
              value={targetClassIdModal}
              onChange={(newClassId) => {
                setTargetClassIdModal(newClassId);
                setRoom(getClassDefaultRoom(newClassId));
              }}
              className="w-full"
            />
          </FormField>

          <div className="grid grid-cols-2 gap-3">
            <FormField label="Day of week">
              <CustomSelect
                options={days.map((d) => ({ value: String(d.num), label: d.name }))}
                value={String(dayOfWeek)}
                onChange={(val) => setDayOfWeek(Number(val))}
                className="w-full"
              />
            </FormField>
            <FormField label="Period">
              <CustomSelect
                options={periods.map((p) => ({ value: String(p), label: `Period ${p} (${periodTimes[p]})` }))}
                value={String(periodNo)}
                onChange={(val) => setPeriodNo(Number(val))}
                className="w-full"
              />
            </FormField>
          </div>

          <FormField label="Subject">
            <CustomSelect
              options={subjects.map((s) => ({ value: s.id, label: `${s.name} (${s.code})` }))}
              value={subjectId}
              onChange={setSubjectId}
              className="w-full"
            />
          </FormField>

          <FormField label="Assigned teacher" required>
            <CustomSelect
              options={teachers.map((t) => {
                const u = users.find((usr) => usr.id === t.userId);
                const busySlot = timetableSlots.find(
                  (s) =>
                    s.teacherId === t.id &&
                    s.dayOfWeek === Number(dayOfWeek) &&
                    s.periodNo === Number(periodNo) &&
                    s.classId !== currentModalClassId
                );
                const busyClass = busySlot ? classes.find((c) => c.id === busySlot.classId) : null;
                const busySuffix = busyClass ? ` 🚫 [BUSY in ${busyClass.grade} (${busyClass.section})]` : '';
                return {
                  value: t.id,
                  label: `${u?.fullName || t.employeeNo} (${t.subjectSpecialization})${busySuffix}`,
                };
              })}
              value={teacherId}
              onChange={setTeacherId}
              className="w-full"
            />
          </FormField>

          {/* Classroom / Hall Allocation */}
          <FormField label="Classroom / Hall Allocation" required>
            <Input
              type="text"
              value={room}
              onChange={(e) => setRoom(e.target.value)}
              placeholder="e.g. Hall 9A, Science Lab 1, Room 102..."
              required
            />
          </FormField>
        </form>
      </Modal>

      {/* EXPORT & SHARE MODAL */}
      <Modal
        open={showShareModal}
        onClose={() => setShowShareModal(false)}
        title="Export & share timetable"
        eyebrow={`${selectedClass?.grade} - Section ${selectedClass?.section} (AY ${selectedClass?.academicYear})`}
        size="xl"
      >
        <div id="official-timetable-template" className="bg-white border border-border p-5 rounded-xl space-y-4 text-ink">
          <div className="header text-center border-b-2 border-brand pb-3">
            <h1 className="font-display text-lg font-bold uppercase text-ink tracking-wide">
              {schoolProfile?.schoolName || 'Your School'}
            </h1>
            <h2 className="text-xs font-mono-data font-semibold text-brand uppercase tracking-wide">
              Official Academic Class Timetable
            </h2>
          </div>

          <div className="meta-grid flex flex-wrap justify-between items-center bg-surface-muted border border-border p-3 rounded-lg text-xs">
            <div><span className="text-ink-muted uppercase font-semibold">Class:</span>{' '}<strong>{selectedClass?.grade} (Sec {selectedClass?.section})</strong></div>
            <div><span className="text-ink-muted uppercase font-semibold">Class teacher:</span>{' '}<strong>{classTeacherUser?.fullName || 'Unassigned'}</strong></div>
            <div><span className="text-ink-muted uppercase font-semibold">Academic year:</span>{' '}<strong>{selectedClass?.academicYear ?? '—'}</strong></div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-center border-collapse border border-border min-w-[600px]">
              <thead>
                <tr className="bg-brand text-white text-xs uppercase font-semibold">
                  <th className="py-2.5 px-3 border border-border/40 w-24">Period</th>
                  {days.map((d) => <th key={d.num} className="py-2.5 px-2 border border-border/40">{d.name}</th>)}
                </tr>
              </thead>
              <tbody>
                {periods.map((pNum) => (
                  <React.Fragment key={pNum}>
                    <tr>
                      <td className="period-time py-2 px-2 bg-surface-muted border border-border text-[11px] font-semibold">
                        <div>P{pNum}</div>
                        <div className="text-ink-faint font-normal">{periodTimes[pNum]}</div>
                      </td>
                      {days.map((d) => {
                        const slot = timetableSlots.find((s) => s.classId === selectedClassId && s.dayOfWeek === d.num && s.periodNo === pNum);
                        const sub = subjects.find((s) => s.id === slot?.subjectId);
                        const tch = teachers.find((t) => t.id === slot?.teacherId);
                        const tchUser = users.find((u) => u.id === tch?.userId);
                        return (
                          <td key={d.num} className="p-2 border border-border align-top h-16">
                            {slot ? (
                              <div className="h-full flex flex-col justify-between text-left">
                                <div>
                                  <div className="subj-name text-xs font-bold leading-snug">{sub?.name}</div>
                                  <div className="tch-name text-[10px] text-ink-muted">{tchUser?.fullName}</div>
                                </div>
                                <div className="room-tag text-[9px] font-mono-data text-brand font-bold">{slot.room}</div>
                              </div>
                            ) : (
                              <div className="h-full flex items-center justify-center text-[10px] text-ink-faint">Free</div>
                            )}
                          </td>
                        );
                      })}
                    </tr>
                    {pNum === 4 && (
                      <tr className="tea-break bg-warning-tint">
                        <td colSpan={6} className="py-1.5 text-center text-[10px] font-bold text-warning uppercase tracking-wide">
                          Morning refreshment break (11:00 AM – 11:15 AM)
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                ))}
              </tbody>
            </table>
          </div>

          <div className="footer-bar flex justify-between items-center pt-4 border-t border-border text-[10px]">
            <div>
              <div className="font-bold">{schoolProfile?.schoolName || 'Your School'} — Academic Affairs</div>
              <div className="text-ink-muted">Ref: TT/{selectedClass?.academicYear ?? ''}/{selectedClass?.grade?.replace(' ', '') ?? ''}</div>
            </div>
            <div className="stamp-box border-2 border-dashed border-ink p-2 px-4 rounded text-center">
              <div className="font-bold text-[11px] uppercase">Approved & sealed</div>
              <div className="text-ink-muted">{schoolProfile?.principalName || 'Principal'}</div>
            </div>
          </div>
        </div>

        <div className="pt-2 flex flex-col sm:flex-row items-center justify-between gap-3">
          <Button variant="secondary" onClick={handleBroadcastInApp}>
            <Send className="w-4 h-4" /> Also send in-app notice
          </Button>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            <Button variant="secondary" onClick={handlePrintTemplate}>
              <Printer className="w-4 h-4" /> Print / save PDF
            </Button>
            <button
              onClick={() => {
                setShowShareModal(false);
                setWhatsAppSuccessResult(null);
                setWhatsAppError(null);
                setDispatchType(viewMode);
                setShowWhatsAppModal(true);
              }}
              className="bg-[#25D366] text-white hover:bg-[#20bd5a] font-semibold text-sm py-2.5 px-4 rounded-xl shadow-xs flex items-center justify-center gap-2 transition-all cursor-pointer"
            >
              <Share2 className="w-4 h-4" /> Send via WhatsApp
            </button>
          </div>
        </div>
      </Modal>

      {/* AUTOMATED WHATSAPP TIMETABLE DISPATCH MODAL */}
      <Modal
        open={showWhatsAppModal}
        onClose={() => setShowWhatsAppModal(false)}
        title="Send Timetable via WhatsApp"
        eyebrow={
          dispatchType === 'teacher'
            ? `Teacher Personal Schedule • ${selectedTeacherUser?.fullName || selectedTeacher?.employeeNo || 'Teacher'} • Academic Year 2026`
            : `${selectedClass?.grade || 'Class'} (${selectedClass?.section || 'A'}) • Academic Year 2026`
        }
        size="lg"
        footer={
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 w-full">
            <button
              type="button"
              onClick={handleOpenWhatsapp}
              className="w-full sm:w-auto text-xs font-semibold text-slate-700 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 border border-slate-300 flex items-center justify-center gap-2 py-2.5 px-3.5 rounded-xl transition-all cursor-pointer"
              title="Open chat link in WhatsApp Web"
            >
              <Share2 className="w-3.5 h-3.5 text-emerald-600" /> Open WhatsApp Web
            </button>

            <div className="flex items-center gap-3 w-full sm:w-auto justify-end">
              <button
                type="button"
                onClick={() => setShowWhatsAppModal(false)}
                className="w-full sm:w-auto text-xs font-semibold text-slate-600 hover:text-slate-900 hover:bg-slate-100 border border-slate-300 py-2.5 px-4 rounded-xl transition-all cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isSendingWhatsApp || (dispatchType === 'class' && !sendToTeacher && !sendToStudents)}
                onClick={handleAutomatedWhatsAppDispatch}
                className="w-full sm:w-auto bg-[#25D366] hover:bg-[#1EBE5D] disabled:opacity-50 text-white font-bold text-xs py-2.5 px-5 rounded-xl shadow-sm flex items-center justify-center gap-2 transition-all cursor-pointer"
              >
                {isSendingWhatsApp ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    Sending PDF...
                  </>
                ) : (
                  <>
                    <Send className="w-4 h-4" />
                    {dispatchType === 'teacher' ? 'Send Teacher PDF' : 'Send Timetable PDF'}
                  </>
                )}
              </button>
            </div>
          </div>
        }
      >
        <div className="space-y-4">
          {/* Dispatch Mode Selector */}
          <div className="p-1 bg-slate-100 rounded-xl border border-slate-200 flex items-center gap-1">
            <button
              type="button"
              onClick={() => setDispatchType('class')}
              className={`flex-1 py-2 px-3 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer ${
                dispatchType === 'class'
                  ? 'bg-white text-blue-900 shadow-xs border border-slate-200'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Calendar className="w-3.5 h-3.5 text-blue-600" />
              Class Timetable ({selectedClass?.grade || 'Grade'} {selectedClass?.section || ''})
            </button>
            <button
              type="button"
              onClick={() => setDispatchType('teacher')}
              className={`flex-1 py-2 px-3 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer ${
                dispatchType === 'teacher'
                  ? 'bg-white text-emerald-900 shadow-xs border border-slate-200'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <User className="w-3.5 h-3.5 text-emerald-600" />
              Teacher Timetable ({selectedTeacherUser?.fullName || 'Teacher'})
            </button>
          </div>

          {/* Connection Status Bar */}
          {waBotStatus.isConnected ? (
            <div className="flex items-center justify-between px-4 py-3 bg-emerald-50 border border-emerald-300 rounded-xl">
              <div className="flex items-center gap-2">
                <span className="font-bold text-sm text-emerald-950">
                  WhatsApp Connected:
                </span>
                <span className="font-mono text-sm font-semibold text-emerald-900">
                  +{waBotStatus.user}
                </span>
              </div>
              <button
                type="button"
                onClick={handleLogoutWhatsApp}
                className="text-xs font-bold text-red-600 hover:text-red-700 hover:underline flex items-center gap-1.5 transition-colors cursor-pointer"
              >
                <LogOut className="w-3.5 h-3.5" /> Disconnect
              </button>
            </div>
          ) : (
            <div className="p-4 rounded-xl border border-amber-300 bg-amber-50/60 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Smartphone className="w-5 h-5 text-amber-600" />
                  <span className="text-xs font-bold text-slate-900">Connect WhatsApp Web</span>
                </div>
                <div className="flex items-center gap-1 bg-white p-1 rounded-lg border border-slate-200 text-xs">
                  <button
                    type="button"
                    onClick={() => setWaConnectTab('qr')}
                    className={`px-2.5 py-1 rounded font-bold transition-all cursor-pointer ${
                      waConnectTab === 'qr' ? 'bg-amber-500 text-white' : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    📷 Scan QR Code
                  </button>
                  <button
                    type="button"
                    onClick={() => setWaConnectTab('code')}
                    className={`px-2.5 py-1 rounded font-bold transition-all cursor-pointer ${
                      waConnectTab === 'code' ? 'bg-amber-500 text-white' : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    🔑 8-Digit Code
                  </button>
                </div>
              </div>

              {waConnectTab === 'qr' ? (
                <div className="space-y-2.5">
                  <p className="text-xs text-slate-700 font-medium">
                    Open WhatsApp on your phone ➔ <strong>Settings / 3-dots ➔ Linked Devices ➔ Link a Device</strong>, then scan the QR code below:
                  </p>

                  {waBotStatus.qrCode ? (
                    <div className="flex flex-col items-center justify-center p-3 bg-white rounded-xl border border-slate-300 w-fit mx-auto shadow-sm">
                      <img src={waBotStatus.qrCode} alt="WhatsApp QR Code" className="w-44 h-44 object-contain" />
                      <span className="text-[11px] text-emerald-700 font-bold mt-1.5 flex items-center gap-1">
                        <CheckCircle2 className="w-3.5 h-3.5" /> Ready to scan — connects automatically
                      </span>
                    </div>
                  ) : (
                    <div className="text-center py-5 bg-white rounded-xl border border-dashed border-slate-300 space-y-2">
                      <p className="text-xs text-slate-600">Click below to generate a fresh QR Code instantly:</p>
                      <button
                        type="button"
                        onClick={handleInitWhatsAppQr}
                        className="px-4 py-2 bg-blue-600 text-white font-bold text-xs rounded-lg shadow-xs hover:bg-blue-700 transition-colors inline-flex items-center gap-1.5 cursor-pointer"
                      >
                        <RefreshCw className={`w-3.5 h-3.5 ${isRefreshingQr ? 'animate-spin' : ''}`} /> Generate Live QR Code Now
                      </button>
                    </div>
                  )}
                </div>
              ) : (
                <div className="space-y-3 p-3 bg-white rounded-xl border border-slate-200">
                  <div className="text-xs text-slate-700 font-semibold">
                    1. On your phone: Tap <strong>"Link with phone number instead"</strong> at the bottom of the WhatsApp scanning screen.
                  </div>
                  <div className="text-xs text-slate-700 font-semibold">
                    2. Enter your WhatsApp phone number below to receive your 8-digit pairing code:
                  </div>

                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      value={pairingPhone}
                      onChange={(e) => setPairingPhone(e.target.value)}
                      placeholder="e.g. 94752572722"
                      className="flex-1 text-xs font-mono p-2 border border-slate-300 rounded-lg bg-white text-slate-900 focus:outline-none focus:border-blue-600"
                    />
                    <Button
                      size="sm"
                      onClick={handleGetPairingCode}
                      disabled={isRequestingPairingCode || !pairingPhone.trim()}
                      className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold shrink-0"
                    >
                      {isRequestingPairingCode ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : 'Get 8-Digit Code'}
                    </Button>
                  </div>

                  {pairingCodeState && (
                    <div className="p-3 bg-emerald-50 border-2 border-emerald-500 rounded-xl text-center space-y-1">
                      <span className="text-[11px] uppercase tracking-wider font-bold text-emerald-800">Your WhatsApp 8-Digit Pairing Code:</span>
                      <div className="text-2xl font-mono font-black text-emerald-600 tracking-widest">
                        {pairingCodeState}
                      </div>
                      <p className="text-[11px] text-slate-600">
                        Enter this 8-digit code on your mobile phone screen to pair instantly.
                      </p>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Document Attachment Preview Card */}
          <div className="p-3.5 rounded-xl border border-slate-200 bg-slate-50/70 flex items-center justify-between gap-3 shadow-xs">
            <div className="flex items-center gap-3.5 min-w-0">
              <div className="w-11 h-11 rounded-xl bg-red-100 text-red-600 flex items-center justify-center shrink-0 border border-red-200">
                <FileText className="w-6 h-6" />
              </div>
              <div className="min-w-0">
                <div className="text-sm font-bold text-slate-900 truncate">
                  {dispatchType === 'teacher'
                    ? `Teacher_${(selectedTeacherUser?.fullName || 'Teacher').replace(/[^a-zA-Z0-9]/g, '_')}_Personal_Schedule.pdf`
                    : selectedClass
                    ? `${selectedClass.grade}_${selectedClass.section}_Weekly_Timetable.pdf`
                    : 'Class_Weekly_Timetable.pdf'}
                </div>
                <div className="text-xs text-slate-600 font-medium flex items-center gap-1.5 mt-0.5">
                  <span className="text-slate-700">
                    {dispatchType === 'teacher' ? 'Official Teacher Master Schedule' : 'Official PDF Document'}
                  </span>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <a
                href={
                  dispatchType === 'teacher'
                    ? `http://${window.location.hostname || 'localhost'}:5000/api/timetable/pdf/teacher/${selectedTeacherId}`
                    : `http://${window.location.hostname || 'localhost'}:5000/api/timetable/pdf/class/${selectedClassId}`
                }
                target="_blank"
                rel="noreferrer"
                className="text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 flex items-center gap-1.5 px-3 py-2 rounded-lg shadow-2xs transition-colors cursor-pointer"
                title="Open Official Landscape PDF"
              >
                <FileText className="w-3.5 h-3.5" /> Preview PDF <ExternalLink className="w-3 h-3" />
              </a>
              <a
                href={
                  dispatchType === 'teacher'
                    ? `http://${window.location.hostname || 'localhost'}:5000/api/timetable/document/teacher/${selectedTeacherId}`
                    : `http://${window.location.hostname || 'localhost'}:5000/api/timetable/document/class/${selectedClassId}`
                }
                target="_blank"
                rel="noreferrer"
                className="text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 flex items-center gap-1.5 px-2.5 py-2 rounded-lg border border-slate-200 transition-colors cursor-pointer"
                title="Open Responsive Web Document"
              >
                Web View <ExternalLink className="w-3 h-3" />
              </a>
            </div>
          </div>

          {/* Recipients Selection */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                Recipients
              </label>
              <span className="text-xs text-slate-500 font-medium">
                {dispatchType === 'teacher' ? 'Target Faculty Teacher' : 'Toggle who will receive the message'}
              </span>
            </div>

            {dispatchType === 'teacher' ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {/* Target Teacher */}
                <div className="p-3.5 rounded-xl border-2 border-emerald-600 bg-white shadow-xs flex items-start gap-3 select-none">
                  <div className="mt-0.5 w-5 h-5 rounded bg-[#25D366] text-white flex items-center justify-center text-xs font-bold shrink-0">
                    <Check className="w-3.5 h-3.5 stroke-[3]" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-1.5">
                      <span className="text-sm font-bold text-slate-900 truncate">
                        {selectedTeacherUser?.fullName || 'Teacher'}
                      </span>
                      <span className="text-xs font-semibold bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-md shrink-0">
                        Target Teacher
                      </span>
                    </div>
                    <div className="text-xs text-slate-600 font-medium flex items-center gap-1.5 mt-1">
                      <Phone className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                      <span className="truncate">
                        {selectedTeacherUser?.phone || selectedTeacher?.employeeNo || '+94771234567'}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Excluded Guardians */}
                <div className="p-3.5 rounded-xl border border-slate-200 bg-slate-50/70 flex items-start gap-3 opacity-75 select-none">
                  <div className="mt-0.5 w-5 h-5 rounded border border-slate-300 bg-slate-200 text-slate-400 flex items-center justify-center text-xs font-bold shrink-0">
                    ✕
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-1.5">
                      <span className="text-sm font-bold text-slate-700 truncate">
                        Class Guardians
                      </span>
                      <span className="text-xs font-semibold bg-slate-200 text-slate-600 px-2 py-0.5 rounded-md shrink-0">
                        Excluded
                      </span>
                    </div>
                    <div className="text-xs text-slate-500 font-medium mt-1 leading-snug">
                      Teacher personal master schedule is private to the faculty member.
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {/* Class Teacher */}
                <div
                  onClick={() => setSendToTeacher(!sendToTeacher)}
                  className={`p-3.5 rounded-xl border-2 transition-all cursor-pointer flex items-start gap-3 select-none ${
                    sendToTeacher
                      ? 'border-emerald-600 bg-white shadow-xs'
                      : 'border-slate-200 bg-slate-50/50 opacity-60'
                  }`}
                >
                  <div
                    className={`mt-0.5 w-5 h-5 rounded flex items-center justify-center text-xs font-bold shrink-0 transition-colors ${
                      sendToTeacher ? 'bg-[#25D366] text-white' : 'border border-slate-400 bg-white'
                    }`}
                  >
                    {sendToTeacher && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-1.5">
                      <span className="text-sm font-bold text-slate-900 truncate">
                        {classTeacherUser?.fullName || 'Shaheed Mohammed Jawahar'}
                      </span>
                      <span className="text-xs font-semibold bg-blue-100 text-blue-800 px-2 py-0.5 rounded-md shrink-0">
                        Class Teacher
                      </span>
                    </div>
                    <div className="text-xs text-slate-600 font-medium flex items-center gap-1.5 mt-1">
                      <Phone className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                      <span className="truncate">{classTeacherUser?.phone || classTeacher?.employeeNo || '+94 76 625 0583'}</span>
                    </div>
                  </div>
                </div>

                {/* Class Students & Guardians */}
                {(() => {
                  const classStudents = (students || []).filter(
                    (s) => s.classId === selectedClassId && s.status === 'active'
                  );
                  const studentsWithPhone = classStudents.filter((s) => {
                    const raw = (s.guardianPhone || s.phone || users.find((u) => u.id === s.userId)?.phone || '').trim();
                    return raw.replace(/[^0-9]/g, '').length >= 9;
                  });

                  return (
                    <div
                      onClick={() => setSendToStudents(!sendToStudents)}
                      className={`p-3.5 rounded-xl border-2 transition-all cursor-pointer flex items-start gap-3 select-none ${
                        sendToStudents
                          ? 'border-emerald-600 bg-white shadow-xs'
                          : 'border-slate-200 bg-slate-50/50 opacity-60'
                      }`}
                    >
                      <div
                        className={`mt-0.5 w-5 h-5 rounded flex items-center justify-center text-xs font-bold shrink-0 transition-colors ${
                          sendToStudents ? 'bg-[#25D366] text-white' : 'border border-slate-400 bg-white'
                        }`}
                      >
                        {sendToStudents && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between gap-1.5">
                          <span className="text-sm font-bold text-slate-900 truncate">
                            Registered Guardians
                          </span>
                          <span className="text-xs font-semibold bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-md shrink-0">
                            {studentsWithPhone.length} Verified Phone{studentsWithPhone.length === 1 ? '' : 's'}
                          </span>
                        </div>
                        <div className="text-xs text-slate-600 font-medium mt-1 leading-normal">
                          {studentsWithPhone.length > 0 ? (
                            <span>
                              Sends only to {studentsWithPhone.length} verified phone{studentsWithPhone.length === 1 ? '' : 's'}: {studentsWithPhone.map((s) => `${s.firstName} ${s.lastName} (${s.guardianPhone || s.phone})`).join(', ')}
                            </span>
                          ) : (
                            <span className="text-amber-800 font-semibold">
                              ⚠️ No phone numbers registered for this class. Add phone numbers in the Students tab.
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })()}
              </div>
            )}
          </div>

          {/* Optional Message */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block">
              Message Note <span className="font-normal text-slate-500 lowercase">(optional)</span>
            </label>
            <textarea
              rows={2}
              value={whatsAppNote}
              onChange={(e) => setWhatsAppNote(e.target.value)}
              className="w-full text-sm font-normal p-3 rounded-xl border border-slate-300 bg-white text-slate-900 focus:outline-hidden focus:border-blue-600 focus:ring-1 focus:ring-blue-600 transition-all resize-none shadow-xs"
              placeholder="Add an optional message note to include with the PDF..."
            />
          </div>

          {/* TCP Transmission Control & Handshake Status Report */}
          {whatsAppSuccessResult && (
            <div className="space-y-3 bg-[#0A101D] text-white p-5 rounded-2xl border border-slate-800 shadow-xl animate-fade-in">
              {/* TCP Transmission Header */}
              <div className="flex items-center justify-between pb-3 border-b border-slate-800 flex-wrap gap-2">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-lg bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center justify-center font-mono font-bold text-xs shrink-0">
                    TCP
                  </div>
                  <div>
                    <div className="text-sm font-extrabold tracking-wide text-white uppercase flex items-center gap-2 flex-wrap">
                      <span>Transmission Control Report</span>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                        {whatsAppSuccessResult.handshakeStatus === 'SUCCESS_ACK_COMPLETE' ? 'HANDSHAKE VERIFIED (100% ACK)' : 'PARTIAL TRANSMISSION'}
                      </span>
                    </div>
                    <div className="text-xs text-slate-400 font-mono mt-0.5">
                      Engine: {whatsAppSuccessResult.mode || 'WhatsApp Direct Gateway'}
                    </div>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setWhatsAppSuccessResult(null)}
                  className="text-xs text-slate-400 hover:text-white underline font-medium cursor-pointer"
                >
                  Dismiss Report
                </button>
              </div>

              {/* Metric Stat Cards Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 pt-1">
                <div className="bg-slate-900/80 p-3 rounded-xl border border-slate-800 text-center">
                  <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Total Target</div>
                  <div className="text-lg font-black text-white font-mono mt-0.5">{whatsAppSuccessResult.totalTarget || whatsAppSuccessResult.deliveryLog?.length || 1}</div>
                </div>
                <div className="bg-emerald-950/40 p-3 rounded-xl border border-emerald-800/40 text-center">
                  <div className="text-[10px] font-bold text-emerald-400 uppercase tracking-wider">ACK (Delivered)</div>
                  <div className="text-lg font-black text-emerald-400 font-mono mt-0.5">{whatsAppSuccessResult.totalDelivered || 0}</div>
                </div>
                <div className={`p-3 rounded-xl border text-center ${whatsAppSuccessResult.totalFailed > 0 ? 'bg-red-950/40 border-red-800/40 text-red-400' : 'bg-slate-900/80 border-slate-800 text-slate-400'}`}>
                  <div className="text-[10px] font-bold uppercase tracking-wider">NACK (Failed)</div>
                  <div className="text-lg font-black font-mono mt-0.5">{whatsAppSuccessResult.totalFailed || 0}</div>
                </div>
                <div className="bg-blue-950/40 p-3 rounded-xl border border-blue-800/40 text-center">
                  <div className="text-[10px] font-bold text-blue-400 uppercase tracking-wider">Delivery Rate</div>
                  <div className="text-lg font-black text-blue-400 font-mono mt-0.5">{whatsAppSuccessResult.successRate || '100%'}</div>
                </div>
              </div>

              {/* Per-Recipient Detailed TCP Transmission Table */}
              <div className="space-y-2 pt-2">
                <div className="flex items-center justify-between text-xs font-bold text-slate-400 uppercase tracking-wider">
                  <span>Packet Delivery Breakdown (Per Recipient)</span>
                  <span className="font-mono text-[10px] text-slate-500">Protocol: ACK/NACK Tracking</span>
                </div>

                <div className="overflow-x-auto rounded-xl border border-slate-800 bg-slate-950">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="border-b border-slate-800 bg-slate-900/70 text-slate-400 font-mono text-[11px]">
                        <th className="p-2.5">RECIPIENT & ROLE</th>
                        <th className="p-2.5">PHONE NUMBER</th>
                        <th className="p-2.5 text-center">STATUS</th>
                        <th className="p-2.5 text-right">PACKET HASH / MSG ID</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/60 font-mono">
                      {(whatsAppSuccessResult.deliveryLog || []).map((item: any, idx: number) => {
                        const isOk = item.status === 'delivered';
                        return (
                          <tr key={idx} className="hover:bg-slate-900/40 transition-colors">
                            <td className="p-2.5 font-sans">
                              <div className="font-bold text-slate-200">{item.name}</div>
                              <div className="text-[10px] text-slate-400">{item.role}</div>
                            </td>
                            <td className="p-2.5 text-slate-300 font-mono">
                              {item.phone}
                            </td>
                            <td className="p-2.5 text-center">
                              {isOk ? (
                                <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span> ACK Delivered
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-bold bg-red-500/20 text-red-400 border border-red-500/30" title={item.errorReason || 'Unreachable'}>
                                  <span className="w-1.5 h-1.5 rounded-full bg-red-400"></span> NACK Failed
                                </span>
                              )}
                            </td>
                            <td className="p-2.5 text-right text-[10px] text-slate-400 font-mono">
                              {item.messageId ? item.messageId.slice(0, 18) : 'N/A'}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {whatsAppError && (
            <div className="bg-red-50 border-2 border-red-500 text-red-900 p-3.5 rounded-xl flex items-center gap-2.5 text-xs font-semibold shadow-xs">
              <AlertCircle className="w-5 h-5 text-red-600 shrink-0" />
              <span>{whatsAppError}</span>
            </div>
          )}
        </div>
      </Modal>
    </div>
  );
};

export default TimetableModule;
