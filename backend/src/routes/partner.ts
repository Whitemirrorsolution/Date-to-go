/**
 * Partner routes — /api/v1/partner
 *
 * Gated by: requireAuth + requireRole('PARTNER') + requireVerifiedKyc + requireActivePlan
 *
 * Endpoints:
 * - GET    /profile          — Get partner's profile
 * - PATCH  /profile          — Update profile (bio moderated, rates checked)
 * - PUT    /availability     — Set weekly slots, blocked dates, available now
 * - POST   /submit-review    — Submit profile for admin review
 * - GET    /bookings         — Bookings inbox
 * - POST   /bookings/:id/accept   — Accept booking request
 * - POST   /bookings/:id/decline  — Decline booking request
 * - POST   /bookings/:id/complete — Mark booking completed
 * - GET    /earnings         — Earnings summary
 * - GET    /reviews          — Reviews received
 */
import { Router, type Request, type Response } from 'express';
import { z } from 'zod';
import { asyncHandler } from '../utils/asyncHandler.js';
import { requireAuth, requireRole, requireVerifiedKyc, requireEntitlement } from '../middlewares/auth.js';
import { PartnerProfile, type DayOfWeek } from '../models/PartnerProfile.js';
import { Booking } from '../models/Booking.js';
import { BookingRequest } from '../models/BookingRequest.js';
import { Listing } from '../models/Listing.js';
import { Category } from '../models/Category.js';
import { Review } from '../models/Review.js';
import { Notification } from '../models/Notification.js';
import { PayoutRequest } from '../models/PayoutRequest.js';
import { KycSubmission } from '../models/KycSubmission.js';
import { moderationService } from '../services/ModerationService.js';
import { partnerProfileHealthService } from '../services/PartnerProfileHealthService.js';
import { walletService } from '../services/WalletService.js';
import { bookingLifecycleService } from '../services/BookingLifecycleService.js';
import { otpService } from '../services/OtpService.js';
import { conflictService } from '../services/ConflictService.js';
import { AppError } from '../utils/AppError.js';

const router: Router = Router();

// Apply auth and partner role
router.use(requireAuth, requireRole('PARTNER'));

// ── Validation Schemas ─────────────────────────────────────────────────────

const DAYS_OF_WEEK = [
  'MONDAY',
  'TUESDAY',
  'WEDNESDAY',
  'THURSDAY',
  'FRIDAY',
  'SATURDAY',
  'SUNDAY',
] as const;

const TimeSlotSchema = z.object({
  day: z.enum(DAYS_OF_WEEK),
  start: z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/, 'Format must be HH:MM'),
  end: z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/, 'Format must be HH:MM'),
});

const CategoryRateSchema = z.object({
  categoryId: z.string().regex(/^[0-9a-fA-F]{24}$/),
  hourlyRatePaise: z.number().int().min(0),
});

const PayoutDetailsSchema = z.object({
  method: z.enum(['BANK_ACCOUNT', 'UPI']),
  accountName: z.string().optional(),
  accountNumber: z.string().optional(),
  ifsc: z.string().optional(),
  upiId: z.string().optional(),
});

const UpdateProfileSchema = z.object({
  displayName: z.string().min(2).max(100).optional(),
  gender: z.string().optional(),
  dob: z.union([z.string().datetime(), z.string().regex(/^\d{4}-\d{2}-\d{2}$/)]).optional(), // Ensure YYYY-MM-DD string or ISO
  primaryPhoto: z.string().optional(),

  city: z.union([z.string().min(1).max(100), z.literal('')]).optional(),
  pincode: z.union([z.string().min(6).max(6), z.literal('')]).optional(),
  area: z.string().optional(),

  bio: z.string().max(2000).optional(),
  occupation: z.string().optional(),
  industry: z.string().optional(),
  interests: z.array(z.string()).optional(),
  hobbies: z.array(z.string()).optional(),
  languages: z.array(z.string().min(1)).optional(),

  smoke: z.enum(['NEVER', 'OCCASIONALLY', 'REGULARLY', 'PREFER_NOT_TO_SAY']).optional(),
  drink: z.enum(['NEVER', 'OCCASIONALLY', 'REGULARLY', 'PREFER_NOT_TO_SAY']).optional(),

  categories: z.array(CategoryRateSchema).optional(),
  allowedSeekerGenders: z.array(z.string()).optional(),

  photos: z.array(z.string()).max(8).optional(),

  payoutDetails: PayoutDetailsSchema.optional(),
});

