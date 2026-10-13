import { create } from 'zustand';

export interface CoachState {
  isOpen: boolean;
  prefillPrompt: string | null;
  openCoach: (prefillPrompt?: string) => void;
  closeCoach: () => void;
}

export const useCoachStore = create<CoachState>((set) => ({
  isOpen: false,
  prefillPrompt: null,
  openCoach: (prefillPrompt) =>
    set({
      isOpen: true,
      prefillPrompt: prefillPrompt ?? null,
    }),
  closeCoach: () =>
    set({
      isOpen: false,
      prefillPrompt: null,
    }),
}));
