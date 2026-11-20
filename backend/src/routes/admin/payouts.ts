import { Router, type Request, type Response } from 'express';
import { z } from 'zod';
import { asyncHandler } from '../../utils/asyncHandler.js';
import { PayoutRequest, type PayoutStatus } from '../../models/PayoutRequest.js';
import { walletService } from '../../services/WalletService.js';
import { AppError } from '../../utils/AppError.js';
import { Notification } from '../../models/Notification.js';
import mongoose from 'mongoose';

const router: Router = Router();

// ── GET /api/v1/admin/payouts ──────────────────────────────────────────────
router.get(
  '/',
  asyncHandler(async (req: Request, res: Response) => {
    const { status, search } = req.query;
    const filter: any = {};
    
    if (status && status !== 'all' && status !== 'ALL') {
      filter.status = status;
    }

    if (search && typeof search === 'string' && search.trim()) {
      filter.$or = [
        { utrNumber: { $regex: search.trim(), $options: 'i' } },
        { 'bankDetails.accountHolderName': { $regex: search.trim(), $options: 'i' } },
        { 'bankDetails.upiId': { $regex: search.trim(), $options: 'i' } },
        { 'bankDetails.accountNumber': { $regex: search.trim(), $options: 'i' } },
      ];
    }

    const payouts = await PayoutRequest.find(filter)
      .populate('partnerId', 'name displayName email mobile walletBalancePaise avatar')
      .sort({ createdAt: -1 });

    // Compute live stats for admin dashboard summary
    const allPayouts = await PayoutRequest.find({});
    const stats = {
      totalCount: allPayouts.length,
      pendingCount: allPayouts.filter(p => p.status === 'PENDING').length,
      pendingPaise: allPayouts.filter(p => p.status === 'PENDING').reduce((s, p) => s + p.amountPaise, 0),
      processingCount: allPayouts.filter(p => p.status === 'PROCESSING').length,
      processingPaise: allPayouts.filter(p => p.status === 'PROCESSING').reduce((s, p) => s + p.amountPaise, 0),
      confirmedCount: allPayouts.filter(p => ['CONFIRMED', 'PAID', 'APPROVED'].includes(p.status)).length,
      confirmedPaise: allPayouts.filter(p => ['CONFIRMED', 'PAID', 'APPROVED'].includes(p.status)).reduce((s, p) => s + p.amountPaise, 0),
      rejectedCount: allPayouts.filter(p => p.status === 'REJECTED').length,
      rejectedPaise: allPayouts.filter(p => p.status === 'REJECTED').reduce((s, p) => s + p.amountPaise, 0),
      onHoldCount: allPayouts.filter(p => p.status === 'ON_HOLD').length,
      frozenCount: allPayouts.filter(p => p.status === 'FROZEN').length,
    };

    res.json({ success: true, data: payouts, stats });
  })
);

