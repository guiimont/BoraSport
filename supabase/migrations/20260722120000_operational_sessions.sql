-- Agenda operacional: sessoes concretas por data.
-- Migration aditiva. Nao substitui slots legados nem aplica materializacao infinita.

do $$
begin
  if not exists (select 1 from pg_type where typname = 'operational_session_status') then
    create type public.operational_session_status as enum ('draft', 'published', 'cancelled');
  end if;
end $$;

create table if not exists public.operational_sessions (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  session_date date not null,
  start_time time not null,
  duration_minutes integer not null,
  group_name text not null,
  level text,
  base_schedule_id uuid,
  coach_id uuid not null references public.profiles(id) on delete restrict,
  training_plan_version_id uuid,
  status public.operational_session_status not null default 'draft',
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint operational_sessions_id_company_id_unique unique (id, company_id),
  constraint operational_sessions_duration_valid check (duration_minutes between 5 and 360),
  constraint operational_sessions_group_name_present check (length(trim(group_name)) > 0),
  constraint operational_sessions_level_length check (level is null or length(trim(level)) <= 80),
  constraint operational_sessions_no_day_wrap check (
    (
      extract(hour from start_time)::integer * 60
      + extract(minute from start_time)::integer
      + duration_minutes
    ) <= 1440
  ),
  constraint operational_sessions_base_schedule_company_fk foreign key (base_schedule_id, company_id)
    references public.base_schedules(id, company_id)
    on delete set null (base_schedule_id),
  constraint operational_sessions_training_version_company_fk foreign key (training_plan_version_id, company_id)
    references public.training_plan_versions(id, company_id)
    on delete set null (training_plan_version_id)
);

create unique index if not exists operational_sessions_base_occurrence_unique
  on public.operational_sessions (company_id, base_schedule_id, session_date)
  where base_schedule_id is not null;

create index if not exists operational_sessions_company_date_idx
  on public.operational_sessions (company_id, session_date, start_time);

create index if not exists operational_sessions_company_status_idx
  on public.operational_sessions (company_id, status);

create index if not exists operational_sessions_training_version_idx
  on public.operational_sessions (training_plan_version_id);

create table if not exists public.operational_session_resources (
  session_id uuid not null,
  company_id uuid not null,
  resource_id uuid not null,
  created_at timestamptz not null default now(),

  constraint operational_session_resources_pkey primary key (session_id, resource_id),
  constraint operational_session_resources_session_company_fk foreign key (session_id, company_id)
    references public.operational_sessions(id, company_id)
    on delete cascade,
  constraint operational_session_resources_resource_company_fk foreign key (resource_id, company_id)
    references public.resources(id, company_id)
    on delete restrict
);

create index if not exists operational_session_resources_company_resource_idx
  on public.operational_session_resources (company_id, resource_id);

drop trigger if exists set_operational_sessions_updated_at on public.operational_sessions;
create trigger set_operational_sessions_updated_at
before update on public.operational_sessions
for each row execute function public.set_updated_at();

create or replace function public.operational_session_start_minute(p_start time)
returns integer
language sql
immutable
set search_path = public
as $$
  select extract(hour from p_start)::integer * 60
       + extract(minute from p_start)::integer;
$$;

create or replace function public.ensure_operational_session_coach_membership()
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
    raise exception 'operational_session_coach_must_belong_to_company' using errcode = '23514';
  end if;

  return new;
end;
$$;

drop trigger if exists ensure_operational_session_coach_membership_on_sessions
  on public.operational_sessions;
create trigger ensure_operational_session_coach_membership_on_sessions
before insert or update of company_id, coach_id on public.operational_sessions
for each row execute function public.ensure_operational_session_coach_membership();

create or replace function public.ensure_operational_session_resource_available()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  linked_session public.operational_sessions%rowtype;
  linked_resource public.resources%rowtype;
  new_start integer;
  new_end integer;
begin
  select *
  into linked_session
  from public.operational_sessions
  where id = new.session_id
    and company_id = new.company_id;

  if not found then
    raise exception 'operational_session_not_found' using errcode = '23503';
  end if;

  select *
  into linked_resource
  from public.resources
  where id = new.resource_id
    and company_id = new.company_id;

  if not found then
    raise exception 'operational_session_resource_not_found' using errcode = '23503';
  end if;

  if linked_resource.is_active is not true
     or coalesce(linked_resource.vessel_status::text, 'disponivel') <> 'disponivel' then
    raise exception 'operational_session_resource_unavailable' using errcode = '23514';
  end if;

  if linked_session.status = 'cancelled' then
    return new;
  end if;

  new_start := public.operational_session_start_minute(linked_session.start_time);
  new_end := new_start + linked_session.duration_minutes;

  if exists (
    select 1
    from public.operational_session_resources other_link
    join public.operational_sessions other_session
      on other_session.id = other_link.session_id
     and other_session.company_id = other_link.company_id
    where other_link.company_id = new.company_id
      and other_link.resource_id = new.resource_id
      and other_session.id <> new.session_id
      and other_session.status <> 'cancelled'
      and other_session.session_date = linked_session.session_date
      and public.operational_session_start_minute(other_session.start_time) < new_end
      and new_start < (
        public.operational_session_start_minute(other_session.start_time)
        + other_session.duration_minutes
      )
  ) then
    raise exception 'operational_session_resource_conflict' using errcode = '23P01';
  end if;

  return new;
end;
$$;

drop trigger if exists ensure_operational_session_resource_available_on_links
  on public.operational_session_resources;
create trigger ensure_operational_session_resource_available_on_links
before insert or update of session_id, company_id, resource_id
on public.operational_session_resources
for each row execute function public.ensure_operational_session_resource_available();

