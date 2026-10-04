import Constants from 'expo-constants';

/**
 * API base URL.
 *
 * Resolution order:
 * 1. `EXPO_PUBLIC_API_URL` env var (set per environment).
 * 2. The Metro host IP (so a physical device hits the dev machine, not localhost).
 * 3. `http://localhost:3000` fallback.
 */
function resolveApiUrl(): string {
  const fromEnv = process.env.EXPO_PUBLIC_API_URL;
  if (fromEnv) {
    return fromEnv;
  }
  const hostUri = Constants.expoConfig?.hostUri;
  if (hostUri) {
    const host = hostUri.split(':')[0];
    return `http://${host}:3000`;
  }
  return 'http://localhost:3000';
}

export const API_URL = resolveApiUrl();
