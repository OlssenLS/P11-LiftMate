import { computeVolume, type MetricSet } from '@liftmate/shared';
import { useRouter } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import Animated, { FadeIn, FadeOut, LinearTransition } from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Button, Card, ScreenHeader } from '@/components/ui';
import {
  useActiveWorkoutStore,
  type ActiveExercise,
  type ActiveSet,
} from '@/features/workout/active-workout-store';
import { ExercisePicker } from '@/features/workout/exercise-picker';
import { RestTimerBar } from '@/features/workout/rest-timer-bar';
import { drainSyncQueue } from '@/features/workout/sync';
import { useRestTimer } from '@/features/workout/use-rest-timer';
import { useTokens } from '@/hooks/use-tokens';
import { t } from '@/i18n';
import { notifySuccess, pressLight, selectionTick } from '@/lib/haptics';

export default function ActiveWorkoutScreen() {
  const { colors, radius, spacing, fontSize, fontWeight } = useTokens();
  const router = useRouter();
  const timer = useRestTimer();

  const workout = useActiveWorkoutStore((s) => s.workout);
  const hydrated = useActiveWorkoutStore((s) => s.hydrated);
  const hydrate = useActiveWorkoutStore((s) => s.hydrate);
  const startWorkout = useActiveWorkoutStore((s) => s.startWorkout);
  const addExercise = useActiveWorkoutStore((s) => s.addExercise);
  const removeExercise = useActiveWorkoutStore((s) => s.removeExercise);
  const addSet = useActiveWorkoutStore((s) => s.addSet);
  const updateSet = useActiveWorkoutStore((s) => s.updateSet);
  const removeSet = useActiveWorkoutStore((s) => s.removeSet);
  const finishWorkout = useActiveWorkoutStore((s) => s.finishWorkout);
  const discardWorkout = useActiveWorkoutStore((s) => s.discardWorkout);

  const [pickerOpen, setPickerOpen] = useState(false);

  // Recover any in-progress session on mount; start a fresh one if none.
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

  // Opportunistically flush the offline queue when the screen opens.
  useEffect(() => {
    void drainSyncQueue();
  }, []);

  const liveVolume = useMemo(() => {
    if (!workout) return 0;
    const sets: MetricSet[] = workout.exercises.flatMap((e) =>
      e.sets.map((s) => ({ setType: s.setType, weight: s.weight, reps: s.reps, completed: s.completed })),
    );
    return computeVolume(sets, { includeIncomplete: false });
  }, [workout]);

  const onFinish = async () => {
    const finished = await finishWorkout();
    if (!finished) return;
    notifySuccess();
    await drainSyncQueue();
    router.replace({ pathname: '/workout/summary', params: { id: finished.id } });
  };

  const onDiscard = () => {
    Alert.alert(t('workout.discardConfirmTitle'), t('workout.discardConfirmBody'), [
      { text: t('common.cancel'), style: 'cancel' },
      {
        text: t('workout.discard'),
        style: 'destructive',
        onPress: () => {
          void (async () => {
            await discardWorkout();
            router.back();
          })();
        },
      },
    ]);
  };

  const completedSetsCount = useMemo(() => {
    if (!workout) return 0;
    return workout.exercises.reduce(
      (sum, ex) => sum + ex.sets.filter((s) => s.completed).length,
      0,
    );
  }, [workout]);

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
        <ScrollView
          contentContainerStyle={{ padding: spacing.xl, gap: spacing.lg }}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <ScreenHeader
            title={t('workout.activeTitle')}
            subtitle="Track sets and volume in real time"
          />

          {/* Volume Hero Card */}
          <View
            style={[
              styles.volumeHero,
              {
                backgroundColor: colors.ink,
                borderRadius: radius.cardLg,
                padding: spacing.lg,
                gap: spacing.sm,
              },
            ]}
          >
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
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
                  color: 'rgba(255, 255, 255, 0.7)',
                  fontSize: fontSize.label,
                  fontWeight: fontWeight.medium,
                }}
              >
                {workout.exercises.length} {workout.exercises.length === 1 ? 'exercise' : 'exercises'} · {completedSetsCount} done
              </Text>
            </View>

            <Text
              style={{
                color: colors.surface,
                fontSize: 34,
                fontWeight: fontWeight.bold,
                letterSpacing: -0.5,
              }}
            >
              {liveVolume.toLocaleString()}{' '}
              <Text style={{ fontSize: fontSize.title, fontWeight: fontWeight.medium, color: colors.inkMuted }}>
                kg
              </Text>
            </Text>
          </View>

          <RestTimerBar timer={timer} />

          {workout.exercises.length === 0 ? (
            <Card>
              <View style={{ gap: spacing.md, alignItems: 'center', paddingVertical: spacing.md }}>
                <Text
                  style={{
                    color: colors.ink,
                    fontSize: fontSize.title,
                    fontWeight: fontWeight.bold,
                    textAlign: 'center',
                  }}
                >
                  Ready to train?
                </Text>
                <Text
                  style={{
                    color: colors.inkMuted,
                    fontSize: fontSize.body,
                    textAlign: 'center',
                    lineHeight: 22,
                  }}
                >
                  {t('workout.emptyExercises')}
                </Text>
                <Button
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
              <ExerciseCard
                key={exercise.id}
                exercise={exercise}
                onAddSet={() => {
                  pressLight();
                  void addSet(exercise.id, 'kg');
                }}
                onRemoveExercise={() => void removeExercise(exercise.id)}
                onUpdateSet={(setId, patch) => void updateSet(exercise.id, setId, patch)}
                onRemoveSet={(setId) => void removeSet(exercise.id, setId)}
                onRest={() => timer.start(120)}
              />
            ))
          )}

          {workout.exercises.length > 0 && (
            <Button
              label={t('workout.addExercise')}
              variant="secondary"
              onPress={() => {
                pressLight();
                setPickerOpen(true);
              }}
            />
          )}
        </ScrollView>

        <View
          style={[
            styles.footer,
            {
              paddingHorizontal: spacing.xl,
              paddingTop: spacing.md,
              paddingBottom: spacing.lg,
              gap: spacing.md,
              backgroundColor: colors.bg,
              borderTopColor: colors.inkMuted + '22',
            },
          ]}
        >
          <Button
            label={t('workout.discard')}
            variant="secondary"
            style={styles.flexBtn}
            onPress={onDiscard}
          />
          <Button label={t('workout.finish')} style={styles.flexBtn} onPress={() => void onFinish()} />
        </View>
      </SafeAreaView>

      <ExercisePicker
        visible={pickerOpen}
        onClose={() => setPickerOpen(false)}
        onSelect={(ex) => void addExercise({ id: ex.id, name: ex.name })}
      />
    </View>
  );
}

