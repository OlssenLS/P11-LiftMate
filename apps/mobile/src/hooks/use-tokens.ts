/**
 * Tokens-based theme hook.
 *
 * Single source of truth for colours/spacing/radius/type is `@liftmate/shared`.
 * This hook adapts those raw tokens into the exact shapes React Native needs
 * (e.g. typography text styles, flat vs floating elevation) so components never
 * touch raw hex or re-declare design values.
 *
 * Adheres strictly to docs/DESIGN.md §3:
 * - Inter font family with weights and line heights
 * - Elevation 0 (flat) on cards, elevation 1 on floating elements
 * - WCAG AA contrast-adjusted text tokens (accentText, inkMutedText)
 * - Tabular figures for numbers
 */
import { tokens, type TypographyToken } from '@liftmate/shared';
import { Platform, type TextStyle, type ViewStyle } from 'react-native';

function hexToRgba(hex: string, opacity: number): string {
  const normalized = hex.replace('#', '');
  const r = parseInt(normalized.slice(0, 2), 16);
  const g = parseInt(normalized.slice(2, 4), 16);
  const b = parseInt(normalized.slice(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${opacity})`;
}

/**
 * Elevation 0 = flat (all cards per DESIGN.md §3.4 and §13).
 */
const flatShadow: ViewStyle = {
  elevation: 0,
  shadowColor: 'transparent',
  shadowOpacity: 0,
  shadowRadius: 0,
  shadowOffset: { width: 0, height: 0 },
};

/**
 * Elevation 1 = floating (tab bar, circle buttons, active segmented thumb per DESIGN.md §3.4):
 * shadow ink @ 10%, blur ~16, y-offset 4; elevation 4 on Android.
 */
const floatingShadow: ViewStyle = Platform.select<ViewStyle>({
  android: {
    elevation: tokens.shadow.floating.elevation,
    shadowColor: tokens.shadow.floating.color,
  },
  default: {
    shadowColor: tokens.shadow.floating.color,
    shadowOpacity: tokens.shadow.floating.opacity,
    shadowRadius: tokens.shadow.floating.radius,
    shadowOffset: {
      width: tokens.shadow.floating.offsetX,
      height: tokens.shadow.floating.offsetY,
    },
  },
}) as ViewStyle;

/** Tabular numerals helper for all quantitative stats (DESIGN.md §3.5). */
export const tabularNums: TextStyle = {
  fontVariant: ['tabular-nums'],
};

/**
 * Pre-composed typography styles mapping to DESIGN.md §3.5.
 */
const typeStyles: Record<TypographyToken, TextStyle> = {
  largeTitle: {
    fontFamily: tokens.fontFamily.bold,
    fontSize: tokens.typography.largeTitle.fontSize,
    lineHeight: tokens.typography.largeTitle.lineHeight,
    fontWeight: tokens.typography.largeTitle.fontWeight,
    letterSpacing: tokens.typography.largeTitle.letterSpacing,
    color: tokens.colors.ink,
  },
  title: {
    fontFamily: tokens.fontFamily.bold,
    fontSize: tokens.typography.title.fontSize,
    lineHeight: tokens.typography.title.lineHeight,
    fontWeight: tokens.typography.title.fontWeight,
    color: tokens.colors.ink,
  },
  sectionTitle: {
    fontFamily: tokens.fontFamily.bold,
    fontSize: tokens.typography.sectionTitle.fontSize,
    lineHeight: tokens.typography.sectionTitle.lineHeight,
    fontWeight: tokens.typography.sectionTitle.fontWeight,
    color: tokens.colors.ink,
  },
  metricHero: {
    fontFamily: tokens.fontFamily.bold,
    fontSize: tokens.typography.metricHero.fontSize,
    lineHeight: tokens.typography.metricHero.lineHeight,
    fontWeight: tokens.typography.metricHero.fontWeight,
    color: tokens.colors.ink,
    fontVariant: ['tabular-nums'],
  },
  metricValue: {
    fontFamily: tokens.fontFamily.bold,
    fontSize: tokens.typography.metricValue.fontSize,
    lineHeight: tokens.typography.metricValue.lineHeight,
    fontWeight: tokens.typography.metricValue.fontWeight,
    color: tokens.colors.ink,
    fontVariant: ['tabular-nums'],
  },
  unit: {
    fontFamily: tokens.fontFamily.medium,
    fontSize: tokens.typography.unit.fontSize,
    lineHeight: tokens.typography.unit.lineHeight,
    fontWeight: tokens.typography.unit.fontWeight,
    color: tokens.colors.inkMutedText,
  },
  cardLabel: {
    fontFamily: tokens.fontFamily.semibold,
    fontSize: tokens.typography.cardLabel.fontSize,
    lineHeight: tokens.typography.cardLabel.lineHeight,
    fontWeight: tokens.typography.cardLabel.fontWeight,
    color: tokens.colors.accentText,
  },
  body: {
    fontFamily: tokens.fontFamily.regular,
    fontSize: tokens.typography.body.fontSize,
    lineHeight: tokens.typography.body.lineHeight,
    fontWeight: tokens.typography.body.fontWeight,
    color: tokens.colors.ink,
  },
  secondary: {
    fontFamily: tokens.fontFamily.regular,
    fontSize: tokens.typography.secondary.fontSize,
    lineHeight: tokens.typography.secondary.lineHeight,
    fontWeight: tokens.typography.secondary.fontWeight,
    color: tokens.colors.inkMutedText,
  },
  eyebrow: {
    fontFamily: tokens.fontFamily.semibold,
    fontSize: tokens.typography.eyebrow.fontSize,
    lineHeight: tokens.typography.eyebrow.lineHeight,
    fontWeight: tokens.typography.eyebrow.fontWeight,
    letterSpacing: tokens.typography.eyebrow.letterSpacing,
    color: tokens.colors.inkMutedText,
    textTransform: 'uppercase',
  },
  caption: {
    fontFamily: tokens.fontFamily.medium,
    fontSize: tokens.typography.caption.fontSize,
    lineHeight: tokens.typography.caption.lineHeight,
    fontWeight: tokens.typography.caption.fontWeight,
    color: tokens.colors.inkMutedText,
  },
  button: {
    fontFamily: tokens.fontFamily.semibold,
    fontSize: tokens.typography.button.fontSize,
    lineHeight: tokens.typography.button.lineHeight,
    fontWeight: tokens.typography.button.fontWeight,
  },
};

export function useTokens() {
  return {
    ...tokens,
    /** Flat card shadow (elevation 0) per DESIGN.md §3.4 & §13. */
    cardShadow: flatShadow,
    /** Floating elevation 1 shadow for tab bar, circle buttons, active thumb (DESIGN.md §3.4). */
    floatingShadow,
    /** Typography text styles from DESIGN.md §3.5. */
    type: typeStyles,
    /** Tabular numerals helper. */
    tabularNums,
    /** Convert any token hex to an rgba string. */
    alpha: hexToRgba,
  };
}

export type ThemeTokens = ReturnType<typeof useTokens>;
