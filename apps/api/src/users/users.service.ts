import { Injectable } from '@nestjs/common';
import type { PublicUser, UpdateUserInput, WorkoutDuration as SharedWorkoutDuration } from '@liftmate/shared';
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

  verifyPassword(password: string, passwordHash: string): Promise<boolean> {
    return bcrypt.compare(password, passwordHash);
  }

  update(id: string, data: UpdateUserInput): Promise<User> {
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
}
