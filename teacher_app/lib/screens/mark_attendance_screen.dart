import 'package:flutter/material.dart';
import 'package:flutter_animate/flutter_animate.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:provider/provider.dart';
import 'package:percent_indicator/linear_percent_indicator.dart';
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
          style: GoogleFonts.outfit(fontWeight: FontWeight.bold, color: AppColors.textPrimary),
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
              padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 12),
              child: Column(
                children: [
                  Row(
                    children: [
                      // Class Dropdown
                      Expanded(
                        child: Container(
                          padding: const EdgeInsets.symmetric(horizontal: 12),
                          decoration: BoxDecoration(
                            color: AppColors.background,
                            borderRadius: BorderRadius.circular(12),
                            border: Border.all(color: Colors.black.withOpacity(0.08)),
                          ),
                          child: DropdownButtonHideUnderline(
                            child: DropdownButton<String>(
                              value: attProvider.selectedClassId,
                              isExpanded: true,
                              hint: const Text('Select Class'),
                              items: attProvider.classes.map((c) {
                                return DropdownMenuItem<String>(
                                  value: c['id'],
                                  child: Text(
                                    '${c['grade']} (${c['section']})',
                                    style: GoogleFonts.inter(fontWeight: FontWeight.bold, fontSize: 14),
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
                          color: AppColors.primary.withOpacity(0.1),
                          borderRadius: BorderRadius.circular(12),
                        ),
                        child: Row(
                          children: [
                            const Icon(Icons.calendar_today_rounded, color: AppColors.primary, size: 16),
                            const SizedBox(width: 6),
                            Text(
                              attProvider.selectedDate,
                              style: GoogleFonts.inter(
                                color: AppColors.primary,
                                fontWeight: FontWeight.bold,
                                fontSize: 13,
                              ),
                            ),
                          ],
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 12),

                  // Telemetry Bar
                  Row(
                    children: [
                      Expanded(
                        child: LinearPercentIndicator(
                          lineHeight: 10.0,
                          percent: (attProvider.attendancePercentage / 100).clamp(0.0, 1.0),
                          backgroundColor: Colors.grey.shade200,
                          progressColor: AppColors.presentGreen,
                          barRadius: const Radius.circular(5),
                          padding: EdgeInsets.zero,
                        ),
                      ),
                      const SizedBox(width: 12),
                      Text(
                        '${attProvider.presentCount}/${attProvider.totalStudents} Present (${attProvider.attendancePercentage.toStringAsFixed(0)}%)',
                        style: GoogleFonts.inter(
                          fontSize: 12,
                          fontWeight: FontWeight.bold,
                          color: AppColors.textPrimary,
                        ),
                      ),
                    ],
                  ),

                  const SizedBox(height: 10),

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
                                backgroundColor: AppColors.primary.withOpacity(0.1),
                                child: Text(
                                  '${index + 1}',
                                  style: GoogleFonts.outfit(
                                    color: AppColors.primary,
                                    fontWeight: FontWeight.bold,
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
                                        fontSize: 15,
                                        fontWeight: FontWeight.bold,
                                        color: AppColors.textPrimary,
                                      ),
                                    ),
                                    Text(
                                      student.studentNo,
                                      style: GoogleFonts.inter(
                                        fontSize: 12,
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
                height: 50,
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
                                fontWeight: FontWeight.bold,
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
            color: color.withOpacity(0.12),
            borderRadius: BorderRadius.circular(8),
            border: Border.all(color: color.withOpacity(0.3)),
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
