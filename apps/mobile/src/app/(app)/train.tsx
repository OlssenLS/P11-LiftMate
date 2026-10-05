import { useRouter } from 'expo-router';
import { useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Button, Card, ScreenHeader } from '@/components/ui';
import { ExercisePicker } from '@/features/workout/exercise-picker';
import { useTokens } from '@/hooks/use-tokens';
import { t } from '@/i18n';
import { pressLight } from '@/lib/haptics';

export default function TrainScreen() {
  const { colors, spacing, fontSize, fontWeight } = useTokens();
  const router = useRouter();
  const [pickerOpen, setPickerOpen] = useState(false);

  return (
    <View style={[styles.container, { backgroundColor: colors.bg }]}>
      <SafeAreaView style={styles.safeArea}>
        <ScrollView
          contentContainerStyle={[styles.content, { padding: spacing.xl, gap: spacing.lg }]}
          showsVerticalScrollIndicator={false}
        >
          <ScreenHeader title={t('train.title')} subtitle={t('train.subtitle')} />

          {/* Dark Hero Card for Quick Start */}
          <Card variant="hero" padding="xl">
            <View style={{ gap: spacing.sm }}>
              <Text
                style={{
                  color: colors.accent,
                  fontSize: fontSize.label,
                  fontWeight: fontWeight.bold,
                  letterSpacing: 1,
                  textTransform: 'uppercase',
                }}
              >
                {t('train.startEmptyTitle')}
              </Text>
              <Text
                style={{
                  color: colors.surface,
                  fontSize: fontSize.heading,
                  fontWeight: fontWeight.bold,
                }}
              >
                {t('workout.startTitle')}
              </Text>
              <Text
                style={{
                  color: colors.bg,
                  fontSize: fontSize.body,
                  fontWeight: fontWeight.regular,
                  lineHeight: 22,
                }}
              >
                {t('train.startEmptySubtitle')}
              </Text>
            </View>

            <View style={{ marginTop: spacing.lg }}>
              <Button
                label={t('train.startEmptyAction')}
                onPress={() => {
                  pressLight();
                  router.push('/workout/active');
                }}
              />
            </View>
          </Card>

          {/* Exercise Library Browser */}
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
                DATABASE
              </Text>
              <Text
                style={{
                  color: colors.ink,
                  fontSize: fontSize.title,
                  fontWeight: fontWeight.bold,
                }}
              >
                {t('train.browseExercises')}
              </Text>
              <Text
                style={{
                  color: colors.inkMuted,
                  fontSize: fontSize.body,
                  lineHeight: 20,
                  marginTop: spacing.xs,
                }}
              >
                Search movements filtered by target muscle group, equipment, and difficulty.
              </Text>
            </View>

            <View style={{ marginTop: spacing.md }}>
              <Button
                label={t('workout.pickExercise')}
                variant="secondary"
                onPress={() => {
                  pressLight();
                  setPickerOpen(true);
                }}
              />
            </View>
          </Card>

          {/* Programs Roadmap Card */}
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
                    Phase 3 Roadmap
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
                {t('train.programsTitle')}
              </Text>
              <Text
                style={{
                  color: colors.inkMuted,
                  fontSize: fontSize.body,
                  lineHeight: 20,
                  marginTop: spacing.xs,
                }}
              >
                {t('train.programsSubtitle')}
              </Text>
            </View>
          </Card>
        </ScrollView>
      </SafeAreaView>

      <ExercisePicker
        visible={pickerOpen}
        onClose={() => setPickerOpen(false)}
        onSelect={(ex) => {
          setPickerOpen(false);
          router.push('/workout/active');
        }}
      />
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
  phaseBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
    borderWidth: 1,
  },
});
