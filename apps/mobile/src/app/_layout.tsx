import { QueryClientProvider } from '@tanstack/react-query';
import { DefaultTheme, ThemeProvider, Stack, useRouter, useSegments } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect } from 'react';

import { queryClient } from '@/lib/query-client';
import { useAuthStore } from '@/stores/auth-store';

SplashScreen.preventAutoHideAsync();

function useProtectedRoute() {
  const status = useAuthStore((s) => s.status);
  const user = useAuthStore((s) => s.user);
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    if (status === 'idle' || status === 'loading') {
      return;
    }
    const group = segments[0];
    const inAuth = group === '(auth)';
    const inOnboarding = group === '(onboarding)';

    if (status === 'unauthenticated') {
      if (!inAuth) {
        router.replace('/(auth)/login');
      }
      return;
    }

    // Authenticated.
    const needsOnboarding = user != null && user.onboardedAt == null;
    if (needsOnboarding && !inOnboarding) {
      router.replace('/(onboarding)');
    } else if (!needsOnboarding && (inAuth || inOnboarding)) {
      router.replace('/(app)');
    }
  }, [status, user, segments, router]);
}

function RootNavigator() {
  const status = useAuthStore((s) => s.status);
  const bootstrap = useAuthStore((s) => s.bootstrap);

  useEffect(() => {
    void bootstrap();
  }, [bootstrap]);

  useEffect(() => {
    if (status !== 'idle' && status !== 'loading') {
      void SplashScreen.hideAsync();
    }
  }, [status]);

  useProtectedRoute();

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="(app)" />
      <Stack.Screen name="(auth)" />
      <Stack.Screen name="(onboarding)" />
    </Stack>
  );
}

export default function RootLayout() {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider value={DefaultTheme}>
        <RootNavigator />
      </ThemeProvider>
    </QueryClientProvider>
  );
}
