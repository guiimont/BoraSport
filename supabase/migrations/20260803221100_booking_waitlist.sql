-- Lista de espera atomica para os horarios publicos.

drop index if exists public.bookings_one_active_per_user_slot_idx;
create unique index bookings_one_active_per_user_slot_idx
  on public.bookings (slot_id, user_id)
  where status in ('confirmed', 'waitlisted');

create index if not exists bookings_waitlist_order_idx
  on public.bookings (slot_id, created_at, id)
  where status = 'waitlisted';

create or replace function public.reserve_slot(p_company_id uuid, p_slot_id uuid)
returns table (booking_status public.booking_status, waitlist_position integer)
language plpgsql
security definer
set search_path = public
as $$
declare
  current_user_id uuid := (select auth.uid());
  target_slot public.slots%rowtype;
  target_status public.booking_status;
  target_booking_id uuid;
begin
  if current_user_id is null then
    raise exception 'Authentication required';
  end if;

  select * into target_slot
  from public.slots
  where id = p_slot_id
    and company_id = p_company_id
    and is_public = true
    and start_time > now()
  for update;

  if target_slot.id is null then
    raise exception 'Public slot not found';
  end if;

  if not public.is_company_member(p_company_id) then
    raise exception 'Company membership required';
  end if;

  select id, status into target_booking_id, target_status
  from public.bookings
  where slot_id = p_slot_id
    and user_id = current_user_id
    and status in ('confirmed', 'waitlisted')
  order by created_at, id
  limit 1;

  if target_booking_id is null then
    if (
      select count(*)
      from public.bookings
      where slot_id = p_slot_id and status = 'confirmed'
    ) < target_slot.spots_total then
      target_status := 'confirmed';
    else
      target_status := 'waitlisted';
    end if;

    insert into public.bookings (slot_id, user_id, company_id, status)
    values (p_slot_id, current_user_id, p_company_id, target_status)
    returning id into target_booking_id;
  end if;

  return query
  select
    target_status,
    case
      when target_status = 'waitlisted' then (
        select count(*)::integer
        from public.bookings queued
        join public.bookings mine on mine.id = target_booking_id
        where queued.slot_id = p_slot_id
          and queued.status = 'waitlisted'
          and (queued.created_at, queued.id) <= (mine.created_at, mine.id)
      )
      else null
    end;
end;
$$;

create or replace function public.cancel_my_slot_booking(
  p_company_id uuid,
  p_slot_id uuid
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  current_user_id uuid := (select auth.uid());
begin
  if current_user_id is null then
    raise exception 'Authentication required';
  end if;

  if not public.is_company_member(p_company_id) then
    raise exception 'Company membership required';
  end if;

  update public.bookings
  set status = 'cancelled'
  where company_id = p_company_id
    and slot_id = p_slot_id
    and user_id = current_user_id
    and status in ('confirmed', 'waitlisted');
end;
$$;

create or replace function public.promote_slot_waitlist()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  promoted_booking_id uuid;
  slot_capacity integer;
  confirmed_count integer;
begin
  if old.status <> 'confirmed' or new.status <> 'cancelled' then
    return null;
  end if;

  select spots_total into slot_capacity
  from public.slots
  where id = new.slot_id
  for update;

  select count(*)::integer into confirmed_count
  from public.bookings
  where slot_id = new.slot_id
    and status = 'confirmed';

  if confirmed_count < slot_capacity then
    select id into promoted_booking_id
    from public.bookings
    where slot_id = new.slot_id
      and status = 'waitlisted'
    order by created_at, id
    for update skip locked
    limit 1;

    if promoted_booking_id is not null then
      update public.bookings
      set status = 'confirmed'
      where id = promoted_booking_id;
    end if;
  end if;

  return null;
end;
$$;

drop trigger if exists promote_slot_waitlist_on_cancellation on public.bookings;
create trigger promote_slot_waitlist_on_cancellation
after update of status on public.bookings
for each row execute function public.promote_slot_waitlist();

create or replace function public.get_my_active_bookings(p_company_id uuid)
returns table (slot_id uuid, status public.booking_status, waitlist_position integer)
language sql
stable
security definer
set search_path = public
as $$
  select
    mine.slot_id,
    mine.status,
    case
      when mine.status = 'waitlisted' then (
        select count(*)::integer
        from public.bookings queued
        where queued.slot_id = mine.slot_id
          and queued.status = 'waitlisted'
          and (queued.created_at, queued.id) <= (mine.created_at, mine.id)
      )
      else null
    end
  from public.bookings mine
  where (select auth.uid()) is not null
    and mine.user_id = (select auth.uid())
    and mine.company_id = p_company_id
    and mine.status in ('confirmed', 'waitlisted')
    and public.is_company_member(p_company_id);
$$;

revoke execute on function public.reserve_slot(uuid, uuid) from public, anon;
grant execute on function public.reserve_slot(uuid, uuid) to authenticated;

revoke execute on function public.cancel_my_slot_booking(uuid, uuid) from public, anon;
grant execute on function public.cancel_my_slot_booking(uuid, uuid) to authenticated;

revoke execute on function public.get_my_active_bookings(uuid) from public, anon;
grant execute on function public.get_my_active_bookings(uuid) to authenticated;

revoke execute on function public.promote_slot_waitlist() from public, anon, authenticated;

revoke insert on table public.bookings from authenticated;

drop policy if exists "clients can create own bookings" on public.bookings;
create policy "clients can create own bookings"
on public.bookings
for insert
to authenticated
with check (
  false
);

drop policy if exists "users can update own bookings or staff can manage" on public.bookings;
create policy "users can update own bookings or staff can manage"
on public.bookings
for update
to authenticated
using (
  public.has_company_role(
    company_id,
    array['admin', 'professional']::public.membership_role[]
  )
)
with check (
  public.has_company_role(
    company_id,
    array['admin', 'professional']::public.membership_role[]
  )
);
