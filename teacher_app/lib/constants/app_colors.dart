import 'package:flutter/material.dart';

class AppColors {
  // Professional 2-3 Color Executive Palette
  static const Color primary = Color(0xFF1E293B);      // Executive Dark Slate
  static const Color primaryDark = Color(0xFF0F172A);  // Deep Midnight Obsidian
  static const Color accent = Color(0xFF2563EB);       // Professional Royal Blue
  static const Color accentLight = Color(0xFFDBEAFE);  // Soft Slate Blue

  // Minimal Muted Status Tokens
  static const Color presentGreen = Color(0xFF16A34A);
  static const Color absentRed = Color(0xFFDC2626);
  static const Color lateOrange = Color(0xFFD97706);
  static const Color excusedBlue = Color(0xFF2563EB);

  // Surface & Neutral Backgrounds
  static const Color background = Color(0xFFF8FAFC);   // Crisp Light Slate Grey
  static const Color surface = Color(0xFFFFFFFF);      // Clean Pure White Card
  static const Color border = Color(0xFFE2E8F0);       // Subtle Slate Border

  // High-Contrast Enterprise Typography
  static const Color textPrimary = Color(0xFF0F172A);   // Deep Slate Black
  static const Color textSecondary = Color(0xFF475569); // Slate Subtitle Grey
  static const Color textMuted = Color(0xFF94A3B8);     // Light Muted Grey

  // Subtle Executive Hero Gradient (Dark Slate to Obsidian)
  static const LinearGradient executiveGradient = LinearGradient(
    colors: [
      Color(0xFF1E293B),
      Color(0xFF0F172A),
    ],
    begin: Alignment.topLeft,
    end: Alignment.bottomRight,
  );

  // Soft Professional Card Shadow
  static List<BoxShadow> softShadow = [
    BoxShadow(
      color: const Color(0xFF0F172A).withValues(alpha: 0.04),
      blurRadius: 12,
      spreadRadius: 0,
      offset: const Offset(0, 4),
    ),
  ];
}
