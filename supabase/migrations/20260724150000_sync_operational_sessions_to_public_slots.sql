-- Une a Agenda operacional ao motor publico de reservas.
-- Uma sessao publicada passa a possuir exatamente um slot reservavel.

alter table public.slots
  add column if not exists operational_session_id uuid,
  add column if not exists is_public boolean not null default true;

create unique index if not exists slots_operational_session_unique
  on public.slots (operational_session_id)
  where operational_session_id is not null;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'slots_operational_session_fk'
      and conrelid = 'public.slots'::regclass
  ) then
    alter table public.slots
      add constraint slots_operational_session_fk
      foreign key (operational_session_id)
      references public.operational_sessions(id)
      on delete set null;
  end if;
end
$$;

create or replace function public.sync_operational_session_public_slot(
  p_session_id uuid
)
returns void
language plpgsql
volatile
security definer
set search_path = public
as $$
declare
  target_session public.operational_sessions%rowtype;
  target_service_id uuid;
  target_resource_id uuid;
  public_capacity integer;
  session_start timestamptz;
begin
  select *
  into target_session
  from public.operational_sessions
  where id = p_session_id;

  if not found then
    return;
  end if;

  if target_session.status <> 'published' then
    update public.slots
    set is_public = false
    where operational_session_id = target_session.id;
    return;
  end if;

  select
    sum(
      greatest(
        resources.capacity_maxima
        - case
            when resources.default_steerer_policy = 'instrutor' then 1
            else 0
          end,
        0
      )
    )::integer,
    case
      when count(*) = 1 then (array_agg(resources.id))[1]
      else null
    end
  into public_capacity, target_resource_id
  from public.operational_session_resources links
  join public.resources resources
    on resources.id = links.resource_id
   and resources.company_id = links.company_id
  where links.session_id = target_session.id
    and resources.is_active is true
    and coalesce(resources.vessel_status::text, 'disponivel') = 'disponivel';

  if coalesce(public_capacity, 0) < 1 then
    update public.slots
    set is_public = false
    where operational_session_id = target_session.id;
    return;
  end if;

  select services.id
  into target_service_id
  from public.services
  where services.company_id = target_session.company_id
    and services.is_active is true
    and lower(trim(services.name)) = lower(trim(target_session.group_name))
  order by services.created_at
  limit 1;

  if target_service_id is null then
    insert into public.services (
      company_id,
      name,
      description,
      duration_minutes,
      price,
      is_active
    )
    values (
      target_session.company_id,
      target_session.group_name,
      target_session.level,
      target_session.duration_minutes,
      0,
      true
    )
    returning id into target_service_id;
  end if;

  session_start :=
    (target_session.session_date + target_session.start_time)
    at time zone 'America/Sao_Paulo';

  insert into public.slots (
    company_id,
    service_id,
    resource_id,
    professional_id,
    start_time,
    end_time,
    spots_total,
    spots_occupied,
    operational_session_id,
    is_public
  )
  values (
    target_session.company_id,
    target_service_id,
    target_resource_id,
    target_session.coach_id,
    session_start,
    session_start + make_interval(mins => target_session.duration_minutes),
    public_capacity,
    0,
    target_session.id,
    true
  )
  on conflict (operational_session_id)
  where operational_session_id is not null
  do update set
    company_id = excluded.company_id,
    service_id = excluded.service_id,
    resource_id = excluded.resource_id,
    professional_id = excluded.professional_id,
    start_time = excluded.start_time,
    end_time = excluded.end_time,
    -- Never invalidate confirmed reservations when the gestor reduces capacity.
    -- The public slot may temporarily remain full until cancellations free seats.
    spots_total = greatest(excluded.spots_total, slots.spots_occupied),
    is_public = true;
end;
$$;

create or replace function public.sync_operational_session_public_slot_trigger()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  perform public.sync_operational_session_public_slot(new.id);
  return new;
end;
$$;

drop trigger if exists sync_public_slot_on_operational_session
  on public.operational_sessions;
create trigger sync_public_slot_on_operational_session
after insert or update of
  session_date,
  start_time,
  duration_minutes,
  group_name,
  level,
  coach_id,
  status
on public.operational_sessions
for each row execute function public.sync_operational_session_public_slot_trigger();

create or replace function public.sync_operational_session_resource_public_slot_trigger()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  perform public.sync_operational_session_public_slot(
    case when tg_op = 'DELETE' then old.session_id else new.session_id end
  );

  if tg_op = 'DELETE' then
    return old;
  end if;

  return new;
end;
$$;

drop trigger if exists sync_public_slot_on_operational_session_resource
  on public.operational_session_resources;
create trigger sync_public_slot_on_operational_session_resource
after insert or update or delete
on public.operational_session_resources
for each row execute function public.sync_operational_session_resource_public_slot_trigger();

create or replace function public.hide_public_slot_before_operational_session_delete()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.slots
  set is_public = false
  where operational_session_id = old.id;
  return old;
end;
$$;

drop trigger if exists hide_public_slot_before_operational_session_delete
  on public.operational_sessions;
create trigger hide_public_slot_before_operational_session_delete
before delete on public.operational_sessions
for each row execute function public.hide_public_slot_before_operational_session_delete();

drop policy if exists "anonymous can read upcoming slots" on public.slots;
create policy "anonymous can read upcoming slots" on public.slots
for select to anon
using (is_public is true and start_time >= now());

drop policy if exists "authenticated can read accessible slots" on public.slots;
create policy "authenticated can read accessible slots" on public.slots
for select to authenticated
using (
  (is_public is true and start_time >= now())
  or public.is_company_member(company_id)
);

do $$
declare
  session_row record;
begin
  for session_row in
    select id
    from public.operational_sessions
    where status = 'published'
  loop
    perform public.sync_operational_session_public_slot(session_row.id);
  end loop;
end
$$;

revoke execute on function public.sync_operational_session_public_slot(uuid)
  from public, anon, authenticated;
revoke execute on function public.sync_operational_session_public_slot_trigger()
  from public, anon, authenticated;
revoke execute on function public.sync_operational_session_resource_public_slot_trigger()
  from public, anon, authenticated;
revoke execute on function public.hide_public_slot_before_operational_session_delete()
  from public, anon, authenticated;
