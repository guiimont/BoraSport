-- Structured training engine for BoraSport.
-- Additive foundation for reusable va'a workout templates, versions and blocks.
-- This migration does not replace services, slots, bookings, weekly_workouts or
-- activity_records.

do $$
begin
  if not exists (select 1 from pg_type where typname = 'bora_zone') then
    create type public.bora_zone as enum (
      'z1_recuperar',
      'z2_base',
      'z3_ritmo',
      'z4_forte',
      'z5_maximo'
    );
  end if;

  if not exists (select 1 from pg_type where typname = 'training_plan_status') then
    create type public.training_plan_status as enum ('active', 'archived');
  end if;

  if not exists (select 1 from pg_type where typname = 'training_version_status') then
    create type public.training_version_status as enum ('draft', 'published', 'archived');
  end if;

  if not exists (select 1 from pg_type where typname = 'training_version_level') then
    create type public.training_version_level as enum (
      'iniciante',
      'intermediario',
      'avancado',
      'competicao',
      'personalizado'
    );
  end if;

  if not exists (select 1 from pg_type where typname = 'training_block_kind') then
    create type public.training_block_kind as enum ('simple', 'repeat_group');
  end if;

  if not exists (select 1 from pg_type where typname = 'training_block_type') then
    create type public.training_block_type as enum (
      'aquecimento',
      'tecnica',
      'base',
      'ritmo',
      'forte',
      'largada',
      'recuperacao',
      'descanso_hidratacao',
      'volta_calma'
    );
  end if;

  if not exists (select 1 from pg_type where typname = 'training_target_type') then
    create type public.training_target_type as enum (
      'time',
      'distance',
      'open',
      'speed',
      'cadence'
    );
  end if;

  if not exists (select 1 from pg_type where typname = 'vessel_class') then
    create type public.vessel_class as enum ('v1', 'oc1', 'v3', 'oc4', 'v6', 'oc6', 'outro');
  end if;
end $$;

create table if not exists public.training_plans (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  title text not null,
  objective text,
  vessel_class public.vessel_class not null default 'outro',
  default_duration_seconds integer,
  group_label text,
  coach_id uuid references public.profiles(id) on delete set null,
  status public.training_plan_status not null default 'active',
  created_by uuid references public.profiles(id) on delete set null,
  archived_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint training_plans_title_not_blank check (length(trim(title)) > 0),
  constraint training_plans_default_duration_positive check (
    default_duration_seconds is null or default_duration_seconds > 0
  ),
  constraint training_plans_archive_consistency check (
    (status = 'archived' and archived_at is not null)
    or (status <> 'archived')
  )
);

create unique index if not exists training_plans_id_company_id_unique
  on public.training_plans (id, company_id);

create index if not exists training_plans_company_status_idx
  on public.training_plans (company_id, status, updated_at desc);

create index if not exists training_plans_created_by_idx
  on public.training_plans (created_by)
  where created_by is not null;

create table if not exists public.training_plan_versions (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  training_plan_id uuid not null,
  version_number integer not null,
  level public.training_version_level not null default 'intermediario',
  status public.training_version_status not null default 'draft',
  duration_seconds integer,
  technical_notes text,
  safety_notes text,
  published_at timestamptz,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint training_plan_versions_plan_company_fk foreign key (
    training_plan_id,
    company_id
  ) references public.training_plans(id, company_id) on delete cascade,
  constraint training_plan_versions_number_positive check (version_number > 0),
  constraint training_plan_versions_duration_positive check (
    duration_seconds is null or duration_seconds > 0
  ),
  constraint training_plan_versions_publish_consistency check (
    (status = 'published' and published_at is not null)
    or (status <> 'published')
  ),
  constraint training_plan_versions_unique_number unique (
    training_plan_id,
    version_number
  )
);

create unique index if not exists training_plan_versions_id_company_id_unique
  on public.training_plan_versions (id, company_id);

create index if not exists training_plan_versions_plan_idx
  on public.training_plan_versions (training_plan_id, version_number desc);

create index if not exists training_plan_versions_company_status_idx
  on public.training_plan_versions (company_id, status, updated_at desc);

