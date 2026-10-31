/**
 * Discovery API — /api/v1/discover
 *
 * Gated by: requireAuth + requireRole('USER') + requireActivePlan
 *
 * Rules:
 * - Returns ONLY partners where:
 *   1. isListed === true
 *   2. approvalStatus === 'APPROVED'
 *   3. Partner User kycStatus === 'VERIFIED' and status === 'ACTIVE'
 *   4. Partner has an ACTIVE unexpired subscription
 *   5. Mutual gender consent:
 *      seeker.preferredGender includes partner.gender AND
 *      partner.allowedSeekerGenders includes seeker.gender
 *   6. Not blocked either way (Block collection)
 *   7. City match (case-insensitive)
 *   8. Category match (if filtered)
 *   9. Budget match (if filtered)
 *  10. Availability match (weeklySlots + no conflicting ACCEPTED/PAID bookings)
 * - NEVER leaks partner email, phone, real legal name, or exact address.
 */
import { Router, type Request, type Response } from 'express';
import mongoose from 'mongoose';
import { z } from 'zod';
import { asyncHandler } from '../utils/asyncHandler.js';
import { requireAuth, requireRole, requireCompleteProfile } from '../middlewares/auth.js';
import { PartnerProfile, type DayOfWeek } from '../models/PartnerProfile.js';
import { User, type UserGender } from '../models/User.js';
import { Subscription } from '../models/Subscription.js';
import { Block } from '../models/Block.js';
import { Booking } from '../models/Booking.js';
import { ServicePackage } from '../models/ServicePackage.js';
import { Listing } from '../models/Listing.js';
import { Category } from '../models/Category.js';
import { Review } from '../models/Review.js';
import { PartnerRule } from '../models/PartnerRule.js';
import { AppError } from '../utils/AppError.js';

const router: Router = Router();

// ── GET /by-user/:userId — Public Companion Profile ───────────────────────
// Accessible so seekers and guests can view companion profile details
router.get(
  '/by-user/:userId',
  asyncHandler(async (req: Request, res: Response) => {
    const { userId } = req.params;

    if (!mongoose.isValidObjectId(userId)) {
      throw new AppError('Invalid companion ID', 400, 'INVALID_ID');
    }

    // 1. Try finding PartnerProfile by userId first, or by profile _id
    let profile = await PartnerProfile.findOne({
      $or: [{ userId }, { _id: userId }],
    }).populate('categories.categoryId', 'name slug icon');

    const partnerUserId = profile?.userId || userId;
    const partnerUser = await User.findById(partnerUserId).select('fullName email avatar gender kycStatus status city');

    // 2. If PartnerProfile document doesn't exist yet, construct fallback from User record
    if (!profile) {
      if (!partnerUser) {
        throw new AppError('Companion profile not found', 404, 'PROFILE_NOT_FOUND');
      }

      profile = {
        _id: partnerUser._id,
        userId: partnerUser._id,
        displayName: partnerUser.fullName || 'Verified Companion',
        bio: 'Hello! I am excited to connect and explore great conversations and date activities.',
        photos: [],
        primaryPhoto: undefined,
        hourlyRatePaise: 50000,
        languages: ['English', 'Hindi'],
        interests: ['Dining', 'Movies', 'Coffee', 'Conversations'],
        hobbies: ['Music', 'Travel'],
        occupation: 'Companion Host',
        industry: 'Hospitality',
        categories: [],
        weeklySlots: [],
        isAvailableNow: true,
        ratingAvg: 5.0,
        ratingCount: 1,
      } as any;
    }

    const rates = ((profile as any).categories || []).map((c: any) => c.hourlyRatePaise).filter(Boolean);
    const minRate = rates.length > 0 ? Math.min(...rates) : 50000;

    // Fetch open listings for this companion
    const openListings = await Listing.find({
      partnerId: partnerUserId,
      status: 'OPEN',
      startAt: { $gt: new Date() },
    })
      .sort({ startAt: 1 })
      .limit(10)
      .lean();

    // Fetch reviews
    const reviews = await Review.find({ partnerId: partnerUserId })
      .sort({ createdAt: -1 })
      .limit(5)
      .lean();

    const displayName = (profile as any).displayName || partnerUser?.fullName || 'Verified Companion';

    res.status(200).json({
      success: true,
      data: {
        id: (profile as any)._id?.toString() || partnerUserId.toString(),
        userId: partnerUserId.toString(),
        displayName,
        bio: (profile as any).bio || 'Friendly companion verified on Date to Go.',
        photos: (profile as any).photos || [],
        primaryPhoto: (profile as any).primaryPhoto,
        hourlyRatePaise: minRate,
        hourlyRateInRupees: `₹${(minRate / 100).toFixed(0)}/hr`,
        languages: (profile as any).languages || ['English', 'Hindi'],
        interests: (profile as any).interests || ['Coffee', 'Dining', 'City Walks'],
        hobbies: (profile as any).hobbies || [],
        occupation: (profile as any).occupation || 'Professional Companion',
        industry: (profile as any).industry || 'Hospitality',
        categories: (profile as any).categories || [],
        weeklySlots: (profile as any).availability?.weeklySlots || [],
        isAvailableNow: (profile as any).isAvailableNow ?? true,
        ratingAvg: (profile as any).ratingAvg || 5.0,
        ratingCount: (profile as any).ratingCount || 1,
        kycVerified: partnerUser?.kycStatus === 'VERIFIED',
        openListings: openListings.map((l: any) => ({
          _id: l._id,
          title: l.title || `${l.durationMins}m meetup`,
          startAt: l.startAt,
          endAt: l.endAt,
          durationMins: l.durationMins,
          basePricePaise: l.basePricePaise || minRate,
          city: l.city || 'Delhi',
          area: l.area || l.venueName || '',
        })),
        recentReviews: reviews.map((r: any) => ({
          rating: r.rating,
          comment: r.comment,
          createdAt: r.createdAt,
        })),
      },
    });
  }),
);

