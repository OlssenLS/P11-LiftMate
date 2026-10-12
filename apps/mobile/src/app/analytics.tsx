import React, { useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import {
  ArrowLeft,
  Sparkles,
  RefreshCw,
  Dumbbell,
  Utensils,
  AlertTriangle,
  CheckCircle2,
  MessageSquare,
  Calendar,
} from 'lucide-react-native';
import { useTokens } from '@/hooks/use-tokens';
import { t } from '@/i18n';
import {
  useAnalyticsOverview,
  useGenerateAnalytics,
} from '@/features/coach';
import type { AiInsight } from '@liftmate/shared';

type CategoryFilter = 'all' | 'training' | 'nutrition' | 'recovery';

export default function AnalyticsScreen() {
  const router = useRouter();
  const { colors, radius, type, icons, touchTarget, layout } = useTokens();

  const [activeFilter, setActiveFilter] = useState<CategoryFilter>('all');

  const { data: overview, isLoading, refetch } = useAnalyticsOverview();
  const generateMutation = useGenerateAnalytics();

  const handleRefresh = () => {
    generateMutation.mutate(undefined, {
      onSuccess: () => {
        void refetch();
      },
    });
  };

  const handleAskCoach = (insight: AiInsight) => {
    const prompt = `My analytics indicate that ${insight.title.toLowerCase()}. Observation: ${insight.observation}. Can you give me specific advice on how to progress?`;
    router.push({
      pathname: '/(app)/coach',
      params: { prefill: prompt },
    });
  };

  const handleReviewPlan = () => {
    router.push('/(app)/train');
  };

  const sufficiency = overview?.sufficiency;
  const metrics = overview?.metrics;
  const allInsights = overview?.insights ?? [];

  const filteredInsights = allInsights.filter((item) => {
    if (activeFilter === 'all') return true;
    if (activeFilter === 'training') {
      return (
        item.category === 'training_volume' ||
        item.category === 'progressive_overload'
      );
    }
    if (activeFilter === 'nutrition') {
      return item.category === 'nutrition_protein';
    }
    if (activeFilter === 'recovery') {
      return (
        item.category === 'recovery_fatigue' ||
        item.category === 'consistency_streak'
      );
    }
    return true;
  });

  return (
    <SafeAreaView
      edges={['top', 'left', 'right']}
      style={[styles.safeArea, { backgroundColor: colors.bg }]}
    >
      {/* Header */}
      <View style={[styles.header, { borderBottomColor: colors.hairline }]}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Go back"
          onPress={() => router.back()}
          hitSlop={Math.max(0, (touchTarget.min - 24) / 2)}
          style={({ pressed }) => [
            styles.backButton,
            { opacity: pressed ? 0.7 : 1 },
          ]}
        >
          <ArrowLeft size={24} color={colors.ink} strokeWidth={icons.strokeWidth} />
        </Pressable>

        <View style={styles.headerTitleContainer}>
          <Text style={[type.sectionTitle, { color: colors.ink }]}>
            {t('analytics.title')}
          </Text>
          <Text style={[type.caption, { color: colors.inkMutedText }]}>
            {t('analytics.subtitle')}
          </Text>
        </View>

        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t('analytics.refreshAction')}
          onPress={handleRefresh}
          disabled={generateMutation.isPending}
          hitSlop={Math.max(0, (touchTarget.min - 24) / 2)}
          style={({ pressed }) => [
            styles.actionButton,
            {
              backgroundColor: colors.surfaceMuted,
              opacity: pressed || generateMutation.isPending ? 0.6 : 1,
            },
          ]}
        >
          {generateMutation.isPending ? (
            <ActivityIndicator size="small" color={colors.accent} />
          ) : (
            <RefreshCw size={18} color={colors.ink} strokeWidth={icons.strokeWidth} />
          )}
        </Pressable>
      </View>

      <ScrollView
        contentContainerStyle={[
          styles.scrollContent,
          { paddingBottom: layout.screenPadding + 40 },
        ]}
        showsVerticalScrollIndicator={false}
      >
        {isLoading ? (
          <View style={styles.centerContainer}>
            <ActivityIndicator size="large" color={colors.accent} />
          </View>
        ) : !sufficiency?.isSufficient ? (
          /* Data Sufficiency Gate: Empty State (§54) */
          <View
            style={[
              styles.emptyCard,
              {
                backgroundColor: colors.surface,
                borderRadius: radius.lg,
                borderColor: colors.hairline,
              },
            ]}
          >
            <View
              style={[
                styles.iconBadge,
                { backgroundColor: colors.accentSoft, borderRadius: radius.pill },
              ]}
            >
              <Sparkles size={28} color={colors.accent} strokeWidth={icons.strokeWidth} />
            </View>

            <Text style={[type.title, { color: colors.ink, marginTop: 16, textAlign: 'center' }]}>
              {t('analytics.notEnoughDataTitle')}
            </Text>

            <Text
              style={[
                type.body,
                { color: colors.inkMutedText, textAlign: 'center', marginTop: 8, lineHeight: 22 },
              ]}
            >
              {sufficiency?.message ?? t('analytics.notEnoughDataDescription')}
            </Text>

            {/* Requirement progress tracking */}
            <View style={styles.requirementsContainer}>
              <View
                style={[
                  styles.requirementTile,
                  { backgroundColor: colors.surfaceMuted, borderRadius: radius.md },
                ]}
              >
                <Dumbbell size={18} color={colors.accentText} strokeWidth={icons.strokeWidth} />
                <View style={styles.requirementTextCol}>
                  <Text style={[type.secondary, { color: colors.ink, fontWeight: '600' }]}>
                    {t('analytics.workoutsLogged')}
                  </Text>
                  <Text style={[type.caption, { color: colors.inkMutedText }]}>
                    {sufficiency?.workoutCount ?? 0} of {sufficiency?.minimumWorkoutsRequired ?? 3} completed
                  </Text>
                </View>
                {sufficiency && sufficiency.workoutCount >= sufficiency.minimumWorkoutsRequired ? (
                  <CheckCircle2 size={18} color={colors.success} />
                ) : null}
              </View>

              <View
                style={[
                  styles.requirementTile,
                  { backgroundColor: colors.surfaceMuted, borderRadius: radius.md, marginTop: 10 },
                ]}
              >
                <Utensils size={18} color={colors.accentText} strokeWidth={icons.strokeWidth} />
                <View style={styles.requirementTextCol}>
                  <Text style={[type.secondary, { color: colors.ink, fontWeight: '600' }]}>
                    {t('analytics.nutritionDays')}
                  </Text>
                  <Text style={[type.caption, { color: colors.inkMutedText }]}>
                    {sufficiency?.nutritionDaysCount ?? 0} of {sufficiency?.minimumNutritionDaysRequired ?? 3} days logged
                  </Text>
                </View>
                {sufficiency && sufficiency.nutritionDaysCount >= sufficiency.minimumNutritionDaysRequired ? (
                  <CheckCircle2 size={18} color={colors.success} />
                ) : null}
              </View>
            </View>

            {/* Quick Actions to start logging */}
            <View style={styles.emptyActionRow}>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={t('analytics.logWorkoutAction')}
                onPress={() => router.push('/(app)/train')}
                style={({ pressed }) => [
                  styles.primaryActionButton,
                  {
                    backgroundColor: colors.accent,
                    borderRadius: radius.md,
                    opacity: pressed ? 0.8 : 1,
                  },
                ]}
              >
                <Text style={[type.body, { color: '#FFFFFF', fontWeight: '600' }]}>
                  {t('analytics.logWorkoutAction')}
                </Text>
              </Pressable>

              <Pressable
                accessibilityRole="button"
                accessibilityLabel={t('analytics.logFoodAction')}
                onPress={() => router.push('/(app)/food')}
                style={({ pressed }) => [
                  styles.secondaryActionButton,
                  {
                    backgroundColor: colors.surfaceMuted,
                    borderRadius: radius.md,
                    opacity: pressed ? 0.8 : 1,
                  },
                ]}
              >
                <Text style={[type.body, { color: colors.ink, fontWeight: '600' }]}>
                  {t('analytics.logFoodAction')}
                </Text>
              </Pressable>
            </View>
          </View>
        ) : (
          /* Sufficient Data View */
          <>
            {/* Metric Overview Chips */}
            {metrics ? (
              <View style={styles.metricGrid}>
                <View
                  style={[
                    styles.metricMiniCard,
                    { backgroundColor: colors.surface, borderRadius: radius.md },
                  ]}
                >
                  <Text style={[type.caption, { color: colors.inkMutedText }]}>
                    {t('analytics.trainingAdherence')}
                  </Text>
                  <Text style={[type.sectionTitle, { color: colors.ink, marginTop: 4 }]}>
                    {metrics.adherencePct}%
                  </Text>
                  <Text style={[type.caption, { color: colors.inkMutedText, marginTop: 2 }]}>
                    {metrics.workoutsCompleted} of {metrics.plannedSessions} sessions
                  </Text>
                </View>

                <View
                  style={[
                    styles.metricMiniCard,
                    { backgroundColor: colors.surface, borderRadius: radius.md },
                  ]}
                >
                  <Text style={[type.caption, { color: colors.inkMutedText }]}>
                    {t('analytics.weeklyVolume')}
                  </Text>
                  <Text style={[type.sectionTitle, { color: colors.ink, marginTop: 4 }]}>
                    {metrics.averageWeeklyVolumeKg.toLocaleString()}
                  </Text>
                  <Text style={[type.caption, { color: colors.inkMutedText, marginTop: 2 }]}>
                    kg / week
                  </Text>
                </View>

                <View
                  style={[
                    styles.metricMiniCard,
                    { backgroundColor: colors.surface, borderRadius: radius.md },
                  ]}
                >
                  <Text style={[type.caption, { color: colors.inkMutedText }]}>
                    {t('analytics.dailyProtein')}
                  </Text>
                  <Text style={[type.sectionTitle, { color: colors.ink, marginTop: 4 }]}>
                    {metrics.averageDailyProteinGrams} g
                  </Text>
                  <Text style={[type.caption, { color: colors.inkMutedText, marginTop: 2 }]}>
                    {metrics.proteinAdherencePct !== null ? `${metrics.proteinAdherencePct}% target` : 'Logged'}
                  </Text>
                </View>

                <View
                  style={[
                    styles.metricMiniCard,
                    { backgroundColor: colors.surface, borderRadius: radius.md },
                  ]}
                >
                  <Text style={[type.caption, { color: colors.inkMutedText }]}>
                    {t('analytics.calorieCompliance')}
                  </Text>
                  <Text style={[type.sectionTitle, { color: colors.ink, marginTop: 4 }]}>
                    {metrics.calorieAdherencePct !== null ? `${metrics.calorieAdherencePct}%` : '--'}
                  </Text>
                  <Text style={[type.caption, { color: colors.inkMutedText, marginTop: 2 }]}>
                    {metrics.averageDailyCalories.toLocaleString()} kcal/day
                  </Text>
                </View>
              </View>
            ) : null}

            {/* Plateau Alert Banner if stagnant lifts exist (§52) */}
            {metrics?.stagnantExercises && metrics.stagnantExercises.length > 0 ? (
              <View
                style={[
                  styles.stagnantBanner,
                  {
                    backgroundColor: colors.surface,
                    borderRadius: radius.md,
                    borderColor: colors.accentSoft,
                  },
                ]}
              >
                <AlertTriangle size={20} color={colors.accent} strokeWidth={icons.strokeWidth} />
                <View style={styles.stagnantTextCol}>
                  <Text style={[type.body, { color: colors.ink, fontWeight: '600' }]}>
                    {t('analytics.plateauNotice')}: {metrics.stagnantExercises[0].exerciseName}
                  </Text>
                  <Text style={[type.caption, { color: colors.inkMutedText, marginTop: 2 }]}>
                    {t('analytics.stagnantSessions', {
                      count: metrics.stagnantExercises[0].sessionsCount,
                      load: metrics.stagnantExercises[0].currentLoadKg,
                    })}
                  </Text>
                </View>
              </View>
            ) : null}

            {/* Filter Tabs */}
            <View style={styles.filterTabsRow}>
              {(['all', 'training', 'nutrition', 'recovery'] as CategoryFilter[]).map((tab) => {
                const isActive = activeFilter === tab;
                const label =
                  tab === 'all'
                    ? `${t('analytics.allTab')} (${allInsights.length})`
                    : tab === 'training'
                    ? t('analytics.trainingTab')
                    : tab === 'nutrition'
                    ? t('analytics.nutritionTab')
                    : t('analytics.recoveryTab');

                return (
                  <Pressable
                    key={tab}
                    accessibilityRole="tab"
                    accessibilityState={{ selected: isActive }}
                    onPress={() => setActiveFilter(tab)}
                    style={[
                      styles.filterChip,
                      {
                        backgroundColor: isActive ? colors.ink : colors.surface,
                        borderRadius: radius.pill,
                      },
                    ]}
                  >
                    <Text
                      style={[
                        type.caption,
                        {
                          color: isActive ? '#FFFFFF' : colors.inkMutedText,
                          fontWeight: isActive ? '600' : '500',
                        },
                      ]}
                    >
                      {label}
                    </Text>
                  </Pressable>
                );
              })}
            </View>

            {/* Insights List */}
            {filteredInsights.length === 0 ? (
              <View style={[styles.emptyFilteredContainer, { padding: 32 }]}>
                <Text style={[type.body, { color: colors.inkMutedText, textAlign: 'center' }]}>
                  No insights found for this category.
                </Text>
              </View>
            ) : (
              filteredInsights.map((insight) => (
                <View
                  key={insight.id}
                  style={[
                    styles.insightCard,
                    {
                      backgroundColor: colors.surface,
                      borderRadius: radius.lg,
                      borderColor: colors.hairline,
                    },
                  ]}
                >
                  {/* Category & Confidence Badge Row */}
                  <View style={styles.badgeRow}>
                    <View
                      style={[
                        styles.categoryBadge,
                        { backgroundColor: colors.accentSoft, borderRadius: radius.pill },
                      ]}
                    >
                      <Text
                        style={[
                          type.caption,
                          { color: colors.accentText, fontWeight: '600', fontSize: 11 },
                        ]}
                      >
                        {insight.category.replace(/_/g, ' ').toUpperCase()}
                      </Text>
                    </View>

                    <View
                      style={[
                        styles.confidenceBadge,
                        {
                          backgroundColor:
                            insight.confidence === 'high'
                              ? 'rgba(46, 125, 50, 0.12)'
                              : colors.surfaceMuted,
                          borderRadius: radius.pill,
                        },
                      ]}
                    >
                      <Text
                        style={[
                          type.caption,
                          {
                            color:
                              insight.confidence === 'high'
                                ? colors.success
                                : colors.inkMutedText,
                            fontSize: 11,
                          },
                        ]}
                      >
                        {insight.confidence === 'high'
                          ? t('analytics.highConfidence')
                          : t('analytics.mediumConfidence')}
                      </Text>
                    </View>
                  </View>

                  {/* Title */}
                  <Text style={[type.sectionTitle, { color: colors.ink, marginTop: 12 }]}>
                    {insight.title}
                  </Text>

                  {/* Observation */}
                  <View style={[styles.observationBox, { borderLeftColor: colors.accent }]}>
                    <Text style={[type.body, { color: colors.ink, lineHeight: 22 }]}>
                      {insight.observation}
                    </Text>
                  </View>

                  {/* Evidence Box */}
                  <View
                    style={[
                      styles.evidenceBox,
                      { backgroundColor: colors.surfaceMuted, borderRadius: radius.md },
                    ]}
                  >
                    <Text
                      style={[
                        type.eyebrow,
                        { color: colors.inkMutedText, fontSize: 11, letterSpacing: 0.5 },
                      ]}
                    >
                      {t('analytics.evidenceLabel')}
                    </Text>
                    <Text style={[type.secondary, { color: colors.ink, marginTop: 4 }]}>
                      {insight.evidence}
                    </Text>
                  </View>

                  {/* Possible Factors (§52) */}
                  {insight.possibleFactors && insight.possibleFactors.length > 0 ? (
                    <View style={styles.factorsSection}>
                      <Text
                        style={[
                          type.eyebrow,
                          { color: colors.inkMutedText, fontSize: 11, letterSpacing: 0.5 },
                        ]}
                      >
                        {t('analytics.factorsLabel')}
                      </Text>
                      {insight.possibleFactors.map((factor, fIdx) => (
                        <View key={fIdx} style={styles.factorRow}>
                          <Text style={[type.body, { color: colors.accent, marginRight: 8 }]}>
                            •
                          </Text>
                          <Text
                            style={[
                              type.secondary,
                              { color: colors.inkMutedText, flex: 1, lineHeight: 20 },
                            ]}
                          >
                            {factor}
                          </Text>
                        </View>
                      ))}
                    </View>
                  ) : null}

                  {/* Recommendation Box */}
                  <View
                    style={[
                      styles.recommendationBox,
                      {
                        backgroundColor: colors.accentSoft,
                        borderRadius: radius.md,
                      },
                    ]}
                  >
                    <Text
                      style={[
                        type.eyebrow,
                        { color: colors.accentText, fontSize: 11, letterSpacing: 0.5 },
                      ]}
                    >
                      {t('analytics.recommendationLabel')}
                    </Text>
                    <Text
                      style={[
                        type.body,
                        { color: colors.ink, marginTop: 4, lineHeight: 22 },
                      ]}
                    >
                      {insight.recommendation}
                    </Text>
                  </View>

                  {/* Action Buttons (§56, §57) */}
                  <View style={styles.cardActionRow}>
                    {insight.action === 'review_plan' ? (
                      <Pressable
                        accessibilityRole="button"
                        accessibilityLabel={t('analytics.reviewPlanAction')}
                        onPress={handleReviewPlan}
                        style={({ pressed }) => [
                          styles.actionButtonPill,
                          {
                            backgroundColor: colors.ink,
                            borderRadius: radius.md,
                            opacity: pressed ? 0.8 : 1,
                          },
                        ]}
                      >
                        <Calendar size={16} color="#FFFFFF" strokeWidth={icons.strokeWidth} />
                        <Text
                          style={[
                            type.secondary,
                            { color: '#FFFFFF', fontWeight: '600', marginLeft: 8 },
                          ]}
                        >
                          {t('analytics.reviewPlanAction')}
                        </Text>
                      </Pressable>
                    ) : (
                      <Pressable
                        accessibilityRole="button"
                        accessibilityLabel={t('analytics.askCoachAction')}
                        onPress={() => handleAskCoach(insight)}
                        style={({ pressed }) => [
                          styles.actionButtonPill,
                          {
                            backgroundColor: colors.accent,
                            borderRadius: radius.md,
                            opacity: pressed ? 0.8 : 1,
                          },
                        ]}
                      >
                        <MessageSquare size={16} color="#FFFFFF" strokeWidth={icons.strokeWidth} />
                        <Text
                          style={[
                            type.secondary,
                            { color: '#FFFFFF', fontWeight: '600', marginLeft: 8 },
                          ]}
                        >
                          {t('analytics.askCoachAction')}
                        </Text>
                      </Pressable>
                    )}
                  </View>
                </View>
              ))
            )}
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  backButton: {
    width: 44,
    height: 44,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitleContainer: {
    flex: 1,
    marginLeft: 8,
  },
  actionButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 16,
  },
  centerContainer: {
    paddingTop: 80,
    alignItems: 'center',
  },
  emptyCard: {
    padding: 24,
    alignItems: 'center',
    borderWidth: StyleSheet.hairlineWidth,
    marginTop: 20,
  },
  iconBadge: {
    width: 64,
    height: 64,
    justifyContent: 'center',
    alignItems: 'center',
  },
  requirementsContainer: {
    alignSelf: 'stretch',
    marginTop: 24,
  },
  requirementTile: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
  },
  requirementTextCol: {
    flex: 1,
    marginLeft: 12,
  },
  emptyActionRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 24,
    alignSelf: 'stretch',
  },
  primaryActionButton: {
    flex: 1,
    minHeight: 48,
    justifyContent: 'center',
    alignItems: 'center',
  },
  secondaryActionButton: {
    flex: 1,
    minHeight: 48,
    justifyContent: 'center',
    alignItems: 'center',
  },
  metricGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: 16,
  },
  metricMiniCard: {
    flexBasis: '48%',
    flexGrow: 1,
    padding: 14,
  },
  stagnantBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderWidth: 1,
    marginBottom: 16,
  },
  stagnantTextCol: {
    flex: 1,
    marginLeft: 12,
  },
  filterTabsRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 16,
  },
  filterChip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    minHeight: 36,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyFilteredContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  insightCard: {
    padding: 18,
    borderWidth: StyleSheet.hairlineWidth,
    marginBottom: 16,
  },
  badgeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  categoryBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  confidenceBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  observationBox: {
    borderLeftWidth: 3,
    paddingLeft: 12,
    marginTop: 10,
  },
  evidenceBox: {
    padding: 12,
    marginTop: 14,
  },
  factorsSection: {
    marginTop: 14,
  },
  factorRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginTop: 4,
  },
  recommendationBox: {
    padding: 14,
    marginTop: 14,
  },
  cardActionRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginTop: 16,
  },
  actionButtonPill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    minHeight: 44,
  },
});
