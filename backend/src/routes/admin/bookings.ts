import { Router, type Request, type Response } from 'express';
import { asyncHandler } from '../../utils/asyncHandler.js';
import { Booking } from '../../models/Booking.js';

const router: Router = Router();

router.get(
  '/',
  asyncHandler(async (_req: Request, res: Response) => {
    const bookings = await Booking.find()
      .populate('userId', 'email')
      .populate('partnerId', 'email')
      .sort({ createdAt: -1 });
    res.status(200).json({ success: true, data: bookings });
  })
);

export default router;
