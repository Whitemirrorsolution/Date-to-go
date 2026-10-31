/**
 * EmailProvider interface.
 * Implement this to swap between console (dev), Resend, SES, etc.
 */
export interface EmailProvider {
  sendOtp(to: string, otp: string, expiresInMinutes: number): Promise<void>;
  sendPasswordReset(to: string, otp: string, expiresInMinutes: number): Promise<void>;
  sendWelcome(to: string, name: string): Promise<void>;
}
