# Payment Flow Trace

This document traces the Razorpay subscription payment flow, highlighting where it previously broke and how it operates now.

## Previous Flow (Broken)

1. **Client**: User clicks "Purchase Plan" on `/pricing`.
2. **Client**: Frontend sends `POST /api/v1/payments/plan/order` to create Razorpay order.
3. **Server**: Retrieves Plan pricing from database, uses `razorpay.orders.create`, saves `Payment` as `CREATED`.
4. **Client**: Razorpay Checkout popup opens. User completes payment.
5. **Client**: On success, Razorpay calls the checkout `handler` function.
6. **Client**: Frontend sends `POST /api/v1/payments/verify`.
7. **Server**: Validates signature, sets `payment.status = 'CAPTURED'`, and calls `fulfillSubscription`. **[BREAK POINT 1: Race Condition]**
8. **Webhook**: Razorpay simultaneously fires `payment.captured` webhook to `POST /api/v1/payments/webhook`.
9. **Server**: Validates webhook signature, and attempts to fulfill subscription again. Due to lack of atomic locks, two identical subscriptions were sometimes generated, leading to incorrect active states and dual invoice generation.
10. **Client**: `POST /verify` returns success. Frontend calls `navigate('/billing')` immediately. **[BREAK POINT 2: UI State]**
11. **Client**: The Dashboard remains inaccessible because the frontend didn't refetch the user or access status, leading to "Payment Required" or stale plan UI.
12. **Server**: The existing active plan logic calculated the new `endsAt` date from the *start* of the previous plan, rather than stacking from the *end* of the previous plan. **[BREAK POINT 3: Extension Bug]**

## Current Flow (Fixed)

1. **Client**: User clicks "Purchase Plan".
2. **Client**: Frontend queries `GET /api/v1/payments/config` to safely receive the `RAZORPAY_KEY_ID`.
3. **Client**: Frontend sends `POST /api/v1/payments/plan/order`.
4. **Server**: Saves `Payment` as `CREATED`.
5. **Client**: Razorpay Checkout popup opens. User completes payment.
6. **Client**: On success, Frontend sends `POST /api/v1/payments/verify`.
7. **Webhook & Verify**: Both the client callback and the webhook call `activateSubscriptionFromPayment`.
8. **Server (Atomic Lock)**: `activateSubscriptionFromPayment` uses `findOneAndUpdate` to atomically transition the `Payment` from `CREATED` to `CAPTURED`. Whichever request arrives first performs the subscription fulfillment. The slower request safely fetches the already-created subscription and returns a success response.
9. **Server (Subscription Fulfillment)**: The system checks for an existing active plan (even one without an `endsAt` date). If an existing plan exists, the new duration is added to `max(now, oldEndsAt)`. For lifetime plans (0 days duration), `endsAt` is explicitly set to `null`.
10. **Client**: The frontend verifies the payment, but doesn't assume fulfillment yet. It polls `GET /payments/status/:orderId` every 2 seconds.
11. **Client**: Once the status endpoint confirms the payment is `CAPTURED` and the subscription exists, the frontend fires a `dtg:payment_success` event, refreshes the user context, and explicitly navigates to the dashboard via `replace: true`.
12. **Client**: The Dashboard calls `GET /api/v1/auth/me/access` which reliably computes `hasActivePlan` from the database.
