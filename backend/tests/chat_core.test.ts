import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Types } from 'mongoose';
import { chatService } from '../src/services/ChatService.js';
import { Booking } from '../src/models/Booking.js';
import { Conversation } from '../src/models/Conversation.js';
import { Message } from '../src/models/Message.js';
import { QuickReplyTemplate } from '../src/models/QuickReplyTemplate.js';
import { AppSetting } from '../src/models/AppSetting.js';
import { AppError } from '../src/utils/AppError.js';

describe('Phase 4: Safe Chat Core Tests', () => {
  const seekerId = new Types.ObjectId();
  const partnerId = new Types.ObjectId();
  const outsiderId = new Types.ObjectId();
  const bookingId = new Types.ObjectId();

  beforeEach(() => {
    vi.restoreAllMocks();
    vi.spyOn(AppSetting, 'findOne').mockImplementation((query: any) => {
      if (query?.key === 'chatGraceHours') return Promise.resolve({ value: { hours: 24 } } as any);
      if (query?.key === 'chatMaxLength') return Promise.resolve({ value: { max: 300 } } as any);
      if (query?.key === 'chatRatePerHour') return Promise.resolve({ value: { limit: 20 } } as any);
      return Promise.resolve(null);
    });
  });

  describe('IDOR & Access Protection', () => {
    it('rejects access from non-participant user (403 FORBIDDEN)', async () => {
      const mockBooking: any = {
        _id: bookingId,
        clientId: seekerId,
        partnerId,
        stage: 'PAID',
      };

      await expect(
        chatService.evaluateWindow(mockBooking, { id: outsiderId.toString(), roles: ['SEEKER'] })
      ).rejects.toThrowError(AppError);
    });

    it('allows access to valid booking seeker and partner', async () => {
      const mockBooking: any = {
        _id: bookingId,
        clientId: seekerId,
        partnerId,
        stage: 'PAID',
      };
      vi.spyOn(Conversation, 'findOne').mockResolvedValueOnce(null);
      vi.spyOn(Conversation, 'create').mockResolvedValueOnce({
        _id: new Types.ObjectId(),
        bookingId,
        seekerId,
        partnerId,
        status: 'OPEN',
      } as any);

      const seekerWindow = await chatService.evaluateWindow(mockBooking, { id: seekerId.toString(), roles: ['SEEKER'] });
      expect(seekerWindow.isSeeker).toBe(true);
      expect(seekerWindow.permissions.status).toBe('OPEN');
    });
  });

  describe('State-Window Matrix Tests', () => {
    it('REQUESTED stage: allows 1 greeting note (max 150 chars) and locks further notes', async () => {
      const mockBooking: any = {
        _id: bookingId,
        clientId: seekerId,
        partnerId,
        stage: 'REQUESTED',
      };

      vi.spyOn(Message, 'countDocuments').mockResolvedValueOnce(0); // 0 messages sent yet
      vi.spyOn(Conversation, 'findOne').mockResolvedValueOnce(null);
      vi.spyOn(Conversation, 'create').mockResolvedValueOnce({
        _id: new Types.ObjectId(),
        bookingId,
        status: 'LOCKED',
      } as any);

      const window1 = await chatService.evaluateWindow(mockBooking, { id: seekerId.toString() });
      expect(window1.permissions.status).toBe('LOCKED');
      expect(window1.permissions.canSendText).toBe(true);
      expect(window1.permissions.maxChars).toBe(150);

      // Now test when 1 note has already been sent
      vi.spyOn(Message, 'countDocuments').mockResolvedValueOnce(1);
      vi.spyOn(Conversation, 'findOne').mockResolvedValueOnce({
        _id: new Types.ObjectId(),
        bookingId,
        status: 'LOCKED',
      } as any);

      const window2 = await chatService.evaluateWindow(mockBooking, { id: seekerId.toString() });
      expect(window2.permissions.canSendText).toBe(false);
      expect(window2.permissions.remainingNotes).toBe(0);
    });

    it('ACCEPTED stage: direct text is LOCKED, allows QUICK_REPLY templates only', async () => {
      const mockBooking: any = {
        _id: bookingId,
        clientId: seekerId,
        partnerId,
        stage: 'ACCEPTED',
      };

      vi.spyOn(Conversation, 'findOne').mockResolvedValueOnce({
        _id: new Types.ObjectId(),
        bookingId,
        status: 'LOCKED',
      } as any);

      const window = await chatService.evaluateWindow(mockBooking, { id: seekerId.toString() });
      expect(window.permissions.status).toBe('LOCKED');
      expect(window.permissions.canSendText).toBe(false);
      expect(window.permissions.canSendQuickReply).toBe(true);
    });

    it('PAID & IN_PROGRESS stages: chat is OPEN with max 300 chars limit', async () => {
      const mockBooking: any = {
        _id: bookingId,
        clientId: seekerId,
        partnerId,
        stage: 'PAID',
      };

      vi.spyOn(Conversation, 'findOne').mockResolvedValueOnce({
        _id: new Types.ObjectId(),
        bookingId,
        status: 'OPEN',
      } as any);

      const window = await chatService.evaluateWindow(mockBooking, { id: seekerId.toString() });
      expect(window.permissions.status).toBe('OPEN');
      expect(window.permissions.canSendText).toBe(true);
      expect(window.permissions.maxChars).toBe(300);
    });

    it('COMPLETED stage: remains OPEN within 24h grace period, then transitions to READ_ONLY', async () => {
      const recentEndAt = new Date(Date.now() - 2 * 60 * 60 * 1000); // 2 hours ago (< 24h)
      const mockBookingFresh: any = {
        _id: bookingId,
        clientId: seekerId,
        partnerId,
        stage: 'COMPLETED',
        endAt: recentEndAt,
      };

      vi.spyOn(Conversation, 'findOne').mockResolvedValueOnce({
        _id: new Types.ObjectId(),
        bookingId,
        status: 'OPEN',
      } as any);

      const freshWindow = await chatService.evaluateWindow(mockBookingFresh, { id: seekerId.toString() });
      expect(freshWindow.permissions.status).toBe('OPEN');
      expect(freshWindow.permissions.canSendText).toBe(true);

      // Now expired completion: 30 hours ago (> 24h)
      const expiredEndAt = new Date(Date.now() - 30 * 60 * 60 * 1000);
      const mockBookingExpired: any = {
        _id: bookingId,
        clientId: seekerId,
        partnerId,
        stage: 'COMPLETED',
        endAt: expiredEndAt,
      };

      vi.spyOn(Conversation, 'findOne').mockResolvedValueOnce({
        _id: new Types.ObjectId(),
        bookingId,
        status: 'OPEN',
        save: vi.fn(),
      } as any);

      const expiredWindow = await chatService.evaluateWindow(mockBookingExpired, { id: seekerId.toString() });
      expect(expiredWindow.permissions.status).toBe('READ_ONLY');
      expect(expiredWindow.permissions.canSendText).toBe(false);
    });

    it('CANCELLED stage: conversation is strictly CLOSED', async () => {
      const mockBooking: any = {
        _id: bookingId,
        clientId: seekerId,
        partnerId,
        stage: 'CANCELLED',
      };

      vi.spyOn(Conversation, 'findOne').mockResolvedValueOnce({
        _id: new Types.ObjectId(),
        bookingId,
        status: 'CLOSED',
        save: vi.fn(),
      } as any);

      const window = await chatService.evaluateWindow(mockBooking, { id: seekerId.toString() });
      expect(window.permissions.status).toBe('CLOSED');
      expect(window.permissions.canSendText).toBe(false);
    });
  });

  describe('Anti-Circumvention Content Constraints', () => {
    it('blocks phone numbers with 8+ digits', () => {
      expect(() => {
        chatService.validateTextContent('Call me on 9876543210 please');
      }).toThrowError(/phone numbers/i);

      expect(() => {
        chatService.validateTextContent('9 8 7 6 5 4 3 2 1 0');
      }).toThrowError(/phone numbers/i);
    });

    it('blocks external URLs and website links', () => {
      expect(() => {
        chatService.validateTextContent('Check my portfolio at https://instagram.com/myprofile');
      }).toThrowError(/external website links/i);

      expect(() => {
        chatService.validateTextContent('meet me at date-to-go.in');
      }).toThrowError(/external website links/i);
    });

    it('blocks off-platform payment UPI IDs', () => {
      expect(() => {
        chatService.validateTextContent('Send advance to myname@okhdfcbank');
      }).toThrowError(/UPI/i);
    });

    it('allows valid meeting logistics text without sensitive information', () => {
      const result = chatService.validateTextContent("I'm sitting near the window on the 1st floor.");
      expect(result.cleanText).toBe("I'm sitting near the window on the 1st floor.");
      expect(result.flagged).toBe(false);
    });
  });

  describe('Rate Limiter Enforcement', () => {
    it('throws 429 when user exceeds 20 messages per hour limit', async () => {
      vi.spyOn(Message, 'countDocuments').mockResolvedValueOnce(20);

      await expect(
        chatService.checkRateLimit(bookingId, seekerId.toString())
      ).rejects.toThrowError(/Rate limit exceeded/i);
    });

    it('passes when message count is within limit', async () => {
      vi.spyOn(Message, 'countDocuments').mockResolvedValueOnce(5);

      await expect(
        chatService.checkRateLimit(bookingId, seekerId.toString())
      ).resolves.toBeUndefined();
    });
  });
});
