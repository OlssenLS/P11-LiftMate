/**
 * Button — pill-shaped action button.
 *
 * Variants:
 * - `primary`   accent fill (the single brand colour; primary actions only)
 * - `secondary` inked outline on surface
 * - `ghost`     text-only, no background
 *
 * All colours/spacing/radius come from `@liftmate/shared` tokens. Touch target
 * is kept ≥ 48dp (brief §3) via `minHeight`.
 */
import { useMemo } from 'react';
import {
  ActivityIndicator,
  Pressable,
  type PressableProps,
  StyleSheet,
  Text,
  type ViewStyle,
} from 'react-native';

import { useTokens } from '@/hooks/use-tokens';

export type ButtonVariant = 'primary' | 'secondary' | 'ghost';

export type ButtonProps = Omit<PressableProps, 'style' | 'children'> & {
  /** Visible, already-translated label (callers pass `t('...')`). */
  label: string;
  variant?: ButtonVariant;
  loading?: boolean;
  disabled?: boolean;
  style?: ViewStyle;
};

export function Button({
  label,
  variant = 'primary',
  loading = false,
  disabled = false,
  style,
  ...rest
}: ButtonProps) {
  const { colors, radius, spacing, touchTarget, fontSize, fontWeight } = useTokens();

  const { container, text, spinnerColor } = useMemo(() => {
    const base: ViewStyle = {
      minHeight: touchTarget.min,
      borderRadius: radius.button,
      paddingHorizontal: spacing.xl,
      paddingVertical: spacing.md,
    };
    switch (variant) {
      case 'secondary':
        return {
          container: { ...base, backgroundColor: colors.surface, borderWidth: 1.5, borderColor: colors.ink },
          text: { color: colors.ink },
          spinnerColor: colors.ink,
        };
      case 'ghost':
        return {
          container: { ...base, backgroundColor: 'transparent' },
          text: { color: colors.accent },
          spinnerColor: colors.accent,
        };
      case 'primary':
      default:
        return {
          container: { ...base, backgroundColor: colors.accent },
          text: { color: colors.surface },
          spinnerColor: colors.surface,
        };
    }
  }, [variant, colors, radius.button, spacing.xl, spacing.md, touchTarget.min]);

  const isDisabled = disabled || loading;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled: isDisabled, busy: loading }}
      disabled={isDisabled}
      style={({ pressed }) => [
        styles.base,
        container,
        pressed && !isDisabled ? styles.pressed : null,
        isDisabled ? styles.disabled : null,
        style,
      ]}
      {...rest}
    >
      {loading ? (
        <ActivityIndicator color={spinnerColor} />
      ) : (
        <Text
          numberOfLines={1}
          style={[styles.label, text, { fontSize: fontSize.body, fontWeight: fontWeight.semibold }]}
        >
          {label}
        </Text>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
  },
  label: {
    textAlign: 'center',
  },
  pressed: {
    opacity: 0.85,
  },
  disabled: {
    opacity: 0.4,
  },
});
