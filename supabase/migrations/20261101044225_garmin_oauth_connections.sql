create table public.athlete_provider_connections (
  user_id uuid primary key references auth.users(id) on delete cascade,
  provider text not null default 'garmin' check (provider = 'garmin'),
  status text not null default 'connected' check (status in ('connected', 'needs_reauth')),
  provider_user_id text,
  access_token_ciphertext text not null,
  refresh_token_ciphertext text,
  token_expires_at timestamptz not null,
  refresh_token_expires_at timestamptz,
  scopes text,
  connected_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.athlete_provider_connections is
  'Private per-athlete provider connection. OAuth tokens are AES-GCM encrypted by the BoraSport server before storage.';

alter table public.athlete_provider_connections enable row level security;
grant select, insert, update, delete on public.athlete_provider_connections to authenticated;

create policy "Athletes read their own provider connection" on public.athlete_provider_connections
for select to authenticated using ((select auth.uid()) = user_id);
create policy "Athletes create their own provider connection" on public.athlete_provider_connections
for insert to authenticated with check ((select auth.uid()) = user_id);
create policy "Athletes update their own provider connection" on public.athlete_provider_connections
for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy "Athletes delete their own provider connection" on public.athlete_provider_connections
for delete to authenticated using ((select auth.uid()) = user_id);
