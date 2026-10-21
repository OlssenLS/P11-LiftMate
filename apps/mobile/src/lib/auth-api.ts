import type { ForgotPasswordDto, ResetPasswordDto } from '@liftmate/shared';
import { supabase } from '@/lib/supabase';

export interface AuthMessageResponse {
  message: string;
}

export async function requestForgotPassword(
  data: ForgotPasswordDto,
): Promise<AuthMessageResponse> {
  const { error } = await supabase.auth.resetPasswordForEmail(data.email.trim(), {
    redirectTo: 'liftmate://reset-password',
  });
  if (error) {
    throw error;
  }
  return { message: 'Password reset link sent to your email.' };
}

export async function submitResetPassword(
  data: ResetPasswordDto,
): Promise<AuthMessageResponse> {
  if (data.token) {
    await supabase.auth
      .verifyOtp({
        token_hash: data.token,
        type: 'recovery',
      })
      .catch(() => undefined);
  }

  const { error } = await supabase.auth.updateUser({
    password: data.newPassword,
  });

  if (error) {
    throw error;
  }
  return { message: 'Password updated successfully.' };
}