create table if not exists public.training_blocks (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  training_plan_version_id uuid not null,
  parent_block_id uuid,
  block_kind public.training_block_kind not null default 'simple',
  block_type public.training_block_type,
  name text not null,
  instruction text,
  sort_order integer not null default 0,
  duration_seconds integer,
  bora_zone public.bora_zone,
  heart_rate_min integer,
  heart_rate_max integer,
  repeat_count integer,
  target_type public.training_target_type not null default 'time',
  target_value numeric(12, 3),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint training_blocks_version_company_fk foreign key (
    training_plan_version_id,
    company_id
  ) references public.training_plan_versions(id, company_id) on delete cascade,
  constraint training_blocks_parent_fk foreign key (parent_block_id)
    references public.training_blocks(id) on delete cascade,
  constraint training_blocks_name_not_blank check (length(trim(name)) > 0),
  constraint training_blocks_sort_order_non_negative check (sort_order >= 0),
  constraint training_blocks_duration_for_time check (
    target_type <> 'time'
    or block_kind <> 'simple'
    or (duration_seconds is not null and duration_seconds > 0)
  ),
  constraint training_blocks_optional_duration_positive check (
    duration_seconds is null or duration_seconds > 0
  ),
  constraint training_blocks_repeat_count_valid check (
    (
      block_kind = 'repeat_group'
      and repeat_count between 2 and 20
    )
    or (
      block_kind = 'simple'
      and repeat_count is null
    )
  ),
  constraint training_blocks_simple_type_required check (
    (block_kind = 'simple' and block_type is not null)
    or (block_kind = 'repeat_group' and block_type is null)
  ),
  constraint training_blocks_group_is_top_level check (
    block_kind <> 'repeat_group' or parent_block_id is null
  ),
  constraint training_blocks_heart_rate_range check (
    heart_rate_min is null
    or heart_rate_max is null
    or heart_rate_min < heart_rate_max
  ),
  constraint training_blocks_heart_rate_bounds check (
    (heart_rate_min is null or heart_rate_min between 30 and 240)
    and (heart_rate_max is null or heart_rate_max between 30 and 240)
  )
);

create index if not exists training_blocks_version_order_idx
  on public.training_blocks (
    training_plan_version_id,
    coalesce(parent_block_id, '00000000-0000-0000-0000-000000000000'::uuid),
    sort_order
  );

create index if not exists training_blocks_company_idx
  on public.training_blocks (company_id);

alter table public.weekly_workouts
  add column if not exists training_plan_version_id uuid;

alter table public.slots
  add column if not exists training_plan_version_id uuid;

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'weekly_workouts_training_version_company_fk'
      and conrelid = 'public.weekly_workouts'::regclass
  ) then
    alter table public.weekly_workouts
      add constraint weekly_workouts_training_version_company_fk
      foreign key (training_plan_version_id, company_id)
      references public.training_plan_versions(id, company_id)
      on delete set null (training_plan_version_id);
  end if;

  if not exists (
    select 1 from pg_constraint
    where conname = 'slots_training_version_company_fk'
      and conrelid = 'public.slots'::regclass
  ) then
    alter table public.slots
      add constraint slots_training_version_company_fk
      foreign key (training_plan_version_id, company_id)
      references public.training_plan_versions(id, company_id)
      on delete set null (training_plan_version_id);
  end if;
end $$;

drop trigger if exists set_training_plans_updated_at on public.training_plans;
create trigger set_training_plans_updated_at
before update on public.training_plans
for each row execute function public.set_updated_at();

drop trigger if exists set_training_plan_versions_updated_at on public.training_plan_versions;
create trigger set_training_plan_versions_updated_at
before update on public.training_plan_versions
for each row execute function public.set_updated_at();

drop trigger if exists set_training_blocks_updated_at on public.training_blocks;
create trigger set_training_blocks_updated_at
before update on public.training_blocks
for each row execute function public.set_updated_at();

create or replace function public.can_manage_training_plan(target_training_plan_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.training_plans plans
    where plans.id = target_training_plan_id
      and (
        public.has_company_role(plans.company_id, array['admin']::public.membership_role[])
        or (
          plans.created_by = auth.uid()
          and public.has_company_role(
            plans.company_id,
            array['professional']::public.membership_role[]
          )
        )
      )
  );
$$;

create or replace function public.can_edit_training_version(target_training_plan_version_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.training_plan_versions versions
    where versions.id = target_training_plan_version_id
      and versions.status = 'draft'
      and public.can_manage_training_plan(versions.training_plan_id)
  );
$$;

