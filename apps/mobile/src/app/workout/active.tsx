import {
  computeVolume,
  type MetricSet,
} from '@liftmate/shared';
import { useRouter } from 'expo-router';
import {
  Check,
  ChevronDown,
  History,
  MoreHorizontal,
  Plus,
  RotateCcw,
  Trash2,
} from 'lucide-react-native';
import { useEffect, useMemo, useState, useSyncExternalStore } from 'react';
import {
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  useWindowDimensions,
  View,
} from 'react-native';
import Animated, { FadeIn, FadeOut, LinearTransition } from 'react-native-reanimated';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

import {
  Card,
  CircleButton,
  EmptyState,
  Input,
  OfflineBanner,
  PrimaryButton,
  SecondaryButton,
  Sheet,
} from '@/components/ui';
import {
  useActiveWorkoutStore,
  type ActiveExercise,
  type ActiveSet,
} from '@/features/workout/active-workout-store';
import { ExercisePicker } from '@/features/workout/exercise-picker';
import { drainSyncQueue } from '@/features/workout/sync';
import { useRestTimer } from '@/features/workout/use-rest-timer';
import {
  useExerciseHistory,
  usePreviousSession,
} from '@/features/workout/use-workout-queries';
import { useTokens } from '@/hooks/use-tokens';
import { t } from '@/i18n';
import { notifySuccess, pressLight, selectionTick } from '@/lib/haptics';

let currentSecond = Math.floor(Date.now() / 1000);
function subscribeClock(callback: () => void) {
  const interval = setInterval(() => {
    currentSecond = Math.floor(Date.now() / 1000);
    callback();
  }, 1000);
  return () => clearInterval(interval);
}
function getClockSnapshot() {
  return currentSecond;
}
function getServerClockSnapshot() {
  return 0;
}

