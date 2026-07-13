-- Align existing SaaS tables with the app queries and seed a test club.

alter table if exists public.slots
  add column if not exists is_active boolean not null default true;

alter table if exists public.slots
  add column if not exists created_at timestamptz not null default now();

alter table if exists public.reservations
  add column if not exists status text not null default 'pending';

alter table if exists public.reservations
  add column if not exists created_at timestamptz not null default now();

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'reservations_status_valid'
      and conrelid = 'public.reservations'::regclass
  ) then
    alter table public.reservations
      add constraint reservations_status_valid
      check (status in ('pending', 'confirmed', 'cancelled'));
  end if;
end $$;

with club as (
  insert into public.clubs (name, slug, logo_url, primary_color)
  values ('Clube Teste', 'clube-teste', null, '#0f766e')
  on conflict (slug) do update
    set name = excluded.name,
        logo_url = excluded.logo_url,
        primary_color = excluded.primary_color
  returning id
),
test_slots (title, starts_at, ends_at, capacity) as (
  values
    ('Treino funcional', '2026-07-01 18:00:00-03'::timestamptz, '2026-07-01 19:00:00-03'::timestamptz, 12),
    ('Beach tennis', '2026-07-02 07:00:00-03'::timestamptz, '2026-07-02 08:00:00-03'::timestamptz, 8),
    ('Aula experimental', '2026-07-03 19:30:00-03'::timestamptz, '2026-07-03 20:30:00-03'::timestamptz, 10)
)
insert into public.slots (club_id, title, starts_at, ends_at, capacity, is_active)
select club.id, test_slots.title, test_slots.starts_at, test_slots.ends_at, test_slots.capacity, true
from club
cross join test_slots
where not exists (
  select 1
  from public.slots
  where slots.club_id = club.id
    and slots.title = test_slots.title
    and slots.starts_at = test_slots.starts_at
);
