import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:provider/provider.dart';
import '../constants/app_colors.dart';
import '../models/class_records.dart';
import '../models/student_model.dart';
import '../providers/auth_provider.dart';
import '../services/api_service.dart';
import '../widgets/app_ui.dart';
import '../widgets/guardian_contact.dart';
import 'student_profile_screen.dart';

/// The class teacher's own class: roster, attendance health and guardian contacts.
class MyClassScreen extends StatefulWidget {
  /// Open straight on the students who need attention.
  final bool startOnAtRisk;

  const MyClassScreen({super.key, this.startOnAtRisk = false});

  @override
  State<MyClassScreen> createState() => _MyClassScreenState();
}

class _MyClassScreenState extends State<MyClassScreen> {
  final ApiService _apiService = ApiService();
  final _searchController = TextEditingController();

  List<StudentModel> _students = [];
  List<AttendanceRecord> _attendance = [];
  bool _isLoading = true;
  bool _loadFailed = false;
  bool _atRiskOnly = false;
  String _query = '';

  @override
  void initState() {
    super.initState();
    _atRiskOnly = widget.startOnAtRisk;
    _load();
  }

  @override
  void dispose() {
    _searchController.dispose();
    super.dispose();
  }

  Future<void> _load() async {
    final classId = Provider.of<AuthProvider>(context, listen: false).currentUser?.assignedClassId ?? '';
    if (classId.isEmpty) {
      setState(() => _isLoading = false);
      return;
    }
    final results = await Future.wait<dynamic>([
      _apiService.fetchStudents(classId),
      _apiService.fetchClassAttendance(classId),
    ]);
    if (!mounted) return;
    final attendance = results[1] as List<AttendanceRecord>?;
    setState(() {
      _students = results[0] as List<StudentModel>;
      _attendance = attendance ?? [];
      _loadFailed = attendance == null;
      _isLoading = false;
    });
  }

  AttendanceSummary _summaryFor(StudentModel student) => AttendanceSummary.of(_attendance.where((r) => r.belongsTo(student)));

  /// Attendance rate per school day, oldest first, for the most recent [days] marked days.
  List<MapEntry<String, double>> _recentDailyRates(int days) {
    final byDate = <String, List<AttendanceRecord>>{};
    for (final record in _attendance) {
      byDate.putIfAbsent(record.date, () => []).add(record);
    }
    final dates = byDate.keys.toList()..sort();
    final recent = dates.length > days ? dates.sublist(dates.length - days) : dates;
    return recent.map((date) => MapEntry(date, AttendanceSummary.of(byDate[date]!).rate ?? 0)).toList();
  }

