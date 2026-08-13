# Backend Integration Plan — Rhapsody Golf Connect

**Date:** 2026-08-08  
**Stack:** Prisma + Supabase (PostgreSQL + Auth + Storage + RLS)

---

## Overview

Replace all `src/lib/mockData.ts` usage with real API calls backed by Supabase PostgreSQL.  
Auth moves from the in-memory `AppProvider` demo to Supabase Auth.  
Row-Level Security (RLS) enforces data isolation at the DB layer — not just in app code.  
AI agent chatbot runs as a separate Node.js service alongside the frontend Workers bundle.

### Full system architecture

```
Browser / Mobile Web
  │
  ├─ /  /login  /app/*  /club/*  /admin/*   (Cloudflare Workers — Vite + TanStack)
  │       ↕ fetch / TanStack Query
  │   Hono API routes (co-located, Workers)
  │       ↕ Prisma Client (via Prisma Accelerate)
  │
  └─ /app/chat  (also Workers — streams to Node.js backend)
          ↕ POST /api/chat/message
      Node.js Express — backend/
          ↕ Anthropic SDK (agentic tool-calling loop)
          ↕ Prisma Client
          ↕ Midtrans (payment)
          ↕ Supabase (chat_sessions, chat_messages)

Shared:
  Supabase PostgreSQL  ←  both services read/write
  Supabase Auth (JWT)  ←  validated by both services
  Supabase Storage     ←  logos, banners, invoices
```

### Monorepo structure

Single repo, two packages, no workspace tooling (no Turborepo/Nx/pnpm workspaces needed).

```
Rhapsody Golf Connect/          ← repo root
  package.json                  ← frontend package (Bun)
  bun.lock
  bunfig.toml
  wrangler.jsonc
  src/                          ← frontend source (Vite + TanStack Router + Cloudflare Workers)
  backend/                      ← AI agent service (Node.js + Express)
    package.json                ← backend package (Node.js / npm)
    package-lock.json
    src/
      server.js
      app.js
      services/ai.service.js
      tools/                    ← CheckAvailabilityTool, CreateBookingTool, etc.
      prompts/booking.prompt.md
      config/
      repositories/
  prisma/
    schema.prisma               ← shared — used by both frontend (Prisma Accelerate) and backend (direct)
    migrations/
  supabase/
    migrations/                 ← RLS policies, triggers, auth functions
```

**Two independent package.json files:**

| File | Runtime | Package manager | Deploy target |
|------|---------|----------------|---------------|
| `package.json` (root) | Bun | Bun | Cloudflare Workers |
| `backend/package.json` | Node.js | npm | Railway / Render / VPS |

Shared: `prisma/schema.prisma` — both packages install `prisma` and point to it.

> `backend/` follows the same structure as the resvai project. Node.js is used **only** for `backend/` — frontend stays on Bun + Workers.

---

## 1. Prisma Schema

File: `prisma/schema.prisma`

```prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider  = "postgresql"
  url       = env("DATABASE_URL")
  directUrl = env("DIRECT_URL") // required by Supabase for migrations
}

// ─── Enums ────────────────────────────────────────────────────────────────────

enum Role {
  golfer
  club_admin
  superadmin
}

enum ServicePolicy {
  optional
  included
  mandatory
}

enum AppType {
  RhapsodyOnly
  ClubBranded
}

enum IntegrationHealth {
  Online
  Warning
  Offline
}

enum MembershipStatus {
  PaidMember
  Visitor
  TournamentParticipant
  Inactive
}

enum MembershipType {
  Gold
  Silver
  Platinum
  None
}

enum BookingStatus {
  Confirmed
  CheckedIn
  Completed
  Cancelled
  NoShow
}

enum GameType {
  Casual
  Tournament
  Practice
}

enum PaymentStatus {
  Pending
  Paid
  Failed
  Refunded
}

enum SettlementStatus {
  Settled
  PendingSettlement
  Failed
}

enum PaymentMethodType {
  CreditCard
  QRIS
  EWallet
  Voucher
  LoyaltyPoints
  MemberAccount
}

enum PaymentCategory {
  GreenFee
  Cart
  Caddie
  FAndB
  ProShop
  Tournament
}

enum LoyaltyTransactionType {
  Earn
  Redeem
  Bonus
  Adjust
}

enum VoucherStatus {
  Active
  Redeemed
  Expired
  Cancelled
}

enum VoucherType {
  GreenFee
  FAndB
  Cart
  ProShop
}

enum CampaignType {
  Voucher
  Discount
  BonusPoints
  TournamentInvitation
  FAndBPromo
}

enum CampaignStatus {
  Draft
  Active
  Ended
}

enum TournamentStatus {
  Open
  RegistrationClosed
  Finished
}

enum TournamentRegStatus {
  Registered
  Waitlist
  Confirmed
  CheckedIn
  Completed
  Cancelled
}

// ─── Models ───────────────────────────────────────────────────────────────────

model Club {
  id            String        @id @default(cuid())
  name          String
  shortName     String
  location      String
  region        String
  logoUrl       String?
  bannerUrl     String?
  themeColor    String
  appType       AppType
  startingPrice Int
  rating        Float         @default(0)
  facilities    String[]
  description   String
  cartPolicy    ServicePolicy
  cartFee       Int           @default(0)
  caddiePolicy  ServicePolicy
  caddieFee     Int           @default(0)
  createdAt     DateTime      @default(now())
  updatedAt     DateTime      @updatedAt

  members        ClubMember[]
  bookings       Booking[]
  payments       PaymentTransaction[]
  loyaltyEntries LoyaltyEntry[]
  loyaltyRules   LoyaltyRule?
  vouchers       Voucher[]
  campaigns      Campaign[]
  scorecards     Scorecard[]
  tournaments    Tournament[]
  teeSlots       TeeSlot[]
  integration    ClubIntegration?
  brandingConfig ClubBrandingConfig?
  auditLogs      AuditLog[]
  admins         ClubAdmin[]

  @@map("clubs")
}

// Separate table links club_admin users to their club(s).
model ClubAdmin {
  id     String @id @default(cuid())
  clubId String
  userId String @unique

  club Club @relation(fields: [clubId], references: [id])
  user User @relation(fields: [userId], references: [id])

  @@map("club_admins")
}

model User {
  id               String    @id @default(cuid())
  authId           String    @unique  // = auth.users.id in Supabase
  rhapsodyId       String    @unique  // auto-generated "RH-XXXXX"
  name             String
  phone            String?
  email            String    @unique
  handicapIndex    Float     @default(54.0)
  handicapUpdated  DateTime?
  role             Role      @default(golfer)
  createdAt        DateTime  @default(now())
  updatedAt        DateTime  @updatedAt

  clubMemberships  ClubMember[]
  bookings         Booking[]
  payments         PaymentTransaction[]
  loyaltyEntries   LoyaltyEntry[]
  vouchers         Voucher[]
  scorecards       Scorecard[]
  tournamentRegs   TournamentRegistration[]
  paymentMethods   PaymentMethod[]
  auditLogs        AuditLog[]
  clubAdmin        ClubAdmin?

  @@map("users")
}

model ClubMember {
  id               String           @id @default(cuid())
  clubId           String
  userId           String
  clubMemberId     String?          // club's own member ID (e.g. "EH-7781")
  membershipStatus MembershipStatus @default(Visitor)
  membershipType   MembershipType   @default(None)
  startDate        DateTime
  expiryDate       DateTime?
  createdAt        DateTime         @default(now())
  updatedAt        DateTime         @updatedAt

  club Club @relation(fields: [clubId], references: [id])
  user User @relation(fields: [userId], references: [id])

  @@unique([clubId, userId])
  @@map("club_members")
}

model Booking {
  id            String        @id @default(cuid())
  clubId        String
  userId        String
  teeTime       DateTime
  players       Int
  status        BookingStatus @default(Confirmed)
  amount        Int           // IDR, total charged
  paymentStatus PaymentStatus @default(Pending)
  partners      String[]      @default([])
  gameType      GameType      @default(Casual)
  tournamentId  String?
  createdAt     DateTime      @default(now())
  updatedAt     DateTime      @updatedAt

  club       Club        @relation(fields: [clubId], references: [id])
  user       User        @relation(fields: [userId], references: [id])
  tournament Tournament? @relation(fields: [tournamentId], references: [id])
  visit      Visit?
  payments   PaymentTransaction[]

  @@map("bookings")
}

// Derived from bookings on check-in; kept as a separate record for analytics.
model Visit {
  id          String        @id @default(cuid())
  clubId      String
  userId      String
  bookingId   String        @unique
  checkInTime DateTime
  status      BookingStatus // CheckedIn | Completed | NoShow

  booking Booking @relation(fields: [bookingId], references: [id])

  @@map("visits")
}

model PaymentTransaction {
  id                String            @id @default(cuid())
  clubId            String
  userId            String
  bookingId         String?
  amount            Int
  paymentMethodType PaymentMethodType
  transactionStatus PaymentStatus     @default(Pending)
  referenceNumber   String            @unique
  settlementStatus  SettlementStatus  @default(PendingSettlement)
  category          PaymentCategory
  createdAt         DateTime          @default(now())

  club    Club     @relation(fields: [clubId], references: [id])
  user    User     @relation(fields: [userId], references: [id])
  booking Booking? @relation(fields: [bookingId], references: [id])

  @@map("payments")
}

model PaymentMethod {
  id        String            @id @default(cuid())
  userId    String
  type      PaymentMethodType
  label     String
  isDefault Boolean           @default(false)
  tokenized Boolean           @default(true)
  createdAt DateTime          @default(now())

  user User @relation(fields: [userId], references: [id])

  @@map("payment_methods")
}

model LoyaltyEntry {
  id              String                 @id @default(cuid())
  clubId          String?                // null = Rhapsody network-wide
  userId          String
  points          Int                    // signed: positive = earn, negative = redeem
  transactionType LoyaltyTransactionType
  description     String
  createdAt       DateTime               @default(now())

  club Club? @relation(fields: [clubId], references: [id])
  user User  @relation(fields: [userId], references: [id])

  @@map("loyalty_ledger")
}

model LoyaltyRule {
  id                   String  @id @default(cuid())
  clubId               String  @unique
  ptsPerSpending       Int     @default(1)    // pts per Rp 10,000 spent
  bonusPerVisit        Int     @default(0)
  weekdayMultiplier    Float   @default(1.0)
  birthdayRewardPts    Int     @default(0)
  tierUpgradeThreshold Int     @default(5000)
  enableSpending       Boolean @default(true)
  enableVisit          Boolean @default(false)
  enableWeekday        Boolean @default(false)
  enableBirthday       Boolean @default(false)
  enableTier           Boolean @default(false)

  club Club @relation(fields: [clubId], references: [id])

  @@map("loyalty_rules")
}

model Voucher {
  id          String        @id @default(cuid())
  clubId      String
  userId      String?       // null = unassigned pool
  voucherCode String        @unique
  title       String
  value       String        // display string e.g. "25% off" or "Rp 150,000"
  status      VoucherStatus @default(Active)
  expiryDate  DateTime
  type        VoucherType
  createdAt   DateTime      @default(now())

  club Club  @relation(fields: [clubId], references: [id])
  user User? @relation(fields: [userId], references: [id])

  @@map("vouchers")
}

model Campaign {
  id              String         @id @default(cuid())
  clubId          String
  title           String
  targetSegment   String
  campaignType    CampaignType
  status          CampaignStatus @default(Draft)
  redemptionCount Int            @default(0)
  reach           Int            @default(0)
  startsAt        DateTime
  endsAt          DateTime
  createdAt       DateTime       @default(now())
  updatedAt       DateTime       @updatedAt

  club Club @relation(fields: [clubId], references: [id])

  @@map("campaigns")
}

model Scorecard {
  id         String   @id @default(cuid())
  clubId     String
  userId     String
  date       DateTime @db.Date
  score      Int
  courseName String
  strokes    Int[]    // 18 values
  pars       Int[]    // 18 values

  club Club @relation(fields: [clubId], references: [id])
  user User @relation(fields: [userId], references: [id])

  createdAt DateTime @default(now())

  @@map("scorecards")
}

model Tournament {
  id                   String           @id @default(cuid())
  clubId               String
  title                String
  date                 DateTime
  status               TournamentStatus @default(Open)
  participants         Int              @default(0)
  maxParticipants      Int
  fee                  Int              // IDR
  format               String
  description          String
  registrationDeadline DateTime
  shotgunTime          String
  prizePool            String
  rules                String[]
  includes             String[]
  contact              String
  schedule             Json             // [{ time: string, label: string }]
  createdAt            DateTime         @default(now())
  updatedAt            DateTime         @updatedAt

  club          Club                     @relation(fields: [clubId], references: [id])
  registrations TournamentRegistration[]
  bookings      Booking[]

  @@map("tournaments")
}

model TournamentRegistration {
  id            String              @id @default(cuid())
  tournamentId  String
  userId        String
  status        TournamentRegStatus @default(Registered)
  registeredAt  DateTime            @default(now())
  flight        String?
  teeTime       String?
  position      Int?
  score         Int?
  paymentStatus PaymentStatus       @default(Pending)

  tournament Tournament @relation(fields: [tournamentId], references: [id])
  user       User       @relation(fields: [userId], references: [id])

  @@unique([tournamentId, userId])
  @@map("tournament_registrations")
}

// Pre-generated or seeded per day per club.
// getTeeSlots() logic moves server-side.
model TeeSlot {
  id        String   @id @default(cuid())
  clubId    String
  date      DateTime @db.Date
  time      String   // "07:00"
  available Boolean  @default(true)
  price     Int      // IDR

  club Club @relation(fields: [clubId], references: [id])

  @@unique([clubId, date, time])
  @@map("tee_slots")
}

model ClubIntegration {
  id             String            @id @default(cuid())
  clubId         String            @unique
  membershipSync IntegrationHealth @default(Offline)
  teesheetSync   IntegrationHealth @default(Offline)
  posSync        IntegrationHealth @default(Offline)
  paymentSync    IntegrationHealth @default(Offline)
  loyaltySync    IntegrationHealth @default(Offline)
  membershipLast DateTime?
  teesheetLast   DateTime?
  posLast        DateTime?
  paymentLast    DateTime?
  loyaltyLast    DateTime?
  updatedAt      DateTime          @updatedAt

  club Club @relation(fields: [clubId], references: [id])

  @@map("club_integrations")
}

model ClubBrandingConfig {
  id           String  @id @default(cuid())
  clubId       String  @unique
  displayName  String
  themeColor   String
  logoPath     String?
  bannerPath   String?
  termsUrl     String?
  ftBooking    Boolean @default(true)
  ftPayment    Boolean @default(true)
  ftLoyalty    Boolean @default(true)
  ftVoucher    Boolean @default(true)
  ftTournament Boolean @default(true)
  ftShopping   Boolean @default(false)

  club Club @relation(fields: [clubId], references: [id])

  @@map("club_branding_configs")
}

model AuditLog {
  id          String   @id @default(cuid())
  actorUserId String
  actorName   String
  role        Role
  action      String
  clubId      String?
  ip          String
  timestamp   DateTime @default(now())

  actor User  @relation(fields: [actorUserId], references: [id])
  club  Club? @relation(fields: [clubId], references: [id])

  @@map("audit_logs")
}

// ─── AI Agent Chat ─────────────────────────────────────────────────────────────

enum ChatMessageRole {
  user
  assistant
  tool_result
}

enum ChatSessionState {
  IDLE
  CHECK_AVAILABILITY
  BOOKED
  WAITING_PAYMENT
  DONE
}

model ChatSession {
  id        String           @id @default(cuid())
  userId    String
  state     ChatSessionState @default(IDLE)
  messages  Json             // full Anthropic messages array (persisted for resume)
  createdAt DateTime         @default(now())
  updatedAt DateTime         @updatedAt

  user     User          @relation(fields: [userId], references: [id])
  chatMsgs ChatMessage[]

  @@map("chat_sessions")
}

// Human-readable message log (for UI display; source of truth is ChatSession.messages)
model ChatMessage {
  id        String          @id @default(cuid())
  sessionId String
  role      ChatMessageRole
  content   String
  metadata  Json?           // e.g. { type: "booking_summary", bookingId: "..." }
  createdAt DateTime        @default(now())

  session ChatSession @relation(fields: [sessionId], references: [id])

  @@map("chat_messages")
}
```

