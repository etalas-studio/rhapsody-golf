# Product Requirements Document — Rhapsody Golf Connect

**Version:** 1.0  
**Date:** 2026-08-08  
**Status:** Living document — reflects implemented frontend as of current build

---

## 1. Product Overview

Rhapsody Golf Connect is a network-based golf management platform connecting individual golfers, golf club operators, and platform administrators in one integrated ecosystem.

The platform operates in two distribution modes:

| Mode | Description |
|------|-------------|
| **Rhapsody App** | Network-wide — golfers can access all clubs in the Rhapsody network |
| **Club-Branded App** | Single-club white-label — UI, branding, and data are scoped to one specific club |

---

## 2. Personas & Roles

### 2.1 Golfer
An individual golf player. Can access the platform as a **guest** (browse only) or as an **authenticated user** (booking, tournament registration, loyalty redemption).

- Signup wall only appears on mutations (booking, registering for a tournament, redeeming a voucher)
- Soft nudge appears after 2 course page views as a guest

### 2.2 Club Admin (`club_admin`)
Golf club staff or management. All data is scoped to `selectedClubId` — cannot access data from other clubs.

### 2.3 Superadmin (`superadmin`)
Rhapsody platform administrator (Realta). Has cross-club access — cross-club member view, integrations, audit log, and app management.

---

## 3. Authentication

| Method | Details |
|--------|---------|
| Email + password | Standard form, email tab |
| Phone + OTP | One-time code, phone tab |
| Social | Google, Apple |
| Guest | Continue browsing without login; blocked on mutations |

The **login page** supports experience selection at signup: Rhapsody App (network) vs Club-Branded App (select club from dropdown).

**AuthGate** is a global modal that intercepts guest mutations, then re-runs the original action (`onSuccess` callback) after the user successfully signs in or up.

---

## 4. URL Structure

| URL | Audience | Interface |
|-----|----------|-----------|
| `/` | Public | Landing page — hero + 2 CTA buttons |
| `/login` | all roles (golfer, club_admin, superadmin) | Shared web login — redirect by role post-login |
| `/app/login` | golfer / member only | Mobile app login |
| `/golfer/*` | golfer / member | **Web dashboard** — desktop-first |
| `/app/*` | golfer / member | **Mobile app** — mobile-first (375px–430px) |
| `/club/*` | club_admin | Club operations dashboard |
| `/admin/*` | superadmin | Platform admin |
| `/docs` | all | Documentation |
| `/tournaments/:id/live` | public | Live leaderboard (Phase 7) |

### Two login URLs only

| URL | Who logs in | Redirect after login |
|-----|-------------|----------------------|
| `/login` | golfer (web), club_admin, superadmin | `golfer` → `/golfer` · `club_admin` → `/club` · `superadmin` → `/admin` |
| `/app/login` | golfer / member (mobile) | → `/app` |

### Member has two interfaces

| Interface | URL prefix | Login | Layout | Primary device |
|-----------|------------|-------|--------|----------------|
| **Web Dashboard** | `/golfer/*` | `/login` | Desktop sidebar + top bar | Desktop / laptop |
| **Mobile App** | `/app/*` | `/app/login` | Bottom tab bar, no sidebar | Phone (375–430px) |

Both interfaces share the same Supabase Auth JWT and the same backend data.

### Landing page CTAs
- **"Open App"** → `/app/login` (mobile)
- **"Login"** → `/login` (web — all roles)

---

## 5. Architecture & Navigation

### AppShell — Web Dashboard (`/golfer/*`, `/club/*`, `/admin/*`)
- **Desktop:** 256px fixed sidebar with role-scoped nav links
- **Mobile fallback:** hamburger → Sheet drawer (golfer web dashboard usable on tablet/small desktop)
- **Top bar:** demo switcher (role / app mode / club), notification bell, user avatar dropdown
- **Context badge:** shows active scope (Network-wide / club name / Superadmin)

### Member Web Dashboard Nav (`/golfer/*`)
Home · Courses · Wallet · Loyalty & Vouchers · Scorecard · Tournaments · Profile · Docs

### AppShell — Mobile App (`/app/*`)
- **No sidebar** — bottom tab bar only
- **5 tabs:** Home · Courses · Score · Rewards · Chat
- Mobile-first layout, 375px–430px viewport target
- Top bar: minimal — logo + notification bell + avatar

