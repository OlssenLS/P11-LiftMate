/**
 * Active workout store (Zustand) — the single source of truth for the live
 * session, persisted offline-first.
 *
 * Every mutation:
 * 1. updates in-memory state,
 * 2. writes the full snapshot to SQLite (so a kill/airplane-mode session is
 *    recoverable), and
 * 3. enqueues an idempotent API op (client-UUID keyed) to sync when online.
 *
 * All ids are client-generated UUIDs; the server upserts by id so replaying the
 * queue never duplicates (brief §4 rules 12–14).
 */
import type { Exercise, SetType, WeightUnit } from '@liftmate/shared';
import { create } from 'zustand';

import {
  clearActiveWorkout,
  enqueueOp,
  loadActiveWorkout,
  saveActiveWorkout,
} from '@/lib/db';
import { newId } from '@/lib/uuid';

export interface ActiveSet {
  id: string;
  position: number;
  setType: SetType;
  weight: number;
  weightUnit: WeightUnit;
  reps: number;
  rir: number | null;
  completed: boolean;
}

export interface ActiveExercise {
  id: string;
  exerciseId: string;
  name: string;
  position: number;
  sets: ActiveSet[];
}

export interface ActiveWorkout {
  id: string;
  name: string | null;
  note: string | null;
  startedAt: string; // ISO
  completedAt: string | null;
  exercises: ActiveExercise[];
}

interface ActiveWorkoutState {
  workout: ActiveWorkout | null;
  hydrated: boolean;
  hydrate: () => Promise<void>;
  startWorkout: (name?: string) => Promise<void>;
  addExercise: (exercise: Pick<Exercise, 'id' | 'name'>) => Promise<void>;
  removeExercise: (workoutExerciseId: string) => Promise<void>;
  addSet: (workoutExerciseId: string, weightUnit: WeightUnit) => Promise<void>;
  updateSet: (
    workoutExerciseId: string,
    setId: string,
    patch: Partial<Pick<ActiveSet, 'weight' | 'reps' | 'rir' | 'setType' | 'completed'>>,
  ) => Promise<void>;
  removeSet: (workoutExerciseId: string, setId: string) => Promise<void>;
  finishWorkout: () => Promise<ActiveWorkout | null>;
  discardWorkout: () => Promise<void>;
}

function persist(workout: ActiveWorkout): Promise<void> {
  return saveActiveWorkout(workout.id, workout);
}

/** Serialise the whole workout as a single idempotent create/upsert op. */
function enqueueWorkout(workout: ActiveWorkout): Promise<void> {
  return enqueueOp({
    id: `workout:${workout.id}:${Date.now()}`,
    method: 'POST',
    path: '/workouts',
    body: {
      id: workout.id,
      name: workout.name,
      note: workout.note,
      startedAt: workout.startedAt,
      completedAt: workout.completedAt,
      exercises: workout.exercises.map((e) => ({
        id: e.id,
        exerciseId: e.exerciseId,
        position: e.position,
        sets: e.sets.map((s) => ({
          id: s.id,
          position: s.position,
          setType: s.setType,
          weight: s.weight,
          weightUnit: s.weightUnit,
          reps: s.reps,
          rir: s.rir,
          completed: s.completed,
        })),
      })),
    },
    createdAt: Date.now(),
  });
}

export const useActiveWorkoutStore = create<ActiveWorkoutState>((set, get) => ({
  workout: null,
  hydrated: false,

  hydrate: async () => {
    const saved = await loadActiveWorkout<ActiveWorkout>();
    set({ workout: saved, hydrated: true });
  },

  startWorkout: async (name) => {
    const workout: ActiveWorkout = {
      id: newId(),
      name: name ?? null,
      note: null,
      startedAt: new Date().toISOString(),
      completedAt: null,
      exercises: [],
    };
    set({ workout });
    await persist(workout);
    await enqueueWorkout(workout);
  },

  addExercise: async (exercise) => {
    const current = get().workout;
    if (!current) return;
    const next: ActiveWorkout = {
      ...current,
      exercises: [
        ...current.exercises,
        {
          id: newId(),
          exerciseId: exercise.id,
          name: exercise.name,
          position: current.exercises.length,
          sets: [],
        },
      ],
    };
    set({ workout: next });
    await persist(next);
    await enqueueWorkout(next);
  },

  removeExercise: async (workoutExerciseId) => {
    const current = get().workout;
    if (!current) return;
    const next: ActiveWorkout = {
      ...current,
      exercises: current.exercises
        .filter((e) => e.id !== workoutExerciseId)
        .map((e, i) => ({ ...e, position: i })),
    };
    set({ workout: next });
    await persist(next);
    await enqueueOp({
      id: `del-exercise:${workoutExerciseId}`,
      method: 'DELETE',
      path: `/workouts/${current.id}/exercises/${workoutExerciseId}`,
      createdAt: Date.now(),
    });
    await enqueueWorkout(next);
  },

  addSet: async (workoutExerciseId, weightUnit) => {
    const current = get().workout;
    if (!current) return;
    const next: ActiveWorkout = {
      ...current,
      exercises: current.exercises.map((e) => {
        if (e.id !== workoutExerciseId) return e;
        // Prefill from the last set for faster logging.
        const last = e.sets[e.sets.length - 1];
        return {
          ...e,
          sets: [
            ...e.sets,
            {
              id: newId(),
              position: e.sets.length,
              setType: 'working',
              weight: last?.weight ?? 0,
              weightUnit,
              reps: last?.reps ?? 0,
              rir: last?.rir ?? null,
              completed: false,
            },
          ],
        };
      }),
    };
    set({ workout: next });
    await persist(next);
    await enqueueWorkout(next);
  },

  updateSet: async (workoutExerciseId, setId, patch) => {
    const current = get().workout;
    if (!current) return;
    const next: ActiveWorkout = {
      ...current,
      exercises: current.exercises.map((e) =>
        e.id !== workoutExerciseId
          ? e
          : {
              ...e,
              sets: e.sets.map((s) => (s.id === setId ? { ...s, ...patch } : s)),
            },
      ),
    };
    set({ workout: next });
    await persist(next);
    await enqueueWorkout(next);
  },

  removeSet: async (workoutExerciseId, setId) => {
    const current = get().workout;
    if (!current) return;
    const next: ActiveWorkout = {
      ...current,
      exercises: current.exercises.map((e) =>
        e.id !== workoutExerciseId
          ? e
          : {
              ...e,
              sets: e.sets.filter((s) => s.id !== setId).map((s, i) => ({ ...s, position: i })),
            },
      ),
    };
    set({ workout: next });
    await persist(next);
    await enqueueOp({
      id: `del-set:${setId}`,
      method: 'DELETE',
      path: `/workouts/${current.id}/sets/${setId}`,
      createdAt: Date.now(),
    });
    await enqueueWorkout(next);
  },

  finishWorkout: async () => {
    const current = get().workout;
    if (!current) return null;
    const finished: ActiveWorkout = { ...current, completedAt: new Date().toISOString() };
    set({ workout: finished });
    await persist(finished);
    await enqueueWorkout(finished);
    return finished;
  },

  discardWorkout: async () => {
    const current = get().workout;
    if (current) {
      await clearActiveWorkout(current.id);
    }
    set({ workout: null });
  },
}));
