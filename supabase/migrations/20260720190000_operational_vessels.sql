-- Modelo operacional de canoas.
-- Migration aditiva: preserva resources, slots e reservas existentes.

do $$
begin
  if not exists (select 1 from pg_type where typname = 'vessel_status') then
    create type public.vessel_status as enum ('disponivel', 'manutencao', 'inativa');
  end if;

  if not exists (select 1 from pg_type where typname = 'default_steerer_policy') then
    create type public.default_steerer_policy as enum (
      'instrutor',
      'aluno',
      'definir_treino'
    );
  end if;
end
$$;

alter table public.resources
  add column if not exists vessel_class public.vessel_class,
  add column if not exists vessel_status public.vessel_status not null default 'disponivel',
  add column if not exists default_steerer_policy public.default_steerer_policy,
  add column if not exists internal_code text,
  add column if not exists operational_notes text,
  add column if not exists color text;

alter table public.resources
  drop constraint if exists resources_vessel_capacity_consistency,
  add constraint resources_vessel_capacity_consistency
  check (
    vessel_class is null
    or (vessel_class in ('v1', 'oc1') and capacity_maxima = 1)
    or (vessel_class = 'v3' and capacity_maxima = 3)
    or (vessel_class = 'oc4' and capacity_maxima = 4)
    or (vessel_class in ('v6', 'oc6') and capacity_maxima = 6)
    or (vessel_class = 'outro' and capacity_maxima > 0)
  );

alter table public.resources
  drop constraint if exists resources_steerer_policy_consistency,
  add constraint resources_steerer_policy_consistency
  check (
    vessel_class is null
    or (vessel_class in ('v1', 'oc1') and default_steerer_policy is null)
    or (
      vessel_class in ('v3', 'oc4', 'v6', 'oc6')
      and default_steerer_policy is not null
    )
    or (
      vessel_class = 'outro'
      and (
        (capacity_maxima = 1 and default_steerer_policy is null)
        or (capacity_maxima > 1 and default_steerer_policy is not null)
      )
    )
  );

alter table public.resources
  drop constraint if exists resources_color_format,
  add constraint resources_color_format
  check (
    color is null
    or color ~ '^#[0-9A-Fa-f]{6}$'
  );

alter table public.resources
  drop constraint if exists resources_internal_code_length,
  add constraint resources_internal_code_length
  check (
    internal_code is null
    or char_length(internal_code) <= 80
  );

alter table public.resources
  drop constraint if exists resources_operational_notes_length,
  add constraint resources_operational_notes_length
  check (
    operational_notes is null
    or char_length(operational_notes) <= 1000
  );

create index if not exists resources_company_vessel_status_idx
  on public.resources (company_id, vessel_status);

create index if not exists resources_company_vessel_class_idx
  on public.resources (company_id, vessel_class);

create index if not exists resources_company_internal_code_idx
  on public.resources (company_id, internal_code)
  where internal_code is not null;

-- Escrita de frota fica restrita a administradores do tenant.
drop policy if exists "admins and professionals can insert resources" on public.resources;
create policy "admins can insert resources"
on public.resources
for insert
to authenticated
with check (
  public.has_company_role(company_id, array['admin']::public.membership_role[])
);

drop policy if exists "admins and professionals can update resources" on public.resources;
create policy "admins can update resources"
on public.resources
for update
to authenticated
using (
  public.has_company_role(company_id, array['admin']::public.membership_role[])
)
with check (
  public.has_company_role(company_id, array['admin']::public.membership_role[])
);

drop policy if exists "admins and professionals can delete resources" on public.resources;

-- A leitura publica continua restrita por RLS a recursos ativos, mas anon recebe
-- apenas colunas nao operacionais usadas pela agenda publica.
revoke select on public.resources from anon;
grant select (id, company_id, name, capacity_maxima, is_active, created_at, updated_at)
on public.resources
to anon;

grant select on public.resources to authenticated;
