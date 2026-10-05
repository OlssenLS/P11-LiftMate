import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Card, Ring, ScreenHeader } from '@/components/ui';
import { useTokens } from '@/hooks/use-tokens';
import { t } from '@/i18n';

export default function FoodScreen() {
  const { colors, radius, spacing, fontSize, fontWeight } = useTokens();

  // Targets from user profile / onboarding or sensible defaults
  const calories = 2200;
  const protein = 160;
  const carbs = 240;
  const fat = 70;

  return (
    <View style={[styles.container, { backgroundColor: colors.bg }]}>
      <SafeAreaView style={styles.safeArea}>
        <ScrollView
          contentContainerStyle={[styles.content, { padding: spacing.xl, gap: spacing.lg }]}
          showsVerticalScrollIndicator={false}
        >
          <ScreenHeader title={t('food.title')} subtitle={t('food.subtitle')} />

          {/* Daily Targets Hero Card */}
          <Card variant="hero" padding="xl">
            <View style={{ gap: spacing.md, alignItems: 'center' }}>
              <View style={styles.badgeRow}>
                <View style={[styles.targetBadge, { backgroundColor: colors.surface }]}>
                  <Text
                    style={{
                      color: colors.ink,
                      fontSize: fontSize.label,
                      fontWeight: fontWeight.bold,
                      letterSpacing: 1,
                      textTransform: 'uppercase',
                    }}
                  >
                    DAILY BUDGET
                  </Text>
                </View>
              </View>

              <Ring progress={0} size={140} thickness={12} color="accent" trackColor="surface">
                <View style={{ alignItems: 'center' }}>
                  <Text
                    style={{
                      color: colors.surface,
                      fontSize: fontSize.heading,
                      fontWeight: fontWeight.bold,
                    }}
                  >
                    {calories.toLocaleString()}
                  </Text>
                  <Text
                    style={{
                      color: colors.bg,
                      fontSize: fontSize.label,
                      fontWeight: fontWeight.semibold,
                      letterSpacing: 0.5,
                    }}
                  >
                    KCAL TARGET
                  </Text>
                </View>
              </Ring>

              {/* Macro row */}
              <View style={[styles.macroRow, { marginTop: spacing.sm, gap: spacing.md }]}>
                <View style={[styles.macroBox, { backgroundColor: colors.surface, borderRadius: radius.cardSm }]}>
                  <Text style={{ color: colors.inkMuted, fontSize: fontSize.label, fontWeight: fontWeight.bold }}>
                    PROTEIN
                  </Text>
                  <Text style={{ color: colors.ink, fontSize: fontSize.title, fontWeight: fontWeight.bold }}>
                    {protein}g
                  </Text>
                </View>

                <View style={[styles.macroBox, { backgroundColor: colors.surface, borderRadius: radius.cardSm }]}>
                  <Text style={{ color: colors.inkMuted, fontSize: fontSize.label, fontWeight: fontWeight.bold }}>
                    CARBS
                  </Text>
                  <Text style={{ color: colors.ink, fontSize: fontSize.title, fontWeight: fontWeight.bold }}>
                    {carbs}g
                  </Text>
                </View>

                <View style={[styles.macroBox, { backgroundColor: colors.surface, borderRadius: radius.cardSm }]}>
                  <Text style={{ color: colors.inkMuted, fontSize: fontSize.label, fontWeight: fontWeight.bold }}>
                    FAT
                  </Text>
                  <Text style={{ color: colors.ink, fontSize: fontSize.title, fontWeight: fontWeight.bold }}>
                    {fat}g
                  </Text>
                </View>
              </View>
            </View>
          </Card>

          {/* Phase 4 Roadmap Status Card */}
          <Card padding="lg">
            <View style={{ gap: spacing.xs }}>
              <View style={styles.badgeRow}>
                <View
                  style={[
                    styles.phaseBadge,
                    {
                      backgroundColor: colors.bg,
                      borderColor: colors.inkMuted,
                    },
                  ]}
                >
                  <Text
                    style={{
                      color: colors.ink,
                      fontSize: fontSize.label,
                      fontWeight: fontWeight.semibold,
                    }}
                  >
                    Phase 4 Roadmap
                  </Text>
                </View>
              </View>

              <Text
                style={{
                  color: colors.ink,
                  fontSize: fontSize.title,
                  fontWeight: fontWeight.bold,
                  marginTop: spacing.xs,
                }}
              >
                Food Journal & Indonesian Composition
              </Text>

              <Text
                style={{
                  color: colors.inkMuted,
                  fontSize: fontSize.body,
                  lineHeight: 22,
                  marginTop: spacing.xs,
                }}
              >
                {t('food.phase4Note')}
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
  targetBadge: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 999,
  },
  phaseBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
    borderWidth: 1,
  },
  macroRow: {
    flexDirection: 'row',
    width: '100%',
  },
  macroBox: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
  },
});
