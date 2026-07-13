-- Seed de teste do Bora Canoa Clube para /clube/demo.
-- Seguro para rodar mais de uma vez no SQL Editor do Supabase.

insert into public.companies (
  name,
  slug,
  logo_url,
  theme_colors,
  vocabulary_config,
  type_de_negocio
)
values (
  'Bora Canoa Clube',
  'demo',
  null,
  '{
    "primary": "#063b5b",
    "secondary": "#0f766e",
    "accent": "#f59e0b",
    "background": "#f8fafc"
  }'::jsonb,
  '{
    "booking_label": "Reserva",
    "resource_label": "Canoa",
    "professional_label": "Steerer",
    "service_label": "Treino"
  }'::jsonb,
  'esporte'
)
on conflict (slug) do update set
  name = excluded.name,
  logo_url = excluded.logo_url,
  theme_colors = excluded.theme_colors,
  vocabulary_config = excluded.vocabulary_config,
  type_de_negocio = excluded.type_de_negocio;

with company as (
  select id from public.companies where slug = 'demo'
)
insert into public.resources (company_id, name, capacity_maxima, is_active)
select company.id, resource.name, resource.capacity_maxima, true
from company
cross join (
  values
    ('V6 Hoku', 6),
    ('V6 Moana', 6),
    ('OC1 Mana', 1)
) as resource(name, capacity_maxima)
where not exists (
  select 1
  from public.resources existing
  where existing.company_id = company.id
    and existing.name = resource.name
);

with company as (
  select id from public.companies where slug = 'demo'
)
insert into public.services (
  company_id,
  name,
  description,
  duration_minutes,
  price,
  is_active
)
select company.id, service.name, service.description, service.duration_minutes, service.price, true
from company
cross join (
  values
    ('Treino Tecnico', 'Treino em equipe com foco em tecnica, seguranca e ritmo.', 50, 0::numeric),
    ('Remada Livre', 'Horario para remada supervisionada da base.', 90, 0::numeric)
) as service(name, description, duration_minutes, price)
where not exists (
  select 1
  from public.services existing
  where existing.company_id = company.id
    and existing.name = service.name
);

-- Limpa apenas slots futuros do demo para recriar a grade de teste.
delete from public.slots
where company_id = (select id from public.companies where slug = 'demo')
  and start_time >= now();

with company as (
  select id from public.companies where slug = 'demo'
),
treino as (
  select services.id, services.duration_minutes
  from public.services
  join company on company.id = services.company_id
  where services.name = 'Treino Tecnico'
  limit 1
),
remada as (
  select services.id, services.duration_minutes
  from public.services
  join company on company.id = services.company_id
  where services.name = 'Remada Livre'
  limit 1
),
v6_hoku as (
  select resources.id
  from public.resources
  join company on company.id = resources.company_id
  where resources.name = 'V6 Hoku'
  limit 1
),
v6_moana as (
  select resources.id
  from public.resources
  join company on company.id = resources.company_id
  where resources.name = 'V6 Moana'
  limit 1
),
agenda as (
  select
    company.id as company_id,
    treino.id as service_id,
    v6_hoku.id as resource_id,
    (current_date + offs.day_offset + time '05:45')::timestamptz as start_time,
    treino.duration_minutes,
    6 as spots_total,
    offs.occupied as spots_occupied
  from company, treino, v6_hoku
  cross join (
    values
      (1, 2),
      (2, 4),
      (3, 1),
      (5, 3)
  ) as offs(day_offset, occupied)

  union all

  select
    company.id as company_id,
    remada.id as service_id,
    v6_moana.id as resource_id,
    (current_date + offs.day_offset + time '07:00')::timestamptz as start_time,
    remada.duration_minutes,
    6 as spots_total,
    offs.occupied as spots_occupied
  from company, remada, v6_moana
  cross join (
    values
      (1, 5),
      (2, 2),
      (4, 0),
      (6, 3)
  ) as offs(day_offset, occupied)
)
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
  agenda.company_id,
  agenda.service_id,
  agenda.resource_id,
  null,
  agenda.start_time,
  agenda.start_time + make_interval(mins => agenda.duration_minutes),
  agenda.spots_total,
  agenda.spots_occupied
from agenda;

select
  companies.id,
  companies.name,
  companies.slug,
  count(slots.id) as upcoming_slots
from public.companies
left join public.slots
  on slots.company_id = companies.id
  and slots.start_time >= now()
where companies.slug = 'demo'
group by companies.id, companies.name, companies.slug;
