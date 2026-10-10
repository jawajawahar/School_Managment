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

  /// Days that count towards the rate: an excused absence is not held against the student.
  int get countedDays => present + absent + late;

  /// Share of counted days the student was in school, 0-100. Null with no data.
  double? get rate => countedDays == 0 ? null : (present + late) / countedDays * 100;

  /// Below the usual 80% exam-eligibility line, once there is enough data to judge.
  bool get isAtRisk => countedDays >= 3 && (rate ?? 100) < 80;
}

/// One subject mark from a term exam.
class ExamResultRecord {
  final String studentId;
  final String examId;
  final String examName;
  final String subjectName;
  final double marks;
  final String grade;

  ExamResultRecord({
    required this.studentId,
    required this.examId,
    required this.examName,
    required this.subjectName,
    required this.marks,
    required this.grade,
  });

  factory ExamResultRecord.fromJson(Map<String, dynamic> json) {
    return ExamResultRecord(
      studentId: json['studentId'] ?? json['student_id'] ?? '',
      examId: json['examId'] ?? json['exam_id'] ?? '',
      examName: json['examName'] ?? json['examId'] ?? 'Examination',
      subjectName: json['subjectName'] ?? json['subjectId'] ?? 'Subject',
      marks: double.tryParse('${json['marksObtained'] ?? json['marks_obtained'] ?? 0}') ?? 0,
      grade: json['grade'] ?? '',
    );
  }
}
