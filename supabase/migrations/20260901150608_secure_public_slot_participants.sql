-- Projecao publica minima de participantes confirmados.
-- Mantem bookings e profiles privados e elimina a view SECURITY DEFINER.

drop view if exists public.public_slot_participants;

create table public.public_slot_participant_summaries (
  booking_id uuid primary key
    references public.bookings(id) on delete cascade,
  company_id uuid not null,
  slot_id uuid not null,
  public_profile_id uuid not null,
  name text not null,
  avatar_url text,
  updated_at timestamptz not null default now(),

  constraint public_slot_participant_summaries_slot_company_fk
    foreign key (slot_id, company_id)
    references public.slots(id, company_id)
    on delete cascade,
  constraint public_slot_participant_summaries_name_present
    check (length(trim(name)) between 1 and 120)
);

create index public_slot_participant_summaries_company_slot_idx
  on public.public_slot_participant_summaries (company_id, slot_id);

alter table public.public_slot_participant_summaries enable row level security;

create policy "public can read participants of upcoming public slots"
on public.public_slot_participant_summaries
for select
to anon, authenticated
using (
  exists (
    select 1
    from public.slots
    where slots.id = public_slot_participant_summaries.slot_id
      and slots.company_id = public_slot_participant_summaries.company_id
      and slots.is_public is true
      and slots.start_time >= now()
  )
);

revoke all on public.public_slot_participant_summaries from public, anon, authenticated;
grant select on public.public_slot_participant_summaries to anon, authenticated;

create function public.sync_public_slot_participant_summary()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  safe_name text;
  target_public_id uuid;
  target_avatar_url text;
begin
  if new.status <> 'confirmed'::public.booking_status then
    delete from public.public_slot_participant_summaries
    where booking_id = new.id;
    return new;
  end if;

  select
    profiles.public_id,
    case
      when nullif(trim(profiles.name), '') is null then 'Remador BoraSport'
      when position('@' in profiles.name) > 0 then 'Remador BoraSport'
      else left(trim(profiles.name), 120)
    end,
    profiles.avatar_url
  into target_public_id, safe_name, target_avatar_url
  from public.profiles
  where profiles.id = new.user_id;

  if target_public_id is null then
    delete from public.public_slot_participant_summaries
    where booking_id = new.id;
    return new;
  end if;

  insert into public.public_slot_participant_summaries (
    booking_id,
    company_id,
    slot_id,
    public_profile_id,
    name,
    avatar_url,
    updated_at
  ) values (
    new.id,
    new.company_id,
    new.slot_id,
    target_public_id,
    safe_name,
    target_avatar_url,
    now()
  )
  on conflict (booking_id) do update set
    company_id = excluded.company_id,
    slot_id = excluded.slot_id,
    public_profile_id = excluded.public_profile_id,
    name = excluded.name,
    avatar_url = excluded.avatar_url,
    updated_at = now();

  return new;
end;
$$;

revoke execute on function public.sync_public_slot_participant_summary()
from public, anon, authenticated;

create trigger sync_public_slot_participant_summary_on_booking
after insert or update of status, company_id, slot_id, user_id
on public.bookings
for each row execute function public.sync_public_slot_participant_summary();

create function public.refresh_public_slot_participant_summaries_for_profile()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  booking_row public.bookings%rowtype;
begin
  for booking_row in
    select *
    from public.bookings
    where user_id = new.id
      and status = 'confirmed'::public.booking_status
  loop
    perform public.sync_public_slot_participant_summary_for_booking(booking_row.id);
  end loop;

  return new;
end;
$$;

create function public.sync_public_slot_participant_summary_for_booking(
  p_booking_id uuid
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  booking_row public.bookings%rowtype;
begin
  select * into booking_row
  from public.bookings
  where id = p_booking_id;

  if not found then
    delete from public.public_slot_participant_summaries
    where booking_id = p_booking_id;
    return;
  end if;

  if booking_row.status <> 'confirmed'::public.booking_status then
    delete from public.public_slot_participant_summaries
    where booking_id = booking_row.id;
    return;
  end if;

  insert into public.public_slot_participant_summaries (
    booking_id,
    company_id,
    slot_id,
    public_profile_id,
    name,
    avatar_url,
    updated_at
  )
  select
    booking_row.id,
    booking_row.company_id,
    booking_row.slot_id,
    profiles.public_id,
    case
      when nullif(trim(profiles.name), '') is null then 'Remador BoraSport'
      when position('@' in profiles.name) > 0 then 'Remador BoraSport'
      else left(trim(profiles.name), 120)
    end,
    profiles.avatar_url,
    now()
  from public.profiles
  where profiles.id = booking_row.user_id
  on conflict (booking_id) do update set
    company_id = excluded.company_id,
    slot_id = excluded.slot_id,
    public_profile_id = excluded.public_profile_id,
    name = excluded.name,
    avatar_url = excluded.avatar_url,
    updated_at = now();
end;
$$;

revoke execute on function public.sync_public_slot_participant_summary_for_booking(uuid)
from public, anon, authenticated;
revoke execute on function public.refresh_public_slot_participant_summaries_for_profile()
from public, anon, authenticated;

create trigger refresh_public_slot_participant_summaries_on_profile
after update of name, avatar_url, public_id
on public.profiles
for each row execute function public.refresh_public_slot_participant_summaries_for_profile();

insert into public.public_slot_participant_summaries (
  booking_id,
  company_id,
  slot_id,
  public_profile_id,
  name,
  avatar_url
)
select
  bookings.id,
  bookings.company_id,
  bookings.slot_id,
  profiles.public_id,
  case
    when nullif(trim(profiles.name), '') is null then 'Remador BoraSport'
    when position('@' in profiles.name) > 0 then 'Remador BoraSport'
    else left(trim(profiles.name), 120)
  end,
  profiles.avatar_url
from public.bookings
join public.profiles on profiles.id = bookings.user_id
where bookings.status = 'confirmed'::public.booking_status
on conflict (booking_id) do nothing;

create view public.public_slot_participants
with (security_invoker = true)
as
select
  company_id,
  slot_id,
  public_profile_id,
  name,
  avatar_url
from public.public_slot_participant_summaries;

revoke all on public.public_slot_participants from public, anon, authenticated;
grant select on public.public_slot_participants to anon, authenticated;

comment on table public.public_slot_participant_summaries is
  'Sanitized projection used by the public schedule. Contains no auth IDs or contact data.';
