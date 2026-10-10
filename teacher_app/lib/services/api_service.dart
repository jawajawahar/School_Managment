import 'dart:convert';
import 'package:flutter/foundation.dart';
import 'package:http/http.dart' as http;
import '../constants/api_constants.dart';
import '../models/user_model.dart';
import '../models/student_model.dart';
import '../models/leave_model.dart';
import '../models/announcement_model.dart';
import '../models/timetable_model.dart';
import '../models/app_notification_model.dart';

class ApiService {
  final http.Client client = http.Client();

  // Helper headers
  Map<String, String> get headers => {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      };

  // 1. Teacher Authentication Login
  Future<UserModel> login(String email, String password) async {
    final url = Uri.parse('${ApiConstants.baseUrl}${ApiConstants.loginEndpoint}');
    final http.Response response;
    try {
      // The hosted server can take up to a minute to wake after being idle.
      response = await client
          .post(url, headers: headers, body: jsonEncode({'email': email, 'password': password}))
          .timeout(const Duration(seconds: 75));
    } catch (_) {
      throw Exception('Cannot reach the school server. Check your internet connection and try again.');
    }

    if (response.statusCode == 200) {
      final data = jsonDecode(response.body);
      return UserModel.fromJson(data['user'], token: data['token']);
    }
    String message = 'Login failed. Please check your credentials.';
    try {
      message = jsonDecode(response.body)['error'] ?? message;
    } catch (_) {}
    throw Exception(message);
  }

  // 1b. Refresh the signed-in teacher's class assignment (null when the server is unreachable)
  Future<UserModel?> fetchProfile(String userId) async {
    final url = Uri.parse('${ApiConstants.baseUrl}${ApiConstants.profileEndpoint}/$userId');
    try {
      final response = await client.get(url, headers: headers);
      if (response.statusCode == 200) {
        return UserModel.fromJson(jsonDecode(response.body)['user']);
      }
    } catch (e) {
      debugPrint('API Error fetching profile: $e');
    }
    return null;
  }

  // 2. Fetch Classes List
  Future<List<Map<String, dynamic>>> fetchClasses() async {
    final url = Uri.parse('${ApiConstants.baseUrl}${ApiConstants.classesEndpoint}');
    try {
      final response = await client.get(url, headers: headers);
      if (response.statusCode == 200) {
        final List list = jsonDecode(response.body);
        return list.cast<Map<String, dynamic>>();
      }
    } catch (e) {
      debugPrint('API Error fetching classes: $e');
    }
    return [];
  }

  // 3. Fetch Students for Class (with optional date attendance status)
  Future<List<StudentModel>> fetchStudents(String classId, {String? date}) async {
    final endpoint = classId.isNotEmpty
        ? '${ApiConstants.baseUrl}${ApiConstants.studentsEndpoint}?classId=$classId'
        : '${ApiConstants.baseUrl}${ApiConstants.studentsEndpoint}';
    final url = Uri.parse(endpoint);
    try {
      final response = await client.get(url, headers: headers);
      if (response.statusCode == 200) {
        final List list = jsonDecode(response.body);
        if (list.isNotEmpty) {
          final students = list.map((s) => StudentModel.fromJson(s)).toList();

          // Fetch existing attendance for date if provided
          if (date != null && date.isNotEmpty) {
            try {
              final attUrl = Uri.parse('${ApiConstants.baseUrl}${ApiConstants.attendanceEndpoint}?date=$date&classId=$classId');
              final attRes = await client.get(attUrl, headers: headers);
              if (attRes.statusCode == 200) {
                final List attList = jsonDecode(attRes.body);
                if (attList.isNotEmpty) {
                  final Map<String, String> attMap = {};
                  for (var item in attList) {
                    final sId = item['studentId'] ?? item['studentNo'];
                    if (sId != null && item['status'] != null) {
                      attMap[sId.toString()] = item['status'].toString();
                    }
                  }
                  for (var student in students) {
                    if (attMap.containsKey(student.id)) {
                      student.attendanceStatus = attMap[student.id]!;
                    } else if (attMap.containsKey(student.studentNo)) {
                      student.attendanceStatus = attMap[student.studentNo]!;
                    } else {
                      student.attendanceStatus = 'unmarked';
                    }
                  }
                } else {
                  for (var student in students) {
                    student.attendanceStatus = 'unmarked';
                  }
                }
              } else {
                for (var student in students) {
                  student.attendanceStatus = 'unmarked';
                }
              }
            } catch (e) {
              debugPrint('Attendance fetch error: $e');
            }
          }

          return students;
        }
      }
    } catch (e) {
      debugPrint('API Error fetching students: $e');
    }

    // Return empty list if server is unreachable or no students found in PostgreSQL
    return [];
  }

