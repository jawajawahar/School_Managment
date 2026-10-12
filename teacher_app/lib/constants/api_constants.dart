import 'package:shared_preferences/shared_preferences.dart';

class ApiConstants {
  static const String liveCloudUrl = 'https://school-managment-jk78.onrender.com/api';
  static String? _customHost;

  static Future<void> loadCustomHost() async {
    final prefs = await SharedPreferences.getInstance();
    final saved = prefs.getString('custom_server_ip');
    // If the saved host was the temporary hotspot IP, clear it so it defaults to live Render backend
    if (saved != null && (saved.contains('172.20.10.3') || saved.contains('localhost:5000'))) {
      await prefs.remove('custom_server_ip');
      _customHost = null;
    } else {
      _customHost = saved;
    }
  }

  static Future<void> resetToCloud() async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.remove('custom_server_ip');
    _customHost = null;
  }

  static Future<void> setCustomHost(String ipOrUrl) async {
    final prefs = await SharedPreferences.getInstance();
    var clean = ipOrUrl.trim();
    if (clean.isEmpty || clean == liveCloudUrl) {
      await resetToCloud();
      return;
    }
    if (!clean.startsWith('http://') && !clean.startsWith('https://')) {
      clean = 'http://$clean';
    }
    if (!clean.endsWith('/api')) {
      clean = '$clean/api';
    }
    _customHost = clean;
    await prefs.setString('custom_server_ip', clean);
  }

  static String get baseUrl {
    if (_customHost != null && _customHost!.isNotEmpty) {
      return _customHost!;
    }
    return liveCloudUrl;
  }

  // Auth
  static const String loginEndpoint = '/auth/login';
  static const String profileEndpoint = '/auth/profile';

  // Core Features
  static const String attendanceEndpoint = '/attendance';
  static const String leaveRequestsEndpoint = '/leave-requests';
  static const String announcementsEndpoint = '/announcements';
  static const String notificationsEndpoint = '/notifications';
  static const String classesEndpoint = '/classes';
  static const String studentsEndpoint = '/students';
  static const String teachersEndpoint = '/teachers';
  static const String timetableEndpoint = '/timetable';
  static const String examResultsEndpoint = '/exam-results';
  static const String welfareEnrolmentsEndpoint = '/welfare-enrolments';
  static const String auditLogsEndpoint = '/audit-logs';
}
