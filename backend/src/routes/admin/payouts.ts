import { Router, type Request, type Response } from 'express';
import { z } from 'zod';
import { asyncHandler } from '../../utils/asyncHandler.js';
import { PayoutRequest } from '../../models/PayoutRequest.js';
import { walletService } from '../../services/WalletService.js';
import { AppError } from '../../utils/AppError.js';
import mongoose from 'mongoose';

const router: Router = Router();

// GET /api/v1/admin/payouts
router.get(
  '/',
  asyncHandler(async (req: Request, res: Response) => {
    const { status } = req.query;
    const filter = status ? { status } : {};
    
    const payouts = await PayoutRequest.find(filter)
      .populate('partnerId', 'email displayName')
      .sort({ createdAt: -1 });
      
    res.json({ success: true, data: payouts });
  })
);

// POST /api/v1/admin/payouts/:id/approve
router.post(
  '/:id/approve',
  asyncHandler(async (req: Request, res: Response) => {
    const { adminNote } = z.object({ adminNote: z.string().optional() }).parse(req.body);
    const session = await mongoose.startSession();
    let payout;
    
    try {
      await session.withTransaction(async () => {
        payout = await PayoutRequest.findById(req.params['id']).session(session);
        if (!payout) throw new AppError('Payout not found', 404);
        if (payout.status !== 'PENDING') throw new AppError('Only PENDING payouts can be approved', 400);
        
        payout.status = 'APPROVED'; // Could be 'PAID' directly if manually transferred, or triggers an API
        if (adminNote) payout.adminNote = adminNote;
        
        await payout.save({ session });
        
        // When approved/paid, the hold in the wallet is permanently deducted by doing nothing 
        // (the PAYOUT_HOLD already reduced the balance).
        // If we want to record the actual payment we can add a 'PAYOUT_SUCCESS' transaction
        // that balances the hold and deducts, but our current ledger is simple.
      });
    } finally {
      await session.endSession();
    }
    
    res.json({ success: true, message: 'Payout approved', data: payout });
  })
);

// POST /api/v1/admin/payouts/:id/reject
router.post(
  '/:id/reject',
  asyncHandler(async (req: Request, res: Response) => {
    const { adminNote } = z.object({ adminNote: z.string() }).parse(req.body);
    const session = await mongoose.startSession();
    let payout;
    
    try {
      await session.withTransaction(async () => {
        payout = await PayoutRequest.findById(req.params['id']).session(session);
        if (!payout) throw new AppError('Payout not found', 404);
        if (payout.status !== 'PENDING') throw new AppError('Only PENDING payouts can be rejected', 400);
        
        payout.status = 'REJECTED';
        payout.adminNote = adminNote;
        
        await payout.save({ session });
        
        // Reverse the hold by refunding the wallet
        await walletService.processTransaction(
          payout.partnerId.toString(),
          'REFUND',
          payout.amountPaise,
          `Payout rejected: ${adminNote}`,
          'PAYOUT',
          payout._id.toString(),
        );
      });
    } finally {
      await session.endSession();
    }
    
    res.json({ success: true, message: 'Payout rejected and refunded', data: payout });
  })
);

export default router;
