-- Public read surface for tenant landing/scheduling pages.
-- This is needed because /clube/[slug] is a public page rendered with the anon key.

alter table public.companies
  add column if not exists type_de_negocio text not null default 'servico';

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'companies_type_de_negocio_format'
      and conrelid = 'public.companies'::regclass
  ) then
    alter table public.companies
      add constraint companies_type_de_negocio_format
      check (type_de_negocio ~ '^[a-z0-9_]+$');
  end if;
end $$;

drop policy if exists "public can read company landing data" on public.companies;
create policy "public can read company landing data"
on public.companies
for select
to anon, authenticated
using (true);

drop policy if exists "public can read active resources" on public.resources;
create policy "public can read active resources"
on public.resources
for select
to anon, authenticated
using (is_active = true);

drop policy if exists "public can read active services" on public.services;
create policy "public can read active services"
on public.services
for select
to anon, authenticated
using (is_active = true);

drop policy if exists "public can read upcoming slots" on public.slots;
create policy "public can read upcoming slots"
on public.slots
for select
to anon, authenticated
using (start_time >= now());