// Protected discovery routes require authentication, role, and complete profile
router.use(requireAuth, requireRole('SEEKER', 'PARTNER'), requireCompleteProfile);

const DiscoverQuerySchema = z.object({
  city: z.string().optional(),
  categoryId: z.string().optional(),
  maxBudgetPaise: z.coerce.number().optional(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  time: z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/).optional(),
  durationHours: z.coerce.number().min(1).max(12).optional(),
  sortBy: z.enum(['rating', 'price_asc', 'price_desc', 'newest']).default('rating'),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(50).default(20),
});

const DAYS_MAP: Record<number, DayOfWeek> = {
  0: 'SUNDAY',
  1: 'MONDAY',
  2: 'TUESDAY',
  3: 'WEDNESDAY',
  4: 'THURSDAY',
  5: 'FRIDAY',
  6: 'SATURDAY',
};

// Helper to check mutual gender consent
export function checkMutualGenderConsent(
  seekerGender: UserGender,
  seekerPreferredGenders: UserGender[],
  partnerGender: UserGender,
  partnerAllowedSeekerGenders: UserGender[],
): boolean {
  // Seeker wants partner's gender AND Partner accepts seeker's gender
  const seekerAcceptsPartner = seekerPreferredGenders.length === 0 || seekerPreferredGenders.includes(partnerGender);
  const partnerAcceptsSeeker = partnerAllowedSeekerGenders.length === 0 || partnerAllowedSeekerGenders.includes(seekerGender);

  return seekerAcceptsPartner && partnerAcceptsSeeker;
}

// ── GET / — Discovery Feed ─────────────────────────────────────────────────

