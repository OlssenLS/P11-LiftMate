import { describe, it, expect, vi, beforeEach } from 'vitest';
import { AnalyticsController } from './analytics.controller.js';

describe('AnalyticsController', () => {
  let controller: AnalyticsController;
  let mockService: any;

  beforeEach(() => {
    mockService = {
      getOverview: vi.fn(),
      generateInsights: vi.fn(),
    };
    controller = new AnalyticsController(mockService);
  });

  it('delegates getOverview to analyticsService', async () => {
    const dummy = { sufficiency: { isSufficient: false } };
    mockService.getOverview.mockResolvedValue(dummy);

    const res = await controller.getOverview({ id: 'u1', email: 'test@example.com' });
    expect(res).toBe(dummy);
    expect(mockService.getOverview).toHaveBeenCalledWith('u1');
  });

  it('delegates generateInsights to analyticsService', async () => {
    const dummy = { sufficiency: { isSufficient: true } };
    mockService.generateInsights.mockResolvedValue(dummy);

    const res = await controller.generateInsights({ id: 'u1', email: 'test@example.com' }, { forceRefresh: true });
    expect(res).toBe(dummy);
    expect(mockService.generateInsights).toHaveBeenCalledWith('u1', true);
  });
});