---

## 2. Supabase Setup

### 2.1 Environment variables

```env
# .env.local
DATABASE_URL="postgresql://postgres.[ref]:[password]@aws-0-[region].pooler.supabase.com:6543/postgres?pgbouncer=true"
DIRECT_URL="postgresql://postgres.[ref]:[password]@aws-0-[region].pooler.supabase.com:5432/postgres"
SUPABASE_URL="https://[ref].supabase.co"
SUPABASE_ANON_KEY="..."
SUPABASE_SERVICE_ROLE_KEY="..."  # server-side only, never expose to client
```

### 2.2 Auth configuration

| Provider | Setup |
|----------|-------|
| Email + Password | Enabled by default |
| Phone + OTP | Enable in Auth → Providers → Phone |
| Google | Auth → Providers → Google; add OAuth credentials |
| Apple | Auth → Providers → Apple; requires Apple Developer account |

On user creation (`auth.users` insert trigger), a DB function creates a matching row in `public.users` with an auto-generated `rhapsody_id`:

```sql
-- supabase/migrations/001_create_user_on_signup.sql

create or replace function public.handle_new_user()
returns trigger language plpgsql security definer as $$
declare
  new_rhapsody_id text;
begin
  -- generate RH-XXXXX
  new_rhapsody_id := 'RH-' || lpad(nextval('rhapsody_id_seq')::text, 5, '0');

  insert into public.users (auth_id, rhapsody_id, name, email, role)
  values (
    new.id,
    new_rhapsody_id,
    coalesce(new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1)),
    new.email,
    'golfer'
  );
  return new;
end;
$$;

create sequence if not exists rhapsody_id_seq start 10001;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();
```

