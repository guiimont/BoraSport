-- Private athlete weight history and user-only waitlist notifications.

create table public.athlete_body_measurements (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  weight_kg numeric(5, 2) not null,
  recorded_at timestamptz not null default now(),
  created_at timestamptz not null default now(),

  constraint athlete_body_measurements_weight_check
    check (weight_kg >= 20 and weight_kg <= 350)
);

create index athlete_body_measurements_user_recorded_idx
  on public.athlete_body_measurements (user_id, recorded_at desc, id desc);

alter table public.athlete_body_measurements enable row level security;

create policy "athletes can read only own body measurements"
on public.athlete_body_measurements
for select
to authenticated
using ((select auth.uid()) = user_id);

create policy "athletes can insert only own body measurements"
on public.athlete_body_measurements
for insert
to authenticated
with check ((select auth.uid()) = user_id);

create policy "athletes can delete only own body measurements"
on public.athlete_body_measurements
for delete
to authenticated
using ((select auth.uid()) = user_id);

revoke all on table public.athlete_body_measurements from public, anon;
grant select, insert, delete on table public.athlete_body_measurements to authenticated;

comment on table public.athlete_body_measurements is
  'Private body measurements. Product users other than the athlete must never receive direct access.';
comment on column public.athlete_body_measurements.weight_kg is
  'Strictly private athlete input. Never expose in club, coach, admin, public, or participant queries.';

create table public.user_notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  company_id uuid references public.companies(id) on delete cascade,
  slot_id uuid references public.slots(id) on delete cascade,
  kind text not null,
  title text not null,
  message text not null,
  read_at timestamptz,
  created_at timestamptz not null default now(),

  constraint user_notifications_kind_check
    check (kind in ('waitlist_joined', 'waitlist_promoted', 'session_cancelled'))
);

create index user_notifications_user_created_idx
  on public.user_notifications (user_id, created_at desc);
create index user_notifications_user_unread_idx
  on public.user_notifications (user_id, created_at desc)
  where read_at is null;

alter table public.user_notifications enable row level security;

create policy "users can read only own notifications"
on public.user_notifications
for select
to authenticated
using ((select auth.uid()) = user_id);

create policy "users can update only own notifications"
on public.user_notifications
for update
to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

create policy "users can delete only own notifications"
on public.user_notifications
for delete
to authenticated
using ((select auth.uid()) = user_id);

revoke all on table public.user_notifications from public, anon;
grant select, update, delete on table public.user_notifications to authenticated;

create or replace function public.notify_booking_waitlist_change()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_op = 'INSERT' and new.status = 'waitlisted' then
    insert into public.user_notifications (
      user_id,
      company_id,
      slot_id,
      kind,
      title,
      message
    )
    values (
      new.user_id,
      new.company_id,
      new.slot_id,
      'waitlist_joined',
      'Você entrou na lista de espera',
      'Sua posição está registrada. Se uma vaga abrir, o BoraSport confirmará sua reserva automaticamente.'
    );
  elsif tg_op = 'UPDATE'
    and old.status = 'waitlisted'
    and new.status = 'confirmed' then
    insert into public.user_notifications (
      user_id,
      company_id,
      slot_id,
      kind,
      title,
      message
    )
    values (
      new.user_id,
      new.company_id,
      new.slot_id,
      'waitlist_promoted',
      'Sua vaga foi confirmada',
      'Uma vaga abriu e você foi promovido da lista de espera. Sua reserva agora está confirmada.'
    );
  end if;

  return null;
end;
$$;

drop trigger if exists notify_booking_waitlist_change_on_bookings on public.bookings;
create trigger notify_booking_waitlist_change_on_bookings
after insert or update of status on public.bookings
for each row execute function public.notify_booking_waitlist_change();

revoke execute on function public.notify_booking_waitlist_change()
from public, anon, authenticated;

comment on table public.user_notifications is
  'Private in-app notifications. Each authenticated user can read only their own rows.';
