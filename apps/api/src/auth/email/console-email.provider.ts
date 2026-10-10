import { Injectable, Logger } from '@nestjs/common';
import type { EmailProvider } from './email-provider.interface.js';

@Injectable()
export class ConsoleEmailProvider implements EmailProvider {
  private readonly logger = new Logger(ConsoleEmailProvider.name);

  async sendPasswordResetEmail(email: string, resetLink: string, token: string): Promise<void> {
    this.logger.log(
      `[DEV EMAIL] Password reset requested for: ${email}\n  Reset Link: ${resetLink}\n  Token Code: ${token}`,
    );
  }
}
