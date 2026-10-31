# Date to Go 🇮🇳

> **Secure, verified platonic companion booking platform for India.**  
> A monorepo containing an Express + MongoDB API server and a React + Vite PWA client.

---

## Table of Contents

- [Project Structure](#project-structure)
- [Prerequisites](#prerequisites)
- [Quick Start](#quick-start)
- [Environment Variables](#environment-variables)
- [Running the App](#running-the-app)
- [Database Seeding](#database-seeding)
- [Running Tests](#running-tests)
- [Manual Test Checklist](#manual-test-checklist)
- [API Reference](#api-reference)
- [Security Baseline](#security-baseline)
- [Data Models](#data-models)

---

## Project Structure

```
date-to-go/
├── backend/                  # Node.js + Express + TypeScript API
│   ├── src/
│   │   ├── config/           # env.ts (Zod-validated), database.ts
│   │   ├── middlewares/      # security, requestId, httpLogger, errorHandler
│   │   ├── models/           # All Mongoose models (14 total)
│   │   ├── routes/           # health.ts (and future versioned routes)
│   │   ├── scripts/          # seed.ts
│   │   ├── utils/            # AppError, asyncHandler, logger
│   │   ├── app.ts            # Express app factory
│   │   └── server.ts         # Entry point + graceful shutdown
│   ├── tests/
│   │   ├── setup.ts          # Test env vars
│   │   ├── health.test.ts    # Health route integration tests
│   │   └── models.test.ts    # Model validation tests (no DB needed)
│   ├── .env                  # Local secrets (gitignored)
│   ├── .env.example          # Template — copy to .env
│   └── package.json
├── frontend/                 # React + Vite + TypeScript PWA
│   └── ...
├── package.json              # Workspace root with dev scripts
└── README.md
```

---

## Prerequisites

| Tool    | Minimum version |
|---------|----------------|
| Node.js | 20.x           |
| npm     | 10.x           |
| MongoDB | 7.x (local or Atlas) |

---

## Quick Start

```bash
# 1. Clone and install all workspace dependencies
git clone <repo-url>
cd date-to-go
npm install

# 2. Configure backend env vars
cp backend/.env.example backend/.env
# → Edit backend/.env with your values (see Environment Variables)

# 3. Seed the database (categories, plans, admin user)
npm run seed --workspace=backend

# 4. Start both servers
npm run dev:backend    # API → http://localhost:5000
npm run dev:frontend   # PWA → http://localhost:5173
```

---

## Environment Variables

Copy `backend/.env.example` → `backend/.env` and fill in:

| Variable | Description | Default |
|---|---|---|
| `NODE_ENV` | `development` / `production` / `test` | `development` |
| `PORT` | HTTP port | `5000` |
| `MONGODB_URI` | MongoDB connection string | `mongodb://127.0.0.1:27017/date-to-go-dev` |
| `JWT_ACCESS_SECRET` | Min 64 chars — generate with `openssl rand -hex 64` | — |
| `JWT_REFRESH_SECRET` | Min 64 chars | — |
| `JWT_ACCESS_EXPIRES_IN` | Access token lifetime | `15m` |
| `JWT_REFRESH_EXPIRES_IN` | Refresh token lifetime | `7d` |
| `CORS_ORIGINS` | Comma-separated allowed origins | `http://localhost:5173` |
| `RATE_LIMIT_MAX` | Max requests per window | `100` |
| `AUTH_RATE_LIMIT_MAX` | Max auth attempts per window | `10` |
| `LOG_LEVEL` | pino log level | `info` |
| `ADMIN_EMAIL` | Email for seeded admin user | — |
| `ADMIN_PASSWORD` | Password for seeded admin (min 12 chars) | — |

---

## Running the App

```bash
# Both workspaces concurrently (use two terminals or a process manager)
npm run dev:backend    # backend only
npm run dev:frontend   # frontend only

# Production build
npm run build          # builds all workspaces
```

---

## Database Seeding

```bash
# From project root:
npm run seed --workspace=backend

# Or from backend/ directory:
npm run seed
```

The seed script creates (idempotent — safe to run multiple times):

1. **8 Categories** — City Tour, Coffee, Movie, Event, Walking, Dinner, Senior Support, Errands  
2. **4 Subscription Plans**:

   | Plan | Audience | Price | Duration | Booking Limit |
   |------|----------|-------|----------|---------------|
   | Partner Monthly | PARTNER | ₹199 | 30 days | 10/month |
   | Partner Quarterly | PARTNER | ₹499 | 90 days | 40/quarter |
   | User Monthly | USER | ₹299 | 30 days | 5/month |
   | User Quarterly | USER | ₹799 | 90 days | 20/quarter |

3. **1 Admin User** — from `ADMIN_EMAIL` / `ADMIN_PASSWORD` in `.env`

---

## Running Tests

```bash
# From backend/ directory or using workspace flag:
npm run test --workspace=backend           # all tests, verbose
npm run test:watch --workspace=backend     # watch mode
npm run test:coverage --workspace=backend  # with coverage report
```

> **Note**: Model validation tests (`models.test.ts`) run entirely in-memory — **no MongoDB connection required**.  
> Integration tests (`health.test.ts`) also run without a DB; they test the HTTP layer only.

---

## Manual Test Checklist

Use these curl commands to manually verify the running server:

### Health Check

```bash
# Should return 200 with app metadata
curl http://localhost:5000/api/v1/health

# Expected response:
# {
#   "success": true,
#   "app": "Date to Go",
#   "version": "v1",
#   "environment": "development",
#   "timestamp": "2025-...",
#   "uptime": 12,
#   "database": "connected"
# }
```

### Request ID

```bash
# Should echo back your x-request-id
curl -H "x-request-id: my-trace-123" http://localhost:5000/api/v1/health -v
# Look for: < x-request-id: my-trace-123
```

### 404 Handler

```bash
curl http://localhost:5000/api/v1/does-not-exist
# Expected: { "success": false, "code": "NOT_FOUND", "message": "..." }
```

### CORS Rejection

```bash
curl -H "Origin: https://evil.example.com" http://localhost:5000/api/v1/health -v
# Expected: No access-control-allow-origin header in response
```

### Security Headers (Helmet)

```bash
curl http://localhost:5000/api/v1/health -v
# Check for:
# < x-content-type-options: nosniff
# < x-frame-options: SAMEORIGIN
# < x-dns-prefetch-control: off
# No: < x-powered-by (should be absent)
```

### Rate Limiting

```bash
# Hit the API 101 times quickly — the 101st should return 429
for i in $(seq 1 101); do curl -s -o /dev/null -w "%{http_code}\n" http://localhost:5000/api/v1/health; done
```

---

## API Reference

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/api/v1/health` | Health check — DB status, uptime, version |

> More endpoints will be added in subsequent steps (auth, booking, partner, admin).

---

## Security Baseline

All security middleware is applied in [`security.ts`](backend/src/middlewares/security.ts):

| Layer | Library | Notes |
|-------|---------|-------|
| Security headers | `helmet` | CSP, HSTS (prod), no X-Powered-By |
| CORS | `cors` | Strict allowlist; credentials enabled |
| Rate limiting | `express-rate-limit` | 100 req/15min global; 10 req/15min auth |
| NoSQL injection | `express-mongo-sanitize` | Strips `$` and `.` keys |
| Parameter pollution | `hpp` | Deduplicates query params |
| Compression | `compression` | gzip/brotli |
| Body limit | built-in | 10 KB max body |

---

## Payment Gateway & Pre-Production Compliance

> [!IMPORTANT]
> ### ⚠️ CRITICAL TODO: Payment Gateway Business Category & Compliance
> Before switching from **Razorpay TEST mode** (`rzp_test_...`) to **LIVE mode** (`rzp_live_...`), you **MUST** complete the following compliance checklist — failure to do so can result in a merchant account suspension or indefinite hold on live payouts:

#### Razorpay Live-Mode Checklist

| # | Step | Status |
|---|------|--------|
| 1 | **Business Category Confirmation** — During Razorpay onboarding, select: *"Online Services > Event & Experience Ticketing"* or *"Marketplace > Lifestyle & Leisure"*. Explicitly inform the onboarding manager this is a **100% platonic, non-romantic** platform. | ⏳ TODO |
| 2 | **Platform Policy Submission** — Submit Date to Go's *Anti-Escort & Community Guidelines*, mandatory Partner KYC verification flow (DigiLocker/Digio), content moderation policy, and reporting mechanism to the gateway's compliance team in writing. | ⏳ TODO |
| 3 | **GST Registration** — Configure your real GSTIN and company details in `.env` (`GSTIN`, `COMPANY_NAME`, `COMPANY_ADDRESS`) before issuing live tax invoices. Ensure SAC Code `998439` is correct for your CA. | ⏳ TODO |
| 4 | **Webhook Security** — Set `RAZORPAY_WEBHOOK_SECRET` in production `.env` to exactly match the Webhook Secret shown on the Razorpay Dashboard > Settings > Webhooks. Never use the placeholder value. | ⏳ TODO |
| 5 | **Live Key Rotation** — Replace `RAZORPAY_KEY_ID` and `RAZORPAY_KEY_SECRET` with `rzp_live_...` keys in production **only**. Never commit live keys to git. | ⏳ TODO |
| 6 | **PCI-DSS** — Razorpay Checkout JS handles card data on their servers; you never touch raw card numbers. Confirm with your CA/legal that this PCI-DSS SAQ-A compliance path is sufficient for your licence. | ⏳ TODO |
| 7 | **Refund Policy** — Define and publish refund terms (e.g., 48-hour cancellation window, platform fee non-refundable). Ensure `refundPayment()` aligns with published policy. | ⏳ TODO |

> [!NOTE]
> The application currently uses **Razorpay TEST mode** throughout. All test-mode transactions are simulated and no real money changes hands. Test key values are committed to `.env` as defaults and are intentionally non-secret.

---

## Step 3 API Reference — Plans & Payments

### Plans (Public + Admin)

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| `GET` | `/api/v1/plans` | None | List active plans (`?audience=USER\|PARTNER`) |
| `GET` | `/api/v1/plans/:id` | None | Get plan by ID |
| `POST` | `/api/v1/plans` | ADMIN | Create plan |
| `PATCH` | `/api/v1/plans/:id` | ADMIN | Update plan |
| `DELETE` | `/api/v1/plans/:id` | ADMIN | Deactivate plan (soft delete) |

### Payments

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| `POST` | `/api/v1/payments/plan/order` | USER\|PARTNER | Create Razorpay order (amount from DB) |
| `POST` | `/api/v1/payments/verify` | USER\|PARTNER | Verify client signature & activate subscription |
| `POST` | `/api/v1/payments/webhook` | Public (HMAC) | Razorpay webhook — source of truth |
| `GET` | `/api/v1/payments/status/:orderId` | USER\|PARTNER | Poll payment status for UI |
| `GET` | `/api/v1/payments/subscription` | USER\|PARTNER | Current active subscription |
| `GET` | `/api/v1/payments/history` | USER\|PARTNER | Payment history |
| `GET` | `/api/v1/payments/invoices/:paymentId` | USER\|PARTNER | GST invoice data (JSON) |
| `GET` | `/api/v1/payments/invoices/:paymentId/pdf` | USER\|PARTNER | Download GST invoice PDF |
| `POST` | `/api/v1/payments/refund` | ADMIN | Admin-triggered refund |

### Plan Gating

All `discover` and `partner` routes are gated by `requireActivePlan` — returns **402 PLAN_REQUIRED** if no active subscription:

```
requireAuth → requireRole → requireActivePlan → handler
```

---

## Subscription Expiry Cron Job

The `subscriptionExpiry` cron runs **every hour** (`0 * * * *`) to:

1. Mark `ACTIVE` subscriptions where `endsAt ≤ now` as `EXPIRED`
2. For expired PARTNER subscriptions: set `PartnerProfile.isListed = false` (removes from discovery)
3. Send in-app notifications for expired subscriptions
4. Send **3-day advance expiry reminders** (deduped per 24h to avoid spam)

---

## Test Suite (All Steps)

```bash
cd backend && npm test
```

| File | Tests | Coverage |
|------|-------|---------|
| `tests/health.test.ts` | 8 | Health route, CORS, security headers |
| `tests/models.test.ts` | 58 | All Mongoose model validations |
| `tests/auth.test.ts` | 28 | Passwords, JWT, OTP, lockout, RBAC |
| `tests/step3_payments.test.ts` | 14 | Signature, idempotency, amount, 402, renew, GST |
| `tests/step4_full_flow.test.ts` | 11 | E2E: consent, discovery, moderation, SOS |
| **Total** | **119** | **All passing ✅** |

---

## Security Baseline

All security middleware is applied in [`security.ts`](backend/src/middlewares/security.ts):

| Layer | Library | Notes |
|-------|---------|-------|
| Security headers | `helmet` | CSP, HSTS (prod), no X-Powered-By |
| CORS | `cors` | Strict allowlist; credentials enabled |
| Rate limiting | `express-rate-limit` | 100 req/15min global; 10 req/15min auth |
| NoSQL injection | `express-mongo-sanitize` | Strips `$` and `.` keys |
| Parameter pollution | `hpp` | Deduplicates query params |
| Compression | `compression` | gzip/brotli |
| Body limit | built-in | 100 KB max body |
| CSRF | `csrf-csrf` | Double-submit cookie for cookie-based auth |
| Token security | argon2id | Passwords; SHA-256 for OTPs and refresh tokens |
| Payment security | HMAC SHA-256 | All Razorpay signature verifications use `timingSafeEqual` |

---

## Data Models

| Model | Purpose |
|-------|---------|
| `User` | Core account: auth, KYC status, lockout fields |
| `RefreshToken` | Hashed refresh tokens with family tracking (reuse detection) |
| `Otp` | Hashed OTPs for email/phone/password reset |
| `PartnerProfile` | Companion profile, slots, rate, photos |
| `Category` | Booking categories (City Tour, Dinner, etc.) |
| `Plan` | Subscription plans with pricing in paise |
| `Payment` | Razorpay order + webhook event IDs (idempotency) |
| `Subscription` | Active plan grant with endsAt |
| `Booking` | Booking state machine: REQUESTED→ACCEPTED→PAID→COMPLETED |
| `Review` | Star rating + text reviews |
| `Message` | In-booking chat (moderated) |
| `Report` | User safety reports |
| `Block` | Bidirectional user blocks |
| `Notification` | In-app notifications |
| `AuditLog` | Immutable compliance audit trail |
| `ConsentLog` | T&C / Privacy consent records |
