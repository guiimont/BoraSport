-- Sanitize public profile names exposed in tenant pages.
-- Some legacy profiles were created with email as name. Public views must not
-- expose email, phone, auth ids or other private profile fields.

create or replace view public.public_sport_profiles as
select
  profiles.public_id,
  case
    when nullif(trim(profiles.name), '') is null then 'Remador BoraSport'
    when position('@' in profiles.name) > 0 then 'Remador BoraSport'
    else profiles.name
  end as name,
  profiles.avatar_url
from public.profiles;

grant select on public.public_sport_profiles to anon, authenticated;

drop view if exists public.public_slot_participants;

create view public.public_slot_participants as
select
  bookings.company_id,
  bookings.slot_id,
  profiles.public_id as public_profile_id,
  case
    when nullif(trim(profiles.name), '') is null then 'Remador BoraSport'
    when position('@' in profiles.name) > 0 then 'Remador BoraSport'
    else profiles.name
  end as name,
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
