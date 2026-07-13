-- Generic sport activity records for GPS watches and wearable imports.
-- This is intentionally multi-tenant and modality-agnostic: canoe, crossfit,
-- pilates, futvolei and future sports can store their own metrics in JSONB.

create table if not exists public.activity_records (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  slot_id uuid references public.slots(id) on delete set null,
  provider text not null default 'manual',
  external_id text,
  activity_type text not null default 'training',
  title text,
  started_at timestamptz not null,
  duration_seconds integer,
  distance_meters numeric(12, 2),
  average_speed numeric(10, 3),
  max_speed numeric(10, 3),
  average_heart_rate integer,
  max_heart_rate integer,
  calories integer,
  elevation_gain_meters numeric(10, 2),
  metrics jsonb not null default '{}'::jsonb,
  source_payload jsonb,
  visibility text not null default 'private',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint activity_records_duration_positive check (
    duration_seconds is null or duration_seconds > 0
  ),
  constraint activity_records_distance_positive check (
    distance_meters is null or distance_meters >= 0
  ),
  constraint activity_records_visibility_check check (
    visibility in ('private', 'team', 'company')
  ),
  constraint activity_records_provider_external_unique unique (
    provider,
    external_id,
    user_id
  )
);

create index if not exists activity_records_company_started_idx
  on public.activity_records (company_id, started_at desc);

create index if not exists activity_records_user_started_idx
  on public.activity_records (user_id, started_at desc);

create index if not exists activity_records_slot_idx
  on public.activity_records (slot_id)
  where slot_id is not null;

alter table public.activity_records enable row level security;

drop policy if exists "users can read own activity records" on public.activity_records;
create policy "users can read own activity records"
on public.activity_records
for select
to authenticated
using (
  user_id = auth.uid()
  or (
    visibility in ('team', 'company')
    and public.has_company_role(company_id, array['client', 'professional', 'admin']::public.membership_role[])
  )
);

drop policy if exists "users can insert own activity records" on public.activity_records;
create policy "users can insert own activity records"
on public.activity_records
for insert
to authenticated
with check (
  user_id = auth.uid()
  and public.has_company_role(company_id, array['client', 'professional', 'admin']::public.membership_role[])
);

drop policy if exists "users can update own activity records" on public.activity_records;
create policy "users can update own activity records"
on public.activity_records
for update
to authenticated
using (user_id = auth.uid())
with check (user_id = auth.uid());

drop policy if exists "users can delete own activity records" on public.activity_records;
create policy "users can delete own activity records"
on public.activity_records
for delete
to authenticated
using (user_id = auth.uid());

drop policy if exists "admins can manage company activity records" on public.activity_records;
create policy "admins can manage company activity records"
on public.activity_records
for all
to authenticated
using (
  public.has_company_role(company_id, array['admin', 'professional']::public.membership_role[])
)
with check (
  public.has_company_role(company_id, array['admin', 'professional']::public.membership_role[])
);
