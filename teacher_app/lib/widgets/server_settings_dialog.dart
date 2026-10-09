import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:provider/provider.dart';
import '../constants/api_constants.dart';
import '../constants/app_colors.dart';
import '../providers/attendance_provider.dart';

class ServerSettingsDialog extends StatefulWidget {
  const ServerSettingsDialog({super.key});

  static Future<void> show(BuildContext context) async {
    await showDialog(
      context: context,
      builder: (_) => const ServerSettingsDialog(),
    );
  }

  @override
  State<ServerSettingsDialog> createState() => _ServerSettingsDialogState();
}

class _ServerSettingsDialogState extends State<ServerSettingsDialog> {
  late TextEditingController _ipController;
  bool _isSaving = false;
  String? _statusMessage;
  bool _isSuccess = false;

  @override
  void initState() {
    super.initState();
    _ipController = TextEditingController(text: ApiConstants.baseUrl);
  }

  @override
  void dispose() {
    _ipController.dispose();
    super.dispose();
  }

  Future<void> _saveAndTest() async {
    final input = _ipController.text.trim();
    if (input.isEmpty) return;

    setState(() {
      _isSaving = true;
      _statusMessage = null;
    });

    await ApiConstants.setCustomHost(input);

    if (mounted) {
      final attProvider = Provider.of<AttendanceProvider>(context, listen: false);
      await attProvider.loadClasses();

      setState(() {
        _isSaving = false;
        if (attProvider.classes.isNotEmpty) {
          _isSuccess = true;
          _statusMessage = 'Connected! Found ${attProvider.classes.length} classes in PostgreSQL.';
        } else {
          _isSuccess = false;
          _statusMessage = 'Saved URL, but no classes returned. Verify server is running on PC.';
        }
      });
    }
  }

  void _applyPreset(String presetUrl) {
    _ipController.text = presetUrl;
    _saveAndTest();
  }

  @override
  Widget build(BuildContext context) {
    return AlertDialog(
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(20)),
      title: Row(
        children: [
          Container(
            padding: const EdgeInsets.all(8),
            decoration: BoxDecoration(
              color: AppColors.primary.withValues(alpha: 0.1),
              borderRadius: BorderRadius.circular(10),
            ),
            child: const Icon(Icons.dns_rounded, color: AppColors.primary),
          ),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  'Server Connection',
                  style: GoogleFonts.outfit(fontWeight: FontWeight.bold, fontSize: 18),
                ),
                Text(
                  'Set PC IP address for iPhone sync',
                  style: GoogleFonts.inter(fontSize: 12, color: AppColors.textSecondary),
                ),
              ],
            ),
          ),
        ],
      ),
      content: SingleChildScrollView(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              'Backend Server URL:',
              style: GoogleFonts.inter(fontWeight: FontWeight.w600, fontSize: 13),
            ),
            const SizedBox(height: 8),
            TextField(
              controller: _ipController,
              decoration: InputDecoration(
                hintText: 'e.g. http://172.20.10.3:5000/api',
                filled: true,
                fillColor: AppColors.background,
                prefixIcon: const Icon(Icons.link_rounded, size: 20, color: AppColors.primary),
                contentPadding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
                border: OutlineInputBorder(
                  borderRadius: BorderRadius.circular(12),
                  borderSide: BorderSide(color: Colors.black.withValues(alpha: 0.1)),
                ),
              ),
              style: GoogleFonts.inter(fontSize: 14),
            ),
            const SizedBox(height: 12),
            Text(
              'Quick Presets:',
              style: GoogleFonts.inter(fontWeight: FontWeight.w600, fontSize: 12, color: AppColors.textSecondary),
            ),
            const SizedBox(height: 6),
            Wrap(
              spacing: 8,
              runSpacing: 6,
              children: [
                ActionChip(
                  avatar: const Icon(Icons.wifi_rounded, size: 14, color: AppColors.primary),
                  label: Text('Hotspot (172.20.10.3)', style: GoogleFonts.inter(fontSize: 11)),
                  onPressed: () => _applyPreset('http://172.20.10.3:5000/api'),
                  backgroundColor: AppColors.primary.withValues(alpha: 0.08),
                ),
                ActionChip(
                  avatar: const Icon(Icons.computer_rounded, size: 14, color: AppColors.textSecondary),
                  label: Text('Localhost', style: GoogleFonts.inter(fontSize: 11)),
                  onPressed: () => _applyPreset('http://localhost:5000/api'),
                  backgroundColor: Colors.grey.shade100,
                ),
              ],
            ),
            if (_statusMessage != null) ...[
              const SizedBox(height: 14),
              Container(
                padding: const EdgeInsets.all(10),
                decoration: BoxDecoration(
                  color: _isSuccess ? AppColors.presentGreen.withValues(alpha: 0.12) : AppColors.absentRed.withValues(alpha: 0.12),
                  borderRadius: BorderRadius.circular(10),
                  border: Border.all(
                    color: _isSuccess ? AppColors.presentGreen : AppColors.absentRed,
                    width: 0.5,
                  ),
                ),
                child: Row(
                  children: [
                    Icon(
                      _isSuccess ? Icons.check_circle_rounded : Icons.warning_amber_rounded,
                      color: _isSuccess ? AppColors.presentGreen : AppColors.absentRed,
                      size: 20,
                    ),
                    const SizedBox(width: 8),
                    Expanded(
                      child: Text(
                        _statusMessage!,
                        style: GoogleFonts.inter(
                          fontSize: 12,
                          fontWeight: FontWeight.w500,
                          color: _isSuccess ? AppColors.presentGreen : AppColors.absentRed,
                        ),
                      ),
                    ),
                  ],
                ),
              ),
            ],
          ],
        ),
      ),
      actions: [
        TextButton(
          onPressed: () => Navigator.pop(context),
          child: Text('Close', style: GoogleFonts.inter(color: AppColors.textSecondary)),
        ),
        ElevatedButton(
          style: ElevatedButton.styleFrom(
            backgroundColor: AppColors.primary,
            shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
          ),
          onPressed: _isSaving ? null : _saveAndTest,
          child: _isSaving
              ? const SizedBox(width: 16, height: 16, child: CircularProgressIndicator(color: Colors.white, strokeWidth: 2))
              : Text('Save & Test', style: GoogleFonts.outfit(color: Colors.white, fontWeight: FontWeight.bold)),
        ),
      ],
    );
  }
}
