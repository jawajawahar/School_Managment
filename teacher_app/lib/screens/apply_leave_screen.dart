import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:intl/intl.dart';
import 'package:provider/provider.dart';
import '../constants/app_colors.dart';
import '../models/leave_model.dart';
import '../providers/auth_provider.dart';
import '../providers/leave_provider.dart';
import '../widgets/app_ui.dart';
import '../widgets/status_badge.dart';

const Map<String, IconData> _leaveTypeIcons = {
  'Casual Leave': Icons.event_available_rounded,
  'Sick Leave': Icons.medical_services_outlined,
  'Duty Leave': Icons.work_outline_rounded,
  'Half Day': Icons.schedule_rounded,
};

class ApplyLeaveScreen extends StatefulWidget {
  const ApplyLeaveScreen({super.key});

  @override
  State<ApplyLeaveScreen> createState() => _ApplyLeaveScreenState();
}

class _ApplyLeaveScreenState extends State<ApplyLeaveScreen> {
  String _filter = 'all'; // 'all' | 'pending' | 'approved' | 'rejected'

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) => _refresh());
  }

  Future<void> _refresh() {
    final teacherName = Provider.of<AuthProvider>(context, listen: false).currentUser?.fullName ?? '';
    return Provider.of<LeaveProvider>(context, listen: false).fetchLeaveRequests(teacherName);
  }

  void _openForm() {
    showModalBottomSheet(context: context, isScrollControlled: true, backgroundColor: Colors.transparent, builder: (_) => const _LeaveFormSheet());
  }

  int _dayCount(LeaveModel leave) {
    final start = DateTime.tryParse(leave.startDate);
    final end = DateTime.tryParse(leave.endDate);
    if (start == null || end == null) return 1;
    return end.difference(start).inDays.abs() + 1;
  }

  @override
  Widget build(BuildContext context) {
    final leaveProvider = Provider.of<LeaveProvider>(context);
    final all = leaveProvider.leaveRequests;
    final visible = _filter == 'all' ? all : all.where((l) => l.status == _filter).toList();

    return Scaffold(
      backgroundColor: AppColors.background,
      floatingActionButton: FloatingActionButton.extended(
        onPressed: _openForm,
        backgroundColor: AppColors.accent,
        foregroundColor: Colors.white,
        elevation: 2,
        icon: const Icon(Icons.add_rounded),
        label: Text('Apply Leave', style: GoogleFonts.outfit(fontWeight: FontWeight.bold, fontSize: 14)),
      ),
      body: Column(
        children: [
          AppHeader(
            title: 'Leave',
            subtitle: 'Your applications to the Principal',
            actions: [HeaderIconButton(icon: Icons.refresh_rounded, tooltip: 'Refresh', onPressed: _refresh)],
            bottom: Row(
              children: [
                HeaderStat(value: '${leaveProvider.pendingCount}', label: 'Pending', dotColor: AppColors.lateOrange),
                HeaderStat(value: '${leaveProvider.approvedCount}', label: 'Approved', dotColor: AppColors.presentGreen),
                HeaderStat(value: '${leaveProvider.rejectedCount}', label: 'Rejected', dotColor: AppColors.absentRed),
              ],
            ),
          ),
          Container(
            width: double.infinity,
            decoration: const BoxDecoration(
              color: Colors.white,
              border: Border(bottom: BorderSide(color: AppColors.border)),
            ),
            padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
            child: Row(
              children: [
                _buildFilterChip('all', 'All', all.length),
                _buildFilterChip('pending', 'Pending', leaveProvider.pendingCount),
                _buildFilterChip('approved', 'Approved', leaveProvider.approvedCount),
                _buildFilterChip('rejected', 'Rejected', leaveProvider.rejectedCount),
              ],
            ),
          ),
          Expanded(
            child: RefreshIndicator(
              color: AppColors.accent,
              onRefresh: _refresh,
              child: leaveProvider.isLoading && all.isEmpty
                  ? const Center(child: CircularProgressIndicator(color: AppColors.accent))
                  : visible.isEmpty
                  ? EmptyState(
                      icon: Icons.event_note_outlined,
                      title: all.isEmpty ? 'No leave applications yet' : 'Nothing in this filter',
                      message: all.isEmpty
                          ? 'Tap "Apply Leave" to send your first request to the Principal.'
                          : 'You have no ${_filter == 'all' ? '' : '$_filter '}leave applications.',
                    )
                  : ListView.builder(
                      physics: const AlwaysScrollableScrollPhysics(),
                      padding: const EdgeInsets.fromLTRB(16, 14, 16, 96),
                      itemCount: visible.length,
                      itemBuilder: (context, index) => _buildLeaveCard(visible[index]),
                    ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildFilterChip(String value, String label, int count) {
    final isSelected = _filter == value;
    return Expanded(
      child: GestureDetector(
        behavior: HitTestBehavior.opaque,
        onTap: () => setState(() => _filter = value),
        child: AnimatedContainer(
          duration: const Duration(milliseconds: 150),
          margin: const EdgeInsets.symmetric(horizontal: 3),
          padding: const EdgeInsets.symmetric(horizontal: 4, vertical: 8),
          decoration: BoxDecoration(
            color: isSelected ? AppColors.primary : Colors.white,
            borderRadius: BorderRadius.circular(20),
            border: Border.all(color: isSelected ? AppColors.primary : AppColors.border),
          ),
          child: Text(
            '$label  $count',
            textAlign: TextAlign.center,
            maxLines: 1,
            overflow: TextOverflow.ellipsis,
            style: GoogleFonts.inter(fontSize: 12, fontWeight: FontWeight.w700, color: isSelected ? Colors.white : AppColors.textSecondary),
          ),
        ),
      ),
    );
  }

  Widget _buildLeaveCard(LeaveModel leave) {
    final days = _dayCount(leave);
    final sameDay = leave.startDate == leave.endDate;

    return AppCard(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              IconTile(icon: _leaveTypeIcons[leave.type] ?? Icons.event_note_outlined, color: AppColors.accent),
              const SizedBox(width: 12),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      leave.type,
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                      style: GoogleFonts.outfit(fontSize: 15, fontWeight: FontWeight.bold, color: AppColors.textPrimary),
                    ),
                    const SizedBox(height: 2),
                    Text(
                      sameDay ? formatDisplayDate(leave.startDate) : '${formatDisplayDate(leave.startDate)} – ${formatDisplayDate(leave.endDate)}',
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                      style: GoogleFonts.inter(fontSize: 12, fontWeight: FontWeight.w500, color: AppColors.textSecondary),
                    ),
                  ],
                ),
              ),
              const SizedBox(width: 8),
              Text(
                '$days ${days == 1 ? 'day' : 'days'}',
                style: GoogleFonts.inter(fontSize: 12, fontWeight: FontWeight.w700, color: AppColors.textPrimary),
              ),
            ],
          ),
          if (leave.reason.isNotEmpty) ...[
            const SizedBox(height: 10),
            Container(
              width: double.infinity,
              padding: const EdgeInsets.all(10),
              decoration: BoxDecoration(color: AppColors.background, borderRadius: BorderRadius.circular(10)),
              child: Text(leave.reason, style: GoogleFonts.inter(fontSize: 12, height: 1.4, color: AppColors.textSecondary)),
            ),
          ],
          const SizedBox(height: 10),
          Align(
            alignment: Alignment.centerLeft,
            child: StatusBadge(status: leave.status, fontSize: 10),
          ),
        ],
      ),
    );
  }
}

