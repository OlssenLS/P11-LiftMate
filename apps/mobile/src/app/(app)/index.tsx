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
  PrimaryButton,
  SectionHeader,
} from '@/components/ui';
import { useTokens } from '@/hooks/use-tokens';
import { useTabScrollPadding } from '@/hooks/use-tab-scroll-padding';
import { t } from '@/i18n';
import { pressLight } from '@/lib/haptics';
import { useAuthStore } from '@/stores/auth-store';

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

        {/* Section: Next Workout */}
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
            <View style={styles.heroHeader}>
              <Text
                style={[
                  type.eyebrow,
                  { color: 'rgba(255, 255, 255, 0.70)', letterSpacing: 0.6 },
                ]}
              >
                PULL & HYPERTROPHY
              </Text>
              <Text
                style={[
                  type.title,
                  { color: '#FFFFFF', marginTop: 4, marginBottom: 4 },
                ]}
              >
                Pull Day
              </Text>
              <Text style={[type.secondary, { color: 'rgba(255, 255, 255, 0.75)' }]}>
                Pull · 44 min · 5 exercises
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
            value="1,840"
            unit="kcal"
            sublabel="of 2,200 target"
            sparklineData={[1650, 1900, 1780, 2120, 1840]}
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
            value="3"
            unit="done"
            sublabel="of 4 planned"
            sparklineData={[1, 0, 1, 1]}
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
            value="72.4"
            unit={user?.weightUnit ?? 'kg'}
            sparklineData={[73.5, 73.1, 72.8, 72.6, 72.4]}
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
            value="14,250"
            unit="kg"
            sublabel="Total tonnage lifted"
            sparklineData={[11200, 12800, 13400, 14250]}
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
        {!insightDismissed ? (
          <>
            <SectionHeader title="Insights" />
            <View style={styles.cardWrapper}>
              <InsightCard
                title="Upper body volume on track"
                description="You've completed 12 chest and back sets this week. Optimal range for hypertrophy is 10–16 sets."
                icon={
                  <Sparkles
                    size={24}
                    color={colors.accent}
                    strokeWidth={icons.strokeWidth}
                  />
                }
                actionText="View breakdown"
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
