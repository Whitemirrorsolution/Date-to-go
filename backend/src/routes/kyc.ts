/**
 * KYC routes — /api/v1/kyc
 *
 * POST   /start      — Partner initiates KYC session
 * GET    /status     — Partner checks KYC status
 * POST   /webhook    — Provider posts status update (no auth — verified by signature)
 */
import { Router } from 'express';
import { asyncHandler } from '../utils/asyncHandler.js';
import { kycService } from '../services/KycService.js';
import { requireAuth, requireRole } from '../middlewares/auth.js';

const router: Router = Router();

// ── POST /start ───────────────────────────────────────────────────────────

router.post(
  '/start',
  requireAuth,
  requireRole('PARTNER'),
  asyncHandler(async (req, res) => {
    const session = await kycService.startKyc(req.user!.id);
    res.status(200).json({
      success: true,
      message: 'KYC session started',
      data: session,
    });
  }),
);

// ── GET /status ───────────────────────────────────────────────────────────

router.get(
  '/status',
  requireAuth,
  asyncHandler(async (req, res) => {
    const status = await kycService.getStatus(req.user!.id);
    res.status(200).json({ success: true, data: status });
  }),
);

// ── POST /webhook ─────────────────────────────────────────────────────────
// NOTE: In production, verify the provider's HMAC signature here BEFORE
// calling kycService.handleWebhook. For the mock provider this is omitted.

router.post(
  '/webhook',
  asyncHandler(async (req, res) => {
    await kycService.handleWebhook(req.body);
    res.status(200).json({ success: true, message: 'Webhook received' });
  }),
);

export default router;
