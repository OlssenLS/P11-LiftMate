import React, { useState } from 'react';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
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
import { USE_FIXTURES } from '@/config/env';
import { METRIC_CONFIG_FIXTURES } from '@/dev/fixtures';
import { useTokens } from '@/hooks/use-tokens';
import { useAuthStore } from '@/stores/auth-store';

type TimeRange = 'D' | 'W' | 'M' | '6M' | 'Y';

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
    const found = METRIC_CONFIG_FIXTURES[metricKey] ?? METRIC_CONFIG_FIXTURES.weight;
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

        {!USE_FIXTURES ? (
          <View style={{ paddingHorizontal: layout.screenPadding, marginTop: spacing.xl }}>
            <EmptyState
              title="No Data"
              description={`No historical data logged for ${config.title.toLowerCase()} yet. Metrics will populate in Phase 5.`}
              actionText={`Log ${config.title}`}
              onAction={() => setIsAddSheetOpen(true)}
            />
          </View>
        ) : (
          <>
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
          </>
        )}
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