export default function ActiveWorkoutScreen() {
  const insets = useSafeAreaInsets();
  const { colors, radius, spacing, type, icons, touchTarget } = useTokens();
  const { width, fontScale } = useWindowDimensions();
  const router = useRouter();
  const timer = useRestTimer();

  const workout = useActiveWorkoutStore((s) => s.workout);
  const hydrated = useActiveWorkoutStore((s) => s.hydrated);
  const hydrate = useActiveWorkoutStore((s) => s.hydrate);
  const startWorkout = useActiveWorkoutStore((s) => s.startWorkout);
  const renameWorkout = useActiveWorkoutStore((s) => s.renameWorkout);
  const updateWorkoutNotes = useActiveWorkoutStore((s) => s.updateWorkoutNotes);
  const addExercise = useActiveWorkoutStore((s) => s.addExercise);
  const replaceExercise = useActiveWorkoutStore((s) => s.replaceExercise);
  const removeExercise = useActiveWorkoutStore((s) => s.removeExercise);
  const addSet = useActiveWorkoutStore((s) => s.addSet);
  const updateSet = useActiveWorkoutStore((s) => s.updateSet);
  const removeSet = useActiveWorkoutStore((s) => s.removeSet);
  const finishWorkout = useActiveWorkoutStore((s) => s.finishWorkout);
  const discardWorkout = useActiveWorkoutStore((s) => s.discardWorkout);

  // Modals & Sheets state
  const [pickerOpen, setPickerOpen] = useState(false);
  const [replaceTargetExerciseId, setReplaceTargetExerciseId] = useState<string | null>(null);
  const [leaveSheetOpen, setLeaveSheetOpen] = useState(false);
  const [discardSheetOpen, setDiscardSheetOpen] = useState(false);
  const [renameSheetOpen, setRenameSheetOpen] = useState(false);
  const [workoutNameInput, setWorkoutNameInput] = useState('');
  const [notesSheetOpen, setNotesSheetOpen] = useState(false);
  const [workoutNotesInput, setWorkoutNotesInput] = useState('');
  const [workoutMenuOpen, setWorkoutMenuOpen] = useState(false);
  const [finishConfirmOpen, setFinishConfirmOpen] = useState(false);
  const [durationPickerOpen, setDurationPickerOpen] = useState(false);
  const [customMinutes, setCustomMinutes] = useState('2');
  const [customSeconds, setCustomSeconds] = useState('00');

  // Exercise & Set specific sheets
  const [historyExercise, setHistoryExercise] = useState<{ id: string; name: string } | null>(null);
  const [exerciseMenuExercise, setExerciseMenuExercise] = useState<ActiveExercise | null>(null);
  const [setOptionsTarget, setSetOptionsTarget] = useState<{
    exerciseId: string;
    set: ActiveSet;
  } | null>(null);
  const [rirTarget, setRirTarget] = useState<{
    exerciseId: string;
    setId: string;
    currentRir: number | null;
    currentUnknown: boolean;
  } | null>(null);

  // Undo snackbar state
  const [deletedSetInfo, setDeletedSetInfo] = useState<{
    exerciseId: string;
    set: ActiveSet;
  } | null>(null);

  // Default rest timer preference in seconds (defaults to 120s)
  const [defaultRestDuration, setDefaultRestDuration] = useState(120);

  // Recover active session on mount
  useEffect(() => {
    void (async () => {
      if (!hydrated) {
        await hydrate();
      }
    })();
  }, [hydrated, hydrate]);

  useEffect(() => {
    if (hydrated && !workout) {
      void startWorkout();
    }
  }, [hydrated, workout, startWorkout]);

  useEffect(() => {
    void drainSyncQueue();
  }, []);

  // Live timer ticker via external store subscription
  const currentSecond = useSyncExternalStore(subscribeClock, getClockSnapshot, getServerClockSnapshot);
  const nowMs = currentSecond * 1000;

  // Formatted header eyebrow (WORKOUT_UX.md §3.1)
  const headerEyebrow = useMemo(() => {
    if (!workout || nowMs === 0) return '';
    const startObj = new Date(workout.startedAt);
    const startStr = startObj.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false });
    const diffSecs = Math.max(0, Math.floor((nowMs - startObj.getTime()) / 1000));
    const hours = Math.floor(diffSecs / 3600);
    const mins = Math.floor((diffSecs % 3600) / 60);
    const secs = diffSecs % 60;
    const elapsedStr =
      hours > 0
        ? `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
        : `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    return t('workout.startedEyebrow', { time: startStr, elapsed: elapsedStr });
  }, [workout, nowMs]);

  // Working sets volume calculation (WORKOUT_UX.md §3.2)
  const liveVolume = useMemo(() => {
    if (!workout) return 0;
    const sets: MetricSet[] = workout.exercises.flatMap((e) =>
      e.sets.map((s) => ({
        setType: s.setType,
        weight: s.weight,
        reps: s.reps,
        completed: s.completed,
      })),
    );
    return computeVolume(sets, { includeIncomplete: false });
  }, [workout]);

  // Working sets count (done / total)
  const { workingSetsDone, workingSetsTotal, totalSets, totalCompletedSets } = useMemo(() => {
    if (!workout) return { workingSetsDone: 0, workingSetsTotal: 0, totalSets: 0, totalCompletedSets: 0 };
    let done = 0;
    let total = 0;
    let allCount = 0;
    let allDone = 0;
    for (const ex of workout.exercises) {
      for (const s of ex.sets) {
        allCount++;
        if (s.completed) allDone++;
        if (s.setType === 'working') {
          total++;
          if (s.completed) done++;
        }
      }
    }
    return {
      workingSetsDone: done,
      workingSetsTotal: total,
      totalSets: allCount,
      totalCompletedSets: allDone,
    };
  }, [workout]);

  // Layout check for compact 6-column vs stacked fallback (WORKOUT_UX.md §4.1, §4.2)
  const isCompact = width >= 360 && fontScale < 1.15;

  // Complete workout routine
  const handleFinishPress = () => {
    if (!workout) return;
    if (totalSets > 0 && totalCompletedSets < totalSets) {
      setFinishConfirmOpen(true);
    } else {
      void commitFinish();
    }
  };

  const commitFinish = async () => {
    setFinishConfirmOpen(false);
    const finished = await finishWorkout();
    if (!finished) return;
    notifySuccess();
    await drainSyncQueue();
    router.replace({ pathname: '/workout/summary', params: { id: finished.id } });
  };

  const onSelectDuration = (secs: number) => {
    selectionTick();
    setDefaultRestDuration(secs);
    if (timer.running) {
      timer.start(secs);
    }
    setDurationPickerOpen(false);
  };

  const onConfirmCustomDuration = () => {
    const mins = parseInt(customMinutes, 10) || 0;
    const secs = parseInt(customSeconds, 10) || 0;
    const total = mins * 60 + secs;
    if (total > 0) {
      onSelectDuration(total);
    }
  };

  if (!hydrated || !workout) {
    return (
      <View style={[styles.container, { backgroundColor: colors.bg }]}>
        <SafeAreaView style={styles.safeArea} />
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.bg }]}>
      <SafeAreaView style={styles.safeArea}>
        {/* Header (WORKOUT_UX.md §3.1) */}
        <View style={[styles.header, { borderBottomColor: colors.hairline }]}>
          <CircleButton
            variant="default"
            icon={<ChevronDown size={22} color={colors.ink} strokeWidth={icons.strokeWidth} />}
            accessibilityLabel={t('workout.leaveWorkout')}
            onPress={() => {
              pressLight();
              setLeaveSheetOpen(true);
            }}
          />

          <Pressable
            accessibilityRole="button"
            accessibilityLabel={t('workout.renameWorkoutTitle')}
            onPress={() => {
              pressLight();
              setWorkoutNameInput(workout.name ?? '');
              setRenameSheetOpen(true);
            }}
            style={styles.headerTitleContainer}
          >
            <Text numberOfLines={1} style={[type.sectionTitle, { color: colors.ink }]}>
              {workout.name || 'Workout'}
            </Text>
            {headerEyebrow ? (
              <Text style={[type.eyebrow, { color: colors.inkMutedText, marginTop: 2 }]}>
                {headerEyebrow}
              </Text>
            ) : null}
          </Pressable>

          <CircleButton
            variant="default"
            icon={<MoreHorizontal size={22} color={colors.ink} strokeWidth={icons.strokeWidth} />}
            accessibilityLabel="Workout actions"
            onPress={() => {
              pressLight();
              setWorkoutMenuOpen(true);
            }}
          />
        </View>

        {/* Workout Note display if set */}
        {workout.notes ? (
          <Pressable
            onPress={() => {
              pressLight();
              setWorkoutNotesInput(workout.notes ?? '');
              setNotesSheetOpen(true);
            }}
            style={[styles.workoutNoteBanner, { backgroundColor: colors.surfaceMuted, borderColor: colors.hairline }]}
          >
            <Text numberOfLines={2} style={[type.secondary, { color: colors.inkMutedText }]}>
              {workout.notes}
            </Text>
          </Pressable>
        ) : null}

        <OfflineBanner />

        {/* Scrollable Workout Body */}
        <ScrollView
          contentContainerStyle={{ padding: spacing.lg, gap: spacing.lg, paddingBottom: 120 }}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* StatsCard (WORKOUT_UX.md §3.2: single surface card, radius 28, light background) */}
          <View style={[styles.statsCard, { backgroundColor: colors.surface, borderColor: colors.hairline, borderRadius: 28 }]}>
            <View style={styles.statCol}>
              <Text style={[type.caption, { color: colors.inkMutedText, textTransform: 'uppercase' }]}>
                {t('workout.totalVolume')}
              </Text>
              <Text style={[type.metricValue, { fontSize: 22, color: colors.ink }]}>
                {liveVolume.toLocaleString()} <Text style={[type.caption, { color: colors.inkMutedText }]}>kg</Text>
              </Text>
            </View>

            <View style={[styles.statDivider, { backgroundColor: colors.hairline }]} />

            <View style={styles.statCol}>
              <Text style={[type.caption, { color: colors.inkMutedText, textTransform: 'uppercase' }]}>
                {t('workout.totalSets')}
              </Text>
              <Text style={[type.metricValue, { fontSize: 22, color: colors.ink }]}>
                {workingSetsDone} / {workingSetsTotal}
              </Text>
            </View>

            <View style={[styles.statDivider, { backgroundColor: colors.hairline }]} />

            <View style={styles.statCol}>
              <Text style={[type.caption, { color: colors.inkMutedText, textTransform: 'uppercase' }]}>
                {t('workout.duration')}
              </Text>
              <Text style={[type.metricValue, { fontSize: 22, color: colors.ink }]}>
                {nowMs > 0 ? Math.floor(Math.max(0, nowMs - new Date(workout.startedAt).getTime()) / 60000) : 0}m
              </Text>
            </View>
          </View>

          {/* Exercise blocks */}
          {workout.exercises.length === 0 ? (
            <Card>
              <View style={{ gap: spacing.md, alignItems: 'center', paddingVertical: spacing.xl }}>
                <Text style={[type.title, { color: colors.ink, textAlign: 'center' }]}>
                  {t('workout.readyToTrain')}
                </Text>
                <Text style={[type.secondary, { color: colors.inkMutedText, textAlign: 'center', lineHeight: 22 }]}>
                  {t('workout.emptyExercises')}
                </Text>
                <PrimaryButton
                  label={t('workout.addFirstExercise')}
                  onPress={() => {
                    pressLight();
                    setPickerOpen(true);
                  }}
                />
              </View>
            </Card>
          ) : (
            workout.exercises.map((exercise) => (
              <ExerciseBlock
                key={exercise.id}
                workoutId={workout.id}
                exercise={exercise}
                isCompact={isCompact}
                onOpenHistory={() => {
                  pressLight();
                  setHistoryExercise({ id: exercise.exerciseId, name: exercise.name });
                }}
                onOpenMenu={() => {
                  pressLight();
                  setExerciseMenuExercise(exercise);
                }}
                onAddSet={() => {
                  pressLight();
                  void addSet(exercise.id, 'kg');
                }}
                onUpdateSet={(setId, patch) => void updateSet(exercise.id, setId, patch)}
                onSetOptions={(set) => {
                  pressLight();
                  setSetOptionsTarget({ exerciseId: exercise.id, set });
                }}
                onOpenRir={(set) => {
                  pressLight();
                  setRirTarget({
                    exerciseId: exercise.id,
                    setId: set.id,
                    currentRir: set.rir,
                    currentUnknown: set.rirUnknown ?? false,
                  });
                }}
                onAutoRest={() => {
                  timer.start(defaultRestDuration);
                }}
              />
            ))
          )}

          {/* Add Exercise button */}
          {workout.exercises.length > 0 && (
            <SecondaryButton
              label={t('workout.addExercise')}
              onPress={() => {
                pressLight();
                setPickerOpen(true);
              }}
            />
          )}
        </ScrollView>

        {/* Deleted Set Undo Snackbar */}
        {deletedSetInfo && (
          <Animated.View
            entering={FadeIn.duration(150)}
            exiting={FadeOut.duration(150)}
            style={[styles.undoSnackbar, { backgroundColor: colors.ink, borderRadius: radius.cardSm }]}
          >
            <Text style={[type.body, { color: '#FFFFFF' }]}>
              {t('workout.setDeleted')}
            </Text>
            <Pressable
              onPress={() => {
                pressLight();
                void addSet(deletedSetInfo.exerciseId, deletedSetInfo.set.weightUnit);
                setDeletedSetInfo(null);
              }}
              hitSlop={8}
            >
              <Text style={[type.cardLabel, { color: colors.accent }]}>
                {t('workout.undo')}
              </Text>
            </Pressable>
          </Animated.View>
        )}

        {/* Sticky Bottom Bar (WORKOUT_UX.md §6.2) */}
        <View style={[styles.bottomBar, { backgroundColor: colors.surface, borderTopColor: colors.hairline, paddingBottom: Math.max(insets.bottom, 12) }]}>
          {timer.running ? (
            <View style={{ gap: spacing.sm, width: '100%' }}>
              <View style={[styles.timerPanel, { backgroundColor: colors.accentSoft, borderRadius: radius.cardSm }]}>
                <Pressable
                  onPress={() => {
                    pressLight();
                    setDurationPickerOpen(true);
                  }}
                  style={{ flex: 1 }}
                >
                  <Text style={[type.metricValue, { color: colors.accentText, fontSize: 26 }]}>
                    {Math.floor(timer.remaining / 60)}:{(timer.remaining % 60).toString().padStart(2, '0')}
                  </Text>
                </Pressable>

                <View style={styles.timerControls}>
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel="-15 seconds"
                    onPress={() => {
                      pressLight();
                      timer.adjust(-15);
                    }}
                    style={styles.timerActionBtn}
                  >
                    <Text style={[type.caption, { color: colors.accentText, fontWeight: '700' }]}>-15</Text>
                  </Pressable>

                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel="+15 seconds"
                    onPress={() => {
                      pressLight();
                      timer.adjust(15);
                    }}
                    style={styles.timerActionBtn}
                  >
                    <Text style={[type.caption, { color: colors.accentText, fontWeight: '700' }]}>+15</Text>
                  </Pressable>

                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel={t('workout.skip')}
                    onPress={() => {
                      pressLight();
                      timer.stop();
                    }}
                    style={styles.timerActionBtn}
                  >
                    <Text style={[type.caption, { color: colors.accentText, fontWeight: '700' }]}>{t('workout.skip')}</Text>
                  </Pressable>
                </View>
              </View>

              <PrimaryButton
                label={t('workout.finish')}
                onPress={handleFinishPress}
              />
            </View>
          ) : (
            <View style={styles.idleBottomRow}>
              <SecondaryButton
                label={`⏱ Rest ${Math.floor(defaultRestDuration / 60)}:${(defaultRestDuration % 60).toString().padStart(2, '0')}`}
                style={{ flex: 1 }}
                onPress={() => {
                  pressLight();
                  setDurationPickerOpen(true);
                }}
              />
              <PrimaryButton
                label={t('workout.finish')}
                style={{ flex: 1 }}
                onPress={handleFinishPress}
              />
            </View>
          )}
        </View>
      </SafeAreaView>

      {/* RIR Picker Sheet (WORKOUT_UX.md §5.1) */}
      <Sheet
        visible={rirTarget != null}
        onClose={() => setRirTarget(null)}
        title={t('workout.rirPickerTitle')}
      >
        {rirTarget && (
          <View style={{ gap: spacing.lg, paddingVertical: spacing.md }}>
            <Text style={[type.secondary, { color: colors.inkMutedText }]}>
              {t('workout.rirPickerSubtitle')}
            </Text>

            {/* Row of 0, 1, 2, 3, 4, 5+ buttons */}
            <View style={styles.rirButtonsRow}>
              {[0, 1, 2, 3, 4, 5].map((val) => {
                const label = val === 5 ? '5+' : val.toString();
                const isSelected = !rirTarget.currentUnknown && rirTarget.currentRir === val;
                return (
                  <Pressable
                    key={val}
                    accessibilityRole="button"
                    accessibilityLabel={`RIR ${label}`}
                    onPress={() => {
                      selectionTick();
                      const nextVal = isSelected ? null : val;
                      void updateSet(rirTarget.exerciseId, rirTarget.setId, {
                        rir: nextVal,
                        rirUnknown: false,
                      });
                      setRirTarget(null);
                    }}
                    style={[
                      styles.rirBtn,
                      {
                        backgroundColor: isSelected ? colors.accent : colors.surfaceMuted,
                        borderRadius: radius.cardSm,
                        borderColor: colors.hairline,
                      },
                    ]}
                  >
                    <Text
                      style={[
                        type.title,
                        {
                          color: isSelected ? '#FFFFFF' : colors.ink,
                          fontSize: 20,
                        },
                      ]}
                    >
                      {label}
                    </Text>
                  </Pressable>
                );
              })}
            </View>

            {/* Full-width Unknown Pill */}
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={t('workout.rirUnknown')}
              onPress={() => {
                selectionTick();
                const nextUnknown = !rirTarget.currentUnknown;
                void updateSet(rirTarget.exerciseId, rirTarget.setId, {
                  rir: nextUnknown ? null : rirTarget.currentRir,
                  rirUnknown: nextUnknown,
                });
                setRirTarget(null);
              }}
              style={[
                styles.rirUnknownBtn,
                {
                  backgroundColor: rirTarget.currentUnknown ? colors.accent : colors.surfaceMuted,
                  borderRadius: radius.pill,
                },
              ]}
            >
              <Text
                style={[
                  type.cardLabel,
                  { color: rirTarget.currentUnknown ? '#FFFFFF' : colors.ink },
                ]}
              >
                {t('workout.rirUnknown')}
              </Text>
            </Pressable>
          </View>
        )}
      </Sheet>

      {/* Set Options Sheet (WORKOUT_UX.md §4.4) */}
      <Sheet
        visible={setOptionsTarget != null}
        onClose={() => setSetOptionsTarget(null)}
        title={t('workout.setOptionsTitle')}
      >
        {setOptionsTarget && (
          <View style={{ gap: spacing.lg, paddingVertical: spacing.md }}>
            <View style={{ gap: spacing.xs }}>
              <Text style={[type.caption, { color: colors.inkMutedText, textTransform: 'uppercase' }]}>
                {t('workout.set')} {setOptionsTarget.set.position + 1}
              </Text>
              <View style={styles.setTypeToggleRow}>
                <Pressable
                  onPress={() => {
                    selectionTick();
                    void updateSet(setOptionsTarget.exerciseId, setOptionsTarget.set.id, {
                      setType: 'working',
                    });
                    setSetOptionsTarget((prev) =>
                      prev ? { ...prev, set: { ...prev.set, setType: 'working' } } : null,
                    );
                  }}
                  style={[
                    styles.setTypeBtn,
                    {
                      backgroundColor:
                        setOptionsTarget.set.setType === 'working' ? colors.accent : colors.surfaceMuted,
                      borderRadius: radius.cardSm,
                    },
                  ]}
                >
                  <Text
                    style={[
                      type.cardLabel,
                      { color: setOptionsTarget.set.setType === 'working' ? '#FFFFFF' : colors.ink },
                    ]}
                  >
                    {t('workout.working')}
                  </Text>
                </Pressable>

                <Pressable
                  onPress={() => {
                    selectionTick();
                    void updateSet(setOptionsTarget.exerciseId, setOptionsTarget.set.id, {
                      setType: 'warmup',
                    });
                    setSetOptionsTarget((prev) =>
                      prev ? { ...prev, set: { ...prev.set, setType: 'warmup' } } : null,
                    );
                  }}
                  style={[
                    styles.setTypeBtn,
                    {
                      backgroundColor:
                        setOptionsTarget.set.setType === 'warmup' ? colors.accent : colors.surfaceMuted,
                      borderRadius: radius.cardSm,
                    },
                  ]}
                >
                  <Text
                    style={[
                      type.cardLabel,
                      { color: setOptionsTarget.set.setType === 'warmup' ? '#FFFFFF' : colors.ink },
                    ]}
                  >
                    {t('workout.warmup')} (W)
                  </Text>
                </Pressable>
              </View>
            </View>

            <Input
              label={t('workout.setNoteLabel')}
              placeholder={t('workout.setNotePlaceholder')}
              defaultValue={setOptionsTarget.set.notes ?? ''}
              onEndEditing={(e) => {
                void updateSet(setOptionsTarget.exerciseId, setOptionsTarget.set.id, {
                  notes: e.nativeEvent.text.trim() || null,
                });
              }}
            />

            <Pressable
              accessibilityRole="button"
              accessibilityLabel={t('workout.deleteSet')}
              onPress={() => {
                pressLight();
                const target = setOptionsTarget;
                setSetOptionsTarget(null);
                setDeletedSetInfo({ exerciseId: target.exerciseId, set: target.set });
                void removeSet(target.exerciseId, target.set.id);
                setTimeout(() => setDeletedSetInfo(null), 5000);
              }}
              style={[styles.deleteSetRow, { minHeight: touchTarget.min }]}
            >
              <Trash2 size={18} color={colors.danger} />
              <Text style={[type.cardLabel, { color: colors.danger }]}>
                {t('workout.deleteSet')}
              </Text>
            </Pressable>
          </View>
        )}
      </Sheet>

      {/* Exercise Actions Menu Sheet (WORKOUT_UX.md §3.3) */}
      <Sheet
        visible={exerciseMenuExercise != null}
        onClose={() => setExerciseMenuExercise(null)}
        title={exerciseMenuExercise?.name}
      >
        {exerciseMenuExercise && (
          <View style={{ gap: spacing.sm, paddingVertical: spacing.md }}>
            <Pressable
              onPress={() => {
                const ex = exerciseMenuExercise;
                setExerciseMenuExercise(null);
                setHistoryExercise({ id: ex.exerciseId, name: ex.name });
              }}
              style={[styles.sheetActionRow, { minHeight: touchTarget.min }]}
            >
              <History size={20} color={colors.ink} />
              <Text style={[type.body, { color: colors.ink }]}>{t('workout.viewHistory')}</Text>
            </Pressable>

            <Pressable
              onPress={() => {
                const ex = exerciseMenuExercise;
                setExerciseMenuExercise(null);
                setReplaceTargetExerciseId(ex.id);
                setPickerOpen(true);
              }}
              style={[styles.sheetActionRow, { minHeight: touchTarget.min }]}
            >
              <RotateCcw size={20} color={colors.ink} />
              <Text style={[type.body, { color: colors.ink }]}>{t('workout.replaceExercise')}</Text>
            </Pressable>

            <Pressable
              onPress={() => {
                const ex = exerciseMenuExercise;
                setExerciseMenuExercise(null);
                const hasCompleted = ex.sets.some((s) => s.completed);
                if (hasCompleted) {
                  Alert.alert(
                    t('workout.removeExerciseConfirm', { name: ex.name }),
                    t('workout.removeExerciseConfirmBody'),
                    [
                      { text: t('common.cancel'), style: 'cancel' },
                      {
                        text: t('workout.removeExercise'),
                        style: 'destructive',
                        onPress: () => void removeExercise(ex.id),
                      },
                    ],
                  );
                } else {
                  void removeExercise(ex.id);
                }
              }}
              style={[styles.sheetActionRow, { minHeight: touchTarget.min }]}
            >
              <Trash2 size={20} color={colors.danger} />
              <Text style={[type.body, { color: colors.danger }]}>{t('workout.removeExercise')}</Text>
            </Pressable>
          </View>
        )}
      </Sheet>

      {/* Exercise History Sheet (WORKOUT_UX.md §8.3) */}
      <ExerciseHistoryModal
        visible={historyExercise != null}
        exercise={historyExercise}
        currentWorkoutId={workout.id}
        onClose={() => setHistoryExercise(null)}
      />

      {/* Rest Duration Picker Sheet (WORKOUT_UX.md §6.3) */}
      <Sheet
        visible={durationPickerOpen}
        onClose={() => setDurationPickerOpen(false)}
        title={t('workout.rest')}
      >
        <View style={{ gap: spacing.lg, paddingVertical: spacing.md }}>
          <View style={styles.durationChipsGrid}>
            {[30, 60, 90, 120, 180].map((secs) => {
              const selected = defaultRestDuration === secs;
              return (
                <Pressable
                  key={secs}
                  accessibilityRole="button"
                  accessibilityLabel={`${secs} seconds`}
                  onPress={() => onSelectDuration(secs)}
                  style={[
                    styles.durationChip,
                    {
                      backgroundColor: selected ? colors.accentSoft : colors.surfaceMuted,
                      borderColor: selected ? colors.accent : colors.hairline,
                    },
                  ]}
                >
                  <Text
                    style={[
                      type.cardLabel,
                      { color: selected ? colors.accentText : colors.ink },
                    ]}
                  >
                    {secs}s
                  </Text>
                </Pressable>
              );
            })}
          </View>

          <View style={{ gap: spacing.sm }}>
            <Text style={[type.caption, { color: colors.inkMutedText, textTransform: 'uppercase' }]}>
              {t('workout.customRestTitle')}
            </Text>
            <View style={styles.customDurationRow}>
              <TextInput
                keyboardType="number-pad"
                value={customMinutes}
                onChangeText={setCustomMinutes}
                placeholder="2"
                style={[styles.customInput, { borderColor: colors.hairline, color: colors.ink }]}
              />
              <Text style={[type.body, { color: colors.inkMutedText }]}>m</Text>
              <TextInput
                keyboardType="number-pad"
                value={customSeconds}
                onChangeText={setCustomSeconds}
                placeholder="00"
                style={[styles.customInput, { borderColor: colors.hairline, color: colors.ink }]}
              />
              <Text style={[type.body, { color: colors.inkMutedText }]}>s</Text>
              <PrimaryButton
                label="Set"
                style={{ flex: 1, minHeight: 44 }}
                onPress={onConfirmCustomDuration}
              />
            </View>
          </View>
        </View>
      </Sheet>

      {/* Rename Workout Sheet */}
      <Sheet
        visible={renameSheetOpen}
        onClose={() => setRenameSheetOpen(false)}
        title={t('workout.renameWorkoutTitle')}
      >
        <View style={{ gap: spacing.lg, paddingVertical: spacing.md }}>
          <Input
            label={t('workout.renameWorkoutTitle')}
            value={workoutNameInput}
            onChangeText={setWorkoutNameInput}
            placeholder="e.g. Upper Body Push"
          />
          <PrimaryButton
            label={t('common.save')}
            onPress={() => {
              pressLight();
              void renameWorkout(workoutNameInput.trim());
              setRenameSheetOpen(false);
            }}
          />
        </View>
      </Sheet>

      {/* Workout Notes Sheet */}
      <Sheet
        visible={notesSheetOpen}
        onClose={() => setNotesSheetOpen(false)}
        title={t('workout.workoutNotesTitle')}
      >
        <View style={{ gap: spacing.lg, paddingVertical: spacing.md }}>
          <Input
            label={t('workout.workoutNotesTitle')}
            value={workoutNotesInput}
            onChangeText={setWorkoutNotesInput}
            placeholder={t('workout.workoutNotesPlaceholder')}
            multiline
            numberOfLines={4}
          />
          <PrimaryButton
            label={t('common.save')}
            onPress={() => {
              pressLight();
              void updateWorkoutNotes(workoutNotesInput.trim() || null);
              setNotesSheetOpen(false);
            }}
          />
        </View>
      </Sheet>

      {/* Workout Header Menu Sheet */}
      <Sheet
        visible={workoutMenuOpen}
        onClose={() => setWorkoutMenuOpen(false)}
        title="Workout Options"
      >
        <View style={{ gap: spacing.sm, paddingVertical: spacing.md }}>
          <Pressable
            onPress={() => {
              setWorkoutMenuOpen(false);
              setWorkoutNotesInput(workout.notes ?? '');
              setNotesSheetOpen(true);
            }}
            style={[styles.sheetActionRow, { minHeight: touchTarget.min }]}
          >
            <Text style={[type.body, { color: colors.ink }]}>{t('workout.workoutNotesTitle')}</Text>
          </Pressable>

          <Pressable
            onPress={() => {
              setWorkoutMenuOpen(false);
              setDiscardSheetOpen(true);
            }}
            style={[styles.sheetActionRow, { minHeight: touchTarget.min }]}
          >
            <Text style={[type.body, { color: colors.danger }]}>{t('workout.discard')}</Text>
          </Pressable>
        </View>
      </Sheet>

      {/* Leave Workout Sheet (WORKOUT_UX.md §2) */}
      <Sheet
        visible={leaveSheetOpen}
        onClose={() => setLeaveSheetOpen(false)}
        title={t('workout.leaveWorkoutTitle')}
      >
        <View style={{ gap: spacing.lg, paddingVertical: spacing.md }}>
          <Text style={[type.secondary, { color: colors.inkMutedText }]}>
            {t('workout.leaveWorkoutSubtitle')}
          </Text>
          <PrimaryButton
            label={t('workout.keepLogging')}
            onPress={() => setLeaveSheetOpen(false)}
          />
          <SecondaryButton
            label={t('workout.leaveWorkout')}
            onPress={() => {
              setLeaveSheetOpen(false);
              router.back();
            }}
          />
        </View>
      </Sheet>

      {/* Discard Workout Sheet (WORKOUT_UX.md §2) */}
      <Sheet
        visible={discardSheetOpen}
        onClose={() => setDiscardSheetOpen(false)}
        title={t('workout.discardConfirmTitle')}
      >
        <View style={{ gap: spacing.lg, paddingVertical: spacing.md }}>
          <Text style={[type.secondary, { color: colors.inkMutedText }]}>
            {t('workout.discardConfirmBody')}
          </Text>
          <SecondaryButton
            label={t('common.cancel')}
            onPress={() => setDiscardSheetOpen(false)}
          />
          <PrimaryButton
            label={t('workout.discard')}
            style={{ backgroundColor: colors.danger }}
            onPress={() => {
              setDiscardSheetOpen(false);
              void discardWorkout().then(() => router.back());
            }}
          />
        </View>
      </Sheet>

      {/* Finish Incomplete Sets Confirmation Sheet (WORKOUT_UX.md §9.1) */}
      <Sheet
        visible={finishConfirmOpen}
        onClose={() => setFinishConfirmOpen(false)}
        title={t('workout.finishConfirmTitle', { done: totalCompletedSets, total: totalSets })}
      >
        <View style={{ gap: spacing.lg, paddingVertical: spacing.md }}>
          <Text style={[type.secondary, { color: colors.inkMutedText }]}>
            {t('workout.finishConfirmBody')}
          </Text>
          <PrimaryButton
            label={t('workout.finishNow')}
            onPress={() => void commitFinish()}
          />
          <SecondaryButton
            label={t('workout.keepLogging')}
            onPress={() => setFinishConfirmOpen(false)}
          />
        </View>
      </Sheet>

      {/* Exercise Picker Modal */}
      <ExercisePicker
        visible={pickerOpen}
        onClose={() => {
          setPickerOpen(false);
          setReplaceTargetExerciseId(null);
        }}
        onSelect={(ex) => {
          if (replaceTargetExerciseId) {
            void replaceExercise(replaceTargetExerciseId, {
              id: ex.id,
              name: ex.name,
              primaryMuscle: ex.primaryMuscle,
              equipment: ex.equipment,
            });
            setReplaceTargetExerciseId(null);
          } else {
            void addExercise({
              id: ex.id,
              name: ex.name,
              primaryMuscle: ex.primaryMuscle,
              equipment: ex.equipment,
            });
          }
        }}
      />
    </View>
  );
}

