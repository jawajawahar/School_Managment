import 'package:flutter/material.dart';

class AppColors {
  // Primary Palette - Rich Forest Emerald & Modern Teal
  static const Color primary = Color(0xFF0F5132);
  static const Color secondary = Color(0xFF0D9488);
  static const Color primaryDark = Color(0xFF0A3622);
  static const Color primaryLight = Color(0xFF198754);
  static const Color accentTeal = Color(0xFF0D9488);
  static const Color accentAmber = Color(0xFFF59E0B);

  // Status Colors
  static const Color presentGreen = Color(0xFF10B981);
  static const Color absentRed = Color(0xFFEF4444);
  static const Color lateOrange = Color(0xFFF97316);
  static const Color excusedBlue = Color(0xFF3B82F6);

  // Background & Surfaces
  static const Color background = Color(0xFFF8FAFC);
  static const Color surface = Color(0xFFFFFFFF);
  static const Color darkBackground = Color(0xFF0F172A);
  static const Color darkSurface = Color(0xFF1E293B);

  // Text Colors
  static const Color textPrimary = Color(0xFF1E293B);
  static const Color textSecondary = Color(0xFF64748B);
  static const Color textMuted = Color(0xFF94A3B8);

  // Gradients
  static const LinearGradient primaryGradient = LinearGradient(
    colors: [Color(0xFF0F5132), Color(0xFF0D9488)],
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

  // Shadow Styles
  static List<BoxShadow> softShadow = [
    BoxShadow(
      color: Colors.black.withOpacity(0.05),
      blurRadius: 15,
      spreadRadius: 1,
      offset: const Offset(0, 4),
    ),
  ];

  static List<BoxShadow> primaryShadow = [
    BoxShadow(
      color: primary.withOpacity(0.25),
      blurRadius: 20,
      offset: const Offset(0, 8),
    ),
  ];
}
