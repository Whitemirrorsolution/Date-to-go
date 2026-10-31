# DECK & CHAT AUDIT

## Current Architecture Overview

### Frontend
- **Seeker category page** (`/s/category/:slug`) currently renders a **list/grid** of listing cards using the `SeekerCategoryPage` component.
- **Listing detail** (`/s/listing/:id`) shows full profile with partner info, photos carousel, and request button.
- **Favorites / Shortlist** functionality exists via a "saved" endpoint (`GET /seeker/favorites`) and UI in the sidebar.
- **Chat** is currently a generic messaging component tied to a **booking ID** and is available once a booking reaches the **ACCEPTED** state. It supports text, attachments, and free‑form messages.
- **Event stream** is implemented with **Socket.io** (or similar) delivering `listing.updated`, `booking.changed`, `chat.message` events.
- **Notification system** uses **Firebase Cloud Messaging** for push and an in‑app toast system.

### Backend (Node/Express, TypeScript)
- **Routes** under `/seeker` handle listings, favorites, and chat.
- Existing **listing** endpoints: `GET /seeker/listings`, `GET /seeker/listings/:id`.
- **Chat** endpoints: `GET /seeker/bookings/:id/chat`, `POST /seeker/bookings/:id/chat/message`.
- **Auth** via JWT, with role‑scoped middleware (`requireSeeker`, `requirePartner`).
- **Database**: MongoDB collections `listings`, `favorites`, `chat_conversations`, `chat_messages`.
- **Scheduler** (node‑cron) runs cleanup jobs for expired listings and chat retention.

## Gaps & Risks Identified

| Area | Gap | Risk | Priority |
|------|------|------|----------|
| **UI Consistency** | Category page uses a row layout; no swipe‑deck implementation. | Poor UX for modern mobile seekers; requires major redesign. | High |
| **Data Exposure** | Current chat allows arbitrary attachments and URLs, potentially leaking PII. | Legal/compliance violation, user safety. | Critical |
| **Privacy** | Listing cards expose partner email/phone in detail view. | PII leakage. | High |
| **Idempotency** | Interaction endpoints (`/favorites`, `/chat/message`) lack idempotency keys. | Duplicate DB writes, inconsistent state. | Medium |
| **Rate Limiting** | No per‑user/message rate limits on chat. | Spam, abuse, circumvention. | High |
| **Audit Logging** | Limited logging for chat moderation and deck interactions. | Inability to investigate abuse. | Medium |
| **Testing** | No unit/integration tests for deck or chat safety pipelines. | Regression risk. | High |
| **Accessibility** | No ARIA live regions or reduced‑motion handling on existing UI. | Accessibility compliance failure. | Medium |
| **Feature Flags** | No existing flag system for new deck or chat version. | Difficulty rolling out safely. | High |
| **Event Handling** | Real‑time events for listing availability are present, but deck does not subscribe to them. | Stale cards shown to seekers. | Medium |

## Proposed Audit Artifacts

1. **Component Map** – List of current React components per route.
2. **API Inventory** – Table of existing `/seeker/*` endpoints with method, auth, and pagination details.
3. **Security Review** – Findings on PII leakage vectors and missing rate limits.
4. **Performance Baseline** – Console log extraction from category page (no errors, network timings).
5. **Accessibility Baseline** – Axe core results for current pages (no violations, but missing live regions).

## Plan with Feature Flags

- Introduce **`seeker.deck`** flag to gate the new swipe‑deck UI.
- Introduce **`chat.v2`** flag to switch to the safe chat implementation.
- Flags stored in **Mongo `feature_flags`** collection and read via a `useFeatureFlag` hook in the frontend.

## Risks & Questions for Stakeholders

- **Data Migration**: Existing favorites are stored per listing; the new deck model stores favorites per partner. Will we need a migration script?
- **Backward Compatibility**: Do any third‑party integrations rely on the current chat attachment APIs?
- **Performance Impact**: Pre‑loading next‑2 images for the deck could increase bandwidth; need to confirm CDN cache settings.
- **Admin Controls**: Are current admin UI pages able to expose the new `deckSkipHideDays` and `chatGraceHours` settings?
- **Internationalization**: Quick‑reply templates need Hindi support; confirm existing i18n setup.

