import {
  bestEstimated1RM,
  computeVolume,
  countWorkingSets,
  estimate1RM,
  type MetricSet,
} from '@liftmate/shared';

describe('metrics: computeVolume', () => {
  it('sums weight × reps over working sets only, excluding warm-ups', () => {
    const sets: MetricSet[] = [
      { setType: 'warmup', weight: 60, reps: 10, completed: true }, // excluded
      { setType: 'working', weight: 100, reps: 5, completed: true }, // 500
      { setType: 'working', weight: 100, reps: 5, completed: true }, // 500
      { setType: 'working', weight: 90, reps: 8, completed: true }, // 720
    ];
    expect(computeVolume(sets)).toBe(1720);
  });

  it('excludes incomplete working sets by default', () => {
    const sets: MetricSet[] = [
      { setType: 'working', weight: 100, reps: 5, completed: true }, // 500
      { setType: 'working', weight: 100, reps: 5, completed: false }, // excluded
    ];
    expect(computeVolume(sets)).toBe(500);
    expect(computeVolume(sets, { includeIncomplete: true })).toBe(1000);
  });

  it('returns 0 when there are no working sets', () => {
    const sets: MetricSet[] = [{ setType: 'warmup', weight: 40, reps: 12, completed: true }];
    expect(computeVolume(sets)).toBe(0);
  });

  it('counts working sets (completed by default)', () => {
    const sets: MetricSet[] = [
      { setType: 'warmup', weight: 40, reps: 12, completed: true },
      { setType: 'working', weight: 100, reps: 5, completed: true },
      { setType: 'working', weight: 100, reps: 5, completed: false },
    ];
    expect(countWorkingSets(sets)).toBe(1);
    expect(countWorkingSets(sets, { includeIncomplete: true })).toBe(2);
  });
});

describe('metrics: estimate1RM (Epley)', () => {
  it('returns the weight itself for a single rep', () => {
    expect(estimate1RM(100, 1)).toBe(100);
  });

  it('applies weight × (1 + reps / 30)', () => {
    // 100 × (1 + 5/30) = 116.666...
    expect(estimate1RM(100, 5)).toBeCloseTo(116.6667, 3);
    // 140 × (1 + 10/30) = 186.666...
    expect(estimate1RM(140, 10)).toBeCloseTo(186.6667, 3);
  });

  it('returns 0 for non-positive weight or reps', () => {
    expect(estimate1RM(0, 5)).toBe(0);
    expect(estimate1RM(100, 0)).toBe(0);
    expect(estimate1RM(-10, 5)).toBe(0);
  });

  it('bestEstimated1RM picks the top working set', () => {
    const sets: MetricSet[] = [
      { setType: 'warmup', weight: 200, reps: 1, completed: true }, // excluded despite high
      { setType: 'working', weight: 100, reps: 5, completed: true }, // ~116.67
      { setType: 'working', weight: 120, reps: 3, completed: true }, // 132
    ];
    expect(bestEstimated1RM(sets)).toBeCloseTo(132, 5);
  });
});
