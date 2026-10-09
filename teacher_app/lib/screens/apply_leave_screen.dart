import 'package:flutter/material.dart';
import 'package:flutter_animate/flutter_animate.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:intl/intl.dart';
import 'package:provider/provider.dart';
import '../constants/app_colors.dart';
import '../providers/auth_provider.dart';
import '../providers/leave_provider.dart';
import '../widgets/glass_card.dart';
import '../widgets/status_badge.dart';

class ApplyLeaveScreen extends StatefulWidget {
  const ApplyLeaveScreen({super.key});

  @override
  State<ApplyLeaveScreen> createState() => _ApplyLeaveScreenState();
}

class _ApplyLeaveScreenState extends State<ApplyLeaveScreen> {
  final _reasonController = TextEditingController();
  String _leaveType = 'Casual Leave';
  DateTime _startDate = DateTime.now().add(const Duration(days: 1));
  DateTime _endDate = DateTime.now().add(const Duration(days: 1));
  bool _showForm = false;

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      final teacherName = Provider.of<AuthProvider>(context, listen: false).currentUser?.fullName ?? '';
      Provider.of<LeaveProvider>(context, listen: false).fetchLeaveRequests(teacherName);
    });
  }

  Future<void> _selectDate(BuildContext context, bool isStart) async {
    final DateTime? picked = await showDatePicker(
      context: context,
      initialDate: isStart ? _startDate : _endDate,
      firstDate: DateTime.now(),
      lastDate: DateTime.now().add(const Duration(days: 90)),
    );
    if (picked != null) {
      setState(() {
        if (isStart) {
          _startDate = picked;
          if (_endDate.isBefore(_startDate)) _endDate = _startDate;
        } else {
          _endDate = picked;
        }
      });
    }
  }

  void _submitForm() async {
    final reason = _reasonController.text.trim();
    if (reason.isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Please state the reason for your leave.')),
      );
      return;
    }

    final user = Provider.of<AuthProvider>(context, listen: false).currentUser;
    final leaveProvider = Provider.of<LeaveProvider>(context, listen: false);

    final ok = await leaveProvider.applyLeave(
      teacherName: user?.fullName ?? 'Teacher',
      type: _leaveType,
      startDate: DateFormat('yyyy-MM-dd').format(_startDate),
      endDate: DateFormat('yyyy-MM-dd').format(_endDate),
      reason: reason,
    );

    if (ok && mounted) {
      _reasonController.clear();
      setState(() {
        _showForm = false;
      });
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text(leaveProvider.message ?? 'Leave request submitted!'),
          backgroundColor: AppColors.presentGreen,
        ),
      );
    }
  }

  Widget _buildLeaveTypeSelector() {
    final types = [
      {'name': 'Casual Leave', 'icon': Icons.beach_access_rounded, 'color': AppColors.accentAmber},
      {'name': 'Sick Leave', 'icon': Icons.medical_services_rounded, 'color': AppColors.absentRed},
      {'name': 'Duty Leave', 'icon': Icons.work_rounded, 'color': AppColors.primary},
      {'name': 'Half Day', 'icon': Icons.schedule_rounded, 'color': AppColors.accentTeal},
    ];

    return GridView.builder(
      shrinkWrap: true,
      physics: const NeverScrollableScrollPhysics(),
      gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
        crossAxisCount: 2,
        childAspectRatio: 2.7,
        crossAxisSpacing: 10,
        mainAxisSpacing: 10,
      ),
      itemCount: types.length,
      itemBuilder: (context, index) {
        final t = types[index];
        final isSelected = _leaveType == t['name'];
        final col = t['color'] as Color;

        return InkWell(
          onTap: () => setState(() => _leaveType = t['name'] as String),
          borderRadius: BorderRadius.circular(16),
          child: AnimatedContainer(
            duration: 200.ms,
            padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
            decoration: BoxDecoration(
              color: isSelected ? col : Colors.white,
              borderRadius: BorderRadius.circular(16),
              border: Border.all(
                color: isSelected ? col : Colors.grey.shade300,
                width: isSelected ? 2 : 1,
              ),
              boxShadow: isSelected
                  ? [BoxShadow(color: col.withValues(alpha: 0.3), blurRadius: 8, offset: const Offset(0, 3))]
                  : AppColors.softShadow,
            ),
            child: Row(
              children: [
                Container(
                  padding: const EdgeInsets.all(5),
                  decoration: BoxDecoration(
                    color: isSelected ? Colors.white.withValues(alpha: 0.25) : col.withValues(alpha: 0.12),
                    shape: BoxShape.circle,
                  ),
                  child: Icon(
                    t['icon'] as IconData,
                    size: 15,
                    color: isSelected ? Colors.white : col,
                  ),
                ),
                const SizedBox(width: 8),
                Expanded(
                  child: Text(
                    t['name'] as String,
                    style: GoogleFonts.outfit(
                      fontSize: 12,
                      fontWeight: FontWeight.bold,
                      color: isSelected ? Colors.white : AppColors.textPrimary,
                    ),
                    overflow: TextOverflow.ellipsis,
                  ),
                ),
                if (isSelected)
                  const Icon(Icons.check_circle_rounded, size: 14, color: Colors.white),
              ],
            ),
          ),
        );
      },
    );
  }

  @override
  Widget build(BuildContext context) {
    final leaveProvider = Provider.of<LeaveProvider>(context);

    return Scaffold(
      backgroundColor: AppColors.background,
      appBar: AppBar(
        title: Text(
          'Apply for Leave',
          style: GoogleFonts.outfit(fontWeight: FontWeight.w800, color: AppColors.textPrimary, fontSize: 20),
        ),
        backgroundColor: Colors.white,
        elevation: 0.5,
      ),
      floatingActionButton: FloatingActionButton.extended(
        onPressed: () {
          setState(() {
            _showForm = !_showForm;
          });
        },
        backgroundColor: _showForm ? AppColors.absentRed : AppColors.primary,
        icon: Icon(_showForm ? Icons.close_rounded : Icons.add_rounded, color: Colors.white),
        label: Text(
          _showForm ? 'Close Form' : 'Apply New Leave',
          style: GoogleFonts.outfit(fontWeight: FontWeight.bold, color: Colors.white),
        ),
      ),
      body: SafeArea(
        child: SingleChildScrollView(
          keyboardDismissBehavior: ScrollViewKeyboardDismissBehavior.onDrag,
          padding: const EdgeInsets.all(20.0),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              // Header Row with Toggle Button
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Text(
                    'My Leave Applications',
                    style: GoogleFonts.outfit(
                      fontSize: 18,
                      fontWeight: FontWeight.bold,
                      color: AppColors.textPrimary,
                    ),
                  ),
                  ElevatedButton.icon(
                    onPressed: () => setState(() => _showForm = !_showForm),
                    style: ElevatedButton.styleFrom(
                      backgroundColor: _showForm ? AppColors.absentRed : AppColors.primary,
                      foregroundColor: Colors.white,
                      elevation: 3,
                      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(20)),
                      padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 8),
                    ),
                    icon: Icon(_showForm ? Icons.close_rounded : Icons.add_rounded, size: 18),
                    label: Text(
                      _showForm ? 'Close' : 'Apply Leave',
                      style: GoogleFonts.outfit(fontWeight: FontWeight.bold, fontSize: 13),
                    ),
                  ),
                ],
              ),

              const SizedBox(height: 14),

              // Expandable New Leave Application Form Card
              AnimatedCrossFade(
                duration: 300.ms,
                crossFadeState: _showForm ? CrossFadeState.showFirst : CrossFadeState.showSecond,
                firstChild: Padding(
                  padding: const EdgeInsets.only(bottom: 20.0),
                  child: GlassCard(
                    padding: const EdgeInsets.all(20),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Row(
                          children: [
                            const Icon(Icons.event_note_rounded, color: AppColors.primary),
                            const SizedBox(width: 8),
                            Text(
                              'New Leave Application',
                              style: GoogleFonts.outfit(
                                fontSize: 18,
                                fontWeight: FontWeight.w800,
                                color: AppColors.textPrimary,
                              ),
                            ),
                          ],
                        ),
                        const SizedBox(height: 16),

                        // Trending Leave Type Selector
                        Text(
                          'Select Leave Category',
                          style: GoogleFonts.outfit(fontSize: 14, fontWeight: FontWeight.w800, color: AppColors.textPrimary),
                        ),
                        const SizedBox(height: 8),
                        _buildLeaveTypeSelector(),

                        const SizedBox(height: 16),

                        // Date Selectors
                        Row(
                          children: [
                            Expanded(
                              child: Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  Text(
                                    'Start Date',
                                    style: GoogleFonts.outfit(fontSize: 14, fontWeight: FontWeight.w800, color: AppColors.textPrimary),
                                  ),
                                  const SizedBox(height: 6),
                                  InkWell(
                                    onTap: () => _selectDate(context, true),
                                    child: Container(
                                      padding: const EdgeInsets.all(12),
                                      decoration: BoxDecoration(
                                        color: AppColors.background,
                                        borderRadius: BorderRadius.circular(12),
                                        border: Border.all(color: Colors.black12),
                                      ),
                                      child: Row(
                                        children: [
                                          const Icon(Icons.calendar_today_rounded, size: 16, color: AppColors.primary),
                                          const SizedBox(width: 8),
                                          Text(
                                            DateFormat('dd MMM yyyy').format(_startDate),
                                            style: GoogleFonts.outfit(fontSize: 13, fontWeight: FontWeight.w800),
                                          ),
                                        ],
                                      ),
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
                                    'End Date',
                                    style: GoogleFonts.outfit(fontSize: 14, fontWeight: FontWeight.w800, color: AppColors.textPrimary),
                                  ),
                                  const SizedBox(height: 6),
                                  InkWell(
                                    onTap: () => _selectDate(context, false),
                                    child: Container(
                                      padding: const EdgeInsets.all(12),
                                      decoration: BoxDecoration(
                                        color: AppColors.background,
                                        borderRadius: BorderRadius.circular(12),
                                        border: Border.all(color: Colors.black12),
                                      ),
                                      child: Row(
                                        children: [
                                          const Icon(Icons.calendar_today_rounded, size: 16, color: AppColors.primary),
                                          const SizedBox(width: 8),
                                          Text(
                                            DateFormat('dd MMM yyyy').format(_endDate),
                                            style: GoogleFonts.outfit(fontSize: 13, fontWeight: FontWeight.w800),
                                          ),
                                        ],
                                      ),
                                    ),
                                  ),
                                ],
                              ),
                            ),
                          ],
                        ),

                        const SizedBox(height: 16),

                        // Reason Field
                        Text(
                          'Reason for Leave',
                          style: GoogleFonts.outfit(fontSize: 14, fontWeight: FontWeight.w800, color: AppColors.textPrimary),
                        ),
                        const SizedBox(height: 6),
                        TextField(
                          controller: _reasonController,
                          maxLines: 3,
                          decoration: InputDecoration(
                            hintText: 'Please detail reason for principal review...',
                            filled: true,
                            fillColor: AppColors.background,
                            border: OutlineInputBorder(
                              borderRadius: BorderRadius.circular(12),
                              borderSide: BorderSide.none,
                            ),
                          ),
                        ),

                        const SizedBox(height: 20),

                        // Submit Button
                        SizedBox(
                          width: double.infinity,
                          height: 50,
                          child: ElevatedButton(
                            onPressed: leaveProvider.isSubmitting ? null : _submitForm,
                            style: ElevatedButton.styleFrom(
                              backgroundColor: AppColors.primary,
                              elevation: 3,
                              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                            ),
                            child: leaveProvider.isSubmitting
                                ? const SizedBox(width: 24, height: 24, child: CircularProgressIndicator(color: Colors.white))
                                : Row(
                                    mainAxisAlignment: MainAxisAlignment.center,
                                    children: [
                                      const Icon(Icons.send_rounded, color: Colors.white, size: 18),
                                      const SizedBox(width: 8),
                                      Text(
                                        'Submit Request to Principal',
                                        style: GoogleFonts.outfit(fontSize: 16, fontWeight: FontWeight.w900, color: Colors.white),
                                      ),
                                    ],
                                  ),
                          ),
                        ),
                      ],
                    ),
                  ),
                ),
                secondChild: const SizedBox.shrink(),
              ),

              // History List
              if (leaveProvider.isLoading)
                const Center(child: CircularProgressIndicator())
              else if (leaveProvider.leaveRequests.isEmpty)
                GlassCard(
                  child: Center(
                    child: Text('No leave applications recorded.', style: GoogleFonts.inter(color: AppColors.textMuted)),
                  ),
                )
              else
                ...leaveProvider.leaveRequests.map(
                  (leave) => GlassCard(
                    margin: const EdgeInsets.only(bottom: 10),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Row(
                          mainAxisAlignment: MainAxisAlignment.spaceBetween,
                          children: [
                            Text(
                              leave.type,
                              style: GoogleFonts.outfit(
                                fontSize: 16,
                                fontWeight: FontWeight.bold,
                                color: AppColors.textPrimary,
                              ),
                            ),
                            StatusBadge(status: leave.status),
                          ],
                        ),
                        const SizedBox(height: 8),
                        Row(
                          children: [
                            const Icon(Icons.date_range_rounded, size: 15, color: AppColors.textMuted),
                            const SizedBox(width: 6),
                            Text(
                              '${leave.startDate} to ${leave.endDate}',
                              style: GoogleFonts.inter(fontSize: 13, color: AppColors.textSecondary, fontWeight: FontWeight.w500),
                            ),
                          ],
                        ),
                        const SizedBox(height: 6),
                        Text(
                          'Reason: ${leave.reason}',
                          style: GoogleFonts.inter(fontSize: 13, color: AppColors.textMuted),
                        ),
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
}
