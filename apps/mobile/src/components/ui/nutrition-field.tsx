/**
 * NutritionField — numeric input with a trailing unit and a helper hint.
 *
 * Purpose-built for the onboarding nutrition step so each target reads clearly
 * ("Calories … 2200 kcal / day") instead of a bare number box. Keeps the same
 * token-driven look as `Input`, with a right-aligned unit label and an optional
 * one-line hint beneath.
 *
 * `label`, `unit`, `hint`, and `error` are passed already-translated.
 */
import { useState } from 'react';
import { StyleSheet, Text, TextInput, View, type ViewStyle } from 'react-native';

import { useTokens } from '@/hooks/use-tokens';

export type NutritionFieldProps = {
  /** Already-translated field label (e.g. "Protein"). */
  label: string;
  /** Already-translated unit shown on the right (e.g. "g / day"). */
  unit: string;
  /** Already-translated helper hint shown beneath the field. */
  hint?: string;
  /** Already-translated error; recolours the border and replaces the hint. */
  error?: string;
  value: string;
  onChangeText: (text: string) => void;
  onBlur?: () => void;
  containerStyle?: ViewStyle;
};

export function NutritionField({
  label,
  unit,
  hint,
  error,
  value,
  onChangeText,
  onBlur,
  containerStyle,
}: NutritionFieldProps) {
  const { colors, radius, spacing, touchTarget, fontSize, fontWeight } = useTokens();
  const [focused, setFocused] = useState(false);

  const borderColor = error ? colors.danger : focused ? colors.accent : colors.hairline;

  const handleChange = (text: string) => {
    // Keep only digits so the numeric payload is always clean.
    onChangeText(text.replace(/[^0-9]/g, ''));
  };

  return (
    <View style={[styles.container, { gap: spacing.xs }, containerStyle]}>
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

      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          minHeight: touchTarget.min,
          borderRadius: radius.cardSm,
          borderWidth: 1.5,
          borderColor,
          backgroundColor: colors.surface,
          paddingHorizontal: spacing.lg,
          gap: spacing.sm,
        }}
      >
        <TextInput
          placeholder="0"
          placeholderTextColor={colors.inkMuted}
          keyboardType="number-pad"
          value={value}
          onChangeText={handleChange}
          onFocus={() => setFocused(true)}
          onBlur={() => {
            setFocused(false);
            onBlur?.();
          }}
          style={{
            flex: 1,
            color: colors.ink,
            fontSize: fontSize.title,
            fontWeight: fontWeight.bold,
            paddingVertical: spacing.md,
          }}
        />
        <Text style={{ color: colors.inkMuted, fontSize: fontSize.label, fontWeight: fontWeight.medium }}>
          {unit}
        </Text>
      </View>

      {error ? (
        <Text
          style={{ color: colors.danger, fontSize: fontSize.label, fontWeight: fontWeight.medium }}
        >
          {error}
        </Text>
      ) : hint ? (
        <Text style={{ color: colors.inkMuted, fontSize: fontSize.label }}>{hint}</Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { alignSelf: 'stretch' },
});