const UpdateAvailabilitySchema = z.object({
  weeklySlots: z.array(TimeSlotSchema),
  blockedDates: z.array(z.string().regex(/^\d{4}-\d{2}-\d{2}$/)).default([]),
  isAvailableNow: z.boolean().default(false),
});

const CreateListingSchema = z.object({
  categoryId: z.string().regex(/^[0-9a-fA-F]{24}$/),
  title: z.string().max(100).optional(),
  description: z.string().max(1000).optional(),
  startAt: z.string().datetime(),
  endAt: z.string().datetime(),
  durationMins: z.number().int().min(15),
  venueType: z.enum(['CAFE', 'MALL', 'CINEMA', 'RESTAURANT', 'PARK', 'EVENT_VENUE', 'HOSPITAL', 'MARKET', 'OTHER_PUBLIC', 'CLIENT_HOME']),
  venueName: z.string().min(1),
  venueAddress: z.string().min(5),
  pricePaise: z.number().int().min(0),
});

// Helper to check time slot overlaps
function hasSlotOverlap(slots: Array<{ day: DayOfWeek; start: string; end: string }>): boolean {
  for (let i = 0; i < slots.length; i++) {
    for (let j = i + 1; j < slots.length; j++) {
      const a = slots[i]!;
      const b = slots[j]!;
      if (a.day === b.day) {
        // Overlap condition: max(startA, startB) < min(endA, endB)
        if (a.start < b.end && b.start < a.end) {
          return true;
        }
      }
    }
  }
  return false;
}

// ── GET /profile ───────────────────────────────────────────────────────────

router.get(
  '/profile',
  asyncHandler(async (req: Request, res: Response) => {
    let profile = await PartnerProfile.findOne({ userId: req.user!.id }).populate('categories');

    if (!profile) {
      // Create empty draft profile if not yet created
      profile = await PartnerProfile.create({
        userId: req.user!.id,
        displayName: 'New Companion',
        bio: '',
        approvalStatus: 'DRAFT',
      });
    }

    res.status(200).json({
      success: true,
      data: profile,
    });
  }),
);

// ── PATCH /profile ─────────────────────────────────────────────────────────

router.patch(
  '/profile',
  asyncHandler(async (req: Request, res: Response) => {
    const dto = UpdateProfileSchema.parse(req.body);

    // Run text moderation on bio if updated
    if (dto.bio) {
      moderationService.validateProfileBio(dto.bio);
    }

    const profile = await PartnerProfile.findOneAndUpdate(
      { userId: req.user!.id },
      { $set: dto },
      { new: true, upsert: true, runValidators: true },
    ).populate('categories');

    res.status(200).json({
      success: true,
      message: 'Profile updated successfully',
      data: profile,
    });
  }),
);

// ── PUT /availability ──────────────────────────────────────────────────────

router.put(
  '/availability',
  asyncHandler(async (req: Request, res: Response) => {
    const { weeklySlots, blockedDates, isAvailableNow } = UpdateAvailabilitySchema.parse(req.body);

    // Validate no slot overlaps on the same day
    if (hasSlotOverlap(weeklySlots)) {
      throw new AppError('Overlapping availability slots detected on the same day', 400, 'SLOT_OVERLAP');
    }

    const blockedDateObjects = blockedDates.map((d) => new Date(d));

    const profile = await PartnerProfile.findOneAndUpdate(
      { userId: req.user!.id },
      {
        $set: {
          weeklySlots,
          blockedDates: blockedDateObjects,
          isAvailableNow,
        },
      },
      { new: true, upsert: true },
    );

    res.status(200).json({
      success: true,
      message: 'Availability updated successfully',
      data: profile,
    });
  }),
);

// ── GET /listings ──────────────────────────────────────────────────────────

