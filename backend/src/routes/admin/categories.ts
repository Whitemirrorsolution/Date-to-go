import { Router, type Router as ExpressRouter } from 'express';
import { z } from 'zod';
import { asyncHandler } from '../../utils/asyncHandler.js';
import { requireRole } from '../../middlewares/auth.js';
import { Category } from '../../models/Category.js';
import { AuditLog } from '../../models/AuditLog.js';
import { AppError } from '../../utils/AppError.js';

const router: ExpressRouter = Router();

// Validation schema per STAGE 1 requirements
const CategorySchema = z.object({
  name: z.string().min(2).max(100),
  slug: z.string().regex(/^[a-z0-9-]+$/),
  icon: z.string().min(1),
  description: z.string().min(5).max(500),
  accentColor: z.string().regex(/^#[0-9A-Fa-f]{6}$/).optional(),
  order: z.number().int().min(0).optional(),
  isActive: z.boolean().optional(),
  minRatePaise: z.number().int().min(100),
  maxRatePaise: z.number().int().min(100),
  defaultRatePaise: z.number().int().min(100),
  allowedDurationsMins: z.array(z.number().int().min(15)),
  requiresExtraKyc: z.boolean().optional(),
  allowClientHomeVenue: z.boolean().optional(),
  safetyNotes: z.string().optional(),
  cancellationPolicyRef: z.string().optional(),
  commissionRules: z.array(z.object({
    type: z.enum(['PERCENT', 'FLAT', 'MIXED']),
    percentBps: z.number().int().min(0).optional(),
    flatPaise: z.number().int().min(0).optional(),
    minFeePaise: z.number().int().min(0).optional(),
    maxFeePaise: z.number().int().min(0).optional(),
    gstOnFeeBps: z.number().int().min(0),
    effectiveFrom: z.string().datetime(),
  })).optional(),
});

// Helper to log audit
async function logAudit(actorId: string, action: string, targetId: string, before: any, after: any) {
  await AuditLog.create({
    actorId,
    action,
    entityType: 'CATEGORY',
    entityId: targetId,
    meta: { before, after },
  });
}

// ── GET /admin/categories ────────────────────────────────────────────────
router.get('/', requireRole(['ADMIN', 'MODERATOR', 'FINANCE']), asyncHandler(async (_req, res) => {
  const categories = await Category.find().sort({ order: 1, createdAt: -1 });
  res.json({ success: true, data: categories });
}));

// ── POST /admin/categories ───────────────────────────────────────────────
router.post('/', requireRole(['ADMIN', 'MODERATOR', 'FINANCE']), asyncHandler(async (req, res) => {
  // If request contains commission rules, user must be FINANCE or SUPER_ADMIN
  if (req.body.commissionRules && req.body.commissionRules.length > 0) {
    if (!req.user!.roles.includes('ADMIN') && !req.user!.roles.includes('FINANCE')) {
      throw new AppError('Only ADMIN or FINANCE can set commission rules', 403, 'FORBIDDEN');
    }
  }

  const data = CategorySchema.parse(req.body);
  const category = await Category.create(data);

  await logAudit(req.user!.id, 'CREATE_CATEGORY', category.id, null, category);

  res.status(201).json({ success: true, data: category });
}));

// ── PUT /admin/categories/:id ────────────────────────────────────────────
router.put('/:id', requireRole(['ADMIN', 'MODERATOR', 'FINANCE']), asyncHandler(async (req, res) => {
  const oldCategory = await Category.findById(req.params.id);
  if (!oldCategory) throw new AppError('Category not found', 404, 'NOT_FOUND');

  // If modifying commission, require FINANCE or SUPER_ADMIN
  if (req.body.commissionRules) {
    if (!req.user!.roles.includes('ADMIN') && !req.user!.roles.includes('FINANCE')) {
      throw new AppError('Only ADMIN or FINANCE can update commission rules', 403, 'FORBIDDEN');
    }
  }

  const data = CategorySchema.parse(req.body);
  const updated = await Category.findByIdAndUpdate(req.params.id, data, { new: true });

  await logAudit(req.user!.id, 'UPDATE_CATEGORY', updated!.id, oldCategory, updated);

  res.json({ success: true, data: updated });
}));

// ── PATCH /admin/categories/:id/activate ─────────────────────────────────
router.patch('/:id/activate', requireRole(['ADMIN', 'MODERATOR']), asyncHandler(async (req, res) => {
  const isActive = req.body.isActive === true;
  const oldCategory = await Category.findById(req.params.id);
  if (!oldCategory) throw new AppError('Category not found', 404, 'NOT_FOUND');

  const updated = await Category.findByIdAndUpdate(req.params.id, { isActive }, { new: true });
  await logAudit(req.user!.id, isActive ? 'ACTIVATE_CATEGORY' : 'DEACTIVATE_CATEGORY', updated!.id, { isActive: !isActive }, { isActive });

  res.json({ success: true, data: updated });
}));

export default router;
