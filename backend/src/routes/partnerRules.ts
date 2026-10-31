/**
 * Partner Auto-Rules routes — /api/v1/partner/rules
 *
 * Gated by: requireAuth + requireRole('PARTNER') + requireFeatureFlag('partner.autoRules')
 */
import { Router, type Request, type Response } from 'express';
import { z } from 'zod';
import { asyncHandler } from '../utils/asyncHandler.js';
import { requireAuth, requireRole } from '../middlewares/auth.js';
import { requireFeatureFlag, getSetting } from '../utils/featureFlags.js';
import { PartnerRule } from '../models/PartnerRule.js';
import { autoRulesService } from '../services/AutoRulesService.js';
import { AppError } from '../utils/AppError.js';

const router: Router = Router();

router.use(requireAuth, requireRole('PARTNER'), requireFeatureFlag('partner.autoRules'));

const RuleConditionsSchema = z.object({
  minLeadTimeHours: z.number().min(0).max(720).optional(),
  maxDistanceKm: z.number().min(1).max(500).optional(),
  allowedPincodes: z.array(z.string().regex(/^\d{6}$/, 'Must be 6-digit Indian PIN code')).optional(),
  allowedCategoryIds: z.array(z.string().regex(/^[0-9a-fA-F]{24}$/)).optional(),
  minDurationMins: z.number().min(15).max(1440).optional(),
  maxDurationMins: z.number().min(15).max(1440).optional(),
  blockedTimeRanges: z
    .array(
      z.object({
        start: z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/),
        end: z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/),
        days: z.array(z.string()).optional(),
      })
    )
    .optional(),
  maxDailyBookings: z.number().min(1).max(20).optional(),
  maxWeeklyBookings: z.number().min(1).max(100).optional(),
  verifiedSeekersOnly: z.boolean().optional(),
  minSeekerReliability: z.enum(['HIGH', 'MEDIUM']).optional(),
  noUpheldStrikesLast12Months: z.boolean().optional(),
});

const CreateRuleSchema = z.object({
  name: z.string().min(2).max(120),
  description: z.string().max(500).optional(),
  priority: z.number().min(1).max(1000).optional(),
  enabled: z.boolean().default(true),
  action: z.enum(['AUTO_DECLINE', 'AUTO_ACCEPT']),
  conditions: RuleConditionsSchema,
});

const UpdateRuleSchema = CreateRuleSchema.partial();

const SimulateRuleSchema = z.object({
  startAt: z.string().datetime(),
  durationMins: z.number().min(15).max(1440),
  categoryId: z.string().regex(/^[0-9a-fA-F]{24}$/),
  venuePincode: z.string().regex(/^\d{6}$/).optional(),
  seekerId: z.string().regex(/^[0-9a-fA-F]{24}$/).optional(),
});

// ── GET / — List all partner rules ──────────────────────────────────────────
router.get(
  '/',
  asyncHandler(async (req: Request, res: Response) => {
    const rules = await PartnerRule.find({ partnerId: req.user!.id }).sort({ priority: 1, createdAt: 1 });
    res.json({ success: true, data: rules });
  })
);

// ── POST / — Create a new rule ─────────────────────────────────────────────
router.post(
  '/',
  asyncHandler(async (req: Request, res: Response) => {
    const dto = CreateRuleSchema.parse(req.body);

    // Enforce admin minimum lead time cap if partner specified a lead time
    if (dto.conditions.minLeadTimeHours != null) {
      const adminMinLeadTime = await getSetting<number>('autoRules.minLeadTimeHoursMin', 2);
      if (dto.conditions.minLeadTimeHours < adminMinLeadTime) {
        throw new AppError(
          `Minimum lead time cannot be less than system limit of ${adminMinLeadTime} hours`,
          400,
          'INVALID_LEAD_TIME'
        );
      }
    }

    // Determine priority if not specified
    let priority = dto.priority;
    if (priority == null) {
      const highest = await PartnerRule.findOne({ partnerId: req.user!.id }).sort({ priority: -1 });
      priority = (highest?.priority ?? 0) + 10;
    }

    const rule = await PartnerRule.create({
      partnerId: req.user!.id,
      name: dto.name,
      description: dto.description,
      priority,
      enabled: dto.enabled ?? true,
      action: dto.action,
      conditions: dto.conditions,
    });

    res.status(201).json({
      success: true,
      message: 'Automation rule created successfully',
      data: rule,
    });
  })
);

