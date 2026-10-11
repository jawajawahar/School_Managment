import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:provider/provider.dart';
import '../constants/app_colors.dart';
import '../models/class_records.dart';
import '../models/student_model.dart';
import '../providers/auth_provider.dart';
import '../services/api_service.dart';
import '../widgets/app_ui.dart';

/// Welfare scheme enrolments of the teacher's class and whether each has been
/// handed over. Enrolling and disbursing are done by the school office.
class WelfareLogScreen extends StatefulWidget {
  const WelfareLogScreen({super.key});

  @override
  State<WelfareLogScreen> createState() => _WelfareLogScreenState();
}

class _WelfareLogScreenState extends State<WelfareLogScreen> {
  final ApiService _apiService = ApiService();
  final _searchController = TextEditingController();

  List<WelfareEnrolmentRecord> _enrolments = [];
  Map<String, StudentModel> _studentsById = {};
  bool _isLoading = true;
  bool _loadFailed = false;
  String _statusFilter = 'all'; // 'all' | 'enrolled' | 'disbursed' | 'cancelled'
  String _programFilter = 'all';
  String _query = '';

  @override
  void initState() {
    super.initState();
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
      _apiService.fetchWelfareEnrolments(classId),
    ]);
    if (!mounted) return;
    final students = results[0] as List<StudentModel>;
    final enrolments = results[1] as List<WelfareEnrolmentRecord>?;
    final byId = {for (final s in students) s.id: s};
    setState(() {
      _studentsById = byId;
      // Only this class's students, whatever the server sent.
      _enrolments = (enrolments ?? []).where((e) => byId.containsKey(e.studentId)).toList();
      _loadFailed = enrolments == null;
      _isLoading = false;
    });
  }

  String _studentName(WelfareEnrolmentRecord e) => e.studentName.isNotEmpty ? e.studentName : (_studentsById[e.studentId]?.fullName ?? 'Student');
  String _studentNo(WelfareEnrolmentRecord e) => e.studentNo.isNotEmpty ? e.studentNo : (_studentsById[e.studentId]?.studentNo ?? '');
  String _programName(WelfareEnrolmentRecord e) => e.programName.isNotEmpty ? e.programName : 'Welfare program';

  Color _statusColor(WelfareEnrolmentRecord e) =>
      e.isDisbursed ? AppColors.presentGreen : (e.isCancelled ? AppColors.textMuted : AppColors.lateOrange);

  String _statusLabel(WelfareEnrolmentRecord e) => e.isDisbursed ? 'Disbursed' : (e.isCancelled ? 'Cancelled' : 'Pending');

  @override
  Widget build(BuildContext context) {
    final user = context.watch<AuthProvider>().currentUser;
    final hasClass = user?.hasAssignedClass ?? false;

    final disbursed = _enrolments.where((e) => e.isDisbursed).length;
    final pending = _enrolments.where((e) => !e.isDisbursed && !e.isCancelled).length;
    final programs = {for (final e in _enrolments) e.programId: _programName(e)};
    final query = _query.trim().toLowerCase();

    final visible = _enrolments.where((e) {
      if (_statusFilter == 'disbursed' && !e.isDisbursed) return false;
      if (_statusFilter == 'cancelled' && !e.isCancelled) return false;
      if (_statusFilter == 'enrolled' && (e.isDisbursed || e.isCancelled)) return false;
      if (_programFilter != 'all' && e.programId != _programFilter) return false;
      if (query.isEmpty) return true;
      return _studentName(e).toLowerCase().contains(query) ||
          _studentNo(e).toLowerCase().contains(query) ||
          _programName(e).toLowerCase().contains(query);
    }).toList();

    return Scaffold(
      backgroundColor: AppColors.background,
      body: Column(
        children: [
          AppHeader(
            title: 'Welfare Log',
            subtitle: hasClass ? '${user!.assignedClassName}  •  welfare schemes' : 'No class assigned',
            actions: [
              HeaderIconButton(icon: Icons.refresh_rounded, tooltip: 'Refresh', onPressed: _load),
              HeaderIconButton(icon: Icons.close_rounded, tooltip: 'Close', onPressed: () => Navigator.pop(context)),
            ],
            bottom: Row(
              children: [
                HeaderStat(value: '${_enrolments.length}', label: 'Enrolled'),
                HeaderStat(value: '$disbursed', label: 'Disbursed', dotColor: AppColors.presentGreen),
                HeaderStat(value: '$pending', label: 'Pending', dotColor: AppColors.lateOrange),
              ],
            ),
          ),
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
                          message: "Once the Principal assigns you as a class teacher, your students' welfare records appear here.",
                        )
                      : _enrolments.isEmpty
                          ? EmptyState(
                              icon: _loadFailed ? Icons.cloud_off_rounded : Icons.volunteer_activism_outlined,
                              title: _loadFailed ? 'Could not load welfare records' : 'No welfare enrolments recorded',
                              message: _loadFailed
                                  ? 'Check your connection, then pull down to refresh.'
                                  : 'When the school office enrols your students in a welfare scheme, the records appear here.',
                            )
                          : ListView(
                              physics: const AlwaysScrollableScrollPhysics(),
                              keyboardDismissBehavior: ScrollViewKeyboardDismissBehavior.onDrag,
                              padding: const EdgeInsets.fromLTRB(16, 16, 16, 24),
                              children: [
                                _buildProgressCard(disbursed, pending),
                                const SizedBox(height: 4),
                                TextField(
                                  controller: _searchController,
                                  onChanged: (value) => setState(() => _query = value),
                                  style: GoogleFonts.inter(fontSize: 13, color: AppColors.textPrimary),
                                  decoration: appInputDecoration('Search student or program').copyWith(
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
                                const SizedBox(height: 10),
                                Row(
                                  children: [
                                    _buildChip('All', _statusFilter == 'all', () => setState(() => _statusFilter = 'all'), expand: true),
                                    _buildChip('Pending', _statusFilter == 'enrolled', () => setState(() => _statusFilter = 'enrolled'), expand: true),
                                    _buildChip('Disbursed', _statusFilter == 'disbursed', () => setState(() => _statusFilter = 'disbursed'), expand: true),
                                    _buildChip('Cancelled', _statusFilter == 'cancelled', () => setState(() => _statusFilter = 'cancelled'), expand: true),
                                  ],
                                ),
                                if (programs.length > 1) ...[
                                  const SizedBox(height: 8),
                                  SingleChildScrollView(
                                    scrollDirection: Axis.horizontal,
                                    child: Row(
                                      children: [
                                        _buildChip('All programs', _programFilter == 'all', () => setState(() => _programFilter = 'all'), light: true),
                                        ...programs.entries.map(
                                          (p) => _buildChip(p.value, _programFilter == p.key, () => setState(() => _programFilter = p.key), light: true),
                                        ),
                                      ],
                                    ),
                                  ),
                                ],
                                const SizedBox(height: 14),
                                if (visible.isEmpty)
                                  const EmptyState.inline(
                                    icon: Icons.search_off_rounded,
                                    title: 'No matching records',
                                    message: 'Change the search or filters to see more.',
                                  )
                                else
                                  ...visible.map(_buildEnrolmentCard),
                              ],
                            ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildProgressCard(int disbursed, int pending) {
    final active = disbursed + pending;
    final share = active == 0 ? 0.0 : disbursed / active;

    return AppCard(
      padding: const EdgeInsets.all(16),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            'DISBURSEMENT PROGRESS',
            style: GoogleFonts.inter(fontSize: 10, fontWeight: FontWeight.w700, letterSpacing: 0.8, color: AppColors.textMuted),
          ),
          const SizedBox(height: 8),
          Row(
            crossAxisAlignment: CrossAxisAlignment.end,
            children: [
              Text(
                '${(share * 100).toStringAsFixed(0)}%',
                style: GoogleFonts.outfit(fontSize: 30, height: 1, fontWeight: FontWeight.w800, color: AppColors.textPrimary),
              ),
              const SizedBox(width: 8),
              Padding(
                padding: const EdgeInsets.only(bottom: 3),
                child: Text(
                  '$disbursed of $active handed over',
                  style: GoogleFonts.inter(fontSize: 12, color: AppColors.textSecondary),
                ),
              ),
            ],
          ),
          const SizedBox(height: 10),
          ClipRRect(
            borderRadius: BorderRadius.circular(6),
            child: LinearProgressIndicator(
              value: share,
              minHeight: 8,
              backgroundColor: AppColors.border,
              valueColor: const AlwaysStoppedAnimation(AppColors.presentGreen),
            ),
          ),
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

  Widget _buildEnrolmentCard(WelfareEnrolmentRecord enrolment) {
    final color = _statusColor(enrolment);
    final studentNo = _studentNo(enrolment);

    return AppCard(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              IconTile(icon: Icons.volunteer_activism_outlined, color: color),
              const SizedBox(width: 12),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      _studentName(enrolment),
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                      style: GoogleFonts.outfit(fontSize: 15, fontWeight: FontWeight.bold, color: AppColors.textPrimary),
                    ),
                    if (studentNo.isNotEmpty) Text(studentNo, style: GoogleFonts.inter(fontSize: 11, color: AppColors.textMuted)),
                  ],
                ),
              ),
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 5),
                decoration: BoxDecoration(color: color.withValues(alpha: 0.1), borderRadius: BorderRadius.circular(20)),
                child: Text(
                  _statusLabel(enrolment),
                  style: GoogleFonts.inter(fontSize: 11, fontWeight: FontWeight.w700, color: color),
                ),
              ),
            ],
          ),
          const SizedBox(height: 12),
          const Divider(height: 1, color: AppColors.border),
          const SizedBox(height: 10),
          _buildDetail(Icons.card_giftcard_outlined, 'Program', _programName(enrolment)),
          const SizedBox(height: 6),
          _buildDetail(
            Icons.event_available_outlined,
            'Disbursed',
            enrolment.disbursedAt.isEmpty ? 'Not yet handed over' : formatDisplayDate(enrolment.disbursedAt),
          ),
          if (enrolment.remarks.isNotEmpty) ...[
            const SizedBox(height: 6),
            _buildDetail(Icons.notes_rounded, 'Remarks', enrolment.remarks),
          ],
        ],
      ),
    );
  }

  Widget _buildDetail(IconData icon, String label, String value) {
    return Row(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Icon(icon, size: 15, color: AppColors.textMuted),
        const SizedBox(width: 8),
        SizedBox(width: 74, child: Text(label, style: GoogleFonts.inter(fontSize: 12, color: AppColors.textSecondary))),
        Expanded(
          child: Text(
            value,
            style: GoogleFonts.inter(fontSize: 12, fontWeight: FontWeight.w700, color: AppColors.textPrimary),
          ),
        ),
      ],
    );
  }
}
