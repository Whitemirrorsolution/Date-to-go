import { Router, type Request, type Response } from 'express';
import { z } from 'zod';
import { asyncHandler } from '../../utils/asyncHandler.js';
import { User } from '../../models/User.js';
import { PartnerProfile } from '../../models/PartnerProfile.js';
import { KycSubmission } from '../../models/KycSubmission.js';
import { Subscription } from '../../models/Subscription.js';
import { Booking } from '../../models/Booking.js';
import { Payment } from '../../models/Payment.js';
import { WalletLedger } from '../../models/WalletLedger.js';
import { Report } from '../../models/Report.js';
import { AuditLog } from '../../models/AuditLog.js';
import { AppError } from '../../utils/AppError.js';

const router: Router = Router();

// GET /api/v1/admin/users - list all users with summary info
router.get(
  '/',
  asyncHandler(async (_req: Request, res: Response) => {
    const users = await User.find().select('-passwordHash').sort({ createdAt: -1 });
    res.status(200).json({ success: true, data: users });
  })
);

// GET /api/v1/admin/users/:id - get full 360-degree user details
router.get(
  '/:id',
  asyncHandler(async (req: Request, res: Response) => {
    const userId = req.params['id'];
    const user = await User.findById(userId).select('-passwordHash').lean();
    if (!user) throw new AppError('User not found', 404, 'NOT_FOUND');

    const [
      partnerProfile,
      kycSubmission,
      subscriptions,
      bookings,
      payments,
      walletLedger,
      reports,
      auditLogs,
    ] = await Promise.all([
      PartnerProfile.findOne({ userId }).populate('categories.categoryId').lean(),
      KycSubmission.findOne({ partnerId: userId }).lean(),
      Subscription.find({ userId }).populate('planId').sort({ createdAt: -1 }).lean(),
      Booking.find({ $or: [{ clientId: userId }, { partnerId: userId }] })
        .populate('clientId', 'fullName email phone roles')
        .populate('partnerId', 'fullName email phone roles')
        .populate('categoryId', 'name icon')
        .sort({ createdAt: -1 })
        .lean(),
      Payment.find({ userId }).populate('planId').sort({ createdAt: -1 }).lean(),
      WalletLedger.find({ userId }).sort({ createdAt: -1 }).lean(),
      Report.find({ $or: [{ reporterId: userId }, { targetUserId: userId }] }).sort({ createdAt: -1 }).lean(),
      AuditLog.find({ entityId: userId }).sort({ createdAt: -1 }).lean(),
    ]);

    res.status(200).json({
      success: true,
      data: {
        user,
        partnerProfile,
        kycSubmission,
        subscriptions,
        bookings,
        payments,
        walletLedger,
        reports,
        auditLogs,
      },
    });
  })
);

const SuspendUserSchema = z.object({
  status: z.enum(['ACTIVE', 'SUSPENDED', 'DELETED', 'PENDING']),
  reason: z.string().min(3),
});

// PATCH /api/v1/admin/users/:id/status
router.patch(
  '/:id/status',
  asyncHandler(async (req: Request, res: Response) => {
    const { status, reason } = SuspendUserSchema.parse(req.body);
    const userId = req.params['id'];
    const user = await User.findById(userId);
    if (!user) throw new AppError('User not found', 404, 'NOT_FOUND');

    user.status = status;
    await User.updateOne({ _id: userId }, { $set: { status } });

    await AuditLog.create({
      actorId: req.user!.id,
      action: 'USER_STATUS_CHANGED',
      entityType: 'User',
      entityId: user._id,
      meta: { newStatus: status, reason },
    });

    res.status(200).json({ success: true, message: `User status updated to ${status}`, data: { status } });
  })
);

// PATCH /api/v1/admin/users/:id/role
const RoleUpdateSchema = z.object({
  roles: z.array(z.enum(['SEEKER', 'PARTNER', 'ADMIN'])).min(1),
  activeMode: z.enum(['SEEKER', 'PARTNER']),
});

router.patch(
  '/:id/role',
  asyncHandler(async (req: Request, res: Response) => {
    const { roles, activeMode } = RoleUpdateSchema.parse(req.body);
    const userId = req.params['id'];

    const user = await User.findById(userId);
    if (!user) throw new AppError('User not found', 404, 'NOT_FOUND');

    await User.updateOne({ _id: userId }, { $set: { roles, activeMode } });

    await AuditLog.create({
      actorId: req.user!.id,
      action: 'USER_ROLE_CHANGED',
      entityType: 'User',
      entityId: user._id,
      meta: { roles, activeMode },
    });

    res.status(200).json({ success: true, message: 'User role updated successfully', data: { roles, activeMode } });
  })
);

// PATCH /api/v1/admin/users/:id/profile
const ProfileUpdateSchema = z.object({
  fullName: z.string().min(1).optional(),
  phone: z.string().optional(),
  city: z.string().optional(),
  gender: z.enum(['MALE', 'FEMALE', 'OTHER']).optional(),
  emailVerified: z.boolean().optional(),
  phoneVerified: z.boolean().optional(),
  kycStatus: z.enum(['NOT_STARTED', 'PENDING', 'VERIFIED', 'REJECTED']).optional(),
});

router.patch(
  '/:id/profile',
  asyncHandler(async (req: Request, res: Response) => {
    const updates = ProfileUpdateSchema.parse(req.body);
    const userId = req.params['id'];

    const user = await User.findById(userId);
    if (!user) throw new AppError('User not found', 404, 'NOT_FOUND');

    await User.updateOne({ _id: userId }, { $set: updates });

    await AuditLog.create({
      actorId: req.user!.id,
      action: 'USER_PROFILE_UPDATED',
      entityType: 'User',
      entityId: user._id,
      meta: { updates },
    });

    res.status(200).json({ success: true, message: 'User details updated successfully' });
  })
);

// POST /api/v1/admin/users/:id/wallet-adjust
const WalletAdjustSchema = z.object({
  amountPaise: z.number().int(), // positive for credit, negative for debit
  reason: z.string().min(3),
});

router.post(
  '/:id/wallet-adjust',
  asyncHandler(async (req: Request, res: Response) => {
    const { amountPaise, reason } = WalletAdjustSchema.parse(req.body);
    const userId = req.params['id'];

    const user = await User.findById(userId);
    if (!user) throw new AppError('User not found', 404, 'NOT_FOUND');

    const currentBalance = user.walletBalancePaise || 0;
    const newBalance = currentBalance + amountPaise;
    if (newBalance < 0) {
      throw new AppError('Wallet balance cannot become negative', 400, 'INSUFFICIENT_FUNDS');
    }

    await User.updateOne({ _id: userId }, { $set: { walletBalancePaise: newBalance } });

    await WalletLedger.create({
      userId: user._id,
      type: 'ADJUSTMENT',
      amountPaise: Math.abs(amountPaise),
      balanceAfterPaise: newBalance,
      reason: `Admin adjustment: ${reason}`,
      refType: 'ADMIN_ADJUSTMENT',
      refId: req.user!.id,
    });

    await AuditLog.create({
      actorId: req.user!.id,
      action: 'USER_WALLET_ADJUSTED',
      entityType: 'User',
      entityId: user._id,
      meta: { amountPaise, oldBalance: currentBalance, newBalance, reason },
    });

    res.status(200).json({
      success: true,
      message: 'Wallet balance adjusted successfully',
      data: { walletBalancePaise: newBalance },
    });
  })
);

export default router;
