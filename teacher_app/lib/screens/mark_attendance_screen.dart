import 'package:flutter/material.dart';
import 'package:flutter_animate/flutter_animate.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:provider/provider.dart';
import '../constants/app_colors.dart';
import '../models/student_model.dart';
import '../providers/auth_provider.dart';
import '../providers/attendance_provider.dart';
import '../widgets/glass_card.dart';
import '../widgets/server_settings_dialog.dart';

class MarkAttendanceScreen extends StatelessWidget {
  const MarkAttendanceScreen({super.key});

  @override
  Widget build(BuildContext context) {
    final attProvider = Provider.of<AttendanceProvider>(context);
    final user = Provider.of<AuthProvider>(context).currentUser;

    final totalStudents = attProvider.students.length;
    final markedStudents = attProvider.students.where((s) =>
        s.attendanceStatus.isNotEmpty &&
        s.attendanceStatus != 'unmarked' &&
        s.attendanceStatus != 'select').length;
    final isAllMarked = totalStudents > 0 && markedStudents == totalStudents;

    return Scaffold(
      backgroundColor: AppColors.background,
      appBar: AppBar(
        title: Text(
          'Daily Attendance',
          style: GoogleFonts.outfit(fontWeight: FontWeight.bold, color: AppColors.textPrimary, fontSize: 18),
        ),
        backgroundColor: Colors.white,
        elevation: 0,
        surfaceTintColor: Colors.transparent,
        bottom: const PreferredSize(
          preferredSize: Size.fromHeight(1),
          child: Divider(height: 1, color: AppColors.border),
        ),
        actions: [
          IconButton(
            icon: const Icon(Icons.settings_outlined, color: AppColors.textPrimary, size: 20),
            tooltip: 'Server Settings',
            onPressed: () => ServerSettingsDialog.show(context),
          ),
          IconButton(
            icon: const Icon(Icons.refresh_rounded, color: AppColors.textPrimary, size: 20),
            tooltip: 'Refresh Roster',
            onPressed: () {
              final auth = Provider.of<AuthProvider>(context, listen: false);
              auth.refreshProfile().then((_) {
                final fresh = auth.currentUser;
                attProvider.loadClasses(preferredClassId: fresh?.assignedClassId, userRole: fresh?.role, user: fresh);
              });
            },
          ),
        ],
      ),
      body: SafeArea(
        child: Column(
          children: [
            // Responsive Control Panel (Class & Date & Quick Actions)
            Container(
              color: Colors.white,
              padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
              child: Column(
                children: [
                  Row(
                    children: [
                      // Class Selector / Label
                      Expanded(
                        child: () {
                          final userClasses = attProvider.getClassesForUser(user);
                          if (userClasses.length > 1) {
                            return Container(
                              padding: const EdgeInsets.symmetric(horizontal: 12),
                              decoration: BoxDecoration(
                                color: AppColors.background,
                                borderRadius: BorderRadius.circular(8),
                                border: Border.all(color: AppColors.border),
                              ),
                              child: DropdownButtonHideUnderline(
                                child: DropdownButton<String>(
                                  value: attProvider.selectedClassId,
                                  isExpanded: true,
                                  hint: Text('Select Class', style: GoogleFonts.inter(fontWeight: FontWeight.w600, fontSize: 13)),
                                  items: userClasses.map((c) {
                                    return DropdownMenuItem<String>(
                                      value: c['id'],
                                      child: Text(
                                        '${c['grade']} (${c['section']})',
                                        style: GoogleFonts.outfit(fontWeight: FontWeight.bold, fontSize: 14, color: AppColors.textPrimary),
                                      ),
                                    );
                                  }).toList(),
                                  onChanged: (val) {
                                    if (val != null) attProvider.setClassId(val);
                                  },
                                ),
                              ),
                            );
                          } else {
                            return Container(
                              padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
                              decoration: BoxDecoration(
                                color: AppColors.background,
                                borderRadius: BorderRadius.circular(8),
                                border: Border.all(color: AppColors.border),
                              ),
                              child: Row(
                                children: [
                                  const Icon(Icons.school_outlined, color: AppColors.textSecondary, size: 16),
                                  const SizedBox(width: 8),
                                  Expanded(
                                    child: Text(
                                      attProvider.selectedClassName,
                                      style: GoogleFonts.outfit(
                                        fontWeight: FontWeight.bold,
                                        fontSize: 14,
                                        color: AppColors.textPrimary,
                                      ),
                                      maxLines: 1,
                                      overflow: TextOverflow.ellipsis,
                                    ),
                                  ),
                                ],
                              ),
                            );
                          }
                        }(),
                      ),
                      const SizedBox(width: 10),
                      // Date Selector Badge
                      Container(
                        padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 10),
                        decoration: BoxDecoration(
                          color: AppColors.background,
                          borderRadius: BorderRadius.circular(8),
                          border: Border.all(color: AppColors.border),
                        ),
                        child: Row(
                          mainAxisSize: MainAxisSize.min,
                          children: [
                            const Icon(Icons.calendar_today_rounded, color: AppColors.accent, size: 14),
                            const SizedBox(width: 6),
                            Text(
                              attProvider.selectedDate,
                              style: GoogleFonts.inter(
                                color: AppColors.textPrimary,
                                fontWeight: FontWeight.w700,
                                fontSize: 12,
                              ),
                            ),
                          ],
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 10),

                  // Quick Actions Row (All Present / All Absent)
                  Row(
                    children: [
                      _buildQuickActionBtn(
                        label: 'All Present',
                        icon: Icons.check_circle_outline_rounded,
                        color: AppColors.presentGreen,
                        onTap: () => attProvider.markAll('present'),
                      ),
                      const SizedBox(width: 8),
                      _buildQuickActionBtn(
                        label: 'All Absent',
                        icon: Icons.highlight_off_rounded,
                        color: AppColors.absentRed,
                        onTap: () => attProvider.markAll('absent'),
                      ),
                    ],
                  ),
                ],
              ),
            ),

            const Divider(height: 1, color: AppColors.border),

            // Student Roster List
            Expanded(
              child: attProvider.isLoadingStudents
                  ? const Center(child: CircularProgressIndicator())
                  : attProvider.students.isEmpty
                      ? Center(
                          child: Text(
                            attProvider.selectedClassId == null
                                ? 'You are not assigned as a class teacher yet.\nAsk the Principal to assign your class, then tap refresh.'
                                : 'No students enrolled in this class.',
                            textAlign: TextAlign.center,
                            style: GoogleFonts.inter(color: AppColors.textMuted, fontSize: 14),
                          ),
                        )
                      : ListView.builder(
                          keyboardDismissBehavior: ScrollViewKeyboardDismissBehavior.onDrag,
                          padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
                          itemCount: attProvider.students.length,
                          itemBuilder: (context, index) {
                            final student = attProvider.students[index];
                            return GlassCard(
                              margin: const EdgeInsets.only(bottom: 8),
                              padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
                              child: Row(
                                children: [
                                  CircleAvatar(
                                    radius: 16,
                                    backgroundColor: AppColors.background,
                                    child: Text(
                                      '${index + 1}',
                                      style: GoogleFonts.outfit(
                                        color: AppColors.textSecondary,
                                        fontWeight: FontWeight.bold,
                                        fontSize: 12,
                                      ),
                                    ),
                                  ),
                                  const SizedBox(width: 10),
                                  Expanded(
                                    child: Column(
                                      crossAxisAlignment: CrossAxisAlignment.start,
                                      children: [
                                        Text(
                                          student.fullName,
                                          style: GoogleFonts.outfit(
                                            fontSize: 15,
                                            fontWeight: FontWeight.bold,
                                            color: AppColors.textPrimary,
                                          ),
                                          maxLines: 1,
                                          overflow: TextOverflow.ellipsis,
                                        ),
                                        Text(
                                          student.studentNo,
                                          style: GoogleFonts.inter(
                                            fontSize: 11,
                                            color: AppColors.textMuted,
                                          ),
                                        ),
                                      ],
                                    ),
                                  ),
                                  const SizedBox(width: 8),

                                  // Minimal Status Selector Dropdown
                                  _buildStatusDropdownSelector(context, student, attProvider),
                                ],
                              ),
                            );
                          },
                        ),
            ),

            // Save Attendance Footer
            AnimatedCrossFade(
              duration: 250.ms,
              crossFadeState: isAllMarked ? CrossFadeState.showFirst : CrossFadeState.showSecond,
              firstChild: Container(
                padding: const EdgeInsets.all(16),
                decoration: const BoxDecoration(
                  color: Colors.white,
                  border: Border(top: BorderSide(color: AppColors.border)),
                ),
                child: SizedBox(
                  width: double.infinity,
                  height: 48,
                  child: ElevatedButton(
                    onPressed: attProvider.isSubmitting
                        ? null
                        : () async {
                            final teacherName = user?.fullName ?? 'Teacher';
                            final ok = await attProvider.submitAttendance(teacherName);
                            if (context.mounted) {
                              ScaffoldMessenger.of(context).showSnackBar(
                                SnackBar(
                                  content: Text(attProvider.message ?? (ok ? 'Attendance saved!' : 'Attendance was not saved.')),
                                  backgroundColor: ok ? AppColors.presentGreen : AppColors.absentRed,
                                ),
                              );
                            }
                          },
                    style: ElevatedButton.styleFrom(
                      backgroundColor: AppColors.accent,
                      elevation: 0,
                      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                    ),
                    child: attProvider.isSubmitting
                        ? const SizedBox(width: 20, height: 20, child: CircularProgressIndicator(color: Colors.white, strokeWidth: 2))
                        : Row(
                            mainAxisAlignment: MainAxisAlignment.center,
                            children: [
                              const Icon(Icons.cloud_upload_outlined, color: Colors.white, size: 18),
                              const SizedBox(width: 8),
                              Text(
                                'Save Attendance Register',
                                style: GoogleFonts.outfit(
                                  fontSize: 15,
                                  fontWeight: FontWeight.bold,
                                  color: Colors.white,
                                ),
                              ),
                            ],
                          ),
                  ),
                ),
              ),
              secondChild: Container(
                padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
                decoration: const BoxDecoration(
                  color: Colors.white,
                  border: Border(top: BorderSide(color: AppColors.border)),
                ),
                child: Row(
                  children: [
                    const Icon(Icons.info_outline_rounded, color: AppColors.lateOrange, size: 18),
                    const SizedBox(width: 10),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        mainAxisSize: MainAxisSize.min,
                        children: [
                          Text(
                            'Attendance Pending',
                            style: GoogleFonts.outfit(fontWeight: FontWeight.bold, fontSize: 13, color: AppColors.textPrimary),
                          ),
                          Text(
                            '$markedStudents of $totalStudents marked',
                            style: GoogleFonts.inter(fontSize: 11, color: AppColors.textMuted),
                          ),
                        ],
                      ),
                    ),
                    TextButton(
                      onPressed: () => attProvider.markAll('present'),
                      child: Text(
                        'Mark All',
                        style: GoogleFonts.inter(fontWeight: FontWeight.bold, fontSize: 12, color: AppColors.accent),
                      ),
                    ),
                  ],
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildQuickActionBtn({
    required String label,
    required IconData icon,
    required Color color,
    required VoidCallback onTap,
  }) {
    return Expanded(
      child: InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(8),
        child: Container(
          padding: const EdgeInsets.symmetric(vertical: 8, horizontal: 10),
          decoration: BoxDecoration(
            color: color.withValues(alpha: 0.06),
            borderRadius: BorderRadius.circular(8),
            border: Border.all(color: color.withValues(alpha: 0.2)),
          ),
          child: Row(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              Icon(icon, color: color, size: 16),
              const SizedBox(width: 6),
              FittedBox(
                fit: BoxFit.scaleDown,
                child: Text(
                  label,
                  style: GoogleFonts.outfit(
                    color: color,
                    fontWeight: FontWeight.bold,
                    fontSize: 12,
                  ),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildStatusDropdownSelector(BuildContext context, StudentModel student, AttendanceProvider attProvider) {
    Color border;
    Color textCol;
    String label;

    switch (student.attendanceStatus.toLowerCase()) {
      case 'present':
        border = AppColors.presentGreen;
        textCol = AppColors.presentGreen;
        label = 'Present';
        break;
      case 'absent':
        border = AppColors.absentRed;
        textCol = AppColors.absentRed;
        label = 'Absent';
        break;
      case 'late':
        border = AppColors.lateOrange;
        textCol = AppColors.lateOrange;
        label = 'Late';
        break;
      case 'excused':
        border = AppColors.accent;
        textCol = AppColors.accent;
        label = 'Excused';
        break;
      default:
        border = AppColors.border;
        textCol = AppColors.textMuted;
        label = 'Select';
    }

    return PopupMenuButton<String>(
      onSelected: (val) => attProvider.updateStudentStatus(student.id, val),
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
      elevation: 4,
      offset: const Offset(0, 36),
      itemBuilder: (ctx) => [
        _buildPopupMenuItem('present', 'Present', AppColors.presentGreen),
        _buildPopupMenuItem('absent', 'Absent', AppColors.absentRed),
        _buildPopupMenuItem('late', 'Late', AppColors.lateOrange),
        _buildPopupMenuItem('excused', 'Excused', AppColors.accent),
      ],
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
        decoration: BoxDecoration(
          color: Colors.white,
          borderRadius: BorderRadius.circular(6),
          border: Border.all(color: border, width: 1.0),
        ),
        child: Row(
          mainAxisSize: MainAxisSize.min,
          children: [
            Text(
              label,
              style: GoogleFonts.inter(
                color: textCol,
                fontWeight: FontWeight.w700,
                fontSize: 12,
              ),
            ),
            const SizedBox(width: 4),
            Icon(Icons.keyboard_arrow_down_rounded, size: 14, color: textCol),
          ],
        ),
      ),
    );
  }

  PopupMenuItem<String> _buildPopupMenuItem(String value, String title, Color color) {
    return PopupMenuItem<String>(
      value: value,
      child: Text(
        title,
        style: GoogleFonts.inter(color: color, fontWeight: FontWeight.bold, fontSize: 13),
      ),
    );
  }
}
