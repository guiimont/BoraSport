-- Public agenda participant surface.
-- Keeps public tenant pages from exposing auth user ids, phones, emails or
-- private profile fields while preserving the community preview of confirmed
-- participants.

alter table public.profiles
  add column if not exists public_id uuid not null default gen_random_uuid();

create unique index if not exists profiles_public_id_unique
  on public.profiles (public_id);

create or replace view public.public_sport_profiles as
select
  profiles.public_id,
  coalesce(nullif(profiles.name, ''), 'Remador BoraSport') as name,
  profiles.avatar_url
from public.profiles;

grant select on public.public_sport_profiles to anon, authenticated;

drop view if exists public.public_slot_participants;

create view public.public_slot_participants as
select
  bookings.company_id,
  bookings.slot_id,
  profiles.public_id as public_profile_id,
  coalesce(nullif(profiles.name, ''), 'Remador BoraSport') as name,
  profiles.avatar_url
from public.bookings
join public.profiles
  on profiles.id = bookings.user_id
join public.slots
  on slots.id = bookings.slot_id
  and slots.company_id = bookings.company_id
where bookings.status = 'confirmed'
  and slots.start_time >= now();

grant select on public.public_slot_participants to anon, authenticated;
