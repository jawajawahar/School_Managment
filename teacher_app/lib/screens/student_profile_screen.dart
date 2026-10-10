import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import '../constants/app_colors.dart';
import '../models/class_records.dart';
import '../models/student_model.dart';
import '../services/api_service.dart';
import '../widgets/app_ui.dart';
import '../widgets/guardian_contact.dart';

/// One student: guardian contact, attendance record and exam marks.
class StudentProfileScreen extends StatefulWidget {
  final StudentModel student;
  final List<AttendanceRecord> attendance;

  const StudentProfileScreen({super.key, required this.student, required this.attendance});

  @override
  State<StudentProfileScreen> createState() => _StudentProfileScreenState();
}

class _StudentProfileScreenState extends State<StudentProfileScreen> {
  List<ExamResultRecord>? _examResults;
  bool _isLoadingResults = true;

  @override
  void initState() {
    super.initState();
    ApiService().fetchExamResults(widget.student.id).then((results) {
      if (!mounted) return;
      setState(() {
        _examResults = results;
        _isLoadingResults = false;
      });
    });
  }

  Color _statusColor(String status) {
    switch (status) {
      case 'present':
        return AppColors.presentGreen;
      case 'absent':
        return AppColors.absentRed;
      case 'late':
        return AppColors.lateOrange;
      default:
        return AppColors.excusedBlue;
    }
  }

