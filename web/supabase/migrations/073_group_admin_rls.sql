-- Fix: Group Admins (group_invitations.group_role = 'admin') can manage
-- membership for their own group — invite and remove members.
--
-- Root cause: migration 026 replaced the broad coach policy with a club_admin-only
-- policy, but never added a corresponding policy for the group_role = 'admin' column
-- that was introduced in migration 062. The app-layer checks in actions.ts correctly
-- validate Group Admins, but the DB writes were failing due to missing RLS coverage.

-- Allow Group Admins to INSERT invitations into their group
create policy "group_admins_can_invite_to_their_group"
  on public.group_invitations for insert
  with check (
    exists (
      select 1 from public.group_invitations gi
      where gi.group_id = group_invitations.group_id
        and gi.user_id  = auth.uid()
        and gi.status   = 'accepted'
        and gi.group_role = 'admin'
    )
  );

-- Allow Group Admins to UPDATE invitations in their group (e.g. upsert/status change)
create policy "group_admins_can_update_invitations_in_their_group"
  on public.group_invitations for update
  using (
    exists (
      select 1 from public.group_invitations gi
      where gi.group_id = group_invitations.group_id
        and gi.user_id  = auth.uid()
        and gi.status   = 'accepted'
        and gi.group_role = 'admin'
    )
  );

-- Allow Group Admins to DELETE (remove) members from their group
create policy "group_admins_can_remove_from_their_group"
  on public.group_invitations for delete
  using (
    exists (
      select 1 from public.group_invitations gi
      where gi.group_id = group_invitations.group_id
        and gi.user_id  = auth.uid()
        and gi.status   = 'accepted'
        and gi.group_role = 'admin'
    )
  );

-- Allow Group Admins to read all invitations in their group
-- (needed to see pending invitations on the group page)
create policy "group_admins_can_read_group_invitations"
  on public.group_invitations for select
  using (
    exists (
      select 1 from public.group_invitations gi
      where gi.group_id = group_invitations.group_id
        and gi.user_id  = auth.uid()
        and gi.status   = 'accepted'
        and gi.group_role = 'admin'
    )
  );
