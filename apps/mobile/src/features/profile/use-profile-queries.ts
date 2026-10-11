import {
  publicUserSchema,
  userPreferencesSchema,
  type ChangePasswordInput,
  type Equipment,
  type PublicUser,
  type UpdateUserEquipmentInput,
  type UpdateUserInput,
  type UpdateUserPreferencesInput,
  type UserPreferences,
} from '@liftmate/shared';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api-client';
import { useAuthStore } from '@/stores/auth-store';

/** Fetch current user profile from server */
export function useProfile() {
  const setUser = useAuthStore((s) => s.setUser);

  return useQuery<PublicUser>({
    queryKey: ['profile'],
    queryFn: async () => {
      const res = await api.get('/users/me');
      const parsed = publicUserSchema.parse(res.data);
      setUser(parsed);
      return parsed;
    },
  });
}

/** Fetch user preferences from server */
export function useUserPreferences() {
  return useQuery<UserPreferences | null>({
    queryKey: ['preferences'],
    queryFn: async () => {
      const res = await api.get('/users/me/preferences');
      if (!res.data) return null;
      return userPreferencesSchema.parse(res.data);
    },
  });
}

/** Fetch user equipment from server */
export function useUserEquipment() {
  return useQuery<Equipment[]>({
    queryKey: ['equipment'],
    queryFn: async () => {
      const res = await api.get('/users/me/equipment');
      return (res.data?.equipment ?? []) as Equipment[];
    },
  });
}

/** Update user profile fields (demographics, units, etc.) */
export function useUpdateProfile() {
  const queryClient = useQueryClient();
  const setUser = useAuthStore((s) => s.setUser);

  return useMutation<PublicUser, Error, UpdateUserInput>({
    mutationFn: async (input) => {
      const res = await api.patch('/users/me', input);
      return publicUserSchema.parse(res.data);
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
      const res = await api.patch('/users/me/preferences', input);
      return userPreferencesSchema.parse(res.data);
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
      const res = await api.put('/users/me/equipment', input);
      return res.data;
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
      const res = await api.post('/users/me/change-password', input);
      return res.data;
    },
  });
}
