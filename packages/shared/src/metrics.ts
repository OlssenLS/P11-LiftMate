/**
 * Deterministic training metrics (brief §6 "compute in code, not in AI").
 *
 * These are the single source of truth for volume and estimated 1RM, consumed
 * by both the API (summaries) and the mobile app (live display). They are pure
 * functions so they can be unit-tested exhaustively and reproduced from raw
 * logs (brief Phase 5 acceptance).
 */

/** Minimal shape a set must have for metric calculations. */
export interface MetricSet {
  setType: "warmup" | "working";
  weight: number;
  reps: number;
  /** Only completed sets count toward volume unless includeIncomplete is set. */
  completed?: boolean;
}

export interface VolumeOptions {
  /** Count sets even if not marked completed (e.g. live preview). Default false. */
  includeIncomplete?: boolean;
}

/**
 * Volume = Σ(weight × reps) over WORKING sets only (brief §4 rule 10).
 * Warm-up sets are excluded. By default only completed sets are counted.
 */
export function computeVolume(sets: readonly MetricSet[], options: VolumeOptions = {}): number {
  const { includeIncomplete = false } = options;
  return sets.reduce((total, set) => {
    if (set.setType !== "working") {
      return total;
    }
    if (!includeIncomplete && set.completed === false) {
      return total;
    }
    const weight = Number.isFinite(set.weight) ? set.weight : 0;
    const reps = Number.isFinite(set.reps) ? set.reps : 0;
    return total + weight * reps;
  }, 0);
}

/** Count of working sets (optionally only completed). */
export function countWorkingSets(
  sets: readonly MetricSet[],
  options: VolumeOptions = {},
): number {
  const { includeIncomplete = false } = options;
  return sets.filter(
    (s) => s.setType === "working" && (includeIncomplete || s.completed !== false),
  ).length;
}

/**
 * Estimated 1RM via the Epley formula: `weight × (1 + reps / 30)` (brief §6).
 * Always surfaced to users as an ESTIMATE.
 *
 * - 1 rep returns the weight itself (Epley collapses to `weight` at reps = 1).
 * - 0 reps or non-positive weight returns 0 (no meaningful estimate).
 */
export function estimate1RM(weight: number, reps: number): number {
  if (!Number.isFinite(weight) || !Number.isFinite(reps) || weight <= 0 || reps <= 0) {
    return 0;
  }
  if (reps === 1) {
    return weight;
  }
  return weight * (1 + reps / 30);
}

/**
 * Best estimated 1RM across a list of sets (working sets only, completed by
 * default). Returns 0 when there is nothing to estimate from.
 */
export function bestEstimated1RM(
  sets: readonly MetricSet[],
  options: VolumeOptions = {},
): number {
  const { includeIncomplete = false } = options;
  return sets.reduce((best, set) => {
    if (set.setType !== "working") {
      return best;
    }
    if (!includeIncomplete && set.completed === false) {
      return best;
    }
    return Math.max(best, estimate1RM(set.weight, set.reps));
  }, 0);
}

/** Round to a fixed number of decimals (default 1) for display. */
export function roundTo(value: number, decimals = 1): number {
  const factor = 10 ** decimals;
  return Math.round(value * factor) / factor;
}
