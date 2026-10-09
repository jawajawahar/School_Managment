import 'package:flutter/material.dart';
import 'package:flutter_animate/flutter_animate.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:provider/provider.dart';
import '../constants/app_colors.dart';
import '../providers/auth_provider.dart';
import '../providers/attendance_provider.dart';
import '../providers/leave_provider.dart';
import '../providers/notification_provider.dart';
import '../widgets/glass_card.dart';
import '../widgets/server_settings_dialog.dart';
import 'login_screen.dart';
import 'notifications_screen.dart';

class TeacherDashboardScreen extends StatefulWidget {
  final Function(int)? onNavigate;

  const TeacherDashboardScreen({super.key, this.onNavigate});

  @override
  State<TeacherDashboardScreen> createState() => _TeacherDashboardScreenState();
}

class _TeacherDashboardScreenState extends State<TeacherDashboardScreen> {
  void _showLogoutDialog(BuildContext context) {
    showDialog(
      context: context,
      builder: (ctx) => AlertDialog(
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
        title: Text(
          'Sign Out',
          style: GoogleFonts.outfit(fontWeight: FontWeight.bold, color: AppColors.textPrimary),
        ),
        content: Text(
          'Are you sure you want to log out of GSMS Teacher Companion?',
          style: GoogleFonts.inter(color: AppColors.textSecondary),
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(ctx),
            child: Text('Cancel', style: GoogleFonts.inter(color: AppColors.textMuted)),
          ),
          ElevatedButton(
            style: ElevatedButton.styleFrom(
              backgroundColor: AppColors.absentRed,
              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
            ),
            onPressed: () async {
              Navigator.pop(ctx);
              final auth = Provider.of<AuthProvider>(context, listen: false);
              await auth.logout();
              if (context.mounted) {
                Navigator.of(context).pushAndRemoveUntil(
                  MaterialPageRoute(builder: (_) => const LoginScreen()),
                  (route) => false,
                );
              }
            },
            child: Text('Logout', style: GoogleFonts.outfit(color: Colors.white, fontWeight: FontWeight.bold)),
          ),
        ],
      ),
    );
  }

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      final user = Provider.of<AuthProvider>(context, listen: false).currentUser;
      final teacherName = user?.fullName ?? '';
      Provider.of<AttendanceProvider>(context, listen: false).loadClasses(preferredClassId: user?.assignedClassId, userRole: user?.role, user: user);
      Provider.of<LeaveProvider>(context, listen: false).fetchLeaveRequests(teacherName);
      Provider.of<NotificationProvider>(context, listen: false).fetchAnnouncements();
      Provider.of<NotificationProvider>(context, listen: false).fetchTeacherNotifications(
        userId: user?.id,
        teacherId: user?.teacherId,
        classId: user?.assignedClassId,
      );
    });
  }

  @override
  Widget build(BuildContext context) {
    final user = Provider.of<AuthProvider>(context).currentUser;
    final attProvider = Provider.of<AttendanceProvider>(context);
    final leaveProvider = Provider.of<LeaveProvider>(context);
    final notifProvider = Provider.of<NotificationProvider>(context);

    final classBadgeLabel = user?.assignedGrade != null
        ? 'CLASS TEACHER • ${user!.assignedGrade!.toUpperCase()} ${user.assignedSection ?? ''}'
        : 'CLASS TEACHER • GRADE 10 (A)';

    final initial = user?.fullName.isNotEmpty == true ? user!.fullName[0].toUpperCase() : 'T';

    return Scaffold(
      backgroundColor: AppColors.background,
      body: SafeArea(
        child: SingleChildScrollView(
          keyboardDismissBehavior: ScrollViewKeyboardDismissBehavior.onDrag,
          padding: const EdgeInsets.all(20.0),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              // Header Profile Card
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          'Welcome Back, 👋',
                          style: GoogleFonts.inter(
                            color: AppColors.textSecondary,
                            fontSize: 13,
                            fontWeight: FontWeight.w500,
                          ),
                        ),
                        const SizedBox(height: 2),
                        Text(
                          user?.fullName ?? 'Teacher',
                          style: GoogleFonts.outfit(
                            color: AppColors.textPrimary,
                            fontSize: 22,
                            fontWeight: FontWeight.bold,
                          ),
                          overflow: TextOverflow.ellipsis,
                        ),
                      ],
                    ),
                  ),
                  Row(
                    children: [
                      CircleAvatar(
                        radius: 20,
                        backgroundColor: AppColors.primary,
                        child: Text(
                          initial,
                          style: GoogleFonts.outfit(
                            color: Colors.white,
                            fontWeight: FontWeight.bold,
                            fontSize: 17,
                          ),
                        ),
                      ),
                      const SizedBox(width: 6),
                      IconButton(
                        icon: Stack(
                          clipBehavior: Clip.none,
                          children: [
                            Container(
                              padding: const EdgeInsets.all(8),
                              decoration: BoxDecoration(
                                color: AppColors.primary.withValues(alpha: 0.1),
                                shape: BoxShape.circle,
                              ),
                              child: const Icon(
                                Icons.notifications_active_rounded,
                                color: AppColors.primary,
                                size: 18,
                              ),
                            ),
                            if (notifProvider.unreadCount > 0)
                              Positioned(
                                top: -2,
                                right: -2,
                                child: Container(
                                  padding: const EdgeInsets.all(3),
                                  decoration: const BoxDecoration(
                                    color: AppColors.absentRed,
                                    shape: BoxShape.circle,
                                  ),
                                  constraints: const BoxConstraints(
                                    minWidth: 16,
                                    minHeight: 16,
                                  ),
                                  child: Text(
                                    '${notifProvider.unreadCount}',
                                    style: GoogleFonts.inter(
                                      color: Colors.white,
                                      fontSize: 9,
                                      fontWeight: FontWeight.bold,
                                    ),
                                    textAlign: TextAlign.center,
                                  ),
                                ),
                              ),
                          ],
                        ),
                        tooltip: 'Notifications',
                        onPressed: () {
                          Navigator.push(
                            context,
                            MaterialPageRoute(builder: (_) => const NotificationsScreen()),
                          );
                        },
                      ),
                      const SizedBox(width: 4),
                      IconButton(
                        icon: Container(
                          padding: const EdgeInsets.all(8),
                          decoration: BoxDecoration(
                            color: AppColors.primary.withValues(alpha: 0.1),
                            shape: BoxShape.circle,
                          ),
                          child: const Icon(
                            Icons.dns_rounded,
                            color: AppColors.primary,
                            size: 18,
                          ),
                        ),
                        tooltip: 'Server Settings',
                        onPressed: () => ServerSettingsDialog.show(context),
                      ),
                      const SizedBox(width: 4),
                      IconButton(
                        icon: Container(
                          padding: const EdgeInsets.all(8),
                          decoration: BoxDecoration(
                            color: AppColors.absentRed.withValues(alpha: 0.1),
                            shape: BoxShape.circle,
                          ),
                          child: const Icon(
                            Icons.logout_rounded,
                            color: AppColors.absentRed,
                            size: 18,
                          ),
                        ),
                        tooltip: 'Logout',
                        onPressed: () => _showLogoutDialog(context),
                      ),
                    ],
                  ),
                ],
              ).animate().fadeIn(duration: 400.ms),

              const SizedBox(height: 20),

              // Main Class Overview Card (Midnight Obsidian Luxury Theme)
              Container(
                width: double.infinity,
                padding: const EdgeInsets.all(22),
                decoration: BoxDecoration(
                  gradient: AppColors.primaryGradient,
                  borderRadius: BorderRadius.circular(24),
                  border: Border.all(color: Colors.white.withValues(alpha: 0.12), width: 1.5),
                  boxShadow: [
                    BoxShadow(
                      color: const Color(0xFF1E1B4B).withValues(alpha: 0.4),
                      blurRadius: 24,
                      offset: const Offset(0, 10),
                    ),
                  ],
                ),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        Container(
                          padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
                          decoration: BoxDecoration(
                            color: Colors.white.withValues(alpha: 0.12),
                            borderRadius: BorderRadius.circular(20),
                            border: Border.all(color: Colors.white.withValues(alpha: 0.18)),
                          ),
                          child: Text(
                            classBadgeLabel,
                            style: GoogleFonts.inter(
                              color: Colors.white,
                              fontSize: 11,
                              fontWeight: FontWeight.w800,
                              letterSpacing: 1.0,
                            ),
                          ),
                        ),
                        Container(
                          padding: const EdgeInsets.all(6),
                          decoration: BoxDecoration(
                            color: Colors.amber.withValues(alpha: 0.2),
                            shape: BoxShape.circle,
                          ),
                          child: const Icon(Icons.verified_rounded, color: Colors.amberAccent, size: 20),
                        ),
                      ],
                    ),
                    const SizedBox(height: 20),
                    Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      crossAxisAlignment: CrossAxisAlignment.end,
                      children: [
                        Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(
                              'Overall Attendance Rate',
                              style: GoogleFonts.inter(
                                color: Colors.white.withValues(alpha: 0.8),
                                fontSize: 13,
                                fontWeight: FontWeight.w600,
                              ),
                            ),
                            const SizedBox(height: 4),
                            Text(
                              '${attProvider.attendancePercentage.toStringAsFixed(0)}%',
                              style: GoogleFonts.outfit(
                                color: Colors.white,
                                fontSize: 44,
                                fontWeight: FontWeight.w900,
                                letterSpacing: -1.0,
                              ),
                            ),
                          ],
                        ),
                        ElevatedButton.icon(
                          onPressed: () => widget.onNavigate?.call(1),
                          style: ElevatedButton.styleFrom(
                            backgroundColor: Colors.white,
                            foregroundColor: AppColors.primaryDark,
                            elevation: 4,
                            shadowColor: Colors.black38,
                            padding: const EdgeInsets.symmetric(horizontal: 18, vertical: 12),
                            shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
                          ),
                          icon: const Icon(Icons.how_to_reg_rounded, size: 20, color: AppColors.primary),
                          label: Text(
                            'Mark Register',
                            style: GoogleFonts.outfit(
                              fontWeight: FontWeight.w900,
                              fontSize: 14,
                              color: AppColors.textPrimary,
                            ),
                          ),
                        ),
                      ],
                    ),
                  ],
                ),
              ).animate().slideY(begin: 0.1, duration: 500.ms).fadeIn(),

              const SizedBox(height: 24),

              // Live Attendance Telemetry Cards (Replacing old Quick Actions)
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Text(
                    'Live Attendance Telemetry',
                    style: GoogleFonts.outfit(
                      color: AppColors.textPrimary,
                      fontSize: 18,
                      fontWeight: FontWeight.bold,
                    ),
                  ),
                  Text(
                    '${attProvider.totalStudents} Enrolled',
                    style: GoogleFonts.inter(
                      color: AppColors.textSecondary,
                      fontSize: 12,
                      fontWeight: FontWeight.w600,
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 12),

              // 2x2 Telemetry Cards Grid (Present, Absent, Late, On Leave)
              GridView.count(
                crossAxisCount: 2,
                shrinkWrap: true,
                physics: const NeverScrollableScrollPhysics(),
                crossAxisSpacing: 12,
                mainAxisSpacing: 12,
                childAspectRatio: 1.45,
                children: [
                  // 1. Present Card
                  _buildTelemetryCard(
                    title: 'Present Today',
                    count: '${attProvider.presentCount}',
                    subtitle: 'In classroom',
                    icon: Icons.check_circle_rounded,
                    color: AppColors.presentGreen,
                    badgeText: attProvider.totalStudents > 0
                        ? '${((attProvider.presentCount / attProvider.totalStudents) * 100).toStringAsFixed(0)}%'
                        : '0%',
                    onTap: () => widget.onNavigate?.call(1),
                  ),
                  // 2. Absent Card
                  _buildTelemetryCard(
                    title: 'Absent Today',
                    count: '${attProvider.absentCount}',
                    subtitle: 'Unexcused',
                    icon: Icons.cancel_rounded,
                    color: AppColors.absentRed,
                    badgeText: attProvider.totalStudents > 0
                        ? '${((attProvider.absentCount / attProvider.totalStudents) * 100).toStringAsFixed(0)}%'
                        : '0%',
                    onTap: () => widget.onNavigate?.call(1),
                  ),
                  // 3. Late Card
                  _buildTelemetryCard(
                    title: 'Late Arrivals',
                    count: '${attProvider.lateCount}',
                    subtitle: 'Marked late entry',
                    icon: Icons.access_time_filled_rounded,
                    color: AppColors.lateOrange,
                    badgeText: attProvider.totalStudents > 0
                        ? '${((attProvider.lateCount / attProvider.totalStudents) * 100).toStringAsFixed(0)}%'
                        : '0%',
                    onTap: () => widget.onNavigate?.call(1),
                  ),
                  // 4. Leave Card
                  _buildTelemetryCard(
                    title: 'On Leave',
                    count: '${leaveProvider.leaveRequests.where((l) => l.status == 'approved').length}',
                    subtitle: 'Approved leave',
                    icon: Icons.event_available_rounded,
                    color: AppColors.accentTeal,
                    badgeText: '${leaveProvider.leaveRequests.length} Total',
                    onTap: () => widget.onNavigate?.call(2),
                  ),
                ],
              ).animate().fade(delay: 200.ms),

              const SizedBox(height: 24),

              // Navigation Shortcuts Row
              Row(
                children: [
                  Expanded(
                    child: _buildShortcutButton(
                      label: 'Mark Register',
                      icon: Icons.how_to_reg_rounded,
                      color: AppColors.primary,
                      onTap: () => widget.onNavigate?.call(1),
                    ),
                  ),
                  const SizedBox(width: 8),
                  Expanded(
                    child: _buildShortcutButton(
                      label: 'Apply Leave',
                      icon: Icons.event_note_rounded,
                      color: AppColors.accentAmber,
                      onTap: () => widget.onNavigate?.call(2),
                    ),
                  ),
                  const SizedBox(width: 8),
                  Expanded(
                    child: _buildShortcutButton(
                      label: 'Notify Office',
                      icon: Icons.add_alert_rounded,
                      color: AppColors.accentTeal,
                      onTap: () => widget.onNavigate?.call(3),
                    ),
                  ),
                ],
              ),

              const SizedBox(height: 24),

              // School Announcements Header
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Text(
                    'Principal Announcements',
                    style: GoogleFonts.outfit(
                      color: AppColors.textPrimary,
                      fontSize: 18,
                      fontWeight: FontWeight.bold,
                    ),
                  ),
                  TextButton(
                    onPressed: () => widget.onNavigate?.call(3),
                    child: Text(
                      'View All',
                      style: GoogleFonts.inter(color: AppColors.primary, fontWeight: FontWeight.bold, fontSize: 13),
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 8),

              // Announcements Feed
              if (notifProvider.isLoading)
                const Center(child: Padding(padding: EdgeInsets.all(20.0), child: CircularProgressIndicator()))
              else if (notifProvider.announcements.isEmpty)
                GlassCard(
                  child: Center(
                    child: Text(
                      'No official announcements posted today.',
                      style: GoogleFonts.inter(color: AppColors.textMuted, fontSize: 13),
                    ),
                  ),
                )
              else
                ...notifProvider.announcements.take(3).map(
                      (item) => GlassCard(
                        onTap: () => widget.onNavigate?.call(3),
                        margin: const EdgeInsets.only(bottom: 10),
                        padding: const EdgeInsets.all(14),
                        child: Row(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Container(
                              padding: const EdgeInsets.all(8),
                              decoration: BoxDecoration(
                                color: item.isEmergency
                                    ? AppColors.absentRed.withValues(alpha: 0.1)
                                    : AppColors.primary.withValues(alpha: 0.1),
                                shape: BoxShape.circle,
                              ),
                              child: Icon(
                                item.isEmergency ? Icons.warning_amber_rounded : Icons.campaign_rounded,
                                color: item.isEmergency ? AppColors.absentRed : AppColors.primary,
                                size: 20,
                              ),
                            ),
                            const SizedBox(width: 12),
                            Expanded(
                              child: Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  Text(
                                    item.title,
                                    style: GoogleFonts.outfit(
                                      color: AppColors.textPrimary,
                                      fontSize: 15,
                                      fontWeight: FontWeight.bold,
                                    ),
                                  ),
                                  const SizedBox(height: 4),
                                  Text(
                                    item.body,
                                    maxLines: 2,
                                    overflow: TextOverflow.ellipsis,
                                    style: GoogleFonts.inter(
                                      color: AppColors.textSecondary,
                                      fontSize: 13,
                                    ),
                                  ),
                                ],
                              ),
                            ),
                          ],
                        ),
                      ),
                    ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildTelemetryCard({
    required String title,
    required String count,
    required String subtitle,
    required IconData icon,
    required Color color,
    required String badgeText,
    required VoidCallback onTap,
  }) {
    return InkWell(
      onTap: onTap,
      borderRadius: BorderRadius.circular(16),
      child: Container(
        padding: const EdgeInsets.all(14),
        decoration: BoxDecoration(
          color: Colors.white,
          borderRadius: BorderRadius.circular(16),
          border: Border.all(color: color.withValues(alpha: 0.2), width: 1.5),
          boxShadow: AppColors.softShadow,
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          mainAxisAlignment: MainAxisAlignment.spaceBetween,
          children: [
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Container(
                  padding: const EdgeInsets.all(6),
                  decoration: BoxDecoration(
                    color: color.withValues(alpha: 0.12),
                    borderRadius: BorderRadius.circular(8),
                  ),
                  child: Icon(icon, color: color, size: 20),
                ),
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                  decoration: BoxDecoration(
                    color: color.withValues(alpha: 0.1),
                    borderRadius: BorderRadius.circular(10),
                  ),
                  child: Text(
                    badgeText,
                    style: GoogleFonts.inter(
                      color: color,
                      fontSize: 11,
                      fontWeight: FontWeight.bold,
                    ),
                  ),
                ),
              ],
            ),
            Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  count,
                  style: GoogleFonts.outfit(
                    color: AppColors.textPrimary,
                    fontSize: 24,
                    fontWeight: FontWeight.bold,
                  ),
                ),
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    Text(
                      title,
                      style: GoogleFonts.inter(
                        color: AppColors.textSecondary,
                        fontSize: 12,
                        fontWeight: FontWeight.w600,
                      ),
                    ),
                    Icon(Icons.arrow_forward_ios_rounded, size: 10, color: AppColors.textMuted),
                  ],
                ),
              ],
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildShortcutButton({
    required String label,
    required IconData icon,
    required Color color,
    required VoidCallback onTap,
  }) {
    return InkWell(
      onTap: onTap,
      borderRadius: BorderRadius.circular(12),
      child: Container(
        padding: const EdgeInsets.symmetric(vertical: 12, horizontal: 8),
        decoration: BoxDecoration(
          color: color.withValues(alpha: 0.08),
          borderRadius: BorderRadius.circular(12),
          border: Border.all(color: color.withValues(alpha: 0.2)),
        ),
        child: Row(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Icon(icon, size: 16, color: color),
            const SizedBox(width: 6),
            Flexible(
              child: Text(
                label,
                style: GoogleFonts.outfit(
                  fontSize: 12,
                  fontWeight: FontWeight.bold,
                  color: color,
                ),
                overflow: TextOverflow.ellipsis,
              ),
            ),
          ],
        ),
      ),
    );
  }
}
