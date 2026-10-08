class AnnouncementModel {
  final String id;
  final String title;
  final String body;
  final String createdBy;
  final String createdAt;
  final String audienceRole;
  final bool isEmergency;

  AnnouncementModel({
    required this.id,
    required this.title,
    required this.body,
    required this.createdBy,
    required this.createdAt,
    this.audienceRole = 'all',
    this.isEmergency = false,
  });

  factory AnnouncementModel.fromJson(Map<String, dynamic> json) {
    return AnnouncementModel(
      id: json['id'] ?? '',
      title: json['title'] ?? '',
      body: json['body'] ?? '',
      createdBy: json['createdBy'] ?? json['created_by'] ?? 'Principal',
      createdAt: json['createdAt'] ?? json['created_at'] ?? DateTime.now().toString(),
      audienceRole: json['audienceRole'] ?? json['audience_role'] ?? 'all',
      isEmergency: json['isEmergency'] ?? json['is_emergency'] ?? false,
    );
  }
}
