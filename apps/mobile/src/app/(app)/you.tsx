import React, { useState } from 'react';
import {
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  View,
} from 'react-native';
import { useRouter } from 'expo-router';
import {
  Activity,
  Bell,
  Calendar,
  Clock,
  Dumbbell,
  Info,
  Key,
  LogOut,
  MapPin,
  Plus,
  Scale,
  Shield,
  Target,
  User,
  Utensils,
  X,
} from 'lucide-react-native';

import {
  Card,
  Chip,
  CircleButton,
  DatePicker,
  DaySelector,
  EquipmentCard,
  Input,
  LargeTitleHeader,
  ListGroup,
  ListRowCard,
  OfflineBanner,
  PrimaryButton,
  SectionHeader,
  SegmentedControl,
  SelectCard,
  Sheet,
} from '@/components/ui';
import { ExercisePicker } from '@/features/workout/exercise-picker';
import {
  useChangePassword,
  useProfile,
  useUpdateEquipment,
  useUpdatePreferences,
  useUpdateProfile,
  useUserEquipment,
  useUserPreferences,
} from '@/features/profile/use-profile-queries';
import { useTokens } from '@/hooks/use-tokens';
import { useTabScrollPadding } from '@/hooks/use-tab-scroll-padding';
import { t } from '@/i18n';
import { notifyError, notifySuccess, pressLight, selectionTick } from '@/lib/haptics';
import { useAuthStore } from '@/stores/auth-store';
import {
  DIETARY_PREFERENCES,
  Equipment,
  FitnessGoal,
  Gender,
  TrainingLocation,
  WorkoutDuration,
  deriveAgeFromDateOfBirth,
  type Exercise,
} from '@liftmate/shared';

import { USE_FIXTURES } from '@/config/env';
import { YOU_FIXTURES } from '@/dev/fixtures';

