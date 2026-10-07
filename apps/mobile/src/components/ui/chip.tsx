import { StyleSheet, Pressable, Text, View, type StyleProp, type ViewStyle } from 'react-native';

import { useTokens } from '@/hooks/use-tokens';
import { selectionTick } from '@/lib/haptics';

export type ChipProps = {
  label: string;
  selected?: boolean;
  onPress?: () => void;
  accessibilityLabel?: string;
  style?: StyleProp<ViewStyle>;
};

/**
 * Chip primitive (DESIGN.md §6.12)
 * Pill, height 36, surfaceMuted (selected: accentSoft + accentText).
 * Hit area padded to ≥ 48dp.
 */
export function Chip({
  label,
  selected = false,
  onPress,
  accessibilityLabel,
  style,
}: ChipProps) {
  const { colors, radius, type, touchTarget } = useTokens();

  const textStyle = {
    color: selected ? colors.accentText : colors.ink,
    fontWeight: selected ? ('600' as const) : ('500' as const),
  };

  if (!onPress) {
    return (
      <View
        style={[
          styles.base,
          {
            height: 36,
            borderRadius: radius.pill,
            backgroundColor: selected ? colors.accentSoft : colors.surfaceMuted,
          },
          style,
        ]}
      >
        <Text style={[type.caption, textStyle]}>{label}</Text>
      </View>
    );
  }

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected }}
      accessibilityLabel={accessibilityLabel ?? label}
      onPress={() => {
        selectionTick();
        onPress();
      }}
      hitSlop={Math.max(0, (touchTarget.min - 36) / 2)}
      style={({ pressed }) => [
        styles.base,
        {
          height: 36,
          borderRadius: radius.pill,
          backgroundColor: selected ? colors.accentSoft : colors.surfaceMuted,
          opacity: pressed ? 0.75 : 1,
        },
        style,
      ]}
    >
      <Text style={[type.caption, textStyle]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    alignSelf: 'flex-start',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 14,
  },
});