### Two Login Pages
| Route | Who | Layout | Post-login redirect |
|-------|-----|--------|---------------------|
| `/login` | all roles | Desktop-first, split panel | `golfer` → `/golfer` · `club_admin` → `/club` · `superadmin` → `/admin` |
| `/app/login` | golfer / member only | Mobile-first, full-screen | `/app` |

---

---

## 5a. Landing Page (`/`)

Simple public page, desktop + mobile responsive.

- Hero section: Rhapsody logo, tagline, background golf imagery
- Two CTA buttons:
  - **"Open App"** → `/app/login` (mobile)
  - **"Login"** → `/login` (web — all roles, redirects by role)
- No auth required

---

## 6. Features — Member / Golfer

Member features are available on **both interfaces** unless marked otherwise.

### Interface mapping

| Feature | Web (`/golfer/*`) | Mobile (`/app/*`) |
|---------|-------------------|-------------------|
| Home dashboard | ✓ | ✓ |
| Course directory | ✓ | ✓ |
| Course detail | ✓ | ✓ |
| Booking flow | ✓ | ✓ |
| Tournaments | ✓ | ✓ |
| Scorecard | ✓ | ✓ |
| Wallet | ✓ | ✓ |
| Loyalty & Vouchers | ✓ | ✓ |
| Profile | ✓ | ✓ |
| Play history | ✓ | ✓ |
| **In-app AI chat** | — | ✓ mobile only |

### 6.1 Home Dashboard (`/app`)
- Welcome message with first name + Rhapsody ID
- Hero card: home club banner, membership badge (type, expiry, club member ID), or Visitor badge
- KPI cards: Total Loyalty Points, Active Vouchers, Rounds (last 12 months), Tournaments
- Upcoming tee time: booking details + mock QR mobile pass
- Loyalty by club: points breakdown per club + Rhapsody Network row
- Recommended campaigns: up to 3 active campaigns (type badge, club, end date)
- Recently visited clubs: list with membership status

### 6.2 Course Directory (`/app/courses`)
- Search by course name
- Filters: region, "My member clubs", "Promo available", "Tournament available"
- Grid cards: banner, location, rating, starting price, membership status badge
- Guest soft-nudge card after 2 views

### 6.3 Course Detail (`/app/courses/:courseId`)
- Full-width hero with overlay info
- Facilities (badge checklist)
- Pricing card: Weekday green fee, Weekend green fee, Cart, Caddie — with member strike-through pricing
- Active promotions at this course
- Tournaments hosted at this course
- Sticky "Book a tee time" CTA

### 6.4 Booking Flow (`/app/book/:courseId`)
Booking is split into 4 steps:

| Step | Content |
|------|---------|
| 1. Choose date | 7-day horizontal scroll |
| 2. Choose tee time | Slot grid 06:00–16:30, every 30 minutes; Early/Prime/Twilight pricing |
| 3. Players & preferences | Player count (1–4), cart service toggle, caddie service toggle, guest name inputs |
| 4. Apply voucher | Dropdown of active vouchers for this club |

**Price summary** (desktop: sticky sidebar; mobile: sticky bottom bar):
- Green fee × N players (with 25% member discount if applicable)
- Cart / Caddie service rows
- Voucher discount line
- Total + "Tokenised payment" badge

After confirm: confirmation screen with mock QR pass + reference code.

**Tee slot pricing:**
- Early (06:00–10:30): Rp 1,250,000
- Prime (11:00–13:30): Rp 1,450,000
- Twilight (14:00–16:30): Rp 1,100,000

### 6.5 Tournament Browser (`/app/tournaments`)
- "Browse" tab: grid cards — club, status badge, title, date, participants/max, format, entry fee
- "My Tournaments" tab (with count badge): upcoming & live / past results

### 6.6 Tournament Detail & Registration (`/app/tournaments/:tournamentId`)
- Registration status banner (registered / cancelled)
- Stat tiles: Date, Tee off, Spots, Entry fee
- Description, rules, schedule, prize pool, venue & contact
- CTA: "Register · [fee]" → requires auth → registration dialog (payment method, name, format)
- Cancel registration with AlertDialog + refund policy note

