-- Keep one permissive SELECT policy per training table while preserving staff
-- library access and athlete access to prescriptions linked to published sessions.

drop policy if exists "staff can read training plans" on public.training_plans;
drop policy if exists "members can read published training plans" on public.training_plans;
create policy "authorized users can read training plans"
on public.training_plans for select to authenticated using (
  public.has_company_role(company_id, array['admin','professional']::public.membership_role[])
  or private.can_read_published_training_plan(id)
);

drop policy if exists "staff can read training versions" on public.training_plan_versions;
drop policy if exists "members can read published training versions" on public.training_plan_versions;
create policy "authorized users can read training versions"
on public.training_plan_versions for select to authenticated using (
  public.has_company_role(company_id, array['admin','professional']::public.membership_role[])
  or private.can_read_published_training_version(id)
);

drop policy if exists "staff can read training blocks" on public.training_blocks;
drop policy if exists "members can read published training blocks" on public.training_blocks;
create policy "authorized users can read training blocks"
on public.training_blocks for select to authenticated using (
  public.has_company_role(company_id, array['admin','professional']::public.membership_role[])
  or private.can_read_published_training_version(training_plan_version_id)
);
