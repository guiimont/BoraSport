-- Hardening definitivo do acesso administrativo multi-tenant.
-- O admin deixa de depender de dados demo: toda escrita exige usuario
-- autenticado com membership admin/professional no tenant.

alter table public.companies enable row level security;
alter table public.profiles enable row level security;
alter table public.memberships enable row level security;
alter table public.resources enable row level security;
alter table public.services enable row level security;
alter table public.slots enable row level security;
alter table public.bookings enable row level security;

-- Mantem leitura publica apenas do que e necessario para a pagina publica do
-- tenant. Escrita segue restrita pelas policies autenticadas da migration core.
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

-- O primeiro usuario autenticado pode assumir um tenant sem membros como admin.
-- Depois disso, somente admins existentes gerenciam memberships.
drop policy if exists "clients can join companies as themselves" on public.memberships;
create policy "clients can join companies as themselves"
on public.memberships
for insert
to authenticated
with check (
  (user_id = auth.uid() and role = 'client')
  or (
    user_id = auth.uid()
    and role = 'admin'
    and public.company_has_no_members(company_id)
  )
  or public.has_company_role(company_id, array['admin']::public.membership_role[])
);

-- Reafirma a superficie de escrita operacional.
drop policy if exists "admins and professionals can insert resources" on public.resources;
create policy "admins and professionals can insert resources"
on public.resources
for insert
to authenticated
with check (
  public.has_company_role(company_id, array['admin', 'professional']::public.membership_role[])
);

drop policy if exists "admins and professionals can insert services" on public.services;
create policy "admins and professionals can insert services"
on public.services
for insert
to authenticated
with check (
  public.has_company_role(company_id, array['admin', 'professional']::public.membership_role[])
);

drop policy if exists "admins and professionals can insert slots" on public.slots;
create policy "admins and professionals can insert slots"
on public.slots
for insert
to authenticated
with check (
  public.has_company_role(company_id, array['admin', 'professional']::public.membership_role[])
);
