/**
 * SmsProvider interface.
 * Implement this to swap between console (dev), MSG91, Twilio, etc.
 */
export interface SmsProvider {
  sendOtp(phone: string, otp: string, expiresInMinutes: number): Promise<void>;
}
