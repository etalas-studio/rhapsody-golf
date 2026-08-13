-- Add ref_code column to bookings for Midtrans order_id linkage
alter table public.bookings
  add column if not exists ref_code text;

create index if not exists bookings_ref_code_idx on public.bookings (ref_code);
