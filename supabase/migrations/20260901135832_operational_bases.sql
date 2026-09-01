-- Bases operacionais do clube e local explicito das sessoes.

create table public.company_locations (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  name text not null,
  address text,
  public_notes text,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint company_locations_id_company_unique unique (id, company_id),
  constraint company_locations_name_present check (length(trim(name)) between 2 and 100),
  constraint company_locations_address_length check (address is null or length(trim(address)) <= 240),
  constraint company_locations_notes_length check (public_notes is null or length(trim(public_notes)) <= 500),
  constraint company_locations_name_company_unique unique (company_id, name)
);

create index company_locations_company_active_idx
  on public.company_locations (company_id, is_active, name);

create trigger set_company_locations_updated_at
before update on public.company_locations
for each row execute function public.set_updated_at();

alter table public.company_locations enable row level security;

create policy "public can read active company locations"
on public.company_locations
for select
to anon
using (is_active is true);

create policy "members can read company locations"
on public.company_locations
for select
to authenticated
using (public.is_company_member(company_id));

create policy "admins can manage company locations"
on public.company_locations
for all
to authenticated
using (public.has_company_role(company_id, array['admin']::public.membership_role[]))
with check (public.has_company_role(company_id, array['admin']::public.membership_role[]));

grant select on public.company_locations to anon;
grant select, insert, update, delete on public.company_locations to authenticated;

alter table public.resources
  add column location_id uuid;

alter table public.resources
  add constraint resources_location_company_fk
  foreign key (location_id, company_id)
  references public.company_locations(id, company_id)
  on delete set null (location_id);

create index resources_location_idx on public.resources (company_id, location_id);

alter table public.base_schedules
  add column location_id uuid;

alter table public.base_schedules
  add constraint base_schedules_location_company_fk
  foreign key (location_id, company_id)
  references public.company_locations(id, company_id)
  on delete restrict;

create index base_schedules_location_idx on public.base_schedules (company_id, location_id);

alter table public.operational_sessions
  add column location_id uuid;

alter table public.operational_sessions
  add constraint operational_sessions_location_company_fk
  foreign key (location_id, company_id)
  references public.company_locations(id, company_id)
  on delete restrict;

create index operational_sessions_location_idx
  on public.operational_sessions (company_id, location_id, session_date);

alter table public.slots
  add column location_id uuid;

alter table public.slots
  add constraint slots_location_company_fk
  foreign key (location_id, company_id)
  references public.company_locations(id, company_id)
  on delete restrict;

create index slots_location_idx on public.slots (company_id, location_id, start_time);

drop function public.upsert_base_schedule(
  uuid, uuid, smallint, time, integer, text, text, uuid,
  public.base_schedule_status, uuid[]
);

create function public.upsert_base_schedule(
  p_schedule_id uuid,
  p_company_id uuid,
  p_weekday smallint,
  p_start_time time,
  p_duration_minutes integer,
  p_group_name text,
  p_level text,
  p_coach_id uuid,
  p_status public.base_schedule_status,
  p_resource_ids uuid[],
  p_location_id uuid default null
)
returns uuid
language plpgsql
volatile
security definer
set search_path = public, auth
as $$
declare
  target_schedule_id uuid;
  resource_id_value uuid;
  distinct_resource_ids uuid[];
