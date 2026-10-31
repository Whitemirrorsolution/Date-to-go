import 'dotenv/config';
import { z } from 'zod';

const envSchema = z.object({
  // Server
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.coerce.number().int().positive().default(5000),
  API_VERSION: z.string().default('v1'),

  // MongoDB
  MONGODB_URI: z.string().startsWith('mongodb', { message: 'MONGODB_URI must start with mongodb' }),

  // JWT
  JWT_ACCESS_SECRET: z.string().min(64, 'JWT_ACCESS_SECRET must be at least 64 characters'),
  JWT_REFRESH_SECRET: z.string().min(64, 'JWT_REFRESH_SECRET must be at least 64 characters'),
  JWT_ACCESS_EXPIRES_IN: z.string().default('15m'),
  JWT_REFRESH_EXPIRES_IN: z.string().default('7d'),
  SESSION_SECRET: z.string().min(32).optional(),

  // CORS
  CORS_ORIGINS: z.string().default('http://localhost:5173'),

  // Cookie
  COOKIE_DOMAIN: z.string().default('localhost'),

  // Rate limiting
  RATE_LIMIT_WINDOW_MS: z.coerce.number().int().positive().default(900_000),
  RATE_LIMIT_MAX: z.coerce.number().int().positive().default(1000),
  AUTH_RATE_LIMIT_WINDOW_MS: z.coerce.number().int().positive().default(900_000),
  AUTH_RATE_LIMIT_MAX: z.coerce.number().int().positive().default(10),

  // Logging
  LOG_LEVEL: z.enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace']).default('info'),

  // App
  APP_NAME: z.string().default('Date to Go'),
  APP_URL: z.string().url().default('http://localhost:5173'),

  // Seed
  ADMIN_EMAIL: z.string().email().optional(),
  ADMIN_PASSWORD: z.string().min(12).optional(),

  // OTP & Account Security
  OTP_EXPIRES_MINUTES: z.coerce.number().int().positive().default(5),
  OTP_MAX_ATTEMPTS: z.coerce.number().int().positive().default(5),
  ACCOUNT_LOCK_ATTEMPTS: z.coerce.number().int().positive().default(5),
  ACCOUNT_LOCK_DURATION_MS: z.coerce.number().int().positive().default(900_000),

  // Providers
  EMAIL_PROVIDER: z.enum(['console', 'resend', 'ses']).default('console'),
  SMS_PROVIDER: z.enum(['console', 'msg91', 'twilio', 'whatsapp']).default('console'),
  KYC_PROVIDER: z.enum(['mock', 'digilocker', 'digio', 'signzy']).default('mock'),

  // Email (Resend)
  RESEND_API_KEY: z.string().optional(),
  EMAIL_FROM: z.string().default('noreply@date-to-go.in'),

  // SMS (MSG91)
  MSG91_AUTH_KEY: z.string().optional(),
  MSG91_SENDER_ID: z.string().default('DTOGO'),

  // CSRF
  CSRF_SECRET: z.string().min(32, 'CSRF_SECRET must be at least 32 characters').default(
    'csrf-default-secret-change-in-production-xxxxxxxx',
  ),

  // Web Push
  VAPID_PUBLIC_KEY: z.string().optional(),
  VAPID_PRIVATE_KEY: z.string().optional(),
  VAPID_SUBJECT: z.string().default('mailto:support@date-to-go.in'),

  // Consent document versions
  TERMS_VERSION: z.string().default('1.0'),
  PRIVACY_VERSION: z.string().default('1.0'),
  COMMUNITY_GUIDELINES_VERSION: z.string().default('1.0'),

  // Razorpay Payment Gateway (Test keys only in dev/test)
  RAZORPAY_KEY_ID: z.string().default('rzp_test_DXRt0G9MOWbJmf'),
  RAZORPAY_KEY_SECRET: z.string().default('CVAwTKgzMn3JmsCV4BJII5bE'),
  RAZORPAY_WEBHOOK_SECRET: z.string().default('placeholder_webhook_secret_key_12345'),

  // GST & Business Invoicing Config
  GSTIN: z.string().default('27AAAAA0000A1Z5'),
  GST_RATE_PERCENT: z.coerce.number().default(18),
  COMPANY_NAME: z.string().default('Date to Go Experiences Pvt Ltd'),
  COMPANY_ADDRESS: z.string().default('Level 5, Platonic Plaza, Mumbai, Maharashtra 400001, India'),
  INVOICE_PREFIX: z.string().default('DTG-INV'),

  // Partner Rates & Platform Economics
  MIN_HOURLY_RATE_PAISE: z.coerce.number().default(50_000), // Min ₹500/hr
  MAX_HOURLY_RATE_PAISE: z.coerce.number().default(500_000), // Max ₹5000/hr
  PLATFORM_COMMISSION_PERCENT: z.coerce.number().default(10), // 10% Platform fee
  UPLOAD_MAX_FILE_SIZE_BYTES: z.coerce.number().default(5 * 1024 * 1024), // 5MB max
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.error('❌ Invalid environment variables:');
  console.error(parsed.error.flatten().fieldErrors);
  process.exit(1);
}

export const env = parsed.data;

/** Derived helpers */
export const isProd = env.NODE_ENV === 'production';
export const isDev = env.NODE_ENV === 'development';
export const isTest = env.NODE_ENV === 'test';

/** Parse CORS_ORIGINS into an array */
export const corsOrigins = env.CORS_ORIGINS.split(',').map((o) => o.trim());
