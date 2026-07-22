-- Second audit pass: reduce the public RPC/storage surface and remove
-- advisor-reported RLS/index overhead without changing product permissions.

-- Public buckets are served through public object URLs. Broad SELECT policies
-- are unnecessary for downloads and expose bucket listing through the API.
drop policy if exists "landing assets are publicly readable" on storage.objects;
drop policy if exists "profile avatars are publicly readable" on storage.objects;
drop policy if exists "weekly workout files are publicly readable" on storage.objects;

-- SECURITY DEFINER helpers used only by policies/triggers must not be callable
-- anonymously as Data API RPCs. Authenticated access remains where RLS needs it.
revoke execute on function public.can_access_profile(uuid) from public, anon;
revoke execute on function public.can_edit_training_version(uuid) from anon;
revoke execute on function public.can_manage_training_plan(uuid) from anon;
revoke execute on function public.company_has_no_members(uuid) from public, anon;
revoke execute on function public.has_company_role(uuid, public.membership_role[]) from public, anon;
revoke execute on function public.has_role(uuid, text[]) from public, anon;
revoke execute on function public.hash_company_invite_token(text) from anon, authenticated;
revoke execute on function public.is_company_member(uuid) from public, anon;
revoke execute on function public.is_member_of_club(uuid) from public, anon;
revoke execute on function public.refresh_slot_occupancy(uuid) from public, anon, authenticated;
revoke execute on function public.slot_belongs_to_company(uuid, uuid) from public, anon;

-- Keep only the intentional anonymous RPC used to inspect an invite token.
grant execute on function public.get_company_invite_public_context(text) to anon, authenticated;

-- Duplicate public company policies had identical USING (true) predicates.
drop policy if exists "public can read company landing data" on public.companies;
drop policy if exists "company members can read companies" on public.companies;

-- Recreate ALL policies as write-only policies so their SELECT branch does not
-- overlap with the dedicated read policy.
drop policy if exists "admins can manage landing pages" on public.landing_pages;
create policy "admins can insert landing pages" on public.landing_pages
for insert to authenticated
with check (public.has_company_role(company_id, array['admin', 'professional']::public.membership_role[]));
create policy "admins can update landing pages" on public.landing_pages
for update to authenticated
using (public.has_company_role(company_id, array['admin', 'professional']::public.membership_role[]))
with check (public.has_company_role(company_id, array['admin', 'professional']::public.membership_role[]));
create policy "admins can delete landing pages" on public.landing_pages
for delete to authenticated
using (public.has_company_role(company_id, array['admin', 'professional']::public.membership_role[]));

drop policy if exists "admins can write operational sessions" on public.operational_sessions;
create policy "admins can insert operational sessions" on public.operational_sessions
for insert to authenticated
with check (public.has_company_role(company_id, array['admin']::public.membership_role[]));
create policy "admins can update operational sessions" on public.operational_sessions
for update to authenticated
using (public.has_company_role(company_id, array['admin']::public.membership_role[]))
with check (public.has_company_role(company_id, array['admin']::public.membership_role[]));
create policy "admins can delete operational sessions" on public.operational_sessions
for delete to authenticated
using (public.has_company_role(company_id, array['admin']::public.membership_role[]));

drop policy if exists "admins can write operational session resources" on public.operational_session_resources;
create policy "admins can insert operational session resources" on public.operational_session_resources
for insert to authenticated
with check (public.has_company_role(company_id, array['admin']::public.membership_role[]));
create policy "admins can update operational session resources" on public.operational_session_resources
for update to authenticated
using (public.has_company_role(company_id, array['admin']::public.membership_role[]))
with check (public.has_company_role(company_id, array['admin']::public.membership_role[]));
create policy "admins can delete operational session resources" on public.operational_session_resources
for delete to authenticated
using (public.has_company_role(company_id, array['admin']::public.membership_role[]));

