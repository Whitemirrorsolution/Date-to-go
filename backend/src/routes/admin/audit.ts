import { Router, type Request, type Response } from 'express';
import { asyncHandler } from '../../utils/asyncHandler.js';
import { AuditLog } from '../../models/AuditLog.js';

const router: Router = Router();

router.get(
  '/',
  asyncHandler(async (req: Request, res: Response) => {
    const limit = Math.min(parseInt(req.query['limit'] as string) || 50, 100);
    const logs = await AuditLog.find()
      .populate('actorId', 'email role')
      .sort({ createdAt: -1 })
      .limit(limit);
      
    res.status(200).json({ success: true, data: logs });
  })
);

export default router;