  @override
  Widget build(BuildContext context) {
    final student = widget.student;
    final summary = AttendanceSummary.of(widget.attendance);
    final history = [...widget.attendance]..sort((a, b) => b.date.compareTo(a.date));
    final hasPhone = student.guardianPhone.trim().isNotEmpty;
    final firstName = student.firstName.isEmpty ? student.fullName : student.firstName;
    final message = 'Dear parent, this is the class teacher of $firstName. ';

    return Scaffold(
      backgroundColor: AppColors.background,
      body: Column(
        children: [
          AppHeader(
            title: student.fullName,
            subtitle: 'Admission No. ${student.studentNo}',
            actions: [
              HeaderIconButton(icon: Icons.close_rounded, tooltip: 'Close', onPressed: () => Navigator.pop(context)),
            ],
            bottom: Row(
              children: [
                HeaderStat(
                  value: summary.rate == null ? '—' : '${summary.rate!.toStringAsFixed(0)}%',
                  label: 'Attendance',
                  dotColor: summary.isAtRisk ? AppColors.absentRed : AppColors.presentGreen,
                ),
                HeaderStat(value: '${summary.absent}', label: 'Absent', dotColor: AppColors.absentRed),
                HeaderStat(value: '${summary.late}', label: 'Late', dotColor: AppColors.lateOrange),
              ],
            ),
          ),
          Expanded(
            child: ListView(
              padding: const EdgeInsets.fromLTRB(16, 16, 16, 24),
              children: [
                if (summary.isAtRisk)
                  AppCard(
                    borderColor: AppColors.absentRed.withValues(alpha: 0.4),
                    child: Row(
                      children: [
                        const IconTile(icon: Icons.warning_amber_rounded, color: AppColors.absentRed),
                        const SizedBox(width: 12),
                        Expanded(
                          child: Text(
                            'Attendance is below 80%. Consider contacting the guardian.',
                            style: GoogleFonts.inter(fontSize: 13, height: 1.35, color: AppColors.textPrimary),
                          ),
                        ),
                      ],
                    ),
                  ),

                const SectionTitle(title: 'Guardian'),
                AppCard(
                  padding: const EdgeInsets.all(16),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Row(
                        children: [
                          const IconTile(icon: Icons.family_restroom_outlined, color: AppColors.accent),
                          const SizedBox(width: 12),
                          Expanded(
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Text(
                                  student.guardianName.isEmpty ? 'Guardian name not recorded' : student.guardianName,
                                  style: GoogleFonts.outfit(fontSize: 15, fontWeight: FontWeight.bold, color: AppColors.textPrimary),
                                ),
                                Text(
                                  hasPhone ? student.guardianPhone : 'No phone number on file',
                                  style: GoogleFonts.inter(fontSize: 12, color: AppColors.textSecondary),
                                ),
                              ],
                            ),
                          ),
                        ],
                      ),
                      const SizedBox(height: 14),
                      Row(
                        children: [
                          ContactActionButton(
                            icon: Icons.call_rounded,
                            label: 'Call',
                            color: AppColors.presentGreen,
                            onTap: hasPhone ? () => callGuardian(context, student.guardianPhone) : null,
                          ),
                          ContactActionButton(
                            icon: Icons.sms_outlined,
                            label: 'SMS',
                            color: AppColors.accent,
                            onTap: hasPhone ? () => textGuardian(context, student.guardianPhone, message) : null,
                          ),
                          ContactActionButton(
                            icon: Icons.chat_outlined,
                            label: 'WhatsApp',
                            color: const Color(0xFF0D9488),
                            onTap: hasPhone ? () => whatsAppGuardian(context, student.guardianPhone, message) : null,
                          ),
                        ],
                      ),
                    ],
                  ),
                ),
                const SizedBox(height: 10),

                const SectionTitle(title: 'Student Details'),
                AppCard(
                  padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 6),
                  child: Column(
                    children: [
                      _buildDetailRow('Date of birth', student.dateOfBirth.isEmpty ? '—' : formatDisplayDate(student.dateOfBirth)),
                      const Divider(height: 1, color: AppColors.border),
                      _buildDetailRow('Admitted', student.admissionDate.isEmpty ? '—' : formatDisplayDate(student.admissionDate)),
                      const Divider(height: 1, color: AppColors.border),
                      _buildDetailRow('Status', student.status.replaceAll('_', ' ')),
                    ],
                  ),
                ),
                const SizedBox(height: 10),

                const SectionTitle(title: 'Exam Marks'),
                _buildExamResults(),
                const SizedBox(height: 10),

                SectionTitle(title: 'Attendance History (${summary.total} ${summary.total == 1 ? 'day' : 'days'})'),
                if (history.isEmpty)
                  AppCard(
                    child: Text(
                      'No attendance has been marked for this student yet.',
                      style: GoogleFonts.inter(fontSize: 13, color: AppColors.textSecondary),
                    ),
                  )
                else
                  AppCard(
                    padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 4),
                    child: Column(
                      children: [
                        for (var i = 0; i < history.length && i < 30; i++) ...[
                          if (i > 0) const Divider(height: 1, color: AppColors.border),
                          _buildHistoryRow(history[i]),
                        ],
                      ],
                    ),
                  ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildDetailRow(String label, String value) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 11),
      child: Row(
        children: [
          Expanded(child: Text(label, style: GoogleFonts.inter(fontSize: 13, color: AppColors.textSecondary))),
          Text(value, style: GoogleFonts.inter(fontSize: 13, fontWeight: FontWeight.w700, color: AppColors.textPrimary)),
        ],
      ),
    );
  }

  Widget _buildHistoryRow(AttendanceRecord record) {
    final color = _statusColor(record.status);
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 10),
      child: Row(
        children: [
          Container(width: 8, height: 8, decoration: BoxDecoration(color: color, shape: BoxShape.circle)),
          const SizedBox(width: 10),
          Expanded(
            child: Text(
              record.remarks.isEmpty ? formatDisplayDate(record.date) : '${formatDisplayDate(record.date)}  •  ${record.remarks}',
              maxLines: 1,
              overflow: TextOverflow.ellipsis,
              style: GoogleFonts.inter(fontSize: 13, color: AppColors.textPrimary),
            ),
          ),
          Text(
            record.status.isEmpty ? '' : '${record.status[0].toUpperCase()}${record.status.substring(1)}',
            style: GoogleFonts.inter(fontSize: 12, fontWeight: FontWeight.w700, color: color),
          ),
        ],
      ),
    );
  }

  Widget _buildExamResults() {
    if (_isLoadingResults) {
      return const AppCard(
        child: Center(
          child: SizedBox(width: 20, height: 20, child: CircularProgressIndicator(strokeWidth: 2, color: AppColors.accent)),
        ),
      );
    }
    final results = _examResults;
    if (results == null || results.isEmpty) {
      return AppCard(
        child: Text(
          results == null ? 'Exam marks could not be loaded.' : 'No exam marks have been entered for this student yet.',
          style: GoogleFonts.inter(fontSize: 13, color: AppColors.textSecondary),
        ),
      );
    }

    final byExam = <String, List<ExamResultRecord>>{};
    for (final result in results) {
      byExam.putIfAbsent(result.examName, () => []).add(result);
    }

    return Column(
      children: byExam.entries.map((entry) {
        final average = entry.value.map((r) => r.marks).reduce((a, b) => a + b) / entry.value.length;
        return AppCard(
          padding: const EdgeInsets.all(16),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                children: [
                  Expanded(
                    child: Text(
                      entry.key,
                      style: GoogleFonts.outfit(fontSize: 14, fontWeight: FontWeight.bold, color: AppColors.textPrimary),
                    ),
                  ),
                  Text(
                    'Avg ${average.toStringAsFixed(1)}',
                    style: GoogleFonts.inter(fontSize: 12, fontWeight: FontWeight.w700, color: AppColors.accent),
                  ),
                ],
              ),
              const SizedBox(height: 8),
              ...entry.value.map(
                (r) => Padding(
                  padding: const EdgeInsets.symmetric(vertical: 4),
                  child: Row(
                    children: [
                      Expanded(
                        child: Text(
                          r.subjectName,
                          maxLines: 1,
                          overflow: TextOverflow.ellipsis,
                          style: GoogleFonts.inter(fontSize: 13, color: AppColors.textSecondary),
                        ),
                      ),
                      Text(
                        r.marks.toStringAsFixed(r.marks % 1 == 0 ? 0 : 1),
                        style: GoogleFonts.inter(fontSize: 13, fontWeight: FontWeight.w700, color: AppColors.textPrimary),
                      ),
                      const SizedBox(width: 10),
                      SizedBox(
                        width: 26,
                        child: Text(
                          r.grade,
                          textAlign: TextAlign.right,
                          style: GoogleFonts.inter(
                            fontSize: 13,
                            fontWeight: FontWeight.w700,
                            color: r.marks < 35 ? AppColors.absentRed : AppColors.presentGreen,
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
      }).toList(),
    );
  }
}