export default function YouScreen() {
  const router = useRouter();
  const { colors, radius, layout, type, icons, spacing } = useTokens();
  const bottomScrollPadding = useTabScrollPadding();
  const user = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.logout);

  // Queries
  const { data: profile } = useProfile();
  const { data: preferences } = useUserPreferences();
  const { data: equipmentList = [] } = useUserEquipment();

  // Mutations
  const updateProfile = useUpdateProfile();
  const updatePreferences = useUpdatePreferences();
  const updateEquipment = useUpdateEquipment();
  const changePassword = useChangePassword();

  // Active user data (fallback to auth store user)
  const activeUser = profile ?? user;

  // Active edit sheet key
  const [activeSheet, setActiveSheet] = useState<string | null>(null);

  // Draft states for sheets
  // 1. Profile draft
  const [draftName, setDraftName] = useState('');
  const [draftDob, setDraftDob] = useState('');
  const [draftGender, setDraftGender] = useState<Gender | null>(null);
  const [draftHeight, setDraftHeight] = useState('');
  const [draftWeight, setDraftWeight] = useState('');
  const [draftBodyFat, setDraftBodyFat] = useState('');
  const [draftTargetWeight, setDraftTargetWeight] = useState('');

  // 2. Goals draft
  const [draftPrimaryGoal, setDraftPrimaryGoal] = useState<FitnessGoal | null>(null);
  const [draftSecondaryGoal, setDraftSecondaryGoal] = useState<FitnessGoal | null>(null);

  // 3. Schedule draft
  const [draftDays, setDraftDays] = useState<string[]>(['mon', 'wed', 'fri']);
  const [draftDuration, setDraftDuration] = useState<WorkoutDuration | null>(null);
  const [draftLocation, setDraftLocation] = useState<TrainingLocation | null>(null);

  // 4. Equipment draft
  const [draftEquipment, setDraftEquipment] = useState<Equipment[]>([]);

  // 5. Training Preferences draft
  const [draftPreferredEquipment, setDraftPreferredEquipment] = useState<Equipment[]>([]);
  const [draftPreferredExercises, setDraftPreferredExercises] = useState<string[]>([]);
  const [draftAvoidExercises, setDraftAvoidExercises] = useState<string[]>([]);
  const [draftDietary, setDraftDietary] = useState<string[]>([]);
  const [exercisePickerTarget, setExercisePickerTarget] = useState<'preferred' | 'avoid' | null>(null);

  // 6. Units draft
  const [draftUnit, setDraftUnit] = useState<'kg' | 'lb'>('kg');

  // 7. Notifications draft
  const [draftWorkoutReminders, setDraftWorkoutReminders] = useState(true);
  const [draftNutritionReminders, setDraftNutritionReminders] = useState(true);
  const [draftProgressReminders, setDraftProgressReminders] = useState(true);
  const [draftAiInsight, setDraftAiInsight] = useState(true);

  // 8. Change Password draft
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordError, setPasswordError] = useState<string | null>(null);

  const onLogout = () => {
    Alert.alert(t('you.logoutConfirmTitle'), t('you.logoutConfirmBody'), [
      { text: t('common.cancel'), style: 'cancel' },
      {
        text: t('auth.logout'),
        style: 'destructive',
        onPress: () => {
          void logout();
        },
      },
    ]);
  };

  const initial = (activeUser?.displayName?.[0] ?? 'L').toUpperCase();
  const userAge = activeUser?.dateOfBirth ? deriveAgeFromDateOfBirth(activeUser.dateOfBirth) : null;

  // Open sheets with current values initialized
  const openSheet = (key: string) => {
    pressLight();
    if (key === 'profile') {
      setDraftName(activeUser?.displayName ?? '');
      setDraftDob(activeUser?.dateOfBirth ? new Date(activeUser.dateOfBirth).toISOString().slice(0, 10) : '');
      setDraftGender(activeUser?.gender ?? null);
      setDraftHeight(activeUser?.heightCm ? String(activeUser.heightCm) : '');
      setDraftWeight(activeUser?.weightKg ? String(activeUser.weightKg) : '');
      setDraftBodyFat(activeUser?.bodyFatPct ? String(activeUser.bodyFatPct) : '');
      setDraftTargetWeight(activeUser?.targetWeightKg ? String(activeUser.targetWeightKg) : '');
    } else if (key === 'goals') {
      setDraftPrimaryGoal(preferences?.primaryGoal ?? null);
      setDraftSecondaryGoal(preferences?.secondaryGoal ?? null);
    } else if (key === 'schedule') {
      const freq = preferences?.weeklyFrequency ?? 3;
      setDraftDays(['mon', 'wed', 'fri'].slice(0, freq));
      setDraftDuration(activeUser?.workoutDuration ?? null);
      setDraftLocation(activeUser?.trainingLocation ?? null);
    } else if (key === 'equipment') {
      setDraftEquipment(equipmentList);
    } else if (key === 'preferences') {
      setDraftPreferredEquipment(preferences?.preferredEquipment ?? []);
      setDraftPreferredExercises(preferences?.preferredExercises ?? []);
      setDraftAvoidExercises(preferences?.avoidExercises ?? []);
      setDraftDietary(preferences?.dietaryPreferences ?? []);
    } else if (key === 'units') {
      setDraftUnit(activeUser?.weightUnit ?? 'kg');
    } else if (key === 'notifications') {
      setDraftWorkoutReminders(preferences?.notificationsWorkoutReminder ?? true);
      setDraftNutritionReminders(preferences?.notificationsNutritionReminder ?? true);
      setDraftProgressReminders(preferences?.notificationsProgressReminder ?? true);
      setDraftAiInsight(preferences?.notificationsAiInsight ?? true);
    } else if (key === 'password') {
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setPasswordError(null);
    }
    setActiveSheet(key);
  };

  const saveProfile = async () => {
    try {
      await updateProfile.mutateAsync({
        displayName: draftName.trim() || undefined,
        dateOfBirth: draftDob ? new Date(draftDob) : null,
        gender: draftGender,
        heightCm: draftHeight ? Number(draftHeight) : null,
        weightKg: draftWeight ? Number(draftWeight) : null,
        bodyFatPct: draftBodyFat ? Number(draftBodyFat) : null,
        targetWeightKg: draftTargetWeight ? Number(draftTargetWeight) : null,
      });
      notifySuccess();
      setActiveSheet(null);
    } catch {
      notifyError();
    }
  };

  const saveGoals = async () => {
    try {
      await updatePreferences.mutateAsync({
        primaryGoal: draftPrimaryGoal,
        secondaryGoal: draftSecondaryGoal,
      });
      notifySuccess();
      setActiveSheet(null);
    } catch {
      notifyError();
    }
  };

  const saveSchedule = async () => {
    try {
      await updatePreferences.mutateAsync({
        weeklyFrequency: draftDays.length || 3,
      });
      await updateProfile.mutateAsync({
        workoutDuration: draftDuration,
        trainingLocation: draftLocation,
      });
      notifySuccess();
      setActiveSheet(null);
    } catch {
      notifyError();
    }
  };

  const saveEquipment = async () => {
    try {
      if (draftEquipment.length === 0) {
        Alert.alert(t('common.error'), t('onboarding.errors.pickEquipment'));
        return;
      }
      await updateEquipment.mutateAsync({ equipment: draftEquipment });
      notifySuccess();
      setActiveSheet(null);
    } catch {
      notifyError();
    }
  };

  const savePreferences = async () => {
    try {
      await updatePreferences.mutateAsync({
        preferredEquipment: draftPreferredEquipment,
        preferredExercises: draftPreferredExercises,
        avoidExercises: draftAvoidExercises,
        dietaryPreferences: draftDietary,
      });
      notifySuccess();
      setActiveSheet(null);
    } catch {
      notifyError();
    }
  };

  const saveUnits = async () => {
    try {
      await updateProfile.mutateAsync({ weightUnit: draftUnit });
      notifySuccess();
      setActiveSheet(null);
    } catch {
      notifyError();
    }
  };

  const saveNotifications = async () => {
    try {
      await updatePreferences.mutateAsync({
        notificationsWorkoutReminder: draftWorkoutReminders,
        notificationsNutritionReminder: draftNutritionReminders,
        notificationsProgressReminder: draftProgressReminders,
        notificationsAiInsight: draftAiInsight,
      });
      notifySuccess();
      setActiveSheet(null);
    } catch {
      notifyError();
    }
  };

  const savePassword = async () => {
    setPasswordError(null);
    if (!currentPassword) {
      setPasswordError(t('auth.errors.passwordMin'));
      return;
    }
    if (newPassword.length < 8) {
      setPasswordError(t('auth.errors.passwordMin'));
      return;
    }
    if (newPassword !== confirmPassword) {
      setPasswordError(t('you.passwordMismatch'));
      return;
    }

    try {
      await changePassword.mutateAsync({ currentPassword, newPassword });
      notifySuccess();
      Alert.alert(t('common.done'), t('you.passwordChanged'));
      setActiveSheet(null);
    } catch {
      notifyError();
      setPasswordError(t('auth.invalidCredentials'));
    }
  };

  const toggleDraftEquipment = (item: Equipment) => {
    selectionTick();
    setDraftEquipment((curr) =>
      curr.includes(item) ? curr.filter((x) => x !== item) : [...curr, item]
    );
  };

  const toggleDraftPreferredEquipment = (item: Equipment) => {
    selectionTick();
    setDraftPreferredEquipment((curr) =>
      curr.includes(item) ? curr.filter((x) => x !== item) : [...curr, item]
    );
  };

  const toggleDraftDietary = (pref: string) => {
    selectionTick();
    if (pref === 'none') {
      setDraftDietary((curr) => (curr.includes('none') ? [] : ['none']));
      return;
    }
    setDraftDietary((curr) => {
      const filtered = curr.filter((x) => x !== 'none');
      return filtered.includes(pref) ? filtered.filter((x) => x !== pref) : [...filtered, pref];
    });
  };

  const handleSelectExercise = (exercise: Exercise) => {
    if (exercisePickerTarget === 'preferred') {
      if (!draftPreferredExercises.includes(exercise.name)) {
        setDraftPreferredExercises([...draftPreferredExercises, exercise.name]);
      }
    } else if (exercisePickerTarget === 'avoid') {
      if (!draftAvoidExercises.includes(exercise.name)) {
        setDraftAvoidExercises([...draftAvoidExercises, exercise.name]);
      }
    }
    setExercisePickerTarget(null);
  };

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
        {/* Large Title Header with Back Action */}
        <LargeTitleHeader
          title="You"
          leading={
            <CircleButton
              variant="default"
              icon="back"
              accessibilityLabel="Go back"
              containerStyle={{ alignSelf: 'flex-start' }}
              onPress={() => {
                if (router.canGoBack()) {
                  router.back();
                } else {
                  router.replace('/(app)');
                }
              }}
            />
          }
        />

        <OfflineBanner />

        {/* User Profile Header Card */}
        <View style={styles.cardWrapper}>
          <Card variant="surface" padding="lg">
            <View style={styles.profileRow}>
              <View
                style={[
                  styles.avatarCircle,
                  {
                    backgroundColor: colors.accentSoft,
                    borderRadius: radius.pill,
                  },
                ]}
              >
                <Text style={[type.title, { color: colors.accentText }]}>
                  {initial}
                </Text>
              </View>

              <View style={styles.profileInfo}>
                <Text style={[type.eyebrow, { color: colors.accentText }]}>
                  {preferences?.primaryGoal
                    ? t(`onboarding.goals.${preferences.primaryGoal}`)
                    : USE_FIXTURES
                    ? YOU_FIXTURES.subtitle
                    : 'LIFTER'}
                </Text>
                <Text style={[type.sectionTitle, { color: colors.ink, marginTop: 2 }]} numberOfLines={1}>
                  {activeUser?.displayName ?? 'Lifter'}
                </Text>
                <Text style={[type.secondary, { color: colors.inkMutedText }]} numberOfLines={1}>
                  {userAge ? `${t('you.yearsOld', { age: userAge })} · ` : ''}
                  {activeUser?.email ?? 'user@liftmate.app'}
                </Text>
              </View>
            </View>
          </Card>
        </View>

        {/* Inset Group: Account & Program */}
        <SectionHeader title="Account & Program" />
        <View style={styles.cardWrapper}>
          <ListGroup>
            <ListRowCard
              label="Profile Details"
              subtitle={activeUser?.displayName ?? 'Lifter'}
              icon={
                <User
                  size={icons.cardLabelSize}
                  color={colors.accentText}
                  strokeWidth={icons.strokeWidth}
                />
              }
              onPress={() => openSheet('profile')}
            />
            <ListRowCard
              label="Goals & Targets"
              subtitle={
                preferences?.primaryGoal
                  ? t(`onboarding.goals.${preferences.primaryGoal}`)
                  : 'Not configured yet'
              }
              icon={
                <Target
                  size={icons.cardLabelSize}
                  color={colors.accentText}
                  strokeWidth={icons.strokeWidth}
                />
              }
              onPress={() => openSheet('goals')}
            />
            <ListRowCard
              label="Training Schedule"
              subtitle={`${preferences?.weeklyFrequency ?? 3} days scheduled / week`}
              icon={
                <Calendar
                  size={icons.cardLabelSize}
                  color={colors.accentText}
                  strokeWidth={icons.strokeWidth}
                />
              }
              onPress={() => openSheet('schedule')}
            />
            <ListRowCard
              label="Equipment"
              subtitle={
                equipmentList.length > 0
                  ? `${equipmentList.length} items configured`
                  : 'Not configured yet'
              }
              icon={
                <Dumbbell
                  size={icons.cardLabelSize}
                  color={colors.accentText}
                  strokeWidth={icons.strokeWidth}
                />
              }
              onPress={() => openSheet('equipment')}
            />
            <ListRowCard
              label="Training Preferences"
              subtitle={
                preferences?.dietaryPreferences?.length
                  ? preferences.dietaryPreferences.join(', ')
                  : 'Custom gear & exercises'
              }
              icon={
                <Utensils
                  size={icons.cardLabelSize}
                  color={colors.accentText}
                  strokeWidth={icons.strokeWidth}
                />
              }
              onPress={() => openSheet('preferences')}
            />
          </ListGroup>
        </View>

        {/* Inset Group: Body Metrics */}
        <SectionHeader title={t('you.bodyMetrics')} />
        <View style={styles.cardWrapper}>
          <ListGroup>
            <ListRowCard
              label={t('you.height')}
              value={activeUser?.heightCm ? `${activeUser.heightCm} cm` : t('you.add')}
              icon={
                <Activity
                  size={icons.cardLabelSize}
                  color={colors.accentText}
                  strokeWidth={icons.strokeWidth}
                />
              }
              onPress={() => openSheet('profile')}
            />
            <ListRowCard
              label={t('you.weight')}
              value={activeUser?.weightKg ? `${activeUser.weightKg} ${activeUser?.weightUnit ?? 'kg'}` : t('you.add')}
              icon={
                <Scale
                  size={icons.cardLabelSize}
                  color={colors.accentText}
                  strokeWidth={icons.strokeWidth}
                />
              }
              onPress={() => openSheet('profile')}
            />
            <ListRowCard
              label={t('you.bodyFat')}
              value={activeUser?.bodyFatPct ? `${activeUser.bodyFatPct}%` : t('you.add')}
              icon={
                <Activity
                  size={icons.cardLabelSize}
                  color={colors.accentText}
                  strokeWidth={icons.strokeWidth}
                />
              }
              onPress={() => openSheet('profile')}
            />
            <ListRowCard
              label={t('you.targetWeight')}
              value={activeUser?.targetWeightKg ? `${activeUser.targetWeightKg} ${activeUser?.weightUnit ?? 'kg'}` : t('you.add')}
              icon={
                <Target
                  size={icons.cardLabelSize}
                  color={colors.accentText}
                  strokeWidth={icons.strokeWidth}
                />
              }
              onPress={() => openSheet('profile')}
            />
            <ListRowCard
              label={t('you.gender')}
              value={activeUser?.gender ? t(`onboarding.genders.${activeUser.gender}`) : t('you.add')}
              icon={
                <User
                  size={icons.cardLabelSize}
                  color={colors.accentText}
                  strokeWidth={icons.strokeWidth}
                />
              }
              onPress={() => openSheet('profile')}
            />
            <ListRowCard
              label={t('you.workoutDuration')}
              value={activeUser?.workoutDuration ? t(`onboarding.durations.${activeUser.workoutDuration}`) : t('you.add')}
              icon={
                <Clock
                  size={icons.cardLabelSize}
                  color={colors.accentText}
                  strokeWidth={icons.strokeWidth}
                />
              }
              onPress={() => openSheet('schedule')}
            />
            <ListRowCard
              label={t('you.trainingLocation')}
              value={activeUser?.trainingLocation ? t(`onboarding.locations.${activeUser.trainingLocation}`) : t('you.add')}
              icon={
                <MapPin
                  size={icons.cardLabelSize}
                  color={colors.accentText}
                  strokeWidth={icons.strokeWidth}
                />
              }
              onPress={() => openSheet('schedule')}
            />
          </ListGroup>
        </View>

        {/* Inset Group: Preferences */}
        <SectionHeader title="Preferences" />
        <View style={styles.cardWrapper}>
          <ListGroup>
            <ListRowCard
              label="Units"
              value={(activeUser?.weightUnit ?? 'kg').toUpperCase()}
              icon={
                <Scale
                  size={icons.cardLabelSize}
                  color={colors.accentText}
                  strokeWidth={icons.strokeWidth}
                />
              }
              onPress={() => openSheet('units')}
            />
            <ListRowCard
              label="Notifications"
              value="Rest timer & reminders"
              icon={
                <Bell
                  size={icons.cardLabelSize}
                  color={colors.accentText}
                  strokeWidth={icons.strokeWidth}
                />
              }
              onPress={() => openSheet('notifications')}
            />
            <ListRowCard
              label="Account & Password"
              value="Change Password"
              icon={
                <Key
                  size={icons.cardLabelSize}
                  color={colors.accentText}
                  strokeWidth={icons.strokeWidth}
                />
              }
              onPress={() => openSheet('password')}
            />
            <ListRowCard
              label="Privacy & Data"
              icon={
                <Shield
                  size={icons.cardLabelSize}
                  color={colors.accentText}
                  strokeWidth={icons.strokeWidth}
                />
              }
              onPress={() => openSheet('privacy')}
            />
            <ListRowCard
              label="About"
              value="v1.0.0 (MVP)"
              icon={
                <Info
                  size={icons.cardLabelSize}
                  color={colors.accentText}
                  strokeWidth={icons.strokeWidth}
                />
              }
              onPress={() => openSheet('about')}
            />
          </ListGroup>
        </View>

        {/* Inset Group: Sign Out */}
        <View style={[styles.cardWrapper, { marginTop: layout.sectionGap }]}>
          <ListGroup>
            <ListRowCard
              label="Sign Out"
              showChevron={false}
              icon={
                <LogOut
                  size={icons.cardLabelSize}
                  color={colors.danger}
                  strokeWidth={icons.strokeWidth}
                />
              }
              onPress={onLogout}
            />
          </ListGroup>
        </View>
      </ScrollView>

      {/* 1. Edit Profile Sheet */}
      <Sheet
        visible={activeSheet === 'profile'}
        onClose={() => setActiveSheet(null)}
        onConfirm={saveProfile}
        title={t('you.editProfileTitle')}
        mode="edit"
      >
        <ScrollView style={styles.sheetScroll} showsVerticalScrollIndicator={false}>
          <View style={{ gap: spacing.md, paddingVertical: spacing.sm }}>
            <Input
              label={t('onboarding.name')}
              value={draftName}
              onChangeText={setDraftName}
            />
            <DatePicker
              label={t('onboarding.dateOfBirth')}
              value={draftDob}
              onChange={setDraftDob}
            />
            <View style={{ gap: spacing.xs }}>
              <Text style={[type.cardLabel, { color: colors.inkMutedText }]}>{t('onboarding.gender')}</Text>
              <View style={styles.chipWrap}>
                {Gender.options.map((g) => (
                  <Chip
                    key={g}
                    label={t(`onboarding.genders.${g}`)}
                    selected={draftGender === g}
                    onPress={() => {
                      selectionTick();
                      setDraftGender(g);
                    }}
                  />
                ))}
              </View>
            </View>
            <Input
              label={t('onboarding.height')}
              keyboardType="numeric"
              value={draftHeight}
              onChangeText={setDraftHeight}
            />
            <Input
              label={t('onboarding.weight')}
              keyboardType="numeric"
              value={draftWeight}
              onChangeText={setDraftWeight}
            />
            <Input
              label={t('onboarding.bodyFat')}
              keyboardType="numeric"
              value={draftBodyFat}
              onChangeText={setDraftBodyFat}
            />
            <Input
              label={t('onboarding.targetWeight')}
              keyboardType="numeric"
              value={draftTargetWeight}
              onChangeText={setDraftTargetWeight}
            />
            <PrimaryButton
              label={t('common.save')}
              loading={updateProfile.isPending}
              onPress={saveProfile}
            />
          </View>
        </ScrollView>
      </Sheet>

      {/* 2. Edit Goals Sheet */}
      <Sheet
        visible={activeSheet === 'goals'}
        onClose={() => setActiveSheet(null)}
        onConfirm={saveGoals}
        title={t('you.editGoalsTitle')}
        mode="edit"
      >
        <ScrollView style={styles.sheetScroll} showsVerticalScrollIndicator={false}>
          <View style={{ gap: spacing.md, paddingVertical: spacing.sm }}>
            <Text style={[type.cardLabel, { color: colors.inkMutedText }]}>{t('onboarding.primaryGoal')}</Text>
            <View style={{ gap: spacing.sm }}>
              {FitnessGoal.options.map((goal) => (
                <SelectCard
                  key={goal}
                  title={t(`onboarding.goals.${goal}`)}
                  description={t(`onboarding.goalDescriptions.${goal}`)}
                  selected={draftPrimaryGoal === goal}
                  onPress={() => setDraftPrimaryGoal(goal)}
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
                  selected={draftSecondaryGoal === goal}
                  onPress={() => {
                    selectionTick();
                    setDraftSecondaryGoal(draftSecondaryGoal === goal ? null : goal);
                  }}
                />
              ))}
            </View>

            <PrimaryButton
              label={t('common.save')}
              loading={updatePreferences.isPending}
              onPress={saveGoals}
            />
          </View>
        </ScrollView>
      </Sheet>

      {/* 3. Edit Schedule Sheet */}
      <Sheet
        visible={activeSheet === 'schedule'}
        onClose={() => setActiveSheet(null)}
        onConfirm={saveSchedule}
        title={t('you.editScheduleTitle')}
        mode="edit"
      >
        <ScrollView style={styles.sheetScroll} showsVerticalScrollIndicator={false}>
          <View style={{ gap: spacing.md, paddingVertical: spacing.sm }}>
            <Text style={[type.cardLabel, { color: colors.inkMutedText }]}>{t('onboarding.trainingDaysTitle')}</Text>
            <DaySelector
              selectedDays={draftDays}
              onChange={(days) => setDraftDays(days)}
            />

            <Text style={[type.cardLabel, { color: colors.inkMutedText, marginTop: spacing.sm }]}>
              {t('onboarding.durationTitle')}
            </Text>
            <View style={styles.chipWrap}>
              {WorkoutDuration.options.map((d) => (
                <Chip
                  key={d}
                  label={t(`onboarding.durations.${d}`)}
                  selected={draftDuration === d}
                  onPress={() => {
                    selectionTick();
                    setDraftDuration(d);
                  }}
                />
              ))}
            </View>

            <Text style={[type.cardLabel, { color: colors.inkMutedText, marginTop: spacing.sm }]}>
              {t('onboarding.locationTitle')}
            </Text>
            <View style={{ gap: spacing.sm }}>
              {TrainingLocation.options.map((loc) => (
                <SelectCard
                  key={loc}
                  title={t(`onboarding.locations.${loc}`)}
                  selected={draftLocation === loc}
                  onPress={() => setDraftLocation(loc)}
                />
              ))}
            </View>

            <PrimaryButton
              label={t('common.save')}
              loading={updatePreferences.isPending || updateProfile.isPending}
              onPress={saveSchedule}
            />
          </View>
        </ScrollView>
      </Sheet>

      {/* 4. Edit Equipment Sheet */}
      <Sheet
        visible={activeSheet === 'equipment'}
        onClose={() => setActiveSheet(null)}
        onConfirm={saveEquipment}
        title={t('you.editEquipmentTitle')}
        mode="edit"
      >
        <ScrollView style={styles.sheetScroll} showsVerticalScrollIndicator={false}>
          <View style={{ gap: spacing.md, paddingVertical: spacing.sm }}>
            <View style={styles.grid}>
              {Equipment.options.map((item) => (
                <View key={item} style={styles.gridItem}>
                  <EquipmentCard
                    icon={t(`onboarding.equipmentIcons.${item}`)}
                    label={t(`onboarding.equipment.${item}`)}
                    selected={draftEquipment.includes(item)}
                    onPress={() => toggleDraftEquipment(item)}
                  />
                </View>
              ))}
            </View>
            <PrimaryButton
              label={t('common.save')}
              loading={updateEquipment.isPending}
              onPress={saveEquipment}
            />
          </View>
        </ScrollView>
      </Sheet>

      {/* 5. Edit Preferences Sheet */}
      <Sheet
        visible={activeSheet === 'preferences'}
        onClose={() => setActiveSheet(null)}
        onConfirm={savePreferences}
        title={t('you.editPreferencesTitle')}
        mode="edit"
      >
        <ScrollView style={styles.sheetScroll} showsVerticalScrollIndicator={false}>
          <View style={{ gap: spacing.md, paddingVertical: spacing.sm }}>
            <Text style={[type.cardLabel, { color: colors.inkMutedText }]}>{t('onboarding.preferredEquipmentLabel')}</Text>
            <View style={styles.chipWrap}>
              {equipmentList.map((item) => (
                <Chip
                  key={`pref-eq-${item}`}
                  label={t(`onboarding.equipment.${item}`)}
                  selected={draftPreferredEquipment.includes(item)}
                  onPress={() => toggleDraftPreferredEquipment(item)}
                />
              ))}
            </View>

            <View style={styles.rowBetween}>
              <Text style={[type.cardLabel, { color: colors.inkMutedText }]}>{t('onboarding.preferredExercisesLabel')}</Text>
              <Pressable
                style={[styles.addButton, { backgroundColor: colors.accentSoft }]}
                onPress={() => setExercisePickerTarget('preferred')}
              >
                <Plus size={16} color={colors.accentText} />
                <Text style={[type.caption, { color: colors.accentText, fontWeight: '600' }]}>{t('onboarding.addExercise')}</Text>
              </Pressable>
            </View>
            <View style={styles.chipWrap}>
              {draftPreferredExercises.map((name) => (
                <View key={`pref-${name}`} style={[styles.removableChip, { borderColor: colors.accent }]}>
                  <Text style={[type.body, { fontSize: 14 }]}>{name}</Text>
                  <Pressable hitSlop={8} onPress={() => setDraftPreferredExercises(draftPreferredExercises.filter((x) => x !== name))}>
                    <X size={14} color={colors.inkMutedText} />
                  </Pressable>
                </View>
              ))}
            </View>

            <View style={styles.rowBetween}>
              <Text style={[type.cardLabel, { color: colors.inkMutedText }]}>{t('onboarding.avoidExercisesLabel')}</Text>
              <Pressable
                style={[styles.addButton, { backgroundColor: colors.accentSoft }]}
                onPress={() => setExercisePickerTarget('avoid')}
              >
                <Plus size={16} color={colors.accentText} />
                <Text style={[type.caption, { color: colors.accentText, fontWeight: '600' }]}>{t('onboarding.addExercise')}</Text>
              </Pressable>
            </View>
            <View style={styles.chipWrap}>
              {draftAvoidExercises.map((name) => (
                <View key={`avoid-${name}`} style={[styles.removableChip, { borderColor: colors.danger }]}>
                  <Text style={[type.body, { fontSize: 14 }]}>{name}</Text>
                  <Pressable hitSlop={8} onPress={() => setDraftAvoidExercises(draftAvoidExercises.filter((x) => x !== name))}>
                    <X size={14} color={colors.inkMutedText} />
                  </Pressable>
                </View>
              ))}
            </View>

            <Text style={[type.cardLabel, { color: colors.inkMutedText }]}>{t('onboarding.dietaryTitle')}</Text>
            <View style={styles.chipWrap}>
              {DIETARY_PREFERENCES.map((pref) => (
                <Chip
                  key={`diet-${pref}`}
                  label={t(`onboarding.dietary.${pref}`)}
                  selected={draftDietary.includes(pref)}
                  onPress={() => toggleDraftDietary(pref)}
                />
              ))}
            </View>

            <PrimaryButton
              label={t('common.save')}
              loading={updatePreferences.isPending}
              onPress={savePreferences}
            />
          </View>
        </ScrollView>
      </Sheet>

      {/* 6. Edit Notifications Sheet */}
      <Sheet
        visible={activeSheet === 'notifications'}
        onClose={() => setActiveSheet(null)}
        onConfirm={saveNotifications}
        title={t('you.editNotificationsTitle')}
        mode="edit"
      >
        <View style={{ gap: spacing.lg, paddingVertical: spacing.md }}>
          <View style={styles.rowBetween}>
            <View style={{ flex: 1, gap: 2 }}>
              <Text style={[type.sectionTitle, { fontSize: 17 }]}>{t('you.workoutReminderToggle')}</Text>
              <Text style={[type.secondary, { color: colors.inkMutedText }]}>{t('you.workoutReminderSubtitle')}</Text>
            </View>
            <Switch
              value={draftWorkoutReminders}
              onValueChange={setDraftWorkoutReminders}
              trackColor={{ false: colors.surfaceMuted, true: colors.accent }}
              thumbColor="#FFFFFF"
            />
          </View>

          <View style={styles.rowBetween}>
            <View style={{ flex: 1, gap: 2 }}>
              <Text style={[type.sectionTitle, { fontSize: 17 }]}>{t('you.nutritionReminderToggle')}</Text>
              <Text style={[type.secondary, { color: colors.inkMutedText }]}>{t('you.nutritionReminderSubtitle')}</Text>
            </View>
            <Switch
              value={draftNutritionReminders}
              onValueChange={setDraftNutritionReminders}
              trackColor={{ false: colors.surfaceMuted, true: colors.accent }}
              thumbColor="#FFFFFF"
            />
          </View>

          <View style={styles.rowBetween}>
            <View style={{ flex: 1, gap: 2 }}>
              <Text style={[type.sectionTitle, { fontSize: 17 }]}>{t('you.progressReminderToggle')}</Text>
              <Text style={[type.secondary, { color: colors.inkMutedText }]}>{t('you.progressReminderSubtitle')}</Text>
            </View>
            <Switch
              value={draftProgressReminders}
              onValueChange={setDraftProgressReminders}
              trackColor={{ false: colors.surfaceMuted, true: colors.accent }}
              thumbColor="#FFFFFF"
            />
          </View>

          <View style={styles.rowBetween}>
            <View style={{ flex: 1, gap: 2 }}>
              <Text style={[type.sectionTitle, { fontSize: 17 }]}>{t('you.aiInsightToggle')}</Text>
              <Text style={[type.secondary, { color: colors.inkMutedText }]}>{t('you.aiInsightSubtitle')}</Text>
            </View>
            <Switch
              value={draftAiInsight}
              onValueChange={setDraftAiInsight}
              trackColor={{ false: colors.surfaceMuted, true: colors.accent }}
              thumbColor="#FFFFFF"
            />
          </View>

          <PrimaryButton
            label={t('common.save')}
            loading={updatePreferences.isPending}
            onPress={saveNotifications}
          />
        </View>
      </Sheet>

      {/* 7. Edit Units Sheet */}
      <Sheet
        visible={activeSheet === 'units'}
        onClose={() => setActiveSheet(null)}
        onConfirm={saveUnits}
        title={t('you.editUnitsTitle')}
        mode="edit"
      >
        <View style={{ gap: spacing.lg, paddingVertical: spacing.md }}>
          <SegmentedControl
            options={[
              { label: 'Kilograms (kg)', value: 'kg' },
              { label: 'Pounds (lb)', value: 'lb' },
            ]}
            value={draftUnit}
            onChange={(val) => setDraftUnit(val as 'kg' | 'lb')}
          />
          <PrimaryButton
            label={t('common.save')}
            loading={updateProfile.isPending}
            onPress={saveUnits}
          />
        </View>
      </Sheet>

      {/* 8. Change Password Sheet */}
      <Sheet
        visible={activeSheet === 'password'}
        onClose={() => setActiveSheet(null)}
        onConfirm={savePassword}
        title={t('you.changePasswordTitle')}
        mode="edit"
      >
        <View style={{ gap: spacing.md, paddingVertical: spacing.md }}>
          <Input
            label={t('you.currentPassword')}
            secureTextEntry
            value={currentPassword}
            onChangeText={setCurrentPassword}
          />
          <Input
            label={t('you.newPassword')}
            secureTextEntry
            value={newPassword}
            onChangeText={setNewPassword}
          />
          <Input
            label={t('you.confirmPassword')}
            secureTextEntry
            value={confirmPassword}
            onChangeText={setConfirmPassword}
          />
          {passwordError ? (
            <Text style={{ color: colors.danger, ...type.body }}>{passwordError}</Text>
          ) : null}
          <PrimaryButton
            label={t('common.save')}
            loading={changePassword.isPending}
            onPress={savePassword}
          />
        </View>
      </Sheet>

      {/* Exercise Picker Modal for Preferences */}
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
  scrollContent: {
    maxWidth: 600,
    width: '100%',
    alignSelf: 'center',
  },
  cardWrapper: {
    paddingHorizontal: 20,
  },
  profileRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  avatarCircle: {
    width: 56,
    height: 56,
    justifyContent: 'center',
    alignItems: 'center',
  },
  profileInfo: {
    flex: 1,
    gap: 2,
  },
  sheetScroll: {
    maxHeight: 460,
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
});
