-- Restore the deliberately limited public participant projection used by the
-- tenant schedule. The previous security_invoker hardening made the view obey
-- private RLS policies on bookings/profiles and therefore return no rows to
-- anonymous visitors.
--
-- This view exposes only confirmed participants in future public slots. It
-- never exposes auth IDs, email addresses or phone numbers.

create or replace view public.public_slot_participants
with (security_invoker = false)
as
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
  and slots.is_public = true
  and slots.start_time >= now();

revoke all on public.public_slot_participants from public;
grant select on public.public_slot_participants to anon, authenticated;

comment on view public.public_slot_participants is
  'Limited public projection of confirmed participants in future public slots.';