### 6.7 Scorecard & Handicap (`/app/scorecard`)
- Handicap Index card: index value, category (Plus/Scratch/Low/Mid/High), stats (Rounds, Best round, Avg, Playing HCP)
- Score history list: course, date, total score, score-to-par badge
- Scorecard detail: Front 9 + Back 9 table, cells color-coded by result
- New round form: course selector, date input, 18-hole input grid, running total vs par

**Scorecard color coding:**

| Result | Color |
|--------|-------|
| Eagle (−2) | Gold |
| Birdie (−1) | Green |
| Par | Plain |
| Bogey (+1) | Rose |
| Double+ (≥+2) | Dark rose |

### 6.8 Wallet (`/app/wallet`)
- Payment method cards: icon, label, type, "Tokenised" badge, "Default" badge
- "Add payment method" dashed card (CTA)
- Transaction history table: Reference, Club, Category, Method, Status, Amount

### 6.9 Loyalty & Vouchers (`/app/loyalty`)
- Points balance per club (+ Rhapsody Network card in non-branded mode only)
- Tabs: Active / Redeemed / Expired (with counts)
- Voucher cards: type badge, title, code (mono), club, value, expiry, "Redeem" button

### 6.10 Profile (`/app/profile`)
- Avatar, name, Rhapsody ID, Handicap Index + category
- Contact details: phone, email, join date
- Club memberships: list with member ID + expiry
- Play history: per-club round count + last played date → links to history detail
- Consent & marketing preferences: 6 toggles (promotional emails, SMS, push notifications, share play history, personalised tournament invitations, cross-club anonymous analytics)

### 6.11 Club Play History (`/app/history/:clubId`)
- Rounds list: Tournament icon (trophy) / Casual icon (calendar), date, tee time, score
- RoundDetail panel: status, game type, tournament info, playing partners
- Inline scorecard if available (Front 9 + Back 9 with same color-coding)
- Deep-link to specific round via `?round=` query param

### 6.12 In-App Chat / AI Agent Inbox (`/app/chat`)

Floating chat bubble accessible from the bottom tab bar. Powered by an Anthropic Claude agent running on the Node.js backend service (`backend/`).

**UI:**
- Floating bubble button on all `/app/*` pages (bottom-right, above tab bar)
- Full-screen chat view at `/app/chat`: conversation thread, typing indicator, message bubbles
- Confirmation step renders a summary card with "Confirm" / "Cancel" buttons (inline, not keyboard input)
- After booking confirmed: booking summary card with QR pass reference

**AI agent tools:**

| Tool | Purpose |
|------|---------|
| `GetCustomerProfileTool` | Fetch user profile by `user_id`; greet by name if returning |
| `ListGolfCoursesTool` | List active courses from DB — never invent course names |
| `CheckAvailabilityTool` | Check real tee slot availability for date ± course |
| `CreateBookingTool` | Create booking after user confirmation |
| `GeneratePaymentTool` | Generate payment link (mock or Midtrans) |
| `GetLoyaltyPointsTool` | Return user's points balance per club |
| `CheckVoucherTool` | Return user's active vouchers for a given club |
| `SendInAppMessageTool` | Send structured message to frontend with optional confirm buttons |

**Conversation flow (mirrors resvai pattern):**
1. Check customer profile
2. Collect: course → date → tee time
3. Show available slots as numbered list
4. Collect: player count, cart/caddie preference, voucher (if any)
5. Show booking summary via `SendInAppMessageTool` with confirm buttons
6. `CreateBookingTool` → `GeneratePaymentTool`
7. Return payment link + booking reference

**Chat session persistence:** stored in `chat_sessions` + `chat_messages` tables (Supabase).

---

## 7. Features — Club Admin

All data is scoped to the selected club. Club admins cannot access data from other clubs.

### 6.1 Dashboard (`/club`)
8 KPIs: Paid Members, Visitors, Bookings Today, Revenue (period), Visits (this month), Voucher Redemptions, Loyalty Points Issued, Active Campaigns.

- Campaign performance card: per-campaign with progress bar (redemption %)
- Today's tee sheet snapshot: top 6 bookings for today

### 6.2 Tee Sheet (`/club/teesheet`)
- 5 status summary cards: Confirmed, Checked-in, Completed, No-Show, Cancelled
- Booking table: Tee time, Golfer (avatar + name + Rhapsody ID), Players, Status badge, Payment badge, Amount
- Sorted by tee time ascending

