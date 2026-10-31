import { describe, it, expect, vi, beforeEach } from 'vitest';
import { bookingLifecycleService } from '../src/services/BookingLifecycleService.js';
import { Booking } from '../src/models/Booking.js';
import { walletService } from '../src/services/WalletService.js';
import { otpService } from '../src/services/OtpService.js';

vi.mock('../src/models/Booking.js');
vi.mock('../src/models/BookingEvent.js');
vi.mock('../src/services/WalletService.js');
vi.mock('mongoose', async (importOriginal) => {
  const actual = await importOriginal() as any;
  return {
    default: {
      ...actual.default,
      startSession: vi.fn().mockResolvedValue({
        withTransaction: async (cb: any) => await cb(),
        endSession: vi.fn()
      })
    },
    ...actual
  };
});

import mongoose from 'mongoose';

describe('BookingLifecycleService', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    vi.spyOn(mongoose, 'startSession').mockResolvedValue({
      withTransaction: async (cb: any) => await cb(),
      endSession: vi.fn(),
    } as any);
  });

  describe('Transitions', () => {
    it('allows valid transitions', async () => {
      const mockBooking = { _id: 'b1', stage: 'REQUESTED', save: vi.fn(), clientId: 'u1', partnerId: 'p1' };
      (Booking.findById as any).mockReturnValue({ session: vi.fn().mockResolvedValue(mockBooking) });

      await bookingLifecycleService.transitionStatus('b1', 'ACCEPTED', 'p1', 'User', {} as any);
      expect(mockBooking.stage).toBe('ACCEPTED');
    });

    it('forbids invalid transitions', async () => {
      const mockBooking = { _id: 'b1', stage: 'REQUESTED', save: vi.fn(), clientId: 'u1', partnerId: 'p1' };
      (Booking.findById as any).mockReturnValue({ session: vi.fn().mockResolvedValue(mockBooking) });

      await expect(
        bookingLifecycleService.transitionStatus('b1', 'COMPLETED', 'p1', 'User', {} as any)
      ).rejects.toThrow(/Cannot transition from REQUESTED to COMPLETED/);
    });
  });

  describe('Check-In Brute-Force Protection', () => {
    it('locks out after 5 failed attempts', async () => {
      const otp = otpService.generateBookingOtp('b1');
      const mockBooking = {
        _id: 'b1', stage: 'AWAITING_OTP', otpHash: otp.hash, otpExpiresAt: new Date(Date.now() + 60000),
        otpAttempts: 4, save: vi.fn(),
        partnerId: 'p1', partnerNetPaise: 8000,
      };
      (Booking.findOne as any).mockReturnValue({ session: vi.fn().mockResolvedValue(mockBooking) });
      (Booking.findById as any).mockReturnValue({ session: vi.fn().mockResolvedValue(mockBooking) });

      // 5th failed attempt
      try {
        await bookingLifecycleService.checkIn('b1', 'p1', '0000');
      } catch (err: any) {
        expect(err.message).toBe('Invalid check-in code');
      }
      expect(mockBooking.otpLockoutUntil).toBeDefined();

      // Subsequent attempt fails even with correct code
      mockBooking.otpLockoutUntil = new Date(Date.now() + 10000) as any;

      try {
        await bookingLifecycleService.checkIn('b1', 'p1', otp.rawOtp);
      } catch (err: any) {
        expect(err.message).toMatch(/Check-in locked/);
      }
    });
  });

  describe('Refund Calculations', () => {
    it('calculates 50% refund for client cancellation within 48h', async () => {
      const startAt = new Date(Date.now() + 30 * 60 * 60 * 1000); // 30 hours from now
      const mockBooking = {
        _id: 'b1', stage: 'PAID', totalPaise: 10000, startAt,
        clientId: { toString: () => 'u1' }, save: vi.fn()
      };

      (Booking.findById as any).mockReturnValue({ session: vi.fn().mockResolvedValue(mockBooking) });

      await bookingLifecycleService.cancelBooking('b1', 'u1', 'User', 'Cancel');

      expect(walletService.processTransaction).toHaveBeenCalledWith(
        expect.objectContaining({ toString: expect.any(Function) }), 'REFUND', 5000,
        expect.any(String), 'BOOKING', 'b1'
      );
    });
  });
});
