import { Router, type Router as ExpressRouter } from 'express';
import { z } from 'zod';
import { asyncHandler } from '../../utils/asyncHandler.js';
import { requireRole } from '../../middlewares/auth.js';
import { AppSetting } from '../../models/AppSetting.js';
import { AuditLog } from '../../models/AuditLog.js';
import { AppError } from '../../utils/AppError.js';

const router: ExpressRouter = Router();

const SettingSchema = z.object({
  key: z.string().min(1),
  type: z.enum(['STRING', 'NUMBER', 'BOOLEAN', 'JSON']),
  value: z.any(),
  description: z.string().min(1),
  isPublic: z.boolean().default(false),
});

// Helper to log audit
async function logAudit(actorId: string, action: string, targetId: string, before: any, after: any) {
  await AuditLog.create({
    actorId,
    action,
    entityType: 'APP_SETTING',
    entityId: targetId,
    meta: { before, after },
  });
}

// ── GET /admin/settings ──────────────────────────────────────────────────
router.get('/', requireRole(['ADMIN']), asyncHandler(async (_req, res) => {
  const settings = await AppSetting.find().sort({ key: 1 });
  res.json({ success: true, data: settings });
}));

// ── POST /admin/settings ─────────────────────────────────────────────────
router.post('/', requireRole(['ADMIN']), asyncHandler(async (req, res) => {
  const data = SettingSchema.parse(req.body);
  const existing = await AppSetting.findOne({ key: data.key });
  if (existing) {
    throw new AppError('Setting with this key already exists', 400, 'BAD_REQUEST');
  }

  const setting = await AppSetting.create({
    ...data,
    updatedBy: req.user!.id,
  });

  await logAudit(req.user!.id, 'CREATE_SETTING', setting.id, null, setting);

  res.status(201).json({ success: true, data: setting });
}));

// ── PUT /admin/settings/:id ──────────────────────────────────────────────
router.put('/:id', requireRole(['ADMIN']), asyncHandler(async (req, res) => {
  const oldSetting = await AppSetting.findById(req.params.id);
  if (!oldSetting) throw new AppError('Setting not found', 404, 'NOT_FOUND');

  const data = SettingSchema.parse(req.body);

  const updated = await AppSetting.findByIdAndUpdate(
    req.params.id,
    { ...data, updatedBy: req.user!.id },
    { new: true }
  );

  await logAudit(req.user!.id, 'UPDATE_SETTING', updated!.id, oldSetting, updated);

  res.json({ success: true, data: updated });
}));

export default router;
