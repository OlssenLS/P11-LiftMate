import React, { useMemo, useState } from 'react';
import { useRouter } from 'expo-router';
import { ActivityIndicator, Alert, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Clock, Dumbbell, Search, Sparkles } from 'lucide-react-native';
import type { Workout } from '@liftmate/shared';

import {
  CircleButton,
  EmptyState,
  EquipmentIcon,
  InsightCard,
  LargeTitleHeader,
  ListGroup,
  ListRowCard,
  OfflineBanner,
  PrimaryButton,
  SectionHeader,
} from '@/components/ui';
import { USE_FIXTURES } from '@/config/env';
import { TRAIN_FIXTURES } from '@/dev/fixtures';
import { ExercisePicker } from '@/features/workout/exercise-picker';
import { useWorkoutHistory } from '@/features/workout/use-workout-queries';
import { useCurrentProgram, useStartProgramDay, AiPlannerModal } from '@/features/program';
import { useActiveWorkoutStore } from '@/features/workout/active-workout-store';
import { useAuthStore } from '@/stores/auth-store';
import { useTokens } from '@/hooks/use-tokens';
import { useTabScrollPadding } from '@/hooks/use-tab-scroll-padding';
import { t } from '@/i18n';
import { pressLight } from '@/lib/haptics';
import { newId } from '@/lib/uuid';

