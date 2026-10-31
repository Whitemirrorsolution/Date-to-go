import { describe, it, expect, vi, beforeEach } from 'vitest';
import mongoose from 'mongoose';
import { getCentroidFromPincode, haversineDistanceKm, estimateTravelTimeMinutes } from '../src/utils/geoUtils.js';
import { conflictService } from '../src/services/ConflictService.js';
import { autoRulesService } from '../src/services/AutoRulesService.js';
import { PartnerProfile } from '../src/models/PartnerProfile.js';
import { PartnerRule } from '../src/models/PartnerRule.js';
import { Booking } from '../src/models/Booking.js';
import { Listing } from '../src/models/Listing.js';
import { User } from '../src/models/User.js';
import { Dispute } from '../src/models/Dispute.js';
import { UserStrike } from '../src/models/UserStrike.js';
import { AppSetting } from '../src/models/AppSetting.js';

vi.mock('../src/models/PartnerProfile.js');
vi.mock('../src/models/PartnerRule.js');
vi.mock('../src/models/Booking.js');
vi.mock('../src/models/Listing.js');
vi.mock('../src/models/User.js');
vi.mock('../src/models/Dispute.js');
vi.mock('../src/models/UserStrike.js');
vi.mock('../src/models/AppSetting.js');

describe('Phase 1 Automation & Conflict Engine Tests', () => {
  beforeEach(() => {
    vi.resetAllMocks();

    // Default mock for AppSetting to prevent Mongoose timeout
    vi.mocked(AppSetting.findOne).mockReturnValue({
      lean: vi.fn().mockResolvedValue(null),
    } as any);

    // Default mock for Listing.findOne
    vi.mocked(Listing.findOne).mockReturnValue({
      lean: vi.fn().mockResolvedValue(null),
    } as any);
  });

  describe('Geo & Distance Utilities', () => {
    it('accurately calculates Haversine distance between known Indian cities', () => {
      const delhi = { lat: 28.6139, lng: 77.209 };
      const mumbai = { lat: 19.076, lng: 72.8777 };
      const dist = haversineDistanceKm(delhi.lat, delhi.lng, mumbai.lat, mumbai.lng);
      // Delhi to Mumbai is ~1140-1170 km
      expect(dist).toBeGreaterThan(1100);
      expect(dist).toBeLessThan(1200);
    });

    it('retrieves centroid for known pincode and estimates travel time', () => {
      const centroid = getCentroidFromPincode('110001');
      expect(centroid).toBeDefined();
      expect(centroid?.lat).toBeCloseTo(28.63, 1);
      expect(centroid?.lng).toBeCloseTo(77.22, 1);

      // 10km at 25km/h with default 15m overhead buffer = 24m drive + 15m = 39m
      const travelWithBuffer = estimateTravelTimeMinutes(10, 25);
      expect(travelWithBuffer.travelMinutes).toBe(39);

      // Pure driving time without overhead
      const travelPure = estimateTravelTimeMinutes(10, 25, 0);
      expect(travelPure.travelMinutes).toBe(24);
    });
  });

  describe('Conflict Engine (ConflictService)', () => {
    const partnerId = new mongoose.Types.ObjectId().toString();

    it('detects direct overlap with confirmed booking', async () => {
      const bookingStart = new Date(Date.now() + 2 * 3600 * 1000);
      const bookingEnd = new Date(Date.now() + 4 * 3600 * 1000);

      vi.mocked(PartnerProfile.findOne).mockReturnValue({
        lean: vi.fn().mockResolvedValue({
          userId: partnerId,
          bufferMinutesBefore: 30,
          bufferMinutesAfter: 30,
          availability: { blockedDates: [] },
        }),
      } as any);

      vi.mocked(Booking.find).mockReturnValue({
        lean: vi.fn().mockResolvedValue([
          {
            _id: new mongoose.Types.ObjectId(),
            partnerId,
            stage: 'ACCEPTED',
            startAt: bookingStart,
            endAt: bookingEnd,
            venueName: 'Cafe Coffee Day',
          },
        ]),
      } as any);

      // Proposed booking that overlaps directly (3h - 5h)
      const proposedStart = new Date(Date.now() + 3 * 3600 * 1000);
      const proposedEnd = new Date(Date.now() + 5 * 3600 * 1000);

      const conflict = await conflictService.checkConflicts({
        partnerId,
        startAt: proposedStart,
        endAt: proposedEnd,
      });

      expect(conflict.hasConflict).toBe(true);
      expect(conflict.conflictType).toBe('DIRECT_OVERLAP');
    });

    it('detects buffer violation before an upcoming booking', async () => {
      const existingBookingStart = new Date(Date.now() + 4 * 3600 * 1000);
      const existingBookingEnd = new Date(Date.now() + 6 * 3600 * 1000);

      vi.mocked(PartnerProfile.findOne).mockReturnValue({
        lean: vi.fn().mockResolvedValue({
          userId: partnerId,
          bufferMinutesBefore: 45,
          bufferMinutesAfter: 45,
          availability: { blockedDates: [] },
        }),
      } as any);

      vi.mocked(Booking.find).mockReturnValue({
        lean: vi.fn().mockResolvedValue([
          {
            _id: new mongoose.Types.ObjectId(),
            partnerId,
            stage: 'PAID',
            startAt: existingBookingStart,
            endAt: existingBookingEnd,
            venueName: 'Blue Tokai Cafe',
            venueAddress: 'Connaught Place 110001',
          },
        ]),
      } as any);

      // Proposed date ending only 15 minutes before the existing booking start (violates 45m buffer)
      const proposedStart = new Date(Date.now() + 2 * 3600 * 1000);
      const proposedEnd = new Date(existingBookingStart.getTime() - 15 * 60 * 1000);

      const conflict = await conflictService.checkConflicts({
        partnerId,
        startAt: proposedStart,
        endAt: proposedEnd,
      });

      expect(conflict.hasConflict).toBe(true);
      expect(conflict.conflictType).toBe('TRAVEL_TIME_INSUFFICIENT');
    });

    it('detects blocked date in partner availability settings', async () => {
      const blockedDate = new Date();
      blockedDate.setDate(blockedDate.getDate() + 5);
      const blockedDateStr = blockedDate.toISOString().split('T')[0]!;

      vi.mocked(PartnerProfile.findOne).mockReturnValue({
        lean: vi.fn().mockResolvedValue({
          userId: partnerId,
          availability: { weeklySlots: [], blockedDates: [new Date(blockedDateStr)] },
        }),
      } as any);

      const proposedStart = new Date(`${blockedDateStr}T14:00:00Z`);
      const proposedEnd = new Date(`${blockedDateStr}T16:00:00Z`);

      const conflict = await conflictService.checkConflicts({
        partnerId,
        startAt: proposedStart,
        endAt: proposedEnd,
      });

      expect(conflict.hasConflict).toBe(true);
      expect(conflict.conflictType).toBe('BLOCKED_DATE');
    });
  });

  describe('Auto-Rules Evaluation & Safety Constraints', () => {
    const partnerId = new mongoose.Types.ObjectId().toString();
    const seekerId = new mongoose.Types.ObjectId().toString();

    it('auto-declines request with insufficient lead time', async () => {
      vi.mocked(User.findById).mockReturnValue({
        select: vi.fn().mockReturnValue({
          lean: vi.fn().mockResolvedValue({
            _id: seekerId,
            phoneVerified: true,
            kycStatus: 'VERIFIED',
          }),
        }),
      } as any);

      // Rule: Auto-decline if lead time < 4 hours
      vi.mocked(PartnerRule.find).mockReturnValue({
        sort: vi.fn().mockReturnValue({
          lean: vi.fn().mockResolvedValue([
            {
              _id: new mongoose.Types.ObjectId(),
              name: 'Minimum 4 hours notice required',
              priority: 1,
              enabled: true,
              action: 'AUTO_DECLINE',
              conditions: { minLeadTimeHours: 4 },
            },
          ]),
        }),
      } as any);

      vi.mocked(PartnerRule.findByIdAndUpdate).mockResolvedValue({} as any);

      // Proposed booking starting in 2.5 hours (violates rule)
      const startAt = new Date(Date.now() + 2.5 * 3600 * 1000);
      const endAt = new Date(startAt.getTime() + 60 * 60 * 1000);

      const result = await autoRulesService.evaluateRequest({
        partnerId,
        seekerId,
        startAt,
        endAt,
        durationMins: 60,
        categoryId: new mongoose.Types.ObjectId().toString(),
      });

      expect(result.action).toBe('AUTO_DECLINE');
      expect(result.seekerFacingMessage).toBe('Not available for this request');
    });

    it('strictly blocks AUTO_ACCEPT for stranger / first-time seeker (Rule R5 Safety Gate)', async () => {
      vi.mocked(User.findById).mockReturnValue({
        select: vi.fn().mockReturnValue({
          lean: vi.fn().mockResolvedValue({
            _id: seekerId,
            phoneVerified: true,
            kycStatus: 'VERIFIED',
          }),
        }),
      } as any);

      vi.mocked(PartnerRule.find).mockReturnValue({
        sort: vi.fn().mockReturnValue({
          lean: vi.fn().mockResolvedValue([
            {
              _id: new mongoose.Types.ObjectId(),
              name: 'Auto accept verified bookings',
              priority: 1,
              enabled: true,
              action: 'AUTO_ACCEPT',
              conditions: { verifiedSeekersOnly: true },
            },
          ]),
        }),
      } as any);

      // Seeker has 0 completed bookings with this partner
      vi.mocked(Booking.countDocuments).mockResolvedValue(0);
      vi.mocked(Dispute.countDocuments).mockResolvedValue(0);

      const startAt = new Date(Date.now() + 24 * 3600 * 1000);
      const endAt = new Date(startAt.getTime() + 60 * 60 * 1000);

      const result = await autoRulesService.evaluateRequest({
        partnerId,
        seekerId,
        startAt,
        endAt,
        durationMins: 60,
        categoryId: new mongoose.Types.ObjectId().toString(),
      });

      // Safety gate must bypass auto-accept and fall through to manual review
      expect(result.action).toBe('NO_RULE_FIRED');
    });

    it('permits AUTO_ACCEPT for verified trusted repeat client with completed booking and 0 disputes', async () => {
      vi.mocked(User.findById).mockReturnValue({
        select: vi.fn().mockReturnValue({
          lean: vi.fn().mockResolvedValue({
            _id: seekerId,
            phoneVerified: true,
            kycStatus: 'VERIFIED',
          }),
        }),
      } as any);

      vi.mocked(PartnerRule.find).mockReturnValue({
        sort: vi.fn().mockReturnValue({
          lean: vi.fn().mockResolvedValue([
            {
              _id: new mongoose.Types.ObjectId(),
              name: 'Auto-accept verified clients',
              priority: 1,
              enabled: true,
              action: 'AUTO_ACCEPT',
              conditions: { verifiedSeekersOnly: true },
            },
          ]),
        }),
      } as any);

      vi.mocked(PartnerRule.findByIdAndUpdate).mockResolvedValue({} as any);

      // Has 2 completed bookings with this partner, and 0 disputes
      vi.mocked(Booking.countDocuments).mockResolvedValue(2);
      vi.mocked(Dispute.countDocuments).mockResolvedValue(0);

      const startAt = new Date(Date.now() + 24 * 3600 * 1000);
      const endAt = new Date(startAt.getTime() + 60 * 60 * 1000);

      const result = await autoRulesService.evaluateRequest({
        partnerId,
        seekerId,
        startAt,
        endAt,
        durationMins: 60,
        categoryId: new mongoose.Types.ObjectId().toString(),
      });

      expect(result.action).toBe('AUTO_ACCEPT');
      expect(result.safetyCheckPassed).toBe(true);
    });

    it('simulates rules step-by-step for partner transparency', async () => {
      const ruleId = new mongoose.Types.ObjectId().toString();
      vi.mocked(PartnerRule.find).mockReturnValue({
        sort: vi.fn().mockReturnValue({
          lean: vi.fn().mockResolvedValue([
            {
              _id: ruleId,
              name: 'Simulated Lead Time Rule',
              priority: 10,
              enabled: true,
              action: 'AUTO_DECLINE',
              conditions: { minLeadTimeHours: 5 },
            },
          ]),
        }),
      } as any);

      vi.mocked(User.findById).mockReturnValue({
        select: vi.fn().mockReturnValue({
          lean: vi.fn().mockResolvedValue({
            _id: seekerId,
            phoneVerified: true,
            kycStatus: 'VERIFIED',
          }),
        }),
      } as any);

      const startAt = new Date(Date.now() + 2 * 3600 * 1000); // 2 hours < 5 hours
      const endAt = new Date(startAt.getTime() + 60 * 60 * 1000);

      const steps = await autoRulesService.simulateRules(partnerId, {
        partnerId,
        seekerId,
        startAt,
        endAt,
        durationMins: 60,
        categoryId: new mongoose.Types.ObjectId().toString(),
      });

      expect(steps.length).toBe(1);
      expect(steps[0]!.ruleName).toBe('Simulated Lead Time Rule');
      expect(steps[0]!.overallMatch).toBe(true);
      expect(steps[0]!.actionTaken).toBe('AUTO_DECLINE');
    });
  });
});
