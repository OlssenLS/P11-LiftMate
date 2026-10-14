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
 * queue never duplicates (brief §4 rules 12–14, WORKOUT_UX.md §11).
 */
import type { Exercise, SetType, WeightUnit, Workout, WorkoutStatus } from '@liftmate/shared';
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
  rirUnknown?: boolean;
  restTime?: number | null;
  notes?: string | null;
  completed: boolean;
}

export interface ActiveExercise {
  id: string;
  exerciseId: string;
  name: string;
  primaryMuscle?: string;
  equipment?: string;
  position: number;
  sets: ActiveSet[];
}

export interface ActiveWorkout {
  id: string;
  name: string | null;
  notes: string | null;
  note?: string | null;
  status: WorkoutStatus;
  programId?: string | null;
  startedAt: string; // ISO
  completedAt: string | null;
  exercises: ActiveExercise[];
}

interface ActiveWorkoutState {
  workout: ActiveWorkout | null;
  hydrated: boolean;
  hydrate: () => Promise<void>;
  startWorkout: (name?: string) => Promise<void>;
  startFromWorkout: (workout: Workout) => Promise<void>;
  renameWorkout: (name: string) => Promise<void>;
  updateWorkoutNotes: (notes: string | null) => Promise<void>;
  addExercise: (exercise: Pick<Exercise, 'id' | 'name'> & { primaryMuscle?: string; equipment?: string }) => Promise<void>;
  replaceExercise: (
    workoutExerciseId: string,
    newExercise: Pick<Exercise, 'id' | 'name'> & { primaryMuscle?: string; equipment?: string },
  ) => Promise<void>;
  removeExercise: (workoutExerciseId: string) => Promise<void>;
  addSet: (workoutExerciseId: string, weightUnit: WeightUnit) => Promise<void>;
  updateSet: (
    workoutExerciseId: string,
    setId: string,
    patch: Partial<Pick<ActiveSet, 'weight' | 'reps' | 'rir' | 'rirUnknown' | 'setType' | 'completed' | 'notes' | 'restTime'>>,
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
    id: `workout:${workout.id}`,
    method: 'POST',
    path: '/workouts',
    body: {
      id: workout.id,
      name: workout.name,
      notes: workout.notes ?? workout.note ?? null,
      note: workout.notes ?? workout.note ?? null,
      status: workout.status ?? 'in_progress',
      programId: workout.programId ?? null,
      startedAt: workout.startedAt,
      completedAt: workout.completedAt,
      exercises: workout.exercises.map((e) => ({
        id: e.id,
        exerciseId: e.exerciseId,
        exerciseName: e.name,
        name: e.name,
        position: e.position,
        sets: e.sets.map((s) => ({
          id: s.id,
          position: s.position,
          setType: s.setType,
          weight: s.weight,
          weightUnit: s.weightUnit,
          reps: s.reps,
          rir: s.rir ?? null,
          rirUnknown: s.rirUnknown ?? false,
          restTime: s.restTime ?? null,
          notes: s.notes ?? null,
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
    if (saved) {
      // Normalize legacy field `note` -> `notes`
      saved.notes = saved.notes ?? saved.note ?? null;
      saved.status = saved.status ?? 'in_progress';
    }
    set({ workout: saved, hydrated: true });
  },

  startWorkout: async (name) => {
    const workout: ActiveWorkout = {
      id: newId(),
      name: name ?? null,
      notes: null,
      note: null,
      status: 'in_progress',
      programId: null,
      startedAt: new Date().toISOString(),
      completedAt: null,
      exercises: [],
    };
    set({ workout });
    await persist(workout);
    await enqueueWorkout(workout);
  },

  startFromWorkout: async (workout: Workout) => {
    const active: ActiveWorkout = {
      id: workout.id,
      name: workout.name ?? null,
      notes: workout.notes ?? null,
      note: workout.notes ?? null,
      status: 'in_progress',
      programId: workout.programId ?? null,
      startedAt:
        typeof workout.startedAt === 'string'
          ? workout.startedAt
          : new Date(workout.startedAt).toISOString(),
      completedAt: null,
      exercises: workout.exercises.map((e, eIdx) => ({
        id: e.id,
        exerciseId: e.exerciseId,
        name: e.exercise?.name ?? 'Exercise',
        primaryMuscle: e.exercise?.primaryMuscle,
        equipment: e.exercise?.equipment,
        position: e.position ?? eIdx + 1,
        sets: e.sets.map((s, sIdx) => ({
          id: s.id,
          position: s.position ?? sIdx + 1,
          setType: s.setType ?? 'working',
          weight: Number(s.weight ?? 0),
          weightUnit: s.weightUnit ?? 'kg',
          reps: s.reps ?? 10,
          rir: s.rir ?? null,
          rirUnknown: s.rirUnknown ?? false,
          restTime: s.restTime ?? null,
          notes: s.notes ?? null,
          completed: s.completed ?? false,
        })),
      })),
    };
    set({ workout: active });
    await persist(active);
    await enqueueWorkout(active);
  },

  renameWorkout: async (name: string) => {
    const current = get().workout;
    if (!current) return;
    const next: ActiveWorkout = { ...current, name };
    set({ workout: next });
    await persist(next);
    await enqueueWorkout(next);
  },

  updateWorkoutNotes: async (notes: string | null) => {
    const current = get().workout;
    if (!current) return;
    const next: ActiveWorkout = { ...current, notes, note: notes };
    set({ workout: next });
    await persist(next);
    await enqueueWorkout(next);
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
          primaryMuscle: exercise.primaryMuscle,
          equipment: exercise.equipment,
          position: current.exercises.length,
          sets: [],
        },
      ],
    };
    set({ workout: next });
    await persist(next);
    await enqueueWorkout(next);
  },

  replaceExercise: async (workoutExerciseId, newExercise) => {
    const current = get().workout;
    if (!current) return;
    const next: ActiveWorkout = {
      ...current,
      exercises: current.exercises.map((e) =>
        e.id === workoutExerciseId
          ? {
              ...e,
              exerciseId: newExercise.id,
              name: newExercise.name,
              primaryMuscle: newExercise.primaryMuscle,
              equipment: newExercise.equipment,
            }
          : e,
      ),
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
        const last = e.sets[e.sets.length - 1];
        return {
          ...e,
          sets: [
            ...e.sets,
            {
              id: newId(),
              position: e.sets.length,
              setType: last?.setType ?? 'working',
              weight: last?.weight ?? 0,
              weightUnit,
              reps: last?.reps ?? 0,
              rir: last?.rir ?? null,
              rirUnknown: last?.rirUnknown ?? false,
              notes: null,
              restTime: last?.restTime ?? null,
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
    const finished: ActiveWorkout = {
      ...current,
      status: 'completed',
      completedAt: new Date().toISOString(),
    };
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
