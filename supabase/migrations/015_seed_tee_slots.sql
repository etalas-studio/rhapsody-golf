-- Seed tee_slots for all active clubs: 60 days from today, 3 price bands per PRD.
-- Re-runnable: ON CONFLICT DO NOTHING.
-- Slots: Early 06:00–10:30, Prime 11:00–13:30, Twilight 14:00–16:30, every 30 min.

do $$
declare
  club_row  record;
  d         date;
  slot_time text;
  slot_price int;
  times_early  text[] := array['06:00','06:30','07:00','07:30','08:00','08:30','09:00','09:30','10:00','10:30'];
  times_prime  text[] := array['11:00','11:30','12:00','12:30','13:00','13:30'];
  times_twilight text[] := array['14:00','14:30','15:00','15:30','16:00','16:30'];
  t text;
begin
  for club_row in select id from public.clubs loop
    for d in select generate_series(current_date, current_date + interval '60 days', interval '1 day')::date loop
      -- Early band: Rp 1,250,000
      foreach t in array times_early loop
        insert into public.tee_slots (id, club_id, date, time, price, available)
        values (gen_random_uuid()::text, club_row.id, d, t, 1250000, true)
        on conflict (club_id, date, time) do update set price = excluded.price, available = true;
      end loop;
      -- Prime band: Rp 1,450,000
      foreach t in array times_prime loop
        insert into public.tee_slots (id, club_id, date, time, price, available)
        values (gen_random_uuid()::text, club_row.id, d, t, 1450000, true)
        on conflict (club_id, date, time) do update set price = excluded.price, available = true;
      end loop;
      -- Twilight band: Rp 1,100,000
      foreach t in array times_twilight loop
        insert into public.tee_slots (id, club_id, date, time, price, available)
        values (gen_random_uuid()::text, club_row.id, d, t, 1100000, true)
        on conflict (club_id, date, time) do update set price = excluded.price, available = true;
      end loop;
    end loop;
  end loop;
end;
$$;
