-- Bora scheduling engine
-- Multi-tenant, vocabulary-driven scheduling model for Supabase/PostgreSQL.
-- This migration is intentionally agnostic: the same tables serve canoe clubs,
-- salons, studios, clinics, schools, and other appointment-based businesses.

create extension if not exists "pgcrypto";

-- If this project already has early/experimental tables with incompatible
-- shapes, preserve them as legacy_* before creating the new engine. This avoids
-- "column does not exist" failures caused by create table if not exists reusing
-- an old table with a different schema.
do $$
declare
  legacy_name text;
begin
  if to_regclass('public.companies') is not null
     and exists (
       select required.column_name
       from (values
         ('id'), ('name'), ('slug'), ('logo_url'), ('theme_colors'),
         ('vocabulary_config'), ('type_de_negocio'), ('created_at'), ('updated_at')
       ) as required(column_name)
       except
       select column_name
       from information_schema.columns
       where table_schema = 'public'
         and table_name = 'companies'
     ) then
    legacy_name := 'legacy_companies_' || to_char(clock_timestamp(), 'YYYYMMDDHH24MISSMS');
    execute format('alter table public.companies rename to %I', legacy_name);
  end if;

  if to_regclass('public.profiles') is not null
     and exists (
       select required.column_name
       from (values
         ('id'), ('name'), ('phone'), ('avatar_url'), ('created_at'), ('updated_at')
       ) as required(column_name)
       except
       select column_name
       from information_schema.columns
       where table_schema = 'public'
         and table_name = 'profiles'
     ) then
    legacy_name := 'legacy_profiles_' || to_char(clock_timestamp(), 'YYYYMMDDHH24MISSMS');
    execute format('alter table public.profiles rename to %I', legacy_name);
  end if;

  if to_regclass('public.memberships') is not null
     and exists (
       select required.column_name
       from (values
         ('id'), ('user_id'), ('company_id'), ('role'), ('created_at'), ('updated_at')
       ) as required(column_name)
       except
       select column_name
       from information_schema.columns
       where table_schema = 'public'
         and table_name = 'memberships'
     ) then
    legacy_name := 'legacy_memberships_' || to_char(clock_timestamp(), 'YYYYMMDDHH24MISSMS');
    execute format('alter table public.memberships rename to %I', legacy_name);
  end if;

  if to_regclass('public.resources') is not null
     and exists (
       select required.column_name
       from (values
         ('id'), ('company_id'), ('name'), ('capacity_maxima'), ('is_active'),
         ('created_at'), ('updated_at')
       ) as required(column_name)
       except
       select column_name
       from information_schema.columns
       where table_schema = 'public'
         and table_name = 'resources'
     ) then
    legacy_name := 'legacy_resources_' || to_char(clock_timestamp(), 'YYYYMMDDHH24MISSMS');
    execute format('alter table public.resources rename to %I', legacy_name);
  end if;

  if to_regclass('public.services') is not null
     and exists (
       select required.column_name
       from (values
         ('id'), ('company_id'), ('name'), ('description'), ('duration_minutes'),
         ('price'), ('is_active'), ('created_at'), ('updated_at')
       ) as required(column_name)
       except
       select column_name
       from information_schema.columns
       where table_schema = 'public'
         and table_name = 'services'
     ) then
    legacy_name := 'legacy_services_' || to_char(clock_timestamp(), 'YYYYMMDDHH24MISSMS');
    execute format('alter table public.services rename to %I', legacy_name);
  end if;

  if to_regclass('public.slots') is not null
     and exists (
       select required.column_name
       from (values
         ('id'), ('company_id'), ('service_id'), ('resource_id'),
         ('professional_id'), ('start_time'), ('end_time'), ('spots_total'),
         ('spots_occupied'), ('created_at'), ('updated_at')
       ) as required(column_name)
       except
       select column_name
       from information_schema.columns
       where table_schema = 'public'
         and table_name = 'slots'
     ) then
    legacy_name := 'legacy_slots_' || to_char(clock_timestamp(), 'YYYYMMDDHH24MISSMS');
    execute format('alter table public.slots rename to %I', legacy_name);
  end if;

  if to_regclass('public.bookings') is not null
     and exists (
       select required.column_name
       from (values
         ('id'), ('slot_id'), ('user_id'), ('company_id'), ('status'),
         ('created_at'), ('updated_at')
       ) as required(column_name)
       except
       select column_name
       from information_schema.columns
       where table_schema = 'public'
         and table_name = 'bookings'
     ) then
    legacy_name := 'legacy_bookings_' || to_char(clock_timestamp(), 'YYYYMMDDHH24MISSMS');
    execute format('alter table public.bookings rename to %I', legacy_name);
  end if;
