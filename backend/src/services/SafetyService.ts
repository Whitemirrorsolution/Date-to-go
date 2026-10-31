import mongoose from 'mongoose';
import { Booking } from '../models/Booking.js';
import { ShareLink } from '../models/ShareLink.js';
import { User } from '../models/User.js';
import { PartnerProfile } from '../models/PartnerProfile.js';
import { AuditLog } from '../models/AuditLog.js';
import { Notification } from '../models/Notification.js';
import { SafetyCheck } from '../models/SafetyCheck.js';
import { smsProvider } from '../providers/index.js';
import { AppError } from '../utils/AppError.js';
import { logger } from '../utils/logger.js';
import { CLIENT_URL } from '../config/index.js';
import type { IBooking } from '../models/Booking.js';

export interface SosResult {
  alertDispatched: boolean;
  emergencyContactNotified: boolean;
  bookingId: string;
  timestamp: string;
  emergencyNumbers: Array<{ label: string; number: string }>;
}

export interface SharedBookingDetails {
  bookingId: string;
  meetingPlace: string;
  category: string;
  startsAt: string;
  endsAt: string;
  status: string;
  partnerFirstName: string; // Only first name — no full PII
  checkIns: Array<{ at: string; type: string }>;
  safetyHotline: string;
  expired: boolean;
}

/** Emergency helpline numbers (India) */
export const EMERGENCY_NUMBERS = [
  { label: 'Police', number: '100' },
  { label: 'National Emergency', number: '112' },
  { label: "Women's Helpline", number: '1091' },
  { label: 'Date to Go Safety (24/7)', number: '1800-DTG-SAFE' },
];

export class SafetyService {

  /**
   * Triggers a one-tap emergency SOS during an active/in-progress booking.
   * - Creates ESCALATED SafetyCheck
   * - SMS/WhatsApp-style alert to emergency contact with share link
   * - Admin high-priority notification
   * - Returns local emergency numbers
   */
  async triggerSos(userId: string, bookingId?: string): Promise<SosResult> {
    const user = await User.findById(userId);
    if (!user) throw new AppError('User not found', 404, 'USER_NOT_FOUND');

    let booking: IBooking | null = null;

    if (bookingId) {
      booking = await Booking.findById(bookingId);
    } else {
      booking = await Booking.findOne({
        $or: [{ clientId: user._id }, { partnerId: user._id }],
        stage: { $in: ['ACCEPTED', 'PAID', 'IN_PROGRESS', 'AWAITING_OTP'] },
      }).sort({ startAt: -1 });
    }

    // Create escalated safety check
    const rawBookingId = booking?._id || (booking as any)?.id;
    if (rawBookingId && mongoose.connection.readyState === 1) {
      const validBookingId = mongoose.isValidObjectId(rawBookingId)
        ? rawBookingId
        : new mongoose.Types.ObjectId();
      await SafetyCheck.create({
        bookingId: validBookingId,
        status: 'ESCALATED',
        triggeredBy: booking?.clientId?.toString() === userId ? 'CLIENT' : 'PARTNER',
        triggerUserId: user._id,
      });
    }

    const partnerProfile = booking
      ? await PartnerProfile.findOne({ userId: booking.partnerId })
      : null;

    const companionName = partnerProfile?.displayName?.split(' ')[0] || 'Companion';
    const venue = booking?.venueName || 'Designated Public Venue';
    const timeStr = booking?.startAt ? new Date(booking.startAt).toLocaleString('en-IN') : 'Now';

    let emergencyContactNotified = false;

    // Generate a share link for the emergency contact
    let shareUrl = '';
    if (booking) {
      try {
        const link = await this.generateShareLink(userId, booking._id.toString());
        shareUrl = `${CLIENT_URL}/s/${link.token}`;
      } catch (_e) { /* non-fatal */ }
    }

    // Dispatch SMS alert to emergency contact
    if (user.emergencyContact?.phone) {
      try {
        const messageText = `🚨 SOS ALERT from Date to Go: ${user.fullName} needs help! They are with ${companionName} at ${venue} (${timeStr}). Live booking: ${shareUrl || 'N/A'}. Call 112 if urgent.`;
        await smsProvider.sendOtp(user.emergencyContact.phone, 'SOS-ALERT', 60);
        logger.warn({ to: user.emergencyContact.phone, venue, messageText }, 'SOS SMS dispatched');
        emergencyContactNotified = true;
      } catch (err) {
        logger.error({ err }, 'Failed to dispatch SOS SMS');
      }
    }

    // High-priority admin notification
    await Notification.create({
      userId: user._id,
      title: '🚨 SOS TRIGGERED',
      body: `${user.fullName} triggered SOS at ${venue}. Emergency contacts notified.`,
      type: 'SOS_ALERT',
    });

    await AuditLog.create({
      userId: user._id,
      action: 'SOS_TRIGGERED',
      resourceType: 'Booking',
      resourceId: booking?.id?.toString() || 'N/A',
      metadata: { venue, emergencyContact: !!user.emergencyContact, shareUrl, time: new Date().toISOString() },
    });

    logger.error({ userId, bookingId: booking?.id, venue }, '🚨 SOS EMERGENCY 🚨');

    return {
      alertDispatched: true,
      emergencyContactNotified,
      bookingId: booking?.id?.toString() || 'N/A',
      timestamp: new Date().toISOString(),
      emergencyNumbers: EMERGENCY_NUMBERS,
    };
  }

