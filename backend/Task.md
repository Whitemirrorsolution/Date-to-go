TASK: Diagnose and fix the subscription + payment + post-purchase flow end to end. Currently the basic UI flow exists but functions do not work after payment (subscription not activating, dashboard not unlocking, wrong redirects, or inconsistent states). Do not redesign the UI; fix behavior. Work test-driven.

1. REPRODUCE AND TRACE
- Run the stack locally with Razorpay TEST keys. Add structured logs (no PII, no secrets) with a correlationId across: create order -> checkout opened -> client success handler -> POST /payments/verify -> webhook -> subscription activation -> GET /me/access -> client redirect. Produce docs/PAYMENT_FLOW_TRACE.md showing where the flow breaks today, and a ROOT_CAUSES.md listing every defect found with file/line and the fix applied.

2. CHECK AND FIX THESE COMMON DEFECTS (verify each, fix if present)
- Env/config: separate vars RAZORPAY_KEY_ID, RAZORPAY_KEY_SECRET, RAZORPAY_WEBHOOK_SECRET; fail fast on missing vars; frontend receives only the key id (via GET /payments/config), never the secret.
- Order creation: amount computed on the server from DB (plan price + GST config) in integer paise, currency INR, receipt string <= 40 chars, notes include userId and planId (no PII), reject duplicate pending orders for the same plan within a short window (reuse the existing order).
- Signature verification: POST /payments/verify validates HMAC SHA256 of "order_id|payment_id" with the key secret using constant-time comparison; webhook validates X-Razorpay-Signature against the RAW request body with the webhook secret (mount express.raw on the webhook route BEFORE any json body parser).
- Idempotent activation: make activation a single service function activateSubscriptionFromPayment(paymentId) used by BOTH /payments/verify and the webhook. Use an atomic status transition (findOneAndUpdate CREATED -> PAID) or a MongoDB transaction so double delivery or verify+webhook racing never creates two subscriptions. Store processed webhook event ids.
- Subscription math: startsAt = max(now, currentActiveEndsAt) for renewals (stacking), endsAt from plan duration, lifetime plans endsAt = null. Expired state computed by an index-backed query plus a daily job; never trust a stale boolean.
- Access control: /me/access derives hasActivePlan from the Subscription collection (no caching beyond the request) and returns nextStep. Do NOT embed plan status in the JWT; if you currently do, remove it or force token refresh after activation.
- Failure handling: handle payment.failed, order.paid, refund.processed; when the user closes Razorpay checkout (ondismiss) or payment fails, mark the attempt cancelled/failed and let the user retry with a fresh order.
- Local dev: add docs and an npm script for exposing the webhook (cloudflared or ngrok) plus a dev-only script `npm run dev:simulate-webhook -- <orderId>` that posts a correctly signed webhook payload to the local server (guarded by NODE_ENV !== 'production').

3. CLIENT POST-PAYMENT FLOW (fix the exact sequence)
- Razorpay success handler -> show the "Payment Processing" dialog -> call POST /payments/verify -> poll GET /payments/:orderId/status every 2s for up to 60s (webhook may be the one that confirms) -> when ACTIVE: invalidate/refetch ['me'], ['access'], ['subscription'], ['transactions'] queries, show the "Payment Successful" popup with plan name and validity, and navigate to the dashboard with history replace (back button must not return to checkout).
- If still pending after 60s: show an informational state with "We will activate your plan as soon as the payment is confirmed" and a "Check status" button; also push/in-app notification when it activates.
- Failure/cancel states with a Retry button that creates a new order. Prevent double taps (disable button, idempotency key per attempt).
- Ensure no stale gating: route guards re-evaluate nextStep after payment; the plan page must redirect to the dashboard if the user already has an active plan.

4. DASHBOARD AFTER PURCHASE (role aware)
- Dashboard shows Membership card (plan, expiry or "Lifetime", renew button), status chips (Membership Active / Profile Live / Under Review / KYC pending) driven by server fields.
- BECOME-a-partner users: onboarding checklist (profile -> services with rates -> availability -> KYC -> submit for review -> Profile Live) with progress and locked/unlocked items. FIND-a-partner users: Browse + Buy Services + My Bookings entry points.
- Transactions screen lists the membership payment with status Success, receipt/invoice download, and order id detail sheet.
- Sends receipt email and in-app notification once; no duplicates.

5. TESTS (all must pass)
- Unit: signature verify (valid, tampered, wrong secret), subscription date math (new, renew, lifetime, expired), activation idempotency under concurrent calls.
- Integration (Supertest + test DB): order -> verify -> ACTIVE -> /me/access = DASHBOARD; webhook-only path; verify-only path; duplicate webhook; failed payment; amount tampering; unauthenticated access; expired plan -> PLAN_REQUIRED.
- Playwright e2e with Razorpay test mode (or a mocked checkout in CI): register -> plan -> pay -> processing -> success popup -> dashboard unlocked; failed and cancelled payment retry; reload on dashboard keeps access; logout/login lands on dashboard; expired plan lands on plan page.
- Output a final report listing what was broken, what was changed, and remaining risks.TASK: Diagnose and fix the subscription + payment + post-purchase flow end to end. Currently the basic UI flow exists but functions do not work after payment (subscription not activating, dashboard not unlocking, wrong redirects, or inconsistent states). Do not redesign the UI; fix behavior. Work test-driven.