/* --------------------------- exercise card --------------------------- */

function ExerciseCard({
  exercise,
  onAddSet,
  onRemoveExercise,
  onUpdateSet,
  onRemoveSet,
  onRest,
}: {
  exercise: ActiveExercise;
  onAddSet: () => void;
  onRemoveExercise: () => void;
  onUpdateSet: (
    setId: string,
    patch: Partial<Pick<ActiveSet, 'weight' | 'reps' | 'rir' | 'setType' | 'completed'>>,
  ) => void;
  onRemoveSet: (setId: string) => void;
  onRest: () => void;
}) {
  const { colors, spacing, fontSize, fontWeight } = useTokens();

  return (
    <Animated.View entering={FadeIn.duration(200)} exiting={FadeOut.duration(120)} layout={LinearTransition}>
      <Card>
        <View style={styles.cardHeader}>
          <Text style={{ color: colors.ink, fontSize: fontSize.title, fontWeight: fontWeight.bold, flex: 1 }}>
            {exercise.name}
          </Text>
          <Pressable
            accessibilityRole="button"
            onPress={onRemoveExercise}
            hitSlop={12}
            style={{ minWidth: 44, minHeight: 44, alignItems: 'center', justifyContent: 'center' }}
          >
            <Text style={{ color: colors.danger, fontSize: fontSize.body, fontWeight: fontWeight.semibold }}>
              ✕
            </Text>
          </Pressable>
        </View>

        {/* Column Headers */}
        <View style={[styles.columnHeaders, { marginTop: spacing.sm, paddingHorizontal: 2 }]}>
          <Text style={[styles.columnHeader, { width: 48, color: colors.inkMuted, fontSize: fontSize.label }]}>
            SET
          </Text>
          <Text style={[styles.columnHeader, { flex: 1, color: colors.inkMuted, fontSize: fontSize.label }]}>
            KG
          </Text>
          <Text style={[styles.columnHeader, { flex: 1, color: colors.inkMuted, fontSize: fontSize.label }]}>
            REPS
          </Text>
          <Text style={[styles.columnHeader, { width: 48, textAlign: 'center', color: colors.inkMuted, fontSize: fontSize.label }]}>
            DONE
          </Text>
          <View style={{ width: 36 }} />
        </View>

        <View style={{ gap: spacing.sm, marginTop: spacing.xs }}>
          {exercise.sets.map((set, index) => (
            <SetRow
              key={set.id}
              index={index}
              set={set}
              onUpdate={(patch) => onUpdateSet(set.id, patch)}
              onRemove={() => onRemoveSet(set.id)}
            />
          ))}
        </View>

        <View style={[styles.cardActions, { marginTop: spacing.md, gap: spacing.sm }]}>
          <Button label={t('workout.addSet')} variant="ghost" style={styles.flexBtn} onPress={onAddSet} />
          <Button label={t('workout.rest')} variant="ghost" style={styles.flexBtn} onPress={onRest} />
        </View>
      </Card>
    </Animated.View>
  );
}

