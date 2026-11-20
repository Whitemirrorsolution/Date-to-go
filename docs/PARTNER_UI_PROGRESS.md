# Partner UI Progress & Scorecard

*Date to Go – Platonic Companion Platform*  
*Document Version: 1.0 (Phase 0 Discovery Baseline)*

---

## 1. Page Tracking & Flag Status

| Page Name | Discovered Route | Feature Flag | Current Status | Primary Defects Found | Defects Fixed | Target Phase |
|-----------|------------------|--------------|----------------|------------------------|---------------|--------------|
| **Partner App Shell** | `/p/*` | `partner.ui.v3.shell` | `PENDING` | • `PartnerLayout.tsx` is bare `<Outlet />`<br>• Dead duplicate `PartnerShell.tsx`<br>• 8-tab mobile bottom nav overflows (512px on 360px screen)<br>• Missing tablet rail and desktop command palette | • Configured ESLint v9 (`eslint.config.js`)<br>• Mounted `/p/wallet` under `/p` | Phase 3 |
| **Partner Dashboard (Home & Overview)** | `/p/dashboard?tab=home` | `partner.ui.v3.dashboard` | `PENDING` | • Spinning loader CLS jump<br>• Plain dashed empty states<br>• Mobile squishing of metric cards<br>• Hardcoded English strings | • Dead link `/wallet` fixed to `/p/wallet`<br>• Removed debug `console.log` | Phase 4.1 |
| **Request Inbox & Management** | `/p/dashboard?tab=requests` | `partner.ui.v3.requests` | `PENDING` | • Double-click vulnerability on Accept/Decline<br>• Missing empty state CTA illustration<br>• Lack of two-pane master-detail on desktop | None (Phase 0) | Phase 4.4 |
| **Accepted Bookings List** | `/p/dashboard?tab=accepted` | `partner.ui.v3.accepted` | `PENDING` | • Grid layout cards truncate dates on mobile<br>• Missing filter by date/stage | None (Phase 0) | Phase 4.4 |
| **Offerings & Listings Management** | `/p/dashboard?tab=listings` | `partner.ui.v3.listings` | `PENDING` | • Floating bulk bar collides with bottom nav on mobile<br>• Create listing sheet lacks focus trap and has unstyled fullscreen mobile view | None (Phase 0) | Phase 4.3 |
| **Smart Auto-Rules Manager** | `/p/dashboard?tab=rules` | `partner.ui.v3.rules` | `PENDING` | • Modal forms lack focus management<br>• Simulator output is plain text dump without visual flow | None (Phase 0) | Phase 4.6 |
| **Quick Replies Manager** | `/p/dashboard?tab=templates` | `partner.ui.v3.templates` | `PENDING` | • Uses native `window.confirm()`<br>• Shortcut chips lack keyboard navigation | None (Phase 0) | Phase 4.6 |
| **Wallet & Payouts** | `/p/dashboard?tab=wallet` | `partner.ui.v3.wallet` | `PENDING` | • Black slab background lacks modern glassmorphism/gradient accent<br>• Withdraw modal needs dating-app styling pass | None (Phase 0) | Phase 4.5 |
| **Settings & Availability Buffers** | `/p/dashboard?tab=profile` | `partner.ui.v3.settings` | `PENDING` | • `AvailabilityBuffersCard` uses hardcoded inline styles (`style={{ ... }}`)<br>• Completely unstyled / broken in dark mode | None (Phase 0) | Phase 4.6 |
| **Become Partner Setup Wizard** | `/p/onboarding` | `partner.ui.v3.onboarding` | `PENDING` | • Missing step slide transitions<br>• Action bar lacks bottom safe-area padding<br>• Auto-save lacks visual indicator | None (Phase 0) | Phase 4.2 |
| **KYC Document Upload & Verification** | `/p/kyc`, `/p/status` | `partner.ui.v3.kyc` | `PENDING` | • Uses native `window.confirm()`<br>• Warning banner has WCAG AA contrast failure<br>• CSS modules collision with global Tailwind | None (Phase 0) | Phase 4.2 |
| **Partner Profile Preview** | `/p/profile` | `partner.ui.v3.profile` | `PENDING` | • Inconsistent card radii (mix of 16px, 24px, 32px)<br>• Header styling diverges from dashboard shell<br>• Fixed bottom bar overlaps content on small devices | None (Phase 0) | Phase 4.2 |
| **Booking Details & Meetup Stepper** | `/p/booking/:id` | `partner.ui.v3.booking_details` | `PENDING` | • Uses multiple `window.confirm()` calls<br>• PIN/OTP modal has single text input instead of 4-box auto-advance PIN | None (Phase 0) | Phase 4.4 |
| **Single Listing Details & Share** | `/p/listings/:id` | `partner.ui.v3.listing_details` | `PENDING` | • Delete modal is unstyled div<br>• Dual fallback endpoints on status toggle | None (Phase 0) | Phase 4.3 |

