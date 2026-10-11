import { BadRequestException, NotFoundException } from '@nestjs/common';
import { Test, type TestingModule } from '@nestjs/testing';
import { PrismaService } from '../prisma/prisma.service.js';
import { UsersService, toPublicUser } from './users.service.js';

describe('UsersService', () => {
  let service: UsersService;
  const prisma = {
    user: {
      create: vi.fn(),
      findFirst: vi.fn(),
      findUnique: vi.fn(),
      update: vi.fn(),
    },
    userPreferences: {
      findFirst: vi.fn(),
      upsert: vi.fn(),
    },
    userEquipment: {
      findMany: vi.fn(),
      deleteMany: vi.fn(),
      createMany: vi.fn(),
    },
    $transaction: vi.fn((cb: any) => cb(prisma)),
  };

  beforeEach(async () => {
    vi.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      providers: [UsersService, { provide: PrismaService, useValue: prisma }],
    }).compile();
    service = module.get(UsersService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('hashes the password when creating a user', async () => {
    prisma.user.create.mockImplementation(({ data }: { data: Record<string, unknown> }) =>
      Promise.resolve({ id: 'u1', ...data }),
    );
    const user = await service.create('a@b.com', 'password123', 'Alice');
    const call = prisma.user.create.mock.calls[0][0] as { data: { passwordHash: string } };
    expect(call.data.passwordHash).not.toEqual('password123');
    expect(await service.verifyPassword('password123', call.data.passwordHash)).toBe(true);
    expect(user.id).toBe('u1');
  });

  it('maps a user to a public user without password or deletedAt', () => {
    const now = new Date();
    const pub = toPublicUser({
      id: 'u1',
      email: 'a@b.com',
      passwordHash: 'secret',
      displayName: 'Alice',
      dateOfBirth: null,
      weightUnit: 'kg',
      timezone: 'UTC',
      gender: 'female',
      heightCm: 165,
      weightKg: 60,
      bodyFatPct: 22,
      targetWeightKg: 58,
      workoutDuration: 'd45_60',
      trainingLocation: 'commercial_gym',
      onboardedAt: null,
      createdAt: now,
      updatedAt: now,
      deletedAt: null,
    } as never);
    expect(pub).not.toHaveProperty('passwordHash');
    expect(pub).not.toHaveProperty('deletedAt');
    expect(pub.email).toBe('a@b.com');
    expect(pub.workoutDuration).toBe('45_60');
    expect(pub.heightCm).toBe(165);
  });

  it('getProfile throws NotFoundException when user does not exist', async () => {
    prisma.user.findFirst.mockResolvedValue(null);
    await expect(service.getProfile('missing-id')).rejects.toThrow(NotFoundException);
  });

  it('getProfile returns public user', async () => {
    const now = new Date();
    prisma.user.findFirst.mockResolvedValue({
      id: 'u1',
      email: 'a@b.com',
      passwordHash: 'secret',
      displayName: 'Alice',
      dateOfBirth: null,
      weightUnit: 'kg',
      timezone: 'UTC',
      gender: 'female',
      heightCm: 165,
      weightKg: 60,
      bodyFatPct: null,
      targetWeightKg: null,
      workoutDuration: null,
      trainingLocation: null,
      onboardedAt: now,
      createdAt: now,
      updatedAt: now,
      deletedAt: null,
    });
    const profile = await service.getProfile('u1');
    expect(profile.id).toBe('u1');
    expect(profile.displayName).toBe('Alice');
  });

  it('updatePreferences upserts user preferences', async () => {
    const prefs = {
      id: 'pref-1',
      userId: 'u1',
      primaryGoal: 'build_muscle',
      secondaryGoal: null,
      experienceLevel: 'intermediate',
      weeklyFrequency: 4,
      defaultRestSeconds: 120,
      preferredEquipment: ['barbell'],
      preferredExercises: ['Bench Press'],
      avoidExercises: [],
      dietaryPreferences: ['halal'],
      targetCalories: 2500,
      targetProtein: 160,
      targetCarbs: 260,
      targetFat: 70,
      notificationsWorkoutReminder: true,
      notificationsNutritionReminder: true,
      notificationsProgressReminder: true,
      notificationsAiInsight: true,
      createdAt: new Date(),
      updatedAt: new Date(),
      deletedAt: null,
    };
    prisma.userPreferences.upsert.mockResolvedValue(prefs);

    const result = await service.updatePreferences('u1', {
      primaryGoal: 'build_muscle' as any,
      targetCalories: 2500,
    });
    expect(prisma.userPreferences.upsert).toHaveBeenCalledWith({
      where: { userId: 'u1' },
      create: expect.objectContaining({ userId: 'u1', primaryGoal: 'build_muscle' }),
      update: expect.objectContaining({ primaryGoal: 'build_muscle' }),
    });
    expect(result.primaryGoal).toBe('build_muscle');
  });

  it('updateEquipment replaces user equipment in a transaction', async () => {
    prisma.userEquipment.deleteMany.mockResolvedValue({ count: 1 });
    prisma.userEquipment.createMany.mockResolvedValue({ count: 2 });

    const result = await service.updateEquipment('u1', ['barbell' as any, 'dumbbell' as any]);
    expect(prisma.userEquipment.deleteMany).toHaveBeenCalledWith({ where: { userId: 'u1' } });
    expect(prisma.userEquipment.createMany).toHaveBeenCalledWith({
      data: [
        { userId: 'u1', equipment: 'barbell' },
        { userId: 'u1', equipment: 'dumbbell' },
      ],
      skipDuplicates: true,
    });
    expect(result).toEqual(['barbell', 'dumbbell']);
  });

  it('changePassword throws BadRequestException on invalid current password', async () => {
    const now = new Date();
    // Alice with password "correctPassword"
    const hash = await service.create('b@b.com', 'correctPassword', 'Bob');
    prisma.user.findUnique.mockResolvedValue({
      id: 'u1',
      passwordHash: (hash as any).passwordHash,
    });

    await expect(
      service.changePassword('u1', 'wrongPassword', 'newPassword123'),
    ).rejects.toThrow(BadRequestException);
  });

  it('changePassword updates password on valid current password', async () => {
    const hash = await service.create('b@b.com', 'correctPassword', 'Bob');
    prisma.user.findUnique.mockResolvedValue({
      id: 'u1',
      passwordHash: (hash as any).passwordHash,
    });
    prisma.user.update.mockResolvedValue({ id: 'u1' });

    const res = await service.changePassword('u1', 'correctPassword', 'brandNewPassword123');
    expect(res).toEqual({ success: true });
    expect(prisma.user.update).toHaveBeenCalledWith({
      where: { id: 'u1' },
      data: expect.objectContaining({ passwordHash: expect.any(String) }),
    });
  });
});
