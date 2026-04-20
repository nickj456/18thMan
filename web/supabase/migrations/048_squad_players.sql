-- Squad Players — Phase 1: Player profiles, notes, match records, ratings

-- ── Enums ────────────────────────────────────────────────────────────────────

create type public.player_status as enum ('available', 'injured', 'unavailable');
create type public.match_location as enum ('home', 'away');
create type public.match_result  as enum ('win', 'loss', 'draw');

-- ── Players ───────────────────────────────────────────────────────────────────

create table public.players (
  id          uuid primary key default gen_random_uuid(),
  group_id    uuid not null references public.coaching_groups(id) on delete cascade,
  created_by  uuid not null references public.profiles(id) on delete restrict,
  name        text not null,
  positions   text[] not null default '{}',
  dob         date,
  avatar_url  text,
  status      public.player_status not null default 'available',
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create index players_group_id_idx on public.players(group_id);
create index players_created_by_idx on public.players(created_by);

create trigger players_updated_at
  before update on public.players
  for each row execute procedure public.set_updated_at();

-- ── Player Notes ──────────────────────────────────────────────────────────────

create table public.player_notes (
  id          uuid primary key default gen_random_uuid(),
  player_id   uuid not null references public.players(id) on delete cascade,
  created_by  uuid not null references public.profiles(id) on delete restrict,
  note        text not null,
  created_at  timestamptz not null default now()
);

create index player_notes_player_id_idx on public.player_notes(player_id);

-- ── Matches ───────────────────────────────────────────────────────────────────

create table public.matches (
  id             uuid primary key default gen_random_uuid(),
  group_id       uuid not null references public.coaching_groups(id) on delete cascade,
  created_by     uuid not null references public.profiles(id) on delete restrict,
  opponent       text not null,
  match_date     date not null,
  location       public.match_location not null default 'home',
  our_score      integer,
  opponent_score integer,
  result         public.match_result,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);

create index matches_group_id_idx on public.matches(group_id);

create trigger matches_updated_at
  before update on public.matches
  for each row execute procedure public.set_updated_at();

-- ── Player Match Ratings ──────────────────────────────────────────────────────

create table public.player_match_ratings (
  id          uuid primary key default gen_random_uuid(),
  player_id   uuid not null references public.players(id) on delete cascade,
  match_id    uuid not null references public.matches(id) on delete cascade,
  created_by  uuid not null references public.profiles(id) on delete restrict,
  rating      smallint not null check (rating between 1 and 5),
  notes       text,
  created_at  timestamptz not null default now(),
  unique (player_id, match_id)
);

create index player_match_ratings_player_id_idx on public.player_match_ratings(player_id);
create index player_match_ratings_match_id_idx  on public.player_match_ratings(match_id);

-- ── Player Session Ratings ────────────────────────────────────────────────────

create table public.player_session_ratings (
  id              uuid primary key default gen_random_uuid(),
  player_id       uuid not null references public.players(id) on delete cascade,
  session_plan_id uuid not null references public.session_plans(id) on delete cascade,
  created_by      uuid not null references public.profiles(id) on delete restrict,
  attended        boolean not null default true,
  rating          smallint check (rating between 1 and 5),
  notes           text,
  created_at      timestamptz not null default now(),
  unique (player_id, session_plan_id)
);

create index player_session_ratings_player_id_idx      on public.player_session_ratings(player_id);
create index player_session_ratings_session_plan_id_idx on public.player_session_ratings(session_plan_id);

-- ── RLS ───────────────────────────────────────────────────────────────────────

alter table public.players              enable row level security;
alter table public.player_notes         enable row level security;
alter table public.matches              enable row level security;
alter table public.player_match_ratings enable row level security;
alter table public.player_session_ratings enable row level security;

-- Helper: is the current user a member of the club that owns this group?
-- Used in select policies to gate read access.

-- players: club members can read; coaches in the group (or admin) can insert/update/delete
create policy "players_select"
  on public.players for select
  to authenticated
  using (
    exists (
      select 1
      from public.coaching_groups g
      join public.profiles p on p.club_id = g.club_id
      where g.id = players.group_id
        and p.id = auth.uid()
    )
  );

create policy "players_insert"
  on public.players for insert
  to authenticated
  with check (
    exists (
      select 1
      from public.coaching_groups g
      join public.profiles p on p.club_id = g.club_id
      where g.id = players.group_id
        and p.id = auth.uid()
        and p.role in ('coach', 'admin')
    )
  );

create policy "players_update"
  on public.players for update
  to authenticated
  using (
    created_by = auth.uid()
    or exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')
  );

create policy "players_delete"
  on public.players for delete
  to authenticated
  using (
    created_by = auth.uid()
    or exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')
  );

-- player_notes: same club members read; coaches insert; note author or admin delete
create policy "player_notes_select"
  on public.player_notes for select
  to authenticated
  using (
    exists (
      select 1
      from public.players pl
      join public.coaching_groups g on g.id = pl.group_id
      join public.profiles p on p.club_id = g.club_id
      where pl.id = player_notes.player_id
        and p.id = auth.uid()
    )
  );

create policy "player_notes_insert"
  on public.player_notes for insert
  to authenticated
  with check (
    exists (
      select 1
      from public.players pl
      join public.coaching_groups g on g.id = pl.group_id
      join public.profiles p on p.club_id = g.club_id
      where pl.id = player_notes.player_id
        and p.id = auth.uid()
        and p.role in ('coach', 'admin')
    )
  );

create policy "player_notes_delete"
  on public.player_notes for delete
  to authenticated
  using (
    created_by = auth.uid()
    or exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')
  );

-- matches: club members read; coaches insert; creator or admin update/delete
create policy "matches_select"
  on public.matches for select
  to authenticated
  using (
    exists (
      select 1
      from public.coaching_groups g
      join public.profiles p on p.club_id = g.club_id
      where g.id = matches.group_id
        and p.id = auth.uid()
    )
  );

create policy "matches_insert"
  on public.matches for insert
  to authenticated
  with check (
    exists (
      select 1
      from public.coaching_groups g
      join public.profiles p on p.club_id = g.club_id
      where g.id = matches.group_id
        and p.id = auth.uid()
        and p.role in ('coach', 'admin')
    )
  );

create policy "matches_update"
  on public.matches for update
  to authenticated
  using (
    created_by = auth.uid()
    or exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')
  );

create policy "matches_delete"
  on public.matches for delete
  to authenticated
  using (
    created_by = auth.uid()
    or exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')
  );

-- player_match_ratings: same club members read; coaches insert/update/delete their own
create policy "player_match_ratings_select"
  on public.player_match_ratings for select
  to authenticated
  using (
    exists (
      select 1
      from public.players pl
      join public.coaching_groups g on g.id = pl.group_id
      join public.profiles p on p.club_id = g.club_id
      where pl.id = player_match_ratings.player_id
        and p.id = auth.uid()
    )
  );

create policy "player_match_ratings_insert"
  on public.player_match_ratings for insert
  to authenticated
  with check (
    exists (
      select 1
      from public.players pl
      join public.coaching_groups g on g.id = pl.group_id
      join public.profiles p on p.club_id = g.club_id
      where pl.id = player_match_ratings.player_id
        and p.id = auth.uid()
        and p.role in ('coach', 'admin')
    )
  );

create policy "player_match_ratings_update"
  on public.player_match_ratings for update
  to authenticated
  using (
    created_by = auth.uid()
    or exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')
  );

create policy "player_match_ratings_delete"
  on public.player_match_ratings for delete
  to authenticated
  using (
    created_by = auth.uid()
    or exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')
  );

-- player_session_ratings: session owner or same club members read; coaches insert/update/delete their own
create policy "player_session_ratings_select"
  on public.player_session_ratings for select
  to authenticated
  using (
    exists (
      select 1
      from public.players pl
      join public.coaching_groups g on g.id = pl.group_id
      join public.profiles p on p.club_id = g.club_id
      where pl.id = player_session_ratings.player_id
        and p.id = auth.uid()
    )
  );

create policy "player_session_ratings_insert"
  on public.player_session_ratings for insert
  to authenticated
  with check (
    exists (
      select 1
      from public.players pl
      join public.coaching_groups g on g.id = pl.group_id
      join public.profiles p on p.club_id = g.club_id
      where pl.id = player_session_ratings.player_id
        and p.id = auth.uid()
        and p.role in ('coach', 'admin')
    )
  );

create policy "player_session_ratings_update"
  on public.player_session_ratings for update
  to authenticated
  using (
    created_by = auth.uid()
    or exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')
  );

create policy "player_session_ratings_delete"
  on public.player_session_ratings for delete
  to authenticated
  using (
    created_by = auth.uid()
    or exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')
  );
