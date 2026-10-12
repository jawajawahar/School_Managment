import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
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
      MarkAttendanceScreen(onBack: () {
        setState(() => _currentIndex = 0);
      }),
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
      bottomNavigationBar: _currentIndex == 1 ? null : _buildModernBottomNav(),
    );
  }

  Widget _buildModernBottomNav() {
    return Container(
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: const BorderRadius.vertical(top: Radius.circular(22)),
        border: Border.all(color: const Color(0xFFF1F5F9), width: 1.0),
        boxShadow: [
          BoxShadow(
            color: const Color(0xFF0F172A).withValues(alpha: 0.08),
            blurRadius: 24,
            spreadRadius: 0,
            offset: const Offset(0, -4),
          ),
          BoxShadow(
            color: const Color(0xFF0F172A).withValues(alpha: 0.02),
            blurRadius: 6,
            spreadRadius: 0,
            offset: const Offset(0, -1),
          ),
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
    );
  }

  Widget _buildNavItem(int index) {
    final item = _items[index];
    final isSelected = _currentIndex == index;

    return Expanded(
      child: GestureDetector(
        behavior: HitTestBehavior.opaque,
        onTap: () {
          HapticFeedback.lightImpact();
          setState(() => _currentIndex = index);
        },
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            AnimatedContainer(
              duration: const Duration(milliseconds: 220),
              curve: Curves.easeOutCubic,
              padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 6),
              decoration: BoxDecoration(
                gradient: isSelected
                    ? const LinearGradient(
                        colors: [Color(0xFFEFF6FF), Color(0xFFDBEAFE)],
                        begin: Alignment.topLeft,
                        end: Alignment.bottomRight,
                      )
                    : null,
                color: isSelected ? null : Colors.transparent,
                borderRadius: BorderRadius.circular(16),
                border: isSelected
                    ? Border.all(color: const Color(0xFFBFDBFE), width: 1.0)
                    : Border.all(color: Colors.transparent, width: 1.0),
                boxShadow: isSelected
                    ? [
                        BoxShadow(
                          color: AppColors.accent.withValues(alpha: 0.15),
                          blurRadius: 8,
                          offset: const Offset(0, 2),
                        )
                      ]
                    : null,
              ),
              child: AnimatedScale(
                duration: const Duration(milliseconds: 200),
                scale: isSelected ? 1.08 : 1.0,
                child: Icon(
                  isSelected ? item.activeIcon : item.icon,
                  size: 21,
                  color: isSelected ? AppColors.accent : const Color(0xFF94A3B8),
                ),
              ),
            ),
            const SizedBox(height: 4),
            Text(
              item.label,
              maxLines: 1,
              overflow: TextOverflow.ellipsis,
              style: isSelected
                  ? GoogleFonts.outfit(
                      fontSize: 11,
                      fontWeight: FontWeight.bold,
                      color: AppColors.accent,
                      letterSpacing: 0.1,
                    )
                  : GoogleFonts.inter(
                      fontSize: 11,
                      fontWeight: FontWeight.w500,
                      color: const Color(0xFF64748B),
                    ),
            ),
            const SizedBox(height: 3),
            AnimatedContainer(
              duration: const Duration(milliseconds: 220),
              curve: Curves.easeOutCubic,
              width: isSelected ? 14 : 0,
              height: 3,
              decoration: BoxDecoration(
                color: AppColors.accent,
                borderRadius: BorderRadius.circular(2),
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
