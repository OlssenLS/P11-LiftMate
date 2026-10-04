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
  const { colors, spacing, fontSize } = useTokens();
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
            subtitle={`${t('workout.totalVolume')}: ${liveVolume}`}
          />

          <RestTimerBar timer={timer} />

          {workout.exercises.length === 0 ? (
            <Card>
              <Text style={{ color: colors.inkMuted, fontSize: fontSize.body }}>
                {t('workout.emptyExercises')}
              </Text>
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

          <Button
            label={t('workout.addExercise')}
            variant="secondary"
            onPress={() => {
              pressLight();
              setPickerOpen(true);
            }}
          />
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
              borderTopColor: colors.inkMuted,
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
          <Text style={{ color: colors.ink, fontSize: fontSize.title, fontWeight: fontWeight.bold }}>
            {exercise.name}
          </Text>
          <Pressable accessibilityRole="button" onPress={onRemoveExercise} hitSlop={8}>
            <Text style={{ color: colors.danger, fontSize: fontSize.label, fontWeight: fontWeight.semibold }}>
              ✕
            </Text>
          </Pressable>
        </View>

        <View style={{ gap: spacing.sm, marginTop: spacing.md }}>
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
    label: string,
  ) => (
    <View style={{ flex: 1, gap: 2 }}>
      <Text style={{ color: colors.inkMuted, fontSize: fontSize.label }}>{label}</Text>
      <TextInput
        value={value ? String(value) : ''}
        onChangeText={(txt) => onChange(Number(txt.replace(/[^0-9.]/g, '')) || 0)}
        keyboardType="decimal-pad"
        placeholder="0"
        placeholderTextColor={colors.inkMuted}
        style={{
          borderRadius: radius.cardSm,
          borderWidth: 1.5,
          borderColor: colors.inkMuted,
          color: colors.ink,
          paddingHorizontal: spacing.md,
          paddingVertical: spacing.sm,
          fontSize: fontSize.body,
          fontWeight: fontWeight.semibold,
        }}
      />
    </View>
  );

  return (
    <View style={[styles.setRow, { gap: spacing.sm }]}>
      {/* set_type toggle */}
      <Pressable
        accessibilityRole="button"
        accessibilityState={{ selected: isWorking }}
        onPress={() => {
          selectionTick();
          onUpdate({ setType: isWorking ? 'warmup' : 'working' });
        }}
        style={{
          width: 40,
          height: 40,
          borderRadius: radius.cardSm,
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: isWorking ? colors.ink : colors.surface,
          borderWidth: 1.5,
          borderColor: isWorking ? colors.ink : colors.inkMuted,
        }}
      >
        <Text style={{ color: isWorking ? colors.surface : colors.inkMuted, fontSize: fontSize.label, fontWeight: fontWeight.bold }}>
          {isWorking ? index + 1 : 'W'}
        </Text>
      </Pressable>

      {numInput(set.weight, (n) => onUpdate({ weight: n }), t('workout.weight'))}
      {numInput(set.reps, (n) => onUpdate({ reps: n }), t('workout.reps'))}

      {/* complete toggle */}
      <Pressable
        accessibilityRole="button"
        accessibilityState={{ selected: set.completed }}
        onPress={() => {
          selectionTick();
          onUpdate({ completed: !set.completed });
        }}
        style={{
          width: 40,
          height: 40,
          borderRadius: radius.cardSm,
          alignItems: 'center',
          justifyContent: 'center',
          alignSelf: 'flex-end',
          backgroundColor: set.completed ? colors.success : colors.surface,
          borderWidth: 1.5,
          borderColor: set.completed ? colors.success : colors.inkMuted,
        }}
      >
        <Text style={{ color: set.completed ? colors.surface : colors.inkMuted, fontSize: fontSize.body, fontWeight: fontWeight.bold }}>
          ✓
        </Text>
      </Pressable>

      <Pressable accessibilityRole="button" onPress={onRemove} hitSlop={8} style={{ alignSelf: 'flex-end', height: 40, justifyContent: 'center' }}>
        <Text style={{ color: colors.danger, fontSize: fontSize.body }}>✕</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  safeArea: { flex: 1 },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  cardActions: { flexDirection: 'row' },
  setRow: { flexDirection: 'row', alignItems: 'flex-end' },
  footer: { flexDirection: 'row', borderTopWidth: StyleSheet.hairlineWidth },
  flexBtn: { flex: 1 },
});
