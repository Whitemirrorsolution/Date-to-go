// backend/src/routes/deck.ts
import { Router, type Request, type Response } from 'express';
import { asyncHandler } from '../utils/asyncHandler.js';
import { requireAuth, requireRole } from '../middlewares/auth.js';
import { requireFeatureFlag } from '../middlewares/featureFlag.js';
import { DeckInteraction } from '../models/DeckInteraction.js';
import { Favorite } from '../models/Favorite.js';
import { Listing } from '../models/Listing.js';
import { Block } from '../models/Block.js';
import { Category } from '../models/Category.js';
import { AppSetting } from '../models/AppSetting.js';
import { emitEvent } from '../utils/events.js';
import { z } from 'zod';
import { Types } from 'mongoose';

const router: Router = Router();

router.use(requireAuth, requireRole('SEEKER'), requireFeatureFlag('seeker.deck'));

/* ---------- GET deck ---------- */
const DeckQuerySchema = z.object({
  cursor: z.string().optional(),
  sort: z.enum(['newest', 'price_asc', 'price_desc']).default('newest'),
  filters: z.object({
    city: z.string().optional(),
  }).optional(),
  limit: z.coerce.number().int().min(1).max(50).default(20),
});

router.get(
  '/categories/:slug/deck',
  asyncHandler(async (req: Request, res: Response) => {
    const { slug } = req.params;
    const { cursor, sort, filters, limit } = DeckQuerySchema.parse(req.query);
    const seekerId = req.user!.id;

    // Load admin settings for pagination size
    const pageSizeSetting = await AppSetting.findOne({ key: 'deckPageSize' });
    const pageSize = (pageSizeSetting?.value as { size?: number } | undefined)?.size ?? 20;
    const page = limit ?? pageSize;

    // Determine blocked users
    const blocks = await Block.find({
      $or: [{ userId: seekerId }, { blockedUserId: seekerId }],
    });
    const blockedIds = new Set<string>();
    for (const b of blocks) {
      blockedIds.add(b.userId.toString());
      blockedIds.add(b.blockedUserId.toString());
    }

    // Determine recent skips (within TTL)
    const skipSetting = await AppSetting.findOne({ key: 'deckSkipHideDays' });
    const skipDays = (skipSetting?.value as { days?: number } | undefined)?.days ?? 7;
    const skipCutoff = new Date(Date.now() - skipDays * 24 * 60 * 60 * 1000);
    const skips = await DeckInteraction.find({ seekerId, action: 'SKIP', createdAt: { $gt: skipCutoff } }).select('listingId');
    const skippedListingIds = new Set(skips.map((s) => s.listingId.toString()));

    // Build base match query
    const match: Record<string, any> = {
      status: 'OPEN',
      startAt: { $gt: new Date() },
      partnerId: { $nin: Array.from(blockedIds) },
      _id: { $nin: Array.from(skippedListingIds) },
    };
    if (slug !== 'all') {
      const category = await Category.findOne({ slug, isActive: true });
      if (!category) throw new Error('Category not found');
      match.categoryId = category._id;
    }
    if (filters?.city) {
      match.city = new RegExp(`^${filters.city}$`, 'i');
    }

    // Cursor pagination handling (stable)
    const sortKey: Record<string, 1 | -1> =
      sort === 'newest'
        ? { createdAt: -1 }
        : sort === 'price_asc'
        ? { basePricePaise: 1 }
        : { basePricePaise: -1 };

    if (cursor) {
      const decoded = Buffer.from(cursor, 'base64').toString('utf-8');
      const [lastId, lastSort] = decoded.split('|');
      if (sort === 'newest') {
        match.createdAt = { $lt: new Date(lastSort) };
      } else {
        const op = sort === 'price_asc' ? '$gt' : '$lt';
        match.basePricePaise = { [op]: Number(lastSort) };
      }
      match._id = { $gt: Types.ObjectId.createFromHexString(lastId) };
    }

    const listings = await Listing.find(match).sort(sortKey).limit(page + 1).lean();
    const hasNext = listings.length > page;
    const items = listings.slice(0, page).map((l) => ({
      listingId: l._id.toString(),
      partnerId: l.partnerId.toString(),
    }));

    const nextCursor = hasNext
      ? Buffer.from(`${listings[page]._id}|${(listings[page] as any)[Object.keys(sortKey)[0]]}`).toString('base64')
      : null;

    return res.json({ success: true, items, nextCursor });
  })
);

/* ---------- POST interaction ---------- */
const InteractionSchema = z.object({
  listingId: z.string(),
  action: z.enum(['SKIP', 'SAVE', 'UNDO']),
  undoOf: z.string().optional(),
});

router.post(
  '/interactions',
  asyncHandler(async (req: Request, res: Response) => {
    const { listingId, action, undoOf } = InteractionSchema.parse(req.body);
    const seekerId = req.user!.id;
    const idempotencyKey = req.headers['idempotency-key'] as string | undefined;
    if (!idempotencyKey) {
      return res.status(400).json({ success: false, message: 'Idempotency-Key header required' });
    }

    const listing = await Listing.findById(listingId);
    if (!listing) {
      return res.status(404).json({ success: false, message: 'Listing not found' });
    }
    const partnerId = listing.partnerId.toString();

    // Check duplicate action
    const existing = await DeckInteraction.findOne({ seekerId, listingId });
    if (existing && action !== 'UNDO') {
      return res.status(409).json({ success: false, message: 'Interaction already recorded' });
    }

    const interaction = new DeckInteraction({
      seekerId,
      listingId,
      partnerId,
      action,
      undoOf,
    });
    await interaction.save();

    if (action === 'SAVE') {
      const fav = new Favorite({ seekerId, partnerId, sourceListingId: listingId });
      await fav.save();
    }

    if (action === 'UNDO' && undoOf) {
      const target = await DeckInteraction.findById(undoOf);
      if (!target) {
        return res.status(404).json({ success: false, message: 'Interaction to undo not found' });
      }
      if (target.action === 'SAVE') {
        await Favorite.deleteOne({ seekerId, partnerId: target.partnerId });
      }
      if (target.action === 'SKIP') {
        await DeckInteraction.deleteOne({ _id: target._id });
      }
    }

    emitEvent('deck.interaction', {
      seekerId,
      listingId,
      partnerId,
      action,
      interactionId: interaction._id,
    });

    return res.status(201).json({ success: true, interactionId: interaction._id });
  })
);

/* ---------- Hide partner ---------- */
router.post(
  '/hide-partner',
  asyncHandler(async (req: Request, res: Response) => {
    const { partnerId } = z.object({ partnerId: z.string() }).parse(req.body);
    const seekerId = req.user!.id;
    await Block.create({ userId: seekerId, blockedUserId: partnerId, createdAt: new Date() });
    emitEvent('partner.blocked', { seekerId, partnerId });
    return res.json({ success: true });
  })
);

/* ---------- Reset skipped ---------- */
router.post(
  '/reset-skipped',
  asyncHandler(async (req: Request, res: Response) => {
    const { categorySlug } = z.object({ categorySlug: z.string().optional() }).parse(req.body);
    const seekerId = req.user!.id;
    const filter: Record<string, any> = { seekerId, action: 'SKIP' };
    if (categorySlug) {
      const cat = await Category.findOne({ slug: categorySlug });
      if (cat) {
        const listingsInCat = await Listing.find({ categoryId: cat._id }).select('_id');
        filter.listingId = { $in: listingsInCat.map((l) => l._id) };
      }
    }
    await DeckInteraction.deleteMany(filter);
    return res.json({ success: true });
  })
);

export default router;
