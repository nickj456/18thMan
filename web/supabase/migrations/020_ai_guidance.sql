-- AI Session Guidance (Phase 4)
-- Tracks which focus areas each group has covered to enable genuine rotation

create table public.group_training_history (
  id           uuid primary key default gen_random_uuid(),
  group_id     uuid not null references public.coaching_groups(id) on delete cascade,
  focus_area   text not null,
  category     text not null,
  suggestion   jsonb not null,           -- full AI-generated session plan
  session_id   uuid references public.session_plans(id) on delete set null,
  used         boolean not null default false,
  suggested_at timestamptz not null default now()
);

create index group_training_history_group_id_idx on public.group_training_history(group_id);
create index group_training_history_suggested_at_idx on public.group_training_history(suggested_at desc);

alter table public.group_training_history enable row level security;

-- Group members can read their group's history
create policy "group_members_can_read_training_history"
  on public.group_training_history for select
  using (
    exists (
      select 1 from public.group_invitations
      where group_id  = group_training_history.group_id
        and user_id   = auth.uid()
        and status    = 'accepted'
    )
  );

-- Group members (coach/admin) can insert history entries
create policy "group_coaches_can_insert_training_history"
  on public.group_training_history for insert
  with check (
    exists (
      select 1 from public.group_invitations gi
      join public.profiles p on p.id = auth.uid()
      where gi.group_id = group_id
        and gi.user_id  = auth.uid()
        and gi.status   = 'accepted'
        and p.role in ('coach', 'admin')
    )
  );

-- Group members (coach/admin) can update (mark as used)
create policy "group_coaches_can_update_training_history"
  on public.group_training_history for update
  using (
    exists (
      select 1 from public.group_invitations gi
      join public.profiles p on p.id = auth.uid()
      where gi.group_id = group_training_history.group_id
        and gi.user_id  = auth.uid()
        and gi.status   = 'accepted'
        and p.role in ('coach', 'admin')
    )
  );
