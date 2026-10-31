import { Booking } from '../models/Booking.js';
import { Listing } from '../models/Listing.js';
import { PartnerProfile } from '../models/PartnerProfile.js';
import { getSetting } from '../utils/featureFlags.js';
import {
  getCentroidFromPincode,
  haversineDistanceKm,
  estimateTravelTimeMinutes,
} from '../utils/geoUtils.js';

export interface ConflictCheckParams {
  partnerId: string;
  startAt: Date;
  endAt: Date;
  venuePincode?: string;
  categoryId?: string;
  excludeBookingId?: string;
  excludeListingId?: string;
  skipListingsCheck?: boolean; // When validating a listing, we might only check bookings or other listings
}

export interface ConflictResult {
  hasConflict: boolean;
  conflictType?: 'DIRECT_OVERLAP' | 'BUFFER_OVERLAP' | 'TRAVEL_TIME_INSUFFICIENT' | 'BLOCKED_DATE' | undefined;
  reason?: string | undefined;
  conflictingEventId?: string | undefined;
  conflictingEventTitle?: string | undefined;
  conflictingWindow?: { startAt: Date; endAt: Date } | undefined;
  requiredGapMinutes?: number | undefined;
  actualGapMinutes?: number | undefined;
  suggestedFix?: string | undefined;
}

