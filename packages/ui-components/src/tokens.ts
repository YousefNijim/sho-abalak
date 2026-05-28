/**
 * Design Tokens — شو عبالك؟
 * المصدر الوحيد للحقيقة للهوية البصرية. راجع FRONTEND_DESIGN.md
 */

export const colors = {
  primary: '#E6781E', // برتقالي/زعفراني
  secondary: '#165A34', // أخضر فلسطيني
  background: '#FCF3DC', // كريمي دافئ
  surface: '#FFFFFF',
  textPrimary: '#1C1C23',
  textMuted: '#6B7280',
  success: '#22C55E',
  error: '#EF4444',
  warning: '#F59E0B',
  border: '#E5E0D5',
  unreadBg: '#FFF8F0',
} as const;

export const fonts = {
  arabic: 'Cairo',
  latin: 'Montserrat',
} as const;

export const fontWeights = {
  regular: 400,
  medium: 500,
  semibold: 600,
  bold: 700,
  extrabold: 800,
} as const;

export const fontSizes = {
  xs: 11,
  sm: 13,
  base: 15,
  lg: 17,
  xl: 20,
  '2xl': 24,
  '3xl': 30,
  '4xl': 38,
} as const;

/** مقياس التباعد — أساس 4px */
export const spacing = {
  1: 4,
  2: 8,
  3: 12,
  4: 16,
  5: 20,
  6: 24,
  7: 28,
  8: 32,
  10: 40,
  12: 48,
  16: 64,
} as const;

export const radius = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  full: 9999,
} as const;

export const shadows = {
  sm: '0 1px 3px rgba(0,0,0,0.08)',
  md: '0 4px 12px rgba(0,0,0,0.10)',
  lg: '0 8px 24px rgba(0,0,0,0.12)',
} as const;

export const components = {
  buttonHeight: 52,
  inputHeight: 52,
  bottomNavHeight: 64,
  headerHeight: 56,
  touchTargetMin: 44,
} as const;

export const tokens = {
  colors,
  fonts,
  fontWeights,
  fontSizes,
  spacing,
  radius,
  shadows,
  components,
} as const;
