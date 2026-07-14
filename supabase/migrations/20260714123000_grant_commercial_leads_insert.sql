-- Allow the public commercial landing page to create leads through PostgREST.
-- RLS still limits public access to INSERT only through the policy below.

grant insert on table public.commercial_leads to anon, authenticated;

drop policy if exists "public can create commercial leads" on public.commercial_leads;
create policy "public can create commercial leads"
on public.commercial_leads
for insert
to anon, authenticated
with check (
  source = 'borasport-commercial-landing'
  and status = 'new'
  and consent_at is not null
);
