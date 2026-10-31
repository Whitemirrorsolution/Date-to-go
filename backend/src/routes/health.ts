import { Router } from 'express';
import mongoose from 'mongoose';
import { asyncHandler } from '../utils/asyncHandler.js';
import { env } from '../config/env.js';

const router: Router = Router();

/**
 * GET /api/v1/health
 * Public health-check endpoint for load balancers and uptime monitors.
 * Returns DB connectivity status and a timestamp.
 */
router.get(
  '/',
  asyncHandler(async (_req, res) => {
    const dbState = mongoose.connection.readyState;
    // 0=disconnected, 1=connected, 2=connecting, 3=disconnecting
    const dbStatus = dbState === 1 ? 'connected' : 'disconnected';

    res.status(200).json({
      success: true,
      app: env.APP_NAME,
      version: env.API_VERSION,
      environment: env.NODE_ENV,
      timestamp: new Date().toISOString(),
      uptime: Math.floor(process.uptime()),
      database: dbStatus,
    });
  }),
);

export default router;
