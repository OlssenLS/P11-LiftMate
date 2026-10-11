import { z } from "zod";

export const WeightUnit = z.enum(["kg", "lb"]);
export type WeightUnit = z.infer<typeof WeightUnit>;

export const SetType = z.enum(["warmup", "working"]);
export type SetType = z.infer<typeof SetType>;

export const Gender = z.enum(["male", "female", "other", "prefer_not_to_say"]);
export type Gender = z.infer<typeof Gender>;

export const WorkoutDuration = z.enum([
  "lt30",
  "30_45",
  "45_60",
  "60_90",
  "gt90",
]);
export type WorkoutDuration = z.infer<typeof WorkoutDuration>;

export const TrainingLocation = z.enum([
  "commercial_gym",
  "home_gym",
  "home",
  "outdoor",
]);
export type TrainingLocation = z.infer<typeof TrainingLocation>;

export const Equipment = z.enum([
  "barbell",
  "dumbbell",
  "cable_machine",
  "smith_machine",
  "leg_press",
  "hack_squat",
  "pulldown_machine",
  "chest_press",
  "machines",
  "pull_up_bar",
  "resistance_bands",
  "bodyweight",
  "kettlebell",
  "other",
]);
export type Equipment = z.infer<typeof Equipment>;

export const MuscleGroup = z.enum([
  "chest",
  "back",
  "shoulders",
  "biceps",
  "triceps",
  "forearms",
  "quads",
  "hamstrings",
  "glutes",
  "calves",
  "abs",
  "traps",
  "lats",
  "full_body",
]);
export type MuscleGroup = z.infer<typeof MuscleGroup>;

export const MovementPattern = z.enum([
  "push",
  "pull",
  "squat",
  "hinge",
  "lunge",
  "carry",
  "rotation",
  "isolation",
]);
export type MovementPattern = z.infer<typeof MovementPattern>;

export const Difficulty = z.enum(["beginner", "intermediate", "advanced"]);
export type Difficulty = z.infer<typeof Difficulty>;

export const FitnessGoal = z.enum([
  "lose_fat",
  "build_muscle",
  "gain_strength",
  "general_fitness",
  "body_recomposition",
]);
export type FitnessGoal = z.infer<typeof FitnessGoal>;

export const WorkoutStatus = z.enum([
  "in_progress",
  "completed",
  "cancelled",
]);
export type WorkoutStatus = z.infer<typeof WorkoutStatus>;

export const ProgramStatus = z.enum([
  "active",
  "completed",
  "archived",
]);
export type ProgramStatus = z.infer<typeof ProgramStatus>;

