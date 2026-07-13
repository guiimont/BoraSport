# Roadmap estrategico do BoraSport

## 1. Visao do produto

O BoraSport e uma plataforma SaaS multi-tenant especializada em va'a
(canoa havaiana). O publico principal sao clubes, assessorias, treinadores,
administradores e remadores que precisam operar treinos, reservas, comunidade e
presenca digital com menos friccao.

O problema central e que muitos clubes ainda distribuem a operacao entre
WhatsApp, planilhas, formularios, mensagens soltas e sistemas genericos que nao
entendem a rotina do va'a. Isso cria retrabalho na agenda, dificuldade para
controlar vagas, pouca visibilidade sobre presenca e evolucao, e perda de
contexto na montagem das guarnicoes.

A proposta do BoraSport e centralizar a operacao do clube, a experiencia
esportiva do remador, a comunidade e a presenca digital em uma plataforma
simples, moderna e orientada a modalidade.

A ambicao e construir a plataforma mais completa e relevante do mundo para
clubes, treinadores e praticantes de va'a. A base tecnica permanece
multi-tenant, com cada clube isolado em `companies`, suas configuracoes,
usuarios, recursos, treinos, reservas e conteudos.

A arquitetura pode continuar extensivel. Outras modalidades sao apenas uma
possibilidade futura e nao fazem parte do escopo prioritario atual. O BoraSport
nao deve ser posicionado como sistema generico para academias, boxes ou studios.

## 2. Principios estrategicos

- Profundidade na modalidade antes de amplitude de mercado.
- Decisoes va'a-first em produto, dados, interface e operacao.
- Experiencia simples e moderna para usuarios leigos.
- Mobile-first para remadores, treinadores e operacao diaria.
- Configuracao por clube sem perder padroes fortes do produto.
- Seguranca, privacidade, autenticacao, autorizacao e RLS desde a origem.
- Evolucao baseada em validacao com clubes, treinadores e remadores reais.
- Tecnologia como apoio a comunidade, a seguranca e a cultura do va'a.

## 3. Personas e areas do sistema

### Remador

O remador precisa descobrir o clube, criar cadastro, manter perfil e foto,
consultar agenda, reservar ou cancelar treino, acompanhar lista de espera quando
ela existir, informar posicao habitual, nivel e experiencia, consultar historico
e evolucao, participar de eventos e se comunicar com a comunidade.

Estado atual: existem rotas publicas de clube em `/clube/[slug]`, login, perfil,
avatar, visualizacao de agenda, reservas, treinos da semana e participantes
confirmados. Lista de espera, posicoes, nivel tecnico estruturado, historico
completo e eventos ainda nao estao prontos como fluxo de produto.

### Treinador

O treinador precisa planejar treinos, formar guarnicoes, distribuir posicoes,
controlar presenca, ajustar mudancas de ultima hora, registrar desempenho,
acompanhar remadores, comunicar o grupo e aplicar protocolos de seguranca.

Estado atual: o sistema ja possui cadastro de servicos/treinos, slots, recursos,
treinos semanais e papel `professional` nas memberships. Ainda nao ha interface
especializada para formacao de guarnicoes, posicoes V1 a V6, presenca operacional
ou registro tecnico por treinador.

### Administrador do clube

O administrador precisa configurar o tenant, gerir remadores e equipe, publicar
horarios, cadastrar canoas, remos e equipamentos, controlar capacidade, planos,
pagamentos, permissoes, landing page/site, indicadores, comunicacao e historico
operacional.

Estado atual: existe painel `/admin/[slug]` com configuracao do clube,
vocabulario, cores, recursos, servicos, slots, treinos semanais, landing page e
visao de reservas. Gestao completa de equipe, pagamentos, planos, indicadores,
CRM e historico operacional ainda sao parciais ou futuros.

### Plataforma BoraSport

A plataforma precisa administrar tenants, autenticacao, autorizacao, templates,
auditoria, suporte, billing futuro e administracao global.

Estado atual: existem multi-tenancy, Supabase Auth, memberships, roles, RLS,
migrations e seeds. Ainda nao existe painel global da plataforma, billing,
auditoria administrativa completa ou suporte interno estruturado.

