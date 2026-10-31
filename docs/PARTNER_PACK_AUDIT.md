# Date to Go — Partner Feature Pack Audit Report (Phase 0)
**Date:** October 2026  
**Auditor:** Principal Full-Stack Engineer & Product Designer  
**Scope:** Partner Panel Extension (Modules A1–G6), Seeker & Admin Surfaces, Infrastructure, Privacy & Safety Gates.

---

## 1. Executive Summary & Audit Scope
This audit documents the current state of the Date to Go platform (MERN + PWA + TypeScript workspaces) prior to implementing the Partner Feature Pack. The platform possesses strong architectural foundations:
- **Role Isolation:** Strict separation enforced via `@date-to-go/access-policy` and route middlewares (`/s/*` for seekers, `/p/*` for partners, `/admin/*` for admins).
- **Double-Entry Ledger:** Robust financial accounting in `LedgerEntry.ts` with distinct escrow and release states.
- **Safety & Moderation:** Real-time text moderation, emergency helplines, SOS trigger structure, and strict privacy guards prohibiting PII leakage.
- **State Machine:** Deterministic booking lifecycle transitions in `BookingLifecycleService.ts`.

All new capabilities across Modules A through G will be implemented incrementally in phases, gated by granular versioned `AppSetting` feature flags, preserving all existing working behavior with zero regressions.

---

## 2. Current Partner Panel Coverage

| Surface / Capability | Current File / Location | Status | Current Capabilities & Gaps |
| :--- | :--- | :---: | :--- |
| **Partner Dashboard** | `frontend/src/roles/partner/pages/PartnerDashboardPage.tsx` | **Active** | Tabs for Home, Requests, Listings, Wallet, Profile, Accepted Bookings. Lacks funnel analytics, benchmarks, and tiered progress. |
| **Listing Management** | `CreateListingSheet.tsx`, `PartnerListingDetailsPage.tsx` | **Active** | Single-listing creation, editing, closing. Lacks bulk multi-select, peak pricing rules, and buffer travel engine. |
| **Booking Request Handling** | `PartnerBookingDetailsPage.tsx` | **Active** | Manual accept/decline, travel status update (On The Way / Arrived), PIN check-in. Lacks auto-rules engine and push action confirmation. |
| **Onboarding & KYC** | `BecomePartnerWizard.tsx`, `KycPage.tsx` | **Active** | Multi-step profile setup and document upload. Lacks Academy certification gating and recurring re-KYC countdown. |
| **Profile & Availability** | `PartnerProfilePage.tsx` | **Active** | Basic info, rates, photos, weekly slots, available now toggle. Lacks private client notes, travel mode, and coach hints. |
| **Financial Operations** | `PartnerDashboardPage.tsx` (Wallet tab) | **Active** | Balance inquiry, basic withdrawal request. Lacks automated payout schedules, tip receipts, and step-up passkey protection. |

---

## 3. Prerequisites & Subsystem Audit

### 3.1 Real-Time Events Stream
- **Current State:** SSE stream active at `/api/v1/events` (`backend/src/routes/events.ts`) broadcasting `access.changed:${userId}`. Socket.io active on the HTTP server (`server.ts`) with dedicated rooms (`booking_${bookingId}`). In-memory `eventBus` exists in `backend/src/utils/events.ts`.
- **Readiness for Partner Pack:** **High.** Needs domain event subscriptions wired for `booking.request_created` (for A1 auto-rules evaluation), `safety.checkin_prompt` (B3 safety timer), and `booking.waitlist_reopened` (D4 waitlist).

### 3.2 Double-Entry Ledger & Financial Invariants
- **Current State:** `LedgerEntry.ts` tracks accounts: `CLIENT_ESCROW`, `PARTNER_PENDING`, `PARTNER_AVAILABLE`, `PLATFORM_REVENUE`, `GST_PAYABLE`, `REFUNDS`, `WITHDRAWALS`. Invariant checks and atomic transactions implemented via `WalletService.ts` and `PaymentService.ts`.
- **Readiness for Partner Pack:** **Ready.** Supports cancellation compensation (`CLIENT_ESCROW -> PARTNER_AVAILABLE`), in-app tips (purpose `TIP`), and auto-payout withdrawal debits without altering past snapshots.

### 3.3 Conflict Engine & Geometry
- **Current State:** Elementary same-day slot overlap verification (`hasSlotOverlap` in `partner.ts`). Pincode lookup at `/api/v1/geo/pincode/:pin`.
- **Readiness for Partner Pack:** **Gap Identified.** Needs a unified `ConflictService` calculating haversine centroid distances, travel speeds, configurable buffers before/after dates, and calendar integration blocks.

### 3.4 Chat & Text Moderation
- **Current State:** `ChatService.ts` + `ModerationService.ts` with phone/email/contact detection, lexicon pattern matching, and message redaction. Socket.io delivery with system notices.
- **Readiness for Partner Pack:** **Ready.** Quick replies (A4) and private client notes (B7) can directly reuse `moderationService.filterText()`.

