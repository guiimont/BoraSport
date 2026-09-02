# Arquitetura de navegacao do BoraSport

## 1. Objetivo

Definir uma navegacao simples, mobile-first e va'a-first para remadores,
treinadores e administradores.

A navegacao deve reduzir o numero de opcoes visiveis e priorizar contexto,
frequencia de uso e tarefa principal de cada perfil. O primeiro nivel deve
seguir `docs/platform-architecture.md`: uma conta unica, o ambiente pessoal
**Meu Va'a** e ambientes de organizacao que diferenciam grupos de clubes. O
produto deve combinar profundidade funcional, clareza de onboarding e
identidade propria baseada no mar, nas estrelas, na navegacao polinesia e na
cultura do va'a, sem copiar codigo, textos, imagens, marca ou interface de
referencias externas.

## 2. Estrutura principal do remador

### Hoje

- proxima remada;
- confirmacao;
- horario e local;
- condicoes ambientais;
- canoa e posicao, quando publicadas;
- plano resumido;
- alertas;
- acao principal.

### Agenda

- proximas remadas;
- disponibilidade;
- reserva;
- cancelamento;
- lista de espera;
- eventos;
- calendario.

### Evolucao

- historico de remadas;
- presenca;
- distancia;
- tempo;
- intensidade;
- posicoes praticadas;
- evolucao tecnica;
- conquistas;
- recordes pessoais.

### Clube

- noticias;
- comunicacao;
- comunidade;
- eventos;
- planos;
- pagamentos;
- perfil;
- documentos e seguranca.

## 3. Estrutura principal do treinador

A tela inicial do treinador deve responder imediatamente:

- qual e a proxima remada;
- quem confirmou;
- quem esta na lista de espera;
- quantas canoas serao utilizadas;
- quais posicoes ainda estao vazias;
- como os remadores estao distribuidos nas canoas;
- quem faltou;
- quais sao as condicoes ambientais;
- qual e o plano do treino;
- se existe alerta de seguranca.

Areas principais:

- Hoje;
- Agenda;
- Canoas;
- Treinos;
- Remadores;
- Comunicacao.

## 4. Estrutura principal do administrador

Areas principais:

- Hoje;
- Operacao: agenda, treinos, bases, canoas e equipamentos;
- Pessoas: remadores, profissionais, equipe, turmas e convites;
- Gestao: planos, financeiro, relatorios e configuracoes.

Nao colocar todas as opcoes no primeiro nivel. A administracao deve usar
agrupamentos, contexto e acoes relacionadas a tarefa atual.

### Regra de publicacao do treino

O professor publica o treino na agenda do clube e o aluno o consulta no perfil
do clube quando quiser. A publicacao nao envia notificacao automatica.

A presenca pode ser confirmada por inscricao, check-in, atividade importada ou
confirmacao operacional. Inscricao ou reserva representa intencao e nao deve ser
convertida silenciosamente em presenca definitiva.

## 5. Nucleo de composicao das canoas

Conceitualmente, a tela de composicao deve apresentar:

- canoa vista de cima;
- posicoes V1 a V6;
- remadores distribuidos visualmente;
- possibilidade futura de arrastar e soltar;
- nome;
- nivel;
- experiencia;
- presenca;
- restricoes;
- alertas operacionais definidos e validados com treinadores;
- vagas;
- substituicoes;
- lista de espera.

Esta e uma direcao de produto. Nao existe ainda algoritmo definido nem
funcionalidade implementada de composicao automatica das canoas. O BoraSport nao
deve criar campos de lado preferencial ou outras regras esportivas sem validacao.

## 6. Fluxos prioritarios

### Remador reserva uma remada

Hoje/Agenda -> Selecionar remada -> Conferir informacoes -> Reservar ->
Confirmacao

### Treinador prepara uma remada

Hoje -> Abrir sessao -> Conferir participantes -> Distribuir remadores nas
canoas -> Publicar

### Treinador registra a sessao

Sessao -> Confirmar presenca -> Registrar condicoes -> Registrar resumo ->
Finalizar

### Remador acompanha evolucao

