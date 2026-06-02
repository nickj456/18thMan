-- 068_match_sessions.sql
-- Match sessions uploaded from the 18th Man Analyst Electron app

create table public.match_sessions (
  id               uuid primary key default gen_random_uuid(),
  analyst_id       uuid not null references public.profiles(id),
  club_id          uuid not null references public.clubs(id),
  opposition       text,
  match_date       date,
  our_score        integer,
  opp_score        integer,
  session_name     text,
  players          jsonb not null default '[]',
  events           jsonb not null default '[]',
  uploaded_at      timestamptz not null default now(),
  local_session_id text,
  unique (club_id, local_session_id)
);

create index match_sessions_club_id_idx      on public.match_sessions(club_id);
create index match_sessions_match_date_idx   on public.match_sessions(match_date);
create index match_sessions_analyst_id_idx   on public.match_sessions(analyst_id);

alter table public.match_sessions enable row level security;

-- Analysts insert sessions for their own club
create policy "ms_insert"
  on public.match_sessions for insert
  to authenticated
  with check (
    analyst_id = auth.uid()
    and club_id = (select club_id from public.profiles where id = auth.uid())
  );

-- Club members read all sessions for their club
create policy "ms_select"
  on public.match_sessions for select
  to authenticated
  using (
    club_id = (select club_id from public.profiles where id = auth.uid())
  );

-- Admins read all sessions
create policy "ms_select_admin"
  on public.match_sessions for select
  to authenticated
  using (
    (select role from public.profiles where id = auth.uid()) = 'admin'
  );

-- Analysts can update their own sessions
create policy "ms_update"
  on public.match_sessions for update
  to authenticated
  using (analyst_id = auth.uid())
  with check (analyst_id = auth.uid());

-- Analysts and admins can delete sessions
create policy "ms_delete"
  on public.match_sessions for delete
  to authenticated
  using (
    analyst_id = auth.uid()
    or (select role from public.profiles where id = auth.uid()) = 'admin'
  );
