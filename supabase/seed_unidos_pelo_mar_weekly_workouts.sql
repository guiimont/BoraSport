-- Exemplo de treinos da semana para o tenant Unidos pelo Mar.
-- Rode depois da migration 20260703190000_weekly_workouts.sql.

with target_company as (
  select id
  from public.companies
  where slug = 'unidos-pelo-mar'
  limit 1
),
current_week as (
  select (
    date_trunc('week', now() at time zone 'America/Sao_Paulo')
  )::date as week_start_date
)
insert into public.weekly_workouts (
  company_id,
  week_start_date,
  weekday,
  title,
  description
)
select
  c.id,
  w.week_start_date,
  seed.weekday,
  seed.title,
  seed.description
from target_company c
cross join current_week w
cross join (
  values
    (
      1,
      'Treino de tiro',
      'Aquecimento progressivo. Serie principal: 8 tiros de 2 minutos forte por 1 minuto leve. Foco em explosao sem perder tecnica.'
    ),
    (
      2,
      'Treino de giro',
      'Tecnica de curva, entrada e saida de giro. Trabalhar comando, sincronia e retomada de velocidade.'
    ),
    (
      3,
      'Treino tecnico',
      'Base de remada, pegada, postura e troca de lado. Ritmo controlado com feedback do steerer.'
    ),
    (
      4,
      'Treino de resistencia',
      'Blocos longos em zona moderada. Objetivo: constancia, respiracao e eficiencia da tripulacao.'
    ),
    (
      5,
      'Remada regenerativa',
      'Volume leve antes do fim de semana. Soltar a musculatura e ajustar detalhes de sincronia.'
    )
) as seed(weekday, title, description)
on conflict (company_id, week_start_date, weekday) do update
set
  title = excluded.title,
  description = excluded.description,
  updated_at = now();
