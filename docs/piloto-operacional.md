# Piloto operacional do BoraSport

## Objetivo

Colocar um clube real para publicar remadas, receber reservas e operar presenca
com o menor numero possivel de etapas. O piloto valida o nucleo Gestao antes da
expansao para financeiro, comunicacao, integracoes esportivas e automacoes.

## Evidencias usadas

O recorte foi validado em agosto de 2026 com seis respostas sobre treinos e uma
resposta de clube:

- atletas usam principalmente planejamento semanal, planilha, WhatsApp, Garmin
  e Strava;
- praticidade e baixo trabalho manual sao condicoes de adocao;
- o treinador precisa acompanhar volume, intensidade, frequencia cardiaca e
  rendimento, mas esse painel nao bloqueia a agenda do clube;
- a operacao do clube exige capacidade real por canoa, reservas, cancelamentos,
  lista de espera, presenca e historico;
- a composicao das canoas considera a proposta da remada e caracteristicas dos
  remadores e continua sendo decisao do treinador;
- clubes podem operar em mais de uma base e o sistema precisa representar o
  local corretamente antes do teste real.

## Fluxo que precisa funcionar

1. O administrador configura o clube.
2. Cadastra treinador e remadores.
3. Cadastra as bases e vincula cada canoa ao local correto.
4. Cria uma sessao avulsa ou um horario semanal.
5. Seleciona treinador, canoas e treino do dia.
6. Publica a sessao.
7. O remador acessa a pagina do clube e reserva a vaga.
8. Ao lotar, novas reservas entram na lista de espera.
9. Um cancelamento promove automaticamente a primeira pessoa da fila.
10. O treinador consulta participantes e registra presenca ou falta.

## Configuracao minima do ambiente de teste

- nome e slug do clube;
- pelo menos um administrador;
- pelo menos um treinador;
- remadores convidados e com perfil concluido;
- canoas disponiveis com classe e capacidade;
- bases ativas e canoas vinculadas a elas;
- pelo menos uma sessao futura publicada;
- link publico da agenda compartilhado com o grupo.

## Criterios de aceite

O produto pode iniciar um teste real controlado quando:

- a pagina publica abre sem erro;
- a sessao publicada mostra data, horario, canoa e vagas corretas;
- a sessao mostra a base e nao permite selecionar canoas de outra base;
- um remador autenticado consegue reservar;
- a capacidade nao permite overbooking;
- uma pessoa excedente entra na lista de espera;
- o cancelamento libera a vaga e promove a fila;
- administrador e treinador visualizam os participantes;
- o treinador consegue registrar presenca e falta;
- o fluxo funciona no celular.

## Evolucoes posteriores ao primeiro teste controlado

Estes itens sao importantes, mas nao impedem a primeira agenda real:

- apoio a composicao das canoas, depois de validar as regras com treinadores;
- integracao direta com Garmin ou Strava;
- painel esportivo de volume, intensidade e zonas cardiacas;
- planos, cobrancas e integracao com Wellhub ou TotalPass;
- WhatsApp e notificacoes automaticas;
- ranking, gamificacao e inteligencia artificial.

## Aprendizado durante o piloto

Registrar por sessao:

- quantidade de vagas e reservas;
- cancelamentos e promocoes da lista de espera;
- faltas;
- ajustes manuais feitos pelo treinador;
- duvidas dos remadores;
- tempo gasto pelo gestor para publicar e fechar a sessao;
- problemas causados pela operacao em mais de uma base.

O piloto deve orientar a proxima decisao de produto. Nao transformar pedidos
isolados em regras definitivas sem recorrencia ou validacao do treinador.
