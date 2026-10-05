import { useLocalSearchParams, useRouter } from 'expo-router';
import { ActivityIndicator, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Button, Card, ScreenHeader } from '@/components/ui';
import { useActiveWorkoutStore } from '@/features/workout/active-workout-store';
import { useWorkoutSummary } from '@/features/workout/use-workout-queries';
import { useTokens } from '@/hooks/use-tokens';
import { t } from '@/i18n';
import { pressLight } from '@/lib/haptics';

export default function WorkoutSummaryScreen() {
  const { colors, radius, spacing, fontSize, fontWeight } = useTokens();
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const discardWorkout = useActiveWorkoutStore((s) => s.discardWorkout);

  const { data, isLoading, isError } = useWorkoutSummary(id ?? null);

  const close = () => {
    pressLight();
    // Clear the local active-workout snapshot now that it's finished & synced.
    void discardWorkout();
    router.replace('/(app)');
  };

  const fmtDuration = (secs: number | null) => {
    if (secs == null || secs <= 0) return '0m';
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m}${t('workout.minutesShort')} ${s}${t('workout.secondsShort')}`;
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.bg }]}>
      <SafeAreaView style={styles.safeArea}>
        <ScrollView
          contentContainerStyle={{ padding: spacing.xl, gap: spacing.lg, flexGrow: 1 }}
          showsVerticalScrollIndicator={false}
        >
          <ScreenHeader
            title={t('workout.summaryTitle')}
            subtitle={t('workout.summarySubtitle')}
          />

          {isLoading ? (
            <View style={styles.state}>
              <ActivityIndicator color={colors.accent} size="large" />
            </View>
          ) : isError || !data ? (
            <Card>
              <Text style={{ color: colors.danger, fontSize: fontSize.body }}>
                {t('common.somethingWentWrong')}
              </Text>
            </Card>
          ) : (
            <>
              {/* Hero Dark Summary Card */}
              <View
                style={[
                  styles.heroCard,
                  {
                    backgroundColor: colors.ink,
                    borderRadius: radius.cardLg,
                    padding: spacing.xl,
                    gap: spacing.lg,
                  },
                ]}
              >
                <View style={styles.heroHeader}>
                  <Text
                    style={{
                      color: colors.accent,
                      fontSize: fontSize.label,
                      fontWeight: fontWeight.bold,
                      letterSpacing: 1.2,
                      textTransform: 'uppercase',
                    }}
                  >
                    {t('workout.totalVolume')}
                  </Text>
                  <Text
                    style={{
                      color: colors.surface,
                      fontSize: 40,
                      fontWeight: fontWeight.bold,
                      letterSpacing: -0.5,
                      lineHeight: 46,
                      marginTop: spacing.xs,
                    }}
                  >
                    {data.totalVolume.toLocaleString()}{' '}
                    <Text style={{ fontSize: fontSize.title, fontWeight: fontWeight.medium, color: colors.inkMuted }}>
                      kg
                    </Text>
                  </Text>
                </View>

                {/* Micro stat pills inside hero */}
                <View style={styles.heroStatsRow}>
                  <View style={styles.heroStatItem}>
                    <Text style={{ color: colors.inkMuted, fontSize: fontSize.label }}>
                      {t('workout.duration')}
                    </Text>
                    <Text
                      style={{
                        color: colors.surface,
                        fontSize: fontSize.body,
                        fontWeight: fontWeight.bold,
                      }}
                    >
                      {fmtDuration(data.durationSeconds)}
                    </Text>
                  </View>

                  <View style={styles.statDivider} />

                  <View style={styles.heroStatItem}>
                    <Text style={{ color: colors.inkMuted, fontSize: fontSize.label }}>
                      {t('workout.workingSets')}
                    </Text>
                    <Text
                      style={{
                        color: colors.surface,
                        fontSize: fontSize.body,
                        fontWeight: fontWeight.bold,
                      }}
                    >
                      {data.totalWorkingSets}
                    </Text>
                  </View>

                  <View style={styles.statDivider} />

                  <View style={styles.heroStatItem}>
                    <Text style={{ color: colors.inkMuted, fontSize: fontSize.label }}>
                      {t('workout.exercises')}
                    </Text>
                    <Text
                      style={{
                        color: colors.surface,
                        fontSize: fontSize.body,
                        fontWeight: fontWeight.bold,
                      }}
                    >
                      {data.exerciseCount}
                    </Text>
                  </View>
                </View>
              </View>

              {/* Breakdown Card */}
              <Card>
                <View style={{ gap: spacing.md }}>
                  <Text
                    style={{
                      color: colors.inkMuted,
                      fontSize: fontSize.label,
                      fontWeight: fontWeight.bold,
                      letterSpacing: 1,
                      textTransform: 'uppercase',
                    }}
                  >
                    {t('workout.breakdown')}
                  </Text>

                  <View style={styles.statRow}>
                    <Text style={{ color: colors.inkMuted, fontSize: fontSize.body }}>
                      {t('workout.totalSets')}
                    </Text>
                    <Text style={{ color: colors.ink, fontSize: fontSize.body, fontWeight: fontWeight.bold }}>
                      {data.totalSets}
                    </Text>
                  </View>

                  <View style={styles.statRow}>
                    <Text style={{ color: colors.inkMuted, fontSize: fontSize.body }}>
                      {t('workout.vsPrevious')}
                    </Text>
                    <Text
                      style={{
                        color:
                          data.volumeChangeVsPrevious == null
                            ? colors.inkMuted
                            : data.volumeChangeVsPrevious >= 0
                              ? colors.success
                              : colors.danger,
                        fontSize: fontSize.body,
                        fontWeight: fontWeight.bold,
                      }}
                    >
                      {data.volumeChangeVsPrevious == null
                        ? t('workout.firstWorkout')
                        : `${data.volumeChangeVsPrevious >= 0 ? '+' : ''}${data.volumeChangeVsPrevious} kg`}
                    </Text>
                  </View>
                </View>
              </Card>
            </>
          )}

          <View style={styles.spacer} />

          <Button label={t('workout.close')} onPress={close} />
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  safeArea: { flex: 1 },
  state: { paddingVertical: 48, alignItems: 'center' },
  heroCard: { width: '100%' },
  heroHeader: { gap: 2 },
  heroStatsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderRadius: 16,
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  heroStatItem: { alignItems: 'center', gap: 2 },
  statDivider: { width: 1, height: 24, backgroundColor: 'rgba(255, 255, 255, 0.15)' },
  statRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  spacer: { flex: 1, minHeight: 24 },
});