  @override
  Widget build(BuildContext context) {
    final user = context.watch<AuthProvider>().currentUser;
    final summaries = {for (final s in _students) s.id: _summaryFor(s)};
    final classSummary = AttendanceSummary.of(_attendance);
    final atRiskCount = summaries.values.where((s) => s.isAtRisk).length;

    final query = _query.trim().toLowerCase();
    final visible = _students.where((s) {
      if (_atRiskOnly && !(summaries[s.id]?.isAtRisk ?? false)) return false;
      if (query.isEmpty) return true;
      return s.fullName.toLowerCase().contains(query) || s.studentNo.toLowerCase().contains(query);
    }).toList()
      ..sort((a, b) => a.fullName.toLowerCase().compareTo(b.fullName.toLowerCase()));

    return Scaffold(
      backgroundColor: AppColors.background,
      body: Column(
        children: [
          AppHeader(
            title: 'My Class',
            subtitle: user?.hasAssignedClass ?? false ? user!.assignedClassName : 'No class assigned',
            actions: [
              HeaderIconButton(icon: Icons.refresh_rounded, tooltip: 'Refresh', onPressed: _load),
              HeaderIconButton(icon: Icons.close_rounded, tooltip: 'Close', onPressed: () => Navigator.pop(context)),
            ],
            bottom: Row(
              children: [
                HeaderStat(value: '${_students.length}', label: 'Students'),
                HeaderStat(
                  value: classSummary.rate == null ? '—' : '${classSummary.rate!.toStringAsFixed(0)}%',
                  label: 'Attendance',
                  dotColor: AppColors.presentGreen,
                ),
                HeaderStat(value: '$atRiskCount', label: 'At risk', dotColor: AppColors.absentRed),
              ],
            ),
          ),
          Expanded(
            child: RefreshIndicator(
              color: AppColors.accent,
              onRefresh: _load,
              child: _isLoading
                  ? const Center(child: CircularProgressIndicator(color: AppColors.accent))
                  : !(user?.hasAssignedClass ?? false)
                      ? const EmptyState(
                          icon: Icons.school_outlined,
                          title: 'No class assigned',
                          message: 'Once the Principal assigns you as a class teacher, your students appear here.',
                        )
                      : _students.isEmpty
                          ? const EmptyState(
                              icon: Icons.group_off_outlined,
                              title: 'No students enrolled',
                              message: 'Students added to your class by the school office appear here.',
                            )
                          : ListView(
                              physics: const AlwaysScrollableScrollPhysics(),
                              keyboardDismissBehavior: ScrollViewKeyboardDismissBehavior.onDrag,
                              padding: const EdgeInsets.fromLTRB(16, 16, 16, 24),
                              children: [
                                if (_loadFailed)
                                  AppCard(
                                    borderColor: AppColors.lateOrange.withValues(alpha: 0.4),
                                    child: Text(
                                      'Attendance history could not be loaded. Pull down to try again.',
                                      style: GoogleFonts.inter(fontSize: 12, color: AppColors.textSecondary),
                                    ),
                                  ),
                                _buildTrendCard(),
                                const SizedBox(height: 6),
                                _buildSearchRow(atRiskCount),
                                const SizedBox(height: 12),
                                if (visible.isEmpty)
                                  EmptyState.inline(
                                    icon: _atRiskOnly ? Icons.verified_outlined : Icons.search_off_rounded,
                                    title: _atRiskOnly ? 'No students at risk' : 'No match',
                                    message: _atRiskOnly
                                        ? 'Every student is at or above 80% attendance.'
                                        : 'No student matches "$_query".',
                                  )
                                else
                                  ...visible.map((s) => _buildStudentRow(s, summaries[s.id]!)),
                              ],
                            ),
            ),
          ),
        ],
      ),
    );
  }

  // ------------------------------------------------------------ trend card

