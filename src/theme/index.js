// Centralized design tokens for Hit
// Colors, typography, spacing, radii and shadows used across the app.

export const colors = {
  navy: '#0F172A', // primary dark navy
  blue: '#2563EB', // blue accent
  bg: '#F8F9FB', // app background

  white: '#FFFFFF',
  black: '#000000',

  // Slate ramp derived from the navy palette
  slate900: '#0F172A',
  slate800: '#1E293B',
  slate700: '#334155',
  slate600: '#475569',
  slate500: '#64748B',
  slate400: '#94A3B8',
  slate300: '#CBD5E1',
  slate200: '#E2E8F0',
  slate100: '#F1F5F9',

  blueDark: '#1D4ED8',
  blueLight: '#DBEAFE',
  blueTint: '#EFF4FF',

  green: '#16A34A',
  greenLight: '#DCFCE7',
  amber: '#F59E0B',
  red: '#EF4444',
  redLight: '#FEE2E2',

  border: '#E6E9F0',
  card: '#FFFFFF',
  overlay: 'rgba(15, 23, 42, 0.55)',
};

// Font family names registered by expo-google-fonts in App.js
export const fonts = {
  serif: 'DMSerifDisplay_400Regular',
  serifItalic: 'DMSerifDisplay_400Regular_Italic',
  body: 'DMSans_400Regular',
  bodyMedium: 'DMSans_500Medium',
  bodySemiBold: 'DMSans_600SemiBold',
  bodyBold: 'DMSans_700Bold',
};

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
  xxxl: 48,
};

export const radius = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  pill: 999,
};

export const shadow = {
  card: {
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.08,
    shadowRadius: 16,
    elevation: 3,
  },
  soft: {
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
};

// Reusable text style presets
export const type = {
  display: {
    fontFamily: fonts.serif,
    fontSize: 40,
    lineHeight: 46,
    color: colors.navy,
  },
  h1: {
    fontFamily: fonts.serif,
    fontSize: 30,
    lineHeight: 36,
    color: colors.navy,
  },
  h2: {
    fontFamily: fonts.serif,
    fontSize: 24,
    lineHeight: 30,
    color: colors.navy,
  },
  title: {
    fontFamily: fonts.bodySemiBold,
    fontSize: 18,
    color: colors.navy,
  },
  body: {
    fontFamily: fonts.body,
    fontSize: 15,
    lineHeight: 22,
    color: colors.slate700,
  },
  label: {
    fontFamily: fonts.bodyMedium,
    fontSize: 13,
    color: colors.slate500,
  },
  caption: {
    fontFamily: fonts.body,
    fontSize: 12,
    color: colors.slate400,
  },
};

export default { colors, fonts, spacing, radius, shadow, type };
