-- Tenant landing pages.
-- Add-on module: simple editable sales page connected to the tenant agenda.

create table if not exists public.landing_pages (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  slug text not null,
  template_key text not null default 'ocean',
  title text not null,
  subtitle text,
  hero_image_url text,
  cta_label text not null default 'Agendar agora',
  cta_href text,
  sections jsonb not null default '[]'::jsonb,
  is_published boolean not null default false,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint landing_pages_company_unique unique (company_id),
  constraint landing_pages_slug_unique unique (slug),
  constraint landing_pages_slug_format check (slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'),
  constraint landing_pages_sections_array check (jsonb_typeof(sections) = 'array')
);

create index if not exists landing_pages_company_idx
  on public.landing_pages (company_id);

create index if not exists landing_pages_slug_idx
  on public.landing_pages (slug);

alter table public.landing_pages enable row level security;

drop policy if exists "public can read published landing pages" on public.landing_pages;
create policy "public can read published landing pages"
on public.landing_pages
for select
to anon, authenticated
using (is_published = true);

drop policy if exists "admins can manage landing pages" on public.landing_pages;
create policy "admins can manage landing pages"
on public.landing_pages
for all
to authenticated
using (
  public.has_company_role(company_id, array['admin', 'professional']::public.membership_role[])
)
with check (
  public.has_company_role(company_id, array['admin', 'professional']::public.membership_role[])
);

insert into storage.buckets (id, name, public)
values ('landing-assets', 'landing-assets', true)
on conflict (id) do update set public = excluded.public;

drop policy if exists "landing assets are publicly readable" on storage.objects;
create policy "landing assets are publicly readable"
on storage.objects
for select
to anon, authenticated
using (bucket_id = 'landing-assets');

drop policy if exists "admins can upload landing assets" on storage.objects;
create policy "admins can upload landing assets"
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'landing-assets'
  and public.has_company_role(
    ((storage.foldername(name))[1])::uuid,
    array['admin', 'professional']::public.membership_role[]
  )
);
