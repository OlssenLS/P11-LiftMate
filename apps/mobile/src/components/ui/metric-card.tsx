import React, { type ReactNode } from 'react';
import {
  Pressable,
  StyleSheet,
  Text,
  View,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import { ChevronRight } from 'lucide-react-native';
import { useTokens } from '@/hooks/use-tokens';

export interface MetricCardProps {
  label: string;
  icon?: ReactNode;
  timestamp?: string;
  value?: string | number | null;
  unit?: string;
  sublabel?: string;
  isEstimate?: boolean;
  sparklineData?: number[];
  onPress?: () => void;
  accessibilityLabel?: string;
  style?: StyleProp<ViewStyle>;
}

export function MetricCard({
  label,
  icon,
  timestamp,
  value,
  unit,
  sublabel,
  isEstimate = false,
  sparklineData,
  onPress,
  accessibilityLabel,
  style,
}: MetricCardProps) {
  const { colors, radius, layout, type, icons } = useTokens();

  const hasData = value !== null && value !== undefined && value !== '';
  const displayValue = hasData ? (isEstimate ? `${value} Est.` : `${value}`) : 'No Data';

  const renderSparkline = () => {
    if (!hasData || !sparklineData || sparklineData.length === 0) {
      return null;
    }

    // Single data point: render hollow ring (DESIGN.md §6.4 & §8)
    if (sparklineData.length === 1) {
      return (
        <View style={styles.sparklineContainer}>
          <View
            style={[
              styles.hollowRing,
              {
                borderColor: colors.accent,
                backgroundColor: 'transparent',
              },
            ]}
          />
        </View>
      );
    }

    // 2+ data points: mini bars
    const maxVal = Math.max(...sparklineData, 1);
    const maxBarHeight = 36;
    const minBarHeight = 6;

    return (
      <View style={styles.sparklineContainer}>
        {sparklineData.map((val, idx) => {
          const isLatest = idx === sparklineData.length - 1;
          const barHeight = Math.max(minBarHeight, Math.round((val / maxVal) * maxBarHeight));

          return (
            <View
              key={idx}
              style={[
                styles.miniBar,
                {
                  height: barHeight,
                  backgroundColor: isLatest ? colors.accent : colors.surfaceMuted,
                },
              ]}
            />
          );
        })}
      </View>
    );
  };

  const a11yLabel =
    accessibilityLabel ??
    `${label}, ${hasData ? `${displayValue} ${unit ?? ''}` : 'No data'}${timestamp ? `, ${timestamp}` : ''}`;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={a11yLabel}
      onPress={onPress}
      disabled={!onPress}
      style={({ pressed }) => [
        styles.cardBase,
        {
          backgroundColor: colors.surface,
          borderRadius: radius.lg,
          padding: layout.cardPadding,
          transform: [{ scale: pressed && onPress ? 0.98 : 1 }],
          opacity: pressed && onPress ? 0.92 : 1,
        },
        style,
      ]}
    >
      {/* Top Row: icon + cardLabel left; timestamp + chevron right */}
      <View style={styles.topRow}>
        <View style={styles.labelGroup}>
          {icon ? <View style={styles.iconWrapper}>{icon}</View> : null}
          <Text style={[type.cardLabel, { color: colors.accentText }]}>{label}</Text>
        </View>
        <View style={styles.metaGroup}>
          {timestamp ? (
            <Text style={[type.secondary, { marginRight: 4 }]}>{timestamp}</Text>
          ) : null}
          {onPress ? (
            <ChevronRight
              size={18}
              color={colors.inkMutedText}
              strokeWidth={icons.strokeWidth}
            />
          ) : null}
        </View>
      </View>

      {/* Bottom Row: metricValue + unit left; sparkline right */}
      <View style={styles.bottomRow}>
        <View style={styles.valueColumn}>
          <View style={styles.valueGroup}>
            <Text
              style={[
                type.metricValue,
                { color: hasData ? colors.ink : colors.inkMutedText },
              ]}
              numberOfLines={1}
            >
              {displayValue}
            </Text>
            {hasData && unit ? (
              <Text style={[type.unit, styles.unitText]}>{unit}</Text>
            ) : null}
          </View>
          {sublabel ? (
            <Text style={[type.secondary, { marginTop: 2 }]} numberOfLines={1}>
              {sublabel}
            </Text>
          ) : null}
        </View>

        {renderSparkline()}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  cardBase: {
    minHeight: 130,
    justifyContent: 'space-between',
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  labelGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    flexShrink: 1,
  },
  iconWrapper: {
    marginRight: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  metaGroup: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  bottomRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    marginTop: 16,
  },
  valueColumn: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  valueGroup: {
    flexDirection: 'row',
    alignItems: 'baseline',
  },
  unitText: {
    marginLeft: 4,
  },
  sparklineContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    height: 40,
    gap: 6,
    marginLeft: 12,
  },
  miniBar: {
    width: 8,
    borderRadius: 999,
  },
  hollowRing: {
    width: 18,
    height: 18,
    borderRadius: 9,
    borderWidth: 2.5,
    marginBottom: 6,
  },
});
