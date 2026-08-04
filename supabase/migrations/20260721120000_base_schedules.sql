-- Grade-base recorrente de horarios.
-- Migration aditiva: nao publica slots, nao altera reservas e preserva a frota existente.

do $$
begin
  if not exists (select 1 from pg_type where typname = 'base_schedule_status') then
    create type public.base_schedule_status as enum ('active', 'inactive');
  end if;
end $$;

create table if not exists public.base_schedules (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  weekday smallint not null,
  start_time time not null,
  duration_minutes integer not null,
  group_name text not null,
  level text,
  coach_id uuid not null references public.profiles(id) on delete restrict,
  status public.base_schedule_status not null default 'active',
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint base_schedules_id_company_id_unique unique (id, company_id),
  constraint base_schedules_weekday_valid check (weekday between 1 and 7),
  constraint base_schedules_duration_valid check (duration_minutes between 5 and 360),
  constraint base_schedules_group_name_present check (length(trim(group_name)) > 0),
  constraint base_schedules_level_length check (level is null or length(trim(level)) <= 80),
  constraint base_schedules_no_day_wrap check (
    (
      extract(hour from start_time)::integer * 60
      + extract(minute from start_time)::integer
      + duration_minutes
    ) <= 1440
  )
);

create table if not exists public.base_schedule_resources (
  schedule_id uuid not null,
  company_id uuid not null,
  resource_id uuid not null,
  created_at timestamptz not null default now(),

  constraint base_schedule_resources_pkey primary key (schedule_id, resource_id),
  constraint base_schedule_resources_schedule_company_fk foreign key (schedule_id, company_id)
    references public.base_schedules(id, company_id)
    on delete cascade,
  constraint base_schedule_resources_resource_company_fk foreign key (resource_id, company_id)
    references public.resources(id, company_id)
    on delete restrict
);

create index if not exists base_schedules_company_weekday_time_idx
  on public.base_schedules (company_id, weekday, start_time);

create index if not exists base_schedules_company_status_idx
  on public.base_schedules (company_id, status);

create index if not exists base_schedules_coach_idx
  on public.base_schedules (coach_id);

create index if not exists base_schedule_resources_company_resource_idx
  on public.base_schedule_resources (company_id, resource_id);

drop trigger if exists set_base_schedules_updated_at on public.base_schedules;
create trigger set_base_schedules_updated_at
before update on public.base_schedules
for each row execute function public.set_updated_at();

create or replace function public.base_schedule_start_minute(p_start time)
returns integer
language sql
immutable
set search_path = public
as $$
  select extract(hour from p_start)::integer * 60
       + extract(minute from p_start)::integer;
$$;

create or replace function public.ensure_base_schedule_coach_membership()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if not exists (
    select 1
    from public.memberships memberships
    where memberships.company_id = new.company_id
      and memberships.user_id = new.coach_id
      and memberships.role in ('admin', 'professional')
  ) then
    raise exception 'base_schedule_coach_must_belong_to_company' using errcode = '23514';
  end if;

  return new;
end;
$$;

drop trigger if exists ensure_base_schedule_coach_membership_on_base_schedules
  on public.base_schedules;
create trigger ensure_base_schedule_coach_membership_on_base_schedules
before insert or update of company_id, coach_id on public.base_schedules
for each row execute function public.ensure_base_schedule_coach_membership();

create or replace function public.ensure_base_schedule_resource_available()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  linked_schedule public.base_schedules%rowtype;
  linked_resource public.resources%rowtype;
  new_start integer;
  new_end integer;
begin
  select *
  into linked_schedule
  from public.base_schedules
  where id = new.schedule_id
    and company_id = new.company_id;

  if not found then
    raise exception 'base_schedule_not_found' using errcode = '23503';
  end if;

  select *
  into linked_resource
  from public.resources
  where id = new.resource_id
    and company_id = new.company_id;

  if not found then
    raise exception 'base_schedule_resource_not_found' using errcode = '23503';
  end if;

  if linked_resource.is_active is not true
     or coalesce(linked_resource.vessel_status::text, 'disponivel') <> 'disponivel' then
    raise exception 'base_schedule_resource_unavailable' using errcode = '23514';
  end if;

  if linked_schedule.status = 'inactive' then
    return new;
  end if;

  new_start := public.base_schedule_start_minute(linked_schedule.start_time);
  new_end := new_start + linked_schedule.duration_minutes;

  if exists (
    select 1
    from public.base_schedule_resources other_link
    join public.base_schedules other_schedule
      on other_schedule.id = other_link.schedule_id
     and other_schedule.company_id = other_link.company_id
    where other_link.company_id = new.company_id
      and other_link.resource_id = new.resource_id
      and other_schedule.id <> new.schedule_id
      and other_schedule.status = 'active'
      and other_schedule.weekday = linked_schedule.weekday
      and public.base_schedule_start_minute(other_schedule.start_time) < new_end
      and new_start < (
        public.base_schedule_start_minute(other_schedule.start_time)
        + other_schedule.duration_minutes
      )
  ) then
    raise exception 'base_schedule_resource_conflict' using errcode = '23P01';
  end if;

  return new;
end;
$$;

drop trigger if exists ensure_base_schedule_resource_available_on_links
  on public.base_schedule_resources;
create trigger ensure_base_schedule_resource_available_on_links
before insert or update of schedule_id, company_id, resource_id
on public.base_schedule_resources
for each row execute function public.ensure_base_schedule_resource_available();

create or replace function public.ensure_base_schedule_existing_resources_not_conflicting()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  resource_record record;
  new_start integer;
  new_end integer;
