-- Preserve tenant access while administrators manage club memberships.
-- Membership mutations are serialized per company before locking the target row.

create or replace function public.protect_company_membership_identity()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  if (
    new.id is distinct from old.id
    or new.company_id is distinct from old.company_id
    or new.user_id is distinct from old.user_id
  ) then
    raise exception 'membership_identity_immutable' using errcode = '22023';
  end if;

  return new;
end;
$$;

revoke execute on function public.protect_company_membership_identity() from public, anon, authenticated;

drop trigger if exists protect_company_admin_memberships_on_memberships
on public.memberships;

create trigger protect_company_membership_identity_on_memberships
before update on public.memberships
for each row execute function public.protect_company_membership_identity();

drop policy if exists "admins can update company memberships" on public.memberships;
drop policy if exists "admins can delete company memberships" on public.memberships;

create or replace function public.update_company_membership_role(
  p_company_id uuid,
  p_membership_id uuid,
  p_role public.membership_role
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor_id uuid := auth.uid();
  target_role public.membership_role;
  admin_count integer;
begin
  if actor_id is null then
    raise exception 'authentication_required' using errcode = '42501';
  end if;

  perform pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended(p_company_id::text, 0)
  );

  if not exists (
    select 1
    from public.memberships
    where company_id = p_company_id
      and user_id = actor_id
      and role = 'admin'
  ) then
    raise exception 'company_admin_required' using errcode = '42501';
  end if;

  select role
    into target_role
  from public.memberships
  where id = p_membership_id
    and company_id = p_company_id
  for update;

  if not found then
    raise exception 'membership_not_found' using errcode = 'P0002';
  end if;

  if target_role = 'admin' and p_role <> 'admin' then
    select count(*)::integer
      into admin_count
    from public.memberships
    where company_id = p_company_id
      and role = 'admin';

    if admin_count <= 1 then
      raise exception 'last_company_admin' using errcode = '22023';
    end if;
  end if;

  update public.memberships
  set role = p_role
  where id = p_membership_id
    and company_id = p_company_id;
end;
$$;

create or replace function public.delete_company_membership(
  p_company_id uuid,
  p_membership_id uuid
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor_id uuid := auth.uid();
  target_role public.membership_role;
  admin_count integer;
begin
  if actor_id is null then
    raise exception 'authentication_required' using errcode = '42501';
  end if;

  perform pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended(p_company_id::text, 0)
  );

  if not exists (
    select 1
    from public.memberships
    where company_id = p_company_id
      and user_id = actor_id
      and role = 'admin'
  ) then
    raise exception 'company_admin_required' using errcode = '42501';
  end if;

  select role
    into target_role
  from public.memberships
  where id = p_membership_id
    and company_id = p_company_id
  for update;

  if not found then
    raise exception 'membership_not_found' using errcode = 'P0002';
  end if;

  if target_role = 'admin' then
    select count(*)::integer
      into admin_count
    from public.memberships
    where company_id = p_company_id
      and role = 'admin';

    if admin_count <= 1 then
      raise exception 'last_company_admin' using errcode = '22023';
    end if;
  end if;

  delete from public.memberships
  where id = p_membership_id
    and company_id = p_company_id;
end;
$$;

revoke execute on function public.update_company_membership_role(uuid, uuid, public.membership_role)
from public, anon;
revoke execute on function public.delete_company_membership(uuid, uuid)
from public, anon;

grant execute on function public.update_company_membership_role(uuid, uuid, public.membership_role)
to authenticated;
grant execute on function public.delete_company_membership(uuid, uuid)
to authenticated;