  Widget _buildTrendCard() {
    final rates = _recentDailyRates(7);

    return AppCard(
      padding: const EdgeInsets.all(16),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            'ATTENDANCE, LAST ${rates.length <= 1 ? 'MARKED DAY' : '${rates.length} MARKED DAYS'}',
            style: GoogleFonts.inter(fontSize: 10, fontWeight: FontWeight.w700, letterSpacing: 0.8, color: AppColors.textMuted),
          ),
          const SizedBox(height: 14),
          if (rates.isEmpty)
            Text(
              'No attendance has been marked for this class yet.',
              style: GoogleFonts.inter(fontSize: 13, color: AppColors.textSecondary),
            )
          else
            SizedBox(
              height: 110,
              child: Row(
                crossAxisAlignment: CrossAxisAlignment.end,
                children: rates.map((entry) {
                  final rate = entry.value;
                  final color = rate >= 90 ? AppColors.presentGreen : (rate >= 80 ? AppColors.lateOrange : AppColors.absentRed);
                  final date = DateTime.tryParse(entry.key);
                  return Expanded(
                    child: Padding(
                      padding: const EdgeInsets.symmetric(horizontal: 4),
                      child: Column(
                        mainAxisAlignment: MainAxisAlignment.end,
                        children: [
                          Text(
                            '${rate.toStringAsFixed(0)}%',
                            style: GoogleFonts.inter(fontSize: 10, fontWeight: FontWeight.w700, color: AppColors.textSecondary),
                          ),
                          const SizedBox(height: 4),
                          Container(
                            height: 4 + 56 * (rate / 100),
                            constraints: const BoxConstraints(maxWidth: 34),
                            decoration: BoxDecoration(color: color, borderRadius: BorderRadius.circular(6)),
                          ),
                          const SizedBox(height: 6),
                          Text(
                            date == null ? entry.key : '${date.day}/${date.month}',
                            style: GoogleFonts.inter(fontSize: 10, color: AppColors.textMuted),
                          ),
                        ],
                      ),
                    ),
                  );
                }).toList(),
              ),
            ),
        ],
      ),
    );
  }

  // ---------------------------------------------------------- search & rows

  Widget _buildSearchRow(int atRiskCount) {
    return Row(
      children: [
        Expanded(
          child: TextField(
            controller: _searchController,
            onChanged: (value) => setState(() => _query = value),
            style: GoogleFonts.inter(fontSize: 13, color: AppColors.textPrimary),
            decoration: appInputDecoration('Search name or admission no.').copyWith(
              fillColor: Colors.white,
              prefixIcon: const Icon(Icons.search_rounded, size: 18, color: AppColors.textMuted),
              suffixIcon: _query.isEmpty
                  ? null
                  : IconButton(
                      icon: const Icon(Icons.close_rounded, size: 16, color: AppColors.textMuted),
                      onPressed: () {
                        _searchController.clear();
                        setState(() => _query = '');
                      },
                    ),
            ),
          ),
        ),
        const SizedBox(width: 8),
        GestureDetector(
          behavior: HitTestBehavior.opaque,
          onTap: () => setState(() => _atRiskOnly = !_atRiskOnly),
          child: AnimatedContainer(
            duration: const Duration(milliseconds: 150),
            padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 13),
            decoration: BoxDecoration(
              color: _atRiskOnly ? AppColors.absentRed : Colors.white,
              borderRadius: BorderRadius.circular(12),
              border: Border.all(color: _atRiskOnly ? AppColors.absentRed : AppColors.border),
            ),
            child: Row(
              mainAxisSize: MainAxisSize.min,
              children: [
                Icon(Icons.warning_amber_rounded, size: 16, color: _atRiskOnly ? Colors.white : AppColors.absentRed),
                const SizedBox(width: 6),
                Text(
                  'At risk $atRiskCount',
                  style: GoogleFonts.inter(
                    fontSize: 12,
                    fontWeight: FontWeight.w700,
                    color: _atRiskOnly ? Colors.white : AppColors.textPrimary,
                  ),
                ),
              ],
            ),
          ),
        ),
      ],
    );
  }

  Widget _buildStudentRow(StudentModel student, AttendanceSummary summary) {
    final rate = summary.rate;
    final color = rate == null
        ? AppColors.textMuted
        : (rate < 80 ? AppColors.absentRed : (rate >= 90 ? AppColors.presentGreen : AppColors.lateOrange));
    final initials = student.fullName.split(' ').where((p) => p.isNotEmpty).take(2).map((p) => p[0].toUpperCase()).join();

    return AppCard(
      margin: const EdgeInsets.only(bottom: 8),
      padding: const EdgeInsets.fromLTRB(12, 10, 10, 10),
      borderColor: summary.isAtRisk ? AppColors.absentRed.withValues(alpha: 0.35) : null,
      onTap: () => Navigator.push(
        context,
        MaterialPageRoute(
          builder: (_) => StudentProfileScreen(
            student: student,
            attendance: _attendance.where((r) => r.belongsTo(student)).toList(),
          ),
        ),
      ),
      child: Row(
        children: [
          Container(
            width: 40,
            height: 40,
            alignment: Alignment.center,
            decoration: BoxDecoration(color: AppColors.accentLight.withValues(alpha: 0.7), shape: BoxShape.circle),
            child: Text(initials, style: GoogleFonts.outfit(color: AppColors.accent, fontWeight: FontWeight.bold, fontSize: 13)),
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
                const SizedBox(height: 1),
                Text(
                  summary.absent > 0 ? '${student.studentNo}  •  ${summary.absent} absent' : student.studentNo,
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                  style: GoogleFonts.inter(fontSize: 11, color: AppColors.textMuted),
                ),
              ],
            ),
          ),
          const SizedBox(width: 8),
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 9, vertical: 5),
            decoration: BoxDecoration(color: color.withValues(alpha: 0.1), borderRadius: BorderRadius.circular(8)),
            child: Text(
              rate == null ? 'No data' : '${rate.toStringAsFixed(0)}%',
              style: GoogleFonts.inter(fontSize: 12, fontWeight: FontWeight.w700, color: color),
            ),
          ),
          const SizedBox(width: 8),
          CallGuardianButton(phone: student.guardianPhone),
        ],
      ),
    );
  }
}