// ── PUT /:id — Update an existing rule ─────────────────────────────────────
router.put(
  '/:id',
  asyncHandler(async (req: Request, res: Response) => {
    const dto = UpdateRuleSchema.parse(req.body);

    const rule = await PartnerRule.findOne({ _id: req.params.id, partnerId: req.user!.id });
    if (!rule) throw new AppError('Rule not found', 404, 'NOT_FOUND');

    if (dto.conditions?.minLeadTimeHours != null) {
      const adminMinLeadTime = await getSetting<number>('autoRules.minLeadTimeHoursMin', 2);
      if (dto.conditions.minLeadTimeHours < adminMinLeadTime) {
        throw new AppError(
          `Minimum lead time cannot be less than system limit of ${adminMinLeadTime} hours`,
          400,
          'INVALID_LEAD_TIME'
        );
      }
    }

    if (dto.name !== undefined) rule.name = dto.name;
    if (dto.description !== undefined) rule.description = dto.description;
    if (dto.priority !== undefined) rule.priority = dto.priority;
    if (dto.enabled !== undefined) rule.enabled = dto.enabled;
    if (dto.action !== undefined) rule.action = dto.action;
    if (dto.conditions !== undefined) {
      rule.conditions = { ...rule.conditions, ...dto.conditions } as any;
    }

    await rule.save();

    res.json({
      success: true,
      message: 'Rule updated successfully',
      data: rule,
    });
  })
);

// ── DELETE /:id — Delete a rule ───────────────────────────────────────────
router.delete(
  '/:id',
  asyncHandler(async (req: Request, res: Response) => {
    const rule = await PartnerRule.findOneAndDelete({ _id: req.params.id, partnerId: req.user!.id });
    if (!rule) throw new AppError('Rule not found', 404, 'NOT_FOUND');

    res.json({
      success: true,
      message: 'Rule deleted successfully',
    });
  })
);

// ── POST /reorder — Reorder priorities ────────────────────────────────────
router.post(
  '/reorder',
  asyncHandler(async (req: Request, res: Response) => {
    const { ruleIds } = z.object({ ruleIds: z.array(z.string()) }).parse(req.body);

    const bulkOps = ruleIds.map((id, index) => ({
      updateOne: {
        filter: { _id: id, partnerId: req.user!.id },
        update: { $set: { priority: (index + 1) * 10 } },
      },
    }));

    if (bulkOps.length > 0) {
      await PartnerRule.bulkWrite(bulkOps);
    }

    const updatedRules = await PartnerRule.find({ partnerId: req.user!.id }).sort({ priority: 1 });
    res.json({ success: true, message: 'Rules reordered successfully', data: updatedRules });
  })
);

// ── POST /simulate — Test / simulate rules ────────────────────────────────
router.post(
  '/simulate',
  asyncHandler(async (req: Request, res: Response) => {
    const dto = SimulateRuleSchema.parse(req.body);

    const startAt = new Date(dto.startAt);
    const endAt = new Date(startAt.getTime() + dto.durationMins * 60 * 1000);

    const simulationSteps = await autoRulesService.simulateRules(req.user!.id, {
      partnerId: req.user!.id,
      seekerId: dto.seekerId || req.user!.id, // fallback to self if testing anonymously
      startAt,
      endAt,
      durationMins: dto.durationMins,
      categoryId: dto.categoryId,
      venuePincode: dto.venuePincode,
    });

    res.json({
      success: true,
      data: {
        steps: simulationSteps,
        totalRulesEvaluated: simulationSteps.length,
        matchedRule: simulationSteps.find((s) => s.overallMatch),
      },
    });
  })
);

export default router;
