import {
  Difficulty,
  DIETARY_PREFERENCES,
  Equipment,
  FitnessGoal,
  Gender,
  TrainingLocation,
  WorkoutDuration,
  onboardingAboutYouSchema,
  onboardingEquipmentSchema,
  onboardingGoalSchema,
  onboardingNutritionSchema,
  onboardingPreferencesSchema,
  onboardingSchema,
  onboardingTrainingSchema,
  onboardingYourBodySchema,
  calculateNutritionTargets,
  deriveAgeFromDateOfBirth,
  type OnboardingInput,
  type Exercise,
} from '@liftmate/shared';
import { isAxiosError } from 'axios';
import {
  Activity,
  Compass,
  Dumbbell,
  Flame,
  Heart,
  Plus,
  Scale,
  Sparkles,
  Target,
  Timer,
  TrendingUp,
  Trophy,
  Utensils,
  X,
  Zap,
} from 'lucide-react-native';
import { useState } from 'react';
import { Controller, useForm, type Path } from 'react-hook-form';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
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
  SegmentedControl,
} from '@/components/ui';
import { ExercisePicker } from '@/features/workout/exercise-picker';
import { useCompleteOnboarding } from '@/features/onboarding/use-complete-onboarding';
import { useTokens } from '@/hooks/use-tokens';
import { t } from '@/i18n';
import { notifyError, notifySuccess, pressLight, selectionTick } from '@/lib/haptics';

type FormValues = {
  displayName: string;
  dateOfBirth: string;
  gender: OnboardingInput['gender'] | '';
  timezone: string;
  heightCm: string;
  weightKg: string;
  bodyFatPct: string;
  targetWeightKg: string;
  weightUnit: OnboardingInput['weightUnit'];
  primaryGoal: OnboardingInput['primaryGoal'] | '';
  secondaryGoal: OnboardingInput['secondaryGoal'] | '';
  experienceLevel: OnboardingInput['experienceLevel'] | '';
  weeklyFrequency: string;
  workoutDuration: OnboardingInput['workoutDuration'] | '';
  trainingLocation: OnboardingInput['trainingLocation'] | '';
  equipment: OnboardingInput['equipment'];
  preferredEquipment: OnboardingInput['preferredEquipment'];
  preferredExercises: string[];
  avoidExercises: string[];
  targetCalories: string;
  targetProtein: string;
  targetCarbs: string;
  targetFat: string;
  dietaryPreferences: string[];
};

const FORM_STEP_FIELDS: Path<FormValues>[][] = [
  ['displayName', 'dateOfBirth', 'gender', 'timezone'],
  ['heightCm', 'weightKg', 'bodyFatPct', 'targetWeightKg', 'weightUnit'],
  ['primaryGoal', 'secondaryGoal'],
  ['experienceLevel', 'weeklyFrequency', 'workoutDuration', 'trainingLocation'],
  ['equipment'],
  ['preferredEquipment', 'preferredExercises', 'avoidExercises'],
  ['targetCalories', 'targetProtein', 'targetCarbs', 'targetFat', 'dietaryPreferences'],
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
  onboardingAboutYouSchema,
  onboardingYourBodySchema,
  onboardingGoalSchema,
  onboardingTrainingSchema,
  onboardingEquipmentSchema,
  onboardingPreferencesSchema,
  onboardingNutritionSchema,
];

