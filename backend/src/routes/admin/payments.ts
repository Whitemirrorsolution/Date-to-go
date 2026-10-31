import { Router, type Request, type Response } from 'express';
import { z } from 'zod';
import { asyncHandler } from '../../utils/asyncHandler.js';
import { Payment } from '../../models/Payment.js';
import { paymentService } from '../../services/PaymentService.js';


const router: Router = Router();

router.get(
  '/',
  asyncHandler(async (_req: Request, res: Response) => {
    const payments = await Payment.find().sort({ createdAt: -1 }).populate('userId', 'email');
    res.status(200).json({ success: true, data: payments });
  })
);

const RefundSchema = z.object({
  reason: z.string().min(5),
});

router.post(
  '/:id/refund',
  asyncHandler(async (req: Request, res: Response) => {
    const { reason } = RefundSchema.parse(req.body);
    const payment = await paymentService.refundPayment(req.params['id']!, req.user!.id, reason);
    res.status(200).json({ success: true, data: payment });
  })
);

export default router;
