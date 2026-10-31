# BOOKING SPEC (source of truth)

## Concepts
- Listing: a booking offer created by a PARTNER (category, startAt, endAt, city, area/pincode, public venue, base price). Shown to clients on category pages.
- BookingRequest: a CLIENT's request on a Listing.
- Booking: created when the client confirms and pays an accepted request.
- Escrow hold: client payment is held until the completion OTP is verified (or auto-release/dispute resolution).
- Commission: admin-configured per category; deducted at release; partner wallet receives the net amount only.

## Roles
CLIENT, PARTNER (one account can have both), ADMIN (sub-roles: SUPER_ADMIN, KYC_REVIEWER, FINANCE, SUPPORT, MODERATOR). Both CLIENT and PARTNER need an ACTIVE membership (existing subscription logic). All checks are server-side.

## Partner profile fields (collected at Become a Partner)
Basic: displayName, DOB (age derived, 18+ enforced), gender, primary photo. Location: city, pincode, area, optional coordinates derived from pincode centroid (never exact home address). About: bio (min 80 chars, moderated). Occupation (text + optional industry). Interests (tags, min 3). Hobbies (tags, min 3, max 20). Languages (multi). Lifestyle: smoke (NEVER|OCCASIONALLY|REGULARLY|PREFER_NOT_TO_SAY), drink (same enum). Categories: multi-select from admin-defined Category list, each with partner hourly rate within the category's admin min/max. Photos gallery: min 3, max 8, moderated. Meeting preferences: allowedSeekerGenders. Payout details: bank account or UPI (verified before first withdrawal). KYC documents (see KYC).

## Profile health (0-100) and publishing gate
Weights: primary photo 10, gallery >=3 photos 10, basic details 10, location 10, bio 10, occupation 5, interests 5, hobbies 5, languages 5, lifestyle answered 5, categories with rates 10, payout details verified 5, KYC submitted 5, KYC approved 5. Color bands: <40 red, 40-69 orange, 70-89 yellow, 90+ green. Show "next best action" list. A partner can CREATE LISTINGS only if: mandatory items complete (photo, gallery, basics, location, bio, languages, lifestyle, >=1 category), KYC = APPROVED, profile content = APPROVED by admin, membership ACTIVE, account not suspended. Payout details are required only before the first withdrawal.

## KYC
Documents: AADHAAR (masked copy only), PAN, VOTER_ID, DRIVING_LICENCE, PASSPORT, plus a SELFIE. Admin config defines the required set (default: one photo ID from [AADHAAR_MASKED, VOTER_ID, DRIVING_LICENCE, PASSPORT] + PAN + SELFIE). Statuses: NOT_SUBMITTED, SUBMITTED, UNDER_REVIEW, NEEDS_CHANGES, APPROVED, REJECTED. Files go to a PRIVATE encrypted bucket with random keys; reviewers get short-lived signed URLs (5 minutes) and every view is audit-logged; ID numbers are stored encrypted and shown masked (last 4); name and DOB are cross-checked with the profile; documents are deleted N days after the final decision (config) keeping only the result. A KycProvider interface exists for later API-based verification (DigiLocker/provider). Never expose documents to other users or non-KYC admin roles.

## Booking stages (single enum used everywhere) and colors
REQUESTED #F59E0B, ACCEPTED #3B82F6, PAYMENT_PENDING #7C3AED, PAID #0D9488, IN_PROGRESS #F97316, AWAITING_OTP #EC4899, COMPLETED #16A34A, DECLINED #EF4444, CANCELLED #EF4444, EXPIRED #9CA3AF, DISPUTED #B91C1C, REFUNDED #64748B. The same tokens drive chips, cards, timeline stepper and notifications.

## State rules
- Many clients may request one Listing; the partner accepts exactly ONE (atomic); all other pending requests become DECLINED with reason "slot taken".
- After ACCEPTED the client has confirmWindow minutes (admin setting) to confirm and pay; otherwise the request EXPIRES and the Listing reopens.
- Listing slot hold while PAYMENT_PENDING; PAID -> Listing BOOKED.
- PAID -> IN_PROGRESS automatically at startAt.
- Client taps Mark as Completed (allowed only at/after startAt) -> AWAITING_OTP and a 4-digit OTP is generated and shown ONLY on the client's screen.
- Partner enters OTP -> verified -> COMPLETED -> funds released.
- Partner may tap Service delivered after endAt. If the client neither completes nor disputes within autoReleaseHours, funds auto-release. A dispute freezes release until an admin decides (release, refund or split).
- Every transition is validated by one state-machine service, writes a BookingEvent (actor, reason, time) and triggers notifications.

## OTP
4 digits, generated with a CSPRNG, stored as HMAC-SHA256(otp, SERVER_PEPPER + bookingId), never logged, never sent by push/SMS/email. Expires after otpExpiryHours (admin setting), max 3 regenerations, partner max 5 wrong attempts then 30-minute lock plus admin flag, single use, constant-time compare, verification endpoint rate-limited.

## Money
All amounts in integer paise. Pricing snapshot saved on payment: basePaise, userGstPaise, totalPaise, commissionRule (copied), commissionPaise, commissionGstPaise, partnerNetPaise = base - commission - commissionGst. Commission rule per category: type PERCENT | FLAT | MIXED, percentBps, flatPaise, minFeePaise, maxFeePaise, gstOnFeeBps, with effectiveFrom versioning. Double-entry ledger accounts: CLIENT_ESCROW, PARTNER_PENDING, PARTNER_AVAILABLE, PLATFORM_REVENUE, GST_PAYABLE, REFUNDS, WITHDRAWALS. Entries are append-only, grouped by transaction, debits equal credits, idempotent by (refType, refId, action). FundsHoldProvider interface with adapters LedgerOnly (dev/test) and ProviderHold (marketplace hold/release via the payment provider). No user wallet top-up exists; only partner earnings wallet (withdrawable only).

## Admin settings (all editable, audited)
requestExpiryHours, confirmWindowMinutes, minLeadTimeMinutes, maxAdvanceDays, autoReleaseHours, otpExpiryHours, cancellationRefundTable (time-based %), withdrawalMinPaise, withdrawalHoldDays, withdrawalApprovalMode (AUTO | MANUAL), kycRequiredSet, kycRetentionDays, per-category rules.

## Privacy and safety
Partners show first name + age (not exact DOB), city/area (not address), photos only to authenticated users with an active plan, signed short-lived photo URLs, no contact details anywhere, chat blocks phone/email/links. Exact venue address is revealed only after payment. Venue must be a public place type (CAFE, MALL, CINEMA, RESTAURANT, PARK, EVENT_VENUE, HOSPITAL, MARKET, OTHER_PUBLIC); CLIENT_HOME allowed only for categories flagged by admin with extra KYC. Lifestyle fields are optional with "prefer not to say". Mutual gender consent applies to discovery. Report/Block/SOS available at every stage.

## Realtime
Server-sent events (or WebSocket) channel per user for stage changes, plus persisted in-app notifications and Web Push (no sensitive data in pushes).