---

## 2. Baseline Rubric Scores (Before Redesign)

**Scoring Scale (0 to 5)**:  
*0 = Broken/Missing, 1 = Poor, 2 = Below Standard, 3 = Average, 4 = Good, 5 = Excellent (Dating-App Quality)*

| Discovered Page / Component | Visual Hierarchy | Consistency | Spacing & Typography | Color & Contrast | Responsiveness | Interaction Feedback | States (Empty/Load/Err) | Accessibility (a11y) | Performance | Code Health | **Overall Before Score** |
|-----------------------------|------------------|-------------|----------------------|------------------|----------------|----------------------|-------------------------|----------------------|-------------|-------------|--------------------------|
| **Partner Layout / Shell** | 2.0 | 2.0 | 2.5 | 3.0 | 1.5 | 2.0 | 1.0 | 2.0 | 4.0 | 2.0 | **2.2 / 5.0** |
| **Partner Dashboard (Home)**| 3.0 | 3.0 | 3.0 | 3.0 | 2.5 | 3.0 | 2.0 | 2.5 | 3.5 | 2.5 | **2.8 / 5.0** |
| **PartnerRequestInbox** | 3.0 | 3.0 | 3.0 | 3.0 | 3.0 | 2.5 | 2.0 | 2.5 | 3.5 | 3.0 | **2.9 / 5.0** |
| **CreateListingSheet & Bar**| 2.5 | 2.5 | 2.5 | 3.0 | 2.0 | 2.5 | 2.0 | 2.0 | 3.5 | 2.5 | **2.5 / 5.0** |
| **BecomePartnerWizard** | 3.0 | 3.0 | 3.0 | 3.5 | 2.5 | 3.0 | 2.5 | 2.5 | 3.5 | 3.0 | **2.9 / 5.0** |
| **KycPage** | 2.5 | 2.5 | 2.5 | 2.5 | 3.0 | 2.0 | 2.0 | 2.0 | 3.5 | 2.5 | **2.5 / 5.0** |
| **PartnerProfilePage** | 3.0 | 3.0 | 3.0 | 3.5 | 3.0 | 2.5 | 2.0 | 2.5 | 3.5 | 3.0 | **2.9 / 5.0** |
| **PartnerBookingDetailsPage**| 3.0 | 2.5 | 3.0 | 3.0 | 2.5 | 2.5 | 2.5 | 2.0 | 3.5 | 2.5 | **2.7 / 5.0** |
| **PartnerListingDetailsPage**| 3.0 | 3.0 | 3.0 | 3.5 | 3.0 | 2.5 | 2.5 | 2.5 | 3.5 | 3.0 | **2.9 / 5.0** |
| **AutoRulesManager** | 3.0 | 2.5 | 2.5 | 3.0 | 2.5 | 2.5 | 2.0 | 2.0 | 3.5 | 3.0 | **2.6 / 5.0** |
| **QuickRepliesManager** | 3.0 | 3.0 | 3.0 | 3.0 | 3.0 | 2.0 | 2.0 | 2.0 | 3.5 | 3.0 | **2.7 / 5.0** |
| **AvailabilityBuffersCard** | 1.5 | 1.5 | 1.5 | 1.5 | 2.5 | 2.0 | 1.5 | 2.0 | 3.5 | 1.5 | **1.9 / 5.0** |
| **WithdrawModal** | 4.0 | 3.5 | 3.5 | 3.5 | 3.5 | 3.5 | 3.0 | 3.0 | 3.5 | 3.5 | **3.5 / 5.0** |
| **Platform Baseline Average**| **2.8** | **2.6** | **2.7** | **2.9** | **2.6** | **2.5** | **2.1** | **2.3** | **3.6** | **2.6** | **2.67 / 5.0** |

---

## 3. Key Observations for Upgrade
1. **Visual Hierarchy & Aesthetics (2.8/5.0)**: Currently lacks warm, modern dating-app aesthetics (no photo-forward 3:4 aspect ratios, missing subtle gradients and blur overlays).
2. **States & Skeleton Design (2.1/5.0)**: Relies on generic spinning circles instead of designed layout-matching skeletons, leading to layout shifts (CLS).
3. **Accessibility (2.3/5.0)**: Many icon buttons lack `aria-label`, custom clickable divs lack keyboard focus rings, and amber warnings lack sufficient contrast in light theme.
4. **Responsiveness (2.6/5.0)**: Mobile bottom navigation overflows screen with 8 tabs; fixed action bars overlap content; desktop lacks two-pane master-detail view.