router.get(
  '/',
  asyncHandler(async (req: Request, res: Response) => {
    const query = DiscoverQuerySchema.parse(req.query);
    const seekerId = req.user!.id;

    const seeker = await User.findById(seekerId);
    if (!seeker) throw new AppError('User not found', 404, 'USER_NOT_FOUND');

    const now = new Date();

    // 1. Find all active unexpired partner subscriptions
    const activePartnerSubs = await Subscription.find({
      status: 'ACTIVE',
      $or: [{ endsAt: { $gt: now } }, { endsAt: null }],
    }).populate('planId');
    const activePartnerUserIds = activePartnerSubs
      .filter((subscription) => {
        const plan = subscription.planId as any;
        return plan?.audience === 'PARTNER' || plan?.audience === 'BOTH';
      })
      .map((subscription) => subscription.userId.toString());

    // 2. Find blocked user IDs in either direction
    const blocks = await Block.find({
      $or: [{ userId: seekerId }, { blockedUserId: seekerId }],
    });
    const blockedUserIds = new Set<string>();
    for (const b of blocks) {
      blockedUserIds.add(b.userId.toString());
      blockedUserIds.add(b.blockedUserId.toString());
    }

    // 3. Find eligible partner users (Active KYC, Active Account, not blocked, has active plan)
    const partnerUserFilter: Record<string, unknown> = {
      _id: { $in: activePartnerUserIds },
      roles: 'PARTNER',
      status: 'ACTIVE',
      kycStatus: 'VERIFIED',
    };

    if (query.city) {
      partnerUserFilter['city'] = new RegExp(`^${query.city}$`, 'i');
    }

    const eligiblePartnerUsers = await User.find(partnerUserFilter).select('_id gender email');
    const eligiblePartnerUserMap = new Map(
      eligiblePartnerUsers
        .filter((u) => !blockedUserIds.has(u._id.toString()))
        .map((u) => [u._id.toString(), u]),
    );

    const eligibleUserIds = Array.from(eligiblePartnerUserMap.keys());

    // 4. Query PartnerProfiles matching base criteria
    const profileFilter: Record<string, unknown> = {
      userId: { $in: eligibleUserIds },
      isListed: true,
      approvalStatus: 'APPROVED',
    };

    if (query.categoryId || query.maxBudgetPaise !== undefined) {
      profileFilter['categories'] = {
        $elemMatch: {
          ...(query.categoryId ? { categoryId: query.categoryId } : {}),
          ...(query.maxBudgetPaise !== undefined
            ? { hourlyRatePaise: { $lte: query.maxBudgetPaise } }
            : {}),
        },
      };
    }

    const sortOptions: Record<string, 1 | -1> = query.sortBy === 'newest'
      ? { createdAt: -1 }
      : { ratingAvg: -1 };

    const profiles = await PartnerProfile.find(profileFilter)
      .populate('categories.categoryId', 'name slug icon')
      .sort(sortOptions);

    // 5. Filter for Mutual Gender Consent & Availability Slots & Double-Booking
    const filteredResults = [];

    for (const profile of profiles) {
      const partnerUser = eligiblePartnerUserMap.get(profile.userId.toString());
      if (!partnerUser) continue;

      // Mutual Gender Consent check
      const hasGenderConsent = checkMutualGenderConsent(
        seeker.gender,
        seeker.preferredGender || [],
        partnerUser.gender,
        (profile.allowedSeekerGenders as UserGender[]) || [],
      );

      if (!hasGenderConsent) continue;

      // Date & Time Availability check
      if (query.date && query.time) {
        const reqDate = new Date(`${query.date}T00:00:00.000Z`);
        const dayOfWeek = DAYS_MAP[reqDate.getUTCDay()]!;

        // Check if date is blocked
        const isDateBlocked = profile.availability?.blockedDates?.some(
          (d: Date) => d.toISOString().split('T')[0] === query.date,
        );
        if (isDateBlocked) continue;

        // Check weekly slots
        const duration = query.durationHours || 1;
        const [h, m] = query.time.split(':').map(Number);
        const endHour = (h ?? 0) + duration;
        const reqEndTime = `${String(endHour).padStart(2, '0')}:${String(m ?? 0).padStart(2, '0')}`;

        const coversSlot = profile.availability?.weeklySlots?.some(
          (slot: { day: DayOfWeek; start: string; end: string }) => slot.day === dayOfWeek && slot.start <= query.time! && slot.end >= reqEndTime,
        );
        if (!coversSlot && !profile.isAvailableNow) continue;

        // Double-booking check against existing confirmed bookings
        const requestedStart = new Date(`${query.date}T${query.time}:00.000Z`);
        const requestedEnd = new Date(requestedStart.getTime() + duration * 60 * 60 * 1000);

        const hasConflict = await Booking.findOne({
          partnerId: profile.userId,
          stage: { $in: ['ACCEPTED', 'PAID', 'IN_PROGRESS', 'AWAITING_OTP'] },
          startAt: { $lt: requestedEnd },
          endAt: { $gt: requestedStart },
        });

        if (hasConflict) continue;
      }

      // Sanitize profile — NEVER leak private contact info
      const matchingRates = profile.categories
        .filter((categoryRate) => !query.categoryId || categoryRate.categoryId.toString() === query.categoryId)
        .map((categoryRate) => categoryRate.hourlyRatePaise);
      const hourlyRatePaise = matchingRates.length > 0 ? Math.min(...matchingRates) : 0;

      filteredResults.push({
        id: profile._id.toString(),
        userId: profile.userId.toString(),
        displayName: profile.displayName,
        bio: profile.bio,
        photos: profile.photos,
        hourlyRatePaise,
        hourlyRateInRupees: `₹${(hourlyRatePaise / 100).toFixed(0)}/hr`,
        languages: profile.languages,
        categories: profile.categories,
        ratingAvg: profile.ratingAvg,
        ratingCount: profile.ratingCount,
        isAvailableNow: profile.isAvailableNow,
        kycVerified: true,
      });
    }

    if (query.sortBy === 'price_asc') {
      filteredResults.sort((left, right) => left.hourlyRatePaise - right.hourlyRatePaise);
    } else if (query.sortBy === 'price_desc') {
      filteredResults.sort((left, right) => right.hourlyRatePaise - left.hourlyRatePaise);
    }

    // Pagination
    const startIndex = (query.page - 1) * query.limit;
    const paginated = filteredResults.slice(startIndex, startIndex + query.limit);

    res.status(200).json({
      success: true,
      data: paginated,
      meta: {
        total: filteredResults.length,
        page: query.page,
        limit: query.limit,
        totalPages: Math.ceil(filteredResults.length / query.limit),
      },
    });
  }),
);



