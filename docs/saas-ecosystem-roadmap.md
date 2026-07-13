# Bora SaaS ecosystem

## North star

O Bora continua sendo uma plataforma de agendamento e programacao de atividades.
Os modulos ao redor existem para ajudar o contratante a vender, atender, medir e
reter alunos sem tirar a agenda do centro.

## Modulos

### Core incluso

- Agenda e reservas: slots, recursos, servicos, vagas, bookings e participantes.
- Configuracao do tenant: modalidade, vocabulario, cores e perfil operacional.
- Treinos da semana: conteudo do treino do dia, descricao e anexos para alunos.
- Perfil do aluno: dados basicos, foto e participacao nas reservas.

### Add-ons cobrados

- Landing pages: templates editaveis para captacao, planos e campanhas.
- Atendimento CRM: inbox central, numero principal, origem do lead, status e historico.
- Relatorios comerciais: leads, conversas, conversao, agendamentos e receita.
- Performance esportiva: Garmin, Strava, Apple Watch, uploads manuais e progresso.

## Regra de organizacao

Tudo pertence a um tenant (`companies`). O usuario sempre precisa saber:

- em qual tenant esta;
- com qual perfil esta logado;
- se esta na area publica do aluno ou no painel do gestor;
- qual modulo esta operando.

## Fluxos principais

### Aluno

1. Entra na pagina publica do tenant.
2. Ve horarios e vagas.
3. Ve o treino da semana.
4. Consulta condicoes relevantes da modalidade.
5. Reserva uma atividade.
6. Opcionalmente registra/importa resultado do treino.

### Gestor

1. Faz login.
2. Entra no painel de um tenant.
3. Configura modalidade e vocabulario.
4. Cadastra recursos e servicos.
5. Publica horarios na agenda.
6. Publica treinos da semana.
7. Usa add-ons para vendas, atendimento, landing pages e relatorios.

## Proximas entregas recomendadas

1. Shell SaaS completo com navegacao lateral por modulo.
2. Modulo Landing Pages com templates basicos e editor de secoes.
3. Modulo Atendimento com inbox manual primeiro, integracoes depois.
4. Relatorios do funil: origem, mensagens, conversao e reservas.
5. Performance esportiva com upload/import manual antes das APIs oficiais.