create or replace function public.ensure_training_block_parent()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  parent_record public.training_blocks%rowtype;
begin
  if new.parent_block_id is null then
    return new;
  end if;

  select *
  into parent_record
  from public.training_blocks
  where id = new.parent_block_id;

  if not found then
    raise exception 'training_block_parent_not_found' using errcode = '23503';
  end if;

  if parent_record.company_id <> new.company_id
     or parent_record.training_plan_version_id <> new.training_plan_version_id then
    raise exception 'training_block_parent_scope_mismatch' using errcode = '23514';
  end if;

  if parent_record.block_kind <> 'repeat_group'
     or parent_record.parent_block_id is not null then
    raise exception 'training_nested_repeat_groups_not_allowed' using errcode = '23514';
  end if;

  if new.block_kind = 'repeat_group' then
    raise exception 'training_nested_repeat_groups_not_allowed' using errcode = '23514';
  end if;

  return new;
end;
$$;

drop trigger if exists ensure_training_block_parent_on_blocks on public.training_blocks;
create trigger ensure_training_block_parent_on_blocks
before insert or update of company_id, training_plan_version_id, parent_block_id, block_kind
on public.training_blocks
for each row execute function public.ensure_training_block_parent();

create or replace function public.prevent_training_block_changes_when_locked()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  target_version_id uuid;
  version_status public.training_version_status;
begin
  if tg_op = 'DELETE' then
    target_version_id := old.training_plan_version_id;
  else
    target_version_id := new.training_plan_version_id;
  end if;

  select status
  into version_status
  from public.training_plan_versions
  where id = target_version_id;

  if version_status is null then
    raise exception 'training_version_not_found' using errcode = '23503';
  end if;

  if version_status <> 'draft' then
    raise exception 'training_version_locked' using errcode = '23514';
  end if;

  if tg_op = 'DELETE' then
    return old;
  end if;

  return new;
end;
$$;

drop trigger if exists prevent_training_block_insert_when_locked on public.training_blocks;
create trigger prevent_training_block_insert_when_locked
before insert on public.training_blocks
for each row execute function public.prevent_training_block_changes_when_locked();

drop trigger if exists prevent_training_block_update_when_locked on public.training_blocks;
create trigger prevent_training_block_update_when_locked
before update on public.training_blocks
for each row execute function public.prevent_training_block_changes_when_locked();

drop trigger if exists prevent_training_block_delete_when_locked on public.training_blocks;
create trigger prevent_training_block_delete_when_locked
before delete on public.training_blocks
for each row execute function public.prevent_training_block_changes_when_locked();

create or replace function public.protect_training_version_state()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  simple_block_count integer;
begin
  if old.status in ('published', 'archived') then
    if new.level is distinct from old.level
       or new.duration_seconds is distinct from old.duration_seconds
       or new.technical_notes is distinct from old.technical_notes
       or new.safety_notes is distinct from old.safety_notes
       or new.version_number is distinct from old.version_number
       or new.training_plan_id is distinct from old.training_plan_id
       or new.company_id is distinct from old.company_id then
      raise exception 'published_training_version_is_immutable' using errcode = '23514';
    end if;

    if old.status = 'published' and new.status = 'draft' then
      raise exception 'published_training_version_cannot_return_to_draft' using errcode = '23514';
    end if;

    if old.status = 'archived' and new.status <> 'archived' then
      raise exception 'archived_training_version_is_immutable' using errcode = '23514';
    end if;
  end if;

  if new.status = 'published' and old.status <> 'published' then
    select count(*)::integer
    into simple_block_count
    from public.training_blocks
    where training_plan_version_id = new.id
      and block_kind = 'simple';

    if simple_block_count = 0 then
      raise exception 'published_training_version_requires_blocks' using errcode = '23514';
    end if;

    new.published_at := coalesce(new.published_at, now());
  end if;

  return new;
end;
$$;

drop trigger if exists protect_training_version_state_on_versions on public.training_plan_versions;
create trigger protect_training_version_state_on_versions
before update on public.training_plan_versions
for each row execute function public.protect_training_version_state();

alter table public.training_plans enable row level security;
alter table public.training_plan_versions enable row level security;
alter table public.training_blocks enable row level security;

drop policy if exists "staff can read training plans" on public.training_plans;
create policy "staff can read training plans"
on public.training_plans
for select
to authenticated
using (
  public.has_company_role(company_id, array['admin', 'professional']::public.membership_role[])
);

