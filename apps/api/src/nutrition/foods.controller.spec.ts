import { describe, expect, it, vi, beforeEach } from 'vitest';
import { FoodsController } from './foods.controller.js';
import type { FoodsService } from './foods.service.js';

describe('FoodsController', () => {
  let controller: FoodsController;
  let foodsServiceMock: any;

  beforeEach(() => {
    foodsServiceMock = {
      search: vi.fn(),
      getById: vi.fn(),
      create: vi.fn(),
    };

    controller = new FoodsController(foodsServiceMock as unknown as FoodsService);
  });

  it('delegates search query to FoodsService with limit parsing', async () => {
    foodsServiceMock.search.mockResolvedValue([]);
    await controller.search('tempe', '10');
    expect(foodsServiceMock.search).toHaveBeenCalledWith('tempe', 10);
  });

  it('delegates create to FoodsService', async () => {
    const input: any = {
      name: 'Custom Salad',
      servingSize: '1 bowl',
      calories: 120,
      protein: 4,
      carbs: 10,
      fat: 7,
      source: 'custom',
    };
    foodsServiceMock.create.mockResolvedValue({ id: 'f-1', ...input });
    const res = await controller.create(input);
    expect(res.id).toBe('f-1');
    expect(foodsServiceMock.create).toHaveBeenCalledWith(input);
  });

  it('delegates getOne to FoodsService', async () => {
    foodsServiceMock.getById.mockResolvedValue({ id: 'f-1', name: 'Nasi' });
    const res = await controller.getOne('f-1');
    expect(res.name).toBe('Nasi');
    expect(foodsServiceMock.getById).toHaveBeenCalledWith('f-1');
  });
});
