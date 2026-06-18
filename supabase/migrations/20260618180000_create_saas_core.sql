-- BoraSport SaaS core model.
-- Creates the minimum multi-club structure for clubs, schedule slots, and reservations.

create extension if not exists "pgcrypto";

create table if not exists public.clubs (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  logo_url text,
  primary_color text,
  created_at timestamptz not null default now(),

  constraint clubs_slug_format check (slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'),
  constraint clubs_primary_color_format check (
    primary_color is null or primary_color ~ '^#[0-9A-Fa-f]{6}$'
  )
);

create table if not exists public.slots (
  id uuid primary key default gen_random_uuid(),
  club_id uuid not null references public.clubs(id) on delete cascade,
  title text not null,
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  capacity integer not null,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),

  constraint slots_id_club_id_unique unique (id, club_id),
  constraint slots_capacity_positive check (capacity > 0),
  constraint slots_valid_time_range check (ends_at > starts_at)
);

create table if not exists public.reservations (
  id uuid primary key default gen_random_uuid(),
  club_id uuid not null references public.clubs(id) on delete cascade,
  slot_id uuid not null,
  customer_name text not null,
  customer_phone text not null,
  customer_email text,
  status text not null default 'pending',
  created_at timestamptz not null default now(),

  constraint reservations_slot_same_club foreign key (slot_id, club_id)
    references public.slots(id, club_id)
    on delete cascade,
  constraint reservations_status_valid check (
    status in ('pending', 'confirmed', 'cancelled')
  ),
  constraint reservations_customer_email_format check (
    customer_email is null or customer_email ~* '^[^@[:space:]]+@[^@[:space:]]+\.[^@[:space:]]+$'
  )
);

create index if not exists clubs_slug_idx on public.clubs(slug);
create index if not exists slots_club_starts_at_idx on public.slots(club_id, starts_at);
create index if not exists reservations_club_slot_idx on public.reservations(club_id, slot_id);
create index if not exists reservations_status_idx on public.reservations(status);
