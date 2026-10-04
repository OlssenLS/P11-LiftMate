import { Injectable } from '@nestjs/common';
import type { OnboardingInput, PublicUser } from '@liftmate/shared';
import { PrismaService } from '../prisma/prisma.service.js';
import { toPublicUser } from '../users/users.service.js';

@Injectable()
export class OnboardingService {
  constructor(private readonly prisma: PrismaService) {}

  async complete(userId: string, input: OnboardingInput): Promise<PublicUser> {
    const user = await this.prisma.$transaction(async (tx) => {
      const updated = await tx.user.update({
        where: { id: userId },
        data: {
          displayName: input.displayName,
          dateOfBirth: input.dateOfBirth,
          weightUnit: input.weightUnit,
          timezone: input.timezone,
          onboardedAt: new Date(),
        },
      });

      await tx.userPreferences.upsert({
        where: { userId },
        create: {
          userId,
          primaryGoal: input.primaryGoal,
          secondaryGoal: input.secondaryGoal ?? null,
          experienceLevel: input.experienceLevel,
          weeklyFrequency: input.weeklyFrequency,
          targetCalories: input.targetCalories,
          targetProtein: input.targetProtein,
          targetCarbs: input.targetCarbs,
          targetFat: input.targetFat,
        },
        update: {
          primaryGoal: input.primaryGoal,
          secondaryGoal: input.secondaryGoal ?? null,
          experienceLevel: input.experienceLevel,
          weeklyFrequency: input.weeklyFrequency,
          targetCalories: input.targetCalories,
          targetProtein: input.targetProtein,
          targetCarbs: input.targetCarbs,
          targetFat: input.targetFat,
        },
      });

      await tx.userEquipment.deleteMany({ where: { userId } });
      await tx.userEquipment.createMany({
        data: input.equipment.map((equipment) => ({ userId, equipment })),
        skipDuplicates: true,
      });

      return updated;
    });

    return toPublicUser(user);
  }
}
