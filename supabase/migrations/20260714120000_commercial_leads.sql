-- Commercial leads captured by the BoraSport public commercial landing page.
-- This table is intentionally separate from tenant contacts, profiles,
-- bookings and operational club data.

create table if not exists public.commercial_leads (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  club_name text not null,
  role text not null,
  city_state text not null,
  phone text not null,
  email text not null,
  message text,
  source text not null default 'borasport-commercial-landing',
  status text not null default 'new',
  consent_at timestamptz not null,
  created_at timestamptz not null default now(),
  constraint commercial_leads_name_check check (char_length(trim(name)) >= 2),
  constraint commercial_leads_club_name_check check (char_length(trim(club_name)) >= 2),
  constraint commercial_leads_role_check check (char_length(trim(role)) >= 2),
  constraint commercial_leads_city_state_check check (char_length(trim(city_state)) >= 2),
  constraint commercial_leads_phone_check check (char_length(trim(phone)) >= 8),
  constraint commercial_leads_email_check check (
    email ~* '^[^@\s]+@[^@\s]+\.[^@\s]+$'
  ),
  constraint commercial_leads_message_check check (
    message is null or char_length(message) <= 1200
  ),
  constraint commercial_leads_source_check check (
    source = 'borasport-commercial-landing'
  ),
  constraint commercial_leads_status_check check (
    status in ('new', 'contacted', 'qualified', 'archived')
  )
);

create index if not exists commercial_leads_created_at_idx
  on public.commercial_leads (created_at desc);

create index if not exists commercial_leads_status_created_at_idx
  on public.commercial_leads (status, created_at desc);

alter table public.commercial_leads enable row level security;

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