1. REPRODUCE AND TRACE
- Run the stack locally with Razorpay TEST keys. Add structured logs (no PII, no secrets) with a correlationId across: create order -> checkout opened -> client success handler -> POST /payments/verify -> webhook -> subscription activation -> GET /me/access -> client redirect. Produce docs/PAYMENT_FLOW_TRACE.md showing where the flow breaks today, and a ROOT_CAUSES.md listing every defect found with file/line and the fix applied.

2. CHECK AND FIX THESE COMMON DEFECTS (verify each, fix if present)
- Env/config: separate vars RAZORPAY_KEY_ID, RAZORPAY_KEY_SECRET, RAZORPAY_WEBHOOK_SECRET; fail fast on missing vars; frontend receives only the key id (via GET /payments/config), never the secret.
- Order creation: amount computed on the server from DB (plan price + GST config) in integer paise, currency INR, receipt string <= 40 chars, notes include userId and planId (no PII), reject duplicate pending orders for the same plan within a short window (reuse the existing order).
- Signature verification: POST /payments/verify validates HMAC SHA256 of "order_id|payment_id" with the key secret using constant-time comparison; webhook validates X-Razorpay-Signature against the RAW request body with the webhook secret (mount express.raw on the webhook route BEFORE any json body parser).
- Idempotent activation: make activation a single service function activateSubscriptionFromPayment(paymentId) used by BOTH /payments/verify and the webhook. Use an atomic status transition (findOneAndUpdate CREATED -> PAID) or a MongoDB transaction so double delivery or verify+webhook racing never creates two subscriptions. Store processed webhook event ids.
- Subscription math: startsAt = max(now, currentActiveEndsAt) for renewals (stacking), endsAt from plan duration, lifetime plans endsAt = null. Expired state computed by an index-backed query plus a daily job; never trust a stale boolean.
- Access control: /me/access derives hasActivePlan from the Subscription collection (no caching beyond the request) and returns nextStep. Do NOT embed plan status in the JWT; if you currently do, remove it or force token refresh after activation.
- Failure handling: handle payment.failed, order.paid, refund.processed; when the user closes Razorpay checkout (ondismiss) or payment fails, mark the attempt cancelled/failed and let the user retry with a fresh order.
- Local dev: add docs and an npm script for exposing the webhook (cloudflared or ngrok) plus a dev-only script `npm run dev:simulate-webhook -- <orderId>` that posts a correctly signed webhook payload to the local server (guarded by NODE_ENV !== 'production').

3. CLIENT POST-PAYMENT FLOW (fix the exact sequence)
- Razorpay success handler -> show the "Payment Processing" dialog -> call POST /payments/verify -> poll GET /payments/:orderId/status every 2s for up to 60s (webhook may be the one that confirms) -> when ACTIVE: invalidate/refetch ['me'], ['access'], ['subscription'], ['transactions'] queries, show the "Payment Successful" popup with plan name and validity, and navigate to the dashboard with history replace (back button must not return to checkout).
- If still pending after 60s: show an informational state with "We will activate your plan as soon as the payment is confirmed" and a "Check status" button; also push/in-app notification when it activates.
- Failure/cancel states with a Retry button that creates a new order. Prevent double taps (disable button, idempotency key per attempt).
- Ensure no stale gating: route guards re-evaluate nextStep after payment; the plan page must redirect to the dashboard if the user already has an active plan.

4. DASHBOARD AFTER PURCHASE (role aware)
- Dashboard shows Membership card (plan, expiry or "Lifetime", renew button), status chips (Membership Active / Profile Live / Under Review / KYC pending) driven by server fields.
- BECOME-a-partner users: onboarding checklist (profile -> services with rates -> availability -> KYC -> submit for review -> Profile Live) with progress and locked/unlocked items. FIND-a-partner users: Browse + Buy Services + My Bookings entry points.
- Transactions screen lists the membership payment with status Success, receipt/invoice download, and order id detail sheet.
- Sends receipt email and in-app notification once; no duplicates.

5. TESTS (all must pass)
- Unit: signature verify (valid, tampered, wrong secret), subscription date math (new, renew, lifetime, expired), activation idempotency under concurrent calls.
- Integration (Supertest + test DB): order -> verify -> ACTIVE -> /me/access = DASHBOARD; webhook-only path; verify-only path; duplicate webhook; failed payment; amount tampering; unauthenticated access; expired plan -> PLAN_REQUIRED.
- Playwright e2e with Razorpay test mode (or a mocked checkout in CI): register -> plan -> pay -> processing -> success popup -> dashboard unlocked; failed and cancelled payment retry; reload on dashboard keeps access; logout/login lands on dashboard; expired plan lands on plan page.
- Output a final report listing what was broken, what was changed, and remaining risks.