-- Phase 2: Restrict coaching group creation/management to club admins (club_role='admin')
-- Previously any coach could create groups; now only the designated club admin can.

-- coaching_groups: replace permissive insert policy
drop policy if exists "Coaches and admins can create groups in their club" on public.coaching_groups;

create policy "Club admins can create groups in their club"
  on public.coaching_groups for insert
  with check (
    exists (
      select 1 from public.profiles
      where id = auth.uid()
        and club_id = coaching_groups.club_id
        and (club_role = 'admin' or role = 'admin')
    )
  );

-- coaching_groups: replace creator-based update/delete with club_admin-based
drop policy if exists "Creator or admin can update group" on public.coaching_groups;
drop policy if exists "Creator or admin can delete group" on public.coaching_groups;

create policy "Club admin or platform admin can update group"
  on public.coaching_groups for update
  using (
    exists (
      select 1 from public.profiles
      where id = auth.uid()
        and club_id = coaching_groups.club_id
        and (club_role = 'admin' or role = 'admin')
    )
  );

create policy "Club admin or platform admin can delete group"
  on public.coaching_groups for delete
  using (
    exists (
      select 1 from public.profiles
      where id = auth.uid()
        and club_id = coaching_groups.club_id
        and (club_role = 'admin' or role = 'admin')
    )
  );

-- group_invitations: replace the broad "coaches can manage" policy with club_admin only
drop policy if exists "Coaches can manage invitations in their club groups" on public.group_invitations;

create policy "Club admins can manage invitations in their club groups"
  on public.group_invitations for all
  using (
    exists (
      select 1 from public.profiles p
      join public.coaching_groups g on g.club_id = p.club_id
      where p.id = auth.uid()
        and p.club_role = 'admin'
        and g.id = group_invitations.group_id
    )
  )
  with check (
    exists (
      select 1 from public.profiles p
      join public.coaching_groups g on g.club_id = p.club_id
      where p.id = auth.uid()
        and p.club_role = 'admin'
        and g.id = group_invitations.group_id
    )
  );
