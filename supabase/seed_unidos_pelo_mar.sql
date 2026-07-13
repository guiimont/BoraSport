-- Seed realista para testar um tenant de canoa havaiana.
-- Rode no Supabase SQL Editor. O tenant fica sem memberships para que o
-- primeiro usuario logado possa assumir pelo painel /admin/unidos-pelo-mar.

with company_upsert as (
  insert into public.companies (
    name,
    slug,
    logo_url,
    theme_colors,
    vocabulary_config,
    type_de_negocio
  )
  values (
    'Unidos pelo Mar',
    'unidos-pelo-mar',
    null,
    jsonb_build_object(
      'primary', '#063b5b',
      'secondary', '#0f766e',
      'accent', '#f59e0b',
      'background', '#f8fafc'
    ),
    jsonb_build_object(
      'booking_label', 'Reserva',
      'professional_label', 'Steerer',
      'resource_label', 'Canoa',
      'service_label', 'Treino'
    ),
    'canoa_havaiana'
  )
  on conflict (slug) do update
  set
    name = excluded.name,
    theme_colors = excluded.theme_colors,
    vocabulary_config = excluded.vocabulary_config,
    type_de_negocio = excluded.type_de_negocio,
    updated_at = now()
  returning id
),
target_company as (
  select id from company_upsert
  union
  select id from public.companies where slug = 'unidos-pelo-mar'
  limit 1
),
resource_seed as (
  insert into public.resources (company_id, name, capacity_maxima, is_active)
  select c.id, seed.name, seed.capacity_maxima, true
  from target_company c
  cross join (
    values
      ('V6 Itaipu', 6),
      ('V6 Camboinhas', 6),
      ('OC1 Piratininga', 1)
  ) as seed(name, capacity_maxima)
  where not exists (
    select 1
    from public.resources existing
    where existing.company_id = c.id
      and existing.name = seed.name
  )
  returning id, name
),
service_seed as (
  insert into public.services (
    company_id,
    name,
    description,
    duration_minutes,
    price,
    is_active
  )
  select
    c.id,
    seed.name,
    seed.description,
    seed.duration_minutes,
    seed.price,
    true
  from target_company c
  cross join (
    values
      (
        'Treino tecnico',
        'Remada em grupo com foco em tecnica, ritmo e seguranca.',
        60,
        0::numeric
      ),
      (
        'Remada livre',
        'Saida orientada para remadores liberados pelo clube.',
        90,
        0::numeric
      )
  ) as seed(name, description, duration_minutes, price)
  where not exists (
    select 1
    from public.services existing
    where existing.company_id = c.id
      and existing.name = seed.name
  )
  returning id, name
),
resources_ready as (
  select id, name from resource_seed
  union
  select r.id, r.name
  from public.resources r
  join target_company c on c.id = r.company_id
  where r.name in ('V6 Itaipu', 'V6 Camboinhas', 'OC1 Piratininga')
),
services_ready as (
  select id, name from service_seed
  union
  select s.id, s.name
  from public.services s
  join target_company c on c.id = s.company_id
  where s.name in ('Treino tecnico', 'Remada livre')
),
deleted_future_slots as (
  delete from public.slots existing
  using target_company c
  where existing.company_id = c.id
    and existing.start_time >= now()
  returning existing.id
),
slot_seed as (
  insert into public.slots (
    company_id,
    service_id,
    resource_id,
    professional_id,
    start_time,
    end_time,
    spots_total,
    spots_occupied
  )
  select
    c.id,
    s.id,
    r.id,
    null::uuid,
    (date_trunc('day', now() at time zone 'America/Sao_Paulo') + interval '1 day 05 hours 45 minutes') at time zone 'America/Sao_Paulo',
    (date_trunc('day', now() at time zone 'America/Sao_Paulo') + interval '1 day 06 hours 45 minutes') at time zone 'America/Sao_Paulo',
    6,
    0
  from target_company c
  join services_ready s on s.name = 'Treino tecnico'
  join resources_ready r on r.name = 'V6 Itaipu'
  union all
  select
    c.id,
    s.id,
    r.id,
    null::uuid,
    (date_trunc('day', now() at time zone 'America/Sao_Paulo') + interval '1 day 07 hours') at time zone 'America/Sao_Paulo',
    (date_trunc('day', now() at time zone 'America/Sao_Paulo') + interval '1 day 08 hours') at time zone 'America/Sao_Paulo',
    6,
    0
  from target_company c
  join services_ready s on s.name = 'Treino tecnico'
  join resources_ready r on r.name = 'V6 Camboinhas'
  union all
  select
    c.id,
    s.id,
    r.id,
    null::uuid,
    (date_trunc('day', now() at time zone 'America/Sao_Paulo') + interval '2 days 06 hours') at time zone 'America/Sao_Paulo',
    (date_trunc('day', now() at time zone 'America/Sao_Paulo') + interval '2 days 07 hours 30 minutes') at time zone 'America/Sao_Paulo',
    1,
    0
  from target_company c
  join services_ready s on s.name = 'Remada livre'
  join resources_ready r on r.name = 'OC1 Piratininga'
  returning id
)
select
  (select id from target_company) as company_id,
  'unidos-pelo-mar' as slug,
  (select count(*) from resources_ready) as resources_ready,
  (select count(*) from services_ready) as services_ready,
  (select count(*) from slot_seed) as slots_inserted;
