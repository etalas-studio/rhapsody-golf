# Rhapsody Golf Connect — Project Timeline

Last updated: 2026-08-08

---

## Legend

| Symbol | Meaning |
|--------|---------|
| ✅ | Done |
| 🔄 | In progress |
| ⏳ | Pending |
| 🚫 | Blocked |

---

## Frontend Phases

### ✅ Phase 0 — Routing & Mobile Shell
*Completed: 2026-08-08*

- [x] Landing page `/` — hero, tagline, "Open App" + "Login" CTAs
- [x] `/login` role-based redirect — golfer → `/golfer`, club_admin → `/club`, superadmin → `/admin`
- [x] `app.login.tsx` — mobile-first login page → redirects to `/app`
- [x] `MobileShell.tsx` — mobile app shell (max 430px, bottom tab bar: Home · Courses · Score · Rewards · Chat)
- [x] `app.index.tsx` — mobile home (membership card, KPI row, upcoming tee time, campaigns, quick actions)
- [x] `app.courses.index.tsx` — course browser with search
- [x] `app.courses.$courseId.tsx` — course detail with pricing
- [x] `app.scorecard.tsx` — scorecard list with front-9 table
- [x] `app.loyalty.tsx` — loyalty points by club + active vouchers
- [x] `app.chat.tsx` — chat UI stub (connects to AI agent in Phase 7)
- [x] `golfer/*` web dashboard — untouched, preserved as-is

---

### ✅ Phase 1 — Auth Wall & Guest Mode
*Completed: 2026-08-08*

- [x] `supabase.ts` browser client with anon key
- [x] `appContext.tsx` — real async `signIn`/`signUp`/`signOut`; session restore + `onAuthStateChange`; `signInAsDemo` dev shortcut
- [x] `login.tsx` + `app.login.tsx` — controlled forms, error banners, loading spinners
- [x] Prisma schema — full snake_case `@map` on all models; pushed to Supabase
- [x] `001_create_user_on_signup.sql` — trigger auto-creates `public.users` row on auth signup
- [x] `002_rls_policies.sql` — 39 RLS policies across all tables
- [ ] Social login: Google, Apple (Supabase OAuth) — deferred
- [ ] Phone + OTP tab — deferred

**Prerequisite:** Backend Phase 1 (Supabase project created, auth enabled)

---

### ✅ Phase 2 — Wallet
*Completed: 2026-08-08*

- [x] GHV (Golf Hub Value) balance card
- [x] GHP (Golf Hub Points) balance card
- [x] Top-up flow (mock — real payment gateway out of scope)
- [x] Transaction history table (GHV tab · GHP tab · All payments tab)
- [x] Payment method cards + "Add payment method" placeholder
- [x] `app.wallet.tsx` — mobile wallet page with same flow

---

### ✅ Phase 3 — Checkout Waterfall
*Completed: 2026-08-08*

- [x] Booking flow steps: date → tee time → players/preferences → voucher → GHV → GHP → confirm
- [x] Price summary panel (desktop sidebar)
- [x] Checkout order: Rate → Member discount (25%) → Voucher → GHV slider → GHP slider → gateway
- [x] Member 25% discount applied automatically when `membership_status === "Paid Member"`
- [x] GHP cap: max 20% of remaining balance after GHV
- [x] Confirmation screen with mock QR pass + reference code
- [x] `channel_tag: "GH_APP"` on every booking
- [x] `topUpGHV(-amount)` deducts from wallet on confirm

---

### ✅ Phase 4 — Booking Lifecycle
*Completed: 2026-08-08*

- [x] Booking status stepper: Confirmed → Checked-in → Completed (Cancelled / No-Show variants)
- [x] Cancellation AlertDialog with refund tier policy (>72h = 100%, 24–72h = 50%, <24h = 0%)
- [x] Refund credited to GHV balance immediately (mock)
- [x] Booking detail page (`golfer.bookings.$bookingId.tsx`) with QR mobile pass
- [x] Reschedule button (stub toast, >48h only)
- [x] "View & manage →" link from golfer home upcoming tee time card

---

### ✅ Phase 5 — Tournaments
*Completed: 2026-08-08*

