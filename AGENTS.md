# AGENTS.md

## Visao oficial do produto

BoraSport e uma plataforma SaaS multi-tenant especializada em va'a (canoa havaiana).

A ambicao e construir a plataforma mais completa e relevante do mundo para clubes,
treinadores e praticantes de va'a. O produto deve resolver profundamente as
particularidades operacionais, esportivas e comunitarias da modalidade.

A arquitetura pode permanecer extensivel, mas nenhuma expansao para outras
modalidades deve ser priorizada sem decisao estrategica explicita. Nao posicionar
o BoraSport como sistema generico para academias, boxes, studios ou operacoes
esportivas amplas.

Nao recriar o projeto nem substituir a arquitetura existente sem justificativa
tecnica e autorizacao explicita.

## Principios de produto

As prioridades devem demonstrar valor real para a operacao de va'a. Nao
implementar funcionalidades apenas porque sistemas generalistas de academias
possuem.

Priorizar necessidades especificas de:

- clubes e assessorias de va'a;
- remadores, treinadores, steerers e administradores;
- agenda de treinos;
- reservas, cancelamentos e lista de espera;
- montagem e equilibrio das guarnicoes;
- posicoes dos remadores na canoa;
- nivel tecnico, experiencia e historico do remador;
- gestao de canoas, remos e equipamentos;
- condicoes ambientais, mar, vento, mare e seguranca;
- planejamento dos treinos;
- presenca e historico de participacao;
- evolucao esportiva individual e da turma;
- competicoes e eventos;
- comunicacao e comunidade;
- site publico do clube;
- gestao administrativa e financeira do clube.

## Estrutura do repositorio

- `apps/web`: aplicacao principal em Next.js. Contem a pagina publica do tenant,
  area administrativa, login, perfil, landing page publica, componentes, estilos,
  queries, mutations e tipos SaaS.
- `apps/edge`: worker Cloudflare/Wrangler auxiliar. Atualmente possui script de
  desenvolvimento via `wrangler dev`.
- `supabase/migrations`: migrations SQL versionadas do schema SaaS, politicas
  RLS, leitura publica, participantes, storage, registros esportivos, treinos da
  semana e landing pages.
- `supabase/seed_*.sql`: seeds de teste para tenants e conteudos iniciais,
  incluindo demo de canoa e Unidos pelo Mar.
- `docs`: documentacao de produto e planejamento, incluindo o roadmap do
  ecossistema SaaS.
- `packages/*`: previsto no `pnpm-workspace.yaml`, mas nao existe diretorio
  `packages` no estado atual do repositorio.

## Areas atuais do sistema

### Remador/aluno

- `/`: entrada publica do BoraSport.
- `/clube/[slug]`: pagina publica do clube/tenant com agenda, reservas,
  treinos da semana, condicoes, comunidade e informacoes do clube.
- `/perfil`: perfil do usuario, dados pessoais e foto.
- `/login`: login por fluxo Supabase.
- `/auth/callback`: callback de autenticacao.

### Administrador do clube

- `/admin/[slug]`: painel administrativo do tenant. Centraliza configuracao do
  clube, vocabulario, cores, recursos, servicos, agenda, treinos, landing page e
  controles operacionais existentes.

### Plataforma BoraSport

- `src/lib/saas`: camada de acesso e escrita SaaS, com queries, mutations,
  presets de atividade e cliente Supabase server-side.
- `src/types/saas.ts`: tipos compartilhados do dominio SaaS.
- `utils/supabase`: clientes Supabase para server/client quando usados pelo app.

## Comandos oficiais

Executar a partir da raiz do repositorio, salvo quando indicado.

- Instalar dependencias: `pnpm install --frozen-lockfile`
- Desenvolvimento web: `pnpm dev:web`
- Desenvolvimento edge: `pnpm dev:edge`
- Desenvolvimento web por workspace: `pnpm --filter web dev`
- Build web: `pnpm --filter web build`
- Build Cloudflare Pages do web: `pnpm --filter web pages:build`
- Start de producao do web: `pnpm --filter web start`

Executar a partir de `apps/web`:

- Gerar tipos do Next.js: `pnpm exec next typegen`
- Validar TypeScript: `pnpm exec tsc --noEmit`

Nao inventar scripts. Antes de registrar novo comando permanente, verificar o
`package.json` correspondente.

## Arquivos gerados

- `apps/web/next-env.d.ts` e gerado pelo Next.js e deve permanecer ignorado pelo
  Git.
- Nao editar nem versionar `apps/web/next-env.d.ts`.
- Executar `pnpm exec next typegen` em `apps/web` antes do `tsc` quando os tipos
  gerados ainda nao existirem localmente.
- `apps/web/tsconfig.tsbuildinfo` tambem deve permanecer ignorado.

## Seguranca

- Nunca versionar arquivos `.env`.
- Somente arquivos `.env.example` podem ser versionados.
- Nunca mostrar, copiar ou registrar valores de credenciais em relatorios.
- Variaveis `NEXT_PUBLIC_*` devem conter apenas valores apropriados ao cliente.
- Respeitar autenticacao, autorizacao e politicas RLS.
- Toda tabela exposta deve ter suas politicas revisadas.
- Migrations devem ser aditivas, ordenadas e revisaveis.
- Nao alterar ou apagar migrations ja aplicadas sem autorizacao explicita.
- Dados pessoais de atletas, clubes e usuarios devem ser tratados com cuidado.

## Git

- `main` e a fonte oficial.
- Nao usar force push.
- Nao apagar branches de seguranca sem autorizacao.
- Preservar alteracoes existentes do usuario.
- Nao sobrescrever trabalho nao relacionado.
- Mudancas relevantes devem ser validadas antes do push.
- Nao fazer merge ou push quando validacoes obrigatorias falharem.

## Verificacao minima

Quando aplicavel:

- gerar tipos com `pnpm exec next typegen` em `apps/web`;
- executar `pnpm exec tsc --noEmit` em `apps/web`;
- executar `pnpm --filter web build` na raiz;
- realizar verificacoes adicionais proporcionais ao risco da alteracao;
- informar claramente qualquer etapa que nao tenha sido executada.

Para alteracoes apenas documentais, validar pelo menos o status do Git, os
arquivos alterados e a coerencia com a estrutura atual do repositorio.

## Comunicacao

- Relatorios finais curtos e objetivos em portugues.
- Informar arquivos alterados.
- Informar validacoes executadas.
- Informar pendencias e riscos reais.
- Nao apresentar como concluido algo que nao tenha sido validado.
- Nao expor detalhes tecnicos desnecessarios ao usuario.
