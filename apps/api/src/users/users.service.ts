import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import type {
  Equipment,
  PublicUser,
  UpdateUserInput,
  UpdateUserPreferencesInput,
  UserPreferences,
  WorkoutDuration as SharedWorkoutDuration,
} from '@liftmate/shared';
import type { User, WorkoutDuration as PrismaWorkoutDuration } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../prisma/prisma.service.js';

const SALT_ROUNDS = 12;

function toSharedDuration(d: PrismaWorkoutDuration | null | undefined): SharedWorkoutDuration | null {
  if (!d) return null;
  if (d === 'd30_45') return '30_45';
  if (d === 'd45_60') return '45_60';
  if (d === 'd60_90') return '60_90';
  return d;
}

export function toPrismaDuration(d: SharedWorkoutDuration | null | undefined): PrismaWorkoutDuration | null | undefined {
  if (d === undefined) return undefined;
  if (d === null) return null;
  if (d === '30_45') return 'd30_45';
  if (d === '45_60') return 'd45_60';
  if (d === '60_90') return 'd60_90';
  return d;
}

export function toPublicUser(user: User): PublicUser {
  return {
    id: user.id,
    email: user.email,
    displayName: user.displayName,
    dateOfBirth: user.dateOfBirth,
    weightUnit: user.weightUnit,
    timezone: user.timezone,
    gender: user.gender,
    heightCm: user.heightCm,
    weightKg: user.weightKg,
    bodyFatPct: user.bodyFatPct,
    targetWeightKg: user.targetWeightKg,
    workoutDuration: toSharedDuration(user.workoutDuration),
    trainingLocation: user.trainingLocation,
    onboardedAt: user.onboardedAt,
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
  };
}

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  async create(email: string, password: string, displayName: string): Promise<User> {
    const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);
    return this.prisma.user.create({
      data: { email, passwordHash, displayName },
    });
  }

  findByEmail(email: string): Promise<User | null> {
    return this.prisma.user.findFirst({ where: { email, deletedAt: null } });
  }

  findById(id: string): Promise<User | null> {
    return this.prisma.user.findFirst({ where: { id, deletedAt: null } });
  }

  async getProfile(userId: string): Promise<PublicUser> {
    const user = await this.findById(userId);
    if (!user) {
      throw new NotFoundException('User not found');
    }
    return toPublicUser(user);
  }

  verifyPassword(password: string, passwordHash: string): Promise<boolean> {
    return bcrypt.compare(password, passwordHash);
  }

  async update(id: string, data: UpdateUserInput): Promise<User> {
    const { workoutDuration, ...rest } = data;
    const prismaData = {
      ...rest,
      ...(workoutDuration !== undefined
        ? { workoutDuration: toPrismaDuration(workoutDuration) }
        : {}),
    };
    return this.prisma.user.update({ where: { id }, data: prismaData });
  }

  async updatePassword(id: string, password: string): Promise<User> {
    const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);
    return this.prisma.user.update({
      where: { id },
      data: { passwordHash },
    });
  }

  async changePassword(userId: string, current: string, next: string): Promise<{ success: boolean }> {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      throw new NotFoundException('User not found');
    }
    const match = await this.verifyPassword(current, user.passwordHash);
    if (!match) {
      throw new BadRequestException('Current password does not match');
    }
    await this.updatePassword(userId, next);
    return { success: true };
  }

  async getPreferences(userId: string): Promise<UserPreferences | null> {
    return this.prisma.userPreferences.findFirst({
      where: { userId, deletedAt: null },
    });
  }

  async updatePreferences(
    userId: string,
    data: UpdateUserPreferencesInput
  ): Promise<UserPreferences> {
    return this.prisma.userPreferences.upsert({
      where: { userId },
      create: {
        userId,
        ...data,
      },
      update: data,
    });
  }

  async getEquipment(userId: string): Promise<Equipment[]> {
    const rows = await this.prisma.userEquipment.findMany({
      where: { userId, deletedAt: null },
      select: { equipment: true },
    });
    return rows.map((r) => r.equipment as Equipment);
  }

  async updateEquipment(userId: string, equipment: Equipment[]): Promise<Equipment[]> {
    await this.prisma.$transaction(async (tx) => {
      await tx.userEquipment.deleteMany({ where: { userId } });
      if (equipment.length > 0) {
        await tx.userEquipment.createMany({
          data: equipment.map((eq) => ({ userId, equipment: eq })),
          skipDuplicates: true,
        });
      }
    }, { maxWait: 10000, timeout: 30000 });
    return equipment;
  }
}
