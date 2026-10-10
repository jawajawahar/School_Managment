import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:provider/provider.dart';
import '../constants/app_colors.dart';
import '../models/timetable_model.dart';
import '../providers/auth_provider.dart';
import '../services/api_service.dart';

/// Which timetable the teacher is looking at.
enum _TimetableView { myPeriods, myClass }

class TimetableScreen extends StatefulWidget {
  const TimetableScreen({super.key});

  @override
  State<TimetableScreen> createState() => _TimetableScreenState();
}

class _TimetableScreenState extends State<TimetableScreen> {
  static const List<String> _dayShort = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'];
  static const List<String> _dayLong = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];

  // Muted accents so adjacent subjects are distinguishable without shouting.
  static const List<Color> _subjectAccents = [
    Color(0xFF2563EB),
    Color(0xFF0D9488),
    Color(0xFF7C3AED),
    Color(0xFFD97706),
    Color(0xFFDB2777),
    Color(0xFF475569),
  ];

  final ApiService _apiService = ApiService();

  int _selectedDay = 1; // 1 = Monday, 5 = Friday
  _TimetableView _view = _TimetableView.myPeriods;
  List<TimetableSlotModel> _teachingSlots = [];
  List<TimetableSlotModel> _classSlots = [];
  bool _isLoading = true;
  bool _loadFailed = false;

  @override
  void initState() {
    super.initState();
    final weekday = DateTime.now().weekday;
    if (weekday <= 5) _selectedDay = weekday;
    _fetchSchedule();
  }

  /// Loads the periods this teacher teaches and, for a class teacher, the
  /// full timetable of their own class, in one go so switching is instant.
  Future<void> _fetchSchedule() async {
    if (!_isLoading) setState(() => _isLoading = true);
    final auth = Provider.of<AuthProvider>(context, listen: false);
    await auth.refreshProfile();
    final user = auth.currentUser;
    final hasClass = user?.hasAssignedClass ?? false;

    final results = await Future.wait([
      _apiService.fetchTimetable(teacherId: user?.teacherId ?? user?.id ?? ''),
      if (hasClass) _apiService.fetchTimetable(classId: user!.assignedClassId),
    ]);

    if (!mounted) return;
    setState(() {
      _teachingSlots = results[0] ?? [];
      _classSlots = hasClass ? (results[1] ?? []) : [];
      _loadFailed = results.any((r) => r == null);
      _isLoading = false;
    });
  }

  List<TimetableSlotModel> get _activeSlots => _view == _TimetableView.myClass ? _classSlots : _teachingSlots;

  List<TimetableSlotModel> _slotsForDay(int day) =>
      _activeSlots.where((s) => s.dayOfWeek == day).toList()..sort((a, b) => a.periodNo.compareTo(b.periodNo));

  Color _accentFor(TimetableSlotModel slot) => _subjectAccents[slot.subjectId.hashCode.abs() % _subjectAccents.length];

  int? _minutesOf(String hhmm) {
    final parts = hhmm.trim().split(':');
    if (parts.length < 2) return null;
    final h = int.tryParse(parts[0]);
    final m = int.tryParse(parts[1].replaceAll(RegExp(r'[^0-9]'), ''));
    if (h == null || m == null) return null;
    return h * 60 + m;
  }

  bool _isHappeningNow(TimetableSlotModel slot) {
    final now = DateTime.now();
    if (now.weekday != slot.dayOfWeek) return false;
    final start = _minutesOf(slot.startTime);
    final end = _minutesOf(slot.endTime);
    if (start == null || end == null) return false;
    final current = now.hour * 60 + now.minute;
    return current >= start && current < end;
  }

  @override
  Widget build(BuildContext context) {
    final user = context.watch<AuthProvider>().currentUser;
    final hasClass = user?.hasAssignedClass ?? false;
    final daySlots = _slotsForDay(_selectedDay);

    return Scaffold(
      backgroundColor: AppColors.background,
      body: Column(
        children: [
          _buildHeader(user?.fullName ?? '', hasClass ? user!.assignedClassName : null),
          _buildDaySelector(),
          Expanded(
            child: RefreshIndicator(
              color: AppColors.accent,
              onRefresh: _fetchSchedule,
              child: _isLoading
                  ? const Center(child: CircularProgressIndicator(color: AppColors.accent))
                  : _buildDayContent(daySlots, hasClass),
            ),
          ),
        ],
      ),
    );
  }

  // ---------------------------------------------------------------- header

  Widget _buildHeader(String teacherName, String? className) {
    return Container(
      width: double.infinity,
      decoration: const BoxDecoration(gradient: AppColors.executiveGradient),
      child: SafeArea(
        bottom: false,
        child: Padding(
          padding: const EdgeInsets.fromLTRB(20, 14, 12, 16),
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
                          'Timetable',
                          style: GoogleFonts.outfit(fontSize: 22, fontWeight: FontWeight.bold, color: Colors.white),
                        ),
                        const SizedBox(height: 2),
                        Text(
                          className != null ? '$teacherName  •  Class Teacher, $className' : teacherName,
                          maxLines: 1,
                          overflow: TextOverflow.ellipsis,
                          style: GoogleFonts.inter(fontSize: 12, color: Colors.white.withValues(alpha: 0.7)),
                        ),
                      ],
                    ),
                  ),
                  IconButton(
                    icon: const Icon(Icons.refresh_rounded, color: Colors.white, size: 22),
                    tooltip: 'Refresh Timetable',
                    onPressed: _isLoading ? null : _fetchSchedule,
                  ),
                ],
              ),
              const SizedBox(height: 14),
              Padding(
                padding: const EdgeInsets.only(right: 8),
                child: Container(
                  padding: const EdgeInsets.all(4),
                  decoration: BoxDecoration(
                    color: Colors.white.withValues(alpha: 0.1),
                    borderRadius: BorderRadius.circular(12),
                  ),
                  child: Row(
                    children: [
                      _buildViewTab(_TimetableView.myPeriods, Icons.person_outline_rounded, 'My Periods', _teachingSlots.length),
                      _buildViewTab(_TimetableView.myClass, Icons.groups_outlined, 'My Class', _classSlots.length),
                    ],
                  ),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildViewTab(_TimetableView view, IconData icon, String label, int count) {
    final isSelected = _view == view;
    final foreground = isSelected ? AppColors.primaryDark : Colors.white.withValues(alpha: 0.85);

    return Expanded(
      child: GestureDetector(
        behavior: HitTestBehavior.opaque,
        onTap: () => setState(() => _view = view),
        child: AnimatedContainer(
          duration: const Duration(milliseconds: 180),
          padding: const EdgeInsets.symmetric(vertical: 10),
          decoration: BoxDecoration(
            color: isSelected ? Colors.white : Colors.transparent,
            borderRadius: BorderRadius.circular(9),
          ),
          child: Row(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              Icon(icon, size: 16, color: foreground),
              const SizedBox(width: 6),
              Flexible(
                child: Text(
                  label,
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                  style: GoogleFonts.inter(fontSize: 13, fontWeight: FontWeight.w700, color: foreground),
                ),
              ),
              if (!_isLoading && count > 0) ...[
                const SizedBox(width: 6),
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 1),
                  decoration: BoxDecoration(
                    color: isSelected ? AppColors.accentLight : Colors.white.withValues(alpha: 0.18),
                    borderRadius: BorderRadius.circular(10),
                  ),
                  child: Text(
                    '$count',
                    style: GoogleFonts.inter(
                      fontSize: 11,
                      fontWeight: FontWeight.w700,
                      color: isSelected ? AppColors.accent : Colors.white,
                    ),
                  ),
                ),
              ],
            ],
          ),
        ),
      ),
    );
  }

  // ---------------------------------------------------------- day selector

  Widget _buildDaySelector() {
    final now = DateTime.now();
    // On a weekend the school week that matters is the coming one.
    final weekOffset = now.weekday > 5 ? 7 : 0;
    final monday = DateTime(now.year, now.month, now.day).subtract(Duration(days: now.weekday - 1 - weekOffset));

    return Container(
      decoration: const BoxDecoration(
        color: Colors.white,
        border: Border(bottom: BorderSide(color: AppColors.border)),
      ),
      padding: const EdgeInsets.symmetric(vertical: 12, horizontal: 12),
      child: Row(
        children: List.generate(5, (index) {
          final dayNo = index + 1;
          final date = monday.add(Duration(days: index));
          final isSelected = _selectedDay == dayNo;
          final isToday = now.weekday == dayNo;
          final hasPeriods = _activeSlots.any((s) => s.dayOfWeek == dayNo);

          return Expanded(
            child: GestureDetector(
              behavior: HitTestBehavior.opaque,
              onTap: () => setState(() => _selectedDay = dayNo),
              child: AnimatedContainer(
                duration: const Duration(milliseconds: 180),
                margin: const EdgeInsets.symmetric(horizontal: 3),
                padding: const EdgeInsets.symmetric(vertical: 8),
                decoration: BoxDecoration(
                  color: isSelected ? AppColors.accent : Colors.transparent,
                  borderRadius: BorderRadius.circular(12),
                  border: Border.all(
                    color: isSelected ? AppColors.accent : (isToday ? AppColors.accent.withValues(alpha: 0.45) : AppColors.border),
                  ),
                ),
                child: Column(
                  children: [
                    Text(
                      _dayShort[index].toUpperCase(),
                      style: GoogleFonts.inter(
                        fontSize: 10,
                        fontWeight: FontWeight.w700,
                        letterSpacing: 0.6,
                        color: isSelected ? Colors.white.withValues(alpha: 0.85) : AppColors.textMuted,
                      ),
                    ),
                    const SizedBox(height: 2),
                    Text(
                      '${date.day}',
                      style: GoogleFonts.outfit(
                        fontSize: 18,
                        fontWeight: FontWeight.bold,
                        color: isSelected ? Colors.white : AppColors.textPrimary,
                      ),
                    ),
                    const SizedBox(height: 4),
                    Container(
                      width: 5,
                      height: 5,
                      decoration: BoxDecoration(
                        shape: BoxShape.circle,
                        color: !hasPeriods ? Colors.transparent : (isSelected ? Colors.white : AppColors.accent),
                      ),
                    ),
                  ],
                ),
              ),
            ),
          );
        }),
      ),
    );
  }

  // ------------------------------------------------------------ day content

  Widget _buildDayContent(List<TimetableSlotModel> daySlots, bool hasClass) {
    if (_view == _TimetableView.myClass && !hasClass) {
      return _buildEmptyState(
        Icons.groups_outlined,
        'No class assigned',
        'You are not a class teacher yet. Once the Principal assigns your class, its timetable appears here.',
      );
    }
    if (_loadFailed && _activeSlots.isEmpty) {
      return _buildEmptyState(
        Icons.cloud_off_rounded,
        'Could not load the timetable',
        'Check your internet connection, then pull down to refresh.',
      );
    }
    if (daySlots.isEmpty) {
      final dayName = _dayLong[_selectedDay - 1];
      return _buildEmptyState(
        Icons.event_available_outlined,
        'No periods on $dayName',
        _view == _TimetableView.myClass
            ? 'The Principal has not scheduled any periods for your class on this day.'
            : 'You have no teaching periods scheduled on this day.',
      );
    }

    return ListView.builder(
      physics: const AlwaysScrollableScrollPhysics(),
      padding: const EdgeInsets.fromLTRB(16, 16, 16, 24),
      itemCount: daySlots.length + 1,
      itemBuilder: (context, index) {
        if (index == 0) return _buildDaySummary(daySlots);
        return _buildPeriodCard(daySlots[index - 1]);
      },
    );
  }

  Widget _buildDaySummary(List<TimetableSlotModel> daySlots) {
    final count = daySlots.length;
    return Padding(
      padding: const EdgeInsets.only(bottom: 12, left: 2, right: 2),
      child: Row(
        children: [
          Expanded(
            child: Text(
              _dayLong[_selectedDay - 1],
              style: GoogleFonts.outfit(fontSize: 16, fontWeight: FontWeight.bold, color: AppColors.textPrimary),
            ),
          ),
          Text(
            '$count ${count == 1 ? 'period' : 'periods'}  •  ${daySlots.first.startTime} – ${daySlots.last.endTime}',
            style: GoogleFonts.inter(fontSize: 12, fontWeight: FontWeight.w600, color: AppColors.textSecondary),
          ),
        ],
      ),
    );
  }

  Widget _buildPeriodCard(TimetableSlotModel slot) {
    final accent = _accentFor(slot);
    final isNow = _isHappeningNow(slot);
    final isClassView = _view == _TimetableView.myClass;

    return Container(
      margin: const EdgeInsets.only(bottom: 10),
      decoration: BoxDecoration(
        color: AppColors.surface,
        borderRadius: BorderRadius.circular(14),
        border: Border.all(color: isNow ? AppColors.accent : AppColors.border, width: isNow ? 1.5 : 1),
        boxShadow: AppColors.softShadow,
      ),
      clipBehavior: Clip.antiAlias,
      child: IntrinsicHeight(
        child: Row(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            Container(width: 5, color: accent),

            // Time column
            Container(
              width: 76,
              padding: const EdgeInsets.symmetric(vertical: 14, horizontal: 6),
              child: Column(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  Text(
                    slot.startTime,
                    style: GoogleFonts.outfit(fontSize: 16, fontWeight: FontWeight.bold, color: AppColors.textPrimary),
                  ),
                  const SizedBox(height: 2),
                  Text(
                    slot.endTime,
                    style: GoogleFonts.inter(fontSize: 12, fontWeight: FontWeight.w500, color: AppColors.textMuted),
                  ),
                ],
              ),
            ),

            const VerticalDivider(width: 1, thickness: 1, color: AppColors.border),

            // Details
            Expanded(
              child: Padding(
                padding: const EdgeInsets.fromLTRB(14, 12, 12, 12),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  mainAxisAlignment: MainAxisAlignment.center,
                  children: [
                    Row(
                      children: [
                        Text(
                          'PERIOD ${slot.periodNo}',
                          style: GoogleFonts.inter(
                            fontSize: 10,
                            fontWeight: FontWeight.w700,
                            letterSpacing: 0.8,
                            color: accent,
                          ),
                        ),
                        if (isNow) ...[
                          const SizedBox(width: 8),
                          Container(
                            padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                            decoration: BoxDecoration(
                              color: AppColors.accent,
                              borderRadius: BorderRadius.circular(4),
                            ),
                            child: Text(
                              'NOW',
                              style: GoogleFonts.inter(fontSize: 9, fontWeight: FontWeight.w800, letterSpacing: 0.6, color: Colors.white),
                            ),
                          ),
                        ],
                      ],
                    ),
                    const SizedBox(height: 4),
                    Text(
                      slot.subjectLabel,
                      maxLines: 2,
                      overflow: TextOverflow.ellipsis,
                      style: GoogleFonts.outfit(fontSize: 15, fontWeight: FontWeight.bold, height: 1.2, color: AppColors.textPrimary),
                    ),
                    const SizedBox(height: 8),
                    Wrap(
                      spacing: 12,
                      runSpacing: 4,
                      children: [
                        isClassView
                            ? _buildMeta(Icons.person_outline_rounded, slot.teacherName ?? 'Teacher not set')
                            : _buildMeta(Icons.groups_outlined, slot.classLabel),
                        if (slot.room.isNotEmpty) _buildMeta(Icons.meeting_room_outlined, slot.room),
                      ],
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

  Widget _buildMeta(IconData icon, String text) {
    return Row(
      mainAxisSize: MainAxisSize.min,
      children: [
        Icon(icon, size: 14, color: AppColors.textMuted),
        const SizedBox(width: 4),
        Flexible(
          child: Text(
            text,
            maxLines: 1,
            overflow: TextOverflow.ellipsis,
            style: GoogleFonts.inter(fontSize: 12, fontWeight: FontWeight.w600, color: AppColors.textSecondary),
          ),
        ),
      ],
    );
  }

  Widget _buildEmptyState(IconData icon, String title, String message) {
    // Scrollable so pull-to-refresh works on an empty day too.
    return LayoutBuilder(
      builder: (context, constraints) => SingleChildScrollView(
        physics: const AlwaysScrollableScrollPhysics(),
        child: ConstrainedBox(
          constraints: BoxConstraints(minHeight: constraints.maxHeight),
          child: Center(
            child: Padding(
              padding: const EdgeInsets.symmetric(horizontal: 40),
              child: Column(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  Container(
                    width: 64,
                    height: 64,
                    decoration: const BoxDecoration(color: AppColors.accentLight, shape: BoxShape.circle),
                    child: Icon(icon, size: 28, color: AppColors.accent),
                  ),
                  const SizedBox(height: 16),
                  Text(
                    title,
                    textAlign: TextAlign.center,
                    style: GoogleFonts.outfit(fontSize: 16, fontWeight: FontWeight.bold, color: AppColors.textPrimary),
                  ),
                  const SizedBox(height: 6),
                  Text(
                    message,
                    textAlign: TextAlign.center,
                    style: GoogleFonts.inter(fontSize: 13, height: 1.4, color: AppColors.textSecondary),
                  ),
                ],
              ),
            ),
          ),
        ),
      ),
    );
  }
}