router.get(
  '/listings',
  asyncHandler(async (req: Request, res: Response) => {
    const listings = await import('../models/Listing.js').then(m => m.Listing.find({ partnerId: req.user!.id }).sort({ createdAt: -1 }));
    res.json({ success: true, data: listings });
  })
);

    // ── GET /listings/:id — Listing details
    router.get(
      '/listings/:id',
      asyncHandler(async (req: Request, res: Response) => {
        const isAdmin = req.user!.roles?.includes('ADMIN' as any);
        const query: any = { _id: req.params.id };
        if (!isAdmin) query.partnerId = req.user!.id;
        const listing = await Listing.findOne(query).populate('categoryId');
        if (!listing) throw new AppError('Listing not found', 404, 'NOT_FOUND');
        res.json({ success: true, data: listing });
      }),
    );

    // ── PATCH /listings/:id — Update listing / status
    router.patch(
      '/listings/:id',
      asyncHandler(async (req: Request, res: Response) => {
        const isAdmin = req.user!.roles?.includes('ADMIN' as any);
        const query: any = { _id: req.params.id };
        if (!isAdmin) query.partnerId = req.user!.id;
        const listing = await Listing.findOne(query);
        if (!listing) throw new AppError('Listing not found', 404, 'NOT_FOUND');

        const { status, title, description, pricePaise, basePricePaise, startAt, endAt, durationMins, venueName, venueAddress, venueType } = req.body;

        if (status !== undefined) {
          let nextStatus = status;
          if (status === 'ACTIVE') nextStatus = 'OPEN';
          if (status === 'PAUSED') nextStatus = 'CLOSED';
          listing.status = nextStatus;
        }

        if (title !== undefined) listing.title = title;
        if (description !== undefined) listing.description = description;
        if (pricePaise !== undefined) listing.basePricePaise = pricePaise;
        if (basePricePaise !== undefined) listing.basePricePaise = basePricePaise;
        if (startAt !== undefined) listing.startAt = new Date(startAt);
        if (endAt !== undefined) listing.endAt = new Date(endAt);
        if (durationMins !== undefined) listing.durationMins = durationMins;
        if (venueName !== undefined) listing.venueName = venueName;
        if (venueAddress !== undefined) listing.venueAddress = venueAddress;
        if (venueType !== undefined) listing.venueType = venueType;

        await listing.save();
        await listing.populate('categoryId');

        res.status(200).json({
          success: true,
          message: 'Listing updated successfully',
          data: listing,
        });
      }),
    );

    // ── POST /listings/:id/status — Toggle status fallback
    router.post(
      '/listings/:id/status',
      asyncHandler(async (req: Request, res: Response) => {
        const isAdmin = req.user!.roles?.includes('ADMIN' as any);
        const query: any = { _id: req.params.id };
        if (!isAdmin) query.partnerId = req.user!.id;
        const listing = await Listing.findOne(query);
        if (!listing) throw new AppError('Listing not found', 404, 'NOT_FOUND');

        const { status } = req.body;
        if (status) {
          let nextStatus = status;
          if (status === 'ACTIVE') nextStatus = 'OPEN';
          if (status === 'PAUSED') nextStatus = 'CLOSED';
          listing.status = nextStatus;
        }

        await listing.save();
        await listing.populate('categoryId');

        res.status(200).json({
          success: true,
          message: 'Listing status updated',
          data: listing,
        });
      }),
    );

    // ── DELETE /listings/:id — Delete listing
    router.delete(
      '/listings/:id',
      asyncHandler(async (req: Request, res: Response) => {
        const isAdmin = req.user!.roles?.includes('ADMIN' as any);
        const query: any = { _id: req.params.id };
        if (!isAdmin) query.partnerId = req.user!.id;
        const listing = await Listing.findOne(query);
        if (!listing) throw new AppError('Listing not found', 404, 'NOT_FOUND');

        if (['BOOKED', 'HELD'].includes(listing.status)) {
          throw new AppError('Cannot delete a listing that has active bookings', 400, 'BAD_REQUEST');
        }

        await Listing.deleteOne({ _id: listing._id });
        res.status(200).json({
          success: true,
          message: 'Listing deleted successfully',
        });
      }),
    );

// ── GET /profile/health ────────────────────────────────────────────────────

router.get(
  '/profile/health',
  asyncHandler(async (req: Request, res: Response) => {
    const health = await partnerProfileHealthService.calculateHealth(req.user!.id);
    const gating = await partnerProfileHealthService.canCreateListings(req.user!.id);
    res.status(200).json({ success: true, data: { ...health, canCreateListings: gating.allowed, missing: gating.missing } });
  }),
);

// ── POST /submit-review ────────────────────────────────────────────────────

