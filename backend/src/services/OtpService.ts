import crypto from 'crypto';
import { env } from '../config/env.js';

/**
 * OtpService handles secure generation and validation of the Booking Completion OTP.
 * It uses CSPRNG for generation, HMAC-SHA256 for storage, and constant-time comparison.
 * The raw OTP is NEVER logged or saved to the database.
 */
export class OtpService {
  /**
   * Generates a secure 4-digit OTP and its HMAC hash.
   * @param bookingId The ID of the booking to bind the OTP to
   * @returns { rawOtp, hash }
   */
  generateBookingOtp(bookingId: string): { rawOtp: string; hash: string } {
    // Generate a secure 4-digit OTP (1000 - 9999)
    const min = 1000;
    const max = 9999;
    const range = max - min + 1;
    const bytes = crypto.randomBytes(4);
    const randomNumber = bytes.readUInt32BE(0);
    const otpNumber = min + (randomNumber % range);
    const rawOtp = otpNumber.toString();

    // Create HMAC using SERVER_PEPPER and bookingId as part of the key
    const hash = this.hashOtp(rawOtp, bookingId);

    return { rawOtp, hash };
  }

  /**
   * Verifies if a provided raw OTP matches the stored hash in constant time.
   */
  verifyOtp(rawOtp: string, bookingId: string, storedHash: string): boolean {
    if (!/^\d{4}$/.test(rawOtp) || !/^[a-f\d]{64}$/i.test(storedHash)) return false;
    const computedHash = this.hashOtp(rawOtp, bookingId);

    // Constant-time string comparison to prevent timing attacks
    return crypto.timingSafeEqual(
      Buffer.from(computedHash, 'utf8'),
      Buffer.from(storedHash, 'utf8')
    );
  }

  /**
   * Private helper to compute HMAC-SHA256
   */
  private hashOtp(otp: string, bookingId: string): string {
    const pepper = env.SESSION_SECRET || env.JWT_ACCESS_SECRET;
    const key = `${pepper}:${bookingId}`;
    return crypto.createHmac('sha256', key).update(otp).digest('hex');
  }
}

export const otpService = new OtpService();
