import { env } from '../../config/env.js';
import { logger } from '../../utils/logger.js';
import type { EmailProvider } from './EmailProvider.js';

/**
 * Resend email provider stub.
 * Install `resend` package and fill in implementation when ready for production.
 *
 * npm install resend
 */
export class ResendEmailProvider implements EmailProvider {
  private readonly from: string;

  constructor() {
    if (!env.RESEND_API_KEY) {
      throw new Error('RESEND_API_KEY is not configured');
    }
    this.from = env.EMAIL_FROM;
    logger.info({ from: this.from }, 'ResendEmailProvider initialised');
  }

  async sendOtp(to: string, otp: string, expiresInMinutes: number): Promise<void> {
    void otp;
    logger.warn({ to, expiresInMinutes }, '[STUB] ResendEmailProvider.sendOtp not implemented');
    throw new Error('ResendEmailProvider is a stub — implement before going to production');
  }

  async sendPasswordReset(to: string, otp: string, expiresInMinutes: number): Promise<void> {
    logger.warn({ to, expiresInMinutes }, '[STUB] ResendEmailProvider.sendPasswordReset not implemented');
    void otp;
    throw new Error('ResendEmailProvider is a stub — implement before going to production');
  }

  async sendWelcome(to: string, name: string): Promise<void> {
    logger.warn({ to, name }, '[STUB] ResendEmailProvider.sendWelcome not implemented');
    throw new Error('ResendEmailProvider is a stub — implement before going to production');
  }
}
