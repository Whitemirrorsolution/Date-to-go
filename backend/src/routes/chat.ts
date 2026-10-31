/**
 * Safe Chat routes — /api/v1/bookings/:bookingId/messages
 *
 * Rules:
 * - State-bound windows (REQUESTED: 1 note max 150; ACCEPTED: quick replies only; PAID/IN_PROGRESS: open text max 300; COMPLETED: grace period).
 * - Rate limited to 20 messages/hour per user per conversation.
 * - Text-only, blocks phone numbers, emails, URLs, UPI handles, and off-app solicitation.
 * - Flags suspicious messages for admin moderation.
 */
import { Router, type Request, type Response } from 'express';
import { z } from 'zod';
import { asyncHandler } from '../utils/asyncHandler.js';
import { requireAuth } from '../middlewares/auth.js';
import { Booking } from '../models/Booking.js';
import { Message } from '../models/Message.js';
import { moderationService } from '../services/ModerationService.js';
import { chatService } from '../services/ChatService.js';
import { AppError } from '../utils/AppError.js';

const router: Router = Router({ mergeParams: true });

router.use(requireAuth);

const PostMessageSchema = z.object({
  text: z.string().max(1000).optional(),
  kind: z.enum(['TEXT', 'QUICK_REPLY', 'SYSTEM', 'LOCATION_PIN']).default('TEXT'),
  quickReplyKey: z.string().optional(),
});

// Helper to verify participant and chat time window
async function verifyChatAccess(bookingId: string, user: { id: string; roles?: string[] }) {
  const booking = await Booking.findById(bookingId);
  if (!booking) {
    throw new AppError('Booking not found', 404, 'BOOKING_NOT_FOUND');
  }

  const isAdmin = user.roles?.includes('ADMIN' as any);
  const isSeeker = booking.clientId.toString() === user.id;
  const isPartner = booking.partnerId.toString() === user.id;

  if (!isSeeker && !isPartner && !isAdmin) {
    throw new AppError('Unauthorized to access this chat', 403, 'FORBIDDEN');
  }

  return { booking, isSeeker, isPartner, isAdmin, recipientId: isSeeker ? booking.partnerId.toString() : booking.clientId.toString() };
}

// ── GET /window — Get Chat Window State & Permissions ──────────────────────

router.get(
  '/window',
  asyncHandler(async (req: Request, res: Response) => {
    const bookingId = req.params['bookingId']!;
    const { booking } = await verifyChatAccess(bookingId, req.user!);
    const window = await chatService.evaluateWindow(booking, req.user!);
    const role = window.isSeeker ? 'SEEKER' : 'PARTNER';
    const templates = await chatService.getTemplates(booking.stage, role);

    return res.status(200).json({
      success: true,
      data: {
        status: window.permissions.status,
        permissions: window.permissions,
        templates,
      },
    });
  })
);

// ── GET /templates — Get Allowed Templates ────────────────────────────────

router.get(
  '/templates',
  asyncHandler(async (req: Request, res: Response) => {
    const bookingId = req.params['bookingId']!;
    const { booking, isSeeker } = await verifyChatAccess(bookingId, req.user!);
    const role = isSeeker ? 'SEEKER' : 'PARTNER';
    const templates = await chatService.getTemplates(booking.stage, role);

    return res.status(200).json({
      success: true,
      data: templates,
    });
  })
);

// ── GET / — Get Message History ────────────────────────────────────────────

router.get(
  '/',
  asyncHandler(async (req: Request, res: Response) => {
    const bookingId = req.params['bookingId']!;
    await verifyChatAccess(bookingId, req.user!);

    const messages = await Message.find({ bookingId })
      .sort({ createdAt: 1 })
      .limit(200);

    return res.status(200).json({
      success: true,
      data: messages,
    });
  })
);

// ── POST / — Send Message (State & Moderation Guarded) ─────────────────────

router.post(
  '/',
  asyncHandler(async (req: Request, res: Response) => {
    const bookingId = req.params['bookingId']!;
    const parsed = PostMessageSchema.parse(req.body);

    const message = await chatService.sendMessage({
      bookingId,
      user: { id: req.user!.id, roles: req.user!.roles },
      kind: parsed.kind,
      text: parsed.text,
      quickReplyKey: parsed.quickReplyKey,
    });

    return res.status(201).json({
      success: true,
      data: message,
    });
  })
);

// ── PATCH /:messageId — Edit Message ──────────────────────────────────────

router.patch(
  '/:messageId',
  asyncHandler(async (req: Request, res: Response) => {
    const bookingId = req.params['bookingId']!;
    const messageId = req.params['messageId']!;
    await verifyChatAccess(bookingId, req.user!);
    const { text } = z.object({ text: z.string().min(1).max(300) }).parse(req.body);

    const message = await Message.findOne({ _id: messageId, bookingId });
    if (!message) throw new AppError('Message not found', 404, 'NOT_FOUND');

    const isAdmin = req.user!.roles?.includes('ADMIN' as any);
    if (message.senderId.toString() !== req.user!.id && !isAdmin) {
      throw new AppError("Cannot edit someone else's message", 403, 'FORBIDDEN');
    }

    const modResult = await moderationService.evaluateChatMessage({
      text,
      senderId: req.user!.id,
      bookingId,
      conversationId: message.conversationId?.toString(),
    });

    if (modResult.decision === 'BLOCK') {
      throw new AppError(
        modResult.userNotice ||
          'Message blocked: Sharing contact details, phone numbers, or off-platform payment info is prohibited.',
        400,
        'PROHIBITED_CONTENT'
      );
    }

    message.text = text.trim();
    message.flagged = modResult.decision === 'ALLOW_AND_FLAG';
    message.moderation = {
      decision: modResult.decision,
      score: modResult.score,
      ruleIds: modResult.ruleIds,
      lexiconVersion: 1,
    };
    await message.save();

    return res.status(200).json({ success: true, data: message });
  })
);

// ── DELETE /:messageId — Delete Message ────────────────────────────────────

router.delete(
  '/:messageId',
  asyncHandler(async (req: Request, res: Response) => {
    const bookingId = req.params['bookingId']!;
    const messageId = req.params['messageId']!;
    await verifyChatAccess(bookingId, req.user!);

    const message = await Message.findOne({ _id: messageId, bookingId });
    if (!message) throw new AppError('Message not found', 404, 'NOT_FOUND');

    const isAdmin = req.user!.roles?.includes('ADMIN' as any);
    if (message.senderId.toString() !== req.user!.id && !isAdmin) {
      throw new AppError("Cannot delete someone else's message", 403, 'FORBIDDEN');
    }

    await Message.deleteOne({ _id: message._id });
    return res.status(200).json({ success: true, message: 'Message deleted' });
  })
);

export default router;
