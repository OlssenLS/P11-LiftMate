import { Test, type TestingModule } from '@nestjs/testing';
import { WorkoutsController } from './workouts.controller.js';
import { WorkoutsService } from './workouts.service.js';
import type { AuthUser } from '../auth/strategies/jwt-access.strategy.js';

describe('WorkoutsController', () => {
  let controller: WorkoutsController;
  const mockService = {
    list: vi.fn(),
    previousSession: vi.fn(),
    exerciseHistory: vi.fn(),
    create: vi.fn(),
    getById: vi.fn(),
    summary: vi.fn(),
    update: vi.fn(),
    softDelete: vi.fn(),
  };

  const user: AuthUser = { id: 'user-1', email: 'user@example.com' };

  beforeEach(async () => {
    vi.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      controllers: [WorkoutsController],
      providers: [{ provide: WorkoutsService, useValue: mockService }],
    }).compile();
    controller = module.get(WorkoutsController);
  });

  it('delegates list with status, limit, offset', async () => {
    mockService.list.mockResolvedValueOnce([]);
    await controller.list(user, 'completed', '25', '10');
    expect(mockService.list).toHaveBeenCalledWith('user-1', 'completed', 25, 10);
  });

  it('delegates previousSession', async () => {
    mockService.previousSession.mockResolvedValueOnce(null);
    await controller.previous(user, 'ex-1', 'w-1');
    expect(mockService.previousSession).toHaveBeenCalledWith('user-1', 'ex-1', 'w-1');
  });

  it('delegates exerciseHistory', async () => {
    mockService.exerciseHistory.mockResolvedValueOnce([]);
    await controller.exerciseHistory(user, 'ex-1', '5', 'w-1');
    expect(mockService.exerciseHistory).toHaveBeenCalledWith('user-1', 'ex-1', 5, 'w-1');
  });

  it('delegates getOne', async () => {
    mockService.getById.mockResolvedValueOnce({ id: 'w-1' });
    const result = await controller.getOne(user, 'w-1');
    expect(mockService.getById).toHaveBeenCalledWith('user-1', 'w-1');
    expect(result).toEqual({ id: 'w-1' });
  });

  it('delegates summary', async () => {
    mockService.summary.mockResolvedValueOnce({ id: 'w-1', totalVolume: 1000 });
    const result = await controller.summary(user, 'w-1');
    expect(mockService.summary).toHaveBeenCalledWith('user-1', 'w-1');
    expect(result).toEqual({ id: 'w-1', totalVolume: 1000 });
  });

  it('delegates remove (soft delete)', async () => {
    mockService.softDelete.mockResolvedValueOnce(undefined);
    await controller.remove(user, 'w-1');
    expect(mockService.softDelete).toHaveBeenCalledWith('user-1', 'w-1');
  });
});