Evolucao -> Historico -> Selecionar remada -> Ver desempenho e observacoes

### Administrador configura horarios

Agenda -> Horarios -> Criar ou editar sessao -> Definir capacidade, treinador e
recursos -> Publicar

## 7. Estados que precisam ser previstos

- carregamento;
- vazio;
- erro;
- offline ou conexao instavel;
- lotado;
- lista de espera;
- cancelado;
- alterado;
- aguardando confirmacao;
- presenca confirmada;
- alerta de seguranca;
- condicao ambiental desfavoravel.

## 8. Direcao visual

### Conceito

"Guiados pelas estrelas. Unidos pelo mar."

### Referencias

- mar;
- ceu noturno;
- estrelas;
- rotas de navegacao;
- horizonte;
- ondas;
- canoa;
- coletividade;
- tradicao de navegacao polinesia;
- tecnologia moderna.

### Paleta conceitual

- azul-marinho profundo;
- azul oceano;
- ciano;
- branco estelar;
- dourado suave;
- coral discreto para alertas.

Nao definir codigos hexadecimais definitivos nesta etapa.

### Aplicacao

- areas operacionais claras e legiveis;
- menus e cabecalhos em azul profundo;
- acoes em azul ou ciano;
- estrelas, ondas e rotas como detalhes;
- visual esportivo e oceanico;
- animacoes suaves;
- alta legibilidade;
- interface funcional, sem aparencia tematica exagerada.

### Cuidado cultural

- nao copiar tatuagens, padroes tradicionais ou simbolos sagrados;
- nao usar "maori" como sinonimo de toda cultura polinesia;
- pesquisar origem e significado antes de incorporar simbolos;
- priorizar referencias universais de navegacao, mar, estrelas e coletividade;
- validar elementos culturais sensiveis antes do uso comercial.

## 9. Principios de UX

- tarefas frequentes em poucos toques;
- uma acao principal clara por tela;
- navegacao baseada no perfil;
- revelar complexidade progressivamente;
- mobile-first;
- acessibilidade;
- contraste adequado;
- textos curtos;
- feedback imediato;
- prevencao de erros;
- nao depender apenas de cores;
- preservar contexto ao voltar;
- evitar menus extensos;
- evitar rolagem horizontal para navegacao principal.

## 10. Hipoteses pendentes

Estas hipoteses precisam de validacao e nao devem ser decididas silenciosamente:

- criterios de vinculacao entre atividade importada e sessao;
- momento de publicacao das posicoes;
- visibilidade da composicao das canoas;
- criterios de equilibrio;
- troca de posicoes;
- tratamento de convidados;
- condicoes ambientais;
- metricas esportivas;
- rankings e gamificacao;
- pagamentos;
- comunicacao entre remadores.

# Navegação oficial — setembro de 2026

## ‘Āmuira‘a — ambiente do remador

| Destino | Apoio funcional | Responsabilidade |
| --- | --- | --- |
| ‘Āmuira‘a | Feed & Comunidade | resumo pessoal, atividades e vínculos |
| Hoe | Diário & Atividades | histórico, métricas e importação FIT/GPX/TCX |
| Moana | Descobrir o Mar | grupos, clubes, eventos e participação voluntária |
| ‘Aito | Atleta & Ajustes | identidade, dispositivos e privacidade |

A ação contextual de Hoe usa `Hoe! · Registrar Remada`.

## Pupu — ambiente das organizações

Pupu Grupo expõe apenas Início, Agenda, Pessoas e Atividades. Funcionalidades formais de clube ficam ocultas.

Pupu Clube possui quatro destinos:

| Destino | Apoio funcional | Áreas internas |
| --- | --- | --- |
| Mahana | Agenda Imediata | visão do dia e agenda |
| Fa‘atere | Canoas & Treinos | treinos, canoas e bases |
| Ta‘ata | Remadores & Equipe | pessoas e presenças auditadas |
| Pū | Financeiro & Planos | financeiro, configurações e site público |

O destino Pū não autoriza inventar planos, preços ou regras de inadimplência. Essas regras exigem aprovação específica de produto antes de ganhar persistência e automação.
