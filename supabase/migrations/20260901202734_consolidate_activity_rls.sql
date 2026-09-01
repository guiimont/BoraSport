-- Consolidate activity policies so each authenticated action evaluates a
-- single permissive predicate while preserving the approved access model.

drop policy if exists "paddlers can read own activity records" on public.activity_records;
drop policy if exists "members can read shared organization activities" on public.activity_records;
drop policy if exists "staff can read attendance generated activities" on public.activity_records;
drop policy if exists "paddlers can insert own activity records" on public.activity_records;
drop policy if exists "staff can insert attendance generated activities" on public.activity_records;
drop policy if exists "paddlers can update own activity records" on public.activity_records;
drop policy if exists "staff can update attendance generated activities" on public.activity_records;
drop policy if exists "paddlers can delete own activity records" on public.activity_records;
drop policy if exists "staff can delete attendance generated activities" on public.activity_records;

create policy "authorized users can read activity records"
on public.activity_records
for select
to authenticated
using (
  (select auth.uid()) = user_id
  or (
    visibility = 'organization'
    and company_id is not null
    and public.has_company_role(
      company_id,
      array['client', 'professional', 'admin']::public.membership_role[]
    )
  )
  or (
    provider = 'borasport'
    and company_id is not null
    and public.has_company_role(
      company_id,
      array['professional', 'admin']::public.membership_role[]
    )
  )
);

create policy "authorized users can insert activity records"
on public.activity_records
for insert
to authenticated
with check (
  (
    (select auth.uid()) = user_id
    and (
      company_id is null
      or public.has_company_role(
        company_id,
        array['client', 'professional', 'admin']::public.membership_role[]
      )
    )
  )
  or (
    provider = 'borasport'
    and visibility = 'private'
    and company_id is not null
    and slot_id is not null
    and public.has_company_role(
      company_id,
      array['professional', 'admin']::public.membership_role[]
    )
  )
);

create policy "authorized users can update activity records"
on public.activity_records
for update
to authenticated
using (
  (select auth.uid()) = user_id
  or (
    provider = 'borasport'
    and company_id is not null
    and public.has_company_role(
      company_id,
      array['professional', 'admin']::public.membership_role[]
    )
  )
)
with check (
  (
    (select auth.uid()) = user_id
    and (
      company_id is null
      or public.has_company_role(
        company_id,
        array['client', 'professional', 'admin']::public.membership_role[]
      )
    )
  )
  or (
    provider = 'borasport'
    and visibility = 'private'
    and company_id is not null
    and slot_id is not null
    and public.has_company_role(
      company_id,
      array['professional', 'admin']::public.membership_role[]
    )
  )
);

create policy "authorized users can delete activity records"
on public.activity_records
for delete
to authenticated
using (
  (select auth.uid()) = user_id
  or (
    provider = 'borasport'
    and company_id is not null
    and public.has_company_role(
      company_id,
      array['professional', 'admin']::public.membership_role[]
    )
  )
);