export class ConflictService {
  /**
   * Evaluates any proposed booking or listing against existing commitments,
   * applying buffer times and estimated inter-venue travel times.
   */
  async checkConflicts(params: ConflictCheckParams): Promise<ConflictResult> {
    const { partnerId, startAt, endAt, venuePincode, excludeBookingId, excludeListingId } = params;

    // 1. Fetch partner profile for buffers and blocked dates
    const profile = await PartnerProfile.findOne({ userId: partnerId }).lean();
    const maxBufferCap = await getSetting<number>('buffers.maxBufferMinutesCap', 120);
    const speedKmph = await getSetting<number>('travel.defaultSpeedKmph', 25);

    // Buffer minutes before and after
    const rawBufferBefore = (profile as any)?.bufferMinutesBefore ?? 30;
    const rawBufferAfter = (profile as any)?.bufferMinutesAfter ?? 30;
    const bufferBeforeMins = Math.min(rawBufferBefore, maxBufferCap);
    const bufferAfterMins = Math.min(rawBufferAfter, maxBufferCap);

    // 2. Check Blocked Dates
    const proposedDateStr = startAt.toISOString().split('T')[0];
    const blockedDates = profile?.availability?.blockedDates || (profile as any)?.blockedDates;
    if (blockedDates && Array.isArray(blockedDates)) {
      const isBlocked = blockedDates.some((d: any) => {
        const dStr = d instanceof Date ? d.toISOString().split('T')[0] : String(d).split('T')[0];
        return dStr === proposedDateStr;
      });
      if (isBlocked) {
        return {
          hasConflict: true,
          conflictType: 'BLOCKED_DATE',
          reason: `Date ${proposedDateStr} is marked as blocked in your availability settings.`,
          suggestedFix: `Unblock ${proposedDateStr} in your Profile Availability tab or pick another date.`,
        };
      }
    }

    // 3. Query Active Bookings in surrounding window (+/- 6 hours)
    const windowStart = new Date(startAt.getTime() - 6 * 60 * 60 * 1000);
    const windowEnd = new Date(endAt.getTime() + 6 * 60 * 60 * 1000);

    const bookingFilter: any = {
      partnerId,
      stage: { $in: ['ACCEPTED', 'PAID', 'IN_PROGRESS', 'AWAITING_OTP'] },
      startAt: { $lt: windowEnd },
      endAt: { $gt: windowStart },
    };
    if (excludeBookingId) {
      bookingFilter._id = { $ne: excludeBookingId };
    }

    const activeBookings = await Booking.find(bookingFilter).lean();

    for (const b of activeBookings) {
      const bStart = new Date(b.startAt);
      const bEnd = new Date(b.endAt);

      // Direct Overlap
      if (startAt < bEnd && endAt > bStart) {
        return {
          hasConflict: true,
          conflictType: 'DIRECT_OVERLAP',
          reason: `Direct schedule clash with existing confirmed booking at ${b.venueName || 'venue'}.`,
          conflictingEventId: b._id.toString(),
          conflictingEventTitle: b.venueName || 'Confirmed Booking',
          conflictingWindow: { startAt: bStart, endAt: bEnd },
          suggestedFix: `Shift the start time to after ${bEnd.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })} plus buffer.`,
        };
      }

      // If proposed is after existing booking b: check bEnd -> startAt gap
      if (startAt >= bEnd) {
        const gapMins = (startAt.getTime() - bEnd.getTime()) / (60 * 1000);
        let requiredGap = bufferBeforeMins;

        // Travel time estimate if pincodes differ
        if (venuePincode && b.venueAddress) {
          const coord1 = getCentroidFromPincode(b.venueAddress.slice(-6));
          const coord2 = getCentroidFromPincode(venuePincode);
          if (coord1 && coord2) {
            const dist = haversineDistanceKm(coord1.lat, coord1.lng, coord2.lat, coord2.lng);
            const { travelMinutes } = estimateTravelTimeMinutes(dist, speedKmph);
            requiredGap = Math.max(requiredGap, travelMinutes);
          }
        }

        if (gapMins < requiredGap) {
          return {
            hasConflict: true,
            conflictType: 'TRAVEL_TIME_INSUFFICIENT',
            reason: `Insufficient buffer or estimated travel time after booking at ${b.venueName || 'prior date'} (${Math.round(gapMins)}m available vs ${requiredGap}m required).`,
            conflictingEventId: b._id.toString(),
            conflictingWindow: { startAt: bStart, endAt: bEnd },
            requiredGapMinutes: requiredGap,
            actualGapMinutes: Math.round(gapMins),
            suggestedFix: `Delay start by at least ${Math.ceil(requiredGap - gapMins)} minutes.`,
          };
        }
      }

      // If proposed is before existing booking b: check endAt -> bStart gap
      if (endAt <= bStart) {
        const gapMins = (bStart.getTime() - endAt.getTime()) / (60 * 1000);
        let requiredGap = bufferAfterMins;

        if (venuePincode && b.venueAddress) {
          const coord1 = getCentroidFromPincode(venuePincode);
          const coord2 = getCentroidFromPincode(b.venueAddress.slice(-6));
          if (coord1 && coord2) {
            const dist = haversineDistanceKm(coord1.lat, coord1.lng, coord2.lat, coord2.lng);
            const { travelMinutes } = estimateTravelTimeMinutes(dist, speedKmph);
            requiredGap = Math.max(requiredGap, travelMinutes);
          }
        }

        if (gapMins < requiredGap) {
          return {
            hasConflict: true,
            conflictType: 'TRAVEL_TIME_INSUFFICIENT',
            reason: `Insufficient travel time or buffer before upcoming booking at ${b.venueName || 'next date'} (${Math.round(gapMins)}m available vs ${requiredGap}m required).`,
            conflictingEventId: b._id.toString(),
            conflictingWindow: { startAt: bStart, endAt: bEnd },
            requiredGapMinutes: requiredGap,
            actualGapMinutes: Math.round(gapMins),
            suggestedFix: `End this date earlier by ${Math.ceil(requiredGap - gapMins)} minutes.`,
          };
        }
      }
    }

    // 4. Query Open/Held Listings if requested
    if (!params.skipListingsCheck) {
      const listingFilter: any = {
        partnerId,
        status: { $in: ['OPEN', 'HELD', 'BOOKED'] },
        startAt: { $lt: endAt },
        endAt: { $gt: startAt },
      };
      if (excludeListingId) {
        listingFilter._id = { $ne: excludeListingId };
      }

      const clashingListing = await Listing.findOne(listingFilter).lean();
      if (clashingListing) {
        return {
          hasConflict: true,
          conflictType: 'DIRECT_OVERLAP',
          reason: `Schedule overlaps with another active listing "${clashingListing.title || 'Experience'}" (${new Date(clashingListing.startAt).toLocaleTimeString()} - ${new Date(clashingListing.endAt).toLocaleTimeString()}).`,
          conflictingEventId: clashingListing._id.toString(),
          conflictingEventTitle: clashingListing.title,
          conflictingWindow: {
            startAt: new Date(clashingListing.startAt),
            endAt: new Date(clashingListing.endAt),
          },
          suggestedFix: 'Choose an alternative time slot that does not overlap with your published listings.',
        };
      }
    }

    return { hasConflict: false };
  }
}

export const conflictService = new ConflictService();
