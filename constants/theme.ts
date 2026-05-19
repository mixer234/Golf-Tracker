// ─── New Design System ─────────────────────────────────────────────────────────

export const COLORS = {
  // Primary palette
  darkGreen: '#0d1a06',     // hero cards, primary buttons, active states
  midGreen: '#3b6d11',      // accent, links, active icons, progress
  lightGreen: '#97c459',    // positive indicators, progress fills
  paleGreen: '#eaf3de',     // light backgrounds, pill backgrounds
  mutedGreen: '#4a7a2a',    // secondary text on dark backgrounds
  subtleGreen: '#c0dd97',   // text on dark green backgrounds

  // Neutrals
  background: '#f8f9f6',    // app background
  surface: '#ffffff',       // card backgrounds
  surfaceAlt: '#f5f5f2',    // secondary surfaces, tag backgrounds
  border: 'rgba(0,0,0,0.08)',
  borderStrong: 'rgba(0,0,0,0.15)',

  // Text
  textPrimary: '#0d1a06',
  textSecondary: '#666666',
  textMuted: '#888888',
  textLight: '#bbbbbb',

  // Semantic
  success: '#3b6d11',
  successBg: '#eaf3de',
  error: '#e24b4a',
  errorBg: '#fdf0f0',
  warning: '#ba7517',
  warningBg: '#faeeda',
};

export const TYPOGRAPHY = {
  xs: 9,
  sm: 11,
  base: 13,
  md: 15,
  lg: 18,
  xl: 22,
  xxl: 26,
  hero: 38,
  regular: '400' as const,
  medium: '500' as const,
  tight: -0.5,
  normal: 0,
  wide: 0.02,
  wider: 0.06,
  widest: 0.08,
};

export const SPACING = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
  screenPadding: 16,
  cardPadding: 14,
  sectionGap: 12,
};

export const RADIUS = {
  sm: 8,
  md: 10,
  lg: 16,
  xl: 20,
  pill: 20,
  circle: 999,
};

export const SHADOWS = {
  none: {},
  card: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 2,
    elevation: 1,
  },
};

// ─── Backward-compatible aliases ───────────────────────────────────────────────
// All existing screens import { Colors, Spacing, Radius, FontSize, Shadow }.
// These exports preserve those names while pointing to new design values so
// the entire codebase picks up the new palette without a file-by-file rewrite.

export const Colors = {
  // Primary greens
  primary: COLORS.midGreen,          // #3b6d11  (was bright #22c55e)
  primaryMid: COLORS.midGreen,
  primaryLight: COLORS.lightGreen,   // #97c459  (was #4ade80)
  primaryPale: COLORS.paleGreen,     // #eaf3de  (was dark #052e16)

  // Accent — gold dropped, using green family
  accent: COLORS.midGreen,
  accentLight: COLORS.paleGreen,     // #eaf3de  (was dark #2a2408)

  // Backgrounds
  background: COLORS.background,     // #f8f9f6  (was dark #080f09)
  surface: COLORS.surface,           // #ffffff  (was dark #0f1a10)
  surfaceSecondary: COLORS.surfaceAlt,
  surfaceElevated: COLORS.surfaceAlt,// #f5f5f2  (was dark #1a2a1c)

  // Text  (inverted: light ↔ dark)
  text: COLORS.textPrimary,          // #0d1a06  (was light #e8f0e9)
  textSecondary: COLORS.textSecondary,// #666666
  textLight: COLORS.textMuted,       // #888888  (was #4a6b4e)

  // Borders
  border: COLORS.border,             // rgba(0,0,0,0.08)
  borderLight: COLORS.border,

  // Semantic
  success: COLORS.success,
  successBg: COLORS.successBg,
  error: COLORS.error,
  errorBg: COLORS.errorBg,
  warning: COLORS.warning,
  warningBg: COLORS.warningBg,
  info: '#3b82f6',

  // Overlays & gradients
  overlay: 'rgba(0,0,0,0.55)',
  heroGradientTop: COLORS.darkGreen, // #0d1a06
  heroGradientMid: '#1a3408',        // mid-dark green for gradient

  // Extra tokens available to new code
  darkGreen: COLORS.darkGreen,
  mutedGreen: COLORS.mutedGreen,
  subtleGreen: COLORS.subtleGreen,
  paleGreen: COLORS.paleGreen,
  surfaceAlt: COLORS.surfaceAlt,
};

export const FontSize = {
  xs: TYPOGRAPHY.xs,      //  9  (was 11)
  sm: TYPOGRAPHY.sm,      // 11  (was 13)
  base: TYPOGRAPHY.base,  // 13  (was 15)
  md: TYPOGRAPHY.md,      // 15  (was 17)
  lg: TYPOGRAPHY.lg,      // 18  (was 20)
  xl: TYPOGRAPHY.xl,      // 22  (was 24)
  xxl: TYPOGRAPHY.xxl,    // 26  (was 30)
  xxxl: TYPOGRAPHY.hero,  // 38  (same)
  display: TYPOGRAPHY.hero, // 38  (was 64, deliberately reduced)
};

export const Spacing = {
  xs: SPACING.xs,    //  4
  sm: SPACING.sm,    //  8
  md: SPACING.md,    // 12  (was 16)
  lg: SPACING.lg,    // 16  (was 24)
  xl: SPACING.xl,    // 20  (was 32)
  xxl: SPACING.xxl,  // 24  (was 48)
};

export const Radius = {
  sm: RADIUS.sm,     //  8
  md: RADIUS.md,     // 10  (was 12)
  lg: RADIUS.lg,     // 16
  xl: RADIUS.xl,     // 20  (was 24)
  full: RADIUS.circle, // 999  (was 9999)
};

export const Shadow = {
  sm: SHADOWS.card,
  md: SHADOWS.card,
  lg: SHADOWS.card,
};