drop policy if exists "admins and professionals can manage weekly workouts" on public.weekly_workouts;
create policy "staff can insert weekly workouts" on public.weekly_workouts
for insert to authenticated
with check (public.has_company_role(company_id, array['admin', 'professional']::public.membership_role[]));
create policy "staff can update weekly workouts" on public.weekly_workouts
for update to authenticated
using (public.has_company_role(company_id, array['admin', 'professional']::public.membership_role[]))
with check (public.has_company_role(company_id, array['admin', 'professional']::public.membership_role[]));
create policy "staff can delete weekly workouts" on public.weekly_workouts
for delete to authenticated
using (public.has_company_role(company_id, array['admin', 'professional']::public.membership_role[]));

-- Remove duplicate public-read policies left by repeated hardening migrations.
drop policy if exists "Public can read active resources" on public.resources;
drop policy if exists "Public can read active services" on public.services;
drop policy if exists "Public can read upcoming slots" on public.slots;

-- Cache auth.uid() once per statement rather than once per row.
drop policy if exists "users can create own profile" on public.profiles;
create policy "users can create own profile" on public.profiles
for insert to authenticated with check (id = (select auth.uid()));
drop policy if exists "users can update own profile" on public.profiles;
create policy "users can update own profile" on public.profiles
for update to authenticated
using (id = (select auth.uid())) with check (id = (select auth.uid()));

drop policy if exists "members can read company memberships" on public.memberships;
create policy "members can read company memberships" on public.memberships
for select to authenticated
using (user_id = (select auth.uid()) or public.is_company_member(company_id));

drop policy if exists "admins can create company memberships" on public.memberships;
create policy "admins can create company memberships" on public.memberships
for insert to authenticated
with check (
  (user_id = (select auth.uid()) and role = 'admin' and public.company_has_no_members(company_id))
  or public.has_company_role(company_id, array['admin']::public.membership_role[])
);

drop policy if exists "users can read relevant bookings" on public.bookings;
create policy "users can read relevant bookings" on public.bookings
for select to authenticated
using (
  (user_id = (select auth.uid()) and public.is_company_member(company_id))
  or public.has_company_role(company_id, array['admin', 'professional']::public.membership_role[])
);
drop policy if exists "clients can create own bookings" on public.bookings;
create policy "clients can create own bookings" on public.bookings
for insert to authenticated
with check (
  user_id = (select auth.uid()) and status = 'confirmed'
  and public.is_company_member(company_id)
  and public.slot_belongs_to_company(slot_id, company_id)
);
drop policy if exists "users can update own bookings or staff can manage" on public.bookings;
create policy "users can update own bookings or staff can manage" on public.bookings
for update to authenticated
using (
  (user_id = (select auth.uid()) and public.is_company_member(company_id))
  or public.has_company_role(company_id, array['admin', 'professional']::public.membership_role[])
)
with check (
  (user_id = (select auth.uid()) and public.is_company_member(company_id)
   and public.slot_belongs_to_company(slot_id, company_id))
  or public.has_company_role(company_id, array['admin', 'professional']::public.membership_role[])
);

drop policy if exists "admins can create client invitations" on public.company_invitations;
create policy "admins can create client invitations" on public.company_invitations
for insert to authenticated
with check (
  role = 'client' and created_by = (select auth.uid())
  and used_by is null and used_at is null and accepted_email is null
  and revoked_at is null and expires_at > now() and expires_at <= now() + interval '30 days'
  and public.has_company_role(company_id, array['admin']::public.membership_role[])
);

drop policy if exists "staff can create scoped training plans" on public.training_plans;
create policy "staff can create scoped training plans" on public.training_plans
for insert to authenticated
with check (
  public.has_company_role(company_id, array['admin']::public.membership_role[])
  or (created_by = (select auth.uid()) and public.has_company_role(company_id, array['professional']::public.membership_role[]))
);

drop policy if exists "admins can insert base schedules" on public.base_schedules;
create policy "admins can insert base schedules" on public.base_schedules
for insert to authenticated
with check (
  created_by = (select auth.uid())
  and public.has_company_role(company_id, array['admin']::public.membership_role[])
);

-- Legacy tables are preserved, but their policies can still avoid per-row auth calls.
drop policy if exists "profiles_select_self" on public.legacy_profiles_20260702193549536;
create policy "profiles_select_self" on public.legacy_profiles_20260702193549536
for select using (id = (select auth.uid()));
drop policy if exists "profiles_update_self" on public.legacy_profiles_20260702193549536;
create policy "profiles_update_self" on public.legacy_profiles_20260702193549536
for update using (id = (select auth.uid()));

