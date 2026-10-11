import 'student_model.dart';

/// One student's attendance mark for one day.
class AttendanceRecord {
  final String studentId;
  final String studentNo;
  final String date; // yyyy-MM-dd
  final String status; // present | absent | late | excused
  final String remarks;

  AttendanceRecord({
    required this.studentId,
    required this.studentNo,
    required this.date,
    required this.status,
    this.remarks = '',
  });

  factory AttendanceRecord.fromJson(Map<String, dynamic> json) {
    return AttendanceRecord(
      studentId: json['studentId'] ?? json['student_id'] ?? '',
      studentNo: json['studentNo'] ?? json['student_no'] ?? '',
      date: (json['date'] ?? '').toString().split('T').first,
      status: (json['status'] ?? '').toString().toLowerCase(),
      remarks: json['remarks'] ?? '',
    );
  }

  bool belongsTo(StudentModel student) => studentId == student.id || (studentNo.isNotEmpty && studentNo == student.studentNo);
}

/// Attendance totals for one student or one day.
class AttendanceSummary {
  final int present;
  final int absent;
  final int late;
  final int excused;

  const AttendanceSummary({this.present = 0, this.absent = 0, this.late = 0, this.excused = 0});

  factory AttendanceSummary.of(Iterable<AttendanceRecord> records) {
    var present = 0, absent = 0, late = 0, excused = 0;
    for (final record in records) {
      switch (record.status) {
        case 'present':
          present++;
        case 'absent':
          absent++;
        case 'late':
          late++;
        case 'excused':
          excused++;
      }
    }
    return AttendanceSummary(present: present, absent: absent, late: late, excused: excused);
  }

  int get total => present + absent + late + excused;

  /// Share of marked days the student was in school, 0-100. Null with no data.
  /// Same formula as the web portal's reports, so both flag the same students.
  double? get rate => total == 0 ? null : (present + late) / total * 100;

  /// Below the 80% attendance benchmark.
  bool get isAtRisk => (rate ?? 100) < 80;
}

/// One subject mark from a term exam.
class ExamResultRecord {
  static const double passMark = 40;

  final String studentId;
  final String examId;
  final String examName;
  final String examTerm;
  final int? academicYear;
  final String subjectId;
  final String subjectName;
  final String subjectCategory;
  final double marks;
  final String grade;

  ExamResultRecord({
    required this.studentId,
    required this.examId,
    required this.examName,
    required this.subjectName,
    required this.marks,
    required this.grade,
    this.examTerm = '',
    this.academicYear,
    this.subjectId = '',
    this.subjectCategory = '',
  });

  bool get isFailing => grade.toUpperCase() == 'F' || marks < passMark;

  String get marksLabel => marks.toStringAsFixed(marks % 1 == 0 ? 0 : 1);

  /// Compulsory subjects count for everyone; an optional subject only counts
  /// for a student who actually takes it.
  bool appliesTo(StudentModel student) {
    if (subjectCategory == 'compulsory') return true;
    if (student.enrolledSubjectIds.isEmpty) return true;
    return student.enrolledSubjectIds.contains(subjectId);
  }

  factory ExamResultRecord.fromJson(Map<String, dynamic> json) {
    return ExamResultRecord(
      studentId: json['studentId'] ?? json['student_id'] ?? '',
      examId: json['examId'] ?? json['exam_id'] ?? '',
      examName: json['examName'] ?? json['examId'] ?? 'Examination',
      examTerm: json['examTerm'] ?? '',
      academicYear: int.tryParse('${json['academicYear'] ?? ''}'),
      subjectId: json['subjectId'] ?? json['subject_id'] ?? '',
      subjectCategory: json['subjectCategory'] ?? '',
      subjectName: json['subjectName'] ?? json['subjectId'] ?? 'Subject',
      marks: double.tryParse('${json['marksObtained'] ?? json['marks_obtained'] ?? 0}') ?? 0,
      grade: json['grade'] ?? '',
    );
  }
}

/// One student's place in a welfare scheme (meals, uniforms, scholarships...).
class WelfareEnrolmentRecord {
  final String id;
  final String studentId;
  final String studentName;
  final String studentNo;
  final String programId;
  final String programName;
  final String status; // enrolled | disbursed | cancelled
  final String disbursedAt;
  final String remarks;

  WelfareEnrolmentRecord({
    required this.id,
    required this.studentId,
    required this.programId,
    required this.status,
    this.studentName = '',
    this.studentNo = '',
    this.programName = '',
    this.disbursedAt = '',
    this.remarks = '',
  });

  factory WelfareEnrolmentRecord.fromJson(Map<String, dynamic> json) {
    return WelfareEnrolmentRecord(
      id: json['id'] ?? '',
      studentId: json['studentId'] ?? '',
      programId: json['programId'] ?? '',
      status: (json['status'] ?? 'enrolled').toString().toLowerCase(),
      studentName: (json['studentName'] ?? '').toString().trim(),
      studentNo: json['studentNo'] ?? '',
      programName: json['programName'] ?? '',
      disbursedAt: json['disbursedAt'] ?? '',
      remarks: json['remarks'] ?? '',
    );
  }

  bool get isDisbursed => status == 'disbursed';
  bool get isCancelled => status == 'cancelled';
}
