-- Strength & Conditioning programs (AI-generated or coach-built blocks)
create table sc_programs (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text,
  author_id uuid references profiles(id) on delete cascade,
  phase text check (phase in ('pre-season', 'in-season', 'off-season', 'transition')),
  duration_weeks int,
  sessions_per_week int,
  target_group text, -- e.g. 'forwards', 'backs', 'full squad'
  program_json jsonb not null default '{}',
  is_template boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table sc_programs enable row level security;

-- Coaches can manage their own programs
create policy "coaches can manage own sc programs"
  on sc_programs for all
  using (auth.uid() = author_id)
  with check (auth.uid() = author_id);

-- Templates are readable by all authenticated users
create policy "templates are readable by all"
  on sc_programs for select
  using (is_template = true);

-- Index for listing a coach's programs
create index sc_programs_author_idx on sc_programs (author_id, created_at desc);

-- Auto-update updated_at
create or replace function update_sc_programs_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger sc_programs_updated_at
  before update on sc_programs
  for each row execute function update_sc_programs_updated_at();

-- Future: enable pgvector for S&C knowledge ingestion once original content is available
-- create extension if not exists vector;
-- create table sc_knowledge (
--   id uuid primary key default gen_random_uuid(),
--   content text not null,
--   metadata jsonb,
--   source text,
--   embedding vector(1536)
-- );
-- create index on sc_knowledge using ivfflat (embedding vector_cosine_ops);