## 4. Nucleos funcionais

### 1. Identidade do clube e presenca digital

- Objetivo: permitir que cada clube tenha identidade propria e uma presenca
  publica simples.
- Valor para o va'a: facilita captacao, orienta novos remadores e reduz
  dependencias de paginas improvisadas.
- Situacao atual: parcial.
- Funcionalidades principais: dados do tenant, slug, logo, cores, vocabulario,
  pagina publica `/clube/[slug]`, landing page em `/site/[slug]`.
- Dependencias relevantes: `companies`, `landing_pages`, storage
  `landing-assets`, RLS e configuracao no painel admin.

### 2. Cadastro e gestao de remadores

- Objetivo: centralizar identidade, contato, avatar e relacionamento do remador
  com o clube.
- Valor para o va'a: melhora comunicacao, reservas e visibilidade de quem esta
  em cada treino.
- Situacao atual: parcial.
- Funcionalidades principais: `profiles`, foto de perfil, memberships, roles,
  exibicao de participantes confirmados.
- Dependencias relevantes: Supabase Auth, `profiles`, `memberships`,
  `profile-avatars`, policies de leitura/escrita.

### 3. Agenda, reservas e lista de espera

- Objetivo: publicar horarios, controlar vagas e permitir reserva online.
- Valor para o va'a: reduz controle manual, evita overbooking e mostra ocupacao
  das canoas.
- Situacao atual: parcial.
- Funcionalidades principais: recursos, servicos, slots, bookings, capacidade,
  vagas ocupadas, criacao de horarios avulsos e semanais, reserva pelo aluno.
- Dependencias relevantes: `resources`, `services`, `slots`, `bookings`,
  triggers de ocupacao/capacidade e RLS.
- Lacuna: lista de espera ainda nao aparece modelada como fluxo pronto.

### 4. Canoas, remos e equipamentos

- Objetivo: gerir ativos fisicos do clube.
- Valor para o va'a: cada treino depende de capacidade real, tipo de canoa,
  disponibilidade e condicao dos equipamentos.
- Situacao atual: parcial.
- Funcionalidades principais: cadastro generico de recursos com capacidade.
- Dependencias relevantes: `resources` e relacao com `slots`.
- Lacuna: nao ha modelo especializado para remos, manutencao, tipo detalhado de
  canoa, avarias ou disponibilidade por equipamento.

### 5. Formacao e equilibrio das guarnicoes

- Objetivo: apoiar o treinador na montagem de guarnicoes equilibradas.
- Valor para o va'a: melhora seguranca, desempenho, aprendizado e experiencia
  coletiva.
- Situacao atual: futuro.
- Funcionalidades principais desejadas: posicoes V1 a V6, preferencia por
  posicao, experiencia, nivel tecnico, condicionamento, restricoes e sugestoes
  de composicao.
- Dependencias relevantes: perfil tecnico do remador, reservas confirmadas,
  capacidade por canoa e regras definidas com treinadores.

### 6. Planejamento e execucao dos treinos

- Objetivo: publicar o treino que sera realizado e apoiar sua execucao.
- Valor para o va'a: remadores chegam preparados e treinadores padronizam a
  semana.
- Situacao atual: parcial.
- Funcionalidades principais: treinos semanais por dia, descricao, objetivo,
  anexo e exibicao para alunos.
- Dependencias relevantes: `weekly_workouts`, storage `weekly-workouts`,
  painel admin e pagina publica.
- Lacuna: execucao em tempo real, presenca, feedback tecnico e relacao direta
  com desempenho ainda nao estao completos.

### 7. Seguranca e condicoes ambientais

- Objetivo: apoiar decisoes de treino com mar, vento, mare, ondas e protocolos.
- Valor para o va'a: seguranca operacional e previsibilidade sao centrais na
  modalidade.
- Situacao atual: parcial.
- Funcionalidades principais: area de condicoes na pagina publica e experiencia
  visual voltada ao mar.
- Dependencias relevantes: integracao ambiental confiavel, local do treino,
  criterio do clube e protocolos.
- Lacuna: persistencia estruturada de locais, alertas, regras de seguranca,
  checklists auditaveis e fonte definitiva ainda precisam ser definidos.

