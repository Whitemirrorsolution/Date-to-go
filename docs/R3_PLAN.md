# R3_PLAN: Real Seeker Experience (SeekerShell)

## 1. Goal
Implement the fully-featured Seeker mode inside the `SeekerShell`. All data will be fetched from existing APIs, and missing features will show proper empty states. Stage styling will be unified using centralized stage tokens (CSS variables + TS maps).

## 2. Core Foundation
1. **Stage Tokens (`src/utils/bookingStages.ts` & `index.css`)**:
   - Define CSS variables in `index.css` for each booking stage color.
   - Export a TypeScript configuration mapping stage statuses (`REQUESTED`, `ACCEPTED`, `PAYMENT_PENDING`, `PAID`, `IN_PROGRESS`, `AWAITING_OTP`, `COMPLETED`, `DECLINED`, `CANCELLED`, `EXPIRED`, `DISPUTED`, `REFUNDED`) to their respective tokens, labels, and descriptions.
   - Components to build: `StageChip` and `StageStepper`.

## 3. Frontend Architecture (SeekerShell)
1. **Home (`/s/home`)**:
   - **Header**: Avatar, greeting, notifications bell (unread count from API).
   - **Action Required Strip**: Fetches active bookings and identifies actions (e.g. `PAYMENT_PENDING` -> confirm & pay countdown; `AWAITING_OTP` -> show OTP; `COMPLETED` without review -> leave review).
   - **Next Booking Card**: Prominently displays the most imminent booking with `StageChip`.
   - **Categories Grid**: Fetches from `GET /categories`, links to `/s/category/:slug`.
   - **"Near You" Listings**: Fetches listings for user's city; shows empty state ("No bookings yet in your city" + Notify me).
   - **"Become a Partner"**: Conditionally rendered if `!accessData.roles.includes('PARTNER')`.

2. **Bookings (`/s/bookings`)**:
   - Tabbed view: All, Requested, Accepted, Payment, Paid, In progress, Completed, Cancelled.
   - Integrates `StageChip` and `StageStepper`.
   - Elegant empty states with a "Clear Filters" button when appropriate.

3. **History (`/s/history`)**:
   - Displays a unified list of payments (membership, bookings, refunds).
   - Uses `StageChip` for payment statuses (`CAPTURED`, `FAILED`, `REFUNDED`).
   - Detail sheet and invoice download functionality.

4. **Profile (`/s/profile`)**:
   - Basic details and preferences (preferred gender, city).
   - **Membership Card**: Shows active subscription (`entitlements.seeker`), expiry date, and "Renew" button.
   - Mode switcher (to switch to Partner mode if eligible).
   - Settings (notifications, help, legal, logout, delete account).
   - Note: The seeker does NOT have wallet/top-up access.

## 4. Testing Strategy
- Verify that every section gracefully renders an empty state if the API returns no data.
- Ensure the "Become a Partner" card correctly appears for `SEEKER` only and disappears when the `PARTNER` role is obtained.
- Verify `StageChip` colors correspond exactly to the design specifications.
- E2E Playwright run at 390x844 capturing screenshots of the flow, including the plan expiration redirect logic (which kicks the user to `/s/plans`).
