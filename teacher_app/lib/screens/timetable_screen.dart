import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:provider/provider.dart';
import '../constants/app_colors.dart';
import '../models/timetable_model.dart';
import '../providers/auth_provider.dart';
import '../services/api_service.dart';
import '../widgets/glass_card.dart';

class TimetableScreen extends StatefulWidget {
  const TimetableScreen({super.key});

  @override
  State<TimetableScreen> createState() => _TimetableScreenState();
}

class _TimetableScreenState extends State<TimetableScreen> {
  int _selectedDay = 1; // 1 = Monday, 5 = Friday
  List<TimetableSlotModel> _slots = [];
  bool _isLoading = true;
  bool _loadFailed = false;
  // A class teacher can switch between their class's timetable and the periods they teach.
  bool _showMyClass = false;

  final List<String> _days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'];

  @override
  void initState() {
    super.initState();
    final weekday = DateTime.now().weekday;
    if (weekday <= 5) _selectedDay = weekday;
    _showMyClass = Provider.of<AuthProvider>(context, listen: false).currentUser?.hasAssignedClass ?? false;
    _fetchSchedule();
  }

  Future<void> _fetchSchedule() async {
    if (!_isLoading) setState(() => _isLoading = true);
    final auth = Provider.of<AuthProvider>(context, listen: false);
    await auth.refreshProfile();
    final user = auth.currentUser;
    final showClass = _showMyClass && (user?.hasAssignedClass ?? false);
    final data = showClass
        ? await ApiService().fetchTimetable(classId: user!.assignedClassId)
        : await ApiService().fetchTimetable(teacherId: user?.teacherId ?? user?.id ?? '');
    if (mounted) {
      setState(() {
        _showMyClass = showClass;
        _slots = data ?? [];
        _loadFailed = data == null;
        _isLoading = false;
      });
    }
  }

  void _setView(bool showMyClass) {
    if (_showMyClass == showMyClass) return;
    _showMyClass = showMyClass;
    _fetchSchedule();
  }

