import 'package:flutter/material.dart';
import 'package:intl/intl.dart';
import '../models/student_model.dart';
import '../models/user_model.dart';
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

  String get selectedClassName {
    if (_selectedClassId == null || _classes.isEmpty) return 'Class Register';
    final found = _classes.firstWhere(
      (c) => c['id'] == _selectedClassId,
      orElse: () => _classes.first,
    );
    final grade = found['grade'] ?? '';
    final section = found['section'] ?? '';
    if (grade.toString().isNotEmpty && section.toString().isNotEmpty) {
      return '$grade ($section)';
    } else if (grade.toString().isNotEmpty) {
      return '$grade';
    }
    return found['name'] ?? _selectedClassId!;
  }

  AttendanceProvider() {
    loadClasses();
  }

  /// Get allowed classes for a user.
  /// Standard class teachers are strictly limited to their assigned class.
  /// Admin/Principal roles can access all school classes.
  List<Map<String, dynamic>> getClassesForUser(UserModel? user) {
    if (user == null) return _classes;
    final isTeacher = user.role != 'admin' && user.role != 'principal' && user.role != 'admin_staff';
    final targetClassId = user.assignedClassId;

    if (isTeacher && targetClassId != null && targetClassId.isNotEmpty) {
      final matching = _classes.where((c) {
        final cId = c['id'].toString();
        return cId == targetClassId || cId.toLowerCase() == targetClassId.toLowerCase();
      }).toList();

      if (matching.isNotEmpty) return matching;

      return [
        {
          'id': targetClassId,
          'grade': user.assignedGrade ?? 'Assigned',
          'section': user.assignedSection ?? 'Class',
        }
      ];
    }
    return _classes;
  }

  Future<void> loadClasses({String? preferredClassId, String? userRole, UserModel? user}) async {
    _isLoadingClasses = true;
    notifyListeners();

    final allFetchedClasses = await _apiService.fetchClasses();
    final isTeacher = userRole != 'admin' && userRole != 'principal' && userRole != 'admin_staff';
    final targetClassId = preferredClassId ?? user?.assignedClassId;

    if (allFetchedClasses.isNotEmpty) {
      if (isTeacher && targetClassId != null && targetClassId.isNotEmpty) {
        final matching = allFetchedClasses.where((c) {
          final cId = c['id'].toString();
          return cId == targetClassId || cId.toLowerCase() == targetClassId.toLowerCase();
        }).toList();

        if (matching.isNotEmpty) {
          _classes = matching;
        } else {
          _classes = [
            {
              'id': targetClassId,
              'grade': user?.assignedGrade ?? 'Assigned',
              'section': user?.assignedSection ?? 'Class',
            }
          ];
        }
        _selectedClassId = targetClassId;
      } else {
        _classes = allFetchedClasses;
        if (targetClassId != null && _classes.any((c) => c['id'] == targetClassId)) {
          _selectedClassId = targetClassId;
        } else if (_selectedClassId == null || !_classes.any((c) => c['id'] == _selectedClassId)) {
          _selectedClassId = _classes.first['id'];
        }
      }
    } else if (targetClassId != null && targetClassId.isNotEmpty) {
      _classes = [
        {
          'id': targetClassId,
          'grade': user?.assignedGrade ?? 'Grade 10',
          'section': user?.assignedSection ?? 'A',
        }
      ];
      _selectedClassId = targetClassId;
    }

    if (_selectedClassId != null) {
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
    if (_selectedClassId != null) {
      loadStudentsForClass(_selectedClassId!);
    }
  }

  Future<void> loadStudentsForClass(String classId) async {
    _isLoadingStudents = true;
    notifyListeners();

    _students = await _apiService.fetchStudents(classId, date: _selectedDate);
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