end $$;

-- ---------------------------------------------------------------------------
-- Enums
-- ---------------------------------------------------------------------------

do $$
begin
  if not exists (select 1 from pg_type where typname = 'membership_role') then
    create type public.membership_role as enum ('client', 'professional', 'admin');
  end if;

  if not exists (select 1 from pg_type where typname = 'booking_status') then
    create type public.booking_status as enum ('confirmed', 'cancelled', 'attended', 'missed');
  end if;
end $$;

-- ---------------------------------------------------------------------------
-- Companies
-- Tenant root. The vocabulary_config JSONB is the no-code dictionary used by
-- the frontend to render domain-specific wording without per-client code forks.
-- ---------------------------------------------------------------------------

create table if not exists public.companies (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null,
  logo_url text,
  theme_colors jsonb not null default '{
    "primary": "#0b7b71",
    "secondary": "#063b56",
    "accent": "#f4a43c",
    "background": "#f7fbfa"
  }'::jsonb,
  vocabulary_config jsonb not null default '{
    "resource_label": "Recurso",
    "professional_label": "Profissional",
    "service_label": "Servico",
    "booking_label": "Agendamento"
  }'::jsonb,
  type_de_negocio text not null default 'servico',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint companies_slug_unique unique (slug),
  constraint companies_slug_format check (slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'),
  constraint companies_type_de_negocio_format check (
    type_de_negocio ~ '^[a-z0-9_]+$'
  ),
  constraint companies_theme_colors_is_object check (jsonb_typeof(theme_colors) = 'object'),
  constraint companies_vocabulary_config_is_object check (jsonb_typeof(vocabulary_config) = 'object')
);

comment on table public.companies is
  'Tenant root. Stores brand settings and vocabulary_config for frictionless domain customization.';
comment on column public.companies.vocabulary_config is
  'Client dictionary. Example canoe: {"resource_label":"Canoa","professional_label":"Steerer","service_label":"Treino"}.';

-- ---------------------------------------------------------------------------
-- Profiles and memberships
-- ---------------------------------------------------------------------------

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  name text not null,
  phone text,
  avatar_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.memberships (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  company_id uuid not null references public.companies(id) on delete cascade,
  role public.membership_role not null default 'client',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint memberships_user_company_unique unique (user_id, company_id)
);

-- ---------------------------------------------------------------------------
-- Abstract resources and services
-- resources: limited physical assets/spaces, e.g. Canoa, Cadeira, Sala.
-- services: sellable/offered activity, e.g. Treino, Corte, Consulta.
-- ---------------------------------------------------------------------------

create table if not exists public.resources (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  name text not null,
  capacity_maxima integer not null default 1,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint resources_capacity_positive check (capacity_maxima > 0)
);

create table if not exists public.services (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  name text not null,
  description text,
  duration_minutes integer not null,
  price numeric(12, 2) not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint services_duration_positive check (duration_minutes > 0),
  constraint services_price_non_negative check (price >= 0)
);

-- Composite uniqueness supports same-company foreign keys from slots.
create unique index if not exists resources_id_company_id_unique
  on public.resources (id, company_id);

create unique index if not exists services_id_company_id_unique
  on public.services (id, company_id);

-- ---------------------------------------------------------------------------
-- Scheduling engine
-- slots can be generated automatically or created manually.
-- bookings represent client reservations into a slot.
-- ---------------------------------------------------------------------------

