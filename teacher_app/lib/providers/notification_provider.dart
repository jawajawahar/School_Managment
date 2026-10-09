import 'package:flutter/material.dart';
import '../models/announcement_model.dart';
import '../models/app_notification_model.dart';
import '../services/api_service.dart';

class NotificationProvider extends ChangeNotifier {
  final ApiService _apiService = ApiService();

  List<AnnouncementModel> _announcements = [];
  List<AppNotificationModel> _notifications = [];
  bool _isLoading = false;
  bool _isSending = false;
  String? _statusMessage;

  List<AnnouncementModel> get announcements => _announcements;
  List<AppNotificationModel> get notifications => _notifications;
  bool get isLoading => _isLoading;
  bool get isSending => _isSending;
  String? get statusMessage => _statusMessage;

  int get unreadCount => _notifications.where((n) => !n.isRead).length;
  int get emergencyCount => _announcements.where((a) => a.isEmergency).length;

  Future<void> fetchAnnouncements() async {
    _isLoading = true;
    notifyListeners();

    _announcements = await _apiService.fetchAnnouncements();
    _isLoading = false;
    notifyListeners();
  }

  Future<void> fetchTeacherNotifications({String? userId, String? teacherId, String? classId}) async {
    _isLoading = true;
    notifyListeners();

    _notifications = await _apiService.fetchNotifications(
      userId: userId,
      teacherId: teacherId,
      classId: classId,
    );
    _isLoading = false;
    notifyListeners();
  }

  Future<void> markAsRead(String notificationId) async {
    final notifIndex = _notifications.indexWhere((n) => n.id == notificationId);
    if (notifIndex != -1) {
      _notifications[notifIndex].isRead = true;
      notifyListeners();
      await _apiService.markNotificationAsRead(notificationId);
    }
  }

  Future<void> markAllAsRead(String recipientId) async {
    for (var n in _notifications) {
      n.isRead = true;
    }
    notifyListeners();
    await _apiService.markAllNotificationsAsRead(recipientId);
  }

  Future<bool> sendAlertToPrincipal({
    required String title,
    required String message,
    required String teacherName,
    String priority = 'high',
  }) async {
    _isSending = true;
    _statusMessage = null;
    notifyListeners();

    final success = await _apiService.sendNotificationToPrincipal(
      title: title,
      message: message,
      teacherName: teacherName,
      priority: priority,
    );

    _isSending = false;
    if (success) {
      _statusMessage = 'Emergency alert sent directly to Principal!';
    } else {
      _statusMessage = 'Could not send alert. Please try again.';
    }
    notifyListeners();
    return success;
  }
}