export default function TrainScreen() {
  const { colors, radius, layout, type, icons } = useTokens();
  const bottomScrollPadding = useTabScrollPadding();
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [plannerModalOpen, setPlannerModalOpen] = useState(false);

  const { data: historyWorkouts, isLoading: isHistoryLoading } = useWorkoutHistory('completed');
  const { data: currentProgram } = useCurrentProgram();
  const { mutateAsync: startProgramDay, isPending: isStartingDay } = useStartProgramDay();
  const activeWorkout = useActiveWorkoutStore((s) => s.workout);
  const startFromWorkout = useActiveWorkoutStore((s) => s.startFromWorkout);
  const startWorkout = useActiveWorkoutStore((s) => s.startWorkout);
  const discardWorkout = useActiveWorkoutStore((s) => s.discardWorkout);

  const programDays = useMemo(() => {
    if (!currentProgram?.programExercises || currentProgram.programExercises.length === 0) return [];
    const dayMap = new Map<number, { day: number; dayName: string; exercises: typeof currentProgram.programExercises }>();
    for (const pe of currentProgram.programExercises) {
      const existing = dayMap.get(pe.day);
      if (existing) {
        existing.exercises.push(pe);
      } else {
        dayMap.set(pe.day, {
          day: pe.day,
          dayName: pe.dayName || `Day ${pe.day}`,
          exercises: [pe],
        });
      }
    }
    return Array.from(dayMap.values()).sort((a, b) => a.day - b.day);
  }, [currentProgram]);

  const todayDay = useMemo(() => {
    if (programDays.length === 0) return null;
    const completedCount = historyWorkouts?.length ?? 0;
    const nextIdx = completedCount % programDays.length;
    return programDays[nextIdx] || programDays[0];
  }, [programDays, historyWorkouts]);

  const startProgramDaySession = async (dayNumber: number) => {
    const dayExercises = currentProgram?.programExercises?.filter((pe) => pe.day === dayNumber) ?? [];
    const dayName = dayExercises[0]?.dayName ?? `Day ${dayNumber}`;
    const programName = currentProgram?.name ?? 'Program';

    if (currentProgram?.id) {
      try {
        const workout = await startProgramDay({ programId: currentProgram.id, day: dayNumber });
        if (workout && workout.exercises && workout.exercises.length > 0) {
          await startFromWorkout(workout);
          router.push('/workout/active');
          return;
        }
      } catch {
        // Fallback to local program schedule if API is offline or returns empty
      }
    }

    // Build the full workout session locally from currentProgram.programExercises
    if (dayExercises.length > 0) {
      const workoutId = newId();
      const localWorkout: Workout = {
        id: workoutId,
        userId: user?.id ?? '',
        name: `${programName} - ${dayName}`,
        notes: null,
        note: null,
        status: 'in_progress',
        programId: currentProgram?.id ?? null,
        startedAt: new Date(),
        completedAt: null,
        createdAt: new Date(),
        updatedAt: new Date(),
        deletedAt: null,
        exercises: dayExercises.map((pe, exIdx) => {
          const workoutExerciseId = newId();
          return {
            id: workoutExerciseId,
            workoutId,
            exerciseId: pe.exerciseId,
            position: exIdx + 1,
            createdAt: new Date(),
            updatedAt: new Date(),
            deletedAt: null,
            exercise: pe.exercise,
            sets: Array.from({ length: pe.sets || 3 }, (_, sIdx) => ({
              id: newId(),
              workoutExerciseId,
              position: sIdx + 1,
              setType: 'working' as const,
              weight: 0,
              weightUnit: 'kg' as const,
              reps: pe.repMin || 10,
              rir: pe.targetRir ?? null,
              rirUnknown: pe.targetRir === null || pe.targetRir === undefined,
              rpe: null,
              restTime: pe.restSeconds ?? null,
              notes: null,
              completed: false,
              createdAt: new Date(),
              updatedAt: new Date(),
              deletedAt: null,
            })),
          };
        }),
      };
      await startFromWorkout(localWorkout);
      router.push('/workout/active');
      return;
    }

    await startWorkout(`${programName} - Day ${dayNumber}`);
    router.push('/workout/active');
  };

  const handleStartDay = async (dayNumber: number) => {
    pressLight();

    // If an active session exists in progress
    if (activeWorkout && activeWorkout.status === 'in_progress') {
      // If it has NO exercises, it was just an empty draft. Overwrite it directly!
      if (!activeWorkout.exercises || activeWorkout.exercises.length === 0) {
        await startProgramDaySession(dayNumber);
        return;
      }

      // If it is ALREADY this exact program day, resume it directly
      const dayExercises = currentProgram?.programExercises?.filter((pe) => pe.day === dayNumber) ?? [];
      const dayName = dayExercises[0]?.dayName ?? `Day ${dayNumber}`;
      const isSameDay =
        activeWorkout.name?.includes(dayName) ||
        activeWorkout.name?.includes(`Day ${dayNumber}`);
      if (isSameDay) {
        router.push('/workout/active');
        return;
      }

      // Ongoing session from another day: prompt user
      Alert.alert(
        'Workout in progress',
        `You have an ongoing workout (${activeWorkout.name || 'Current Session'}). What would you like to do?`,
        [
          {
            text: 'Resume Current',
            onPress: () => router.push('/workout/active'),
          },
          {
            text: `Start ${dayName}`,
            style: 'destructive',
            onPress: async () => {
              await discardWorkout();
              await startProgramDaySession(dayNumber);
            },
          },
          { text: 'Cancel', style: 'cancel' },
        ],
      );
      return;
    }

    await startProgramDaySession(dayNumber);
  };

  const groupedHistory = useMemo(() => {
    if (!historyWorkouts || historyWorkouts.length === 0) return [];
    const groups: { dateHeading: string; workouts: typeof historyWorkouts }[] = [];
    for (const w of historyWorkouts) {
      const heading = new Date(w.startedAt).toLocaleDateString(undefined, {
        month: 'long',
        day: 'numeric',
      });
      const existing = groups.find((g) => g.dateHeading === heading);
      if (existing) {
        existing.workouts.push(w);
      } else {
        groups.push({ dateHeading: heading, workouts: [w] });
      }
    }
    return groups;
  }, [historyWorkouts]);

  return (
    <View style={[styles.container, { backgroundColor: colors.bg }]}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[
          styles.scrollContent,
          {
            paddingBottom: bottomScrollPadding,
          },
        ]}
      >
        {/* Large Title Header + Exercise Search Action (DESIGN.md §4 & §7.5) */}
        <LargeTitleHeader
          title="Train"
          trailing={
            <CircleButton
              variant="default"
              icon={
                <Search
                  size={20}
                  color={colors.ink}
                  strokeWidth={icons.strokeWidth}
                />
              }
              accessibilityLabel="Search exercise database"
              onPress={() => {
                pressLight();
                setPickerOpen(true);
              }}
            />
          }
        />

        <OfflineBanner />

        {/* Hero Card for Next Workout / Quick Start (DESIGN.md §7.5) */}
        <SectionHeader title="Today's Session" />
        <View style={styles.cardWrapper}>
          <View
            style={[
              styles.heroCard,
              {
                backgroundColor: colors.ink,
                borderRadius: radius.xl,
                padding: layout.cardPaddingHero,
              },
            ]}
          >
            {USE_FIXTURES ? (
              <>
                <View style={styles.heroHeader}>
                  <Text
                    style={[
                      type.eyebrow,
                      { color: 'rgba(255, 255, 255, 0.70)', letterSpacing: 0.6 },
                    ]}
                  >
                    {TRAIN_FIXTURES.heroSession.eyebrow}
                  </Text>
                  <Text
                    style={[
                      type.title,
                      { color: '#FFFFFF', marginTop: 4, marginBottom: 4 },
                    ]}
                  >
                    {TRAIN_FIXTURES.heroSession.title}
                  </Text>
                  <Text style={[type.secondary, { color: 'rgba(255, 255, 255, 0.75)' }]}>
                    {TRAIN_FIXTURES.heroSession.subtitle}
                  </Text>
                </View>

                <View style={{ marginTop: 20 }}>
                  <PrimaryButton
                    label={t('home.heroAction')}
                    onPress={() => {
                      pressLight();
                      router.push('/workout/active');
                    }}
                  />
                </View>
              </>
            ) : activeWorkout && activeWorkout.status === 'in_progress' ? (
              <>
                <View style={styles.heroHeader}>
                  <Text
                    style={[
                      type.eyebrow,
                      { color: 'rgba(255, 255, 255, 0.70)', letterSpacing: 0.6 },
                    ]}
                  >
                    IN PROGRESS
                  </Text>
                  <Text
                    style={[
                      type.title,
                      { color: '#FFFFFF', marginTop: 4, marginBottom: 4 },
                    ]}
                  >
                    {activeWorkout.name || 'Active Workout'}
                  </Text>
                  <Text style={[type.secondary, { color: 'rgba(255, 255, 255, 0.75)' }]}>
                    {`${activeWorkout.exercises.length} exercises logged`}
                  </Text>
                </View>

                <View style={{ marginTop: 20 }}>
                  <PrimaryButton
                    label="Resume Workout"
                    onPress={() => {
                      pressLight();
                      router.push('/workout/active');
                    }}
                  />
                </View>
              </>
            ) : todayDay ? (
              <>
                <View style={styles.heroHeader}>
                  <Text
                    style={[
                      type.eyebrow,
                      { color: 'rgba(255, 255, 255, 0.70)', letterSpacing: 0.6 },
                    ]}
                  >
                    {`PROGRAM · DAY ${todayDay.day}`}
                  </Text>
                  <Text
                    style={[
                      type.title,
                      { color: '#FFFFFF', marginTop: 4, marginBottom: 4 },
                    ]}
                  >
                    {todayDay.dayName}
                  </Text>
                  <Text style={[type.secondary, { color: 'rgba(255, 255, 255, 0.75)' }]}>
                    {`${todayDay.exercises.length} exercises · ~${currentProgram?.duration === '30_45' ? '40' : '50'} min`}
                  </Text>
                </View>

                <View style={{ marginTop: 20 }}>
                  <PrimaryButton
                    label={isStartingDay ? 'Starting...' : 'Start Workout'}
                    onPress={() => handleStartDay(todayDay.day)}
                  />
                </View>
              </>
            ) : (
              <>
                <View style={styles.heroHeader}>
                  <Text
                    style={[
                      type.eyebrow,
                      { color: 'rgba(255, 255, 255, 0.70)', letterSpacing: 0.6 },
                    ]}
                  >
                    SESSION
                  </Text>
                  <Text
                    style={[
                      type.title,
                      { color: '#FFFFFF', marginTop: 4, marginBottom: 4 },
                    ]}
                  >
                    No workout scheduled
                  </Text>
                  <Text style={[type.secondary, { color: 'rgba(255, 255, 255, 0.75)' }]}>
                    Start a custom session or search the exercise database below.
                  </Text>
                </View>

                <View style={{ marginTop: 20 }}>
                  <PrimaryButton
                    label="Create Workout"
                    onPress={() => {
                      pressLight();
                      router.push('/workout/active');
                    }}
                  />
                </View>
              </>
            )}
          </View>
        </View>

        {/* Section: My Program (DESIGN.md §7.5) */}
        <SectionHeader title="My Program" />
        <View style={styles.cardWrapper}>
          {USE_FIXTURES ? (
            <ListGroup>
              {TRAIN_FIXTURES.myProgram.map((item) => (
                <ListRowCard
                  key={item.id}
                  label={item.label}
                  subtitle={item.subtitle}
                  icon={
                    <Dumbbell
                      size={icons.cardLabelSize}
                      color={colors.accentText}
                      strokeWidth={icons.strokeWidth}
                    />
                  }
                  onPress={() => {
                    pressLight();
                    router.push('/workout/active');
                  }}
                />
              ))}
            </ListGroup>
          ) : programDays.length > 0 ? (
            <ListGroup>
              {programDays.map((d) => (
                <ListRowCard
                  key={`day-${d.day}`}
                  label={`Day ${d.day}: ${d.dayName}`}
                  subtitle={`${d.exercises.length} exercises · ${d.exercises.slice(0, 3).map((e) => e.exercise?.name || 'Exercise').join(', ')}${d.exercises.length > 3 ? '...' : ''}`}
                  icon={
                    d.exercises[0]?.exercise?.equipment ? (
                      <EquipmentIcon
                        equipment={d.exercises[0].exercise.equipment}
                        size={icons.cardLabelSize}
                        color={colors.accentText}
                        strokeWidth={icons.strokeWidth}
                      />
                    ) : (
                      <Dumbbell
                        size={icons.cardLabelSize}
                        color={colors.accentText}
                        strokeWidth={icons.strokeWidth}
                      />
                    )
                  }
                  onPress={() => handleStartDay(d.day)}
                />
              ))}
            </ListGroup>
          ) : (
            <EmptyState
              title="No Program Assigned"
              description="Complete onboarding to receive an evidence-based training split matched to your goals and equipment."
              icon={
                <Dumbbell
                  size={40}
                  color={colors.inkMuted}
                  strokeWidth={icons.strokeWidth}
                />
              }
              actionText="Generate with AI"
              onAction={() => {
                pressLight();
                setPlannerModalOpen(true);
              }}
            />
          )}
        </View>

        {/* Section: Planner (DESIGN.md §7.5, Spec §33–§38) */}
        <SectionHeader title="Planner" />
        <View style={styles.cardWrapper}>
          <InsightCard
            title="AI Workout Planner"
            description="Design an evidence-based progressive overload routine tailored to your equipment, frequency, and goals."
            icon={
              <Sparkles
                size={24}
                color={colors.accent}
                strokeWidth={icons.strokeWidth}
              />
            }
            actionText="Generate Routine with AI"
            onAction={() => {
              pressLight();
              setPlannerModalOpen(true);
            }}
          />
        </View>

        {/* Section: History (DESIGN.md §7.5 & WORKOUT_UX.md §10.1) */}
        <SectionHeader title="History" />
        <View style={styles.cardWrapper}>
          {USE_FIXTURES ? (
            <ListGroup>
              {TRAIN_FIXTURES.history.map((item) => (
                <ListRowCard
                  key={item.id}
                  label={item.label}
                  subtitle={item.subtitle}
                  value={item.value}
                  icon={
                    <Clock
                      size={icons.cardLabelSize}
                      color={colors.ink}
                      strokeWidth={icons.strokeWidth}
                    />
                  }
                  onPress={() => router.push({ pathname: '/metric/[id]', params: { id: 'volume' } })}
                />
              ))}
            </ListGroup>
          ) : isHistoryLoading ? (
            <View style={{ paddingVertical: 24, alignItems: 'center' }}>
              <ActivityIndicator color={colors.accent} />
            </View>
          ) : groupedHistory.length > 0 ? (
            <View style={{ gap: 16 }}>
              {groupedHistory.map((group) => (
                <View key={group.dateHeading} style={{ gap: 8 }}>
                  <Text style={[type.eyebrow, { color: colors.inkMutedText, letterSpacing: 0.8 }]}>
                    {group.dateHeading.toUpperCase()}
                  </Text>
                  <ListGroup>
                    {group.workouts.map((w) => {
                      const durationMins =
                        w.startedAt && w.completedAt
                          ? Math.max(
                              1,
                              Math.round(
                                (new Date(w.completedAt).getTime() - new Date(w.startedAt).getTime()) /
                                  60000
                              )
                            )
                          : null;
                      const exCount = w.exercises?.length ?? 0;
                      const subtitle = durationMins
                        ? `${durationMins} min · ${exCount} ${exCount === 1 ? 'exercise' : 'exercises'}`
                        : `${exCount} ${exCount === 1 ? 'exercise' : 'exercises'}`;

                      return (
                        <ListRowCard
                          key={w.id}
                          label={w.name || 'Workout'}
                          subtitle={subtitle}
                          icon={
                            <Clock
                              size={icons.cardLabelSize}
                              color={colors.accentText}
                              strokeWidth={icons.strokeWidth}
                            />
                          }
                          onPress={() => {
                            pressLight();
                            router.push({ pathname: '/workout/[id]', params: { id: w.id } });
                          }}
                        />
                      );
                    })}
                  </ListGroup>
                </View>
              ))}
            </View>
          ) : (
            <EmptyState
              title={t('workout.noWorkoutsYet')}
              description={t('workout.noWorkoutsDescription')}
              icon={
                <Clock
                  size={40}
                  color={colors.inkMuted}
                  strokeWidth={icons.strokeWidth}
                />
              }
              actionText={t('workout.startWorkoutAction')}
              onAction={() => {
                pressLight();
                router.push('/workout/active');
              }}
            />
          )}
        </View>

        {/* Section: Exercise Library (DESIGN.md §7.5) */}
        <SectionHeader title="Exercise Library" />
        <View style={styles.cardWrapper}>
          <ListRowCard
            label="Browse Exercise Database"
            subtitle="350+ movements with muscle targeting"
            icon={
              <Search
                size={icons.cardLabelSize}
                color={colors.accentText}
                strokeWidth={icons.strokeWidth}
              />
            }
            onPress={() => {
              pressLight();
              setPickerOpen(true);
            }}
          />
        </View>
      </ScrollView>

      <ExercisePicker
        visible={pickerOpen}
        onClose={() => setPickerOpen(false)}
        onSelect={(_ex) => {
          setPickerOpen(false);
          router.push('/workout/active');
        }}
      />

      <AiPlannerModal
        visible={plannerModalOpen}
        onClose={() => setPlannerModalOpen(false)}
        defaultGoal={currentProgram?.goal}
        defaultFrequency={currentProgram?.frequency}
        defaultDuration={currentProgram?.duration as any}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    maxWidth: 600,
    width: '100%',
    alignSelf: 'center',
  },
  cardWrapper: {
    paddingHorizontal: 20,
  },
  heroCard: {
    justifyContent: 'space-between',
  },
  heroHeader: {
    gap: 4,
  },
});
