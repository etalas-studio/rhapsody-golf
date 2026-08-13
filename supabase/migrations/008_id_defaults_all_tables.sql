-- Migration 003 gave `users.id` a DB-level default (gen_random_uuid()::text)
-- because Prisma's @default(cuid()) is app-level only. Every other table was
-- left without one, so any insert path that doesn't explicitly generate an id
-- (chat_messages, chat_sessions, audit_logs, loyalty_ledger, vouchers,
-- scorecards, payments, club_admins, etc.) hits a not-null violation on `id`.
-- This surfaced concretely as club_admins creation failing with:
--   null value in column "id" of relation "club_admins" violates not-null constraint
--
-- Purely additive: explicit id values from application code still take
-- precedence over the default, so no existing insert path changes behavior.

alter table public.audit_logs               alter column id set default gen_random_uuid()::text;
alter table public.bookings                 alter column id set default gen_random_uuid()::text;
alter table public.campaigns                alter column id set default gen_random_uuid()::text;
alter table public.chat_messages            alter column id set default gen_random_uuid()::text;
alter table public.chat_sessions            alter column id set default gen_random_uuid()::text;
alter table public.club_admins              alter column id set default gen_random_uuid()::text;
alter table public.club_branding_configs    alter column id set default gen_random_uuid()::text;
alter table public.club_integrations        alter column id set default gen_random_uuid()::text;
alter table public.club_members             alter column id set default gen_random_uuid()::text;
alter table public.clubs                    alter column id set default gen_random_uuid()::text;
alter table public.loyalty_ledger           alter column id set default gen_random_uuid()::text;
alter table public.loyalty_rules            alter column id set default gen_random_uuid()::text;
alter table public.payment_methods          alter column id set default gen_random_uuid()::text;
alter table public.payments                 alter column id set default gen_random_uuid()::text;
alter table public.scorecards               alter column id set default gen_random_uuid()::text;
alter table public.tee_slots                alter column id set default gen_random_uuid()::text;
alter table public.tournament_registrations alter column id set default gen_random_uuid()::text;
alter table public.tournaments              alter column id set default gen_random_uuid()::text;
alter table public.visits                   alter column id set default gen_random_uuid()::text;
alter table public.vouchers                 alter column id set default gen_random_uuid()::text;
