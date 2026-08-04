-- Classifica o formato do treino sem vincula-lo a uma embarcacao.

do $$
begin
  if not exists (select 1 from pg_type where typname = 'training_mode') then
    create type public.training_mode as enum ('individual', 'coletivo');
  end if;
end $$;

alter table public.training_plans
  add column if not exists training_mode public.training_mode;

update public.training_plans
set training_mode = case
  when vessel_class in ('v1', 'oc1') then 'individual'::public.training_mode
  else 'coletivo'::public.training_mode
end
where training_mode is null;

alter table public.training_plans
  alter column training_mode set default 'coletivo',
  alter column training_mode set not null;

create or replace function public.create_training_plan_draft(
  p_company_id uuid,
  p_title text,
  p_objective text default null,
  p_training_mode public.training_mode default 'coletivo',
  p_default_duration_seconds integer default null,
  p_group_label text default null,
  p_coach_id uuid default null
)
returns uuid
language plpgsql
volatile
security definer
set search_path = public, auth
as $$
declare
  new_plan_id uuid;
begin
  if not public.has_company_role(
    p_company_id,
    array['admin', 'professional']::public.membership_role[]
  ) then
    raise exception 'permission_denied' using errcode = '42501';
  end if;

  if p_coach_id is not null and not exists (
    select 1
    from public.memberships
    where company_id = p_company_id
      and user_id = p_coach_id
      and role in ('admin', 'professional')
  ) then
    raise exception 'coach_must_belong_to_company_staff' using errcode = '23514';
  end if;

  insert into public.training_plans (
    company_id, title, objective, training_mode, default_duration_seconds,
    group_label, coach_id, created_by
  )
  values (
    p_company_id, p_title, nullif(trim(coalesce(p_objective, '')), ''),
    coalesce(p_training_mode, 'coletivo'), p_default_duration_seconds,
    nullif(trim(coalesce(p_group_label, '')), ''), p_coach_id, auth.uid()
  )
  returning id into new_plan_id;

  return new_plan_id;
end;
$$;

revoke execute on function public.create_training_plan_draft(
  uuid, text, text, public.training_mode, integer, text, uuid
) from public;
revoke execute on function public.create_training_plan_draft(
  uuid, text, text, public.training_mode, integer, text, uuid
) from anon;
grant execute on function public.create_training_plan_draft(
  uuid, text, text, public.training_mode, integer, text, uuid
) to authenticated;
