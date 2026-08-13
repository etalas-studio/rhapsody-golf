-- Add tee time configuration columns to clubs
alter table clubs
  alter column tee_interval_minutes set default 30,
  add column if not exists early_start           text not null default '06:00',
  add column if not exists early_end             text not null default '10:30',
  add column if not exists early_default_price   integer not null default 1250000,
  add column if not exists prime_start           text not null default '11:00',
  add column if not exists prime_end             text not null default '13:30',
  add column if not exists prime_default_price   integer not null default 1450000,
  add column if not exists twilight_start        text not null default '14:00',
  add column if not exists twilight_end          text not null default '16:30',
  add column if not exists twilight_default_price integer not null default 1100000;
