import { env } from '../../config/env.js';
import { logger } from '../../utils/logger.js';
import type { SmsProvider } from './SmsProvider.js';

/**
 * MSG91 SMS OTP provider stub.
 * Fill in the HTTP calls to the MSG91 Send OTP API when ready.
 *
 * Docs: https://docs.msg91.com/otp
 */
export class MSG91SmsProvider implements SmsProvider {
  private readonly authKey: string;
  private readonly senderId: string;

  constructor() {
    if (!env.MSG91_AUTH_KEY) {
      throw new Error('MSG91_AUTH_KEY is not configured');
    }
    this.authKey = env.MSG91_AUTH_KEY;
    this.senderId = env.MSG91_SENDER_ID;
    void this.authKey;
    logger.info({ senderId: this.senderId }, 'MSG91SmsProvider initialised');
  }

  async sendOtp(phone: string, otp: string, expiresInMinutes: number): Promise<void> {
    // TODO: implement MSG91 OTP send
    // const res = await fetch('https://api.msg91.com/api/v5/otp', {
    //   method: 'POST',
    //   headers: { 'Content-Type': 'application/json', authkey: this.authKey },
    //   body: JSON.stringify({
    //     template_id: 'CHANGE_ME',
    //     mobile: phone,
    //     otp,
    //     sender: this.senderId,
    //     otp_expiry: expiresInMinutes,
    //   }),
    // });
    // if (!res.ok) throw new Error(`MSG91 send failed: ${await res.text()}`);
    logger.warn({ expiresInMinutes }, '[STUB] MSG91SmsProvider.sendOtp not implemented');
    void phone; void otp;
    throw new Error('MSG91SmsProvider is a stub — implement before going to production');
  }
}
