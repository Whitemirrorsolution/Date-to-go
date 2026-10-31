/**
 * Social routes — Reviews, Reports, User Blocks, and Categories
 *
 * Endpoints:
 * - GET    /categories          — List active categories (public)
 * - POST   /reviews             — Review a completed booking
 * - POST   /reports             — Report a user/safety incident
 * - POST   /blocks              — Block a user
 * - GET    /blocks              — Get my blocked list
 * - DELETE /blocks/:userId      — Unblock a user
 */
import { Router, type Request, type Response } from 'express';
import { z } from 'zod';
import { asyncHandler } from '../utils/asyncHandler.js';
import { requireAuth } from '../middlewares/auth.js';
import { Review } from '../models/Review.js';
import { Report } from '../models/Report.js';
import { Block } from '../models/Block.js';
import { Category } from '../models/Category.js';
import { Booking } from '../models/Booking.js';
import { PartnerProfile } from '../models/PartnerProfile.js';
import { moderationService } from '../services/ModerationService.js';
import { AppError } from '../utils/AppError.js';

const router: Router = Router();

// ── GET /categories — Public active categories ─────────────────────────────

router.get(
  '/categories',
  asyncHandler(async (_req: Request, res: Response) => {
    const categories = await Category.find({ isActive: true }).sort({ sortOrder: 1, name: 1 });
    res.status(200).json({
      success: true,
      data: categories,
    });
  }),
);

// Gated routes below
router.use(requireAuth);

const CreateReviewSchema = z.object({
  bookingId: z.string().regex(/^[0-9a-fA-F]{24}$/),
  rating: z.number().int().min(1).max(5),
  comment: z.string().max(1000).optional(),
});

const CreateReportSchema = z.object({
  reportedUserId: z.string().regex(/^[0-9a-fA-F]{24}$/),
  reason: z.string().min(5).max(1000),
  bookingId: z.string().regex(/^[0-9a-fA-F]{24}$/).optional(),
});

const CreateBlockSchema = z.object({
  blockedUserId: z.string().regex(/^[0-9a-fA-F]{24}$/),
  reason: z.string().max(500).optional(),
});

// ── POST /reviews — Leave Review ───────────────────────────────────────────

router.post(
  '/reviews',
  asyncHandler(async (req: Request, res: Response) => {
    const { bookingId, rating, comment } = CreateReviewSchema.parse(req.body);
    const userId = req.user!.id;

    const booking = await Booking.findOne({
      _id: bookingId,
      $or: [{ clientId: userId }, { partnerId: userId }],
      stage: 'COMPLETED',
    });

    if (!booking) {
      throw new AppError(
        'Reviews can only be submitted for COMPLETED bookings',
        400,
        'BOOKING_NOT_COMPLETED',
      );
    }

    const toUserId = booking.clientId.toString() === userId ? booking.partnerId : booking.clientId;

    // Check for existing review (1 review per booking per reviewer)
    const existing = await Review.findOne({
      bookingId,
      $or: [{ fromUserId: userId }, { userId }],
    });
    if (existing) {
      throw new AppError('You have already submitted a review for this booking', 409, 'ALREADY_REVIEWED');
    }

    // Moderate comment if provided
    let cleanComment = comment;
    if (comment) {
      const modResult = moderationService.filterText(comment);
      cleanComment = modResult.redactedText;
    }

    const review = await Review.create({
      bookingId,
      fromUserId: userId,
      toUserId,
      userId,
      partnerId: toUserId,
      rating,
      comment: cleanComment || '',
      moderated: false,
      isApproved: true, // auto-approved if clean
    });

    // Recalculate partner ratingAvg and ratingCount
    const allReviews = await Review.find({
      $or: [{ partnerId: toUserId }, { toUserId }],
      isApproved: true,
    });
    const count = allReviews.length;
    const avg = allReviews.reduce((sum, r) => sum + r.rating, 0) / (count || 1);

    await PartnerProfile.updateOne(
      { $or: [{ userId: toUserId }, { _id: toUserId }] },
      {
        $set: {
          ratingCount: count,
          ratingAvg: Math.round(avg * 10) / 10,
        },
      },
    );

    res.status(201).json({
      success: true,
      message: 'Thank you for your feedback! Review recorded.',
      data: review,
    });
  }),
);

// ── POST /reports — File Safety Report ─────────────────────────────────────

router.post(
  '/reports',
  asyncHandler(async (req: Request, res: Response) => {
    const { reportedUserId, reason, bookingId } = CreateReportSchema.parse(req.body);

    const report = await Report.create({
      reporterId: req.user!.id,
      reportedUserId,
      bookingId,
      reason,
      status: 'OPEN',
    });

    res.status(201).json({
      success: true,
      message: 'Safety report submitted. Our trust & safety team will investigate immediately.',
      data: report,
    });
  }),
);

// ── POST /blocks — Block User ──────────────────────────────────────────────

router.post(
  '/blocks',
  asyncHandler(async (req: Request, res: Response) => {
    const { blockedUserId, reason } = CreateBlockSchema.parse(req.body);
    const userId = req.user!.id;

    if (userId === blockedUserId) {
      throw new AppError('You cannot block yourself', 400, 'CANNOT_BLOCK_SELF');
    }

    const block = await Block.findOneAndUpdate(
      { userId, blockedUserId },
      { $set: { reason } },
      { upsert: true, new: true },
    );

    res.status(200).json({
      success: true,
      message: 'User blocked. You will no longer see each other in discovery or messaging.',
      data: block,
    });
  }),
);

// ── GET /blocks — List Blocked Users ───────────────────────────────────────

router.get(
  '/blocks',
  asyncHandler(async (req: Request, res: Response) => {
    const blocks = await Block.find({ userId: req.user!.id })
      .populate('blockedUserId', 'email')
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      data: blocks,
    });
  }),
);

// ── DELETE /blocks/:userId — Unblock User ──────────────────────────────────

router.delete(
  '/blocks/:userId',
  asyncHandler(async (req: Request, res: Response) => {
    await Block.deleteOne({
      userId: req.user!.id,
      blockedUserId: req.params['userId'],
    });

    res.status(200).json({
      success: true,
      message: 'User unblocked',
    });
  }),
);

export default router;
