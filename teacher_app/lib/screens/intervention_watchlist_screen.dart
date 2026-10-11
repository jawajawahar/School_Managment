import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:provider/provider.dart';
import '../constants/app_colors.dart';
import '../models/app_notification_model.dart';
import '../models/class_records.dart';
import '../models/student_model.dart';
import '../providers/auth_provider.dart';
import '../services/api_service.dart';
import '../widgets/app_ui.dart';
import '../widgets/guardian_contact.dart';
import 'student_profile_screen.dart';

/// A student flagged for follow-up, with the evidence behind the flag.
class _WatchlistEntry {
  final StudentModel student;
  final AttendanceSummary attendance;
  final List<AttendanceRecord> attendanceRecords;
  final List<ExamResultRecord> examResults;
  final List<ExamResultRecord> failedResults;

  _WatchlistEntry({
    required this.student,
    required this.attendance,
    required this.attendanceRecords,
    required this.examResults,
    required this.failedResults,
  });

  /// Whole-number rate; a student with no marked days counts as 100%, as on the web report.
  int get attendanceRate => (attendance.rate ?? 100).round();
  bool get hasLowAttendance => attendanceRate < 80;
  bool get hasFailedExams => failedResults.isNotEmpty;
}

/// Students of the teacher's class who are below 80% attendance or failing a
/// subject, with a one-tap request for the Principal to step in.
class InterventionWatchlistScreen extends StatefulWidget {
  const InterventionWatchlistScreen({super.key});

  @override
  State<InterventionWatchlistScreen> createState() => _InterventionWatchlistScreenState();
}

class _InterventionWatchlistScreenState extends State<InterventionWatchlistScreen> {
  final ApiService _apiService = ApiService();

  List<StudentModel> _students = [];
  List<AttendanceRecord> _attendance = [];
  List<ExamResultRecord> _examResults = [];
  List<AppNotificationModel> _requests = [];
  final Set<String> _sending = {};
  bool _isLoading = true;
  bool _loadFailed = false;
  String _riskFilter = 'all'; // 'all' | 'attendance' | 'exam'
  String _termFilter = 'all'; // 'all' | 'Term 1' | ...