### 2.3 Row-Level Security (RLS) policies

Enable RLS on every table. Helper function:

```sql
-- supabase/migrations/002_rls_helpers.sql

-- Returns the internal user.id for the current JWT
create or replace function auth_user_id() returns text language sql stable as $$
  select id from public.users where auth_id = auth.uid()::text limit 1;
$$;

-- Returns the role enum for current user
create or replace function auth_role() returns text language sql stable as $$
  select role::text from public.users where auth_id = auth.uid()::text limit 1;
$$;

-- Returns the club_id this user administers (null if not a club_admin)
create or replace function auth_admin_club_id() returns text language sql stable as $$
  select club_id from public.club_admins where user_id = auth_user_id() limit 1;
$$;
```

Key RLS rules per table:

```sql
-- users: can only read/update own row; superadmin reads all
alter table users enable row level security;
create policy "users: own row" on users for all using (auth_id = auth.uid()::text);
create policy "users: superadmin" on users for select using (auth_role() = 'superadmin');

-- club_members: golfer sees own rows; club_admin sees their club; superadmin sees all
alter table club_members enable row level security;
create policy "club_members: golfer own" on club_members for select
  using (user_id = auth_user_id());
create policy "club_members: club_admin" on club_members for select
  using (auth_role() = 'club_admin' and club_id = auth_admin_club_id());
create policy "club_members: superadmin" on club_members for select
  using (auth_role() = 'superadmin');

-- bookings: same tri-level pattern
alter table bookings enable row level security;
create policy "bookings: golfer own" on bookings for select
  using (user_id = auth_user_id());
create policy "bookings: club_admin" on bookings for select
  using (auth_role() = 'club_admin' and club_id = auth_admin_club_id());
create policy "bookings: superadmin" on bookings for select
  using (auth_role() = 'superadmin');

-- tee_slots: public read; only service role writes
alter table tee_slots enable row level security;
create policy "tee_slots: public read" on tee_slots for select using (true);

-- clubs: public read
alter table clubs enable row level security;
create policy "clubs: public read" on clubs for select using (true);

-- audit_logs: superadmin read-only; inserts via service role only
alter table audit_logs enable row level security;
create policy "audit_logs: superadmin" on audit_logs for select
  using (auth_role() = 'superadmin');

-- (apply analogous policies to: payments, loyalty_ledger, vouchers,
--  scorecards, campaigns, tournaments, tournament_registrations)
```

