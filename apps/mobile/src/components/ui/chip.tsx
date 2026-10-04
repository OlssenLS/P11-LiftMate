/**
 * Chip — small, optionally-selectable pill (e.g. equipment filters, tags).
 *
 * `label` is an already-translated string. When `onPress` is provided the chip
 * behaves as a toggle button and exposes a `selected` accessibility state.
 * Colours/spacing/radius/type come from tokens.
 */
import { StyleSheet, Pressable, Text, View, type ViewStyle } from 'react-native';

import { useTokens } from '@/hooks/use-tokens';
import { selectionTick } from '@/lib/haptics';

export type ChipProps = {
  /** Already-translated label. */
  label: string;
  selected?: boolean;
  onPress?: () => void;
  style?: ViewStyle;
};

export function Chip({ label, selected = false, onPress, style }: ChipProps) {
  const { colors, radius, spacing, fontSize, fontWeight } = useTokens();

  const containerStyle: ViewStyle = {
    borderRadius: radius.button,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderWidth: 1.5,
    backgroundColor: selected ? colors.ink : colors.surface,
    borderColor: selected ? colors.ink : colors.inkMuted,
  };

  const textStyle = {
    color: selected ? colors.surface : colors.ink,
    fontSize: fontSize.label,
    fontWeight: fontWeight.semibold,
  };

  if (!onPress) {
    return (
      <View style={[styles.base, containerStyle, style]}>
        <Text style={textStyle}>{label}</Text>
      </View>
    );
  }

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected }}
      accessibilityLabel={label}
      onPress={() => {
        selectionTick();
        onPress();
      }}
      style={({ pressed }) => [styles.base, containerStyle, pressed ? styles.pressed : null, style]}
    >
      <Text style={textStyle}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    alignSelf: 'flex-start',
    alignItems: 'center',
    justifyContent: 'center',
  },
  pressed: {
    opacity: 0.8,
  },
});
