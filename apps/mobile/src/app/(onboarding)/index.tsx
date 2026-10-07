import {
  Difficulty,
  Equipment,
  FitnessGoal,
  onboardingBasicsSchema,
  onboardingEquipmentSchema,
  onboardingGoalSchema,
  onboardingNutritionSchema,
  onboardingSchema,
  onboardingTrainingSchema,
  type OnboardingInput,
} from '@liftmate/shared';
import { isAxiosError } from 'axios';
import {
  Activity,
  Compass,
  Dumbbell,
  Flame,
  Heart,
  Scale,
  Sparkles,
  Target,
  Timer,
  TrendingUp,
  Trophy,
  Utensils,
  Zap,
} from 'lucide-react-native';
import { useState } from 'react';
import { Controller, useForm, type Path } from 'react-hook-form';
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import Animated, { FadeIn, FadeOut } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import {
  Chip,
  CircleButton,
  DatePicker,
  DaySelector,
  EquipmentCard,
  Input,
  NutritionField,
  PrimaryButton,
  SecondaryButton,
  SelectCard,
} from '@/components/ui';
import { useCompleteOnboarding } from '@/features/onboarding/use-complete-onboarding';
import { useTokens } from '@/hooks/use-tokens';
import { t } from '@/i18n';
import { notifyError, notifySuccess, pressLight, selectionTick } from '@/lib/haptics';

type FormValues = {
  displayName: string;
  dateOfBirth: string;
  weightUnit: OnboardingInput['weightUnit'];
  timezone: string;
  primaryGoal: OnboardingInput['primaryGoal'] | '';
  secondaryGoal: OnboardingInput['secondaryGoal'] | '';
  experienceLevel: OnboardingInput['experienceLevel'] | '';
  weeklyFrequency: string;
  equipment: OnboardingInput['equipment'];
  targetCalories: string;
  targetProtein: string;
  targetCarbs: string;
  targetFat: string;
};

const FORM_STEP_FIELDS: Path<FormValues>[][] = [
  ['displayName', 'dateOfBirth', 'weightUnit', 'timezone'],
  ['primaryGoal'],
  ['experienceLevel', 'weeklyFrequency'],
  ['equipment'],
  ['targetCalories', 'targetProtein', 'targetCarbs', 'targetFat'],
];

const TOTAL_FORM_STEPS = FORM_STEP_FIELDS.length;

/** Timezones offered as quick picks (Indonesia first; UTC as a fallback). */
const TIMEZONE_OPTIONS = ['Asia/Jakarta', 'Asia/Makassar', 'Asia/Jayapura', 'UTC'] as const;

/** Per-field error copy for the nutrition step so failures are specific. */
const NUTRITION_ERROR_KEYS = {
  targetCalories: 'onboarding.errors.caloriesRange',
  targetProtein: 'onboarding.errors.proteinRange',
  targetCarbs: 'onboarding.errors.carbsRange',
  targetFat: 'onboarding.errors.fatRange',
} as const;

const STEP_SCHEMAS = [
  onboardingBasicsSchema,
  onboardingGoalSchema,
  onboardingTrainingSchema,
  onboardingEquipmentSchema,
  onboardingNutritionSchema,
];

function toPayload(values: FormValues): OnboardingInput {
  return {
    displayName: values.displayName,
    dateOfBirth: new Date(values.dateOfBirth),
    weightUnit: values.weightUnit,
    timezone: values.timezone,
    primaryGoal: values.primaryGoal as OnboardingInput['primaryGoal'],
    secondaryGoal: values.secondaryGoal
      ? (values.secondaryGoal as OnboardingInput['secondaryGoal'])
      : null,
    experienceLevel: values.experienceLevel as OnboardingInput['experienceLevel'],
    weeklyFrequency: Number(values.weeklyFrequency),
    equipment: values.equipment,
    targetCalories: Number(values.targetCalories),
    targetProtein: Number(values.targetProtein),
    targetCarbs: Number(values.targetCarbs),
    targetFat: Number(values.targetFat),
  };
}

/**
 * Rough starting macros from the primary goal, so a user can tap
 * "Estimate for me" and get sensible, editable numbers.
 */
