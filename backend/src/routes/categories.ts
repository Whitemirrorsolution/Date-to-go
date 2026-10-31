import { Router } from 'express';
import { asyncHandler } from '../utils/asyncHandler.js';
import { Category } from '../models/Category.js';
import { AppError } from '../utils/AppError.js';

const router: Router = Router();

// ── GET /categories ──────────────────────────────────────────────────────
router.get('/', asyncHandler(async (_req, res) => {
  // Returns only active categories and strips out commission data (it's private)
  const categories = await Category.find({ isActive: true })
    .select('-commissionRules -createdAt -updatedAt')
    .sort({ order: 1 });

  res.json({ success: true, data: categories });
}));

// ── GET /categories/:slug ────────────────────────────────────────────────
router.get('/:slug', asyncHandler(async (req, res) => {
  const category = await Category.findOne({ slug: req.params.slug, isActive: true })
    .select('-commissionRules -createdAt -updatedAt');

  if (!category) {
    throw new AppError('Category not found', 404, 'NOT_FOUND');
  }

  res.json({ success: true, data: category });
}));

export default router;