---

## Phase 3: Favorites (A7 Specification)

### Backend API Endpoints
- `GET /seeker/favorites`: Lists seeker's saved partner profiles along with their currently open listing (if any). Guarded by `requireAuth`, `requireRole('SEEKER')`, and `requireFeatureFlag('seeker.favorites')`.
- `POST /seeker/favorites`: Adds a partner to the seeker's favorites. Body: `{ partnerId: string, sourceListingId?: string }`. Dispatches `favorite.added` event.
- `DELETE /seeker/favorites/:partnerId`: Removes partner from favorites. Dispatches `favorite.removed` event.

### Models & Storage
- `Favorite`: `{ seekerId: ObjectId, partnerId: ObjectId, sourceListingId?: ObjectId, createdAt: Date }` with compound unique index on `{ seekerId: 1, partnerId: 1 }`.
- `DeckInteraction`: `{ seekerId, listingId, partnerId, action: 'SKIP' | 'SAVE' | 'UNDO', undoOf?: ObjectId }`.

### Frontend Components & Routes
- `SavedFavoritesPage` mounted at `/s/favorites` and `/s/saved` inside `SeekerShell`.
- `useFavoritesStore` provides reactive client-side store for loading, adding, and removing favorites with immediate local updates.
- Heart toggle button integrated into `BrowsePartnersPage` card UI.
- Profile dropdown link in `SeekerNavbar` for instant navigation to saved partners.

---

## Phase 4: Safe Chat Core (B1, B2, B4 Specification)

### State-Bound Chat Windows (B1)
- `REQUESTED`: Initial seeker note permitted (max 150 chars). Further text is locked until accepted & paid.
- `ACCEPTED` / `PAYMENT_PENDING`: Text typing locked; quick-reply coordination templates enabled.
- `PAID` / `IN_PROGRESS` / `AWAITING_OTP`: Chat OPEN. Direct text enabled (max 300 chars), phase-aware quick logistics chips enabled.
- `COMPLETED`: Chat remains OPEN for `chatGraceHours` (default 24h), then transitions to `READ_ONLY`.
- `CANCELLED` / `DECLINED` / `EXPIRED`: Chat strictly `CLOSED`.

### Backend Models & Services (B2)
- `Conversation`: `{ bookingId, seekerId, partnerId, status: 'LOCKED' | 'OPEN' | 'READ_ONLY' | 'CLOSED', openedAt, closeAt, lastMessageAt }`.
- `Message`: `{ bookingId, conversationId, senderId, recipientId, kind: 'TEXT' | 'QUICK_REPLY' | 'SYSTEM' | 'LOCATION_PIN', text, quickReplyKey?, moderation, flagged, deliveredAt, readAt, deleteAfter }`.
- `QuickReplyTemplate`: `{ key, textEn, textHi, phases[], role, enabled, order }` seeded with 7 bilingual coordination & logistics templates.
- Constraints: 20 messages/hour rate limiter, max 300 characters, no attachments, regex-based anti-circumvention stub (blocks 8+ digit numbers, URLs, UPI handles).
- Background Job: `startChatRetentionCron` runs hourly to auto-transition expired completed conversations to `READ_ONLY` and purge messages older than 90 days (unless subject to an active dispute/report).

### Frontend UI (`ChatThread`) (B4)
- Unified presentational `ChatThread` mounted at `/s/chat/:id` and `/p/chat/:id` via `BookingChatPage.tsx`.
- Safety Banner: *"Chat is for coordinating your meeting. Messages are scanned for safety. Sharing contact details or paying outside the app removes your payment protection."*
- Dynamic character counter (`text.length / maxChars`), friendly security nudge modal, localized English/Hindi toggle for quick-reply templates, and integrated `ReportModal`.

---

*This audit file is located at `docs/DECK_CHAT_AUDIT.md`.*
