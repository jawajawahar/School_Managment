import 'package:flutter/material.dart';
import 'package:intl/intl.dart';
import '../models/student_model.dart';
import '../services/api_service.dart';

class AttendanceProvider extends ChangeNotifier {
  final ApiService _apiService = ApiService();

  List<Map<String, dynamic>> _classes = [];
  String? _selectedClassId;
  String _selectedDate = DateFormat('yyyy-MM-dd').format(DateTime.now());
  List<StudentModel> _students = [];

  bool _isLoadingClasses = false;
  bool _isLoadingStudents = false;
  bool _isSubmitting = false;
  String? _message;

  List<Map<String, dynamic>> get classes => _classes;
  String? get selectedClassId => _selectedClassId;
  String get selectedDate => _selectedDate;
  List<StudentModel> get students => _students;
  bool get isLoadingClasses => _isLoadingClasses;
  bool get isLoadingStudents => _isLoadingStudents;
  bool get isSubmitting => _isSubmitting;
  String? get message => _message;

  // Stats calculations
  int get totalStudents => _students.length;
  int get presentCount => _students.where((s) => s.attendanceStatus == 'present').length;
  int get absentCount => _students.where((s) => s.attendanceStatus == 'absent').length;
  int get lateCount => _students.where((s) => s.attendanceStatus == 'late').length;
  int get excusedCount => _students.where((s) => s.attendanceStatus == 'excused').length;

  double get attendancePercentage =>
      totalStudents > 0 ? ((presentCount + lateCount) / totalStudents) * 100 : 0.0;

  AttendanceProvider() {
    loadClasses();
  }

  Future<void> loadClasses() async {
    _isLoadingClasses = true;
    notifyListeners();

    _classes = await _apiService.fetchClasses();
    if (_classes.isNotEmpty && _selectedClassId == null) {
      final grade9Class = _classes.firstWhere(
        (c) => c['id'] == 'class-9a' || c['grade'].toString().toLowerCase().contains('9'),
        orElse: () => _classes.first,
      );
      _selectedClassId = grade9Class['id'];
      await loadStudentsForClass(_selectedClassId!);
    }
    _isLoadingClasses = false;
    notifyListeners();
  }

  Future<void> setClassId(String classId) async {
    _selectedClassId = classId;
    notifyListeners();
    await loadStudentsForClass(classId);
  }

  void setDate(DateTime date) {
    _selectedDate = DateFormat('yyyy-MM-dd').format(date);
    notifyListeners();
  }

  Future<void> loadStudentsForClass(String classId) async {
    _isLoadingStudents = true;
    notifyListeners();

    _students = await _apiService.fetchStudents(classId);
    _isLoadingStudents = false;
    notifyListeners();
  }

  void updateStudentStatus(String studentId, String status) {
    final index = _students.indexWhere((s) => s.id == studentId);
    if (index != -1) {
      _students[index].attendanceStatus = status;
      notifyListeners();
    }
  }

  void markAll(String status) {
    for (var s in _students) {
      s.attendanceStatus = status;
    }
    notifyListeners();
  }

  Future<bool> submitAttendance(String teacherName) async {
    if (_selectedClassId == null || _students.isEmpty) return false;

    _isSubmitting = true;
    _message = null;
    notifyListeners();

    final success = await _apiService.submitAttendance(
      date: _selectedDate,
      markedBy: teacherName,
      studentList: _students,
    );

    _isSubmitting = false;
    if (success) {
      _message = 'Attendance registered successfully!';
    } else {
      _message = 'Failed to record attendance. Saved locally.';
    }
    notifyListeners();
    return success;
  }
}
