-- Row-Level Security policies for Rhapsody Golf Connect.
-- Run after Prisma migration has created all tables.

-- Helper: get current user's id from public.users
create or replace function public.current_user_id()
returns text language sql stable security definer as $$
  select id from public.users where auth_id = auth.uid()::text limit 1;
$$;

-- Helper: get current user's role
create or replace function public.current_user_role()
returns text language sql stable security definer as $$
  select role::text from public.users where auth_id = auth.uid()::text limit 1;
$$;

-- Helper: get club_id for the current club_admin
create or replace function public.current_admin_club_id()
returns text language sql stable security definer as $$
  select ca.club_id from public.club_admins ca
  join public.users u on u.id = ca.user_id
  where u.auth_id = auth.uid()::text limit 1;
$$;

-- ─── users ─────────────────────────────────────────────────────────────────

alter table public.users enable row level security;

create policy "users: read own row"
  on public.users for select
  using (auth_id = auth.uid()::text);

create policy "users: superadmin reads all"
  on public.users for select
  using (public.current_user_role() = 'superadmin');

create policy "users: update own row"
  on public.users for update
  using (auth_id = auth.uid()::text);

-- ─── clubs ─────────────────────────────────────────────────────────────────

alter table public.clubs enable row level security;

-- Everyone (including unauthenticated) can read clubs
create policy "clubs: public read"
  on public.clubs for select
  using (true);

create policy "clubs: superadmin write"
  on public.clubs for all
  using (public.current_user_role() = 'superadmin');

-- ─── club_members ───────────────────────────────────────────────────────────

alter table public.club_members enable row level security;

create policy "club_members: golfer reads own"
  on public.club_members for select
  using (user_id = public.current_user_id());

create policy "club_members: club_admin reads own club"
  on public.club_members for select
  using (club_id = public.current_admin_club_id());

create policy "club_members: superadmin reads all"
  on public.club_members for select
  using (public.current_user_role() = 'superadmin');

-- ─── bookings ───────────────────────────────────────────────────────────────

alter table public.bookings enable row level security;

create policy "bookings: golfer reads own"
  on public.bookings for select
  using (user_id = public.current_user_id());

create policy "bookings: golfer inserts own"
  on public.bookings for insert
  with check (user_id = public.current_user_id());

create policy "bookings: golfer cancels own"
  on public.bookings for update
  using (user_id = public.current_user_id());

create policy "bookings: club_admin reads own club"
  on public.bookings for select
  using (club_id = public.current_admin_club_id());

create policy "bookings: club_admin updates status"
  on public.bookings for update
  using (club_id = public.current_admin_club_id());

create policy "bookings: superadmin reads all"
  on public.bookings for select
  using (public.current_user_role() = 'superadmin');

-- ─── tee_slots ──────────────────────────────────────────────────────────────

alter table public.tee_slots enable row level security;

create policy "tee_slots: public read"
  on public.tee_slots for select
  using (true);

create policy "tee_slots: service role write"
  on public.tee_slots for all
  using (auth.role() = 'service_role');

-- ─── loyalty_ledger ─────────────────────────────────────────────────────────

alter table public.loyalty_ledger enable row level security;

create policy "loyalty: golfer reads own"
  on public.loyalty_ledger for select
  using (user_id = public.current_user_id());

create policy "loyalty: club_admin reads own club"
  on public.loyalty_ledger for select
  using (club_id = public.current_admin_club_id());

create policy "loyalty: superadmin reads all"
  on public.loyalty_ledger for select
  using (public.current_user_role() = 'superadmin');

-- ─── vouchers ───────────────────────────────────────────────────────────────

alter table public.vouchers enable row level security;

create policy "vouchers: golfer reads own"
  on public.vouchers for select
  using (user_id = public.current_user_id());

create policy "vouchers: club_admin reads own club"
  on public.vouchers for select
  using (club_id = public.current_admin_club_id());

create policy "vouchers: superadmin reads all"
  on public.vouchers for select
  using (public.current_user_role() = 'superadmin');

-- ─── payments ───────────────────────────────────────────────────────────────

alter table public.payments enable row level security;

create policy "payments: golfer reads own"
  on public.payments for select
  using (user_id = public.current_user_id());

create policy "payments: club_admin reads own club"
  on public.payments for select
  using (club_id = public.current_admin_club_id());

create policy "payments: superadmin reads all"
  on public.payments for select
  using (public.current_user_role() = 'superadmin');

-- ─── campaigns ──────────────────────────────────────────────────────────────

alter table public.campaigns enable row level security;

create policy "campaigns: public read active"
  on public.campaigns for select
  using (status = 'Active');

create policy "campaigns: club_admin full access to own club"
  on public.campaigns for all
  using (club_id = public.current_admin_club_id());

create policy "campaigns: superadmin reads all"
  on public.campaigns for select
  using (public.current_user_role() = 'superadmin');

-- ─── scorecards ─────────────────────────────────────────────────────────────

alter table public.scorecards enable row level security;

create policy "scorecards: golfer reads own"
  on public.scorecards for select
  using (user_id = public.current_user_id());

create policy "scorecards: golfer inserts own"
  on public.scorecards for insert
  with check (user_id = public.current_user_id());

-- ─── tournaments ────────────────────────────────────────────────────────────

alter table public.tournaments enable row level security;

create policy "tournaments: public read"
  on public.tournaments for select
  using (true);

create policy "tournaments: club_admin writes own club"
  on public.tournaments for all
  using (club_id = public.current_admin_club_id());

-- ─── tournament_registrations ────────────────────────────────────────────────

alter table public.tournament_registrations enable row level security;

create policy "tourney_reg: golfer reads own"
  on public.tournament_registrations for select
  using (user_id = public.current_user_id());

create policy "tourney_reg: golfer inserts own"
  on public.tournament_registrations for insert
  with check (user_id = public.current_user_id());

create policy "tourney_reg: golfer cancels own"
  on public.tournament_registrations for update
  using (user_id = public.current_user_id());

-- ─── chat_sessions ──────────────────────────────────────────────────────────

alter table public.chat_sessions enable row level security;

create policy "chat_sessions: golfer reads own"
  on public.chat_sessions for select
  using (user_id = public.current_user_id());

create policy "chat_sessions: service role write"
  on public.chat_sessions for all
  using (auth.role() = 'service_role');

-- ─── chat_messages ──────────────────────────────────────────────────────────

alter table public.chat_messages enable row level security;

create policy "chat_messages: golfer reads own session"
  on public.chat_messages for select
  using (
    session_id in (
      select id from public.chat_sessions
      where user_id = public.current_user_id()
    )
  );

create policy "chat_messages: service role write"
  on public.chat_messages for all
  using (auth.role() = 'service_role');