### 8. Evolucao tecnica e esportiva

- Objetivo: acompanhar progresso individual e coletivo.
- Valor para o va'a: ajuda o remador a evoluir e o treinador a tomar decisoes.
- Situacao atual: parcial em estrutura.
- Funcionalidades principais: migration `activity_records` para registros de
  atividade, distancia, duracao, ritmo e metadados.
- Dependencias relevantes: `activity_records`, vinculo com usuario, slot e
  tenant.
- Lacuna: interface completa, importacao Garmin/Strava/Apple Watch, dashboards e
  criterios tecnicos ainda nao estao prontos.

### 9. Competicoes e eventos

- Objetivo: organizar eventos, provas, baterias, equipes e participacao.
- Valor para o va'a: clubes vivem calendario esportivo e comunidade competitiva.
- Situacao atual: futuro.
- Funcionalidades principais desejadas: calendario, inscricoes, equipes,
  baterias, resultados e comunicacao.
- Dependencias relevantes: modelagem de eventos, perfis, guarnicoes e pagamentos.

### 10. Comunicacao e comunidade

- Objetivo: reduzir dispersao de informacoes e fortalecer pertencimento.
- Valor para o va'a: a modalidade depende de grupo, confianca e rotina coletiva.
- Situacao atual: parcial.
- Funcionalidades principais: participantes visiveis por treino, fotos no perfil
  e secoes comunitarias na pagina publica.
- Dependencias relevantes: perfis, bookings, politicas de privacidade e futuras
  ferramentas de mensagens.
- Lacuna: inbox, comunicados, segmentacao, CRM e historico de atendimento ainda
  nao estao implementados.

### 11. Planos, cobrancas e financeiro

- Objetivo: apoiar receita recorrente, planos e controle financeiro do clube.
- Valor para o va'a: reduz inadimplencia e organiza a operacao administrativa.
- Situacao atual: futuro.
- Funcionalidades principais desejadas: planos, pagamentos, cobrancas, recibos,
  status financeiro e regras de acesso por plano.
- Dependencias relevantes: modelo comercial, gateway de pagamento, compliance e
  politicas de acesso.

### 12. Indicadores e relatorios

- Objetivo: mostrar saude operacional e esportiva do clube.
- Valor para o va'a: ajuda a medir ocupacao, presenca, retencao e evolucao.
- Situacao atual: parcial.
- Funcionalidades principais existentes: contagens basicas no admin para
  recursos, servicos, slots e reservas.
- Funcionalidades futuras: ocupacao por canoa, presenca, cancelamentos, evolucao,
  funil comercial, receita e engajamento.
- Dependencias relevantes: dados confiaveis de agenda, reservas, presenca,
  pagamentos e atividades.

### 13. Administracao da plataforma

- Objetivo: permitir que o BoraSport opere multiplos clubes com seguranca.
- Valor para o va'a: sustenta crescimento, suporte e confiabilidade.
- Situacao atual: parcial.
- Funcionalidades principais: multi-tenancy, roles, RLS, migrations, seeds e
  estrutura de auth.
- Dependencias relevantes: painel global, auditoria, billing e suporte, ainda
  futuros.

## 5. Diferenciais especificos do va'a

Sistemas generalistas normalmente nao resolvem bem estes pontos, que devem ser
tratados como diferenciais centrais do BoraSport:

- posicoes V1 a V6;
- preferencia e experiencia por posicao;
- montagem e equilibrio das guarnicoes;
- capacidade por tipo de canoa;
- gestao de OC1, OC2, V6 e outros tipos relevantes;
- controle de canoas, remos e equipamentos;
- nivel tecnico e condicionamento do remador;
- substituicoes e ajustes antes do treino;
- treinos por distancia, tempo, intensidade e objetivo;
- condicoes do mar, vento, ondas, mare e seguranca;
- checklists e protocolos;
- historico de remadas;
- competicoes, baterias e equipes;
- cultura e comunidade do va'a.

Esses diferenciais ainda nao devem ser descritos como implementados quando nao
houver codigo, migration ou fluxo de interface comprovando a entrega.

