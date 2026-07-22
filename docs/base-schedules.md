# Grade-base de horários

Este documento registra a decisão de domínio da Grade-base e da Agenda
operacional do BoraSport.

## Papel da Grade-base

A Grade-base é o modelo operacional recorrente do clube. Ela organiza dia da
semana, horário, turma, treinador e canoas usadas normalmente.

A Grade-base não deve aparecer como uma agenda paralela. A experiência principal
do gestor começa em `/admin/[slug]/agenda`.

## Agenda operacional

No domínio:

- `base_schedules` descreve a recorrência semanal.
- `base_schedule_resources` vincula uma ou mais canoas à recorrência.
- `operational_sessions` descreve uma sessão concreta de uma data.
- `operational_session_resources` vincula uma ou mais canoas à sessão concreta.
- `slots` permanece como estrutura legada de publicação/reserva e deve ser
  preservado até a migração operacional completa da página pública.

Na interface, a Agenda projeta as recorrências somente para o período
visualizado. Essa projeção não cria registros indefinidos no banco. Quando uma
data recebe uma sessão concreta ligada à recorrência, a sessão concreta prevalece
e a recorrência projetada não aparece duplicada.

O treino da Biblioteca deve ser vinculado à sessão concreta. Isso permite que a
mesma turma recorrente tenha treinos diferentes a cada semana.

## Regras confirmadas

- Um horário recorrente pertence a uma `company`.
- Uma sessão concreta pertence a uma `company`.
- Um horário recorrente pode usar uma ou várias canoas.
- Uma sessão concreta pode usar uma ou várias canoas.
- A mesma canoa não pode aparecer duas vezes no mesmo horário.
- A mesma canoa não pode ser usada em horários ativos sobrepostos no mesmo dia.
- Horários adjacentes, sem sobreposição, podem usar a mesma canoa.
- A duração do horário entra no cálculo de conflito.
- Canoas em manutenção ou inativas não podem ser adicionadas a novos horários.
- Se uma canoa já vinculada mudar de situação depois, o vínculo histórico é
  preservado e a interface deve apresentar alerta operacional.
- A capacidade pública do horário é a soma das vagas públicas das canoas
  vinculadas.
- A vaga pública de cada canoa usa `resources.capacity_maxima` e a
  `default_steerer_policy` operacional já aprovada.
- Uma sessão concreta pode ter `training_plan_version_id` para apontar para um
  treino publicado da Biblioteca de Treinos.

## Geração de ocorrências

A Agenda não materializa recorrências indefinidamente. Para o período
visualizado, ela projeta os registros ativos de `base_schedules` nas datas
correspondentes.

Quando existir uma linha em `operational_sessions` com o mesmo
`base_schedule_id` e a mesma `session_date`, essa sessão concreta substitui a
projeção. Isso permite:

- cancelar uma data específica;
- vincular um treino específico;
- preservar uma edição individual;
- evitar cards duplicados.

## Permissões atuais

- `admin` cria e altera sessões concretas e recorrências.
- `professional` visualiza a agenda operacional.
- A edição granular por treinador ainda precisa de regra de escopo comprovada
  antes de ser liberada.

## Fora do escopo desta fase

- Migração completa da reserva pública de `slots` para `operational_sessions`.
- Participantes por sessão operacional.
- Escalação oficial da canoa.
- Posições V1-V6.
- Copiar semana anterior.
- Notificações.
- Edição parcial segura de recorrência em “esta e as próximas”.