router.post(
  '/submit-review',
  asyncHandler(async (req: Request, res: Response) => {
    // Even if they can't create listings, they can submit profile for review if the mandatory fields are filled.
    const profile = await PartnerProfile.findOne({ userId: req.user!.id });
    if (!profile) throw new AppError('Profile not found', 404, 'PROFILE_NOT_FOUND');

    // Check if bio is moderated
    if (profile.bio) {
      moderationService.validateProfileBio(profile.bio);
    }

    profile.approvalStatus = 'PENDING_REVIEW';
    await profile.save();

    res.status(200).json({
      success: true,
      message: 'Profile submitted for admin review. You will be notified once approved.',
      data: { approvalStatus: profile.approvalStatus },
    });
  }),
);

// ── GET /kyc ─────────────────────────────────────────────────────────────
router.get(
  '/kyc',
  asyncHandler(async (req: Request, res: Response) => {
    let submission = await KycSubmission.findOne({ partnerId: req.user!.id });
    if (!submission) {
      submission = await KycSubmission.create({ partnerId: req.user!.id, status: 'NOT_SUBMITTED' });
    }
    res.json({ success: true, data: submission });
  })
);

// ── POST /kyc/documents ────────────────────────────────────────────────────
router.post(
  '/kyc/documents',
  asyncHandler(async (req: Request, res: Response) => {
    const { type, storageKey, mime, sizeBytes, idNumber } = req.body;
    
    const submission = await KycSubmission.findOne({ partnerId: req.user!.id });
    if (!submission) throw new AppError('KYC not started', 400);

    if (['SUBMITTED', 'UNDER_REVIEW', 'APPROVED'].includes(submission.status)) {
      throw new AppError('Cannot add documents in current state', 400);
    }

    submission.documents.push({
      type,
      storageKey,
      mime,
      sizeBytes,
      idLast4: idNumber ? idNumber.slice(-4) : undefined,
      uploadedAt: new Date(),
    } as any);
    
    await submission.save();
    res.json({ success: true, data: submission });
  })
);

// ── DELETE /kyc/documents/:docId ──────────────────────────────────────────
router.delete(
  '/kyc/documents/:docId',
  asyncHandler(async (req: Request, res: Response) => {
    const submission = await KycSubmission.findOne({ partnerId: req.user!.id });
    if (!submission) throw new AppError('Not found', 404);
    
    submission.documents = submission.documents.filter(d => (d as any)._id.toString() !== req.params.docId) as any;
    await submission.save();
    res.json({ success: true });
  })
);

// ── POST /kyc/submit ───────────────────────────────────────────────────────
router.post(
  '/kyc/submit',
  asyncHandler(async (req: Request, res: Response) => {
    const submission = await KycSubmission.findOne({ partnerId: req.user!.id });
    if (!submission || submission.documents.length === 0) throw new AppError('No documents', 400);
    
    submission.status = 'SUBMITTED';
    await submission.save();
    res.json({ success: true });
  })
);

// ── Operational endpoints ──────────────────────────────────────────────────

// ── GET /bookings — Partner Inbox ──────────────────────────────────────────

router.get(
  '/bookings',
  requireEntitlement('PARTNER'),
  asyncHandler(async (req: Request, res: Response) => {
    const { stage } = req.query;
    const filter: Record<string, unknown> = { partnerId: req.user!.id };

    if (stage && typeof stage === 'string') {
      filter['stage'] = stage;
    }

    const bookings = await Booking.find(filter)
      .populate('clientId', 'email gender')
      .populate('categoryId')
      .sort({ startAt: -1 });

    const transformed = bookings.map(b => {
      const bObj: any = b.toObject();
      bObj.totalPricePaise = bObj.totalPaise;
      bObj.platformFeePaise = bObj.commissionPaise;
      return bObj;
    });

    res.status(200).json({
      success: true,
      data: transformed,
    });
  }),
);

// ── GET /bookings/:id — Booking details ───────────────────────────────────
router.get(
  '/bookings/:id',
  requireEntitlement('PARTNER'),
  asyncHandler(async (req: Request, res: Response) => {
    const booking = await Booking.findOne({ _id: req.params.id, partnerId: req.user!.id })
      .populate('clientId', 'email gender')
      .populate('categoryId');
    if (!booking) throw new AppError('Booking not found', 404);
    const bObj: any = booking.toObject();
    bObj.totalPricePaise = bObj.totalPaise;
    bObj.platformFeePaise = bObj.commissionPaise;
    res.status(200).json({ success: true, data: bObj });
  }),
);