### 3.5 KYC & Identity Provider Interface
- **Current State:** Pluggable adapter architecture in `backend/src/providers/kyc/` (`KycProvider.ts`, `MockKycProvider.ts`, `DigiLockerKycProvider.ts`).
- **Readiness for Partner Pack:** **Ready.** Seeker verification (B1) and Face re-verification (G1) can extend this pluggable provider pattern.

### 3.6 Push & In-App Notification System
- **Current State:** `PushService.ts` (Web Push with VAPID) and database-backed `Notification.ts`.
- **Readiness for Partner Pack:** **Ready.** Deep-link action confirm payload and Badging API feature detection can be layered onto the existing service worker (`sw.ts`).

### 3.7 Admin Console & Configuration (`AppSetting`)
- **Current State:** Audited `AppSetting.ts` with CRUD endpoints at `/api/v1/admin/settings` storing typed JSON/Numbers with `AuditLog` records.
- **Readiness for Partner Pack:** **Ready.** All thresholds, caps, and feature flags will be managed through versioned `AppSetting` records.

---

## 4. Console & Quality Baselines

- **TypeScript Compilation:**
  - Backend: **0 errors** (`tsc -p tsconfig.json` passes cleanly with exit code 0).
  - Frontend: **0 errors** (`npx tsc --noEmit` passes cleanly with exit code 0).
- **ESLint:**
  - Flat config migration needed (`eslint.config.js` for ESLint 9 in frontend workspace; `typescript-eslint` dependency alignment in backend).
- **Automated Tests:**
  - Backend Vitest: **168 passed**, 23 legacy tests failed (due to outdated route expectations like `/s/plans` vs modern `/pricing`).
  - Frontend Vitest: Currently attempts to run Playwright E2E spec; test configuration needs separation between unit/component tests and Playwright browser specs.
- **Runtime Console:**
  - Browser console clean on partner dashboard, seeker dashboard, and public companion profiles. No unhandled promise rejections.

---

## 5. Architectural Risks & Mitigations

1. **Risk: Background PWA Limitations for SOS & Gestures (B4):**
   - *Mitigation:* Explicitly document and message in UI that DeviceMotion shake detection operates strictly in the active foreground tab with user gesture permission. Hold-to-trigger SOS is the primary, reliable mechanism.
2. **Risk: Privacy Leakage in Aggregated Insights & ICS Feeds (R4, C1-C3, E1):**
   - *Mitigation:* Strict server-side k-anonymity gate: suppress any benchmark cell with < 5 partners or < 10 events. ICS feeds will be tokenized, revocable, and contain only generic event titles and venue names (never seeker names, phone numbers, or addresses).
3. **Risk: Adverse Action Bias in Automated Verification & Rules (R5, A1, G1):**
   - *Mitigation:* Auto-rules strictly restricted to safety/behavioral attributes (verification badge, completed bookings, lack of conduct strikes). Face-match and verification failures escalate to human admin review queues before any account action.
4. **Risk: Concurrency on Listing Waitlists (D4):**
   - *Mitigation:* MongoDB transactional atomic operations with claim window timestamps to prevent race conditions during slot reopening.

---

## 6. Module-by-Module Plan & Feature Flags