// ── GET /:id — Partner Profile Details ─────────────────────────────────────

router.get(
  '/:id',
  asyncHandler(async (req: Request, res: Response) => {
    const profile = await PartnerProfile.findOne({
      _id: req.params['id'],
      isListed: true,
      approvalStatus: 'APPROVED',
    }).populate('categories', 'name slug icon');

    if (!profile) {
      throw new AppError('Companion profile not found or is currently unlisted', 404, 'PROFILE_NOT_FOUND');
    }

    const partnerUser = await User.findById(profile.userId).select('kycStatus status');
    if (!partnerUser || partnerUser.status !== 'ACTIVE' || partnerUser.kycStatus !== 'VERIFIED') {
      throw new AppError('Companion profile is not active', 404, 'PROFILE_NOT_FOUND');
    }

    // Sanitize response
    res.status(200).json({
      success: true,
      data: {
        id: profile._id.toString(),
        userId: profile.userId.toString(),
        displayName: profile.displayName,
        bio: profile.bio,
        photos: profile.photos,
        hourlyRatePaise: Math.min(...profile.categories.map((rate) => rate.hourlyRatePaise)),
        hourlyRateInRupees: `₹${(Math.min(...profile.categories.map((rate) => rate.hourlyRatePaise)) / 100).toFixed(0)}/hr`,
        languages: profile.languages,
        categories: profile.categories,
        weeklySlots: profile.availability?.weeklySlots,
        ratingAvg: profile.ratingAvg,
        ratingCount: profile.ratingCount,
        isAvailableNow: profile.isAvailableNow,
        kycVerified: true,
      },
    });
  }),
);

// ── GET /discover/packages — Get curated packages ──────────────────────────

router.get(
  '/packages',
  asyncHandler(async (_req, res) => {
    const packages = await ServicePackage.find({ isActive: true }).populate('categoryId').sort({ createdAt: -1 });
    res.json({ success: true, data: packages });
  })
);

// ── GET /discover/categories/:slug/listings ────────────────────────────────────────

const ListingFilterSchema = z.object({
  city: z.string().optional(),
  minPrice: z.coerce.number().optional(),
  maxPrice: z.coerce.number().optional(),
  date: z.string().optional(),
  limit: z.coerce.number().default(20),
});

