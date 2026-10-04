import { z } from "zod";
import { WeightUnit } from "./enums.js";

export const emailSchema = z.string().email().max(254).toLowerCase().trim();

export const passwordSchema = z
  .string()
  .min(8)
  .max(128);

export const userSchema = z.object({
  id: z.string().uuid(),
  email: emailSchema,
  displayName: z.string().min(1).max(80),
  dateOfBirth: z.coerce.date().nullable(),
  weightUnit: WeightUnit.default("kg"),
  timezone: z.string().min(1).max(64),
  onboardedAt: z.coerce.date().nullable(),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
  deletedAt: z.coerce.date().nullable(),
});
export type User = z.infer<typeof userSchema>;

export const publicUserSchema = userSchema.omit({ deletedAt: true });
export type PublicUser = z.infer<typeof publicUserSchema>;

export const registerSchema = z.object({
  email: emailSchema,
  password: passwordSchema,
  displayName: z.string().min(1).max(80),
});
export type RegisterInput = z.infer<typeof registerSchema>;

export const loginSchema = z.object({
  email: emailSchema,
  password: passwordSchema,
});
export type LoginInput = z.infer<typeof loginSchema>;

export const updateUserSchema = z
  .object({
    displayName: z.string().min(1).max(80),
    dateOfBirth: z.coerce.date().nullable(),
    weightUnit: WeightUnit,
    timezone: z.string().min(1).max(64),
  })
  .partial();
export type UpdateUserInput = z.infer<typeof updateUserSchema>;