/* --------------------------- Exercise Block --------------------------- */

function ExerciseBlock({
  workoutId,
  exercise,
  isCompact,
  onOpenHistory,
  onOpenMenu,
  onAddSet,
  onUpdateSet,
  onSetOptions,
  onOpenRir,
  onAutoRest,
}: {
  workoutId: string;
  exercise: ActiveExercise;
  isCompact: boolean;
  onOpenHistory: () => void;
  onOpenMenu: () => void;
  onAddSet: () => void;
  onUpdateSet: (setId: string, patch: Partial<ActiveSet>) => void;
  onSetOptions: (set: ActiveSet) => void;
  onOpenRir: (set: ActiveSet) => void;
  onAutoRest: () => void;
}) {
  const { colors, spacing, type, touchTarget, radius } = useTokens();
  const { data: previousWorkout } = usePreviousSession(exercise.exerciseId, workoutId);

  // Extract previous working sets
  const previousWorkingSets = useMemo(() => {
    if (!previousWorkout) return [];
    const prevEx = previousWorkout.exercises.find((e) => e.exerciseId === exercise.exerciseId);
    return (prevEx?.sets ?? []).filter((s) => s.setType === 'working' && s.completed);
  }, [previousWorkout, exercise.exerciseId]);

  return (
    <Animated.View entering={FadeIn.duration(180)} layout={LinearTransition}>
      <Card>
        {/* Title row */}
        <View style={styles.exerciseTitleRow}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`${exercise.name} history`}
            onPress={onOpenHistory}
            style={{ flex: 1 }}
          >
            <Text style={[type.cardLabel, { color: colors.ink, fontSize: 17 }]}>
              {exercise.name}
            </Text>
            {(exercise.primaryMuscle || exercise.equipment) && (
              <Text style={[type.secondary, { color: colors.inkMutedText, marginTop: 2 }]}>
                {[exercise.primaryMuscle, exercise.equipment].filter(Boolean).join(' · ')}
              </Text>
            )}
          </Pressable>

          <CircleButton
            variant="default"
            icon={<MoreHorizontal size={18} color={colors.ink} />}
            accessibilityLabel={`Actions for ${exercise.name}`}
            onPress={onOpenMenu}
          />
        </View>

        {/* Column Headers (WORKOUT_UX.md §3.3 & §4.1) */}
        {isCompact ? (
          <View style={[styles.columnHeadersCompact, { borderBottomColor: colors.hairline }]}>
            <Text style={[styles.compactColHeader, { width: 44, color: colors.inkMutedText }]}>SET</Text>
            <Text style={[styles.compactColHeader, { flex: 1, minWidth: 48, color: colors.inkMutedText }]}>PREV</Text>
            <Text style={[styles.compactColHeader, { flex: 1, minWidth: 52, color: colors.inkMutedText }]}>KG</Text>
            <Text style={[styles.compactColHeader, { flex: 1, minWidth: 48, color: colors.inkMutedText }]}>REPS</Text>
            <Text style={[styles.compactColHeader, { width: 46, textAlign: 'center', color: colors.inkMutedText }]}>RIR</Text>
            <Text style={[styles.compactColHeader, { width: 44, textAlign: 'center', color: colors.inkMutedText }]}>✓</Text>
          </View>
        ) : null}

        {/* Set Rows */}
        <View style={{ gap: spacing.xs, marginTop: spacing.xs }}>
          {exercise.sets.map((set, index) => {
            const prevSet = set.setType === 'working' ? previousWorkingSets[index] : null;
            const prevLabel = prevSet ? `${prevSet.weight} × ${prevSet.reps}` : '–';

            return (
              <SetRow
                key={set.id}
                set={set}
                index={index}
                prevLabel={prevLabel}
                prevSet={prevSet}
                isCompact={isCompact}
                onUpdate={(patch) => onUpdateSet(set.id, patch)}
                onSetOptions={() => onSetOptions(set)}
                onOpenRir={() => onOpenRir(set)}
                onAutoRest={onAutoRest}
              />
            );
          })}
        </View>

        {/* Add Set Button (WORKOUT_UX.md §3.3) */}
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`Add set to ${exercise.name}`}
          onPress={onAddSet}
          style={[styles.addSetBtn, { minHeight: touchTarget.min, borderRadius: radius.cardSm }]}
        >
          <Plus size={16} color={colors.inkMutedText} />
          <Text style={[type.secondary, { color: colors.inkMutedText, fontWeight: '600' }]}>
            {t('workout.addSet')}
          </Text>
        </Pressable>
      </Card>
    </Animated.View>
  );
}