  // 4. Batch Submit Daily Attendance Register
  /// Returns true only when the server accepted every student's record.
  Future<bool> submitAttendance({
    required String date,
    required String markedBy,
    required List<StudentModel> studentList,
  }) async {
    final url = Uri.parse('${ApiConstants.baseUrl}${ApiConstants.attendanceEndpoint}');
    try {
      for (var student in studentList) {
        final response = await client.post(
          url,
          headers: headers,
          body: jsonEncode({
            'studentId': student.id,
            'studentNo': student.studentNo,
            'date': date,
            'status': student.attendanceStatus,
            'markedBy': markedBy,
            'remarks': student.remarks ?? '',
          }),
        );
        if (response.statusCode != 200 && response.statusCode != 201) {
          debugPrint('Attendance rejected for ${student.studentNo}: ${response.body}');
          return false;
        }
      }
      return true;
    } catch (e) {
      debugPrint('API Error submitting attendance: $e');
      return false;
    }
  }

  // 5. Fetch this teacher's own Leave Requests
  Future<List<LeaveModel>> fetchLeaveRequests(String teacherName) async {
    final url = Uri.parse('${ApiConstants.baseUrl}${ApiConstants.leaveRequestsEndpoint}');
    try {
      final response = await client.get(url, headers: headers);
      if (response.statusCode == 200) {
        final List list = jsonDecode(response.body);
        final mine = teacherName.trim().toLowerCase();
        return list
            .map((item) => LeaveModel.fromJson(item))
            .where((leave) => leave.applicantName.trim().toLowerCase() == mine)
            .toList();
      }
    } catch (e) {
      debugPrint('API Error fetching leave requests: $e');
    }
    return [];
  }

  // 6. Submit Leave Request
  /// Throws when the server did not record the request.
  Future<LeaveModel> submitLeaveRequest({
    required String applicantName,
    required String type,
    required String startDate,
    required String endDate,
    required String reason,
  }) async {
    final url = Uri.parse('${ApiConstants.baseUrl}${ApiConstants.leaveRequestsEndpoint}');
    final payload = {
      'applicantName': applicantName,
      'role': 'teacher',
      'type': type,
      'startDate': startDate,
      'endDate': endDate,
      'reason': reason,
    };

    final http.Response response;
    try {
      response = await client.post(url, headers: headers, body: jsonEncode(payload));
    } catch (_) {
      throw Exception('Cannot reach the school server. Your leave request was not sent.');
    }
    if (response.statusCode == 201 || response.statusCode == 200) {
      return LeaveModel.fromJson(jsonDecode(response.body));
    }
    throw Exception('The server did not accept the leave request (${response.statusCode}).');
  }

  // 7. Fetch School Announcements
  Future<List<AnnouncementModel>> fetchAnnouncements() async {
    final url = Uri.parse('${ApiConstants.baseUrl}${ApiConstants.announcementsEndpoint}');
    try {
      final response = await client.get(url, headers: headers);
      if (response.statusCode == 200) {
        final List list = jsonDecode(response.body);
        return list.map((item) => AnnouncementModel.fromJson(item)).toList();
      }
    } catch (e) {
      debugPrint('API Error fetching announcements: $e');
    }

    return [];
  }

