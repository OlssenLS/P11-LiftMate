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
import { useState } from 'react';
import { Controller, useForm, type Path } from 'react-hook-form';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, View } from 'react-native';
import Animated, { FadeIn, FadeOut } from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';

import {
  Button,
  Chip,
  DatePicker,
  EquipmentCard,
  Input,
  NutritionField,
  ScreenHeader,
  SelectCard,
} from '@/components/ui';
import { useCompleteOnboarding } from '@/features/onboarding/use-complete-onboarding';
import { useTokens } from '@/hooks/use-tokens';
import { t } from '@/i18n';
import { notifyError, notifySuccess, pressLight } from '@/lib/haptics';

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

const STEP_FIELDS: Path<FormValues>[][] = [
  ['displayName', 'dateOfBirth', 'weightUnit', 'timezone'],
  ['primaryGoal'],
  ['experienceLevel', 'weeklyFrequency'],
  ['equipment'],
  ['targetCalories', 'targetProtein', 'targetCarbs', 'targetFat'],
];

const TOTAL_STEPS = STEP_FIELDS.length;

/** Timezones offered as quick picks (Indonesia first; UTC as a fallback). */
const TIMEZONE_OPTIONS = ['Asia/Jakarta', 'Asia/Makassar', 'Asia/Jayapura', 'UTC'] as const;

/** Per-field error copy for the nutrition step so failures are specific. */
const NUTRITION_ERROR_KEYS = {
  targetCalories: 'onboarding.errors.caloriesRange',
  targetProtein: 'onboarding.errors.proteinRange',
  targetCarbs: 'onboarding.errors.carbsRange',
  targetFat: 'onboarding.errors.fatRange',
} as const;

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
 * Rough starting macros from the primary goal, so a confused user can tap
 * "Estimate for me" and get sensible, editable numbers. These are deliberate
 * ballpark presets (not a clinical calculation) and are clearly editable.
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

const STEP_SCHEMAS = [
  onboardingBasicsSchema,
  onboardingGoalSchema,
  onboardingTrainingSchema,
  onboardingEquipmentSchema,
  onboardingNutritionSchema,
];

/**
 * Turn a thrown onboarding error into a specific, user-facing message so the
 * failure is diagnosable instead of a blanket "something went wrong".
 *
 * Distinguishes: no network/no response, an HTTP error (surfacing the server's
 * message/status), and a response that failed client-side schema parsing.
 */