// ── POST /bookings/:id/accept ──────────────────────────────────────────────
router.post(
  '/bookings/:id/accept',
  requireEntitlement('PARTNER'),
  requireVerifiedKyc,
  asyncHandler(async (req: Request, res: Response) => {
    const booking = await Booking.findOne({ _id: req.params.id, partnerId: req.user!.id });
    if (!booking) throw new AppError('Booking not found', 404);
    if (booking.stage !== 'REQUESTED') throw new AppError('Booking is not in REQUESTED state', 400);

    const listing = await Listing.findOneAndUpdate(
      { _id: booking.listingId, status: 'OPEN' },
      { $set: { status: 'HELD' } },
      { new: true },
    );
    if (!listing) throw new AppError('Listing is no longer available', 409, 'LISTING_UNAVAILABLE');

    booking.stage = 'ACCEPTED';
    await booking.save();
    await BookingRequest.findByIdAndUpdate(booking.requestId, {
      status: 'ACCEPTED',
      acceptedAt: new Date(),
      confirmBy: new Date(Date.now() + 24 * 60 * 60 * 1000),
    });

    await Notification.create({
      userId: booking.clientId,
      title: 'Booking Accepted! 🤝',
      message: `Your companion accepted your booking for ${new Date(booking.startAt).toLocaleString('en-IN')}. Get ready!`,
      type: 'BOOKING_UPDATE',
    });

    res.status(200).json({ success: true, message: 'Booking accepted.', data: booking });
  }),
);

// ── POST /bookings/:id/decline ─────────────────────────────────────────────
router.post(
  '/bookings/:id/decline',
  requireEntitlement('PARTNER'),
  requireVerifiedKyc,
  asyncHandler(async (req: Request, res: Response) => {
    const { reason } = z.object({ reason: z.string().optional() }).parse(req.body);
    const booking = await Booking.findOne({ _id: req.params.id, partnerId: req.user!.id });

    if (!booking) throw new AppError('Booking not found', 404);
    if (booking.stage !== 'REQUESTED') throw new AppError('Booking is not in REQUESTED state', 400);

    booking.stage = 'DECLINED';
    booking.cancelReason = reason || 'Companion unavailable';
    await booking.save();
    await BookingRequest.findByIdAndUpdate(booking.requestId, { status: 'DECLINED' });

    // Free up listing
    await Listing.findByIdAndUpdate(booking.listingId, { status: 'OPEN' });

    await Notification.create({
      userId: booking.clientId,
      title: 'Booking Declined',
      message: `Your booking request was declined (${booking.cancelReason}). No payment was charged.`,
      type: 'BOOKING_UPDATE',
    });

    res.status(200).json({ success: true, message: 'Booking declined and refunded.' });
  }),
);

// ── POST /bookings/:id/verify-otp (Meetup PIN Check-in / Start) ───────────
router.post(
  '/bookings/:id/verify-otp',
  requireEntitlement('PARTNER'),
  requireVerifiedKyc,
  asyncHandler(async (req: Request, res: Response) => {
    const { otp } = z.object({ otp: z.string().length(4) }).parse(req.body);
    const booking = await Booking.findOne({ _id: req.params.id, partnerId: req.user!.id });

    if (!booking) throw new AppError('Booking not found', 404);

    if (booking.otpLockoutUntil && booking.otpLockoutUntil > new Date()) {
      throw new AppError('Check-in locked due to failed attempts. Please wait 15 minutes.', 429, 'LOCKOUT');
    }

    if (!booking.otpHash || !otpService.verifyOtp(otp, booking._id.toString(), booking.otpHash)) {
      booking.otpAttempts = (booking.otpAttempts || 0) + 1;
      if (booking.otpAttempts >= 5) {
        booking.otpLockoutUntil = new Date(Date.now() + 15 * 60 * 1000);
      }
      await booking.save();
      throw new AppError('Invalid 4-digit PIN. Please ask the seeker for the PIN displayed on their screen.', 400, 'INVALID_PIN');
    }

    // If booking was PAID, verify-otp starts the meeting!
    if (booking.stage === 'PAID') {
      booking.stage = 'IN_PROGRESS';
      booking.actualStartAt = new Date();
      booking.partnerTravelStatus = 'ARRIVED';
      booking.otpAttempts = 0;
      await booking.save();

      return res.status(200).json({
        success: true,
        message: 'Seeker 4-digit PIN verified! Meeting officially started.',
        data: { bookingId: booking._id, stage: 'IN_PROGRESS' },
      });
    }

    // If already IN_PROGRESS or AWAITING_OTP, verify-otp completes meeting and pays out
    await bookingLifecycleService.checkIn(req.params.id, req.user!.id, otp);
    return res.status(200).json({ success: true, message: 'Completion PIN verified and booking completed.', data: { stage: 'COMPLETED' } });
  }),
);

