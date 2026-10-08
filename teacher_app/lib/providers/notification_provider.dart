import 'package:flutter/material.dart';
import '../models/announcement_model.dart';
import '../services/api_service.dart';

class NotificationProvider extends ChangeNotifier {
  final ApiService _apiService = ApiService();

  List<AnnouncementModel> _announcements = [];
  bool _isLoading = false;
  bool _isSending = false;
  String? _statusMessage;

  List<AnnouncementModel> get announcements => _announcements;
  bool get isLoading => _isLoading;
  bool get isSending => _isSending;
  String? get statusMessage => _statusMessage;

  int get emergencyCount => _announcements.where((a) => a.isEmergency).length;

  Future<void> fetchAnnouncements() async {
    _isLoading = true;
    notifyListeners();

    _announcements = await _apiService.fetchAnnouncements();
    _isLoading = false;
    notifyListeners();
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