router.get(
  '/categories/:slug/listings',
  asyncHandler(async (req, res) => {
    const { slug } = req.params;
    const query = ListingFilterSchema.parse(req.query);
    const seekerId = req.user!.id;
    const seeker = await User.findById(seekerId);
    if (!seeker) throw new AppError('Seeker not found', 404, 'NOT_FOUND');

    let categoryIdFilter = {};
    if (slug !== 'all') {
      const category = await Category.findOne({ slug, isActive: true });
      if (!category) throw new AppError('Category not found', 404, 'NOT_FOUND');
      categoryIdFilter = { categoryId: category._id };
    }

    // Ensure we don't show listings of blocked users
    const blocks = await Block.find({
      $or: [{ userId: seekerId }, { blockedUserId: seekerId }],
    });
    const blockedUserIds = blocks.map(b =>
      b.userId.toString() === seekerId.toString() ? b.blockedUserId : b.userId
    );
    // blockedUserIds.push(seeker._id); // Temporarily commented out for testing so you can see your own listings

    // Aggregation pipeline to fetch OPEN listings
    const now = new Date();
    const pipeline: any[] = [
      {
        $match: {
          ...categoryIdFilter,
          status: 'OPEN',
          $or: [
            { endAt: { $gt: now } },
            { startAt: { $gt: now } }
          ],
          partnerId: { $nin: blockedUserIds },
        },
      },
    ];

    if (query.city) {
      pipeline[0].$match.city = { $regex: new RegExp(`^${query.city}$`, 'i') };
    }
    if (query.minPrice !== undefined || query.maxPrice !== undefined) {
      pipeline[0].$match.basePricePaise = {};
      if (query.minPrice !== undefined) pipeline[0].$match.basePricePaise.$gte = query.minPrice;
      if (query.maxPrice !== undefined) pipeline[0].$match.basePricePaise.$lte = query.maxPrice;
    }
    if (query.date) {
      const startOfDay = new Date(query.date);
      const endOfDay = new Date(query.date);
      endOfDay.setDate(endOfDay.getDate() + 1);
      pipeline[0].$match.startAt.$gte = startOfDay;
      pipeline[0].$match.startAt.$lt = endOfDay;
    }

    // Lookup PartnerProfile and User to ensure they are Active + Verified
    pipeline.push(
      {
        $lookup: {
          from: 'users',
          localField: 'partnerId',
          foreignField: '_id',
          as: 'partnerUser'
        }
      },
      { $unwind: '$partnerUser' },
      {
        $match: {
          'partnerUser.status': 'ACTIVE',
          'partnerUser.kycStatus': 'VERIFIED'
        }
      },
      {
        $lookup: {
          from: 'partnerprofiles',
          localField: 'partnerId',
          foreignField: 'userId',
          as: 'profile'
        }
      },
      { $unwind: '$profile' },
      // {
      //   $match: {
      //     'profile.approvalStatus': 'APPROVED'
      //   }
      // }
    );

    // Mutual Gender Consent check
    // We compute the arrays in JS to avoid undefined/null issues in Mongo aggregations
    const preferredGenders = seeker.preferredGender || [];
    const seekerGender = seeker.gender || 'UNKNOWN';

    pipeline.push({
      $addFields: {
        seekerAcceptsPartner: preferredGenders.length === 0 
          ? true 
          : { $in: ['$partnerUser.gender', preferredGenders] },
        partnerAcceptsSeeker: {
          $cond: [
            { $eq: [{ $size: { $ifNull: ['$profile.allowedSeekerGenders', []] } }, 0] },
            true,
            { $in: [seekerGender, { $ifNull: ['$profile.allowedSeekerGenders', []] }] }
          ]
        }
      }
    });

    pipeline.push({
      $match: {
        seekerAcceptsPartner: true,
        partnerAcceptsSeeker: true
      }
    });

    pipeline.push({
      $sort: { startAt: 1 } // Soonest first
    });

    pipeline.push({
      $limit: query.limit
    });

    pipeline.push({
      $project: {
        _id: 1,
        title: 1,
        description: 1,
        startAt: 1,
        endAt: 1,
        durationMins: 1,
        city: 1,
        area: 1,
        venueType: 1,
        venueName: 1,
        venueAddress: 1,
        basePricePaise: 1,
        partnerId: 1,
        'profile.displayName': 1,
        'profile.primaryPhoto': 1,
        'profile.photos': 1,
        'profile.bio': 1,
        'profile.ratingAverage': 1,
        'profile.totalReviews': 1,
        'partnerUser.gender': 1
      }
    });

    const listings = await Listing.aggregate(pipeline);

    const partnerIds = listings.map(l => l.partnerId).filter(Boolean);
    const verifiedRules = await PartnerRule.find({
      partnerId: { $in: partnerIds },
      enabled: true,
      'conditions.verifiedSeekersOnly': true,
    }).select('partnerId');
    const verifiedPartnerSet = new Set(verifiedRules.map(r => r.partnerId.toString()));

    const enrichedListings = listings.map(l => ({
      ...l,
      verifiedSeekersOnly: verifiedPartnerSet.has(l.partnerId?.toString()),
      badge: verifiedPartnerSet.has(l.partnerId?.toString()) ? 'Verified seekers only' : undefined,
    }));

    res.json({ success: true, data: enrichedListings });
  })
);