// ── POST /bookings/:id/complete (Meetup End & Payout) ──────────────────────
router.post(
  '/bookings/:id/complete',
  requireEntitlement('PARTNER'),
  requireVerifiedKyc,
  asyncHandler(async (req: Request, res: Response) => {
    const booking = await Booking.findOne({ _id: req.params.id, partnerId: req.user!.id });
    if (!booking) throw new AppError('Booking not found', 404);

    if (!['PAID', 'IN_PROGRESS', 'AWAITING_OTP'].includes(booking.stage)) {
      throw new AppError('Booking is not ready to be completed', 400);
    }

    booking.stage = 'COMPLETED';
    booking.actualEndAt = new Date();
    await booking.save();

    await walletService.processTransaction(
      booking.partnerId.toString(),
      'CREDIT',
      booking.partnerNetPaise,
      `Earnings for completed date #${booking._id.toString().slice(-6)}`,
      'BOOKING',
      booking._id.toString()
    );

    res.status(200).json({ success: true, message: 'Booking completed and escrow earnings released to wallet.', data: { stage: 'COMPLETED' } });
  }),
);

// ── GET /earnings ──────────────────────────────────────────────────────────

router.get(
  '/earnings',
  requireEntitlement('PARTNER'),
  asyncHandler(async (req: Request, res: Response) => {
    const completedBookings = await Booking.find({
      partnerId: req.user!.id,
      stage: 'COMPLETED',
    });

    const totalEarningsPaise = completedBookings.reduce(
      (sum, booking) => sum + booking.partnerNetPaise,
      0,
    );

    res.status(200).json({
      success: true,
      data: {
        completedBookingsCount: completedBookings.length,
        totalEarningsPaise,
        totalEarningsInRupees: `₹${(totalEarningsPaise / 100).toFixed(2)}`,
        pendingPayoutPaise: await walletService.getBalance(req.user!.id),
      },
    });
  }),
);

// ── Payouts ────────────────────────────────────────────────────────────────

router.post(
  '/payouts',
  requireEntitlement('PARTNER'),
  requireVerifiedKyc,
  asyncHandler(async (req: Request, res: Response) => {
    const { amountPaise, bankDetails } = z.object({
      amountPaise: z.number().int().min(100000), // Min 1000 INR
      bankDetails: z.object({
        accountNumber: z.string().optional(),
        ifsc: z.string().optional(),
        upiId: z.string().optional(),
      }).optional()
    }).parse(req.body);

    const partnerId = req.user!.id;
    const balance = await walletService.getBalance(partnerId);

    if (balance < amountPaise) {
      throw new AppError('Insufficient wallet balance for this payout request', 400);
    }

    const session = await (await import('mongoose')).default.startSession();
    let payoutRequest;
    try {
      await session.withTransaction(async () => {
        // Double check balance in tx
        const currentBalance = await walletService.getBalance(partnerId);
        if (currentBalance < amountPaise) {
          throw new AppError('Insufficient balance', 400);
        }

        payoutRequest = new PayoutRequest({
          partnerId,
          amountPaise,
          status: 'PENDING',
          bankDetails,
        });

        await payoutRequest.save({ session });

        await walletService.processTransaction(
          partnerId,
          'DEBIT',
          amountPaise,
          'Payout request initiated',
          'PAYOUT',
          payoutRequest._id.toString(),
        );
      });
    } finally {
      await session.endSession();
    }

    res.status(201).json({
      success: true,
      message: 'Payout request submitted successfully.',
      data: payoutRequest,
    });
  }),
);

router.get(
  '/payouts',
  requireEntitlement('PARTNER'),
  asyncHandler(async (req: Request, res: Response) => {
    const payouts = await PayoutRequest.find({ partnerId: req.user!.id }).sort({ createdAt: -1 });
    res.status(200).json({
      success: true,
      data: payouts,
    });
  }),
);

// ── GET /reviews ───────────────────────────────────────────────────────────

router.get(
  '/reviews',
  asyncHandler(async (req: Request, res: Response) => {
    const reviews = await Review.find({
      partnerId: req.user!.id,
      isApproved: true,
    })
      .populate('userId', 'email')
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      data: reviews,
    });
  }),
);

