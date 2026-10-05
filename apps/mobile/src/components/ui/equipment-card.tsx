/**
 * EquipmentCard — square-ish grid tile for the onboarding equipment step.
 *
 * Shows a large glyph (passed in — we use emoji so it renders identically on
 * Android, our target platform, with no icon-font dependency) above a label,
 * with a clear selected state and press feedback + haptic tick.
 *
 * Tokens only; `icon` and `label` are passed already-resolved/translated.
 */
import { Pressable, StyleSheet, Text, View, type ViewStyle } from 'react-native';

import { useTokens } from '@/hooks/use-tokens';
import { selectionTick } from '@/lib/haptics';

export type EquipmentCardProps = {
  /** Glyph/emoji shown large at the top of the tile. */
  icon: string;
  /** Already-translated label. */
  label: string;
  selected?: boolean;
  onPress: () => void;
  style?: ViewStyle;
};

export function EquipmentCard({ icon, label, selected = false, onPress, style }: EquipmentCardProps) {
  const { colors, radius, spacing, touchTarget, fontSize, fontWeight } = useTokens();

  const containerStyle: ViewStyle = {
    minHeight: touchTarget.min * 1.6,
    borderRadius: radius.cardSm,
    borderWidth: 1.5,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.lg,
    gap: spacing.sm,
    backgroundColor: selected ? colors.ink : colors.surface,
    borderColor: selected ? colors.ink : colors.inkMuted,
  };

  const handlePress = () => {
    selectionTick();
    onPress();
  };

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected }}
      accessibilityLabel={label}
      onPress={handlePress}
      style={({ pressed }) => [styles.base, containerStyle, pressed ? styles.pressed : null, style]}
    >
      <View
        style={{
          width: 44,
          height: 44,
          borderRadius: radius.cardSm,
          backgroundColor: selected ? colors.surface : colors.bg,
          alignItems: 'center',
          justifyContent: 'center',
          borderWidth: 1,
          borderColor: selected ? colors.surface : colors.inkMuted,
        }}
      >
        <Text
          style={{
            color: selected ? colors.ink : colors.accent,
            fontSize: fontSize.body,
            fontWeight: fontWeight.bold,
            letterSpacing: 0.5,
          }}
          accessibilityElementsHidden
          importantForAccessibility="no"
        >
          {icon}
        </Text>
      </View>
      <Text
        numberOfLines={2}
        style={{
          color: selected ? colors.surface : colors.ink,
          fontSize: fontSize.label,
          fontWeight: fontWeight.semibold,
          textAlign: 'center',
        }}
      >
        {label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  pressed: {
    opacity: 0.9,
    transform: [{ scale: 0.98 }],
  },
});