### 2.4 Supabase Storage buckets

| Bucket | Access | Purpose |
|--------|--------|---------|
| `club-logos` | Public | Club logo images |
| `club-banners` | Public | Club banner images |
| `user-avatars` | Authenticated | User profile photos |

---

## 3. API Layer

Use **Hono** on Cloudflare Workers (already wired via `wrangler.jsonc`).

```
src/
  server.ts          ← existing Hono entry
  api/
    clubs.ts
    bookings.ts
    users.ts
    tournaments.ts
    loyalty.ts
    vouchers.ts
    scorecards.ts
    admin/
      analytics.ts
      audit.ts
      integrations.ts
```

All routes require a valid Supabase JWT in `Authorization: Bearer <token>`. The Hono middleware validates the JWT and attaches `ctx.user`.

Writes (`POST`/`PATCH`/`DELETE`) that club admins or superadmins perform are followed by an `AuditLog` insert via the Prisma service-role client.

---

## 4. Frontend Data Layer

Replace `mockData.ts` references with **TanStack Query** (`@tanstack/react-query`) hooks.

```
src/
  lib/
    supabase.ts        ← createClient(url, anonKey)
    queryClient.ts     ← new QueryClient(...)
  hooks/
    useClubs.ts
    useBookings.ts
    useTeeSlots.ts
    useTournaments.ts
    useLoyalty.ts
    useVouchers.ts
    useScorecards.ts
    useClubAdmin.ts
    useSuperAdmin.ts
```