function estimateTargets(goal: FormValues['primaryGoal']): {
  targetCalories: string;
  targetProtein: string;
  targetCarbs: string;
  targetFat: string;
} {
  switch (goal) {
    case 'lose_fat':
      return { targetCalories: '1900', targetProtein: '150', targetCarbs: '160', targetFat: '60' };
    case 'build_muscle':
      return { targetCalories: '2600', targetProtein: '170', targetCarbs: '300', targetFat: '80' };
    case 'gain_strength':
      return { targetCalories: '2700', targetProtein: '160', targetCarbs: '320', targetFat: '85' };
    case 'general_fitness':
    default:
      return { targetCalories: '2200', targetProtein: '130', targetCarbs: '230', targetFat: '70' };
  }
}

function describeSubmitError(err: unknown): string {
  if (isAxiosError(err)) {
    if (!err.response) {
      return t('onboarding.submitErrors.network');
    }
    const status = err.response.status;
    if (status === 401) {
      return t('onboarding.submitErrors.auth');
    }
    const data = err.response.data as { message?: unknown } | undefined;
    const serverMessage =
      data && typeof data.message === 'string' ? data.message : undefined;
    return t('onboarding.submitErrors.server', {
      status,
      message: serverMessage ?? t('common.somethingWentWrong'),
    });
  }
  if (err instanceof Error && err.name === 'ZodError') {
    return t('onboarding.submitErrors.response');
  }
  return t('common.somethingWentWrong');
}

/** Satellite icons cluster for Welcome hero (DESIGN.md §7.1). */
const SATELLITE_ICONS = [
  { Icon: Flame, size: 20, circle: 40, x: -75, y: -45 },
  { Icon: Utensils, size: 20, circle: 40, x: 75, y: -42 },
  { Icon: Scale, size: 20, circle: 40, x: -110, y: 12 },
  { Icon: TrendingUp, size: 20, circle: 40, x: 110, y: 12 },
  { Icon: Sparkles, size: 18, circle: 36, x: -65, y: 68 },
  { Icon: Heart, size: 20, circle: 40, x: 68, y: 68 },
  { Icon: Target, size: 18, circle: 36, x: 0, y: -82 },
  { Icon: Activity, size: 18, circle: 36, x: 0, y: 82 },
  { Icon: Timer, size: 18, circle: 36, x: -125, y: -42 },
  { Icon: Trophy, size: 18, circle: 36, x: 125, y: -42 },
  { Icon: Zap, size: 16, circle: 34, x: -38, y: -72 },
  { Icon: Compass, size: 16, circle: 34, x: 38, y: -72 },
];

