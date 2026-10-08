import 'package:flutter/foundation.dart';

class ApiConstants {
  // Dynamic Host Detection:
  // Android Emulator uses 10.0.2.2 to access host machine localhost:5000
  // iOS / Windows Desktop / Web uses localhost or network IP
  static String get baseUrl {
    if (defaultTargetPlatform == TargetPlatform.android) {
      return 'http://10.0.2.2:5000/api';
    }
    return 'http://localhost:5000/api';
  }

  // Auth
  static const String loginEndpoint = '/auth/login';

  // Core Features
  static const String attendanceEndpoint = '/attendance';
  static const String leaveRequestsEndpoint = '/leave-requests';
  static const String announcementsEndpoint = '/announcements';
  static const String notificationsEndpoint = '/notifications';
  static const String classesEndpoint = '/classes';
  static const String studentsEndpoint = '/students';
  static const String teachersEndpoint = '/teachers';
  static const String timetableEndpoint = '/timetable';
}