drop policy if exists "staff can create scoped training plans" on public.training_plans;
create policy "staff can create scoped training plans"
on public.training_plans
for insert
to authenticated
with check (
  public.has_company_role(company_id, array['admin']::public.membership_role[])
  or (
    created_by = auth.uid()
    and public.has_company_role(company_id, array['professional']::public.membership_role[])
  )
);

drop policy if exists "staff can update scoped training plans" on public.training_plans;
create policy "staff can update scoped training plans"
on public.training_plans
for update
to authenticated
using (public.can_manage_training_plan(id))
with check (public.can_manage_training_plan(id));

drop policy if exists "staff can read training versions" on public.training_plan_versions;
create policy "staff can read training versions"
on public.training_plan_versions
for select
to authenticated
using (
  public.has_company_role(company_id, array['admin', 'professional']::public.membership_role[])
);

drop policy if exists "staff can create scoped training versions" on public.training_plan_versions;
create policy "staff can create scoped training versions"
on public.training_plan_versions
for insert
to authenticated
with check (public.can_manage_training_plan(training_plan_id));

drop policy if exists "staff can update scoped training versions" on public.training_plan_versions;
create policy "staff can update scoped training versions"
on public.training_plan_versions
for update
to authenticated
using (public.can_manage_training_plan(training_plan_id))
with check (public.can_manage_training_plan(training_plan_id));

drop policy if exists "staff can read training blocks" on public.training_blocks;
create policy "staff can read training blocks"
on public.training_blocks
for select
to authenticated
using (
  public.has_company_role(company_id, array['admin', 'professional']::public.membership_role[])
);

drop policy if exists "staff can create editable training blocks" on public.training_blocks;
create policy "staff can create editable training blocks"
on public.training_blocks
for insert
to authenticated
with check (public.can_edit_training_version(training_plan_version_id));

drop policy if exists "staff can update editable training blocks" on public.training_blocks;
create policy "staff can update editable training blocks"
on public.training_blocks
for update
to authenticated
using (public.can_edit_training_version(training_plan_version_id))
with check (public.can_edit_training_version(training_plan_version_id));

drop policy if exists "staff can delete editable training blocks" on public.training_blocks;
create policy "staff can delete editable training blocks"
on public.training_blocks
for delete
to authenticated
using (public.can_edit_training_version(training_plan_version_id));

create or replace function public.create_training_plan_draft(
  p_company_id uuid,
  p_title text,
  p_objective text default null,
  p_vessel_class public.vessel_class default 'outro',
  p_default_duration_seconds integer default null,
  p_group_label text default null,
  p_coach_id uuid default null
)
returns uuid
language plpgsql
volatile
security definer
set search_path = public, auth
as $$
declare
  new_plan_id uuid;
begin
  if not public.has_company_role(
    p_company_id,
    array['admin', 'professional']::public.membership_role[]
  ) then
    raise exception 'permission_denied' using errcode = '42501';
  end if;

  if p_coach_id is not null and not exists (
    select 1
    from public.memberships
    where company_id = p_company_id
      and user_id = p_coach_id
      and role in ('admin', 'professional')
  ) then
    raise exception 'coach_must_belong_to_company_staff' using errcode = '23514';
  end if;

  insert into public.training_plans (
    company_id,
    title,
    objective,
    vessel_class,
    default_duration_seconds,
    group_label,
    coach_id,
    created_by
  )
  values (
    p_company_id,
    p_title,
    nullif(trim(coalesce(p_objective, '')), ''),
    coalesce(p_vessel_class, 'outro'),
    p_default_duration_seconds,
    nullif(trim(coalesce(p_group_label, '')), ''),
    p_coach_id,
    auth.uid()
  )
  returning id into new_plan_id;

  return new_plan_id;
end;
$$;

create or replace function public.create_training_plan_version(
  p_training_plan_id uuid,
  p_level public.training_version_level default 'intermediario',
  p_duration_seconds integer default null,
  p_technical_notes text default null,
  p_safety_notes text default null
)
returns uuid
language plpgsql
volatile
security definer
set search_path = public, auth
as $$
declare
  target_plan public.training_plans%rowtype;
  next_version_number integer;
  new_version_id uuid;
