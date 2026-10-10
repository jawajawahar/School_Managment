import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import '../constants/app_colors.dart';
import 'teacher_dashboard_screen.dart';
import 'mark_attendance_screen.dart';
import 'apply_leave_screen.dart';
import 'send_alert_screen.dart';
import 'timetable_screen.dart';

class MainNavigationScreen extends StatefulWidget {
  const MainNavigationScreen({super.key});

  @override
  State<MainNavigationScreen> createState() => _MainNavigationScreenState();
}

class _MainNavigationScreenState extends State<MainNavigationScreen> {
  int _currentIndex = 0;
  late final List<Widget> _screens;

  @override
  void initState() {
    super.initState();
    _screens = [
      TeacherDashboardScreen(onNavigate: (index) {
        setState(() => _currentIndex = index);
      }),
      const MarkAttendanceScreen(),
      const ApplyLeaveScreen(),
      const SendAlertScreen(),
      const TimetableScreen(),
    ];
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: IndexedStack(
        index: _currentIndex,
        children: _screens,
      ),
      bottomNavigationBar: Container(
        decoration: const BoxDecoration(
          color: Colors.white,
          border: Border(top: BorderSide(color: AppColors.border, width: 1.0)),
        ),
        child: SafeArea(
          child: BottomNavigationBar(
            currentIndex: _currentIndex,
            onTap: (index) => setState(() => _currentIndex = index),
            type: BottomNavigationBarType.fixed,
            backgroundColor: Colors.white,
            elevation: 0,
            selectedItemColor: AppColors.accent,
            unselectedItemColor: AppColors.textMuted,
            selectedFontSize: 11,
            unselectedFontSize: 11,
            selectedLabelStyle: GoogleFonts.inter(fontWeight: FontWeight.w700),
            unselectedLabelStyle: GoogleFonts.inter(fontWeight: FontWeight.w500),
            items: const [
              BottomNavigationBarItem(
                icon: Icon(Icons.grid_view_rounded, size: 22),
                label: 'Dashboard',
              ),
              BottomNavigationBarItem(
                icon: Icon(Icons.fact_check_rounded, size: 22),
                label: 'Attendance',
              ),
              BottomNavigationBarItem(
                icon: Icon(Icons.event_note_rounded, size: 22),
                label: 'Leave',
              ),
              BottomNavigationBarItem(
                icon: Icon(Icons.notifications_none_rounded, size: 22),
                activeIcon: Icon(Icons.notifications_rounded, size: 22),
                label: 'Alerts',
              ),
              BottomNavigationBarItem(
                icon: Icon(Icons.calendar_today_rounded, size: 22),
                label: 'Schedule',
              ),
            ],
          ),
        ),
      ),
    );
  }
}
