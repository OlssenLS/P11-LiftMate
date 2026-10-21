import Constants from 'expo-constants';

/**
 * API base URL.
 *
 * Resolution order:
 * 1. `EXPO_PUBLIC_API_URL` env var (set per environment, e.g. .env, EAS build profile).
 *    Always prioritized in both development and production standalone builds.
 * 2. In development (`__DEV__`), the Metro host IP so a physical device running Expo Go
 *    hits the dev machine on the LAN instead of the device's loopback interface.
 * 3. Fallback: `http://localhost:3000` (for web / iOS simulator / local test runners).
 */
function resolveApiUrl(): string {
  const fromEnv = process.env.EXPO_PUBLIC_API_URL?.trim();
  if (fromEnv) {
    // Strip trailing slash so endpoint paths concatenate cleanly
    return fromEnv.replace(/\/+$/, '');
  }

  if (typeof __DEV__ !== 'undefined' && __DEV__) {
    const hostUri = Constants.expoConfig?.hostUri;
    if (hostUri) {
      const host = hostUri.split(':')[0];
      return `http://${host}:3000`;
    }
    return 'http://localhost:3000';
  }

  // Standalone release build without EXPO_PUBLIC_API_URL
  console.warn(
    '[LiftMate Config] EXPO_PUBLIC_API_URL is not set for production build! Standalone devices cannot resolve localhost. Set EXPO_PUBLIC_API_URL to your deployed HTTPS API server.',
  );
  return 'http://localhost:3000';
}

export const API_URL = resolveApiUrl();

export const SUPABASE_URL =
  process.env.EXPO_PUBLIC_SUPABASE_URL?.trim() ||
  'https://gwyzdbqswdkmnpykxuov.supabase.co';

export const SUPABASE_ANON_KEY =
  process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY?.trim() ||
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imd3eXpkYnFzd2RrbW5weWt4dW92Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTI0MDg0NzEsImV4cCI6MjEwNzk4NDQ3MX0.ZkeLjZoFvPdQXxCCYDTVkYW8WnoTUG07UoHZfHh9ZLQ';

/**
 * Fixture flag (LIFTMATE_AGENT_BRIEF.md §4 constraint 2).
 * Defaults to false so production screens never ship fake data.
 */
export const USE_FIXTURES = process.env.EXPO_PUBLIC_USE_FIXTURES === 'true';

export const IS_PRODUCTION = typeof __DEV__ !== 'undefined' ? !__DEV__ : false;
