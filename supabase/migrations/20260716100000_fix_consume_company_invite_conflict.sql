-- Fix consume_company_invite ambiguity after the original invitation migration
-- was already applied remotely. Preserve the function contract and behavior.

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
  v_current_user_id uuid;
  v_current_email text;
  v_token_hash text;
  v_invitation public.company_invitations%rowtype;
  v_company_slug text;
  v_clean_name text;
begin
  v_current_user_id := auth.uid();

  if v_current_user_id is null then
    raise exception 'authentication_required' using errcode = '28000';
  end if;

  select au.email
  into v_current_email
  from auth.users as au
  where au.id = v_current_user_id;

  if v_current_email is null or length(trim(v_current_email)) = 0 then
    raise exception 'email_not_available' using errcode = '22023';
  end if;

  v_token_hash := public.hash_company_invite_token(p_token);

  select ci.*
  into v_invitation
  from public.company_invitations as ci
  where ci.token_hash = v_token_hash
  for update;

  if not found then
    raise exception 'invite_invalid' using errcode = '22023';
  end if;

  if v_invitation.used_at is not null then
    if v_invitation.used_by = v_current_user_id then
      select c.slug
      into v_company_slug
      from public.companies as c
      where c.id = v_invitation.company_id;

      return query
      select v_invitation.company_id, v_company_slug, v_invitation.role;
      return;
    end if;

    raise exception 'invite_used' using errcode = '22023';
  end if;

  if v_invitation.revoked_at is not null then
    raise exception 'invite_revoked' using errcode = '22023';
  end if;

  if v_invitation.expires_at <= now() then
    raise exception 'invite_expired' using errcode = '22023';
  end if;

  v_clean_name := nullif(trim(coalesce(p_name, '')), '');

  insert into public.profiles (id, name)
  values (
    v_current_user_id,
    coalesce(v_clean_name, v_current_email)
  )
  on conflict (id) do update
  set name = case
    when nullif(trim(public.profiles.name), '') is null then excluded.name
    else public.profiles.name
  end;

  insert into public.memberships (user_id, company_id, role)
  values (v_current_user_id, v_invitation.company_id, 'client')
  on conflict on constraint memberships_user_company_unique do nothing;

  update public.company_invitations as ci
  set
    used_at = now(),
    used_by = v_current_user_id,
    accepted_email = v_current_email
  where ci.id = v_invitation.id;

  select c.slug
  into v_company_slug
  from public.companies as c
  where c.id = v_invitation.company_id;

  return query
  select v_invitation.company_id, v_company_slug, v_invitation.role;
end;
$$;

revoke execute on function public.consume_company_invite(text, text) from public;
revoke execute on function public.consume_company_invite(text, text) from anon;
grant execute on function public.consume_company_invite(text, text) to authenticated;
