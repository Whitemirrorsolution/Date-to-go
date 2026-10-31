/**
 * Test environment setup.
 * Sets required env vars before any test file imports config/env.ts.
 * Use minimal values — no real secrets needed for tests.
 */
process.env['NODE_ENV'] = 'test';
process.env['PORT'] = '5999'; // Must be > 0 for Zod .positive(); test server uses in-process app
process.env['API_VERSION'] = 'v1';
process.env['MONGODB_URI'] = 'mongodb://127.0.0.1:27017/date-to-go-test';

// JWT — must be ≥64 chars each
process.env['JWT_ACCESS_SECRET'] =
  'test_access_secret_that_is_at_least_64_characters_long_xxxxxxxxxxxxxxxxx';
process.env['JWT_REFRESH_SECRET'] =
  'test_refresh_secret_that_is_at_least_64_characters_long_xxxxxxxxxxxxxxxx';
process.env['JWT_ACCESS_EXPIRES_IN'] = '15m';
process.env['JWT_REFRESH_EXPIRES_IN'] = '7d';

// CORS
process.env['CORS_ORIGINS'] = 'http://localhost:5173';
process.env['COOKIE_DOMAIN'] = 'localhost';

// Rate limits
process.env['RATE_LIMIT_WINDOW_MS'] = '900000';
process.env['RATE_LIMIT_MAX'] = '100';
process.env['AUTH_RATE_LIMIT_WINDOW_MS'] = '900000';
process.env['AUTH_RATE_LIMIT_MAX'] = '100'; // Raise in tests to avoid throttling

// Logging — use 'error' to suppress noise (pino doesn't support 'silent')
process.env['LOG_LEVEL'] = 'error';

// App
process.env['APP_NAME'] = 'Date to Go';
process.env['APP_URL'] = 'http://localhost:5173';

// OTP & account security
process.env['OTP_EXPIRES_MINUTES'] = '5';
process.env['OTP_MAX_ATTEMPTS'] = '5';
process.env['ACCOUNT_LOCK_ATTEMPTS'] = '5';
process.env['ACCOUNT_LOCK_DURATION_MS'] = '900000';

// Providers — use mock/console in tests, never real services
process.env['EMAIL_PROVIDER'] = 'console';
process.env['SMS_PROVIDER'] = 'console';
process.env['KYC_PROVIDER'] = 'mock';

// Email (unused in test but must pass Zod)
process.env['EMAIL_FROM'] = 'noreply@date-to-go.in';

// SMS (unused in test)
process.env['MSG91_SENDER_ID'] = 'DTOGO';

// CSRF secret — ≥32 chars
process.env['CSRF_SECRET'] = 'test-csrf-secret-at-least-32-chars-xxxxxxxxxx';

// Consent versions
process.env['TERMS_VERSION'] = '1.0';
process.env['PRIVACY_VERSION'] = '1.0';
process.env['COMMUNITY_GUIDELINES_VERSION'] = '1.0';

// Razorpay (placeholder — not called in tests)
process.env['RAZORPAY_KEY_ID'] = 'rzp_test_placeholder_key_id';
process.env['RAZORPAY_KEY_SECRET'] = 'placeholder_razorpay_secret_key_12345';
process.env['RAZORPAY_WEBHOOK_SECRET'] = 'placeholder_webhook_secret_key_12345';

// Business/invoicing (defaults used in tests)
process.env['GSTIN'] = '27AAAAA0000A1Z5';
process.env['GST_RATE_PERCENT'] = '18';
process.env['COMPANY_NAME'] = 'Date to Go Experiences Pvt Ltd';
process.env['COMPANY_ADDRESS'] = 'Level 5, Platonic Plaza, Mumbai 400001';
process.env['INVOICE_PREFIX'] = 'DTG-INV';

// Platform economics
process.env['MIN_HOURLY_RATE_PAISE'] = '50000';
process.env['MAX_HOURLY_RATE_PAISE'] = '500000';
process.env['PLATFORM_COMMISSION_PERCENT'] = '10';
process.env['UPLOAD_MAX_FILE_SIZE_BYTES'] = '5242880';
