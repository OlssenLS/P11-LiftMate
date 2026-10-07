import React, { useState } from 'react';
import { useRouter } from 'expo-router';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import {
  Apple,
  Coffee,
  Flame,
  Moon,
  Plus,
  Utensils,
} from 'lucide-react-native';

import {
  Card,
  CircleButton,
  LargeTitleHeader,
  ListGroup,
  ListRowCard,
  MetricCard,
  PrimaryButton,
  SectionHeader,
  Sheet,
} from '@/components/ui';
import { useTokens } from '@/hooks/use-tokens';
import { useTabScrollPadding } from '@/hooks/use-tab-scroll-padding';
import { selectionTick } from '@/lib/haptics';

interface MealItem {
  id: string;
  name: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
}

const WEEK_DAYS = [
  { key: 'mon', label: 'M', dayNum: '5' },
  { key: 'tue', label: 'T', dayNum: '6' },
  { key: 'wed', label: 'W', dayNum: '7' },
  { key: 'thu', label: 'T', dayNum: '8' },
  { key: 'fri', label: 'F', dayNum: '9' },
  { key: 'sat', label: 'S', dayNum: '10' },
  { key: 'sun', label: 'S', dayNum: '11' },
];

export default function FoodScreen() {
  const { colors, radius, layout, type, icons, touchTarget } = useTokens();
  const bottomScrollPadding = useTabScrollPadding();
  const router = useRouter();

  const [selectedDayKey, setSelectedDayKey] = useState('wed');
  const [activeMealCategory, setActiveMealCategory] = useState<string | null>(null);
  const [editingItem, setEditingItem] = useState<MealItem | null>(null);

  const isSheetOpen = activeMealCategory !== null || editingItem !== null;

  const handleCloseSheet = () => {
    setActiveMealCategory(null);
    setEditingItem(null);
  };

  const macros = [
    { name: 'Protein', current: 142, target: 160, unit: 'g' },
    { name: 'Carbs', current: 195, target: 240, unit: 'g' },
    { name: 'Fat', current: 58, target: 70, unit: 'g' },
  ];

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
        {/* Large Title Header + Add Action (DESIGN.md §4 & §7.7) */}
        <LargeTitleHeader
          title="Food"
          trailing={
            <CircleButton
              variant="default"
              icon={
                <Plus
                  size={22}
                  color={colors.ink}
                  strokeWidth={icons.strokeWidth}
                />
              }
              accessibilityLabel="Quick log food"
              onPress={() => setActiveMealCategory('Lunch')}
            />
          }
        />

        {/* Week Strip of 7 Date Circles (DESIGN.md §7.7) */}
        <View style={styles.cardWrapper}>
          <View
            style={[
              styles.weekStripContainer,
              {
                backgroundColor: colors.surfaceMuted,
                borderRadius: radius.lg,
              },
            ]}
          >
            {WEEK_DAYS.map((day) => {
              const isSelected = day.key === selectedDayKey;

              return (
                <Pressable
                  key={day.key}
                  accessibilityRole="button"
                  accessibilityState={{ selected: isSelected }}
                  accessibilityLabel={`October ${day.dayNum}`}
                  onPress={() => {
                    selectionTick();
                    setSelectedDayKey(day.key);
                  }}
                  hitSlop={Math.max(0, (touchTarget.min - 44) / 2)}
                  style={styles.dayHitArea}
                >
                  <View
                    style={[
                      styles.dayCircle,
                      {
                        backgroundColor: isSelected ? colors.accent : colors.surface,
                      },
                    ]}
                  >
                    <Text
                      style={[
                        type.caption,
                        {
                          color: isSelected ? '#FFFFFF' : colors.inkMutedText,
                          fontWeight: '600',
                          fontSize: 11,
                        },
                      ]}
                    >
                      {day.label}
                    </Text>
                    <Text
                      style={[
                        type.cardLabel,
                        {
                          color: isSelected ? '#FFFFFF' : colors.ink,
                          fontWeight: '700',
                          fontSize: 14,
                          lineHeight: 18,
                        },
                      ]}
                    >
                      {day.dayNum}
                    </Text>
                  </View>
                </Pressable>
              );
            })}
          </View>
        </View>

        {/* Calories Summary MetricCard (DESIGN.md §7.7) */}
        <SectionHeader title="Daily Summary" />
        <View style={styles.cardWrapper}>
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
            sublabel="of 2,200 kcal budget"
            sparklineData={[1650, 1900, 1780, 2120, 1840]}
            onPress={() =>
              router.push({
                pathname: '/metric/[id]',
                params: { id: 'calories' },
              })
            }
          />
        </View>

        {/* Macro Distribution Mini-Bars (DESIGN.md §7.7) */}
        <View style={[styles.cardWrapper, { marginTop: layout.cardGap }]}>
          <Card variant="surface" padding="lg">
            <View style={{ gap: 14 }}>
              {macros.map((m) => {
                const pct = Math.min(100, Math.round((m.current / m.target) * 100));

                return (
                  <View key={m.name} style={{ gap: 6 }}>
                    <View style={styles.macroHeaderRow}>
                      <Text style={[type.cardLabel, { color: colors.ink, fontSize: 15 }]}>
                        {m.name}
                      </Text>
                      <Text style={[type.secondary, { color: colors.inkMutedText }]}>
                        {m.current} / {m.target} {m.unit}
                      </Text>
                    </View>

                    {/* Progress track */}
                    <View
                      style={[
                        styles.macroTrack,
                        {
                          backgroundColor: colors.surfaceMuted,
                          borderRadius: radius.pill,
                        },
                      ]}
                    >
                      <View
                        style={[
                          styles.macroFill,
                          {
                            width: `${pct}%`,
                            backgroundColor: colors.accent,
                            borderRadius: radius.pill,
                          },
                        ]}
                      />
                    </View>
                  </View>
                );
              })}
            </View>
          </Card>
        </View>

        {/* Section: Breakfast (DESIGN.md §7.7) */}
        <SectionHeader
          title="Breakfast · 520 kcal"
          actionText="+ Add"
          onAction={() => setActiveMealCategory('Breakfast')}
        />
        <View style={styles.cardWrapper}>
          <ListGroup>
            <ListRowCard
              label="Oatmeal with Whey & Berries"
              subtitle="420 kcal · 32g P · 54g C · 8g F"
              icon={
                <Coffee
                  size={icons.cardLabelSize}
                  color={colors.accentText}
                  strokeWidth={icons.strokeWidth}
                />
              }
              onPress={() =>
                setEditingItem({
                  id: '1',
                  name: 'Oatmeal with Whey & Berries',
                  calories: 420,
                  protein: 32,
                  carbs: 54,
                  fat: 8,
                })
              }
            />
            <ListRowCard
              label="Whole Milk Latte"
              subtitle="100 kcal · 6g P · 8g C · 5g F"
              icon={
                <Coffee
                  size={icons.cardLabelSize}
                  color={colors.accentText}
                  strokeWidth={icons.strokeWidth}
                />
              }
              onPress={() =>
                setEditingItem({
                  id: '2',
                  name: 'Whole Milk Latte',
                  calories: 100,
                  protein: 6,
                  carbs: 8,
                  fat: 5,
                })
              }
            />
          </ListGroup>
        </View>

        {/* Section: Lunch (DESIGN.md §7.7) */}
        <SectionHeader
          title="Lunch · 680 kcal"
          actionText="+ Add"
          onAction={() => setActiveMealCategory('Lunch')}
        />
        <View style={styles.cardWrapper}>
          <ListGroup>
            <ListRowCard
              label="Grilled Chicken Rice Bowl"
              subtitle="680 kcal · 48g P · 72g C · 16g F"
              icon={
                <Utensils
                  size={icons.cardLabelSize}
                  color={colors.accentText}
                  strokeWidth={icons.strokeWidth}
                />
              }
              onPress={() =>
                setEditingItem({
                  id: '3',
                  name: 'Grilled Chicken Rice Bowl',
                  calories: 680,
                  protein: 48,
                  carbs: 72,
                  fat: 16,
                })
              }
            />
          </ListGroup>
        </View>

        {/* Section: Dinner (DESIGN.md §7.7) */}
        <SectionHeader
          title="Dinner · 540 kcal"
          actionText="+ Add"
          onAction={() => setActiveMealCategory('Dinner')}
        />
        <View style={styles.cardWrapper}>
          <ListGroup>
            <ListRowCard
              label="Salmon Fillet with Sweet Potato"
              subtitle="540 kcal · 42g P · 45g C · 18g F"
              icon={
                <Moon
                  size={icons.cardLabelSize}
                  color={colors.accentText}
                  strokeWidth={icons.strokeWidth}
                />
              }
              onPress={() =>
                setEditingItem({
                  id: '4',
                  name: 'Salmon Fillet with Sweet Potato',
                  calories: 540,
                  protein: 42,
                  carbs: 45,
                  fat: 18,
                })
              }
            />
          </ListGroup>
        </View>

        {/* Section: Snacks (DESIGN.md §7.7) */}
        <SectionHeader
          title="Snacks · 100 kcal"
          actionText="+ Add"
          onAction={() => setActiveMealCategory('Snacks')}
        />
        <View style={styles.cardWrapper}>
          <ListGroup>
            <ListRowCard
              label="Greek Yogurt Cup"
              subtitle="100 kcal · 14g P · 6g C · 1g F"
              icon={
                <Apple
                  size={icons.cardLabelSize}
                  color={colors.accentText}
                  strokeWidth={icons.strokeWidth}
                />
              }
              onPress={() =>
                setEditingItem({
                  id: '5',
                  name: 'Greek Yogurt Cup',
                  calories: 100,
                  protein: 14,
                  carbs: 6,
                  fat: 1,
                })
              }
            />
          </ListGroup>
        </View>
      </ScrollView>

      {/* Add / Edit Meal Sheet (DESIGN.md §6.9 & §7.7) */}
      <Sheet
        visible={isSheetOpen}
        onClose={handleCloseSheet}
        title={
          editingItem
            ? `Edit ${editingItem.name}`
            : `Add to ${activeMealCategory ?? 'Meal'}`
        }
        mode="picker"
      >
        <View style={{ gap: 16, paddingVertical: 12 }}>
          <Text style={[type.body, { color: colors.inkMutedText }]}>
            {editingItem
              ? `${editingItem.calories} kcal · ${editingItem.protein}g protein logged.`
              : 'Log items by scanning nutrition labels, typing ingredients, or snapping an AI photo.'}
          </Text>
          <PrimaryButton
            label={editingItem ? 'Save Changes' : 'Log Food'}
            onPress={handleCloseSheet}
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
  cardWrapper: {
    paddingHorizontal: 20,
  },
  weekStripContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 10,
    paddingHorizontal: 8,
    alignSelf: 'stretch',
  },
  dayHitArea: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  dayCircle: {
    width: 44,
    height: 52,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 2,
  },
  macroHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  macroTrack: {
    height: 8,
    width: '100%',
    overflow: 'hidden',
  },
  macroFill: {
    height: '100%',
  },
});
