import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Card, ScreenHeader } from '@/components/ui';
import { useTokens } from '@/hooks/use-tokens';
import { t } from '@/i18n';
import { selectionTick } from '@/lib/haptics';

export function CoachSheetContent() {
  const { colors, radius, spacing, fontSize, fontWeight } = useTokens();
  const [selectedPrompt, setSelectedPrompt] = useState<string | null>(null);

  const sampleQuestions = [
    t('coach.q1'),
    t('coach.q2'),
    t('coach.q3'),
  ];

  return (
    <View style={{ gap: spacing.lg, paddingBottom: spacing.xxl }}>
      {/* Hero Card for Coach */}
      <Card variant="hero" padding="xl">
        <View style={{ gap: spacing.sm }}>
          <View style={styles.badgeRow}>
            <View
              style={[
                styles.phaseBadge,
                {
                  backgroundColor: colors.surface,
                },
              ]}
            >
              <Text
                style={{
                  color: colors.ink,
                  fontSize: fontSize.caption,
                  fontWeight: fontWeight.bold,
                  letterSpacing: 0.5,
                }}
              >
                {t('coach.badge')}
              </Text>
            </View>
          </View>

          <Text
            style={{
              color: colors.surface,
              fontSize: fontSize.title,
              fontWeight: fontWeight.bold,
              marginTop: spacing.xs,
            }}
          >
            {t('coach.heroHeading')}
          </Text>

          <Text
            style={{
              color: colors.bg,
              fontSize: fontSize.body,
              lineHeight: 22,
            }}
          >
            {t('coach.description')}
          </Text>
        </View>
      </Card>

      {/* Principle Card */}
      <Card padding="lg">
        <View style={{ gap: spacing.xs }}>
          <Text
            style={{
              color: colors.accentText,
              fontSize: fontSize.caption,
              fontWeight: fontWeight.bold,
              letterSpacing: 1,
              textTransform: 'uppercase',
            }}
          >
            {t('coach.architectureEyebrow')}
          </Text>
          <Text
            style={{
              color: colors.ink,
              fontSize: fontSize.sectionTitle,
              fontWeight: fontWeight.bold,
            }}
          >
            {t('coach.architectureTitle')}
          </Text>
          <Text
            style={{
              color: colors.inkMutedText,
              fontSize: fontSize.secondary,
              lineHeight: 20,
              marginTop: spacing.xs,
            }}
          >
            {t('coach.architectureDescription')}
          </Text>
        </View>
      </Card>

      {/* Preview Questions */}
      <Card padding="lg">
        <View style={{ gap: spacing.md }}>
          <Text
            style={{
              color: colors.ink,
              fontSize: fontSize.body,
              fontWeight: fontWeight.bold,
            }}
          >
            {t('coach.previewQuestionsTitle')}
          </Text>

          <View style={{ gap: spacing.sm }}>
            {sampleQuestions.map((q, idx) => {
              const isSelected = selectedPrompt === q;
              return (
                <Pressable
                  key={idx}
                  accessibilityRole="button"
                  onPress={() => {
                    selectionTick();
                    setSelectedPrompt(isSelected ? null : q);
                  }}
                  style={({ pressed }) => [
                    styles.promptCard,
                    {
                      backgroundColor: isSelected ? colors.ink : colors.surface,
                      borderColor: isSelected ? colors.ink : colors.hairline,
                      borderRadius: radius.md,
                      padding: spacing.md,
                    },
                    pressed ? { opacity: 0.9 } : null,
                  ]}
                >
                  <Text
                    style={{
                      color: isSelected ? colors.surface : colors.ink,
                      fontSize: fontSize.body,
                      fontWeight: fontWeight.medium,
                      lineHeight: 20,
                    }}
                  >
                    &quot;{q}&quot;
                  </Text>
                  {isSelected ? (
                    <Text
                      style={{
                        color: colors.bg,
                        fontSize: fontSize.caption,
                        marginTop: spacing.xs,
                      }}
                    >
                      Context pipeline: Reads user program + weekly volume + goal target.
                    </Text>
                  ) : null}
                </Pressable>
              );
            })}
          </View>
        </View>
      </Card>
    </View>
  );
}

export default function CoachScreen() {
  const { colors, spacing } = useTokens();

  return (
    <View style={[styles.container, { backgroundColor: colors.bg }]}>
      <SafeAreaView style={styles.safeArea}>
        <ScrollView
          contentContainerStyle={[styles.content, { padding: spacing.xl, gap: spacing.lg }]}
          showsVerticalScrollIndicator={false}
        >
          <ScreenHeader title={t('coach.title')} subtitle={t('coach.subtitle')} />
          <CoachSheetContent />
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
  phaseBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
  },
  promptCard: {
    borderWidth: 1,
  },
});