function describeSubmitError(err: unknown): string {
  if (isAxiosError(err)) {
    if (!err.response) {
      // Request left the app but no response came back (server down, wrong
      // host/IP, device not on the same network, timeout, CORS).
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
    // The request succeeded but the response shape did not match the schema.
    return t('onboarding.submitErrors.response');
  }
  return t('common.somethingWentWrong');
}

export default function OnboardingScreen() {
  const { colors, spacing, fontSize, fontWeight } = useTokens();
  const [step, setStep] = useState(0);
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

  // Validate the current step against its staged schema (coercing the string
  // inputs to the payload shape) and surface per-field errors so the user sees
  // exactly what to fix — including on the final (nutrition) step.
  const validateStep = (index: number): boolean => {
    const payload = toPayload(getValues());
    const result = STEP_SCHEMAS[index].safeParse(payload);
    if (result.success) {
      clearErrors(STEP_FIELDS[index]);
      return true;
    }
    const fieldErrors = result.error.flatten().fieldErrors as Record<string, string[] | undefined>;
    for (const field of STEP_FIELDS[index]) {
      if (fieldErrors[field]) {
        setError(field, { type: 'manual' });
      }
    }
    return false;
  };

  const next = async () => {
    setFormError(null);
    await trigger(STEP_FIELDS[step]);
    if (!validateStep(step)) {
      notifyError();
      return;
    }
    pressLight();
    setStep((s) => Math.min(TOTAL_STEPS - 1, s + 1));
  };

  const submit = async () => {
    setFormError(null);
    // Run the final step's per-field validation first so a bad macro shows a
    // specific field error instead of a generic "something went wrong".
    if (!validateStep(TOTAL_STEPS - 1)) {
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

  const labelStyle = {
    color: colors.inkMuted,
    fontSize: fontSize.label,
    fontWeight: fontWeight.semibold,
    textTransform: 'uppercase' as const,
    letterSpacing: 1,
  };

  const helpStyle = { color: colors.inkMuted, fontSize: fontSize.label, lineHeight: 18 };

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

  return (
    <View style={[styles.container, { backgroundColor: colors.bg }]}>
      <SafeAreaView style={styles.safeArea}>
        <KeyboardAvoidingView
          style={styles.flex}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
          <ScrollView
            style={styles.flex}
            contentContainerStyle={[styles.content, { padding: spacing.xl, gap: spacing.lg }]}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            <Text style={labelStyle}>
              {t('onboarding.stepLabel', { current: step + 1, total: TOTAL_STEPS })}
            </Text>
            <ScreenHeader title={titles[step].title} subtitle={titles[step].subtitle} />

            <Animated.View
              key={step}
              entering={FadeIn.duration(220)}
              exiting={FadeOut.duration(120)}
              style={{ gap: spacing.lg }}
            >
              {step === 0 ? (
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
                  <View style={{ gap: spacing.sm }}>
                    <Text style={labelStyle}>{t('onboarding.weightUnit')}</Text>
                    <View style={styles.chipRow}>
                      {(['kg', 'lb'] as const).map((unit) => (
                        <Chip
                          key={unit}
                          label={unit.toUpperCase()}
                          selected={weightUnit === unit}
                          onPress={() => setValue('weightUnit', unit, { shouldValidate: true })}
                        />
                      ))}
                    </View>
                  </View>
                  <View style={{ gap: spacing.sm }}>
                    <Text style={labelStyle}>{t('onboarding.timezone')}</Text>
                    <View style={styles.chipWrap}>
                      {TIMEZONE_OPTIONS.map((tz) => (
                        <Chip
                          key={tz}
                          label={t(`onboarding.timezones.${tz}`)}
                          selected={timezone === tz}
                          onPress={() => setValue('timezone', tz, { shouldValidate: true })}
                        />
                      ))}
                    </View>
                    <Text style={helpStyle}>{t('onboarding.timezoneHelp')}</Text>
                  </View>
                </View>
              ) : null}

              {step === 1 ? (
                <View style={{ gap: spacing.lg }}>
                  <Text style={labelStyle}>{t('onboarding.primaryGoal')}</Text>
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
                  <Text style={labelStyle}>{t('onboarding.secondaryGoal')}</Text>
                  <View style={styles.chipWrap}>
                    {FitnessGoal.options.map((goal) => (
                      <Chip
                        key={`sec-${goal}`}
                        label={t(`onboarding.goals.${goal}`)}
                        selected={secondaryGoal === goal}
                        onPress={() =>
                          setValue('secondaryGoal', secondaryGoal === goal ? '' : goal, {
                            shouldValidate: true,
                          })
                        }
                      />
                    ))}
                  </View>
                </View>
              ) : null}

              {step === 2 ? (
                <View style={{ gap: spacing.lg }}>
                  <Text style={labelStyle}>{t('onboarding.experience')}</Text>
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
                  <Controller
                    control={control}
                    name="weeklyFrequency"
                    render={({ field, fieldState }) => (
                      <Input
                        label={t('onboarding.weeklyFrequency')}
                        keyboardType="number-pad"
                        value={field.value}
                        onChangeText={field.onChange}
                        onBlur={field.onBlur}
                        error={fieldState.error ? t('onboarding.errors.number') : undefined}
                      />
                    )}
                  />
                </View>
              ) : null}

              {step === 3 ? (
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
                  <Text style={helpStyle}>{t('onboarding.equipmentHint')}</Text>
                </View>
              ) : null}

              {step === 4 ? (
                <View style={{ gap: spacing.lg }}>
                  <Text style={helpStyle}>{t('onboarding.nutritionHelp')}</Text>
                  <View style={{ gap: spacing.sm }}>
                    <Button
                      label={t('onboarding.estimate')}
                      variant="secondary"
                      onPress={applyEstimate}
                    />
                    <Text style={helpStyle}>{t('onboarding.estimateHint')}</Text>
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
              <Text style={{ color: colors.danger, fontSize: fontSize.body }}>{formError}</Text>
            ) : null}
          </ScrollView>

          {/* Sticky footer: the back/continue controls sit in the exact same
              place on every step, outside the scroll area. */}
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
            {step > 0 ? (
              <Button
                label={t('common.back')}
                variant="secondary"
                style={styles.flexBtn}
                onPress={back}
              />
            ) : null}
            <Button
              label={step < TOTAL_STEPS - 1 ? t('common.continue') : t('onboarding.finish')}
              loading={complete.isPending}
              style={styles.flexBtn}
              onPress={() => void (step < TOTAL_STEPS - 1 ? next() : submit())}
            />
          </View>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  safeArea: { flex: 1 },
  flex: { flex: 1 },
  content: { flexGrow: 1 },
  chipRow: { flexDirection: 'row', gap: 8 },
  chipWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', marginHorizontal: -6 },
  gridItem: { width: '33.333%', paddingHorizontal: 6, paddingVertical: 6 },
  footer: {
    flexDirection: 'row',
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  flexBtn: { flex: 1 },
});
