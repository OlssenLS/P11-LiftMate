/**
 * SelectCard — large, selectable option card (fitness goals, experience level).
 *
 * A richer alternative to `Chip` for primary onboarding choices: full-width
 * tappable card with a title, optional description, and a clear selected state.
 *
 * Design directives honoured:
 * - Colours / spacing / radius / type from `@liftmate/shared` tokens only.
 * - ≥ 48dp touch target; selected state uses the inked surface for high
 *   contrast (brief §3).
 * - Active press feedback via a scale transform + opacity on the pressed state
 *   plus a haptic selection tick (ui-ux steering: micro-interactions). The
 *   feedback is driven by `Pressable`'s render-prop `pressed` flag rather than
 *   an imperative Reanimated shared value, which keeps the React Compiler happy
 *   and matches the Button/Chip pattern already used in the app.
 * - `title` / `description` are passed already-translated.
 */
import { Pressable, StyleSheet, Text, View, type ViewStyle } from 'react-native';

import { useTokens } from '@/hooks/use-tokens';
import { selectionTick } from '@/lib/haptics';

export type SelectCardProps = {
  /** Already-translated title. */
  title: string;
  /** Already-translated supporting description. */
  description?: string;
  selected?: boolean;
  onPress: () => void;
  style?: ViewStyle;
};

export function SelectCard({
  title,
  description,
  selected = false,
  onPress,
  style,
}: SelectCardProps) {
  const { colors, radius, spacing, touchTarget, fontSize, fontWeight } = useTokens();

  const containerStyle: ViewStyle = {
    minHeight: touchTarget.min,
    borderRadius: radius.card,
    borderWidth: 1.5,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.lg,
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
      accessibilityLabel={title}
      onPress={handlePress}
      style={({ pressed }) => [
        styles.base,
        containerStyle,
        pressed ? styles.pressed : null,
        style,
      ]}
    >
      <View style={{ gap: spacing.xs }}>
        <Text
          style={{
            color: selected ? colors.surface : colors.ink,
            fontSize: fontSize.body,
            fontWeight: fontWeight.semibold,
          }}
        >
          {title}
        </Text>
        {description ? (
          <Text
            style={{
              color: selected ? colors.bg : colors.inkMuted,
              fontSize: fontSize.label,
              fontWeight: fontWeight.regular,
            }}
          >
            {description}
          </Text>
        ) : null}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    alignSelf: 'stretch',
    justifyContent: 'center',
  },
  pressed: {
    opacity: 0.9,
    transform: [{ scale: 0.98 }],
  },
});
