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
import { useState } from 'react';
import { Controller, useForm, type Path } from 'react-hook-form';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Button, Chip, Input, ScreenHeader } from '@/components/ui';
import { useCompleteOnboarding } from '@/features/onboarding/use-complete-onboarding';
import { useTokens } from '@/hooks/use-tokens';
import { t } from '@/i18n';

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

function toPayload(values: FormValues): OnboardingInput {
  return {
    displayName: values.displayName,
    dateOfBirth: new Date(values.dateOfBirth),
    weightUnit: values.weightUnit,
    timezone: values.timezone,
    primaryGoal: values.primaryGoal as OnboardingInput['primaryGoal'],
    secondaryGoal: values.secondaryGoal ? (values.secondaryGoal as OnboardingInput['secondaryGoal']) : null,
    experienceLevel: values.experienceLevel as OnboardingInput['experienceLevel'],
    weeklyFrequency: Number(values.weeklyFrequency),
    equipment: values.equipment,
    targetCalories: Number(values.targetCalories),
    targetProtein: Number(values.targetProtein),
    targetCarbs: Number(values.targetCarbs),
    targetFat: Number(values.targetFat),
  };
}

const STEP_SCHEMAS = [
  onboardingBasicsSchema,
  onboardingGoalSchema,
  onboardingTrainingSchema,
  onboardingEquipmentSchema,
  onboardingNutritionSchema,
];

export default function OnboardingScreen() {
  const { colors, spacing, fontSize, fontWeight } = useTokens();
  const [step, setStep] = useState(0);
  const [formError, setFormError] = useState<string | null>(null);
  const complete = useCompleteOnboarding();

  const { control, trigger, getValues, setValue, setError, watch } = useForm<FormValues>({
    mode: 'onChange',
    defaultValues: {
      displayName: '',
      dateOfBirth: '',
      weightUnit: 'kg',
      timezone: 'UTC',
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
  // inputs to the payload shape) and surface field errors.
  const validateStep = (index: number): boolean => {
    const payload = toPayload(getValues());
    const result = STEP_SCHEMAS[index].safeParse(payload);
    if (result.success) {
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
      return;
    }
    setStep((s) => Math.min(TOTAL_STEPS - 1, s + 1));
  };

  const submit = async () => {
    setFormError(null);
    const payload = toPayload(getValues());
    const result = onboardingSchema.safeParse(payload);
    if (!result.success) {
      setFormError(t('common.somethingWentWrong'));
      return;
    }
    try {
      await complete.mutateAsync(result.data);
    } catch {
      setFormError(t('common.somethingWentWrong'));
    }
  };

  const back = () => {
    setFormError(null);
    setStep((s) => Math.max(0, s - 1));
  };

  const selectedEquipment = watch('equipment');
  const primaryGoal = watch('primaryGoal');
  const secondaryGoal = watch('secondaryGoal');
  const experienceLevel = watch('experienceLevel');
  const weightUnit = watch('weightUnit');

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

  return (
    <View style={[styles.container, { backgroundColor: colors.bg }]}>
      <SafeAreaView style={styles.safeArea}>
        <KeyboardAvoidingView
          style={styles.flex}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          <ScrollView
            contentContainerStyle={[styles.content, { padding: spacing.xl, gap: spacing.lg }]}
            keyboardShouldPersistTaps="handled"
          >
            <Text style={labelStyle}>
              {t('onboarding.stepLabel', { current: step + 1, total: TOTAL_STEPS })}
            </Text>
            <ScreenHeader title={titles[step].title} subtitle={titles[step].subtitle} />

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
                    <Input
                      label={t('onboarding.dateOfBirth')}
                      placeholder={t('onboarding.dateOfBirthPlaceholder')}
                      autoCapitalize="none"
                      value={field.value}
                      onChangeText={field.onChange}
                      onBlur={field.onBlur}
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
                <Controller
                  control={control}
                  name="timezone"
                  render={({ field, fieldState }) => (
                    <Input
                      label={t('onboarding.timezone')}
                      autoCapitalize="none"
                      value={field.value}
                      onChangeText={field.onChange}
                      onBlur={field.onBlur}
                      error={fieldState.error ? t('onboarding.errors.required') : undefined}
                    />
                  )}
                />
              </View>
            ) : null}

            {step === 1 ? (
              <View style={{ gap: spacing.lg }}>
                <View style={styles.chipWrap}>
                  {FitnessGoal.options.map((goal) => (
                    <Chip
                      key={goal}
                      label={t(`onboarding.goals.${goal}`)}
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
                <View style={styles.chipWrap}>
                  {Difficulty.options.map((level) => (
                    <Chip
                      key={level}
                      label={t(`onboarding.experienceLevels.${level}`)}
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
              <View style={styles.chipWrap}>
                {Equipment.options.map((item) => (
                  <Chip
                    key={item}
                    label={t(`onboarding.equipment.${item}`)}
                    selected={selectedEquipment.includes(item)}
                    onPress={() => toggleEquipment(item)}
                  />
                ))}
              </View>
            ) : null}

            {step === 4 ? (
              <View style={{ gap: spacing.lg }}>
                {(
                  [
                    ['targetCalories', t('onboarding.calories')],
                    ['targetProtein', t('onboarding.protein')],
                    ['targetCarbs', t('onboarding.carbs')],
                    ['targetFat', t('onboarding.fat')],
                  ] as const
                ).map(([name, label]) => (
                  <Controller
                    key={name}
                    control={control}
                    name={name}
                    render={({ field, fieldState }) => (
                      <Input
                        label={label}
                        keyboardType="number-pad"
                        value={field.value}
                        onChangeText={field.onChange}
                        onBlur={field.onBlur}
                        error={fieldState.error ? t('onboarding.errors.number') : undefined}
                      />
                    )}
                  />
                ))}
              </View>
            ) : null}

            {formError ? (
              <Text style={{ color: colors.danger, fontSize: fontSize.body }}>{formError}</Text>
            ) : null}

            <View style={[styles.actions, { gap: spacing.md }]}>
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
          </ScrollView>
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
  actions: { flexDirection: 'row' },
  flexBtn: { flex: 1 },
});