Auth state replaces the `AppProvider` demo logic — `supabase.auth.onAuthStateChange` drives `isAuthenticated` and `user`.

---

## 5. Phased Integration Plan

### Phase 1 — Foundation (Week 1–2)
**Goal:** DB live, auth real, static browse works end-to-end.

| # | Task | Layer |
|---|------|-------|
| 1.1 | Create Supabase project, set env vars | Infra |
| 1.2 | Write initial Prisma migration (`npx prisma migrate dev`) | BE |
| 1.3 | Seed database from `mockData.ts` (one-time seed script) | BE |
| 1.4 | `handle_new_user` trigger + RLS helpers migration | BE |
| 1.5 | Hono JWT middleware; `GET /api/clubs` endpoint | BE |
| 1.6 | Replace `AuthGate` / `AppProvider` auth with `supabase.auth` | FE |
| 1.7 | Replace `clubs` mock with `useClubs` query hook | FE |
| 1.8 | Course directory + course detail pages read from DB | FE |
| 1.9 | Supabase Storage: upload club logos + banners; update `logoUrl`/`bannerUrl` | BE |

**Exit criteria:** Login/logout real. Course directory loads from DB. Banner images from Storage.

---

### Phase 2 — Booking Flow (Week 3–4)
**Goal:** Full tee time booking creates real DB records.

| # | Task | Layer |
|---|------|-------|
| 2.1 | `tee_slots` generation: cron job or seeder creates 60-day rolling slots per club | BE |
| 2.2 | `GET /api/clubs/:id/tee-slots?date=` — returns available slots | BE |
| 2.3 | `POST /api/bookings` — creates `Booking` + `PaymentTransaction` (mock payment) | BE |
| 2.4 | `PATCH /api/bookings/:id/status` — check-in / complete / cancel | BE |
| 2.5 | Apply member discount (25%) if `ClubMember.membershipStatus = PaidMember` | BE |
| 2.6 | Replace booking flow page with API calls + optimistic UI | FE |
| 2.7 | Golfer home dashboard reads `bookings` (upcoming + recent) | FE |
| 2.8 | Wallet page reads `payments` + `paymentMethods` from DB | FE |

**Exit criteria:** Book a tee time as authenticated user; booking appears in golfer home and tee sheet.

---

### Phase 3 — Loyalty & Vouchers (Week 5–6)
**Goal:** Points and vouchers issued, tracked, and redeemable.

| # | Task | Layer |
|---|------|-------|
| 3.1 | `POST /api/loyalty/earn` — triggered after booking `Completed`; applies club `LoyaltyRule` | BE |
| 3.2 | `GET /api/loyalty/:userId` — points balance by club | BE |
| 3.3 | `GET /api/vouchers?userId=&clubId=` — active vouchers | BE |
| 3.4 | `POST /api/vouchers/:code/redeem` — validates + marks `Redeemed` | BE |
| 3.5 | Club admin: `POST /api/admin/vouchers` — issue new voucher | BE |
| 3.6 | Club admin: `GET/PUT /api/admin/loyalty-rules/:clubId` | BE |
| 3.7 | Replace loyalty page (`/golfer/loyalty`) with live data | FE |
| 3.8 | Replace club loyalty page (`/club/loyalty`) with live rules + ledger | FE |
| 3.9 | Voucher dropdown in booking flow reads real active vouchers | FE |
| 3.10 | Club vouchers table (`/club/vouchers`) reads from DB | FE |

