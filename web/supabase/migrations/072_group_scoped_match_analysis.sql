-- Scope match_sessions and progression_insights to coaching groups.
-- A group member is: the group creator OR a user with an accepted group invitation.

-- ── match_sessions: add group_id ──────────────────────────────────────────────

alter table public.match_sessions
  add column group_id uuid references public.coaching_groups(id);

-- Backfill the 3 existing sessions to their original group (2019 Coaches)
update public.match_sessions
  set group_id = '40892458-3335-403f-8208-97469f238725';

-- Update select policy: group members only (was club-wide)
drop policy if exists "ms_select" on public.match_sessions;
drop policy if exists "ms_select_admin" on public.match_sessions;

create policy "ms_select"
  on public.match_sessions for select
  to authenticated
  using (
    (select role from public.profiles where id = auth.uid()) = 'admin'
    or (
      group_id is not null
      and (
        exists (
          select 1 from public.coaching_groups cg
          where cg.id = match_sessions.group_id
            and cg.created_by = auth.uid()
        )
        or exists (
          select 1 from public.group_invitations gi
          where gi.group_id = match_sessions.group_id
            and gi.user_id = auth.uid()
            and gi.status = 'accepted'
        )
      )
    )
    or (
      group_id is null
      and club_id = (select club_id from public.profiles where id = auth.uid())
    )
  );

-- ── progression_insights: swap created_by → group_id ─────────────────────────

drop policy if exists "pi_select" on public.progression_insights;
drop policy if exists "pi_insert" on public.progression_insights;
drop policy if exists "pi_update" on public.progression_insights;

alter table public.progression_insights
  add column group_id uuid references public.coaching_groups(id);

-- Backfill existing insight to the 2019 group
update public.progression_insights
  set group_id = '40892458-3335-403f-8208-97469f238725';

-- Remove per-user unique constraint; insights are now shared within a group
alter table public.progression_insights
  drop constraint if exists progression_insights_user_scope_hash_key;

-- Drop the created_by column (group membership replaces it for access control)
alter table public.progression_insights
  drop column if exists created_by;

alter table public.progression_insights
  alter column group_id set not null;

alter table public.progression_insights
  add constraint progression_insights_group_scope_hash_key
  unique (group_id, scope, session_ids_hash);

-- Select: group members can read shared insights
create policy "pi_select"
  on public.progression_insights for select
  to authenticated
  using (
    (select role from public.profiles where id = auth.uid()) = 'admin'
    or exists (
      select 1 from public.coaching_groups cg
      where cg.id = progression_insights.group_id
        and cg.created_by = auth.uid()
    )
    or exists (
      select 1 from public.group_invitations gi
      where gi.group_id = progression_insights.group_id
        and gi.user_id = auth.uid()
        and gi.status = 'accepted'
    )
  );

-- Insert: coach/admin group members can create insights
create policy "pi_insert"
  on public.progression_insights for insert
  to authenticated
  with check (
    club_id = (select club_id from public.profiles where id = auth.uid())
    and (select role from public.profiles where id = auth.uid()) in ('coach', 'admin')
    and (
      exists (
        select 1 from public.coaching_groups cg
        where cg.id = progression_insights.group_id
          and cg.created_by = auth.uid()
      )
      or exists (
        select 1 from public.group_invitations gi
        where gi.group_id = progression_insights.group_id
          and gi.user_id = auth.uid()
          and gi.status = 'accepted'
      )
    )
  );

-- Update: same as insert
create policy "pi_update"
  on public.progression_insights for update
  to authenticated
  using (
    (select role from public.profiles where id = auth.uid()) in ('coach', 'admin')
    and (
      exists (
        select 1 from public.coaching_groups cg
        where cg.id = progression_insights.group_id
          and cg.created_by = auth.uid()
      )
      or exists (
        select 1 from public.group_invitations gi
        where gi.group_id = progression_insights.group_id
          and gi.user_id = auth.uid()
          and gi.status = 'accepted'
      )
    )
  )
  with check (
    club_id = (select club_id from public.profiles where id = auth.uid())
    and (select role from public.profiles where id = auth.uid()) in ('coach', 'admin')
    and (
      exists (
        select 1 from public.coaching_groups cg
        where cg.id = progression_insights.group_id
          and cg.created_by = auth.uid()
      )
      or exists (
        select 1 from public.group_invitations gi
        where gi.group_id = progression_insights.group_id
          and gi.user_id = auth.uid()
          and gi.status = 'accepted'
      )
    )
  );
