/**
 * English string catalog (default locale).
 *
 * All user-facing copy lives here so screens and components never hard-code
 * strings. Indonesian (`id`) will be added later as a sibling catalog with the
 * same key shape. Keep keys namespaced by feature/area.
 */
export const en = {
  common: {
    appName: 'LiftMate',
    save: 'Save',
    cancel: 'Cancel',
    done: 'Done',
    continue: 'Continue',
    back: 'Back',
    retry: 'Retry',
    loading: 'Loading…',
    somethingWentWrong: 'Something went wrong. Please try again.',
  },
  tabs: {
    home: 'Home',
    train: 'Train',
    coach: 'Coach',
    food: 'Food',
    you: 'You',
  },
  auth: {
    loginTitle: 'Welcome back',
    loginSubtitle: 'Log in to keep lifting',
    registerTitle: 'Create your account',
    registerSubtitle: 'Start tracking in minutes',
    email: 'Email',
    emailPlaceholder: 'you@example.com',
    password: 'Password',
    passwordPlaceholder: 'At least 8 characters',
    displayName: 'Name',
    displayNamePlaceholder: 'How should we call you?',
    loginCta: 'Log in',
    registerCta: 'Create account',
    toRegister: 'New here? Create an account',
    toLogin: 'Already have an account? Log in',
    logout: 'Log out',
    invalidCredentials: 'Invalid email or password.',
    emailTaken: 'That email is already registered.',
    errors: {
      emailInvalid: 'Enter a valid email address.',
      passwordMin: 'Password must be at least 8 characters.',
      displayNameRequired: 'Please enter your name.',
    },
  },
  onboarding: {
    stepLabel: 'Step {current} of {total}',
    basicsTitle: 'About you',
    basicsSubtitle: 'The essentials to personalise your plan',
    dateOfBirth: 'Date of birth',
    dateOfBirthPlaceholder: 'YYYY-MM-DD',
    weightUnit: 'Preferred weight unit',
    timezone: 'Timezone',
    goalTitle: 'Your main goal',
    goalSubtitle: 'Pick one to focus on',
    secondaryGoal: 'Secondary goal (optional)',
    goals: {
      lose_fat: 'Lose fat',
      build_muscle: 'Build muscle',
      gain_strength: 'Gain strength',
      general_fitness: 'General fitness',
    },
    trainingTitle: 'Training profile',
    trainingSubtitle: 'So we size your program right',
    experience: 'Experience level',
    experienceLevels: {
      beginner: 'Beginner',
      intermediate: 'Intermediate',
      advanced: 'Advanced',
    },
    weeklyFrequency: 'Days per week',
    equipmentTitle: 'Your equipment',
    equipmentSubtitle: 'Select everything you can train with',
    equipment: {
      barbell: 'Barbell',
      dumbbell: 'Dumbbell',
      machine: 'Machine',
      cable: 'Cable',
      kettlebell: 'Kettlebell',
      bodyweight: 'Bodyweight',
      band: 'Band',
      other: 'Other',
    },
    nutritionTitle: 'Nutrition target',
    nutritionSubtitle: 'Set your daily targets (you can change these later)',
    calories: 'Calories (kcal)',
    protein: 'Protein (g)',
    carbs: 'Carbs (g)',
    fat: 'Fat (g)',
    finish: 'Finish setup',
    errors: {
      required: 'This field is required.',
      pickOne: 'Please choose an option.',
      pickEquipment: 'Select at least one.',
      dateInvalid: 'Enter a valid date (YYYY-MM-DD).',
      number: 'Enter a valid number.',
    },
  },
  a11y: {
    // Accessibility labels (never shown visually, still must be translatable).
    progressRing: 'Progress',
    requiredField: 'Required',
  },
} as const;

export type Translations = typeof en;
