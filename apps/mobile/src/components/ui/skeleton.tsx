import React, { useEffect, useState } from 'react';
import {
  Animated,
  StyleSheet,
  View,
  type DimensionValue,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import { useTokens } from '@/hooks/use-tokens';

export interface SkeletonProps {
  width?: DimensionValue;
  height?: DimensionValue;
  borderRadius?: number;
  style?: StyleProp<ViewStyle>;
}

/**
 * Skeleton block (DESIGN.md §9)
 * surfaceMuted block with radius matching the real element and smooth 1.2s shimmer pulse.
 */
export function Skeleton({
  width = '100%',
  height = 20,
  borderRadius,
  style,
}: SkeletonProps) {
  const { colors, radius } = useTokens();
  const [opacityAnim] = useState(() => new Animated.Value(0.4));

  useEffect(() => {
    const pulse = Animated.loop(
      Animated.sequence([
        Animated.timing(opacityAnim, {
          toValue: 0.9,
          duration: 600,
          useNativeDriver: true,
        }),
        Animated.timing(opacityAnim, {
          toValue: 0.4,
          duration: 600,
          useNativeDriver: true,
        }),
      ])
    );
    pulse.start();
    return () => pulse.stop();
  }, [opacityAnim]);

  return (
    <Animated.View
      style={[
        styles.skeletonBase,
        {
          width,
          height,
          backgroundColor: colors.surfaceMuted,
          borderRadius: borderRadius ?? radius.md,
          opacity: opacityAnim,
        },
        style,
      ]}
    />
  );
}

/**
 * SkeletonCard
 * Skeletons a full card matching MetricCard dimensions (height 130, radius 28).
 */
export function SkeletonCard({ style }: { style?: StyleProp<ViewStyle> }) {
  const { radius, layout } = useTokens();
  return (
    <View
      style={[
        styles.cardContainer,
        {
          borderRadius: radius.lg,
          padding: layout.cardPadding,
        },
        style,
      ]}
    >
      <View style={styles.cardHeader}>
        <Skeleton width="40%" height={18} />
        <Skeleton width="20%" height={14} />
      </View>
      <View style={styles.cardBody}>
        <Skeleton width="50%" height={32} />
        <Skeleton width="30%" height={24} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  skeletonBase: {
    overflow: 'hidden',
  },
  cardContainer: {
    minHeight: 130,
    backgroundColor: '#FFFFFF',
    justifyContent: 'space-between',
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  cardBody: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    marginTop: 24,
  },
});
