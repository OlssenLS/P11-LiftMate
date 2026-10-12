import { useState } from 'react';
import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  ArrowLeft,
  Calendar,
  Clock,
  Sparkles,
  X,
} from 'lucide-react-native';
import type {
  FitnessGoal,
  GeneratedProgramPlan,
  WorkoutDuration,
} from '@liftmate/shared';

import { Card, PrimaryButton, SecondaryButton } from '@/components/ui';
import { useTokens } from '@/hooks/use-tokens';
import { selectionTick, pressLight } from '@/lib/haptics';
import {
  useGenerateProgramPlan,
  useConfirmProgramPlan,
} from '@/features/coach';

interface AiPlannerModalProps {
  visible: boolean;
  onClose: () => void;
  defaultGoal?: FitnessGoal;
  defaultFrequency?: number;
  defaultDuration?: WorkoutDuration;
}

const GOAL_OPTIONS: { key: FitnessGoal; label: string }[] = [
  { key: 'build_muscle', label: 'Build Muscle' },
  { key: 'gain_strength', label: 'Gain Strength' },
  { key: 'lose_fat', label: 'Lose Fat' },
  { key: 'body_recomposition', label: 'Body Recomp' },
  { key: 'general_fitness', label: 'General Fitness' },
];

const FREQUENCY_OPTIONS = [2, 3, 4, 5, 6];

const DURATION_OPTIONS: { key: WorkoutDuration; label: string }[] = [
  { key: '30_45', label: '30-45 min' },
  { key: '45_60', label: '45-60 min' },
  { key: '60_90', label: '60-90 min' },
];