- [x] Tournament browser with filter bar: format · club · fee range · clear-all
- [x] Grid cards with status badge, format, entry fee, spots left / "Almost full" indicator
- [x] "My Tournaments" tab with count badge — upcoming vs past sections
- [x] Tournament detail: `handicap_basis`, `tie_break`, `prize_slots` breakdown table
- [x] Individual registration dialog with payment method selection
- [x] Team registration dialog: captain + lookup partners by Rhapsody ID (add/remove)
- [x] Waitlist CTA when tournament is full
- [x] Tournament pass QR dialog shown after successful registration
- [x] Cancel registration with AlertDialog
- [x] "Enter score" button on detail page when status is `Checked-in`

---

### ✅ Phase 6 — Live Scoring
*Completed: 2026-08-08*

- [x] Scoring route `/golfer/tournaments/$tournamentId/score`
- [x] Hole-by-hole entry with +/− counter; par + stroke index displayed per hole
- [x] Format-aware running totals: gross always shown; Stableford / System 36 add points column
- [x] System 36 per-hole handicap strokes calculated from `courseHandicap` vs `COURSE_SI`
- [x] Numbered hole progress bar (grey = not entered, blue = entered, green = verified)
- [x] Marker sign-off button per hole; toggleable demo mode (captain ↔ marker)
- [x] Pending-sync indicator (1.5s visual after any entry — offline resilience UI)
- [x] Submit locked until all 18 holes entered; confirmation dialog with unverified-hole warning
- [x] Success screen with final gross score, points total, "provisional" label

---

### ✅ Phase 7 — Public Leaderboard
*Completed: 2026-08-08*

- [x] Public live leaderboard `/tournaments/$tournamentId/live` (no auth required)
- [x] Auto-refresh every 30s (simulated with interval); manual refresh button
- [x] Filter by flight; gross / net / points toggle (format-aware — points for Stableford/System 36)
- [x] Provisional vs verified score indicator per row (marker sign-off state)
- [x] "Playing" pulse badge vs "Finished" badge; position medals for top 3
- [x] "You" highlight row (RH-10001) for logged-in users viewing their own tournament
- [x] Social share via `navigator.share` with clipboard fallback
- [x] OG meta tags for social sharing (title, description, og:title)
- [x] Prize breakdown card below leaderboard
- [x] "View live leaderboard ↗" link from tournament detail (Finished / Closed tournaments)
- [x] Mock leaderboard data for t-4 (Finished · Stroke Play) and t-2 (Live · Stableford)

---

### ✅ Phase 8 — In-App AI Chat (Frontend)
*Completed: 2026-08-08*

- [x] Wire `/app/chat` → `POST /api/chat/message` via `VITE_BACKEND_URL`
- [x] Typing indicator (three-dot bounce) while agentic loop runs
- [x] Confirm buttons rendered inline — auto-dismissed after user taps, sends `__action:…` to backend
- [x] Booking confirmed card with QR pass + ref code (from `booking` field in response)
- [x] Graceful offline fallback when backend unreachable
- [x] Online / offline status dot in chat header
- [x] Quick-prompt chips on empty chat (first open)
- [x] `sessionId` threaded through request/response — frontend stores and re-sends each turn
- [x] Backend creates/reuses `chat_sessions` row on first call; persists messages to `chat_messages` non-blocking
- [x] History loaded from DB on conversation resume via `loadHistory(sessionId)`
- [x] `bookingPayload` from `SendInAppMessageTool` stored in `pendingPayload` ref; shown as booking card when state → `BOOKED`
- [x] Confirm bubble wired to real `BookingPayload` type; cancel action handled locally (no extra roundtrip)

---

## Backend Phases

### ✅ Phase 0 — Project Scaffold
*Completed: 2026-08-08*

- [x] `backend/` folder created (`commonjs`, no workspace tooling)
- [x] `backend/package.json` — deps: express, cors, helmet, morgan, @anthropic-ai/sdk, @supabase/supabase-js, zod
- [x] `backend/src/server.js` — Express app, `/health`, `/api/chat` router
- [x] `backend/src/config/` — index.js, supabase.js, claude.js
- [x] `backend/src/utils/` — logger.js, time.js (WIB helpers)
- [x] `backend/src/prompts/booking.prompt.md` — Rhapsody-adapted from resvai
- [x] `backend/src/services/ai.service.js` — tool-calling loop (stub handlers)
- [x] `backend/src/routes/chat.js` — `POST /api/chat/message`
- [x] `backend/.env.example`