begin
  if auth.uid() is null then
    raise exception 'authentication_required' using errcode = '28000';
  end if;

  if not public.has_company_role(p_company_id, array['admin']::public.membership_role[]) then
    raise exception 'permission_denied' using errcode = '42501';
  end if;

  if p_location_id is not null and not exists (
    select 1 from public.company_locations locations
    where locations.id = p_location_id
      and locations.company_id = p_company_id
      and locations.is_active is true
  ) then
    raise exception 'base_schedule_location_invalid' using errcode = '23503';
  end if;

  select array_agg(distinct resource_id_item)
  into distinct_resource_ids
  from unnest(coalesce(p_resource_ids, '{}'::uuid[])) as resource_id_item;

  if distinct_resource_ids is null or cardinality(distinct_resource_ids) = 0 then
    raise exception 'base_schedule_requires_resource' using errcode = '23514';
  end if;

  if exists (
    select 1
    from unnest(distinct_resource_ids) resource_id_item
    left join public.resources resources
      on resources.id = resource_id_item
      and resources.company_id = p_company_id
    where resources.id is null or resources.location_id is distinct from p_location_id
  ) then
    raise exception 'base_schedule_resource_location_mismatch' using errcode = '23514';
  end if;

  if p_schedule_id is null then
    insert into public.base_schedules (
      company_id, weekday, start_time, duration_minutes, group_name, level,
      coach_id, status, created_by, location_id
    ) values (
      p_company_id, p_weekday, p_start_time, p_duration_minutes, p_group_name,
      nullif(trim(coalesce(p_level, '')), ''), p_coach_id, p_status, auth.uid(),
      p_location_id
    ) returning id into target_schedule_id;
  else
    update public.base_schedules set
      weekday = p_weekday,
      start_time = p_start_time,
      duration_minutes = p_duration_minutes,
      group_name = p_group_name,
      level = nullif(trim(coalesce(p_level, '')), ''),
      coach_id = p_coach_id,
      status = p_status,
      location_id = p_location_id
    where id = p_schedule_id and company_id = p_company_id
    returning id into target_schedule_id;

    if target_schedule_id is null then
      raise exception 'base_schedule_not_found' using errcode = '22023';
    end if;
  end if;

  foreach resource_id_value in array distinct_resource_ids loop
    insert into public.base_schedule_resources (schedule_id, company_id, resource_id)
    values (target_schedule_id, p_company_id, resource_id_value)
    on conflict (schedule_id, resource_id) do nothing;
  end loop;

  delete from public.base_schedule_resources
  where schedule_id = target_schedule_id
    and company_id = p_company_id
    and not (resource_id = any(distinct_resource_ids));

  return target_schedule_id;
end;
$$;

revoke execute on function public.upsert_base_schedule(
  uuid, uuid, smallint, time, integer, text, text, uuid,
  public.base_schedule_status, uuid[], uuid
) from public, anon;
grant execute on function public.upsert_base_schedule(
  uuid, uuid, smallint, time, integer, text, text, uuid,
  public.base_schedule_status, uuid[], uuid
) to authenticated;

drop function public.upsert_operational_session(
  uuid, uuid, date, time, integer, text, text, uuid, uuid, uuid,
  public.operational_session_status, uuid[]
);

create function public.upsert_operational_session(
  p_session_id uuid,
  p_company_id uuid,
  p_session_date date,
  p_start_time time,
  p_duration_minutes integer,
  p_group_name text,
  p_level text,
  p_base_schedule_id uuid,
  p_coach_id uuid,
  p_training_plan_version_id uuid,
  p_status public.operational_session_status,
  p_resource_ids uuid[],
  p_location_id uuid default null
)
returns uuid
language plpgsql
volatile
security definer
set search_path = public, auth
as $$
declare
  target_session_id uuid;
  resource_id_value uuid;
  distinct_resource_ids uuid[];
begin
  if auth.uid() is null then
    raise exception 'authentication_required' using errcode = '28000';
  end if;

  if not public.has_company_role(p_company_id, array['admin']::public.membership_role[]) then
    raise exception 'permission_denied' using errcode = '42501';
  end if;

  if p_location_id is not null and not exists (
    select 1 from public.company_locations locations
    where locations.id = p_location_id
      and locations.company_id = p_company_id
      and locations.is_active is true
  ) then
    raise exception 'operational_session_location_invalid' using errcode = '23503';
  end if;

  select array_agg(distinct resource_id_item)
  into distinct_resource_ids
  from unnest(coalesce(p_resource_ids, '{}'::uuid[])) as resource_id_item;

  if distinct_resource_ids is null or cardinality(distinct_resource_ids) = 0 then
    raise exception 'operational_session_requires_resource' using errcode = '23514';
  end if;

  if exists (
    select 1
    from unnest(distinct_resource_ids) resource_id_item
    left join public.resources resources
      on resources.id = resource_id_item
      and resources.company_id = p_company_id
    where resources.id is null or resources.location_id is distinct from p_location_id
  ) then
    raise exception 'operational_session_resource_location_mismatch' using errcode = '23514';
  end if;

  if p_session_id is null then
    insert into public.operational_sessions (
      company_id, session_date, start_time, duration_minutes, group_name, level,
      base_schedule_id, coach_id, training_plan_version_id, status, created_by,
      location_id
    ) values (
      p_company_id, p_session_date, p_start_time, p_duration_minutes, p_group_name,
      nullif(trim(coalesce(p_level, '')), ''), p_base_schedule_id, p_coach_id,
      p_training_plan_version_id, p_status, auth.uid(), p_location_id
    )
    on conflict (company_id, base_schedule_id, session_date)
    where base_schedule_id is not null
    do update set
      start_time = excluded.start_time,
      duration_minutes = excluded.duration_minutes,
      group_name = excluded.group_name,
      level = excluded.level,
      coach_id = excluded.coach_id,
      training_plan_version_id = excluded.training_plan_version_id,
      status = excluded.status,
      location_id = excluded.location_id
    returning id into target_session_id;
  else
    update public.operational_sessions set
      session_date = p_session_date,
      start_time = p_start_time,
      duration_minutes = p_duration_minutes,
      group_name = p_group_name,
      level = nullif(trim(coalesce(p_level, '')), ''),
      base_schedule_id = p_base_schedule_id,
      coach_id = p_coach_id,
      training_plan_version_id = p_training_plan_version_id,
      status = p_status,
      location_id = p_location_id
    where id = p_session_id and company_id = p_company_id
    returning id into target_session_id;

    if target_session_id is null then
      raise exception 'operational_session_not_found' using errcode = '22023';
    end if;
  end if;

  foreach resource_id_value in array distinct_resource_ids loop
    insert into public.operational_session_resources (session_id, company_id, resource_id)
    values (target_session_id, p_company_id, resource_id_value)
    on conflict (session_id, resource_id) do nothing;
  end loop;

  delete from public.operational_session_resources
  where session_id = target_session_id
    and company_id = p_company_id
    and not (resource_id = any(distinct_resource_ids));

  return target_session_id;
