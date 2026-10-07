import React from 'react';
import {
  Pressable,
  StyleSheet,
  Text,
  View,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import { useTokens } from '@/hooks/use-tokens';

export interface DayOption {
  key: string;
  label: string; // "M", "T", "W", etc.
  accessibilityLabel: string; // "Monday", etc.
}

const DEFAULT_DAYS: DayOption[] = [
  { key: 'mon', label: 'M', accessibilityLabel: 'Monday' },
  { key: 'tue', label: 'T', accessibilityLabel: 'Tuesday' },
  { key: 'wed', label: 'W', accessibilityLabel: 'Wednesday' },
  { key: 'thu', label: 'T', accessibilityLabel: 'Thursday' },
  { key: 'fri', label: 'F', accessibilityLabel: 'Friday' },
  { key: 'sat', label: 'S', accessibilityLabel: 'Saturday' },
  { key: 'sun', label: 'S', accessibilityLabel: 'Sunday' },
];

export interface DaySelectorProps {
  selectedDays: string[];
  onChange: (days: string[]) => void;
  days?: DayOption[];
  accessibilityLabel?: string;
  style?: StyleProp<ViewStyle>;
}

export function DaySelector({
  selectedDays,
  onChange,
  days = DEFAULT_DAYS,
  accessibilityLabel = 'Select training days',
  style,
}: DaySelectorProps) {
  const { colors, radius, type, touchTarget } = useTokens();

  const handleToggle = (key: string) => {
    if (selectedDays.includes(key)) {
      onChange(selectedDays.filter((d) => d !== key));
    } else {
      onChange([...selectedDays, key]);
    }
  };

  return (
    <View
      accessibilityRole="none"
      accessibilityLabel={accessibilityLabel}
      style={[
        styles.container,
        {
          backgroundColor: colors.surfaceMuted,
          borderRadius: radius.lg,
        },
        style,
      ]}
    >
      {days.map((day) => {
        const isSelected = selectedDays.includes(day.key);

        return (
          <Pressable
            key={day.key}
            accessibilityRole="checkbox"
            accessibilityState={{ checked: isSelected }}
            accessibilityLabel={day.accessibilityLabel}
            onPress={() => handleToggle(day.key)}
            hitSlop={Math.max(0, (touchTarget.min - 44) / 2)}
            style={({ pressed }) => [
              styles.dayHitArea,
              {
                minWidth: touchTarget.min,
                minHeight: touchTarget.min,
                opacity: pressed ? 0.8 : 1,
              },
            ]}
          >
            <View
              style={[
                styles.dayCircle,
                {
                  backgroundColor: isSelected ? colors.accent : colors.surface,
                },
              ]}
            >
              <Text
                style={[
                  type.cardLabel,
                  styles.dayText,
                  {
                    color: isSelected ? '#FFFFFF' : colors.ink,
                  },
                ]}
              >
                {day.label}
              </Text>
            </View>
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
    paddingVertical: 10,
    paddingHorizontal: 8,
    alignSelf: 'stretch',
  },
  dayHitArea: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  dayCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
  },
  dayText: {
    fontWeight: '600',
  },
});
