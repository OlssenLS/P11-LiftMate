import React, { useMemo, useState } from 'react';
import { useRouter } from 'expo-router';
import {
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import type { Workout } from '@liftmate/shared';
import Svg, { Defs, LinearGradient as SvgGradient, Rect, Stop } from 'react-native-svg';
import {
  Calendar,
  Dumbbell,
  Flame,
  Scale,
  Sparkles,
  TrendingUp,
} from 'lucide-react-native';

import {
  InsightCard,
  LargeTitleHeader,
  ListRowCard,
  MetricCard,
  OfflineBanner,
  PrimaryButton,
  SectionHeader,
} from '@/components/ui';
import { useTokens } from '@/hooks/use-tokens';
import { useTabScrollPadding } from '@/hooks/use-tab-scroll-padding';
import { t } from '@/i18n';
import { pressLight } from '@/lib/haptics';
import { newId } from '@/lib/uuid';
import { useAuthStore } from '@/stores/auth-store';

import { USE_FIXTURES } from '@/config/env';
import { HOME_FIXTURES } from '@/dev/fixtures';
import { useCurrentProgram, useStartProgramDay } from '@/features/program/use-program-queries';
import { useWorkoutHistory } from '@/features/workout/use-workout-queries';
import { useActiveWorkoutStore } from '@/features/workout/active-workout-store';
import { useDailyNutritionSummary } from '@/features/nutrition';
import { useProgressSummary } from '@/features/progress';
import { useAnalyticsOverview } from '@/features/coach';
import { useCoachStore } from '@/stores/coach-store';

export default function HomeScreen() {
  const { colors, radius, layout, type, floatingShadow, icons, touchTarget } = useTokens();
  const bottomScrollPadding = useTabScrollPadding();
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const openCoach = useCoachStore((s) => s.openCoach);

  const { data: historyWorkouts } = useWorkoutHistory('completed');
  const { data: currentProgram } = useCurrentProgram();
  const { data: analyticsOverview } = useAnalyticsOverview();
  const { mutateAsync: startProgramDay, isPending: isStartingDay } = useStartProgramDay();
  const activeWorkout = useActiveWorkoutStore((s) => s.workout);
  const startFromWorkout = useActiveWorkoutStore((s) => s.startFromWorkout);
  const startWorkout = useActiveWorkoutStore((s) => s.startWorkout);
  const discardWorkout = useActiveWorkoutStore((s) => s.discardWorkout);

  const todayDateStr = useMemo(() => new Date().toISOString().split('T')[0], []);
  const { data: nutritionSummary } = useDailyNutritionSummary(todayDateStr);
  const { data: progressSummary } = useProgressSummary();

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

  const [insightDismissed, setInsightDismissed] = useState(false);

  const todayEyebrow = useMemo(() => {
    try {
      return new Intl.DateTimeFormat('en-US', {
        weekday: 'long',
        day: 'numeric',
        month: 'short',
      })
        .format(new Date())
        .toUpperCase();
    } catch {
      return 'TODAY';
    }
  }, []);

  const initials = (() => {
    if (!user?.displayName) return 'L';
    const parts = user.displayName.trim().split(/\s+/);
    if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  })();

  return (
    <View style={[styles.container, { backgroundColor: colors.bg }]}>
      {/* Background Header Gradient (DESIGN.md §4 & §7.2) */}
      <Svg
        height={280}
        width="100%"
        style={styles.headerGradient}
        pointerEvents="none"
      >
        <Defs>
          <SvgGradient id="homeHeaderGrad" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor={colors.accentSoft} stopOpacity="1" />
            <Stop offset="1" stopColor={colors.bg} stopOpacity="1" />
          </SvgGradient>
        </Defs>
        <Rect x="0" y="0" width="100%" height={280} fill="url(#homeHeaderGrad)" />
      </Svg>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[
          styles.scrollContent,
          {
            paddingBottom: bottomScrollPadding,
          },
        ]}
      >
        {/* Large Title Header + Avatar (DESIGN.md §4 & §7.2) */}
        <LargeTitleHeader
          eyebrow={todayEyebrow}
          eyebrowColor={colors.accentText}
          eyebrowStyle={{ fontWeight: '700', letterSpacing: 0.8 }}
          title="Today"
          trailing={
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Open Profile & Settings"
              onPress={() => router.push('/(app)/you')}
              hitSlop={Math.max(0, (touchTarget.min - 44) / 2)}
              style={({ pressed }) => [
                styles.avatarHitArea,
                { minWidth: touchTarget.min, minHeight: touchTarget.min },
              ]}
            >
              {({ pressed }) => (
                <View
                  style={[
                    styles.avatarVisual,
                    floatingShadow,
                    {
                      backgroundColor: colors.surface,
                      borderRadius: radius.pill,
                      opacity: pressed ? 0.85 : 1,
                      transform: [{ scale: pressed ? 0.96 : 1 }],
                    },
                  ]}
                >
                  <Text style={[type.cardLabel, { color: colors.ink }]}>
                    {initials}
                  </Text>
                </View>
              )}
            </Pressable>
          }
        />

        <OfflineBanner />

        {/* Section: Next Workout (Spec §12) */}
        <SectionHeader title="Next workout" />

        {/* Signature Dark Hero Card (DESIGN.md §7.2 & §14.2) */}
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
                    {HOME_FIXTURES.nextWorkout.eyebrow}
                  </Text>
                  <Text
                    style={[
                      type.title,
                      { color: '#FFFFFF', marginTop: 4, marginBottom: 4 },
                    ]}
                  >
                    {HOME_FIXTURES.nextWorkout.title}
                  </Text>
                  <Text style={[type.secondary, { color: 'rgba(255, 255, 255, 0.75)' }]}>
                    {HOME_FIXTURES.nextWorkout.subtitle}
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
                    SCHEDULE
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
                    Start a custom session or pick an exercise to train today.
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

        {/* Section: Summary */}
        <SectionHeader title="Summary" />

        <View style={[styles.cardWrapper, { gap: layout.cardGap }]}>
          {/* 1. Calories MetricCard */}
          <MetricCard
            label="Calories"
            icon={
              <Flame
                size={icons.cardLabelSize}
                color={colors.accentText}
                strokeWidth={icons.strokeWidth}
              />
            }
            timestamp="Today"
            value={
              nutritionSummary
                ? Math.round(nutritionSummary.totals.calories).toLocaleString()
                : USE_FIXTURES
                ? HOME_FIXTURES.metrics.calories.value
                : '--'
            }
            unit="kcal"
            sublabel={
              nutritionSummary
                ? `of ${nutritionSummary.targets.calories.toLocaleString()} kcal budget · ${nutritionSummary.remaining.calories.toLocaleString()} kcal left`
                : USE_FIXTURES
                ? HOME_FIXTURES.metrics.calories.sublabel
                : 'No meals logged'
            }
            sparklineData={USE_FIXTURES ? [...HOME_FIXTURES.metrics.calories.sparkline] : undefined}
            onPress={() => router.push({ pathname: '/metric/[id]', params: { id: 'calories' } })}
          />

          {/* 2. Workouts MetricCard */}
          <MetricCard
            label="Workouts"
            icon={
              <Dumbbell
                size={icons.cardLabelSize}
                color={colors.accentText}
                strokeWidth={icons.strokeWidth}
              />
            }
            timestamp="This Week"
            value={
              progressSummary
                ? `${progressSummary.consistency.completedSessions} of ${progressSummary.consistency.plannedSessions}`
                : USE_FIXTURES
                ? HOME_FIXTURES.metrics.workouts.value
                : '--'
            }
            unit="done"
            sublabel={
              progressSummary
                ? `${progressSummary.consistency.consistencyPct}% weekly consistency · ${progressSummary.consistency.streakWeeks}-wk streak`
                : USE_FIXTURES
                ? HOME_FIXTURES.metrics.workouts.sublabel
                : 'No data logged'
            }
            sparklineData={
              progressSummary?.consistency.weeklyBreakdown.map((w) => w.completed) ??
              (USE_FIXTURES ? [...HOME_FIXTURES.metrics.workouts.sparkline] : undefined)
            }
            onPress={() => router.push({ pathname: '/metric/[id]', params: { id: 'workouts' } })}
          />

          {/* 3. Body Weight MetricCard */}
          <MetricCard
            label="Body Weight"
            icon={
              <Scale
                size={icons.cardLabelSize}
                color={colors.accentText}
                strokeWidth={icons.strokeWidth}
              />
            }
            timestamp="Latest"
            value={
              progressSummary?.weight.currentWeightKg
                ? String(progressSummary.weight.currentWeightKg)
                : USE_FIXTURES
                ? HOME_FIXTURES.metrics.weight.value
                : '--'
            }
            unit={user?.weightUnit ?? 'kg'}
            sublabel={
              progressSummary?.weight.changeThisMonthKg !== null && progressSummary?.weight.changeThisMonthKg !== undefined
                ? `${progressSummary.weight.changeThisMonthKg > 0 ? '+' : ''}${progressSummary.weight.changeThisMonthKg} kg this month`
                : USE_FIXTURES
                ? undefined
                : 'No data logged'
            }
            sparklineData={
              progressSummary?.weight.sparkline.length
                ? progressSummary.weight.sparkline
                : USE_FIXTURES
                ? [...HOME_FIXTURES.metrics.weight.sparkline]
                : undefined
            }
            onPress={() => router.push({ pathname: '/metric/[id]', params: { id: 'weight' } })}
          />

          {/* 4. Training Volume MetricCard */}
          <MetricCard
            label="Training Volume"
            icon={
              <TrendingUp
                size={icons.cardLabelSize}
                color={colors.accentText}
                strokeWidth={icons.strokeWidth}
              />
            }
            timestamp="This Week"
            value={
              progressSummary
                ? Math.round(progressSummary.volume.totalVolumeKg).toLocaleString()
                : USE_FIXTURES
                ? HOME_FIXTURES.metrics.volume.value
                : '--'
            }
            unit="kg"
            sublabel={
              progressSummary
                ? progressSummary.volume.byMuscleGroup[0]?.muscleGroup
                  ? `${progressSummary.volume.byMuscleGroup[0].muscleGroup} leading volume`
                  : 'Total lifted this week'
                : USE_FIXTURES
                ? HOME_FIXTURES.metrics.volume.sublabel
                : 'No data logged'
            }
            sparklineData={
              progressSummary?.volume.sparkline.length
                ? progressSummary.volume.sparkline
                : USE_FIXTURES
                ? [...HOME_FIXTURES.metrics.volume.sparkline]
                : undefined
            }
            onPress={() => router.push({ pathname: '/metric/[id]', params: { id: 'volume' } })}
          />

          {/* ListRowCard: Show All Data */}
          <ListRowCard
            label="Show All Data"
            icon={
              <Calendar
                size={icons.defaultSize}
                color={colors.ink}
                strokeWidth={icons.strokeWidth}
              />
            }
            onPress={() => router.push('/(app)/train')}
          />
        </View>

        {/* Section: Insights (DESIGN.md §7.2, Spec §10–§14) */}
        {!insightDismissed ? (
          <>
            <SectionHeader title={analyticsOverview?.primaryInsight ? 'AI Insights' : 'AI Coach'} />
            <View style={styles.cardWrapper}>
              {analyticsOverview?.primaryInsight ? (
                <InsightCard
                  title={`✦ ${analyticsOverview.primaryInsight.title}`}
                  description={analyticsOverview.primaryInsight.observation}
                  icon={
                    <Sparkles
                      size={24}
                      color={colors.accent}
                      strokeWidth={icons.strokeWidth}
                    />
                  }
                  actionText="View Insights"
                  onAction={() => router.push('/(app)/insights')}
                  onDismiss={() => setInsightDismissed(true)}
                />
              ) : (
                <InsightCard
                  title="AI Coach Ready"
                  description="Get personalized feedback on your workout volume, RIR trends, and daily macro targets."
                  icon={
                    <Sparkles
                      size={24}
                      color={colors.accent}
                      strokeWidth={icons.strokeWidth}
                    />
                  }
                  actionText="Ask AI Coach"
                  onAction={() => openCoach()}
                  onDismiss={() => setInsightDismissed(true)}
                />
              )}
            </View>
          </>
        ) : null}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  headerGradient: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
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
  avatarHitArea: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarVisual: {
    width: 44,
    height: 44,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
