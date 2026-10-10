import React, { useMemo, useState } from 'react';
import { useRouter } from 'expo-router';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import Svg, { Defs, LinearGradient as SvgGradient, Rect, Stop } from 'react-native-svg';
import {
  Calendar,
  Dumbbell,
  Flame,
  Scale,
  Sparkles,
  TrendingUp,
} from 'lucide-react-native';

import {
  InsightCard,
  LargeTitleHeader,
  ListRowCard,
  MetricCard,
  OfflineBanner,
  PrimaryButton,
  SectionHeader,
} from '@/components/ui';
import { useTokens } from '@/hooks/use-tokens';
import { useTabScrollPadding } from '@/hooks/use-tab-scroll-padding';
import { t } from '@/i18n';
import { pressLight } from '@/lib/haptics';
import { useAuthStore } from '@/stores/auth-store';

import { USE_FIXTURES } from '@/config/env';
import { HOME_FIXTURES } from '@/dev/fixtures';

export default function HomeScreen() {
  const { colors, radius, layout, type, floatingShadow, icons, touchTarget } = useTokens();
  const bottomScrollPadding = useTabScrollPadding();
  const router = useRouter();
  const user = useAuthStore((s) => s.user);

  const [insightDismissed, setInsightDismissed] = useState(false);

  const todayEyebrow = useMemo(() => {
    try {
      return new Intl.DateTimeFormat('en-US', {
        weekday: 'long',
        day: 'numeric',
        month: 'short',
      })
        .format(new Date())
        .toUpperCase();
    } catch {
      return 'TODAY';
    }
  }, []);

  const initials = (() => {
    if (!user?.displayName) return 'L';
    const parts = user.displayName.trim().split(/\s+/);
    if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  })();

  return (
    <View style={[styles.container, { backgroundColor: colors.bg }]}>
      {/* Background Header Gradient (DESIGN.md §4 & §7.2) */}
      <Svg
        height={280}
        width="100%"
        style={styles.headerGradient}
        pointerEvents="none"
      >
        <Defs>
          <SvgGradient id="homeHeaderGrad" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor={colors.accentSoft} stopOpacity="1" />
            <Stop offset="1" stopColor={colors.bg} stopOpacity="1" />
          </SvgGradient>
        </Defs>
        <Rect x="0" y="0" width="100%" height={280} fill="url(#homeHeaderGrad)" />
      </Svg>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[
          styles.scrollContent,
          {
            paddingBottom: bottomScrollPadding,
          },
        ]}
      >
        {/* Large Title Header + Avatar (DESIGN.md §4 & §7.2) */}
        <LargeTitleHeader
          eyebrow={todayEyebrow}
          title="Today"
          trailing={
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Open Profile & Settings"
              onPress={() => router.push('/(app)/you')}
              hitSlop={Math.max(0, (touchTarget.min - 44) / 2)}
              style={({ pressed }) => [
                styles.avatarHitArea,
                { minWidth: touchTarget.min, minHeight: touchTarget.min },
              ]}
            >
              {({ pressed }) => (
                <View
                  style={[
                    styles.avatarVisual,
                    floatingShadow,
                    {
                      backgroundColor: colors.surface,
                      borderRadius: radius.pill,
                      opacity: pressed ? 0.85 : 1,
                      transform: [{ scale: pressed ? 0.96 : 1 }],
                    },
                  ]}
                >
                  <Text style={[type.cardLabel, { color: colors.ink }]}>
                    {initials}
                  </Text>
                </View>
              )}
            </Pressable>
          }
        />

        <OfflineBanner />

        {/* Section: Next Workout (Spec §12) */}
        <SectionHeader title="Next workout" />

        {/* Signature Dark Hero Card (DESIGN.md §7.2 & §14.2) */}
        <View style={styles.cardWrapper}>
          <View
            style={[
              styles.heroCard,
              {
                backgroundColor: colors.ink,
                borderRadius: radius.xl,
                padding: layout.cardPaddingHero,
              },
            ]}
          >
            {USE_FIXTURES ? (
              <>
                <View style={styles.heroHeader}>
                  <Text
                    style={[
                      type.eyebrow,
                      { color: 'rgba(255, 255, 255, 0.70)', letterSpacing: 0.6 },
                    ]}
                  >
                    {HOME_FIXTURES.nextWorkout.eyebrow}
                  </Text>
                  <Text
                    style={[
                      type.title,
                      { color: '#FFFFFF', marginTop: 4, marginBottom: 4 },
                    ]}
                  >
                    {HOME_FIXTURES.nextWorkout.title}
                  </Text>
                  <Text style={[type.secondary, { color: 'rgba(255, 255, 255, 0.75)' }]}>
                    {HOME_FIXTURES.nextWorkout.subtitle}
                  </Text>
                </View>

                <View style={{ marginTop: 20 }}>
                  <PrimaryButton
                    label={t('home.heroAction')}
                    onPress={() => {
                      pressLight();
                      router.push('/workout/active');
                    }}
                  />
                </View>
              </>
            ) : (
              <>
                <View style={styles.heroHeader}>
                  <Text
                    style={[
                      type.eyebrow,
                      { color: 'rgba(255, 255, 255, 0.70)', letterSpacing: 0.6 },
                    ]}
                  >
                    SCHEDULE
                  </Text>
                  <Text
                    style={[
                      type.title,
                      { color: '#FFFFFF', marginTop: 4, marginBottom: 4 },
                    ]}
                  >
                    No workout scheduled
                  </Text>
                  <Text style={[type.secondary, { color: 'rgba(255, 255, 255, 0.75)' }]}>
                    Start a custom session or pick an exercise to train today.
                  </Text>
                </View>

                <View style={{ marginTop: 20 }}>
                  <PrimaryButton
                    label="Create Workout"
                    onPress={() => {
                      pressLight();
                      router.push('/workout/active');
                    }}
                  />
                </View>
              </>
            )}
          </View>
        </View>

        {/* Section: Summary */}
        <SectionHeader title="Summary" />

        <View style={[styles.cardWrapper, { gap: layout.cardGap }]}>
          {/* 1. Calories MetricCard */}
          <MetricCard
            label="Calories"
            icon={
              <Flame
                size={icons.cardLabelSize}
                color={colors.accentText}
                strokeWidth={icons.strokeWidth}
              />
            }
            timestamp="Today"
            value={USE_FIXTURES ? HOME_FIXTURES.metrics.calories.value : '--'}
            unit="kcal"
            sublabel={USE_FIXTURES ? HOME_FIXTURES.metrics.calories.sublabel : 'No data logged'}
            sparklineData={USE_FIXTURES ? [...HOME_FIXTURES.metrics.calories.sparkline] : undefined}
            onPress={() => router.push({ pathname: '/metric/[id]', params: { id: 'calories' } })}
          />

          {/* 2. Workouts MetricCard */}
          <MetricCard
            label="Workouts"
            icon={
              <Dumbbell
                size={icons.cardLabelSize}
                color={colors.accentText}
                strokeWidth={icons.strokeWidth}
              />
            }
            timestamp="This Week"
            value={USE_FIXTURES ? HOME_FIXTURES.metrics.workouts.value : '--'}
            unit="done"
            sublabel={USE_FIXTURES ? HOME_FIXTURES.metrics.workouts.sublabel : 'No data logged'}
            sparklineData={USE_FIXTURES ? [...HOME_FIXTURES.metrics.workouts.sparkline] : undefined}
            onPress={() => router.push({ pathname: '/metric/[id]', params: { id: 'workouts' } })}
          />

          {/* 3. Body Weight MetricCard */}
          <MetricCard
            label="Body Weight"
            icon={
              <Scale
                size={icons.cardLabelSize}
                color={colors.accentText}
                strokeWidth={icons.strokeWidth}
              />
            }
            timestamp="Latest"
            value={USE_FIXTURES ? HOME_FIXTURES.metrics.weight.value : '--'}
            unit={user?.weightUnit ?? 'kg'}
            sublabel={USE_FIXTURES ? undefined : 'No data logged'}
            sparklineData={USE_FIXTURES ? [...HOME_FIXTURES.metrics.weight.sparkline] : undefined}
            onPress={() => router.push({ pathname: '/metric/[id]', params: { id: 'weight' } })}
          />

          {/* 4. Training Volume MetricCard */}
          <MetricCard
            label="Training Volume"
            icon={
              <TrendingUp
                size={icons.cardLabelSize}
                color={colors.accentText}
                strokeWidth={icons.strokeWidth}
              />
            }
            timestamp="This Week"
            value={USE_FIXTURES ? HOME_FIXTURES.metrics.volume.value : '--'}
            unit="kg"
            sublabel={USE_FIXTURES ? HOME_FIXTURES.metrics.volume.sublabel : 'No data logged'}
            sparklineData={USE_FIXTURES ? [...HOME_FIXTURES.metrics.volume.sparkline] : undefined}
            onPress={() => router.push({ pathname: '/metric/[id]', params: { id: 'volume' } })}
          />

          {/* ListRowCard: Show All Data */}
          <ListRowCard
            label="Show All Data"
            icon={
              <Calendar
                size={icons.defaultSize}
                color={colors.ink}
                strokeWidth={icons.strokeWidth}
              />
            }
            onPress={() => router.push('/(app)/train')}
          />
        </View>

        {/* Section: Insights (DESIGN.md §7.2) */}
        {USE_FIXTURES && !insightDismissed ? (
          <>
            <SectionHeader title="Insights" />
            <View style={styles.cardWrapper}>
              <InsightCard
                title={HOME_FIXTURES.insight.title}
                description={HOME_FIXTURES.insight.description}
                icon={
                  <Sparkles
                    size={24}
                    color={colors.accent}
                    strokeWidth={icons.strokeWidth}
                  />
                }
                actionText={HOME_FIXTURES.insight.actionText}
                onAction={() => router.push('/(app)/train')}
                onDismiss={() => setInsightDismissed(true)}
              />
            </View>
          </>
        ) : null}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  headerGradient: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
  },
  scrollContent: {
    maxWidth: 600,
    width: '100%',
    alignSelf: 'center',
  },
  cardWrapper: {
    paddingHorizontal: 20,
  },
  heroCard: {
    justifyContent: 'space-between',
  },
  heroHeader: {
    gap: 4,
  },
  avatarHitArea: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarVisual: {
    width: 44,
    height: 44,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
