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
  static const List<_NavItem> _items = [
    _NavItem('Home', Icons.home_outlined, Icons.home_rounded),
    _NavItem('Attendance', Icons.fact_check_outlined, Icons.fact_check_rounded),
    _NavItem('Leave', Icons.event_note_outlined, Icons.event_note_rounded),
    _NavItem('Alerts', Icons.campaign_outlined, Icons.campaign_rounded),
    _NavItem('Timetable', Icons.calendar_month_outlined, Icons.calendar_month_rounded),
  ];

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
        decoration: BoxDecoration(
          color: Colors.white,
          border: const Border(top: BorderSide(color: AppColors.border, width: 1.0)),
          boxShadow: [
            BoxShadow(color: AppColors.primaryDark.withValues(alpha: 0.05), blurRadius: 12, offset: const Offset(0, -2)),
          ],
        ),
        child: SafeArea(
          top: false,
          child: Padding(
            padding: const EdgeInsets.fromLTRB(6, 8, 6, 6),
            child: Row(
              children: List.generate(_items.length, (index) => _buildNavItem(index)),
            ),
          ),
        ),
      ),
    );
  }

  Widget _buildNavItem(int index) {
    final item = _items[index];
    final isSelected = _currentIndex == index;

    return Expanded(
      child: GestureDetector(
        behavior: HitTestBehavior.opaque,
        onTap: () => setState(() => _currentIndex = index),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            AnimatedContainer(
              duration: const Duration(milliseconds: 180),
              padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 5),
              decoration: BoxDecoration(
                color: isSelected ? AppColors.accentLight : Colors.transparent,
                borderRadius: BorderRadius.circular(16),
              ),
              child: Icon(
                isSelected ? item.activeIcon : item.icon,
                size: 22,
                color: isSelected ? AppColors.accent : AppColors.textMuted,
              ),
            ),
            const SizedBox(height: 4),
            Text(
              item.label,
              maxLines: 1,
              overflow: TextOverflow.ellipsis,
              style: GoogleFonts.inter(
                fontSize: 11,
                fontWeight: isSelected ? FontWeight.w700 : FontWeight.w500,
                color: isSelected ? AppColors.accent : AppColors.textMuted,
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class _NavItem {
  final String label;
  final IconData icon;
  final IconData activeIcon;

  const _NavItem(this.label, this.icon, this.activeIcon);
}
