-- Close the first athlete-coach loop: published weekly prescriptions and a
-- minimal post-workout self-report owned by the athlete.

alter table public.activity_records
  add column if not exists athlete_rpe smallint,
  add column if not exists athlete_feeling text,
  add column if not exists athlete_pain boolean,
  add column if not exists athlete_notes text,
  add column if not exists athlete_feedback_at timestamptz;

alter table public.activity_records
  drop constraint if exists activity_records_athlete_rpe_check,
  add constraint activity_records_athlete_rpe_check check (athlete_rpe is null or athlete_rpe between 1 and 10),
  drop constraint if exists activity_records_athlete_feeling_check,
  add constraint activity_records_athlete_feeling_check check (athlete_feeling is null or athlete_feeling in ('great','good','neutral','tired','exhausted')),
  drop constraint if exists activity_records_athlete_notes_length_check,
  add constraint activity_records_athlete_notes_length_check check (athlete_notes is null or length(athlete_notes) <= 600);

comment on column public.activity_records.athlete_rpe is 'Athlete-owned perceived exertion from 1 to 10.';
comment on column public.activity_records.athlete_pain is 'Athlete signal of pain or discomfort; visible only to the athlete and authorized staff for the linked company.';

create schema if not exists private;
revoke all on schema private from public, anon;
grant usage on schema private to authenticated;

create or replace function private.can_read_published_training_version(target_version_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.training_plan_versions version
    join public.operational_sessions session on session.training_plan_version_id = version.id
    where version.id = target_version_id
      and version.status = 'published'
      and session.status = 'published'
      and public.has_company_role(version.company_id, array['client']::public.membership_role[])
  );
$$;

create or replace function private.can_read_published_training_plan(target_plan_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.training_plan_versions version
    join public.operational_sessions session on session.training_plan_version_id = version.id
    where version.training_plan_id = target_plan_id
      and version.status = 'published'
      and session.status = 'published'
      and public.has_company_role(version.company_id, array['client']::public.membership_role[])
  );
$$;

revoke execute on function private.can_read_published_training_version(uuid) from public, anon;
revoke execute on function private.can_read_published_training_plan(uuid) from public, anon;
grant execute on function private.can_read_published_training_version(uuid) to authenticated;
grant execute on function private.can_read_published_training_plan(uuid) to authenticated;

drop policy if exists "members can read published training plans" on public.training_plans;
create policy "members can read published training plans" on public.training_plans
for select to authenticated using (
  private.can_read_published_training_plan(id)
);

drop policy if exists "members can read published training versions" on public.training_plan_versions;
create policy "members can read published training versions" on public.training_plan_versions
for select to authenticated using (
  private.can_read_published_training_version(id)
);

drop policy if exists "members can read published training blocks" on public.training_blocks;
create policy "members can read published training blocks" on public.training_blocks
for select to authenticated using (
  private.can_read_published_training_version(training_plan_version_id)
);

drop policy if exists "authorized users can read activity records" on public.activity_records;
create policy "authorized users can read activity records" on public.activity_records
for select to authenticated using (
  (select auth.uid()) = user_id
  or (visibility = 'organization' and company_id is not null and public.has_company_role(company_id, array['client','professional','admin']::public.membership_role[]))
  or (company_id is not null and operational_session_id is not null and public.has_company_role(company_id, array['professional','admin']::public.membership_role[]))
  or (provider = 'borasport' and company_id is not null and public.has_company_role(company_id, array['professional','admin']::public.membership_role[]))
);

grant select on public.training_plans, public.training_plan_versions, public.training_blocks to authenticated;