export default function OnboardingScreen() {
  const insets = useSafeAreaInsets();
  const { colors, spacing, radius, type, floatingShadow } = useTokens();
  // step 0 = Welcome screen; steps 1..5 = wizard steps
  const [step, setStep] = useState(0);
  const [selectedDays, setSelectedDays] = useState<string[]>(['mon', 'wed', 'fri']);
  const [formError, setFormError] = useState<string | null>(null);
  const complete = useCompleteOnboarding();

  const { control, trigger, getValues, setValue, setError, clearErrors, watch } =
    useForm<FormValues>({
      mode: 'onChange',
      defaultValues: {
        displayName: '',
        dateOfBirth: '',
        weightUnit: 'kg',
        timezone: 'Asia/Jakarta',
        primaryGoal: '',
        secondaryGoal: '',
        experienceLevel: '',
        weeklyFrequency: '3',
        equipment: [],
        targetCalories: '',
        targetProtein: '',
        targetCarbs: '',
        targetFat: '',
      },
    });

  const validateStep = (index: number): boolean => {
    const payload = toPayload(getValues());
    const result = STEP_SCHEMAS[index].safeParse(payload);
    if (result.success) {
      clearErrors(FORM_STEP_FIELDS[index]);
      return true;
    }
    const fieldErrors = result.error.flatten().fieldErrors as Record<string, string[] | undefined>;
    for (const field of FORM_STEP_FIELDS[index]) {
      if (fieldErrors[field]) {
        setError(field, { type: 'manual' });
      }
    }
    return false;
  };

  const next = async () => {
    setFormError(null);
    const formIndex = step - 1;
    if (formIndex >= 0 && formIndex < TOTAL_FORM_STEPS) {
      await trigger(FORM_STEP_FIELDS[formIndex]);
      if (!validateStep(formIndex)) {
        notifyError();
        return;
      }
    }
    pressLight();
    setStep((s) => Math.min(TOTAL_FORM_STEPS, s + 1));
  };

  const submit = async () => {
    setFormError(null);
    if (!validateStep(TOTAL_FORM_STEPS - 1)) {
      notifyError();
      return;
    }
    const result = onboardingSchema.safeParse(toPayload(getValues()));
    if (!result.success) {
      notifyError();
      setFormError(t('common.somethingWentWrong'));
      return;
    }
    try {
      await complete.mutateAsync(result.data);
      notifySuccess();
    } catch (err) {
      notifyError();
      setFormError(describeSubmitError(err));
    }
  };

  const back = () => {
    setFormError(null);
    pressLight();
    setStep((s) => Math.max(0, s - 1));
  };

  const applyEstimate = () => {
    const est = estimateTargets(getValues('primaryGoal'));
    setValue('targetCalories', est.targetCalories, { shouldValidate: true });
    setValue('targetProtein', est.targetProtein, { shouldValidate: true });
    setValue('targetCarbs', est.targetCarbs, { shouldValidate: true });
    setValue('targetFat', est.targetFat, { shouldValidate: true });
    clearErrors(['targetCalories', 'targetProtein', 'targetCarbs', 'targetFat']);
    pressLight();
  };

  const handleDaysChange = (days: string[]) => {
    setSelectedDays(days);
    const count = Math.max(1, Math.min(7, days.length || 1));
    setValue('weeklyFrequency', String(count), { shouldValidate: true });
  };

  const selectedEquipment = watch('equipment');
  const primaryGoal = watch('primaryGoal');
  const secondaryGoal = watch('secondaryGoal');
  const experienceLevel = watch('experienceLevel');
  const weightUnit = watch('weightUnit');
  const timezone = watch('timezone');

  const titles = [
    { title: t('onboarding.basicsTitle'), subtitle: t('onboarding.basicsSubtitle') },
    { title: t('onboarding.goalTitle'), subtitle: t('onboarding.goalSubtitle') },
    { title: t('onboarding.trainingTitle'), subtitle: t('onboarding.trainingSubtitle') },
    { title: t('onboarding.equipmentTitle'), subtitle: t('onboarding.equipmentSubtitle') },
    { title: t('onboarding.nutritionTitle'), subtitle: t('onboarding.nutritionSubtitle') },
  ];

  const toggleEquipment = (value: OnboardingInput['equipment'][number]) => {
    const current = getValues('equipment');
    const nextValue = current.includes(value)
      ? current.filter((e) => e !== value)
      : [...current, value];
    setValue('equipment', nextValue, { shouldValidate: true });
  };

  const nutritionMeta = [
    {
      name: 'targetCalories' as const,
      label: t('onboarding.calories'),
      unit: t('onboarding.unitKcal'),
      hint: t('onboarding.caloriesHint'),
    },
    {
      name: 'targetProtein' as const,
      label: t('onboarding.protein'),
      unit: t('onboarding.unitGrams'),
      hint: t('onboarding.proteinHint'),
    },
    {
      name: 'targetCarbs' as const,
      label: t('onboarding.carbs'),
      unit: t('onboarding.unitGrams'),
      hint: t('onboarding.carbsHint'),
    },
    {
      name: 'targetFat' as const,
      label: t('onboarding.fat'),
      unit: t('onboarding.unitGrams'),
      hint: t('onboarding.fatHint'),
    },
  ];

  // -------------------------------------------------------------------------
  // Step 0: Welcome Screen (DESIGN.md §7.1)
  // -------------------------------------------------------------------------
  if (step === 0) {
    return (
      <View style={[styles.container, { backgroundColor: colors.accentSoft }]}>
        {/* Coloured band with status bar */}
        <View style={{ height: Math.max(insets.top, 24) + 24 }} />

        {/* White sheet with top radius 32 filling the rest */}
        <View
          style={[
            styles.welcomeSheet,
            {
              backgroundColor: colors.surface,
              borderTopLeftRadius: 32,
              borderTopRightRadius: 32,
              paddingHorizontal: spacing.xl,
              paddingTop: spacing.xxl,
            },
          ]}
        >
          <ScrollView
            style={styles.flex}
            contentContainerStyle={[
              styles.welcomeContent,
              { paddingBottom: Math.max(insets.bottom, 16) + 24 },
            ]}
            showsVerticalScrollIndicator={false}
          >
            <View style={{ gap: spacing.xxl }}>
              {/* Hero: loose cluster of 10–14 LiftMate icons around the app mark */}
              <View style={styles.clusterContainer}>
                {SATELLITE_ICONS.map((item, idx) => (
                  <View
                    key={idx}
                    style={[
                      styles.satelliteCircle,
                      {
                        width: item.circle,
                        height: item.circle,
                        borderRadius: item.circle / 2,
                        backgroundColor: colors.accentSoft,
                        left: '50%',
                        top: '50%',
                        marginLeft: item.x - item.circle / 2,
                        marginTop: item.y - item.circle / 2,
                      },
                    ]}
                  >
                    <item.Icon size={item.size} color={colors.accentText} strokeWidth={2} />
                  </View>
                ))}
                {/* Central app icon badge */}
                <View
                  style={[
                    styles.centerCircle,
                    floatingShadow,
                    {
                      backgroundColor: colors.accent,
                      left: '50%',
                      top: '50%',
                      marginLeft: -34,
                      marginTop: -34,
                    },
                  ]}
                >
                  <Dumbbell size={32} color="#FFFFFF" strokeWidth={2.2} />
                </View>
              </View>

              {/* Text: left-aligned title bold, then 1–2 muted body paragraphs */}
              <View style={{ gap: spacing.md }}>
                <Text style={[type.largeTitle, { color: colors.ink }]}>
                  {t('onboarding.welcomeTitle')}
                </Text>
                <Text style={[type.body, { color: colors.inkMutedText, lineHeight: 22 }]}>
                  {t('onboarding.welcomeSubtitle')}
                </Text>
                <Text style={[type.body, { color: colors.inkMutedText, lineHeight: 22 }]}>
                  {t('onboarding.welcomeParagraph')}
                </Text>
              </View>
            </View>

            {/* Bottom: full-width PrimaryButton 24dp above bottom inset */}
            <View style={{ paddingTop: spacing.xxl }}>
              <PrimaryButton
                label={t('onboarding.welcomeStart')}
                onPress={() => {
                  pressLight();
                  setStep(1);
                }}
              />
            </View>
          </ScrollView>
        </View>
      </View>
    );
  }

  // -------------------------------------------------------------------------
  // Steps 1..5: Onboarding Wizard Steps (DESIGN.md §7.10)
  // -------------------------------------------------------------------------
  const formIndex = step - 1;

  return (
    <View style={[styles.container, { backgroundColor: colors.bg }]}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        {/* Step Header: CircleButton back on top left, slim progress bar on top right */}
        <View
          style={[
            styles.stepHeader,
            {
              paddingTop: Math.max(insets.top, spacing.md),
              paddingHorizontal: spacing.lg,
              paddingBottom: spacing.sm,
              gap: spacing.md,
            },
          ]}
        >
          <CircleButton
            icon="back"
            accessibilityLabel={t('common.back')}
            onPress={back}
          />

          <View style={styles.progressContainer}>
            <Text style={[type.cardLabel, { color: colors.inkMutedText }]}>
              {t('onboarding.stepLabel', { current: step, total: TOTAL_FORM_STEPS })}
            </Text>
            <View
              style={[
                styles.progressBarTrack,
                { backgroundColor: colors.surfaceMuted, borderRadius: radius.pill },
              ]}
            >
              <View
                style={[
                  styles.progressBarFill,
                  {
                    width: `${(step / TOTAL_FORM_STEPS) * 100}%`,
                    backgroundColor: colors.accent,
                    borderRadius: radius.pill,
                  },
                ]}
              />
            </View>
          </View>
        </View>

        {/* Step Title & Subtitle */}
        <View style={{ paddingHorizontal: spacing.xl, paddingTop: spacing.sm, paddingBottom: spacing.md, gap: spacing.xs }}>
          <Text style={[type.title, { color: colors.ink }]}>{titles[formIndex].title}</Text>
          <Text style={[type.secondary, { color: colors.inkMutedText }]}>{titles[formIndex].subtitle}</Text>
        </View>

        <ScrollView
          style={styles.flex}
          contentContainerStyle={[styles.content, { paddingHorizontal: spacing.xl, paddingBottom: spacing.xxl, gap: spacing.lg }]}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <Animated.View
            key={step}
            entering={FadeIn.duration(200)}
            exiting={FadeOut.duration(120)}
            style={{ gap: spacing.lg }}
          >
            {/* Step 1: Basics */}
            {step === 1 ? (
              <View style={{ gap: spacing.lg }}>
                <Controller
                  control={control}
                  name="displayName"
                  render={({ field, fieldState }) => (
                    <Input
                      label={t('auth.displayName')}
                      value={field.value}
                      onChangeText={field.onChange}
                      onBlur={field.onBlur}
                      error={fieldState.error ? t('onboarding.errors.required') : undefined}
                    />
                  )}
                />

                <Controller
                  control={control}
                  name="dateOfBirth"
                  render={({ field, fieldState }) => (
                    <DatePicker
                      label={t('onboarding.dateOfBirth')}
                      placeholder={t('onboarding.dateOfBirthPlaceholder')}
                      value={field.value}
                      onChange={field.onChange}
                      error={fieldState.error ? t('onboarding.errors.dateInvalid') : undefined}
                    />
                  )}
                />

                <View style={{ gap: spacing.xs }}>
                  <Text style={[type.cardLabel, { color: colors.inkMutedText }]}>
                    {t('onboarding.weightUnit')}
                  </Text>
                  <View style={styles.chipRow}>
                    {(['kg', 'lb'] as const).map((unit) => (
                      <Chip
                        key={unit}
                        label={unit.toUpperCase()}
                        selected={weightUnit === unit}
                        onPress={() => {
                          selectionTick();
                          setValue('weightUnit', unit, { shouldValidate: true });
                        }}
                      />
                    ))}
                  </View>
                </View>

                <View style={{ gap: spacing.xs }}>
                  <Text style={[type.cardLabel, { color: colors.inkMutedText }]}>
                    {t('onboarding.timezone')}
                  </Text>
                  <View style={styles.chipWrap}>
                    {TIMEZONE_OPTIONS.map((tz) => (
                      <Chip
                        key={tz}
                        label={t(`onboarding.timezones.${tz}`)}
                        selected={timezone === tz}
                        onPress={() => {
                          selectionTick();
                          setValue('timezone', tz, { shouldValidate: true });
                        }}
                      />
                    ))}
                  </View>
                  <Text style={[type.secondary, { color: colors.inkMutedText, marginTop: spacing.xs }]}>
                    {t('onboarding.timezoneHelp')}
                  </Text>
                </View>
              </View>
            ) : null}

            {/* Step 2: Goal */}
            {step === 2 ? (
              <View style={{ gap: spacing.lg }}>
                <Text style={[type.cardLabel, { color: colors.inkMutedText }]}>
                  {t('onboarding.primaryGoal')}
                </Text>
                <View style={{ gap: spacing.md }}>
                  {FitnessGoal.options.map((goal) => (
                    <SelectCard
                      key={goal}
                      title={t(`onboarding.goals.${goal}`)}
                      description={t(`onboarding.goalDescriptions.${goal}`)}
                      selected={primaryGoal === goal}
                      onPress={() => setValue('primaryGoal', goal, { shouldValidate: true })}
                    />
                  ))}
                </View>

                <Text style={[type.cardLabel, { color: colors.inkMutedText, marginTop: spacing.sm }]}>
                  {t('onboarding.secondaryGoal')}
                </Text>
                <View style={styles.chipWrap}>
                  {FitnessGoal.options.map((goal) => (
                    <Chip
                      key={`sec-${goal}`}
                      label={t(`onboarding.goals.${goal}`)}
                      selected={secondaryGoal === goal}
                      onPress={() => {
                        selectionTick();
                        setValue('secondaryGoal', secondaryGoal === goal ? '' : goal, {
                          shouldValidate: true,
                        });
                      }}
                    />
                  ))}
                </View>
              </View>
            ) : null}

            {/* Step 3: Training Profile & Schedule */}
            {step === 3 ? (
              <View style={{ gap: spacing.lg }}>
                <Text style={[type.cardLabel, { color: colors.inkMutedText }]}>
                  {t('onboarding.experience')}
                </Text>
                <View style={{ gap: spacing.md }}>
                  {Difficulty.options.map((level) => (
                    <SelectCard
                      key={level}
                      title={t(`onboarding.experienceLevels.${level}`)}
                      description={t(`onboarding.experienceDescriptions.${level}`)}
                      selected={experienceLevel === level}
                      onPress={() => setValue('experienceLevel', level, { shouldValidate: true })}
                    />
                  ))}
                </View>

                {/* Training Schedule via DaySelector (DESIGN.md §7.10 & §6.10) */}
                <View style={{ gap: spacing.sm, marginTop: spacing.md }}>
                  <Text style={[type.cardLabel, { color: colors.inkMutedText }]}>
                    {t('onboarding.trainingDaysTitle')}
                  </Text>
                  <DaySelector
                    selectedDays={selectedDays}
                    onChange={handleDaysChange}
                  />
                  <Text style={[type.secondary, { color: colors.inkMutedText }]}>
                    {t('onboarding.trainingDaysCount', { count: selectedDays.length || 1 })}
                  </Text>
                </View>
              </View>
            ) : null}

            {/* Step 4: Equipment */}
            {step === 3 ? null : step === 4 ? (
              <View style={{ gap: spacing.md }}>
                <View style={styles.grid}>
                  {Equipment.options.map((item) => (
                    <View key={item} style={styles.gridItem}>
                      <EquipmentCard
                        icon={t(`onboarding.equipmentIcons.${item}`)}
                        label={t(`onboarding.equipment.${item}`)}
                        selected={selectedEquipment.includes(item)}
                        onPress={() => toggleEquipment(item)}
                      />
                    </View>
                  ))}
                </View>
                <Text style={[type.secondary, { color: colors.inkMutedText, marginTop: spacing.xs }]}>
                  {t('onboarding.equipmentHint')}
                </Text>
              </View>
            ) : null}

            {/* Step 5: Nutrition */}
            {step === 5 ? (
              <View style={{ gap: spacing.lg }}>
                <Text style={[type.secondary, { color: colors.inkMutedText }]}>
                  {t('onboarding.nutritionHelp')}
                </Text>

                <View style={{ gap: spacing.xs }}>
                  <SecondaryButton
                    label={t('onboarding.estimate')}
                    onPress={applyEstimate}
                  />
                  <Text style={[type.secondary, { color: colors.inkMutedText, textAlign: 'center' }]}>
                    {t('onboarding.estimateHint')}
                  </Text>
                </View>

                {nutritionMeta.map((meta) => (
                  <Controller
                    key={meta.name}
                    control={control}
                    name={meta.name}
                    render={({ field, fieldState }) => (
                      <NutritionField
                        label={meta.label}
                        unit={meta.unit}
                        hint={meta.hint}
                        value={field.value}
                        onChangeText={field.onChange}
                        onBlur={field.onBlur}
                        error={fieldState.error ? t(NUTRITION_ERROR_KEYS[meta.name]) : undefined}
                      />
                    )}
                  />
                ))}
              </View>
            ) : null}
          </Animated.View>

          {formError ? (
            <Text style={{ color: colors.danger, ...type.body }}>{formError}</Text>
          ) : null}
        </ScrollView>

        {/* Sticky footer: full-width PrimaryButton 24dp above inset */}
        <View
          style={[
            styles.footer,
            {
              paddingHorizontal: spacing.xl,
              paddingTop: spacing.md,
              paddingBottom: Math.max(insets.bottom, 16) + 12,
              backgroundColor: colors.bg,
              borderTopColor: colors.hairline,
            },
          ]}
        >
          <PrimaryButton
            label={step < TOTAL_FORM_STEPS ? t('common.continue') : t('onboarding.finish')}
            loading={complete.isPending}
            onPress={() => void (step < TOTAL_FORM_STEPS ? next() : submit())}
          />
        </View>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  flex: {
    flex: 1,
  },
  welcomeSheet: {
    flex: 1,
  },
  welcomeContent: {
    flexGrow: 1,
    justifyContent: 'space-between',
  },
  clusterContainer: {
    height: 220,
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  satelliteCircle: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
  },
  centerCircle: {
    position: 'absolute',
    width: 68,
    height: 68,
    borderRadius: 34,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  progressContainer: {
    flex: 1,
    alignItems: 'flex-end',
    gap: 6,
  },
  progressBarTrack: {
    width: '100%',
    height: 4,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
  },
  content: {
    flexGrow: 1,
  },
  chipRow: {
    flexDirection: 'row',
    gap: 8,
  },
  chipWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginHorizontal: -6,
  },
  gridItem: {
    width: '33.333%',
    paddingHorizontal: 6,
    paddingVertical: 6,
  },
  footer: {
    borderTopWidth: 1,
  },
});
