-- CreateEnum
CREATE TYPE "FitnessGoal" AS ENUM ('lose_fat', 'build_muscle', 'gain_strength', 'general_fitness');

-- AlterTable
ALTER TABLE "user_preferences" ADD COLUMN     "experience_level" "Difficulty",
ADD COLUMN     "primary_goal" "FitnessGoal",
ADD COLUMN     "secondary_goal" "FitnessGoal",
ADD COLUMN     "target_calories" INTEGER,
ADD COLUMN     "target_carbs" INTEGER,
ADD COLUMN     "target_fat" INTEGER,
ADD COLUMN     "target_protein" INTEGER;

-- AlterTable
ALTER TABLE "users" ADD COLUMN     "onboarded_at" TIMESTAMP(3);

-- CreateTable
CREATE TABLE "refresh_tokens" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "token_hash" TEXT NOT NULL,
    "device_info" TEXT,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "revoked_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "refresh_tokens_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "refresh_tokens_user_id_idx" ON "refresh_tokens"("user_id");

-- CreateIndex
CREATE INDEX "refresh_tokens_token_hash_idx" ON "refresh_tokens"("token_hash");

-- AddForeignKey
ALTER TABLE "refresh_tokens" ADD CONSTRAINT "refresh_tokens_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
