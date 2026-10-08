class UserModel {
  final String id;
  final String email;
  final String fullName;
  final String role;
  final String? phone;
  final String? schoolId;
  final String? token;

  UserModel({
    required this.id,
    required this.email,
    required this.fullName,
    required this.role,
    this.phone,
    this.schoolId,
    this.token,
  });

  factory UserModel.fromJson(Map<String, dynamic> json, {String? token}) {
    return UserModel(
      id: json['id'] ?? json['userId'] ?? '',
      email: json['email'] ?? '',
      fullName: json['fullName'] ?? json['full_name'] ?? 'Teacher',
      role: json['role'] ?? 'teacher',
      phone: json['phone'],
      schoolId: json['schoolId'] ?? json['school_id'],
      token: token,
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
    };
  }
}