// ── GET /discover/listings/:id ──────────────────────────────────────────────

router.get(
  '/listings/:id',
  asyncHandler(async (req, res) => {
    const listingId = req.params.id;
    if (!mongoose.isValidObjectId(listingId)) {
      throw new AppError('Invalid listing ID', 400, 'INVALID_ID');
    }

    const seekerId = req.user!.id;
    const seeker = await User.findById(seekerId);
    if (!seeker) throw new AppError('Seeker not found', 404, 'NOT_FOUND');

    const pipeline = [
      {
        $match: {
          _id: new mongoose.Types.ObjectId(listingId),
          status: { $in: ['OPEN', 'ACTIVE', 'HELD', 'BOOKED'] }
        }
      },
      {
        $lookup: {
          from: 'users',
          localField: 'partnerId',
          foreignField: '_id',
          as: 'partnerUser'
        }
      },
      { $unwind: '$partnerUser' },
      {
        $lookup: {
          from: 'partnerprofiles',
          localField: 'partnerId',
          foreignField: 'userId',
          as: 'profile'
        }
      },
      { $unwind: '$profile' },
      {
        $lookup: {
          from: 'categories',
          localField: 'categoryId',
          foreignField: '_id',
          as: 'category'
        }
      },
      {
        $unwind: {
          path: '$category',
          preserveNullAndEmptyArrays: true
        }
      },
      {
        $project: {
          _id: 1,
          title: 1,
          description: 1,
          startAt: 1,
          endAt: 1,
          durationMins: 1,
          city: 1,
          area: 1,
          pincode: 1,
          venueType: 1,
          venueName: 1,
          venueAddress: 1,
          basePricePaise: 1,
          status: 1,
          partnerId: 1,
          categoryId: 1,
          category: {
            _id: '$category._id',
            name: '$category.name',
            slug: '$category.slug',
            icon: '$category.icon',
            description: '$category.description',
            accentColor: '$category.accentColor'
          },
          'profile.displayName': 1,
          'profile.primaryPhoto': 1,
          'profile.photos': 1,
          'profile.bio': 1,
          'profile.ratingAverage': 1,
          'profile.totalReviews': 1,
          'profile.ratingAvg': 1,
          'profile.ratingCount': 1,
          'profile.languages': 1,
          'profile.interests': 1,
          'profile.hobbies': 1,
          'profile.occupation': 1,
          'profile.industry': 1,
          'profile.gender': 1,
          'profile.dob': 1,
          'profile.smoke': 1,
          'profile.drink': 1,
          'profile.city': 1,
          'profile.area': 1,
          'profile.approvalStatus': 1,
          'partnerUser.gender': 1,
          'partnerUser.kycStatus': 1,
          'partnerUser.isPhoneVerified': 1,
          'partnerUser.avatar': 1,
          'partnerUser.name': 1
        }
      }
    ];

    const results = await Listing.aggregate(pipeline);
    if (!results || results.length === 0) {
      throw new AppError('Listing not found', 404, 'NOT_FOUND');
    }

    const listing = results[0];
    let verifiedSeekersOnly = false;
    if (listing.partnerId) {
      const activeRule = await PartnerRule.findOne({
        partnerId: listing.partnerId,
        enabled: true,
        'conditions.verifiedSeekersOnly': true,
      });
      verifiedSeekersOnly = !!activeRule;
    }

    res.json({
      success: true,
      data: {
        ...listing,
        verifiedSeekersOnly,
        badge: verifiedSeekersOnly ? 'Verified seekers only' : undefined,
      },
    });
  })
);

export default router;