## 6. Estado atual

### Funcional

- Monorepo com `apps/web`, `apps/edge`, `supabase` e `docs`.
- Aplicacao Next.js com rotas publicas, admin, login, perfil e landing page.
- Build e typecheck validaveis com `pnpm`.
- Tenant por `companies`, slug, tema e vocabulario.
- Recursos, servicos, slots e bookings no novo schema.
- Reservas com controle de capacidade por triggers.
- RLS aplicada nas tabelas principais do schema novo.
- Leitura publica controlada para pagina publica, recursos, servicos, slots e
  participantes confirmados.
- Perfil com avatar via bucket `profile-avatars`.
- Treinos semanais com tabela e bucket de anexos.
- Landing pages com tabela e bucket de assets.
- Seeds para demo de canoa e Unidos pelo Mar.

### Parcial

- Painel admin existe, mas ainda nao e um shell SaaS completo por modulo.
- Area do remador existe, mas sem historico esportivo completo e sem lista de
  espera.
- Registros esportivos existem em migration, mas nao aparecem como experiencia
  completa no produto.
- Condicoes ambientais aparecem como experiencia de pagina, mas ainda dependem de
  definicao tecnica mais robusta.
- Relatorios administrativos ainda sao contagens simples.
- Configuracao extensivel por vocabulario ainda carrega presets de outras
  atividades no codigo, o que deve ser tratado como legado/extensibilidade, nao
  como prioridade estrategica.

### Existe apenas em migration ou estrutura

- `activity_records` para dados esportivos.
- `landing_pages` e storage de assets.
- `weekly_workouts` e storage de anexos.
- Roles e permissoes para `admin`, `professional` e `client`.

### Ainda nao existe

- Lista de espera estruturada.
- Posicoes V1 a V6 no modelo de dados.
- Perfil tecnico do remador.
- Formacao inteligente de guarnicoes.
- Controle especifico de remos, manutencao e inventario detalhado.
- Presenca operacional completa.
- Competicoes, eventos, baterias e equipes.
- Planos, pagamentos e financeiro.
- CRM/inbox.
- Painel global de administracao BoraSport.
- Internacionalizacao e aplicativo nativo.

### Riscos e divida tecnica

- Migrations antigas de `clubs`, `slots` e `reservations` convivem com o schema
  novo baseado em `companies`; a ordem e o estado aplicado no Supabase precisam
  continuar bem documentados.
- O foco estrategico agora e va'a-first, mas ainda existem presets genericos em
  `activity-presets.ts`; isso pode confundir decisoes futuras se nao for tratado
  como extensibilidade secundaria.
- O projeto esta em OneDrive no ambiente local, o que ja causou lentidao em
  operacoes Git e filesystem.
- Fluxos de admin e aluno ainda precisam de mais separacao visual e de produto.

## 7. Roadmap por fases

### Fase 0 - Fundacao validada

Escopo: arquitetura, multi-tenancy, autenticacao, RLS, migrations, build,
organizacao do repositorio e documentacao.

Criterios de conclusao:

- `main` sincronizada e validada.
- `AGENTS.md` e roadmap alinhados ao foco va'a-first.
- Migrations essenciais aplicadas e documentadas.
- Build e TypeScript passando.
- Arquivos locais e credenciais fora do versionamento.

### Fase 1 - Operacao essencial do clube

Priorizar clube, remadores, horarios, reservas, capacidade, presenca,
administracao e experiencia mobile.

Criterios de conclusao:

- Cadastro e edicao de clube confiaveis.
- Remador consegue entrar, completar perfil, reservar e cancelar.
- Admin consegue cadastrar canoas/recursos, treinos/servicos e horarios.
- Capacidade e ocupacao ficam consistentes.
- Presenca basica registrada por treino.
- Interface mobile revisada para uso real na rotina do clube.

### Fase 2 - Nucleo especializado em va'a

Priorizar canoas e equipamentos, posicoes, guarnicoes, niveis, formacao
inteligente, planejamento do treino, seguranca e condicoes ambientais.

Criterios de conclusao:

