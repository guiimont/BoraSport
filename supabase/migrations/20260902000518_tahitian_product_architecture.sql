-- BoraSport single-platform contracts: activity ownership, auditable attendance,
-- route privacy and voluntary community participation.

alter table public.activity_records
  add column if not exists operational_session_id uuid,
  add column if not exists attendance_validation_status text not null default 'unlinked',
  add column if not exists attendance_validation_source text,
  add column if not exists attendance_validated_by uuid,
  add column if not exists attendance_validated_at timestamptz,
  add column if not exists route_privacy_mode text not null default 'hide_start_end';

alter table public.activity_records
  drop constraint if exists activity_records_operational_session_id_fkey,
  add constraint activity_records_operational_session_id_fkey
    foreign key (operational_session_id)
    references public.operational_sessions(id)
    on delete set null,
  drop constraint if exists activity_records_attendance_validation_status_check,
  add constraint activity_records_attendance_validation_status_check
    check (attendance_validation_status in ('unlinked', 'suggested', 'validated', 'rejected')),
  drop constraint if exists activity_records_attendance_validation_source_check,
  add constraint activity_records_attendance_validation_source_check
    check (
      attendance_validation_source is null
      or attendance_validation_source in ('activity_match', 'coach_manual')
    ),
  drop constraint if exists activity_records_attendance_validated_by_fkey,
  add constraint activity_records_attendance_validated_by_fkey
    foreign key (attendance_validated_by)
    references public.profiles(id)
    on delete set null,
  drop constraint if exists activity_records_route_privacy_mode_check,
  add constraint activity_records_route_privacy_mode_check
    check (route_privacy_mode in ('hide_start_end', 'private_route')),
  drop constraint if exists activity_records_validated_attendance_complete,
  add constraint activity_records_validated_attendance_complete
    check (
      attendance_validation_status <> 'validated'
      or (
        operational_session_id is not null
        and attendance_validation_source is not null
        and attendance_validated_at is not null
      )
    );

create index if not exists activity_records_operational_session_idx
  on public.activity_records (operational_session_id)
  where operational_session_id is not null;

update public.activity_records activity
set operational_session_id = slot.operational_session_id,
    attendance_validation_status = 'validated',
    attendance_validation_source = 'coach_manual',
    attendance_validated_at = coalesce(activity.updated_at, activity.created_at, now())
from public.slots slot
where activity.provider = 'borasport'
  and activity.slot_id = slot.id
  and slot.operational_session_id is not null
  and activity.attendance_validation_status = 'unlinked';

comment on column public.activity_records.operational_session_id is
  'Optional audited link between a paddler-owned activity and a published organization session.';
comment on column public.activity_records.attendance_validation_status is
  'Attendance is validated only by an explicit activity match or coach confirmation; booking alone never validates presence.';
comment on column public.activity_records.route_privacy_mode is
  'Public route rendering must hide start and finish. Raw imports do not expose route coordinates.';

drop policy if exists "staff can read operational sessions" on public.operational_sessions;
drop policy if exists "members can read published operational sessions" on public.operational_sessions;
create policy "authorized members can read operational sessions"
on public.operational_sessions
for select
to authenticated
using (
  public.has_company_role(
    company_id,
    case
      when status = 'published'
        then array['client', 'professional', 'admin']::public.membership_role[]
      else array['professional', 'admin']::public.membership_role[]
    end
  )
);

