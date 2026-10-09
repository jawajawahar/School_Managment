class AppNotificationModel {
  final String id;
  final String recipientId;
  final String title;
  final String message;
  final String channel;
  final String category; // 'timetable' | 'at_risk' | 'announcement' | 'general'
  bool isRead;
  final DateTime sentAt;

  AppNotificationModel({
    required this.id,
    required this.recipientId,
    required this.title,
    required this.message,
    required this.channel,
    required this.category,
    required this.isRead,
    required this.sentAt,
  });

  factory AppNotificationModel.fromJson(Map<String, dynamic> json) {
    return AppNotificationModel(
      id: json['id']?.toString() ?? '',
      recipientId: json['recipientId']?.toString() ?? json['recipient_id']?.toString() ?? 'all',
      title: json['title']?.toString() ?? 'Notification',
      message: json['message']?.toString() ?? '',
      channel: json['channel']?.toString() ?? 'in_app',
      category: json['category']?.toString() ?? 'general',
      isRead: json['isRead'] == true || json['is_read'] == true || json['status'] == 'read',
      sentAt: json['sentAt'] != null
          ? DateTime.tryParse(json['sentAt'].toString()) ?? DateTime.now()
          : (json['sent_at'] != null ? DateTime.tryParse(json['sent_at'].toString()) ?? DateTime.now() : DateTime.now()),
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'recipientId': recipientId,
      'title': title,
      'message': message,
      'channel': channel,
      'category': category,
      'isRead': isRead,
      'sentAt': sentAt.toIso8601String(),
    };
  }
}