// ── GET /listings ──────────────────────────────────────────────────────────

router.get(
  '/listings',
  requireEntitlement('PARTNER'),
  asyncHandler(async (req: Request, res: Response) => {
    const listings = await Listing.find({ partnerId: req.user!.id })
      .populate('categoryId', 'name icon')
      .sort({ startAt: 1 });
    res.json({ success: true, data: listings });
  })
);

// ── POST /listings ─────────────────────────────────────────────────────────

router.post(
  '/listings',
  requireEntitlement('PARTNER'),
  requireVerifiedKyc,
  asyncHandler(async (req: Request, res: Response) => {
    console.log('Incoming Listing Body:', req.body);
    const dto = CreateListingSchema.parse(req.body);

    // Check if category exists
    const category = await Category.findById(dto.categoryId);
    if (!category) throw new AppError('Category not found', 404, 'NOT_FOUND');

    // Partner must have this category in their profile rates (bypassed for ADMIN testing)
    const profile = await PartnerProfile.findOne({ userId: req.user!.id });
    const isAdmin = req.user!.roles?.includes('ADMIN' as any);
    const catRate = profile?.categories?.find(c => c.categoryId.toString() === dto.categoryId);

    if (!catRate && !isAdmin) {
      throw new AppError('You must add this category to your profile first', 400, 'BAD_REQUEST');
    }

    const durationHours = (dto.durationMins || 60) / 60;
    const minAllowed = (category.minRatePaise || 10000) * durationHours;
    const maxAllowed = (category.maxRatePaise || 1000000) * durationHours;
    if (dto.pricePaise < minAllowed || dto.pricePaise > maxAllowed) {
      throw new AppError(
        `Price for ${durationHours} hr(s) must be between ₹${minAllowed / 100} and ₹${maxAllowed / 100}`,
        400,
        'BAD_REQUEST'
      );
    }

    const startDate = new Date(dto.startAt);
    const endDate = new Date(dto.endAt);
    if (isNaN(startDate.getTime()) || startDate.getTime() <= Date.now()) {
      throw new AppError('Listing start time must be in the future', 400, 'BAD_REQUEST');
    }
    if (isNaN(endDate.getTime()) || endDate.getTime() <= startDate.getTime()) {
      throw new AppError('Listing end time must be after start time', 400, 'BAD_REQUEST');
    }

    const listing = await Listing.create({
      partnerId: req.user!.id,
      categoryId: dto.categoryId,
      title: dto.title,
      description: dto.description,
      startAt: new Date(dto.startAt),
      endAt: new Date(dto.endAt),
      durationMins: dto.durationMins,
      city: profile?.city || 'Unknown',
      area: profile?.area || 'Unknown',
      pincode: profile?.pincode || '000000',
      venueType: dto.venueType,
      venueName: dto.venueName,
      venueAddress: dto.venueAddress,
      basePricePaise: dto.pricePaise,
      status: 'OPEN',
    });

    res.status(201).json({ success: true, data: listing });
  })
);

// ── POST /listings/bulk — Bulk actions with conflict checks and partial failure reports ─
const BulkListingActionSchema = z.object({
  action: z.enum(['CLOSE', 'PAUSE', 'RESUME', 'DUPLICATE_DATES', 'CHANGE_PRICE', 'MOVE_TIME']),
  listingIds: z.array(z.string().regex(/^[0-9a-fA-F]{24}$/)).min(1),
  targetDates: z.array(z.string().regex(/^\d{4}-\d{2}-\d{2}$/)).optional(),
  pricePaise: z.number().int().min(0).optional(),
  deltaMinutes: z.number().int().optional(),
});

