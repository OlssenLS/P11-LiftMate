import React, { useState } from 'react';
import { useRouter } from 'expo-router';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { Clock, Dumbbell, Search, Sparkles } from 'lucide-react-native';

import {
  CircleButton,
  InsightCard,
  LargeTitleHeader,
  ListGroup,
  ListRowCard,
  PrimaryButton,
  SectionHeader,
} from '@/components/ui';
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

        {/* Section: My Program (DESIGN.md §7.5) */}
        <SectionHeader title="My Program" />
        <View style={styles.cardWrapper}>
          <ListGroup>
            <ListRowCard
              label="Day 1: Upper Body Strength"
              subtitle="Chest, Back, Arms · 6 exercises"
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
            <ListRowCard
              label="Day 2: Lower Body Strength"
              subtitle="Quads, Hamstrings, Calves · 5 exercises"
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
            <ListRowCard
              label="Day 3: Upper Body Hypertrophy"
              subtitle="Shoulders, Back, Arms · 7 exercises"
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
            <ListRowCard
              label="Day 4: Lower Body Hypertrophy"
              subtitle="Legs, Glutes, Core · 6 exercises"
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
          </ListGroup>
        </View>

        {/* Section: Planner (DESIGN.md §7.5) */}
        <SectionHeader title="Planner" />
        <View style={styles.cardWrapper}>
          <InsightCard
            title="AI Periodization Planner"
            description="Your deload week is scheduled in 10 days. Auto-progression will adjust set counts after Friday."
            icon={
              <Sparkles
                size={24}
                color={colors.accent}
                strokeWidth={icons.strokeWidth}
              />
            }
            actionText="Review Plan"
            onAction={() => {
              pressLight();
              setPickerOpen(true);
            }}
          />
        </View>

        {/* Section: History (DESIGN.md §7.5) */}
        <SectionHeader title="History" />
        <View style={styles.cardWrapper}>
          <ListGroup>
            <ListRowCard
              label="Pull Day"
              subtitle="Yesterday · 44 min · 14,250 kg"
              value="PRs: 2"
              icon={
                <Clock
                  size={icons.cardLabelSize}
                  color={colors.ink}
                  strokeWidth={icons.strokeWidth}
                />
              }
              onPress={() => router.push({ pathname: '/metric/[id]', params: { id: 'volume' } })}
            />
            <ListRowCard
              label="Lower Body Strength"
              subtitle="3 days ago · 52 min · 18,100 kg"
              value="PRs: 1"
              icon={
                <Clock
                  size={icons.cardLabelSize}
                  color={colors.ink}
                  strokeWidth={icons.strokeWidth}
                />
              }
              onPress={() => router.push({ pathname: '/metric/[id]', params: { id: 'volume' } })}
            />
          </ListGroup>
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
