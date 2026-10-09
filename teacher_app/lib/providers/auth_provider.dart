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
    final assignedClassId = prefs.getString('assigned_class_id');
    final assignedGrade = prefs.getString('assigned_grade');
    final assignedSection = prefs.getString('assigned_section');

    if (email != null && name != null) {
      _currentUser = UserModel(
        id: id ?? 'tch-demo-01',
        email: email,
        fullName: name,
        role: 'teacher',
        assignedClassId: assignedClassId,
        assignedGrade: assignedGrade,
        assignedSection: assignedSection,
      );
      notifyListeners();
    }
  }

  Future<bool> login(String email, String password) async {
    _isLoading = true;
    _errorMessage = null;
    notifyListeners();

    try {
      final user = await _apiService.login(email, password);
      _currentUser = user;

      final prefs = await SharedPreferences.getInstance();
      await prefs.setString('teacher_email', user.email);
      await prefs.setString('teacher_name', user.fullName);
      await prefs.setString('teacher_id', user.id);
      if (user.assignedClassId != null) {
        await prefs.setString('assigned_class_id', user.assignedClassId!);
      }
      if (user.assignedGrade != null) {
        await prefs.setString('assigned_grade', user.assignedGrade!);
      }
      if (user.assignedSection != null) {
        await prefs.setString('assigned_section', user.assignedSection!);
      }

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
