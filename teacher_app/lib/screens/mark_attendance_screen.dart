import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:provider/provider.dart';
import '../constants/app_colors.dart';
import '../models/student_model.dart';
import '../providers/auth_provider.dart';
import '../providers/attendance_provider.dart';
import '../widgets/app_ui.dart';

class MarkAttendanceScreen extends StatelessWidget {
  const MarkAttendanceScreen({super.key});

  static const List<_StatusOption> _statusOptions = [
    _StatusOption('present', 'P', 'Present', AppColors.presentGreen),
    _StatusOption('absent', 'A', 'Absent', AppColors.absentRed),
    _StatusOption('late', 'L', 'Late', AppColors.lateOrange),
    _StatusOption('excused', 'E', 'Excused', AppColors.excusedBlue),
  ];

  Future<void> _refresh(BuildContext context) async {
    final auth = Provider.of<AuthProvider>(context, listen: false);
    final attProvider = Provider.of<AttendanceProvider>(context, listen: false);
    await auth.refreshProfile();
    final fresh = auth.currentUser;
    await attProvider.loadClasses(preferredClassId: fresh?.assignedClassId, userRole: fresh?.role, user: fresh);
  }

  Future<void> _pickDate(BuildContext context, AttendanceProvider attProvider) async {
    final current = DateTime.tryParse(attProvider.selectedDate) ?? DateTime.now();
    final picked = await showDatePicker(
      context: context,
      initialDate: current,
      firstDate: DateTime.now().subtract(const Duration(days: 365)),
      lastDate: DateTime.now(),
    );
    if (picked != null) attProvider.setDate(picked);
  }

  Future<void> _save(BuildContext context, AttendanceProvider attProvider, String teacherName) async {
    final ok = await attProvider.submitAttendance(teacherName);
    if (!context.mounted) return;
    showAppSnackBar(
      context,
      attProvider.message ?? (ok ? 'Attendance saved!' : 'Attendance was not saved.'),
      isError: !ok,
    );
  }

  @override
  Widget build(BuildContext context) {
    final attProvider = Provider.of<AttendanceProvider>(context);
    final user = Provider.of<AuthProvider>(context).currentUser;

    final total = attProvider.students.length;
    final marked = attProvider.presentCount + attProvider.absentCount + attProvider.lateCount + attProvider.excusedCount;
    final isAllMarked = total > 0 && marked == total;
    final hasClass = attProvider.selectedClassId != null;
    final userClasses = attProvider.getClassesForUser(user);

    return Scaffold(
      backgroundColor: AppColors.background,
      body: Column(
        children: [
          AppHeader(
            title: 'Attendance',
            subtitle: hasClass ? '${attProvider.selectedClassName}  •  $total students' : 'Daily class register',
            actions: [
              HeaderIconButton(
                icon: Icons.refresh_rounded,
                tooltip: 'Refresh Roster',
                onPressed: () => _refresh(context),
              ),
            ],
            bottom: hasClass
                ? Row(
                    children: [
                      HeaderStat(value: '${attProvider.presentCount}', label: 'Present', dotColor: AppColors.presentGreen),
                      HeaderStat(value: '${attProvider.absentCount}', label: 'Absent', dotColor: AppColors.absentRed),
                      HeaderStat(value: '${attProvider.lateCount}', label: 'Late', dotColor: AppColors.lateOrange),
                      HeaderStat(value: '${attProvider.excusedCount}', label: 'Excused', dotColor: AppColors.accentLight),
                    ],
                  )
                : null,
          ),

          if (hasClass) _buildToolbar(context, attProvider, userClasses),

          Expanded(
            child: RefreshIndicator(
              color: AppColors.accent,
              onRefresh: () => _refresh(context),
              child: attProvider.isLoadingStudents || attProvider.isLoadingClasses && total == 0
                  ? const Center(child: CircularProgressIndicator(color: AppColors.accent))
                  : !hasClass
                      ? const EmptyState(
                          icon: Icons.school_outlined,
                          title: 'No class assigned',
                          message: 'You are not a class teacher yet. Once the Principal assigns your class, pull down to refresh and its register appears here.',
                        )
                      : total == 0
                          ? const EmptyState(
                              icon: Icons.group_off_outlined,
                              title: 'No students enrolled',
                              message: 'This class has no students yet. Students added by the school office appear here.',
                            )
                          : ListView.builder(
                              physics: const AlwaysScrollableScrollPhysics(),
                              keyboardDismissBehavior: ScrollViewKeyboardDismissBehavior.onDrag,
                              padding: const EdgeInsets.fromLTRB(16, 12, 16, 16),
                              itemCount: total,
                              itemBuilder: (context, index) => _buildStudentRow(attProvider, attProvider.students[index], index),
                            ),
            ),
          ),

          if (hasClass && total > 0) _buildFooter(context, attProvider, user?.fullName ?? 'Teacher', marked, total, isAllMarked),
        ],
      ),
    );
  }