  Widget _viewTab(String label, bool showMyClass) {
    final isSelected = _showMyClass == showMyClass;
    return Expanded(
      child: GestureDetector(
        onTap: () => _setView(showMyClass),
        child: Container(
          margin: const EdgeInsets.symmetric(horizontal: 2),
          padding: const EdgeInsets.symmetric(vertical: 8, horizontal: 6),
          decoration: BoxDecoration(
            color: isSelected ? AppColors.primary : AppColors.background,
            borderRadius: BorderRadius.circular(6),
            border: Border.all(color: isSelected ? AppColors.primary : AppColors.border),
          ),
          child: Text(
            label,
            textAlign: TextAlign.center,
            maxLines: 1,
            overflow: TextOverflow.ellipsis,
            style: GoogleFonts.inter(
              fontSize: 12,
              fontWeight: FontWeight.bold,
              color: isSelected ? Colors.white : AppColors.textSecondary,
            ),
          ),
        ),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final user = context.watch<AuthProvider>().currentUser;
    final filteredSlots = _slots.where((s) => s.dayOfWeek == _selectedDay).toList()
      ..sort((a, b) => a.periodNo.compareTo(b.periodNo));

    return Scaffold(
      backgroundColor: AppColors.background,
      appBar: AppBar(
        title: Text(
          'Teaching Timetable',
          style: GoogleFonts.outfit(fontWeight: FontWeight.bold, color: AppColors.textPrimary, fontSize: 18),
        ),
        backgroundColor: Colors.white,
        elevation: 0,
        surfaceTintColor: Colors.transparent,
        actions: [
          IconButton(
            icon: const Icon(Icons.refresh_rounded, color: AppColors.textPrimary, size: 20),
            tooltip: 'Refresh Timetable',
            onPressed: _fetchSchedule,
          ),
        ],
        bottom: const PreferredSize(
          preferredSize: Size.fromHeight(1),
          child: Divider(height: 1, color: AppColors.border),
        ),
      ),
      body: SafeArea(
        child: Column(
          children: [
            if (user?.hasAssignedClass ?? false)
              Container(
                color: Colors.white,
                padding: const EdgeInsets.fromLTRB(12, 10, 12, 0),
                child: Row(
                  children: [
                    _viewTab('My Class: ${user!.assignedClassName}', true),
                    _viewTab('My Teaching Periods', false),
                  ],
                ),
              ),

            // Day Selector Tabs (Responsive Row)
            Container(
              color: Colors.white,
              padding: const EdgeInsets.symmetric(vertical: 10, horizontal: 12),
              child: Row(
                children: List.generate(5, (index) {
                  final dayNo = index + 1;
                  final isSelected = _selectedDay == dayNo;

                  return Expanded(
                    child: GestureDetector(
                      onTap: () => setState(() => _selectedDay = dayNo),
                      child: Container(
                        margin: const EdgeInsets.symmetric(horizontal: 2),
                        padding: const EdgeInsets.symmetric(vertical: 8),
                        decoration: BoxDecoration(
                          color: isSelected ? AppColors.accent : AppColors.background,
                          borderRadius: BorderRadius.circular(6),
                          border: Border.all(
                            color: isSelected ? AppColors.accent : AppColors.border,
                          ),
                        ),
                        child: Text(
                          _days[index],
                          textAlign: TextAlign.center,
                          style: GoogleFonts.inter(
                            fontSize: 12,
                            fontWeight: FontWeight.bold,
                            color: isSelected ? Colors.white : AppColors.textSecondary,
                          ),
                        ),
                      ),
                    ),
                  );
                }),
              ),
            ),

            const Divider(height: 1, color: AppColors.border),

            // Period Schedule List
            Expanded(
              child: _isLoading
                  ? const Center(child: CircularProgressIndicator())
                  : filteredSlots.isEmpty
                      ? Center(
                          child: Column(
                            mainAxisAlignment: MainAxisAlignment.center,
                            children: [
                              const Icon(Icons.event_seat_outlined, size: 40, color: AppColors.textMuted),
                              const SizedBox(height: 8),
                              Text(
                                _loadFailed
                                    ? 'Could not load the timetable.\nCheck your connection and tap refresh.'
                                    : 'No periods scheduled for ${_days[_selectedDay - 1]}',
                                textAlign: TextAlign.center,
                                style: GoogleFonts.inter(color: AppColors.textMuted, fontSize: 13),
                              ),
                            ],
                          ),
                        )
                      : ListView.builder(
                          padding: const EdgeInsets.all(16),
                          itemCount: filteredSlots.length,
                          itemBuilder: (context, index) {
                            final slot = filteredSlots[index];
                            return GlassCard(
                              margin: const EdgeInsets.only(bottom: 8),
                              padding: const EdgeInsets.all(12),
                              child: Row(
                                children: [
                                  // Period Badge
                                  Container(
                                    padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 8),
                                    decoration: BoxDecoration(
                                      color: AppColors.background,
                                      borderRadius: BorderRadius.circular(6),
                                      border: Border.all(color: AppColors.border),
                                    ),
                                    child: Column(
                                      children: [
                                        Text(
                                          'PERIOD',
                                          style: GoogleFonts.inter(fontSize: 9, fontWeight: FontWeight.w700, color: AppColors.textMuted),
                                        ),
                                        Text(
                                          '${slot.periodNo}',
                                          style: GoogleFonts.outfit(
                                            fontSize: 20,
                                            fontWeight: FontWeight.bold,
                                            color: AppColors.textPrimary,
                                          ),
                                        ),
                                      ],
                                    ),
                                  ),

                                  const SizedBox(width: 12),

                                  Expanded(
                                    child: Column(
                                      crossAxisAlignment: CrossAxisAlignment.start,
                                      children: [
                                        Text(
                                          slot.subjectLabel,
                                          style: GoogleFonts.outfit(
                                            fontSize: 15,
                                            fontWeight: FontWeight.bold,
                                            color: AppColors.textPrimary,
                                          ),
                                          maxLines: 1,
                                          overflow: TextOverflow.ellipsis,
                                        ),
                                        const SizedBox(height: 2),
                                        Row(
                                          children: [
                                            Flexible(
                                              child: Text(
                                                _showMyClass ? (slot.teacherName ?? 'Teacher not set') : slot.classLabel,
                                                maxLines: 1,
                                                overflow: TextOverflow.ellipsis,
                                                style: GoogleFonts.inter(fontSize: 12, color: AppColors.textSecondary, fontWeight: FontWeight.w600),
                                              ),
                                            ),
                                            const SizedBox(width: 10),
                                            Text(
                                              'Room: ${slot.room}',
                                              style: GoogleFonts.inter(fontSize: 12, color: AppColors.accent, fontWeight: FontWeight.w700),
                                            ),
                                          ],
                                        ),
                                        const SizedBox(height: 4),
                                        Row(
                                          children: [
                                            const Icon(Icons.access_time_rounded, size: 12, color: AppColors.textMuted),
                                            const SizedBox(width: 4),
                                            Text(
                                              '${slot.startTime} - ${slot.endTime}',
                                              style: GoogleFonts.inter(fontSize: 11, color: AppColors.textMuted),
                                            ),
                                          ],
                                        ),
                                      ],
                                    ),
                                  ),
                                ],
                              ),
                            );
                          },
                        ),
            ),
          ],
        ),
      ),
    );
  }
}
