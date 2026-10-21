import {
  type ChangePasswordInput,
  type Equipment,
  type PublicUser,
  type UpdateUserEquipmentInput,
  type UpdateUserInput,
  type UpdateUserPreferencesInput,
  type UserPreferences,
} from '@liftmate/shared';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  mapDbPreferencesToUserPreferences,
  mapDbUserToPublicUser,
  mapUpdateUserToDb,
  mapUserPreferencesToDb,
  supabase,
} from '@/lib/supabase';
import { useAuthStore } from '@/stores/auth-store';

/** Fetch current user profile from Supabase */
export function useProfile() {
  const setUser = useAuthStore((s) => s.setUser);

  return useQuery<PublicUser>({
    queryKey: ['profile'],
    queryFn: async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error('Unauthenticated');

      const { data: dbUser, error } = await supabase
        .from('users')
        .select('*')
        .eq('id', user.id)
        .single();

      if (error) throw error;
      const parsed = mapDbUserToPublicUser(dbUser);
      setUser(parsed);
      return parsed;
    },
  });
}

/** Fetch user preferences from Supabase */
export function useUserPreferences() {
  return useQuery<UserPreferences | null>({
    queryKey: ['preferences'],
    queryFn: async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return null;

      const { data, error } = await supabase
        .from('user_preferences')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();

      if (error || !data) return null;
      return mapDbPreferencesToUserPreferences(data);
    },
  });
}

/** Fetch user equipment from Supabase */
export function useUserEquipment() {
  return useQuery<Equipment[]>({
    queryKey: ['equipment'],
    queryFn: async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return [];

      const { data, error } = await supabase
        .from('user_equipment')
        .select('equipment')
        .eq('user_id', user.id)
        .is('deleted_at', null);

      if (error || !data) return [];
      return data.map((d: any) => d.equipment as Equipment);
    },
  });
}

/** Update user profile fields (demographics, units, etc.) */
export function useUpdateProfile() {
  const queryClient = useQueryClient();
  const setUser = useAuthStore((s) => s.setUser);

  return useMutation<PublicUser, Error, UpdateUserInput>({
    mutationFn: async (input) => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error('Unauthenticated');

      const patch = mapUpdateUserToDb(input);
      const { data, error } = await supabase
        .from('users')
        .update(patch)
        .eq('id', user.id)
        .select('*')
        .single();

      if (error) throw error;
      return mapDbUserToPublicUser(data);
    },
    onSuccess: (updated) => {
      setUser(updated);
      void queryClient.invalidateQueries({ queryKey: ['profile'] });
    },
  });
}

/** Update user preferences (goals, macros, notifications, preferences arrays) */
export function useUpdatePreferences() {
  const queryClient = useQueryClient();

  return useMutation<UserPreferences, Error, UpdateUserPreferencesInput>({
    mutationFn: async (input) => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error('Unauthenticated');

      const patch = mapUserPreferencesToDb(input);
      const { data, error } = await supabase
        .from('user_preferences')
        .upsert(
          {
            user_id: user.id,
            ...patch,
          },
          { onConflict: 'user_id' },
        )
        .select('*')
        .single();

      if (error) throw error;
      return mapDbPreferencesToUserPreferences(data);
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['preferences'] });
    },
  });
}

/** Replace user equipment */
export function useUpdateEquipment() {
  const queryClient = useQueryClient();

  return useMutation<{ equipment: Equipment[] }, Error, UpdateUserEquipmentInput>({
    mutationFn: async (input) => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error('Unauthenticated');

      // Delete existing equipment
      const { error: delError } = await supabase
        .from('user_equipment')
        .delete()
        .eq('user_id', user.id);
      if (delError) throw delError;

      // Insert new equipment
      if (input.equipment.length > 0) {
        const rows = input.equipment.map((item) => ({
          user_id: user.id,
          equipment: item,
        }));
        const { error: insError } = await supabase.from('user_equipment').insert(rows);
        if (insError) throw insError;
      }

      return { equipment: input.equipment };
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['equipment'] });
    },
  });
}

/** Change account password */
export function useChangePassword() {
  return useMutation<{ success: boolean }, Error, ChangePasswordInput>({
    mutationFn: async (input) => {
      const { error } = await supabase.auth.updateUser({
        password: input.newPassword,
      });
      if (error) throw error;
      return { success: true };
    },
  });
}
