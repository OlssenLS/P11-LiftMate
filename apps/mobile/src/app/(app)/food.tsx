import React, { useMemo, useState } from 'react';
import { useRouter } from 'expo-router';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import {
  Apple,
  Camera,
  Coffee,
  Flame,
  Moon,
  Plus,
  Search,
  Sparkles,
  Utensils,
} from 'lucide-react-native';

import {
  Card,
  Chip,
  CircleButton,
  EmptyState,
  LargeTitleHeader,
  ListGroup,
  ListRowCard,
  MetricCard,
  OfflineBanner,
  PrimaryButton,
  SecondaryButton,
  SectionHeader,
  Sheet,
} from '@/components/ui';
import {
  AiFoodRecognitionModal,
  useCreateFoodLog,
  useDailyNutritionSummary,
  useDeleteFoodLog,
  useFoodSearch,
} from '@/features/nutrition';
import { useTabScrollPadding } from '@/hooks/use-tab-scroll-padding';
import { useTokens } from '@/hooks/use-tokens';
import { notifySuccess, notifyWarning, pressLight, selectionTick } from '@/lib/haptics';
import type { Food, FoodLog, MealType } from '@liftmate/shared';

const MEAL_LABELS: Record<MealType, string> = {
  breakfast: 'Breakfast',
  lunch: 'Lunch',
  dinner: 'Dinner',
  snack: 'Snacks',
};

function getRollingWeek(): { dateStr: string; label: string; dayNum: string; isToday: boolean }[] {
  const today = new Date();
  const todayStr = today.toISOString().split('T')[0];
  const dayNames = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

  const dayOfWeek = today.getDay();
  const mondayDiff = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
  const monday = new Date(today);
  monday.setDate(today.getDate() + mondayDiff);

  const days = [];
  for (let i = 0; i < 7; i++) {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    const dateStr = d.toISOString().split('T')[0];
    days.push({
      dateStr,
      label: dayNames[d.getDay()],
      dayNum: String(d.getDate()),
      isToday: dateStr === todayStr,
    });
  }
  return days;
}

