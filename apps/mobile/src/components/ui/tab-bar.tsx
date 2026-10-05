/**
 * TabBar — floating pill bottom navigation (brief §3).
 *
 * Five fixed tabs: Home · Train · Coach · Food · You. Labels are translated via
 * the i18n catalog (`tabs.*`). Presentational and controlled: the parent passes
 * the `active` key and an `onSelect` handler, so this works with any router.
 * Each tab keeps a ≥ 48dp touch target.
 */
import { StyleSheet, Text, Pressable, View, type ViewStyle } from 'react-native';

import { useTokens } from '@/hooks/use-tokens';
import { t, type TranslationKey } from '@/i18n';
import { selectionTick } from '@/lib/haptics';

export type TabKey = 'home' | 'train' | 'coach' | 'food' | 'you';

const TABS: readonly { key: TabKey; labelKey: TranslationKey }[] = [
  { key: 'home', labelKey: 'tabs.home' },
  { key: 'train', labelKey: 'tabs.train' },
  { key: 'coach', labelKey: 'tabs.coach' },
  { key: 'food', labelKey: 'tabs.food' },
  { key: 'you', labelKey: 'tabs.you' },
] as const;

export type TabBarProps = {
  active: TabKey;
  onSelect: (key: TabKey) => void;
  style?: ViewStyle;
};

export function TabBar({ active, onSelect, style }: TabBarProps) {
  const { colors, radius, spacing, touchTarget, fontSize, fontWeight, cardShadow } = useTokens();

  return (
    <View
      accessibilityRole="tablist"
      style={[
        styles.container,
        cardShadow,
        {
          backgroundColor: colors.surface,
          borderRadius: radius.tabBar,
          padding: spacing.xs,
        },
        style,
      ]}
    >
      {TABS.map(({ key, labelKey }) => {
        const selected = key === active;
        const label = t(labelKey);
        return (
          <Pressable
            key={key}
            accessibilityRole="tab"
            accessibilityState={{ selected }}
            accessibilityLabel={label}
            onPress={() => {
              if (!selected) {
                selectionTick();
                onSelect(key);
              }
            }}
            style={({ pressed }) => [
              styles.tab,
              {
                minHeight: touchTarget.min,
                borderRadius: radius.tabBar,
                paddingHorizontal: spacing.sm,
                backgroundColor: selected ? colors.ink : 'transparent',
              },
              pressed ? { opacity: 0.85 } : null,
            ]}
          >
            <Text
              numberOfLines={1}
              style={{
                color: selected ? colors.surface : colors.inkMuted,
                fontSize: fontSize.label,
                fontWeight: selected ? fontWeight.semibold : fontWeight.medium,
              }}
            >
              {label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