export function AiPlannerModal({
  visible,
  onClose,
  defaultGoal = 'build_muscle',
  defaultFrequency = 3,
  defaultDuration = '45_60',
}: AiPlannerModalProps) {
  const { colors, radius, spacing, fontSize, fontWeight, icons, type } =
    useTokens();

  const [step, setStep] = useState<'config' | 'preview'>('config');
  const [goal, setGoal] = useState<FitnessGoal>(defaultGoal);
  const [frequency, setFrequency] = useState<number>(defaultFrequency);
  const [duration, setDuration] = useState<WorkoutDuration>(defaultDuration);
  const [focusNotes, setFocusNotes] = useState('');
  const [generatedPlan, setGeneratedPlan] = useState<GeneratedProgramPlan | null>(
    null,
  );
  const [selectedDayIndex, setSelectedDayIndex] = useState(0);
  const [errorText, setErrorText] = useState<string | null>(null);

  const generateMutation = useGenerateProgramPlan();
  const confirmMutation = useConfirmProgramPlan();

  const handleGenerate = () => {
    pressLight();
    setErrorText(null);

    generateMutation.mutate(
      {
        goal,
        frequency,
        duration,
        focusNotes: focusNotes.trim() || undefined,
      },
      {
        onSuccess: (plan) => {
          selectionTick();
          setGeneratedPlan(plan);
          setSelectedDayIndex(0);
          setStep('preview');
        },
        onError: (err: any) => {
          const msg =
            err?.response?.data?.message ||
            'Could not generate plan. Please try again.';
          setErrorText(msg);
        },
      },
    );
  };

  const handleConfirm = () => {
    if (!generatedPlan) return;
    pressLight();
    setErrorText(null);

    confirmMutation.mutate(
      {
        plan: generatedPlan,
        activateImmediately: true,
      },
      {
        onSuccess: () => {
          selectionTick();
          onClose();
          setStep('config');
          setGeneratedPlan(null);
        },
        onError: (err: any) => {
          const msg =
            err?.response?.data?.message ||
            'Could not activate plan. Please try again.';
          setErrorText(msg);
        },
      },
    );
  };

  const activeDay =
    generatedPlan?.days && generatedPlan.days[selectedDayIndex]
      ? generatedPlan.days[selectedDayIndex]
      : generatedPlan?.days[0];

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
      statusBarTranslucent
      navigationBarTranslucent
    >
      <View style={[styles.container, { backgroundColor: colors.bg }]}>
        <SafeAreaView style={styles.safeArea}>
          {/* Header */}
          <View style={[styles.header, { borderBottomColor: colors.hairline }]}>
            {step === 'preview' ? (
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Back to configuration"
                onPress={() => {
                  selectionTick();
                  setStep('config');
                }}
                style={styles.headerIconButton}
              >
                <ArrowLeft
                  size={22}
                  color={colors.ink}
                  strokeWidth={icons.strokeWidth}
                />
              </Pressable>
            ) : (
              <View style={styles.headerIconPlaceholder} />
            )}

            <View style={{ alignItems: 'center' }}>
              <Text
                style={[
                  type.title,
                  { color: colors.ink, fontSize: fontSize.title },
                ]}
              >
                {step === 'config' ? 'AI Workout Planner' : 'Routine Preview'}
              </Text>
              <Text
                style={[
                  type.caption,
                  { color: colors.inkMutedText, marginTop: 2 },
                ]}
              >
                {step === 'config'
                  ? 'Customized progressive overload routine'
                  : 'Review days and exercise parameters'}
              </Text>
            </View>

            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Close"
              onPress={() => {
                selectionTick();
                onClose();
              }}
              style={styles.headerIconButton}
            >
              <X size={22} color={colors.ink} strokeWidth={icons.strokeWidth} />
            </Pressable>
          </View>

          {/* Body */}
          <ScrollView
            contentContainerStyle={[styles.content, { padding: spacing.lg }]}
            showsVerticalScrollIndicator={false}
          >
            {errorText ? (
              <View
                style={[
                  styles.errorBanner,
                  {
                    backgroundColor: colors.surfaceMuted,
                    borderColor: colors.danger,
                    borderRadius: radius.md,
                    padding: spacing.md,
                    marginBottom: spacing.md,
                  },
                ]}
              >
                <Text
                  style={{
                    color: colors.danger,
                    fontSize: fontSize.secondary,
                  }}
                >
                  {errorText}
                </Text>
              </View>
            ) : null}

            {step === 'config' ? (
              <View style={{ gap: spacing.xl }}>
                {/* Intro Card */}
                <Card variant="surface" padding="lg">
                  <View
                    style={{
                      flexDirection: 'row',
                      gap: spacing.md,
                      alignItems: 'center',
                    }}
                  >
                    <View
                      style={[
                        styles.sparkleBadge,
                        {
                          backgroundColor: colors.surfaceMuted,
                          borderRadius: radius.pill,
                        },
                      ]}
                    >
                      <Sparkles
                        size={24}
                        color={colors.accent}
                        strokeWidth={icons.strokeWidth}
                      />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text
                        style={[
                          type.cardLabel,
                          { color: colors.accentText, textTransform: 'uppercase' },
                        ]}
                      >
                        Evidence-Based Periodization
                      </Text>
                      <Text
                        style={[
                          type.body,
                          {
                            color: colors.inkMutedText,
                            fontSize: fontSize.secondary,
                            marginTop: 4,
                          },
                        ]}
                      >
                        The AI Planner validates movements against your equipment
                        profile and avoid-list, scheduling balanced target sets and RIR.
                      </Text>
                    </View>
                  </View>
                </Card>

                {/* Goal Selector */}
                <View style={{ gap: spacing.sm }}>
                  <Text
                    style={[
                      type.cardLabel,
                      { color: colors.ink, fontWeight: fontWeight.bold },
                    ]}
                  >
                    Primary Goal
                  </Text>
                  <View style={styles.chipRow}>
                    {GOAL_OPTIONS.map((opt) => {
                      const isSelected = goal === opt.key;
                      return (
                        <Pressable
                          key={opt.key}
                          accessibilityRole="button"
                          onPress={() => {
                            selectionTick();
                            setGoal(opt.key);
                          }}
                          style={[
                            styles.chip,
                            {
                              backgroundColor: isSelected
                                ? colors.ink
                                : colors.surface,
                              borderColor: isSelected
                                ? colors.ink
                                : colors.hairline,
                              borderRadius: radius.pill,
                              paddingHorizontal: spacing.md,
                              paddingVertical: spacing.sm,
                            },
                          ]}
                        >
                          <Text
                            style={{
                              color: isSelected ? colors.surface : colors.ink,
                              fontSize: fontSize.secondary,
                              fontWeight: fontWeight.medium,
                            }}
                          >
                            {opt.label}
                          </Text>
                        </Pressable>
                      );
                    })}
                  </View>
                </View>

                {/* Frequency Selector */}
                <View style={{ gap: spacing.sm }}>
                  <Text
                    style={[
                      type.cardLabel,
                      { color: colors.ink, fontWeight: fontWeight.bold },
                    ]}
                  >
                    Training Frequency (Days per Week)
                  </Text>
                  <View style={styles.frequencyRow}>
                    {FREQUENCY_OPTIONS.map((f) => {
                      const isSelected = frequency === f;
                      return (
                        <Pressable
                          key={f}
                          accessibilityRole="button"
                          onPress={() => {
                            selectionTick();
                            setFrequency(f);
                          }}
                          style={[
                            styles.frequencyPill,
                            {
                              backgroundColor: isSelected
                                ? colors.accent
                                : colors.surface,
                              borderColor: isSelected
                                ? colors.accent
                                : colors.hairline,
                              borderRadius: radius.md,
                              paddingVertical: spacing.md,
                            },
                          ]}
                        >
                          <Text
                            style={{
                              color: isSelected ? colors.surface : colors.ink,
                              fontSize: fontSize.body,
                              fontWeight: fontWeight.bold,
                            }}
                          >
                            {f}
                          </Text>
                          <Text
                            style={{
                              color: isSelected
                                ? colors.surface
                                : colors.inkMutedText,
                              fontSize: fontSize.caption,
                            }}
                          >
                            days
                          </Text>
                        </Pressable>
                      );
                    })}
                  </View>
                </View>

                {/* Duration Selector */}
                <View style={{ gap: spacing.sm }}>
                  <Text
                    style={[
                      type.cardLabel,
                      { color: colors.ink, fontWeight: fontWeight.bold },
                    ]}
                  >
                    Target Workout Duration
                  </Text>
                  <View style={styles.chipRow}>
                    {DURATION_OPTIONS.map((d) => {
                      const isSelected = duration === d.key;
                      return (
                        <Pressable
                          key={d.key}
                          accessibilityRole="button"
                          onPress={() => {
                            selectionTick();
                            setDuration(d.key);
                          }}
                          style={[
                            styles.chip,
                            {
                              backgroundColor: isSelected
                                ? colors.ink
                                : colors.surface,
                              borderColor: isSelected
                                ? colors.ink
                                : colors.hairline,
                              borderRadius: radius.pill,
                              paddingHorizontal: spacing.md,
                              paddingVertical: spacing.sm,
                            },
                          ]}
                        >
                          <Text
                            style={{
                              color: isSelected ? colors.surface : colors.ink,
                              fontSize: fontSize.secondary,
                              fontWeight: fontWeight.medium,
                            }}
                          >
                            {d.label}
                          </Text>
                        </Pressable>
                      );
                    })}
                  </View>
                </View>

                {/* Focus / Special Request Input */}
                <View style={{ gap: spacing.sm }}>
                  <Text
                    style={[
                      type.cardLabel,
                      { color: colors.ink, fontWeight: fontWeight.bold },
                    ]}
                  >
                    Special Focus or Restrictions (Optional)
                  </Text>
                  <TextInput
                    value={focusNotes}
                    onChangeText={setFocusNotes}
                    placeholder="e.g. Focus on chest and arms, knee friendly"
                    placeholderTextColor={colors.inkMutedText}
                    multiline
                    numberOfLines={2}
                    style={[
                      styles.textArea,
                      {
                        backgroundColor: colors.surface,
                        borderColor: colors.hairline,
                        borderRadius: radius.md,
                        color: colors.ink,
                        fontSize: fontSize.body,
                        padding: spacing.md,
                      },
                    ]}
                  />
                </View>

                <View style={{ marginTop: spacing.md }}>
                  <PrimaryButton
                    label={
                      generateMutation.isPending
                        ? 'Designing Your Routine...'
                        : 'Generate Routine with AI'
                    }
                    disabled={generateMutation.isPending}
                    onPress={handleGenerate}
                  />
                </View>
              </View>
            ) : (
              <View style={{ gap: spacing.lg }}>
                {/* Plan Overview Card */}
                <Card variant="surface" padding="lg">
                  <View style={{ gap: spacing.xs }}>
                    <View style={styles.badgeRow}>
                      <View
                        style={[
                          styles.badge,
                          {
                            backgroundColor: colors.surfaceMuted,
                            borderColor: colors.hairline,
                            borderRadius: radius.pill,
                          },
                        ]}
                      >
                        <Calendar size={13} color={colors.accentText} />
                        <Text
                          style={{
                            color: colors.accentText,
                            fontSize: fontSize.caption,
                            fontWeight: fontWeight.bold,
                          }}
                        >
                          {generatedPlan?.frequency} Days / Week
                        </Text>
                      </View>

                      <View
                        style={[
                          styles.badge,
                          {
                            backgroundColor: colors.surfaceMuted,
                            borderColor: colors.hairline,
                            borderRadius: radius.pill,
                          },
                        ]}
                      >
                        <Clock size={13} color={colors.inkMutedText} />
                        <Text
                          style={{
                            color: colors.inkMutedText,
                            fontSize: fontSize.caption,
                            fontWeight: fontWeight.medium,
                          }}
                        >
                          {generatedPlan?.duration.replace('_', '-')} min
                        </Text>
                      </View>
                    </View>

                    <Text
                      style={[
                        type.title,
                        {
                          color: colors.ink,
                          fontSize: fontSize.title,
                          marginTop: 4,
                        },
                      ]}
                    >
                      {generatedPlan?.name}
                    </Text>

                    <Text
                      style={[
                        type.secondary,
                        {
                          color: colors.inkMutedText,
                          fontSize: fontSize.secondary,
                          lineHeight: 20,
                        },
                      ]}
                    >
                      {generatedPlan?.description}
                    </Text>
                  </View>
                </Card>

                {/* Day Navigation Tabs */}
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={{ gap: spacing.sm, paddingVertical: spacing.xs }}
                >
                  {generatedPlan?.days.map((d, idx) => {
                    const isSelected = selectedDayIndex === idx;
                    return (
                      <Pressable
                        key={d.day}
                        accessibilityRole="button"
                        onPress={() => {
                          selectionTick();
                          setSelectedDayIndex(idx);
                        }}
                        style={[
                          styles.dayTabPill,
                          {
                            backgroundColor: isSelected
                              ? colors.ink
                              : colors.surface,
                            borderColor: isSelected
                              ? colors.ink
                              : colors.hairline,
                            borderRadius: radius.pill,
                            paddingHorizontal: spacing.md,
                            paddingVertical: spacing.sm,
                          },
                        ]}
                      >
                        <Text
                          style={{
                            color: isSelected ? colors.surface : colors.ink,
                            fontSize: fontSize.secondary,
                            fontWeight: fontWeight.bold,
                          }}
                        >
                          Day {d.day}: {d.dayName}
                        </Text>
                      </Pressable>
                    );
                  })}
                </ScrollView>

                {/* Active Day Exercises */}
                {activeDay ? (
                  <View style={{ gap: spacing.sm }}>
                    <Text
                      style={[
                        type.cardLabel,
                        { color: colors.accentText, textTransform: 'uppercase' },
                      ]}
                    >
                      {activeDay.dayName} · {activeDay.exercises.length} Exercises
                    </Text>

                    {activeDay.exercises.map((ex, exIdx) => (
                      <Card key={ex.exerciseId || exIdx} padding="md">
                        <View style={{ gap: 6 }}>
                          <View
                            style={{
                              flexDirection: 'row',
                              justifyContent: 'space-between',
                              alignItems: 'center',
                            }}
                          >
                            <Text
                              style={[
                                type.body,
                                { color: colors.ink, fontWeight: fontWeight.bold },
                              ]}
                            >
                              {ex.order}. {ex.exerciseName}
                            </Text>
                            <Text
                              style={{
                                color: colors.accentText,
                                fontSize: fontSize.secondary,
                                fontWeight: fontWeight.bold,
                              }}
                            >
                              {ex.sets} sets
                            </Text>
                          </View>

                          <View
                            style={{
                              flexDirection: 'row',
                              gap: spacing.sm,
                              alignItems: 'center',
                            }}
                          >
                            <View
                              style={[
                                styles.microTag,
                                {
                                  backgroundColor: colors.surfaceMuted,
                                  borderRadius: 4,
                                },
                              ]}
                            >
                              <Text
                                style={{
                                  color: colors.inkMutedText,
                                  fontSize: 11,
                                  textTransform: 'uppercase',
                                }}
                              >
                                {ex.primaryMuscle}
                              </Text>
                            </View>

                            <View
                              style={[
                                styles.microTag,
                                {
                                  backgroundColor: colors.surfaceMuted,
                                  borderRadius: 4,
                                },
                              ]}
                            >
                              <Text
                                style={{
                                  color: colors.inkMutedText,
                                  fontSize: 11,
                                  textTransform: 'uppercase',
                                }}
                              >
                                {ex.equipment}
                              </Text>
                            </View>

                            <Text
                              style={{
                                color: colors.inkMutedText,
                                fontSize: fontSize.caption,
                              }}
                            >
                              {ex.repMin}-{ex.repMax} reps
                              {ex.targetRir !== null && ex.targetRir !== undefined
                                ? ` · ${ex.targetRir} RIR`
                                : ''}
                              {ex.restSeconds ? ` · ${ex.restSeconds}s rest` : ''}
                            </Text>
                          </View>
                        </View>
                      </Card>
                    ))}
                  </View>
                ) : null}

                {/* Bottom Confirm Actions */}
                <View style={{ gap: spacing.sm, marginTop: spacing.md, paddingBottom: spacing.xl }}>
                  <PrimaryButton
                    label={
                      confirmMutation.isPending
                        ? 'Activating Program...'
                        : 'Save & Activate Program'
                    }
                    disabled={confirmMutation.isPending}
                    onPress={handleConfirm}
                  />

                  <SecondaryButton
                    label="Adjust Parameters"
                    disabled={confirmMutation.isPending}
                    onPress={() => {
                      selectionTick();
                      setStep('config');
                    }}
                  />
                </View>
              </View>
            )}
          </ScrollView>
        </SafeAreaView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  safeArea: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  headerIconButton: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerIconPlaceholder: {
    width: 44,
    height: 44,
  },
  content: {
    paddingBottom: 40,
  },
  sparkleBadge: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  chip: {
    borderWidth: 1,
  },
  frequencyRow: {
    flexDirection: 'row',
    gap: 8,
  },
  frequencyPill: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  textArea: {
    borderWidth: 1,
    minHeight: 64,
    textAlignVertical: 'top',
  },
  errorBanner: {
    borderWidth: 1,
  },
  badgeRow: {
    flexDirection: 'row',
    gap: 8,
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderWidth: 1,
  },
  dayTabPill: {
    borderWidth: 1,
  },
  microTag: {
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
});
