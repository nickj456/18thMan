-- ── Phase 1: Clubs ──────────────────────────────────────────────────────────

-- 1. Clubs table
create table public.clubs (
  id         uuid primary key default gen_random_uuid(),
  name       text not null,
  slug       text not null unique,
  created_by uuid not null references public.profiles(id) on delete restrict,
  created_at timestamptz not null default now()
);

-- 2. Club invitations
create type public.club_invite_status as enum ('pending', 'accepted', 'declined');

create table public.club_invitations (
  id         uuid primary key default gen_random_uuid(),
  club_id    uuid not null references public.clubs(id) on delete cascade,
  user_id    uuid not null references public.profiles(id) on delete cascade,
  invited_by uuid not null references public.profiles(id) on delete restrict,
  status     public.club_invite_status not null default 'pending',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (club_id, user_id)
);

-- 3. Add club_id FK to profiles (replaces free-text club column)
alter table public.profiles
  add column club_id uuid references public.clubs(id) on delete set null;

-- Note: profiles.club (text) is deliberately left intact for now.
-- It will be dropped in a future migration once all code references are updated.

-- ── RLS ─────────────────────────────────────────────────────────────────────

alter table public.clubs enable row level security;

-- Anyone authenticated can read clubs
create policy "clubs_select"
  on public.clubs for select
  to authenticated
  using (true);

-- Only admins can create clubs
create policy "clubs_insert"
  on public.clubs for insert
  to authenticated
  with check (
    exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')
  );

-- Only admins can update clubs
create policy "clubs_update"
  on public.clubs for update
  to authenticated
  using (
    exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')
  );

-- Only admins can delete clubs
create policy "clubs_delete"
  on public.clubs for delete
  to authenticated
  using (
    exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')
  );

-- Club invitations RLS
alter table public.club_invitations enable row level security;

-- Admins can do everything on invitations
create policy "club_invitations_admin"
  on public.club_invitations for all
  to authenticated
  using (
    exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')
  )
  with check (
    exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')
  );

-- Users can read their own invitations
create policy "club_invitations_own_select"
  on public.club_invitations for select
  to authenticated
  using (user_id = auth.uid());

-- Users can update their own invitations (accept / decline)
create policy "club_invitations_own_update"
  on public.club_invitations for update
  to authenticated
  using (user_id = auth.uid());

-- ── Indexes ──────────────────────────────────────────────────────────────────

create index club_invitations_user_id_idx on public.club_invitations(user_id);
create index club_invitations_club_id_idx on public.club_invitations(club_id);
create index profiles_club_id_idx on public.profiles(club_id);