drop policy if exists "memberships_select_self_or_admin" on public.legacy_memberships_20260702193004882;
create policy "memberships_select_self_or_admin" on public.legacy_memberships_20260702193004882
for select to authenticated
using (profile_id = (select auth.uid()) or public.has_role(club_id, array['owner', 'admin']));

drop policy if exists "bookings_select_self_or_staff" on public.legacy_bookings_20260702193549555;
create policy "bookings_select_self_or_staff" on public.legacy_bookings_20260702193549555
for select to authenticated
using (profile_id = (select auth.uid()) or public.has_role(club_id, array['owner', 'admin', 'staff']));
drop policy if exists "bookings_insert_self_or_staff" on public.legacy_bookings_20260702193549555;
create policy "bookings_insert_self_or_staff" on public.legacy_bookings_20260702193549555
for insert to authenticated
with check (profile_id = (select auth.uid()) or public.has_role(club_id, array['owner', 'admin', 'staff']));
drop policy if exists "bookings_update_self_or_staff" on public.legacy_bookings_20260702193549555;
create policy "bookings_update_self_or_staff" on public.legacy_bookings_20260702193549555
for update to authenticated
using (profile_id = (select auth.uid()) or public.has_role(club_id, array['owner', 'admin', 'staff']))
with check (profile_id = (select auth.uid()) or public.has_role(club_id, array['owner', 'admin', 'staff']));
drop policy if exists "bookings_delete_self_or_staff" on public.legacy_bookings_20260702193549555;
create policy "bookings_delete_self_or_staff" on public.legacy_bookings_20260702193549555
for delete to authenticated
using (profile_id = (select auth.uid()) or public.has_role(club_id, array['owner', 'admin', 'staff']));

-- Cover every foreign key reported by the advisor. Composite index column order
-- matches each FK definition exactly.
create index if not exists base_schedule_resources_resource_company_fk_idx on public.base_schedule_resources(resource_id, company_id);
create index if not exists base_schedule_resources_schedule_company_fk_idx on public.base_schedule_resources(schedule_id, company_id);
create index if not exists base_schedules_created_by_idx on public.base_schedules(created_by);
create index if not exists bookings_slot_company_idx on public.bookings(slot_id, company_id);
create index if not exists company_invitations_created_by_idx on public.company_invitations(created_by);
create index if not exists company_invitations_used_by_idx on public.company_invitations(used_by);
create index if not exists landing_pages_created_by_idx on public.landing_pages(created_by);
create index if not exists operational_session_resources_resource_company_fk_idx on public.operational_session_resources(resource_id, company_id);
create index if not exists operational_session_resources_session_company_fk_idx on public.operational_session_resources(session_id, company_id);
create index if not exists operational_sessions_base_schedule_company_fk_idx on public.operational_sessions(base_schedule_id, company_id);
create index if not exists operational_sessions_coach_id_idx on public.operational_sessions(coach_id);
create index if not exists operational_sessions_created_by_idx on public.operational_sessions(created_by);
create index if not exists operational_sessions_training_version_company_fk_idx on public.operational_sessions(training_plan_version_id, company_id);
create index if not exists slots_resource_company_idx on public.slots(resource_id, company_id);
create index if not exists slots_service_company_idx on public.slots(service_id, company_id);
create index if not exists slots_training_version_company_idx on public.slots(training_plan_version_id, company_id);
create index if not exists training_blocks_parent_idx on public.training_blocks(parent_block_id);
create index if not exists training_blocks_version_company_idx on public.training_blocks(training_plan_version_id, company_id);
create index if not exists training_plan_versions_created_by_idx on public.training_plan_versions(created_by);
create index if not exists training_plan_versions_plan_company_idx on public.training_plan_versions(training_plan_id, company_id);
create index if not exists training_plans_coach_id_idx on public.training_plans(coach_id);
create index if not exists weekly_workouts_created_by_idx on public.weekly_workouts(created_by);
create index if not exists weekly_workouts_training_version_company_idx on public.weekly_workouts(training_plan_version_id, company_id);
