import { Router, type Request, type Response } from 'express';
import { asyncHandler } from '../utils/asyncHandler.js';
import { requireAuth, requireRole } from '../middlewares/auth.js';
import { requireFeatureFlag } from '../middlewares/featureFlag.js';
import { Favorite } from '../models/Favorite.js';
import { Listing } from '../models/Listing.js';
import { emitEvent } from '../utils/events.js';
import { z } from 'zod';

const router: Router = Router();

router.use(requireAuth, requireRole('SEEKER'));
router.use(requireFeatureFlag('seeker.favorites'));

// GET /seeker/favorites – list favorite partners with their currently open listings
router.get(
  '/',
  asyncHandler(async (req: Request, res: Response) => {
    const seekerId = req.user!.id;
    const favorites = await Favorite.find({ seekerId }).populate('partnerId');
    const partnerIds = favorites.map((f) => (f.partnerId as any)._id);
    const listings = await Listing.find({
      partnerId: { $in: partnerIds },
      status: 'OPEN',
      startAt: { $gt: new Date() },
    })
      .sort({ startAt: 1 })
      .limit(partnerIds.length)
      .lean();
    const result = favorites.map((fav) => {
      const partner = fav.partnerId as any;
      const openListing = listings.find((l) => l.partnerId.toString() === partner._id.toString());
      return {
        partnerId: partner._id,
        name: partner.displayName || partner.username,
        verified: partner.kycStatus === 'VERIFIED',
        avatarUrl: partner.avatarUrl,
        openListing,
      };
    });
    return res.json({ success: true, data: result });
  })
);

// POST /seeker/favorites – add a partner to favorites
router.post(
  '/',
  asyncHandler(async (req: Request, res: Response) => {
    const seekerId = req.user!.id;
    const body = z.object({
      partnerId: z.string(),
      sourceListingId: z.string().optional(),
    }).parse(req.body);
    const existing = await Favorite.findOne({ seekerId, partnerId: body.partnerId });
    if (existing) {
      return res.json({ success: true, message: 'Already favorited' });
    }
    const fav = new Favorite({
      seekerId,
      partnerId: body.partnerId,
      sourceListingId: body.sourceListingId,
    });
    await fav.save();
    emitEvent('favorite.added', { seekerId, partnerId: body.partnerId });
    return res.status(201).json({ success: true });
  })
);

// DELETE /seeker/favorites/:partnerId – remove favorite
router.delete(
  '/:partnerId',
  asyncHandler(async (req: Request, res: Response) => {
    const seekerId = req.user!.id;
    const { partnerId } = z.object({ partnerId: z.string() }).parse(req.params);
    await Favorite.deleteOne({ seekerId, partnerId });
    emitEvent('favorite.removed', { seekerId, partnerId });
    return res.json({ success: true });
  })
);

export default router;
