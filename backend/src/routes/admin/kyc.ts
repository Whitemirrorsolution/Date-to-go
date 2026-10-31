import { Router, type Router as ExpressRouter } from 'express';
import { z } from 'zod';
import { asyncHandler } from '../../utils/asyncHandler.js';
import { requireRole } from '../../middlewares/auth.js';
import { KycSubmission } from '../../models/KycSubmission.js';
import { User } from '../../models/User.js';
import { AppError } from '../../utils/AppError.js';
import { AuditLog } from '../../models/AuditLog.js';

const router: ExpressRouter = Router();

// Validation schema
const DecisionSchema = z.object({
  decision: z.enum(['APPROVE', 'REJECT', 'NEEDS_CHANGES']),
  reason: z.string().optional().or(z.literal('')),
  checklist: z.array(z.string()).optional(),
});

// ── GET /admin/kyc ────────────────────────────────────────────────────────
router.get('/', requireRole(['ADMIN', 'KYC_REVIEWER']), asyncHandler(async (req, res) => {
  const { status } = req.query;
  const filter: any = {};
  if (status) filter.status = status;

  const submissions = await KycSubmission.find(filter)
    .populate('partnerId', 'email displayName dob phone kycStatus')
    .sort({ createdAt: 1 })
    .limit(50);

  res.json({ success: true, data: submissions });
}));

// ── GET /admin/kyc/:id/documents/:docId/url ──────────────────────────────
router.get('/:id/documents/:docId/url', requireRole(['ADMIN', 'KYC_REVIEWER']), asyncHandler(async (req, res) => {
  const submission = await KycSubmission.findById(req.params.id);
  if (!submission) throw new AppError('Submission not found', 404, 'NOT_FOUND');

  const doc = submission.documents.find((item) =>
    String((item as typeof item & { _id?: { toString(): string } })._id) === req.params.docId,
  );
  if (!doc) throw new AppError('Document not found', 404, 'NOT_FOUND');

  // In real life, use AWS S3 getSignedUrl(doc.storageKey)
  // For dev, return a mock URL
  const mockUrl = `https://mock-s3-bucket.com/${doc.storageKey}?signature=XYZ&expires=300`;

  await AuditLog.create({
    actorId: req.user!.id,
    action: 'VIEW_KYC_DOCUMENT',
    entityType: 'KYC_SUBMISSION',
    entityId: submission.id,
    meta: { docId: req.params.docId, type: doc.type }
  });

  res.json({ success: true, url: mockUrl });
}));

// ── POST /admin/kyc/:id/decision ─────────────────────────────────────────
router.post('/:id/decision', requireRole(['ADMIN', 'KYC_REVIEWER']), asyncHandler(async (req, res) => {
  const { decision, reason } = DecisionSchema.parse(req.body);
  const submission = await KycSubmission.findById(req.params.id);

  if (!submission) throw new AppError('Submission not found', 404, 'NOT_FOUND');
  // Allow re-deciding for testing purposes (ignoring strict SUBMITTED/UNDER_REVIEW checks)

  submission.status = decision === 'APPROVE' ? 'APPROVED' : decision === 'REJECT' ? 'REJECTED' : 'NEEDS_CHANGES';
  submission.decision = decision;
  if (reason) submission.reason = reason;
  submission.decidedAt = new Date();
  submission.reviewerId = req.user!.id as any;

  // Set deleteAfter to 30 days from now
  const thirtyDays = new Date();
  thirtyDays.setDate(thirtyDays.getDate() + 30);
  submission.deleteAfter = thirtyDays;

  await submission.save();

  // Update user model kycStatus and PartnerProfile
  const user = await User.findById(submission.partnerId);
  if (user) {
    user.kycStatus = submission.status === 'APPROVED'
      ? 'VERIFIED'
      : submission.status === 'REJECTED' ? 'REJECTED' : 'PENDING';
    if (submission.status === 'APPROVED') {
      user.onboardingState = 'LIVE';
      const { PartnerProfile } = await import('../../models/PartnerProfile.js');
      await PartnerProfile.findOneAndUpdate(
        { userId: user._id },
        { approvalStatus: 'APPROVED', isListed: true }
      );
    }
    await user.save();
    
    // Notify frontend of state change
    const { accessService } = await import('../../services/AccessService.js');
    await accessService.publishAccessChange(user.id, 'KYC status updated by admin');
  }

  await AuditLog.create({
    actorId: req.user!.id,
    action: `KYC_DECISION_${decision}`,
    entityType: 'KYC_SUBMISSION',
    entityId: submission.id,
    meta: { reason }
  });

  res.json({ success: true, data: submission });
}));

export default router;