**Exit criteria:** Book → earn points. Club admin issues voucher → golfer redeems in next booking.

---

### Phase 4 — Club Admin Operations (Week 7–8)
**Goal:** All club admin pages are live; members, tee sheet, campaigns fully functional.

| # | Task | Layer |
|---|------|-------|
| 4.1 | `GET /api/admin/members?clubId=` with search + filter support | BE |
| 4.2 | `GET /api/admin/members/:memberId?clubId=` — 360 view, club-scoped | BE |
| 4.3 | `GET /api/admin/teesheet?clubId=&date=` | BE |
| 4.4 | `PATCH /api/admin/bookings/:id/checkin` | BE |
| 4.5 | `POST /api/admin/campaigns` + `GET /api/admin/campaigns?clubId=` | BE |
| 4.6 | `GET /api/admin/analytics?clubId=` — revenue KPIs, visit trend | BE |
| 4.7 | Replace all `/club/*` pages with live API calls | FE |
| 4.8 | Club dashboard KPI cards from DB | FE |
| 4.9 | Audit log write on every club admin mutation | BE |

**Exit criteria:** Full club admin workflow live. Tee sheet reflects real bookings. Campaigns save to DB.

---

### Phase 5 — Tournaments & Scorecard (Week 9–10)
**Goal:** Tournament registration and scorecard submission live.

| # | Task | Layer |
|---|------|-------|
| 5.1 | `GET /api/tournaments` + `GET /api/tournaments/:id` | BE |
| 5.2 | `POST /api/tournaments/:id/register` — creates `TournamentRegistration` + `PaymentTransaction` | BE |
| 5.3 | `DELETE /api/tournaments/:id/register` — cancel registration | BE |
| 5.4 | `POST /api/scorecards` — save new round | BE |
| 5.5 | `GET /api/scorecards?userId=` — history + handicap index (computed from best 8 of last 20) | BE |
| 5.6 | Replace tournament pages with live data | FE |
| 5.7 | Replace scorecard pages with live data | FE |
| 5.8 | Profile page + play history reads from DB | FE |

**Exit criteria:** Register for a tournament; submit a scorecard; handicap index updates.

---

### Phase 6 — Superadmin & Platform (Week 11–12)
**Goal:** All superadmin pages live; branding config, integrations, audit log real.

| # | Task | Layer |
|---|------|-------|
| 6.1 | `GET /api/superadmin/analytics` — cross-club KPIs | BE |
| 6.2 | `GET /api/superadmin/members` — network-wide member list | BE |
| 6.3 | `GET /api/superadmin/members/:userId` — cross-club 360 | BE |
| 6.4 | `GET /api/superadmin/integrations` | BE |
| 6.5 | `GET/PUT /api/superadmin/clubs/:id/branding` — app management settings | BE |
| 6.6 | `GET /api/superadmin/audit-logs` | BE |
| 6.7 | Replace all `/admin/*` pages with live data | FE |
| 6.8 | Remove `mockData.ts` imports — file can be deleted or kept as seed reference | FE |

**Exit criteria:** All three roles fully operational on live data. `mockData.ts` no longer used at runtime.

---

---

### Phase 0 — Landing Page & Mobile App Shell (Week 0, before Phase 1)
**Goal:** Three login entry points live. Mobile app shell (`app/*`) scaffolded as a parallel namespace to the existing `golfer/*` web dashboard. No feature work, no mock data changes.

| # | Task | Layer |
|---|------|-------|
| 0.1 | Create `/` landing page — hero + 2 CTAs: "Open App" → `/app/login`, "Login" → `/login` | FE |
| 0.2 | Update `/login` to handle all roles — add role-based redirect: `golfer` → `/golfer`, `club_admin` → `/club`, `superadmin` → `/admin` | FE |
| 0.3 | Create `app.login.tsx` — mobile-first login page at `/app/login`, always redirects to `/app` | FE |
| 0.4 | Scaffold `app.*` route files as a **new parallel namespace** — do not rename or touch `golfer.*` | FE |
| 0.5 | AppShell for `app/*`: bottom tab bar only (Home · Courses · Score · Rewards · Chat), no sidebar | FE |
| 0.6 | `app.*` pages initially mirror `golfer.*` pages with mobile-optimised layout | FE |
| 0.7 | Verify `routeTree.gen.ts` regenerates correctly; fix any broken links | FE |