  @override
  void initState() {
    super.initState();
    _load();
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
      _apiService.fetchClassExamResults(classId),
      _apiService.fetchInterventionRequests(),
    ]);
    if (!mounted) return;
    final attendance = results[1] as List<AttendanceRecord>?;
    final exams = results[2] as List<ExamResultRecord>?;
    setState(() {
      _students = results[0] as List<StudentModel>;
      _attendance = attendance ?? [];
      _examResults = exams ?? [];
      _requests = results[3] as List<AppNotificationModel>;
      _loadFailed = attendance == null || exams == null;
      _isLoading = false;
    });
  }

  List<String> get _terms => (_examResults.map((r) => r.examTerm).where((t) => t.isNotEmpty).toSet().toList()..sort());

  /// Every flagged student for the selected term, before the risk-type filter.
  List<_WatchlistEntry> _buildEntries() {
    final year = DateTime.now().year;
    final yearAttendance = _attendance.where((r) => r.date.startsWith('$year')).toList();

    final entries = <_WatchlistEntry>[];
    for (final student in _students) {
      final records = yearAttendance.where((r) => r.belongsTo(student)).toList();
      final results = _examResults.where((r) {
        if (r.studentId != student.id || !r.appliesTo(student)) return false;
        if (r.academicYear != null && r.academicYear != year) return false;
        return _termFilter == 'all' || r.examTerm == _termFilter;
      }).toList();
      final entry = _WatchlistEntry(
        student: student,
        attendance: AttendanceSummary.of(records),
        attendanceRecords: records,
        examResults: results,
        failedResults: results.where((r) => r.isFailing).toList(),
      );
      if (entry.hasLowAttendance || entry.hasFailedExams) entries.add(entry);
    }
    entries.sort((a, b) {
      final byFails = b.failedResults.length.compareTo(a.failedResults.length);
      return byFails != 0 ? byFails : a.attendanceRate.compareTo(b.attendanceRate);
    });
    return entries;
  }

  bool _isEscalated(StudentModel student) {
    final firstName = student.firstName.toLowerCase();
    return _requests.any((n) =>
        n.message.contains(student.studentNo) || (firstName.isNotEmpty && n.title.toLowerCase().contains(student.fullName.toLowerCase())));
  }

  String _reasonFor(_WatchlistEntry entry) {
    if (entry.failedResults.isEmpty) return 'Attendance concerns (<80%)';
    final subjects = entry.failedResults.map((r) => '${r.subjectName} (${r.marksLabel}/100, ${r.grade})').join(', ');
    return 'Failing subjects: $subjects';
  }

  Future<void> _requestIntervention(_WatchlistEntry entry, bool alreadyEscalated) async {
    final student = entry.student;
    final confirmed = await showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
        title: Text(
          alreadyEscalated ? 'Send another request?' : 'Request Principal intervention?',
          style: GoogleFonts.outfit(fontWeight: FontWeight.bold, fontSize: 18, color: AppColors.textPrimary),
        ),
        content: Text(
          '${alreadyEscalated ? 'A request for ${student.fullName} was already sent. Sending again reminds the Principal.\n\n' : ''}'
          'The Principal will be asked to review ${student.fullName} and contact the guardian.\n\n'
          '${_reasonFor(entry)}\nAttendance: ${entry.attendanceRate}%',
          style: GoogleFonts.inter(fontSize: 13, height: 1.45, color: AppColors.textSecondary),
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(ctx, false),
            child: Text('Cancel', style: GoogleFonts.inter(color: AppColors.textMuted, fontWeight: FontWeight.w600)),
          ),
          ElevatedButton(
            style: ElevatedButton.styleFrom(
              backgroundColor: AppColors.lateOrange,
              elevation: 0,
              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
            ),
            onPressed: () => Navigator.pop(ctx, true),
            child: Text('Send Request', style: GoogleFonts.outfit(color: Colors.white, fontWeight: FontWeight.bold)),
          ),
        ],
      ),
    );
    if (confirmed != true || !mounted) return;

    final user = Provider.of<AuthProvider>(context, listen: false).currentUser;
    setState(() => _sending.add(student.id));
    final ok = await _apiService.requestPrincipalIntervention(
      studentId: student.id,
      studentName: student.fullName,
      studentNo: student.studentNo,
      className: user?.assignedClassName ?? '',
      teacherId: user?.id ?? '',
      teacherName: user?.fullName ?? 'Class Teacher',
      reason: _reasonFor(entry),
      attendanceRate: entry.attendanceRate,
    );
    if (!mounted) return;
    if (ok) _requests = await _apiService.fetchInterventionRequests();
    if (!mounted) return;
    setState(() => _sending.remove(student.id));
    showAppSnackBar(
      context,
      ok ? "Request for ${student.fullName} sent to the Principal's Office." : 'The request could not be sent. Check your connection and try again.',
      isError: !ok,
    );
  }

  void _openExamSheet(_WatchlistEntry entry) {
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (_) => _ExamSheet(
        student: entry.student,
        results: _examResults.where((r) => r.studentId == entry.student.id && r.appliesTo(entry.student)).toList(),
        initialTerm: _termFilter,
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final user = context.watch<AuthProvider>().currentUser;
    final hasClass = user?.hasAssignedClass ?? false;
    final all = _buildEntries();
    final lowAttendance = all.where((e) => e.hasLowAttendance).length;
    final failing = all.where((e) => e.hasFailedExams).length;
    final visible = all.where((e) {
      if (_riskFilter == 'attendance') return e.hasLowAttendance;
      if (_riskFilter == 'exam') return e.hasFailedExams;
      return true;
    }).toList();

    return Scaffold(
      backgroundColor: AppColors.background,
      body: Column(
        children: [
          AppHeader(
            title: 'Intervention Watchlist',
            subtitle: hasClass ? '${user!.assignedClassName}  •  students needing follow-up' : 'No class assigned',
            actions: [
              HeaderIconButton(icon: Icons.refresh_rounded, tooltip: 'Refresh', onPressed: _load),
              HeaderIconButton(icon: Icons.close_rounded, tooltip: 'Close', onPressed: () => Navigator.pop(context)),
            ],
            bottom: Row(
              children: [
                HeaderStat(value: '${all.length}', label: 'At risk', dotColor: AppColors.absentRed),
                HeaderStat(value: '$lowAttendance', label: 'Attendance', dotColor: AppColors.lateOrange),
                HeaderStat(value: '$failing', label: 'Failing', dotColor: AppColors.accentLight),
              ],
            ),
          ),
          if (hasClass && !_isLoading && _students.isNotEmpty) _buildFilters(all.length, lowAttendance, failing),
          Expanded(
            child: RefreshIndicator(
              color: AppColors.accent,
              onRefresh: _load,
              child: _isLoading
                  ? const Center(child: CircularProgressIndicator(color: AppColors.accent))
                  : !hasClass
                      ? const EmptyState(
                          icon: Icons.school_outlined,
                          title: 'No class assigned',
                          message: 'Once the Principal assigns you as a class teacher, students who need follow-up appear here.',
                        )
                      : visible.isEmpty
                          ? EmptyState(
                              icon: _loadFailed ? Icons.cloud_off_rounded : Icons.verified_outlined,
                              title: _loadFailed ? 'Could not load the watchlist' : 'No students currently flagged',
                              message: _loadFailed
                                  ? 'Check your connection, then pull down to refresh.'
                                  : (all.isEmpty
                                      ? 'Everyone meets the attendance and pass-rate benchmarks.'
                                      : 'No student is flagged under this filter.'),
                            )
                          : ListView.builder(
                              physics: const AlwaysScrollableScrollPhysics(),
                              padding: const EdgeInsets.fromLTRB(16, 14, 16, 24),
                              itemCount: visible.length,
                              itemBuilder: (context, index) => _buildEntryCard(visible[index]),
                            ),
            ),
          ),
        ],
      ),
    );
  }

  // ---------------------------------------------------------------- filters

  Widget _buildFilters(int allCount, int attendanceCount, int examCount) {
    final terms = _terms;

    return Container(
      width: double.infinity,
      decoration: const BoxDecoration(
        color: Colors.white,
        border: Border(bottom: BorderSide(color: AppColors.border)),
      ),
      padding: const EdgeInsets.fromLTRB(12, 10, 12, 10),
      child: Column(
        children: [
          Row(
            children: [
              _buildChip('All  $allCount', _riskFilter == 'all', () => setState(() => _riskFilter = 'all'), expand: true),
              _buildChip('Attendance  $attendanceCount', _riskFilter == 'attendance', () => setState(() => _riskFilter = 'attendance'), expand: true),
              _buildChip('Exams  $examCount', _riskFilter == 'exam', () => setState(() => _riskFilter = 'exam'), expand: true),
            ],
          ),
          if (terms.length > 1) ...[
            const SizedBox(height: 8),
            SingleChildScrollView(
              scrollDirection: Axis.horizontal,
              child: Row(
                children: [
                  _buildChip('All terms', _termFilter == 'all', () => setState(() => _termFilter = 'all'), light: true),
                  ...terms.map((t) => _buildChip(t, _termFilter == t, () => setState(() => _termFilter = t), light: true)),
                ],
              ),
            ),
          ],
        ],
      ),
    );
  }

  Widget _buildChip(String label, bool isSelected, VoidCallback onTap, {bool expand = false, bool light = false}) {
    final selectedColor = light ? AppColors.accent : AppColors.primary;
    final chip = GestureDetector(
      behavior: HitTestBehavior.opaque,
      onTap: onTap,
      child: AnimatedContainer(
        duration: const Duration(milliseconds: 150),
        margin: const EdgeInsets.symmetric(horizontal: 3),
        padding: EdgeInsets.symmetric(horizontal: expand ? 4 : 12, vertical: light ? 6 : 8),
        decoration: BoxDecoration(
          color: isSelected ? selectedColor : Colors.white,
          borderRadius: BorderRadius.circular(20),
          border: Border.all(color: isSelected ? selectedColor : AppColors.border),
        ),
        child: Text(
          label,
          textAlign: TextAlign.center,
          maxLines: 1,
          overflow: TextOverflow.ellipsis,
          style: GoogleFonts.inter(
            fontSize: light ? 11 : 12,
            fontWeight: FontWeight.w700,
            color: isSelected ? Colors.white : AppColors.textSecondary,
          ),
        ),
      ),
    );
    return expand ? Expanded(child: chip) : chip;
  }

  // ------------------------------------------------------------- entry card

  Widget _buildEntryCard(_WatchlistEntry entry) {
    final student = entry.student;
    final isEscalated = _isEscalated(student);
    final isSending = _sending.contains(student.id);
    final rateColor = entry.hasLowAttendance ? AppColors.absentRed : AppColors.presentGreen;
    final initials = student.fullName.split(' ').where((p) => p.isNotEmpty).take(2).map((p) => p[0].toUpperCase()).join();

    return AppCard(
      padding: const EdgeInsets.all(14),
      borderColor: AppColors.absentRed.withValues(alpha: 0.25),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          GestureDetector(
            behavior: HitTestBehavior.opaque,
            onTap: () => Navigator.push(
              context,
              MaterialPageRoute(builder: (_) => StudentProfileScreen(student: student, attendance: entry.attendanceRecords)),
            ),
            child: Row(
              children: [
                Container(
                  width: 42,
                  height: 42,
                  alignment: Alignment.center,
                  decoration: BoxDecoration(color: AppColors.absentRed.withValues(alpha: 0.1), shape: BoxShape.circle),
                  child: Text(initials, style: GoogleFonts.outfit(color: AppColors.absentRed, fontWeight: FontWeight.bold, fontSize: 14)),
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
                        style: GoogleFonts.outfit(fontSize: 15, fontWeight: FontWeight.bold, color: AppColors.textPrimary),
                      ),
                      Text(student.studentNo, style: GoogleFonts.inter(fontSize: 11, color: AppColors.textMuted)),
                    ],
                  ),
                ),
                Column(
                  crossAxisAlignment: CrossAxisAlignment.end,
                  children: [
                    Text(
                      '${entry.attendanceRate}%',
                      style: GoogleFonts.outfit(fontSize: 20, height: 1, fontWeight: FontWeight.bold, color: rateColor),
                    ),
                    const SizedBox(height: 2),
                    Text('attendance', style: GoogleFonts.inter(fontSize: 10, color: AppColors.textMuted)),
                  ],
                ),
              ],
            ),
          ),
          const SizedBox(height: 12),

          Text(
            'TERM EXAM STATUS',
            style: GoogleFonts.inter(fontSize: 10, fontWeight: FontWeight.w700, letterSpacing: 0.8, color: AppColors.textMuted),
          ),
          const SizedBox(height: 6),
          if (entry.failedResults.isEmpty)
            Text(
              entry.examResults.isEmpty ? 'No exam marks entered yet' : 'Passed all term exams',
              style: GoogleFonts.inter(fontSize: 13, color: AppColors.textSecondary),
            )
          else
            Wrap(
              spacing: 6,
              runSpacing: 6,
              children: entry.failedResults.map(_buildFailChip).toList(),
            ),
          const SizedBox(height: 12),

          Row(
            children: [
              Expanded(child: _buildOutlineAction(Icons.visibility_outlined, 'Exam sheet', () => _openExamSheet(entry))),
              const SizedBox(width: 8),
              Expanded(
                child: _buildOutlineAction(
                  Icons.call_outlined,
                  'Call guardian',
                  student.guardianPhone.trim().isEmpty ? null : () => callGuardian(context, student.guardianPhone),
                ),
              ),
            ],
          ),
          const SizedBox(height: 8),

          SizedBox(
            width: double.infinity,
            height: 46,
            child: ElevatedButton(
              onPressed: isSending ? null : () => _requestIntervention(entry, isEscalated),
              style: ElevatedButton.styleFrom(
                backgroundColor: isEscalated ? AppColors.presentGreen.withValues(alpha: 0.1) : AppColors.lateOrange,
                disabledBackgroundColor: AppColors.lateOrange.withValues(alpha: 0.5),
                elevation: 0,
                shape: RoundedRectangleBorder(
                  borderRadius: BorderRadius.circular(12),
                  side: BorderSide(color: isEscalated ? AppColors.presentGreen.withValues(alpha: 0.4) : Colors.transparent),
                ),
              ),
              child: isSending
                  ? const SizedBox(width: 18, height: 18, child: CircularProgressIndicator(color: Colors.white, strokeWidth: 2))
                  : Row(
                      mainAxisAlignment: MainAxisAlignment.center,
                      children: [
                        Icon(
                          isEscalated ? Icons.check_circle_outline_rounded : Icons.send_rounded,
                          size: 17,
                          color: isEscalated ? AppColors.presentGreen : Colors.white,
                        ),
                        const SizedBox(width: 8),
                        Flexible(
                          child: Text(
                            isEscalated ? 'Escalated to Principal' : 'Request Principal Intervention',
                            maxLines: 1,
                            overflow: TextOverflow.ellipsis,
                            style: GoogleFonts.outfit(
                              fontSize: 14,
                              fontWeight: FontWeight.bold,
                              color: isEscalated ? AppColors.presentGreen : Colors.white,
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

  Widget _buildFailChip(ExamResultRecord result) {
    return Container(
      padding: const EdgeInsets.fromLTRB(8, 4, 4, 4),
      decoration: BoxDecoration(
        color: AppColors.absentRed.withValues(alpha: 0.07),
        borderRadius: BorderRadius.circular(8),
        border: Border.all(color: AppColors.absentRed.withValues(alpha: 0.25)),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Flexible(
            child: Text(
              result.subjectName,
              maxLines: 1,
              overflow: TextOverflow.ellipsis,
              style: GoogleFonts.inter(fontSize: 12, fontWeight: FontWeight.w700, color: AppColors.absentRed),
            ),
          ),
          const SizedBox(width: 6),
          Text(
            '${result.marksLabel}/100',
            style: GoogleFonts.inter(fontSize: 11, color: AppColors.absentRed),
          ),
          const SizedBox(width: 6),
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 5, vertical: 1),
            decoration: BoxDecoration(color: AppColors.absentRed, borderRadius: BorderRadius.circular(4)),
            child: Text(
              result.grade.isEmpty ? 'F' : result.grade,
              style: GoogleFonts.inter(fontSize: 10, fontWeight: FontWeight.w800, color: Colors.white),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildOutlineAction(IconData icon, String label, VoidCallback? onTap) {
    final color = onTap == null ? AppColors.textMuted : AppColors.accent;
    return GestureDetector(
      behavior: HitTestBehavior.opaque,
      onTap: onTap,
      child: Container(
        padding: const EdgeInsets.symmetric(vertical: 10),
        decoration: BoxDecoration(
          color: Colors.white,
          borderRadius: BorderRadius.circular(12),
          border: Border.all(color: onTap == null ? AppColors.border : AppColors.accent.withValues(alpha: 0.35)),
        ),
        child: Row(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Icon(icon, size: 16, color: color),
            const SizedBox(width: 6),
            Text(label, style: GoogleFonts.inter(fontSize: 12, fontWeight: FontWeight.w700, color: color)),
          ],
        ),
      ),
    );
  }
}

/// Bottom sheet with every exam mark of one student, filterable by term.
class _ExamSheet extends StatefulWidget {
  final StudentModel student;
  final List<ExamResultRecord> results;
  final String initialTerm;

  const _ExamSheet({required this.student, required this.results, required this.initialTerm});

  @override
  State<_ExamSheet> createState() => _ExamSheetState();
}

class _ExamSheetState extends State<_ExamSheet> {
  late String _term = widget.initialTerm;

  @override
  Widget build(BuildContext context) {
    final terms = (widget.results.map((r) => r.examTerm).where((t) => t.isNotEmpty).toSet().toList()..sort());
    final visible = widget.results.where((r) => _term == 'all' || r.examTerm == _term).toList()
      ..sort((a, b) {
        final byTerm = a.examTerm.compareTo(b.examTerm);
        return byTerm != 0 ? byTerm : a.subjectName.compareTo(b.subjectName);
      });
    final failed = visible.where((r) => r.isFailing).length;
    final average = visible.isEmpty ? 0.0 : visible.map((r) => r.marks).reduce((a, b) => a + b) / visible.length;

    return Container(
      constraints: BoxConstraints(maxHeight: MediaQuery.of(context).size.height * 0.85),
      decoration: const BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.vertical(top: Radius.circular(22)),
      ),
      child: SafeArea(
        top: false,
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const SizedBox(height: 10),
            Center(
              child: Container(
                width: 40,
                height: 4,
                decoration: BoxDecoration(color: AppColors.border, borderRadius: BorderRadius.circular(2)),
              ),
            ),
            Padding(
              padding: const EdgeInsets.fromLTRB(20, 14, 8, 0),
              child: Row(
                children: [
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          'Exam Sheet',
                          style: GoogleFonts.outfit(fontSize: 18, fontWeight: FontWeight.bold, color: AppColors.textPrimary),
                        ),
                        Text(
                          '${widget.student.fullName}  •  ${widget.student.studentNo}',
                          maxLines: 1,
                          overflow: TextOverflow.ellipsis,
                          style: GoogleFonts.inter(fontSize: 12, color: AppColors.textSecondary),
                        ),
                      ],
                    ),
                  ),
                  IconButton(
                    icon: const Icon(Icons.close_rounded, color: AppColors.textMuted),
                    onPressed: () => Navigator.pop(context),
                  ),
                ],
              ),
            ),
            if (terms.length > 1)
              SingleChildScrollView(
                scrollDirection: Axis.horizontal,
                padding: const EdgeInsets.fromLTRB(17, 10, 17, 0),
                child: Row(
                  children: ['all', ...terms].map((t) {
                    final isSelected = _term == t;
                    return GestureDetector(
                      behavior: HitTestBehavior.opaque,
                      onTap: () => setState(() => _term = t),
                      child: Container(
                        margin: const EdgeInsets.symmetric(horizontal: 3),
                        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 7),
                        decoration: BoxDecoration(
                          color: isSelected ? AppColors.accent : Colors.white,
                          borderRadius: BorderRadius.circular(20),
                          border: Border.all(color: isSelected ? AppColors.accent : AppColors.border),
                        ),
                        child: Text(
                          t == 'all' ? 'All terms' : t,
                          style: GoogleFonts.inter(
                            fontSize: 12,
                            fontWeight: FontWeight.w700,
                            color: isSelected ? Colors.white : AppColors.textSecondary,
                          ),
                        ),
                      ),
                    );
                  }).toList(),
                ),
              ),
            Padding(
              padding: const EdgeInsets.fromLTRB(20, 14, 20, 8),
              child: Row(
                children: [
                  _buildFigure('${visible.length}', 'Subjects', AppColors.textPrimary),
                  _buildFigure(visible.isEmpty ? '—' : average.toStringAsFixed(1), 'Average', AppColors.accent),
                  _buildFigure('$failed', 'Failed', failed > 0 ? AppColors.absentRed : AppColors.presentGreen),
                ],
              ),
            ),
            const Divider(height: 1, color: AppColors.border),
            Flexible(
              child: visible.isEmpty
                  ? Padding(
                      padding: const EdgeInsets.all(28),
                      child: Center(
                        child: Text(
                          'No exam marks have been entered for this student${_term == 'all' ? '' : ' in $_term'}.',
                          textAlign: TextAlign.center,
                          style: GoogleFonts.inter(fontSize: 13, color: AppColors.textSecondary),
                        ),
                      ),
                    )
                  : ListView.separated(
                      shrinkWrap: true,
                      padding: const EdgeInsets.fromLTRB(20, 4, 20, 20),
                      itemCount: visible.length,
                      separatorBuilder: (_, _) => const Divider(height: 1, color: AppColors.border),
                      itemBuilder: (context, index) => _buildResultRow(visible[index]),
                    ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildFigure(String value, String label, Color color) {
    return Expanded(
      child: Column(
        children: [
          Text(value, style: GoogleFonts.outfit(fontSize: 20, fontWeight: FontWeight.bold, color: color)),
          Text(label, style: GoogleFonts.inter(fontSize: 11, fontWeight: FontWeight.w600, color: AppColors.textSecondary)),
        ],
      ),
    );
  }

  Widget _buildResultRow(ExamResultRecord result) {
    final color = result.isFailing ? AppColors.absentRed : AppColors.presentGreen;
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 10),
      child: Row(
        children: [
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  result.subjectName,
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                  style: GoogleFonts.inter(fontSize: 13, fontWeight: FontWeight.w700, color: AppColors.textPrimary),
                ),
                const SizedBox(height: 4),
                ClipRRect(
                  borderRadius: BorderRadius.circular(3),
                  child: LinearProgressIndicator(
                    value: (result.marks / 100).clamp(0.0, 1.0),
                    minHeight: 5,
                    backgroundColor: AppColors.border,
                    valueColor: AlwaysStoppedAnimation(color),
                  ),
                ),
                if (result.examTerm.isNotEmpty && _term == 'all')
                  Padding(
                    padding: const EdgeInsets.only(top: 3),
                    child: Text(result.examTerm, style: GoogleFonts.inter(fontSize: 10, color: AppColors.textMuted)),
                  ),
              ],
            ),
          ),
          const SizedBox(width: 14),
          SizedBox(
            width: 54,
            child: Text(
              '${result.marksLabel}/100',
              textAlign: TextAlign.right,
              style: GoogleFonts.inter(fontSize: 12, fontWeight: FontWeight.w700, color: AppColors.textPrimary),
            ),
          ),
          const SizedBox(width: 8),
          Container(
            width: 28,
            padding: const EdgeInsets.symmetric(vertical: 3),
            alignment: Alignment.center,
            decoration: BoxDecoration(color: color.withValues(alpha: 0.12), borderRadius: BorderRadius.circular(6)),
            child: Text(
              result.grade.isEmpty ? '—' : result.grade,
              style: GoogleFonts.inter(fontSize: 11, fontWeight: FontWeight.w800, color: color),
            ),
          ),
        ],
      ),
    );
  }
}
