/**
 * Safety routes — /api/v1/safety
 *
 * Public (no auth):
 * - GET  /s/:token           — Shared booking link (no login needed, expires at booking end)
 *
 * Authenticated:
 * - POST /sos                — One-tap SOS: escalate, alert emergency contact, show 112/100/1091
 * - POST /check-in/:checkId  — Acknowledge a mid-booking safety check-in
 * - POST /share-link         — Generate a shareable booking link for trusted contact
 * - GET  /tips               — Safety guidelines + local emergency numbers
 * - POST /report             — Report a user (profile / booking / chat / review)
 * - POST /block/:userId      — Block a user
 * - DELETE /block/:userId    — Unblock a user
 * - GET  /blocks             — Get my block list
 */
import { Router, type Request, type Response } from 'express';
import { z } from 'zod';
import { asyncHandler } from '../utils/asyncHandler.js';
import { requireAuth } from '../middlewares/auth.js';
import { safetyService } from '../services/SafetyService.js';
import { moderationService } from '../services/ModerationService.js';
import { SafetyCheck } from '../models/SafetyCheck.js';
import { AppError } from '../utils/AppError.js';

const router: Router = Router();

// ── PUBLIC: Shared booking page (no login) ──────────────────────────────────

router.get(
  '/s/:token',
  asyncHandler(async (req: Request, res: Response) => {
    const details = await safetyService.getSharedBookingByToken(req.params['token']!);
    res.status(200).json({ success: true, data: details });
  }),
);

// ── All subsequent routes require auth ──────────────────────────────────────

router.use(requireAuth);

// ── POST /sos ──────────────────────────────────────────────────────────────

const SosSchema = z.object({
  bookingId: z.string().regex(/^[0-9a-fA-F]{24}$/).optional(),
});

router.post(
  '/sos',
  asyncHandler(async (req: Request, res: Response) => {
    const { bookingId } = SosSchema.parse(req.body);
    const result = await safetyService.triggerSos(req.user!.id, bookingId);

    res.status(200).json({
      success: true,
      message: '🚨 EMERGENCY SOS DISPATCHED. Emergency contacts and safety team alerted.',
      data: result,
    });
  }),
);

// ── POST /check-in/:checkId ────────────────────────────────────────────────

router.post(
  '/check-in/:checkId',
  asyncHandler(async (req: Request, res: Response) => {
    const check = await SafetyCheck.findById(req.params['checkId']);
    if (!check) throw new AppError('Safety check not found', 404);
    if (check.status !== 'PENDING') {
      res.status(400).json({ success: false, message: 'Check is no longer pending.' });
      return;
    }

    check.status = 'RESOLVED';
    check.resolvedAt = new Date();
    check.resolvedBy = req.user!.id as any;
    check.resolutionNote = 'User confirmed safe via app check-in';
    await check.save();

    res.status(200).json({ success: true, message: "Great! We're glad you're safe. 😊" });
  }),
);

// ── POST /share-link ────────────────────────────────────────────────────────

router.post(
  '/share-link',
  asyncHandler(async (req: Request, res: Response) => {
    const { bookingId } = z.object({
      bookingId: z.string().regex(/^[0-9a-fA-F]{24}$/),
    }).parse(req.body);

    const link = await safetyService.generateShareLink(req.user!.id, bookingId);

    res.status(201).json({
      success: true,
      data: link,
      message: 'Share this link with your trusted contact. It expires when your booking ends.',
    });
  }),
);

// ── GET /tips ──────────────────────────────────────────────────────────────

router.get(
  '/tips',
  asyncHandler(async (_req: Request, res: Response) => {
    const tips = safetyService.getSafetyGuidelines();
    res.status(200).json({ success: true, data: tips });
  }),
);

// ── POST /report ───────────────────────────────────────────────────────────

const ReportSchema = z.object({
  targetUserId: z.string().regex(/^[0-9a-fA-F]{24}$/),
  context: z.enum(['PROFILE', 'BOOKING', 'CHAT', 'REVIEW']),
  reason: z.enum([
    'SEXUAL_SOLICITATION', 'CONTACT_SHARING', 'PAYMENT_BYPASS',
    'HARASSMENT', 'FRAUD', 'INAPPROPRIATE_CONTENT', 'SAFETY_CONCERN',
    'NO_SHOW', 'VENUE_VIOLATION', 'UNDERAGE', 'DRUG_ALCOHOL', 'OTHER',
  ]),
  details: z.string().min(10).max(3000),
  evidenceUrls: z.array(z.string().url()).max(5).optional(),
  bookingId: z.string().regex(/^[0-9a-fA-F]{24}$/).optional(),
  messageId: z.string().regex(/^[0-9a-fA-F]{24}$/).optional(),
});

router.post(
  '/report',
  asyncHandler(async (req: Request, res: Response) => {
    const { targetUserId, context, reason, details, evidenceUrls, bookingId, messageId } = ReportSchema.parse(req.body);
    const report = await moderationService.submitReport({
      reporterId: req.user!.id,
      targetUserId,
      context,
      reason,
      details,
      ...(evidenceUrls ? { evidenceUrls } : {}),
      ...(bookingId ? { bookingId } : {}),
      ...(messageId ? { messageId } : {}),
    });

    res.status(201).json({
      success: true,
      message: 'Your report has been submitted. Our safety team will review it within the SLA.',
      data: { reportId: report._id },
    });
  }),
);

// ── POST /block/:userId ────────────────────────────────────────────────────

router.post(
  '/block/:userId',
  asyncHandler(async (req: Request, res: Response) => {
    await moderationService.blockUser(req.user!.id, req.params['userId']!);
    res.status(200).json({ success: true, message: 'User blocked successfully.' });
  }),
);

// ── DELETE /block/:userId ──────────────────────────────────────────────────

router.delete(
  '/block/:userId',
  asyncHandler(async (req: Request, res: Response) => {
    await moderationService.unblockUser(req.user!.id, req.params['userId']!);
    res.status(200).json({ success: true, message: 'User unblocked.' });
  }),
);

// ── GET /blocks ────────────────────────────────────────────────────────────

router.get(
  '/blocks',
  asyncHandler(async (req: Request, res: Response) => {
    const blocks = await moderationService.getBlockList(req.user!.id);
    res.status(200).json({ success: true, data: blocks });
  }),
);

// ── GET /share-link/:bookingId (legacy authenticated path) ─────────────────

router.get(
  '/share-link/:bookingId',
  asyncHandler(async (req: Request, res: Response) => {
    const link = await safetyService.generateShareLink(
      req.user!.id,
      req.params['bookingId']!,
    );
    res.status(200).json({ success: true, data: link });
  }),
);

export default router;
