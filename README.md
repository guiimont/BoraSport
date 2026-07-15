# BoraSport

Aplicacao para agenda de clube de canoa havaiana, com turmas, treinos da semana,
condicoes do mar, dicas de seguranca e divulgacao de produtos e servicos.

## Deploy

O `apps/web` e a aplicacao principal em Next.js e e implantado na Vercel.

- Root Directory na Vercel: `apps/web`
- Branch de producao: `main`
- Branches e pull requests geram Preview Deployments

Variaveis necessarias na Vercel:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `NEXT_PUBLIC_EDGE_BASE_URL`

O `apps/edge` preserva temporariamente o Worker legado de borda e nao faz parte
do deploy principal do `apps/web` na Vercel.
