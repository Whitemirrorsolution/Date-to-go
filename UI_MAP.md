# Date to Go - Frontend UI Map

## 🎨 Global Design System
- **Colors**: Primary (`#7000A4`), Accent (`#FF2FB0`), Background (`#F6F7FD`), Surface (`#FFFFFF`)
- **Typography**: Roboto / System Sans (Bold headers, semibold cards, muted body)
- **Tailwind Tokens**: `tailwind.config.js` -> custom colors, radius (`pill`, `24px`), shadows (`soft`, `float`)

## 🧱 Shared Components
- `AppHeader.tsx`: Sticky top nav with back arrow and contextual right action.
- `BottomNav.tsx`: 4-tab mobile bottom navigation (Home, History, Booking, Profile). Hidden on checkout/auth.

## 📱 Routes & Screens

### 1. Main Navigation (Bottom Nav)
- **`/home`** -> `HomeDashboard.tsx`
  - *Data*: User session, mock Services.
  - *Features*: Greeting, gradient banner, 4 feature tiles, 2-column Service grid.
- **`/history`** -> `HistoryPage.tsx`
  - *Features*: Transactions list, Bottom Sheet for Details, Bottom Sheet for Filters.
- **`/booking`** -> `BookingPage.tsx`
  - *Features*: Horizontally scrolling pill tabs, contextual action buttons (Pay Now, SOS, Rate).
- **`/profile`** -> `ProfilePage.tsx`
  - *Features*: Avatar card, Quick Actions, Gradient Credit Card, Settings links, Logout.

### 2. Inner Pages & Flows
- **`/profile/details`** -> `MyDetailsPage.tsx`
  - *Features*: View/Edit mode toggle, Avatar update, Personal Info, Bio, Partner availability and KYC status.
- **`/notifications`** -> `NotificationsPage.tsx`
  - *Features*: Unread banner, custom card styling for unread items, Mark as read/Clear all menu.
- **`/dashboard`** (or `/partner/dashboard`) -> `DashboardHubPage.tsx`
  - *Features*: Role welcome card, "You're Live" stats strip, Find Partner / Become Partner gradient CTA cards.
- **`/services/:slug`** -> `ServiceDetailsPage.tsx`
  - *Features*: Service icon header, Safety guardrail banner, Pricing breakdown, Buy/Browse CTAs.
- **`/browse`** -> `BrowsePartnersPage.tsx`
  - *Features*: Search bar, horizontal scroll filter chips, rich partner cards with rating/price/next slot.
- **`/partner/:id`** -> `PartnerProfilePage.tsx`
  - *Features*: Partner bio, list of offered services, simplified booking request form with safety checkbox, fixed bottom "Send Request" bar.

## 🔌 API Endpoints (To be wired)
- `GET /api/v1/services` -> Populate Home and Browse categories.
- `GET /api/v1/partners` -> Populate Browse page.
- `GET /api/v1/bookings` -> Populate History and Booking tabs.
- `PATCH /api/v1/users/me` -> Save My Details edits.
- `POST /api/v1/bookings/request` -> Submit booking from Partner Profile.
