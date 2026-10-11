import { describe, expect, it, vi, beforeEach } from 'vitest';
import { OnboardingService } from './onboarding.service.js';
import type { PrismaService } from '../prisma/prisma.service.js';
import {
  calculateNutritionTargets,
  deriveAgeFromDateOfBirth,
  type OnboardingInput,
} from '@liftmate/shared';

describe('OnboardingService', () => {
  let service: OnboardingService;
  let prismaMock: any;
  let txMock: any;

  beforeEach(() => {
    txMock = {
      user: {
        update: vi.fn(),
      },
      userPreferences: {
        upsert: vi.fn(),
      },
      userEquipment: {
        deleteMany: vi.fn().mockResolvedValue({ count: 0 }),
        createMany: vi.fn().mockResolvedValue({ count: 2 }),
      },
    };

    prismaMock = {
      $transaction: vi.fn(async (cb: (tx: any) => Promise<any>) => cb(txMock)),
    };

    service = new OnboardingService(prismaMock as unknown as PrismaService);
  });

  const validPayload: OnboardingInput = {
    displayName: 'Ahmad Lifter',
    dateOfBirth: new Date('1995-05-15'),
    gender: 'male',
    timezone: 'Asia/Jakarta',
    heightCm: 175,
    weightKg: 78,
    bodyFatPct: 18,
    targetWeightKg: 75,
    weightUnit: 'kg',
    primaryGoal: 'build_muscle',
    secondaryGoal: 'lose_fat',
    experienceLevel: 'intermediate',
    weeklyFrequency: 4,
    workoutDuration: '45_60',
    trainingLocation: 'commercial_gym',
    equipment: ['barbell', 'dumbbell'],
    preferredEquipment: ['barbell'],
    preferredExercises: ['Barbell Bench Press'],
    avoidExercises: ['Behind the Neck Press'],
    targetCalories: 2600,
    targetProtein: 160,
    targetCarbs: 280,
    targetFat: 75,
    dietaryPreferences: ['halal'],
  };

  it('completes onboarding across users, preferences, and equipment tables', async () => {
    const updatedUserRow = {
      id: 'user-uuid-1',
      email: 'ahmad@example.com',
      displayName: validPayload.displayName,
      dateOfBirth: validPayload.dateOfBirth,
      gender: validPayload.gender,
      heightCm: validPayload.heightCm,
      weightKg: validPayload.weightKg,
      bodyFatPct: validPayload.bodyFatPct,
      targetWeightKg: validPayload.targetWeightKg,
      workoutDuration: 'd45_60', // Prisma mapped duration
      trainingLocation: validPayload.trainingLocation,
      weightUnit: validPayload.weightUnit,
      timezone: validPayload.timezone,
      onboardedAt: new Date(),
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    txMock.user.update.mockResolvedValue(updatedUserRow);

    const result = await service.complete('user-uuid-1', validPayload);

    // Verify user update
    expect(txMock.user.update).toHaveBeenCalledWith({
      where: { id: 'user-uuid-1' },
      data: expect.objectContaining({
        displayName: 'Ahmad Lifter',
        gender: 'male',
        heightCm: 175,
        weightKg: 78,
        bodyFatPct: 18,
        targetWeightKg: 75,
        workoutDuration: 'd45_60',
        trainingLocation: 'commercial_gym',
        weightUnit: 'kg',
        timezone: 'Asia/Jakarta',
        onboardedAt: expect.any(Date),
      }),
    });

    // Verify user preferences upsert
    expect(txMock.userPreferences.upsert).toHaveBeenCalledWith({
      where: { userId: 'user-uuid-1' },
      create: expect.objectContaining({
        userId: 'user-uuid-1',
        primaryGoal: 'build_muscle',
        secondaryGoal: 'lose_fat',
        experienceLevel: 'intermediate',
        weeklyFrequency: 4,
        preferredEquipment: ['barbell'],
        preferredExercises: ['Barbell Bench Press'],
        avoidExercises: ['Behind the Neck Press'],
        dietaryPreferences: ['halal'],
        targetCalories: 2600,
        targetProtein: 160,
        targetCarbs: 280,
        targetFat: 75,
      }),
      update: expect.objectContaining({
        primaryGoal: 'build_muscle',
        secondaryGoal: 'lose_fat',
        experienceLevel: 'intermediate',
        weeklyFrequency: 4,
        preferredEquipment: ['barbell'],
        preferredExercises: ['Barbell Bench Press'],
        avoidExercises: ['Behind the Neck Press'],
        dietaryPreferences: ['halal'],
        targetCalories: 2600,
        targetProtein: 160,
        targetCarbs: 280,
        targetFat: 75,
      }),
    });

    // Verify user equipment replacement
    expect(txMock.userEquipment.deleteMany).toHaveBeenCalledWith({
      where: { userId: 'user-uuid-1' },
    });
    expect(txMock.userEquipment.createMany).toHaveBeenCalledWith({
      data: [
        { userId: 'user-uuid-1', equipment: 'barbell' },
        { userId: 'user-uuid-1', equipment: 'dumbbell' },
      ],
      skipDuplicates: true,
    });

    // Verify returned public user object
    expect(result.id).toBe('user-uuid-1');
    expect(result.workoutDuration).toBe('45_60');
    expect(result.gender).toBe('male');
    expect(result.heightCm).toBe(175);
    expect(result.weightKg).toBe(78);
  });
});

describe('Mifflin-St Jeor Nutrition Calculation & Helper', () => {
  it('calculates BMR and macros accurately for male lifter', () => {
    // 78kg, 175cm, age 30, male
    // BMR = 10*78 + 6.25*175 - 5*30 + 5 = 780 + 1093.75 - 150 + 5 = 1728.75 -> round to 1729
    // Frequency 4 days -> activity multiplier 1.55 -> TDEE = round(1728.75 * 1.55) = 2680
    // Goal: build_muscle (+300) -> 2980 kcal
    // Protein: 78 * 2.0 = 156g (624 kcal)
    // Fat: 78 * 0.9 = 70.2 -> 70g (630 kcal)
    // Remaining carbs: (2980 - (624 + 630)) / 4 = 1726 / 4 = 431.5 -> 432g
    const res = calculateNutritionTargets({
      gender: 'male',
      weightKg: 78,
      heightCm: 175,
      age: 30,
      weeklyFrequency: 4,
      primaryGoal: 'build_muscle',
    });

    expect(res.bmr).toBe(1729);
    expect(res.tdee).toBe(2680);
    expect(res.targetCalories).toBe(2980);
    expect(res.targetProtein).toBe(156);
    expect(res.targetFat).toBe(70);
    expect(res.targetCarbs).toBe(432);
    expect(res.isEstimate).toBe(false);
  });

  it('calculates BMR and macros accurately for female lifter', () => {
    // 60kg, 165cm, age 25, female
    // BMR = 10*60 + 6.25*165 - 5*25 - 161 = 600 + 1031.25 - 125 - 161 = 1345.25 -> 1345
    // Frequency 3 days -> multiplier 1.55 -> TDEE = round(1345.25 * 1.55) = 2085
    // Goal: lose_fat (-500) -> 1585 kcal
    // Protein: 60 * 2.0 = 120g (480 kcal)
    // Fat: 60 * 0.9 = 54g (486 kcal)
    // Remaining carbs: (1585 - (480 + 486)) / 4 = 619 / 4 = 154.75 -> 155g
    const res = calculateNutritionTargets({
      gender: 'female',
      weightKg: 60,
      heightCm: 165,
      age: 25,
      weeklyFrequency: 3,
      primaryGoal: 'lose_fat',
    });

    expect(res.bmr).toBe(1345);
    expect(res.tdee).toBe(2085);
    expect(res.targetCalories).toBe(1585);
    expect(res.targetProtein).toBe(120);
    expect(res.targetFat).toBe(54);
    expect(res.targetCarbs).toBe(155);
    expect(res.isEstimate).toBe(false);
  });

  it('uses midpoint constant (-78) and labels result as estimate for other/prefer_not_to_say', () => {
    // Midpoint between +5 (male) and -161 (female) is (5 + -161) / 2 = -78
    const resOther = calculateNutritionTargets({
      gender: 'other',
      weightKg: 70,
      heightCm: 170,
      age: 28,
      weeklyFrequency: 3,
      primaryGoal: 'general_fitness',
    });

    expect(resOther.isEstimate).toBe(true);
    // BMR = 10*70 + 6.25*170 - 5*28 - 78 = 700 + 1062.5 - 140 - 78 = 1544.5 -> 1545
    expect(resOther.bmr).toBe(1545);

    const resPnts = calculateNutritionTargets({
      gender: 'prefer_not_to_say',
      weightKg: 70,
      heightCm: 170,
      age: 28,
      weeklyFrequency: 3,
      primaryGoal: 'general_fitness',
    });
    expect(resPnts.isEstimate).toBe(true);
    expect(resPnts.bmr).toBe(resOther.bmr);
  });

  it('derives age correctly from date of birth', () => {
    const twentyYearsAgo = new Date();
    twentyYearsAgo.setFullYear(twentyYearsAgo.getFullYear() - 20);
    // Subtract 1 day to be safely 20
    twentyYearsAgo.setDate(twentyYearsAgo.getDate() - 1);

    expect(deriveAgeFromDateOfBirth(twentyYearsAgo)).toBe(20);
  });
});
