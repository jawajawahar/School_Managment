import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:provider/provider.dart';
import '../constants/app_colors.dart';
import '../models/announcement_model.dart';
import '../providers/auth_provider.dart';
import '../providers/notification_provider.dart';
import '../widgets/app_ui.dart';

class SendAlertScreen extends StatefulWidget {
  const SendAlertScreen({super.key});

  @override
  State<SendAlertScreen> createState() => _SendAlertScreenState();
}

class _SendAlertScreenState extends State<SendAlertScreen> {
  static const List<_AlertCategory> _categories = [
    _AlertCategory('Emergency Alert', 'Emergency', Icons.warning_amber_rounded, AppColors.absentRed),
    _AlertCategory('Academic Issue', 'Academic', Icons.school_outlined, AppColors.accent),
    _AlertCategory('Facilities', 'Facilities', Icons.build_outlined, AppColors.lateOrange),
  ];

  final _titleController = TextEditingController();
  final _messageController = TextEditingController();
  String _category = 'Emergency Alert';
  int _tabIndex = 0; // 0 = announcements from the school, 1 = message the Principal

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) => _refresh());
  }

  @override
  void dispose() {
    _titleController.dispose();
    _messageController.dispose();
    super.dispose();
  }

  Future<void> _refresh() => Provider.of<NotificationProvider>(context, listen: false).fetchAnnouncements();

  Future<void> _sendAlert() async {
    final title = _titleController.text.trim();
    final message = _messageController.text.trim();

    if (title.isEmpty || message.isEmpty) {
      showAppSnackBar(context, 'Please enter both a subject and a message.', isError: true);
      return;
    }

    FocusManager.instance.primaryFocus?.unfocus();
    final user = Provider.of<AuthProvider>(context, listen: false).currentUser;
    final notifProvider = Provider.of<NotificationProvider>(context, listen: false);

    final ok = await notifProvider.sendAlertToPrincipal(
      title: '[$_category] $title',
      message: message,
      teacherName: user?.fullName ?? 'Teacher',
    );
    if (!mounted) return;

    if (ok) {
      _titleController.clear();
      _messageController.clear();
    }
    showAppSnackBar(
      context,
      notifProvider.statusMessage ?? (ok ? 'Alert sent to Principal!' : 'Could not send alert. Please try again.'),
      isError: !ok,
    );
  }

  @override
  Widget build(BuildContext context) {
    final notifProvider = Provider.of<NotificationProvider>(context);

    return Scaffold(
      backgroundColor: AppColors.background,
      body: Column(
        children: [
          AppHeader(
            title: 'Alerts',
            subtitle: 'School announcements and messages to the Principal',
            actions: [
              HeaderIconButton(icon: Icons.refresh_rounded, tooltip: 'Refresh', onPressed: _refresh),
            ],
            bottom: HeaderSegmentedControl(
              labels: const ['Announcements', 'Message Principal'],
              icons: const [Icons.campaign_outlined, Icons.send_outlined],
              counts: [notifProvider.announcements.length, null],
              selectedIndex: _tabIndex,
              onChanged: (index) => setState(() => _tabIndex = index),
            ),
          ),
          Expanded(
            child: _tabIndex == 0 ? _buildAnnouncements(notifProvider) : _buildComposer(notifProvider),
          ),
        ],
      ),
    );
  }

  // --------------------------------------------------------- announcements

  Widget _buildAnnouncements(NotificationProvider notifProvider) {
    final items = notifProvider.announcements;

    return RefreshIndicator(
      color: AppColors.accent,
      onRefresh: _refresh,
      child: notifProvider.isLoading && items.isEmpty
          ? const Center(child: CircularProgressIndicator(color: AppColors.accent))
          : items.isEmpty
              ? const EmptyState(
                  icon: Icons.campaign_outlined,
                  title: 'No announcements',
                  message: 'Notices posted by the school office will appear here. Pull down to refresh.',
                )
              : ListView.builder(
                  physics: const AlwaysScrollableScrollPhysics(),
                  padding: const EdgeInsets.fromLTRB(16, 16, 16, 24),
                  itemCount: items.length,
                  itemBuilder: (context, index) => _buildAnnouncementCard(items[index]),
                ),
    );
  }

  Widget _buildAnnouncementCard(AnnouncementModel ann) {
    final color = ann.isEmergency ? AppColors.absentRed : AppColors.accent;

    return AppCard(
      borderColor: ann.isEmergency ? AppColors.absentRed.withValues(alpha: 0.4) : null,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              IconTile(icon: ann.isEmergency ? Icons.warning_amber_rounded : Icons.campaign_outlined, color: color),
              const SizedBox(width: 12),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    if (ann.isEmergency)
                      Padding(
                        padding: const EdgeInsets.only(bottom: 3),
                        child: Text(
                          'EMERGENCY',
                          style: GoogleFonts.inter(fontSize: 10, fontWeight: FontWeight.w800, letterSpacing: 0.8, color: AppColors.absentRed),
                        ),
                      ),
                    Text(
                      ann.title,
                      style: GoogleFonts.outfit(fontSize: 15, height: 1.2, fontWeight: FontWeight.bold, color: AppColors.textPrimary),
                    ),
                  ],
                ),
              ),
            ],
          ),
          const SizedBox(height: 10),
          Text(
            ann.body,
            style: GoogleFonts.inter(fontSize: 13, height: 1.45, color: AppColors.textSecondary),
          ),
          const SizedBox(height: 12),
          const Divider(height: 1, color: AppColors.border),
          const SizedBox(height: 10),
          Row(
            children: [
              const Icon(Icons.person_outline_rounded, size: 14, color: AppColors.textMuted),
              const SizedBox(width: 4),
              Expanded(
                child: Text(
                  ann.createdBy,
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                  style: GoogleFonts.inter(fontSize: 11, fontWeight: FontWeight.w600, color: AppColors.textSecondary),
                ),
              ),
              Text(
                formatDisplayDate(ann.createdAt, withTime: true),
                style: GoogleFonts.inter(fontSize: 11, color: AppColors.textMuted),
              ),
            ],
          ),
        ],
      ),
    );
  }

  // --------------------------------------------------------------- composer

  Widget _buildComposer(NotificationProvider notifProvider) {
    return SingleChildScrollView(
      keyboardDismissBehavior: ScrollViewKeyboardDismissBehavior.onDrag,
      padding: const EdgeInsets.fromLTRB(16, 16, 16, 24),
      child: AppCard(
        margin: EdgeInsets.zero,
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                const IconTile(icon: Icons.campaign_rounded, color: AppColors.accent),
                const SizedBox(width: 12),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        "Notify the Principal's Office",
                        style: GoogleFonts.outfit(fontSize: 16, fontWeight: FontWeight.bold, color: AppColors.textPrimary),
                      ),
                      Text(
                        'Delivered instantly to the Principal.',
                        style: GoogleFonts.inter(fontSize: 12, color: AppColors.textSecondary),
                      ),
                    ],
                  ),
                ),
              ],
            ),
            const SizedBox(height: 18),

            const FieldLabel('Category'),
            Row(
              children: _categories.map((category) {
                final isSelected = _category == category.value;
                return Expanded(
                  child: GestureDetector(
                    behavior: HitTestBehavior.opaque,
                    onTap: () => setState(() => _category = category.value),
                    child: AnimatedContainer(
                      duration: const Duration(milliseconds: 150),
                      margin: const EdgeInsets.symmetric(horizontal: 3),
                      padding: const EdgeInsets.symmetric(vertical: 12, horizontal: 4),
                      decoration: BoxDecoration(
                        color: isSelected ? category.color.withValues(alpha: 0.08) : Colors.white,
                        borderRadius: BorderRadius.circular(12),
                        border: Border.all(color: isSelected ? category.color : AppColors.border, width: isSelected ? 1.5 : 1),
                      ),
                      child: Column(
                        children: [
                          Icon(category.icon, size: 20, color: isSelected ? category.color : AppColors.textMuted),
                          const SizedBox(height: 6),
                          Text(
                            category.label,
                            maxLines: 1,
                            overflow: TextOverflow.ellipsis,
                            style: GoogleFonts.inter(
                              fontSize: 12,
                              fontWeight: FontWeight.w700,
                              color: isSelected ? category.color : AppColors.textSecondary,
                            ),
                          ),
                        ],
                      ),
                    ),
                  ),
                );
              }).toList(),
            ),
            const SizedBox(height: 16),

            const FieldLabel('Subject'),
            TextField(
              controller: _titleController,
              textCapitalization: TextCapitalization.sentences,
              style: GoogleFonts.inter(fontSize: 13, color: AppColors.textPrimary),
              decoration: appInputDecoration('What is this about?'),
            ),
            const SizedBox(height: 16),

            const FieldLabel('Message'),
            TextField(
              controller: _messageController,
              maxLines: 5,
              textCapitalization: TextCapitalization.sentences,
              style: GoogleFonts.inter(fontSize: 13, color: AppColors.textPrimary),
              decoration: appInputDecoration("Give the details the Principal needs to act on."),
            ),
            const SizedBox(height: 18),

            PrimaryButton(
              label: 'Send to Principal',
              icon: Icons.send_rounded,
              isBusy: notifProvider.isSending,
              onPressed: _sendAlert,
            ),
          ],
        ),
      ),
    );
  }
}

class _AlertCategory {
  final String value;
  final String label;
  final IconData icon;
  final Color color;

  const _AlertCategory(this.value, this.label, this.icon, this.color);
}