create table if not exists public.slots (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  service_id uuid not null,
  resource_id uuid,
  professional_id uuid references public.profiles(id) on delete set null,
  start_time timestamptz not null,
  end_time timestamptz not null,
  spots_total integer not null,
  spots_occupied integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint slots_time_range_valid check (end_time > start_time),
  constraint slots_spots_total_positive check (spots_total > 0),
  constraint slots_spots_occupied_valid check (
    spots_occupied >= 0 and spots_occupied <= spots_total
  ),
  constraint slots_service_same_company foreign key (service_id, company_id)
    references public.services(id, company_id)
    on delete restrict,
  constraint slots_resource_same_company foreign key (resource_id, company_id)
    references public.resources(id, company_id)
    on delete restrict
);

-- Required by bookings.slot_id + bookings.company_id composite FK.
create unique index if not exists slots_id_company_id_unique
  on public.slots (id, company_id);

create table if not exists public.bookings (
  id uuid primary key default gen_random_uuid(),
  slot_id uuid not null references public.slots(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  company_id uuid not null references public.companies(id) on delete cascade,
  status public.booking_status not null default 'confirmed',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint bookings_slot_company_unique foreign key (slot_id, company_id)
    references public.slots(id, company_id)
    on delete cascade
);

-- Essential constraint: one active reservation per user in the same slot.
create unique index if not exists bookings_one_active_per_user_slot_idx
  on public.bookings (slot_id, user_id)
  where status = 'confirmed';

-- ---------------------------------------------------------------------------
-- Performance indexes
-- ---------------------------------------------------------------------------

create index if not exists companies_slug_idx on public.companies (slug);

create index if not exists memberships_user_id_idx on public.memberships (user_id);
create index if not exists memberships_company_id_idx on public.memberships (company_id);
create index if not exists memberships_company_role_idx on public.memberships (company_id, role);

create index if not exists resources_company_id_idx on public.resources (company_id);
create index if not exists resources_company_active_idx on public.resources (company_id, is_active);

create index if not exists services_company_id_idx on public.services (company_id);
create index if not exists services_company_active_idx on public.services (company_id, is_active);

create index if not exists slots_company_id_idx on public.slots (company_id);
create index if not exists slots_company_start_time_idx on public.slots (company_id, start_time);
create index if not exists slots_service_id_idx on public.slots (service_id);
create index if not exists slots_resource_id_idx on public.slots (resource_id);
create index if not exists slots_professional_id_idx on public.slots (professional_id);

create index if not exists bookings_company_id_idx on public.bookings (company_id);
create index if not exists bookings_user_id_idx on public.bookings (user_id);
create index if not exists bookings_slot_id_idx on public.bookings (slot_id);
create index if not exists bookings_user_company_idx on public.bookings (user_id, company_id);
create index if not exists bookings_slot_status_idx on public.bookings (slot_id, status);

-- ---------------------------------------------------------------------------
-- Updated-at trigger
-- ---------------------------------------------------------------------------

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists set_companies_updated_at on public.companies;
create trigger set_companies_updated_at
before update on public.companies
for each row execute function public.set_updated_at();

drop trigger if exists set_profiles_updated_at on public.profiles;
create trigger set_profiles_updated_at
before update on public.profiles
for each row execute function public.set_updated_at();

drop trigger if exists set_memberships_updated_at on public.memberships;
create trigger set_memberships_updated_at
before update on public.memberships
for each row execute function public.set_updated_at();

drop trigger if exists set_resources_updated_at on public.resources;
create trigger set_resources_updated_at
before update on public.resources
for each row execute function public.set_updated_at();

drop trigger if exists set_services_updated_at on public.services;
create trigger set_services_updated_at
before update on public.services
for each row execute function public.set_updated_at();

drop trigger if exists set_slots_updated_at on public.slots;
create trigger set_slots_updated_at
before update on public.slots
for each row execute function public.set_updated_at();

drop trigger if exists set_bookings_updated_at on public.bookings;
create trigger set_bookings_updated_at
before update on public.bookings
for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- Slot occupancy maintenance
-- Keeps slots.spots_occupied consistent with confirmed bookings.
-- ---------------------------------------------------------------------------

create or replace function public.refresh_slot_occupancy(target_slot_id uuid)
returns void
language sql
security definer
set search_path = public
as $$
  update public.slots
  set spots_occupied = (
    select count(*)::integer
    from public.bookings
    where slot_id = target_slot_id
      and status = 'confirmed'
  )
  where id = target_slot_id;
$$;

create or replace function public.sync_slot_occupancy()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_op in ('INSERT', 'UPDATE') then
    perform public.refresh_slot_occupancy(new.slot_id);
  end if;

  if tg_op in ('UPDATE', 'DELETE') then
    perform public.refresh_slot_occupancy(old.slot_id);
  end if;

  return null;
end;
$$;

drop trigger if exists sync_slot_occupancy_on_bookings on public.bookings;
create trigger sync_slot_occupancy_on_bookings
after insert or update or delete on public.bookings
for each row execute function public.sync_slot_occupancy();

-- ---------------------------------------------------------------------------
-- Booking guard
-- Prevents confirmed bookings from exceeding slot capacity.
-- ---------------------------------------------------------------------------

create or replace function public.ensure_slot_capacity()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  confirmed_count integer;
  slot_capacity integer;
begin
  if new.status <> 'confirmed' then
    return new;
  end if;

  select spots_total into slot_capacity
  from public.slots
  where id = new.slot_id
  for update;

  if slot_capacity is null then
    raise exception 'Slot % does not exist', new.slot_id;
  end if;

  select count(*)::integer into confirmed_count
  from public.bookings
  where slot_id = new.slot_id
    and status = 'confirmed'
    and id <> coalesce(new.id, '00000000-0000-0000-0000-000000000000'::uuid);

  if confirmed_count >= slot_capacity then
    raise exception 'Slot is full';
  end if;

  return new;
end;
$$;

drop trigger if exists ensure_slot_capacity_on_bookings on public.bookings;
create trigger ensure_slot_capacity_on_bookings
before insert or update of status, slot_id on public.bookings
for each row execute function public.ensure_slot_capacity();

-- Ensures the optional professional assigned to a slot belongs to the same
-- company and has staff privileges there.
create or replace function public.ensure_slot_professional_membership()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.professional_id is null then
    return new;
  end if;

  if not exists (
    select 1
    from public.memberships
    where company_id = new.company_id
      and user_id = new.professional_id
      and role in ('professional', 'admin')
  ) then
    raise exception 'Slot professional must be a professional or admin of the same company';
  end if;

  return new;
end;
$$;

drop trigger if exists ensure_slot_professional_membership_on_slots on public.slots;
create trigger ensure_slot_professional_membership_on_slots
before insert or update of company_id, professional_id on public.slots
for each row execute function public.ensure_slot_professional_membership();

-- ---------------------------------------------------------------------------
-- RLS helper functions
-- SECURITY DEFINER avoids recursive policies when checking memberships.
-- ---------------------------------------------------------------------------

create or replace function public.has_company_role(
  target_company_id uuid,
  allowed_roles public.membership_role[]
)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.memberships
    where company_id = target_company_id
      and user_id = auth.uid()
      and role = any(allowed_roles)
  );
