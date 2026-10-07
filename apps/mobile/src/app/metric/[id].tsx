import React, { useState } from 'react';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { Plus } from 'lucide-react-native';

import {
  BarChart,
  Card,
  CircleButton,
  DetailHeader,
  LineChart,
  SegmentedControl,
  Sheet,
  PrimaryButton,
} from '@/components/ui';
import { useTokens } from '@/hooks/use-tokens';
import { useAuthStore } from '@/stores/auth-store';

type TimeRange = 'D' | 'W' | 'M' | '6M' | 'Y';

interface MetricConfig {
  title: string;
  unit: string;
  eyebrow: string;
  heroValue: string;
  dateRange: string;
  chartType: 'line' | 'bar';
  showDaily: boolean;
  aboutTitle: string;
  aboutText: string;
  data: { label: string; value: number | null }[];
}

const METRIC_CONFIGS: Record<string, MetricConfig> = {
  weight: {
    title: 'Body Weight',
    unit: 'kg',
    eyebrow: 'AVERAGE',
    heroValue: '72.4',
    dateRange: 'Oct 5–11, 2026',
    chartType: 'line',
    showDaily: true,
    aboutTitle: 'About Body Weight',
    aboutText:
      'Body weight fluctuates daily based on hydration, sodium intake, and glycogen storage. Track your weekly moving average to reliably identify long-term muscle gain or fat loss trends.',
    data: [
      { label: 'Mon', value: 72.8 },
      { label: 'Tue', value: 72.6 },
      { label: 'Wed', value: 72.5 },
      { label: 'Thu', value: 72.3 },
      { label: 'Fri', value: 72.4 },
      { label: 'Sat', value: 72.2 },
      { label: 'Sun', value: 72.4 },
    ],
  },
  calories: {
    title: 'Calories',
    unit: 'kcal',
    eyebrow: 'AVERAGE',
    heroValue: '1,840',
    dateRange: 'Oct 5–11, 2026',
    chartType: 'bar',
    showDaily: true,
    aboutTitle: 'About Calories',
    aboutText:
      'Daily caloric intake fuels muscle recovery and metabolic performance. Your target is 2,200 kcal/day for lean hypertrophy with a high-protein distribution.',
    data: [
      { label: 'Mon', value: 1850 },
      { label: 'Tue', value: 2100 },
      { label: 'Wed', value: 1780 },
      { label: 'Thu', value: 2150 },
      { label: 'Fri', value: 1920 },
      { label: 'Sat', value: 2200 },
      { label: 'Sun', value: 1840 },
    ],
  },
  volume: {
    title: 'Training Volume',
    unit: 'kg',
    eyebrow: 'TOTAL',
    heroValue: '14,250',
    dateRange: 'Oct 5–11, 2026',
    chartType: 'bar',
    showDaily: false,
    aboutTitle: 'About Training Volume',
    aboutText:
      'Training volume represents total weight moved across working sets (sets × reps × weight). Gradual volume overload week-over-week is the primary driver of hypertrophy.',
    data: [
      { label: 'W1', value: 11200 },
      { label: 'W2', value: 12400 },
      { label: 'W3', value: 13100 },
      { label: 'W4', value: 14250 },
    ],
  },
  workouts: {
    title: 'Workouts',
    unit: 'sessions',
    eyebrow: 'COMPLETED',
    heroValue: '3',
    dateRange: 'Oct 5–11, 2026',
    chartType: 'bar',
    showDaily: true,
    aboutTitle: 'About Workouts',
    aboutText:
      'Consistency is key. Logging 3 to 4 scheduled sessions per week provides optimal stimulus while allowing sufficient recovery for muscular adaptation.',
    data: [
      { label: 'M', value: 1 },
      { label: 'T', value: 0 },
      { label: 'W', value: 1 },
      { label: 'T', value: 0 },
      { label: 'F', value: 1 },
      { label: 'S', value: 0 },
      { label: 'S', value: 0 },
    ],
  },
};

