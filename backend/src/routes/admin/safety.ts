/**
 * Admin Safety & Reports routes — /api/v1/admin/safety
 *
 * - GET  /escalations          — Active SOS escalations (SafetyChecks)
 * - POST /:id/resolve          — Resolve a safety escalation
 * - GET  /reports              — Report queue with SLA timer info
 * - POST /reports/:id/review   — Change status + assign
 * - POST /reports/:id/resolve  — Resolve with decision + optional user action
 * - GET  /reports/sla-breaches — Reports past their SLA deadline
 */
import { Router, type Request, type Response } from 'express';
import { z } from 'zod';
import { asyncHandler } from '../../utils/asyncHandler.js';
import { SafetyCheck } from '../../models/SafetyCheck.js';
import { Report } from '../../models/Report.js';
import { User } from '../../models/User.js';
import { AuditLog } from '../../models/AuditLog.js';
import { Notification } from '../../models/Notification.js';
import { AppError } from '../../utils/AppError.js';

const router: Router = Router();

// ── GET /escalations ───────────────────────────────────────────────────────

router.get(
  '/escalations',
  asyncHandler(async (req: Request, res: Response) => {
    const { status = 'ESCALATED' } = req.query;
    const escalations = await SafetyCheck.find({ status })
      .populate('bookingId')
      .populate('triggerUserId', 'email fullName phone')
      .sort({ createdAt: -1 });
    res.json({ success: true, data: escalations });
  }),
);

// ── POST /:id/resolve ──────────────────────────────────────────────────────

router.post(
  '/:id/resolve',
  asyncHandler(async (req: Request, res: Response) => {
    const { resolutionNote } = z.object({ resolutionNote: z.string() }).parse(req.body);
    const check = await SafetyCheck.findById(req.params['id']);
    if (!check) throw new AppError('Safety check not found', 404);

    check.status = 'RESOLVED';
    check.resolutionNote = resolutionNote;
    check.resolvedAt = new Date();
    check.resolvedBy = req.user!.id as any;
    await check.save();

    res.json({ success: true, message: 'Safety escalation resolved', data: check });
  }),
);

// ── GET /reports ───────────────────────────────────────────────────────────

router.get(
  '/reports',
  asyncHandler(async (req: Request, res: Response) => {
    const { status, priority, page = '1', limit = '20' } = req.query;

    const filter: Record<string, any> = {};
    if (status) filter['status'] = status;
    if (priority) filter['priority'] = priority;

    const now = new Date();
    const skip = (parseInt(page as string) - 1) * parseInt(limit as string);

    const [reports, total] = await Promise.all([
      Report.find(filter)
        .populate('reporterId', 'email fullName')
        .populate('targetUserId', 'email fullName status')
        .populate('bookingId', 'startAt endAt meetingPlace status')
        .sort({ priority: -1, createdAt: -1 })
        .skip(skip)
        .limit(parseInt(limit as string)),
      Report.countDocuments(filter),
    ]);

    // Annotate with SLA breach info
    const annotated = reports.map(r => ({
      ...r.toObject(),
      slaBreach: r.slaDeadline ? r.slaDeadline < now && r.status === 'OPEN' : false,
      slaMinutesLeft: r.slaDeadline
        ? Math.max(0, Math.floor((r.slaDeadline.getTime() - now.getTime()) / 60000))
        : null,
    }));

    res.json({ success: true, data: annotated, total, page: parseInt(page as string) });
  }),
);

// ── GET /reports/sla-breaches ──────────────────────────────────────────────

router.get(
  '/reports/sla-breaches',
  asyncHandler(async (_req: Request, res: Response) => {
    const breaches = await Report.find({
      status: { $in: ['OPEN', 'REVIEWING'] },
      slaDeadline: { $lt: new Date() },
    })
      .populate('reporterId', 'email fullName')
      .populate('targetUserId', 'email fullName')
      .sort({ slaDeadline: 1 });

    res.json({ success: true, data: breaches, count: breaches.length });
  }),
);

// ── POST /reports/:id/review ───────────────────────────────────────────────

router.post(
  '/reports/:id/review',
  asyncHandler(async (req: Request, res: Response) => {
    const { note } = z.object({ note: z.string().optional() }).parse(req.body);
    const report = await Report.findById(req.params['id']);
    if (!report) throw new AppError('Report not found', 404);

    report.status = 'REVIEWING';
    report.assignedTo = req.user!.id as any;
    report.decisionLog.push({
      action: 'REVIEW_STARTED',
      by: req.user!.id as any,
      at: new Date(),
      ...(note ? { note } : {}),
    } as any);
    await report.save();

    res.json({ success: true, data: report });
  }),
);

// ── POST /reports/:id/resolve ──────────────────────────────────────────────

const ResolveSchema = z.object({
  resolution: z.string().min(5),
  action: z.enum(['NO_ACTION', 'WARN_USER', 'SUSPEND_USER', 'BAN_USER', 'DISMISS']).default('NO_ACTION'),
  note: z.string().optional(),
});

router.post(
  '/reports/:id/resolve',
  asyncHandler(async (req: Request, res: Response) => {
    const { resolution, action, note } = ResolveSchema.parse(req.body);
    const report = await Report.findById(req.params['id']);
    if (!report) throw new AppError('Report not found', 404);

    report.status = action === 'DISMISS' ? 'DISMISSED' : 'RESOLVED';
    report.resolution = resolution;
    report.resolvedAt = new Date();
    report.resolvedBy = req.user!.id as any;
    report.decisionLog.push({
      action,
      by: req.user!.id as any,
      at: new Date(),
      ...(note ? { note } : {}),
    } as any);
    await report.save();

    // Apply user action
    if (action === 'SUSPEND_USER') {
      await User.findByIdAndUpdate(report.targetUserId, { status: 'SUSPENDED' });
      await Notification.create({
        userId: report.targetUserId,
        title: 'Account Suspended',
        body: 'Your account has been suspended following a safety review. You may appeal via the Help section.',
        type: 'SYSTEM',
      });
    } else if (action === 'BAN_USER') {
      await User.findByIdAndUpdate(report.targetUserId, { status: 'DELETED' });
    } else if (action === 'WARN_USER') {
      await Notification.create({
        userId: report.targetUserId,
        title: 'Policy Warning',
        body: 'You have received a safety warning from the Date to Go team. Further violations may result in suspension.',
        type: 'SYSTEM',
      });
    }

    // Notify reporter
    await Notification.create({
      userId: report.reporterId,
      title: 'Report Update',
      body: 'Your report has been reviewed and action has been taken by our safety team. Thank you for keeping our community safe.',
      type: 'SYSTEM',
    });

    await AuditLog.create({
      userId: req.user!.id,
      action: 'REPORT_RESOLVED',
      resourceType: 'Report',
      resourceId: report._id.toString(),
      metadata: { action, resolution },
    });

    res.json({ success: true, message: 'Report resolved.', data: report });
  }),
);

export default router;