alter table public.operational_sessions enable row level security;
alter table public.operational_session_resources enable row level security;

drop policy if exists "staff can read operational sessions" on public.operational_sessions;
create policy "staff can read operational sessions"
on public.operational_sessions
for select
to authenticated
using (
  public.has_company_role(company_id, array['admin', 'professional']::public.membership_role[])
);

drop policy if exists "admins can write operational sessions" on public.operational_sessions;
create policy "admins can write operational sessions"
on public.operational_sessions
for all
to authenticated
using (
  public.has_company_role(company_id, array['admin']::public.membership_role[])
)
with check (
  public.has_company_role(company_id, array['admin']::public.membership_role[])
);

drop policy if exists "staff can read operational session resources" on public.operational_session_resources;
create policy "staff can read operational session resources"
on public.operational_session_resources
for select
to authenticated
using (
  public.has_company_role(company_id, array['admin', 'professional']::public.membership_role[])
);

drop policy if exists "admins can write operational session resources" on public.operational_session_resources;
create policy "admins can write operational session resources"
on public.operational_session_resources
for all
to authenticated
using (
  public.has_company_role(company_id, array['admin']::public.membership_role[])
)
with check (
  public.has_company_role(company_id, array['admin']::public.membership_role[])
);

grant select, insert, update, delete on public.operational_sessions to authenticated;
grant select, insert, update, delete on public.operational_session_resources to authenticated;
revoke all on public.operational_sessions from anon;
revoke all on public.operational_session_resources from anon;

create or replace function public.upsert_operational_session(
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
  p_resource_ids uuid[]
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

  select array_agg(distinct resource_id_item)
  into distinct_resource_ids
  from unnest(coalesce(p_resource_ids, '{}'::uuid[])) as resource_id_item;

  if distinct_resource_ids is null or cardinality(distinct_resource_ids) = 0 then
    raise exception 'operational_session_requires_resource' using errcode = '23514';
  end if;

  if p_session_id is null then
    insert into public.operational_sessions (
      company_id,
      session_date,
      start_time,
      duration_minutes,
      group_name,
      level,
      base_schedule_id,
      coach_id,
      training_plan_version_id,
      status,
      created_by
    )
    values (
      p_company_id,
      p_session_date,
      p_start_time,
      p_duration_minutes,
      p_group_name,
      nullif(trim(coalesce(p_level, '')), ''),
      p_base_schedule_id,
      p_coach_id,
      p_training_plan_version_id,
      p_status,
      auth.uid()
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
      status = excluded.status
    returning id into target_session_id;
  else
    update public.operational_sessions
    set
      session_date = p_session_date,
      start_time = p_start_time,
      duration_minutes = p_duration_minutes,
      group_name = p_group_name,
      level = nullif(trim(coalesce(p_level, '')), ''),
      base_schedule_id = p_base_schedule_id,
      coach_id = p_coach_id,
      training_plan_version_id = p_training_plan_version_id,
      status = p_status
    where id = p_session_id
      and company_id = p_company_id
    returning id into target_session_id;

    if target_session_id is null then
      raise exception 'operational_session_not_found' using errcode = '22023';
    end if;
  end if;

  foreach resource_id_value in array distinct_resource_ids loop
    insert into public.operational_session_resources (
      session_id,
      company_id,
      resource_id
    )
    values (
      target_session_id,
      p_company_id,
      resource_id_value
    )
    on conflict (session_id, resource_id) do nothing;
  end loop;

  delete from public.operational_session_resources
  where session_id = target_session_id
    and company_id = p_company_id
    and not (resource_id = any(distinct_resource_ids));

  return target_session_id;
end;
$$;

create or replace function public.set_operational_session_training(
  p_session_id uuid,
  p_training_plan_version_id uuid
)
returns void
language plpgsql
volatile
security definer
set search_path = public, auth
as $$
declare
  target_session public.operational_sessions%rowtype;
begin
  if auth.uid() is null then
    raise exception 'authentication_required' using errcode = '28000';
  end if;

  select *
  into target_session
  from public.operational_sessions
  where id = p_session_id
  for update;

  if not found then
    raise exception 'operational_session_not_found' using errcode = '22023';
  end if;

  if not public.has_company_role(target_session.company_id, array['admin']::public.membership_role[]) then
    raise exception 'permission_denied' using errcode = '42501';
  end if;

  if p_training_plan_version_id is not null and not exists (
    select 1
    from public.training_plan_versions versions
    where versions.id = p_training_plan_version_id
      and versions.company_id = target_session.company_id
      and versions.status = 'published'
  ) then
    raise exception 'operational_session_training_version_invalid' using errcode = '23503';
  end if;

  update public.operational_sessions
  set training_plan_version_id = p_training_plan_version_id
  where id = p_session_id;
end;
$$;

revoke execute on function public.upsert_operational_session(
  uuid,
  uuid,
  date,
  time,
  integer,
  text,
  text,
  uuid,
  uuid,
  uuid,
  public.operational_session_status,
  uuid[]
) from public;
revoke execute on function public.upsert_operational_session(
  uuid,
  uuid,
  date,
  time,
  integer,
  text,
  text,
  uuid,
  uuid,
  uuid,
  public.operational_session_status,
  uuid[]
) from anon;
grant execute on function public.upsert_operational_session(
  uuid,
  uuid,
  date,
  time,
  integer,
  text,
  text,
  uuid,
  uuid,
  uuid,
  public.operational_session_status,
  uuid[]
) to authenticated;

revoke execute on function public.set_operational_session_training(uuid, uuid) from public;
revoke execute on function public.set_operational_session_training(uuid, uuid) from anon;
grant execute on function public.set_operational_session_training(uuid, uuid) to authenticated;
