# Role-Based Access Control (RBAC) Architecture Plan & Implementation

## Current State Findings & Issues
The user reported that role-based architecture was not isolating properly. Our investigation found the following issues:
1. **Missing Frontend Role State Resolution:** While the backend correctly maintained `UserAccessData` via `AccessService`, the frontend `RequireAccess` guard was failing to mount appropriately or being bypassed due to racing conditions with `AuthContext`.
2. **Missing UI to Switch Modes:** Users holding dual roles (e.g., both SEEKER and PARTNER) had no frontend UI button to invoke `/api/v1/auth/me/mode` to toggle their `activeMode`, effectively locking them in whatever role they last activated (or defaulted to upon plan purchase).
3. **Redirect Loop on Payment Success:** The `PricingPage` navigated to `/` after a successful purchase, which unconditionally navigated to `/login`, causing users to think they lost their session and had to purchase again.
4. **Partner Setup UI Exposure:** The `PartnerShell` (bottom navigation) was visible on setup routes like `/p/onboarding` and `/p/kyc`, giving users the false impression they could navigate to `/p/home`, only to be redirected back to setup due to their incomplete profile state.

## Implementation Details

### 1. Robust `AccessProvider` and `RequireAccess`
- The `AccessProvider` has been updated to wait for `AuthContext` to complete its session hydration (`isAuthLoading === false`) before triggering the `/auth/me/access` network call.
- Server-Sent Events (SSE) logic has been patched to correctly refetch and trigger a re-evaluation of `RequireAccess` when a role or subscription change occurs.

### 2. Dual-Role Switching UI
- A `switchMode(targetMode)` function was added to the `AuthContext` which hits `POST /auth/me/mode`.
- The `UserDashboardPage` (Seeker) now renders a **"Switch to Partner Hub"** button if the user has the `PARTNER` entitlement.
- The `PartnerDashboardPage` (Partner) now renders a **"Switch to Member View"** button to toggle back to Seeker mode.

### 3. Fixing the Routing Redirects
- The `PricingPage` now uses `resolveHomeRoute(newAccess)` from `@date-to-go/access-policy` to intelligently drop the user into `/p/home` or `/p/onboarding` immediately after purchasing a partner plan.
- The `PartnerShell` has been updated to hide its navigation tabs on all setup pages (`/p/onboarding`, `/p/kyc`, `/p/renew`, `/p/status`).

## Verification
- Navigating to `/s/home` while `activeMode = PARTNER` properly triggers `RequireAccess` which evaluates `canAccessRoute` to false and gracefully kicks the user to `/p/home`.
- Complete isolation exists between the two route trees, satisfying the strict requirements.
