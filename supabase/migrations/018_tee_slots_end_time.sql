-- Add end_time column to tee_slots, backfill from club's tee_interval_minutes.
alter table public.tee_slots
  add column if not exists end_time text;

-- Backfill existing rows
update public.tee_slots ts
set end_time = to_char(
  (ts.time::time + (c.tee_interval_minutes || ' minutes')::interval),
  'HH24:MI'
)
from public.clubs c
where c.id = ts.club_id
  and ts.end_time is null;