export default function FoodScreen() {
  const { colors, radius, layout, type, icons, touchTarget, alpha } = useTokens();
  const bottomScrollPadding = useTabScrollPadding();
  const router = useRouter();

  const weekDays = useMemo(() => getRollingWeek(), []);
  const todayStr = useMemo(() => new Date().toISOString().split('T')[0], []);
  const [selectedDate, setSelectedDate] = useState<string>(todayStr);

  // Live queries & mutations
  const { data: summary } = useDailyNutritionSummary(selectedDate);
  const createFoodLog = useCreateFoodLog();
  const deleteFoodLog = useDeleteFoodLog();

  // Add Food Sheet state
  const [isAddSheetOpen, setIsAddSheetOpen] = useState(false);
  const [isAiScanOpen, setIsAiScanOpen] = useState(false);
  const [addMealType, setAddMealType] = useState<MealType>('breakfast');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedFood, setSelectedFood] = useState<Food | null>(null);
  const [quantity, setQuantity] = useState(1.0);
  const [isCustomMode, setIsCustomMode] = useState(false);

  // Custom food fields
  const [customName, setCustomName] = useState('');
  const [customServing, setCustomServing] = useState('1 porsi (100g)');
  const [customCalories, setCustomCalories] = useState('');
  const [customProtein, setCustomProtein] = useState('');
  const [customCarbs, setCustomCarbs] = useState('');
  const [customFat, setCustomFat] = useState('');

  // Edit / Delete Item Sheet state
  const [editingItem, setEditingItem] = useState<FoodLog | null>(null);

  // Catalog search query
  const { data: searchResults, isLoading: isSearching } = useFoodSearch(searchQuery);

  const handleOpenAdd = (mealType: MealType = 'lunch') => {
    selectionTick();
    setAddMealType(mealType);
    setSelectedFood(null);
    setSearchQuery('');
    setQuantity(1.0);
    setIsCustomMode(false);
    setCustomName('');
    setCustomCalories('');
    setCustomProtein('');
    setCustomCarbs('');
    setCustomFat('');
    setIsAddSheetOpen(true);
  };

  const handleCloseAddSheet = () => {
    setIsAddSheetOpen(false);
    setSelectedFood(null);
  };

  const handleLogFood = async () => {
    if (selectedFood) {
      pressLight();
      const cal = Math.round(selectedFood.calories * quantity);
      const p = Math.round(selectedFood.protein * quantity * 10) / 10;
      const c = Math.round(selectedFood.carbs * quantity * 10) / 10;
      const f = Math.round(selectedFood.fat * quantity * 10) / 10;

      await createFoodLog.mutateAsync({
        foodId: selectedFood.id,
        foodName: selectedFood.name,
        servingSize: selectedFood.servingSize,
        quantity,
        mealType: addMealType,
        loggedAt: new Date(selectedDate),
        calories: cal,
        protein: p,
        carbs: c,
        fat: f,
        source: selectedFood.source,
      });

      notifySuccess();
      handleCloseAddSheet();
    } else if (isCustomMode) {
      const name = customName.trim();
      const cal = Number.parseFloat(customCalories) || 0;
      const p = Number.parseFloat(customProtein) || 0;
      const c = Number.parseFloat(customCarbs) || 0;
      const f = Number.parseFloat(customFat) || 0;

      if (!name || cal <= 0) return;

      pressLight();
      await createFoodLog.mutateAsync({
        foodName: name,
        servingSize: customServing.trim() || '1 porsi',
        quantity: 1,
        mealType: addMealType,
        loggedAt: new Date(selectedDate),
        calories: cal,
        protein: p,
        carbs: c,
        fat: f,
        source: 'custom',
      });

      notifySuccess();
      handleCloseAddSheet();
    }
  };

  const handleDeleteItem = async () => {
    if (!editingItem) return;
    notifyWarning();
    await deleteFoodLog.mutateAsync(editingItem.id);
    setEditingItem(null);
  };

  const formattedDateLabel = useMemo(() => {
    if (selectedDate === todayStr) return 'Today';
    const parts = selectedDate.split('-');
    if (parts.length === 3) {
      const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      const monthIdx = Number.parseInt(parts[1], 10) - 1;
      const day = Number.parseInt(parts[2], 10);
      return `${monthNames[monthIdx]} ${day}`;
    }
    return selectedDate;
  }, [selectedDate, todayStr]);

  const totalLoggedItems = summary?.meals.reduce((sum, m) => sum + m.items.length, 0) ?? 0;

  const macrosList = [
    {
      name: 'Protein',
      current: Math.round(summary?.totals.protein ?? 0),
      target: summary?.targets.protein ?? 150,
      unit: 'g',
      pct: summary?.progressPct.protein ?? 0,
    },
    {
      name: 'Carbs',
      current: Math.round(summary?.totals.carbs ?? 0),
      target: summary?.targets.carbs ?? 200,
      unit: 'g',
      pct: summary?.progressPct.carbs ?? 0,
    },
    {
      name: 'Fat',
      current: Math.round(summary?.totals.fat ?? 0),
      target: summary?.targets.fat ?? 65,
      unit: 'g',
      pct: summary?.progressPct.fat ?? 0,
    },
  ];

  const getMealIcon = (mealType: MealType) => {
    switch (mealType) {
      case 'breakfast':
        return <Coffee size={icons.cardLabelSize} color={colors.accentText} strokeWidth={icons.strokeWidth} />;
      case 'lunch':
        return <Utensils size={icons.cardLabelSize} color={colors.accentText} strokeWidth={icons.strokeWidth} />;
      case 'dinner':
        return <Moon size={icons.cardLabelSize} color={colors.accentText} strokeWidth={icons.strokeWidth} />;
      case 'snack':
        return <Apple size={icons.cardLabelSize} color={colors.accentText} strokeWidth={icons.strokeWidth} />;
    }
  };

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
        {/* Large Title Header + AI Scan & Quick Add Actions */}
        <LargeTitleHeader
          title="Food"
          trailing={
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <CircleButton
                variant="default"
                icon={
                  <Camera
                    size={20}
                    color={colors.ink}
                    strokeWidth={icons.strokeWidth}
                  />
                }
                accessibilityLabel="Scan food with AI"
                onPress={() => {
                  selectionTick();
                  setIsAiScanOpen(true);
                }}
              />
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
                onPress={() => handleOpenAdd('lunch')}
              />
            </View>
          }
        />

        <OfflineBanner />

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
            {weekDays.map((day) => {
              const isSelected = day.dateStr === selectedDate;

              return (
                <Pressable
                  key={day.dateStr}
                  accessibilityRole="button"
                  accessibilityState={{ selected: isSelected }}
                  accessibilityLabel={`${day.label} ${day.dayNum}`}
                  onPress={() => {
                    selectionTick();
                    setSelectedDate(day.dateStr);
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
            timestamp={formattedDateLabel}
            value={summary ? Math.round(summary.totals.calories).toLocaleString() : '--'}
            unit="kcal"
            sublabel={
              summary
                ? `of ${summary.targets.calories.toLocaleString()} kcal budget · ${summary.remaining.calories.toLocaleString()} kcal left`
                : 'Loading daily summary...'
            }
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
              {macrosList.map((m) => {
                const clampedPct = Math.min(100, Math.max(0, m.pct));

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
                            width: `${clampedPct}%`,
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

        {/* Meal Sections or Empty State */}
        {totalLoggedItems > 0 ? (
          summary?.meals.map((meal) => (
            <React.Fragment key={meal.mealType}>
              <SectionHeader
                title={`${meal.name} · ${Math.round(meal.totals.calories)} kcal`}
                actionText="+ Add"
                onAction={() => handleOpenAdd(meal.mealType)}
              />
              <View style={styles.cardWrapper}>
                {meal.items.length > 0 ? (
                  <ListGroup>
                    {meal.items.map((item) => (
                      <ListRowCard
                        key={item.id}
                        label={item.foodName}
                        subtitle={`${Number(item.quantity) !== 1 ? `${item.quantity}x ` : ''}${item.servingSize} · ${Math.round(item.calories)} kcal · ${Math.round(item.protein)}g P · ${Math.round(item.carbs)}g C · ${Math.round(item.fat)}g F`}
                        icon={getMealIcon(meal.mealType)}
                        onPress={() => {
                          selectionTick();
                          setEditingItem(item);
                        }}
                      />
                    ))}
                  </ListGroup>
                ) : (
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel={`Add ${meal.name}`}
                    onPress={() => handleOpenAdd(meal.mealType)}
                    style={[
                      styles.emptyMealRow,
                      {
                        backgroundColor: colors.surface,
                        borderRadius: radius.lg,
                        borderColor: colors.hairline,
                      },
                    ]}
                  >
                    <Text style={[type.secondary, { color: colors.inkMutedText }]}>
                      + Tap to log {meal.name.toLowerCase()}
                    </Text>
                  </Pressable>
                )}
              </View>
            </React.Fragment>
          ))
        ) : (
          <View style={[styles.cardWrapper, { marginTop: layout.cardGap * 2 }]}>
            <EmptyState
              title="No Food Logged"
              description="Start tracking your breakfast, lunch, dinner, or snacks to hit your daily macro targets."
              icon={
                <Utensils
                  size={40}
                  color={colors.inkMuted}
                  strokeWidth={icons.strokeWidth}
                />
              }
              actionText="+ Log Food"
              onAction={() => handleOpenAdd('breakfast')}
            />
          </View>
        )}
      </ScrollView>

      {/* Add Food Interactive Sheet */}
      <Sheet
        visible={isAddSheetOpen}
        onClose={handleCloseAddSheet}
        title={`Add to ${MEAL_LABELS[addMealType]}`}
        mode="picker"
      >
        <View style={{ gap: 16, paddingVertical: 12 }}>
          {/* Meal type selector chips */}
          <View style={styles.chipsRow}>
            {(['breakfast', 'lunch', 'dinner', 'snack'] as MealType[]).map((mt) => (
              <Chip
                key={mt}
                label={MEAL_LABELS[mt]}
                selected={addMealType === mt}
                onPress={() => setAddMealType(mt)}
              />
            ))}
          </View>

          {/* Quick AI Scan Shortcut Card */}
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Scan meal photo with AI"
            onPress={() => {
              selectionTick();
              setIsAddSheetOpen(false);
              setIsAiScanOpen(true);
            }}
          >
            <Card
              variant="surface"
              padding="md"
              style={{
                backgroundColor: alpha(colors.accent, 0.12),
                borderColor: colors.accent,
              }}
            >
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                <Sparkles size={20} color={colors.accent} strokeWidth={2.2} />
                <View style={{ flex: 1, gap: 2 }}>
                  <Text style={[type.cardLabel, { color: colors.ink, fontSize: 14 }]}>
                    Scan Meal with AI Vision
                  </Text>
                  <Text style={[type.caption, { color: colors.inkMutedText }]}>
                    Auto-detect foods and portions from a photo
                  </Text>
                </View>
                <Camera size={18} color={colors.accent} />
              </View>
            </Card>
          </Pressable>

          {/* Mode switch: Search vs Custom */}
          <View style={styles.modeToggleRow}>
            <Pressable
              accessibilityRole="button"
              accessibilityState={{ selected: !isCustomMode }}
              onPress={() => {
                selectionTick();
                setIsCustomMode(false);
              }}
              style={[
                styles.modeTab,
                {
                  borderBottomColor: !isCustomMode ? colors.accent : 'transparent',
                  borderBottomWidth: 2,
                },
              ]}
            >
              <Text
                style={[
                  type.cardLabel,
                  { color: !isCustomMode ? colors.accent : colors.inkMutedText },
                ]}
              >
                Catalog Search
              </Text>
            </Pressable>

            <Pressable
              accessibilityRole="button"
              accessibilityState={{ selected: isCustomMode }}
              onPress={() => {
                selectionTick();
                setIsCustomMode(true);
                setSelectedFood(null);
              }}
              style={[
                styles.modeTab,
                {
                  borderBottomColor: isCustomMode ? colors.accent : 'transparent',
                  borderBottomWidth: 2,
                },
              ]}
            >
              <Text
                style={[
                  type.cardLabel,
                  { color: isCustomMode ? colors.accent : colors.inkMutedText },
                ]}
              >
                Custom Food
              </Text>
            </Pressable>
          </View>

          {!isCustomMode ? (
            /* Catalog Search Mode */
            selectedFood ? (
              /* Selected Food Details & Quantity Stepper */
              <View style={{ gap: 14 }}>
                <Card variant="surface" padding="md" style={{ backgroundColor: colors.surfaceMuted }}>
                  <View style={{ gap: 6 }}>
                    <Text style={[type.sectionTitle, { color: colors.ink }]}>
                      {selectedFood.name}
                    </Text>
                    <Text style={[type.secondary, { color: colors.inkMutedText }]}>
                      Base: {selectedFood.servingSize} · {selectedFood.calories} kcal
                    </Text>
                    <Text style={[type.caption, { color: colors.accentText }]}>
                      {selectedFood.protein}g P · {selectedFood.carbs}g C · {selectedFood.fat}g F
                    </Text>
                  </View>
                </Card>

                {/* Portion Quantity Presets */}
                <Text style={[type.eyebrow, { color: colors.inkMutedText }]}>
                  SELECT PORTION
                </Text>
                <View style={styles.chipsRow}>
                  {[0.5, 1.0, 1.5, 2.0, 3.0].map((q) => (
                    <Chip
                      key={q}
                      label={`${q}x`}
                      selected={quantity === q}
                      onPress={() => setQuantity(q)}
                    />
                  ))}
                </View>

                {/* Computed Stats Card */}
                <Card variant="surface" padding="md">
                  <View style={styles.macroHeaderRow}>
                    <Text style={[type.cardLabel, { color: colors.ink }]}>Total Calories</Text>
                    <Text style={[type.sectionTitle, { color: colors.accent }]}>
                      {Math.round(selectedFood.calories * quantity)} kcal
                    </Text>
                  </View>
                  <View style={[styles.macroHeaderRow, { marginTop: 8 }]}>
                    <Text style={[type.secondary, { color: colors.inkMutedText }]}>
                      {Math.round(selectedFood.protein * quantity * 10) / 10}g Protein
                    </Text>
                    <Text style={[type.secondary, { color: colors.inkMutedText }]}>
                      {Math.round(selectedFood.carbs * quantity * 10) / 10}g Carbs
                    </Text>
                    <Text style={[type.secondary, { color: colors.inkMutedText }]}>
                      {Math.round(selectedFood.fat * quantity * 10) / 10}g Fat
                    </Text>
                  </View>
                </Card>

                <View style={{ gap: 10, marginTop: 8 }}>
                  <PrimaryButton
                    label={`Log Food (${Math.round(selectedFood.calories * quantity)} kcal)`}
                    onPress={handleLogFood}
                  />
                  <SecondaryButton
                    label="Choose Different Food"
                    onPress={() => setSelectedFood(null)}
                  />
                </View>
              </View>
            ) : (
              /* Search Input & Results List */
              <View style={{ gap: 12 }}>
                <View
                  style={[
                    styles.searchInputContainer,
                    {
                      backgroundColor: colors.surfaceMuted,
                      borderRadius: radius.md,
                      borderColor: colors.hairline,
                    },
                  ]}
                >
                  <Search size={18} color={colors.inkMuted} strokeWidth={2} />
                  <TextInput
                    value={searchQuery}
                    onChangeText={setSearchQuery}
                    placeholder="Search food (e.g., Dada Ayam, Nasi)..."
                    placeholderTextColor={colors.inkMutedText}
                    style={[
                      styles.searchInput,
                      type.body,
                      { color: colors.ink },
                    ]}
                    autoCorrect={false}
                    clearButtonMode="while-editing"
                  />
                </View>

                {isSearching ? (
                  <View style={{ paddingVertical: 24, alignItems: 'center' }}>
                    <ActivityIndicator size="small" color={colors.accent} />
                  </View>
                ) : (
                  <View style={{ gap: 8 }}>
                    {(searchResults ?? []).map((food) => (
                      <Pressable
                        key={food.id}
                        accessibilityRole="button"
                        accessibilityLabel={`${food.name}, ${food.calories} calories`}
                        onPress={() => {
                          selectionTick();
                          setSelectedFood(food);
                          setQuantity(1.0);
                        }}
                        style={[
                          styles.searchResultRow,
                          {
                            backgroundColor: colors.surface,
                            borderRadius: radius.md,
                            borderColor: colors.hairline,
                          },
                        ]}
                      >
                        <View style={{ flex: 1, gap: 2 }}>
                          <Text style={[type.cardLabel, { color: colors.ink }]}>
                            {food.name}
                          </Text>
                          <Text style={[type.caption, { color: colors.inkMutedText }]}>
                            {food.servingSize} · {food.protein}g P · {food.carbs}g C · {food.fat}g F
                          </Text>
                        </View>
                        <Text style={[type.cardLabel, { color: colors.accentText }]}>
                          {food.calories} kcal
                        </Text>
                      </Pressable>
                    ))}
                    {(searchResults ?? []).length === 0 && (
                      <View style={{ paddingVertical: 20, alignItems: 'center' }}>
                        <Text style={[type.secondary, { color: colors.inkMutedText }]}>
                          No items found. Try a different search or use Custom Food.
                        </Text>
                      </View>
                    )}
                  </View>
                )}
              </View>
            )
          ) : (
            /* Custom Food Entry Mode */
            <View style={{ gap: 12 }}>
              <View style={{ gap: 4 }}>
                <Text style={[type.caption, { color: colors.inkMutedText }]}>FOOD NAME</Text>
                <TextInput
                  value={customName}
                  onChangeText={setCustomName}
                  placeholder="e.g. Nasi Goreng Spesial"
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

              <View style={{ gap: 4 }}>
                <Text style={[type.caption, { color: colors.inkMutedText }]}>SERVING SIZE</Text>
                <TextInput
                  value={customServing}
                  onChangeText={setCustomServing}
                  placeholder="1 porsi (100g)"
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

              <View style={styles.formRow}>
                <View style={{ flex: 1, gap: 4 }}>
                  <Text style={[type.caption, { color: colors.inkMutedText }]}>CALORIES</Text>
                  <TextInput
                    value={customCalories}
                    onChangeText={setCustomCalories}
                    placeholder="kcal"
                    keyboardType="numeric"
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

                <View style={{ flex: 1, gap: 4 }}>
                  <Text style={[type.caption, { color: colors.inkMutedText }]}>PROTEIN (g)</Text>
                  <TextInput
                    value={customProtein}
                    onChangeText={setCustomProtein}
                    placeholder="g"
                    keyboardType="numeric"
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
              </View>

              <View style={styles.formRow}>
                <View style={{ flex: 1, gap: 4 }}>
                  <Text style={[type.caption, { color: colors.inkMutedText }]}>CARBS (g)</Text>
                  <TextInput
                    value={customCarbs}
                    onChangeText={setCustomCarbs}
                    placeholder="g"
                    keyboardType="numeric"
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

                <View style={{ flex: 1, gap: 4 }}>
                  <Text style={[type.caption, { color: colors.inkMutedText }]}>FAT (g)</Text>
                  <TextInput
                    value={customFat}
                    onChangeText={setCustomFat}
                    placeholder="g"
                    keyboardType="numeric"
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
              </View>

              <View style={{ marginTop: 10 }}>
                <PrimaryButton
                  label={`Log Custom Food to ${MEAL_LABELS[addMealType]}`}
                  onPress={handleLogFood}
                />
              </View>
            </View>
          )}
        </View>
      </Sheet>

      {/* Edit / Delete Logged Item Sheet */}
      <Sheet
        visible={editingItem !== null}
        onClose={() => setEditingItem(null)}
        title={editingItem ? `Logged Item: ${editingItem.foodName}` : 'Meal Item'}
        mode="edit"
      >
        {editingItem && (
          <View style={{ gap: 16, paddingVertical: 12 }}>
            <Card variant="surface" padding="md" style={{ backgroundColor: colors.surfaceMuted }}>
              <View style={{ gap: 6 }}>
                <Text style={[type.sectionTitle, { color: colors.ink }]}>
                  {editingItem.foodName}
                </Text>
                <Text style={[type.secondary, { color: colors.inkMutedText }]}>
                  {Number(editingItem.quantity) !== 1 ? `${editingItem.quantity}x ` : ''}
                  {editingItem.servingSize} · {Math.round(editingItem.calories)} kcal
                </Text>
                <Text style={[type.cardLabel, { color: colors.accentText }]}>
                  {Math.round(editingItem.protein)}g Protein · {Math.round(editingItem.carbs)}g Carbs · {Math.round(editingItem.fat)}g Fat
                </Text>
              </View>
            </Card>

            <View style={{ gap: 10, marginTop: 10 }}>
              <SecondaryButton
                label="Delete Entry"
                onPress={handleDeleteItem}
              />
              <PrimaryButton
                label="Done"
                onPress={() => setEditingItem(null)}
              />
            </View>
          </View>
        )}
      </Sheet>

      {/* AI Food Recognition Modal (§29–§32) */}
      <AiFoodRecognitionModal
        visible={isAiScanOpen}
        onClose={() => setIsAiScanOpen(false)}
        defaultMealType={addMealType}
        selectedDate={selectedDate}
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
  emptyMealRow: {
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderWidth: StyleSheet.hairlineWidth,
    alignItems: 'center',
    justifyContent: 'center',
  },
  chipsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  modeToggleRow: {
    flexDirection: 'row',
    gap: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(0,0,0,0.1)',
  },
  modeTab: {
    paddingVertical: 8,
    paddingHorizontal: 4,
  },
  searchInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 10,
    gap: 8,
    borderWidth: StyleSheet.hairlineWidth,
  },
  searchInput: {
    flex: 1,
    padding: 0,
  },
  searchResultRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderWidth: StyleSheet.hairlineWidth,
  },
  formRow: {
    flexDirection: 'row',
    gap: 12,
  },
  formInput: {
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderWidth: StyleSheet.hairlineWidth,
  },
});
