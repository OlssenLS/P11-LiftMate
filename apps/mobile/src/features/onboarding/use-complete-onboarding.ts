import { type OnboardingInput, type PublicUser } from '@liftmate/shared';
import { useMutation } from '@tanstack/react-query';
import { mapDbUserToPublicUser, supabase } from '@/lib/supabase';
import { useAuthStore } from '@/stores/auth-store';

export function useCompleteOnboarding() {
  const setUser = useAuthStore((s) => s.setUser);

  return useMutation<PublicUser, Error, OnboardingInput>({
    mutationFn: async (input) => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error('Unauthenticated');

      // 1. Update user profile
      const { data: updatedUser, error: userError } = await supabase
        .from('users')
        .update({
          display_name: input.displayName.trim(),
          date_of_birth: input.dateOfBirth,
          gender: input.gender,
          height_cm: input.heightCm,
          weight_kg: input.weightKg,
          body_fat_pct: input.bodyFatPct ?? null,
          target_weight_kg: input.targetWeightKg ?? null,
          workout_duration: input.workoutDuration,
          training_location: input.trainingLocation,
          weight_unit: input.weightUnit,
          timezone: input.timezone,
          onboarded_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq('id', user.id)
        .select('*')
        .single();

      if (userError) throw userError;

      // 2. Upsert user preferences
      const { error: prefError } = await supabase
        .from('user_preferences')
        .upsert(
          {
            user_id: user.id,
            primary_goal: input.primaryGoal,
            secondary_goal: input.secondaryGoal ?? null,
            experience_level: input.experienceLevel,
            weekly_frequency: input.weeklyFrequency,
            preferred_equipment: input.preferredEquipment ?? [],
            preferred_exercises: input.preferredExercises ?? [],
            avoid_exercises: input.avoidExercises ?? [],
            dietary_preferences: input.dietaryPreferences ?? [],
            target_calories: input.targetCalories,
            target_protein: input.targetProtein,
            target_carbs: input.targetCarbs,
            target_fat: input.targetFat,
            updated_at: new Date().toISOString(),
          },
          { onConflict: 'user_id' },
        );

      if (prefError) throw prefError;

      // 3. Replace equipment
      await supabase.from('user_equipment').delete().eq('user_id', user.id);
      if (input.equipment && input.equipment.length > 0) {
        const rows = input.equipment.map((equipment) => ({
          user_id: user.id,
          equipment,
        }));
        const { error: eqError } = await supabase.from('user_equipment').insert(rows);
        if (eqError) throw eqError;
      }

      return mapDbUserToPublicUser(updatedUser);
    },
    onSuccess: (user) => {
      setUser(user);
    },
  });
}
