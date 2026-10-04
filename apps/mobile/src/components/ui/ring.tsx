/**
 * Ring — circular progress indicator (0–1).
 *
 * Implemented without `react-native-svg` (not a project dependency) using the
 * classic two-half-disc technique: a track circle, then two rotating half
 * overlays that reveal the accent arc. All colours come from tokens; the
 * default accent is the brand colour but any token colour can be passed.
 *
 * Optional `children` render centred inside the ring (e.g. a big number).
 */
import { type ReactNode, useMemo } from 'react';
import { StyleSheet, View, type ViewStyle } from 'react-native';

import { useTokens } from '@/hooks/use-tokens';
import { t } from '@/i18n';

export type RingProps = {
  /** Progress fraction, clamped to 0–1. */
  progress: number;
  /** Outer diameter in dp. */
  size?: number;
  /** Stroke thickness in dp. */
  thickness?: number;
  /** Token colour name for the progress arc. Defaults to `accent`. */
  color?: 'accent' | 'success' | 'warning' | 'recovery' | 'danger' | 'ink';
  /** Token colour name for the unfilled track. Defaults to `bg`. */
  trackColor?: 'bg' | 'surface' | 'inkMuted';
  children?: ReactNode;
  style?: ViewStyle;
};

export function Ring({
  progress,
  size = 120,
  thickness = 12,
  color = 'accent',
  trackColor = 'bg',
  children,
  style,
}: RingProps) {
  const { colors } = useTokens();
  const clamped = Math.max(0, Math.min(1, progress));
  const arcColor = colors[color];
  const track = colors[trackColor];

  const { ringCommon, rightRotation, leftRotation, showLeftHalf } = useMemo(() => {
    const half = size / 2;
    const common: ViewStyle = {
      position: 'absolute',
      width: size,
      height: size,
      borderRadius: half,
      borderWidth: thickness,
      borderColor: 'transparent',
    };
    // First half (0–0.5) rotates the right semicircle; second half rotates the
    // left semicircle an additional 0–180deg.
    const rightDeg = Math.min(clamped, 0.5) * 2 * 180;
    const leftDeg = Math.max(0, clamped - 0.5) * 2 * 180;
    return {
      ringCommon: common,
      rightRotation: `${rightDeg}deg`,
      leftRotation: `${leftDeg}deg`,
      showLeftHalf: clamped > 0.5,
    };
  }, [size, thickness, clamped]);

  const half = size / 2;
  const arcBorder: ViewStyle = {
    borderTopColor: arcColor,
    borderRightColor: arcColor,
  };

  return (
    <View
      accessible
      accessibilityRole="progressbar"
      accessibilityLabel={t('a11y.progressRing')}
      accessibilityValue={{ min: 0, max: 100, now: Math.round(clamped * 100) }}
      style={[{ width: size, height: size }, styles.center, style]}
    >
      {/* Track */}
      <View style={[ringCommon, { borderColor: track }]} />

      {/* Right half mask: clips the ring to its right semicircle. */}
      <View style={[styles.half, { width: half, height: size, right: 0, overflow: 'hidden' }]}>
        <View
          style={[
            ringCommon,
            arcBorder,
            { right: 0, transform: [{ rotate: rightRotation }] },
          ]}
        />
      </View>

      {/* Left half mask: only revealed once past 50%. */}
      {showLeftHalf ? (
        <View style={[styles.half, { width: half, height: size, left: 0, overflow: 'hidden' }]}>
          <View
            style={[
              ringCommon,
              arcBorder,
              { left: 0, transform: [{ rotate: leftRotation }] },
            ]}
          />
        </View>
      ) : null}

      {children ? <View style={styles.center}>{children}</View> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  center: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  half: {
    position: 'absolute',
    top: 0,
  },
});
