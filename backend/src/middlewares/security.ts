import helmet from 'helmet';
import cors from 'cors';
import rateLimit from 'express-rate-limit';
import mongoSanitize from 'express-mongo-sanitize';
import hpp from 'hpp';
import compression from 'compression';
import { doubleCsrf } from 'csrf-csrf';
import type { Application, Request, Response } from 'express';
import { env, corsOrigins, isProd } from '../config/env.js';
import { logger } from '../utils/logger.js';

/**
 * Registers all security-related middleware on the Express app.
 * Order matters — helmet and CORS must come before routes.
 */
export function applySecurityMiddleware(app: Application): void {
  // 1. HTTP security headers
  app.use(
    helmet({
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          scriptSrc: ["'self'"],
          styleSrc: ["'self'", "'unsafe-inline'"], // relaxed for dev; tighten in prod via nonce
          imgSrc: ["'self'", 'data:', 'https:'],
          connectSrc: ["'self'"],
          fontSrc: ["'self'", 'https:'],
          objectSrc: ["'none'"],
          frameSrc: ["'none'"],
          upgradeInsecureRequests: isProd ? [] : null,
        },
      },
      crossOriginEmbedderPolicy: false, // Keep false until full COEP support is needed
      hsts: isProd
        ? { maxAge: 31_536_000, includeSubDomains: true, preload: true }
        : false,
    }),
  );

  // 2. CORS – strict allowlist; credentials allowed for cookie-based auth
  app.use(
    cors({
      origin: (origin, cb) => {
        // Allow server-to-server (no origin) only in non-prod
        if (!origin && !isProd) return cb(null, true);
        if (origin && corsOrigins.includes(origin)) return cb(null, true);
        logger.warn({ origin }, 'CORS: rejected request from unlisted origin');
        cb(new Error(`CORS: origin ${origin ?? 'unknown'} not allowed`));
      },
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization', 'x-request-id', 'x-csrf-token'],
      exposedHeaders: ['x-request-id'],
      maxAge: 600, // 10 min preflight cache
    }),
  );

  // 3. General rate limiter (non-auth endpoints)
  app.use(
    rateLimit({
      windowMs: env.RATE_LIMIT_WINDOW_MS,
      max: env.RATE_LIMIT_MAX,
      standardHeaders: 'draft-7',
      legacyHeaders: false,
      skip: () => env.NODE_ENV === 'development',
      keyGenerator: (req: Request) => req.ip ?? 'unknown',
      handler: (_req: Request, res: Response) => {
        res.status(429).json({
          success: false,
          message: 'Too many requests. Please try again later.',
          code: 'TOO_MANY_REQUESTS',
        });
      },
    }),
  );

  // 4. MongoDB query injection prevention
  app.use(
    mongoSanitize({
      onSanitize: ({ key }) => {
        logger.warn({ key }, 'MongoSanitize: sanitized potentially malicious key');
      },
    }),
  );

  // 5. HTTP parameter pollution prevention
  app.use(hpp());

  // 6. Response compression (gzip/brotli)
  app.use(compression());
}

/**
 * Stricter rate limiter for authentication / OTP routes.
 * Apply directly on the auth router.
 */
export const authRateLimiter = rateLimit({
  windowMs: env.AUTH_RATE_LIMIT_WINDOW_MS,
  max: env.AUTH_RATE_LIMIT_MAX,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  skip: () => env.NODE_ENV === 'development',
  skipSuccessfulRequests: false, // Count all attempts
  keyGenerator: (req: Request) => req.ip ?? 'unknown',
  handler: (_req: Request, res: Response) => {
    res.status(429).json({
      success: false,
      message: 'Too many authentication attempts. Please wait before trying again.',
      code: 'AUTH_RATE_LIMITED',
    });
  },
});

/**
 * CSRF protection using the double-submit cookie pattern (csrf-csrf).
 *
 * Usage in app.ts (after cookie-parser):
 *   app.use(csrfMiddleware);               // validates on mutating methods
 *   app.get('/csrf-token', generateToken); // client fetches this once
 *
 * The React client must:
 *   1. GET /api/v1/csrf-token to receive the token
 *   2. Include it as `x-csrf-token` header on every POST/PUT/PATCH/DELETE
 */
export const { generateToken: generateCsrfToken, doubleCsrfProtection: csrfMiddleware } =
  doubleCsrf({
    getSecret: () => env.JWT_ACCESS_SECRET, // reuse existing secret; dedicated CSRF_SECRET added in Step 2
    cookieName: isProd ? '__Host-psifi.x-csrf-token' : 'x-csrf-token',
    cookieOptions: {
      sameSite: 'strict',
      secure: isProd,
      httpOnly: true,
    },
    size: 64,
    getTokenFromRequest: (req) =>
      (req.headers['x-csrf-token'] as string | undefined) ?? '',
  });