/* --------------------------- Set Row --------------------------- */

function SetRow({
  set,
  index,
  prevLabel,
  prevSet,
  isCompact,
  onUpdate,
  onSetOptions,
  onOpenRir,
  onAutoRest,
}: {
  set: ActiveSet;
  index: number;
  prevLabel: string;
  prevSet: { weight: number; reps: number } | null | undefined;
  isCompact: boolean;
  onUpdate: (patch: Partial<ActiveSet>) => void;
  onSetOptions: () => void;
  onOpenRir: () => void;
  onAutoRest: () => void;
}) {
  const { colors, radius, type } = useTokens();

  const [weightStr, setWeightStr] = useState(set.weight > 0 ? set.weight.toString() : '');
  const [repsStr, setRepsStr] = useState(set.reps > 0 ? set.reps.toString() : '');

  const copyPrevious = () => {
    if (prevSet) {
      selectionTick();
      setWeightStr(prevSet.weight.toString());
      setRepsStr(prevSet.reps.toString());
      onUpdate({ weight: prevSet.weight, reps: prevSet.reps });
    }
  };

  const toggleDone = () => {
    const nextCompleted = !set.completed;
    selectionTick();
    const parsedW = parseFloat(weightStr) || 0;
    const parsedR = parseInt(repsStr, 10) || 0;
    onUpdate({ completed: nextCompleted, weight: parsedW, reps: parsedR });
    if (nextCompleted) {
      onAutoRest();
    }
  };

  const rirLabel = set.rirUnknown
    ? '?'
    : set.rir != null
      ? set.rir === 5
        ? '5+'
        : set.rir.toString()
      : '–';

  if (isCompact) {
    return (
      <View style={[styles.compactRow, set.completed && { backgroundColor: colors.surfaceMuted, borderRadius: radius.cardSm }]}>
        {/* Set label */}
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`Set ${index + 1} options`}
          onPress={onSetOptions}
          style={styles.setNumberBtn}
        >
          <Text style={[type.body, { color: colors.inkMutedText, fontWeight: '700' }]}>
            {set.setType === 'warmup' ? 'W' : index + 1}
          </Text>
        </Pressable>

        {/* Previous Session Value (tap to copy) */}
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`Copy previous ${prevLabel}`}
          onPress={copyPrevious}
          style={styles.prevBtn}
        >
          <Text numberOfLines={1} style={[type.secondary, { color: colors.inkMutedText, fontVariant: ['tabular-nums'] }]}>
            {prevLabel}
          </Text>
        </Pressable>

        {/* Weight input */}
        <TextInput
          accessibilityLabel={`Set ${index + 1} weight`}
          keyboardType="decimal-pad"
          selectTextOnFocus
          value={weightStr}
          placeholder={prevSet ? prevSet.weight.toString() : '0'}
          placeholderTextColor={colors.inkMutedText}
          onChangeText={(val) => {
            setWeightStr(val);
            const num = parseFloat(val);
            if (!isNaN(num)) onUpdate({ weight: num });
          }}
          style={[styles.inputCell, { backgroundColor: colors.bg, borderColor: colors.hairline, color: colors.ink, borderRadius: radius.cardSm }]}
        />

        {/* Reps input */}
        <TextInput
          accessibilityLabel={`Set ${index + 1} reps`}
          keyboardType="number-pad"
          selectTextOnFocus
          value={repsStr}
          placeholder={prevSet ? prevSet.reps.toString() : '0'}
          placeholderTextColor={colors.inkMutedText}
          onChangeText={(val) => {
            setRepsStr(val);
            const num = parseInt(val, 10);
            if (!isNaN(num)) onUpdate({ reps: num });
          }}
          style={[styles.inputCell, { backgroundColor: colors.bg, borderColor: colors.hairline, color: colors.ink, borderRadius: radius.cardSm }]}
        />

        {/* RIR Chip */}
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`Set ${index + 1} RIR`}
          onPress={onOpenRir}
          style={[styles.rirCellBtn, { backgroundColor: set.rir != null || set.rirUnknown ? colors.accentSoft : colors.bg, borderColor: colors.hairline, borderRadius: radius.cardSm }]}
        >
          <Text style={[type.secondary, { color: set.rir != null || set.rirUnknown ? colors.accentText : colors.inkMutedText, fontWeight: '700' }]}>
            {rirLabel}
          </Text>
        </Pressable>

        {/* Done Toggle */}
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`Complete set ${index + 1}`}
          accessibilityState={{ checked: set.completed }}
          onPress={toggleDone}
          style={[
            styles.doneBtn,
            {
              backgroundColor: set.completed ? colors.accent : colors.surfaceMuted,
              borderColor: set.completed ? colors.accent : colors.hairline,
              borderRadius: radius.cardSm,
            },
          ]}
        >
          <Check size={18} color={set.completed ? '#FFFFFF' : colors.inkMutedText} strokeWidth={2.5} />
        </Pressable>
      </View>
    );
  }

  // Stacked Layout Fallback (WORKOUT_UX.md §4.2)
  return (
    <View style={[styles.stackedRow, { backgroundColor: set.completed ? colors.surfaceMuted : colors.bg, borderColor: colors.hairline, borderRadius: radius.cardSm }]}>
      <View style={styles.stackedTopRow}>
        <Pressable onPress={onSetOptions} style={styles.setNumberBtn}>
          <Text style={[type.body, { color: colors.inkMutedText, fontWeight: '700' }]}>
            Set {set.setType === 'warmup' ? 'W' : index + 1}
          </Text>
        </Pressable>

        <Pressable onPress={copyPrevious} style={{ flex: 1 }}>
          <Text style={[type.secondary, { color: colors.inkMutedText }]}>
            Prev: {prevLabel}
          </Text>
        </Pressable>

        <Pressable
          accessibilityRole="button"
          onPress={toggleDone}
          style={[
            styles.doneBtn,
            {
              backgroundColor: set.completed ? colors.accent : colors.surfaceMuted,
              borderColor: set.completed ? colors.accent : colors.hairline,
              borderRadius: radius.cardSm,
            },
          ]}
        >
          <Check size={18} color={set.completed ? '#FFFFFF' : colors.inkMutedText} strokeWidth={2.5} />
        </Pressable>
      </View>

      <View style={styles.stackedBottomRow}>
        <TextInput
          keyboardType="decimal-pad"
          selectTextOnFocus
          value={weightStr}
          placeholder="Weight (kg)"
          placeholderTextColor={colors.inkMutedText}
          onChangeText={(val) => {
            setWeightStr(val);
            const num = parseFloat(val);
            if (!isNaN(num)) onUpdate({ weight: num });
          }}
          style={[styles.inputCell, { flex: 1, backgroundColor: colors.surface, borderColor: colors.hairline, color: colors.ink, borderRadius: radius.cardSm }]}
        />

        <TextInput
          keyboardType="number-pad"
          selectTextOnFocus
          value={repsStr}
          placeholder="Reps"
          placeholderTextColor={colors.inkMutedText}
          onChangeText={(val) => {
            setRepsStr(val);
            const num = parseInt(val, 10);
            if (!isNaN(num)) onUpdate({ reps: num });
          }}
          style={[styles.inputCell, { flex: 1, backgroundColor: colors.surface, borderColor: colors.hairline, color: colors.ink, borderRadius: radius.cardSm }]}
        />

        <Pressable
          onPress={onOpenRir}
          style={[styles.rirCellBtn, { width: 56, backgroundColor: set.rir != null || set.rirUnknown ? colors.accentSoft : colors.surface, borderColor: colors.hairline, borderRadius: radius.cardSm }]}
        >
          <Text style={[type.secondary, { color: set.rir != null || set.rirUnknown ? colors.accentText : colors.inkMutedText, fontWeight: '700' }]}>
            RIR {rirLabel}
          </Text>
        </Pressable>
      </View>
    </View>
  );
}

