import { computeVolume } from '@liftmate/shared';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Calendar, Clock, MoreHorizontal } from 'lucide-react-native';
import { useMemo, useState } from 'react';
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import {
  Card,
  CircleButton,
  DetailHeader,
  InlineError,
  OfflineBanner,
  PrimaryButton,
  SecondaryButton,
  Sheet,
} from '@/components/ui';
import {
  useDeleteWorkout,
  useWorkoutDetail,
} from '@/features/workout/use-workout-queries';
import { useTokens } from '@/hooks/use-tokens';
import { t } from '@/i18n';
import { notifySuccess, notifyWarning, pressLight } from '@/lib/haptics';

export default function WorkoutDetailScreen() {
  const { colors, spacing, type, icons } = useTokens();
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();

  const { data: workout, isLoading, isError, refetch } = useWorkoutDetail(id ?? null);
  const deleteWorkoutMutation = useDeleteWorkout();

  const [menuOpen, setMenuOpen] = useState(false);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);

  // Compute stats
  const stats = useMemo(() => {
    if (!workout) return { volume: 0, workingSets: 0, totalSets: 0, durationMinutes: 0 };
    const allSets = workout.exercises.flatMap((ex) => ex.sets);
    const completedSets = allSets.filter((s) => s.completed);
    const workingCompleted = completedSets.filter((s) => s.setType === 'working');

    // Compute volume using shared helper for completed working sets
    const volume = computeVolume(
      workingCompleted.map((s) => ({
        weight: Number(s.weight ?? 0),
        reps: Number(s.reps ?? 0),
        setType: s.setType,
        completed: s.completed,
      }))
    );

    let durationMinutes = 0;
    if (workout.startedAt && workout.completedAt) {
      const diffMs = new Date(workout.completedAt).getTime() - new Date(workout.startedAt).getTime();
      durationMinutes = Math.max(1, Math.round(diffMs / 60000));
    }

    return {
      volume,
      workingSets: workingCompleted.length,
      totalSets: completedSets.length,
      durationMinutes,
    };
  }, [workout]);

  // Formatted date and time
  const formattedDate = workout?.startedAt
    ? new Date(workout.startedAt).toLocaleDateString(undefined, {
        month: 'long',
        day: 'numeric',
        year: 'numeric',
      })
    : '';

  const handleDelete = async () => {
    if (!id) return;
    notifyWarning();
    setDeleteConfirmOpen(false);
    await deleteWorkoutMutation.mutateAsync(id);
    notifySuccess();
    router.back();
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.bg }]}>
      <DetailHeader
          title={workout?.name || t('workout.workoutDetailTitle')}
          onBack={() => {
            pressLight();
            router.back();
          }}
          trailing={
            <CircleButton
              variant="default"
              icon={<MoreHorizontal size={20} color={colors.ink} strokeWidth={icons.strokeWidth} />}
              accessibilityLabel="Workout actions"
              onPress={() => {
                pressLight();
                setMenuOpen(true);
              }}
            />
          }
        />

        <OfflineBanner />

        {isLoading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator color={colors.accent} size="large" />
          </View>
        ) : isError || !workout ? (
          <InlineError onRetry={() => void refetch()} />
        ) : (
          <ScrollView
            contentContainerStyle={[styles.scrollContent, { padding: spacing.lg, gap: spacing.lg }]}
            showsVerticalScrollIndicator={false}
          >
            {/* Date and Duration Subtitle (WORKOUT_UX.md §10.2) */}
            <View style={styles.subtitleRow}>
              <View style={styles.metaItem}>
                <Calendar size={16} color={colors.inkMutedText} strokeWidth={icons.strokeWidth} />
                <Text style={[type.secondary, { color: colors.inkMutedText }]}>
                  {formattedDate}
                </Text>
              </View>

              <Text style={[type.secondary, { color: colors.inkMutedText }]}>·</Text>

              <View style={styles.metaItem}>
                <Clock size={16} color={colors.inkMutedText} strokeWidth={icons.strokeWidth} />
                <Text style={[type.secondary, { color: colors.inkMutedText }]}>
                  {stats.durationMinutes}m
                </Text>
              </View>
            </View>

            {/* Summary Stats Card (WORKOUT_UX.md §10.2: surface card, radius 28, hairline border) */}
            <View
              style={[
                styles.statsCard,
                {
                  backgroundColor: colors.surface,
                  borderColor: colors.hairline,
                  borderRadius: 28,
                  padding: spacing.xl,
                },
              ]}
            >
              <View style={styles.statCol}>
                <Text style={[type.caption, { color: colors.inkMutedText, textTransform: 'uppercase' }]}>
                  {t('workout.totalVolume')}
                </Text>
                <Text style={[type.metricValue, { fontSize: 22, color: colors.ink }]}>
                  {stats.volume.toLocaleString()}{' '}
                  <Text style={[type.caption, { color: colors.inkMutedText }]}>kg</Text>
                </Text>
              </View>

              <View style={[styles.statDivider, { backgroundColor: colors.hairline }]} />

              <View style={styles.statCol}>
                <Text style={[type.caption, { color: colors.inkMutedText, textTransform: 'uppercase' }]}>
                  {t('workout.exercises')}
                </Text>
                <Text style={[type.metricValue, { fontSize: 22, color: colors.ink }]}>
                  {workout.exercises.length}
                </Text>
              </View>

              <View style={[styles.statDivider, { backgroundColor: colors.hairline }]} />

              <View style={styles.statCol}>
                <Text style={[type.caption, { color: colors.inkMutedText, textTransform: 'uppercase' }]}>
                  {t('workout.workingSets')}
                </Text>
                <Text style={[type.metricValue, { fontSize: 22, color: colors.ink }]}>
                  {stats.workingSets}
                </Text>
              </View>
            </View>

            {/* Workout Notes (if present) */}
            {workout.notes ? (
              <Card>
                <Text style={[type.cardLabel, { color: colors.inkMutedText, marginBottom: 4 }]}>
                  {t('workout.workoutNotesTitle')}
                </Text>
                <Text style={[type.body, { color: colors.ink }]}>{workout.notes}</Text>
              </Card>
            ) : null}

            {/* Read-Only Exercise Blocks (WORKOUT_UX.md §10.2) */}
            {workout.exercises.map((ex, index) => {
              const exName = ex.exercise?.name ?? `Exercise ${index + 1}`;
              return (
                <View key={ex.id} style={styles.exerciseBlock}>
                  <Text style={[type.sectionTitle, { color: colors.ink, marginBottom: spacing.xs }]}>
                    {exName}
                  </Text>

                  <Card>
                    <View style={{ gap: spacing.sm }}>
                      {ex.sets.map((set, sIdx) => {
                        const isWarmup = set.setType === 'warmup';
                        const weightStr = set.weight != null ? `${set.weight} kg` : '-';
                        const repsStr = set.reps != null ? `${set.reps} reps` : '-';
                        const rirStr = set.rirUnknown
                          ? 'Unknown RIR'
                          : set.rir != null
                            ? `${set.rir} RIR`
                            : null;

                        return (
                          <View key={set.id} style={styles.setRowWrapper}>
                            <View style={styles.setRow}>
                              <View style={styles.setNumberCol}>
                                <Text
                                  style={[
                                    type.body,
                                    {
                                      fontWeight: '600',
                                      color: colors.inkMutedText,
                                      fontVariant: ['tabular-nums'],
                                    },
                                  ]}
                                >
                                  {sIdx + 1}
                                </Text>
                                {isWarmup ? (
                                  <View
                                    style={[
                                      styles.warmupBadge,
                                      {
                                        backgroundColor: colors.accentSoft,
                                        borderRadius: 4,
                                      },
                                    ]}
                                  >
                                    <Text style={[type.caption, { color: colors.accentText, fontWeight: '700' }]}>
                                      W
                                    </Text>
                                  </View>
                                ) : null}
                              </View>

                              <View style={styles.metricsCol}>
                                <Text
                                  style={[
                                    type.body,
                                    {
                                      color: colors.ink,
                                      fontVariant: ['tabular-nums'],
                                      fontWeight: '500',
                                    },
                                  ]}
                                >
                                  {weightStr} × {repsStr}
                                </Text>
                              </View>

                              {rirStr ? (
                                <Text style={[type.secondary, { color: colors.inkMutedText }]}>
                                  {rirStr}
                                </Text>
                              ) : null}
                            </View>

                            {set.notes ? (
                              <Text
                                style={[
                                  type.caption,
                                  {
                                    color: colors.inkMutedText,
                                    fontStyle: 'italic',
                                    marginLeft: 32,
                                    marginTop: 2,
                                  },
                                ]}
                              >
                                {set.notes}
                              </Text>
                            ) : null}
                          </View>
                        );
                      })}
                    </View>
                  </Card>
                </View>
              );
            })}
          </ScrollView>
        )}

        {/* Action Menu Sheet */}
        <Sheet
          visible={menuOpen}
          onClose={() => setMenuOpen(false)}
          title={t('workout.workoutDetailTitle')}
        >
          <View style={{ gap: spacing.md }}>
            <SecondaryButton
              label={t('workout.deleteWorkout')}
              onPress={() => {
                pressLight();
                setMenuOpen(false);
                setDeleteConfirmOpen(true);
              }}
            />
          </View>
        </Sheet>

        {/* Delete Confirmation Sheet */}
        <Sheet
          visible={deleteConfirmOpen}
          onClose={() => setDeleteConfirmOpen(false)}
          title={t('workout.deleteWorkoutConfirmTitle')}
        >
          <View style={{ gap: spacing.lg }}>
            <Text style={[type.body, { color: colors.inkMutedText, lineHeight: 22 }]}>
              {t('workout.deleteWorkoutConfirmBody')}
            </Text>
            <View style={{ gap: spacing.sm }}>
              <PrimaryButton
                label={t('workout.deleteWorkout')}
                style={{ backgroundColor: colors.danger }}
                onPress={() => void handleDelete()}
                loading={deleteWorkoutMutation.isPending}
              />
              <SecondaryButton
                label={t('common.cancel')}
                onPress={() => {
                  pressLight();
                  setDeleteConfirmOpen(false);
                }}
              />
            </View>
          </View>
        </Sheet>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  safeArea: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    paddingBottom: 40,
  },
  loadingContainer: {
    paddingVertical: 64,
    alignItems: 'center',
  },
  subtitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  statsCard: {
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  statCol: {
    flex: 1,
    alignItems: 'center',
    gap: 2,
  },
  statDivider: {
    width: 1,
    height: 32,
  },
  exerciseBlock: {
    gap: 8,
  },
  setRowWrapper: {
    gap: 2,
  },
  setRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 4,
  },
  setNumberCol: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    width: 40,
  },
  warmupBadge: {
    paddingHorizontal: 5,
    paddingVertical: 1,
  },
  metricsCol: {
    flex: 1,
    paddingHorizontal: 8,
  },
});