### 6.3 Members (`/club/members`)
- Search by name / Rhapsody ID
- Filters: All, Paid Member, Visitor, Inactive, High Spender (≥Rp 3M), Frequent Player (≥2 visits)
- Table: Member, Rhapsody ID, Club Member ID, Status, HCP, Visits, Spending, Last visit, Loyalty pts
- Row click → member detail

### 6.4 Member Detail (`/club/members/:memberId`)
- Header: avatar, name, Rhapsody ID + email, status badge, club member ID, HCP badge
- 4 mini KPIs: Bookings, Visits, Spending, Loyalty pts (all club-scoped)
- RLS warning banner: profile data is limited to this club only
- Bookings at this club: booking list
- Vouchers issued by this club: voucher list

### 6.5 Promotions / Campaigns (`/club/promotions`)
**"New Campaign" form:**
- Title
- Target segment: Paid members / Inactive members / Weekday players / High spenders / Birthday month members / Visitors (played last 90 days)
- Campaign type: Voucher / Discount / Bonus Points / Tournament Invitation / F&B Promo
- Start + end date

Campaign cards: title, date range, status badge, type + segment badges, 3 metric tiles (Reach, Redemptions, Conversion %), progress bar.

### 6.6 Vouchers (`/club/vouchers`)
- Table: Code (mono), Title, Assigned to, Type, Value, Status badge, Fraud check badge (Shield + "Passed"), Expiry
- "Create voucher" CTA (form not yet implemented)

### 6.7 Loyalty Rules (`/club/loyalty`)
**Earn rules (5 configurable rules):**

| Rule | Unit |
|------|------|
| Earn per spending | pts per Rp 10,000 |
| Bonus per visit | pts |
| Weekday bonus | × multiplier |
| Birthday month reward | pts |
| Tier upgrade threshold | pts |

- Toggle + numeric input per rule
- "Save rules" button
- Loyalty ledger table: Date, Member, Type + description, Points (green = earn / red = redeem)

### 6.8 Analytics (`/club/analytics`)
- 4 KPIs: Total Revenue, Member Revenue, Visitor Revenue, Booking Occupancy %
- Revenue by category: CSS bar chart (Green Fee, Cart, etc.)
- Visit trend: 12-week bar chart (W1–W12)
- Member vs visitor revenue: proportional stacked bar + IDR breakdown

---

## 8. Features — Superadmin

### 7.1 Network Overview (`/admin`)
8 network-wide KPIs: Golf Courses, Rhapsody IDs, Paid Club Members, Total Bookings, Visits, Transaction Volume, Vouchers Issued, Loyalty Points.

- Club-branded apps list: logo, name, app type, integration status dot (Online / Warning / Offline)
- System integration health: per-club status dots for 5 feeds (Membership, Teesheet, POS, Payment, Loyalty)

### 7.2 Platform Analytics (`/admin/analytics`)
- Revenue by club: sorted list with IDR amount + % share + gradient progress bar
- Top courses by bookings: ranked list
- Voucher redemption: redeemed count / total issued + progress bar
- Loyalty engagement: total points issued network-wide + qualifying visits

### 7.3 App Management (`/admin/apps`)
- Left sidebar: Rhapsody App (Network badge) + list of all clubs
- Right panel per club: banner preview, settings form (App display name, Theme color, Logo filename, Banner filename, Terms URL), feature toggles (Booking, Payment, Loyalty, Voucher, Tournament, Shopping)

### 7.4 Audit Log (`/admin/audit`)
- Immutable log table: Timestamp, User (actor), Role badge, Action description, Club, IP address (mono)

### 7.5 Golf Courses (`/admin/courses`)
- Table: Course (logo + name), Location, App Type, Paid Members, Visitors, Bookings, Revenue, Integration status dot, Dashboard button

### 7.6 Integrations (`/admin/integrations`)
- Per-club status dots: Membership, Tee sheet, POS, Payment, Loyalty
- Last sync timestamp per feed

### 7.7 Network Members (`/admin/members`)
- Table: Golfer (avatar + name + Rhapsody ID, linked), Contact, Linked clubs (badges), Visits, Spending, Last activity

### 7.8 Member 360 (`/admin/members/:userId`)
- "Cross-club view" badge
- Club relationships card: all clubs + membership status per club
- Cross-club spending breakdown per club
- All bookings network-wide across all clubs

---

