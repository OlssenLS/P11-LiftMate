import { publicUserSchema, type OnboardingInput, type PublicUser } from '@liftmate/shared';
import { useMutation } from '@tanstack/react-query';
import { api } from '@/lib/api-client';
import { useAuthStore } from '@/stores/auth-store';

export function useCompleteOnboarding() {
  const setUser = useAuthStore((s) => s.setUser);

  return useMutation<PublicUser, Error, OnboardingInput>({
    mutationFn: async (input) => {
      const res = await api.post('/onboarding', input);
      return publicUserSchema.parse(res.data);
    },
    onSuccess: (user) => {
      setUser(user);
    },
  });
}
