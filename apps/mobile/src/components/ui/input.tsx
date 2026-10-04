/**
 * Input — labelled single-line text field.
 *
 * The `label`, `error` and `placeholder` are passed in already-translated
 * (callers use `t('...')`). Colours/spacing/radius/type come from tokens.
 * Focus and error states recolour the border using token colours only.
 */
import { useState } from 'react';
import {
  StyleSheet,
  Text,
  TextInput,
  type TextInputProps,
  View,
  type ViewStyle,
} from 'react-native';

import { useTokens } from '@/hooks/use-tokens';

export type InputProps = Omit<TextInputProps, 'style'> & {
  /** Already-translated field label. */
  label?: string;
  /** Already-translated error message; also recolours the border. */
  error?: string;
  containerStyle?: ViewStyle;
};

export function Input({ label, error, containerStyle, onFocus, onBlur, ...rest }: InputProps) {
  const { colors, radius, spacing, touchTarget, fontSize, fontWeight } = useTokens();
  const [focused, setFocused] = useState(false);

  const borderColor = error ? colors.danger : focused ? colors.accent : colors.inkMuted;

  return (
    <View style={[styles.container, { gap: spacing.xs }, containerStyle]}>
      {label ? (
        <Text
          style={{
            color: colors.inkMuted,
            fontSize: fontSize.label,
            fontWeight: fontWeight.semibold,
            textTransform: 'uppercase',
            letterSpacing: 1,
          }}
        >
          {label}
        </Text>
      ) : null}

      <TextInput
        placeholderTextColor={colors.inkMuted}
        onFocus={(e) => {
          setFocused(true);
          onFocus?.(e);
        }}
        onBlur={(e) => {
          setFocused(false);
          onBlur?.(e);
        }}
        style={{
          minHeight: touchTarget.min,
          borderRadius: radius.cardSm,
          borderWidth: 1.5,
          borderColor,
          backgroundColor: colors.surface,
          color: colors.ink,
          paddingHorizontal: spacing.lg,
          paddingVertical: spacing.md,
          fontSize: fontSize.body,
          fontWeight: fontWeight.regular,
        }}
        {...rest}
      />

      {error ? (
        <Text style={{ color: colors.danger, fontSize: fontSize.label, fontWeight: fontWeight.medium }}>
          {error}
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignSelf: 'stretch',
  },
});
