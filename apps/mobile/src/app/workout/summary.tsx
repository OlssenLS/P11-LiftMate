import { useLocalSearchParams, useRouter } from 'expo-router';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Button, Card, ScreenHeader } from '@/components/ui';
import { useActiveWorkoutStore } from '@/features/workout/active-workout-store';
import { useWorkoutSummary } from '@/features/workout/use-workout-queries';
import { useTokens } from '@/hooks/use-tokens';
import { t } from '@/i18n';

export default function WorkoutSummaryScreen() {
  const { colors, spacing, fontSize, fontWeight } = useTokens();
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const discardWorkout = useActiveWorkoutStore((s) => s.discardWorkout);

  const { data, isLoading, isError } = useWorkoutSummary(id ?? null);

  const close = () => {
    // Clear the local active-workout snapshot now that it's finished & synced.
    void discardWorkout();
    router.replace('/(app)');
  };

  const fmtDuration = (secs: number | null) => {
    if (secs == null) return '—';
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m}${t('workout.minutesShort')} ${s}${t('workout.secondsShort')}`;
  };

  const row = (label: string, value: string) => (
    <View style={styles.statRow}>
      <Text style={{ color: colors.inkMuted, fontSize: fontSize.body }}>{label}</Text>
      <Text style={{ color: colors.ink, fontSize: fontSize.body, fontWeight: fontWeight.bold }}>{value}</Text>
    </View>
  );

  return (
    <View style={[styles.container, { backgroundColor: colors.bg }]}>
      <SafeAreaView style={styles.safeArea}>
        <View style={{ padding: spacing.xl, gap: spacing.lg, flex: 1 }}>
          <ScreenHeader title={t('workout.summaryTitle')} />

          {isLoading ? (
            <View style={styles.state}>
              <ActivityIndicator color={colors.accent} />
            </View>
          ) : isError || !data ? (
            <Card>
              <Text style={{ color: colors.danger, fontSize: fontSize.body }}>
                {t('common.somethingWentWrong')}
              </Text>
            </Card>
          ) : (
            <Card>
              <View style={{ gap: spacing.md }}>
                {row(t('workout.duration'), fmtDuration(data.durationSeconds))}
                {row(t('workout.exercises'), String(data.exerciseCount))}
                {row(t('workout.totalSets'), String(data.totalSets))}
                {row(t('workout.workingSets'), String(data.totalWorkingSets))}
                {row(t('workout.totalVolume'), String(data.totalVolume))}
                {row(
                  t('workout.vsPrevious'),
                  data.volumeChangeVsPrevious == null
                    ? '—'
                    : `${data.volumeChangeVsPrevious >= 0 ? '+' : ''}${data.volumeChangeVsPrevious}`,
                )}
              </View>
            </Card>
          )}

          <View style={styles.spacer} />
          <Button label={t('workout.close')} onPress={close} />
        </View>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  safeArea: { flex: 1 },
  state: { paddingVertical: 48, alignItems: 'center' },
  statRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  spacer: { flex: 1 },
});
