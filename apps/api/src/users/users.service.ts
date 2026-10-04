import { Injectable } from '@nestjs/common';
import type { PublicUser, UpdateUserInput } from '@liftmate/shared';
import type { User } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../prisma/prisma.service.js';

const SALT_ROUNDS = 12;

export function toPublicUser(user: User): PublicUser {
  return {
    id: user.id,
    email: user.email,
    displayName: user.displayName,
    dateOfBirth: user.dateOfBirth,
    weightUnit: user.weightUnit,
    timezone: user.timezone,
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
    return this.prisma.user.update({ where: { id }, data });
  }
}
