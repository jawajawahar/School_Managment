/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        canvas: '#F1F3F6',
        surface: {
          DEFAULT: '#FFFFFF',
          muted: '#F0F1F4',
        },
        border: {
          DEFAULT: '#DEE2E8',
          strong: '#C7CCD4',
        },
        ink: {
          DEFAULT: '#101828',
          muted: '#475467',
          faint: '#667085',
        },
        brand: {
          DEFAULT: '#1E4B8F',
          hover: '#15386D',
          tint: '#E8EFF9',
          light: '#3568B0',
        },
        accent: {
          DEFAULT: '#B76E1D',
          tint: '#FBEEDF',
        },
        success: {
          DEFAULT: '#1E8E5A',
          tint: '#E3F5EC',
        },
        warning: {
          DEFAULT: '#B7791B',
          tint: '#FBF1DD',
        },
        danger: {
          DEFAULT: '#D1453D',
          tint: '#FBEAE9',
        },
        info: {
          DEFAULT: '#0E7CB0',
          tint: '#E6F4FA',
        },

        // ─── Legacy "paper ledger" palette ───────────────────────────
        // Kept only so not-yet-redesigned modules keep rendering as
        // before during the module-by-module rollout. Remove once every
        // module has migrated to the token set above.
        paper: { DEFAULT: '#F7F4EC', light: '#FAF8F3', dark: '#EFECE3' },
        navy: { DEFAULT: '#10233F', light: '#1B355C', dark: '#0A172B' },
        ledger: { DEFAULT: '#35578C', light: '#4B73B3', dark: '#264069' },
        gold: { DEFAULT: '#AD8A4E', light: '#C4A264', dark: '#8C6C35' },
        green: { register: '#3F6B4F', light: '#EAF3EB', border: '#89B595' },
        red: { marking: '#9C3B34', light: '#F8ECEC', border: '#D98E89' },
        rule: { DEFAULT: '#C9C2B2', light: '#E2DDD3', dark: '#A69E8E' },
      },
      fontFamily: {
        display: ['Outfit', 'Plus Jakarta Sans', 'sans-serif'],
        sans: ['Plus Jakarta Sans', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace'],
      },
      boxShadow: {
        xs: '0 1px 2px 0 rgba(20, 23, 31, 0.04)',
        sm: '0 1px 3px 0 rgba(20, 23, 31, 0.06), 0 1px 2px -1px rgba(20, 23, 31, 0.06)',
        md: '0 4px 10px -2px rgba(20, 23, 31, 0.08), 0 2px 4px -2px rgba(20, 23, 31, 0.05)',
        lg: '0 12px 24px -6px rgba(20, 23, 31, 0.10), 0 4px 8px -4px rgba(20, 23, 31, 0.06)',
        focus: '0 0 0 3px rgba(44, 110, 99, 0.25)',
        // legacy
        paper: '0 2px 8px -2px rgba(16, 35, 63, 0.08), 0 1px 3px -1px rgba(16, 35, 63, 0.04)',
        stamp: '0 0 0 3px rgba(173, 138, 78, 0.25)',
      },
      animation: {
        'fade-in': 'fadeIn 160ms ease-out forwards',
        'fade-in-up': 'fadeInUp 220ms ease-out forwards',
        'scale-in': 'scaleIn 140ms ease-out forwards',
        // legacy
        'tick-draw': 'tickDraw 180ms ease-out forwards',
        'slide-in-right': 'slideInRight 250ms ease-out forwards',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        fadeInUp: {
          '0%': { opacity: '0', transform: 'translateY(6px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        scaleIn: {
          '0%': { opacity: '0', transform: 'scale(0.97)' },
          '100%': { opacity: '1', transform: 'scale(1)' },
        },
        // legacy
        tickDraw: {
          '0%': { strokeDashoffset: '24' },
          '100%': { strokeDashoffset: '0' },
        },
        slideInRight: {
          '0%': { opacity: '0', transform: 'translateX(12px)' },
          '100%': { opacity: '1', transform: 'translateX(0)' },
        },
      },
    },
  },
  plugins: [],
};
