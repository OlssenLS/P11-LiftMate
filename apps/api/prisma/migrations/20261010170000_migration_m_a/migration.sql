-- CreateEnum
CREATE TYPE "Gender" AS ENUM ('male', 'female', 'other', 'prefer_not_to_say');

-- CreateEnum
CREATE TYPE "WorkoutDuration" AS ENUM ('lt30', '30_45', '45_60', '60_90', 'gt90');

-- CreateEnum
CREATE TYPE "TrainingLocation" AS ENUM ('commercial_gym', 'home_gym', 'home', 'outdoor');

-- AlterEnum
ALTER TYPE "FitnessGoal" ADD VALUE 'body_recomposition';

-- AlterTable exercises: convert equipment to text for safe enum migration
ALTER TABLE "exercises" ALTER COLUMN "equipment" TYPE TEXT;

-- AlterTable user_equipment: convert equipment to text for safe enum migration
ALTER TABLE "user_equipment" ALTER COLUMN "equipment" TYPE TEXT;

-- Data migration: map cable -> cable_machine, machine -> machines, band -> resistance_bands
UPDATE "exercises" SET "equipment" = 'cable_machine' WHERE "equipment" = 'cable';
UPDATE "exercises" SET "equipment" = 'machines' WHERE "equipment" = 'machine';
UPDATE "exercises" SET "equipment" = 'resistance_bands' WHERE "equipment" = 'band';

UPDATE "user_equipment" SET "equipment" = 'cable_machine' WHERE "equipment" = 'cable';
UPDATE "user_equipment" SET "equipment" = 'machines' WHERE "equipment" = 'machine';
UPDATE "user_equipment" SET "equipment" = 'resistance_bands' WHERE "equipment" = 'band';

-- Drop old Equipment enum
DROP TYPE "Equipment";

-- Create new Equipment enum with all 12 spec items + kettlebell + other
CREATE TYPE "Equipment" AS ENUM (
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
  'kettlebell',
  'other'
);

-- Re-cast exercises.equipment to new Equipment enum
ALTER TABLE "exercises" ALTER COLUMN "equipment" TYPE "Equipment" USING "equipment"::"Equipment";

-- Re-cast user_equipment.equipment to new Equipment enum
ALTER TABLE "user_equipment" ALTER COLUMN "equipment" TYPE "Equipment" USING "equipment"::"Equipment";

-- AlterTable users
ALTER TABLE "users" ADD COLUMN "gender" "Gender",
ADD COLUMN "height_cm" DOUBLE PRECISION,
ADD COLUMN "weight_kg" DOUBLE PRECISION,
ADD COLUMN "body_fat_pct" DOUBLE PRECISION,
ADD COLUMN "target_weight_kg" DOUBLE PRECISION,
ADD COLUMN "workout_duration" "WorkoutDuration",
ADD COLUMN "training_location" "TrainingLocation";

-- AlterTable user_preferences
ALTER TABLE "user_preferences" ADD COLUMN "preferred_equipment" "Equipment"[] DEFAULT ARRAY[]::"Equipment"[],
ADD COLUMN "preferred_exercises" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN "dietary_preferences" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN "notifications_workout_reminder" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN "notifications_nutrition_reminder" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN "notifications_progress_reminder" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN "notifications_ai_insight" BOOLEAN NOT NULL DEFAULT true;
