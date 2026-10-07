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

export interface SegmentedControlProps<T extends string> {
  options: { label: string; value: T }[];
  value: T;
  onChange: (value: T) => void;
  accessibilityLabel?: string;
  style?: StyleProp<ViewStyle>;
}

export function SegmentedControl<T extends string>({
  options,
  value,
  onChange,
  accessibilityLabel,
  style,
}: SegmentedControlProps<T>) {
  const { colors, radius, floatingShadow, type, touchTarget } = useTokens();

  return (
    <View
      accessibilityRole="tablist"
      accessibilityLabel={accessibilityLabel}
      style={[
        styles.track,
        {
          backgroundColor: colors.surfaceMuted,
          borderRadius: radius.pill,
        },
        style,
      ]}
    >
      {options.map((option) => {
        const isSelected = option.value === value;
        return (
          <Pressable
            key={option.value}
            accessibilityRole="tab"
            accessibilityState={{ selected: isSelected }}
            accessibilityLabel={option.label}
            onPress={() => onChange(option.value)}
            style={({ pressed }) => [
              styles.segmentItem,
              {
                minHeight: touchTarget.min,
                opacity: pressed && !isSelected ? 0.7 : 1,
              },
            ]}
          >
            {isSelected ? (
              <View
                style={[
                  styles.thumb,
                  floatingShadow,
                  {
                    backgroundColor: colors.surface,
                    borderRadius: radius.pill,
                  },
                ]}
              />
            ) : null}
            <Text
              style={[
                type.caption,
                styles.segmentText,
                {
                  color: isSelected ? colors.ink : colors.inkMutedText,
                  fontWeight: isSelected ? '600' : '500',
                },
              ]}
            >
              {option.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  track: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 3,
    height: 40,
    alignSelf: 'stretch',
  },
  segmentItem: {
    flex: 1,
    height: 34,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  thumb: {
    ...StyleSheet.absoluteFill,
    margin: 1,
  },
  segmentText: {
    zIndex: 1,
  },
});
