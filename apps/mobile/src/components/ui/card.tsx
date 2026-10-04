/**
 * Card — rounded surface container.
 *
 * Variants:
 * - `surface` white card on the cream background (default)
 * - `hero`    the single dark "hero" card per screen (brief §3), used for the
 *             primary call to action (e.g. "Start workout")
 *
 * Soft shadow and radius come from tokens. Children provide their own content;
 * the card never hard-codes copy, so no i18n is needed here.
 */
import { type ReactNode } from 'react';
import { StyleSheet, View, type ViewStyle } from 'react-native';

import { useTokens } from '@/hooks/use-tokens';

export type CardVariant = 'surface' | 'hero';

export type CardProps = {
  children: ReactNode;
  variant?: CardVariant;
  /** Visual padding scale. Defaults to `lg`. */
  padding?: 'md' | 'lg' | 'xl';
  style?: ViewStyle;
};

export function Card({ children, variant = 'surface', padding = 'lg', style }: CardProps) {
  const { colors, radius, spacing, cardShadow } = useTokens();

  const variantStyle: ViewStyle =
    variant === 'hero'
      ? { backgroundColor: colors.ink, borderRadius: radius.cardLg }
      : { backgroundColor: colors.surface, borderRadius: radius.card };

  return (
    <View
      style={[styles.base, cardShadow, variantStyle, { padding: spacing[padding] }, style]}
    >
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  base: {
    overflow: 'visible',
  },
});
