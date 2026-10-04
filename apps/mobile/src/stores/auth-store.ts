import {
  authResponseSchema,
  publicUserSchema,
  type LoginInput,
  type PublicUser,
  type RegisterInput,
} from '@liftmate/shared';
import { create } from 'zustand';
import { api, setAuthFailureHandler } from '@/lib/api-client';
import { clearTokens, getTokens, saveTokens } from '@/lib/token-store';

export type AuthStatus = 'idle' | 'loading' | 'authenticated' | 'unauthenticated';

interface AuthState {
  status: AuthStatus;
  user: PublicUser | null;
  bootstrap: () => Promise<void>;
  login: (input: LoginInput) => Promise<void>;
  register: (input: RegisterInput) => Promise<void>;
  logout: () => Promise<void>;
  setUser: (user: PublicUser) => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  status: 'idle',
  user: null,

  bootstrap: async () => {
    set({ status: 'loading' });
    const tokens = await getTokens();
    if (!tokens) {
      set({ status: 'unauthenticated', user: null });
      return;
    }
    try {
      const res = await api.get('/auth/me');
      const user = publicUserSchema.parse(res.data);
      set({ status: 'authenticated', user });
    } catch {
      await clearTokens();
      set({ status: 'unauthenticated', user: null });
    }
  },

  login: async (input) => {
    const res = await api.post('/auth/login', input);
    const { user, tokens } = authResponseSchema.parse(res.data);
    await saveTokens(tokens);
    set({ status: 'authenticated', user });
  },

  register: async (input) => {
    const res = await api.post('/auth/register', input);
    const { user, tokens } = authResponseSchema.parse(res.data);
    await saveTokens(tokens);
    set({ status: 'authenticated', user });
  },

  logout: async () => {
    const tokens = await getTokens();
    if (tokens?.refreshToken) {
      await api.post('/auth/logout', { refreshToken: tokens.refreshToken }).catch(() => undefined);
    }
    await clearTokens();
    set({ status: 'unauthenticated', user: null });
  },

  setUser: (user) => set({ user }),
}));

// Log the user out of the app if a refresh ultimately fails.
setAuthFailureHandler(() => {
  void clearTokens();
  useAuthStore.setState({ status: 'unauthenticated', user: null });
});
