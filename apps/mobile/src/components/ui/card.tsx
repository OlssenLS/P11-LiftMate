import { type ReactNode } from 'react';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';

import { useTokens } from '@/hooks/use-tokens';

export type CardVariant = 'surface' | 'hero';

export type CardProps = {
  children: ReactNode;
  variant?: CardVariant;
  padding?: 'md' | 'lg' | 'xl';
  style?: StyleProp<ViewStyle>;
};

export function Card({ children, variant = 'surface', padding = 'lg', style }: CardProps) {
  const { colors, radius, layout, spacing, cardShadow } = useTokens();

  const variantStyle: ViewStyle =
    variant === 'hero'
      ? {
          backgroundColor: colors.ink,
          borderRadius: radius.xl,
          padding: layout.cardPaddingHero,
        }
      : {
          backgroundColor: colors.surface,
          borderRadius: radius.lg,
          padding: spacing[padding] ?? layout.cardPadding,
        };

  return (
    <View style={[styles.base, cardShadow, variantStyle, style]}>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  base: {
    overflow: 'visible',
  },
});