## 9. Data Model

| Entity | Description |
|--------|-------------|
| `networkUsers` | All registered users on Rhapsody (8 users in mock) |
| `clubs` | Golf clubs in the network (5 clubs: Emerald Hills, Royal Jakarta, Bali National, Surabaya Links, Bandung Highland) |
| `clubMembers` | User ↔ club relationship; `membership_type` (Gold/Silver/Platinum), `status` (Paid Member/Visitor/Tournament Participant/Inactive) |
| `bookings` | Tee time reservations; status: Confirmed/Checked-in/Completed/Cancelled/No-Show; game type: Casual/Tournament/Practice |
| `payments` | Payment transactions; category: Green Fee/F&B/Tournament/Pro Shop/Cart; method: Credit Card/QRIS/E-Wallet/Voucher/Loyalty Points/Member Account |
| `vouchers` | Per-club vouchers; type: Green Fee/F&B/Cart/Pro Shop; status: Active/Redeemed/Expired |
| `loyaltyLedger` | Points ledger; type: Earn/Bonus/Redeem; club-scoped + "network" for cross-club |
| `campaigns` | Promotional campaigns per club; type: Bonus Points/Voucher/Discount/F&B Promo/Tournament Invitation |
| `scorecards` | 18-hole stroke array per round; paired with `COURSE_PARS` (par 72) |
| `tournaments` | Tournament events; status: Open/Registration Closed/Finished; format and entry fee |
| `tournamentRegistrations` | Golfer ↔ tournament relationship; status: Confirmed/Checked-in/Completed |
| `integrations` | Sync status per club × 5 feeds (Membership/Teesheet/POS/Payment/Loyalty) |
| `auditLogs` | Privileged action log: actor, role, action, club, IP, timestamp |
| `paymentMethods` | Saved payment methods per user (Visa, QRIS, GoPay, House Account) |

---

## 10. External Integrations (Status Monitoring)

Each club has 5 integration feeds monitored by superadmin:

| Feed | Description |
|------|-------------|
| Membership sync | Membership data synchronisation |
| Tee sheet sync | Tee time schedule synchronisation |
| POS | Club point-of-sale system |
| Payment gateway | Payment processing gateway |
| Loyalty sync | Loyalty points synchronisation |

Status per feed: **Online** / **Warning** / **Offline**

Current mock state examples:
- Emerald Hills: all Online
- Bali National: teesheet_sync + loyalty_sync = Warning
- Bandung Highland: all Offline

---

## 11. Out of Scope (Not Yet Implemented)

Based on `.lovable/plan.md`, the following features are not yet built:

| Feature | Phase |
|---------|-------|
| GHV / GHP wallet split + top-up | Phase 2 |
| Checkout waterfall: rate selection, GHV/GHP apply, cart | Phase 3 |
| Booking lifecycle states + cancellation flow | Phase 4 |
| Tournament format filters, team registration, tournament pass QR | Phase 5 (remainder) |
| Live tournament scoring route | Phase 6 |
| Public live leaderboard | Phase 7 |
| Club admin: real-time tee sheet | — |
| Rate authoring UI for club admin | — |
| Tournament creation UI | — |
| Cloud backend / real authentication | — |
| Real payment processing | — |

---

## 12. Tee Slot Availability Logic

`getTeeSlots()` generates 22 slots: 06:00–16:30, every 30 minutes.

- ~75% of slots are available
- Time-based pricing:
  - **Early** (06:00–10:30): Rp 1,250,000
  - **Prime** (11:00–13:30): Rp 1,450,000
  - **Twilight** (14:00–16:30): Rp 1,100,000
- Member discount: 25% applied automatically

---

## 13. Demo Accounts (Mock)

| Role | User | ID |
|------|------|----|
| Golfer | Michael Tan | RH-10001 |
| Club Admin | Emerald Hills | — |
| Superadmin | Realta | — |

---

## 14. Tech Stack

| Layer | Technology |
|-------|------------|
| Frontend framework | React (TSX) |
| Routing | TanStack Router (file-based) |
| Bundler | Vite |
| Runtime | Bun |
| Styling | Tailwind CSS |
| UI Components | shadcn/ui (Radix UI) |
| Deployment | Cloudflare Workers (wrangler) |
| Data | Mock in-memory (`src/lib/mockData.ts`) |
| Validation | Zod |
