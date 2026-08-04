-- Registra presenca por reserva e sincroniza o historico esportivo do remador.

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
  where id = p_booking_id
    and company_id = p_company_id
  for update;

  if not found then
    raise exception 'Reserva nao encontrada.';
  end if;

  select * into target_slot
  from public.slots
  where id = target_booking.slot_id
    and company_id = p_company_id
    and operational_session_id = p_session_id;

  if not found then
    raise exception 'Reserva nao pertence a esta sessao.';
  end if;

  select * into target_session
  from public.operational_sessions
  where id = p_session_id
    and company_id = p_company_id;

  if not found then
    raise exception 'Sessao nao encontrada.';
  end if;

  update public.bookings
  set status = p_status
  where id = target_booking.id;

  if p_status = 'attended' then
    insert into public.activity_records (
      company_id,
      user_id,
      slot_id,
      provider,
      external_id,
      activity_type,
      title,
      started_at,
      duration_seconds,
      visibility,
      metrics
    ) values (
      p_company_id,
      target_booking.user_id,
      target_slot.id,
      'borasport',
      target_booking.id::text,
      'training',
      target_session.group_name,
      target_slot.start_time,
      greatest(target_session.duration_minutes * 60, 1),
      'private',
      jsonb_build_object(
        'booking_id', target_booking.id,
        'operational_session_id', target_session.id,
        'source', 'attendance'
      )
    )
    on conflict (provider, external_id, user_id)
    do update set
      company_id = excluded.company_id,
      slot_id = excluded.slot_id,
      activity_type = excluded.activity_type,
      title = excluded.title,
      started_at = excluded.started_at,
      duration_seconds = excluded.duration_seconds,
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

-- O remador pode confirmar ou cancelar a propria reserva, mas somente a equipe
-- do clube pode transformar a reserva em presenca ou falta.
drop policy if exists "users can update own bookings or staff can manage" on public.bookings;
create policy "users can update own bookings or staff can manage"
on public.bookings
for update
to authenticated
using (
  (user_id = (select auth.uid()) and public.is_company_member(company_id))
  or public.has_company_role(
    company_id,
    array['admin', 'professional']::public.membership_role[]
  )
)
with check (
  (
    user_id = (select auth.uid())
    and status in ('confirmed', 'cancelled')
    and public.is_company_member(company_id)
    and public.slot_belongs_to_company(slot_id, company_id)
  )
  or public.has_company_role(
    company_id,
    array['admin', 'professional']::public.membership_role[]
  )
);
