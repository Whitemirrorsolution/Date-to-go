# R2_PLAN: Partner Onboarding, Profile Health, and Partner Shell

## 1. Goal
Implement the core of the Partner experience: a detailed onboarding wizard to collect the partner's profile, a health/completion scoring system to gate their ability to create listings, and the PartnerShell with dynamic screens (`/p/home`, `/p/status`, `/p/onboarding`, `/p/profile`) driven by their real onboarding state.

## 2. Backend Scope
1. **PartnerProfile Model**: Update/Extend the existing `PartnerProfile` schema.
   - **Basics**: displayName, dob, gender, primaryPhoto (URL).
   - **Location**: city, pincode, area, coordinates (Point).
   - **About**: bio (min 80 chars), occupation.
   - **Attributes**: interests (min 3), hobbies (min 3, max 20), languages.
   - **Lifestyle**: smoke, drink (`NEVER | OCCASIONALLY | REGULARLY | PREFER_NOT_TO_SAY`).
   - **Categories**: array of `{ categoryId, ratePerHour }`.
   - **Photos**: gallery (array of URLs, min 3, max 8).
   - **Preferences**: allowedSeekerGenders.
   - **Status**: approvalStatus (`DRAFT`, `PENDING_REVIEW`, `APPROVED`, `REJECTED`, `NEEDS_CHANGES`).
   - *Security Note*: Strip sensitive info (e.g., DOB, address) from public views.

2. **Endpoints**:
   - `GET /partner/profile`: Fetch current profile.
   - `PATCH /partner/profile`: Section-wise partial updates with Zod validation.
   - `GET /partner/profile/health`: Returns score, band, items (done/mandatory), nextActions, canCreateListings, and missing requirements.
   - `POST /partner/profile/submit-for-review`: Triggers moderation and transitions status from `DRAFT` to `PENDING_REVIEW`.
   - `POST /admin/partners/:id/approve` (TEMPORARY): Allows admins to force an approval for E2E testing before the KYC system is built.

3. **Services**:
   - `PartnerProfileHealthService`: Computes the 0-100 score and missing items.
   - `ModerationService`: Validates bio and hobbies against contact details, solicitation, or adult terms.

## 3. Frontend Scope (PartnerShell)
1. **Layout**:
   - `PartnerShell` layout with a bottom nav (Home, Requests, Listings, Wallet, Profile). Header shows "PARTNER MODE" pill and different accent color.
2. **Onboarding Wizard (`/p/onboarding`)**:
   - Multi-step form with sidebar/stepper: Basics, Location, About & Lifestyle, Interests/Hobbies/Languages, Categories & Rates, Photos, KYC, Review & Submit.
   - Persistent Profile Health card showing progress.
   - Uses `GET /api/v1/partner/profile/health` to block submission until mandatory items are green.
3. **Status Timeline (`/p/status`)**:
   - Visual timeline: Submitted -> Under Review -> Approved. Shows reasons for rejection/changes.
4. **Partner Home (`/p/home`)**:
   - If NOT LIVE: Shows Health Meter, checklist, and locked "Create Booking".
   - If LIVE: Action Required, Earnings (from wallet), Shortcuts (Create Booking, My Listings), Upcoming Meetings.
5. **Partner Profile (`/p/profile`)**:
   - Full public-profile editor with health meter and "preview as seeker".

## 4. Testing Strategy
- **Unit Tests**:
  - `partnerProfileHealthService`: Math tests for the 0-100 score, weight combinations, and mandatory gates.
  - `ModerationService`: Test blocks for phone numbers, emails, adult words.
- **E2E (Playwright)**:
  - Register -> Buy Partner Plan -> Enter Partner Mode -> Complete Wizard -> Submit for Review -> See Status Screen -> Trigger Temp Admin Approval -> See Live Home.

## 5. Order of Execution
1. Update `PartnerProfile` Mongoose model.
2. Implement backend services (Health, Moderation) and write unit tests for them.
3. Add backend routes (`PATCH /profile`, `/profile/health`, `/submit-review`, temp admin approval).
4. Update frontend `PartnerShell` and implement `/p/home` and `/p/status`.
5. Build the multi-step React Wizard at `/p/onboarding`.
6. Write Playwright E2E tests.