- Modelo de posicoes V1 a V6 definido.
- Perfil tecnico do remador estruturado.
- Guarnicoes montadas manualmente com suporte do sistema.
- Sugestoes inteligentes testadas com treinadores.
- Equipamentos e canoas modelados com atributos relevantes.
- Condicoes ambientais e protocolos de seguranca integrados ao fluxo.

### Fase 3 - Experiencia e comunidade

Priorizar perfil, historico, evolucao, comunicacao, eventos, competicoes,
conquistas e engajamento.

Criterios de conclusao:

- Remador visualiza historico e progresso.
- Treinador acompanha evolucao da turma.
- Comunicacao do clube sai de mensagens dispersas para canais estruturados.
- Eventos e competicoes possuem fluxo minimo.
- Comunidade aparece no produto sem expor dados sensiveis indevidamente.

### Fase 4 - Gestao comercial

Priorizar planos, pagamentos, cobranca, captacao, CRM, automacoes e indicadores
administrativos.

Criterios de conclusao:

- Modelo de planos validado com clubes.
- Pagamentos integrados com regras claras de acesso.
- Landing pages conectadas a captacao.
- Atendimento/CRM definido a partir de necessidades reais.
- Indicadores administrativos confiaveis.

### Fase 5 - Referencia global

Considerar internacionalizacao, multiplos idiomas, moedas e fusos, integracoes,
aplicativo instalavel ou nativo, inteligencia para guarnicoes, benchmarks globais
e expansao internacional.

Criterios de conclusao:

- Produto validado com clubes reais em operacao recorrente.
- Base de dados esportiva suficiente para benchmarks.
- Experiencia multi-idioma e multi-regiao tecnicamente sustentavel.
- Estrategia internacional definida.

Outras modalidades nao entram nessas fases.

## 8. Criterios de priorizacao

Toda nova funcionalidade deve ser avaliada por:

- impacto na operacao do va'a;
- frequencia da dor;
- numero de perfis beneficiados;
- seguranca;
- diferenciacao competitiva;
- esforco e dependencias;
- capacidade de validacao com usuarios reais;
- potencial de retencao e receita.

## 9. Fora do escopo atual

- Sistemas genericos para academias.
- Modulos especificos de CrossFit.
- Funcionalidades para esportes sem relacao com o va'a.
- Expansao indiscriminada para multiplas modalidades.
- Recursos construidos apenas para imitar concorrentes.
- Complexidade financeira ou corporativa sem validacao.

## 10. Pesquisa e validacao

Proximas fontes de aprendizado:

- entrevistas com clubes e treinadores;
- observacao da rotina dos remadores;
- analise funcional do Regybox;
- analise de Tecnofit, Next Fit, LetzPlay, Wodify e plataformas de clubes;
- referencias modernas de design e navegacao;
- testes com clubes reais;
- metricas de uso e retencao.

Os videos do Regybox e da referencia visual ainda serao enviados
posteriormente. Nao registrar conclusoes sobre areas logadas ou fluxos desses
produtos antes da analise.

## 11. Metricas norteadoras

### Disponiveis ou proximas com a base atual

- clubes cadastrados;
- remadores com perfil;
- reservas realizadas;
- ocupacao das canoas/recursos;
- cancelamentos por status de booking;
- utilizacao por treinador quando `professional_id` estiver preenchido;
- treinos semanais publicados;
- landing pages publicadas.

### Futuras

- clubes ativos recorrentes;
- remadores ativos por periodo;
- taxa de presenca;
- tempo economizado na formacao das guarnicoes;
- evolucao tecnica individual;
- engajamento dos remadores;
- retencao dos clubes;
- receita recorrente;
- conversao de captacao para reserva;
- benchmarks globais de desempenho.

## 12. Proximas decisoes

Decisoes que ainda precisam ser tomadas explicitamente:

- fluxo definitivo de cadastro de clube, administrador e remador;
- criterios de nivel tecnico e experiencia;
- regras de formacao das guarnicoes;
- modelagem de canoas, remos e demais equipamentos;
- fontes oficiais de condicoes ambientais;
- estrategia de pagamentos;
- modelo comercial;
- mercados iniciais;
- idiomas;
- formato de aplicativo instalavel, PWA ou nativo.
