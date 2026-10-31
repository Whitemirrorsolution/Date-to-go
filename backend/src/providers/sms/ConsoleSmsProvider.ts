import { logger } from '../../utils/logger.js';
import type { SmsProvider } from './SmsProvider.js';

/**
 * Console/mock SMS provider for development.
 * Prints OTPs to stdout — no real SMS sending.
 */
export class ConsoleSmsProvider implements SmsProvider {
  async sendOtp(phone: string, otp: string, expiresInMinutes: number): Promise<void> {
    logger.info({ expiresInMinutes }, '[DEV SMS] OTP sent to phone (redacted)');
    console.log(`\n📱  [DEV] SMS OTP for ${phone}: ${otp}  (expires in ${expiresInMinutes} min)\n`);
  }
}
