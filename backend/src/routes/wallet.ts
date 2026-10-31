import { Router } from 'express';
import { z } from 'zod';
import { requireAuth } from '../middlewares/auth.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { walletService } from '../services/WalletService.js';

const router: Router = Router();

// Get balance
router.get(
  '/',
  requireAuth,
  asyncHandler(async (req, res) => {
    const balance = await walletService.getBalance(req.user!.id);
    res.json({ success: true, data: { balancePaise: balance } });
  })
);

// Get ledger
router.get(
  '/ledger',
  requireAuth,
  asyncHandler(async (req, res) => {
    const limit = parseInt(req.query.limit as string) || 50;
    const skip = parseInt(req.query.skip as string) || 0;
    
    const { records, total } = await walletService.getLedger(req.user!.id, limit, skip);
    res.json({ success: true, data: { records, total } });
  })
);

// Create topup order
const TopupSchema = z.object({ amountPaise: z.number().int().positive() });

router.post(
  '/topup/order',
  requireAuth,
  asyncHandler(async (req, res) => {
    const { amountPaise } = TopupSchema.parse(req.body);
    const order = await walletService.createTopupOrder(req.user!.id, amountPaise);
    res.json({ success: true, data: order });
  })
);

// Verify topup
const VerifySchema = z.object({
  paymentId: z.string().min(1),
  orderId: z.string().min(1),
  signature: z.string().min(1),
  amountPaise: z.number().int().positive(),
});

router.post(
  '/topup/verify',
  requireAuth,
  asyncHandler(async (req, res) => {
    const { paymentId, orderId, signature, amountPaise } = VerifySchema.parse(req.body);
    await walletService.verifyAndCredit(paymentId, orderId, signature, amountPaise, req.user!.id);
    res.json({ success: true, message: 'Wallet credited successfully' });
  })
);

export default router;