**Exit criteria:** `/` → 2 CTAs. `/login` redirects by role post-auth. `/app/login` → `/app`. `/golfer/*` web dashboard unchanged. `/app/*` mobile shell navigable with bottom tabs.

---

### Phase 7 — AI Agent Chat Service (Week 13–14)
**Goal:** In-app chat at `/app/chat` powered by Node.js backend AI agent.

| # | Task | Layer |
|---|------|-------|
| 7.1 | Bootstrap `backend/` folder: Express app, `package.json` (Node.js), Prisma client config | BE |
| 7.2 | Supabase JWT validation middleware for Express (reuse same `auth.users` JWT) | BE |
| 7.3 | `chat_sessions` + `chat_messages` Prisma migration | BE |
| 7.4 | Port `ai.service.js` from resvai: tool-calling loop, state machine, `TOOLS` array | BE |
| 7.5 | Implement Rhapsody tools: `CheckAvailabilityTool`, `CreateBookingTool`, `GetLoyaltyPointsTool`, `CheckVoucherTool`, `GetCustomerProfileTool`, `ListGolfCoursesTool`, `SendInAppMessageTool` | BE |
| 7.6 | Write `backend/src/prompts/booking.prompt.md` — Rhapsody-specific system prompt (English + Indonesian, golf context) | BE |
| 7.7 | `POST /api/chat/message` endpoint — receives `{ userId, sessionId?, message }`, runs agent loop, returns `{ reply, state, sessionId }` | BE |
| 7.8 | Chat bubble component + `/app/chat` route — conversation thread UI, typing indicator | FE |
| 7.9 | Booking summary card in chat: structured card component with Confirm / Cancel buttons | FE |
| 7.10 | Persist + restore chat session: load `ChatMessage` history on `/app/chat` mount | FE |
| 7.11 | Wire `CreateBookingTool` result back to booking flow (booking appears in `/app` home upcoming tee time) | FE |

**Exit criteria:** User can open chat → ask to book → agent checks availability → shows summary → user confirms → booking created in DB → appears on home dashboard.

---

## 6. Key Decisions & Constraints

| Topic | Decision | Reason |
|-------|----------|--------|
| ORM | Prisma | Type-safe, matches TS types 1:1 with existing mock shapes |
| DB | Supabase PostgreSQL | Auth + RLS + Storage bundled; no separate auth service needed |
| RLS enforcement | DB-layer (Supabase RLS) | Club data isolation guaranteed even if API has a bug |
| Tee slots | Pre-generated rows (`tee_slots` table) | Real-time availability; avoids random seed in `getTeeSlots()` |
| `Visit` table | Separate from `Booking` | Needed for analytics queries (visits ≠ bookings; No-Show is a visit row) |
| `handicap_index` computation | Server-side on scorecard save | WHS formula: average of best 8 of last 20 differentials |
| Payments | Mock payment intent (no gateway) | Real payment integration is out of scope per `plan.md` Phase 3 |
| Audit log writes | After every club_admin / superadmin mutation | Via service-role Prisma client; user cannot tamper |
| `DIRECT_URL` | Required alongside `DATABASE_URL` | Supabase requires direct connection for Prisma migrations (bypasses pgBouncer) |
| Node.js for `backend/` | Workers-incompatible deps: `@anthropic-ai/sdk` agentic loop, `pdfkit`, `node-cron` | Cloudflare Workers cannot run long-running agentic loops or Node.js-native APIs |
| Shared Prisma schema | Single `prisma/schema.prisma` used by both Workers (via Prisma Accelerate) and `backend/` (direct) | Single source of truth for DB types across both services |
| `ChatSession.messages` as JSON | Full Anthropic messages array stored as JSON blob | Required to resume multi-turn agentic loop correctly — same pattern as resvai |
| `SendInAppMessageTool` replaces Telegram | Sends structured response back to the frontend over HTTP response | No Telegram dependency; frontend renders the message directly |
