-- Replace full unique constraint with partial unique index
-- Allows re-registration after cancellation
DROP INDEX IF EXISTS tournament_registrations_tournament_id_user_id_key;

CREATE UNIQUE INDEX IF NOT EXISTS event_reg_active_unique
  ON event_registrations (tournament_id, user_id)
  WHERE status <> 'Cancelled';
