import 'package:shared_preferences/shared_preferences.dart';

class ApiConstants {
  static String? _customHost;

  static Future<void> loadCustomHost() async {
    final prefs = await SharedPreferences.getInstance();
    _customHost = prefs.getString('custom_server_ip');
  }

  static Future<void> setCustomHost(String ipOrUrl) async {
    final prefs = await SharedPreferences.getInstance();
    var clean = ipOrUrl.trim();
    if (clean.isNotEmpty && !clean.startsWith('http://') && !clean.startsWith('https://')) {
      clean = 'http://$clean';
    }
    if (clean.isNotEmpty && !clean.endsWith('/api')) {
      clean = '$clean/api';
    }
    _customHost = clean;
    await prefs.setString('custom_server_ip', clean);
  }

  static String get baseUrl {
    if (_customHost != null && _customHost!.isNotEmpty) {
      return _customHost!;
    }
    return 'https://school-managment-jk78.onrender.com/api';
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
