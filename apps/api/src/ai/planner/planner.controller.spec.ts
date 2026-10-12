import { describe, it, expect, beforeEach, vi } from 'vitest';
import { PlannerController } from './planner.controller.js';
import type { AuthUser } from '../../auth/strategies/jwt-access.strategy.js';

describe('PlannerController', () => {
  let controller: PlannerController;
  let mockPlannerService: any;

  const mockUser: AuthUser = {
    id: '11111111-1111-1111-1111-111111111111',
    email: 'test@example.com',
  };

  beforeEach(() => {
    mockPlannerService = {
      generatePlan: vi.fn().mockResolvedValue({
        name: 'AI Generated Split',
        frequency: 3,
        days: [],
      }),
      confirmPlan: vi.fn().mockResolvedValue({
        id: 'prog-1',
        name: 'AI Generated Split',
        status: 'active',
      }),
    };

    controller = new PlannerController(mockPlannerService);
  });

  it('delegates generate to plannerService.generatePlan', async () => {
    await controller.generate(mockUser, { frequency: 4 });
    expect(mockPlannerService.generatePlan).toHaveBeenCalledWith(mockUser.id, {
      frequency: 4,
    });
  });

  it('delegates confirm to plannerService.confirmPlan', async () => {
    const plan: any = { name: 'Split', frequency: 3, days: [] };
    await controller.confirm(mockUser, { plan, activateImmediately: true });
    expect(mockPlannerService.confirmPlan).toHaveBeenCalledWith(mockUser.id, {
      plan,
      activateImmediately: true,
    });
  });
});
