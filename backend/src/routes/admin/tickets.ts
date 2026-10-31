import { Router, type Request, type Response } from 'express';
import { z } from 'zod';
import { asyncHandler } from '../../utils/asyncHandler.js';
import { SupportTicket } from '../../models/SupportTicket.js';
import { AppError } from '../../utils/AppError.js';

const router: Router = Router();

router.get(
  '/',
  asyncHandler(async (_req: Request, res: Response) => {
    const tickets = await SupportTicket.find()
      .populate('userId', 'email displayName fullName')
      .sort({ createdAt: -1 });
    res.status(200).json({ success: true, data: tickets });
  })
);

const ResolveTicketSchema = z.object({
  resolution: z.string().min(5),
});

router.post(
  '/:id/resolve',
  asyncHandler(async (req: Request, res: Response) => {
    const { resolution } = ResolveTicketSchema.parse(req.body);
    const ticket = await SupportTicket.findById(req.params['id']);
    if (!ticket) throw new AppError('Ticket not found', 404, 'NOT_FOUND');

    ticket.status = 'RESOLVED';
    ticket.resolvedAt = new Date();
    ticket.messages.push({
      senderId: req.user!.id as any,
      senderRole: 'ADMIN',
      message: resolution,
      createdAt: new Date()
    });

    await ticket.save();
    res.status(200).json({ success: true, data: ticket });
  })
);

export default router;
