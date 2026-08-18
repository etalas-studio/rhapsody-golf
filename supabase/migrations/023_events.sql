-- Migration 023: Events feature
-- Replaces tournament-centric tables with a general-purpose events system.
-- Keeps existing data by renaming tables and altering columns in-place.

-- ─── 1. Rename existing tables ─────────────────────────────────────────────
ALTER TABLE tournaments RENAME TO events;
ALTER TABLE tournament_registrations RENAME TO event_registrations;

-- ─── 2. Add new enum values for EventStatus ────────────────────────────────
-- Existing: Open, RegistrationClosed, Finished
-- Add:      Draft, Cancelled, Closed, Completed
ALTER TYPE "TournamentStatus" ADD VALUE IF NOT EXISTS 'Draft'     BEFORE 'Open';
ALTER TYPE "TournamentStatus" ADD VALUE IF NOT EXISTS 'Closed';
ALTER TYPE "TournamentStatus" ADD VALUE IF NOT EXISTS 'Completed';
ALTER TYPE "TournamentStatus" ADD VALUE IF NOT EXISTS 'Cancelled';

-- ─── 3. Extend events table ────────────────────────────────────────────────
-- Rename shotgun_time → starting_time
ALTER TABLE events RENAME COLUMN shotgun_time TO starting_time;
-- Rename max_participants → quota (keep semantics, rename for clarity)
ALTER TABLE events RENAME COLUMN max_participants TO quota;
-- Rename fee → entry_fee
ALTER TABLE events RENAME COLUMN fee TO entry_fee;

-- New columns
ALTER TABLE events
  ADD COLUMN IF NOT EXISTS hero_image_url TEXT,
  ADD COLUMN IF NOT EXISTS venue          TEXT,
  ADD COLUMN IF NOT EXISTS maps_url       TEXT;

-- Columns being retired (kept nullable for now, can drop later)
-- format, prize_pool, rules, includes, contact, schedule, participants
-- are golf-tournament-specific; leave them for now, they won't be populated going forward.
ALTER TABLE events ALTER COLUMN format DROP NOT NULL;
ALTER TABLE events ALTER COLUMN prize_pool DROP NOT NULL;
ALTER TABLE events ALTER COLUMN rules DROP NOT NULL;
ALTER TABLE events ALTER COLUMN contact DROP NOT NULL;
ALTER TABLE events ALTER COLUMN participants DROP NOT NULL;
ALTER TABLE events ALTER COLUMN schedule DROP NOT NULL;

-- ─── 4. Extend event_registrations table ───────────────────────────────────
ALTER TABLE event_registrations
  ADD COLUMN IF NOT EXISTS total_fee      INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS payment_tx_id  TEXT UNIQUE,
  ADD COLUMN IF NOT EXISTS notes          TEXT;

-- Add new enum values to TournamentRegStatus for EventRegistrationStatus
ALTER TYPE "TournamentRegStatus" ADD VALUE IF NOT EXISTS 'PendingPayment' BEFORE 'Registered';

-- ─── 5. Create event_participants table ────────────────────────────────────
CREATE TABLE IF NOT EXISTS event_participants (
  id              TEXT        PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
  registration_id TEXT        NOT NULL REFERENCES event_registrations(id) ON DELETE CASCADE,
  name            TEXT        NOT NULL,
  phone           TEXT,
  email           TEXT,
  is_registrant   BOOLEAN     NOT NULL DEFAULT FALSE,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_event_participants_registration
  ON event_participants(registration_id);

-- ─── 6. Update Club → events relation sequence name ────────────────────────
-- (Prisma handles via @@map, no DDL needed here)

-- ─── 7. RLS Policies ───────────────────────────────────────────────────────

-- events: public read for Open/Closed/Completed; club_admin write
ALTER TABLE events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "events_public_read"       ON events;
DROP POLICY IF EXISTS "events_club_admin_all"    ON events;

CREATE POLICY "events_public_read" ON events
  FOR SELECT USING (status IN ('Open', 'Closed', 'Completed'));

CREATE POLICY "events_club_admin_all" ON events
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM club_admins ca
      WHERE ca.user_id = auth.uid()::TEXT
        AND ca.club_id = events.club_id
    )
  );

-- event_registrations: owner read + backend write (service role bypasses RLS)
ALTER TABLE event_registrations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "event_reg_owner_read"  ON event_registrations;
DROP POLICY IF EXISTS "event_reg_owner_write" ON event_registrations;

CREATE POLICY "event_reg_owner_read" ON event_registrations
  FOR SELECT USING (user_id = auth.uid()::TEXT);

CREATE POLICY "event_reg_owner_write" ON event_registrations
  FOR INSERT WITH CHECK (user_id = auth.uid()::TEXT);

-- event_participants: owner read via registration join
ALTER TABLE event_participants ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "event_participants_owner_read" ON event_participants;

CREATE POLICY "event_participants_owner_read" ON event_participants
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM event_registrations er
      WHERE er.id = event_participants.registration_id
        AND er.user_id = auth.uid()::TEXT
    )
  );
