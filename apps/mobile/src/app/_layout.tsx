import {
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
  Inter_700Bold,
  useFonts,
} from '@expo-google-fonts/inter';
import { tokens } from '@liftmate/shared';
import { QueryClientProvider } from '@tanstack/react-query';
import { DefaultTheme, Stack, ThemeProvider, useRouter, useSegments } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect } from 'react';

import { queryClient } from '@/lib/query-client';
import { useAuthStore } from '@/stores/auth-store';

SplashScreen.preventAutoHideAsync();

const navigationTheme = {
  ...DefaultTheme,
  colors: {
    ...DefaultTheme.colors,
    primary: tokens.colors.accent,
    background: tokens.colors.bg,
    card: tokens.colors.surface,
    text: tokens.colors.ink,
    border: tokens.colors.hairline,
    notification: tokens.colors.accent,
  },
};

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

  const [fontsLoaded, fontError] = useFonts({
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    Inter_700Bold,
  });

  useEffect(() => {
    void bootstrap();
  }, [bootstrap]);

  useEffect(() => {
    const isReady = (fontsLoaded || fontError != null) && status !== 'idle' && status !== 'loading';
    if (isReady) {
      void SplashScreen.hideAsync();
    }
  }, [fontsLoaded, fontError, status]);

  useProtectedRoute();

  if (!fontsLoaded && fontError == null) {
    return null;
  }

  return (
    <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: tokens.colors.bg } }}>
      <Stack.Screen name="(app)" />
      <Stack.Screen name="(auth)" />
      <Stack.Screen name="(onboarding)" />
      <Stack.Screen name="workout/active" options={{ presentation: 'card' }} />
      <Stack.Screen name="workout/summary" options={{ presentation: 'card', gestureEnabled: false }} />
    </Stack>
  );
}

export default function RootLayout() {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider value={navigationTheme}>
        <RootNavigator />
      </ThemeProvider>
    </QueryClientProvider>
  );
}
