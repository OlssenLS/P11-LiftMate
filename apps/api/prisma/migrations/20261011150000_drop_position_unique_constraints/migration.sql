-- Drop the unconditional unique constraints on (parent_id, position)
-- which conflict with soft-deleted rows and renumbered set positions during sync.
DROP INDEX IF EXISTS "workout_sets_workout_exercise_id_position_key";
DROP INDEX IF EXISTS "workout_exercises_workout_id_position_key";

-- Create non-unique indices for ordering performance
CREATE INDEX IF NOT EXISTS "workout_sets_workout_exercise_id_position_idx" ON "workout_sets"("workout_exercise_id", "position");
CREATE INDEX IF NOT EXISTS "workout_exercises_workout_id_position_idx" ON "workout_exercises"("workout_id", "position");
