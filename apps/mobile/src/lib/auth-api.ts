import type { ForgotPasswordDto, ResetPasswordDto } from '@liftmate/shared';
import { api } from '@/lib/api-client';

export interface AuthMessageResponse {
  message: string;
}

export async function requestForgotPassword(
  data: ForgotPasswordDto,
): Promise<AuthMessageResponse> {
  const res = await api.post<AuthMessageResponse>('/auth/forgot-password', data);
  return res.data;
}

export async function submitResetPassword(
  data: ResetPasswordDto,
): Promise<AuthMessageResponse> {
  const res = await api.post<AuthMessageResponse>('/auth/reset-password', data);
  return res.data;
}
