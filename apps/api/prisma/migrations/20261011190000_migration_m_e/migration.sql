-- Migration M-E: Progress & Metrics (Body Weight Logs, Personal Records)

CREATE TABLE IF NOT EXISTS "body_weight_logs" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "user_id" UUID NOT NULL,
    "weight_kg" DECIMAL(5, 2) NOT NULL,
    "logged_at" TIMESTAMP(3) NOT NULL,
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "body_weight_logs_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "exercise_personal_records" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "user_id" UUID NOT NULL,
    "exercise_id" UUID NOT NULL,
    "max_weight" DECIMAL(7, 2) NOT NULL,
    "max_reps" INTEGER NOT NULL,
    "max_estimated_1rm" DECIMAL(7, 2) NOT NULL,
    "achieved_at" TIMESTAMP(3) NOT NULL,
    "workout_set_id" UUID,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "exercise_personal_records_pkey" PRIMARY KEY ("id")
);

-- Foreign Keys
ALTER TABLE "body_weight_logs"
    ADD CONSTRAINT "body_weight_logs_user_id_fkey"
    FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "exercise_personal_records"
    ADD CONSTRAINT "exercise_personal_records_user_id_fkey"
    FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "exercise_personal_records"
    ADD CONSTRAINT "exercise_personal_records_exercise_id_fkey"
    FOREIGN KEY ("exercise_id") REFERENCES "exercises"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "exercise_personal_records"
    ADD CONSTRAINT "exercise_personal_records_workout_set_id_fkey"
    FOREIGN KEY ("workout_set_id") REFERENCES "workout_sets"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Indexes
CREATE INDEX IF NOT EXISTS "body_weight_logs_user_id_idx" ON "body_weight_logs"("user_id");
CREATE INDEX IF NOT EXISTS "body_weight_logs_user_id_logged_at_idx" ON "body_weight_logs"("user_id", "logged_at");
CREATE INDEX IF NOT EXISTS "body_weight_logs_deleted_at_idx" ON "body_weight_logs"("deleted_at");

CREATE UNIQUE INDEX IF NOT EXISTS "exercise_personal_records_user_id_exercise_id_key" ON "exercise_personal_records"("user_id", "exercise_id");
CREATE INDEX IF NOT EXISTS "exercise_personal_records_user_id_idx" ON "exercise_personal_records"("user_id");
CREATE INDEX IF NOT EXISTS "exercise_personal_records_exercise_id_idx" ON "exercise_personal_records"("exercise_id");
