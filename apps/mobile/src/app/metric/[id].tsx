import React, { useMemo, useState } from 'react';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { ActivityIndicator, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { Plus } from 'lucide-react-native';

import {
  BarChart,
  Card,
  CircleButton,
  DetailHeader,
  EmptyState,
  LineChart,
  SegmentedControl,
  Sheet,
  PrimaryButton,
} from '@/components/ui';
import {
  useConsistencyProgress,
  useLogWeight,
  useVolumeProgress,
  useWeightProgress,
} from '@/features/progress';
import { useDailyNutritionSummary } from '@/features/nutrition';
import { useTokens } from '@/hooks/use-tokens';
import { notifySuccess, pressLight, selectionTick } from '@/lib/haptics';
import { useAuthStore } from '@/stores/auth-store';

type TimeRange = 'W' | 'M';

export default function MetricDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { colors, layout, spacing, type, radius } = useTokens();
  const user = useAuthStore((s) => s.user);

  const [selectedRange, setSelectedRange] = useState<TimeRange>('W');
  const [isAddSheetOpen, setIsAddSheetOpen] = useState(false);

  // Form state for weight logging
  const [weightInput, setWeightInput] = useState('');
  const [notesInput, setNotesInput] = useState('');

  const metricKey = (id ?? 'weight').toLowerCase().replace('body-', '').replace('training-', '');
  const weightUnit = user?.weightUnit ?? 'kg';

  // Live queries
  const { data: weightData, isLoading: isWeightLoading } = useWeightProgress();
  const logWeightMutation = useLogWeight();

  const todayDateStr = useMemo(() => new Date().toISOString().split('T')[0], []);
  const { data: nutritionData, isLoading: isNutritionLoading } = useDailyNutritionSummary(todayDateStr);

  const { data: volumeData, isLoading: isVolumeLoading } = useVolumeProgress(selectedRange === 'M' ? 'month' : 'week');
  const { data: consistencyData, isLoading: isConsistencyLoading } = useConsistencyProgress();

  const handleOpenAdd = () => {
    selectionTick();
    if (metricKey === 'calories') {
      router.push('/(app)/food');
    } else if (metricKey === 'volume' || metricKey === 'workouts') {
      router.push('/(app)/train');
    } else {
      setWeightInput(weightData?.currentWeightKg ? String(weightData.currentWeightKg) : '');
      setNotesInput('');
      setIsAddSheetOpen(true);
    }
  };

  const handleSaveWeight = async () => {
    const val = Number.parseFloat(weightInput);
    if (Number.isNaN(val) || val < 20 || val > 500) return;

    pressLight();
    await logWeightMutation.mutateAsync({
      weightKg: val,
      notes: notesInput.trim() || undefined,
    });
    notifySuccess();
    setIsAddSheetOpen(false);
  };

  // Determine metadata, values, and chart data based on active metricKey
  const metricDetails = useMemo(() => {
    switch (metricKey) {
      case 'calories':
        return {
          title: 'Calories',
          eyebrow: 'DAILY INTAKE',
          heroValue: nutritionData ? Math.round(nutritionData.totals.calories).toLocaleString() : '--',
          unit: 'kcal',
          dateRange: 'Today',
          chartType: 'bar' as const,
          data: nutritionData
            ? [
                { label: 'Prot', value: Math.round(nutritionData.totals.protein * 4) },
                { label: 'Carbs', value: Math.round(nutritionData.totals.carbs * 4) },
                { label: 'Fat', value: Math.round(nutritionData.totals.fat * 9) },
              ]
            : [],
          aboutTitle: 'About Calorie Tracking',
          aboutText:
            'Your daily caloric and macronutrient intake dictates energy balance and recovery. Tracking meals consistently ensures you stay within your metabolic target.',
          hasData: Boolean(nutritionData && nutritionData.totals.calories > 0),
          isLoading: isNutritionLoading,
        };

      case 'volume':
        return {
          title: 'Training Volume',
          eyebrow: selectedRange === 'M' ? 'MONTHLY VOLUME' : 'WEEKLY VOLUME',
          heroValue: volumeData ? Math.round(volumeData.totalVolumeKg).toLocaleString() : '--',
          unit: 'kg',
          dateRange: selectedRange === 'M' ? 'Last 30 Days' : 'Last 7 Days',
          chartType: 'bar' as const,
          data: volumeData?.history.map((h) => ({
            label: h.label.length > 5 ? h.label.slice(5) : h.label,
            value: h.volumeKg,
          })) ?? [],
          aboutTitle: 'About Training Volume',
          aboutText:
            'Total training volume (weight x reps across completed working sets) is the primary driver of muscular hypertrophy and athletic adaptation.',
          hasData: Boolean(volumeData && volumeData.totalVolumeKg > 0),
          isLoading: isVolumeLoading,
        };

      case 'workouts':
        return {
          title: 'Workouts',
          eyebrow: 'WEEKLY CONSISTENCY',
          heroValue: consistencyData ? `${consistencyData.completedSessions} of ${consistencyData.plannedSessions}` : '--',
          unit: 'done',
          dateRange: consistencyData
            ? `${consistencyData.consistencyPct}% consistency · ${consistencyData.streakWeeks}-week streak`
            : 'This Week',
          chartType: 'bar' as const,
          data: consistencyData?.weeklyBreakdown.map((w) => ({
            label: w.weekLabel.length > 8 ? w.weekLabel.slice(0, 7) : w.weekLabel,
            value: w.completed,
          })) ?? [],
          aboutTitle: 'About Workout Adherence',
          aboutText:
            'Consistency is the most vital metric in strength development. Regular weekly training sessions establish adaptive stimulus without overreaching.',
          hasData: Boolean(consistencyData && consistencyData.weeklyBreakdown.some((w) => w.completed > 0)),
          isLoading: isConsistencyLoading,
        };

      case 'weight':
      default:
        return {
          title: 'Body Weight',
          eyebrow: 'CURRENT WEIGHT',
          heroValue: weightData?.currentWeightKg ? String(weightData.currentWeightKg) : '--',
          unit: weightUnit,
          dateRange: weightData?.changeThisMonthKg !== null && weightData?.changeThisMonthKg !== undefined
            ? `${weightData.changeThisMonthKg > 0 ? '+' : ''}${weightData.changeThisMonthKg} ${weightUnit} this month`
            : (weightData?.currentWeightKg ? 'Latest measurement' : 'No logs yet'),
          chartType: 'line' as const,
          data: weightData?.history.map((h) => ({
            label: h.date.slice(5),
            value: h.weightKg,
          })) ?? [],
          aboutTitle: 'About Body Weight Tracking',
          aboutText:
            'Body weight naturally fluctuates daily due to hydration, glycogen, and sodium. Regularly logging your morning weight reveals your true rate of progress.',
          hasData: Boolean(weightData && weightData.history.length > 0),
          isLoading: isWeightLoading,
        };
    }
  }, [metricKey, weightData, isWeightLoading, nutritionData, isNutritionLoading, volumeData, isVolumeLoading, consistencyData, isConsistencyLoading, selectedRange, weightUnit]);

  return (
    <View style={[styles.container, { backgroundColor: colors.bg }]}>
      {/* Detail Header */}
      <DetailHeader
        title={metricDetails.title}
        onBack={() => router.back()}
        trailing={
          <CircleButton
            variant="default"
            icon={<Plus size={22} color={colors.ink} />}
            accessibilityLabel={`Log ${metricDetails.title}`}
            onPress={handleOpenAdd}
          />
        }
      />

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[styles.scrollContent, { paddingBottom: 48 }]}
      >
        {/* Time range selector for Volume */}
        {metricKey === 'volume' && (
          <View style={styles.segmentedWrapper}>
            <SegmentedControl
              options={[
                { label: 'Week', value: 'W' },
                { label: 'Month', value: 'M' },
              ]}
              value={selectedRange}
              onChange={(val) => setSelectedRange(val as TimeRange)}
              accessibilityLabel="Select time range"
            />
          </View>
        )}

        {metricDetails.isLoading ? (
          <View style={{ paddingVertical: 60, alignItems: 'center' }}>
            <ActivityIndicator size="large" color={colors.accent} />
          </View>
        ) : !metricDetails.hasData ? (
          <View style={{ paddingHorizontal: layout.screenPadding, marginTop: spacing.xl }}>
            <EmptyState
              title="No Historical Data"
              description={`No entries logged for ${metricDetails.title.toLowerCase()} yet. Start logging to track your long-term progression.`}
              actionText={`+ Log ${metricDetails.title}`}
              onAction={handleOpenAdd}
            />
          </View>
        ) : (
          <>
            {/* Hero Value Block */}
            <View style={[styles.heroValueBlock, { paddingHorizontal: layout.screenPadding }]}>
              <Text style={[type.eyebrow, { color: colors.inkMutedText }]}>
                {metricDetails.eyebrow}
              </Text>
              <View style={styles.metricRow}>
                <Text style={[type.metricHero, { color: colors.ink }]}>
                  {metricDetails.heroValue}
                </Text>
                <Text style={[type.unit, styles.unitText]}>
                  {metricDetails.unit}
                </Text>
              </View>
              <Text style={[type.secondary, { color: colors.inkMutedText, marginTop: 4 }]}>
                {metricDetails.dateRange}
              </Text>
            </View>

            {/* Chart Area */}
            {metricDetails.data.length > 0 && (
              <View style={[styles.chartWrapper, { paddingHorizontal: layout.screenPadding, marginVertical: spacing.lg }]}>
                {metricDetails.chartType === 'line' ? (
                  <LineChart data={metricDetails.data} height={240} unit={metricDetails.unit} />
                ) : (
                  <BarChart data={metricDetails.data} height={240} unit={metricDetails.unit} />
                )}
              </View>
            )}

            {/* Muscle Breakdown Card for Volume */}
            {metricKey === 'volume' && volumeData && volumeData.byMuscleGroup.length > 0 && (
              <View style={[styles.aboutSection, { paddingHorizontal: layout.screenPadding }]}>
                <Text style={[type.sectionTitle, { marginBottom: layout.cardGap }]}>
                  Muscle Group Distribution
                </Text>
                <Card variant="surface" padding="lg">
                  <View style={{ gap: 12 }}>
                    {volumeData.byMuscleGroup.map((m) => (
                      <View key={m.muscleGroup} style={{ gap: 4 }}>
                        <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                          <Text style={[type.cardLabel, { color: colors.ink, textTransform: 'capitalize' }]}>
                            {m.muscleGroup}
                          </Text>
                          <Text style={[type.secondary, { color: colors.inkMutedText }]}>
                            {m.volumeKg.toLocaleString()} kg ({m.percentage}%)
                          </Text>
                        </View>
                        <View style={[styles.track, { backgroundColor: colors.surfaceMuted, borderRadius: radius.pill }]}>
                          <View
                            style={[
                              styles.fill,
                              {
                                width: `${Math.min(100, Math.max(0, m.percentage))}%`,
                                backgroundColor: colors.accent,
                                borderRadius: radius.pill,
                              },
                            ]}
                          />
                        </View>
                      </View>
                    ))}
                  </View>
                </Card>
              </View>
            )}

            {/* Contextual Educational Card */}
            <View style={[styles.aboutSection, { paddingHorizontal: layout.screenPadding }]}>
              <Text style={[type.sectionTitle, { marginBottom: layout.cardGap }]}>
                {metricDetails.aboutTitle}
              </Text>
              <Card variant="surface" padding="lg">
                <Text style={[type.body, { color: colors.ink, lineHeight: 24 }]}>
                  {metricDetails.aboutText}
                </Text>
              </Card>
            </View>
          </>
        )}
      </ScrollView>

      {/* Log Weight Entry Sheet */}
      <Sheet
        visible={isAddSheetOpen}
        onClose={() => setIsAddSheetOpen(false)}
        title="Log Body Weight"
        mode="picker"
      >
        <View style={{ gap: 16, paddingVertical: 12 }}>
          <View style={{ gap: 4 }}>
            <Text style={[type.caption, { color: colors.inkMutedText }]}>
              BODY WEIGHT ({weightUnit.toUpperCase()})
            </Text>
            <TextInput
              value={weightInput}
              onChangeText={setWeightInput}
              placeholder="e.g. 74.5"
              keyboardType="decimal-pad"
              placeholderTextColor={colors.inkMutedText}
              style={[
                styles.formInput,
                type.body,
                {
                  backgroundColor: colors.surfaceMuted,
                  borderRadius: radius.md,
                  color: colors.ink,
                  borderColor: colors.hairline,
                },
              ]}
              autoFocus
            />
          </View>

          <View style={{ gap: 4 }}>
            <Text style={[type.caption, { color: colors.inkMutedText }]}>
              NOTES (OPTIONAL)
            </Text>
            <TextInput
              value={notesInput}
              onChangeText={setNotesInput}
              placeholder="e.g. Morning weigh-in before breakfast"
              placeholderTextColor={colors.inkMutedText}
              style={[
                styles.formInput,
                type.body,
                {
                  backgroundColor: colors.surfaceMuted,
                  borderRadius: radius.md,
                  color: colors.ink,
                  borderColor: colors.hairline,
                },
              ]}
            />
          </View>

          <View style={{ marginTop: 8 }}>
            <PrimaryButton
              label={logWeightMutation.isPending ? 'Saving...' : 'Save Measurement'}
              onPress={handleSaveWeight}
            />
          </View>
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
  segmentedWrapper: {
    paddingHorizontal: 20,
    marginBottom: 20,
  },
  heroValueBlock: {
    marginBottom: 12,
  },
  metricRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    marginTop: 4,
  },
  unitText: {
    marginLeft: 6,
  },
  chartWrapper: {
    alignSelf: 'stretch',
  },
  aboutSection: {
    marginTop: 20,
  },
  track: {
    height: 6,
    width: '100%',
    overflow: 'hidden',
  },
  fill: {
    height: '100%',
  },
  formInput: {
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderWidth: StyleSheet.hairlineWidth,
  },
});