/// Bottom sheet with the new leave application form.
class _LeaveFormSheet extends StatefulWidget {
  const _LeaveFormSheet();

  @override
  State<_LeaveFormSheet> createState() => _LeaveFormSheetState();
}

class _LeaveFormSheetState extends State<_LeaveFormSheet> {
  final _reasonController = TextEditingController();
  String _leaveType = 'Casual Leave';
  DateTime _startDate = DateTime.now().add(const Duration(days: 1));
  DateTime _endDate = DateTime.now().add(const Duration(days: 1));
  String? _error;

  @override
  void dispose() {
    _reasonController.dispose();
    super.dispose();
  }

  Future<void> _selectDate(bool isStart) async {
    final picked = await showDatePicker(
      context: context,
      initialDate: isStart ? _startDate : _endDate,
      firstDate: isStart ? DateTime.now() : _startDate,
      lastDate: DateTime.now().add(const Duration(days: 90)),
    );
    if (picked == null) return;
    setState(() {
      if (isStart) {
        _startDate = picked;
        if (_endDate.isBefore(_startDate)) _endDate = _startDate;
      } else {
        _endDate = picked;
      }
    });
  }

  Future<void> _submit() async {
    final reason = _reasonController.text.trim();
    if (reason.isEmpty) {
      setState(() => _error = 'Please state the reason for your leave.');
      return;
    }
    setState(() => _error = null);

    final user = Provider.of<AuthProvider>(context, listen: false).currentUser;
    final leaveProvider = Provider.of<LeaveProvider>(context, listen: false);
    final ok = await leaveProvider.applyLeave(
      teacherName: user?.fullName ?? 'Teacher',
      type: _leaveType,
      startDate: DateFormat('yyyy-MM-dd').format(_startDate),
      endDate: DateFormat('yyyy-MM-dd').format(_endDate),
      reason: reason,
    );
    if (!mounted) return;

    if (ok) {
      // Queue the confirmation on the app-level messenger before the sheet closes.
      showAppSnackBar(context, leaveProvider.message ?? 'Leave request submitted!');
      Navigator.pop(context);
    } else {
      setState(() => _error = leaveProvider.message ?? 'The request could not be sent. Please try again.');
    }
  }