begin
  select *
  into target_plan
  from public.training_plans
  where id = p_training_plan_id
  for update;

  if not found then
    raise exception 'training_plan_not_found' using errcode = '22023';
  end if;

  if target_plan.status = 'archived' then
    raise exception 'training_plan_archived' using errcode = '23514';
  end if;

  if not public.can_manage_training_plan(p_training_plan_id) then
    raise exception 'permission_denied' using errcode = '42501';
  end if;

  select coalesce(max(version_number), 0) + 1
  into next_version_number
  from public.training_plan_versions
  where training_plan_id = p_training_plan_id;

  insert into public.training_plan_versions (
    company_id,
    training_plan_id,
    version_number,
    level,
    duration_seconds,
    technical_notes,
    safety_notes,
    created_by
  )
  values (
    target_plan.company_id,
    target_plan.id,
    next_version_number,
    coalesce(p_level, 'intermediario'),
    p_duration_seconds,
    nullif(trim(coalesce(p_technical_notes, '')), ''),
    nullif(trim(coalesce(p_safety_notes, '')), ''),
    auth.uid()
  )
  returning id into new_version_id;

  return new_version_id;
end;
$$;

create or replace function public.save_training_blocks(
  p_training_plan_version_id uuid,
  p_blocks jsonb
)
returns void
language plpgsql
volatile
security definer
set search_path = public, auth, pg_temp
as $$
declare
  target_version public.training_plan_versions%rowtype;
  block_item jsonb;
  block_index integer := 0;
  client_key text;
  parent_client_key text;
  inserted_block_id uuid;
  parent_id uuid;
begin
  select *
  into target_version
  from public.training_plan_versions
  where id = p_training_plan_version_id
  for update;

  if not found then
    raise exception 'training_version_not_found' using errcode = '22023';
  end if;

  if not public.can_edit_training_version(p_training_plan_version_id) then
    raise exception 'permission_denied_or_version_locked' using errcode = '42501';
  end if;

  if jsonb_typeof(p_blocks) <> 'array' then
    raise exception 'training_blocks_must_be_array' using errcode = '22023';
  end if;

  create temporary table if not exists training_block_key_map (
    client_key text primary key,
    block_id uuid not null
  ) on commit drop;

  truncate table training_block_key_map;

  delete from public.training_blocks
  where training_plan_version_id = p_training_plan_version_id;

  for block_item in
    select value
    from jsonb_array_elements(p_blocks)
    where nullif(value->>'parent_client_key', '') is null
    order by coalesce((value->>'sort_order')::integer, 0)
  loop
    block_index := block_index + 1;
    client_key := coalesce(nullif(block_item->>'client_key', ''), block_index::text);

    insert into public.training_blocks (
      company_id,
      training_plan_version_id,
      block_kind,
      block_type,
      name,
      instruction,
      sort_order,
      duration_seconds,
      bora_zone,
      heart_rate_min,
      heart_rate_max,
      repeat_count,
      target_type,
      target_value
    )
    values (
      target_version.company_id,
      target_version.id,
      coalesce(block_item->>'block_kind', 'simple')::public.training_block_kind,
      nullif(block_item->>'block_type', '')::public.training_block_type,
      coalesce(nullif(block_item->>'name', ''), 'Bloco'),
      nullif(block_item->>'instruction', ''),
      coalesce((block_item->>'sort_order')::integer, block_index),
      nullif(block_item->>'duration_seconds', '')::integer,
      nullif(block_item->>'bora_zone', '')::public.bora_zone,
      nullif(block_item->>'heart_rate_min', '')::integer,
      nullif(block_item->>'heart_rate_max', '')::integer,
      nullif(block_item->>'repeat_count', '')::integer,
      coalesce(nullif(block_item->>'target_type', ''), 'time')::public.training_target_type,
      nullif(block_item->>'target_value', '')::numeric
    )
    returning id into inserted_block_id;

    insert into training_block_key_map (client_key, block_id)
    values (client_key, inserted_block_id);
  end loop;

  for block_item in
    select value
    from jsonb_array_elements(p_blocks)
    where nullif(value->>'parent_client_key', '') is not null
    order by nullif(value->>'parent_client_key', ''), coalesce((value->>'sort_order')::integer, 0)
  loop
    block_index := block_index + 1;
    client_key := coalesce(nullif(block_item->>'client_key', ''), block_index::text);
    parent_client_key := nullif(block_item->>'parent_client_key', '');

    select block_id
    into parent_id
    from training_block_key_map
    where training_block_key_map.client_key = parent_client_key;

    if parent_id is null then
      raise exception 'training_parent_client_key_not_found' using errcode = '23503';
    end if;

    insert into public.training_blocks (
      company_id,
      training_plan_version_id,
      parent_block_id,
      block_kind,
      block_type,
      name,
      instruction,
      sort_order,
      duration_seconds,
      bora_zone,
      heart_rate_min,
      heart_rate_max,
      repeat_count,
      target_type,
      target_value
    )
    values (
      target_version.company_id,
      target_version.id,
      parent_id,
      coalesce(block_item->>'block_kind', 'simple')::public.training_block_kind,
      nullif(block_item->>'block_type', '')::public.training_block_type,
      coalesce(nullif(block_item->>'name', ''), 'Bloco'),
      nullif(block_item->>'instruction', ''),
      coalesce((block_item->>'sort_order')::integer, block_index),
      nullif(block_item->>'duration_seconds', '')::integer,
      nullif(block_item->>'bora_zone', '')::public.bora_zone,
      nullif(block_item->>'heart_rate_min', '')::integer,
      nullif(block_item->>'heart_rate_max', '')::integer,
      nullif(block_item->>'repeat_count', '')::integer,
      coalesce(nullif(block_item->>'target_type', ''), 'time')::public.training_target_type,
      nullif(block_item->>'target_value', '')::numeric
    )
    returning id into inserted_block_id;

    insert into training_block_key_map (client_key, block_id)
    values (client_key, inserted_block_id);
  end loop;
