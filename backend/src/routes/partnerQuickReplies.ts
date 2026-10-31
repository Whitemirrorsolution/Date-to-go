/**
 * Partner Quick Replies routes — /api/v1/partner/quick-replies
 *
 * Gated by: requireAuth + requireRole('PARTNER') + requireFeatureFlag('partner.quickReplies')
 */
import { Router, type Request, type Response } from 'express';
import { z } from 'zod';
import { asyncHandler } from '../utils/asyncHandler.js';
import { requireAuth, requireRole } from '../middlewares/auth.js';
import { requireFeatureFlag } from '../utils/featureFlags.js';
import { PartnerQuickReply } from '../models/PartnerQuickReply.js';
import { moderationService } from '../services/ModerationService.js';
import { AppError } from '../utils/AppError.js';

const router: Router = Router();

router.use(requireAuth, requireRole('PARTNER'), requireFeatureFlag('partner.quickReplies'));

const QuickReplySchema = z.object({
  type: z.enum(['ACCEPT_NOTE', 'DECLINE_REASON', 'CHAT_REPLY']),
  title: z.string().min(1).max(100),
  content: z.string().min(1).max(1000),
  shortcut: z.string().max(30).optional(),
  order: z.number().optional(),
  isDefault: z.boolean().optional(),
});

// ── GET / — List partner quick replies ─────────────────────────────────────
router.get(
  '/',
  asyncHandler(async (req: Request, res: Response) => {
    const { type } = req.query;
    const filter: Record<string, unknown> = { partnerId: req.user!.id };
    if (type && typeof type === 'string') {
      filter['type'] = type;
    }

    const replies = await PartnerQuickReply.find(filter).sort({ order: 1, createdAt: -1 });
    res.json({ success: true, data: replies });
  })
);

// ── POST / — Create quick reply ───────────────────────────────────────────
router.post(
  '/',
  asyncHandler(async (req: Request, res: Response) => {
    const dto = QuickReplySchema.parse(req.body);

    // Platform Safety: Enforce 100% platonic check and anti-circumvention on templates
    const modResult = moderationService.filterText(dto.content);
    if (!modResult.isClean) {
      throw new AppError(
        'Quick reply contains prohibited content, contact info, or off-platform handles.',
        400,
        'PROHIBITED_CONTENT'
      );
    }

    const reply = await PartnerQuickReply.create({
      partnerId: req.user!.id,
      type: dto.type,
      title: dto.title,
      content: dto.content,
      shortcut: dto.shortcut,
      order: dto.order ?? 0,
      isDefault: dto.isDefault ?? false,
    });

    res.status(201).json({
      success: true,
      message: 'Quick reply saved successfully',
      data: reply,
    });
  })
);

// ── PUT /:id — Update quick reply ─────────────────────────────────────────
router.put(
  '/:id',
  asyncHandler(async (req: Request, res: Response) => {
    const dto = QuickReplySchema.partial().parse(req.body);

    const reply = await PartnerQuickReply.findOne({ _id: req.params.id, partnerId: req.user!.id });
    if (!reply) throw new AppError('Quick reply not found', 404, 'NOT_FOUND');

    if (dto.content) {
      const modResult = moderationService.filterText(dto.content);
      if (!modResult.isClean) {
        throw new AppError(
          'Quick reply contains prohibited content, contact info, or off-platform handles.',
          400,
          'PROHIBITED_CONTENT'
        );
      }
      reply.content = dto.content;
    }

    if (dto.title !== undefined) reply.title = dto.title;
    if (dto.type !== undefined) reply.type = dto.type;
    if (dto.shortcut !== undefined) reply.shortcut = dto.shortcut;
    if (dto.order !== undefined) reply.order = dto.order;
    if (dto.isDefault !== undefined) reply.isDefault = dto.isDefault;

    await reply.save();

    res.json({
      success: true,
      message: 'Quick reply updated successfully',
      data: reply,
    });
  })
);

// ── DELETE /:id — Delete quick reply ──────────────────────────────────────
router.delete(
  '/:id',
  asyncHandler(async (req: Request, res: Response) => {
    const reply = await PartnerQuickReply.findOneAndDelete({ _id: req.params.id, partnerId: req.user!.id });
    if (!reply) throw new AppError('Quick reply not found', 404, 'NOT_FOUND');

    res.json({
      success: true,
      message: 'Quick reply deleted successfully',
    });
  })
);

// ── POST /:id/use — Increment usage count ──────────────────────────────────
router.post(
  '/:id/use',
  asyncHandler(async (req: Request, res: Response) => {
    const reply = await PartnerQuickReply.findOneAndUpdate(
      { _id: req.params.id, partnerId: req.user!.id },
      { $inc: { useCount: 1 } },
      { new: true }
    );
    if (!reply) throw new AppError('Quick reply not found', 404, 'NOT_FOUND');

    res.json({ success: true, data: { useCount: reply.useCount } });
  })
);

export default router;
