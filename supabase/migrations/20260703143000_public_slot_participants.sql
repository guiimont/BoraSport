-- Public, limited participant surface for tenant pages.
-- Shows only confirmed booking participants with name/avatar, matching the
-- common community pattern for classes, boxes and clubs.

create or replace view public.public_slot_participants as
select
  bookings.company_id,
  bookings.slot_id,
  bookings.user_id,
  coalesce(nullif(profiles.name, ''), 'Participante') as name,
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
