import { logger } from '../../utils/logger.js';
import type { EmailProvider } from './EmailProvider.js';

/**
 * Console/mock email provider for development.
 * Prints emails to stdout — no real sending.
 */
export class ConsoleEmailProvider implements EmailProvider {
  async sendOtp(to: string, otp: string, expiresInMinutes: number): Promise<void> {
    logger.info(
      { target: '[REDACTED]', expiresInMinutes },
      `[DEV EMAIL] Email OTP: ${otp} → ${to} (expires in ${expiresInMinutes} min)`,
    );
    console.log(`\n📧  [DEV] Email OTP for ${to}: ${otp}  (expires in ${expiresInMinutes} min)\n`);
  }

  async sendPasswordReset(to: string, otp: string, expiresInMinutes: number): Promise<void> {
    logger.info({ expiresInMinutes }, '[DEV EMAIL] Password reset OTP sent');
    console.log(
      `\n🔑  [DEV] Password reset OTP for ${to}: ${otp}  (expires in ${expiresInMinutes} min)\n`,
    );
  }

  async sendWelcome(to: string, name: string): Promise<void> {
    logger.info({}, `[DEV EMAIL] Welcome email → ${name} <${to}>`);
    console.log(`\n🎉  [DEV] Welcome email to ${to} — Hello ${name}!\n`);
  }
}
