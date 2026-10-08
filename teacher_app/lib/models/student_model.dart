class StudentModel {
  final String id;
  final String studentNo;
  final String firstName;
  final String lastName;
  final String classId;
  final String status;
  String attendanceStatus; // 'present', 'absent', 'late', 'excused'
  String? remarks;

  StudentModel({
    required this.id,
    required this.studentNo,
    required this.firstName,
    required this.lastName,
    required this.classId,
    this.status = 'active',
    this.attendanceStatus = 'present',
    this.remarks,
  });

  String get fullName => '$firstName $lastName'.trim();

  factory StudentModel.fromJson(Map<String, dynamic> json) {
    return StudentModel(
      id: json['id'] ?? '',
      studentNo: json['studentNo'] ?? json['student_no'] ?? '',
      firstName: json['firstName'] ?? json['first_name'] ?? 'Student',
      lastName: json['lastName'] ?? json['last_name'] ?? '',
      classId: json['classId'] ?? json['class_id'] ?? '',
      status: json['status'] ?? 'active',
      attendanceStatus: json['attendanceStatus'] ?? 'present',
      remarks: json['remarks'],
    );
  }
}
