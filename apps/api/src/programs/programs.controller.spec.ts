import { describe, expect, it, vi, beforeEach } from 'vitest';
import { ProgramsController } from './programs.controller.js';
import { ProgramStatus, type ProgramsService } from './programs.service.js';
import { FitnessGoal } from './templates/starter-templates.js';
import type { AuthUser } from '../auth/strategies/jwt-access.strategy.js';

describe('ProgramsController', () => {
  let controller: ProgramsController;
  let serviceMock: any;

  const mockUser: AuthUser = {
    id: 'user-uuid-1',
    email: 'test@example.com',
  };

  const sampleProgram = {
    id: 'prog-uuid-1',
    userId: mockUser.id,
    name: 'Full Body 3-Day Foundation',
    goal: FitnessGoal.build_muscle,
    frequency: 3,
    duration: '45_60',
    description: 'Sample description',
    status: ProgramStatus.active,
    programExercises: [],
    createdAt: new Date(),
    updatedAt: new Date(),
    deletedAt: null,
  };

  beforeEach(() => {
    serviceMock = {
      list: vi.fn().mockResolvedValue([sampleProgram]),
      getCurrent: vi.fn().mockResolvedValue(sampleProgram),
      getTemplates: vi.fn().mockReturnValue([{ id: 'full-body-3day', name: 'Full Body' }]),
      create: vi.fn().mockResolvedValue(sampleProgram),
      getById: vi.fn().mockResolvedValue(sampleProgram),
      activate: vi.fn().mockResolvedValue(sampleProgram),
      startProgramDay: vi.fn().mockResolvedValue({ id: 'workout-1', status: 'in_progress' }),
    };

    controller = new ProgramsController(serviceMock as unknown as ProgramsService);
  });

  it('list delegates to service.list with user id and status filter', async () => {
    const result = await controller.list(mockUser, ProgramStatus.active);
    expect(serviceMock.list).toHaveBeenCalledWith(mockUser.id, ProgramStatus.active);
    expect(result).toEqual([sampleProgram]);
  });

  it('current delegates to service.getCurrent', async () => {
    const result = await controller.current(mockUser);
    expect(serviceMock.getCurrent).toHaveBeenCalledWith(mockUser.id);
    expect(result).toBe(sampleProgram);
  });

  it('templates delegates to service.getTemplates', () => {
    const result = controller.templates();
    expect(serviceMock.getTemplates).toHaveBeenCalled();
    expect(result).toEqual([{ id: 'full-body-3day', name: 'Full Body' }]);
  });

  it('create delegates to service.create with user id and input body', async () => {
    const input = {
      name: 'Custom Split',
      goal: FitnessGoal.build_muscle,
      frequency: 3,
      duration: '45_60',
      status: ProgramStatus.active,
      exercises: [],
    };
    const result = await controller.create(mockUser, input);
    expect(serviceMock.create).toHaveBeenCalledWith(mockUser.id, input);
    expect(result).toBe(sampleProgram);
  });

  it('getOne delegates to service.getById', async () => {
    const result = await controller.getOne(mockUser, 'prog-uuid-1');
    expect(serviceMock.getById).toHaveBeenCalledWith(mockUser.id, 'prog-uuid-1');
    expect(result).toBe(sampleProgram);
  });

  it('activate delegates to service.activate', async () => {
    const result = await controller.activate(mockUser, 'prog-uuid-1');
    expect(serviceMock.activate).toHaveBeenCalledWith(mockUser.id, 'prog-uuid-1');
    expect(result).toBe(sampleProgram);
  });

  it('startDay delegates to service.startProgramDay', async () => {
    const result = await controller.startDay(mockUser, 'prog-uuid-1', 2);
    expect(serviceMock.startProgramDay).toHaveBeenCalledWith(mockUser.id, 'prog-uuid-1', 2);
    expect(result).toEqual({ id: 'workout-1', status: 'in_progress' });
  });
});