| Module | Feature Key | Feature Flag Name | Target Phase | Admin Config Controls in `AppSetting` |
| :--- | :--- | :--- | :---: | :--- |
| **A1** | Auto-Rules | `partner.autoRules` | Phase 1 | `autoRules.minLeadTimeHours`, `autoRules.maxRulesPerPartner` |
| **A2** | Buffers & Travel Time | `partner.buffersTravel` | Phase 1 | `travel.defaultSpeedKmph`, `buffers.maxBufferMinutes` |
| **A3** | Bulk Listing Actions | `partner.bulkActions` | Phase 1 | `bulk.maxSelectedListings`, `bulk.priceChangeCapPercent` |
| **A4** | Quick Replies Manager | `partner.quickReplies` | Phase 1 | `quickReplies.maxTemplates`, `quickReplies.maxLengthChars` |
| **A5** | Push Actions & Badging | `partner.pushActions` | Phase 1 | `push.deepLinkTtlSeconds`, `push.badgingEnabled` |
| **B1** | Seeker Verification | `partner.seekerVerification`| Phase 2 | `verification.provider`, `verification.badgeExpiryDays` |
| **B2** | Seeker Trust Summary | `partner.trustSummary` | Phase 2 | `trustSummary.cancellationThresholds`, `trustSummary.bands` |
| **B3** | Safety Timer & Check-ins| `partner.safetyTimer` | Phase 2 | `safety.checkInIntervalMins`, `safety.escalationWaitMins` |
| **B4** | Silent SOS | `partner.silentSos` | Phase 2 | `sos.holdDurationSeconds`, `sos.shakeThreshold` |
| **B5** | Verified Venues Directory | `partner.verifiedVenues` | Phase 2 | `venues.requireVerifiedForCategories`, `venues.reviewSlaHours` |
| **B6** | Re-Verification Reminders | `partner.reVerification` | Phase 2 | `reKyc.intervalDays`, `reKyc.gracePeriodDays` |
| **B7** | Private Client Notes | `partner.clientNotes` | Phase 2 | `clientNotes.maxLengthChars`, `clientNotes.allowedTags` |
| **B8** | Partner Academy | `partner.academy` | Phase 2 | `academy.passingScorePercent`, `academy.mandatoryBeforeLive` |
| **C1** | Funnel Analytics | `partner.funnel` | Phase 3 | `analytics.kAnonymityMinEvents`, `analytics.retentionDays` |
| **C2** | Benchmarks (Anonymized) | `partner.benchmarks` | Phase 3 | `benchmarks.kAnonymityMinPartners`, `benchmarks.windowDays` |
| **C3** | Revenue Analytics | `partner.revenueAnalytics`| Phase 3 | `revenue.cancellationReasonsList` |
| **C4** | Review Themes | `partner.reviewThemes` | Phase 3 | `reviewThemes.taxonomyKeywords`, `reviewThemes.dpaRequired` |
| **C5** | Earnings Forecast | `partner.earningsForecast`| Phase 3 | `forecast.historicalWindowDays`, `forecast.discountRate` |
| **C6** | Goals & Streaks | `partner.goalsStreaks` | Phase 3 | `gamification.allowedStreakTypes`, `gamification.optOutDefault` |
| **C7** | Partner Tiers | `partner.tiers` | Phase 3 | `tiers.config`, `tiers.evaluationCronInterval`, `tiers.graceDays` |
| **C8** | Fee Transparency | `partner.feeTransparency`| Phase 3 | `fees.gstPercentBps`, `fees.repeatClientDiscountBps` |
| **D1** | Peak-Time Pricing Rules | `partner.peakPricing` | Phase 4 | `peakPricing.maxMarkupPercent`, `peakPricing.minCategoryFloor` |
| **D2** | Demand Heatmap | `partner.demandHeatmap` | Phase 4 | `heatmap.refreshCron`, `heatmap.minCellImpressions` |
| **D3** | Partner Offers | `partner.offers` | Phase 4 | `offers.maxDiscountPercent`, `offers.maxRedemptionsPerUser` |
| **D4** | Waitlist Engine | `partner.waitlist` | Phase 4 | `waitlist.maxEntriesPerSeeker`, `waitlist.claimWindowMins` |
| **D5** | Recurring Bookings | `partner.recurringBookings`| Phase 4 | `recurring.maxOccurrences`, `recurring.minPriorCompletions` |
| **E1** | Calendar Sync (ICS/Google)| `partner.calendarSync` | Phase 5 | `calendar.feedTokenTtlDays`, `calendar.googleScopes` |
| **E2** | Travel Mode | `partner.travelMode` | Phase 5 | `travelMode.maxWindowDays`, `travelMode.advanceNoticeDays` |
| **E3** | Cancellation Protection | `partner.cancellationProt`| Phase 5 | `cancellation.compensationBpsTable`, `cancellation.rules` |
| **E4** | Auto-Payout Schedule | `partner.autoPayout` | Phase 5 | `payout.minAmountPaise`, `payout.holdDaysDefault` |
| **E5** | Step-Up Security (Passkey)| `partner.stepUpSecurity` | Phase 5 | `stepUp.reauthWindowSeconds`, `stepUp.withdrawalThreshold` |
| **F1** | In-App Tips | `partner.tips` | Phase 6 | `tips.maxCustomAmountPaise`, `tips.platformCutBps` |
| **F2** | Referral Program | `partner.referral` | Phase 6 | `referral.rewardLedgerPaise`, `referral.cooldownDays` |
| **F3** | Profile Coach | `partner.profileCoach` | Phase 6 | `coach.minPhotosRequired`, `coach.bioMinWords` |
| **G1** | Face Re-Verification | `partner.faceReverification`| Phase 7 | `faceCheck.livenessProvider`, `faceCheck.maxRetryAttempts` |
| **G2** | Regional Languages (i18n)| `partner.i18n` | Phase 7 | `i18n.supportedLocales`, `i18n.defaultLocale` |
| **G3** | Command Palette (Ctrl+K) | `partner.commandPalette` | Phase 7 | `palette.maxResultsPerSection` |
| **G4** | Density & Dark Mode | `partner.densityDarkMode`| Phase 7 | `theme.allowUserOverrides` |
| **G5** | Safe Actions Retry Queue | `partner.retryQueue` | Phase 7 | `retryQueue.maxOfflineQueueSize`, `retryQueue.ttlSeconds` |
| **G6** | Feature Flags & A/B | `partner.experiments` | Phase 7 | `flags.bucketingSalt`, `flags.adminOverrideAllowed` |

---

## 7. Next Step
Audit completed with zero production code changes. All prerequisite services and foundational data models have been verified. Phase 1 (Automation: A1–A5) will begin upon confirmation.
