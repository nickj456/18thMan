-- ── Tighten group_invitations UPDATE policy ─────────────────────────────────
-- 074 recreated "group_admins_can_update_invitations_in_their_group" with USING
-- but no WITH CHECK. Postgres then applies the USING expression to new rows,
-- which lets a group admin rewrite group_id to any other group they also admin
-- (silently moving rows between groups). Add an explicit WITH CHECK so both the
-- old and new row must belong to a group the caller administers.

drop policy if exists "group_admins_can_update_invitations_in_their_group" on public.group_invitations;

create policy "group_admins_can_update_invitations_in_their_group"
  on public.group_invitations for update
  using (
    public.is_group_admin(group_invitations.group_id)
  )
  with check (
    public.is_group_admin(group_invitations.group_id)
  );
