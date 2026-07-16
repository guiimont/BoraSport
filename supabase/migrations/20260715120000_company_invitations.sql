-- Secure individual invitations for BoraSport tenant memberships.
-- Raw invitation tokens are never stored. Only SHA-256 hashes are persisted.

create extension if not exists pgcrypto with schema extensions;

create table if not exists public.company_invitations (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  role public.membership_role not null default 'client',
  token_hash text not null,
  created_by uuid not null references auth.users(id) on delete restrict,
  used_by uuid references auth.users(id) on delete set null,
  accepted_email text,
  expires_at timestamptz not null,
  revoked_at timestamptz,
  used_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint company_invitations_token_hash_unique unique (token_hash),
  constraint company_invitations_client_role_only check (role = 'client'),
  constraint company_invitations_token_hash_format check (token_hash ~ '^[a-f0-9]{64}$'),
  constraint company_invitations_usage_consistency check (
    (
      used_at is null
      and used_by is null
      and accepted_email is null
    )
    or
    (
      used_at is not null
      and used_by is not null
      and accepted_email is not null
    )
  )
);

comment on table public.company_invitations is
  'Individual one-time tenant invitations. Stores only SHA-256 token hashes.';

drop trigger if exists set_company_invitations_updated_at on public.company_invitations;
create trigger set_company_invitations_updated_at
before update on public.company_invitations
for each row execute function public.set_updated_at();

create index if not exists company_invitations_company_id_idx
  on public.company_invitations (company_id);

create index if not exists company_invitations_active_idx
  on public.company_invitations (company_id, expires_at)
  where used_at is null and revoked_at is null;

alter table public.company_invitations enable row level security;

drop policy if exists "admins can read company invitations" on public.company_invitations;
create policy "admins can read company invitations"
on public.company_invitations
for select
to authenticated
using (
  public.has_company_role(company_id, array['admin']::public.membership_role[])
);

drop policy if exists "admins can create client invitations" on public.company_invitations;
create policy "admins can create client invitations"
on public.company_invitations
for insert
to authenticated
with check (
  role = 'client'
  and created_by = auth.uid()
  and used_by is null
  and used_at is null
  and accepted_email is null
  and revoked_at is null
  and expires_at > now()
  and public.has_company_role(company_id, array['admin']::public.membership_role[])
);

-- No generic update/delete policy is intentionally provided. Revocation happens
-- only through revoke_company_invite(), which validates tenant ownership.

create or replace function public.hash_company_invite_token(p_token text)
returns text
language sql
immutable
security definer
set search_path = public, extensions
as $$
  select encode(extensions.digest(convert_to(coalesce(p_token, ''), 'UTF8'), 'sha256'), 'hex');
$$;

revoke execute on function public.hash_company_invite_token(text) from public;

create or replace function public.get_company_invite_public_context(p_token text)
returns table (
  company_name text,
  company_slug text,
  expires_at timestamptz,
  status text
)
language plpgsql
stable
security definer
set search_path = public, auth, extensions
as $$
declare
  token_hash_value text;
begin
  token_hash_value := public.hash_company_invite_token(p_token);

  return query
  select
    companies.name,
    companies.slug,
    invitations.expires_at,
    case
      when invitations.id is null then 'invalid'
      when invitations.used_at is not null then 'used'
      when invitations.revoked_at is not null then 'revoked'
      when invitations.expires_at <= now() then 'expired'
      else 'active'
    end as status
  from public.company_invitations invitations
  join public.companies companies
    on companies.id = invitations.company_id
  where invitations.token_hash = token_hash_value
  limit 1;

  if not found then
    return query select null::text, null::text, null::timestamptz, 'invalid'::text;
  end if;
end;
$$;

revoke execute on function public.get_company_invite_public_context(text) from public;
grant execute on function public.get_company_invite_public_context(text) to anon, authenticated;

