/**
 * RestTimerBar — preset rest buttons + a live countdown when running.
 *
 * Timing comes from `useRestTimer` (timestamp-derived, survives backgrounding).
 * This component is purely presentational over that state.
 */
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { REST_PRESETS, type RestTimerState } from '@/features/workout/use-rest-timer';
import { useTokens } from '@/hooks/use-tokens';
import { t } from '@/i18n';
import { pressLight } from '@/lib/haptics';

export function RestTimerBar({ timer }: { timer: RestTimerState }) {
  const { colors, radius, spacing, touchTarget, fontSize, fontWeight } = useTokens();

  const mmss = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  if (timer.running) {
    return (
      <View
        style={[
          styles.runningRow,
          {
            backgroundColor: colors.ink,
            borderRadius: radius.button,
            paddingHorizontal: spacing.lg,
            paddingVertical: spacing.sm,
            minHeight: touchTarget.min,
          },
        ]}
      >
        <Text style={{ color: colors.bg, fontSize: fontSize.label, fontWeight: fontWeight.semibold }}>
          {t('workout.rest').toUpperCase()}
        </Text>
        <Text style={{ color: colors.surface, fontSize: fontSize.title, fontWeight: fontWeight.bold }}>
          {mmss(timer.remaining)}
        </Text>
        <Pressable
          accessibilityRole="button"
          onPress={() => {
            pressLight();
            timer.stop();
          }}
        >
          <Text style={{ color: colors.accent, fontSize: fontSize.body, fontWeight: fontWeight.semibold }}>
            {t('workout.stopRest')}
          </Text>
        </Pressable>
      </View>
    );
  }

  return (
    <View style={{ gap: spacing.sm }}>
      <Text
        style={{
          color: colors.inkMuted,
          fontSize: fontSize.label,
          fontWeight: fontWeight.semibold,
          textTransform: 'uppercase',
          letterSpacing: 1,
        }}
      >
        {t('workout.rest')}
      </Text>
      <View style={styles.presetRow}>
        {REST_PRESETS.map((secs) => (
          <Pressable
            key={secs}
            accessibilityRole="button"
            onPress={() => {
              pressLight();
              timer.start(secs);
            }}
            style={({ pressed }) => [
              {
                flex: 1,
                minHeight: touchTarget.min,
                borderRadius: radius.cardSm,
                borderWidth: 1.5,
                borderColor: colors.inkMuted,
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor: colors.surface,
              },
              pressed ? { opacity: 0.85 } : null,
            ]}
          >
            <Text style={{ color: colors.ink, fontSize: fontSize.body, fontWeight: fontWeight.semibold }}>
              {secs}
            </Text>
          </Pressable>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  runningRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  presetRow: { flexDirection: 'row', gap: 8 },
});