  // --------------------------------------------------------------- toolbar

  Widget _buildToolbar(BuildContext context, AttendanceProvider attProvider, List<Map<String, dynamic>> userClasses) {
    return Container(
      decoration: const BoxDecoration(
        color: Colors.white,
        border: Border(bottom: BorderSide(color: AppColors.border)),
      ),
      padding: const EdgeInsets.fromLTRB(16, 12, 16, 12),
      child: Column(
        children: [
          if (userClasses.length > 1) ...[
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 12),
              decoration: BoxDecoration(
                color: AppColors.background,
                borderRadius: BorderRadius.circular(12),
                border: Border.all(color: AppColors.border),
              ),
              child: DropdownButtonHideUnderline(
                child: DropdownButton<String>(
                  value: attProvider.selectedClassId,
                  isExpanded: true,
                  icon: const Icon(Icons.keyboard_arrow_down_rounded, color: AppColors.textSecondary),
                  items: userClasses
                      .map((c) => DropdownMenuItem<String>(
                            value: c['id'],
                            child: Text(
                              '${c['grade']} (${c['section']})',
                              style: GoogleFonts.outfit(fontWeight: FontWeight.bold, fontSize: 14, color: AppColors.textPrimary),
                            ),
                          ))
                      .toList(),
                  onChanged: (val) {
                    if (val != null) attProvider.setClassId(val);
                  },
                ),
              ),
            ),
            const SizedBox(height: 10),
          ],
          Row(
            children: [
              Expanded(
                child: GestureDetector(
                  behavior: HitTestBehavior.opaque,
                  onTap: () => _pickDate(context, attProvider),
                  child: Container(
                    padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
                    decoration: BoxDecoration(
                      color: AppColors.background,
                      borderRadius: BorderRadius.circular(12),
                      border: Border.all(color: AppColors.border),
                    ),
                    child: Row(
                      children: [
                        const Icon(Icons.calendar_today_rounded, color: AppColors.accent, size: 15),
                        const SizedBox(width: 8),
                        Expanded(
                          child: Text(
                            formatDisplayDate(attProvider.selectedDate),
                            maxLines: 1,
                            overflow: TextOverflow.ellipsis,
                            style: GoogleFonts.inter(color: AppColors.textPrimary, fontWeight: FontWeight.w700, fontSize: 13),
                          ),
                        ),
                        const Icon(Icons.keyboard_arrow_down_rounded, color: AppColors.textMuted, size: 18),
                      ],
                    ),
                  ),
                ),
              ),
              const SizedBox(width: 8),
              _buildBulkButton('All Present', AppColors.presentGreen, () => attProvider.markAll('present')),
              const SizedBox(width: 8),
              _buildBulkButton('All Absent', AppColors.absentRed, () => attProvider.markAll('absent')),
            ],
          ),
        ],
      ),
    );
  }

  Widget _buildBulkButton(String label, Color color, VoidCallback onTap) {
    return GestureDetector(
      behavior: HitTestBehavior.opaque,
      onTap: onTap,
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 11),
        decoration: BoxDecoration(
          color: color.withValues(alpha: 0.08),
          borderRadius: BorderRadius.circular(12),
          border: Border.all(color: color.withValues(alpha: 0.25)),
        ),
        child: Text(label, style: GoogleFonts.inter(color: color, fontWeight: FontWeight.w700, fontSize: 12)),
      ),
    );
  }

  // ----------------------------------------------------------- student row

  Widget _buildStudentRow(AttendanceProvider attProvider, StudentModel student, int index) {
    final current = student.attendanceStatus.toLowerCase();
    final selected = _statusOptions.where((o) => o.value == current);
    final rowColor = selected.isEmpty ? null : selected.first.color;
    final initials = student.fullName
        .split(' ')
        .where((p) => p.isNotEmpty)
        .take(2)
        .map((p) => p[0].toUpperCase())
        .join();

    return AppCard(
      margin: const EdgeInsets.only(bottom: 8),
      padding: const EdgeInsets.fromLTRB(12, 10, 10, 10),
      borderColor: rowColor?.withValues(alpha: 0.35),
      child: Row(
        children: [
          Container(
            width: 38,
            height: 38,
            alignment: Alignment.center,
            decoration: BoxDecoration(
              color: (rowColor ?? AppColors.textMuted).withValues(alpha: 0.12),
              shape: BoxShape.circle,
            ),
            child: Text(
              initials.isEmpty ? '${index + 1}' : initials,
              style: GoogleFonts.outfit(color: rowColor ?? AppColors.textSecondary, fontWeight: FontWeight.bold, fontSize: 13),
            ),
          ),
          const SizedBox(width: 10),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  student.fullName,
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                  style: GoogleFonts.outfit(fontSize: 14, fontWeight: FontWeight.bold, color: AppColors.textPrimary),
                ),
                Text(
                  student.studentNo,
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                  style: GoogleFonts.inter(fontSize: 11, color: AppColors.textMuted),
                ),
              ],
            ),
          ),
          const SizedBox(width: 6),
          ..._statusOptions.map((option) {
            final isSelected = option.value == current;
            return Padding(
              padding: const EdgeInsets.only(left: 5),
              child: Tooltip(
                message: option.label,
                child: GestureDetector(
                  behavior: HitTestBehavior.opaque,
                  onTap: () => attProvider.updateStudentStatus(student.id, option.value),
                  child: AnimatedContainer(
                    duration: const Duration(milliseconds: 150),
                    width: 34,
                    height: 34,
                    alignment: Alignment.center,
                    decoration: BoxDecoration(
                      color: isSelected ? option.color : Colors.white,
                      borderRadius: BorderRadius.circular(10),
                      border: Border.all(color: isSelected ? option.color : AppColors.border),
                    ),
                    child: Text(
                      option.short,
                      style: GoogleFonts.outfit(
                        fontSize: 13,
                        fontWeight: FontWeight.bold,
                        color: isSelected ? Colors.white : AppColors.textSecondary,
                      ),
                    ),
                  ),
                ),
              ),
            );
          }),
        ],
      ),
    );
  }

  // ---------------------------------------------------------------- footer

  Widget _buildFooter(BuildContext context, AttendanceProvider attProvider, String teacherName, int marked, int total, bool isAllMarked) {
    return Container(
      padding: const EdgeInsets.fromLTRB(16, 10, 16, 12),
      decoration: const BoxDecoration(
        color: Colors.white,
        border: Border(top: BorderSide(color: AppColors.border)),
      ),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          Row(
            children: [
              Expanded(
                child: ClipRRect(
                  borderRadius: BorderRadius.circular(4),
                  child: LinearProgressIndicator(
                    value: total == 0 ? 0 : marked / total,
                    minHeight: 6,
                    backgroundColor: AppColors.border,
                    valueColor: AlwaysStoppedAnimation(isAllMarked ? AppColors.presentGreen : AppColors.accent),
                  ),
                ),
              ),
              const SizedBox(width: 10),
              Text(
                '$marked / $total marked',
                style: GoogleFonts.inter(fontSize: 12, fontWeight: FontWeight.w700, color: AppColors.textSecondary),
              ),
            ],
          ),
          const SizedBox(height: 10),
          PrimaryButton(
            label: isAllMarked ? 'Save Attendance Register' : 'Mark all students to save',
            icon: isAllMarked ? Icons.cloud_upload_outlined : Icons.pending_actions_outlined,
            isBusy: attProvider.isSubmitting,
            onPressed: isAllMarked ? () => _save(context, attProvider, teacherName) : null,
          ),
        ],
      ),
    );
  }
}

class _StatusOption {
  final String value;
  final String short;
  final String label;
  final Color color;

  const _StatusOption(this.value, this.short, this.label, this.color);
}