create or replace function public.consume_company_invite(
  p_token text,
  p_name text
)
returns table (
  company_id uuid,
  company_slug text,
  role public.membership_role
)
language plpgsql
volatile
security definer
set search_path = public, auth, extensions
as $$
declare
  current_user_id uuid;
  current_email text;
  token_hash_value text;
  invitation_record public.company_invitations%rowtype;
  company_slug_value text;
  clean_name text;
  existing_profile_name text;
begin
  current_user_id := auth.uid();

  if current_user_id is null then
    raise exception 'authentication_required' using errcode = '28000';
  end if;

  select email
  into current_email
  from auth.users
  where id = current_user_id;

  if current_email is null or length(trim(current_email)) = 0 then
    raise exception 'email_not_available' using errcode = '22023';
  end if;

  token_hash_value := public.hash_company_invite_token(p_token);

  select *
  into invitation_record
  from public.company_invitations
  where token_hash = token_hash_value
  for update;

  if not found then
    raise exception 'invite_invalid' using errcode = '22023';
  end if;

  if invitation_record.used_at is not null then
    if invitation_record.used_by = current_user_id then
      select slug
      into company_slug_value
      from public.companies
      where id = invitation_record.company_id;

      return query
      select invitation_record.company_id, company_slug_value, invitation_record.role;
      return;
    end if;

    raise exception 'invite_used' using errcode = '22023';
  end if;

  if invitation_record.revoked_at is not null then
    raise exception 'invite_revoked' using errcode = '22023';
  end if;

  if invitation_record.expires_at <= now() then
    raise exception 'invite_expired' using errcode = '22023';
  end if;

  clean_name := nullif(trim(coalesce(p_name, '')), '');

  select profiles.name
  into existing_profile_name
  from public.profiles
  where id = current_user_id;

  insert into public.profiles (id, name)
  values (
    current_user_id,
    coalesce(clean_name, current_email)
  )
  on conflict (id) do update
  set name = case
    when nullif(trim(public.profiles.name), '') is null then excluded.name
    else public.profiles.name
  end;

  insert into public.memberships (user_id, company_id, role)
  values (current_user_id, invitation_record.company_id, 'client')
  on conflict (user_id, company_id) do nothing;

  update public.company_invitations
  set
    used_at = now(),
    used_by = current_user_id,
    accepted_email = current_email
  where id = invitation_record.id;

  select slug
  into company_slug_value
  from public.companies
  where id = invitation_record.company_id;

  return query
  select invitation_record.company_id, company_slug_value, invitation_record.role;
end;
$$;

revoke execute on function public.consume_company_invite(text, text) from public;
revoke execute on function public.consume_company_invite(text, text) from anon;
grant execute on function public.consume_company_invite(text, text) to authenticated;

create or replace function public.revoke_company_invite(p_invitation_id uuid)
returns void
language plpgsql
volatile
security definer
set search_path = public, auth
as $$
declare
  invitation_company_id uuid;
  already_used_at timestamptz;
begin
  select company_id, used_at
  into invitation_company_id, already_used_at
  from public.company_invitations
  where id = p_invitation_id
  for update;

  if not found then
    raise exception 'invite_not_found' using errcode = '22023';
  end if;

  if not public.has_company_role(invitation_company_id, array['admin']::public.membership_role[]) then
    raise exception 'permission_denied' using errcode = '42501';
  end if;

  if already_used_at is not null then
    raise exception 'invite_already_used' using errcode = '22023';
  end if;

  update public.company_invitations
  set revoked_at = coalesce(revoked_at, now())
  where id = p_invitation_id;
end;
$$;

revoke execute on function public.revoke_company_invite(uuid) from public;
revoke execute on function public.revoke_company_invite(uuid) from anon;
grant execute on function public.revoke_company_invite(uuid) to authenticated;

-- Remove the legacy open self-join path. A client membership must now come
-- from an invitation flow or from an admin-controlled operation.
drop policy if exists "clients can join companies as themselves" on public.memberships;
create policy "admins can create company memberships"
on public.memberships
for insert
to authenticated
with check (
  (
    user_id = auth.uid()
    and role = 'admin'
    and public.company_has_no_members(company_id)
  )
  or public.has_company_role(company_id, array['admin']::public.membership_role[])
);
