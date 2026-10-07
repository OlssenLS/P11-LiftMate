import { useMemo } from 'react';
import {
  ActivityIndicator,
  Pressable,
  type PressableProps,
  StyleSheet,
  Text,
  type StyleProp,
  type ViewStyle,
} from 'react-native';

import { useTokens } from '@/hooks/use-tokens';

export type ButtonVariant = 'primary' | 'secondary' | 'ghost';

export type ButtonProps = Omit<PressableProps, 'style' | 'children'> & {
  label: string;
  variant?: ButtonVariant;
  loading?: boolean;
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
};

/**
 * Canonical PrimaryButton (DESIGN.md §6.8)
 * Full-width pill, height 56, accent fill, white button text.
 */
export function PrimaryButton({
  label,
  loading = false,
  disabled = false,
  style,
  ...rest
}: Omit<ButtonProps, 'variant'>) {
  const { colors, radius, type } = useTokens();
  const isDisabled = disabled || loading;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled: isDisabled, busy: loading }}
      accessibilityLabel={label}
      disabled={isDisabled}
      style={({ pressed }) => [
        styles.canonicalPill,
        {
          backgroundColor: colors.accent,
          borderRadius: radius.pill,
          opacity: isDisabled ? 0.4 : pressed ? 0.88 : 1,
          transform: [{ scale: pressed && !isDisabled ? 0.98 : 1 }],
        },
        style,
      ]}
      {...rest}
    >
      {loading ? (
        <ActivityIndicator color="#FFFFFF" size="small" />
      ) : (
        <Text numberOfLines={1} style={[type.button, { color: '#FFFFFF' }]}>
          {label}
        </Text>
      )}
    </Pressable>
  );
}

/**
 * Canonical SecondaryButton (DESIGN.md §6.8)
 * Full-width pill, height 56, surfaceMuted fill, ink text.
 */
export function SecondaryButton({
  label,
  loading = false,
  disabled = false,
  style,
  ...rest
}: Omit<ButtonProps, 'variant'>) {
  const { colors, radius, type } = useTokens();
  const isDisabled = disabled || loading;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled: isDisabled, busy: loading }}
      accessibilityLabel={label}
      disabled={isDisabled}
      style={({ pressed }) => [
        styles.canonicalPill,
        {
          backgroundColor: colors.surfaceMuted,
          borderRadius: radius.pill,
          opacity: isDisabled ? 0.4 : pressed ? 0.88 : 1,
          transform: [{ scale: pressed && !isDisabled ? 0.98 : 1 }],
        },
        style,
      ]}
      {...rest}
    >
      {loading ? (
        <ActivityIndicator color={colors.ink} size="small" />
      ) : (
        <Text numberOfLines={1} style={[type.button, { color: colors.ink }]}>
          {label}
        </Text>
      )}
    </Pressable>
  );
}

/**
 * Backward-compatible generic Button component.
 */
export function Button({
  label,
  variant = 'primary',
  loading = false,
  disabled = false,
  style,
  ...rest
}: ButtonProps) {
  const { colors, radius, spacing, touchTarget, type } = useTokens();

  const { container, textColor, spinnerColor } = useMemo(() => {
    const base: ViewStyle = {
      minHeight: touchTarget.min,
      borderRadius: radius.pill,
      paddingHorizontal: spacing.xl,
      paddingVertical: spacing.md,
    };
    switch (variant) {
      case 'secondary':
        return {
          container: { ...base, backgroundColor: colors.surfaceMuted },
          textColor: colors.ink,
          spinnerColor: colors.ink,
        };
      case 'ghost':
        return {
          container: { ...base, backgroundColor: 'transparent' },
          textColor: colors.accentText,
          spinnerColor: colors.accent,
        };
      case 'primary':
      default:
        return {
          container: { ...base, backgroundColor: colors.accent },
          textColor: '#FFFFFF',
          spinnerColor: '#FFFFFF',
        };
    }
  }, [variant, colors, radius.pill, spacing.xl, spacing.md, touchTarget.min]);

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
        <ActivityIndicator color={spinnerColor} size="small" />
      ) : (
        <Text numberOfLines={1} style={[type.button, { color: textColor }]}>
          {label}
        </Text>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  canonicalPill: {
    height: 56,
    alignSelf: 'stretch',
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    paddingHorizontal: 20,
  },
  base: {
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
  },
  pressed: {
    opacity: 0.85,
  },
  disabled: {
    opacity: 0.4,
  },
});
