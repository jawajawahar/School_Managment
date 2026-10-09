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
          'Mark Daily Attendance',
          style: GoogleFonts.outfit(fontWeight: FontWeight.w800, color: AppColors.textPrimary, fontSize: 20),
        ),
        backgroundColor: Colors.white,
        elevation: 0.5,
        centerTitle: false,
        actions: [
          IconButton(
            icon: const Icon(Icons.settings_rounded, color: AppColors.primary),
            tooltip: 'Server Settings',
            onPressed: () => ServerSettingsDialog.show(context),
          ),
          IconButton(
            icon: const Icon(Icons.refresh_rounded, color: AppColors.primary),
            tooltip: 'Refresh Classes & Students',
            onPressed: () {
              attProvider.loadClasses(preferredClassId: user?.assignedClassId, userRole: user?.role, user: user);
            },
          ),
        ],
      ),
      body: SafeArea(
        child: Column(
          children: [
            // Controls Card (Class Selector & Batch Buttons)
            Container(
              color: Colors.white,
              padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 14),
              child: Column(
                children: [
                  Row(
                    children: [
                      // Class Selector (Dropdown for Admin/Principal, Locked Badge for Class Teacher)
                      Expanded(
                        child: () {
                          final userClasses = attProvider.getClassesForUser(user);
                          if (userClasses.length > 1) {
                            return Container(
                              padding: const EdgeInsets.symmetric(horizontal: 14),
                              decoration: BoxDecoration(
                                color: AppColors.background,
                                borderRadius: BorderRadius.circular(14),
                                border: Border.all(color: AppColors.primary.withValues(alpha: 0.15)),
                              ),
                              child: DropdownButtonHideUnderline(
                                child: DropdownButton<String>(
                                  value: attProvider.selectedClassId,
                                  isExpanded: true,
                                  hint: Text('Select Class', style: GoogleFonts.outfit(fontWeight: FontWeight.w600)),
                                  items: userClasses.map((c) {
                                    return DropdownMenuItem<String>(
                                      value: c['id'],
                                      child: Text(
                                        '${c['grade']} (${c['section']})',
                                        style: GoogleFonts.outfit(fontWeight: FontWeight.w800, fontSize: 15, color: AppColors.textPrimary),
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
                              padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
                              decoration: BoxDecoration(
                                color: AppColors.background,
                                borderRadius: BorderRadius.circular(14),
                                border: Border.all(color: AppColors.primary.withValues(alpha: 0.2)),
                              ),
                              child: Row(
                                children: [
                                  const Icon(Icons.school_rounded, color: AppColors.primary, size: 18),
                                  const SizedBox(width: 8),
                                  Expanded(
                                    child: Text(
                                      attProvider.selectedClassName,
                                      style: GoogleFonts.outfit(
                                        fontWeight: FontWeight.w800,
                                        fontSize: 15,
                                        color: AppColors.textPrimary,
                                      ),
                                      overflow: TextOverflow.ellipsis,
                                    ),
                                  ),
                                  Container(
                                    padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                                    decoration: BoxDecoration(
                                      color: AppColors.primary.withValues(alpha: 0.1),
                                      borderRadius: BorderRadius.circular(8),
                                    ),
                                    child: Row(
                                      mainAxisSize: MainAxisSize.min,
                                      children: [
                                        const Icon(Icons.lock_rounded, size: 11, color: AppColors.primary),
                                        const SizedBox(width: 4),
                                        Text(
                                          'Assigned Class',
                                          style: GoogleFonts.inter(
                                            fontSize: 10,
                                            fontWeight: FontWeight.bold,
                                            color: AppColors.primary,
                                          ),
                                        ),
                                      ],
                                    ),
                                  ),
                                ],
                              ),
                            );
                          }
                        }(),
                      ),
                      const SizedBox(width: 12),
                      // Date Selector
                      Container(
                        padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
                        decoration: BoxDecoration(
                          color: AppColors.primary.withValues(alpha: 0.1),
                          borderRadius: BorderRadius.circular(14),
                          border: Border.all(color: AppColors.primary.withValues(alpha: 0.2)),
                        ),
                        child: Row(
                          children: [
                            const Icon(Icons.calendar_today_rounded, color: AppColors.primary, size: 16),
                            const SizedBox(width: 6),
                            Text(
                              attProvider.selectedDate,
                              style: GoogleFonts.outfit(
                                color: AppColors.primary,
                                fontWeight: FontWeight.w800,
                                fontSize: 13,
                              ),
                            ),
                          ],
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 14),

                  // Quick Batch Actions (Modern Rounded Pills)
                  Row(
                    children: [
                      _buildQuickActionBtn(
                        label: 'All Present',
                        icon: Icons.check_circle_rounded,
                        color: AppColors.presentGreen,
                        onTap: () => attProvider.markAll('present'),
                      ),
                      const SizedBox(width: 12),
                      _buildQuickActionBtn(
                        label: 'All Absent',
                        icon: Icons.cancel_rounded,
                        color: AppColors.absentRed,
                        onTap: () => attProvider.markAll('absent'),
                      ),
                    ],
                  ),
                ],
              ),
            ),

            const Divider(height: 1),

            // Student Roster List
            Expanded(
              child: attProvider.isLoadingStudents
                  ? const Center(child: CircularProgressIndicator())
                  : attProvider.students.isEmpty
                      ? Center(
                          child: Text(
                            'No students enrolled in this class.',
                            style: GoogleFonts.inter(color: AppColors.textMuted, fontSize: 14),
                          ),
                        )
                      : ListView.builder(
                          keyboardDismissBehavior: ScrollViewKeyboardDismissBehavior.onDrag,
                          padding: const EdgeInsets.all(16),
                          itemCount: attProvider.students.length,
                          itemBuilder: (context, index) {
                            final student = attProvider.students[index];
                            return GlassCard(
                              margin: const EdgeInsets.only(bottom: 10),
                              padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
                              child: Row(
                                children: [
                                  CircleAvatar(
                                    radius: 20,
                                    backgroundColor: AppColors.primary.withValues(alpha: 0.1),
                                    child: Text(
                                      '${index + 1}',
                                      style: GoogleFonts.outfit(
                                        color: AppColors.primary,
                                        fontWeight: FontWeight.w900,
                                      ),
                                    ),
                                  ),
                                  const SizedBox(width: 12),
                                  Expanded(
                                    child: Column(
                                      crossAxisAlignment: CrossAxisAlignment.start,
                                      children: [
                                        Text(
                                          student.fullName,
                                          style: GoogleFonts.outfit(
                                            fontSize: 16,
                                            fontWeight: FontWeight.w800,
                                            color: AppColors.textPrimary,
                                          ),
                                        ),
                                        Text(
                                          student.studentNo,
                                          style: GoogleFonts.inter(
                                            fontSize: 12,
                                            fontWeight: FontWeight.w500,
                                            color: AppColors.textMuted,
                                          ),
                                        ),
                                      ],
                                    ),
                                  ),

                                  // Modern Status Selector Dropdown
                                  _buildStatusDropdownSelector(context, student, attProvider),
                                ],
                              ),
                            ).animate().fade(duration: 300.ms, delay: Duration(milliseconds: index * 25));
                          },
                        ),
            ),

            // Save Attendance Footer (Only visible when ALL students are marked)
            AnimatedCrossFade(
              duration: 300.ms,
              crossFadeState: isAllMarked ? CrossFadeState.showFirst : CrossFadeState.showSecond,
              firstChild: Container(
                padding: const EdgeInsets.all(16),
                decoration: BoxDecoration(
                  color: Colors.white,
                  boxShadow: AppColors.softShadow,
                ),
                child: SizedBox(
                  width: double.infinity,
                  height: 52,
                  child: ElevatedButton(
                    onPressed: attProvider.isSubmitting
                        ? null
                        : () async {
                            final teacherName = user?.fullName ?? 'Teacher';
                            final ok = await attProvider.submitAttendance(teacherName);
                            if (ok && context.mounted) {
                              ScaffoldMessenger.of(context).showSnackBar(
                                SnackBar(
                                  content: Text(attProvider.message ?? 'Attendance saved!'),
                                  backgroundColor: AppColors.presentGreen,
                                ),
                              );
                            }
                          },
                    style: ElevatedButton.styleFrom(
                      backgroundColor: AppColors.primary,
                      elevation: 4,
                      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
                    ),
                    child: attProvider.isSubmitting
                        ? const SizedBox(width: 24, height: 24, child: CircularProgressIndicator(color: Colors.white))
                        : Row(
                            mainAxisAlignment: MainAxisAlignment.center,
                            children: [
                              const Icon(Icons.cloud_upload_rounded, color: Colors.white, size: 20),
                              const SizedBox(width: 8),
                              Text(
                                'Save Daily Attendance Register',
                                style: GoogleFonts.outfit(
                                  fontSize: 16,
                                  fontWeight: FontWeight.w900,
                                  color: Colors.white,
                                ),
                              ),
                            ],
                          ),
                  ),
                ),
              ),
              secondChild: Container(
                padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 14),
                decoration: BoxDecoration(
                  color: Colors.white,
                  boxShadow: AppColors.softShadow,
                ),
                child: Row(
                  children: [
                    Container(
                      padding: const EdgeInsets.all(8),
                      decoration: BoxDecoration(
                        color: AppColors.accentAmber.withValues(alpha: 0.15),
                        shape: BoxShape.circle,
                      ),
                      child: const Icon(Icons.assignment_late_rounded, color: AppColors.accentAmber, size: 20),
                    ),
                    const SizedBox(width: 12),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        mainAxisSize: MainAxisSize.min,
                        children: [
                          Text(
                            'Mark All Students to Save',
                            style: GoogleFonts.outfit(fontWeight: FontWeight.bold, fontSize: 14, color: AppColors.textPrimary),
                          ),
                          const SizedBox(height: 2),
                          Text(
                            '$markedStudents of $totalStudents students marked',
                            style: GoogleFonts.inter(fontWeight: FontWeight.w500, fontSize: 12, color: AppColors.textSecondary),
                          ),
                        ],
                      ),
                    ),
                    TextButton.icon(
                      onPressed: () => attProvider.markAll('present'),
                      icon: const Icon(Icons.done_all_rounded, size: 16, color: AppColors.primary),
                      label: Text(
                        'Mark All',
                        style: GoogleFonts.outfit(fontWeight: FontWeight.bold, fontSize: 13, color: AppColors.primary),
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
      child: Material(
        color: Colors.transparent,
        child: InkWell(
          onTap: onTap,
          borderRadius: BorderRadius.circular(30),
          child: Container(
            padding: const EdgeInsets.symmetric(vertical: 10, horizontal: 16),
            decoration: BoxDecoration(
              color: color.withValues(alpha: 0.1),
              borderRadius: BorderRadius.circular(30),
              border: Border.all(color: color.withValues(alpha: 0.28), width: 1.2),
            ),
            child: Row(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                Icon(icon, color: color, size: 18),
                const SizedBox(width: 8),
                Text(
                  label,
                  style: GoogleFonts.outfit(
                    color: color,
                    fontWeight: FontWeight.w800,
                    fontSize: 13,
                  ),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }

  Widget _buildStatusDropdownSelector(BuildContext context, StudentModel student, AttendanceProvider attProvider) {
    Color bg;
    Color border;
    Color textCol;
    IconData icon;
    String label;

    switch (student.attendanceStatus.toLowerCase()) {
      case 'present':
        bg = const Color(0xFFDCFCE7);
        border = const Color(0xFF86EFAC);
        textCol = const Color(0xFF15803D);
        icon = Icons.check_circle_rounded;
        label = 'Present';
        break;
      case 'absent':
        bg = const Color(0xFFFEE2E2);
        border = const Color(0xFFFCA5A5);
        textCol = const Color(0xFFB91C1C);
        icon = Icons.cancel_rounded;
        label = 'Absent';
        break;
      case 'late':
        bg = const Color(0xFFFFEDD5);
        border = const Color(0xFFFDBA74);
        textCol = const Color(0xFFC2410C);
        icon = Icons.access_time_filled_rounded;
        label = 'Late';
        break;
      case 'excused':
        bg = const Color(0xFFDBEAFE);
        border = const Color(0xFF93C5FD);
        textCol = const Color(0xFF1D4ED8);
        icon = Icons.info_rounded;
        label = 'Excused';
        break;
      default:
        bg = Colors.grey.shade100;
        border = Colors.grey.shade300;
        textCol = AppColors.textMuted;
        icon = Icons.help_outline_rounded;
        label = 'Select';
    }

    return PopupMenuButton<String>(
      onSelected: (val) {
        attProvider.updateStudentStatus(student.id, val);
      },
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
      elevation: 6,
      offset: const Offset(0, 40),
      itemBuilder: (ctx) => [
        _buildPopupMenuItem('present', 'Present', Icons.check_circle_rounded, const Color(0xFF15803D), const Color(0xFFDCFCE7)),
        _buildPopupMenuItem('absent', 'Absent', Icons.cancel_rounded, const Color(0xFFB91C1C), const Color(0xFFFEE2E2)),
        _buildPopupMenuItem('late', 'Late', Icons.access_time_filled_rounded, const Color(0xFFC2410C), const Color(0xFFFFEDD5)),
        _buildPopupMenuItem('excused', 'Excused', Icons.info_rounded, const Color(0xFF1D4ED8), const Color(0xFFDBEAFE)),
      ],
      child: AnimatedContainer(
        duration: const Duration(milliseconds: 200),
        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 7),
        decoration: BoxDecoration(
          color: bg,
          borderRadius: BorderRadius.circular(20),
          border: Border.all(color: border, width: 1.2),
          boxShadow: [
            BoxShadow(
              color: textCol.withValues(alpha: 0.08),
              blurRadius: 6,
              offset: const Offset(0, 2),
            ),
          ],
        ),
        child: Row(
          mainAxisSize: MainAxisSize.min,
          children: [
            Icon(icon, size: 16, color: textCol),
            const SizedBox(width: 6),
            Text(
              label,
              style: GoogleFonts.outfit(
                color: textCol,
                fontWeight: FontWeight.w800,
                fontSize: 13,
              ),
            ),
            const SizedBox(width: 4),
            Icon(Icons.unfold_more_rounded, size: 16, color: textCol.withValues(alpha: 0.8)),
          ],
        ),
      ),
    );
  }

  PopupMenuItem<String> _buildPopupMenuItem(String value, String title, IconData icon, Color color, Color bg) {
    return PopupMenuItem<String>(
      value: value,
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
        decoration: BoxDecoration(
          color: bg.withValues(alpha: 0.5),
          borderRadius: BorderRadius.circular(10),
        ),
        child: Row(
          children: [
            Icon(icon, color: color, size: 18),
            const SizedBox(width: 10),
            Text(
              title,
              style: GoogleFonts.outfit(color: color, fontWeight: FontWeight.bold, fontSize: 14),
            ),
          ],
        ),
      ),
    );
  }
}
