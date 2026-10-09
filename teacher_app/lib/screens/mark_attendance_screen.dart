import 'package:flutter/material.dart';
import 'package:flutter_animate/flutter_animate.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:provider/provider.dart';
import '../constants/app_colors.dart';
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
              attProvider.loadClasses(preferredClassId: user?.assignedClassId);
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
                      // Class Dropdown
                      Expanded(
                        child: Container(
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
                              items: attProvider.classes.map((c) {
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
                        ),
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

                  // Quick Batch Actions
                  Row(
                    children: [
                      _buildQuickActionBtn(
                        label: 'All Present',
                        color: AppColors.presentGreen,
                        onTap: () => attProvider.markAll('present'),
                      ),
                      const SizedBox(width: 8),
                      _buildQuickActionBtn(
                        label: 'All Absent',
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
                  : ListView.builder(
                      keyboardDismissBehavior: ScrollViewKeyboardDismissBehavior.onDrag,
                      padding: const EdgeInsets.all(16),
                      itemCount: attProvider.students.length,
                      itemBuilder: (context, index) {
                        final student = attProvider.students[index];
                        return GlassCard(
                          margin: const EdgeInsets.only(bottom: 10),
                          padding: const EdgeInsets.all(14),
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

                              // Status Selector Pill Buttons
                              Row(
                                children: [
                                  _buildStatusTogglePill(
                                    label: 'P',
                                    statusKey: 'present',
                                    activeColor: AppColors.presentGreen,
                                    student: student,
                                    onTap: () => attProvider.updateStudentStatus(student.id, 'present'),
                                  ),
                                  _buildStatusTogglePill(
                                    label: 'A',
                                    statusKey: 'absent',
                                    activeColor: AppColors.absentRed,
                                    student: student,
                                    onTap: () => attProvider.updateStudentStatus(student.id, 'absent'),
                                  ),
                                  _buildStatusTogglePill(
                                    label: 'L',
                                    statusKey: 'late',
                                    activeColor: AppColors.lateOrange,
                                    student: student,
                                    onTap: () => attProvider.updateStudentStatus(student.id, 'late'),
                                  ),
                                  _buildStatusTogglePill(
                                    label: 'E',
                                    statusKey: 'excused',
                                    activeColor: AppColors.excusedBlue,
                                    student: student,
                                    onTap: () => attProvider.updateStudentStatus(student.id, 'excused'),
                                  ),
                                ],
                              ),
                            ],
                          ),
                        ).animate().fade(duration: 300.ms, delay: Duration(milliseconds: index * 30));
                      },
                    ),
            ),

            // Save Attendance Footer Button
            Container(
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
                          final teacherName = user?.fullName ?? 'Mrs. Sarah Perera';
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
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
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
          ],
        ),
      ),
    );
  }

  Widget _buildQuickActionBtn({
    required String label,
    required Color color,
    required VoidCallback onTap,
  }) {
    return Expanded(
      child: GestureDetector(
        onTap: onTap,
        child: Container(
          padding: const EdgeInsets.symmetric(vertical: 6),
          decoration: BoxDecoration(
            color: color.withValues(alpha: 0.12),
            borderRadius: BorderRadius.circular(8),
            border: Border.all(color: color.withValues(alpha: 0.3)),
          ),
          child: Center(
            child: Text(
              label,
              style: GoogleFonts.inter(color: color, fontWeight: FontWeight.bold, fontSize: 12),
            ),
          ),
        ),
      ),
    );
  }

  Widget _buildStatusTogglePill({
    required String label,
    required String statusKey,
    required Color activeColor,
    required dynamic student,
    required VoidCallback onTap,
  }) {
    final isSelected = student.attendanceStatus == statusKey;

    return GestureDetector(
      onTap: onTap,
      child: Container(
        margin: const EdgeInsets.only(left: 4),
        width: 30,
        height: 30,
        decoration: BoxDecoration(
          color: isSelected ? activeColor : Colors.grey.shade100,
          borderRadius: BorderRadius.circular(8),
          border: Border.all(
            color: isSelected ? activeColor : Colors.grey.shade300,
          ),
        ),
        child: Center(
          child: Text(
            label,
            style: GoogleFonts.outfit(
              color: isSelected ? Colors.white : AppColors.textSecondary,
              fontWeight: FontWeight.bold,
              fontSize: 13,
            ),
          ),
        ),
      ),
    );
  }
}