create table if not exists public.athlete_privacy_settings (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  rankings_opt_in boolean not null default false,
  challenges_opt_in boolean not null default false,
  hide_route_start_end boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.athlete_privacy_settings enable row level security;

drop policy if exists "athletes manage own privacy settings" on public.athlete_privacy_settings;
create policy "athletes manage own privacy settings"
on public.athlete_privacy_settings
for all
to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

grant select, insert, update, delete on public.athlete_privacy_settings to authenticated;
revoke all on public.athlete_privacy_settings from anon;

create or replace function public.link_activity_to_session(
  p_activity_id uuid,
  p_session_id uuid
)
returns void
language plpgsql
security invoker
set search_path = public
as $$
declare
  target_activity public.activity_records%rowtype;
  target_session public.operational_sessions%rowtype;
begin
  select * into target_activity
  from public.activity_records
  where id = p_activity_id
    and user_id = (select auth.uid())
  for update;

  if not found then
    raise exception 'Atividade nao encontrada ou sem permissao.';
  end if;

  select * into target_session
  from public.operational_sessions
  where id = p_session_id
    and status = 'published';

  if not found then
    raise exception 'Sessao publicada nao encontrada.';
  end if;

  if not public.has_company_role(
    target_session.company_id,
    array['client', 'professional', 'admin']::public.membership_role[]
  ) then
    raise exception 'A conta nao possui vinculo com esta organizacao.';
  end if;

  update public.activity_records
  set company_id = target_session.company_id,
      operational_session_id = target_session.id,
      attendance_validation_status = 'validated',
      attendance_validation_source = 'activity_match',
      attendance_validated_by = (select auth.uid()),
      attendance_validated_at = now(),
      updated_at = now()
  where id = target_activity.id;

end;
$$;

revoke execute on function public.link_activity_to_session(uuid, uuid) from public, anon;
grant execute on function public.link_activity_to_session(uuid, uuid) to authenticated;

create or replace function public.set_booking_attendance(
  p_company_id uuid,
  p_session_id uuid,
  p_booking_id uuid,
  p_status public.booking_status
)
returns void
language plpgsql
security invoker
set search_path = public
as $$
declare
  target_booking public.bookings%rowtype;
  target_slot public.slots%rowtype;
  target_session public.operational_sessions%rowtype;
begin
  if p_status not in ('attended', 'missed') then
    raise exception 'Status de presenca invalido.';
  end if;

  if not public.has_company_role(
    p_company_id,
    array['admin', 'professional']::public.membership_role[]
  ) then
    raise exception 'Usuario sem permissao para registrar presenca.';
  end if;

  select * into target_booking
  from public.bookings
  where id = p_booking_id and company_id = p_company_id
  for update;

  if not found then raise exception 'Reserva nao encontrada.'; end if;

  select * into target_slot
  from public.slots
  where id = target_booking.slot_id
    and company_id = p_company_id
    and operational_session_id = p_session_id;

  if not found then raise exception 'Reserva nao pertence a esta sessao.'; end if;

  select * into target_session
  from public.operational_sessions
  where id = p_session_id and company_id = p_company_id;

  if not found then raise exception 'Sessao nao encontrada.'; end if;

  update public.bookings set status = p_status, updated_at = now()
  where id = target_booking.id;

  if p_status = 'attended' then
    insert into public.activity_records (
      company_id, user_id, slot_id, operational_session_id, provider,
      external_id, activity_type, title, started_at, duration_seconds,
      visibility, attendance_validation_status,
      attendance_validation_source, attendance_validated_by,
      attendance_validated_at, route_privacy_mode, metrics
    ) values (
      p_company_id, target_booking.user_id, target_slot.id, target_session.id,
      'borasport', target_booking.id::text, 'training', target_session.group_name,
      target_slot.start_time, greatest(target_session.duration_minutes * 60, 1),
      'private', 'validated', 'coach_manual', (select auth.uid()), now(),
      'hide_start_end',
      jsonb_build_object(
        'booking_id', target_booking.id,
        'operational_session_id', target_session.id,
        'source', 'coach_manual'
      )
    )
    on conflict (provider, external_id, user_id)
    do update set
      company_id = excluded.company_id,
      slot_id = excluded.slot_id,
      operational_session_id = excluded.operational_session_id,
      activity_type = excluded.activity_type,
      title = excluded.title,
      started_at = excluded.started_at,
      duration_seconds = excluded.duration_seconds,
      attendance_validation_status = excluded.attendance_validation_status,
      attendance_validation_source = excluded.attendance_validation_source,
      attendance_validated_by = excluded.attendance_validated_by,
      attendance_validated_at = excluded.attendance_validated_at,
      route_privacy_mode = excluded.route_privacy_mode,
      metrics = excluded.metrics,
      updated_at = now();
  else
    delete from public.activity_records
    where provider = 'borasport'
      and external_id = target_booking.id::text
      and user_id = target_booking.user_id;
  end if;
end;
$$;

revoke execute on function public.set_booking_attendance(uuid, uuid, uuid, public.booking_status)
  from public, anon;
grant execute on function public.set_booking_attendance(uuid, uuid, uuid, public.booking_status)
  to authenticated;