export default function MetricDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { colors, layout, spacing, type } = useTokens();
  const user = useAuthStore((s) => s.user);

  const [selectedRange, setSelectedRange] = useState<TimeRange>('W');
  const [isAddSheetOpen, setIsAddSheetOpen] = useState(false);

  const metricKey = (id ?? 'weight').toLowerCase().replace('body-', '').replace('training-', '');
  const weightUnit = user?.weightUnit;
  const config = (() => {
    const found = METRIC_CONFIGS[metricKey] ?? METRIC_CONFIGS.weight;
    if (metricKey === 'weight' && weightUnit) {
      return { ...found, unit: weightUnit };
    }
    return found;
  })();

  const rangeOptions = (() => {
    const all: { label: string; value: TimeRange }[] = [
      { label: 'D', value: 'D' },
      { label: 'W', value: 'W' },
      { label: 'M', value: 'M' },
      { label: '6M', value: '6M' },
      { label: 'Y', value: 'Y' },
    ];
    return config.showDaily ? all : all.filter((r) => r.value !== 'D');
  })();

  return (
    <View style={[styles.container, { backgroundColor: colors.bg }]}>
      {/* Detail Header (DESIGN.md §4 & §6.2) */}
      <DetailHeader
        title={config.title}
        onBack={() => router.back()}
        trailing={
          <CircleButton
            variant="default"
            icon={<Plus size={22} color={colors.ink} />}
            accessibilityLabel={`Log ${config.title}`}
            onPress={() => setIsAddSheetOpen(true)}
          />
        }
      />

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[styles.scrollContent, { paddingBottom: 48 }]}
      >
        {/* Segmented Control Range Picker (DESIGN.md §6.7) */}
        <View style={styles.segmentedWrapper}>
          <SegmentedControl
            options={rangeOptions}
            value={selectedRange}
            onChange={(val) => setSelectedRange(val)}
            accessibilityLabel="Select time range"
          />
        </View>

        {/* Hero Value Block (DESIGN.md §7.3) */}
        <View style={[styles.heroValueBlock, { paddingHorizontal: layout.screenPadding }]}>
          <Text style={[type.eyebrow, { color: colors.inkMutedText }]}>
            {config.eyebrow}
          </Text>
          <View style={styles.metricRow}>
            <Text style={[type.metricHero, { color: colors.ink }]}>
              {config.heroValue}
            </Text>
            <Text style={[type.unit, styles.unitText]}>
              {config.unit}
            </Text>
          </View>
          <Text style={[type.secondary, { color: colors.inkMutedText, marginTop: 4 }]}>
            {config.dateRange}
          </Text>
        </View>

        {/* Chart Area (DESIGN.md §8) */}
        <View style={[styles.chartWrapper, { paddingHorizontal: layout.screenPadding, marginVertical: spacing.lg }]}>
          {config.chartType === 'line' ? (
            <LineChart data={config.data} height={240} unit={config.unit} />
          ) : (
            <BarChart data={config.data} height={240} unit={config.unit} />
          )}
        </View>

        {/* About Card (DESIGN.md §7.3) */}
        <View style={[styles.aboutSection, { paddingHorizontal: layout.screenPadding }]}>
          <Text style={[type.sectionTitle, { marginBottom: layout.cardGap }]}>
            {config.aboutTitle}
          </Text>
          <Card variant="surface" padding="lg">
            <Text style={[type.body, { color: colors.ink, lineHeight: 24 }]}>
              {config.aboutText}
            </Text>
          </Card>
        </View>
      </ScrollView>

      {/* Add Entry Sheet (DESIGN.md §6.9) */}
      <Sheet
        visible={isAddSheetOpen}
        onClose={() => setIsAddSheetOpen(false)}
        title={`Log ${config.title}`}
        mode="picker"
      >
        <View style={{ gap: 16, paddingVertical: 12 }}>
          <Text style={[type.body, { color: colors.inkMutedText }]}>
            Quick logging for {config.title.toLowerCase()} will save directly to your daily log.
          </Text>
          <PrimaryButton
            label={`Save ${config.title}`}
            onPress={() => setIsAddSheetOpen(false)}
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
});
