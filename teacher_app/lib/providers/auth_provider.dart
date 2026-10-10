import 'package:flutter/material.dart';
import 'package:shared_preferences/shared_preferences.dart';
import '../models/user_model.dart';
import '../services/api_service.dart';

class AuthProvider extends ChangeNotifier {
  final ApiService _apiService = ApiService();
  UserModel? _currentUser;
  bool _isLoading = false;
  String? _errorMessage;

  UserModel? get currentUser => _currentUser;
  bool get isLoading => _isLoading;
  bool get isAuthenticated => _currentUser != null;
  String? get errorMessage => _errorMessage;

  AuthProvider() {
    _loadSavedUser();
  }

  Future<void> _loadSavedUser() async {
    final prefs = await SharedPreferences.getInstance();
    final email = prefs.getString('teacher_email');
    final name = prefs.getString('teacher_name');
    final id = prefs.getString('teacher_id');
    final teacherRecordId = prefs.getString('teacher_record_id');
    final role = prefs.getString('teacher_role');
    final assignedClassId = prefs.getString('assigned_class_id');
    final assignedGrade = prefs.getString('assigned_grade');
    final assignedSection = prefs.getString('assigned_section');

    if (email != null && name != null) {
      _currentUser = UserModel(
        id: id ?? '',
        teacherId: teacherRecordId ?? id,
        email: email,
        fullName: name,
        role: role ?? 'teacher',
        assignedClassId: assignedClassId,
        assignedGrade: assignedGrade,
        assignedSection: assignedSection,
      );
      notifyListeners();
      await refreshProfile();
    }
  }

  Future<void> _persistUser(UserModel user) async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.setString('teacher_email', user.email);
    await prefs.setString('teacher_name', user.fullName);
    await prefs.setString('teacher_id', user.id);
    await prefs.setString('teacher_role', user.role);
    final values = {
      'teacher_record_id': user.teacherId,
      'assigned_class_id': user.assignedClassId,
      'assigned_grade': user.assignedGrade,
      'assigned_section': user.assignedSection,
    };
    for (final entry in values.entries) {
      if (entry.value != null && entry.value!.isNotEmpty) {
        await prefs.setString(entry.key, entry.value!);
      } else {
        // The Principal removed the assignment: do not keep showing the old class.
        await prefs.remove(entry.key);
      }
    }
  }

  /// Re-reads the class assignment from the server. The Principal can assign
  /// or change a teacher's class long after that teacher signed in.
  Future<void> refreshProfile() async {
    final current = _currentUser;
    if (current == null || current.id.isEmpty) return;
    final fresh = await _apiService.fetchProfile(current.id);
    if (fresh == null) return;
    _currentUser = current.withProfile(fresh);
    await _persistUser(_currentUser!);
    notifyListeners();
  }

  Future<bool> login(String email, String password) async {
    _isLoading = true;
    _errorMessage = null;
    notifyListeners();

    try {
      final user = await _apiService.login(email, password);
      _currentUser = user;

      await _persistUser(user);

      _isLoading = false;
      notifyListeners();
      return true;
    } catch (e) {
      _errorMessage = e.toString().replaceAll('Exception: ', '');
      _isLoading = false;
      notifyListeners();
      return false;
    }
  }

  Future<void> logout() async {
    _currentUser = null;
    final prefs = await SharedPreferences.getInstance();
    await prefs.clear();
    notifyListeners();
  }
}
