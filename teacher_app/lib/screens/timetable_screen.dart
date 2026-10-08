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

  final List<String> _days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'];

  @override
  void initState() {
    super.initState();
    _fetchSchedule();
  }

  void _fetchSchedule() async {
    final teacherId = Provider.of<AuthProvider>(context, listen: false).currentUser?.id ?? '';
    final apiService = ApiService();
    final data = await apiService.fetchTimetable(teacherId);
    if (mounted) {
      setState(() {
        _slots = data;
        _isLoading = false;
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    final filteredSlots = _slots.where((s) => s.dayOfWeek == _selectedDay).toList();

    return Scaffold(
      backgroundColor: AppColors.background,
      appBar: AppBar(
        title: Text(
          'Weekly Teaching Timetable',
          style: GoogleFonts.outfit(fontWeight: FontWeight.bold, color: AppColors.textPrimary),
        ),
        backgroundColor: Colors.white,
        elevation: 0.5,
      ),
      body: SafeArea(
        child: Column(
          children: [
            // Day Selector Tabs
            Container(
              color: Colors.white,
              padding: const EdgeInsets.symmetric(vertical: 12, horizontal: 16),
              child: Row(
                mainAxisAlignment: MainAxisAlignment.spaceAround,
                children: List.generate(5, (index) {
                  final dayNo = index + 1;
                  final isSelected = _selectedDay == dayNo;

                  return GestureDetector(
                    onTap: () => setState(() => _selectedDay = dayNo),
                    child: Container(
                      padding: const EdgeInsets.symmetric(horizontal: 18, vertical: 10),
                      decoration: BoxDecoration(
                        color: isSelected ? AppColors.primary : AppColors.background,
                        borderRadius: BorderRadius.circular(14),
                        border: Border.all(
                          color: isSelected ? AppColors.primary : Colors.black12,
                        ),
                      ),
                      child: Text(
                        _days[index],
                        style: GoogleFonts.outfit(
                          fontSize: 14,
                          fontWeight: FontWeight.bold,
                          color: isSelected ? Colors.white : AppColors.textSecondary,
                        ),
                      ),
                    ),
                  );
                }),
              ),
            ),

            const Divider(height: 1),

            // Period Schedule List
            Expanded(
              child: _isLoading
                  ? const Center(child: CircularProgressIndicator())
                  : filteredSlots.isEmpty
                      ? Center(
                          child: Column(
                            mainAxisAlignment: MainAxisAlignment.center,
                            children: [
                              const Icon(Icons.event_seat_rounded, size: 48, color: AppColors.textMuted),
                              const SizedBox(height: 10),
                              Text(
                                'No allocated periods on ${_days[_selectedDay - 1]}',
                                style: GoogleFonts.inter(color: AppColors.textMuted, fontSize: 14),
                              ),
                            ],
                          ),
                        )
                      : ListView.builder(
                          padding: const EdgeInsets.all(20),
                          itemCount: filteredSlots.length,
                          itemBuilder: (context, index) {
                            final slot = filteredSlots[index];
                            return GlassCard(
                              margin: const EdgeInsets.only(bottom: 12),
                              padding: const EdgeInsets.all(16),
                              child: Row(
                                children: [
                                  // Period Badge
                                  Container(
                                    padding: const EdgeInsets.all(12),
                                    decoration: BoxDecoration(
                                      color: AppColors.primary.withOpacity(0.12),
                                      borderRadius: BorderRadius.circular(12),
                                    ),
                                    child: Column(
                                      children: [
                                        Text(
                                          'Period',
                                          style: GoogleFonts.inter(fontSize: 10, color: AppColors.primary),
                                        ),
                                        Text(
                                          '${slot.periodNo}',
                                          style: GoogleFonts.outfit(
                                            fontSize: 20,
                                            fontWeight: FontWeight.bold,
                                            color: AppColors.primary,
                                          ),
                                        ),
                                      ],
                                    ),
                                  ),

                                  const SizedBox(width: 14),

                                  Expanded(
                                    child: Column(
                                      crossAxisAlignment: CrossAxisAlignment.start,
                                      children: [
                                        Text(
                                          slot.subjectId,
                                          style: GoogleFonts.outfit(
                                            fontSize: 16,
                                            fontWeight: FontWeight.bold,
                                            color: AppColors.textPrimary,
                                          ),
                                        ),
                                        const SizedBox(height: 4),
                                        Row(
                                          children: [
                                            const Icon(Icons.class_rounded, size: 14, color: AppColors.textMuted),
                                            const SizedBox(width: 4),
                                            Text(
                                              slot.classId,
                                              style: GoogleFonts.inter(fontSize: 13, color: AppColors.textSecondary, fontWeight: FontWeight.w600),
                                            ),
                                            const SizedBox(width: 12),
                                            const Icon(Icons.location_on_rounded, size: 14, color: AppColors.accentTeal),
                                            const SizedBox(width: 4),
                                            Text(
                                              slot.room,
                                              style: GoogleFonts.inter(fontSize: 13, color: AppColors.accentTeal, fontWeight: FontWeight.bold),
                                            ),
                                          ],
                                        ),
                                        const SizedBox(height: 6),
                                        Row(
                                          children: [
                                            const Icon(Icons.access_time_rounded, size: 13, color: AppColors.textMuted),
                                            const SizedBox(width: 4),
                                            Text(
                                              '${slot.startTime} - ${slot.endTime}',
                                              style: GoogleFonts.inter(fontSize: 12, color: AppColors.textMuted),
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
