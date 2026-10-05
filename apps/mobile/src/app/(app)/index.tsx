import { useRouter } from 'expo-router';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Button, Card, ScreenHeader } from '@/components/ui';
import { useTokens } from '@/hooks/use-tokens';
import { t } from '@/i18n';
import { pressLight } from '@/lib/haptics';
import { useAuthStore } from '@/stores/auth-store';

export default function HomeScreen() {
  const { colors, radius, spacing, fontSize, fontWeight } = useTokens();
  const router = useRouter();
  const user = useAuthStore((s) => s.user);

  const displayName = user?.displayName ? user.displayName.split(' ')[0] : 'Lifter';

  return (
    <View style={[styles.container, { backgroundColor: colors.bg }]}>
      <SafeAreaView style={styles.safeArea}>
        <ScrollView
          contentContainerStyle={[styles.content, { padding: spacing.xl, gap: spacing.lg }]}
          showsVerticalScrollIndicator={false}
        >
          {/* Header */}
          <ScreenHeader
            title={t('common.appName')}
            subtitle={`${t('home.greeting')}, ${displayName}`}
          />

          {/* Signature Dark Hero Card (Brief §3) */}
          <Card variant="hero" padding="xl">
            <View style={{ gap: spacing.sm }}>
              <View style={styles.badgeRow}>
                <View style={[styles.pillBadge, { backgroundColor: colors.accent }]}>
                  <Text
                    style={{
                      color: colors.surface,
                      fontSize: fontSize.label,
                      fontWeight: fontWeight.bold,
                      letterSpacing: 1,
                      textTransform: 'uppercase',
                    }}
                  >
                    TODAY&apos;S WORKOUT
                  </Text>
                </View>
              </View>

              <Text
                style={{
                  color: colors.surface,
                  fontSize: fontSize.heading,
                  fontWeight: fontWeight.bold,
                  marginTop: spacing.xs,
                }}
              >
                {t('home.heroTitle')}
              </Text>

              <Text
                style={{
                  color: colors.bg,
                  fontSize: fontSize.body,
                  lineHeight: 22,
                }}
              >
                {t('home.heroSubtitle')}
              </Text>
            </View>

            <View style={{ marginTop: spacing.xl }}>
              <Button
                label={t('home.heroAction')}
                onPress={() => {
                  pressLight();
                  router.push('/workout/active');
                }}
              />
            </View>
          </Card>

          {/* Big Numbers Stat Row (Brief §3) */}
          <View style={styles.statRow}>
            <View
              style={[
                styles.statCard,
                {
                  backgroundColor: colors.surface,
                  borderRadius: radius.cardSm,
                  padding: spacing.lg,
                  gap: spacing.xs,
                },
              ]}
            >
              <Text
                style={{
                  color: colors.inkMuted,
                  fontSize: fontSize.label,
                  fontWeight: fontWeight.bold,
                  letterSpacing: 1,
                  textTransform: 'uppercase',
                }}
              >
                {t('home.weeklyVolume')}
              </Text>
              <Text
                style={{
                  color: colors.ink,
                  fontSize: fontSize.heading,
                  fontWeight: fontWeight.bold,
                }}
              >
                0 <Text style={{ fontSize: fontSize.body, fontWeight: fontWeight.medium }}>kg</Text>
              </Text>
            </View>

            <View
              style={[
                styles.statCard,
                {
                  backgroundColor: colors.surface,
                  borderRadius: radius.cardSm,
                  padding: spacing.lg,
                  gap: spacing.xs,
                },
              ]}
            >
              <Text
                style={{
                  color: colors.inkMuted,
                  fontSize: fontSize.label,
                  fontWeight: fontWeight.bold,
                  letterSpacing: 1,
                  textTransform: 'uppercase',
                }}
              >
                {t('home.workoutsThisWeek')}
              </Text>
              <Text
                style={{
                  color: colors.ink,
                  fontSize: fontSize.heading,
                  fontWeight: fontWeight.bold,
                }}
              >
                0 <Text style={{ fontSize: fontSize.body, fontWeight: fontWeight.medium }}>/ 3</Text>
              </Text>
            </View>
          </View>

          {/* Nutrition Target Glance */}
          <Card padding="lg">
            <View style={{ gap: spacing.xs }}>
              <Text
                style={{
                  color: colors.inkMuted,
                  fontSize: fontSize.label,
                  fontWeight: fontWeight.bold,
                  letterSpacing: 1,
                  textTransform: 'uppercase',
                }}
              >
                {t('home.caloriesTarget')}
              </Text>
              <Text
                style={{
                  color: colors.ink,
                  fontSize: fontSize.title,
                  fontWeight: fontWeight.bold,
                }}
              >
                2,200 <Text style={{ fontSize: fontSize.body, fontWeight: fontWeight.regular }}>kcal / day</Text>
              </Text>
              <Text
                style={{
                  color: colors.inkMuted,
                  fontSize: fontSize.label,
                  marginTop: 2,
                }}
              >
                160g Protein · 240g Carbs · 70g Fat
              </Text>
            </View>
          </Card>

          {/* Honest First Run / Activity Card (Antislop R-27, R-38) */}
          <Card padding="lg">
            <View style={{ gap: spacing.xs }}>
              <Text
                style={{
                  color: colors.ink,
                  fontSize: fontSize.body,
                  fontWeight: fontWeight.bold,
                }}
              >
                {t('home.emptyHeadline')}
              </Text>
              <Text
                style={{
                  color: colors.inkMuted,
                  fontSize: fontSize.body,
                  lineHeight: 20,
                  marginTop: spacing.xs,
                }}
              >
                {t('home.emptySub')}
              </Text>
            </View>
          </Card>
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
  badgeRow: {
    flexDirection: 'row',
  },
  pillBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
  },
  statRow: {
    flexDirection: 'row',
    gap: 12,
  },
  statCard: {
    flex: 1,
    elevation: 2,
    shadowColor: '#1A1613',
    shadowOpacity: 0.04,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
  },
});
