import { useLocalSearchParams, useRouter } from 'expo-router';
import { Check, Edit3 } from 'lucide-react-native';
import { useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

import {
  Card,
  InlineError,
  OfflineBanner,
  PrimaryButton,
  Sheet,
} from '@/components/ui';
import { useActiveWorkoutStore } from '@/features/workout/active-workout-store';
import {
  useUpdateWorkout,
  useWorkoutSummary,
} from '@/features/workout/use-workout-queries';
import { useTokens } from '@/hooks/use-tokens';
import { t } from '@/i18n';
import { notifySuccess, pressLight } from '@/lib/haptics';

export default function WorkoutSummaryScreen() {
  const insets = useSafeAreaInsets();
  const { colors, radius, spacing, type, icons, touchTarget } = useTokens();
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();

  const activeWorkout = useActiveWorkoutStore((s) => s.workout);
  const discardWorkout = useActiveWorkoutStore((s) => s.discardWorkout);

  const workoutId = id ?? activeWorkout?.id ?? null;
  const { data, isLoading, isError, refetch } = useWorkoutSummary(workoutId);
  const updateWorkout = useUpdateWorkout();

  // Editable workout name & notes (derived with local override to avoid cascading effects)
  const [editedName, setEditedName] = useState<string | null>(null);
  const [editedNotes, setEditedNotes] = useState<string | null>(null);
  const [renameSheetOpen, setRenameSheetOpen] = useState(false);
  const [notesSheetOpen, setNotesSheetOpen] = useState(false);

  const workoutName = editedName ?? data?.name ?? activeWorkout?.name ?? '';
  const workoutNotes = editedNotes ?? activeWorkout?.notes ?? '';

  const handleSave = async () => {
    pressLight();
    if (workoutId) {
      const nameChanged = editedName != null && editedName.trim() !== (data?.name ?? activeWorkout?.name ?? '');
      const notesChanged = editedNotes != null && editedNotes !== (activeWorkout?.notes ?? '');
      if (nameChanged || notesChanged) {
        await updateWorkout.mutateAsync({
          id: workoutId,
          name: workoutName.trim() || null,
          notes: workoutNotes.trim() || null,
        });
      }
    }
    notifySuccess();
    // Clear local active-workout state now that user has confirmed summary
    await discardWorkout();
    router.replace('/(app)');
  };

  const fmtDuration = (secs: number | null) => {
    if (secs == null || secs <= 0) return '0m';
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    if (m === 0) return `${s}${t('workout.secondsShort')}`;
    return s > 0
      ? `${m}${t('workout.minutesShort')} ${s}${t('workout.secondsShort')}`
      : `${m}${t('workout.minutesShort')}`;
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.bg }]}>
      <SafeAreaView edges={['top']} style={styles.safeArea}>
        <OfflineBanner />

        <ScrollView
          contentContainerStyle={[
            styles.scrollContent,
            { padding: spacing.lg, gap: spacing.lg, paddingBottom: 110 + insets.bottom },
          ]}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* Header (WORKOUT_UX.md §9.2: title "Workout complete" with check in accent) */}
          <View style={styles.header}>
            <View
              style={[
                styles.checkCircle,
                {
                  backgroundColor: colors.accentSoft,
                  borderRadius: radius.pill,
                },
              ]}
            >
              <Check size={28} color={colors.accent} strokeWidth={icons.strokeWidth} />
            </View>
            <View style={{ flex: 1, gap: 2 }}>
              <Text style={[type.title, { color: colors.ink }]}>
                {t('workout.summaryTitle')}
              </Text>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={t('workout.renameWorkoutTitle')}
                onPress={() => {
                  pressLight();
                  setRenameSheetOpen(true);
                }}
                style={styles.nameRow}
              >
                <Text numberOfLines={1} style={[type.secondary, { color: colors.inkMutedText }]}>
                  {workoutName || activeWorkout?.name || t('workout.workoutDetailTitle')}
                </Text>
                <Edit3 size={14} color={colors.inkMutedText} strokeWidth={icons.strokeWidth} />
              </Pressable>
            </View>
          </View>

          {isLoading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator color={colors.accent} size="large" />
            </View>
          ) : isError || !data ? (
            <InlineError onRetry={() => void refetch()} />
          ) : (
            <>
              {/* Hero Card (WORKOUT_UX.md §9.2: surface card, radius 28, no dark card) */}
              <View
                style={[
                  styles.heroCard,
                  {
                    backgroundColor: colors.surface,
                    borderColor: colors.hairline,
                    borderRadius: 28,
                    padding: spacing.xl,
                  },
                ]}
              >
                <Text
                  style={[
                    type.caption,
                    {
                      color: colors.inkMutedText,
                      textTransform: 'uppercase',
                      letterSpacing: 1.2,
                    },
                  ]}
                >
                  {t('workout.totalVolume')}
                </Text>

                <View style={styles.volumeRow}>
                  <Text
                    style={[
                      type.metricHero,
                      {
                        color: colors.ink,
                        fontVariant: ['tabular-nums'],
                      },
                    ]}
                  >
                    {data.totalVolume.toLocaleString()}
                  </Text>
                  <Text style={[type.unit, { color: colors.inkMutedText, marginBottom: 8 }]}>
                    kg
                  </Text>
                </View>

                {/* Volume delta vs previous session */}
                <View style={styles.volumeDeltaContainer}>
                  {data.volumePercentageChangeVsPrevious != null ? (
                    <Text
                      style={[
                        type.secondary,
                        {
                          color:
                            data.volumePercentageChangeVsPrevious >= 0
                              ? colors.accentText
                              : colors.inkMutedText,
                          fontVariant: ['tabular-nums'],
                        },
                      ]}
                    >
                      {t('workout.vsPreviousWorkout', {
                        change: `${data.volumePercentageChangeVsPrevious >= 0 ? '+' : ''}${data.volumePercentageChangeVsPrevious}%`,
                      })}
                    </Text>
                  ) : (
                    <Text style={[type.secondary, { color: colors.inkMutedText }]}>
                      {t('workout.firstTimeLogging')}
                    </Text>
                  )}
                </View>

                <View style={[styles.statDivider, { backgroundColor: colors.hairline }]} />

                {/* Three metrics: Duration, Exercises, Working Sets */}
                <View style={styles.microStatsRow}>
                  <View style={styles.microStatCol}>
                    <Text style={[type.caption, { color: colors.inkMutedText }]}>
                      {t('workout.duration')}
                    </Text>
                    <Text style={[type.metricValue, { fontSize: 20, color: colors.ink }]}>
                      {fmtDuration(data.durationSeconds)}
                    </Text>
                  </View>

                  <View style={[styles.verticalDivider, { backgroundColor: colors.hairline }]} />

                  <View style={styles.microStatCol}>
                    <Text style={[type.caption, { color: colors.inkMutedText }]}>
                      {t('workout.exercises')}
                    </Text>
                    <Text style={[type.metricValue, { fontSize: 20, color: colors.ink }]}>
                      {data.exerciseCount}
                    </Text>
                  </View>

                  <View style={[styles.verticalDivider, { backgroundColor: colors.hairline }]} />

                  <View style={styles.microStatCol}>
                    <Text style={[type.caption, { color: colors.inkMutedText }]}>
                      {t('workout.workingSets')}
                    </Text>
                    <Text style={[type.metricValue, { fontSize: 20, color: colors.ink }]}>
                      {data.totalWorkingSets}
                    </Text>
                  </View>
                </View>
              </View>

              {/* Performance Section (WORKOUT_UX.md §9.2: factual comparisons only) */}
              <View style={styles.section}>
                <Text style={[type.sectionTitle, { color: colors.ink, marginBottom: spacing.xs }]}>
                  {t('workout.performanceTitle')}
                </Text>

                {data.exerciseDeltas && data.exerciseDeltas.length > 0 ? (
                  <View style={{ gap: spacing.sm }}>
                    {data.exerciseDeltas.map((delta) => (
                      <Card key={delta.exerciseId}>
                        <View style={styles.deltaCardContent}>
                          <Text style={[type.body, { fontWeight: '600', color: colors.ink }]}>
                            {delta.exerciseName}
                          </Text>
                          <Text
                            style={[
                              type.secondary,
                              {
                                color:
                                  delta.deltaWeight && delta.deltaWeight > 0
                                    ? colors.accentText
                                    : delta.deltaReps && delta.deltaReps > 0
                                      ? colors.accentText
                                      : colors.inkMutedText,
                              },
                            ]}
                          >
                            {delta.displayText}
                          </Text>
                        </View>
                      </Card>
                    ))}
                  </View>
                ) : (
                  <Card>
                    <Text style={[type.secondary, { color: colors.inkMutedText }]}>
                      {t('workout.firstWorkout')}
                    </Text>
                  </Card>
                )}
              </View>

              {/* Workout Notes Card */}
              <View style={styles.section}>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={t('workout.workoutNotesTitle')}
                  onPress={() => {
                    pressLight();
                    setNotesSheetOpen(true);
                  }}
                >
                  <Card>
                    <View style={styles.notesCardHeader}>
                      <Text style={[type.cardLabel, { color: colors.inkMutedText }]}>
                        {t('workout.workoutNotesTitle')}
                      </Text>
                      <Edit3 size={16} color={colors.inkMutedText} strokeWidth={icons.strokeWidth} />
                    </View>
                    <Text
                      numberOfLines={3}
                      style={[
                        type.body,
                        {
                          color: workoutNotes ? colors.ink : colors.inkMutedText,
                          fontStyle: workoutNotes ? 'normal' : 'italic',
                          marginTop: spacing.xs,
                        },
                      ]}
                    >
                      {workoutNotes || t('workout.workoutNotesPlaceholder')}
                    </Text>
                  </Card>
                </Pressable>
              </View>
            </>
          )}
        </ScrollView>

        {/* Sticky Save Workout Button */}
        <View
          style={[
            styles.bottomStickyBar,
            {
              backgroundColor: colors.surface,
              borderTopColor: colors.hairline,
              paddingBottom: Math.max(insets.bottom, spacing.md),
              paddingTop: spacing.md,
              paddingHorizontal: spacing.lg,
            },
          ]}
        >
          <PrimaryButton
            label={t('workout.saveWorkout')}
            onPress={() => void handleSave()}
            loading={updateWorkout.isPending}
          />
        </View>

        {/* Rename Sheet */}
        <Sheet
          visible={renameSheetOpen}
          onClose={() => setRenameSheetOpen(false)}
          title={t('workout.renameWorkoutTitle')}
        >
          <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
            style={{ gap: spacing.md }}
          >
            <TextInput
              style={[
                styles.sheetInput,
                {
                  backgroundColor: colors.bg,
                  borderColor: colors.hairline,
                  borderRadius: radius.md,
                  color: colors.ink,
                  fontSize: 16,
                  minHeight: touchTarget.min,
                },
              ]}
              value={workoutName}
              onChangeText={setEditedName}
              placeholder="e.g. Upper Body A"
              placeholderTextColor={colors.inkMutedText}
              autoFocus
              selectTextOnFocus
            />
            <PrimaryButton
              label={t('common.done')}
              onPress={() => {
                pressLight();
                setRenameSheetOpen(false);
              }}
            />
          </KeyboardAvoidingView>
        </Sheet>

        {/* Notes Sheet */}
        <Sheet
          visible={notesSheetOpen}
          onClose={() => setNotesSheetOpen(false)}
          title={t('workout.workoutNotesTitle')}
        >
          <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
            style={{ gap: spacing.md }}
          >
            <TextInput
              style={[
                styles.sheetInput,
                {
                  backgroundColor: colors.bg,
                  borderColor: colors.hairline,
                  borderRadius: radius.md,
                  color: colors.ink,
                  fontSize: 16,
                  minHeight: 100,
                  textAlignVertical: 'top',
                },
              ]}
              value={workoutNotes}
              onChangeText={setEditedNotes}
              placeholder={t('workout.workoutNotesPlaceholder')}
              placeholderTextColor={colors.inkMutedText}
              multiline
              autoFocus
            />
            <PrimaryButton
              label={t('common.done')}
              onPress={() => {
                pressLight();
                setNotesSheetOpen(false);
              }}
            />
          </KeyboardAvoidingView>
        </Sheet>
      </SafeAreaView>
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
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  checkCircle: {
    width: 48,
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 2,
  },
  loadingContainer: {
    paddingVertical: 64,
    alignItems: 'center',
  },
  heroCard: {
    borderWidth: 1,
    gap: 8,
  },
  volumeRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 6,
  },
  volumeDeltaContainer: {
    marginTop: -2,
    marginBottom: 8,
  },
  statDivider: {
    height: 1,
    marginVertical: 12,
  },
  microStatsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  microStatCol: {
    flex: 1,
    alignItems: 'center',
    gap: 2,
  },
  verticalDivider: {
    width: 1,
    height: 32,
  },
  section: {
    gap: 8,
  },
  deltaCardContent: {
    gap: 4,
  },
  notesCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  bottomStickyBar: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    borderTopWidth: 1,
  },
  sheetInput: {
    borderWidth: 1,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
});
