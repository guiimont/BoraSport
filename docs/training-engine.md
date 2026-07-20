# Motor de treinos estruturados

## Objetivo

O motor de treinos estruturados cria a fundacao de prescricao esportiva do
BoraSport para va'a. Ele nao substitui a agenda atual: `services`, `slots`,
`bookings`, `weekly_workouts` e `activity_records` continuam existindo.

A nova camada permite criar templates reutilizaveis de treino, versionar esses
templates, organizar blocos ordenados e vincular uma versao publicada a um
treino da semana ou a um horario da agenda.

## Zonas Bora

As zonas representam intensidade prescrita:

- Z1 Recuperar
- Z2 Base
- Z3 Ritmo
- Z4 Forte
- Z5 Maximo

Frequencia cardiaca e uma meta individual opcional por bloco. RPE sera
registrado futuramente apos o treino e nao faz parte desta fundacao.

## Templates, versoes e preservacao historica

`training_plans` guarda o template de treino do clube.

`training_plan_versions` guarda uma versao do template. Cada versao possui:

- `version_number`;
- nivel: iniciante, intermediario, avancado, competicao ou personalizado;
- status: draft, published ou archived;
- `published_at`;
- `created_by`;
- timestamps.

Versoes publicadas sao preservadas. Blocos so podem ser alterados enquanto a
versao esta em `draft`. Ao publicar uma versao, o banco valida que existe pelo
menos um bloco simples. Triggers impedem que uma versao publicada volte para
rascunho ou tenha campos estruturais alterados.

## Blocos

`training_blocks` suporta:

- bloco simples;
- grupo de repeticao.

Tipos oficiais de bloco:

- aquecimento;
- tecnica;
- base;
- ritmo;
- forte;
- largada;
- recuperacao;
- descanso_hidratacao;
- volta_calma.

O alvo principal do MVP e tempo (`target_type = 'time'`). O schema ja reserva
espaco para distancia, execucao aberta, velocidade e cadencia sem implementar
interface ou logica completa desses alvos.

Um grupo de repeticao pode conter blocos simples ordenados. O MVP rejeita grupo
dentro de grupo para evitar recursao ilimitada.

## Embarcacoes

Classes suportadas:

- V1;
- OC1;
- V3;
- OC4;
- V6;
- OC6;
- outro.

V1 e OC1 sao individuais. V3, OC4, V6 e OC6 sao coletivas. O numero representa
a classe/capacidade da embarcacao, mas a capacidade operacional continua vindo
de `resources.capacity_maxima` e dos horarios publicados.

Esta sprint nao implementa montagem, leme nem assentos 1-6.

## Relacoes com agenda e semana

Campos opcionais foram adicionados:

- `weekly_workouts.training_plan_version_id`;
- `slots.training_plan_version_id`.

Ambos podem ficar nulos. Isso preserva todos os horarios e treinos semanais
antigos.

## Seguranca

RLS foi habilitada nas novas tabelas.

Regras iniciais:

- admin do tenant gerencia treinos do proprio clube;
- professional gerencia apenas treinos criados por ele;
- client/remador nao cria nem altera prescricao;
- anon nao le diretamente as tabelas;
- leitura publica futura deve passar por views ou queries especificas seguras.

Limitacao atual: o modelo existente ainda nao tem uma tabela de atribuicoes de
treinadores por treino. Por isso, a regra de `professional` foi implementada com
escopo de autoria (`created_by = auth.uid()`), alem do acesso administrativo.

## RPCs server-side

Funcoes transacionais disponiveis:

- `create_training_plan_draft`;
- `create_training_plan_version`;
- `save_training_blocks`;
- `publish_training_plan_version`;
- `archive_training_plan`.

Essas RPCs usam o usuario autenticado, RLS/helpers do banco e nao exigem service
role no frontend.

## Fora desta sprint

Nao implementado nesta fase:

- construtor visual complexo;
- feedback pos-treino;
- RPE, fadiga, dor e alertas;
- montagem de canoas;
- leme;
- integracao com Garmin, Strava, Apple Watch ou outros dispositivos;
- dashboards de performance.

## Proximas fases sugeridas

1. Criar tela simples de biblioteca de treinos no admin.
2. Criar editor guiado de versao e blocos.
3. Permitir vincular versao publicada ao treino da semana.
4. Permitir vincular versao publicada ao slot.
5. Criar zonas individuais do remador.
6. Criar feedback pos-treino com duracao real, RPE, fadiga, disposicao e dor.
7. Criar alertas de saude/performance para treinador e gestor.
