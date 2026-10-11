import { describe, expect, it, vi, beforeEach } from 'vitest';
import { ProgressController } from './progress.controller.js';
import type { ProgressService } from './progress.service.js';
import type { AuthUser } from '../auth/strategies/jwt-access.strategy.js';

describe('ProgressController', () => {
  let controller: ProgressController;
  let progressServiceMock: any;

  const mockUser: AuthUser = {
    id: 'user-uuid-1',
    email: 'user@example.com',
  };

  beforeEach(() => {
    progressServiceMock = {
      getSummary: vi.fn(),
      getWeightProgress: vi.fn(),
      logWeight: vi.fn(),
      getStrengthProgress: vi.fn(),
      getVolumeProgress: vi.fn(),
      getConsistencyProgress: vi.fn(),
    };

    controller = new ProgressController(progressServiceMock as unknown as ProgressService);
  });

  it('delegates getSummary to service with auth user id', async () => {
    progressServiceMock.getSummary.mockResolvedValue({ weight: {}, volume: {} });
    await controller.getSummary(mockUser);
    expect(progressServiceMock.getSummary).toHaveBeenCalledWith('user-uuid-1');
  });

  it('delegates getWeightProgress to service with auth user id', async () => {
    progressServiceMock.getWeightProgress.mockResolvedValue({ currentWeightKg: 75 });
    const res = await controller.getWeightProgress(mockUser);
    expect(res.currentWeightKg).toBe(75);
    expect(progressServiceMock.getWeightProgress).toHaveBeenCalledWith('user-uuid-1');
  });

  it('delegates logWeight to service with auth user id and body', async () => {
    const input = { weightKg: 74.8, notes: 'Morning' };
    progressServiceMock.logWeight.mockResolvedValue({ id: 'log-1', ...input });
    const res = await controller.logWeight(mockUser, input);
    expect(res.id).toBe('log-1');
    expect(progressServiceMock.logWeight).toHaveBeenCalledWith('user-uuid-1', input);
  });

  it('delegates getStrengthProgress to service with user id and exercise id', async () => {
    progressServiceMock.getStrengthProgress.mockResolvedValue({ exerciseName: 'Bench' });
    const res = await controller.getStrengthProgress(mockUser, 'ex-uuid-1');
    expect(res.exerciseName).toBe('Bench');
    expect(progressServiceMock.getStrengthProgress).toHaveBeenCalledWith('user-uuid-1', 'ex-uuid-1');
  });

  it('delegates getVolumeProgress to service with range', async () => {
    progressServiceMock.getVolumeProgress.mockResolvedValue({ totalVolumeKg: 5000 });
    const res = await controller.getVolumeProgress(mockUser, 'month');
    expect(res.totalVolumeKg).toBe(5000);
    expect(progressServiceMock.getVolumeProgress).toHaveBeenCalledWith('user-uuid-1', 'month');
  });

  it('delegates getConsistencyProgress to service', async () => {
    progressServiceMock.getConsistencyProgress.mockResolvedValue({ consistencyPct: 80 });
    const res = await controller.getConsistencyProgress(mockUser);
    expect(res.consistencyPct).toBe(80);
    expect(progressServiceMock.getConsistencyProgress).toHaveBeenCalledWith('user-uuid-1');
  });
});