/* ------------------------------ set row ------------------------------ */

function SetRow({
  index,
  set,
  onUpdate,
  onRemove,
}: {
  index: number;
  set: ActiveSet;
  onUpdate: (
    patch: Partial<Pick<ActiveSet, 'weight' | 'reps' | 'rir' | 'setType' | 'completed'>>,
  ) => void;
  onRemove: () => void;
}) {
  const { colors, radius, spacing, fontSize, fontWeight } = useTokens();
  const isWorking = set.setType === 'working';

  const numInput = (
    value: number,
    onChange: (n: number) => void,
    placeholder: string,
  ) => (
    <View style={{ flex: 1 }}>
      <TextInput
        value={value ? String(value) : ''}
        onChangeText={(txt) => onChange(Number(txt.replace(/[^0-9.]/g, '')) || 0)}
        keyboardType="decimal-pad"
        placeholder={placeholder}
        placeholderTextColor={colors.inkMuted}
        style={{
          borderRadius: radius.cardSm,
          borderWidth: 1.5,
          borderColor: colors.inkMuted + '33',
          backgroundColor: colors.surface,
          color: colors.ink,
          paddingHorizontal: spacing.sm,
          minHeight: 48,
          textAlign: 'center',
          fontSize: fontSize.body,
          fontWeight: fontWeight.bold,
        }}
      />
    </View>
  );

  return (
    <View style={[styles.setRow, { gap: spacing.sm }]}>
      {/* set_type toggle (min 48x48) */}
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`Set ${isWorking ? index + 1 : 'warmup'}, tap to toggle type`}
        accessibilityState={{ selected: isWorking }}
        onPress={() => {
          selectionTick();
          onUpdate({ setType: isWorking ? 'warmup' : 'working' });
        }}
        style={{
          width: 48,
          height: 48,
          borderRadius: radius.cardSm,
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: isWorking ? colors.ink : colors.surface,
          borderWidth: 1.5,
          borderColor: isWorking ? colors.ink : colors.inkMuted + '44',
        }}
      >
        <Text style={{ color: isWorking ? colors.surface : colors.inkMuted, fontSize: fontSize.label, fontWeight: fontWeight.bold }}>
          {isWorking ? index + 1 : 'W'}
        </Text>
      </Pressable>

      {numInput(set.weight, (n) => onUpdate({ weight: n }), '0')}
      {numInput(set.reps, (n) => onUpdate({ reps: n }), '0')}

      {/* complete toggle (min 48x48) */}
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Mark set completed"
        accessibilityState={{ selected: set.completed }}
        onPress={() => {
          selectionTick();
          onUpdate({ completed: !set.completed });
        }}
        style={{
          width: 48,
          height: 48,
          borderRadius: radius.cardSm,
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: set.completed ? colors.success : colors.surface,
          borderWidth: 1.5,
          borderColor: set.completed ? colors.success : colors.inkMuted + '44',
        }}
      >
        <Text style={{ color: set.completed ? colors.surface : colors.inkMuted, fontSize: fontSize.title, fontWeight: fontWeight.bold }}>
          ✓
        </Text>
      </Pressable>

      {/* remove button (min 44x48) */}
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Remove set"
        onPress={onRemove}
        hitSlop={8}
        style={{ width: 36, height: 48, justifyContent: 'center', alignItems: 'center' }}
      >
        <Text style={{ color: colors.danger, fontSize: fontSize.body, fontWeight: fontWeight.semibold }}>✕</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  safeArea: { flex: 1 },
  volumeHero: { width: '100%' },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  cardActions: { flexDirection: 'row' },
  columnHeaders: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  columnHeader: { fontWeight: '700', letterSpacing: 0.8 },
  setRow: { flexDirection: 'row', alignItems: 'center' },
  footer: { flexDirection: 'row', borderTopWidth: StyleSheet.hairlineWidth },
  flexBtn: { flex: 1 },
});
