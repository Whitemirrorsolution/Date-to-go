# Phase R1 Plan: Role & Entitlement Foundation

## Goals
1. Migrate the `role` enum to a `roles` array (SEEKER, PARTNER, ADMIN).
2. Introduce `activeMode` (SEEKER, PARTNER) to determine the user's active UI shell.
3. Decouple entitlements (derived from active subscriptions) from roles.
4. Compute partner onboarding states dynamically in the backend (no client-side trust).
5. Split the frontend into two distinct route trees and shells (`/s/*` and `/p/*`).

## Steps

### Backend
1. **Schema Updates:** 
   - `User.ts`: Change `role` to `roles: string[]`, add `activeMode`.
   - `Plan.ts`: Add `audience: 'SEEKER' | 'PARTNER' | 'BOTH'`.
2. **Data Migration Script:**
   - Write an idempotent script to map existing users' `role: 'USER'` to `roles: ['SEEKER']` and `role: 'PARTNER'` to `roles: ['SEEKER', 'PARTNER']`. Add `activeMode`.
3. **Core API / Entitlements:**
   - Create `resolveNextRoute(user, mode, entitlements, partnerState)` function (unit tested).
   - Update `GET /auth/me` to return `{ roles, activeMode, entitlements, partner: { onboardingState, missing }, nextRoute }`.
   - Implement `POST /auth/mode` to switch `activeMode`.
4. **Subscription / Fulfillment:**
   - Update `PaymentService` to push `PARTNER` to `roles` if the plan purchased is a Partner plan.
   - Update `Register` to accept `intent` and set initial `activeMode` and `roles`.
5. **Middlewares:**
   - Refactor `requireRole` and add `requireEntitlement(audience)` with exact error codes.

### Frontend
1. **App Routing & Shells:**
   - Introduce `SeekerShell` (bottom nav for Seeker) and `PartnerShell` (bottom nav for Partner with distinct styling and "PARTNER MODE" pill).
   - Map `/s/*` and `/p/*` routes.
2. **Guards & Navigation:**
   - Add `RequireRole` and `RequireEntitlement` higher-order components.
   - Update `/dashboard` and login/payment success to simply navigate to `nextRoute` returned by the server.
3. **Switch & Onboarding:**
   - Add `ModeSwitcher` in headers.
   - Create the `/become-partner` pitch page + redirect to partner plans.

### Tests
- Unit tests for `resolveNextRoute` and entitlement calculation.
- E2E/Playwright test skeleton for mode switching and routing correctness.