---

### ✅ Phase 1 — Database & Auth
*Completed: 2026-08-08*

- [x] Supabase project created (`oqajfjmgxyvkdyvofhmz`)
- [x] Prisma schema with full snake_case `@map` — pushed via `db push`
- [x] Supabase Auth enabled (email/password)
- [x] RLS policies: 39 policies across all tables
- [x] `handle_new_user` trigger — auto-creates `public.users` row on signup
- [ ] Seed database with mock data — deferred to when UI needs real data

---

### ✅ Phase 2 — Booking API
*Completed: 2026-08-08*

- [x] `GET /api/clubs` — list all clubs (public)
- [x] `GET /api/clubs/:id` — single club detail (public)
- [x] `GET /api/clubs/:id/tee-slots?date=YYYY-MM-DD` — available slots for date (public)
- [x] `POST /api/bookings` — create booking: price band → member 25% discount → voucher → mock payment; sets `channel_tag: GH_APP` (auth required)
- [x] `GET /api/bookings` — user's own bookings, paginated, filterable by status (auth scoped)
- [x] `PATCH /api/bookings/:id/status` — golfer: Cancelled only; club_admin: all transitions; auto-refund to mock GHV on cancel; creates Visit on CheckedIn
- [x] `src/middleware/auth.js` — JWT verifier: decodes Supabase Bearer token → looks up `public.users` → sets `req.userId` + `req.role`
- [x] `src/services/booking.service.js` — all business logic isolated (price bands, discounts, slot lock, refund policy)
- [x] `scripts/seed-tee-slots.js` — 60-day rolling tee slots seeder; upsert-safe, batched 500 rows

---

### ✅ Phase 3 — Loyalty & Vouchers API
*Completed: 2026-08-08*

- [x] `GET /api/loyalty` — points balance grouped by club (auth scoped)
- [x] `GET /api/loyalty/history?clubId=&limit=&offset=` — paginated ledger entries
- [x] `POST /api/loyalty/earn` — computes pts via LoyaltyRule (pts_per_spending, weekday multiplier, visit bonus); append-only ledger
- [x] Auto-earn hook wired into `booking.service.js` — fires on `Completed` status transition (non-blocking, logs warning on failure)
- [x] `GET /api/vouchers?clubId=` — active non-expired vouchers for current user
- [x] `POST /api/vouchers/:code/redeem` — validates ownership, club scope, expiry; marks `Redeemed`; returns `{ discount, voucherId }`
- [x] `GET /api/admin/loyalty-rules/:clubId` — fetch club rule (with defaults fallback)
- [x] `PUT /api/admin/loyalty-rules/:clubId` — upsert rule fields; club_admin + superadmin only
- [x] `POST /api/admin/vouchers` — issue voucher to user; auto-generates code if not supplied
- [x] `src/services/loyalty.service.js` — all earn/balance/ledger/rule logic
- [x] `src/services/voucher.service.js` — validate, redeem, issue logic

---

### ✅ Phase 4 — Club Admin API
*Completed: 2026-08-08*

- [x] `GET /api/admin/teesheet?clubId=&date=` — all bookings for club on date with player details
- [x] `PATCH /api/admin/bookings/:id/checkin` — check-in a booking (club_admin only)
- [x] `GET /api/admin/members?clubId=&search=&status=&limit=&offset=` — member list with search
- [x] `GET /api/admin/members/:memberId?clubId=` — 360-view: member + bookings + loyalty + vouchers
- [x] `GET /api/admin/campaigns?clubId=` — list campaigns
- [x] `POST /api/admin/campaigns` — create campaign (status: Draft)
- [x] `PATCH /api/admin/campaigns/:id` — update campaign (status, title, dates)
- [x] `GET /api/admin/analytics?clubId=` — revenue_30d, bookings_30d, members_total, paid_members, avg_handicap, 7-day visit trend
- [x] `GET /api/admin/audit?clubId=&limit=&offset=` — paginated audit log
- [x] `src/middleware/clubScope.js` — resolves + verifies `req.clubId`; club_admin scoped to own club, superadmin passes any
- [x] `src/services/audit.service.js` — non-blocking `audit(req, action, meta)` helper; logs warning on DB failure

