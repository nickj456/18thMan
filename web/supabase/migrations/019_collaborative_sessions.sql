-- Collaborative Sessions (Phase 3)
-- Extends session_plans with: group ownership, scheduling, lock-based editing

alter table public.session_plans
  add column group_id    uuid references public.coaching_groups(id) on delete set null,
  add column scheduled_at timestamptz,
  add column locked_by   uuid references public.profiles(id) on delete set null,
  add column locked_at   timestamptz;

create index session_plans_group_id_idx on public.session_plans(group_id);

-- Group members can view sessions belonging to their groups
create policy "group_members_can_view_group_sessions"
  on public.session_plans for select
  using (
    group_id is not null
    and exists (
      select 1 from public.group_invitations
      where group_id = session_plans.group_id
        and user_id  = auth.uid()
        and status   = 'accepted'
    )
  );

-- Group members (coach/admin) can create sessions for their group
create policy "group_members_can_create_group_sessions"
  on public.session_plans for insert
  with check (
    group_id is not null
    and exists (
      select 1 from public.group_invitations gi
      join public.profiles p on p.id = auth.uid()
      where gi.group_id = group_id
        and gi.user_id  = auth.uid()
        and gi.status   = 'accepted'
        and p.role in ('coach', 'admin')
    )
  );

-- Group members can update group sessions (lock acquisition + edits while lock held)
create policy "group_members_can_update_group_sessions"
  on public.session_plans for update
  using (
    group_id is not null
    and exists (
      select 1 from public.group_invitations
      where group_id = session_plans.group_id
        and user_id  = auth.uid()
        and status   = 'accepted'
    )
  );
