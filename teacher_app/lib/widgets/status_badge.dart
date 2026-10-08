import 'package:flutter/material.dart';
import '../constants/app_colors.dart';

class StatusBadge extends StatelessWidget {
  final String status;
  final double fontSize;

  const StatusBadge({
    super.key,
    required this.status,
    this.fontSize = 12.0,
  });

  @override
  Widget build(BuildContext context) {
    Color bg;
    Color fg;
    String label;
    IconData icon;

    switch (status.toLowerCase()) {
      case 'present':
      case 'approved':
        bg = AppColors.presentGreen.withValues(alpha: 0.15);
        fg = AppColors.presentGreen;
        label = status.toUpperCase();
        icon = Icons.check_circle;
        break;
      case 'absent':
      case 'rejected':
        bg = AppColors.absentRed.withValues(alpha: 0.15);
        fg = AppColors.absentRed;
        label = status.toUpperCase();
        icon = Icons.cancel;
        break;
      case 'late':
        bg = AppColors.lateOrange.withValues(alpha: 0.15);
        fg = AppColors.lateOrange;
        label = status.toUpperCase();
        icon = Icons.access_time_filled;
        break;
      case 'pending':
        bg = AppColors.accentAmber.withValues(alpha: 0.15);
        fg = AppColors.accentAmber;
        label = 'PENDING APPROVAL';
        icon = Icons.hourglass_top_rounded;
        break;
      default:
        bg = AppColors.excusedBlue.withValues(alpha: 0.15);
        fg = AppColors.excusedBlue;
        label = status.toUpperCase();
        icon = Icons.info;
        break;
    }

    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
      decoration: BoxDecoration(
        color: bg,
        borderRadius: BorderRadius.circular(20),
        border: Border.all(color: fg.withValues(alpha: 0.3), width: 1),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Icon(icon, size: fontSize + 2, color: fg),
          const SizedBox(width: 4),
          Text(
            label,
            style: TextStyle(
              color: fg,
              fontWeight: FontWeight.bold,
              fontSize: fontSize,
              letterSpacing: 0.5,
            ),
          ),
        ],
      ),
    );
  }
}