---

### ✅ Phase 5 — Tournaments API

- [x] `tournament.service.js` — listTournaments, getTournament, registerForTournament (waitlist logic, mock payment), cancelRegistration
- [x] `scorecard.service.js` — saveScorecard (18-hole validation, async handicap update), updateHandicap (best 8 of last 20, min 3, clamp 0–54), getScorecards
- [x] `GET /api/tournaments?clubId=&status=&format=&limit=&offset=` — public list with filters
- [x] `GET /api/tournaments/:id` — single tournament detail
- [x] `GET /api/tournaments/:id/leaderboard?flight=` — public leaderboard
- [x] `GET /api/tournaments/my/registrations` — auth-scoped registrations
- [x] `POST /api/tournaments/:id/register` — register + waitlist logic
- [x] `DELETE /api/tournaments/:id/register` — cancel registration
- [x] `POST /api/tournaments/:id/score` — live scoring write endpoint (per-hole, gross compute)
- [x] `GET /api/scorecards` — user scorecards paginated
- [x] `POST /api/scorecards` — save scorecard + async handicap recalc
- [x] Wired to `server.js`

---

### ✅ Phase 6 — Superadmin API

- [x] `GET /api/superadmin/analytics` — revenue_30d, bookings_30d, members_total, paid_members, avg_handicap, top clubs by revenue, 7-day visit trend
- [x] `GET /api/superadmin/members?search=&clubId=&status=&limit=&offset=` — network-wide member search with name/email/rhapsody_id client filter
- [x] `GET /api/superadmin/members/:userId` — 360-view: profile, memberships, bookings, loyalty balances, vouchers, tournament history
- [x] `GET /api/superadmin/audit?clubId=&userId=&action=&limit=&offset=` — network-wide audit log (cross-club)
- [x] `GET /api/superadmin/health` — checks Supabase DB, Supabase Auth, Anthropic API key
- [x] `GET /api/superadmin/clubs` — all clubs with paid member count
- [x] `requireSuperadmin` guard on all routes
- [x] Wired to `server.js` at `/api/superadmin`

---

### ✅ Phase 7 — AI Agent (Chat Service)

- [x] `config/claude.js` — Anthropic client uses `ANTHROPIC_BASE_URL` (9router proxy) + `ANTHROPIC_AUTH_TOKEN` + `ANTHROPIC_MODEL`
- [x] `config/index.js` — reads `ANTHROPIC_BASE_URL`, `ANTHROPIC_AUTH_TOKEN`, `ANTHROPIC_MODEL` from env
- [x] `.env` — `ANTHROPIC_BASE_URL=https://9router.etalas.studio/v1`, `ANTHROPIC_MODEL=cc/claude-sonnet-4-6`
- [x] `GetCustomerProfileTool` → Supabase `users` + `bookings` (last booking date)
- [x] `ListGolfCoursesTool` → Supabase `clubs` (active only, id/name/city/holes/par)
- [x] `CheckAvailabilityTool` → Supabase `tee_slots` by club name (ilike) + date; suggests alternatives if none found
- [x] `CreateBookingTool` → `booking.service.createBooking` with `channel_tag: GH_APP` (returns `booking_id` only)
- [x] `GeneratePaymentTool(booking_id)` → Midtrans Snap `createTransaction`; returns `snap_token` + `order_id`
- [x] `GenerateInvoiceTool(booking_id)` → `invoice.service.generateInvoice`; returns `pdf_url`
- [x] `GetLoyaltyPointsTool` → `loyalty.service.getBalances`
- [x] `CheckVoucherTool` → `voucher.service.getUserVouchers`
- [x] `SendInAppMessageTool` — passes `booking_payload`, `snap_token`, `order_id`, `invoice_url` through to frontend
- [x] `STATE_BY_TOOL`: CHECK_AVAILABILITY → BOOKED → WAITING_PAYMENT → DONE (mirrors resvai)
- [x] `getOrCreateSession(userId)` — creates/reuses `chat_sessions` row
- [x] `persistMessage(sessionId, role, content)` — non-blocking insert to `chat_messages`
- [x] `loadHistory(sessionId)` — loads last 100 messages as Anthropic Messages API format
- [x] `chat.js` route — passes `sessionId`, `snapToken`, `orderId`, `invoiceUrl` in/out