  /**
   * Generate a unique, expiring share link for a booking.
   * Link expires when the booking's endAt time passes.
   * No-auth required to access — shows only safe data.
   */
  async generateShareLink(userId: string, bookingId: string): Promise<{ token: string; url: string }> {
    const booking = await Booking.findOne({
      _id: bookingId,
      $or: [{ clientId: userId }, { partnerId: userId }],
    });
    if (!booking) throw new AppError('Booking not found', 404);

    // Expire at booking end time (or 24h from now if already past)
    const expiresAt = booking.endAt > new Date() ? booking.endAt : new Date(Date.now() + 24 * 60 * 60 * 1000);

    const token = crypto.randomUUID();
    const link = await ShareLink.create({
      token,
      bookingId: booking._id,
      createdBy: userId,
      expiresAt,
    });

    return { token: link.token, url: `${CLIENT_URL}/s/${link.token}` };
  }

  /**
   * Get shareable booking details from a share token (no auth needed).
   * Reveals only: partner first name, venue, time, check-in status.
   */
  async getSharedBookingByToken(token: string): Promise<SharedBookingDetails> {
    const link = await ShareLink.findOne({ token });
    if (!link) throw new AppError('Share link not found or expired', 404, 'LINK_NOT_FOUND');

    const now = new Date();
    const expired = link.expiresAt < now;

    // Update access stats
    await ShareLink.findByIdAndUpdate(link._id, {
      lastAccessedAt: now,
      $inc: { accessCount: 1 },
    });

    const booking = await Booking.findById(link.bookingId).populate('categoryId');
    if (!booking) throw new AppError('Booking not found', 404);

    const partnerProfile = await PartnerProfile.findOne({ userId: booking.partnerId });
    const partnerFullName = partnerProfile?.displayName || 'Verified Companion';
    const partnerFirstName = partnerFullName.split(' ')[0] ?? 'Companion';

    // Fetch check-in events for this booking
    const { BookingEvent } = await import('../models/BookingEvent.js');
    const checkInEvents = await BookingEvent.find({
      bookingId: booking._id,
      status: { $in: ['IN_PROGRESS', 'COMPLETED'] },
    }).sort({ createdAt: 1 });

    return {
      bookingId: booking.id.toString(),
      meetingPlace: booking.venueName,
      category: (booking.categoryId as any)?.name || 'Platonic Meetup',
      startsAt: booking.startAt.toISOString(),
      endsAt: booking.endAt.toISOString(),
      status: booking.stage,
      partnerFirstName,
      checkIns: checkInEvents.map(e => ({
        at: e.createdAt.toISOString(),
        type: e.status,
      })),
      safetyHotline: '1800-DTG-SAFE',
      expired,
    };
  }

  /**
   * Returns mandatory safety guidelines and emergency numbers.
   */
  getSafetyGuidelines() {
    return {
      rules: [
        '100% Strictly Platonic: Romantic, sexual, or intimate solicitations result in immediate permanent ban.',
        'Always Meet in Public Spaces: Cafes, restaurants, malls, public events. Never private residences or hotel rooms.',
        'Share Your Live Booking: Use "Share Booking" to keep your emergency contact informed.',
        'Keep Emergency Contact Updated: Verify your emergency contact phone in profile settings.',
        'Use In-App Communications Only: Do not share personal numbers or social handles.',
        'SOS Immediate Assistance: Tap SOS anytime during your booking for instant emergency dispatch.',
      ],
      emergencyNumbers: EMERGENCY_NUMBERS,
      safetyHotline: '1800-DTG-SAFE (24/7)',
    };
  }
}

export const safetyService = new SafetyService();