end;
$$;

create or replace function public.publish_training_plan_version(
  p_training_plan_version_id uuid
)
returns void
language plpgsql
volatile
security definer
set search_path = public, auth
as $$
declare
  target_version public.training_plan_versions%rowtype;
begin
  select *
  into target_version
  from public.training_plan_versions
  where id = p_training_plan_version_id
  for update;

  if not found then
    raise exception 'training_version_not_found' using errcode = '22023';
  end if;

  if target_version.status <> 'draft' then
    raise exception 'training_version_not_draft' using errcode = '23514';
  end if;

  if not public.can_manage_training_plan(target_version.training_plan_id) then
    raise exception 'permission_denied' using errcode = '42501';
  end if;

  update public.training_plan_versions
  set status = 'published',
      published_at = now()
  where id = target_version.id;
end;
$$;

create or replace function public.archive_training_plan(
  p_training_plan_id uuid
)
returns void
language plpgsql
volatile
security definer
set search_path = public, auth
as $$
begin
  if not public.can_manage_training_plan(p_training_plan_id) then
    raise exception 'permission_denied' using errcode = '42501';
  end if;

  update public.training_plans
  set status = 'archived',
      archived_at = coalesce(archived_at, now())
  where id = p_training_plan_id;
end;
$$;

revoke execute on function public.can_manage_training_plan(uuid) from public;
revoke execute on function public.can_edit_training_version(uuid) from public;
grant execute on function public.can_manage_training_plan(uuid) to authenticated;
grant execute on function public.can_edit_training_version(uuid) to authenticated;

revoke execute on function public.create_training_plan_draft(
  uuid, text, text, public.vessel_class, integer, text, uuid
) from public;
revoke execute on function public.create_training_plan_draft(
  uuid, text, text, public.vessel_class, integer, text, uuid
) from anon;
grant execute on function public.create_training_plan_draft(
  uuid, text, text, public.vessel_class, integer, text, uuid
) to authenticated;

revoke execute on function public.create_training_plan_version(
  uuid, public.training_version_level, integer, text, text
) from public;
revoke execute on function public.create_training_plan_version(
  uuid, public.training_version_level, integer, text, text
) from anon;
grant execute on function public.create_training_plan_version(
  uuid, public.training_version_level, integer, text, text
) to authenticated;

revoke execute on function public.save_training_blocks(uuid, jsonb) from public;
revoke execute on function public.save_training_blocks(uuid, jsonb) from anon;
grant execute on function public.save_training_blocks(uuid, jsonb) to authenticated;

revoke execute on function public.publish_training_plan_version(uuid) from public;
revoke execute on function public.publish_training_plan_version(uuid) from anon;
grant execute on function public.publish_training_plan_version(uuid) to authenticated;

revoke execute on function public.archive_training_plan(uuid) from public;
revoke execute on function public.archive_training_plan(uuid) from anon;
grant execute on function public.archive_training_plan(uuid) to authenticated;