$$;

create or replace function public.is_company_member(target_company_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.has_company_role(
    target_company_id,
    array['client', 'professional', 'admin']::public.membership_role[]
  );
$$;

create or replace function public.can_access_profile(target_profile_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select target_profile_id = auth.uid()
    or exists (
      select 1
      from public.memberships mine
      join public.memberships theirs
        on theirs.company_id = mine.company_id
      where mine.user_id = auth.uid()
        and theirs.user_id = target_profile_id
    );
$$;

create or replace function public.company_has_no_members(target_company_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select not exists (
    select 1
    from public.memberships
    where company_id = target_company_id
  );
$$;

create or replace function public.slot_belongs_to_company(
  target_slot_id uuid,
  target_company_id uuid
)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.slots
    where id = target_slot_id
      and company_id = target_company_id
  );
$$;

-- ---------------------------------------------------------------------------
-- Enable RLS on every application table.
-- ---------------------------------------------------------------------------

alter table public.companies enable row level security;
alter table public.profiles enable row level security;
alter table public.memberships enable row level security;
alter table public.resources enable row level security;
alter table public.services enable row level security;
alter table public.slots enable row level security;
alter table public.bookings enable row level security;

-- ---------------------------------------------------------------------------
-- RLS policies: companies
-- ---------------------------------------------------------------------------

drop policy if exists "company members can read companies" on public.companies;
create policy "company members can read companies"
on public.companies
for select
to authenticated
using (public.is_company_member(id));

drop policy if exists "authenticated users can create companies" on public.companies;
create policy "authenticated users can create companies"
on public.companies
for insert
to authenticated
with check (true);

drop policy if exists "company admins can update companies" on public.companies;
create policy "company admins can update companies"
on public.companies
for update
to authenticated
using (public.has_company_role(id, array['admin']::public.membership_role[]))
with check (public.has_company_role(id, array['admin']::public.membership_role[]));

drop policy if exists "company admins can delete companies" on public.companies;
create policy "company admins can delete companies"
on public.companies
for delete
to authenticated
using (public.has_company_role(id, array['admin']::public.membership_role[]));

-- ---------------------------------------------------------------------------
-- RLS policies: profiles
-- ---------------------------------------------------------------------------

drop policy if exists "users can read accessible profiles" on public.profiles;
create policy "users can read accessible profiles"
on public.profiles
for select
to authenticated
using (public.can_access_profile(id));

drop policy if exists "users can create own profile" on public.profiles;
create policy "users can create own profile"
on public.profiles
for insert
to authenticated
with check (id = auth.uid());

drop policy if exists "users can update own profile" on public.profiles;
create policy "users can update own profile"
on public.profiles
for update
to authenticated
using (id = auth.uid())
with check (id = auth.uid());

-- ---------------------------------------------------------------------------
-- RLS policies: memberships
-- ---------------------------------------------------------------------------

drop policy if exists "members can read company memberships" on public.memberships;
create policy "members can read company memberships"
on public.memberships
for select
to authenticated
using (
  user_id = auth.uid()
  or public.is_company_member(company_id)
);

drop policy if exists "clients can join companies as themselves" on public.memberships;
create policy "clients can join companies as themselves"
on public.memberships
for insert
to authenticated
with check (
  (user_id = auth.uid() and role = 'client')
  or (
    user_id = auth.uid()
    and role = 'admin'
    and public.company_has_no_members(company_id)
  )
  or public.has_company_role(company_id, array['admin']::public.membership_role[])
);

drop policy if exists "admins can update company memberships" on public.memberships;
create policy "admins can update company memberships"
on public.memberships
for update
to authenticated
using (public.has_company_role(company_id, array['admin']::public.membership_role[]))
with check (public.has_company_role(company_id, array['admin']::public.membership_role[]));

drop policy if exists "admins can delete company memberships" on public.memberships;
create policy "admins can delete company memberships"
on public.memberships
for delete
to authenticated
using (public.has_company_role(company_id, array['admin']::public.membership_role[]));

-- ---------------------------------------------------------------------------
-- RLS policies: resources
-- ---------------------------------------------------------------------------

drop policy if exists "members can read resources" on public.resources;
create policy "members can read resources"
on public.resources
for select
to authenticated
using (public.is_company_member(company_id));

drop policy if exists "admins and professionals can insert resources" on public.resources;
create policy "admins and professionals can insert resources"
on public.resources
for insert
to authenticated
with check (
  public.has_company_role(company_id, array['admin', 'professional']::public.membership_role[])
);

drop policy if exists "admins and professionals can update resources" on public.resources;
create policy "admins and professionals can update resources"
on public.resources
for update
to authenticated
using (
  public.has_company_role(company_id, array['admin', 'professional']::public.membership_role[])
)
with check (
  public.has_company_role(company_id, array['admin', 'professional']::public.membership_role[])
);

drop policy if exists "admins and professionals can delete resources" on public.resources;
create policy "admins and professionals can delete resources"
on public.resources
for delete
to authenticated
using (
  public.has_company_role(company_id, array['admin', 'professional']::public.membership_role[])
);

-- ---------------------------------------------------------------------------
-- RLS policies: services
-- ---------------------------------------------------------------------------

drop policy if exists "members can read services" on public.services;
create policy "members can read services"
on public.services
for select
to authenticated
using (public.is_company_member(company_id));

drop policy if exists "admins and professionals can insert services" on public.services;
create policy "admins and professionals can insert services"
on public.services
for insert
to authenticated
with check (
  public.has_company_role(company_id, array['admin', 'professional']::public.membership_role[])
);

drop policy if exists "admins and professionals can update services" on public.services;
create policy "admins and professionals can update services"
on public.services
for update
to authenticated
using (
  public.has_company_role(company_id, array['admin', 'professional']::public.membership_role[])
)
with check (
  public.has_company_role(company_id, array['admin', 'professional']::public.membership_role[])
);

drop policy if exists "admins and professionals can delete services" on public.services;
create policy "admins and professionals can delete services"
on public.services
for delete
to authenticated
using (
  public.has_company_role(company_id, array['admin', 'professional']::public.membership_role[])
);

-- ---------------------------------------------------------------------------
-- RLS policies: slots
-- ---------------------------------------------------------------------------

drop policy if exists "members can read slots" on public.slots;
create policy "members can read slots"
on public.slots
for select
to authenticated
using (public.is_company_member(company_id));

drop policy if exists "admins and professionals can insert slots" on public.slots;
create policy "admins and professionals can insert slots"
on public.slots
for insert
to authenticated
with check (
  public.has_company_role(company_id, array['admin', 'professional']::public.membership_role[])
);

drop policy if exists "admins and professionals can update slots" on public.slots;
create policy "admins and professionals can update slots"
on public.slots
for update
to authenticated
using (
  public.has_company_role(company_id, array['admin', 'professional']::public.membership_role[])
)
with check (
  public.has_company_role(company_id, array['admin', 'professional']::public.membership_role[])
);

drop policy if exists "admins and professionals can delete slots" on public.slots;
create policy "admins and professionals can delete slots"
on public.slots
for delete
to authenticated
using (
  public.has_company_role(company_id, array['admin', 'professional']::public.membership_role[])
);

-- ---------------------------------------------------------------------------
-- RLS policies: bookings
-- Clients manage only their own bookings. Admins/professionals manage bookings
-- in companies where they belong.
-- ---------------------------------------------------------------------------

drop policy if exists "users can read relevant bookings" on public.bookings;
create policy "users can read relevant bookings"
on public.bookings
for select
to authenticated
using (
  (user_id = auth.uid() and public.is_company_member(company_id))
  or public.has_company_role(company_id, array['admin', 'professional']::public.membership_role[])
);

drop policy if exists "clients can create own bookings" on public.bookings;
create policy "clients can create own bookings"
on public.bookings
for insert
to authenticated
with check (
  user_id = auth.uid()
  and status = 'confirmed'
  and public.is_company_member(company_id)
  and public.slot_belongs_to_company(slot_id, company_id)
);

drop policy if exists "users can update own bookings or staff can manage" on public.bookings;
create policy "users can update own bookings or staff can manage"
on public.bookings
for update
to authenticated
using (
  (user_id = auth.uid() and public.is_company_member(company_id))
  or public.has_company_role(company_id, array['admin', 'professional']::public.membership_role[])
)
with check (
  (
    user_id = auth.uid()
    and public.is_company_member(company_id)
    and public.slot_belongs_to_company(slot_id, company_id)
  )
  or public.has_company_role(company_id, array['admin', 'professional']::public.membership_role[])
);

drop policy if exists "staff can delete bookings" on public.bookings;
create policy "staff can delete bookings"
on public.bookings
for delete
to authenticated
using (
  public.has_company_role(company_id, array['admin', 'professional']::public.membership_role[])
);
