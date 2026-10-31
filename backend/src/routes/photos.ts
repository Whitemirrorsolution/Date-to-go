import { Router, type Request, type Response } from 'express';
import { asyncHandler } from '../utils/asyncHandler.js';
import { requireAuth, requireRole } from '../middlewares/auth.js';
import { Listing } from '../models/Listing.js';
import { PartnerProfile } from '../models/PartnerProfile.js';
import { AppSetting } from '../models/AppSetting.js';
import { getSignedUrl } from '../utils/s3.js';

const router: Router = Router();

router.use(requireAuth, requireRole('SEEKER', 'PARTNER'));

router.get(
  '/photos/:id/url',
  asyncHandler(async (req: Request, res: Response) => {
    const listing = await Listing.findById(req.params.id);
    if (!listing) {
      return res.status(404).json({ success: false, message: 'Listing not found' });
    }

    const partnerProfile = await PartnerProfile.findOne({ userId: listing.partnerId });
    const photoKey = partnerProfile?.primaryPhoto || 'default-avatar.jpg';

    const ttlSetting = await AppSetting.findOne({ key: 'signedUrlTtlMinutes' });
    const ttl = (ttlSetting?.value as { ttl?: number } | undefined)?.ttl ?? 30;
    const url = await getSignedUrl(photoKey, ttl);

    return res.json({ success: true, url });
  })
);

export default router;