### ✅ Midtrans Integration (Booking Agent)

- [x] `backend/.env` — `MIDTRANS_SERVER_KEY`, `MIDTRANS_CLIENT_KEY`, `MIDTRANS_IS_PRODUCTION=false`
- [x] `frontend/.env` — `VITE_MIDTRANS_CLIENT_KEY`, `VITE_MIDTRANS_IS_PRODUCTION=false`
- [x] `config/midtrans.js` — Snap + CoreApi client (sandbox/production toggle)
- [x] `booking.service.js` — `createBooking` inserts booking as `PendingPayment`; slot locked immediately; rollback on Snap error
- [x] `payments.js` — `POST /api/payments/midtrans-webhook`: verifies signature, confirms on `settlement`, releases slot on expire/cancel
- [x] `GET /api/payments/status/:orderId` — frontend polls payment status after Snap popup closes
- [x] `invoice.service.js` — PDF via pdfkit (Rhapsody purple/gold branding); uploads to Supabase Storage bucket `invoices`
- [x] `deliverInvoice()` — generates PDF + persists confirmation + invoice URL to `chat_messages`; closes session (state: DONE)
- [x] Agent flow: confirm → `CreateBookingTool` → `GeneratePaymentTool` → Snap popup → webhook → `deliverInvoice`
- [x] `booking.prompt.md` — full Bahasa Indonesia, resvai-equivalent rigor, tool-chaining rules, voucher + add-on steps
- [x] Frontend — loads Snap.js from CDN, `window.snap.pay()`, invoice download link in `BookingConfirmedBubble`

---

## Key Decisions

| Decision | Rationale |
|----------|-----------|
| Root package uses Bun | Pre-configured by Lovable with `bunfig.toml`; Cloudflare Workers deploy |
| `backend/` uses npm | Node.js runtime; matches resvai pattern |
| No workspace tooling (Turborepo etc.) | Avoid complexity for two-package repo |
| Prisma + Supabase Accelerate for FE | Prisma ORM can't run natively on Cloudflare Workers — Accelerate solves this |
| `golfer/*` and `app/*` are parallel namespaces | Two separate UIs sharing the same JWT + backend data |
| `app/*` mobile-first (max 430px) | Responsive web app only — no native iOS/Android |
| Real payment gateway out of scope | Mock payment flow only |

---

## File Structure (monorepo)

```
repo root/
  package.json          ← orchestrator only (concurrently dev/build scripts)
  .gitignore
  CLAUDE.md · PRD.md · INTEGRATION_PLAN.md · TIMELINE.md
  frontend/             ← Vite + TanStack Start + Cloudflare Workers (Bun)
    package.json        ← DO NOT npm install here — use bun install
    bun.lock
    .env.example        ← copy to .env, add Supabase + backend URL
    src/
      routes/           app.* · golfer.* · club.* · admin.*
      components/       AppShell · MobileShell · ui/ · ui-bits
      lib/              mockData · appContext · utils
      assets/
    vite.config.ts · wrangler.jsonc · tsconfig.json
  backend/              ← Node.js Express + AI agent (npm)
    package.json        ← DO NOT bun add here — use npm install
    .env.example        ← copy to .env, add Supabase + Anthropic keys
    src/
      server.js
      config/           index.js · supabase.js · claude.js
      routes/           chat.js
      services/         ai.service.js
      tools/            (wired in Phase 7)
      utils/            logger.js · time.js
      prompts/          booking.prompt.md
  prisma/
    schema.prisma       ← shared schema (both packages)
  supabase/
    migrations/
```

### Dev commands (run from repo root)

```bash
npm run dev            # start both frontend + backend concurrently
npm run dev:frontend   # frontend only  (port 8080)
npm run dev:backend    # backend only   (port 3001)
npm run build          # production build (frontend only)
npm run install:all    # first-time install for both packages
```
