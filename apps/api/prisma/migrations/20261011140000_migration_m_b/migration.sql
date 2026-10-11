-- CreateEnum
CREATE TYPE "WorkoutStatus" AS ENUM ('in_progress', 'completed', 'cancelled');

-- AlterTable exercises: add alternative_exercises text array
ALTER TABLE "exercises" ADD COLUMN "alternative_exercises" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[];

-- AlterTable workouts: rename note to notes, add status and program_id
ALTER TABLE "workouts" RENAME COLUMN "note" TO "notes";
ALTER TABLE "workouts" ADD COLUMN "status" "WorkoutStatus" NOT NULL DEFAULT 'completed';
ALTER TABLE "workouts" ADD COLUMN "program_id" UUID;

-- CreateIndex
CREATE INDEX "workouts_user_id_status_idx" ON "workouts"("user_id", "status");

-- AlterTable workout_sets: add rir_unknown, rpe, rest_time, notes
ALTER TABLE "workout_sets" ADD COLUMN "rir_unknown" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "workout_sets" ADD COLUMN "rpe" DECIMAL(3,1);
ALTER TABLE "workout_sets" ADD COLUMN "rest_time" INTEGER;
ALTER TABLE "workout_sets" ADD COLUMN "notes" TEXT;
