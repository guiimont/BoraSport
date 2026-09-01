-- Foundation for the personal/community side of BoraSport.
-- Activities belong to paddlers; an organization link is optional.

alter table public.companies
  add column if not exists organization_kind text not null default 'club';

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'companies_organization_kind_check'
      and conrelid = 'public.companies'::regclass
  ) then
    alter table public.companies
      add constraint companies_organization_kind_check
      check (organization_kind in ('club', 'group'));
  end if;
end $$;

comment on column public.companies.organization_kind is
  'Organization capability profile: club for operational management, group for informal paddling communities.';

alter table public.activity_records
  alter column company_id drop not null;

alter table public.activity_records
  drop constraint if exists activity_records_company_id_fkey;

alter table public.activity_records
  add constraint activity_records_company_id_fkey
  foreign key (company_id)
  references public.companies(id)
  on delete set null;

update public.activity_records
set visibility = 'organization'
where visibility in ('team', 'company');

alter table public.activity_records
  drop constraint if exists activity_records_visibility_check;

alter table public.activity_records
  add constraint activity_records_visibility_check
  check (visibility in ('private', 'organization', 'connections', 'public'));

comment on column public.activity_records.company_id is
  'Optional organization context. The activity remains owned by user_id.';

comment on column public.activity_records.visibility is
  'Sharing intent. Community read policies for connections/public are enabled only with their matching relationship model.';

drop policy if exists "users can read own activity records" on public.activity_records;
drop policy if exists "users can insert own activity records" on public.activity_records;
drop policy if exists "users can update own activity records" on public.activity_records;
drop policy if exists "users can delete own activity records" on public.activity_records;
drop policy if exists "admins can manage company activity records" on public.activity_records;

create policy "paddlers can read own activity records"
on public.activity_records
for select
to authenticated
using ((select auth.uid()) = user_id);

create policy "members can read shared organization activities"
on public.activity_records
for select
to authenticated
using (
  visibility = 'organization'
  and company_id is not null
  and public.has_company_role(
    company_id,
    array['client', 'professional', 'admin']::public.membership_role[]
  )
);

create policy "staff can read attendance generated activities"
on public.activity_records
for select
to authenticated
using (
  provider = 'borasport'
  and company_id is not null
  and public.has_company_role(
    company_id,
    array['professional', 'admin']::public.membership_role[]
  )
);

create policy "paddlers can insert own activity records"
on public.activity_records
for insert
to authenticated
with check (
  (select auth.uid()) = user_id
  and (
    company_id is null
    or public.has_company_role(
      company_id,
      array['client', 'professional', 'admin']::public.membership_role[]
    )
  )
);

create policy "staff can insert attendance generated activities"
on public.activity_records
for insert
to authenticated
with check (
  provider = 'borasport'
  and visibility = 'private'
  and company_id is not null
  and slot_id is not null
  and public.has_company_role(
    company_id,
    array['professional', 'admin']::public.membership_role[]
  )
);

create policy "paddlers can update own activity records"
on public.activity_records
for update
to authenticated
using ((select auth.uid()) = user_id)
with check (
  (select auth.uid()) = user_id
  and (
    company_id is null
    or public.has_company_role(
      company_id,
      array['client', 'professional', 'admin']::public.membership_role[]
    )
  )
);

create policy "staff can update attendance generated activities"
on public.activity_records
for update
to authenticated
using (
  provider = 'borasport'
  and company_id is not null
  and public.has_company_role(
    company_id,
    array['professional', 'admin']::public.membership_role[]
  )
)
with check (
  provider = 'borasport'
  and visibility = 'private'
  and company_id is not null
  and slot_id is not null
  and public.has_company_role(
    company_id,
    array['professional', 'admin']::public.membership_role[]
  )
);

create policy "paddlers can delete own activity records"
on public.activity_records
for delete
to authenticated
using ((select auth.uid()) = user_id);

create policy "staff can delete attendance generated activities"
on public.activity_records
for delete
to authenticated
using (
  provider = 'borasport'
  and company_id is not null
  and public.has_company_role(
    company_id,
    array['professional', 'admin']::public.membership_role[]
  )
);

create index if not exists activity_records_shared_organization_idx
  on public.activity_records (company_id, started_at desc)
  where company_id is not null and visibility = 'organization';