end;
$$;

revoke execute on function public.upsert_operational_session(
  uuid, uuid, date, time, integer, text, text, uuid, uuid, uuid,
  public.operational_session_status, uuid[], uuid
) from public, anon;
grant execute on function public.upsert_operational_session(
  uuid, uuid, date, time, integer, text, text, uuid, uuid, uuid,
  public.operational_session_status, uuid[], uuid
) to authenticated;

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
  select * into target_session from public.operational_sessions where id = p_session_id;
  if not found then return; end if;

  if target_session.status <> 'published' then
    update public.slots set is_public = false where operational_session_id = target_session.id;
    return;
  end if;

  select
    sum(greatest(resources.capacity_maxima - case when resources.default_steerer_policy = 'instrutor' then 1 else 0 end, 0))::integer,
    case when count(*) = 1 then (array_agg(resources.id))[1] else null end
  into public_capacity, target_resource_id
  from public.operational_session_resources links
  join public.resources resources on resources.id = links.resource_id and resources.company_id = links.company_id
  where links.session_id = target_session.id
    and resources.is_active is true
    and coalesce(resources.vessel_status::text, 'disponivel') = 'disponivel';

  if coalesce(public_capacity, 0) < 1 then
    update public.slots set is_public = false where operational_session_id = target_session.id;
    return;
  end if;

  select services.id into target_service_id
  from public.services
  where services.company_id = target_session.company_id
    and services.is_active is true
    and lower(trim(services.name)) = lower(trim(target_session.group_name))
  order by services.created_at limit 1;

  if target_service_id is null then
    insert into public.services (company_id, name, description, duration_minutes, price, is_active)
    values (target_session.company_id, target_session.group_name, target_session.level, target_session.duration_minutes, 0, true)
    returning id into target_service_id;
  end if;

  session_start := (target_session.session_date + target_session.start_time) at time zone 'America/Sao_Paulo';

  insert into public.slots (
    company_id, service_id, resource_id, professional_id, start_time, end_time,
    spots_total, spots_occupied, operational_session_id, is_public, location_id
  ) values (
    target_session.company_id, target_service_id, target_resource_id,
    target_session.coach_id, session_start,
    session_start + make_interval(mins => target_session.duration_minutes),
    public_capacity, 0, target_session.id, true, target_session.location_id
  )
  on conflict (operational_session_id) where operational_session_id is not null
  do update set
    company_id = excluded.company_id,
    service_id = excluded.service_id,
    resource_id = excluded.resource_id,
    professional_id = excluded.professional_id,
    start_time = excluded.start_time,
    end_time = excluded.end_time,
    spots_total = greatest(excluded.spots_total, slots.spots_occupied),
    is_public = true,
    location_id = excluded.location_id;
end;
$$;

drop trigger sync_public_slot_on_operational_session on public.operational_sessions;
create trigger sync_public_slot_on_operational_session
after insert or update of
  session_date, start_time, duration_minutes, group_name, level, coach_id, status,
  location_id
on public.operational_sessions
for each row execute function public.sync_operational_session_public_slot_trigger();

do $$
declare session_row record;
begin
  for session_row in select id from public.operational_sessions where status = 'published' loop
    perform public.sync_operational_session_public_slot(session_row.id);
  end loop;
end
$$;
