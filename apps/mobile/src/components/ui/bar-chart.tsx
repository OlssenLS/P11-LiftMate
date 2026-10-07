import React from 'react';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import Svg, { Line as SvgLine, Rect, Text as SvgText } from 'react-native-svg';
import { useTokens } from '@/hooks/use-tokens';

export interface BarChartDataPoint {
  label: string;
  value: number | null;
}

export interface BarChartProps {
  data: BarChartDataPoint[];
  height?: number;
  unit?: string;
  selectedIndex?: number;
  onSelectIndex?: (index: number) => void;
  style?: StyleProp<ViewStyle>;
}

/**
 * BarChart (DESIGN.md §8)
 * - Bars use accent colour, top radius 6, width ≈ 60% of slot.
 * - Future/empty slots show nothing.
 * - Solid horizontal hairlines at 3-4 y-values.
 * - Y-axis labels on the right (caption, inkMutedText).
 * - X-axis labels at the bottom (caption, inkMutedText).
 * - Height: 220–260.
 */
export function BarChart({
  data,
  height = 240,
  unit,
  selectedIndex,
  onSelectIndex,
  style,
}: BarChartProps) {
  const { colors } = useTokens();

  const [containerWidth, setContainerWidth] = React.useState(320);

  const validValues = data.map((d) => d.value).filter((v): v is number => v !== null && v > 0);
  const maxDataVal = validValues.length > 0 ? Math.max(...validValues) : 100;
  // Round up max for nice y-axis ticks
  const yMax = Math.ceil(maxDataVal * 1.15);

  const yTicks = [
    { value: yMax, label: `${Math.round(yMax)}` },
    { value: Math.round(yMax * 0.66), label: `${Math.round(yMax * 0.66)}` },
    { value: Math.round(yMax * 0.33), label: `${Math.round(yMax * 0.33)}` },
    { value: 0, label: '0' },
  ];

  const chartPaddingTop = 16;
  const chartPaddingBottom = 28;
  const chartPaddingLeft = 12;
  const chartPaddingRight = 44; // Room for y-axis labels on the right

  const plotWidth = Math.max(10, containerWidth - chartPaddingLeft - chartPaddingRight);
  const plotHeight = Math.max(10, height - chartPaddingTop - chartPaddingBottom);

  const slotWidth = data.length > 0 ? plotWidth / data.length : plotWidth;
  const barWidth = Math.max(8, Math.min(28, slotWidth * 0.6));

  const getYPos = (val: number) => {
    return chartPaddingTop + plotHeight - (val / (yMax || 1)) * plotHeight;
  };

  return (
    <View
      onLayout={(e) => {
        const w = e.nativeEvent.layout.width;
        if (w > 0) setContainerWidth(w);
      }}
      style={[styles.container, { height }, style]}
    >
      <Svg width={containerWidth} height={height}>
        {/* Horizontal gridlines & Y-axis labels on the right */}
        {yTicks.map((tick, i) => {
          const y = getYPos(tick.value);
          return (
            <React.Fragment key={i}>
              <SvgLine
                x1={chartPaddingLeft}
                y1={y}
                x2={chartPaddingLeft + plotWidth}
                y2={y}
                stroke={colors.hairline}
                strokeWidth={1}
              />
              <SvgText
                x={chartPaddingLeft + plotWidth + 8}
                y={y + 4}
                fill={colors.inkMutedText}
                fontSize={11}
                fontWeight="500"
                textAnchor="start"
              >
                {tick.label}
              </SvgText>
            </React.Fragment>
          );
        })}

        {/* Bars and X labels */}
        {data.map((item, index) => {
          const slotCenterX = chartPaddingLeft + index * slotWidth + slotWidth / 2;
          const hasValue = item.value !== null && item.value > 0;
          const barHeight = hasValue ? (item.value! / (yMax || 1)) * plotHeight : 0;
          const barY = chartPaddingTop + plotHeight - barHeight;
          const isSelected = selectedIndex === index;

          const barColor = isSelected
            ? colors.accent
            : selectedIndex !== undefined
            ? colors.surfaceMuted
            : colors.accent;

          return (
            <React.Fragment key={index}>
              {/* Optional dashed vertical divider per slot */}
              <SvgLine
                x1={chartPaddingLeft + index * slotWidth}
                y1={chartPaddingTop}
                x2={chartPaddingLeft + index * slotWidth}
                y2={chartPaddingTop + plotHeight}
                stroke={colors.hairline}
                strokeWidth={1}
                strokeDasharray="4, 4"
              />

              {/* Bar */}
              {hasValue && barHeight > 0 ? (
                <Rect
                  x={slotCenterX - barWidth / 2}
                  y={barY}
                  width={barWidth}
                  height={barHeight}
                  rx={6}
                  ry={6}
                  fill={barColor}
                  onPress={() => onSelectIndex?.(index)}
                />
              ) : null}

              {/* X-axis label */}
              <SvgText
                x={slotCenterX}
                y={height - 8}
                fill={colors.inkMutedText}
                fontSize={11}
                fontWeight="500"
                textAnchor="middle"
              >
                {item.label}
              </SvgText>
            </React.Fragment>
          );
        })}
      </Svg>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignSelf: 'stretch',
    justifyContent: 'center',
    alignItems: 'center',
  },
});
