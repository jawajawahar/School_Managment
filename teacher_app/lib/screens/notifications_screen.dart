import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:provider/provider.dart';
import '../constants/app_colors.dart';
import '../models/app_notification_model.dart';
import '../providers/auth_provider.dart';
import '../providers/notification_provider.dart';

class NotificationsScreen extends StatefulWidget {
  const NotificationsScreen({super.key});

  @override
  State<NotificationsScreen> createState() => _NotificationsScreenState();
}

class _NotificationsScreenState extends State<NotificationsScreen> {
  String _selectedFilter = 'all'; // 'all' | 'unread' | 'timetable' | 'at_risk' | 'announcement'

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      _loadNotifications();
    });
  }

  void _loadNotifications() {
    final user = Provider.of<AuthProvider>(context, listen: false).currentUser;
    if (user != null) {
      Provider.of<NotificationProvider>(context, listen: false).fetchTeacherNotifications(
        userId: user.id,
        teacherId: user.teacherId ?? user.id,
        classId: user.assignedClassId,
      );
    }
  }

  String _formatTimeAgo(DateTime dateTime) {
    final diff = DateTime.now().difference(dateTime);
    if (diff.inMinutes < 1) return 'Just now';
    if (diff.inMinutes < 60) return '${diff.inMinutes}m ago';
    if (diff.inHours < 24) return '${diff.inHours}h ago';
    if (diff.inDays < 7) return '${diff.inDays}d ago';
    return '${dateTime.day}/${dateTime.month}/${dateTime.year}';
  }

  Widget _getNotifIcon(String category, String title) {
    final t = title.toLowerCase();
    final c = category.toLowerCase();

    if (c == 'timetable' || t.contains('timetable') || t.contains('schedule')) {
      return Container(
        padding: const EdgeInsets.all(10),
        decoration: BoxDecoration(
          color: AppColors.primary.withValues(alpha: 0.12),
          borderRadius: BorderRadius.circular(12),
        ),
        child: const Icon(Icons.calendar_month_rounded, color: AppColors.primary, size: 22),
      );
    } else if (c == 'at_risk' || t.contains('risk') || t.contains('meeting') || t.contains('remedial') || t.contains('parent')) {
      return Container(
        padding: const EdgeInsets.all(10),
        decoration: BoxDecoration(
          color: AppColors.absentRed.withValues(alpha: 0.12),
          borderRadius: BorderRadius.circular(12),
        ),
        child: const Icon(Icons.warning_amber_rounded, color: AppColors.absentRed, size: 22),
      );
    } else if (c == 'announcement' || t.contains('announcement') || t.contains('notice')) {
      return Container(
        padding: const EdgeInsets.all(10),
        decoration: BoxDecoration(
          color: AppColors.accent.withValues(alpha: 0.12),
          borderRadius: BorderRadius.circular(12),
        ),
        child: const Icon(Icons.campaign_rounded, color: AppColors.accent, size: 22),
      );
    }

    return Container(
      padding: const EdgeInsets.all(10),
      decoration: BoxDecoration(
        color: AppColors.primary.withValues(alpha: 0.1),
        borderRadius: BorderRadius.circular(12),
      ),
      child: const Icon(Icons.notifications_active_rounded, color: AppColors.primary, size: 22),
    );
  }

  void _showNotificationDetails(AppNotificationModel item) {
    final notifProvider = Provider.of<NotificationProvider>(context, listen: false);
    if (!item.isRead) {
      notifProvider.markAsRead(item.id);
    }

    showDialog(
      context: context,
      builder: (ctx) => AlertDialog(
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(20)),
        title: Row(
          children: [
            _getNotifIcon(item.category, item.title),
            const SizedBox(width: 12),
            Expanded(
              child: Text(
                item.title,
                style: GoogleFonts.outfit(fontWeight: FontWeight.bold, fontSize: 18, color: AppColors.textPrimary),
              ),
            ),
          ],
        ),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              _formatTimeAgo(item.sentAt),
              style: GoogleFonts.inter(fontSize: 12, color: AppColors.textMuted, fontWeight: FontWeight.w500),
            ),
            const SizedBox(height: 12),
            Text(
              item.message,
              style: GoogleFonts.inter(fontSize: 14, color: AppColors.textSecondary, height: 1.5),
            ),
          ],
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(ctx),
            child: Text('Close', style: GoogleFonts.outfit(fontWeight: FontWeight.bold, color: AppColors.primary)),
          ),
        ],
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final notifProvider = Provider.of<NotificationProvider>(context);
    final user = Provider.of<AuthProvider>(context).currentUser;

    final allNotifs = notifProvider.notifications;
    final unreadCount = notifProvider.unreadCount;

    final filteredNotifs = allNotifs.where((n) {
      if (_selectedFilter == 'unread') return !n.isRead;
      if (_selectedFilter == 'timetable') return n.category == 'timetable' || n.title.toLowerCase().contains('timetable');
      if (_selectedFilter == 'at_risk') return n.category == 'at_risk' || n.title.toLowerCase().contains('risk') || n.title.toLowerCase().contains('meeting');
      if (_selectedFilter == 'announcement') return n.category == 'announcement' || n.title.toLowerCase().contains('broadcast') || n.title.toLowerCase().contains('notice');
      return true;
    }).toList();

    return Scaffold(
      backgroundColor: AppColors.background,
      appBar: AppBar(
        backgroundColor: AppColors.primaryDark,
        surfaceTintColor: Colors.transparent,
        elevation: 0,
        flexibleSpace: Container(decoration: const BoxDecoration(gradient: AppColors.executiveGradient)),
        leading: IconButton(
          icon: const Icon(Icons.arrow_back_ios_new_rounded, color: Colors.white, size: 20),
          onPressed: () => Navigator.pop(context),
        ),
        title: Row(
          children: [
            Text(
              'Notifications',
              style: GoogleFonts.outfit(color: Colors.white, fontWeight: FontWeight.bold, fontSize: 20),
            ),
            if (unreadCount > 0) ...[
              const SizedBox(width: 8),
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
                decoration: BoxDecoration(
                  color: AppColors.absentRed,
                  borderRadius: BorderRadius.circular(12),
                ),
                child: Text(
                  '$unreadCount NEW',
                  style: GoogleFonts.inter(color: Colors.white, fontWeight: FontWeight.bold, fontSize: 10),
                ),
              ),
            ],
          ],
        ),
        actions: [
          if (unreadCount > 0)
            TextButton.icon(
              onPressed: () {
                if (user != null) {
                  notifProvider.markAllAsRead(user.id);
                }
              },
              icon: const Icon(Icons.done_all_rounded, size: 18, color: Colors.white),
              label: Text(
                'Mark Read',
                style: GoogleFonts.inter(color: Colors.white, fontWeight: FontWeight.bold, fontSize: 12),
              ),
            ),
        ],
      ),
      body: RefreshIndicator(
        onRefresh: () async => _loadNotifications(),
        color: AppColors.primary,
        child: Column(
          children: [
            // Filter Tabs Bar
            SingleChildScrollView(
              scrollDirection: Axis.horizontal,
              padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
              child: Row(
                children: [
                  _buildFilterChip('all', 'All (${allNotifs.length})'),
                  _buildFilterChip('unread', 'Unread ($unreadCount)'),
                  _buildFilterChip('timetable', 'Timetables'),
                  _buildFilterChip('at_risk', 'At-Risk Alerts'),
                  _buildFilterChip('announcement', 'Notices'),
                ],
              ),
            ),

            // Notifications List / Empty State
            Expanded(
              child: notifProvider.isLoading
                  ? const Center(child: CircularProgressIndicator(color: AppColors.primary))
                  : filteredNotifs.isEmpty
                      ? ListView(
                          physics: const AlwaysScrollableScrollPhysics(),
                          children: [
                            const SizedBox(height: 80),
                            Center(
                              child: Column(
                                mainAxisAlignment: MainAxisAlignment.center,
                                children: [
                                  Container(
                                    width: 70,
                                    height: 70,
                                    decoration: BoxDecoration(
                                      color: AppColors.primary.withValues(alpha: 0.08),
                                      shape: BoxShape.circle,
                                    ),
                                    child: const Icon(Icons.notifications_off_outlined, size: 36, color: AppColors.textMuted),
                                  ),
                                  const SizedBox(height: 16),
                                  Text(
                                    _selectedFilter == 'unread'
                                        ? 'All caught up!'
                                        : 'No notifications found',
                                    style: GoogleFonts.outfit(fontWeight: FontWeight.bold, fontSize: 18, color: AppColors.textPrimary),
                                  ),
                                  const SizedBox(height: 6),
                                  Text(
                                    _selectedFilter == 'unread'
                                        ? 'You have read all targeted messages from Principal.'
                                        : 'There are no notifications matching this category.',
                                    style: GoogleFonts.inter(fontSize: 13, color: AppColors.textMuted),
                                    textAlign: TextAlign.center,
                                  ),
                                ],
                              ),
                            ),
                          ],
                        )
                      : ListView.builder(
                          physics: const AlwaysScrollableScrollPhysics(),
                          padding: const EdgeInsets.all(16),
                          itemCount: filteredNotifs.length,
                          itemBuilder: (ctx, idx) {
                            final item = filteredNotifs[idx];
                            return _buildNotificationCard(item);
                          },
                        ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildFilterChip(String filterKey, String label) {
    final isSelected = _selectedFilter == filterKey;
    return Padding(
      padding: const EdgeInsets.only(right: 8.0),
      child: FilterChip(
        selected: isSelected,
        label: Text(
          label,
          style: GoogleFonts.inter(
            color: isSelected ? Colors.white : AppColors.textSecondary,
            fontWeight: isSelected ? FontWeight.bold : FontWeight.w500,
            fontSize: 12,
          ),
        ),
        backgroundColor: Colors.white,
        selectedColor: AppColors.primary,
        checkmarkColor: Colors.white,
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(20),
          side: BorderSide(
            color: isSelected ? AppColors.primary : Colors.grey.shade300,
          ),
        ),
        onSelected: (_) {
          setState(() {
            _selectedFilter = filterKey;
          });
        },
      ),
    );
  }

  Widget _buildNotificationCard(AppNotificationModel item) {
    return Container(
      margin: const EdgeInsets.only(bottom: 12),
      decoration: BoxDecoration(
        color: item.isRead ? Colors.white : AppColors.primary.withValues(alpha: 0.04),
        borderRadius: BorderRadius.circular(16),
        border: Border.all(
          color: item.isRead ? Colors.grey.shade200 : AppColors.primary.withValues(alpha: 0.3),
          width: item.isRead ? 1 : 1.5,
        ),
        boxShadow: AppColors.softShadow,
      ),
      child: Material(
        color: Colors.transparent,
        borderRadius: BorderRadius.circular(16),
        child: InkWell(
          borderRadius: BorderRadius.circular(16),
          onTap: () => _showNotificationDetails(item),
          child: Padding(
            padding: const EdgeInsets.all(16.0),
            child: Row(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                _getNotifIcon(item.category, item.title),
                const SizedBox(width: 12),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Row(
                        mainAxisAlignment: MainAxisAlignment.spaceBetween,
                        children: [
                          Expanded(
                            child: Text(
                              item.title,
                              style: GoogleFonts.outfit(
                                fontWeight: item.isRead ? FontWeight.w600 : FontWeight.bold,
                                fontSize: 15,
                                color: AppColors.textPrimary,
                              ),
                              maxLines: 1,
                              overflow: TextOverflow.ellipsis,
                            ),
                          ),
                          const SizedBox(width: 8),
                          Text(
                            _formatTimeAgo(item.sentAt),
                            style: GoogleFonts.inter(
                              fontSize: 11,
                              color: AppColors.textMuted,
                              fontWeight: FontWeight.w500,
                            ),
                          ),
                        ],
                      ),
                      const SizedBox(height: 6),
                      Text(
                        item.message,
                        style: GoogleFonts.inter(
                          fontSize: 13,
                          color: AppColors.textSecondary,
                          height: 1.4,
                        ),
                        maxLines: 2,
                        overflow: TextOverflow.ellipsis,
                      ),
                    ],
                  ),
                ),
                if (!item.isRead) ...[
                  const SizedBox(width: 8),
                  Container(
                    width: 10,
                    height: 10,
                    decoration: const BoxDecoration(
                      color: AppColors.primary,
                      shape: BoxShape.circle,
                    ),
                  ),
                ],
              ],
            ),
          ),
        ),
      ),
    );
  }
}
