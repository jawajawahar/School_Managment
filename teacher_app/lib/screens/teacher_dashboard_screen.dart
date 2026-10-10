import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:provider/provider.dart';
import '../constants/app_colors.dart';
import '../models/student_model.dart';
import '../models/timetable_model.dart';
import '../providers/auth_provider.dart';
import '../providers/attendance_provider.dart';
import '../providers/leave_provider.dart';
import '../providers/notification_provider.dart';
import '../services/api_service.dart';
import '../widgets/app_ui.dart';
import '../widgets/guardian_contact.dart';
import '../widgets/server_settings_dialog.dart';
import 'login_screen.dart';
import 'my_class_screen.dart';
import 'notifications_screen.dart';

class TeacherDashboardScreen extends StatefulWidget {
  final Function(int)? onNavigate;

  const TeacherDashboardScreen({super.key, this.onNavigate});

  @override
  State<TeacherDashboardScreen> createState() => _TeacherDashboardScreenState();
}

class _TeacherDashboardScreenState extends State<TeacherDashboardScreen> {
  // Bottom-bar tab indexes
  static const int _tabAttendance = 1;
  static const int _tabLeave = 2;
  static const int _tabAlerts = 3;
  static const int _tabTimetable = 4;

  List<TimetableSlotModel> _todayPeriods = [];

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) => _loadDashboard());
  }

  Future<void> _loadDashboard() async {
    final auth = Provider.of<AuthProvider>(context, listen: false);
    await auth.refreshProfile();
    if (!mounted) return;
    final user = auth.currentUser;
    final notifProvider = Provider.of<NotificationProvider>(context, listen: false);

    final results = await Future.wait<dynamic>([
      ApiService().fetchTimetable(teacherId: user?.teacherId ?? user?.id ?? ''),
      Provider.of<AttendanceProvider>(context, listen: false)
          .loadClasses(preferredClassId: user?.assignedClassId, userRole: user?.role, user: user),
      Provider.of<LeaveProvider>(context, listen: false).fetchLeaveRequests(user?.fullName ?? ''),
      notifProvider.fetchAnnouncements(),
      notifProvider.fetchTeacherNotifications(userId: user?.id, teacherId: user?.teacherId, classId: user?.assignedClassId),
    ]);

    if (!mounted) return;
    final slots = (results[0] as List<TimetableSlotModel>?) ?? [];
    final today = DateTime.now().weekday;
    setState(() {
      _todayPeriods = slots.where((s) => s.dayOfWeek == today).toList()..sort((a, b) => a.periodNo.compareTo(b.periodNo));
    });
  }

  void _showLogoutDialog() {
    showDialog(
      context: context,
      builder: (ctx) => AlertDialog(
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
        title: Text('Sign Out', style: GoogleFonts.outfit(fontWeight: FontWeight.bold, color: AppColors.textPrimary)),
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
              elevation: 0,
              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
            ),
            onPressed: () async {
              Navigator.pop(ctx);
              final auth = Provider.of<AuthProvider>(context, listen: false);
              await auth.logout();
              if (mounted) {
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

  String get _greeting {
    final hour = DateTime.now().hour;
    if (hour < 12) return 'Good morning';
    if (hour < 17) return 'Good afternoon';
    return 'Good evening';
  }

  @override
  Widget build(BuildContext context) {
    final user = Provider.of<AuthProvider>(context).currentUser;
    final attProvider = Provider.of<AttendanceProvider>(context);
    final leaveProvider = Provider.of<LeaveProvider>(context);
    final notifProvider = Provider.of<NotificationProvider>(context);
    final hasClass = user?.hasAssignedClass ?? false;

    return Scaffold(
      backgroundColor: AppColors.background,
      body: Column(
        children: [
          _buildHeader(user?.fullName ?? 'Teacher', hasClass ? user!.assignedClassName : null, notifProvider.unreadCount),
          Expanded(
            child: RefreshIndicator(
              color: AppColors.accent,
              onRefresh: _loadDashboard,
              child: ListView(
                physics: const AlwaysScrollableScrollPhysics(),
                padding: const EdgeInsets.fromLTRB(16, 16, 16, 24),
                children: [
                  hasClass ? _buildAttendanceCard(attProvider, user!.assignedClassName) : _buildNoClassCard(),
                  if (hasClass) _buildAbsentFollowUp(attProvider.students.where((s) => s.attendanceStatus == 'absent').toList()),
                  const SizedBox(height: 20),

                  const SectionTitle(title: 'Quick Actions'),
                  Row(
                    children: [
                      _buildQuickAction('Attendance', Icons.fact_check_outlined, AppColors.presentGreen, _tabAttendance),
                      hasClass
                          ? _buildQuickAction('My Class', Icons.groups_outlined, AppColors.accent, null, onTap: _openMyClass)
                          : _buildQuickAction('Timetable', Icons.calendar_month_outlined, AppColors.accent, _tabTimetable),
                      _buildQuickAction('Leave', Icons.event_note_outlined, AppColors.lateOrange, _tabLeave),
                      _buildQuickAction('Alert', Icons.campaign_outlined, AppColors.absentRed, _tabAlerts),
                    ],
                  ),
                  const SizedBox(height: 20),

                  SectionTitle(
                    title: "Today's Periods",
                    actionLabel: 'Full timetable',
                    onAction: () => widget.onNavigate?.call(_tabTimetable),
                  ),
                  if (_todayPeriods.isEmpty)
                    AppCard(
                      child: Row(
                        children: [
                          const IconTile(icon: Icons.event_available_outlined, color: AppColors.accent),
                          const SizedBox(width: 12),
                          Expanded(
                            child: Text(
                              DateTime.now().weekday > 5
                                  ? 'No school periods today. Enjoy the weekend.'
                                  : 'You have no teaching periods scheduled today.',
                              style: GoogleFonts.inter(fontSize: 13, color: AppColors.textSecondary),
                            ),
                          ),
                        ],
                      ),
                    )
                  else
                    ..._todayPeriods.map(_buildPeriodRow),
                  const SizedBox(height: 12),

                  SectionTitle(
                    title: 'My Leave',
                    actionLabel: 'Manage',
                    onAction: () => widget.onNavigate?.call(_tabLeave),
                  ),
                  AppCard(
                    padding: const EdgeInsets.symmetric(vertical: 14, horizontal: 8),
                    onTap: () => widget.onNavigate?.call(_tabLeave),
                    child: Row(
                      children: [
                        _buildLeaveFigure('${leaveProvider.pendingCount}', 'Pending', AppColors.lateOrange),
                        _buildFigureDivider(),
                        _buildLeaveFigure('${leaveProvider.approvedCount}', 'Approved', AppColors.presentGreen),
                        _buildFigureDivider(),
                        _buildLeaveFigure('${leaveProvider.rejectedCount}', 'Rejected', AppColors.absentRed),
                      ],
                    ),
                  ),
                  const SizedBox(height: 12),

                  SectionTitle(
                    title: 'Announcements',
                    actionLabel: notifProvider.announcements.isEmpty ? null : 'View all',
                    onAction: () => widget.onNavigate?.call(_tabAlerts),
                  ),
                  if (notifProvider.isLoading && notifProvider.announcements.isEmpty)
                    const Padding(
                      padding: EdgeInsets.all(20),
                      child: Center(child: CircularProgressIndicator(color: AppColors.accent)),
                    )
                  else if (notifProvider.announcements.isEmpty)
                    AppCard(
                      child: Row(
                        children: [
                          const IconTile(icon: Icons.campaign_outlined, color: AppColors.textMuted),
                          const SizedBox(width: 12),
                          Expanded(
                            child: Text(
                              'No announcements from the school office.',
                              style: GoogleFonts.inter(fontSize: 13, color: AppColors.textSecondary),
                            ),
                          ),
                        ],
                      ),
                    )
                  else
                    ...notifProvider.announcements.take(3).map(
                          (item) => AppCard(
                            onTap: () => widget.onNavigate?.call(_tabAlerts),
                            borderColor: item.isEmergency ? AppColors.absentRed.withValues(alpha: 0.4) : null,
                            child: Row(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                IconTile(
                                  icon: item.isEmergency ? Icons.warning_amber_rounded : Icons.campaign_outlined,
                                  color: item.isEmergency ? AppColors.absentRed : AppColors.accent,
                                ),
                                const SizedBox(width: 12),
                                Expanded(
                                  child: Column(
                                    crossAxisAlignment: CrossAxisAlignment.start,
                                    children: [
                                      Text(
                                        item.title,
                                        maxLines: 1,
                                        overflow: TextOverflow.ellipsis,
                                        style: GoogleFonts.outfit(fontSize: 14, fontWeight: FontWeight.bold, color: AppColors.textPrimary),
                                      ),
                                      const SizedBox(height: 2),
                                      Text(
                                        item.body,
                                        maxLines: 2,
                                        overflow: TextOverflow.ellipsis,
                                        style: GoogleFonts.inter(fontSize: 12, height: 1.35, color: AppColors.textSecondary),
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
        ],
      ),
    );
  }

  // ---------------------------------------------------------------- header

  Widget _buildHeader(String fullName, String? className, int unreadCount) {
    final initial = fullName.isNotEmpty ? fullName[0].toUpperCase() : 'T';

    return Container(
      width: double.infinity,
      decoration: const BoxDecoration(gradient: AppColors.executiveGradient),
      child: SafeArea(
        bottom: false,
        child: Padding(
          padding: const EdgeInsets.fromLTRB(20, 14, 8, 18),
          child: Row(
            children: [
              Container(
                width: 46,
                height: 46,
                alignment: Alignment.center,
                decoration: BoxDecoration(
                  color: AppColors.accent,
                  shape: BoxShape.circle,
                  border: Border.all(color: Colors.white.withValues(alpha: 0.25), width: 2),
                ),
                child: Text(initial, style: GoogleFonts.outfit(color: Colors.white, fontWeight: FontWeight.bold, fontSize: 19)),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      _greeting,
                      style: GoogleFonts.inter(fontSize: 12, color: Colors.white.withValues(alpha: 0.7)),
                    ),
                    Text(
                      fullName,
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                      style: GoogleFonts.outfit(fontSize: 19, fontWeight: FontWeight.bold, color: Colors.white),
                    ),
                    const SizedBox(height: 4),
                    Container(
                      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                      decoration: BoxDecoration(
                        color: Colors.white.withValues(alpha: 0.12),
                        borderRadius: BorderRadius.circular(6),
                      ),
                      child: Text(
                        className != null ? 'CLASS TEACHER  •  ${className.toUpperCase()}' : 'SUBJECT TEACHER',
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                        style: GoogleFonts.inter(
                          fontSize: 10,
                          fontWeight: FontWeight.w700,
                          letterSpacing: 0.6,
                          color: Colors.white.withValues(alpha: 0.9),
                        ),
                      ),
                    ),
                  ],
                ),
              ),
              HeaderIconButton(
                icon: Icons.notifications_none_rounded,
                tooltip: 'Notifications',
                badgeCount: unreadCount,
                onPressed: () => Navigator.push(context, MaterialPageRoute(builder: (_) => const NotificationsScreen())),
              ),
              PopupMenuButton<String>(
                tooltip: 'More',
                icon: const Icon(Icons.more_vert_rounded, color: Colors.white, size: 22),
                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                onSelected: (value) {
                  if (value == 'settings') ServerSettingsDialog.show(context);
                  if (value == 'logout') _showLogoutDialog();
                },
                itemBuilder: (ctx) => [
                  _buildMenuItem('settings', Icons.settings_outlined, 'Server settings', AppColors.textPrimary),
                  _buildMenuItem('logout', Icons.logout_rounded, 'Sign out', AppColors.absentRed),
                ],
              ),
            ],
          ),
        ),
      ),
    );
  }

  PopupMenuItem<String> _buildMenuItem(String value, IconData icon, String label, Color color) {
    return PopupMenuItem<String>(
      value: value,
      child: Row(
        children: [
          Icon(icon, size: 18, color: color),
          const SizedBox(width: 10),
          Text(label, style: GoogleFonts.inter(fontSize: 13, fontWeight: FontWeight.w600, color: color)),
        ],
      ),
    );
  }

  // --------------------------------------------------------- attendance card

  Widget _buildAttendanceCard(AttendanceProvider att, String className) {
    final total = att.totalStudents;
    final marked = att.presentCount + att.absentCount + att.lateCount + att.excusedCount;
    final unmarked = total - marked;
    final isComplete = total > 0 && unmarked == 0;
    final rate = marked > 0 ? ((att.presentCount + att.lateCount) / marked) * 100 : 0.0;

    return AppCard(
      margin: EdgeInsets.zero,
      padding: const EdgeInsets.all(16),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      "TODAY'S ATTENDANCE",
                      style: GoogleFonts.inter(fontSize: 10, fontWeight: FontWeight.w700, letterSpacing: 0.8, color: AppColors.textMuted),
                    ),
                    const SizedBox(height: 2),
                    Text(
                      '$className  •  $total students',
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                      style: GoogleFonts.outfit(fontSize: 15, fontWeight: FontWeight.bold, color: AppColors.textPrimary),
                    ),
                  ],
                ),
              ),
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 5),
                decoration: BoxDecoration(
                  color: (isComplete ? AppColors.presentGreen : AppColors.lateOrange).withValues(alpha: 0.1),
                  borderRadius: BorderRadius.circular(20),
                ),
                child: Text(
                  total == 0 ? 'No students' : (isComplete ? 'Completed' : '$unmarked to mark'),
                  style: GoogleFonts.inter(
                    fontSize: 11,
                    fontWeight: FontWeight.w700,
                    color: isComplete ? AppColors.presentGreen : AppColors.lateOrange,
                  ),
                ),
              ),
            ],
          ),
          const SizedBox(height: 14),
          Row(
            crossAxisAlignment: CrossAxisAlignment.end,
            children: [
              Text(
                marked > 0 ? '${rate.toStringAsFixed(0)}%' : '—',
                style: GoogleFonts.outfit(fontSize: 36, height: 1, fontWeight: FontWeight.w800, color: AppColors.textPrimary),
              ),
              const SizedBox(width: 8),
              Padding(
                padding: const EdgeInsets.only(bottom: 4),
                child: Text(
                  marked > 0 ? 'in class today' : 'register not marked yet',
                  style: GoogleFonts.inter(fontSize: 12, color: AppColors.textSecondary),
                ),
              ),
            ],
          ),
          const SizedBox(height: 12),
          ClipRRect(
            borderRadius: BorderRadius.circular(6),
            child: SizedBox(
              height: 8,
              child: total == 0
                  ? Container(color: AppColors.border)
                  : Row(
                      children: [
                        if (att.presentCount > 0) Expanded(flex: att.presentCount, child: Container(color: AppColors.presentGreen)),
                        if (att.lateCount > 0) Expanded(flex: att.lateCount, child: Container(color: AppColors.lateOrange)),
                        if (att.excusedCount > 0) Expanded(flex: att.excusedCount, child: Container(color: AppColors.excusedBlue)),
                        if (att.absentCount > 0) Expanded(flex: att.absentCount, child: Container(color: AppColors.absentRed)),
                        if (unmarked > 0) Expanded(flex: unmarked, child: Container(color: AppColors.border)),
                      ],
                    ),
            ),
          ),
          const SizedBox(height: 12),
          Row(
            children: [
              _buildLegend('Present', att.presentCount, AppColors.presentGreen),
              _buildLegend('Late', att.lateCount, AppColors.lateOrange),
              _buildLegend('Excused', att.excusedCount, AppColors.excusedBlue),
              _buildLegend('Absent', att.absentCount, AppColors.absentRed),
            ],
          ),
          const SizedBox(height: 14),
          PrimaryButton(
            label: isComplete ? 'Review Register' : 'Mark Register',
            icon: Icons.fact_check_outlined,
            onPressed: () => widget.onNavigate?.call(_tabAttendance),
          ),
        ],
      ),
    );
  }

  Widget _buildLegend(String label, int count, Color color) {
    return Expanded(
      child: Column(
        children: [
          Text('$count', style: GoogleFonts.outfit(fontSize: 17, fontWeight: FontWeight.bold, color: AppColors.textPrimary)),
          const SizedBox(height: 2),
          Row(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              Container(width: 6, height: 6, decoration: BoxDecoration(color: color, shape: BoxShape.circle)),
              const SizedBox(width: 4),
              Flexible(
                child: Text(
                  label,
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                  style: GoogleFonts.inter(fontSize: 11, fontWeight: FontWeight.w500, color: AppColors.textSecondary),
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }

  Widget _buildNoClassCard() {
    return AppCard(
      margin: EdgeInsets.zero,
      padding: const EdgeInsets.all(16),
      child: Row(
        children: [
          const IconTile(icon: Icons.school_outlined, color: AppColors.accent, size: 46),
          const SizedBox(width: 14),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  'No class register',
                  style: GoogleFonts.outfit(fontSize: 15, fontWeight: FontWeight.bold, color: AppColors.textPrimary),
                ),
                const SizedBox(height: 2),
                Text(
                  'You are not assigned as a class teacher. Your teaching periods are in the Timetable tab.',
                  style: GoogleFonts.inter(fontSize: 12, height: 1.35, color: AppColors.textSecondary),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  // ------------------------------------------------------------- small parts

  void _openMyClass({bool atRiskOnly = false}) {
    Navigator.push(context, MaterialPageRoute(builder: (_) => MyClassScreen(startOnAtRisk: atRiskOnly)));
  }

  /// Today's absentees with one-tap guardian calls, shown once the register has absences.
  Widget _buildAbsentFollowUp(List<StudentModel> absentees) {
    if (absentees.isEmpty) return const SizedBox.shrink();

    return Padding(
      padding: const EdgeInsets.only(top: 12),
      child: AppCard(
        margin: EdgeInsets.zero,
        padding: const EdgeInsets.fromLTRB(16, 14, 12, 8),
        borderColor: AppColors.absentRed.withValues(alpha: 0.3),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                const Icon(Icons.phone_in_talk_outlined, size: 16, color: AppColors.absentRed),
                const SizedBox(width: 8),
                Expanded(
                  child: Text(
                    'Absent today (${absentees.length})  •  follow up',
                    style: GoogleFonts.outfit(fontSize: 14, fontWeight: FontWeight.bold, color: AppColors.textPrimary),
                  ),
                ),
                GestureDetector(
                  behavior: HitTestBehavior.opaque,
                  onTap: _openMyClass,
                  child: Padding(
                    padding: const EdgeInsets.all(4),
                    child: Text(
                      'My class',
                      style: GoogleFonts.inter(fontSize: 12, fontWeight: FontWeight.w700, color: AppColors.accent),
                    ),
                  ),
                ),
              ],
            ),
            const SizedBox(height: 6),
            ...absentees.take(5).map(
                  (student) => Padding(
                    padding: const EdgeInsets.symmetric(vertical: 5),
                    child: Row(
                      children: [
                        Expanded(
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Text(
                                student.fullName,
                                maxLines: 1,
                                overflow: TextOverflow.ellipsis,
                                style: GoogleFonts.inter(fontSize: 13, fontWeight: FontWeight.w700, color: AppColors.textPrimary),
                              ),
                              Text(
                                student.guardianName.isEmpty
                                    ? (student.guardianPhone.isEmpty ? 'No guardian contact on file' : student.guardianPhone)
                                    : 'Guardian: ${student.guardianName}',
                                maxLines: 1,
                                overflow: TextOverflow.ellipsis,
                                style: GoogleFonts.inter(fontSize: 11, color: AppColors.textMuted),
                              ),
                            ],
                          ),
                        ),
                        CallGuardianButton(phone: student.guardianPhone),
                      ],
                    ),
                  ),
                ),
            if (absentees.length > 5)
              Padding(
                padding: const EdgeInsets.only(top: 2, bottom: 6),
                child: Text(
                  '+ ${absentees.length - 5} more in My Class',
                  style: GoogleFonts.inter(fontSize: 11, color: AppColors.textMuted),
                ),
              ),
          ],
        ),
      ),
    );
  }

  Widget _buildQuickAction(String label, IconData icon, Color color, int? tabIndex, {VoidCallback? onTap}) {
    return Expanded(
      child: GestureDetector(
        behavior: HitTestBehavior.opaque,
        onTap: onTap ?? () => widget.onNavigate?.call(tabIndex ?? 0),
        child: Container(
          margin: const EdgeInsets.symmetric(horizontal: 4),
          padding: const EdgeInsets.symmetric(vertical: 14, horizontal: 4),
          decoration: BoxDecoration(
            color: AppColors.surface,
            borderRadius: BorderRadius.circular(14),
            border: Border.all(color: AppColors.border),
            boxShadow: AppColors.softShadow,
          ),
          child: Column(
            children: [
              IconTile(icon: icon, color: color),
              const SizedBox(height: 8),
              Text(
                label,
                maxLines: 1,
                overflow: TextOverflow.ellipsis,
                style: GoogleFonts.inter(fontSize: 11, fontWeight: FontWeight.w700, color: AppColors.textPrimary),
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildPeriodRow(TimetableSlotModel slot) {
    return AppCard(
      margin: const EdgeInsets.only(bottom: 8),
      padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
      onTap: () => widget.onNavigate?.call(_tabTimetable),
      child: Row(
        children: [
          SizedBox(
            width: 54,
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(slot.startTime, style: GoogleFonts.outfit(fontSize: 15, fontWeight: FontWeight.bold, color: AppColors.textPrimary)),
                Text(slot.endTime, style: GoogleFonts.inter(fontSize: 11, color: AppColors.textMuted)),
              ],
            ),
          ),
          Container(width: 3, height: 34, margin: const EdgeInsets.only(right: 12), decoration: BoxDecoration(color: AppColors.accent, borderRadius: BorderRadius.circular(2))),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  slot.subjectLabel,
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                  style: GoogleFonts.outfit(fontSize: 14, fontWeight: FontWeight.bold, color: AppColors.textPrimary),
                ),
                const SizedBox(height: 2),
                Text(
                  [slot.classLabel, if (slot.room.isNotEmpty) slot.room].join('  •  '),
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                  style: GoogleFonts.inter(fontSize: 12, color: AppColors.textSecondary),
                ),
              ],
            ),
          ),
          Text(
            'P${slot.periodNo}',
            style: GoogleFonts.inter(fontSize: 11, fontWeight: FontWeight.w700, color: AppColors.textMuted),
          ),
        ],
      ),
    );
  }

  Widget _buildLeaveFigure(String value, String label, Color color) {
    return Expanded(
      child: Column(
        children: [
          Text(value, style: GoogleFonts.outfit(fontSize: 20, fontWeight: FontWeight.bold, color: color)),
          const SizedBox(height: 2),
          Text(label, style: GoogleFonts.inter(fontSize: 11, fontWeight: FontWeight.w600, color: AppColors.textSecondary)),
        ],
      ),
    );
  }

  Widget _buildFigureDivider() => Container(width: 1, height: 30, color: AppColors.border);
}
