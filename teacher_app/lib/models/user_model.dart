class UserModel {
  final String id;
  final String? teacherId;
  final String email;
  final String fullName;
  final String role;
  final String? phone;
  final String? schoolId;
  final String? token;
  final String? assignedClassId;
  final String? assignedGrade;
  final String? assignedSection;

  UserModel({
    required this.id,
    this.teacherId,
    required this.email,
    required this.fullName,
    required this.role,
    this.phone,
    this.schoolId,
    this.token,
    this.assignedClassId,
    this.assignedGrade,
    this.assignedSection,
  });

  String get assignedClassName {
    if (assignedGrade != null && assignedSection != null) {
      return '$assignedGrade ($assignedSection)';
    } else if (assignedGrade != null) {
      return assignedGrade!;
    }
    return 'No class assigned';
  }

  bool get hasAssignedClass => assignedClassId != null && assignedClassId!.isNotEmpty;

  /// Same account with the class assignment the server currently reports.
  UserModel withProfile(UserModel fresh) {
    return UserModel(
      id: id,
      teacherId: fresh.teacherId ?? teacherId,
      email: email,
      fullName: fresh.fullName,
      role: fresh.role,
      phone: fresh.phone ?? phone,
      schoolId: schoolId,
      token: token,
      assignedClassId: fresh.assignedClassId,
      assignedGrade: fresh.assignedGrade,
      assignedSection: fresh.assignedSection,
    );
  }

  factory UserModel.fromJson(Map<String, dynamic> json, {String? token}) {
    return UserModel(
      id: json['id'] ?? json['userId'] ?? '',
      teacherId: json['teacherId'] ?? json['teacher_id'] ?? json['id'],
      email: json['email'] ?? '',
      fullName: json['fullName'] ?? json['full_name'] ?? 'Teacher',
      role: json['role'] ?? 'teacher',
      phone: json['phone'],
      schoolId: json['schoolId'] ?? json['school_id'],
      token: token,
      assignedClassId: json['assignedClassId'],
      assignedGrade: json['assignedGrade'],
      assignedSection: json['assignedSection'],
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'teacherId': teacherId,
      'email': email,
      'fullName': fullName,
      'role': role,
      'phone': phone,
      'schoolId': schoolId,
      'assignedClassId': assignedClassId,
      'assignedGrade': assignedGrade,
      'assignedSection': assignedSection,
    };
  }
}
