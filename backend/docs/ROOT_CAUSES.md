# Root Causes and Defect Fixes

This document catalogs the defects discovered and fixed during the end-to-end payment and subscription flow stabilization phase.

### 1. Webhook Signature Parsing
- **File**: `backend/src/routes/payments.ts`
- **Issue**: Razorpay requires the X-Razorpay-Signature HMAC verification to run against the *raw* request body string/buffer. Previously, it could have run on the parsed JSON if `express.raw` wasn't positioned correctly, causing validation to fail sporadically.
- **Fix**: Verified `app.ts` injects the raw buffer via `express.raw` correctly, and `handleWebhook` correctly consumes it.

### 2. Double Subscription Generation (Race Condition)
- **File**: `backend/src/services/PaymentService.ts`
- **Issue**: Both `verifyAndFulfill` (client callback) and `handleWebhook` (Razorpay callback) performed non-atomic updates to `Payment` and subsequently called `fulfillSubscription`. If both arrived concurrently, two identical subscriptions were generated for a single payment.
- **Fix**: Centralized subscription fulfillment into `activateSubscriptionFromPayment`. This uses an atomic `Payment.findOneAndUpdate` condition to flip status from `CREATED` to `CAPTURED`. Only the request that succeeds in performing this atomic transition is allowed to run `fulfillSubscription`.

### 3. Subscription Extension Bug
- **File**: `backend/src/services/PaymentService.ts`
- **Issue**: When an existing user purchased a new plan to extend their active subscription, `endsAt` was calculated as `startsAt + duration` instead of `oldEndsAt + duration`. This effectively cheated the user out of their remaining time.
- **Fix**: Updated `activateSubscriptionFromPayment` to use `max(now, oldEndsAt)` as the base date for adding the new duration (`plan.durationDays * 24 * 60 * 60 * 1000`).

### 4. Lifetime Plan Support
- **File**: `backend/src/models/Subscription.ts`, `backend/src/services/PaymentService.ts`, `backend/src/routes/payments.ts`, `backend/src/middlewares/auth.ts`
- **Issue**: The `endsAt` field was marked as required (`true`), which prevented saving a lifetime plan (a plan where `endsAt` is effectively `null` or absent). Additionally, queries like `endsAt: { $gt: now }` excluded lifetime plans.
- **Fix**: Changed `endsAt: { type: Date }` to not be required in the DB schema. Updated TypeScript interface `ISubscription` to `endsAt?: Date | null`. Updated all active-plan queries to `$or: [{ endsAt: { $gt: now } }, { endsAt: null }]`.

### 5. Frontend API Key Hardcoding
- **File**: `frontend/src/pages/PricingPage.tsx`
- **Issue**: The Razorpay API Key ID was read directly from `import.meta.env.VITE_RAZORPAY_KEY_ID`. In a distributed or production environment, it is best practice to pull this configuration securely from the backend to ensure environments match.
- **Fix**: Implemented `GET /api/v1/payments/config` on the backend. The frontend now fetches the config over API and falls back to a dummy key only if the request fails.

### 6. Frontend Checkout Flow State
- **File**: `frontend/src/pages/PricingPage.tsx`
- **Issue**: `PricingPage` used to redirect to `/billing` immediately after `POST /payments/verify` returned 200 OK. However, the system requires a brief wait for the backend to fully finish generating the subscription context.
- **Fix**: Added a client-side polling mechanism using `GET /payments/status/:orderId`. The client polls every 2 seconds for up to 60 seconds. Once `isFulfilled` returns `true`, it navigates gracefully using `replace: true` (preventing back-button bugs).

### 7. Global /me/access Gating
- **File**: `backend/src/routes/auth.ts`
- **Issue**: The frontend was missing a cohesive `/me/access` endpoint to accurately check for an active plan, KYC status, and listing status, in order to deduce the `nextStep`.
- **Fix**: Implemented `GET /api/v1/auth/me/access` that securely determines `hasActivePlan` from the `Subscription` collection and returns `nextStep` (DASHBOARD, PLAN, KYC, PROFILE) without caching.
