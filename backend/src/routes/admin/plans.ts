import { Router, type Router as ExpressRouter } from 'express';
import { z } from 'zod';
import { asyncHandler } from '../../utils/asyncHandler.js';
import { requireRole } from '../../middlewares/auth.js';
import { Plan } from '../../models/Plan.js';
import { AuditLog } from '../../models/AuditLog.js';

const router: ExpressRouter = Router();

const PlanSchema = z.object({
  name: z.string().min(2).max(100),
  audience: z.enum(['SEEKER', 'PARTNER', 'BOTH']),
  pricePaise: z.number().int().min(0),
  durationDays: z.number().int().min(1),
  features: z.array(z.string()).default([]),
  bookingLimit: z.number().int().min(0).default(0),
  dailyRequestLimit: z.number().int().min(0).default(0),
  maxCategoriesAllowed: z.number().int().min(0).default(0),
  isActive: z.boolean().default(true),
});

router.get('/', requireRole(['ADMIN', 'MODERATOR']), asyncHandler(async (_req, res) => {
  const plans = await Plan.find().sort({ audience: 1, pricePaise: 1 });
  res.json({ success: true, data: plans });
}));

router.post('/', requireRole(['ADMIN']), asyncHandler(async (req, res) => {
  const data = PlanSchema.parse(req.body);
  const plan = await Plan.create(data);

  await AuditLog.create({
    actorId: req.user!.id,
    action: 'CREATE_PLAN',
    entityType: 'PLAN',
    entityId: plan.id,
    meta: data,
  });

  res.status(201).json({ success: true, data: plan });
}));

router.put('/:id', requireRole(['ADMIN']), asyncHandler(async (req, res) => {
  const data = PlanSchema.parse(req.body);
  const plan = await Plan.findByIdAndUpdate(req.params.id, data, { new: true });

  await AuditLog.create({
    actorId: req.user!.id,
    action: 'UPDATE_PLAN',
    entityType: 'PLAN',
    entityId: plan!.id,
    meta: data,
  });

  res.json({ success: true, data: plan });
}));

router.delete('/:id', requireRole(['ADMIN']), asyncHandler(async (req, res) => {
  const plan = await Plan.findById(req.params.id);
  if (plan) {
    plan.isActive = false;
    await plan.save();

    await AuditLog.create({
      actorId: req.user!.id,
      action: 'DEACTIVATE_PLAN',
      entityType: 'PLAN',
      entityId: plan.id,
    });
  }
  res.json({ success: true });
}));

export default router;
