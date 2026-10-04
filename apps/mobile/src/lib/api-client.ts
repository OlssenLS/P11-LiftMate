import { authTokensSchema, type AuthTokens } from '@liftmate/shared';
import axios, { AxiosError, type AxiosRequestConfig, type InternalAxiosRequestConfig } from 'axios';
import { API_URL } from '@/config/env';
import { clearTokens, getTokens, saveTokens } from '@/lib/token-store';

type RetriableConfig = InternalAxiosRequestConfig & { _retry?: boolean };

/** Called when refresh fails and the session can no longer be recovered. */
let onAuthFailure: (() => void) | null = null;

export function setAuthFailureHandler(handler: (() => void) | null): void {
  onAuthFailure = handler;
}

export const api = axios.create({ baseURL: API_URL, timeout: 15000 });

api.interceptors.request.use(async (config) => {
  const tokens = await getTokens();
  if (tokens?.accessToken) {
    config.headers.set('Authorization', `Bearer ${tokens.accessToken}`);
  }
  return config;
});

// Single-flight refresh so concurrent 401s share one refresh call.
let refreshing: Promise<AuthTokens | null> | null = null;

async function refreshTokens(): Promise<AuthTokens | null> {
  const current = await getTokens();
  if (!current?.refreshToken) {
    return null;
  }
  try {
    const res = await axios.post(
      `${API_URL}/auth/refresh`,
      { refreshToken: current.refreshToken },
      { headers: { 'Content-Type': 'application/json' }, timeout: 15000 },
    );
    const tokens = authTokensSchema.parse(res.data);
    await saveTokens(tokens);
    return tokens;
  } catch {
    await clearTokens();
    return null;
  }
}

api.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const original = error.config as RetriableConfig | undefined;
    const isAuthRoute = original?.url?.includes('/auth/');
    if (error.response?.status !== 401 || !original || original._retry || isAuthRoute) {
      return Promise.reject(error);
    }
    original._retry = true;
    refreshing ??= refreshTokens().finally(() => {
      refreshing = null;
    });
    const tokens = await refreshing;
    if (!tokens) {
      onAuthFailure?.();
      return Promise.reject(error);
    }
    original.headers.set('Authorization', `Bearer ${tokens.accessToken}`);
    return api.request(original as AxiosRequestConfig);
  },
);
