import React, { useState } from 'react';
import { useRouter } from 'expo-router';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { Clock, Dumbbell, Search, Sparkles } from 'lucide-react-native';

import {
  CircleButton,
  EmptyState,
  InsightCard,
  LargeTitleHeader,
  ListGroup,
  ListRowCard,
  OfflineBanner,
  PrimaryButton,
  SectionHeader,
} from '@/components/ui';
import { USE_FIXTURES } from '@/config/env';
import { TRAIN_FIXTURES } from '@/dev/fixtures';
import { ExercisePicker } from '@/features/workout/exercise-picker';
import { useTokens } from '@/hooks/use-tokens';
import { useTabScrollPadding } from '@/hooks/use-tab-scroll-padding';
import { t } from '@/i18n';
import { pressLight } from '@/lib/haptics';

export default function TrainScreen() {
  const { colors, radius, layout, type, icons } = useTokens();
  const bottomScrollPadding = useTabScrollPadding();
  const router = useRouter();
  const [pickerOpen, setPickerOpen] = useState(false);

  return (
    <View style={[styles.container, { backgroundColor: colors.bg }]}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[
          styles.scrollContent,
          {
            paddingBottom: bottomScrollPadding,
          },
        ]}
      >
        {/* Large Title Header + Exercise Search Action (DESIGN.md §4 & §7.5) */}
        <LargeTitleHeader
          title="Train"
          trailing={
            <CircleButton
              variant="default"
              icon={
                <Search
                  size={20}
                  color={colors.ink}
                  strokeWidth={icons.strokeWidth}
                />
              }
              accessibilityLabel="Search exercise database"
              onPress={() => {
                pressLight();
                setPickerOpen(true);
              }}
            />
          }
        />

        <OfflineBanner />

        {/* Hero Card for Next Workout / Quick Start (DESIGN.md §7.5) */}
        <SectionHeader title="Today's Session" />
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
                    {TRAIN_FIXTURES.heroSession.eyebrow}
                  </Text>
                  <Text
                    style={[
                      type.title,
                      { color: '#FFFFFF', marginTop: 4, marginBottom: 4 },
                    ]}
                  >
                    {TRAIN_FIXTURES.heroSession.title}
                  </Text>
                  <Text style={[type.secondary, { color: 'rgba(255, 255, 255, 0.75)' }]}>
                    {TRAIN_FIXTURES.heroSession.subtitle}
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
                    SESSION
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
                    Start a custom session or search the exercise database below.
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

        {/* Section: My Program (DESIGN.md §7.5) */}
        <SectionHeader title="My Program" />
        <View style={styles.cardWrapper}>
          {USE_FIXTURES ? (
            <ListGroup>
              {TRAIN_FIXTURES.myProgram.map((item) => (
                <ListRowCard
                  key={item.id}
                  label={item.label}
                  subtitle={item.subtitle}
                  icon={
                    <Dumbbell
                      size={icons.cardLabelSize}
                      color={colors.accentText}
                      strokeWidth={icons.strokeWidth}
                    />
                  }
                  onPress={() => {
                    pressLight();
                    router.push('/workout/active');
                  }}
                />
              ))}
            </ListGroup>
          ) : (
            <EmptyState
              title="No Program Assigned"
              description="Programs will be generated by the AI Planner or assigned by your coach in Phase 3."
              icon={
                <Dumbbell
                  size={40}
                  color={colors.inkMuted}
                  strokeWidth={icons.strokeWidth}
                />
              }
              actionText="Create Workout"
              onAction={() => {
                pressLight();
                router.push('/workout/active');
              }}
            />
          )}
        </View>

        {/* Section: Planner (DESIGN.md §7.5) */}
        <SectionHeader title="Planner" />
        <View style={styles.cardWrapper}>
          {USE_FIXTURES ? (
            <InsightCard
              title={TRAIN_FIXTURES.plannerInsight.title}
              description={TRAIN_FIXTURES.plannerInsight.description}
              icon={
                <Sparkles
                  size={24}
                  color={colors.accent}
                  strokeWidth={icons.strokeWidth}
                />
              }
              actionText={TRAIN_FIXTURES.plannerInsight.actionText}
              onAction={() => {
                pressLight();
                setPickerOpen(true);
              }}
            />
          ) : (
            <EmptyState
              title="No Plan Available"
              description="AI Periodization Planner will be activated in Phase 6."
              icon={
                <Sparkles
                  size={40}
                  color={colors.inkMuted}
                  strokeWidth={icons.strokeWidth}
                />
              }
            />
          )}
        </View>

        {/* Section: History (DESIGN.md §7.5) */}
        <SectionHeader title="History" />
        <View style={styles.cardWrapper}>
          {USE_FIXTURES ? (
            <ListGroup>
              {TRAIN_FIXTURES.history.map((item) => (
                <ListRowCard
                  key={item.id}
                  label={item.label}
                  subtitle={item.subtitle}
                  value={item.value}
                  icon={
                    <Clock
                      size={icons.cardLabelSize}
                      color={colors.ink}
                      strokeWidth={icons.strokeWidth}
                    />
                  }
                  onPress={() => router.push({ pathname: '/metric/[id]', params: { id: 'volume' } })}
                />
              ))}
            </ListGroup>
          ) : (
            <EmptyState
              title="No Workout History"
              description="Completed workout sessions will appear here with performance summaries."
              icon={
                <Clock
                  size={40}
                  color={colors.inkMuted}
                  strokeWidth={icons.strokeWidth}
                />
              }
              actionText="Start First Workout"
              onAction={() => {
                pressLight();
                router.push('/workout/active');
              }}
            />
          )}
        </View>

        {/* Section: Exercise Library (DESIGN.md §7.5) */}
        <SectionHeader title="Exercise Library" />
        <View style={styles.cardWrapper}>
          <ListRowCard
            label="Browse Exercise Database"
            subtitle="350+ movements with muscle targeting"
            icon={
              <Search
                size={icons.cardLabelSize}
                color={colors.accentText}
                strokeWidth={icons.strokeWidth}
              />
            }
            onPress={() => {
              pressLight();
              setPickerOpen(true);
            }}
          />
        </View>
      </ScrollView>

      <ExercisePicker
        visible={pickerOpen}
        onClose={() => setPickerOpen(false)}
        onSelect={(_ex) => {
          setPickerOpen(false);
          router.push('/workout/active');
        }}
      />
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
  cardWrapper: {
    paddingHorizontal: 20,
  },
  heroCard: {
    justifyContent: 'space-between',
  },
  heroHeader: {
    gap: 4,
  },
});
