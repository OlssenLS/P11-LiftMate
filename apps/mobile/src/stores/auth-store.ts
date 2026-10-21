import {
  type LoginInput,
  type PublicUser,
  type RegisterInput,
} from '@liftmate/shared';
import { create } from 'zustand';
import { setAuthFailureHandler } from '@/lib/api-client';
import {
  mapAuthUserToPublicUser,
  supabase,
} from '@/lib/supabase';
import { clearTokens, saveTokens } from '@/lib/token-store';

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

function createAuthError(message: string, status: number): Error {
  const err = new Error(message) as any;
  err.isAxiosError = true;
  err.response = { status, data: { message } };
  return err;
}

export const useAuthStore = create<AuthState>((set) => ({
  status: 'idle',
  user: null,

  bootstrap: async () => {
    set({ status: 'loading' });
    try {
      const {
        data: { session },
        error,
      } = await supabase.auth.getSession();

      if (error || !session?.user) {
        await clearTokens();
        set({ status: 'unauthenticated', user: null });
        return;
      }

      await saveTokens({
        accessToken: session.access_token,
        refreshToken: session.refresh_token,
      });

      const { data: dbUser } = await supabase
        .from('users')
        .select('*')
        .eq('id', session.user.id)
        .maybeSingle();

      const user = mapAuthUserToPublicUser(session.user, dbUser);
      set({ status: 'authenticated', user });
    } catch {
      await clearTokens();
      set({ status: 'unauthenticated', user: null });
    }
  },

  login: async (input) => {
    set({ status: 'loading' });
    const { data, error } = await supabase.auth.signInWithPassword({
      email: input.email.trim(),
      password: input.password,
    });

    if (error) {
      set({ status: 'unauthenticated', user: null });
      const status =
        error.status === 400 ||
        error.message.toLowerCase().includes('invalid login credentials')
          ? 401
          : error.status ?? 400;
      throw createAuthError(error.message, status);
    }

    if (!data.session?.user) {
      set({ status: 'unauthenticated', user: null });
      throw createAuthError('Login failed: no session returned', 401);
    }

    await saveTokens({
      accessToken: data.session.access_token,
      refreshToken: data.session.refresh_token,
    });

    const { data: dbUser } = await supabase
      .from('users')
      .select('*')
      .eq('id', data.session.user.id)
      .maybeSingle();

    const user = mapAuthUserToPublicUser(data.session.user, dbUser);
    set({ status: 'authenticated', user });
  },

  register: async (input) => {
    set({ status: 'loading' });
    const { data, error } = await supabase.auth.signUp({
      email: input.email.trim(),
      password: input.password,
      options: {
        data: {
          display_name: input.displayName.trim(),
          displayName: input.displayName.trim(),
        },
      },
    });

    if (error) {
      set({ status: 'unauthenticated', user: null });
      const status = error.message.toLowerCase().includes('already registered')
        ? 409
        : error.status ?? 400;
      throw createAuthError(error.message, status);
    }

    if (!data.user) {
      set({ status: 'unauthenticated', user: null });
      throw createAuthError('Registration failed: no user returned', 400);
    }

    if (data.session) {
      await saveTokens({
        accessToken: data.session.access_token,
        refreshToken: data.session.refresh_token,
      });

      const { data: dbUser } = await supabase
        .from('users')
        .select('*')
        .eq('id', data.user.id)
        .maybeSingle();

      const user = mapAuthUserToPublicUser(data.user, dbUser);
      set({ status: 'authenticated', user });
    } else {
      const user = mapAuthUserToPublicUser(data.user, null);
      set({ status: 'authenticated', user });
    }
  },

  logout: async () => {
    await supabase.auth.signOut().catch(() => undefined);
    await clearTokens();
    set({ status: 'unauthenticated', user: null });
  },

  setUser: (user) => set({ user }),
}));

// Sync auth state when Supabase session changes
supabase.auth.onAuthStateChange(async (event, session) => {
  if (event === 'SIGNED_OUT' || !session) {
    await clearTokens();
    useAuthStore.setState({ status: 'unauthenticated', user: null });
  } else if (session) {
    await saveTokens({
      accessToken: session.access_token,
      refreshToken: session.refresh_token,
    });
  }
});

// Log the user out of the app if a refresh ultimately fails.
setAuthFailureHandler(() => {
  void clearTokens();
  useAuthStore.setState({ status: 'unauthenticated', user: null });
});
