-- Weekly workout plan shown to students.
-- This is separate from slots. Slots publish when a student can book;
-- weekly_workouts publish what the student will do on each day.

create table if not exists public.weekly_workouts (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  week_start_date date not null,
  weekday integer not null,
  title text not null,
  description text,
  attachment_url text,
  attachment_name text,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint weekly_workouts_weekday_check check (weekday between 1 and 7),
  constraint weekly_workouts_company_weekday_unique unique (
    company_id,
    week_start_date,
    weekday
  )
);

create index if not exists weekly_workouts_company_week_idx
  on public.weekly_workouts (company_id, week_start_date, weekday);

alter table public.weekly_workouts enable row level security;

drop policy if exists "public can read weekly workouts" on public.weekly_workouts;
create policy "public can read weekly workouts"
on public.weekly_workouts
for select
to anon, authenticated
using (true);

drop policy if exists "admins and professionals can manage weekly workouts" on public.weekly_workouts;
create policy "admins and professionals can manage weekly workouts"
on public.weekly_workouts
for all
to authenticated
using (
  public.has_company_role(company_id, array['admin', 'professional']::public.membership_role[])
)
with check (
  public.has_company_role(company_id, array['admin', 'professional']::public.membership_role[])
);

insert into storage.buckets (id, name, public)
values ('weekly-workouts', 'weekly-workouts', true)
on conflict (id) do update set public = excluded.public;

drop policy if exists "weekly workout files are publicly readable" on storage.objects;
create policy "weekly workout files are publicly readable"
on storage.objects
for select
to anon, authenticated
using (bucket_id = 'weekly-workouts');

drop policy if exists "admins can upload weekly workout files" on storage.objects;
create policy "admins can upload weekly workout files"
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'weekly-workouts'
  and public.has_company_role(
    ((storage.foldername(name))[1])::uuid,
    array['admin', 'professional']::public.membership_role[]
  )
);
