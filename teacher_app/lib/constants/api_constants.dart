class ApiConstants {
  // Base URL for backend server (5000)
  // For Android Emulator use 10.0.2.2, for Physical Device / Windows Desktop use localhost or local IP
  static String baseUrl = 'http://localhost:5000/api';

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
