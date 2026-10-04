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
    retry: 'Retry',
    loading: 'Loading…',
  },
  tabs: {
    home: 'Home',
    train: 'Train',
    coach: 'Coach',
    food: 'Food',
    you: 'You',
  },
  a11y: {
    // Accessibility labels (never shown visually, still must be translatable).
    progressRing: 'Progress',
    requiredField: 'Required',
  },
} as const;

export type Translations = typeof en;
