import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { PrismaClient } from '@prisma/client';

describe('Migration M-A Data Integrity & Schema Preservation', () => {
  let prisma: PrismaClient;

  beforeAll(async () => {
    prisma = new PrismaClient();
    await prisma.$connect();
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it('preserves existing users with nullable M-A columns', async () => {
    const user = await prisma.user.findFirst();
    expect(user).toBeDefined();
    if (user) {
      expect(user.id).toBeDefined();
      expect(user.email).toBeDefined();
      // M-A columns are nullable so legacy users survive intact
      expect('gender' in user).toBe(true);
      expect('heightCm' in user).toBe(true);
      expect('weightKg' in user).toBe(true);
      expect('bodyFatPct' in user).toBe(true);
      expect('targetWeightKg' in user).toBe(true);
      expect('workoutDuration' in user).toBe(true);
      expect('trainingLocation' in user).toBe(true);
    }
  });

  it('migrated legacy equipment values in user_equipment', async () => {
    const equipmentRows = await prisma.userEquipment.findMany({
      select: { equipment: true },
      distinct: ['equipment'],
    });

    const equipmentSet = new Set(equipmentRows.map((r) => r.equipment));

    // Verify none of the dropped legacy enum values exist
    expect(equipmentSet.has('cable' as any)).toBe(false);
    expect(equipmentSet.has('machine' as any)).toBe(false);
    expect(equipmentSet.has('band' as any)).toBe(false);

    // Verify new replacement enum values exist from migrated rows
    expect(equipmentSet.has('cable_machine')).toBe(true);
    expect(equipmentSet.has('machines')).toBe(true);
    expect(equipmentSet.has('resistance_bands')).toBe(true);
  });

  it('supports all 12 spec equipment enum values plus extras', async () => {
    const enumRows = await prisma.$queryRawUnsafe<Array<{ enumlabel: string }>>(`
      SELECT e.enumlabel 
      FROM pg_type t 
      JOIN pg_enum e ON t.oid = e.enumtypid 
      WHERE t.typname = 'Equipment'
      ORDER BY e.enumsortorder;
    `);

    const labels = enumRows.map((r) => r.enumlabel);

    const required12 = [
      'barbell',
      'dumbbell',
      'cable_machine',
      'smith_machine',
      'leg_press',
      'hack_squat',
      'pulldown_machine',
      'chest_press',
      'machines',
      'pull_up_bar',
      'resistance_bands',
      'bodyweight',
    ];

    for (const item of required12) {
      expect(labels).toContain(item);
    }
    expect(labels).toContain('kettlebell');
    expect(labels).toContain('other');
  });

  it('supports body_recomposition in FitnessGoal enum', async () => {
    const enumRows = await prisma.$queryRawUnsafe<Array<{ enumlabel: string }>>(`
      SELECT e.enumlabel 
      FROM pg_type t 
      JOIN pg_enum e ON t.oid = e.enumtypid 
      WHERE t.typname = 'FitnessGoal';
    `);

    const labels = enumRows.map((r) => r.enumlabel);
    expect(labels).toContain('body_recomposition');
  });

  it('preserves existing user_preferences with new defaults', async () => {
    const pref = await prisma.userPreferences.findFirst();
    expect(pref).toBeDefined();
    if (pref) {
      expect(Array.isArray(pref.preferredEquipment)).toBe(true);
      expect(Array.isArray(pref.preferredExercises)).toBe(true);
      expect(Array.isArray(pref.avoidExercises)).toBe(true);
      expect(Array.isArray(pref.dietaryPreferences)).toBe(true);
      expect(typeof pref.notificationsWorkoutReminder).toBe('boolean');
      expect(typeof pref.notificationsNutritionReminder).toBe('boolean');
      expect(typeof pref.notificationsProgressReminder).toBe('boolean');
      expect(typeof pref.notificationsAiInsight).toBe('boolean');
    }
  });
});
