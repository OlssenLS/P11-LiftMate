import { useState } from 'react';
import { Alert, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Button, Card, Chip, ScreenHeader } from '@/components/ui';
import { useTokens } from '@/hooks/use-tokens';
import { t } from '@/i18n';
import { notifySuccess, selectionTick } from '@/lib/haptics';
import { useAuthStore } from '@/stores/auth-store';

export default function YouScreen() {
  const { colors, spacing, fontSize, fontWeight } = useTokens();
  const user = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.logout);
  const [weightUnit, setWeightUnit] = useState<'kg' | 'lb'>('kg');

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

  return (
    <View style={[styles.container, { backgroundColor: colors.bg }]}>
      <SafeAreaView style={styles.safeArea}>
        <ScrollView
          contentContainerStyle={[styles.content, { padding: spacing.xl, gap: spacing.lg }]}
          showsVerticalScrollIndicator={false}
        >
          <ScreenHeader title={t('you.title')} subtitle={t('you.subtitle')} />

          {/* User Profile Card */}
          <Card padding="xl">
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.lg }}>
              <View
                style={[
                  styles.avatar,
                  {
                    backgroundColor: colors.ink,
                    borderRadius: 999,
                  },
                ]}
              >
                <Text
                  style={{
                    color: colors.surface,
                    fontSize: fontSize.heading,
                    fontWeight: fontWeight.bold,
                  }}
                >
                  {initial}
                </Text>
              </View>

              <View style={{ flex: 1, gap: 2 }}>
                <Text
                  style={{
                    color: colors.ink,
                    fontSize: fontSize.title,
                    fontWeight: fontWeight.bold,
                  }}
                >
                  {user?.displayName ?? 'Lifter'}
                </Text>
                <Text
                  style={{
                    color: colors.inkMuted,
                    fontSize: fontSize.body,
                  }}
                >
                  {user?.email ?? 'user@liftmate.app'}
                </Text>
              </View>
            </View>
          </Card>

          {/* Training Preferences */}
          <Card padding="lg">
            <View style={{ gap: spacing.md }}>
              <Text
                style={{
                  color: colors.inkMuted,
                  fontSize: fontSize.label,
                  fontWeight: fontWeight.bold,
                  letterSpacing: 1,
                  textTransform: 'uppercase',
                }}
              >
                {t('you.preferences')}
              </Text>

              <View style={styles.prefRow}>
                <Text style={{ color: colors.ink, fontSize: fontSize.body, fontWeight: fontWeight.medium }}>
                  {t('you.weightUnit')}
                </Text>
                <View style={{ flexDirection: 'row', gap: spacing.sm }}>
                  <Chip
                    label="KG"
                    selected={weightUnit === 'kg'}
                    onPress={() => {
                      selectionTick();
                      setWeightUnit('kg');
                      notifySuccess();
                    }}
                  />
                  <Chip
                    label="LB"
                    selected={weightUnit === 'lb'}
                    onPress={() => {
                      selectionTick();
                      setWeightUnit('lb');
                      notifySuccess();
                    }}
                  />
                </View>
              </View>

              <View style={styles.prefRow}>
                <Text style={{ color: colors.ink, fontSize: fontSize.body, fontWeight: fontWeight.medium }}>
                  {t('you.timezone')}
                </Text>
                <Text style={{ color: colors.inkMuted, fontSize: fontSize.body }}>
                  {t('onboarding.timezones.Asia/Jakarta')}
                </Text>
              </View>
            </View>
          </Card>

          {/* Training Profile Summary */}
          <Card padding="lg">
            <View style={{ gap: spacing.md }}>
              <Text
                style={{
                  color: colors.inkMuted,
                  fontSize: fontSize.label,
                  fontWeight: fontWeight.bold,
                  letterSpacing: 1,
                  textTransform: 'uppercase',
                }}
              >
                {t('you.trainingProfile')}
              </Text>

              <View style={styles.prefRow}>
                <Text style={{ color: colors.inkMuted, fontSize: fontSize.body }}>
                  {t('you.primaryGoal')}
                </Text>
                <Text style={{ color: colors.ink, fontSize: fontSize.body, fontWeight: fontWeight.semibold }}>
                  {t('onboarding.goals.build_muscle')}
                </Text>
              </View>

              <View style={styles.prefRow}>
                <Text style={{ color: colors.inkMuted, fontSize: fontSize.body }}>
                  {t('you.experience')}
                </Text>
                <Text style={{ color: colors.ink, fontSize: fontSize.body, fontWeight: fontWeight.semibold }}>
                  {t('onboarding.experienceLevels.intermediate')}
                </Text>
              </View>

              <View style={styles.prefRow}>
                <Text style={{ color: colors.inkMuted, fontSize: fontSize.body }}>
                  {t('you.frequency')}
                </Text>
                <Text style={{ color: colors.ink, fontSize: fontSize.body, fontWeight: fontWeight.semibold }}>
                  {t('you.daysPerWeek', { count: 3 })}
                </Text>
              </View>
            </View>
          </Card>

          {/* Account Actions */}
          <View style={{ gap: spacing.md, marginTop: spacing.sm }}>
            <Button label={t('auth.logout')} variant="secondary" onPress={onLogout} />
            <Text
              style={{
                color: colors.inkMuted,
                fontSize: fontSize.label,
                textAlign: 'center',
                letterSpacing: 0.5,
              }}
            >
              {t('you.appVersion')}
            </Text>
          </View>
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  safeArea: { flex: 1 },
  content: {
    paddingBottom: 110,
    maxWidth: 600,
    width: '100%',
    alignSelf: 'center',
  },
  avatar: {
    width: 60,
    height: 60,
    alignItems: 'center',
    justifyContent: 'center',
  },
  prefRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
});
