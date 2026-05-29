-- 059_game_stats.sql

create type public.stat_type as enum ('carry', 'tackle', 'set_completion');

-- ── Sessions ──────────────────────────────────────────────────────────────────

create table public.game_stat_sessions (
  id          uuid primary key default gen_random_uuid(),
  group_id    uuid not null references public.coaching_groups(id) on delete cascade,
  match_id    uuid not null references public.matches(id) on delete cascade,
  created_by  uuid not null references public.profiles(id) on delete restrict,
  created_at  timestamptz not null default now(),
  unique (match_id)
);

create index game_stat_sessions_group_id_idx on public.game_stat_sessions(group_id);

-- ── Events (one row per tap) ──────────────────────────────────────────────────

create table public.game_stat_events (
  id          uuid primary key default gen_random_uuid(),
  session_id  uuid not null references public.game_stat_sessions(id) on delete cascade,
  player_id   uuid references public.players(id) on delete cascade,
  stat_type   public.stat_type not null,
  half        smallint not null default 1 check (half in (1, 2)),
  completed   boolean,
  created_by  uuid not null references public.profiles(id) on delete restrict,
  created_at  timestamptz not null default now()
);

create index game_stat_events_session_id_idx on public.game_stat_events(session_id);
create index game_stat_events_player_id_idx  on public.game_stat_events(player_id);

-- ── RLS ───────────────────────────────────────────────────────────────────────

alter table public.game_stat_sessions enable row level security;
alter table public.game_stat_events    enable row level security;

-- Sessions: club members can read; coach/admin can create if paid tier; creator/admin can delete
create policy "gss_select"
  on public.game_stat_sessions for select
  to authenticated
  using (
    exists (
      select 1
      from public.coaching_groups g
      join public.profiles p on p.club_id = g.club_id
      where g.id = game_stat_sessions.group_id
        and p.id = auth.uid()
    )
  );

create policy "gss_insert"
  on public.game_stat_sessions for insert
  to authenticated
  with check (
    exists (
      select 1
      from public.coaching_groups g
      join public.profiles p on p.club_id = g.club_id
      where g.id = game_stat_sessions.group_id
        and p.id = auth.uid()
        and p.role in ('coach', 'admin')
    )
    and public.effective_tier(auth.uid()) in ('club', 'trial')
  );

create policy "gss_delete"
  on public.game_stat_sessions for delete
  to authenticated
  using (
    created_by = auth.uid()
    or exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')
  );

-- Events: club members read; coach/admin insert; creator/admin delete (undo)
create policy "gse_select"
  on public.game_stat_events for select
  to authenticated
  using (
    exists (
      select 1
      from public.game_stat_sessions s
      join public.coaching_groups g on g.id = s.group_id
      join public.profiles p on p.club_id = g.club_id
      where s.id = game_stat_events.session_id
        and p.id = auth.uid()
    )
  );

create policy "gse_insert"
  on public.game_stat_events for insert
  to authenticated
  with check (
    exists (
      select 1
      from public.game_stat_sessions s
      join public.coaching_groups g on g.id = s.group_id
      join public.profiles p on p.club_id = g.club_id
      where s.id = game_stat_events.session_id
        and p.id = auth.uid()
        and p.role in ('coach', 'admin')
    )
    and public.effective_tier(auth.uid()) in ('club', 'trial')
  );

create policy "gse_delete"
  on public.game_stat_events for delete
  to authenticated
  using (
    created_by = auth.uid()
    or exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')
  );
