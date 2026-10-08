import { Subject } from '../types';

/**
 * The 9 regular subjects studied by every student below Grade 10 (i.e. not
 * yet in the G.C.E. O/L basket system). Shared by the subject-teacher
 * allocation table and the below-Grade-10 report card subject list so both
 * always agree on what "9 regular subjects" means.
 */
export const CORE_SUBJECT_IDS = [
  'subj-math',
  'subj-sci',
  'subj-eng',
  'subj-tam',
  'subj-isl',
  'subj-his',
  'subj-ict',
  'subj-geo',
  'subj-civ',
];

/** The 6 compulsory subjects within the Grade 10-11 G.C.E. O/L 9-subject rule. */
export const OL_COMPULSORY_SUBJECT_IDS = ['subj-math', 'subj-sci', 'subj-eng', 'subj-tam', 'subj-isl', 'subj-his'];

export function isOLGrade(grade: string): boolean {
  const match = grade.match(/\d+/);
  const num = match ? parseInt(match[0], 10) : 0;
  return num >= 10;
}

export interface ReportCardSlot {
  /** Stable React key — a subject id when resolved, else a fixed basket key. */
  key: string;
  /** Subject name, or a description of the unfilled slot. */
  label: string;
  subject: Subject | null;
}

/**
 * The exact subject list a student's report card should show, driven by
 * grade:
 *  - Grade 10-11 (O/L cohort): 6 compulsory subjects + 1 subject per basket
 *    category (I/II/III). Since the app has no field recording which basket
 *    subject a student chose, the choice is inferred from which subject in
 *    that category the student actually has an exam result for. If none has
 *    been marked yet, the slot is returned with `subject: null` so the report
 *    still shows all 9 rows rather than silently omitting the elective.
 *  - Below Grade 10: the fixed 9 core subjects (CORE_SUBJECT_IDS).
 */
export function getReportCardSlots(
  grade: string | undefined,
  studentId: string,
  subjects: Subject[],
  examResults: { studentId: string; subjectId: string }[]
): ReportCardSlot[] {
  const byId = (id: string) => subjects.find((s) => s.id === id) || null;

  if (!isOLGrade(grade || '')) {
    return CORE_SUBJECT_IDS.map((id) => {
      const subject = byId(id);
      return { key: id, label: subject?.name || 'Core subject', subject };
    });
  }

  const compulsory: ReportCardSlot[] = OL_COMPULSORY_SUBJECT_IDS.map((id) => {
    const subject = byId(id);
    return { key: id, label: subject?.name || 'Compulsory subject', subject };
  });

  const basketDefs = [
    { category: 'category_1' as const, key: 'basket-1', label: 'Category I elective' },
    { category: 'category_2' as const, key: 'basket-2', label: 'Category II elective' },
    { category: 'category_3' as const, key: 'basket-3', label: 'Category III elective' },
  ];

  const basket: ReportCardSlot[] = basketDefs.map(({ category, key, label }) => {
    const options = subjects.filter((s) => s.category === category);
    const chosen = options.find((s) => examResults.some((r) => r.studentId === studentId && r.subjectId === s.id));
    return { key, label: chosen ? chosen.name : `${label} — not yet selected`, subject: chosen || null };
  });

  return [...compulsory, ...basket];
}

export function getSubjectCategoryGroup(category?: string, id?: string): string {
  if (category === 'compulsory' || (id && OL_COMPULSORY_SUBJECT_IDS.includes(id))) {
    return '📌 Compulsory Core Subjects';
  }
  if (category === 'category_1') {
    return '📘 Category I / Group 1 Electives';
  }
  if (category === 'category_2') {
    return '📙 Category II / Group 2 Electives';
  }
  if (category === 'category_3') {
    return '📗 Category III / Group 3 Electives';
  }
  return '📚 General & Additional Subjects';
}

export function getCategorizedSubjectOptions(
  subjects: Subject[],
  formatter?: (s: Subject) => string
): { value: string; label: string; group: string }[] {
  const categoryPriority: Record<string, number> = {
    '📌 Compulsory Core Subjects': 1,
    '📘 Category I / Group 1 Electives': 2,
    '📙 Category II / Group 2 Electives': 3,
    '📗 Category III / Group 3 Electives': 4,
    '📚 General & Additional Subjects': 5,
  };

  const formatted = subjects.map((s) => {
    const group = getSubjectCategoryGroup(s.category, s.id);
    const label = formatter ? formatter(s) : `${s.name} (${s.code})`;
    return {
      value: s.id,
      label,
      group,
    };
  });

  return formatted.sort((a, b) => {
    const pA = categoryPriority[a.group] || 99;
    const pB = categoryPriority[b.group] || 99;
    if (pA !== pB) return pA - pB;
    return a.label.localeCompare(b.label);
  });
}

export function isStudentEnrolledInSubject(
  student: { id?: string; enrolledSubjectIds?: string[] },
  subjectId: string,
  subjects: Subject[]
): boolean {
  const subject = subjects.find((s) => s.id === subjectId);
  // Compulsory core subjects are enrolled by default for all students
  if (subject?.category === 'compulsory' || OL_COMPULSORY_SUBJECT_IDS.includes(subjectId)) {
    return true;
  }
  // If student has an explicit enrolledSubjectIds array, check if subjectId is in it
  if (student.enrolledSubjectIds && Array.isArray(student.enrolledSubjectIds) && student.enrolledSubjectIds.length > 0) {
    return student.enrolledSubjectIds.includes(subjectId);
  }
  // Default fallback if no enrolledSubjectIds specified
  return true;
}
