import { Test, type TestingModule } from '@nestjs/testing';
import { UsersController } from './users.controller.js';
import { UsersService } from './users.service.js';
import type { AuthUser } from '../auth/strategies/jwt-access.strategy.js';

describe('UsersController', () => {
  let controller: UsersController;
  const usersService = {
    getProfile: vi.fn(),
    update: vi.fn(),
    getPreferences: vi.fn(),
    updatePreferences: vi.fn(),
    getEquipment: vi.fn(),
    updateEquipment: vi.fn(),
    changePassword: vi.fn(),
  };

  const mockUser: AuthUser = {
    id: 'user-uuid-1',
    email: 'lifter@example.com',
  };

  beforeEach(async () => {
    vi.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      controllers: [UsersController],
      providers: [{ provide: UsersService, useValue: usersService }],
    }).compile();

    controller = module.get(UsersController);
  });

  it('getMe delegates to usersService.getProfile', async () => {
    usersService.getProfile.mockResolvedValue({ id: mockUser.id, email: mockUser.email });
    const res = await controller.getMe(mockUser);
    expect(usersService.getProfile).toHaveBeenCalledWith(mockUser.id);
    expect(res.id).toBe(mockUser.id);
  });

  it('updateMe delegates to usersService.update', async () => {
    usersService.update.mockResolvedValue({
      id: mockUser.id,
      email: mockUser.email,
      displayName: 'New Name',
      dateOfBirth: null,
      weightUnit: 'kg',
      timezone: 'UTC',
      gender: null,
      heightCm: null,
      weightKg: null,
      bodyFatPct: null,
      targetWeightKg: null,
      workoutDuration: null,
      trainingLocation: null,
      onboardedAt: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    const res = await controller.updateMe(mockUser, { displayName: 'New Name' });
    expect(usersService.update).toHaveBeenCalledWith(mockUser.id, { displayName: 'New Name' });
    expect(res.displayName).toBe('New Name');
  });

  it('getPreferences delegates to usersService.getPreferences', async () => {
    usersService.getPreferences.mockResolvedValue({ userId: mockUser.id, primaryGoal: 'lose_fat' });
    const res = await controller.getPreferences(mockUser);
    expect(usersService.getPreferences).toHaveBeenCalledWith(mockUser.id);
    expect(res?.primaryGoal).toBe('lose_fat');
  });

  it('updatePreferences delegates to usersService.updatePreferences', async () => {
    usersService.updatePreferences.mockResolvedValue({
      userId: mockUser.id,
      primaryGoal: 'build_muscle',
    });
    const res = await controller.updatePreferences(mockUser, { primaryGoal: 'build_muscle' });
    expect(usersService.updatePreferences).toHaveBeenCalledWith(mockUser.id, {
      primaryGoal: 'build_muscle',
    });
    expect(res.primaryGoal).toBe('build_muscle');
  });

  it('getEquipment delegates to usersService.getEquipment', async () => {
    usersService.getEquipment.mockResolvedValue(['barbell', 'dumbbell']);
    const res = await controller.getEquipment(mockUser);
    expect(usersService.getEquipment).toHaveBeenCalledWith(mockUser.id);
    expect(res.equipment).toEqual(['barbell', 'dumbbell']);
  });

  it('updateEquipment delegates to usersService.updateEquipment', async () => {
    usersService.updateEquipment.mockResolvedValue(['cable_machine']);
    const res = await controller.updateEquipment(mockUser, { equipment: ['cable_machine'] });
    expect(usersService.updateEquipment).toHaveBeenCalledWith(mockUser.id, ['cable_machine']);
    expect(res.equipment).toEqual(['cable_machine']);
  });

  it('changePassword delegates to usersService.changePassword', async () => {
    usersService.changePassword.mockResolvedValue({ success: true });
    const res = await controller.changePassword(mockUser, {
      currentPassword: 'oldSecretPassword',
      newPassword: 'newSecretPassword123',
    });
    expect(usersService.changePassword).toHaveBeenCalledWith(
      mockUser.id,
      'oldSecretPassword',
      'newSecretPassword123',
    );
    expect(res.success).toBe(true);
  });
});
