import { Router, type Router as ExpressRouter } from 'express';
import { z } from 'zod';
import { asyncHandler } from '../../utils/asyncHandler.js';
import { ServicePackage } from '../../models/ServicePackage.js';

const router: ExpressRouter = Router();

const PackageSchema = z.object({
  title: z.string().min(2),
  description: z.string().min(5),
  pricePaise: z.number().int().min(100),
  durationHours: z.number().min(1),
  categoryId: z.string().regex(/^[0-9a-fA-F]{24}$/),
  isActive: z.boolean().optional(),
});

router.get('/', asyncHandler(async (_req, res) => {
  const packages = await ServicePackage.find().populate('categoryId').sort({ createdAt: -1 });
  res.json({ success: true, data: packages });
}));

router.post('/', asyncHandler(async (req, res) => {
  const body = PackageSchema.parse(req.body);
  const pkg = await ServicePackage.create(body);
  res.status(201).json({ success: true, data: pkg });
}));

router.delete('/:id', asyncHandler(async (req, res) => {
  await ServicePackage.findByIdAndDelete(req.params.id);
  res.json({ success: true, message: 'Deleted' });
}));

export default router;