/* --------------------------- Exercise History Modal --------------------------- */

function ExerciseHistoryModal({
  visible,
  exercise,
  currentWorkoutId,
  onClose,
}: {
  visible: boolean;
  exercise: { id: string; name: string } | null;
  currentWorkoutId: string;
  onClose: () => void;
}) {
  const { colors, spacing, type, radius } = useTokens();
  const { data: history, isLoading } = useExerciseHistory(
    exercise?.id ?? null,
    5,
    currentWorkoutId,
  );

  return (
    <Sheet
      visible={visible}
      onClose={onClose}
      title={exercise ? `${exercise.name} ${t('workout.exerciseHistoryTitle')}` : ''}
    >
      <View style={{ gap: spacing.lg, paddingVertical: spacing.md }}>
        <Text style={[type.caption, { color: colors.inkMutedText }]}>
          {t('workout.est1rmFormula')}
        </Text>

        {isLoading ? (
          <Text style={[type.body, { color: colors.inkMutedText, textAlign: 'center' }]}>Loading…</Text>
        ) : !history || history.length === 0 ? (
          <EmptyState
            title="No past sessions"
            description={t('workout.noExerciseHistory')}
          />
        ) : (
          history.map((w) => {
            const exData = w.exercises.find((e) => e.exerciseId === exercise?.id);
            if (!exData) return null;

            // Find best set in this session
            const workingSets = exData.sets.filter((s) => s.setType === 'working' && s.completed);
            const best = workingSets.reduce<ActiveSet | null>((top, s) => {
              if (!top) return s as ActiveSet;
              if (s.weight > top.weight) return s as ActiveSet;
              if (s.weight === top.weight && s.reps > top.reps) return s as ActiveSet;
              return top;
            }, null);

            const est1RM = best ? Math.round(best.weight * (1 + best.reps / 30)) : null;

            return (
              <View
                key={w.id}
                style={[styles.historySessionCard, { backgroundColor: colors.surfaceMuted, borderRadius: radius.cardSm }]}
              >
                <View style={styles.historySessionHeader}>
                  <Text style={[type.cardLabel, { color: colors.ink }]}>
                    {new Date(w.startedAt).toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' })}
                  </Text>
                  {est1RM && (
                    <Text style={[type.secondary, { color: colors.accentText, fontWeight: '700' }]}>
                      Est. 1RM: {est1RM} kg
                    </Text>
                  )}
                </View>

                <View style={{ gap: 4, marginTop: 6 }}>
                  {exData.sets.map((s) => (
                    <Text key={s.id} style={[type.secondary, { color: colors.ink, fontVariant: ['tabular-nums'] }]}>
                      Set {s.position + 1}: {s.weight} kg × {s.reps} reps {s.rir != null ? `· RIR ${s.rir}` : ''}
                    </Text>
                  ))}
                </View>
              </View>
            );
          })
        )}
      </View>
    </Sheet>
  );
}

/* --------------------------- Styles --------------------------- */

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  safeArea: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderBottomWidth: 1,
  },
  headerTitleContainer: {
    flex: 1,
    alignItems: 'center',
    paddingHorizontal: 8,
  },
  workoutNoteBanner: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderBottomWidth: 1,
  },
  statsCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderWidth: 1,
  },
  statCol: {
    flex: 1,
    alignItems: 'center',
    gap: 2,
  },
  statDivider: {
    width: 1,
    height: 36,
  },
  exerciseTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  columnHeadersCompact: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
    borderBottomWidth: 1,
    marginBottom: 6,
  },
  compactColHeader: {
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.8,
  },
  compactRow: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 52,
    gap: 6,
  },
  setNumberBtn: {
    width: 44,
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
  },
  prevBtn: {
    flex: 1,
    minWidth: 48,
    height: 48,
    justifyContent: 'center',
  },
  inputCell: {
    flex: 1,
    minWidth: 48,
    height: 44,
    borderWidth: 1,
    textAlign: 'center',
    fontSize: 16,
    fontWeight: '600',
    fontVariant: ['tabular-nums'],
  },
  rirCellBtn: {
    width: 46,
    height: 44,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  doneBtn: {
    width: 44,
    height: 44,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stackedRow: {
    padding: 10,
    borderWidth: 1,
    gap: 8,
  },
  stackedTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  stackedBottomRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  addSetBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    marginTop: 10,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: '#D4D4D4',
  },
  bottomBar: {
    paddingHorizontal: 16,
    paddingTop: 12,
    borderTopWidth: 1,
  },
  idleBottomRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  timerPanel: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  timerControls: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  timerActionBtn: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.6)',
  },
  rirButtonsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 6,
  },
  rirBtn: {
    flex: 1,
    height: 52,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  rirUnknownBtn: {
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
  },
  setTypeToggleRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 6,
  },
  setTypeBtn: {
    flex: 1,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  deleteSetRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 8,
  },
  sheetActionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 8,
  },
  durationChipsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  durationChip: {
    width: '30%',
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 12,
    borderWidth: 1,
  },
  customDurationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  customInput: {
    width: 60,
    height: 44,
    borderWidth: 1,
    borderRadius: 10,
    textAlign: 'center',
    fontSize: 16,
  },
  undoSnackbar: {
    position: 'absolute',
    bottom: 96,
    left: 20,
    right: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
  },
  historySessionCard: {
    padding: 12,
  },
  historySessionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5E5',
    paddingBottom: 6,
  },
});
