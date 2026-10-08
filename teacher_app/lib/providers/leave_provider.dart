import 'package:flutter/material.dart';
import '../models/leave_model.dart';
import '../services/api_service.dart';

class LeaveProvider extends ChangeNotifier {
  final ApiService _apiService = ApiService();

  List<LeaveModel> _leaveRequests = [];
  bool _isLoading = false;
  bool _isSubmitting = false;
  String? _message;

  List<LeaveModel> get leaveRequests => _leaveRequests;
  bool get isLoading => _isLoading;
  bool get isSubmitting => _isSubmitting;
  String? get message => _message;

  // Stats
  int get pendingCount => _leaveRequests.where((l) => l.status == 'pending').length;
  int get approvedCount => _leaveRequests.where((l) => l.status == 'approved').length;
  int get rejectedCount => _leaveRequests.where((l) => l.status == 'rejected').length;

  Future<void> fetchLeaveRequests(String teacherName) async {
    _isLoading = true;
    notifyListeners();

    _leaveRequests = await _apiService.fetchLeaveRequests(teacherName);
    _isLoading = false;
    notifyListeners();
  }

  Future<bool> applyLeave({
    required String teacherName,
    required String type,
    required String startDate,
    required String endDate,
    required String reason,
  }) async {
    _isSubmitting = true;
    _message = null;
    notifyListeners();

    try {
      final newLeave = await _apiService.submitLeaveRequest(
        applicantName: teacherName,
        type: type,
        startDate: startDate,
        endDate: endDate,
        reason: reason,
      );

      _leaveRequests.insert(0, newLeave);
      _isSubmitting = false;
      _message = 'Leave request submitted successfully to Principal!';
      notifyListeners();
      return true;
    } catch (e) {
      _isSubmitting = false;
      _message = 'Submission failed: ${e.toString()}';
      notifyListeners();
      return false;
    }
  }
}
