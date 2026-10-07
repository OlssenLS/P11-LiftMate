import React, { useState } from 'react';
import { Alert, ScrollView, StyleSheet, Text, View } from 'react-native';
import {
  Bell,
  Calendar,
  Dumbbell,
  Info,
  LogOut,
  Scale,
  Shield,
  Target,
  User,
} from 'lucide-react-native';

import {
  Card,
  DaySelector,
  LargeTitleHeader,
  ListGroup,
  ListRowCard,
  PrimaryButton,
  SectionHeader,
  SegmentedControl,
  Sheet,
} from '@/components/ui';
import { useTokens } from '@/hooks/use-tokens';
import { useTabScrollPadding } from '@/hooks/use-tab-scroll-padding';
import { t } from '@/i18n';
import { notifySuccess } from '@/lib/haptics';
import { useAuthStore } from '@/stores/auth-store';

export default function YouScreen() {
  const { colors, radius, layout, type, icons, spacing } = useTokens();
  const bottomScrollPadding = useTabScrollPadding();
  const user = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.logout);

  const [weightUnit, setWeightUnit] = useState<'kg' | 'lb'>('kg');
  const [selectedDays, setSelectedDays] = useState(['mon', 'tue', 'thu', 'fri']);
  const [editSheetKey, setEditSheetKey] = useState<string | null>(null);

  // Draft state for edit sheets
  const [draftUnit, setDraftUnit] = useState<'kg' | 'lb'>(weightUnit);
  const [draftDays, setDraftDays] = useState(selectedDays);

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

  const initial = (user?.displayName?.[0] ?? 'L').toUpperCase();

  const handleOpenEdit = (key: string) => {
    if (key === 'units') setDraftUnit(weightUnit);
    if (key === 'days') setDraftDays(selectedDays);
    setEditSheetKey(key);
  };

  const handleConfirmEdit = () => {
    if (editSheetKey === 'units') {
      setWeightUnit(draftUnit);
      notifySuccess();
    }
    if (editSheetKey === 'days') {
      setSelectedDays(draftDays);
      notifySuccess();
    }
    setEditSheetKey(null);
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
        {/* Large Title Header (DESIGN.md §4 & §7.9) */}
        <LargeTitleHeader title="You" />

        {/* User Profile Header Card (DESIGN.md §7.9) */}
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
                  BUILD MUSCLE · INTERMEDIATE
                </Text>
                <Text style={[type.sectionTitle, { color: colors.ink, marginTop: 2 }]} numberOfLines={1}>
                  {user?.displayName ?? 'Lifter'}
                </Text>
                <Text style={[type.secondary, { color: colors.inkMutedText }]} numberOfLines={1}>
                  {user?.email ?? 'user@liftmate.app'}
                </Text>
              </View>
            </View>
          </Card>
        </View>

        {/* Inset Group: Account & Program (DESIGN.md §7.9) */}
        <SectionHeader title="Account & Program" />
        <View style={styles.cardWrapper}>
          <ListGroup>
            <ListRowCard
              label="Profile"
              subtitle={user?.displayName ?? 'Lifter'}
              icon={
                <User
                  size={icons.cardLabelSize}
                  color={colors.accentText}
                  strokeWidth={icons.strokeWidth}
                />
              }
              onPress={() => handleOpenEdit('profile')}
            />
            <ListRowCard
              label="Goals & Targets"
              subtitle="Hypertrophy · 2,200 kcal"
              icon={
                <Target
                  size={icons.cardLabelSize}
                  color={colors.accentText}
                  strokeWidth={icons.strokeWidth}
                />
              }
              onPress={() => handleOpenEdit('goals')}
            />
            <ListRowCard
              label="Training Days"
              subtitle={`${selectedDays.length} days scheduled / week`}
              icon={
                <Calendar
                  size={icons.cardLabelSize}
                  color={colors.accentText}
                  strokeWidth={icons.strokeWidth}
                />
              }
              onPress={() => handleOpenEdit('days')}
            />
            <ListRowCard
              label="Equipment"
              subtitle="Barbell, Dumbbells, Cables, Bench"
              icon={
                <Dumbbell
                  size={icons.cardLabelSize}
                  color={colors.accentText}
                  strokeWidth={icons.strokeWidth}
                />
              }
              onPress={() => handleOpenEdit('equipment')}
            />
          </ListGroup>
        </View>

        {/* Inset Group: Preferences (DESIGN.md §7.9) */}
        <SectionHeader title="Preferences" />
        <View style={styles.cardWrapper}>
          <ListGroup>
            <ListRowCard
              label="Units"
              value={weightUnit.toUpperCase()}
              icon={
                <Scale
                  size={icons.cardLabelSize}
                  color={colors.accentText}
                  strokeWidth={icons.strokeWidth}
                />
              }
              onPress={() => handleOpenEdit('units')}
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
              onPress={() => handleOpenEdit('notifications')}
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
              onPress={() => handleOpenEdit('privacy')}
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
              onPress={() => handleOpenEdit('about')}
            />
          </ListGroup>
        </View>

        {/* Inset Group: Sign Out (DESIGN.md §7.9) */}
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

      {/* Edit Sheet (DESIGN.md §6.9 & §7.9) */}
      <Sheet
        visible={editSheetKey !== null}
        onClose={() => setEditSheetKey(null)}
        onConfirm={handleConfirmEdit}
        title={
          editSheetKey === 'units'
            ? 'Edit Units'
            : editSheetKey === 'days'
            ? 'Edit Training Days'
            : `Edit ${editSheetKey ?? 'Setting'}`
        }
        mode="edit"
      >
        <View style={{ gap: spacing.lg, paddingVertical: spacing.md }}>
          {editSheetKey === 'units' ? (
            <View
              style={[
                styles.sheetControlContainer,
                {
                  backgroundColor: colors.bg,
                  borderRadius: radius.lg,
                  padding: layout.cardPadding,
                },
              ]}
            >
              <Text style={[type.sectionTitle, { marginBottom: 12 }]}>
                Weight Unit
              </Text>
              <SegmentedControl
                options={[
                  { label: 'Kilograms (kg)', value: 'kg' },
                  { label: 'Pounds (lb)', value: 'lb' },
                ]}
                value={draftUnit}
                onChange={(val) => setDraftUnit(val as 'kg' | 'lb')}
              />
            </View>
          ) : editSheetKey === 'days' ? (
            <View
              style={[
                styles.sheetControlContainer,
                {
                  backgroundColor: colors.bg,
                  borderRadius: radius.lg,
                  padding: layout.cardPadding,
                },
              ]}
            >
              <Text style={[type.sectionTitle, { marginBottom: 12 }]}>
                Weekly Schedule
              </Text>
              <DaySelector
                selectedDays={draftDays}
                onChange={(days) => setDraftDays(days)}
              />
            </View>
          ) : (
            <View
              style={[
                styles.sheetControlContainer,
                {
                  backgroundColor: colors.bg,
                  borderRadius: radius.lg,
                  padding: layout.cardPadding,
                },
              ]}
            >
              <Text style={[type.body, { color: colors.inkMutedText }]}>
                Configuration options for {editSheetKey} will sync to your account.
              </Text>
            </View>
          )}

          <PrimaryButton
            label="Save Changes"
            onPress={handleConfirmEdit}
          />
        </View>
      </Sheet>
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
  sheetControlContainer: {
    alignSelf: 'stretch',
  },
});