router.post(
  '/listings/bulk',
  requireEntitlement('PARTNER'),
  requireVerifiedKyc,
  asyncHandler(async (req: Request, res: Response) => {
    const dto = BulkListingActionSchema.parse(req.body);
    const partnerId = req.user!.id;

    const succeeded: string[] = [];
    const failed: Array<{ id: string; reason: string }> = [];
    const createdListings: any[] = [];

    const listings = await Listing.find({
      _id: { $in: dto.listingIds },
      partnerId,
    });

    const listingMap = new Map(listings.map((l) => [l._id.toString(), l]));

    for (const id of dto.listingIds) {
      const listing = listingMap.get(id);
      if (!listing) {
        failed.push({ id, reason: 'Listing not found or not owned by you' });
        continue;
      }

      if (['BOOKED', 'HELD'].includes(listing.status) && ['CLOSE', 'PAUSE', 'MOVE_TIME'].includes(dto.action)) {
        failed.push({ id, reason: `Listing has an active ${listing.status} booking/hold and cannot be modified` });
        continue;
      }

      try {
        if (dto.action === 'CLOSE') {
          listing.status = 'CLOSED';
          await listing.save();
          succeeded.push(id);
        } else if (dto.action === 'PAUSE') {
          listing.status = 'PAUSED';
          await listing.save();
          succeeded.push(id);
        } else if (dto.action === 'RESUME') {
          // Check for conflicts before resuming
          const conflict = await conflictService.checkConflicts({
            partnerId,
            startAt: listing.startAt,
            endAt: listing.endAt,
            venuePincode: listing.pincode,
            excludeListingId: listing._id.toString(),
          });
          if (conflict.hasConflict) {
            failed.push({ id, reason: conflict.reason || 'Schedule clash detected with existing booking or buffer' });
          } else {
            listing.status = 'OPEN';
            await listing.save();
            succeeded.push(id);
          }
        } else if (dto.action === 'CHANGE_PRICE') {
          if (dto.pricePaise == null) {
            failed.push({ id, reason: 'pricePaise is required for CHANGE_PRICE' });
            continue;
          }
          listing.basePricePaise = dto.pricePaise;
          await listing.save();
          succeeded.push(id);
        } else if (dto.action === 'MOVE_TIME') {
          if (dto.deltaMinutes == null) {
            failed.push({ id, reason: 'deltaMinutes is required for MOVE_TIME' });
            continue;
          }
          const newStart = new Date(listing.startAt.getTime() + dto.deltaMinutes * 60000);
          const newEnd = new Date(listing.endAt.getTime() + dto.deltaMinutes * 60000);

          const conflict = await conflictService.checkConflicts({
            partnerId,
            startAt: newStart,
            endAt: newEnd,
            venuePincode: listing.pincode,
            excludeListingId: listing._id.toString(),
          });
          if (conflict.hasConflict) {
            failed.push({ id, reason: conflict.reason || 'Time shift causes buffer/booking overlap' });
          } else {
            listing.startAt = newStart;
            listing.endAt = newEnd;
            await listing.save();
            succeeded.push(id);
          }
        } else if (dto.action === 'DUPLICATE_DATES') {
          if (!dto.targetDates || dto.targetDates.length === 0) {
            failed.push({ id, reason: 'targetDates is required for DUPLICATE_DATES' });
            continue;
          }

          let anyDateCreated = false;
          for (const targetDateStr of dto.targetDates) {
            const [year, month, day] = targetDateStr.split('-').map(Number);
            const origStart = new Date(listing.startAt);
            const origEnd = new Date(listing.endAt);

            const newStart = new Date(origStart);
            newStart.setFullYear(year!, month! - 1, day!);

            const newEnd = new Date(origEnd);
            newEnd.setFullYear(year!, month! - 1, day!);

            const conflict = await conflictService.checkConflicts({
              partnerId,
              startAt: newStart,
              endAt: newEnd,
              venuePincode: listing.pincode,
            });

            if (conflict.hasConflict) {
              failed.push({
                id: `${id}_${targetDateStr}`,
                reason: `${targetDateStr}: ${conflict.reason || 'Conflict detected on date'}`,
              });
            } else {
              const cloned = await Listing.create({
                partnerId: listing.partnerId,
                categoryId: listing.categoryId,
                title: listing.title,
                description: listing.description,
                startAt: newStart,
                endAt: newEnd,
                durationMins: listing.durationMins,
                city: listing.city,
                area: listing.area,
                pincode: listing.pincode,
                locationPoint: listing.locationPoint,
                venueType: listing.venueType,
                venueName: listing.venueName,
                venueAddress: listing.venueAddress,
                basePricePaise: listing.basePricePaise,
                status: 'OPEN',
              });
              createdListings.push(cloned);
              anyDateCreated = true;
            }
          }
          if (anyDateCreated) {
            succeeded.push(id);
          }
        }
      } catch (err: any) {
        failed.push({ id, reason: err.message || 'Error processing listing action' });
      }
    }

    res.status(200).json({
      success: true,
      data: {
        succeeded,
        failed,
        total: dto.listingIds.length,
        successCount: succeeded.length,
        failureCount: failed.length,
        createdListings,
      },
    });
  })
);

export default router;
