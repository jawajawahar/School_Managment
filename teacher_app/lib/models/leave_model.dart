class LeaveModel {
  final String id;
  final String applicantName;
  final String role;
  final String type; // 'Sick Leave', 'Casual Leave', 'Duty Leave', 'Half Day'
  final String startDate;
  final String endDate;
  final String reason;
  final String status; // 'pending', 'approved', 'rejected'

  LeaveModel({
    required this.id,
    required this.applicantName,
    required this.role,
    required this.type,
    required this.startDate,
    required this.endDate,
    required this.reason,
    required this.status,
  });

  factory LeaveModel.fromJson(Map<String, dynamic> json) {
    return LeaveModel(
      id: json['id'] ?? '',
      applicantName: json['applicantName'] ?? json['applicant_name'] ?? '',
      role: json['role'] ?? 'teacher',
      type: json['type'] ?? 'Casual Leave',
      startDate: json['startDate'] ?? json['start_date'] ?? '',
      endDate: json['endDate'] ?? json['end_date'] ?? '',
      reason: json['reason'] ?? '',
      status: json['status'] ?? 'pending',
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'applicantName': applicantName,
      'role': role,
      'type': type,
      'startDate': startDate,
      'endDate': endDate,
      'reason': reason,
      'status': status,
    };
  }
}
