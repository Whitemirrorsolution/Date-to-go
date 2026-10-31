import express from 'express';
import 'express-async-errors';
import cookieParser from 'cookie-parser';
import { requestId } from './middlewares/requestId.js';
import { applySecurityMiddleware } from './middlewares/security.js';
import { httpLogger } from './middlewares/httpLogger.js';
import { errorHandler, notFoundHandler } from './middlewares/errorHandler.js';
import { env } from './config/env.js';
import healthRouter from './routes/health.js';
import authRouter from './routes/auth.js';
import kycRouter from './routes/kyc.js';
import plansRouter from './routes/plans.js';
import paymentsRouter from './routes/payments.js';
import partnerRouter from './routes/partner.js';
import partnerRulesRouter from './routes/partnerRules.js';
import partnerQuickRepliesRouter from './routes/partnerQuickReplies.js';
import discoverRouter from './routes/discover.js';
import bookingsRouter from './routes/bookings.js';
import chatRouter from './routes/chat.js';
import safetyRouter from './routes/safety.js';
import socialRouter from './routes/social.js';
import adminRouter from './routes/admin/index.js';
import { pagesRouter } from './routes/pages.js';
import { supportRouter } from './routes/support.js';
import { consentsRouter } from './routes/consents.js';
import { geoRouter } from './routes/geo.js';
import { pushRouter } from './routes/push.js';
import walletRouter from './routes/wallet.js';
import categoriesRouter from './routes/categories.js';
import eventsRouter from './routes/events.js';
import uploadRouter from './routes/upload.js';
import deckRouter from './routes/deck.js';
import favoritesRouter from './routes/favorites.js';
import photosRouter from './routes/photos.js';

/**
 * Creates and configures the Express application.
 * Exported as a factory so tests can create isolated instances.
 */
export function createApp(): express.Application {
  const app = express();

  // ── Trust proxy (for rate-limit IP resolution behind Nginx/LB) ────────────
  app.set('trust proxy', 1);

  // ── Security middleware (helmet, cors, rate-limit, sanitize, hpp, compression)
  applySecurityMiddleware(app);

  // ── Request ID (must be before httpLogger)
  app.use(requestId);

  // ── HTTP request logger
  app.use(httpLogger);

  // ── Stripe/Razorpay Webhooks (must be before express.json)
  app.post(
    `/api/${env.API_VERSION}/payments/webhook`,
    express.raw({ type: 'application/json' }),
    (req, _res, next) => {
      // Pass the raw buffer forward
      (req as unknown as { rawBody?: Buffer }).rawBody = req.body;
      next();
    }
  );

  // ── Body parsers
  app.use(
    express.json({
      limit: '100kb',
    }),
  );
  app.use(express.urlencoded({ extended: true, limit: '100kb' }));
  app.use(cookieParser());

  // ── Routes ────────────────────────────────────────────────────────────────
  const API_PREFIX = `/api/${env.API_VERSION}`;

  app.use(`${API_PREFIX}/health`, healthRouter);
  app.use(`${API_PREFIX}/auth`, authRouter);
  app.use('/api/auth', authRouter); // Alias for unversioned client calls
  app.use(`${API_PREFIX}/kyc`, kycRouter);
  app.use(`${API_PREFIX}/plans`, plansRouter);
  app.use(`${API_PREFIX}/payments`, paymentsRouter);
  app.use(`${API_PREFIX}/partner/rules`, partnerRulesRouter);
  app.use(`${API_PREFIX}/partner/quick-replies`, partnerQuickRepliesRouter);
  app.use(`${API_PREFIX}/partner`, partnerRouter);
  app.use(`${API_PREFIX}/discover`, discoverRouter);
  app.use(`${API_PREFIX}/bookings`, bookingsRouter);
  app.use(`${API_PREFIX}/bookings/:bookingId/messages`, chatRouter);
  app.use(`${API_PREFIX}/chat/:bookingId/messages`, chatRouter);
  app.use(`${API_PREFIX}/safety`, safetyRouter);
  // Public share link — /api/v1/s/:token (no auth, registered at top level)
  app.get(`${API_PREFIX}/s/:token`, async (req, res, next) => {
    try {
      const { safetyService } = await import('./services/SafetyService.js');
      const details = await safetyService.getSharedBookingByToken(req.params['token']!);
      res.json({ success: true, data: details });
    } catch (e) { next(e); }
  });
  app.use(`${API_PREFIX}/social`, socialRouter);
  app.use(`${API_PREFIX}/admin`, adminRouter);
  app.use(`${API_PREFIX}/pages`, pagesRouter);
  app.use(`${API_PREFIX}/support`, supportRouter);
  app.use(`${API_PREFIX}/consents`, consentsRouter);
  app.use(`${API_PREFIX}/geo`, geoRouter);
  app.use(`${API_PREFIX}/push`, pushRouter);
  app.use(`${API_PREFIX}/wallet`, walletRouter);
  app.use(`${API_PREFIX}/categories`, categoriesRouter);
  app.use(`${API_PREFIX}/events`, eventsRouter);
  app.use(`${API_PREFIX}/upload`, uploadRouter);
app.use('/seeker', deckRouter);
app.use('/seeker', favoritesRouter);
app.use('/seeker', photosRouter);

  // ── 404 handler (after all routes) ────────────────────────────────────────
  app.use(notFoundHandler);

  // ── Central error handler (must be last) ──────────────────────────────────
  app.use(errorHandler);

  return app;
}
