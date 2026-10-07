import React from 'react';
import { StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native';
import Svg, { Circle, Line as SvgLine, Path, Text as SvgText } from 'react-native-svg';
import { useTokens } from '@/hooks/use-tokens';

export interface LineChartDataPoint {
  label: string;
  value: number | null;
}

export interface LineChartProps {
  data: LineChartDataPoint[];
  height?: number;
  unit?: string;
  selectedIndex?: number;
  onSelectIndex?: (index: number) => void;
  style?: StyleProp<ViewStyle>;
}

/**
 * LineChart (DESIGN.md §8)
 * - 2.5dp accent line, 6dp dots, ring marker for single point; no fill.
 * - Solid horizontal hairlines at 3-4 y-values.
 * - Y-axis labels on the right (caption, inkMutedText).
 * - X-axis labels at the bottom (caption, inkMutedText).
 * - Height: 220–260.
 */
export function LineChart({
  data,
  height = 240,
  unit,
  selectedIndex,
  onSelectIndex,
  style,
}: LineChartProps) {
  const { colors, type } = useTokens();
  const [containerWidth, setContainerWidth] = React.useState(320);

  const validEntries = data
    .map((d, index) => ({ ...d, index }))
    .filter((d): d is { label: string; value: number; index: number } => d.value !== null);

  const values = validEntries.map((d) => d.value);
  const minVal = values.length > 0 ? Math.min(...values) : 0;
  const maxVal = values.length > 0 ? Math.max(...values) : 100;

  // Add margin around min/max
  const spread = Math.max(2, maxVal - minVal);
  const yMin = Math.max(0, Math.floor(minVal - spread * 0.2));
  const yMax = Math.ceil(maxVal + spread * 0.2);

  const yTicks = [
    { value: yMax, label: `${Math.round(yMax)}` },
    { value: Math.round(yMin + (yMax - yMin) * 0.66), label: `${Math.round(yMin + (yMax - yMin) * 0.66)}` },
    { value: Math.round(yMin + (yMax - yMin) * 0.33), label: `${Math.round(yMin + (yMax - yMin) * 0.33)}` },
    { value: yMin, label: `${Math.round(yMin)}` },
  ];

  const chartPaddingTop = 16;
  const chartPaddingBottom = 28;
  const chartPaddingLeft = 12;
  const chartPaddingRight = 44;

  const plotWidth = Math.max(10, containerWidth - chartPaddingLeft - chartPaddingRight);
  const plotHeight = Math.max(10, height - chartPaddingTop - chartPaddingBottom);

  const slotWidth = data.length > 0 ? plotWidth / data.length : plotWidth;

  const getYPos = (val: number) => {
    const range = yMax - yMin || 1;
    return chartPaddingTop + plotHeight - ((val - yMin) / range) * plotHeight;
  };

  const getXPos = (index: number) => {
    return chartPaddingLeft + index * slotWidth + slotWidth / 2;
  };

  // Build SVG Path if >= 2 points
  let pathD = '';
  if (validEntries.length >= 2) {
    pathD = validEntries.reduce((acc, pt, idx) => {
      const x = getXPos(pt.index);
      const y = getYPos(pt.value);
      return idx === 0 ? `M ${x} ${y}` : `${acc} L ${x} ${y}`;
    }, '');
  }

  const isSinglePoint = validEntries.length === 1;

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

        {/* Vertical slot dividers */}
        {data.map((_, index) => (
          <SvgLine
            key={`v-${index}`}
            x1={chartPaddingLeft + index * slotWidth}
            y1={chartPaddingTop}
            x2={chartPaddingLeft + index * slotWidth}
            y2={chartPaddingTop + plotHeight}
            stroke={colors.hairline}
            strokeWidth={1}
            strokeDasharray="4, 4"
          />
        ))}

        {/* 2.5dp Line Path */}
        {pathD ? (
          <Path
            d={pathD}
            fill="none"
            stroke={colors.accent}
            strokeWidth={2.5}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        ) : null}

        {/* 6dp Dots (radius 3) or Single Ring Marker */}
        {validEntries.map((pt) => {
          const x = getXPos(pt.index);
          const y = getYPos(pt.value);

          if (isSinglePoint) {
            // Ring marker for single point (DESIGN.md §8)
            return (
              <Circle
                key={`ring-${pt.index}`}
                cx={x}
                cy={y}
                r={7}
                fill="none"
                stroke={colors.accent}
                strokeWidth={2.5}
              />
            );
          }

          return (
            <Circle
              key={`dot-${pt.index}`}
              cx={x}
              cy={y}
              r={3}
              fill={colors.accent}
              onPress={() => onSelectIndex?.(pt.index)}
            />
          );
        })}

        {/* X-axis labels */}
        {data.map((item, index) => {
          const x = getXPos(index);
          return (
            <SvgText
              key={`x-${index}`}
              x={x}
              y={height - 8}
              fill={colors.inkMutedText}
              fontSize={11}
              fontWeight="500"
              textAnchor="middle"
            >
              {item.label}
            </SvgText>
          );
        })}
      </Svg>

      {isSinglePoint ? (
        <View style={styles.singlePointCaption}>
          <Text style={[type.caption, { color: colors.inkMutedText }]}>
            Not enough data yet
          </Text>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignSelf: 'stretch',
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  singlePointCaption: {
    position: 'absolute',
    top: 24,
    alignSelf: 'center',
  },
});
