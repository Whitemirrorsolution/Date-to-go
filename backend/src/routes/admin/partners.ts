import { Router, type Request, type Response } from 'express';
import { z } from 'zod';
import { asyncHandler } from '../../utils/asyncHandler.js';
import { PartnerProfile } from '../../models/PartnerProfile.js';
import { AuditLog } from '../../models/AuditLog.js';
import { AppError } from '../../utils/AppError.js';

const router: Router = Router();

// GET /api/v1/admin/partners
router.get(
  '/',
  asyncHandler(async (_req: Request, res: Response) => {
    const profiles = await PartnerProfile.find().populate('userId', 'email status kycStatus');
    res.status(200).json({ success: true, data: profiles });
  })
);

const ApprovePartnerSchema = z.object({
  approvalStatus: z.enum(['APPROVED', 'REJECTED']),
  reason: z.string().optional(),
});

// PATCH /api/v1/admin/partners/:id/approval
router.patch(
  '/:id/approval',
  asyncHandler(async (req: Request, res: Response) => {
    const { approvalStatus, reason } = ApprovePartnerSchema.parse(req.body);
    const profile = await PartnerProfile.findById(req.params['id']);
    
    if (!profile) throw new AppError('Profile not found', 404, 'NOT_FOUND');

    profile.approvalStatus = approvalStatus;
    if (reason) profile.rejectionReason = reason;
    if (approvalStatus === 'APPROVED') profile.isListed = true;

    await profile.save();

    await AuditLog.create({
      actorId: req.user!.id,
      action: 'PARTNER_APPROVAL_CHANGED',
      entityType: 'PartnerProfile',
      entityId: profile._id,
      meta: { approvalStatus, reason },
    });

    res.status(200).json({ success: true, data: profile });
  })
);

// TEMPORARY: POST /api/v1/admin/partners/:id/force-approve
// Used for E2E testing to bypass KYC and manual review stages
router.post(
  '/:id/force-approve',
  asyncHandler(async (req: Request, res: Response) => {
    // Note: Assuming SUPER_ADMIN role check is done upstream, but we can double check
    if (!req.user!.roles.includes('ADMIN')) {
      throw new AppError('Unauthorized', 403, 'UNAUTHORIZED');
    }

    const { User } = await import('../../models/User.js');
    
    // id could be userId or profileId. Let's assume it's userId for this helper.
    let profile = await PartnerProfile.findOne({ userId: req.params['id'] });
    if (!profile) throw new AppError('Profile not found', 404, 'NOT_FOUND');

    profile.approvalStatus = 'APPROVED';
    profile.isListed = true;
    await profile.save();

    await User.findByIdAndUpdate(req.params['id'], { kycStatus: 'VERIFIED' });

    await AuditLog.create({
      actorId: req.user!.id,
      action: 'TEMPORARY_PARTNER_FORCE_APPROVED',
      entityType: 'PartnerProfile',
      entityId: profile._id,
      meta: { note: 'Forced approval via E2E temporary endpoint' },
    });

    res.status(200).json({ success: true, message: 'Partner force approved for testing.' });
  })
);

export default router;
