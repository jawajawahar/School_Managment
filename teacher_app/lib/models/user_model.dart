class UserModel {
  final String id;
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
    return 'Grade 9-A';
  }

  factory UserModel.fromJson(Map<String, dynamic> json, {String? token}) {
    return UserModel(
      id: json['id'] ?? json['userId'] ?? '',
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
