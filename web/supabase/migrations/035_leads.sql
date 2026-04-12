-- Lead capture table for marketing emails / lead magnets
create table public.leads (
  id          uuid        primary key default gen_random_uuid(),
  email       text        not null,
  age_group   text,
  source      text        not null default 'session_plan',
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  constraint leads_email_source_unique unique (email, source)
);

alter table public.leads enable row level security;

-- Anyone (including unauthenticated visitors) can submit a lead
create policy "Anyone can submit a lead"
  on public.leads
  for insert
  with check (true);
