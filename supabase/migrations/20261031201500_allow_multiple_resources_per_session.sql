-- A session may launch several canoes at the same time.
-- Capacity, bookings and waitlists remain isolated per canoe slot.
drop index if exists public.slots_operational_session_unique;

create unique index if not exists slots_operational_session_resource_unique
  on public.slots (operational_session_id, resource_id)
  where operational_session_id is not null
    and resource_id is not null;
