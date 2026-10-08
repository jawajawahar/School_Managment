import React, { useEffect, useState } from 'react';
import { AcademicModule } from './AcademicModule';
import { ExaminationModule } from './ExaminationModule';
import { Award, BookOpen, AlertTriangle, CheckCircle2 } from 'lucide-react';
import { useData } from '../../context/DataContext';
import { PageHeader } from '../ui/PageHeader';
import { Badge } from '../ui/Badge';
import { StatCard } from '../ui/StatCard';
import { Card } from '../ui/Card';
import { Tabs } from '../ui/Tabs';
import { Table, THead, TH, TBody, TR, TD } from '../ui/Table';
import { EmptyState } from '../ui/EmptyState';

export type AcademicSubView = 'allocations' | 'exams' | 'analytics';
type AnalyticsTab = 'spectrum' | 'subjects' | 'remedial';

interface AcademicWrapperProps {
  initialSubView?: AcademicSubView;
}

export const AcademicWrapper: React.FC<AcademicWrapperProps> = ({ initialSubView = 'allocations' }) => {
  const { examResults, students, subjects, classes, activeRole, assignedClassId } = useData();
  const [subView, setSubView] = useState<AcademicSubView>(initialSubView);
  const [analyticsTab, setAnalyticsTab] = useState<AnalyticsTab>('spectrum');

  useEffect(() => {
    if (initialSubView) {
      setSubView(initialSubView);
    }
  }, [initialSubView]);

  const isTeacher = activeRole === 'teacher';
  const targetStudents = isTeacher
    ? students.filter((s) => s.classId === assignedClassId)
    : students;
  const targetStudentIds = new Set(targetStudents.map((s) => s.id));
  const relevantResults = examResults.filter((r) => targetStudentIds.has(r.studentId));

  const totalRegistered = relevantResults.length;
  const passedResults = relevantResults.filter((r) => r.grade !== 'F' && r.marksObtained >= 40);
  const failedResults = relevantResults.filter((r) => r.grade === 'F' || r.marksObtained < 40);
  const passRate = totalRegistered > 0 ? Math.round((passedResults.length / totalRegistered) * 100) : 0;

  const countA = relevantResults.filter((r) => r.grade === 'A').length;
  const countB = relevantResults.filter((r) => r.grade === 'B').length;
  const countC = relevantResults.filter((r) => r.grade === 'C').length;
  const countS = relevantResults.filter((r) => r.grade === 'S').length;
  const countF = failedResults.length;

  const subjectBreakdowns = subjects.map((sub) => {
    const subResults = relevantResults.filter((r) => r.subjectId === sub.id);
    const subTotal = subResults.length;
    const subPassed = subResults.filter((r) => r.grade !== 'F' && r.marksObtained >= 40).length;
    const subPassRate = subTotal > 0 ? Math.round((subPassed / subTotal) * 100) : 0;

    return {
      id: sub.id,
      code: sub.code,
      name: sub.name,
      total: subTotal,
      passed: subPassed,
      failed: subTotal - subPassed,
      passRate: subPassRate,
    };
  });

  const remedialList = failedResults.map((r) => {
    const student = students.find((s) => s.id === r.studentId);
    const subject = subjects.find((sub) => sub.id === r.subjectId);
    const studentClass = classes.find((c) => c.id === student?.classId);

    return {
      resultId: r.id,
      studentNo: student?.studentNo || 'N/A',
      studentName: student ? `${student.firstName} ${student.lastName}` : 'Unknown student',
      className: studentClass ? `${studentClass.grade} (${studentClass.section})` : 'Unassigned',
      subjectName: subject?.name || 'Subject',
      marksObtained: r.marksObtained,
    };
  });

  if (subView === 'allocations') return <AcademicModule />;
  if (subView === 'exams') return <ExaminationModule />;

  return (
    <div className="space-y-6 animate-fade-in">
      <PageHeader
        eyebrow={<Badge tone="brand">Results analytics</Badge>}
        title="Examination results analytics"
        description={isTeacher ? 'Grade 9-A classroom results breakdown.' : 'School-wide results breakdown across all registered marks.'}
        actions={
          <Tabs
            value={analyticsTab}
            onChange={setAnalyticsTab}
            options={[
              { id: 'spectrum', label: 'Grade spectrum', icon: Award },
              { id: 'subjects', label: 'Subject pass rates', icon: BookOpen },
              { id: 'remedial', label: 'Remedial list', icon: AlertTriangle, count: countF },
            ]}
          />
        }
      />

      {/* GRADE SPECTRUM */}
      {analyticsTab === 'spectrum' && (
        <div className="space-y-4">
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-4">
            <StatCard label="Overall pass rate" icon={Award} tone="brand" value={`${passRate}%`} />
            <StatCard label="Grade A · 75-100" icon={Award} tone="success" value={countA} />
            <StatCard label="Grade B · 65-74" icon={Award} tone="info" value={countB} />
            <StatCard label="Grade C · 55-64" icon={Award} tone="warning" value={countC} />
            <StatCard label="Grade F · below 40" icon={Award} tone="danger" value={countF} />
          </div>
          <Card className="text-sm text-ink-muted">
            Grade S (ordinary pass, 40-54): <strong className="text-ink font-semibold">{countS}</strong> students.
          </Card>
        </div>
      )}

      {/* SUBJECT PASS RATES */}
      {analyticsTab === 'subjects' && (
        <Card padded={false}>
          <div className="px-6 py-4 border-b border-border flex items-center justify-between">
            <span className="font-semibold text-sm text-ink">Subject-wise pass rates</span>
            <span className="text-sm text-ink-muted">{totalRegistered} registered marks</span>
          </div>
          <Table>
            <THead>
              <tr>
                <TH>Code</TH>
                <TH>Subject</TH>
                <TH className="text-center">Registered</TH>
                <TH className="text-center">Passed</TH>
                <TH className="text-center">Failed</TH>
                <TH className="text-right">Pass rate</TH>
              </tr>
            </THead>
            <TBody>
              {subjectBreakdowns.map((sub) => (
                <TR key={sub.id}>
                  <TD className="font-mono-data font-semibold">{sub.code}</TD>
                  <TD className="font-semibold text-ink">{sub.name}</TD>
                  <TD className="text-center">{sub.total}</TD>
                  <TD className="text-center font-semibold text-success">{sub.passed}</TD>
                  <TD className="text-center font-semibold text-danger">{sub.failed}</TD>
                  <TD className="text-right font-semibold">{sub.passRate}%</TD>
                </TR>
              ))}
            </TBody>
          </Table>
        </Card>
      )}

      {/* REMEDIAL LIST */}
      {analyticsTab === 'remedial' && (
        <Card padded={false}>
          <div className="px-6 py-4 border-b border-border">
            <span className="font-semibold text-sm text-ink">Remedial intervention list ({countF})</span>
            <p className="text-sm text-ink-muted mt-0.5">Students scoring Grade F who need academic support</p>
          </div>

          {remedialList.length === 0 ? (
            <EmptyState
              icon={CheckCircle2}
              title="No remedial action required"
              description="All registered students have achieved passing grades (A–S)."
            />
          ) : (
            <Table>
              <THead>
                <tr>
                  <TH>Student ID</TH>
                  <TH>Student name</TH>
                  <TH>Class</TH>
                  <TH>Subject</TH>
                  <TH className="text-center">Score</TH>
                  <TH className="text-right">Status</TH>
                </tr>
              </THead>
              <TBody>
                {remedialList.map((r) => (
                  <TR key={r.resultId}>
                    <TD className="font-mono-data font-semibold">{r.studentNo}</TD>
                    <TD className="font-semibold text-ink">{r.studentName}</TD>
                    <TD className="text-ink-muted">{r.className}</TD>
                    <TD className="text-ink-muted">{r.subjectName}</TD>
                    <TD className="text-center font-semibold text-danger">{r.marksObtained} / 100</TD>
                    <TD className="text-right">
                      <Badge tone="danger">Grade F</Badge>
                    </TD>
                  </TR>
                ))}
              </TBody>
            </Table>
          )}
        </Card>
      )}
    </div>
  );
};
