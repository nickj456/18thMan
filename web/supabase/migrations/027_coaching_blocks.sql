-- Coaching Blocks — structured multi-session plans for coaching groups
-- A block covers a defined number of sessions (4–12), with AI planning
-- all focus areas upfront and tracking preparation + completion.

-- Block status enum
create type public.block_status as enum ('active', 'completed', 'archived');

-- Session status within a block
create type public.block_session_status as enum ('planned', 'prepared', 'completed');

-- coaching_blocks: one block per coaching group (multiple blocks allowed over time)
create table public.coaching_blocks (
  id              uuid primary key default gen_random_uuid(),
  group_id        uuid not null references public.coaching_groups(id) on delete cascade,
  name            text not null,
  total_sessions  integer not null check (total_sessions between 2 and 20),
  status          public.block_status not null default 'active',
  created_by      uuid not null references public.profiles(id) on delete set null,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

-- block_sessions: one row per planned session in the block
create table public.block_sessions (
  id              uuid primary key default gen_random_uuid(),
  block_id        uuid not null references public.coaching_blocks(id) on delete cascade,
  session_number  integer not null,               -- 1-based order within the block
  focus_area      text not null,
  category        text not null,
  ai_plan         jsonb,                           -- full GameSense session plan from AI
  scheduled_date  date,                            -- set by coach when preparing
  session_plan_id uuid references public.session_plans(id) on delete set null,
  status          public.block_session_status not null default 'planned',
  notes           text,                            -- coach notes for this session
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  unique (block_id, session_number)
);

-- Indexes
create index coaching_blocks_group_id_idx  on public.coaching_blocks(group_id);
create index block_sessions_block_id_idx   on public.block_sessions(block_id);
create index block_sessions_session_plan_id_idx on public.block_sessions(session_plan_id);

-- updated_at triggers
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end;
$$;

create trigger coaching_blocks_updated_at
  before update on public.coaching_blocks
  for each row execute function public.set_updated_at();

create trigger block_sessions_updated_at
  before update on public.block_sessions
  for each row execute function public.set_updated_at();

-- RLS
alter table public.coaching_blocks  enable row level security;
alter table public.block_sessions   enable row level security;

-- coaching_blocks: group members can read; club admin or platform admin can write
create policy "group_members_can_view_blocks"
  on public.coaching_blocks for select
  using (
    exists (
      select 1 from public.group_invitations
      where group_id = coaching_blocks.group_id
        and user_id  = auth.uid()
        and status   = 'accepted'
    )
  );

create policy "club_admins_can_create_blocks"
  on public.coaching_blocks for insert
  with check (
    exists (
      select 1 from public.profiles p
      join public.coaching_groups g on g.id = coaching_blocks.group_id
      where p.id = auth.uid()
        and p.club_id = g.club_id
        and (p.club_role = 'admin' or p.role = 'admin')
    )
  );

create policy "club_admins_can_update_blocks"
  on public.coaching_blocks for update
  using (
    exists (
      select 1 from public.profiles p
      join public.coaching_groups g on g.id = coaching_blocks.group_id
      where p.id = auth.uid()
        and p.club_id = g.club_id
        and (p.club_role = 'admin' or p.role = 'admin')
    )
  );

create policy "club_admins_can_delete_blocks"
  on public.coaching_blocks for delete
  using (
    exists (
      select 1 from public.profiles p
      join public.coaching_groups g on g.id = coaching_blocks.group_id
      where p.id = auth.uid()
        and p.club_id = g.club_id
        and (p.club_role = 'admin' or p.role = 'admin')
    )
  );

-- block_sessions: group members can read; club admin can update (prep + complete)
create policy "group_members_can_view_block_sessions"
  on public.block_sessions for select
  using (
    exists (
      select 1 from public.group_invitations gi
      join public.coaching_blocks b on b.id = block_sessions.block_id
      where gi.group_id = b.group_id
        and gi.user_id  = auth.uid()
        and gi.status   = 'accepted'
    )
  );

create policy "club_admins_can_insert_block_sessions"
  on public.block_sessions for insert
  with check (
    exists (
      select 1 from public.profiles p
      join public.coaching_blocks b on b.id = block_sessions.block_id
      join public.coaching_groups g on g.id = b.group_id
      where p.id = auth.uid()
        and p.club_id = g.club_id
        and (p.club_role = 'admin' or p.role = 'admin')
    )
  );

create policy "club_admins_can_update_block_sessions"
  on public.block_sessions for update
  using (
    exists (
      select 1 from public.profiles p
      join public.coaching_blocks b on b.id = block_sessions.block_id
      join public.coaching_groups g on g.id = b.group_id
      where p.id = auth.uid()
        and p.club_id = g.club_id
        and (p.club_role = 'admin' or p.role = 'admin')
    )
  );
