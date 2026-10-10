/**
 * Dev-only fixtures isolated from production code.
 *
 * Rule (LIFTMATE_AGENT_BRIEF.md §4 constraint 2):
 * "Fixtures live in src/dev/fixtures behind EXPO_PUBLIC_USE_FIXTURES (default off).
 * With the flag off, a screen shows real data, 'No Data', or an EmptyState.
 * Remove every hard-coded number and subtitle so nothing fake ships."
 */

export interface MetricSeriesItem {
  label: string;
  value: number | null;
}

export interface MetricConfigFixture {
  title: string;
  unit: string;
  eyebrow: string;
  heroValue: string;
  dateRange: string;
  chartType: 'line' | 'bar';
  showDaily: boolean;
  aboutTitle: string;
  aboutText: string;
  data: MetricSeriesItem[];
}

export const HOME_FIXTURES = {
  nextWorkout: {
    eyebrow: 'PULL & HYPERTROPHY',
    title: 'Pull Day',
    subtitle: 'Pull · 44 min · 5 exercises',
  },
  metrics: {
    calories: {
      value: '1,840',
      unit: 'kcal',
      sublabel: 'of 2,200 target',
      sparkline: [1650, 1900, 1780, 2120, 1840],
    },
    workouts: {
      value: '3',
      unit: 'done',
      sublabel: 'of 4 planned',
      sparkline: [1, 0, 1, 1],
    },
    weight: {
      value: '72.4',
      unit: 'kg',
      sparkline: [73.5, 73.1, 72.8, 72.6, 72.4],
    },
    volume: {
      value: '14,250',
      unit: 'kg',
      sublabel: 'Total tonnage lifted',
      sparkline: [11200, 12800, 13400, 14250],
    },
  },
  insight: {
    title: 'Upper body volume on track',
    description: "You've completed 12 chest and back sets this week. Optimal range for hypertrophy is 10–16 sets.",
    actionText: 'View breakdown',
  },
} as const;

export const TRAIN_FIXTURES = {
  heroSession: {
    eyebrow: 'PULL & HYPERTROPHY',
    title: 'Pull Day',
    subtitle: 'Pull · 44 min · 5 exercises',
  },
  myProgram: [
    { id: '1', label: 'Day 1: Upper Body Strength', subtitle: 'Chest, Back, Arms · 6 exercises' },
    { id: '2', label: 'Day 2: Lower Body Strength', subtitle: 'Quads, Hamstrings, Calves · 5 exercises' },
    { id: '3', label: 'Day 3: Upper Body Hypertrophy', subtitle: 'Shoulders, Back, Arms · 7 exercises' },
    { id: '4', label: 'Day 4: Lower Body Hypertrophy', subtitle: 'Legs, Glutes, Core · 6 exercises' },
  ],
  plannerInsight: {
    title: 'AI Periodization Planner',
    description: 'Your deload week is scheduled in 10 days. Auto-progression will adjust set counts after Friday.',
    actionText: 'Review Plan',
  },
  history: [
    { id: '1', label: 'Pull Day', subtitle: 'Yesterday · 44 min · 14,250 kg', value: 'PRs: 2' },
    { id: '2', label: 'Lower Body Strength', subtitle: '3 days ago · 52 min · 18,100 kg', value: 'PRs: 1' },
  ],
} as const;

export interface FoodItemFixture {
  id: string;
  name: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
}

export const FOOD_FIXTURES = {
  macros: [
    { name: 'Protein', current: 142, target: 160, unit: 'g' },
    { name: 'Carbs', current: 195, target: 240, unit: 'g' },
    { name: 'Fat', current: 58, target: 70, unit: 'g' },
  ],
  meals: {
    breakfast: [
      { id: '1', name: 'Steel-cut Oatmeal with Berries', calories: 340, protein: 12, carbs: 58, fat: 6 },
      { id: '2', name: 'Scrambled Eggs (3 whole)', calories: 280, protein: 24, carbs: 2, fat: 20 },
    ],
    lunch: [
      { id: '3', name: 'Grilled Chicken Breast Bowl', calories: 620, protein: 54, carbs: 65, fat: 14 },
    ],
    dinner: [
      { id: '4', name: 'Salmon Fillet with Sweet Potato', calories: 540, protein: 42, carbs: 45, fat: 18 },
    ],
    snacks: [
      { id: '5', name: 'Greek Yogurt Cup', calories: 100, protein: 14, carbs: 6, fat: 1 },
    ],
  },
} as const;

export const METRIC_CONFIG_FIXTURES: Record<string, MetricConfigFixture> = {
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

export const COACH_FIXTURES = {
  suggestedQuestions: [
    'What should I train today?',
    'Why is my progress slowing?',
    'How should I increase my bench?',
    'What exercise can replace this?',
    'How much protein should I eat?',
    'What should I eat before training?',
    'Is my workout volume enough?',
  ],
} as const;

export const YOU_FIXTURES = {
  subtitle: 'BUILD MUSCLE · INTERMEDIATE',
  goalsSubtitle: 'Hypertrophy · 2,200 kcal',
  trainingDaysSubtitle: '4 days scheduled / week',
  equipmentSubtitle: 'Barbell, Dumbbells, Cables, Bench',
} as const;