// ── PATCH /api/v1/admin/payouts/:id/status ─────────────────────────────────
router.patch(
  '/:id/status',
  asyncHandler(async (req: Request, res: Response) => {
    const { status, adminNote, utrNumber } = z.object({
      status: z.enum([
        'PENDING',
        'PROCESSING',
        'APPROVED',
        'CONFIRMED',
        'PAID',
        'REJECTED',
        'ON_HOLD',
        'FROZEN'
      ]),
      adminNote: z.string().optional(),
      utrNumber: z.string().optional(),
    }).parse(req.body);

    const session = await mongoose.startSession();
    let payout: any;

    try {
      await session.withTransaction(async () => {
        payout = await PayoutRequest.findById(req.params['id']).session(session);
        if (!payout) throw new AppError('Payout request not found', 404);

        const oldStatus = payout.status;
        let targetStatus: PayoutStatus = status as PayoutStatus;
        if (targetStatus === 'APPROVED' || targetStatus === 'PAID') {
          targetStatus = 'CONFIRMED';
        }

        // If transitioning to REJECTED from a non-rejected state, refund wallet balance
        if (targetStatus === 'REJECTED' && oldStatus !== 'REJECTED') {
          await walletService.processTransaction(
            payout.partnerId.toString(),
            'REFUND',
            payout.amountPaise,
            `Payout rejected: ${adminNote || 'No reason provided'}`,
            'PAYOUT',
            payout._id.toString(),
          );
          payout.rejectedAt = new Date();
        }

        // If transitioning to CONFIRMED
        if (targetStatus === 'CONFIRMED') {
          payout.creditedAt = new Date();
          if (utrNumber) payout.utrNumber = utrNumber.trim();
        }

        // If transitioning to PROCESSING
        if (targetStatus === 'PROCESSING') {
          payout.processedAt = new Date();
        }

        payout.status = targetStatus;
        if (adminNote !== undefined) payout.adminNote = adminNote;
        if (utrNumber && targetStatus !== 'REJECTED') payout.utrNumber = utrNumber.trim();

        await payout.save({ session });
      });
    } finally {
      await session.endSession();
    }

    // Send real-time notification to partner
    try {
      let notifTitle = 'Withdrawal Status Update';
      let notifBody = `Your withdrawal request of ₹${(payout.amountPaise / 100).toFixed(0)} status has been updated to ${payout.status}.`;

      if (payout.status === 'PROCESSING') {
        notifTitle = 'Withdrawal Processing ⏳';
        notifBody = `Your withdrawal of ₹${(payout.amountPaise / 100).toFixed(0)} is currently being processed by our accounts team.`;
      } else if (payout.status === 'CONFIRMED') {
        notifTitle = 'Withdrawal Credited! 🎉';
        notifBody = `₹${(payout.amountPaise / 100).toFixed(0)} has been successfully transferred to your account.${payout.utrNumber ? ` UTR Ref: ${payout.utrNumber}` : ''}`;
      } else if (payout.status === 'REJECTED') {
        notifTitle = 'Withdrawal Rejected (Refunded) ❌';
        notifBody = `Your withdrawal of ₹${(payout.amountPaise / 100).toFixed(0)} was rejected and refunded back to your wallet.${adminNote ? ` Reason: ${adminNote}` : ''}`;
      } else if (payout.status === 'ON_HOLD') {
        notifTitle = 'Withdrawal On Hold ⏸️';
        notifBody = `Your withdrawal of ₹${(payout.amountPaise / 100).toFixed(0)} has been placed on hold.${adminNote ? ` Note: ${adminNote}` : ''}`;
      } else if (payout.status === 'FROZEN') {
        notifTitle = 'Withdrawal Frozen ❄️';
        notifBody = `Your withdrawal of ₹${(payout.amountPaise / 100).toFixed(0)} is frozen pending security review.`;
      }

      await Notification.create({
        userId: payout.partnerId,
        title: notifTitle,
        body: notifBody,
        type: 'PAYOUT_UPDATE',
      });
    } catch {
      // Non-blocking notification
    }

    res.json({
      success: true,
      message: `Payout status updated to ${payout.status}`,
      data: payout,
    });
  })
);

// ── Legacy Routes for Backward Compatibility ──────────────────────────────
router.post(
  '/:id/approve',
  asyncHandler(async (req: Request, res: Response) => {
    const { adminNote, utrNumber } = req.body || {};
    const payout = await PayoutRequest.findByIdAndUpdate(
      req.params['id'],
      {
        $set: {
          status: 'CONFIRMED',
          adminNote: adminNote || undefined,
          utrNumber: utrNumber || undefined,
          creditedAt: new Date(),
        },
      },
      { new: true }
    );
    if (!payout) throw new AppError('Payout not found', 404);

    try {
      await Notification.create({
        userId: payout.partnerId,
        title: 'Withdrawal Credited! 🎉',
        body: `₹${(payout.amountPaise / 100).toFixed(0)} has been successfully credited to your account.${utrNumber ? ` UTR: ${utrNumber}` : ''}`,
        type: 'PAYOUT_UPDATE',
      });
    } catch {}

    res.json({ success: true, message: 'Payout approved & credited', data: payout });
  })
);

router.post(
  '/:id/reject',
  asyncHandler(async (req: Request, res: Response) => {
    const { adminNote } = z.object({ adminNote: z.string().optional() }).parse(req.body);
    const session = await mongoose.startSession();
    let payout: any;

    try {
      await session.withTransaction(async () => {
        payout = await PayoutRequest.findById(req.params['id']).session(session);
        if (!payout) throw new AppError('Payout not found', 404);

        if (payout.status !== 'REJECTED') {
          await walletService.processTransaction(
            payout.partnerId.toString(),
            'REFUND',
            payout.amountPaise,
            `Payout rejected: ${adminNote || 'No reason provided'}`,
            'PAYOUT',
            payout._id.toString(),
          );
        }

        payout.status = 'REJECTED';
        payout.adminNote = adminNote || 'Rejected by admin';
        payout.rejectedAt = new Date();
        await payout.save({ session });
      });
    } finally {
      await session.endSession();
    }

    try {
      await Notification.create({
        userId: payout.partnerId,
        title: 'Withdrawal Rejected (Refunded) ❌',
        body: `Your withdrawal of ₹${(payout.amountPaise / 100).toFixed(0)} was rejected and refunded to your wallet.${adminNote ? ` Reason: ${adminNote}` : ''}`,
        type: 'PAYOUT_UPDATE',
      });
    } catch {}

    res.json({ success: true, message: 'Payout rejected and refunded', data: payout });
  })
);

export default router;