  @override
  Widget build(BuildContext context) {
    final isSubmitting = context.watch<LeaveProvider>().isSubmitting;
    final days = _endDate.difference(_startDate).inDays + 1;

    return Padding(
      padding: EdgeInsets.only(bottom: MediaQuery.of(context).viewInsets.bottom),
      child: Container(
        decoration: const BoxDecoration(
          color: Colors.white,
          borderRadius: BorderRadius.vertical(top: Radius.circular(22)),
        ),
        child: SafeArea(
          top: false,
          child: SingleChildScrollView(
            padding: const EdgeInsets.fromLTRB(20, 10, 20, 20),
            child: Column(
              mainAxisSize: MainAxisSize.min,
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Center(
                  child: Container(
                    width: 40,
                    height: 4,
                    decoration: BoxDecoration(color: AppColors.border, borderRadius: BorderRadius.circular(2)),
                  ),
                ),
                const SizedBox(height: 16),
                Row(
                  children: [
                    Expanded(
                      child: Text(
                        'New Leave Application',
                        style: GoogleFonts.outfit(fontSize: 18, fontWeight: FontWeight.bold, color: AppColors.textPrimary),
                      ),
                    ),
                    IconButton(
                      visualDensity: VisualDensity.compact,
                      icon: const Icon(Icons.close_rounded, color: AppColors.textMuted),
                      onPressed: () => Navigator.pop(context),
                    ),
                  ],
                ),
                const SizedBox(height: 12),

                const FieldLabel('Leave type'),
                Wrap(
                  spacing: 8,
                  runSpacing: 8,
                  children: _leaveTypeIcons.entries.map((entry) {
                    final isSelected = _leaveType == entry.key;
                    return GestureDetector(
                      behavior: HitTestBehavior.opaque,
                      onTap: () => setState(() => _leaveType = entry.key),
                      child: AnimatedContainer(
                        duration: const Duration(milliseconds: 150),
                        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 9),
                        decoration: BoxDecoration(
                          color: isSelected ? AppColors.accent : Colors.white,
                          borderRadius: BorderRadius.circular(12),
                          border: Border.all(color: isSelected ? AppColors.accent : AppColors.border),
                        ),
                        child: Row(
                          mainAxisSize: MainAxisSize.min,
                          children: [
                            Icon(entry.value, size: 15, color: isSelected ? Colors.white : AppColors.textSecondary),
                            const SizedBox(width: 6),
                            Text(
                              entry.key,
                              style: GoogleFonts.inter(fontSize: 12, fontWeight: FontWeight.w700, color: isSelected ? Colors.white : AppColors.textPrimary),
                            ),
                          ],
                        ),
                      ),
                    );
                  }).toList(),
                ),
                const SizedBox(height: 16),

                Row(
                  children: [
                    Expanded(child: _buildDateField('From', _startDate, () => _selectDate(true))),
                    const SizedBox(width: 10),
                    Expanded(child: _buildDateField('To', _endDate, () => _selectDate(false))),
                  ],
                ),
                const SizedBox(height: 6),
                Text(
                  '$days ${days == 1 ? 'day' : 'days'} of leave',
                  style: GoogleFonts.inter(fontSize: 12, fontWeight: FontWeight.w600, color: AppColors.accent),
                ),
                const SizedBox(height: 16),

                const FieldLabel('Reason'),
                TextField(
                  controller: _reasonController,
                  maxLines: 3,
                  textCapitalization: TextCapitalization.sentences,
                  style: GoogleFonts.inter(fontSize: 13, color: AppColors.textPrimary),
                  decoration: appInputDecoration('Why do you need this leave?'),
                ),

                if (_error != null) ...[
                  const SizedBox(height: 10),
                  Row(
                    children: [
                      const Icon(Icons.error_outline_rounded, size: 15, color: AppColors.absentRed),
                      const SizedBox(width: 6),
                      Expanded(
                        child: Text(_error!, style: GoogleFonts.inter(fontSize: 12, color: AppColors.absentRed)),
                      ),
                    ],
                  ),
                ],
                const SizedBox(height: 18),

                PrimaryButton(label: 'Submit to Principal', icon: Icons.send_rounded, isBusy: isSubmitting, onPressed: _submit),
              ],
            ),
          ),
        ),
      ),
    );
  }

  Widget _buildDateField(String label, DateTime date, VoidCallback onTap) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        FieldLabel(label),
        GestureDetector(
          behavior: HitTestBehavior.opaque,
          onTap: onTap,
          child: Container(
            padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 13),
            decoration: BoxDecoration(
              color: AppColors.background,
              borderRadius: BorderRadius.circular(12),
              border: Border.all(color: AppColors.border),
            ),
            child: Row(
              children: [
                const Icon(Icons.calendar_today_rounded, size: 15, color: AppColors.accent),
                const SizedBox(width: 8),
                Expanded(
                  child: Text(
                    DateFormat('dd MMM yyyy').format(date),
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                    style: GoogleFonts.inter(fontSize: 13, fontWeight: FontWeight.w700, color: AppColors.textPrimary),
                  ),
                ),
              ],
            ),
          ),
        ),
      ],
    );
  }
}
