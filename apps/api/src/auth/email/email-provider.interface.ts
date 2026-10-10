export interface EmailProvider {
  sendPasswordResetEmail(email: string, resetLink: string, token: string): Promise<void>;
}

export const EMAIL_PROVIDER = Symbol('EMAIL_PROVIDER');
