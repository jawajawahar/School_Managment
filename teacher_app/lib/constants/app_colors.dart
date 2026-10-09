import 'package:flutter/material.dart';

class AppColors {
  // Ultra-Premium Royal Indigo & Midnight Obsidian Palette (No Green Banners)
  static const Color primary = Color(0xFF4F46E5);      // Royal Indigo
  static const Color primaryDark = Color(0xFF1E1B4B);  // Midnight Deep Indigo
  static const Color primaryLight = Color(0xFF6366F1); // Bright Violet
  static const Color secondary = Color(0xFF2563EB);    // Electric Cobalt Blue
  static const Color accentTeal = Color(0xFF06B6D4);    // Cyan Glow
  static const Color accentAmber = Color(0xFFF59E0B);   // Amber Gold

  // Status Colors (Attendance & Alerts)
  static const Color presentGreen = Color(0xFF10B981);
  static const Color absentRed = Color(0xFFF43F5E);
  static const Color lateOrange = Color(0xFFF59E0B);
  static const Color excusedBlue = Color(0xFF3B82F6);

  // Background & Surface Tokens
  static const Color background = Color(0xFFF8FAFC);
  static const Color surface = Color(0xFFFFFFFF);
  static const Color darkBackground = Color(0xFF0F172A);
  static const Color darkSurface = Color(0xFF1E293B);

  // High-Contrast Premium Typography Colors
  static const Color textPrimary = Color(0xFF0F172A);   // Slate Obsidian Black
  static const Color textSecondary = Color(0xFF475569); // Slate Dark Grey
  static const Color textMuted = Color(0xFF94A3B8);     // Muted Slate

  // Premium Gradients
  static const LinearGradient primaryGradient = LinearGradient(
    colors: [
      Color(0xFF0F172A), // Slate Midnight
      Color(0xFF1E1B4B), // Royal Dark Indigo
      Color(0xFF312E81), // Deep Violet
    ],
    begin: Alignment.topLeft,
    end: Alignment.bottomRight,
  );

  static const LinearGradient cobaltGradient = LinearGradient(
    colors: [
      Color(0xFF1E40AF),
      Color(0xFF3B82F6),
    ],
    begin: Alignment.topLeft,
    end: Alignment.bottomRight,
  );

  static const LinearGradient cardGradient = LinearGradient(
    colors: [Color(0xFFFFFFFF), Color(0xFFF8FAFC)],
    begin: Alignment.topLeft,
    end: Alignment.bottomRight,
  );

  static const LinearGradient amberGradient = LinearGradient(
    colors: [Color(0xFFF59E0B), Color(0xFFD97706)],
    begin: Alignment.topLeft,
    end: Alignment.bottomRight,
  );

  // Soft Glassmorphic & Elevation Shadows
  static List<BoxShadow> softShadow = [
    BoxShadow(
      color: const Color(0xFF0F172A).withValues(alpha: 0.06),
      blurRadius: 20,
      spreadRadius: 1,
      offset: const Offset(0, 6),
    ),
  ];

  static List<BoxShadow> primaryShadow = [
    BoxShadow(
      color: const Color(0xFF1E1B4B).withValues(alpha: 0.35),
      blurRadius: 24,
      offset: const Offset(0, 10),
    ),
  ];
}
