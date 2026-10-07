import React from 'react';
import {
  Pressable,
  StyleSheet,
  Text,
  View,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import { House, Dumbbell, Utensils, User, Sparkles } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useTokens } from '@/hooks/use-tokens';
import { t, type TranslationKey } from '@/i18n';
import { selectionTick } from '@/lib/haptics';

export type TabKey = 'home' | 'train' | 'food' | 'you';

export const TABS: readonly {
  key: TabKey;
  labelKey: TranslationKey;
  icon: typeof House;
}[] = [
  { key: 'home', labelKey: 'tabs.home', icon: House },
  { key: 'train', labelKey: 'tabs.train', icon: Dumbbell },
  { key: 'food', labelKey: 'tabs.food', icon: Utensils },
  { key: 'you', labelKey: 'tabs.you', icon: User },
] as const;

export interface TabBarProps {
  active: TabKey | 'coach';
  onSelect: (key: TabKey) => void;
  onCoachPress?: () => void;
  isCoachActive?: boolean;
  style?: StyleProp<ViewStyle>;
}

/**
 * FloatingTabBar & Detached Coach Circle Button (DESIGN.md §5 & §14).
 *
 * - Floating pill tab bar (height 64, radius pill, surface @ 94%, elevation 1)
 * - 4 tabs: Home · Train · Food · You (icon 24, caption 12)
 * - Active tab: surfaceMuted pill highlight behind icon+label, colour accentText
 * - Inactive tab: ink icon, inkMutedText label
 * - Detached Coach button: 64dp circle to the right, surface, elevation 1, sparkle in accent
 */
export function TabBar({
  active,
  onSelect,
  onCoachPress,
  isCoachActive = false,
  style,
}: TabBarProps) {
  const { colors, radius, floatingShadow, type, icons } = useTokens();

  return (
    <View style={[styles.shellContainer, style]}>
      {/* Floating 4-Tab Pill */}
      <View
        accessibilityRole="tablist"
        style={[
          styles.pillBar,
          floatingShadow,
          {
            backgroundColor: 'rgba(255, 255, 255, 0.94)',
            borderRadius: radius.pill,
          },
        ]}
      >
        {TABS.map(({ key, labelKey, icon: IconComponent }) => {
          const selected = key === active;
          const label = t(labelKey);
          const iconColor = selected ? colors.accentText : colors.ink;
          const labelColor = selected ? colors.accentText : colors.inkMutedText;

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
                styles.tabItem,
                {
                  transform: [{ scale: pressed ? 0.97 : 1 }],
                },
              ]}
            >
              <View
                style={[
                  styles.tabHighlight,
                  {
                    borderRadius: radius.pill,
                    backgroundColor: selected ? colors.surfaceMuted : 'transparent',
                  },
                ]}
              >
                <IconComponent
                  size={icons.defaultSize}
                  color={iconColor}
                  strokeWidth={icons.strokeWidth}
                />
                <Text
                  numberOfLines={1}
                  style={[
                    type.caption,
                    styles.tabLabel,
                    {
                      color: labelColor,
                      fontWeight: selected ? '600' : '500',
                    },
                  ]}
                >
                  {label}
                </Text>
              </View>
            </Pressable>
          );
        })}
      </View>

      {/* Detached Coach Button */}
      {onCoachPress ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="LiftMate Coach"
          onPress={() => {
            selectionTick();
            onCoachPress();
          }}
          style={({ pressed }) => [
            styles.coachCircle,
            floatingShadow,
            {
              backgroundColor: isCoachActive ? colors.accentSoft : colors.surface,
              borderRadius: radius.pill,
              transform: [{ scale: pressed ? 0.97 : 1 }],
              opacity: pressed ? 0.88 : 1,
            },
          ]}
        >
          <Sparkles
            size={24}
            color={colors.accent}
            strokeWidth={icons.strokeWidth}
          />
        </Pressable>
      ) : null}
    </View>
  );
}

/**
 * Calculates bottom scroll padding for screens so content is never hidden
 * behind the floating tab bar (DESIGN.md §4: tabBarHeight + 24 + bottomInset).
 */
export function useBottomTabScrollPadding(): number {
  const insets = useSafeAreaInsets();
  const { layout } = useTokens();
  return layout.tabBarHeight + 24 + Math.max(insets.bottom, 12);
}

const styles = StyleSheet.create({
  shellContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'stretch',
    maxWidth: 560,
    width: '100%',
    gap: 12,
  },
  pillBar: {
    flex: 1,
    height: 64,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    paddingHorizontal: 8,
  },
  tabItem: {
    flex: 1,
    height: 64,
    justifyContent: 'center',
    alignItems: 'center',
  },
  tabHighlight: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 4,
    paddingHorizontal: 12,
    minWidth: 54,
  },
  tabLabel: {
    marginTop: 2,
  },
  coachCircle: {
    width: 64,
    height: 64,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
