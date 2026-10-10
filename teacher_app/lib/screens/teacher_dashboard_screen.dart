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
    WidgetsBinding.instance.addPostFrameCallback((_) async {
      final auth = Provider.of<AuthProvider>(context, listen: false);
      await auth.refreshProfile();
      if (!mounted) return;
      final user = auth.currentUser;
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
          padding: const EdgeInsets.symmetric(horizontal: 16.0, vertical: 16.0),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              // Clean Executive Top Bar
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
                        fontSize: 16,
                      ),
                    ),
                  ),
                  const SizedBox(width: 12),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          'Welcome Back',
                          style: GoogleFonts.inter(
                            color: AppColors.textMuted,
                            fontSize: 12,
                            fontWeight: FontWeight.w500,
                          ),
                        ),
                        Text(
                          user?.fullName ?? 'Teacher',
                          style: GoogleFonts.outfit(
                            color: AppColors.textPrimary,
                            fontSize: 18,
                            fontWeight: FontWeight.bold,
                          ),
                          maxLines: 1,
                          overflow: TextOverflow.ellipsis,
                        ),
                      ],
                    ),
                  ),
                  Row(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      IconButton(
                        constraints: const BoxConstraints(),
                        padding: const EdgeInsets.all(8),
                        icon: Stack(
                          clipBehavior: Clip.none,
                          children: [
                            const Icon(
                              Icons.notifications_none_rounded,
                              color: AppColors.textPrimary,
                              size: 22,
                            ),
                            if (notifProvider.unreadCount > 0)
                              Positioned(
                                top: -2,
                                right: -2,
                                child: Container(
                                  padding: const EdgeInsets.all(3),
                                  decoration: const BoxDecoration(
                                    color: AppColors.accent,
                                    shape: BoxShape.circle,
                                  ),
                                  constraints: const BoxConstraints(
                                    minWidth: 14,
                                    minHeight: 14,
                                  ),
                                  child: Text(
                                    '${notifProvider.unreadCount}',
                                    style: GoogleFonts.inter(
                                      color: Colors.white,
                                      fontSize: 8,
                                      fontWeight: FontWeight.bold,
                                    ),
                                    textAlign: TextAlign.center,
                                  ),
                                ),
                              ),
                          ],
                        ),
                        onPressed: () {
                          Navigator.push(
                            context,
                            MaterialPageRoute(builder: (_) => const NotificationsScreen()),
                          );
                        },
                      ),
                      IconButton(
                        constraints: const BoxConstraints(),
                        padding: const EdgeInsets.all(8),
                        icon: const Icon(
                          Icons.settings_outlined,
                          color: AppColors.textPrimary,
                          size: 22,
                        ),
                        onPressed: () => ServerSettingsDialog.show(context),
                      ),
                      IconButton(
                        constraints: const BoxConstraints(),
                        padding: const EdgeInsets.all(8),
                        icon: const Icon(
                          Icons.logout_rounded,
                          color: AppColors.textMuted,
                          size: 20,
                        ),
                        onPressed: () => _showLogoutDialog(context),
                      ),
                    ],
                  ),
                ],
              ).animate().fadeIn(duration: 300.ms),

              const SizedBox(height: 16),

              // Executive Hero Card (Slate Obsidian Theme - 100% Responsive)
              Container(
                width: double.infinity,
                padding: const EdgeInsets.all(20),
                decoration: BoxDecoration(
                  gradient: AppColors.executiveGradient,
                  borderRadius: BorderRadius.circular(20),
                  boxShadow: AppColors.softShadow,
                ),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Container(
                      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                      decoration: BoxDecoration(
                        color: Colors.white.withValues(alpha: 0.1),
                        borderRadius: BorderRadius.circular(6),
                      ),
                      child: Text(
                        classBadgeLabel,
                        style: GoogleFonts.inter(
                          color: Colors.white.withValues(alpha: 0.9),
                          fontSize: 11,
                          fontWeight: FontWeight.w700,
                          letterSpacing: 0.5,
                        ),
                      ),
                    ),
                    const SizedBox(height: 16),
                    Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      crossAxisAlignment: CrossAxisAlignment.center,
                      children: [
                        Expanded(
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Text(
                                'Overall Attendance Rate',
                                style: GoogleFonts.inter(
                                  color: Colors.white70,
                                  fontSize: 12,
                                  fontWeight: FontWeight.w500,
                                ),
                              ),
                              const SizedBox(height: 2),
                              FittedBox(
                                fit: BoxFit.scaleDown,
                                alignment: Alignment.centerLeft,
                                child: Text(
                                  '${attProvider.attendancePercentage.toStringAsFixed(0)}%',
                                  style: GoogleFonts.outfit(
                                    color: Colors.white,
                                    fontSize: 38,
                                    fontWeight: FontWeight.w800,
                                  ),
                                ),
                              ),
                            ],
                          ),
                        ),
                        const SizedBox(width: 12),
                        ElevatedButton(
                          onPressed: () => widget.onNavigate?.call(1),
                          style: ElevatedButton.styleFrom(
                            backgroundColor: AppColors.accent,
                            foregroundColor: Colors.white,
                            elevation: 0,
                            padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
                            shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                          ),
                          child: FittedBox(
                            fit: BoxFit.scaleDown,
                            child: Row(
                              mainAxisSize: MainAxisSize.min,
                              children: [
                                const Icon(Icons.fact_check_rounded, size: 16, color: Colors.white),
                                const SizedBox(width: 6),
                                Text(
                                  'Mark Register',
                                  style: GoogleFonts.outfit(
                                    fontWeight: FontWeight.bold,
                                    fontSize: 13,
                                    color: Colors.white,
                                  ),
                                ),
                              ],
                            ),
                          ),
                        ),
                      ],
                    ),
                  ],
                ),
              ).animate().fadeIn(duration: 400.ms),

              const SizedBox(height: 20),

              // Section Header: Daily Overview
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Text(
                    'Daily Summary',
                    style: GoogleFonts.outfit(
                      color: AppColors.textPrimary,
                      fontSize: 16,
                      fontWeight: FontWeight.bold,
                    ),
                  ),
                  Text(
                    '${attProvider.totalStudents} Enrolled',
                    style: GoogleFonts.inter(
                      color: AppColors.textMuted,
                      fontSize: 12,
                      fontWeight: FontWeight.w600,
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 10),

              // 2x2 Telemetry Cards Grid (Clean Professional 2-3 Color Combo)
              GridView.count(
                crossAxisCount: 2,
                shrinkWrap: true,
                physics: const NeverScrollableScrollPhysics(),
                crossAxisSpacing: 10,
                mainAxisSpacing: 10,
                childAspectRatio: 1.55,
                children: [
                  _buildExecutiveMetricCard(
                    title: 'Present Today',
                    count: '${attProvider.presentCount}',
                    percentage: attProvider.totalStudents > 0
                        ? '${((attProvider.presentCount / attProvider.totalStudents) * 100).toStringAsFixed(0)}%'
                        : '0%',
                    accentColor: AppColors.presentGreen,
                    onTap: () => widget.onNavigate?.call(1),
                  ),
                  _buildExecutiveMetricCard(
                    title: 'Absent Today',
                    count: '${attProvider.absentCount}',
                    percentage: attProvider.totalStudents > 0
                        ? '${((attProvider.absentCount / attProvider.totalStudents) * 100).toStringAsFixed(0)}%'
                        : '0%',
                    accentColor: AppColors.absentRed,
                    onTap: () => widget.onNavigate?.call(1),
                  ),
                  _buildExecutiveMetricCard(
                    title: 'Late Arrivals',
                    count: '${attProvider.lateCount}',
                    percentage: attProvider.totalStudents > 0
                        ? '${((attProvider.lateCount / attProvider.totalStudents) * 100).toStringAsFixed(0)}%'
                        : '0%',
                    accentColor: AppColors.lateOrange,
                    onTap: () => widget.onNavigate?.call(1),
                  ),
                  _buildExecutiveMetricCard(
                    title: 'On Leave',
                    count: '${leaveProvider.leaveRequests.where((l) => l.status == 'approved').length}',
                    percentage: '${leaveProvider.leaveRequests.length} Total',
                    accentColor: AppColors.accent,
                    onTap: () => widget.onNavigate?.call(2),
                  ),
                ],
              ).animate().fadeIn(delay: 150.ms),

              const SizedBox(height: 16),

              // Quick Actions Row (100% Responsive)
              Row(
                children: [
                  Expanded(
                    child: _buildActionShortcut(
                      label: 'Attendance',
                      icon: Icons.fact_check_rounded,
                      onTap: () => widget.onNavigate?.call(1),
                    ),
                  ),
                  const SizedBox(width: 8),
                  Expanded(
                    child: _buildActionShortcut(
                      label: 'Apply Leave',
                      icon: Icons.event_note_rounded,
                      onTap: () => widget.onNavigate?.call(2),
                    ),
                  ),
                  const SizedBox(width: 8),
                  Expanded(
                    child: _buildActionShortcut(
                      label: 'Send Alert',
                      icon: Icons.campaign_rounded,
                      onTap: () => widget.onNavigate?.call(3),
                    ),
                  ),
                ],
              ),

              const SizedBox(height: 20),

              // School Announcements Header
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Text(
                    'Announcements',
                    style: GoogleFonts.outfit(
                      color: AppColors.textPrimary,
                      fontSize: 16,
                      fontWeight: FontWeight.bold,
                    ),
                  ),
                  InkWell(
                    onTap: () => widget.onNavigate?.call(3),
                    child: Text(
                      'View All',
                      style: GoogleFonts.inter(
                        color: AppColors.accent,
                        fontWeight: FontWeight.w700,
                        fontSize: 12,
                      ),
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
                      'No announcements posted today.',
                      style: GoogleFonts.inter(color: AppColors.textMuted, fontSize: 13),
                    ),
                  ),
                )
              else
                ...notifProvider.announcements.take(2).map(
                      (item) => GlassCard(
                        onTap: () => widget.onNavigate?.call(3),
                        margin: const EdgeInsets.only(bottom: 8),
                        padding: const EdgeInsets.all(12),
                        child: Row(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Icon(
                              item.isEmergency ? Icons.warning_amber_rounded : Icons.info_outline_rounded,
                              color: item.isEmergency ? AppColors.absentRed : AppColors.accent,
                              size: 18,
                            ),
                            const SizedBox(width: 10),
                            Expanded(
                              child: Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  Text(
                                    item.title,
                                    style: GoogleFonts.outfit(
                                      color: AppColors.textPrimary,
                                      fontSize: 14,
                                      fontWeight: FontWeight.bold,
                                    ),
                                    maxLines: 1,
                                    overflow: TextOverflow.ellipsis,
                                  ),
                                  const SizedBox(height: 2),
                                  Text(
                                    item.body,
                                    maxLines: 2,
                                    overflow: TextOverflow.ellipsis,
                                    style: GoogleFonts.inter(
                                      color: AppColors.textSecondary,
                                      fontSize: 12,
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

  Widget _buildExecutiveMetricCard({
    required String title,
    required String count,
    required String percentage,
    required Color accentColor,
    required VoidCallback onTap,
  }) {
    return InkWell(
      onTap: onTap,
      borderRadius: BorderRadius.circular(12),
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
        decoration: BoxDecoration(
          color: Colors.white,
          borderRadius: BorderRadius.circular(12),
          border: Border.all(color: AppColors.border, width: 1.0),
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
                  width: 8,
                  height: 8,
                  decoration: BoxDecoration(
                    color: accentColor,
                    shape: BoxShape.circle,
                  ),
                ),
                Text(
                  percentage,
                  style: GoogleFonts.inter(
                    color: AppColors.textMuted,
                    fontSize: 11,
                    fontWeight: FontWeight.w600,
                  ),
                ),
              ],
            ),
            Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                FittedBox(
                  fit: BoxFit.scaleDown,
                  alignment: Alignment.centerLeft,
                  child: Text(
                    count,
                    style: GoogleFonts.outfit(
                      color: AppColors.textPrimary,
                      fontSize: 22,
                      fontWeight: FontWeight.bold,
                    ),
                  ),
                ),
                Text(
                  title,
                  style: GoogleFonts.inter(
                    color: AppColors.textSecondary,
                    fontSize: 11,
                    fontWeight: FontWeight.w500,
                  ),
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                ),
              ],
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildActionShortcut({
    required String label,
    required IconData icon,
    required VoidCallback onTap,
  }) {
    return InkWell(
      onTap: onTap,
      borderRadius: BorderRadius.circular(8),
      child: Container(
        padding: const EdgeInsets.symmetric(vertical: 10, horizontal: 6),
        decoration: BoxDecoration(
          color: Colors.white,
          borderRadius: BorderRadius.circular(8),
          border: Border.all(color: AppColors.border, width: 1.0),
        ),
        child: Row(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Icon(icon, size: 15, color: AppColors.accent),
            const SizedBox(width: 6),
            Flexible(
              child: Text(
                label,
                style: GoogleFonts.outfit(
                  fontSize: 12,
                  fontWeight: FontWeight.w700,
                  color: AppColors.textPrimary,
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
