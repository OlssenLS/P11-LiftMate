/**
 * Tokens-based theme hook.
 *
 * Single source of truth for colours/spacing/radius/type is `@liftmate/shared`.
 * This hook adapts those raw tokens into the exact shapes React Native needs
 * (e.g. a `ViewStyle` shadow) so components never touch raw hex or re-declare
 * design values. Light mode only for MVP (brief §3); dark mode can be added
 * here later without changing component code.
 */
import { tokens } from '@liftmate/shared';
import { Platform, type ViewStyle } from 'react-native';

function hexToRgba(hex: string, opacity: number): string {
  const normalized = hex.replace('#', '');
  const r = parseInt(normalized.slice(0, 2), 16);
  const g = parseInt(normalized.slice(2, 4), 16);
  const b = parseInt(normalized.slice(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${opacity})`;
}

/**
 * Soft, low-opacity, large-blur card shadow (brief §3) derived from tokens.
 * Uses iOS shadow props plus Android elevation.
 */
function buildCardShadow(): ViewStyle {
  const { color, opacity, radius, offsetX, offsetY } = tokens.shadow.card;
  return Platform.select<ViewStyle>({
    android: { elevation: 6, shadowColor: color },
    default: {
      shadowColor: color,
      shadowOpacity: opacity,
      shadowRadius: radius,
      shadowOffset: { width: offsetX, height: offsetY },
    },
  }) as ViewStyle;
}

const cardShadow = buildCardShadow();

export function useTokens() {
  return {
    ...tokens,
    /** React Native ready card shadow built from `tokens.shadow.card`. */
    cardShadow,
    /** Convert any token hex to an rgba string (e.g. translucent overlays). */
    alpha: hexToRgba,
  };
}

export type ThemeTokens = ReturnType<typeof useTokens>;
