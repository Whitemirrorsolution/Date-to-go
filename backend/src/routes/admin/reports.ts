import { Router, type Request, type Response } from 'express';
import { z } from 'zod';
import { asyncHandler } from '../../utils/asyncHandler.js';
import { Report } from '../../models/Report.js';
import { AppError } from '../../utils/AppError.js';

const router: Router = Router();

router.get(
  '/',
  asyncHandler(async (_req: Request, res: Response) => {
    const reports = await Report.find()
      .populate('reporterId', 'email')
      .populate('reportedUserId', 'email')
      .sort({ createdAt: -1 });
    res.status(200).json({ success: true, data: reports });
  })
);

const ResolveReportSchema = z.object({
  resolution: z.string().min(5),
});

router.post(
  '/:id/resolve',
  asyncHandler(async (req: Request, res: Response) => {
    const { resolution } = ResolveReportSchema.parse(req.body);
    const report = await Report.findById(req.params['id']);
    if (!report) throw new AppError('Report not found', 404, 'NOT_FOUND');

    report.status = 'RESOLVED';
    report.resolution = resolution;
    report.resolvedAt = new Date();
    report.resolvedBy = req.user!.id as any;

    await report.save();
    res.status(200).json({ success: true, data: report });
  })
);

export default router;
