import { z } from "zod";

export const WeightUnit = z.enum(["kg", "lb"]);
export type WeightUnit = z.infer<typeof WeightUnit>;

export const SetType = z.enum(["warmup", "working"]);
export type SetType = z.infer<typeof SetType>;

export const Equipment = z.enum([
  "barbell",
  "dumbbell",
  "machine",
  "cable",
  "kettlebell",
  "bodyweight",
  "band",
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
