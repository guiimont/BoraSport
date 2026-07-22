-- Preserve the existing public/member read semantics while ensuring each role
-- evaluates a single permissive SELECT policy per table.

drop policy if exists "members can read resources" on public.resources;
drop policy if exists "public can read active resources" on public.resources;
create policy "anonymous can read active resources" on public.resources
for select to anon using (is_active = true);
create policy "authenticated can read accessible resources" on public.resources
for select to authenticated
using (is_active = true or public.is_company_member(company_id));

drop policy if exists "members can read services" on public.services;
drop policy if exists "public can read active services" on public.services;
create policy "anonymous can read active services" on public.services
for select to anon using (is_active = true);
create policy "authenticated can read accessible services" on public.services
for select to authenticated
using (is_active = true or public.is_company_member(company_id));

drop policy if exists "members can read slots" on public.slots;
drop policy if exists "public can read upcoming slots" on public.slots;
create policy "anonymous can read upcoming slots" on public.slots
for select to anon using (start_time >= now());
create policy "authenticated can read accessible slots" on public.slots
for select to authenticated
using (start_time >= now() or public.is_company_member(company_id));
