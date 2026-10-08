import React, { useState } from 'react';
import { Calendar, CheckCircle2, AlertTriangle, Users, Filter, Sparkles, Lock, UserCheck, Eye, Save, Check, Clock, X } from 'lucide-react';
import { useData } from '../../context/DataContext';
import { CustomSelect, SelectOption } from '../common/CustomSelect';
import { AttendanceStatus, Student } from '../../types';
import { PageHeader } from '../ui/PageHeader';
import { StatCard } from '../ui/StatCard';
import { Badge } from '../ui/Badge';
import { Button } from '../ui/Button';
import { IconTile } from '../ui/IconTile';
import { Card } from '../ui/Card';
import { Table, THead, TH, TBody, TR, TD } from '../ui/Table';
import { Input, DatePicker } from '../ui';

export const AttendanceModule: React.FC = () => {
  const { classes, students, teachers, users, attendance, currentUser, markAttendance, bulkMarkAttendance, assignedClassId } = useData();
  const [selectedClassId, setSelectedClassIdState] = useState<string>(() => {
    const stored = localStorage.getItem('gsms_attendance_selected_class');
    if (stored && classes.some((c) => c.id === stored)) return stored;
    if (currentUser?.role === 'teacher' && assignedClassId) return assignedClassId;
    return classes[0]?.id || 'class-10a';
  });

  const setSelectedClassId = (classVal: string) => {
    setSelectedClassIdState(classVal);
    localStorage.setItem('gsms_attendance_selected_class', classVal);
  };

  const getTodayDateStr = () => {
    const d = new Date();
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const [selectedDate, setSelectedDateState] = useState<string>(() => {
    return getTodayDateStr();
  });

  const setSelectedDate = (dateVal: string) => {
    setSelectedDateState(dateVal);
    localStorage.setItem('gsms_attendance_selected_date', dateVal);
  };

  const [remarksInput, setRemarksInput] = useState<{ [studentId: string]: string }>({});
  const [isSavedSuccess, setIsSavedSuccess] = useState(false);

  const isPrincipalOrAdmin = ['principal', 'vice_principal', 'admin', 'education_officer'].includes(currentUser?.role || '');

  React.useEffect(() => {
    if (classes.length > 0) {
      const isValid = selectedClassId === 'all' || classes.some((c) => c.id === selectedClassId);
      if (!isValid) {
        const fallback = (currentUser?.role === 'teacher' && assignedClassId && classes.some((c) => c.id === assignedClassId))
          ? assignedClassId
          : (isPrincipalOrAdmin ? 'all' : classes[0].id);
        setSelectedClassIdState(fallback);
        localStorage.setItem('gsms_attendance_selected_class', fallback);
      }
    }
  }, [classes, selectedClassId, assignedClassId, currentUser?.role, isPrincipalOrAdmin]);

  React.useEffect(() => {
    const checkMidnightRollover = () => {
      const todayStr = getTodayDateStr();
      setSelectedDateState((currentDate) => {
        // If the user's active view date is behind today's local date, auto-advance at midnight
        if (currentDate < todayStr) {
          localStorage.setItem('gsms_attendance_selected_date', todayStr);
          return todayStr;
        }
        return currentDate;
      });
    };

    const interval = setInterval(checkMidnightRollover, 30000);
    return () => clearInterval(interval);
  }, []);

  const classStudents = selectedClassId === 'all'
    ? students
    : students.filter((s) => s.classId === selectedClassId);
  const selectedClass = classes.find((c) => c.id === selectedClassId);

  const classTitleText = selectedClassId === 'all'
    ? 'All Classes (Overall School Register)'
    : (selectedClass ? `${selectedClass.grade} - Section ${selectedClass.section}` : 'Select a class');

  const classOptions: SelectOption[] = [
    ...(isPrincipalOrAdmin ? [{ value: 'all', label: 'All Classes (Overall School Register)' }] : []),
    ...classes.map((c) => ({
      value: c.id,
      label: `${c.grade} - Section ${c.section} (AY ${c.academicYear})${currentUser?.role === 'teacher' && c.id === assignedClassId ? ' (Your Class)' : ''}`,
    })),
  ];

  // Identify assigned Class Teacher for the selected class
  const classTeacher = teachers.find((t) => t.id === selectedClass?.classTeacherId || t.userId === selectedClass?.classTeacherId || t.employeeNo === selectedClass?.classTeacherId);
  const classTeacherUser = users.find((u) => u.id === classTeacher?.userId || u.id === selectedClass?.classTeacherId) || null;

  // Permissions: ONLY the Class Teacher assigned to THIS specific class room can mark or edit attendance!
  // Principal, Vice Principal, Admin, Education Officer, and Teachers viewing other classes are 100% READ-ONLY (Oversight Mode)!
  const isTeacherRole = currentUser?.role === 'teacher';
  const isAssignedClass = isTeacherRole && Boolean(assignedClassId) && selectedClassId === assignedClassId;
  const canEditAttendance = isAssignedClass;
  const userAssignedClass = classes.find((c) => c.id === assignedClassId);

  const getStudentAttStatus = (student: Student | string): AttendanceStatus | 'unconfirmed' => {
    let sId = '';
    let sNo = '';
    if (typeof student === 'string') {
      sId = student;
      const matched = students.find((s) => s.id === student || s.studentNo === student);
      if (matched) {
        sId = matched.id;
        sNo = matched.studentNo || '';
      }
    } else if (student) {
      sId = student.id;
      sNo = student.studentNo || '';
    }

    const targetDate = (selectedDate || '').split('T')[0];

    const records = attendance.filter((a: any) => {
      const aId = a.studentId || a.student_id;
      const aNo = a.studentNo || a.student_no || '';
      const aDate = (a.date || '').split('T')[0];

      const matchId = (sId && (aId === sId || aNo === sId)) || (sNo && (aId === sNo || aNo === sNo));
      return matchId && aDate === targetDate;
    });

    if (records.length === 0) return 'unconfirmed';
    const confirmed = records.find((r: any) => r.status === 'present' || r.status === 'absent' || r.status === 'late');
    return confirmed ? confirmed.status : records[0].status;
  };

  // ONE SINGLE BUTTON: Save & Submit All Attendance & Remarks
  const handleSaveAllAttendanceAndRemarks = () => {
    if (!canEditAttendance) return;

    classStudents.forEach((student) => {
      const currentStatus = getStudentAttStatus(student);
      const statusToSave = currentStatus === 'unconfirmed' ? 'present' : currentStatus;
      const targetDate = (selectedDate || '').split('T')[0];
      const attRecord = attendance.find((a: any) => {
        const aId = a.studentId || a.student_id;
        const aNo = a.studentNo || a.student_no || '';
        const aDate = (a.date || '').split('T')[0];
        const sId = student.id;
        const sNo = student.studentNo || '';
        const matchId = (sId && (aId === sId || aNo === sId)) || (sNo && (aId === sNo || aNo === sNo));
        return matchId && aDate === targetDate;
      });
      const remarkToSave = remarksInput[student.id] !== undefined
        ? remarksInput[student.id]
        : (attRecord?.remarks || '');

      markAttendance(student.id, statusToSave, selectedDate, remarkToSave);
    });

    setIsSavedSuccess(true);
    setTimeout(() => setIsSavedSuccess(false), 3000);
  };

  const handleMarkAllPresent = () => {
    if (!canEditAttendance) return;
    classStudents.forEach((s) => {
      const rk = remarksInput[s.id] || '';
      markAttendance(s.id, 'present', selectedDate, rk);
    });
    setIsSavedSuccess(true);
    setTimeout(() => setIsSavedSuccess(false), 3000);
  };

  const presentCount = classStudents.filter((s) => getStudentAttStatus(s) === 'present').length;
  const absentCount = classStudents.filter((s) => getStudentAttStatus(s) === 'absent').length;
  const lateCount = classStudents.filter((s) => getStudentAttStatus(s) === 'late').length;

  const statusBadgeTone = (status: AttendanceStatus | 'unconfirmed') =>
    status === 'present' ? 'success' : status === 'absent' ? 'danger' : status === 'late' ? 'warning' : 'neutral';

  const statusLabel = (status: AttendanceStatus | 'unconfirmed') =>
    status === 'unconfirmed' ? 'Not marked' : status.charAt(0).toUpperCase() + status.slice(1);

  return (
    <div className="space-y-6 animate-fade-in">
      {/* MODULE HEADER */}
      <PageHeader
        eyebrow={
          <Badge tone="brand">
            <Calendar className="w-3.5 h-3.5" /> Attendance register • Grades 1 to 11
          </Badge>
        }
        title="Daily student roster & attendance"
        description="Manage daily class registers, track historical student absences, and submit attendance records in real time."
      />

      {/* FILTER & ACTION TOOLBAR CARD */}
      <Card className="p-4 sm:p-5 flex flex-col md:flex-row md:items-center justify-between gap-4 bg-surface-muted/60 border border-border shadow-xs">
        <div className="flex flex-wrap items-center gap-3 flex-1 min-w-0">
          <div className="flex items-center gap-2 min-w-0">
            <span className="text-xs font-semibold uppercase tracking-wider text-ink-muted whitespace-nowrap hidden lg:inline">Select Class:</span>
            <CustomSelect
              options={classOptions}
              value={selectedClassId}
              onChange={setSelectedClassId}
              icon={<Filter className="w-3.5 h-3.5 text-ink-muted" />}
              title="Select class"
            />
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold uppercase tracking-wider text-ink-muted whitespace-nowrap hidden lg:inline">Date:</span>
            <DatePicker
              value={selectedDate}
              onChange={setSelectedDate}
              className="w-44"
            />
            {selectedDate !== getTodayDateStr() && (
              <Button
                variant="secondary"
                onClick={() => setSelectedDate(getTodayDateStr())}
                title="Reset to today's date"
              >
                Today
              </Button>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2.5 justify-end">
          {canEditAttendance ? (
            <>
              <Button variant="secondary" onClick={handleMarkAllPresent}>
                <Sparkles className="w-4 h-4 text-brand" /> Mark all present
              </Button>

              <Button
                variant={isSavedSuccess ? 'success' : 'primary'}
                onClick={handleSaveAllAttendanceAndRemarks}
              >
                {isSavedSuccess ? (
                  <>
                    <Check className="w-4 h-4" /> Saved
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4" /> Save attendance & remarks
                  </>
                )}
              </Button>
            </>
          ) : (
            <Badge tone="neutral" className="px-3.5 py-2 text-xs flex items-center gap-1.5 border border-border">
              <Lock className="w-3.5 h-3.5 text-ink-muted" />
              {isTeacherRole
                ? 'Read-Only (Not Your Assigned Class)'
                : 'Oversight Mode (Read-Only)'}
            </Badge>
          )}
        </div>
      </Card>

      {/* CLASS TEACHER ASSIGNMENT & OVERSIGHT BANNER */}
      <Card className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3.5">
          <IconTile
            icon={canEditAttendance ? UserCheck : Lock}
            tone={canEditAttendance ? 'success' : (isPrincipalOrAdmin ? 'info' : 'warning')}
            size="lg"
          />
          <div>
            <div className="text-xs font-semibold uppercase tracking-wide text-ink-faint">
              Assigned class teacher: {classTeacherUser?.fullName || 'Shaheed Mohammed Jawahar'}
            </div>
            <div className="font-medium text-sm text-ink mt-0.5 leading-relaxed">
              {isTeacherRole ? (
                isAssignedClass ? (
                  <span>
                    Daily register for <strong>{selectedClass?.grade} ({selectedClass?.section})</strong>. Set student status to Present/Absent/Late below or click "Mark all present", then click Save.
                  </span>
                ) : (
                  <span className="text-warning-dark font-medium">
                    <strong>Read-Only Mode:</strong> You are currently viewing <strong>{selectedClass?.grade} ({selectedClass?.section})</strong>. You can only mark attendance for your assigned class <strong>({userAssignedClass ? `${userAssignedClass.grade} - Section ${userAssignedClass.section}` : 'Your Class'})</strong>.
                  </span>
                )
              ) : (
                <span>
                  Viewing in oversight mode — attendance is read-only. Displaying register marked by class teacher {classTeacherUser?.fullName || 'Shaheed Mohammed Jawahar'}.
                </span>
              )}
            </div>
          </div>
        </div>

        {isTeacherRole ? (
          isAssignedClass ? <Badge tone="success">Your Assigned Class</Badge> : <Badge tone="warning">Read-Only View</Badge>
        ) : (
          <Badge tone="info">Oversight Mode</Badge>
        )}
      </Card>

      {/* Summary Cards Row */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <StatCard label="Enrolled roster" icon={Users} tone="brand" value={classStudents.length} />
        <StatCard label="Present" icon={CheckCircle2} tone="success" value={presentCount} />
        <StatCard label="Absent" icon={AlertTriangle} tone="danger" value={absentCount} />
        <StatCard label="Late arrived" icon={Clock} tone="warning" value={lateCount} />
      </div>

      {/* Student Roster Table */}
      <Card padded={false}>
        <div className="px-6 py-3.5 bg-surface-muted border-b border-border flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <span className="font-semibold text-sm text-ink">
            Roster: {classTitleText} &middot; {selectedDate}
          </span>
          <span className="text-xs text-ink-muted">
            {canEditAttendance
              ? 'Set student status, add remarks, then click Save attendance & remarks'
              : 'Viewing submitted register (Read-Only Mode)'}
          </span>
        </div>

        <Table>
          <THead>
            <tr>
              <TH className="w-16">#</TH>
              <TH>Student ID</TH>
              <TH>Full student name</TH>
              <TH>Historical absences</TH>
              <TH>Teacher remarks</TH>
              <TH className="text-right">Status</TH>
            </tr>
          </THead>
          <TBody>
            {classStudents.length === 0 ? (
              <TR>
                <TD colSpan={6} className="py-8 text-center text-ink-muted italic">
                  No students currently enrolled in {selectedClass?.grade} ({selectedClass?.section}).
                </TD>
              </TR>
            ) : (
              classStudents.map((student, idx) => {
                const currentStatus = getStudentAttStatus(student);
                const targetDate = (selectedDate || '').split('T')[0];
                const attRecord = attendance.find((a: any) => {
                  const aId = a.studentId || a.student_id;
                  const aNo = a.studentNo || a.student_no || '';
                  const aDate = (a.date || '').split('T')[0];
                  const sId = student.id;
                  const sNo = student.studentNo || '';
                  const matchId = (sId && (aId === sId || aNo === sId)) || (sNo && (aId === sNo || aNo === sNo));
                  return matchId && aDate === targetDate;
                });
                const totalAbs = attendance.filter((a: any) => {
                  const aId = a.studentId || a.student_id;
                  const aNo = a.studentNo || a.student_no || '';
                  const sId = student.id;
                  const sNo = student.studentNo || '';
                  const matchId = (sId && (aId === sId || aNo === sId)) || (sNo && (aId === sNo || aNo === sNo));
                  return matchId && a.status === 'absent';
                }).length;
                const isHighAbsence = totalAbs >= 3;

                const currentRemarkVal = remarksInput[student.id] !== undefined ? remarksInput[student.id] : (attRecord?.remarks || '');

                return (
                  <TR key={student.id}>
                    <TD className="font-mono-data text-ink-faint">{idx + 1}</TD>
                    <TD className="font-mono-data font-semibold">{student.studentNo}</TD>
                    <TD>
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-ink">{student.firstName} {student.lastName}</span>
                        {isHighAbsence && <Badge tone="danger">High absence ({totalAbs})</Badge>}
                      </div>
                    </TD>
                    <TD className="text-ink-muted">{totalAbs} days</TD>
                    <TD>
                      {canEditAttendance ? (
                        <Input
                          type="text"
                          placeholder="e.g. fever, medical certificate"
                          value={currentRemarkVal}
                          onChange={(e) => setRemarksInput({ ...remarksInput, [student.id]: e.target.value })}
                          className="max-w-xs py-2 text-sm"
                        />
                      ) : (
                        <span className="text-ink-muted">{currentRemarkVal || '—'}</span>
                      )}
                    </TD>
                    <TD className="text-right">
                      {canEditAttendance ? (
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            type="button"
                            onClick={() => {
                              markAttendance(student.id, 'present', selectedDate, currentRemarkVal);
                            }}
                            className={`px-3 py-1.5 rounded-lg font-semibold text-xs flex items-center gap-1.5 transition-all cursor-pointer ${
                              currentStatus === 'present'
                                ? 'bg-success text-white shadow-xs'
                                : 'bg-success-tint text-success hover:bg-success hover:text-white'
                            }`}
                          >
                            <Check className="w-3.5 h-3.5 stroke-[3]" /> Present
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              markAttendance(student.id, 'absent', selectedDate, currentRemarkVal);
                            }}
                            className={`px-3 py-1.5 rounded-lg font-semibold text-xs flex items-center gap-1.5 transition-all cursor-pointer ${
                              currentStatus === 'absent'
                                ? 'bg-danger text-white shadow-xs'
                                : 'bg-danger-tint text-danger hover:bg-danger hover:text-white'
                            }`}
                          >
                            <X className="w-3.5 h-3.5 stroke-[3]" /> Absent
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              markAttendance(student.id, 'late', selectedDate, currentRemarkVal);
                            }}
                            className={`px-3 py-1.5 rounded-lg font-semibold text-xs flex items-center gap-1.5 transition-all cursor-pointer ${
                              currentStatus === 'late'
                                ? 'bg-warning text-white shadow-xs'
                                : 'bg-warning-tint text-warning hover:bg-warning hover:text-white'
                            }`}
                          >
                            <Clock className="w-3.5 h-3.5 stroke-[2.5]" /> Late
                          </button>
                        </div>
                      ) : (
                        <Badge tone={statusBadgeTone(currentStatus)}>{statusLabel(currentStatus)}</Badge>
                      )}
                    </TD>
                  </TR>
                );
              })
            )}
          </TBody>
        </Table>
      </Card>
    </div>
  );
};
