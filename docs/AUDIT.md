# Project Audit Report

## 1. Role Model & User Modes
* **Current State:** The `User` model (`backend/src/models/User.ts`) has a fixed string field `role: 'USER' | 'PARTNER' | 'ADMIN'`. There is no concept of a "mode" (e.g., active profile mode) other than this role enum.
* **Registration Intent:** The frontend `RegisterPage.tsx` captures the user's intent (`intent: 'Find a partner' | 'Become a partner'`), but this is never passed to the backend. The API call (`POST /auth/register/otp/request`) hardcodes `role: 'USER'` in the payload for all users.
* **Defect:** Registration intent is lost immediately. There is no automated backend route to promote a `USER` to a `PARTNER`. Even if a user purchases a Partner subscription, `PaymentService.ts` only sets `isListed: true` on the `PartnerProfile` but does *not* elevate the `User.role` to `PARTNER`.

## 2. Routing & Dashboards
* **Current State:** The frontend uses `App.tsx` for routing and `DashboardHubPage.tsx` as the main destination for partners, while `HomeDashboard.tsx` is the destination for seekers.
* **The "Identical Dashboards" Issue:**
  1. `App.tsx` routes `/partner/dashboard` to `<DashboardHubPage />`, which renders a generic UI containing "Find a Partner" and "Become a Partner" cards.
  2. The actual component `<PartnerDashboardPage />` exists (`src/pages/PartnerDashboardPage.tsx`) and contains partner-specific features (My Listings, Booking Inbox), but it is **not imported or used anywhere in `App.tsx`**.
  3. `AuthContext` and post-payment redirects try to send users to `/partner/dashboard` if `user.role === 'PARTNER'`. But since users are perpetually stuck with `role: 'USER'`, they always get redirected to `/user/dashboard` (which renders `HomeDashboard`).

## 3. Access & Subscription Gating
* **Current State:** `AuthContext.tsx` checks `/auth/me` which returns `hasActivePlan` and `requireSubscriptionForAccess` (global admin toggle).
* **Subscription Roles:** Plans have an `audience` field (`USER` | `PARTNER`). `PricingPage.tsx` uses `user?.role === 'PARTNER' ? 'PARTNER' : 'USER'` to fetch the appropriate plans. However, because the user role is always `USER`, users can only ever see Seeker plans unless forced otherwise.

## 4. Partner Profile
* **Current State:** The `PartnerProfile` model exists with comprehensive fields (bio, lifestyle, categories, rates, payout, approval status). Categories are admin-driven via the `/categories` endpoint. 
* **Defect:** The partner onboarding flow (`BecomePartnerWizard.tsx`) fetches from `/partner/profile` which is gated by the `requireRole('PARTNER')` middleware (`partner.ts`). Since regular users cannot acquire the `PARTNER` role, they cannot access the wizard to build their profile.
* **KYC:** Exists (`KycSubmission.ts`), along with integration hooks, but it requires the user to successfully reach the partner states first.

## 5. Booking Flow Components
| Feature | Status | Notes |
| :--- | :---: | :--- |
| **Listing Model/UI** | PARTIAL | `Listing.ts` exists. "My Listings" tab exists in unused `PartnerDashboardPage`. |
| **BookingRequest** | FULL | `BookingRequest.ts` model exists. |
| **Booking** | FULL | `Booking.ts` and `BookingEvent.ts` models exist. |
| **Escrow / Wallet** | FULL | `Ledger.ts`, `WalletLedger.ts`, and `WalletPage.tsx` exist. |
| **OTP (Booking)** | MISSING | There is no distinct booking-fulfillment OTP schema or endpoint (only auth OTPs). |

## 6. Gaps vs Target State (Defects Table)

| Severity | File | Description | Recommendation |
| :---: | :--- | :--- | :--- |
| **CRITICAL** | `frontend/src/App.tsx` | `PartnerDashboardPage` is completely omitted from the routing tree. | Update `App.tsx` to route `/partner/dashboard` to `PartnerDashboardPage`. |
| **CRITICAL** | `frontend/src/pages/RegisterPage.tsx` | Hardcodes `role: 'USER'` on registration, ignoring intent. | Pass `intent` to backend; if "Become a partner", redirect them to a role-selection or upgrade path. |
| **CRITICAL** | `backend/src/services/PaymentService.ts` | Buying a Partner subscription does not promote user role. | Update `fulfillSubscription` to change `user.role` to `PARTNER` if a Partner plan is purchased. |
| **HIGH** | `frontend/src/pages/BecomePartnerWizard.tsx` | Wizard crashes/403s for normal users because it hits `/partner/*` endpoints. | Create a public/user-accessible endpoint to initialize a PartnerProfile draft and upgrade the role. |
| **MEDIUM** | Booking Flow | OTP verification for meeting commencement/completion is missing. | Implement a 4-digit PIN exchange in the `Booking` lifecycle. |

## 7. Minimal-Change Recommendation
Do not rewrite the entire system. Apply these surgical fixes:
1. **Fix Routing:** Import `<PartnerDashboardPage />` in `App.tsx` and map `/partner/dashboard` to it (replacing `<DashboardHubPage />`).
2. **Fix Role Elevation:** Modify `PaymentService.ts` so that purchasing a plan with `audience === 'PARTNER'` updates the user's role to `PARTNER`.
3. **Fix Onboarding Access:** Allow users with `role: 'USER'` to interact with the first steps of `BecomePartnerWizard` by modifying the `partner.ts` middleware or creating a specific `/onboarding` endpoint that doesn't require `PARTNER` role until submission.
4. **Fix Registration:** Alter the redirect in `RegisterPage.tsx` so that if `intent === 'Become a partner'`, the user is pushed towards the Partner pricing plans immediately after login.
