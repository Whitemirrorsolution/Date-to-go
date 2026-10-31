/**
 * Plans routes — /api/v1/plans
 *
 * Public:  GET  /             — Get active plans (filtered by ?audience=USER|PARTNER)
 *          GET  /:id          — Get plan by ID
 * Admin:   POST /             — Create new plan
 *          PATCH /:id         — Update plan
 *          DELETE /:id        — Deactivate plan
 */
import { Router } from 'express';
import { z } from 'zod';
import { Plan, type PlanAudience } from '../models/Plan.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { requireAuth, requireRole } from '../middlewares/auth.js';
import { AppError } from '../utils/AppError.js';

const router: Router = Router();

// ── Validation schemas ─────────────────────────────────────────────────────

const CreatePlanSchema = z.object({
  name: z.string().min(2).max(100),
  audience: z.enum(['SEEKER', 'PARTNER', 'BOTH'] as const),
  pricePaise: z.number().int().min(0),
  durationDays: z.number().int().min(1),
  features: z.array(z.string()).default([]),
  bookingLimit: z.number().int().min(0).default(0),
  isActive: z.boolean().default(true),
});

const UpdatePlanSchema = CreatePlanSchema.partial();

// ── GET / — List plans ─────────────────────────────────────────────────────

router.get(
  '/',
  asyncHandler(async (req, res) => {
    const { audience, all } = req.query;

    const filter: Record<string, unknown> = {};

    if (audience && (audience === 'SEEKER' || audience === 'PARTNER' || audience === 'BOTH')) {
      filter['audience'] = audience as PlanAudience;
    }

    // Only admins can see inactive plans via ?all=true
    if (!all) {
      filter['isActive'] = true;
    }

    const plans = await Plan.find(filter).sort({ pricePaise: 1 });

    res.status(200).json({
      success: true,
      data: plans,
    });
  }),
);

// ── GET /:id — Get single plan ─────────────────────────────────────────────

router.get(
  '/:id',
  asyncHandler(async (req, res) => {
    const plan = await Plan.findById(req.params['id']);
    if (!plan) {
      throw new AppError('Plan not found', 404, 'PLAN_NOT_FOUND');
    }

    res.status(200).json({
      success: true,
      data: plan,
    });
  }),
);

// ── POST / — Create plan (Admin only) ──────────────────────────────────────

router.post(
  '/',
  requireAuth,
  requireRole('ADMIN'),
  asyncHandler(async (req, res) => {
    const dto = CreatePlanSchema.parse(req.body);
    const plan = await Plan.create(dto);

    res.status(201).json({
      success: true,
      message: 'Plan created successfully',
      data: plan,
    });
  }),
);

// ── PATCH /:id — Update plan (Admin only) ──────────────────────────────────

router.patch(
  '/:id',
  requireAuth,
  requireRole('ADMIN'),
  asyncHandler(async (req, res) => {
    const dto = UpdatePlanSchema.parse(req.body);
    const plan = await Plan.findByIdAndUpdate(req.params['id'], dto, {
      new: true,
      runValidators: true,
    });

    if (!plan) {
      throw new AppError('Plan not found', 404, 'PLAN_NOT_FOUND');
    }

    res.status(200).json({
      success: true,
      message: 'Plan updated successfully',
      data: plan,
    });
  }),
);

// ── DELETE /:id — Deactivate plan (Admin only) ──────────────────────────────

router.delete(
  '/:id',
  requireAuth,
  requireRole('ADMIN'),
  asyncHandler(async (req, res) => {
    const plan = await Plan.findByIdAndUpdate(
      req.params['id'],
      { isActive: false },
      { new: true },
    );

    if (!plan) {
      throw new AppError('Plan not found', 404, 'PLAN_NOT_FOUND');
    }

    res.status(200).json({
      success: true,
      message: 'Plan deactivated successfully',
      data: plan,
    });
  }),
);

export default router;