function toPayload(values: FormValues): OnboardingInput {
  return {
    displayName: values.displayName.trim(),
    dateOfBirth: new Date(values.dateOfBirth),
    gender: (values.gender || 'prefer_not_to_say') as OnboardingInput['gender'],
    timezone: values.timezone,
    heightCm: Number(values.heightCm) || 170,
    weightKg: Number(values.weightKg) || 70,
    bodyFatPct: values.bodyFatPct ? Number(values.bodyFatPct) : null,
    targetWeightKg: values.targetWeightKg ? Number(values.targetWeightKg) : null,
    weightUnit: values.weightUnit,
    primaryGoal: (values.primaryGoal || 'general_fitness') as OnboardingInput['primaryGoal'],
    secondaryGoal: values.secondaryGoal
      ? (values.secondaryGoal as OnboardingInput['secondaryGoal'])
      : null,
    experienceLevel: (values.experienceLevel || 'beginner') as OnboardingInput['experienceLevel'],
    weeklyFrequency: Number(values.weeklyFrequency) || 3,
    workoutDuration: (values.workoutDuration || '45_60') as OnboardingInput['workoutDuration'],
    trainingLocation: (values.trainingLocation || 'commercial_gym') as OnboardingInput['trainingLocation'],
    equipment: values.equipment.length > 0 ? values.equipment : ['bodyweight'],
    preferredEquipment: values.preferredEquipment ?? [],
    preferredExercises: values.preferredExercises ?? [],
    avoidExercises: values.avoidExercises ?? [],
    targetCalories: Number(values.targetCalories) || 2000,
    targetProtein: Number(values.targetProtein) || 140,
    targetCarbs: Number(values.targetCarbs) || 200,
    targetFat: Number(values.targetFat) || 65,
    dietaryPreferences: values.dietaryPreferences ?? [],
  };
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
  // step 0 = Welcome screen; steps 1..7 = wizard steps
  const [step, setStep] = useState(0);
  const [selectedDays, setSelectedDays] = useState<string[]>(['mon', 'wed', 'fri']);
  const [formError, setFormError] = useState<string | null>(null);
  const [exercisePickerTarget, setExercisePickerTarget] = useState<'preferred' | 'avoid' | null>(null);
  const [calcMode, setCalcMode] = useState<'auto' | 'manual'>('auto');
  const complete = useCompleteOnboarding();

  const { control, trigger, getValues, setValue, setError, clearErrors, watch } =
    useForm<FormValues>({
      mode: 'onChange',
      defaultValues: {
        displayName: '',
        dateOfBirth: '',
        gender: '',
        timezone: 'Asia/Jakarta',
        heightCm: '',
        weightKg: '',
        bodyFatPct: '',
        targetWeightKg: '',
        weightUnit: 'kg',
        primaryGoal: '',
        secondaryGoal: '',
        experienceLevel: '',
        weeklyFrequency: '3',
        workoutDuration: '',
        trainingLocation: '',
        equipment: [],
        preferredEquipment: [],
        preferredExercises: [],
        avoidExercises: [],
        targetCalories: '',
        targetProtein: '',
        targetCarbs: '',
        targetFat: '',
        dietaryPreferences: [],
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

  const applyMifflinEstimate = () => {
    const values = getValues();
    const dob = values.dateOfBirth ? new Date(values.dateOfBirth) : new Date('1998-01-01');
    const age = deriveAgeFromDateOfBirth(dob);
    const weight = Number(values.weightKg) || 70;
    const height = Number(values.heightCm) || 170;
    const gender = (values.gender || 'prefer_not_to_say') as Gender;
    const weeklyFreq = Math.max(2, Math.min(6, Number(values.weeklyFrequency) || 3));
    const goal = (values.primaryGoal || 'general_fitness') as FitnessGoal;

    const res = calculateNutritionTargets({
      gender,
      weightKg: weight,
      heightCm: height,
      age,
      weeklyFrequency: weeklyFreq,
      primaryGoal: goal,
    });

    setValue('targetCalories', String(res.targetCalories), { shouldValidate: true });
    setValue('targetProtein', String(res.targetProtein), { shouldValidate: true });
    setValue('targetCarbs', String(res.targetCarbs), { shouldValidate: true });
    setValue('targetFat', String(res.targetFat), { shouldValidate: true });
    clearErrors(['targetCalories', 'targetProtein', 'targetCarbs', 'targetFat']);
    pressLight();
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
    const nextStep = Math.min(TOTAL_FORM_STEPS, step + 1);
    setStep(nextStep);

    // If moving to step 7 (nutrition) and targets aren't populated yet, compute estimate
    if (nextStep === 7 && !getValues('targetCalories')) {
      applyMifflinEstimate();
    }
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

  const handleDaysChange = (days: string[]) => {
    setSelectedDays(days);
    const count = Math.max(2, Math.min(6, days.length || 2));
    setValue('weeklyFrequency', String(count), { shouldValidate: true });
  };

  const toggleEquipment = (item: Equipment) => {
    const current = getValues('equipment');
    const updated = current.includes(item)
      ? current.filter((x) => x !== item)
      : [...current, item];
    setValue('equipment', updated, { shouldValidate: true });
  };

  const togglePreferredEquipment = (item: Equipment) => {
    const current = getValues('preferredEquipment') ?? [];
    const updated = current.includes(item)
      ? current.filter((x) => x !== item)
      : [...current, item];
    setValue('preferredEquipment', updated, { shouldValidate: true });
  };

  const toggleDietaryPreference = (pref: string) => {
    const current = getValues('dietaryPreferences') ?? [];
    if (pref === 'none') {
      setValue('dietaryPreferences', current.includes('none') ? [] : ['none'], {
        shouldValidate: true,
      });
      return;
    }
    const filtered = current.filter((x) => x !== 'none');
    const updated = filtered.includes(pref)
      ? filtered.filter((x) => x !== pref)
      : [...filtered, pref];
    setValue('dietaryPreferences', updated, { shouldValidate: true });
  };

  const handleSelectExercise = (exercise: Exercise) => {
    if (exercisePickerTarget === 'preferred') {
      const current = getValues('preferredExercises') ?? [];
      if (!current.includes(exercise.name)) {
        setValue('preferredExercises', [...current, exercise.name], { shouldValidate: true });
      }
    } else if (exercisePickerTarget === 'avoid') {
      const current = getValues('avoidExercises') ?? [];
      if (!current.includes(exercise.name)) {
        setValue('avoidExercises', [...current, exercise.name], { shouldValidate: true });
      }
    }
    setExercisePickerTarget(null);
  };

  const removeExercise = (target: 'preferred' | 'avoid', name: string) => {
    if (target === 'preferred') {
      const current = getValues('preferredExercises') ?? [];
      setValue(
        'preferredExercises',
        current.filter((x) => x !== name),
        { shouldValidate: true }
      );
    } else {
      const current = getValues('avoidExercises') ?? [];
      setValue(
        'avoidExercises',
        current.filter((x) => x !== name),
        { shouldValidate: true }
      );
    }
    pressLight();
  };

  const selectedEquipment = watch('equipment');
  const preferredEquipment = watch('preferredEquipment') ?? [];
  const preferredExercises = watch('preferredExercises') ?? [];
  const avoidExercises = watch('avoidExercises') ?? [];
  const dietaryPreferences = watch('dietaryPreferences') ?? [];
  const primaryGoal = watch('primaryGoal');
  const secondaryGoal = watch('secondaryGoal');
  const experienceLevel = watch('experienceLevel');
  const gender = watch('gender');
  const weightUnit = watch('weightUnit');
  const timezone = watch('timezone');
  const workoutDuration = watch('workoutDuration');
  const trainingLocation = watch('trainingLocation');

  const titles = [
    { title: t('onboarding.aboutTitle'), subtitle: t('onboarding.aboutSubtitle') },
    { title: t('onboarding.bodyTitle'), subtitle: t('onboarding.bodySubtitle') },
    { title: t('onboarding.goalTitle'), subtitle: t('onboarding.goalSubtitle') },
    { title: t('onboarding.trainingTitle'), subtitle: t('onboarding.trainingSubtitle') },
    { title: t('onboarding.equipmentTitle'), subtitle: t('onboarding.equipmentSubtitle') },
    { title: t('onboarding.preferencesTitle'), subtitle: t('onboarding.preferencesSubtitle') },
    { title: t('onboarding.nutritionTitle'), subtitle: t('onboarding.nutritionSubtitle') },
  ];

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
      <View style={[styles.container, { backgroundColor: colors.accent }]}>
        <View style={{ height: insets.top }} />
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
  // Steps 1..7: Onboarding Wizard Steps
  // -------------------------------------------------------------------------
  const formIndex = step - 1;

  return (
    <View style={[styles.container, { backgroundColor: colors.bg }]}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        {/* Step Header */}
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
            {/* Step 1: About you (§4.1) */}
            {step === 1 ? (
              <View style={{ gap: spacing.lg }}>
                <Controller
                  control={control}
                  name="displayName"
                  render={({ field, fieldState }) => (
                    <Input
                      label={t('onboarding.name')}
                      placeholder={t('onboarding.namePlaceholder')}
                      value={field.value}
                      onChangeText={field.onChange}
                      onBlur={field.onBlur}
                      error={fieldState.error ? t('onboarding.errors.nameRequired') : undefined}
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
                    {t('onboarding.gender')}
                  </Text>
                  <View style={{ gap: spacing.sm }}>
                    {Gender.options.map((g) => (
                      <SelectCard
                        key={g}
                        title={t(`onboarding.genders.${g}`)}
                        description={t(`onboarding.genderDescriptions.${g}`)}
                        selected={gender === g}
                        onPress={() => setValue('gender', g, { shouldValidate: true })}
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

            {/* Step 2: Your body (§5, §5.1) */}
            {step === 2 ? (
              <View style={{ gap: spacing.lg }}>
                <Controller
                  control={control}
                  name="heightCm"
                  render={({ field, fieldState }) => (
                    <Input
                      label={t('onboarding.height')}
                      placeholder={t('onboarding.heightPlaceholder')}
                      keyboardType="numeric"
                      value={field.value}
                      onChangeText={field.onChange}
                      onBlur={field.onBlur}
                      error={fieldState.error ? t('onboarding.errors.heightRange') : undefined}
                    />
                  )}
                />
                <Text style={[type.secondary, { color: colors.inkMutedText, marginTop: -spacing.sm }]}>
                  {t('onboarding.heightHint')}
                </Text>

                <Controller
                  control={control}
                  name="weightKg"
                  render={({ field, fieldState }) => (
                    <Input
                      label={t('onboarding.weight')}
                      placeholder={t('onboarding.weightPlaceholder')}
                      keyboardType="numeric"
                      value={field.value}
                      onChangeText={field.onChange}
                      onBlur={field.onBlur}
                      error={fieldState.error ? t('onboarding.errors.weightRange') : undefined}
                    />
                  )}
                />

                <Controller
                  control={control}
                  name="bodyFatPct"
                  render={({ field }) => (
                    <Input
                      label={t('onboarding.bodyFat')}
                      placeholder={t('onboarding.bodyFatPlaceholder')}
                      keyboardType="numeric"
                      value={field.value}
                      onChangeText={field.onChange}
                      onBlur={field.onBlur}
                    />
                  )}
                />

                <Controller
                  control={control}
                  name="targetWeightKg"
                  render={({ field }) => (
                    <Input
                      label={t('onboarding.targetWeight')}
                      placeholder={t('onboarding.targetWeightPlaceholder')}
                      keyboardType="numeric"
                      value={field.value}
                      onChangeText={field.onChange}
                      onBlur={field.onBlur}
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
              </View>
            ) : null}

            {/* Step 3: Goals (§5.1) */}
            {step === 3 ? (
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

            {/* Step 4: Training Profile (§6) */}
            {step === 4 ? (
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

                {/* Training Schedule via DaySelector (2-6 days) */}
                <View style={{ gap: spacing.sm, marginTop: spacing.md }}>
                  <Text style={[type.cardLabel, { color: colors.inkMutedText }]}>
                    {t('onboarding.trainingDaysTitle')}
                  </Text>
                  <DaySelector
                    selectedDays={selectedDays}
                    onChange={handleDaysChange}
                  />
                  <Text style={[type.secondary, { color: colors.inkMutedText }]}>
                    {t('onboarding.trainingDaysCount', { count: selectedDays.length || 2 })}
                  </Text>
                </View>

                {/* Workout Duration */}
                <View style={{ gap: spacing.xs, marginTop: spacing.md }}>
                  <Text style={[type.cardLabel, { color: colors.inkMutedText }]}>
                    {t('onboarding.durationTitle')}
                  </Text>
                  <View style={styles.chipWrap}>
                    {WorkoutDuration.options.map((d) => (
                      <Chip
                        key={d}
                        label={t(`onboarding.durations.${d}`)}
                        selected={workoutDuration === d}
                        onPress={() => {
                          selectionTick();
                          setValue('workoutDuration', d, { shouldValidate: true });
                        }}
                      />
                    ))}
                  </View>
                </View>

                {/* Training Location */}
                <View style={{ gap: spacing.xs, marginTop: spacing.md }}>
                  <Text style={[type.cardLabel, { color: colors.inkMutedText }]}>
                    {t('onboarding.locationTitle')}
                  </Text>
                  <View style={{ gap: spacing.sm }}>
                    {TrainingLocation.options.map((loc) => (
                      <SelectCard
                        key={loc}
                        title={t(`onboarding.locations.${loc}`)}
                        selected={trainingLocation === loc}
                        onPress={() => setValue('trainingLocation', loc, { shouldValidate: true })}
                      />
                    ))}
                  </View>
                </View>
              </View>
            ) : null}

            {/* Step 5: Equipment (§7 - All 12 items) */}
            {step === 5 ? (
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

            {/* Step 6: Training Preferences (§8) */}
            {step === 6 ? (
              <View style={{ gap: spacing.lg }}>
                {/* Preferred Equipment */}
                <View style={{ gap: spacing.xs }}>
                  <Text style={[type.cardLabel, { color: colors.inkMutedText }]}>
                    {t('onboarding.preferredEquipmentLabel')}
                  </Text>
                  <View style={styles.chipWrap}>
                    {selectedEquipment.map((item) => (
                      <Chip
                        key={`pref-eq-${item}`}
                        label={t(`onboarding.equipment.${item}`)}
                        selected={preferredEquipment.includes(item)}
                        onPress={() => togglePreferredEquipment(item)}
                      />
                    ))}
                  </View>
                </View>

                {/* Preferred Exercises */}
                <View style={{ gap: spacing.sm, marginTop: spacing.md }}>
                  <View style={styles.rowBetween}>
                    <Text style={[type.cardLabel, { color: colors.inkMutedText }]}>
                      {t('onboarding.preferredExercisesLabel')}
                    </Text>
                    <Pressable
                      style={[styles.addButton, { backgroundColor: colors.accentSoft }]}
                      onPress={() => setExercisePickerTarget('preferred')}
                    >
                      <Plus size={16} color={colors.accentText} />
                      <Text style={[type.caption, { color: colors.accentText, fontWeight: '600' }]}>
                        {t('onboarding.addExercise')}
                      </Text>
                    </Pressable>
                  </View>
                  <View style={styles.chipWrap}>
                    {preferredExercises.length === 0 ? (
                      <Text style={[type.secondary, { color: colors.inkMutedText }]}>
                        {t('onboarding.noExercisesAdded')}
                      </Text>
                    ) : (
                      preferredExercises.map((name) => (
                        <View
                          key={`pref-ex-${name}`}
                          style={[
                            styles.removableChip,
                            { backgroundColor: colors.surface, borderColor: colors.accent },
                          ]}
                        >
                          <Text style={[type.body, { color: colors.ink, fontSize: 14 }]}>{name}</Text>
                          <Pressable
                            hitSlop={8}
                            onPress={() => removeExercise('preferred', name)}
                          >
                            <X size={14} color={colors.inkMutedText} />
                          </Pressable>
                        </View>
                      ))
                    )}
                  </View>
                </View>

                {/* Exercises to Avoid */}
                <View style={{ gap: spacing.sm, marginTop: spacing.md }}>
                  <View style={styles.rowBetween}>
                    <Text style={[type.cardLabel, { color: colors.inkMutedText }]}>
                      {t('onboarding.avoidExercisesLabel')}
                    </Text>
                    <Pressable
                      style={[styles.addButton, { backgroundColor: colors.accentSoft }]}
                      onPress={() => setExercisePickerTarget('avoid')}
                    >
                      <Plus size={16} color={colors.accentText} />
                      <Text style={[type.caption, { color: colors.accentText, fontWeight: '600' }]}>
                        {t('onboarding.addExercise')}
                      </Text>
                    </Pressable>
                  </View>
                  <View style={styles.chipWrap}>
                    {avoidExercises.length === 0 ? (
                      <Text style={[type.secondary, { color: colors.inkMutedText }]}>
                        {t('onboarding.noExercisesAdded')}
                      </Text>
                    ) : (
                      avoidExercises.map((name) => (
                        <View
                          key={`avoid-ex-${name}`}
                          style={[
                            styles.removableChip,
                            { backgroundColor: colors.surface, borderColor: colors.danger },
                          ]}
                        >
                          <Text style={[type.body, { color: colors.ink, fontSize: 14 }]}>{name}</Text>
                          <Pressable
                            hitSlop={8}
                            onPress={() => removeExercise('avoid', name)}
                          >
                            <X size={14} color={colors.inkMutedText} />
                          </Pressable>
                        </View>
                      ))
                    )}
                  </View>
                </View>
              </View>
            ) : null}

            {/* Step 7: Nutrition Profile (§9) */}
            {step === 7 ? (
              <View style={{ gap: spacing.lg }}>
                {/* Method selector: Auto vs Manual */}
                <View style={{ gap: spacing.xs }}>
                  <Text style={[type.cardLabel, { color: colors.inkMutedText }]}>
                    {t('onboarding.calculationMode')}
                  </Text>
                  <SegmentedControl
                    options={[
                      { label: t('onboarding.autoMode'), value: 'auto' },
                      { label: t('onboarding.manualMode'), value: 'manual' },
                    ]}
                    value={calcMode}
                    onChange={(val) => {
                      setCalcMode(val);
                      if (val === 'auto') applyMifflinEstimate();
                    }}
                  />
                </View>

                {/* Estimate Notice */}
                <Text style={[type.secondary, { color: colors.inkMutedText }]}>
                  {gender === 'other' || gender === 'prefer_not_to_say'
                    ? t('onboarding.estimateMedianNotice')
                    : t('onboarding.estimateNotice')}
                </Text>

                {calcMode === 'manual' ? (
                  <View style={{ gap: spacing.xs }}>
                    <SecondaryButton
                      label={t('onboarding.estimate')}
                      onPress={applyMifflinEstimate}
                    />
                    <Text style={[type.secondary, { color: colors.inkMutedText, textAlign: 'center' }]}>
                      {t('onboarding.estimateHint')}
                    </Text>
                  </View>
                ) : null}

                {/* Nutrition Targets */}
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

                {/* Dietary Preferences Chip List */}
                <View style={{ gap: spacing.xs, marginTop: spacing.md }}>
                  <Text style={[type.cardLabel, { color: colors.inkMutedText }]}>
                    {t('onboarding.dietaryTitle')}
                  </Text>
                  <View style={styles.chipWrap}>
                    {DIETARY_PREFERENCES.map((pref) => (
                      <Chip
                        key={`diet-${pref}`}
                        label={t(`onboarding.dietary.${pref}`)}
                        selected={dietaryPreferences.includes(pref)}
                        onPress={() => toggleDietaryPreference(pref)}
                      />
                    ))}
                  </View>
                </View>
              </View>
            ) : null}
          </Animated.View>

          {formError ? (
            <Text style={{ color: colors.danger, ...type.body }}>{formError}</Text>
          ) : null}
        </ScrollView>

        {/* Sticky footer */}
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

      {/* Exercise Picker Modal for Step 6 */}
      {exercisePickerTarget ? (
        <ExercisePicker
          visible={Boolean(exercisePickerTarget)}
          onClose={() => setExercisePickerTarget(null)}
          onSelect={handleSelectExercise}
        />
      ) : null}
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
    overflow: 'hidden',
  },
  welcomeContent: {
    flexGrow: 1,
    justifyContent: 'space-between',
  },
  clusterContainer: {
    height: 190,
    width: '100%',
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
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
  },
  progressContainer: {
    flex: 1,
    gap: 6,
  },
  progressBarTrack: {
    height: 6,
    width: '100%',
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
    gap: 8,
  },
  gridItem: {
    width: '48.5%',
  },
  rowBetween: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 16,
  },
  removableChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
  },
  footer: {
    borderTopWidth: StyleSheet.hairlineWidth,
  },
});
