-- CreateEnum
CREATE TYPE "ProgramStatus" AS ENUM ('active', 'completed', 'archived');

-- CreateTable
CREATE TABLE "programs" (
    "id" UUID NOT NULL,
    "user_id" UUID,
    "program_name" TEXT NOT NULL,
    "goal" "FitnessGoal" NOT NULL,
    "frequency" INTEGER NOT NULL,
    "duration" TEXT NOT NULL DEFAULT '45_60',
    "description" TEXT,
    "status" "ProgramStatus" NOT NULL DEFAULT 'active',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "programs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "program_exercises" (
    "id" UUID NOT NULL,
    "program_id" UUID NOT NULL,
    "day" INTEGER NOT NULL,
    "day_name" TEXT,
    "exercise_id" UUID NOT NULL,
    "sets" INTEGER NOT NULL DEFAULT 3,
    "rep_min" INTEGER NOT NULL DEFAULT 8,
    "rep_max" INTEGER NOT NULL DEFAULT 12,
    "target_rir" INTEGER,
    "rest_seconds" INTEGER,
    "order" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "program_exercises_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "programs_user_id_idx" ON "programs"("user_id");
CREATE INDEX "programs_status_idx" ON "programs"("status");

-- CreateIndex
CREATE INDEX "program_exercises_program_id_day_idx" ON "program_exercises"("program_id", "day");
CREATE INDEX "program_exercises_exercise_id_idx" ON "program_exercises"("exercise_id");

-- AddForeignKey
ALTER TABLE "programs" ADD CONSTRAINT "programs_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "program_exercises" ADD CONSTRAINT "program_exercises_program_id_fkey" FOREIGN KEY ("program_id") REFERENCES "programs"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "program_exercises" ADD CONSTRAINT "program_exercises_exercise_id_fkey" FOREIGN KEY ("exercise_id") REFERENCES "exercises"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "workouts" ADD CONSTRAINT "workouts_program_id_fkey" FOREIGN KEY ("program_id") REFERENCES "programs"("id") ON DELETE SET NULL ON UPDATE CASCADE;