begin
  if new.status = 'inactive' then
    return new;
  end if;

  new_start := public.base_schedule_start_minute(new.start_time);
  new_end := new_start + new.duration_minutes;

  for resource_record in
    select resource_id
    from public.base_schedule_resources
    where schedule_id = new.id
      and company_id = new.company_id
  loop
    if exists (
      select 1
      from public.base_schedule_resources other_link
      join public.base_schedules other_schedule
        on other_schedule.id = other_link.schedule_id
       and other_schedule.company_id = other_link.company_id
      where other_link.company_id = new.company_id
        and other_link.resource_id = resource_record.resource_id
        and other_schedule.id <> new.id
        and other_schedule.status = 'active'
        and other_schedule.weekday = new.weekday
        and public.base_schedule_start_minute(other_schedule.start_time) < new_end
        and new_start < (
          public.base_schedule_start_minute(other_schedule.start_time)
          + other_schedule.duration_minutes
        )
    ) then
      raise exception 'base_schedule_resource_conflict' using errcode = '23P01';
    end if;
  end loop;

  return new;
end;
$$;

drop trigger if exists ensure_base_schedule_existing_resources_not_conflicting_on_update
  on public.base_schedules;
create trigger ensure_base_schedule_existing_resources_not_conflicting_on_update
before update of weekday, start_time, duration_minutes, status
on public.base_schedules
for each row execute function public.ensure_base_schedule_existing_resources_not_conflicting();

alter table public.base_schedules enable row level security;
alter table public.base_schedule_resources enable row level security;

drop policy if exists "staff can read base schedules" on public.base_schedules;
create policy "staff can read base schedules"
on public.base_schedules
for select
to authenticated
using (
  public.has_company_role(company_id, array['admin', 'professional']::public.membership_role[])
);

drop policy if exists "admins can insert base schedules" on public.base_schedules;
create policy "admins can insert base schedules"
on public.base_schedules
for insert
to authenticated
with check (
  created_by = auth.uid()
  and public.has_company_role(company_id, array['admin']::public.membership_role[])
);

drop policy if exists "admins can update base schedules" on public.base_schedules;
create policy "admins can update base schedules"
on public.base_schedules
for update
to authenticated
using (
  public.has_company_role(company_id, array['admin']::public.membership_role[])
)
with check (
  public.has_company_role(company_id, array['admin']::public.membership_role[])
);

drop policy if exists "staff can read base schedule resources" on public.base_schedule_resources;
create policy "staff can read base schedule resources"
on public.base_schedule_resources
for select
to authenticated
using (
  public.has_company_role(company_id, array['admin', 'professional']::public.membership_role[])
);

drop policy if exists "admins can insert base schedule resources" on public.base_schedule_resources;
create policy "admins can insert base schedule resources"
on public.base_schedule_resources
for insert
to authenticated
with check (
  public.has_company_role(company_id, array['admin']::public.membership_role[])
);

drop policy if exists "admins can delete base schedule resources" on public.base_schedule_resources;
create policy "admins can delete base schedule resources"
on public.base_schedule_resources
for delete
to authenticated
using (
  public.has_company_role(company_id, array['admin']::public.membership_role[])
);

grant select, insert, update on public.base_schedules to authenticated;
grant select, insert, delete on public.base_schedule_resources to authenticated;

revoke all on public.base_schedules from anon;
revoke all on public.base_schedule_resources from anon;

create or replace function public.upsert_base_schedule(
  p_schedule_id uuid,
  p_company_id uuid,
  p_weekday smallint,
  p_start_time time,
  p_duration_minutes integer,
  p_group_name text,
  p_level text,
  p_coach_id uuid,
  p_status public.base_schedule_status,
  p_resource_ids uuid[]
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

  select array_agg(distinct resource_id_item)
  into distinct_resource_ids
  from unnest(coalesce(p_resource_ids, '{}'::uuid[])) as resource_id_item;

  if distinct_resource_ids is null or cardinality(distinct_resource_ids) = 0 then
    raise exception 'base_schedule_requires_resource' using errcode = '23514';
  end if;

  if p_schedule_id is null then
    insert into public.base_schedules (
      company_id,
      weekday,
      start_time,
      duration_minutes,
      group_name,
      level,
      coach_id,
      status,
      created_by
    )
    values (
      p_company_id,
      p_weekday,
      p_start_time,
      p_duration_minutes,
      p_group_name,
      nullif(trim(coalesce(p_level, '')), ''),
      p_coach_id,
      p_status,
      auth.uid()
    )
    returning id into target_schedule_id;
  else
    update public.base_schedules
    set
      weekday = p_weekday,
      start_time = p_start_time,
      duration_minutes = p_duration_minutes,
      group_name = p_group_name,
      level = nullif(trim(coalesce(p_level, '')), ''),
      coach_id = p_coach_id,
      status = p_status
    where id = p_schedule_id
      and company_id = p_company_id
    returning id into target_schedule_id;

    if target_schedule_id is null then
      raise exception 'base_schedule_not_found' using errcode = '22023';
    end if;

  end if;

  foreach resource_id_value in array distinct_resource_ids loop
    insert into public.base_schedule_resources (
      schedule_id,
      company_id,
      resource_id
    )
    values (
      target_schedule_id,
      p_company_id,
      resource_id_value
    )
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
  uuid,
  uuid,
  smallint,
  time,
  integer,
  text,
  text,
  uuid,
  public.base_schedule_status,
  uuid[]
) from public;
revoke execute on function public.upsert_base_schedule(
  uuid,
  uuid,
  smallint,
  time,
  integer,
  text,
  text,
  uuid,
  public.base_schedule_status,
  uuid[]
) from anon;
grant execute on function public.upsert_base_schedule(
  uuid,
  uuid,
  smallint,
  time,
  integer,
  text,
  text,
  uuid,
  public.base_schedule_status,
  uuid[]
) to authenticated;
