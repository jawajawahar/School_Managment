import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:url_launcher/url_launcher.dart';
import '../constants/app_colors.dart';
import 'app_ui.dart';

/// Digits (and a leading +) only, as dialers expect.
String _dialable(String phone) => phone.replaceAll(RegExp(r'[^0-9+]'), '');

/// WhatsApp needs the full international number; local Sri Lankan numbers start with 0.
String _whatsAppNumber(String phone) {
  final digits = phone.replaceAll(RegExp(r'[^0-9]'), '');
  return digits.startsWith('0') ? '94${digits.substring(1)}' : digits;
}

Future<void> _open(BuildContext context, Uri uri, String failure) async {
  var opened = false;
  try {
    opened = await launchUrl(uri, mode: LaunchMode.externalApplication);
  } catch (_) {
    opened = false;
  }
  if (!opened && context.mounted) showAppSnackBar(context, failure, isError: true);
}

Future<void> callGuardian(BuildContext context, String phone) =>
    _open(context, Uri(scheme: 'tel', path: _dialable(phone)), 'Could not open the phone dialer.');

Future<void> textGuardian(BuildContext context, String phone, String message) =>
    _open(context, Uri(scheme: 'sms', path: _dialable(phone), queryParameters: {'body': message}), 'Could not open messages.');

Future<void> whatsAppGuardian(BuildContext context, String phone, String message) => _open(
      context,
      Uri.https('wa.me', '/${_whatsAppNumber(phone)}', {'text': message}),
      'Could not open WhatsApp.',
    );

/// Round call button for list rows. Disabled when no number is on file.
class CallGuardianButton extends StatelessWidget {
  final String phone;

  const CallGuardianButton({super.key, required this.phone});

  @override
  Widget build(BuildContext context) {
    final hasPhone = phone.trim().isNotEmpty;
    final color = hasPhone ? AppColors.presentGreen : AppColors.textMuted;

    return Tooltip(
      message: hasPhone ? 'Call guardian' : 'No guardian phone on file',
      child: GestureDetector(
        behavior: HitTestBehavior.opaque,
        onTap: hasPhone ? () => callGuardian(context, phone) : null,
        child: Container(
          width: 38,
          height: 38,
          decoration: BoxDecoration(
            color: color.withValues(alpha: 0.1),
            shape: BoxShape.circle,
          ),
          child: Icon(hasPhone ? Icons.call_rounded : Icons.phone_disabled_outlined, size: 18, color: color),
        ),
      ),
    );
  }
}

/// Labelled contact action used on the student profile.
class ContactActionButton extends StatelessWidget {
  final IconData icon;
  final String label;
  final Color color;
  final VoidCallback? onTap;

  const ContactActionButton({super.key, required this.icon, required this.label, required this.color, required this.onTap});

  @override
  Widget build(BuildContext context) {
    final effective = onTap == null ? AppColors.textMuted : color;
    return Expanded(
      child: GestureDetector(
        behavior: HitTestBehavior.opaque,
        onTap: onTap,
        child: Container(
          margin: const EdgeInsets.symmetric(horizontal: 4),
          padding: const EdgeInsets.symmetric(vertical: 12),
          decoration: BoxDecoration(
            color: effective.withValues(alpha: 0.08),
            borderRadius: BorderRadius.circular(12),
            border: Border.all(color: effective.withValues(alpha: 0.25)),
          ),
          child: Column(
            children: [
              Icon(icon, size: 20, color: effective),
              const SizedBox(height: 4),
              Text(label, style: GoogleFonts.inter(fontSize: 12, fontWeight: FontWeight.w700, color: effective)),
            ],
          ),
        ),
      ),
    );
  }
}
