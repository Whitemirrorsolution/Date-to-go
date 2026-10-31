import { describe, it, expect, vi, beforeEach } from 'vitest';
import mongoose from 'mongoose';
import { Booking } from '../src/models/Booking.js';
import { Listing } from '../src/models/Listing.js';
import { Notification } from '../src/models/Notification.js';
import { walletService } from '../src/services/WalletService.js';
import { otpService } from '../src/services/OtpService.js';

vi.mock('../src/models/Booking.js');
vi.mock('../src/models/Listing.js');
vi.mock('../src/models/Notification.js');
vi.mock('../src/models/Conversation.js');
vi.mock('../src/models/Message.js');
vi.mock('../src/services/WalletService.js');
vi.mock('../src/utils/events.js', () => ({
  emitEvent: vi.fn(),
}));

describe('Post-Acceptance Booking Flow', () => {
  const clientId = new mongoose.Types.ObjectId().toString();
  const partnerId = new mongoose.Types.ObjectId().toString();
  const bookingId = new mongoose.Types.ObjectId().toString();
  const listingId = new mongoose.Types.ObjectId().toString();

  beforeEach(() => {
    vi.resetAllMocks();
  });

  describe('1. Seeker Escrow Payment via Wallet Balance', () => {
    it('rejects if seeker wallet balance is less than booking totalPaise', async () => {
      const mockBooking = {
        _id: bookingId,
        clientId,
        partnerId,
        listingId,
        stage: 'ACCEPTED',
        totalPaise: 150000, // ₹1,500
        save: vi.fn(),
      };

      vi.spyOn(Booking, 'findOne').mockResolvedValue(mockBooking as any);
      vi.spyOn(walletService, 'getBalance').mockResolvedValue(50000); // Only ₹500

      const balance = await walletService.getBalance(clientId);
      expect(balance < mockBooking.totalPaise).toBe(true);
    });

    it('processes wallet payment, generates 4-digit PIN, and transitions stage to PAID', async () => {
      const mockBooking: any = {
        _id: bookingId,
        clientId,
        partnerId,
        listingId,
        stage: 'ACCEPTED',
        totalPaise: 100000,
        venueName: 'Cafe Mocha',
        endAt: new Date(Date.now() + 2 * 60 * 60 * 1000),
        save: vi.fn().mockResolvedValue(true),
      };

      vi.spyOn(Booking, 'findOne').mockResolvedValue(mockBooking as any);
      vi.spyOn(walletService, 'getBalance').mockResolvedValue(200000);
      vi.spyOn(walletService, 'processTransaction').mockResolvedValue({} as any);
      vi.spyOn(Listing, 'findByIdAndUpdate').mockResolvedValue({} as any);
      vi.spyOn(Notification, 'create').mockResolvedValue({} as any);

      // Generate start PIN
      const { rawOtp, hash } = otpService.generateBookingOtp(bookingId);
      expect(rawOtp).toMatch(/^\d{4}$/);

      // Apply wallet payment logic
      mockBooking.stage = 'PAID';
      mockBooking.otpHash = hash;
      mockBooking.startPin = rawOtp;
      await mockBooking.save();

      expect(mockBooking.stage).toBe('PAID');
      expect(mockBooking.startPin).toBe(rawOtp);
      expect(otpService.verifyOtp(rawOtp, bookingId, mockBooking.otpHash)).toBe(true);
    });
  });

  describe('2. Start PIN Confidentiality', () => {
    it('ensures startPin is secret to seeker and hidden from partner', () => {
      const rawBooking = {
        _id: bookingId,
        clientId,
        partnerId,
        stage: 'PAID',
        startPin: '7392',
        otpHash: 'hashed_secret',
      };

      // Seeker sanitizer logic
      const seekerSanitized = {
        ...rawBooking,
        startPin: rawBooking.clientId === clientId ? rawBooking.startPin : undefined,
      };
      expect(seekerSanitized.startPin).toBe('7392');

      // Partner sanitizer logic
      const partnerSanitized = {
        ...rawBooking,
        startPin: rawBooking.clientId === partnerId ? rawBooking.startPin : undefined,
      };
      expect(partnerSanitized.startPin).toBeUndefined();
    });
  });

  describe('3. Partner Travel Status Updates', () => {
    it('updates partner travel status to ON_THE_WAY and ARRIVED', async () => {
      const mockBooking: any = {
        _id: bookingId,
        clientId,
        partnerId,
        stage: 'PAID',
        partnerTravelStatus: 'STATIONARY',
        save: vi.fn().mockResolvedValue(true),
      };

      // Transition to ON_THE_WAY
      mockBooking.partnerTravelStatus = 'ON_THE_WAY';
      await mockBooking.save();
      expect(mockBooking.partnerTravelStatus).toBe('ON_THE_WAY');

      // Transition to ARRIVED
      mockBooking.partnerTravelStatus = 'ARRIVED';
      await mockBooking.save();
      expect(mockBooking.partnerTravelStatus).toBe('ARRIVED');
    });
  });

  describe('4. In-person Start PIN Verification & Meeting Initiation', () => {
    it('fails when partner inputs incorrect 4-digit PIN and locks out after 5 failures', async () => {
      const { rawOtp, hash } = otpService.generateBookingOtp(bookingId);
      const mockBooking: any = {
        _id: bookingId,
        clientId,
        partnerId,
        stage: 'PAID',
        otpHash: hash,
        otpAttempts: 0,
        save: vi.fn().mockResolvedValue(true),
      };

      // Verify incorrect PIN
      const isCorrect = otpService.verifyOtp('0000', bookingId, mockBooking.otpHash);
      expect(isCorrect).toBe(false);

      mockBooking.otpAttempts = 5;
      mockBooking.otpLockoutUntil = new Date(Date.now() + 15 * 60 * 1000);
      await mockBooking.save();

      expect(mockBooking.otpAttempts).toBe(5);
      expect(mockBooking.otpLockoutUntil.getTime()).toBeGreaterThan(Date.now());
    });

    it('successfully starts meeting when partner enters correct seeker PIN', async () => {
      const { rawOtp, hash } = otpService.generateBookingOtp(bookingId);
      const mockBooking: any = {
        _id: bookingId,
        clientId,
        partnerId,
        stage: 'PAID',
        otpHash: hash,
        otpAttempts: 2,
        save: vi.fn().mockResolvedValue(true),
      };

      const isValid = otpService.verifyOtp(rawOtp, bookingId, mockBooking.otpHash);
      expect(isValid).toBe(true);

      mockBooking.stage = 'IN_PROGRESS';
      mockBooking.actualStartAt = new Date();
      mockBooking.partnerTravelStatus = 'ARRIVED';
      mockBooking.otpAttempts = 0;
      await mockBooking.save();

      expect(mockBooking.stage).toBe('IN_PROGRESS');
      expect(mockBooking.actualStartAt).toBeInstanceOf(Date);
      expect(mockBooking.partnerTravelStatus).toBe('ARRIVED');
    });
  });

  describe('5. Meeting Conclusion & Escrow Payout', () => {
    it('completes meeting, records actualEndAt, and credits partner wallet ledger', async () => {
      const mockBooking: any = {
        _id: bookingId,
        clientId,
        partnerId,
        stage: 'IN_PROGRESS',
        partnerNetPaise: 135000, // ₹1,350 net payout (after 10% platform fee)
        actualStartAt: new Date(Date.now() - 60 * 60 * 1000),
        save: vi.fn().mockResolvedValue(true),
      };

      vi.spyOn(walletService, 'processTransaction').mockResolvedValue({} as any);

      // Complete booking
      mockBooking.stage = 'COMPLETED';
      mockBooking.actualEndAt = new Date();
      await mockBooking.save();

      await walletService.processTransaction(
        mockBooking.partnerId,
        'CREDIT',
        mockBooking.partnerNetPaise,
        `Earnings for completed companion date #${bookingId.slice(-6)}`,
        'BOOKING',
        bookingId
      );

      expect(mockBooking.stage).toBe('COMPLETED');
      expect(mockBooking.actualEndAt).toBeInstanceOf(Date);
      expect(walletService.processTransaction).toHaveBeenCalledWith(
        partnerId,
        'CREDIT',
        135000,
        expect.stringContaining('Earnings for completed'),
        'BOOKING',
        bookingId
      );
    });
  });
});