  // 8. Send Priority Notification Alert to Principal
  Future<bool> sendNotificationToPrincipal({
    required String title,
    required String message,
    required String teacherName,
    String priority = 'high',
  }) async {
    final url = Uri.parse('${ApiConstants.baseUrl}${ApiConstants.notificationsEndpoint}');
    try {
      final response = await client.post(
        url,
        headers: headers,
        body: jsonEncode({
          'recipientId': 'principal',
          'title': '🚨 [Teacher Alert] $title ($teacherName)',
          'message': message,
          'channel': 'in_app',
          'status': 'sent',
          'sentAt': DateTime.now().toIso8601String(),
        }),
      );
      return response.statusCode == 201 || response.statusCode == 200;
    } catch (e) {
      debugPrint('API Error sending alert: $e');
      return false;
    }
  }

  // 9. Fetch Timetable
  /// Pass [teacherId] for the periods a teacher teaches, or [classId] for a
  /// class's full weekly timetable. Returns null when the server is unreachable.
  Future<List<TimetableSlotModel>?> fetchTimetable({String? teacherId, String? classId}) async {
    final query = <String, String>{
      if (teacherId != null && teacherId.isNotEmpty) 'teacherId': teacherId,
      if (classId != null && classId.isNotEmpty) 'classId': classId,
    };
    final url = Uri.parse('${ApiConstants.baseUrl}${ApiConstants.timetableEndpoint}').replace(queryParameters: query.isEmpty ? null : query);
    try {
      final response = await client.get(url, headers: headers);
      if (response.statusCode == 200) {
        final List list = jsonDecode(response.body);
        return list.map((item) => TimetableSlotModel.fromJson(item)).toList();
      }
    } catch (e) {
      debugPrint('API Error fetching timetable: $e');
    }
    return null;
  }

  // 10. Fetch Notifications (Targeted to Teacher)
  Future<List<AppNotificationModel>> fetchNotifications({String? userId, String? teacherId, String? classId}) async {
    final queryParams = <String>[];
    if (userId != null && userId.isNotEmpty) queryParams.add('userId=$userId');
    if (teacherId != null && teacherId.isNotEmpty) queryParams.add('teacherId=$teacherId');
    if (classId != null && classId.isNotEmpty) queryParams.add('classId=$classId');

    final queryString = queryParams.isNotEmpty ? '?${queryParams.join('&')}' : '';
    final url = Uri.parse('${ApiConstants.baseUrl}${ApiConstants.notificationsEndpoint}$queryString');

    try {
      final response = await client.get(url, headers: headers);
      if (response.statusCode == 200) {
        final List list = jsonDecode(response.body);
        return list.map((item) => AppNotificationModel.fromJson(item)).toList();
      }
    } catch (e) {
      debugPrint('API Error fetching notifications: $e');
    }
    return [];
  }

  // 11. Mark Single Notification as Read
  Future<bool> markNotificationAsRead(String notificationId) async {
    final url = Uri.parse('${ApiConstants.baseUrl}${ApiConstants.notificationsEndpoint}/$notificationId/read');
    try {
      final response = await client.put(url, headers: headers);
      return response.statusCode == 200;
    } catch (e) {
      return false;
    }
  }

  // 12. Mark All Notifications as Read
  Future<bool> markAllNotificationsAsRead(String recipientId) async {
    final url = Uri.parse('${ApiConstants.baseUrl}${ApiConstants.notificationsEndpoint}/read-all');
    try {
      final response = await client.put(
        url,
        headers: headers,
        body: jsonEncode({'recipientId': recipientId}),
      );
      return response.statusCode == 200;
    } catch (e) {
      return false;
    }
  }
}
